#!/usr/bin/env python3
import json
import psycopg2
import os
from datetime import datetime
import re

DATABASE_URL = os.environ.get('DATABASE_URL')

def parse_price_level(price_str):
    if not price_str:
        return 0
    price_str = str(price_str).lower()
    dollar_count = price_str.count('$')
    if dollar_count > 0:
        return min(4, dollar_count)
    pen_match = re.search(r'pen\s*(\d+)', price_str)
    if pen_match:
        amount = int(pen_match.group(1))
        if amount < 15: return 1
        elif amount < 30: return 2
        elif amount < 50: return 3
        else: return 4
    range_match = re.search(r'(\d+)-(\d+)', price_str)
    if range_match:
        avg_amount = (int(range_match.group(1)) + int(range_match.group(2))) / 2
        if avg_amount < 15: return 1
        elif avg_amount < 30: return 2
        elif avg_amount < 50: return 3
        else: return 4
    return 0

def main():
    print("🍽️ Importing ALL scraped gastronomia data...")
    
    with open('attached_assets/dataset_crawler-google-places_2025-07-09_21-14-35-511.json', 'r', encoding='utf-8') as f:
        businesses = json.load(f)
    
    print(f"📊 Found {len(businesses)} businesses to import")
    
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    imported_count = 0
    
    for business in businesses:
        try:
            # Extract ALL available data
            place_id = business.get('placeId', f'gen_{datetime.now().timestamp()}_{imported_count}')
            name = business.get('title', 'Unknown Business')[:255]
            address = business.get('address', f"{business.get('street', '')}, {business.get('city', 'Lima')}").strip()[:500]
            category = 'Gastronomía'
            subcategory = business.get('categoryName', 'Restaurante')
            
            # Ratings and pricing
            rating = float(business.get('totalScore', 0)) if business.get('totalScore') else 0
            review_count = int(business.get('reviewsCount', 0))
            price_level = parse_price_level(business.get('price'))
            
            # Contact info
            phone = business.get('phone')
            website = business.get('website')
            email = business.get('email')  # Some may have email from enrichment
            
            # Location
            lat = float(business.get('location', {}).get('lat', 0)) if business.get('location', {}).get('lat') else 0
            lng = float(business.get('location', {}).get('lng', 0)) if business.get('location', {}).get('lng') else 0
            
            # Images - ALL of them
            photo_url = business.get('imageUrl')
            image_urls = business.get('imageUrls', [])
            if not photo_url and image_urls:
                photo_url = image_urls[0]
            
            # Status and hours
            open_now = not business.get('temporarilyClosed', False) and not business.get('permanentlyClosed', False)
            hours = business.get('openingHours', [])
            
            # Search terms for better findability  
            search_terms = f"{name} {subcategory} {address} {business.get('neighborhood', '')} {business.get('city', '')}".lower()
            
            # Enhanced data
            street_view_url = None
            if image_urls:
                for url in image_urls:
                    if 'streetviewpixels' in url:
                        street_view_url = url
                        break
            
            description = business.get('description') or business.get('subTitle')
            
            # Services from categories and additional info
            services = []
            if business.get('categories'):
                services.extend(business.get('categories'))
            if business.get('additionalInfo'):
                for key, items in business.get('additionalInfo', {}).items():
                    services.append(key)
                    if isinstance(items, list):
                        for item in items:
                            if isinstance(item, dict):
                                services.extend(item.keys())
            services = list(set(services))  # Remove duplicates
            
            # Social media (if any)
            social_media = {}
            
            # Amenities from additionalInfo
            amenities = {}
            if business.get('additionalInfo'):
                for category, items in business.get('additionalInfo', {}).items():
                    if isinstance(items, list):
                        for item in items:
                            if isinstance(item, dict):
                                amenities.update(item)
            
            # Add computed amenities
            amenities.update({
                'Has_Phone': bool(phone),
                'Has_Website': bool(website), 
                'Has_Images': bool(image_urls),
                'Has_Reviews': bool(business.get('reviews')),
                'Claim_Available': business.get('claimThisBusiness', False),
                'Street_View_Available': bool(street_view_url),
                'Has_Opening_Hours': bool(hours)
            })
            
            # Status fields
            verified_status = 'claimable' if business.get('claimThisBusiness') else 'unverified'
            coordinates_validated = bool(lat and lng)
            business_status = 'closed' if business.get('permanentlyClosed') else ('temporarily_closed' if business.get('temporarilyClosed') else 'open')
            price_range_text = str(business.get('price')) if business.get('price') else None
            
            # Quality score based on data completeness
            quality_score = 50
            if phone: quality_score += 10
            if website: quality_score += 10
            if description: quality_score += 10
            if image_urls: quality_score += 15
            if business.get('reviews'): quality_score += 10
            if hours: quality_score += 5
            if rating >= 4: quality_score += 10
            elif rating >= 3: quality_score += 5
            if review_count > 10: quality_score += 10
            elif review_count > 5: quality_score += 5
            quality_score = min(100, quality_score)
            
            # Insert with all data
            sql = """
            INSERT INTO apify_businesses (
                place_id, name, address, category, subcategory, rating, review_count, price_level,
                phone, website, email, photo_url, latitude, longitude, open_now, hours, search_terms,
                is_registered, street_view_url, photos, description, services, social_media,
                image_urls, verified_status, data_freshness_score, phone_formatted, 
                phone_country_code, coordinates_validated, business_status, amenities,
                price_range_text, scraping_source, quality_score, last_scraped, created_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) ON CONFLICT (place_id) DO UPDATE SET
                name = EXCLUDED.name, address = EXCLUDED.address, category = EXCLUDED.category,
                subcategory = EXCLUDED.subcategory, rating = EXCLUDED.rating, review_count = EXCLUDED.review_count,
                price_level = EXCLUDED.price_level, phone = EXCLUDED.phone, website = EXCLUDED.website,
                email = EXCLUDED.email, photo_url = EXCLUDED.photo_url, latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude, open_now = EXCLUDED.open_now, hours = EXCLUDED.hours,
                search_terms = EXCLUDED.search_terms, street_view_url = EXCLUDED.street_view_url,
                photos = EXCLUDED.photos, description = EXCLUDED.description, services = EXCLUDED.services,
                social_media = EXCLUDED.social_media, image_urls = EXCLUDED.image_urls,
                verified_status = EXCLUDED.verified_status, data_freshness_score = EXCLUDED.data_freshness_score,
                phone_formatted = EXCLUDED.phone_formatted, coordinates_validated = EXCLUDED.coordinates_validated,
                business_status = EXCLUDED.business_status, amenities = EXCLUDED.amenities,
                price_range_text = EXCLUDED.price_range_text, quality_score = EXCLUDED.quality_score,
                last_scraped = EXCLUDED.last_scraped, last_updated = NOW()
            """
            
            cur.execute(sql, (
                place_id, name, address, category, subcategory, rating, review_count, price_level,
                phone, website, email, photo_url, lat, lng, open_now, json.dumps(hours), search_terms,
                False, street_view_url, json.dumps(image_urls), description, services, json.dumps(social_media),
                image_urls, verified_status, 90, phone, '+51', coordinates_validated, business_status,
                json.dumps(amenities), price_range_text, 'apify', quality_score, datetime.now(), datetime.now()
            ))
            
            imported_count += 1
            
            if imported_count % 100 == 0:
                print(f"✅ Imported {imported_count} businesses...")
                conn.commit()
                
        except Exception as e:
            print(f"❌ Error importing {business.get('title', 'Unknown')}: {str(e)}")
            continue
    
    conn.commit()
    
    print(f"\n🎉 Import completed!")
    print(f"✅ Successfully imported: {imported_count} businesses")
    
    # Show created subcategories
    cur.execute("SELECT subcategory, COUNT(*) FROM apify_businesses WHERE category = 'Gastronomía' GROUP BY subcategory ORDER BY COUNT(*) DESC")
    subcategories = cur.fetchall()
    
    print(f"\n🏷️ Subcategories created under Gastronomía:")
    for subcategory, count in subcategories:
        print(f"  • {subcategory}: {count} businesses")
    
    conn.close()

if __name__ == "__main__":
    main()
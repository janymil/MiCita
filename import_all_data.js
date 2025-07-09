import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

function parsePriceLevel(priceStr) {
  if (!priceStr) return 0;
  const str = priceStr.toString().toLowerCase();
  const dollarCount = (str.match(/\$/g) || []).length;
  if (dollarCount > 0) return Math.min(4, dollarCount);
  
  const penMatch = str.match(/pen\s*(\d+)/);
  if (penMatch) {
    const amount = parseInt(penMatch[1]);
    if (amount < 15) return 1;
    if (amount < 30) return 2;
    if (amount < 50) return 3;
    return 4;
  }
  
  const rangeMatch = str.match(/(\d+)-(\d+)/);
  if (rangeMatch) {
    const avgAmount = (parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2;
    if (avgAmount < 15) return 1;
    if (avgAmount < 30) return 2;
    if (avgAmount < 50) return 3;
    return 4;
  }
  return 0;
}

async function main() {
  console.log('🍽️ Importing ALL scraped gastronomia data...');
  
  const jsonData = fs.readFileSync('attached_assets/dataset_crawler-google-places_2025-07-09_21-14-35-511.json', 'utf8');
  const businesses = JSON.parse(jsonData);
  
  console.log(`📊 Found ${businesses.length} businesses to import`);
  
  await client.connect();
  
  let importedCount = 0;
  
  for (const business of businesses) {
    try {
      // Extract ALL available data
      const placeId = business.placeId || `gen_${Date.now()}_${importedCount}`;
      const name = (business.title || 'Unknown Business').substring(0, 255);
      const address = (business.address || `${business.street || ''}, ${business.city || 'Lima'}`).trim().substring(0, 500);
      const category = 'Gastronomía';
      const subcategory = business.categoryName || 'Restaurante';
      
      // Ratings and pricing
      const rating = business.totalScore ? parseFloat(business.totalScore) : 0;
      const reviewCount = parseInt(business.reviewsCount || 0);
      const priceLevel = parsePriceLevel(business.price);
      
      // Contact info
      const phone = business.phone || null;
      const website = business.website || null;
      const email = business.email || null;
      
      // Location
      const lat = business.location?.lat ? parseFloat(business.location.lat) : 0;
      const lng = business.location?.lng ? parseFloat(business.location.lng) : 0;
      
      // Images - ALL of them
      let photoUrl = business.imageUrl || null;
      const imageUrls = business.imageUrls || [];
      if (!photoUrl && imageUrls.length > 0) {
        photoUrl = imageUrls[0];
      }
      
      // Status and hours
      const openNow = !business.temporarilyClosed && !business.permanentlyClosed;
      const hours = business.openingHours || [];
      
      // Search terms
      const searchTerms = `${name} ${subcategory} ${address} ${business.neighborhood || ''} ${business.city || ''}`.toLowerCase();
      
      // Street view
      let streetViewUrl = null;
      if (imageUrls) {
        streetViewUrl = imageUrls.find(url => url.includes('streetviewpixels')) || null;
      }
      
      const description = business.description || business.subTitle || null;
      
      // Services
      const services = [];
      if (business.categories) services.push(...business.categories);
      if (business.additionalInfo) {
        Object.entries(business.additionalInfo).forEach(([key, items]) => {
          services.push(key);
          if (Array.isArray(items)) {
            items.forEach(item => {
              if (typeof item === 'object' && item !== null) {
                services.push(...Object.keys(item));
              }
            });
          }
        });
      }
      
      // Amenities
      const amenities = {};
      if (business.additionalInfo) {
        Object.values(business.additionalInfo).forEach(items => {
          if (Array.isArray(items)) {
            items.forEach(item => {
              if (typeof item === 'object' && item !== null) {
                Object.assign(amenities, item);
              }
            });
          }
        });
      }
      
      // Add computed amenities
      Object.assign(amenities, {
        'Has_Phone': !!phone,
        'Has_Website': !!website,
        'Has_Images': imageUrls.length > 0,
        'Has_Reviews': !!(business.reviews && business.reviews.length > 0),
        'Claim_Available': business.claimThisBusiness || false,
        'Street_View_Available': !!streetViewUrl,
        'Has_Opening_Hours': hours.length > 0
      });
      
      // Status fields
      const verifiedStatus = business.claimThisBusiness ? 'claimable' : 'unverified';
      const coordinatesValidated = !!(lat && lng);
      const businessStatus = business.permanentlyClosed ? 'closed' : 
                           (business.temporarilyClosed ? 'temporarily_closed' : 'open');
      const priceRangeText = business.price ? business.price.toString() : null;
      
      // Quality score
      let qualityScore = 50;
      if (phone) qualityScore += 10;
      if (website) qualityScore += 10;
      if (description) qualityScore += 10;
      if (imageUrls.length > 0) qualityScore += 15;
      if (business.reviews && business.reviews.length > 0) qualityScore += 10;
      if (hours.length > 0) qualityScore += 5;
      if (rating >= 4) qualityScore += 10;
      else if (rating >= 3) qualityScore += 5;
      if (reviewCount > 10) qualityScore += 10;
      else if (reviewCount > 5) qualityScore += 5;
      qualityScore = Math.min(100, qualityScore);
      
      // Insert with all data
      const sql = `
        INSERT INTO apify_businesses (
          place_id, name, address, category, subcategory, rating, review_count, price_level,
          phone, website, email, photo_url, latitude, longitude, open_now, hours, search_terms,
          is_registered, street_view_url, photos, description, services, social_media,
          image_urls, verified_status, data_freshness_score, phone_formatted, 
          phone_country_code, coordinates_validated, business_status, amenities,
          price_range_text, scraping_source, quality_score, last_scraped, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36
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
      `;
      
      await client.query(sql, [
        placeId, name, address, category, subcategory, rating, reviewCount, priceLevel,
        phone, website, email, photoUrl, lat, lng, openNow, JSON.stringify(hours), searchTerms,
        false, streetViewUrl, JSON.stringify(imageUrls), description, services, JSON.stringify({}),
        imageUrls, verifiedStatus, 90, phone, '+51', coordinatesValidated, businessStatus,
        JSON.stringify(amenities), priceRangeText, 'apify', qualityScore, new Date(), new Date()
      ]);
      
      importedCount++;
      
      if (importedCount % 100 === 0) {
        console.log(`✅ Imported ${importedCount} businesses...`);
      }
      
    } catch (error) {
      console.log(`❌ Error importing ${business.title || 'Unknown'}: ${error.message}`);
      continue;
    }
  }
  
  console.log(`\n🎉 Import completed!`);
  console.log(`✅ Successfully imported: ${importedCount} businesses`);
  
  // Show created subcategories
  const result = await client.query(`
    SELECT subcategory, COUNT(*) as count 
    FROM apify_businesses 
    WHERE category = 'Gastronomía' 
    GROUP BY subcategory 
    ORDER BY COUNT(*) DESC
  `);
  
  console.log(`\n🏷️ Subcategories created under Gastronomía:`);
  result.rows.forEach(row => {
    console.log(`  • ${row.subcategory}: ${row.count} businesses`);
  });
  
  await client.end();
}

main().catch(console.error);
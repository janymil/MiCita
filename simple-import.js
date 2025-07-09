import fs from 'fs';
import { db } from './server/db.js';
import { apifyBusinesses } from './shared/schema.js';

async function importData() {
  console.log('🍽️ Starting import...');
  
  const data = JSON.parse(fs.readFileSync('attached_assets/dataset_crawler-google-places_2025-07-09_21-14-35-511.json', 'utf8'));
  console.log(`📊 Found ${data.length} businesses`);
  
  let imported = 0;
  
  for (const business of data) {
    try {
      await db.insert(apifyBusinesses).values({
        placeId: business.placeId || `gen_${Date.now()}_${imported}`,
        name: business.title || 'Unknown',
        address: business.address || '',
        category: 'Gastronomía',
        subcategory: business.categoryName || 'Restaurante',
        rating: business.totalScore ? business.totalScore.toString() : '0',
        reviewCount: business.reviewsCount || 0,
        priceLevel: 0,
        phone: business.phone || null,
        website: business.website || null,
        photoUrl: business.imageUrls?.[0] || business.imageUrl || null,
        latitude: business.location?.lat ? business.location.lat.toString() : '0',
        longitude: business.location?.lng ? business.location.lng.toString() : '0',
        openNow: !business.temporarilyClosed && !business.permanentlyClosed,
        hours: business.openingHours || [],
        searchTerms: `${business.title} ${business.categoryName} ${business.address}`.toLowerCase(),
        streetViewUrl: business.imageUrls?.find(url => url.includes('streetviewpixels')) || null,
        photos: business.imageUrls || [],
        description: business.description || business.subTitle || null,
        services: business.categories || [],
        imageUrls: business.imageUrls || [],
        verifiedStatus: business.claimThisBusiness ? 'claimable' : 'unverified',
        dataFreshnessScore: 90,
        phoneFormatted: business.phone || null,
        phoneCountryCode: '+51',
        coordinatesValidated: !!(business.location?.lat && business.location?.lng),
        businessStatus: business.permanentlyClosed ? 'closed' : (business.temporarilyClosed ? 'temporarily_closed' : 'open'),
        amenities: {},
        priceRangeText: business.price?.toString() || null,
        scrapingSource: 'apify',
        qualityScore: 75
      }).onConflictDoNothing();
      
      imported++;
      if (imported % 100 === 0) console.log(`✅ ${imported} imported...`);
      
    } catch (error) {
      console.log(`❌ ${business.title}: ${error.message}`);
    }
  }
  
  console.log(`🎉 Done! Imported ${imported} businesses`);
  process.exit(0);
}

importData();
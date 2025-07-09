#!/usr/bin/env node

import { ApifyClient } from 'apify-client';
import { storage } from './server/storage.ts';
import { 
  PhoneNumberProcessor, 
  CategoryMapper, 
  CoordinateValidator, 
  DataValidator 
} from './server/data-enhancement-utils.ts';

const client = new ApifyClient({ 
  token: process.env.APIFY_API_TOKEN 
});

const runId = 'iU5yczUX9UkuT30Ys';

// Convert Apify result to our business format
function convertToApifyBusiness(place) {
  const businessName = place.title || 'Business';
  const address = place.address || 'Lima, Peru';
  const categoryName = place.categoryName || '';
  
  // Enhanced phone processing
  const rawPhone = place.phoneUnformatted || place.phone || null;
  const phoneResult = rawPhone ? PhoneNumberProcessor.standardizePhone(rawPhone) : null;
  
  // Enhanced coordinate validation
  const lat = place.location?.lat || null;
  const lng = place.location?.lng || null;
  const coordResult = lat && lng ? CoordinateValidator.validateCoordinates(lat, lng) : null;
  
  return {
    placeId: place.placeId,
    name: businessName,
    address: address,
    category: CategoryMapper.mapCategory(businessName, categoryName, address),
    rating: place.totalScore || 0,
    reviewCount: place.reviewsCount || 0,
    priceLevel: place.priceLevel || null,
    phone: phoneResult?.formatted || rawPhone,
    website: place.website || null,
    photoUrl: place.imageUrls?.[0] || null,
    photos: place.imageUrls || [],
    latitude: coordResult?.correctedLat || lat,
    longitude: coordResult?.correctedLng || lng,
    openNow: place.openNow || null,
    hours: place.businessHours || null,
    email: place.email || null,
    socialMedia: place.socialMedias || null,
    searchTerms: `${businessName} ${categoryName} ${address}`.toLowerCase(),
    isRegistered: false,
    createdAt: new Date(),
    lastUpdated: new Date()
  };
}

async function getCurrentDatabaseCount() {
  try {
    const { neon } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-http');
    const { sql } = await import('drizzle-orm');
    
    const db = drizzle(neon(process.env.DATABASE_URL));
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM apify_businesses`);
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Error getting database count:', error);
    return 0;
  }
}

async function testSmallImport() {
  console.log(`📥 Testing import from Apify run: ${runId}`);
  console.log(`🧪 Will process only first 10 businesses for testing`);
  
  try {
    // Get the specific run
    const run = await client.run(runId).get();
    console.log(`📊 Run status: ${run.status}`);
    
    // Get the dataset from the run
    const dataset = await client.dataset(run.defaultDatasetId);
    const datasetInfo = await dataset.get();
    console.log(`📦 Total businesses in dataset: ${datasetInfo.itemCount}`);
    
    // Get first 10 items only
    const { items } = await dataset.listItems({ limit: 10 });
    console.log(`📥 Retrieved ${items.length} businesses for testing`);
    
    // Check current database count
    const currentCount = await getCurrentDatabaseCount();
    console.log(`📊 Current database count: ${currentCount}`);
    
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    console.log('🔄 Processing test batch...\n');
    
    // Import each business
    for (const [index, item] of items.entries()) {
      try {
        const business = convertToApifyBusiness(item);
        
        console.log(`${index + 1}. Processing: ${business.name}`);
        console.log(`   Address: ${business.address}`);
        console.log(`   Category: ${business.category}`);
        console.log(`   Rating: ${business.rating}`);
        console.log(`   Phone: ${business.phone || 'No phone'}`);
        console.log(`   Website: ${business.website || 'No website'}`);
        console.log(`   Email: ${business.email || 'No email'}`);
        
        // Validate business data
        const validation = DataValidator.validateBusinessData(business);
        if (!validation.isValid) {
          console.log(`   ⚠️ Validation failed: ${validation.errors.join(', ')}`);
          skipped++;
          continue;
        }
        
        // Check if already exists
        const existing = await storage.getApifyBusiness(business.placeId);
        if (existing) {
          console.log(`   📝 Already exists - will update`);
          updated++;
        } else {
          console.log(`   ➕ New business - will add`);
          imported++;
        }
        
        // Store business
        await storage.addApifyBusiness(business);
        console.log(`   ✅ Successfully processed`);
        
      } catch (error) {
        console.error(`   ❌ Error processing ${item.title || 'unknown'}: ${error.message}`);
        errors++;
      }
      
      console.log('');
    }
    
    // Final database count
    const finalCount = await getCurrentDatabaseCount();
    const newBusinesses = finalCount - currentCount;
    
    console.log('🎉 Test Results:');
    console.log('================');
    console.log(`📊 Businesses tested: ${items.length}`);
    console.log(`✅ Successfully imported: ${imported}`);
    console.log(`📝 Updated existing: ${updated}`);
    console.log(`⚠️ Skipped (validation): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📈 Net new businesses: ${newBusinesses}`);
    console.log(`📊 Total businesses in database: ${finalCount}`);
    
    if (errors === 0 && (imported > 0 || updated > 0)) {
      console.log('\n✅ Test successful! Ready to import all 2217 businesses');
      console.log('🚀 Run the full import script when ready');
    } else {
      console.log('\n⚠️ Test had issues - check the errors above');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testSmallImport()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
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
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
}

async function importFromSpecificRun(runId) {
  console.log(`📥 Importing data from Apify run: ${runId}`);
  
  try {
    // Get the specific run
    const run = await client.actor('compass/crawler-google-places').run(runId).get();
    console.log(`📊 Run details:`);
    console.log(`   Status: ${run.status}`);
    console.log(`   Started: ${new Date(run.startedAt).toLocaleString()}`);
    if (run.finishedAt) {
      console.log(`   Finished: ${new Date(run.finishedAt).toLocaleString()}`);
    }
    console.log(`   Dataset ID: ${run.defaultDatasetId}`);
    
    // Get the dataset from the run
    const dataset = await client.dataset(run.defaultDatasetId);
    const datasetInfo = await dataset.get();
    console.log(`📦 Dataset contains ${datasetInfo.itemCount} businesses`);
    
    if (datasetInfo.itemCount === 0) {
      console.log('⚠️ No data found in the dataset');
      return;
    }
    
    // Get all items from the dataset
    const { items } = await dataset.listItems();
    console.log(`📥 Retrieved ${items.length} businesses for import`);
    
    // Check current database count
    const currentCount = await getCurrentDatabaseCount();
    console.log(`📊 Current database count: ${currentCount}`);
    
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    console.log('🔄 Starting import process...\n');
    
    // Import each business
    for (const [index, item] of items.entries()) {
      try {
        const business = convertToApifyBusiness(item);
        
        // Validate business data
        const validation = DataValidator.validateBusinessData(business);
        if (!validation.isValid) {
          console.log(`⚠️ Skipping ${business.name}: ${validation.errors.join(', ')}`);
          skipped++;
          continue;
        }
        
        // Check if already exists
        const existing = await storage.getApifyBusiness(business.placeId);
        if (existing) {
          console.log(`📝 Updating: ${business.name}`);
          updated++;
        } else {
          console.log(`➕ Adding: ${business.name}`);
          imported++;
        }
        
        // Store business
        await storage.addApifyBusiness(business);
        
        // Log progress every 50 businesses
        if ((index + 1) % 50 === 0) {
          console.log(`📈 Progress: ${index + 1}/${items.length} processed`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${item.title || 'unknown'}: ${error.message}`);
        errors++;
      }
    }
    
    // Final database count
    const finalCount = await getCurrentDatabaseCount();
    const newBusinesses = finalCount - currentCount;
    
    console.log('\n🎉 Import Results:');
    console.log('==================');
    console.log(`📊 Businesses in dataset: ${items.length}`);
    console.log(`✅ Successfully imported: ${imported}`);
    console.log(`📝 Updated existing: ${updated}`);
    console.log(`⚠️ Skipped (validation): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📈 Net new businesses: ${newBusinesses}`);
    console.log(`📊 Total businesses in database: ${finalCount}`);
    
    if (newBusinesses > 0 || updated > 0) {
      console.log('\n✅ Data import completed successfully!');
      console.log('🎯 Your database now contains the scraped businesses');
      console.log('🔍 You can now search and browse these businesses in your app');
    } else {
      console.log('\n⚠️ No new businesses were added');
      console.log('💡 This might mean the data was already imported');
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  }
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

// Import from the specific run
const runId = 'iU5yczUX9UkuT30Ys';
importFromSpecificRun(runId)
  .then(() => {
    console.log('\n✅ Import process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import process failed:', error);
    process.exit(1);
  });
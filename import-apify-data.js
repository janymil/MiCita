#!/usr/bin/env node

/**
 * 📥 Import Apify Data Script
 * 
 * This script imports the scraped data from the completed Apify run
 * to the local database. Used when the scraping process was interrupted
 * but the Apify actor continued running.
 */

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

async function importDataFromApifyRun() {
  console.log('📥 Importing data from completed Apify run...');
  
  try {
    // Get the most recent run
    const runs = await client.actor('compass/crawler-google-places').runs().list({ limit: 10 });
    console.log(`Found ${runs.items.length} recent runs`);
    
    // Find the most recent successful run
    const successfulRun = runs.items.find(run => run.status === 'SUCCEEDED');
    if (!successfulRun) {
      console.error('❌ No successful runs found');
      return;
    }
    
    console.log(`📊 Found successful run: ${successfulRun.id}`);
    console.log(`📅 Started: ${successfulRun.startedAt}`);
    console.log(`📅 Finished: ${successfulRun.finishedAt}`);
    
    // Get the dataset from the successful run
    const dataset = await client.dataset(successfulRun.defaultDatasetId);
    const { items } = await dataset.listItems();
    
    console.log(`📦 Found ${items.length} businesses in dataset`);
    
    if (items.length === 0) {
      console.log('⚠️ No data found in the dataset');
      return;
    }
    
    // Check current database count
    const currentCount = await getCurrentDatabaseCount();
    console.log(`📊 Current database count: ${currentCount}`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    // Import each business
    for (const item of items) {
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
          console.log(`📝 Updating existing business: ${business.name}`);
        } else {
          console.log(`➕ Adding new business: ${business.name}`);
        }
        
        // Store business
        await storage.addApifyBusiness(business);
        imported++;
        
        // Log progress every 100 businesses
        if (imported % 100 === 0) {
          console.log(`📈 Progress: ${imported}/${items.length} imported`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${item.title || 'unknown'}: ${error.message}`);
        errors++;
      }
    }
    
    // Final database count
    const finalCount = await getCurrentDatabaseCount();
    const newBusinesses = finalCount - currentCount;
    
    console.log('\\n🎉 Import Results:');
    console.log('==================');
    console.log(`📊 Businesses in dataset: ${items.length}`);
    console.log(`✅ Successfully imported: ${imported}`);
    console.log(`⚠️ Skipped (validation): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📈 New businesses added: ${newBusinesses}`);
    console.log(`📊 Total businesses in database: ${finalCount}`);
    
    if (newBusinesses > 0) {
      console.log('\\n✅ Data import completed successfully!');
      console.log('🎯 Your database now contains the scraped businesses');
    } else {
      console.log('\\n⚠️ No new businesses were added');
      console.log('💡 This might mean the data was already imported or there were validation issues');
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error);
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

// Run the import
importDataFromApifyRun()
  .then(() => {
    console.log('\\n✅ Import process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\\n❌ Import process failed:', error);
    process.exit(1);
  });
#!/usr/bin/env node

import { ApifyClient } from 'apify-client';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

const client = new ApifyClient({ 
  token: process.env.APIFY_API_TOKEN 
});

const db = drizzle(neon(process.env.DATABASE_URL));
const runId = 'iU5yczUX9UkuT30Ys';

async function directImport() {
  console.log('🚀 Direct Apify Import - Fast Method');
  console.log('====================================');
  
  try {
    // Get the dataset directly
    const run = await client.run(runId).get();
    console.log(`📊 Run Status: ${run.status}`);
    console.log(`📦 Dataset ID: ${run.defaultDatasetId}`);
    
    const dataset = await client.dataset(run.defaultDatasetId);
    const { items } = await dataset.listItems();
    console.log(`📥 Found ${items.length} businesses to import`);
    
    // Get current count
    const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM apify_businesses`);
    const startCount = parseInt(countResult.rows[0].count);
    console.log(`📊 Starting count: ${startCount}`);
    
    let processed = 0;
    let errors = 0;
    const startTime = Date.now();
    
    // Process all items directly
    for (const item of items) {
      try {
        // Basic data extraction
        const placeId = item.placeId;
        const name = item.title || 'Business';
        const address = item.address || 'Lima, Peru';
        const category = item.categoryName ? 
          item.categoryName.toLowerCase().includes('bell') || item.categoryName.toLowerCase().includes('sal') ? 'belleza' :
          item.categoryName.toLowerCase().includes('rest') || item.categoryName.toLowerCase().includes('comid') ? 'gastronomia' :
          item.categoryName.toLowerCase().includes('gym') || item.categoryName.toLowerCase().includes('fit') ? 'fitness' :
          item.categoryName.toLowerCase().includes('med') || item.categoryName.toLowerCase().includes('sal') ? 'salud' :
          'servicios' : 'servicios';
        
        const rating = item.totalScore || 0;
        const reviewCount = item.reviewsCount || 0;
        const phone = item.phoneUnformatted || item.phone || null;
        const website = item.website || null;
        const latitude = item.location?.lat || null;
        const longitude = item.location?.lng || null;
        const email = item.email || null;
        const photos = item.imageUrls || [];
        const photoUrl = photos[0] || null;
        
        // Insert or update using UPSERT
        await db.execute(sql`
          INSERT INTO apify_businesses (
            "placeId", name, address, category, rating, "reviewCount", 
            phone, website, "photoUrl", photos, latitude, longitude, 
            email, "searchTerms", "isRegistered", "createdAt", "lastUpdated"
          ) VALUES (
            ${placeId}, ${name}, ${address}, ${category}, ${rating}, ${reviewCount},
            ${phone}, ${website}, ${photoUrl}, ${JSON.stringify(photos)}, ${latitude}, ${longitude},
            ${email}, ${name.toLowerCase() + ' ' + address.toLowerCase()}, false, NOW(), NOW()
          )
          ON CONFLICT ("placeId") DO UPDATE SET
            name = EXCLUDED.name,
            address = EXCLUDED.address,
            category = EXCLUDED.category,
            rating = EXCLUDED.rating,
            "reviewCount" = EXCLUDED."reviewCount",
            phone = EXCLUDED.phone,
            website = EXCLUDED.website,
            "photoUrl" = EXCLUDED."photoUrl",
            photos = EXCLUDED.photos,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            email = EXCLUDED.email,
            "searchTerms" = EXCLUDED."searchTerms",
            "lastUpdated" = NOW()
        `);
        
        processed++;
        
        // Progress every 100 items
        if (processed % 100 === 0) {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          console.log(`⚡ Processed ${processed}/${items.length} in ${elapsed}s`);
        }
        
      } catch (error) {
        errors++;
        if (errors < 5) {
          console.error(`❌ Error processing ${item.title}: ${error.message}`);
        }
      }
    }
    
    // Final count
    const finalCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM apify_businesses`);
    const finalCount = parseInt(finalCountResult.rows[0].count);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    
    console.log('\n🎉 Import Complete!');
    console.log('===================');
    console.log(`⚡ Total time: ${elapsed} seconds`);
    console.log(`📊 Processed: ${processed} businesses`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📈 Database: ${startCount} → ${finalCount} (+${finalCount - startCount})`);
    console.log(`🎯 Target reached: ${finalCount >= 2217 ? 'YES' : 'NO'}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  }
}

directImport()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
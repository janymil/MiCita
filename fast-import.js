#!/usr/bin/env node

import { ApifyClient } from 'apify-client';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
const db = drizzle(neon(process.env.DATABASE_URL));

async function fastImport() {
  console.log('🚀 Fast Import - Direct SQL');
  
  const run = await client.run('iU5yczUX9UkuT30Ys').get();
  const dataset = await client.dataset(run.defaultDatasetId);
  const { items } = await dataset.listItems();
  
  console.log(`📥 Importing ${items.length} businesses...`);
  
  const startTime = Date.now();
  let processed = 0;
  
  // Process in chunks of 50
  for (let i = 0; i < items.length; i += 50) {
    const chunk = items.slice(i, i + 50);
    
    for (const item of chunk) {
      try {
        const placeId = item.placeId;
        const name = item.title || 'Business';
        const address = item.address || 'Lima, Peru';
        const category = 'belleza'; // Simplified for speed
        const rating = parseFloat(item.totalScore) || 0;
        const reviewCount = parseInt(item.reviewsCount) || 0;
        const phone = item.phoneUnformatted || item.phone || null;
        const website = item.website || null;
        const email = item.email || null;
        const latitude = parseFloat(item.location?.lat) || null;
        const longitude = parseFloat(item.location?.lng) || null;
        const photoUrl = item.imageUrls?.[0] || null;
        const searchTerms = name.toLowerCase();
        
        // Direct upsert
        await db.execute(sql`
          INSERT INTO apify_businesses (
            place_id, name, address, category, rating, review_count,
            phone, website, email, latitude, longitude, photo_url,
            search_terms, is_registered, created_at, last_updated
          ) VALUES (
            ${placeId}, ${name}, ${address}, ${category}, ${rating}, ${reviewCount},
            ${phone}, ${website}, ${email}, ${latitude}, ${longitude}, ${photoUrl},
            ${searchTerms}, false, NOW(), NOW()
          )
          ON CONFLICT (place_id) DO UPDATE SET
            name = EXCLUDED.name,
            address = EXCLUDED.address,
            rating = EXCLUDED.rating,
            review_count = EXCLUDED.review_count,
            phone = EXCLUDED.phone,
            website = EXCLUDED.website,
            email = EXCLUDED.email,
            last_updated = NOW()
        `);
        
        processed++;
        
      } catch (error) {
        console.error(`Error: ${item.title} - ${error.message}`);
      }
    }
    
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`⚡ ${processed}/${items.length} (${elapsed}s)`);
  }
  
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`✅ Complete! ${processed} businesses in ${elapsed}s`);
  
  // Check final count
  const result = await db.execute(sql`SELECT COUNT(*) as count FROM apify_businesses`);
  console.log(`📊 Total businesses in database: ${result.rows[0].count}`);
}

fastImport().then(() => process.exit(0)).catch(console.error);
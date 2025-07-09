#!/usr/bin/env node

import { ApifyClient } from 'apify-client';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
const db = drizzle(neon(process.env.DATABASE_URL));

async function simpleImport() {
  console.log('🚀 Simple Apify Import');
  
  // Get dataset
  const run = await client.run('iU5yczUX9UkuT30Ys').get();
  const dataset = await client.dataset(run.defaultDatasetId);
  const { items } = await dataset.listItems();
  
  console.log(`📥 Importing ${items.length} businesses...`);
  
  let count = 0;
  const startTime = Date.now();
  
  for (const item of items) {
    try {
      // Simple category mapping
      const categoryName = (item.categoryName || '').toLowerCase();
      const category = 
        categoryName.includes('bell') || categoryName.includes('sal') || categoryName.includes('peluq') ? 'belleza' :
        categoryName.includes('rest') || categoryName.includes('comid') ? 'gastronomia' :
        categoryName.includes('gym') || categoryName.includes('fit') ? 'fitness' :
        categoryName.includes('med') || categoryName.includes('doctor') ? 'salud' : 'servicios';
      
      // Insert with correct column names
      await db.execute(sql`
        INSERT INTO apify_businesses (
          place_id, name, address, category, rating, review_count,
          phone, website, photo_url, latitude, longitude, email,
          search_terms, is_registered, created_at, last_updated
        ) VALUES (
          ${item.placeId}, ${item.title || 'Business'}, ${item.address || 'Lima, Peru'},
          ${category}, ${item.totalScore || 0}, ${item.reviewsCount || 0},
          ${item.phoneUnformatted || item.phone}, ${item.website},
          ${item.imageUrls?.[0]}, ${item.location?.lat}, ${item.location?.lng},
          ${item.email}, ${(item.title || '').toLowerCase()}, false, NOW(), NOW()
        )
        ON CONFLICT (place_id) DO UPDATE SET
          name = EXCLUDED.name,
          rating = EXCLUDED.rating,
          review_count = EXCLUDED.review_count,
          phone = EXCLUDED.phone,
          website = EXCLUDED.website,
          email = EXCLUDED.email,
          last_updated = NOW()
      `);
      
      count++;
      if (count % 200 === 0) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`⚡ ${count}/${items.length} (${elapsed}s)`);
      }
      
    } catch (error) {
      console.error(`Error: ${item.title} - ${error.message}`);
    }
  }
  
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`✅ Complete! ${count} businesses in ${elapsed}s`);
}

simpleImport().catch(console.error);
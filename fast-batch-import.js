import { ApifyClient } from 'apify-client';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { apifyBusinesses } from './shared/schema.ts';
import { sql } from 'drizzle-orm';

const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
const db = drizzle(neon(process.env.DATABASE_URL));

async function fastBatchImport() {
  console.log('🚀 FAST BATCH IMPORT from iU5yczUX9UkuT30Ys');
  
  const run = await client.run('iU5yczUX9UkuT30Ys').get();
  const dataset = await client.dataset(run.defaultDatasetId);
  const { items } = await dataset.listItems();
  
  console.log(`📦 Found ${items.length} businesses to import`);
  
  const startCount = await db.execute(sql`SELECT COUNT(*) as count FROM apify_businesses`);
  console.log(`📊 Starting with ${startCount.rows[0].count} businesses in database`);
  
  // Get existing place IDs to avoid duplicates
  const existingIds = await db.execute(sql`SELECT place_id FROM apify_businesses`);
  const existingSet = new Set(existingIds.rows.map(row => row.place_id));
  console.log(`📝 Found ${existingSet.size} existing businesses to skip`);
  
  // Filter out existing businesses
  const newBusinesses = items.filter(item => item.placeId && !existingSet.has(item.placeId));
  console.log(`➕ Will import ${newBusinesses.length} new businesses`);
  
  // Batch insert in chunks of 50
  const BATCH_SIZE = 50;
  let imported = 0;
  
  for (let i = 0; i < newBusinesses.length; i += BATCH_SIZE) {
    const batch = newBusinesses.slice(i, i + BATCH_SIZE);
    
    const businessData = batch.map(item => ({
      placeId: item.placeId,
      name: item.title || 'Business',
      address: item.address || 'Lima, Peru',
      category: 'servicios',
      rating: item.totalScore || 0,
      reviewCount: item.reviewsCount || 0,
      priceLevel: item.priceLevel || null,
      phone: item.phoneUnformatted || item.phone || null,
      website: item.website || null,
      photoUrl: item.imageUrls?.[0] || null,
      photos: item.imageUrls || [],
      latitude: item.location?.lat || null,
      longitude: item.location?.lng || null,
      openNow: item.openNow || null,
      hours: item.businessHours || null,
      email: item.email || null,
      socialMedia: item.socialMedias || null,
      searchTerms: `${item.title} ${item.categoryName || ''} ${item.address || ''}`.toLowerCase(),
      isRegistered: false,
      createdAt: new Date(),
      lastUpdated: new Date()
    }));
    
    try {
      await db.insert(apifyBusinesses).values(businessData);
      imported += batch.length;
      console.log(`📈 Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${imported}/${newBusinesses.length} imported`);
    } catch (error) {
      console.log(`❌ Batch error: ${error.message}`);
    }
  }
  
  const finalCount = await db.execute(sql`SELECT COUNT(*) as count FROM apify_businesses`);
  console.log(`✅ COMPLETED: ${finalCount.rows[0].count} total businesses now in database`);
  console.log(`📊 Successfully imported ${imported} new businesses`);
}

fastBatchImport().catch(console.error);
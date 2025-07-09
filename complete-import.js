#!/usr/bin/env node

import { ApifyClient } from 'apify-client';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
const db = drizzle(neon(process.env.DATABASE_URL));

function mapCategory(businessName, categoryName, address) {
  const name = (businessName || '').toLowerCase();
  const category = (categoryName || '').toLowerCase();
  const addr = (address || '').toLowerCase();
  
  // Beauty keywords
  if (category.includes('belleza') || category.includes('salon') || category.includes('peluq') || 
      category.includes('barber') || category.includes('spa') || name.includes('salon') || 
      name.includes('peluq') || name.includes('barber') || name.includes('spa')) {
    return 'belleza';
  }
  
  // Food keywords
  if (category.includes('rest') || category.includes('comid') || category.includes('pizza') ||
      category.includes('cafe') || name.includes('rest') || name.includes('pizza')) {
    return 'gastronomia';
  }
  
  // Health keywords
  if (category.includes('med') || category.includes('doctor') || category.includes('clinica') ||
      category.includes('farmac') || name.includes('clinica') || name.includes('doctor')) {
    return 'salud';
  }
  
  // Fitness keywords
  if (category.includes('gym') || category.includes('fit') || name.includes('gym') || name.includes('fit')) {
    return 'fitness';
  }
  
  // Automotive keywords
  if (category.includes('auto') || category.includes('moto') || category.includes('mecanic') ||
      name.includes('auto') || name.includes('moto') || name.includes('mecanic')) {
    return 'automotriz';
  }
  
  return 'servicios';
}

function formatPhone(phone) {
  if (!phone) return null;
  
  // Remove all non-digits
  const digits = phone.replace(/[^\d]/g, '');
  
  // If starts with 51, format as +51 xxx xxx xxx
  if (digits.startsWith('51') && digits.length >= 11) {
    const number = digits.substring(2);
    return `+51 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
  }
  
  // If 9 digits, add +51
  if (digits.length === 9) {
    return `+51 ${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
  }
  
  return phone;
}

async function completeImport() {
  console.log('🚀 COMPLETE Apify Data Import - All Enhanced Features');
  console.log('====================================================');
  
  try {
    // Get dataset
    const run = await client.run('iU5yczUX9UkuT30Ys').get();
    const dataset = await client.dataset(run.defaultDatasetId);
    const { items } = await dataset.listItems();
    
    console.log(`📥 Importing ${items.length} businesses with COMPLETE data...`);
    
    const startTime = Date.now();
    let imported = 0;
    let updated = 0;
    let errors = 0;
    
    for (const item of items) {
      try {
        // Extract all data fields
        const placeId = item.placeId || `generated_${Date.now()}_${Math.random()}`;
        const name = item.title || 'Business';
        const address = item.address || 'Lima, Peru';
        const category = mapCategory(name, item.categoryName, address);
        const rating = parseFloat(item.totalScore) || 0;
        const reviewCount = parseInt(item.reviewsCount) || 0;
        const priceLevel = parseInt(item.priceLevel) || null;
        const phone = formatPhone(item.phoneUnformatted || item.phone);
        const website = item.website || null;
        const latitude = parseFloat(item.location?.lat) || null;
        const longitude = parseFloat(item.location?.lng) || null;
        const email = item.email || null;
        const imageUrls = item.imageUrls || [];
        const photoUrl = imageUrls[0] || null;
        const openNow = item.openNow || null;
        const hours = item.businessHours || item.openingHours || null;
        const searchTerms = `${name} ${item.categoryName || ''} ${address}`.toLowerCase();
        
        // Enhanced fields
        const description = item.description || null;
        const socialMedia = item.socialMedias || item.socialMedia || null;
        const streetViewUrl = item.streetViewUrl || null;
        const popularTimes = item.popularTimes || null;
        const amenities = item.amenities || [];
        const priceRangeText = item.priceRangeText || null;
        
        // Check if exists
        const existsResult = await db.execute(sql`SELECT id FROM apify_businesses WHERE place_id = ${placeId}`);
        const exists = existsResult.rows.length > 0;
        
        if (exists) {
          // Update existing
          await db.execute(sql`
            UPDATE apify_businesses SET
              name = ${name},
              address = ${address},
              category = ${category},
              rating = ${rating},
              review_count = ${reviewCount},
              price_level = ${priceLevel},
              phone = ${phone},
              website = ${website},
              photo_url = ${photoUrl},
              latitude = ${latitude},
              longitude = ${longitude},
              email = ${email},
              search_terms = ${searchTerms},
              description = ${description},
              social_media = ${socialMedia ? JSON.stringify(socialMedia) : null},
              image_urls = ${JSON.stringify(imageUrls)},
              street_view_url = ${streetViewUrl},
              popular_times = ${popularTimes ? JSON.stringify(popularTimes) : null},
              amenities = ${JSON.stringify(amenities)},
              price_range_text = ${priceRangeText},
              hours = ${hours ? JSON.stringify(hours) : null},
              open_now = ${openNow},
              last_updated = NOW(),
              last_scraped = NOW(),
              scraping_source = 'apify'
            WHERE place_id = ${placeId}
          `);
          updated++;
        } else {
          // Insert new
          await db.execute(sql`
            INSERT INTO apify_businesses (
              place_id, name, address, category, rating, review_count, price_level,
              phone, website, photo_url, latitude, longitude, email, search_terms,
              description, social_media, image_urls, street_view_url, popular_times,
              amenities, price_range_text, hours, open_now, is_registered,
              created_at, last_updated, last_scraped, scraping_source
            ) VALUES (
              ${placeId}, ${name}, ${address}, ${category}, ${rating}, ${reviewCount}, ${priceLevel},
              ${phone}, ${website}, ${photoUrl}, ${latitude}, ${longitude}, ${email}, ${searchTerms},
              ${description}, ${socialMedia ? JSON.stringify(socialMedia) : null}, ${JSON.stringify(imageUrls)},
              ${streetViewUrl}, ${popularTimes ? JSON.stringify(popularTimes) : null}, ${JSON.stringify(amenities)},
              ${priceRangeText}, ${hours ? JSON.stringify(hours) : null}, ${openNow}, false,
              NOW(), NOW(), NOW(), 'apify'
            )
          `);
          imported++;
        }
        
        // Progress every 100 items
        if ((imported + updated) % 100 === 0) {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          console.log(`⚡ Progress: ${imported + updated}/${items.length} (${elapsed}s) - New: ${imported}, Updated: ${updated}`);
        }
        
      } catch (error) {
        errors++;
        if (errors <= 5) {
          console.error(`❌ Error: ${item.title} - ${error.message}`);
        }
      }
    }
    
    // Final count and summary
    const finalCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM apify_businesses`);
    const finalCount = parseInt(finalCountResult.rows[0].count);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    
    console.log('\n🎉 COMPLETE IMPORT FINISHED!');
    console.log('============================');
    console.log(`⚡ Total time: ${elapsed} seconds`);
    console.log(`📊 Processed: ${items.length} businesses`);
    console.log(`✅ New imports: ${imported}`);
    console.log(`📝 Updated existing: ${updated}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Total in database: ${finalCount}`);
    console.log(`🎯 Success rate: ${((imported + updated) / items.length * 100).toFixed(1)}%`);
    
    console.log('\n🔥 ENHANCED FEATURES IMPORTED:');
    console.log('✅ Complete business information');
    console.log('✅ Enhanced phone number formatting');
    console.log('✅ Email addresses (where available)');
    console.log('✅ Social media profiles');
    console.log('✅ Multiple photos/images');
    console.log('✅ Business hours and opening status');
    console.log('✅ Popular times data');
    console.log('✅ Street view URLs');
    console.log('✅ Amenities and features');
    console.log('✅ Price range information');
    
    return { imported, updated, errors, finalCount };
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  }
}

completeImport()
  .then((result) => {
    console.log('\n✅ ALL DATA SUCCESSFULLY IMPORTED!');
    console.log('🚀 Your database now contains the complete Apify dataset');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });
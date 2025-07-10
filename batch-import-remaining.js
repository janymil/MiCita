/**
 * 🚀 BATCH IMPORT REMAINING BUSINESSES
 * 
 * Efficiently imports all remaining businesses from scraped data
 * Uses batch processing to handle large datasets
 */

import fs from 'fs';
import { db } from './server/db.ts';
import { apifyBusinesses } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

// Enhanced category mapping with more patterns
const CATEGORY_PATTERNS = {
  salud: ['farmacia', 'médico', 'dental', 'veterinar', 'hospital', 'clínica', 'óptica', 'psicólogo', 'fisioter', 'dentist'],
  fitness: ['gimnasio', 'deport', 'fitness', 'yoga', 'pilates', 'crossfit', 'entren'],
  belleza: ['salón', 'belleza', 'peluquer', 'barber', 'estética', 'spa', 'manicur', 'pedicur'],
  gastronomia: ['restaurante', 'café', 'bar', 'panadería', 'comida', 'pizzer', 'helader', 'cafeter', 'hamburgues']
};

function detectMainCategory(categoryName = '', businessName = '', address = '') {
  const searchText = `${categoryName} ${businessName} ${address}`.toLowerCase();
  
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (patterns.some(pattern => searchText.includes(pattern))) {
      return category;
    }
  }
  
  return 'servicios';
}

function convertBusiness(business) {
  const categoryName = business.categoryName || 'Sin categoría';
  const mainCategory = detectMainCategory(categoryName, business.title, business.address);
  
  // Extract district from address
  let district = null;
  if (business.address) {
    const parts = business.address.split(',');
    if (parts.length >= 2) {
      district = parts[1].trim().split(' ')[0];
    }
  }
  
  // Process phone
  let phone = business.phone || business.phoneUnformatted;
  if (phone && !phone.startsWith('+51')) {
    phone = phone.startsWith('+') ? phone : `+51${phone}`;
  }
  
  // Generate search terms
  const searchTerms = [
    business.title || '',
    categoryName,
    business.address || '',
    district || ''
  ].filter(Boolean).join(' ').toLowerCase();
  
  return {
    placeId: business.placeId,
    name: business.title,
    address: business.address || '',
    category: mainCategory,
    subcategory: categoryName,
    rating: business.totalScore?.toString() || "0",
    reviewCount: business.reviewsCount || 0,
    priceLevel: 0,
    phone: phone,
    website: business.website || null,
    email: business.emails?.[0] || null,
    photoUrl: business.imageUrls?.[0] || null,
    latitude: business.location?.lat?.toString() || "0",
    longitude: business.location?.lng?.toString() || "0",
    openNow: !business.permanentlyClosed && !business.temporarilyClosed,
    hours: business.openingHours ? business.openingHours.map(h => `${h.day}: ${h.hours}`) : [],
    searchTerms: searchTerms,
    district: district,
    isRegistered: false,
    photos: business.imageUrls || [],
    imageUrls: business.imageUrls || [],
    verifiedStatus: business.claimThisBusiness ? "claimed" : "unverified",
    dataFreshnessScore: 95,
    phoneFormatted: phone,
    phoneCountryCode: "+51",
    coordinatesValidated: true,
    businessStatus: business.permanentlyClosed ? "permanently_closed" : 
                   business.temporarilyClosed ? "temporarily_closed" : "operational",
    scrapingSource: "carabayllo_batch",
    qualityScore: calculateQuality(business),
    originalScrapedData: business
  };
}

function calculateQuality(business) {
  let score = 0;
  if (business.totalScore >= 4.5) score += 30;
  else if (business.totalScore >= 4.0) score += 20;
  else if (business.totalScore >= 3.5) score += 10;
  
  if (business.reviewsCount >= 50) score += 20;
  else if (business.reviewsCount >= 10) score += 10;
  
  if (business.phone || business.phoneUnformatted) score += 15;
  if (business.website) score += 15;
  if (business.imageUrls?.length > 0) score += 10;
  if (business.emails?.length > 0) score += 10;
  
  return score;
}

async function batchImport() {
  console.log('🚀 BATCH IMPORT REMAINING BUSINESSES');
  console.log('===================================\n');
  
  const startTime = Date.now();
  
  try {
    // Read all businesses
    const jsonData = fs.readFileSync('attached_assets/dataset_crawler-google-places_2025-07-10_12-51-48-626.json', 'utf8');
    const allBusinesses = JSON.parse(jsonData);
    console.log(`📊 Total scraped businesses: ${allBusinesses.length}`);
    
    // Get existing place IDs to avoid duplicates
    console.log('🔍 Checking existing businesses...');
    const existingPlaceIds = new Set();
    const existing = await db.select({ placeId: apifyBusinesses.placeId }).from(apifyBusinesses);
    existing.forEach(b => existingPlaceIds.add(b.placeId));
    console.log(`📈 Existing businesses: ${existingPlaceIds.size}`);
    
    // Filter new businesses
    const newBusinesses = allBusinesses.filter(b => 
      b.placeId && 
      b.title && 
      !existingPlaceIds.has(b.placeId)
    );
    console.log(`🆕 New businesses to import: ${newBusinesses.length}\n`);
    
    if (newBusinesses.length === 0) {
      console.log('✅ No new businesses to import!');
      return;
    }
    
    // Batch import with progress tracking
    const BATCH_SIZE = 50;
    let imported = 0;
    let errors = 0;
    
    for (let i = 0; i < newBusinesses.length; i += BATCH_SIZE) {
      const batch = newBusinesses.slice(i, i + BATCH_SIZE);
      const batchData = [];
      
      for (const business of batch) {
        try {
          const converted = convertBusiness(business);
          batchData.push(converted);
        } catch (error) {
          errors++;
          console.error(`❌ Conversion error: ${business.title} - ${error.message}`);
        }
      }
      
      if (batchData.length > 0) {
        try {
          await db.insert(apifyBusinesses).values(batchData);
          imported += batchData.length;
          
          const progress = ((i + BATCH_SIZE) / newBusinesses.length * 100).toFixed(1);
          console.log(`✅ Imported batch: ${imported} total (${progress}% complete)`);
        } catch (dbError) {
          errors += batchData.length;
          console.error(`❌ Database batch error: ${dbError.message}`);
        }
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n📊 IMPORT COMPLETED:');
    console.log(`✅ Successfully imported: ${imported} businesses`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`⏱️  Duration: ${duration} seconds`);
    
    // Final statistics
    const finalCount = await db.select().from(apifyBusinesses);
    console.log(`📈 Total businesses in database: ${finalCount.length}`);
    
    // Subcategory stats
    const subcategoryCounts = {};
    const categoryCounts = {};
    
    finalCount.forEach(b => {
      categoryCounts[b.category] = (categoryCounts[b.category] || 0) + 1;
      if (b.subcategory) {
        subcategoryCounts[b.subcategory] = (subcategoryCounts[b.subcategory] || 0) + 1;
      }
    });
    
    console.log('\n🎯 FINAL CATEGORY DISTRIBUTION:');
    Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count} businesses`);
      });
    
    console.log('\n🏷️  TOP 15 SUBCATEGORIES:');
    Object.entries(subcategoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .forEach(([sub, count]) => {
        console.log(`  ${sub}: ${count}`);
      });
    
    console.log('\n✅ BATCH IMPORT COMPLETED SUCCESSFULLY!');
    
  } catch (error) {
    console.error('❌ Batch import failed:', error);
    process.exit(1);
  }
}

batchImport();
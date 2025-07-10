/**
 * 📥 COMAS DISTRICT OPTIMIZED IMPORT
 * 
 * Using optimized approach with memory-based duplicate checking
 * Same as successful Carabayllo import but faster
 */

import fs from 'fs';
import { db } from './server/db.ts';
import { apifyBusinesses } from './shared/schema.ts';
import { eq, sql } from 'drizzle-orm';

function detectMainCategory(categoryName = '', businessName = '', address = '') {
  const category = (categoryName || '').toLowerCase();
  const name = (businessName || '').toLowerCase();
  const addr = (address || '').toLowerCase();
  
  // Gastronomía
  if (category.includes('restaurant') || category.includes('comida') || 
      category.includes('bar') || category.includes('café') || 
      category.includes('panadería') || category.includes('pizzería') ||
      category.includes('heladería') || category.includes('pastelería') ||
      name.includes('restaurant') || name.includes('comida') ||
      name.includes('bar') || name.includes('café')) {
    return 'gastronomia';
  }
  
  // Salud
  if (category.includes('médico') || category.includes('hospital') || 
      category.includes('clínica') || category.includes('farmacia') || 
      category.includes('dentista') || category.includes('veterinario') ||
      category.includes('laboratorio') || category.includes('óptica') ||
      name.includes('médico') || name.includes('clínica') ||
      name.includes('farmacia') || name.includes('veterinario')) {
    return 'salud';
  }
  
  // Belleza
  if (category.includes('salón') || category.includes('peluquería') || 
      category.includes('belleza') || category.includes('spa') || 
      category.includes('estética') || category.includes('barbería') ||
      category.includes('manicure') || category.includes('pedicure') ||
      name.includes('salón') || name.includes('peluquería') ||
      name.includes('belleza') || name.includes('spa') ||
      name.includes('estética') || name.includes('barbería')) {
    return 'belleza';
  }
  
  // Automotriz
  if (category.includes('taller') || category.includes('mecánica') || 
      category.includes('automóvil') || category.includes('repuestos') ||
      category.includes('gasolina') || category.includes('lavado') ||
      category.includes('lubricante') || category.includes('neumático') ||
      name.includes('taller') || name.includes('mecánica') ||
      name.includes('automóvil') || name.includes('repuestos')) {
    return 'automotriz';
  }
  
  // Fitness
  if (category.includes('gym') || category.includes('gimnasio') || 
      category.includes('fitness') || category.includes('deporte') ||
      category.includes('entrenamiento') || category.includes('yoga') ||
      name.includes('gym') || name.includes('gimnasio') ||
      name.includes('fitness') || name.includes('deporte')) {
    return 'fitness';
  }
  
  // Educación
  if (category.includes('escuela') || category.includes('colegio') || 
      category.includes('universidad') || category.includes('academia') ||
      category.includes('instituto') || category.includes('librería') ||
      name.includes('escuela') || name.includes('colegio') ||
      name.includes('universidad') || name.includes('academia')) {
    return 'educacion';
  }
  
  return 'servicios';
}

function convertBusiness(business) {
  const mainCategory = detectMainCategory(business.categoryName, business.title, business.address);
  const subcategory = business.categoryName || 'Sin categoría';
  
  // Generate comprehensive search terms
  const searchTerms = [];
  if (business.title) {
    searchTerms.push(business.title.toLowerCase());
    searchTerms.push(...business.title.toLowerCase().split(' '));
  }
  if (business.categoryName) {
    searchTerms.push(business.categoryName.toLowerCase());
    searchTerms.push(...business.categoryName.toLowerCase().split(' '));
  }
  if (business.address) {
    searchTerms.push('comas', 'lima');
    const addressWords = business.address.toLowerCase().split(' ');
    searchTerms.push(...addressWords.filter(word => word.length > 2));
  }
  
  return {
    placeId: business.placeId,
    name: business.title,
    address: business.address || '',
    phone: business.phone || null,
    website: business.website || null,
    email: business.email || null,
    rating: business.totalScore ? business.totalScore.toString() : null,
    reviewCount: business.reviewsCount || 0,
    priceLevel: business.priceLevel || 0,
    category: mainCategory,
    subcategory: subcategory,
    latitude: business.location?.lat ? business.location.lat.toString() : null,
    longitude: business.location?.lng ? business.location.lng.toString() : null,
    photoUrl: business.imageUrl || null,
    hours: business.openingHours?.length > 0 ? JSON.stringify(business.openingHours) : null,
    openNow: null,
    district: business.city === 'Comas' ? 'Comas' : business.city || 'Lima',
    city: 'Lima',
    searchTerms: [...new Set(searchTerms)].join(' '),
    originalScrapedData: JSON.stringify(business)
  };
}

async function importComasData() {
  const filePath = 'attached_assets/dataset_crawler-google-places_2025-07-10_13-35-33-171.json';
  
  console.log('📥 STARTING COMAS DISTRICT OPTIMIZED IMPORT...\n');
  
  try {
    // Read JSON file
    console.log('📄 Reading Comas district JSON file...');
    const rawData = fs.readFileSync(filePath, 'utf8');
    const scrapedBusinesses = JSON.parse(rawData);
    
    console.log(`📊 Found ${scrapedBusinesses.length} businesses in Comas dataset`);
    
    // Get current database count
    const currentCountResult = await db.select({ count: sql`count(*)` }).from(apifyBusinesses);
    const currentCount = currentCountResult[0].count;
    console.log(`📊 Current database count: ${currentCount}`);
    
    // Load all existing placeIds for fast duplicate checking
    console.log('🔍 Loading existing placeIds for duplicate checking...');
    const existingPlaceIds = await db.select({ placeId: apifyBusinesses.placeId }).from(apifyBusinesses);
    const existingPlaceIdSet = new Set(existingPlaceIds.map(row => row.placeId));
    console.log(`📊 Loaded ${existingPlaceIdSet.size} existing placeIds`);
    
    // Process businesses using memory-based duplicate checking
    console.log('\n🚀 Processing businesses with optimized duplicate checking...');
    const processedBusinesses = [];
    const duplicates = [];
    const errors = [];
    
    for (let i = 0; i < scrapedBusinesses.length; i++) {
      const business = scrapedBusinesses[i];
      
      try {
        // Fast memory-based duplicate check
        if (existingPlaceIdSet.has(business.placeId)) {
          duplicates.push(business.placeId);
          continue;
        }
        
        // Convert business to database format
        const converted = convertBusiness(business);
        processedBusinesses.push(converted);
        
        // Progress indicator
        if ((i + 1) % 500 === 0) {
          console.log(`  Processed: ${i + 1}/${scrapedBusinesses.length}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${business.title}:`, error.message);
        errors.push({ business: business.title, error: error.message });
      }
    }
    
    console.log(`\n📊 PROCESSING RESULTS:`);
    console.log(`  - Total scraped: ${scrapedBusinesses.length}`);
    console.log(`  - Duplicates found: ${duplicates.length}`);
    console.log(`  - Processing errors: ${errors.length}`);
    console.log(`  - Ready to import: ${processedBusinesses.length}`);
    
    // Category analysis
    const categoryStats = {};
    const subcategoryStats = {};
    
    for (const business of processedBusinesses) {
      categoryStats[business.category] = (categoryStats[business.category] || 0) + 1;
      subcategoryStats[business.subcategory] = (subcategoryStats[business.subcategory] || 0) + 1;
    }
    
    console.log(`\n📋 MAIN CATEGORY DISTRIBUTION:`);
    Object.entries(categoryStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`  ${category}: ${count} businesses`);
      });
    
    console.log(`\n🏷️ TOP 15 SUBCATEGORIES:`);
    Object.entries(subcategoryStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .forEach(([subcategory, count]) => {
        console.log(`  ${subcategory}: ${count}`);
      });
    
    // Batch import with progress tracking
    const batchSize = 100;
    const totalBatches = Math.ceil(processedBusinesses.length / batchSize);
    let imported = 0;
    
    console.log(`\n📥 IMPORTING ${processedBusinesses.length} businesses in ${totalBatches} batches...`);
    
    for (let i = 0; i < totalBatches; i++) {
      const batch = processedBusinesses.slice(i * batchSize, (i + 1) * batchSize);
      
      try {
        await db.insert(apifyBusinesses).values(batch);
        imported += batch.length;
        
        const progress = ((imported / processedBusinesses.length) * 100).toFixed(1);
        console.log(`  ✅ Batch ${i + 1}/${totalBatches}: ${imported}/${processedBusinesses.length} (${progress}%)`);
        
      } catch (batchError) {
        console.error(`❌ Batch ${i + 1} failed:`, batchError.message);
        
        // Try individual inserts for failed batch
        for (const business of batch) {
          try {
            await db.insert(apifyBusinesses).values([business]);
            imported++;
          } catch (individualError) {
            console.error(`❌ Failed to import ${business.name}:`, individualError.message);
            errors.push({ business: business.name, error: individualError.message });
          }
        }
      }
    }
    
    // Final verification
    const finalCountResult = await db.select({ count: sql`count(*)` }).from(apifyBusinesses);
    const finalCount = finalCountResult[0].count;
    const actualImported = finalCount - currentCount;
    
    // Count Comas businesses
    const comasCountResult = await db.select({ count: sql`count(*)` })
      .from(apifyBusinesses)
      .where(eq(apifyBusinesses.district, 'Comas'));
    const comasCount = comasCountResult[0].count;
    
    console.log(`\n✅ COMAS DISTRICT IMPORT COMPLETE!`);
    console.log(`📊 FINAL STATISTICS:`);
    console.log(`  - Successfully imported: ${imported} businesses`);
    console.log(`  - Database before: ${currentCount}`);
    console.log(`  - Database after: ${finalCount}`);
    console.log(`  - Net increase: ${actualImported}`);
    console.log(`  - Duplicates skipped: ${duplicates.length}`);
    console.log(`  - Import errors: ${errors.length}`);
    console.log(`  - Total Comas businesses in DB: ${comasCount}`);
    
    if (errors.length > 0) {
      console.log(`\n❌ FIRST 5 ERRORS:`);
      errors.slice(0, 5).forEach(err => {
        console.log(`  - ${err.business}: ${err.error}`);
      });
    }
    
    return {
      imported,
      duplicates: duplicates.length,
      errors: errors.length,
      newTotal: finalCount,
      comasTotal: comasCount
    };
    
  } catch (error) {
    console.error('💥 Fatal error during Comas import:', error);
    throw error;
  }
}

// Execute import
importComasData().then(result => {
  console.log('\n🎉 Comas district import completed successfully!');
  console.log(`🎯 Final result: ${result.imported} new businesses imported`);
  console.log(`🏘️ Total Comas businesses: ${result.comasTotal}`);
  console.log(`📊 New database total: ${result.newTotal}`);
  process.exit(0);
}).catch(error => {
  console.error('💥 Import failed:', error);
  process.exit(1);
});
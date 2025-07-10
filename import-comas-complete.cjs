/**
 * 🚀 COMAS DISTRICT COMPLETE IMPORT
 * 
 * Using the exact same approach that successfully imported Carabayllo
 * Imports all 2,032 businesses from Comas district with intelligent categorization
 */

const fs = require('fs');

// Import database and schema - using exact same approach as successful scripts
import { db } from './server/db.js';
import { apifyBusinesses } from './shared/schema.js';
import { eq, sql } from 'drizzle-orm';

function detectMainCategory(categoryName = '', businessName = '', address = '') {
  const category = categoryName.toLowerCase();
  const name = businessName.toLowerCase();
  const addr = address.toLowerCase();
  
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
  
  // Default to servicios
  return 'servicios';
}

function convertBusiness(business) {
  const mainCategory = detectMainCategory(business.categoryName, business.title, business.address);
  const subcategory = business.categoryName || 'Sin categoría';
  
  return {
    placeId: business.placeId,
    name: business.title,
    address: business.address,
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
    searchTerms: generateSearchTerms(business.title, business.categoryName, business.address),
    originalScrapedData: JSON.stringify(business)
  };
}

function generateSearchTerms(name, categoryName, address) {
  const terms = [];
  
  if (name) {
    terms.push(name.toLowerCase());
    terms.push(...name.toLowerCase().split(' '));
  }
  
  if (categoryName) {
    terms.push(categoryName.toLowerCase());
    terms.push(...categoryName.toLowerCase().split(' '));
  }
  
  if (address) {
    terms.push('comas');
    terms.push('lima');
    const addressWords = address.toLowerCase().split(' ');
    terms.push(...addressWords.filter(word => word.length > 2));
  }
  
  return [...new Set(terms)].join(' ');
}

async function batchImport() {
  const filePath = 'attached_assets/dataset_crawler-google-places_2025-07-10_13-35-33-171.json';
  
  console.log('📥 STARTING COMAS DISTRICT COMPLETE IMPORT...\n');
  
  try {
    // Read and parse the JSON file
    console.log('📄 Reading Comas district JSON file...');
    const rawData = fs.readFileSync(filePath, 'utf8');
    const scrapedBusinesses = JSON.parse(rawData);
    
    console.log(`📊 Found ${scrapedBusinesses.length} businesses in Comas dataset`);
    
    // Get current database count
    const currentCountResult = await db.select({ count: sql`count(*)` }).from(apifyBusinesses);
    const currentCount = currentCountResult[0].count;
    console.log(`📊 Current database count: ${currentCount}`);
    
    // Process businesses and check for duplicates
    const processedBusinesses = [];
    const duplicates = [];
    const errors = [];
    
    console.log('\n🔍 Processing businesses and checking for duplicates...');
    
    for (let i = 0; i < scrapedBusinesses.length; i++) {
      const business = scrapedBusinesses[i];
      
      try {
        // Check if already exists by placeId
        const existing = await db.select()
          .from(apifyBusinesses)
          .where(eq(apifyBusinesses.placeId, business.placeId))
          .limit(1);
        
        if (existing.length > 0) {
          duplicates.push(business.placeId);
          continue;
        }
        
        // Convert business to our format
        const converted = convertBusiness(business);
        processedBusinesses.push(converted);
        
        // Progress indicator
        if ((i + 1) % 100 === 0) {
          process.stdout.write(`\r  Processed: ${i + 1}/${scrapedBusinesses.length}`);
        }
        
      } catch (error) {
        console.error(`\n❌ Error processing business ${business.title}:`, error);
        errors.push({ business: business.title, error: error.message });
      }
    }
    
    console.log(`\n\n📊 PROCESSING SUMMARY:`);
    console.log(`  - Total scraped: ${scrapedBusinesses.length}`);
    console.log(`  - Duplicates found: ${duplicates.length}`);
    console.log(`  - Errors: ${errors.length}`);
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
        
      } catch (error) {
        console.error(`❌ Error importing batch ${i + 1}:`, error);
        
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
    
    console.log(`\n✅ COMAS DISTRICT IMPORT COMPLETE!`);
    console.log(`📊 FINAL STATISTICS:`);
    console.log(`  - Successfully imported: ${imported} businesses`);
    console.log(`  - Database before: ${currentCount}`);
    console.log(`  - Database after: ${finalCount}`);
    console.log(`  - Net increase: ${actualImported}`);
    console.log(`  - Duplicates skipped: ${duplicates.length}`);
    console.log(`  - Import errors: ${errors.length}`);
    
    // District verification
    const comasCount = await db.select({ count: sql`count(*)` })
      .from(apifyBusinesses)
      .where(eq(apifyBusinesses.district, 'Comas'));
    
    console.log(`\n🏘️ DISTRICT VERIFICATION:`);
    console.log(`  - Total Comas businesses in DB: ${comasCount[0].count}`);
    
    if (errors.length > 0) {
      console.log(`\n❌ ERRORS (showing first 5):`);
      errors.slice(0, 5).forEach(err => {
        console.log(`  - ${err.business}: ${err.error}`);
      });
    }
    
    return {
      imported,
      duplicates: duplicates.length,
      errors: errors.length,
      newTotal: finalCount,
      comasTotal: comasCount[0].count
    };
    
  } catch (error) {
    console.error('💥 Fatal error during Comas import:', error);
    throw error;
  }
}

// Execute the import
(async () => {
  try {
    const result = await batchImport();
    console.log('\n🎉 Comas district import completed successfully!');
    console.log(`🎯 Final result: ${result.imported} new businesses imported`);
    process.exit(0);
  } catch (error) {
    console.error('💥 Import failed:', error);
    process.exit(1);
  }
})();
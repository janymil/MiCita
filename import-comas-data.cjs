/**
 * 📥 COMAS DISTRICT DATA IMPORT
 * 
 * Imports all 2,032 businesses from Comas district scraped JSON data
 * Same process as Carabayllo: preserves original data + intelligent category mapping
 */

/**
 * 📥 COMAS DISTRICT COMPLETE IMPORT
 * Using the exact same successful approach as Carabayllo import
 */

const fs = require('fs');
const { db } = require('./server/db.js');
const { apifyBusinesses } = require('./shared/schema.js');
const { eq, sql } = require('drizzle-orm');

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

function calculateQuality(business) {
  let score = 0;
  
  if (business.rating && parseFloat(business.rating) >= 4.0) score += 2;
  if (business.phone) score += 1;
  if (business.website) score += 1;
  if (business.reviewCount > 5) score += 1;
  if (business.latitude && business.longitude) score += 1;
  
  return Math.min(score, 5);
}

async function importComasData() {
  const filePath = 'attached_assets/dataset_crawler-google-places_2025-07-10_13-35-33-171.json';
  
  console.log('📥 STARTING COMAS DISTRICT IMPORT...\n');
  
  try {
    // Read the JSON file
    const rawData = fs.readFileSync(filePath, 'utf8');
    const scrapedBusinesses = JSON.parse(rawData);
    
    console.log(`📊 Found ${scrapedBusinesses.length} businesses in Comas dataset`);
    
    // Get current database count
    const currentCount = await db.select({ count: sql`count(*)` }).from(apifyBusinesses);
    console.log(`📊 Current database count: ${currentCount[0].count}`);
    
    // Convert all businesses
    const convertedBusinesses = [];
    const duplicates = [];
    const errors = [];
    
    for (const business of scrapedBusinesses) {
      try {
        // Check if already exists
        const existing = await db.select().from(apifyBusinesses).where(eq(apifyBusinesses.placeId, business.placeId)).limit(1);
        
        if (existing.length > 0) {
          duplicates.push(business.placeId);
          continue;
        }
        
        const converted = convertBusiness(business);
        convertedBusinesses.push(converted);
        
      } catch (error) {
        console.error(`❌ Error processing business ${business.title}:`, error);
        errors.push({ business: business.title, error: error.message });
      }
    }
    
    console.log(`\n📊 PROCESSING SUMMARY:`);
    console.log(`  - Total scraped: ${scrapedBusinesses.length}`);
    console.log(`  - Duplicates found: ${duplicates.length}`);
    console.log(`  - Errors: ${errors.length}`);
    console.log(`  - Ready to import: ${convertedBusinesses.length}`);
    
    // Category analysis
    const categoryStats = {};
    const subcategoryStats = {};
    
    for (const business of convertedBusinesses) {
      categoryStats[business.category] = (categoryStats[business.category] || 0) + 1;
      subcategoryStats[business.subcategory] = (subcategoryStats[business.subcategory] || 0) + 1;
    }
    
    console.log(`\n📋 CATEGORY MAPPING:`);
    Object.entries(categoryStats).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} businesses`);
    });
    
    console.log(`\n🏷️ TOP SUBCATEGORIES:`);
    Object.entries(subcategoryStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([subcategory, count]) => {
        console.log(`  ${subcategory}: ${count}`);
      });
    
    // Batch import with progress tracking
    const batchSize = 100;
    const totalBatches = Math.ceil(convertedBusinesses.length / batchSize);
    let imported = 0;
    
    console.log(`\n📥 IMPORTING ${convertedBusinesses.length} businesses in ${totalBatches} batches...`);
    
    for (let i = 0; i < totalBatches; i++) {
      const batch = convertedBusinesses.slice(i * batchSize, (i + 1) * batchSize);
      
      try {
        await db.insert(apifyBusinesses).values(batch);
        imported += batch.length;
        
        const progress = ((imported / convertedBusinesses.length) * 100).toFixed(1);
        console.log(`  Batch ${i + 1}/${totalBatches}: ${imported}/${convertedBusinesses.length} (${progress}%)`);
        
      } catch (error) {
        console.error(`❌ Error importing batch ${i + 1}:`, error);
        
        // Try individual inserts for this batch
        for (const business of batch) {
          try {
            await db.insert(apifyBusinesses).values([business]);
            imported++;
          } catch (individualError) {
            console.error(`❌ Error importing ${business.name}:`, individualError);
            errors.push({ business: business.name, error: individualError.message });
          }
        }
      }
    }
    
    // Final database count
    const finalCount = await db.select({ count: sql`count(*)` }).from(apifyBusinesses);
    
    console.log(`\n✅ IMPORT COMPLETE!`);
    console.log(`📊 FINAL STATISTICS:`);
    console.log(`  - Successfully imported: ${imported} businesses`);
    console.log(`  - Database before: ${currentCount[0].count}`);
    console.log(`  - Database after: ${finalCount[0].count}`);
    console.log(`  - Net increase: ${finalCount[0].count - currentCount[0].count}`);
    console.log(`  - Duplicates skipped: ${duplicates.length}`);
    console.log(`  - Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log(`\n❌ ERRORS:`);
      errors.slice(0, 5).forEach(err => {
        console.log(`  - ${err.business}: ${err.error}`);
      });
    }
    
    return {
      imported,
      duplicates: duplicates.length,
      errors: errors.length,
      newTotal: finalCount[0].count
    };
    
  } catch (error) {
    console.error('❌ Fatal error during import:', error);
    throw error;
  }
}

// Execute import using the same approach as successful Carabayllo import

// Execute import
(async () => {
  try {
    const result = await importComasData();
    console.log('\n🎉 Comas district import completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Import failed:', error);
    process.exit(1);
  }
})();
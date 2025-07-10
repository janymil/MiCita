/**
 * 📥 OPENSTREETMAP GEOJSON IMPORT SYSTEM
 * 
 * Imports 53,806 businesses from OpenStreetMap GeoJSON data
 * Legal alternative to Google Places data with comprehensive coverage
 */

import fs from 'fs';
import { db } from './server/db.js';
import { openstreetBusinesses } from './shared/schema.js';
import { eq, sql } from 'drizzle-orm';

function detectCategory(properties) {
  const amenity = (properties.amenity || '').toLowerCase();
  const shop = (properties.shop || '').toLowerCase();
  const name = (properties.name || '').toLowerCase();
  const cuisine = (properties.cuisine || '').toLowerCase();
  
  // Gastronomía
  if (amenity.includes('restaurant') || amenity.includes('cafe') || 
      amenity.includes('bar') || amenity.includes('pub') ||
      shop.includes('bakery') || cuisine) {
    return 'gastronomia';
  }
  
  // Salud
  if (amenity.includes('hospital') || amenity.includes('clinic') || 
      amenity.includes('pharmacy') || amenity.includes('dentist') ||
      amenity.includes('veterinary') || shop.includes('medical')) {
    return 'salud';
  }
  
  // Belleza
  if (shop.includes('hairdresser') || shop.includes('beauty') || 
      amenity.includes('spa') || name.includes('salon') ||
      name.includes('peluquer') || name.includes('barber')) {
    return 'belleza';
  }
  
  // Automotriz
  if (amenity.includes('fuel') || shop.includes('car') || 
      shop.includes('automotive') || amenity.includes('car_wash') ||
      name.includes('taller') || name.includes('mechanic')) {
    return 'automotriz';
  }
  
  // Fitness
  if (amenity.includes('gym') || shop.includes('sports') || 
      name.includes('gimnasio') || name.includes('fitness')) {
    return 'fitness';
  }
  
  // Educación
  if (amenity.includes('school') || amenity.includes('university') || 
      amenity.includes('college') || shop.includes('books') ||
      amenity.includes('library')) {
    return 'educacion';
  }
  
  return 'servicios';
}

function extractAddress(properties) {
  const parts = [];
  
  if (properties['addr:housenumber']) {
    parts.push(properties['addr:housenumber']);
  }
  if (properties['addr:street']) {
    parts.push(properties['addr:street']);
  }
  if (properties['addr:city'] || properties['addr:district']) {
    parts.push(properties['addr:city'] || properties['addr:district']);
  }
  if (properties['addr:postcode']) {
    parts.push(properties['addr:postcode']);
  }
  
  return parts.length > 0 ? parts.join(', ') : null;
}

function convertOSMBusiness(feature) {
  const props = feature.properties;
  const geometry = feature.geometry;
  
  // Extract coordinates
  let latitude = null;
  let longitude = null;
  if (geometry && geometry.coordinates) {
    longitude = geometry.coordinates[0];
    latitude = geometry.coordinates[1];
  }
  
  // Determine main category and subcategory
  const category = detectCategory(props);
  const subcategory = props.amenity || props.shop || 'Lugar de interés';
  
  // Build full address
  const address = extractAddress(props);
  
  return {
    osmId: props['@id'] || feature.id,
    osmType: props['@id'] ? props['@id'].split('/')[0] : 'unknown',
    name: props.name || 'Sin nombre',
    amenity: props.amenity || null,
    shop: props.shop || null,
    address: address,
    houseNumber: props['addr:housenumber'] || null,
    street: props['addr:street'] || null,
    city: props['addr:city'] || 'Lima',
    district: props['addr:district'] || props['addr:city'] || null,
    postcode: props['addr:postcode'] || null,
    phone: props.phone || null,
    website: props.website || null,
    email: props.email || null,
    openingHours: props.opening_hours || null,
    latitude: latitude ? latitude.toString() : null,
    longitude: longitude ? longitude.toString() : null,
    building: props.building || null,
    buildingLevels: props['building:levels'] || null,
    operator: props.operator || null,
    brand: props.brand || null,
    cuisine: props.cuisine || null,
    wheelchair: props.wheelchair || null,
    category: category,
    subcategory: subcategory,
    tags: props, // Store all original OSM tags
    geometry: geometry
  };
}

async function importOpenStreetMapData() {
  const filePath = 'attached_assets/export.geojson';
  
  console.log('📥 STARTING OPENSTREETMAP GEOJSON IMPORT...\n');
  console.log('🗺️  Legal alternative to Google Places data');
  console.log('📊 Expected: 53,806 businesses from OSM data\n');
  
  try {
    // Read GeoJSON file
    console.log('📄 Reading OpenStreetMap GeoJSON file...');
    const rawData = fs.readFileSync(filePath, 'utf8');
    const geoData = JSON.parse(rawData);
    
    console.log(`📊 Found ${geoData.features.length} features in GeoJSON`);
    
    // Get current database count
    const currentCountResult = await db.select({ count: sql`count(*)` }).from(openstreetBusinesses);
    const currentCount = currentCountResult[0].count || 0;
    console.log(`📊 Current OpenStreet table count: ${currentCount}`);
    
    // Load existing OSM IDs for duplicate checking
    console.log('🔍 Loading existing OSM IDs for duplicate checking...');
    const existingOsmIds = await db.select({ osmId: openstreetBusinesses.osmId }).from(openstreetBusinesses);
    const existingOsmIdSet = new Set(existingOsmIds.map(row => row.osmId));
    console.log(`📊 Loaded ${existingOsmIdSet.size} existing OSM IDs`);
    
    // Process features with memory-based duplicate checking
    console.log('\n🚀 Processing OSM features...');
    const processedBusinesses = [];
    const duplicates = [];
    const errors = [];
    const skippedFeatures = [];
    
    for (let i = 0; i < geoData.features.length; i++) {
      const feature = geoData.features[i];
      
      try {
        // Skip features without business relevance
        const props = feature.properties;
        if (!props.name && !props.amenity && !props.shop) {
          skippedFeatures.push('No business data');
          continue;
        }
        
        // Fast memory-based duplicate check
        const osmId = props['@id'] || feature.id;
        if (existingOsmIdSet.has(osmId)) {
          duplicates.push(osmId);
          continue;
        }
        
        // Convert feature to business format
        const converted = convertOSMBusiness(feature);
        
        // Skip if no coordinates
        if (!converted.latitude || !converted.longitude) {
          skippedFeatures.push('No coordinates');
          continue;
        }
        
        processedBusinesses.push(converted);
        
        // Progress indicator
        if ((i + 1) % 5000 === 0) {
          console.log(`  Processed: ${i + 1}/${geoData.features.length}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing feature ${i}:`, error.message);
        errors.push({ feature: i, error: error.message });
      }
    }
    
    console.log(`\n📊 PROCESSING RESULTS:`);
    console.log(`  - Total features: ${geoData.features.length}`);
    console.log(`  - Features skipped: ${skippedFeatures.length}`);
    console.log(`  - Duplicates found: ${duplicates.length}`);
    console.log(`  - Processing errors: ${errors.length}`);
    console.log(`  - Ready to import: ${processedBusinesses.length}`);
    
    // Category analysis
    const categoryStats = {};
    const amenityStats = {};
    
    for (const business of processedBusinesses) {
      categoryStats[business.category] = (categoryStats[business.category] || 0) + 1;
      if (business.amenity) {
        amenityStats[business.amenity] = (amenityStats[business.amenity] || 0) + 1;
      }
    }
    
    console.log(`\n📋 MAIN CATEGORY DISTRIBUTION:`);
    Object.entries(categoryStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`  ${category}: ${count} businesses`);
      });
    
    console.log(`\n🏷️ TOP 15 AMENITY TYPES:`);
    Object.entries(amenityStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .forEach(([amenity, count]) => {
        console.log(`  ${amenity}: ${count}`);
      });
    
    // Batch import with progress tracking
    const batchSize = 200;
    const totalBatches = Math.ceil(processedBusinesses.length / batchSize);
    let imported = 0;
    
    console.log(`\n📥 IMPORTING ${processedBusinesses.length} businesses in ${totalBatches} batches...`);
    
    for (let i = 0; i < totalBatches; i++) {
      const batch = processedBusinesses.slice(i * batchSize, (i + 1) * batchSize);
      
      try {
        await db.insert(openstreetBusinesses).values(batch);
        imported += batch.length;
        
        const progress = ((imported / processedBusinesses.length) * 100).toFixed(1);
        console.log(`  ✅ Batch ${i + 1}/${totalBatches}: ${imported}/${processedBusinesses.length} (${progress}%)`);
        
      } catch (batchError) {
        console.error(`❌ Batch ${i + 1} failed:`, batchError.message);
        
        // Try individual inserts for failed batch
        for (const business of batch) {
          try {
            await db.insert(openstreetBusinesses).values([business]);
            imported++;
          } catch (individualError) {
            console.error(`❌ Failed to import ${business.name}:`, individualError.message);
            errors.push({ business: business.name, error: individualError.message });
          }
        }
      }
    }
    
    // Final verification
    const finalCountResult = await db.select({ count: sql`count(*)` }).from(openstreetBusinesses);
    const finalCount = finalCountResult[0].count;
    const actualImported = finalCount - currentCount;
    
    console.log(`\n✅ OPENSTREETMAP IMPORT COMPLETE!`);
    console.log(`📊 FINAL STATISTICS:`);
    console.log(`  - Successfully imported: ${imported} businesses`);
    console.log(`  - Database before: ${currentCount}`);
    console.log(`  - Database after: ${finalCount}`);
    console.log(`  - Net increase: ${actualImported}`);
    console.log(`  - Duplicates skipped: ${duplicates.length}`);
    console.log(`  - Import errors: ${errors.length}`);
    
    // Geographic analysis
    const districtCountResult = await db.select({ 
      district: openstreetBusinesses.district, 
      count: sql`count(*)` 
    })
    .from(openstreetBusinesses)
    .groupBy(openstreetBusinesses.district)
    .orderBy(sql`count(*) DESC`)
    .limit(10);
    
    console.log(`\n🏘️ TOP DISTRICTS IN OSM DATA:`);
    districtCountResult.forEach(row => {
      console.log(`  ${row.district || 'Sin distrito'}: ${row.count} businesses`);
    });
    
    if (errors.length > 0) {
      console.log(`\n❌ FIRST 5 ERRORS:`);
      errors.slice(0, 5).forEach(err => {
        console.log(`  - ${err.business || err.feature}: ${err.error}`);
      });
    }
    
    return {
      imported,
      duplicates: duplicates.length,
      errors: errors.length,
      newTotal: finalCount,
      skipped: skippedFeatures.length
    };
    
  } catch (error) {
    console.error('💥 Fatal error during OpenStreetMap import:', error);
    throw error;
  }
}

// Execute import
importOpenStreetMapData().then(result => {
  console.log('\n🎉 OpenStreetMap import completed successfully!');
  console.log(`🎯 Final result: ${result.imported} new businesses imported`);
  console.log(`🗺️  Legal OSM data now available in openstreet_businesses table`);
  console.log(`📊 Total OSM businesses: ${result.newTotal}`);
  process.exit(0);
}).catch(error => {
  console.error('💥 Import failed:', error);
  process.exit(1);
});
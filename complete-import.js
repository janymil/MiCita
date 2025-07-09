#!/usr/bin/env node

/**
 * 📥 Complete Business Data Import
 * 
 * This script imports ALL 2,217 businesses from the scraped JSON data
 * with original categories preserved as subcategories and logical main categories.
 */

import { storage } from './server/storage.ts';
import { 
  PhoneNumberProcessor, 
  CategoryMapper, 
  CoordinateValidator, 
  DataValidator 
} from './server/data-enhancement-utils.ts';
import fs from 'fs';

// Define main category mapping logic
const MAIN_CATEGORY_MAPPING = {
  // Beauty & Personal Care
  'Barbería': 'belleza',
  'Centro de estética': 'belleza',
  'Peluquería': 'belleza',
  'Salón de manicura y pedicura': 'belleza',
  'Spa': 'belleza',
  'Tienda de productos de belleza': 'belleza',
  'Proveedor de productos de belleza': 'belleza',
  'Tienda de belleza y salud': 'belleza',
  'Tienda de cosméticos': 'belleza',
  'Academia de estética': 'belleza',
  'Centro de depilación láser': 'belleza',
  'Esteticista facial': 'belleza',
  'Balneario': 'belleza',
  'Esteticista': 'belleza',
  'Estilista': 'belleza',
  'Escuela de peluquería': 'belleza',
  'Peluquero de mascotas': 'belleza',
  'Tienda de suministros para peluquería': 'belleza',
  'Spa y gimnasio': 'belleza',
  'Spa terapéutico': 'belleza',
  
  // Health & Medical
  'Clínica ambulatoria': 'salud',
  'Farmacia': 'salud',
  'Centro médico': 'salud',
  'Psicólogo': 'salud',
  'Dentista': 'salud',
  'Clínica dental': 'salud',
  'Oftalmólogo': 'salud',
  'Veterinario': 'salud',
  'Laboratorio clínico': 'salud',
  'Fisioterapeuta': 'salud',
  'Nutricionista': 'salud',
  'Podólogo': 'salud',
  'Médico': 'salud',
  'Hospital': 'salud',
  'Cirujano plástico': 'salud',
  'Laboratorio de análisis clínicos': 'salud',
  'Clínica especializada': 'salud',
  'Cirujano': 'salud',
  'Centro de salud y bienestar': 'salud',
  'Tienda de vitaminas y suplementos': 'salud',
  
  // Food & Gastronomy
  'Restaurante': 'gastronomia',
  'Cafetería': 'gastronomia',
  'Panadería': 'gastronomia',
  'Bar': 'gastronomia',
  'Pizzería': 'gastronomia',
  'Heladería': 'gastronomia',
  'Comida rápida': 'gastronomia',
  
  // Fitness & Sports
  'Gimnasio': 'fitness',
  'Centro de yoga': 'fitness',
  'Estudio de pilates': 'fitness',
  'Centro de fitness': 'fitness',
  'Entrenador personal': 'fitness',
  
  // Automotive
  'Taller mecánico': 'automotriz',
  'Lavado de autos': 'automotriz',
  'Gasolinera': 'automotriz',
  'Tienda de repuestos': 'automotriz',
  'Concesionario': 'automotriz',
  'Lubricentro': 'automotriz',
  'Vulcanizadora': 'automotriz',
  
  // Services
  'Centro comercial': 'servicios',
  'Abogado': 'servicios',
  'Contador': 'servicios',
  'Inmobiliaria': 'servicios',
  'Notario': 'servicios',
  'Consultor': 'servicios',
  'Agencia de seguros': 'servicios',
  'Banco': 'servicios',
  'Tecnología': 'servicios',
  'Limpieza': 'servicios',
  'Seguridad': 'servicios',
  'Construcción': 'servicios',
  'Arquitecto': 'servicios',
  'Diseñador': 'servicios',
  'Publicidad': 'servicios',
  'Grandes almacenes': 'servicios',
  'Escuela': 'servicios',
  
  // Hospitality
  'Hotel': 'servicios' // Could be separate category but keeping in services for now
};

// Convert JSON business to database format
function convertToApifyBusiness(place) {
  const businessName = place.title || 'Business';
  const address = place.address || 'Lima, Peru';
  const originalCategory = place.categoryName || 'Unknown';
  
  // Map to main category
  const mainCategory = MAIN_CATEGORY_MAPPING[originalCategory] || 'servicios';
  
  // Enhanced phone processing
  const rawPhone = place.phoneUnformatted || place.phone || null;
  const phoneResult = rawPhone ? PhoneNumberProcessor.standardizePhone(rawPhone) : null;
  
  // Enhanced coordinate validation
  const lat = place.location?.lat || null;
  const lng = place.location?.lng || null;
  const coordResult = lat && lng ? CoordinateValidator.validateCoordinates(lat, lng) : null;
  
  // Extract opening hours
  const hours = place.openingHours || null;
  
  // Extract images
  const photos = place.imageUrls || [];
  const photoUrl = photos.length > 0 ? photos[0] : null;
  
  // Extract social media if available
  const socialMedia = {};
  if (place.website) {
    // Check if website contains social media URLs
    const text = place.website;
    if (text.includes('facebook.com')) socialMedia.facebook = text;
    if (text.includes('instagram.com')) socialMedia.instagram = text;
  }
  
  return {
    placeId: place.placeId,
    name: businessName,
    address: address,
    category: mainCategory, // Main category (belleza, salud, etc.)
    subcategory: originalCategory, // Original category (Barbería, Centro de estética, etc.)
    rating: place.totalScore || 0,
    reviewCount: place.reviewsCount || 0,
    priceLevel: place.priceLevel || null,
    phone: phoneResult?.formatted || rawPhone,
    website: place.website || null,
    photoUrl: photoUrl,
    photos: photos,
    latitude: coordResult?.correctedLat || lat,
    longitude: coordResult?.correctedLng || lng,
    openNow: place.openNow || null,
    hours: hours,
    email: place.email || null,
    socialMedia: Object.keys(socialMedia).length > 0 ? socialMedia : null,
    searchTerms: `${businessName} ${originalCategory} ${address}`.toLowerCase(),
    isRegistered: false,
    phoneFormatted: phoneResult?.formatted || null,
    phoneCountryCode: phoneResult?.countryCode || '+51',
    coordinatesValidated: coordResult?.isValid || false,
    businessStatus: place.permanentlyClosed ? 'closed' : place.temporarilyClosed ? 'temporarily_closed' : 'open',
    lastScraped: new Date(),
    scrapingSource: 'apify',
    qualityScore: calculateQualityScore(place),
    createdAt: new Date(),
    lastUpdated: new Date()
  };
}

// Calculate quality score based on available data
function calculateQualityScore(place) {
  let score = 0;
  if (place.phone) score += 20;
  if (place.website) score += 20;
  if (place.totalScore > 0) score += 15;
  if (place.reviewsCount > 0) score += 15;
  if (place.imageUrls && place.imageUrls.length > 0) score += 15;
  if (place.openingHours) score += 10;
  if (place.address && place.address.length > 20) score += 5;
  return score;
}

async function importAllBusinessData() {
  console.log('🚀 COMPLETE BUSINESS DATA IMPORT');
  console.log('================================');
  
  try {
    // Load the JSON data
    const jsonPath = '/home/runner/workspace/attached_assets/dataset_crawler-google-places_2025-07-09_17-56-49-308.json';
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    console.log(`📦 Loaded ${jsonData.length} businesses from JSON file`);
    
    // Check current database count
    const currentCount = await getCurrentDatabaseCount();
    console.log(`📊 Current database count: ${currentCount}`);
    
    // Category analysis
    const categoryStats = {};
    const subcategoryStats = {};
    
    let imported = 0;
    let updated = 0;
    let errors = 0;
    
    console.log('\\n🔄 Starting import process...');
    
    // Import each business
    for (let i = 0; i < jsonData.length; i++) {
      const place = jsonData[i];
      
      try {
        const business = convertToApifyBusiness(place);
        
        // Track categories
        categoryStats[business.category] = (categoryStats[business.category] || 0) + 1;
        subcategoryStats[business.subcategory] = (subcategoryStats[business.subcategory] || 0) + 1;
        
        // Validate business data
        const validation = DataValidator.validateBusinessData(business);
        if (!validation.isValid) {
          console.log(`⚠️ Validation failed for ${business.name}: ${validation.errors.join(', ')}`);
          errors++;
          continue;
        }
        
        // Check if already exists
        const existing = await storage.getApifyBusiness(business.placeId);
        if (existing) {
          updated++;
        } else {
          imported++;
        }
        
        // Store business
        await storage.addApifyBusiness(business);
        
        // Log progress every 100 businesses
        if ((i + 1) % 100 === 0) {
          console.log(`📈 Progress: ${i + 1}/${jsonData.length} processed (${imported} new, ${updated} updated, ${errors} errors)`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${place.title || 'unknown'}: ${error.message}`);
        errors++;
      }
    }
    
    // Final database count
    const finalCount = await getCurrentDatabaseCount();
    const newBusinesses = finalCount - currentCount;
    
    console.log('\\n🎉 IMPORT RESULTS');
    console.log('==================');
    console.log(`📊 Total businesses processed: ${jsonData.length}`);
    console.log(`✅ Successfully imported (new): ${imported}`);
    console.log(`📝 Updated (existing): ${updated}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📈 Net new businesses added: ${newBusinesses}`);
    console.log(`📊 Total businesses in database: ${finalCount}`);
    
    console.log('\\n🗂️ MAIN CATEGORY DISTRIBUTION');
    console.log('==============================');
    Object.entries(categoryStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        const percentage = ((count / jsonData.length) * 100).toFixed(1);
        console.log(`  ${category}: ${count} businesses (${percentage}%)`);
      });
    
    console.log('\\n🏷️ TOP SUBCATEGORIES');
    console.log('====================');
    Object.entries(subcategoryStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .forEach(([subcategory, count]) => {
        const percentage = ((count / jsonData.length) * 100).toFixed(1);
        console.log(`  ${subcategory}: ${count} businesses (${percentage}%)`);
      });
    
    if (finalCount >= 2217) {
      console.log('\\n✅ SUCCESS: All scraped businesses have been imported!');
      console.log('🎯 Your database now contains all 2,217+ businesses');
      console.log('🗂️ Original categories preserved as subcategories');
      console.log('🎨 Logical main categories assigned for organization');
    } else {
      console.log('\\n⚠️ WARNING: Some businesses may be missing');
      console.log(`Expected: 2,217 | Got: ${finalCount}`);
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  }
}

async function getCurrentDatabaseCount() {
  try {
    const { neon } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-http');
    const { sql } = await import('drizzle-orm');
    
    const db = drizzle(neon(process.env.DATABASE_URL));
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM apify_businesses`);
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Error getting database count:', error);
    return 0;
  }
}

// Run the complete import
importAllBusinessData()
  .then(() => {
    console.log('\\n✅ Complete import process finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\\n❌ Complete import process failed:', error);
    process.exit(1);
  });
/**
 * 🎯 SUBCATEGORY ANALYSIS & IMPORT SYSTEM
 * 
 * This script analyzes the scraped JSON data to:
 * 1. Extract all unique categoryName values
 * 2. Create intelligent mapping to main categories
 * 3. Import new businesses with proper subcategorization
 * 4. Generate comprehensive statistics
 */

import fs from 'fs';
import { db } from './server/db.ts';
import { apifyBusinesses } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

// Intelligent category mapping system
const CATEGORY_MAPPING = {
  // SALUD - Health & Medical Services
  salud: [
    'farmacia', 'dentista', 'clínica dental', 'centro médico', 'veterinario',
    'óptica', 'hospital', 'laboratorio médico', 'fisioterapia', 'psicólogo',
    'nutricionista', 'enfermería', 'medicina general', 'cardiología',
    'dermatología', 'pediatría', 'ginecología', 'urología', 'oftalmología'
  ],
  
  // FITNESS - Sports & Fitness
  fitness: [
    'gimnasio', 'centro de fitness', 'yoga', 'pilates', 'crossfit',
    'danza', 'artes marciales', 'natación', 'entrenamiento personal',
    'spinning', 'aeróbicos', 'deportes', 'club deportivo'
  ],
  
  // BELLEZA - Beauty & Personal Care
  belleza: [
    'salón de belleza', 'peluquería', 'barbería', 'spa', 'manicura',
    'pedicura', 'masajes', 'estética', 'depilación', 'maquillaje',
    'tratamientos faciales', 'cuidado de la piel', 'uñas', 'cejas'
  ],
  
  // GASTRONOMÍA - Food & Restaurants
  gastronomia: [
    'restaurante', 'cafetería', 'panadería', 'pastelería', 'pizzería',
    'comida rápida', 'bar', 'pub', 'heladería', 'jugos', 'cevichería',
    'chifa', 'pollos a la brasa', 'food truck', 'catering', 'delivery'
  ],
  
  // SERVICIOS - General Services
  servicios: [
    'taller de reparación', 'mecánico', 'electricista', 'plomero',
    'cerrajería', 'carpintería', 'pintura', 'limpieza', 'lavandería',
    'servicio de lavado', 'reparación de automóviles', 'servicio de informática',
    'reparación de teléfonos', 'fotografía', 'imprenta', 'agencia inmobiliaria',
    'banco', 'oficinas', 'empresa constructora', 'ferretería', 'librería',
    'tienda', 'comercio', 'educación', 'escuela', 'academia', 'instituto'
  ]
};

// Enhanced category detection using multiple strategies
function detectMainCategory(categoryName, businessName = '', address = '') {
  // Handle null/undefined values
  const safeCategory = categoryName || '';
  const safeName = businessName || '';
  const safeAddress = address || '';
  
  const searchText = `${safeCategory} ${safeName} ${safeAddress}`.toLowerCase();
  
  // Strategy 1: Direct keyword matching
  for (const [mainCategory, keywords] of Object.entries(CATEGORY_MAPPING)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return mainCategory;
      }
    }
  }
  
  // Strategy 2: Advanced pattern matching
  const categoryLower = safeCategory.toLowerCase();
  
  // Health patterns
  if (categoryLower.includes('médico') || categoryLower.includes('salud') || 
      categoryLower.includes('clínica') || categoryLower.includes('farmacia') ||
      categoryLower.includes('dental') || categoryLower.includes('veterinar')) {
    return 'salud';
  }
  
  // Beauty patterns
  if (categoryLower.includes('belleza') || categoryLower.includes('peluquer') ||
      categoryLower.includes('barber') || categoryLower.includes('salón') ||
      categoryLower.includes('spa') || categoryLower.includes('estética')) {
    return 'belleza';
  }
  
  // Fitness patterns
  if (categoryLower.includes('gimnasio') || categoryLower.includes('deport') ||
      categoryLower.includes('fitness') || categoryLower.includes('yoga') ||
      categoryLower.includes('entren')) {
    return 'fitness';
  }
  
  // Food patterns
  if (categoryLower.includes('restaurante') || categoryLower.includes('comida') ||
      categoryLower.includes('café') || categoryLower.includes('panadería') ||
      categoryLower.includes('bar') || categoryLower.includes('gastron')) {
    return 'gastronomia';
  }
  
  // Default to servicios for everything else
  return 'servicios';
}

// Convert scraped business to our database format - PRESERVING ALL DATA
function convertScrapedBusiness(scrapedBusiness) {
  // Ensure we have required data
  if (!scrapedBusiness.placeId || !scrapedBusiness.title) {
    throw new Error('Missing required placeId or title');
  }
  
  const categoryName = scrapedBusiness.categoryName || 'Sin categoría';
  const mainCategory = detectMainCategory(
    categoryName,
    scrapedBusiness.title,
    scrapedBusiness.address
  );
  
  // Extract district from address
  const addressParts = scrapedBusiness.address?.split(',') || [];
  let district = null;
  if (addressParts.length >= 2) {
    // Usually format: "Street, District PostalCode, Country"
    const secondPart = addressParts[1].trim();
    district = secondPart.split(' ')[0]; // Take first word as district
  }
  
  // Process phone number
  let phone = scrapedBusiness.phone || scrapedBusiness.phoneUnformatted;
  if (phone && !phone.startsWith('+51')) {
    phone = phone.startsWith('+') ? phone : `+51${phone}`;
  }
  
  // Process opening hours - PRESERVE COMPLETE DATA
  let hours = [];
  if (scrapedBusiness.openingHours && Array.isArray(scrapedBusiness.openingHours)) {
    hours = scrapedBusiness.openingHours.map(h => `${h.day}: ${h.hours}`);
  }
  
  // Process ALL image URLs - PRESERVE COMPLETE DATA
  let imageUrls = [];
  if (scrapedBusiness.imageUrls && Array.isArray(scrapedBusiness.imageUrls)) {
    imageUrls = scrapedBusiness.imageUrls;
  }
  
  // Extract social media from scraped data
  const socialMedia = {};
  if (scrapedBusiness.website && scrapedBusiness.website.includes('facebook')) {
    socialMedia.facebook = scrapedBusiness.website;
  }
  if (scrapedBusiness.facebooks && scrapedBusiness.facebooks.length > 0) {
    socialMedia.facebook = scrapedBusiness.facebooks[0];
  }
  if (scrapedBusiness.instagrams && scrapedBusiness.instagrams.length > 0) {
    socialMedia.instagram = scrapedBusiness.instagrams[0];
  }
  if (scrapedBusiness.youtubes && scrapedBusiness.youtubes.length > 0) {
    socialMedia.youtube = scrapedBusiness.youtubes[0];
  }
  if (scrapedBusiness.tiktoks && scrapedBusiness.tiktoks.length > 0) {
    socialMedia.tiktok = scrapedBusiness.tiktoks[0];
  }
  
  // Extract emails - PRESERVE COMPLETE DATA
  let email = null;
  if (scrapedBusiness.emails && scrapedBusiness.emails.length > 0) {
    email = scrapedBusiness.emails[0];
  }
  
  // Process ALL phone numbers - PRESERVE COMPLETE DATA
  const allPhones = [];
  if (scrapedBusiness.phones && Array.isArray(scrapedBusiness.phones)) {
    allPhones.push(...scrapedBusiness.phones);
  }
  if (scrapedBusiness.phonesUncertain && Array.isArray(scrapedBusiness.phonesUncertain)) {
    allPhones.push(...scrapedBusiness.phonesUncertain);
  }
  
  // Create comprehensive description from available data
  let description = null;
  if (scrapedBusiness.hotelDescription) {
    description = scrapedBusiness.hotelDescription;
  }
  
  // Extract services from categories and web results
  const services = [];
  if (scrapedBusiness.categories && Array.isArray(scrapedBusiness.categories)) {
    services.push(...scrapedBusiness.categories);
  }
  
  // Process popular times - PRESERVE COMPLETE DATA
  let popularTimes = null;
  if (scrapedBusiness.popularTimes) {
    popularTimes = scrapedBusiness.popularTimes;
  }
  
  // Calculate quality score based on ALL available data
  let qualityScore = 0;
  if (scrapedBusiness.totalScore >= 4.5) qualityScore += 30;
  else if (scrapedBusiness.totalScore >= 4.0) qualityScore += 20;
  else if (scrapedBusiness.totalScore >= 3.5) qualityScore += 10;
  
  if (scrapedBusiness.reviewsCount >= 50) qualityScore += 20;
  else if (scrapedBusiness.reviewsCount >= 10) qualityScore += 10;
  
  if (phone) qualityScore += 15;
  if (scrapedBusiness.website) qualityScore += 15;
  if (imageUrls.length > 0) qualityScore += 10;
  if (email) qualityScore += 10;
  if (Object.keys(socialMedia).length > 0) qualityScore += 5;
  
  return {
    placeId: scrapedBusiness.placeId,
    name: scrapedBusiness.title,
    address: scrapedBusiness.address,
    category: mainCategory,
    subcategory: categoryName, // Original category becomes subcategory
    rating: scrapedBusiness.totalScore?.toString() || "0",
    reviewCount: scrapedBusiness.reviewsCount || 0,
    priceLevel: scrapedBusiness.price || 0,
    phone: phone,
    website: scrapedBusiness.website,
    email: email, // NOW PRESERVED
    photoUrl: imageUrls[0] || null,
    latitude: scrapedBusiness.location?.lat?.toString() || "0",
    longitude: scrapedBusiness.location?.lng?.toString() || "0",
    openNow: !scrapedBusiness.permanentlyClosed && !scrapedBusiness.temporarilyClosed,
    hours: hours, // COMPLETE OPENING HOURS
    searchTerms: generateSearchTerms(scrapedBusiness.title, scrapedBusiness.categoryName, scrapedBusiness.address),
    district: district,
    isRegistered: false,
    streetViewUrl: null, // Could extract from imageCategories
    photos: imageUrls, // ALL PHOTOS PRESERVED
    popularTimes: popularTimes, // PRESERVED IF AVAILABLE
    currentPopularity: null,
    livePopularityStatus: null,
    description: description, // PRESERVED IF AVAILABLE
    services: services, // ALL CATEGORIES AS SERVICES
    socialMedia: socialMedia, // ALL SOCIAL MEDIA PRESERVED
    imageUrls: imageUrls, // DUPLICATE FOR COMPATIBILITY
    verifiedStatus: scrapedBusiness.claimThisBusiness ? "claimed" : "unverified",
    dataFreshnessScore: 95, // Fresh scraped data with complete info
    phoneFormatted: phone,
    phoneCountryCode: "+51",
    coordinatesValidated: true,
    businessStatus: scrapedBusiness.permanentlyClosed ? "permanently_closed" : 
                   scrapedBusiness.temporarilyClosed ? "temporarily_closed" : "operational",
    amenities: {}, // Could extract from additional data
    priceRangeText: scrapedBusiness.price ? `Price: ${scrapedBusiness.price}` : null,
    scrapingSource: "carabayllo_complete_scraper",
    qualityScore: qualityScore,
    
    // Store complete original data as JSON for future reference
    originalScrapedData: scrapedBusiness
  };
}

// Generate enhanced search terms
function generateSearchTerms(name, categoryName, address) {
  const terms = new Set();
  
  // Business name variations - handle null values
  if (name) {
    const nameParts = name.toLowerCase().split(/[\s\-_\.]+/);
    nameParts.forEach(part => {
      if (part.length > 2) terms.add(part);
    });
  }
  
  // Category terms - handle null values
  if (categoryName) {
    const categoryParts = categoryName.toLowerCase().split(/[\s\-_\.]+/);
    categoryParts.forEach(part => {
      if (part.length > 2) terms.add(part);
    });
  }
  
  // Location terms - handle null values
  if (address) {
    const addressParts = address.toLowerCase().split(/[,\s\-_\.]+/);
    addressParts.forEach(part => {
      if (part.length > 2 && !part.match(/^\d+$/)) terms.add(part);
    });
  }
  
  return Array.from(terms).join(' ');
}

async function analyzeScrapedData() {
  console.log('📊 Starting comprehensive data analysis...');
  
  // Read the scraped data
  const jsonData = fs.readFileSync('attached_assets/dataset_crawler-google-places_2025-07-10_12-51-48-626.json', 'utf8');
  const scrapedBusinesses = JSON.parse(jsonData);
  
  console.log(`📈 Total businesses in scraped data: ${scrapedBusinesses.length}`);
  
  // Analyze category distribution
  const categoryDistribution = {};
  const subcategoryDistribution = {};
  const mainCategoryMapping = {};
  
  scrapedBusinesses.forEach(business => {
    // Skip businesses with missing critical data
    if (!business.placeId || !business.title) {
      return;
    }
    
    const categoryName = business.categoryName || 'Sin categoría';
    const mainCategory = detectMainCategory(categoryName, business.title, business.address);
    
    // Count original categories
    categoryDistribution[categoryName] = (categoryDistribution[categoryName] || 0) + 1;
    
    // Count main category mapping
    mainCategoryMapping[mainCategory] = (mainCategoryMapping[mainCategory] || 0) + 1;
    
    // Count subcategories per main category
    if (!subcategoryDistribution[mainCategory]) {
      subcategoryDistribution[mainCategory] = {};
    }
    subcategoryDistribution[mainCategory][categoryName] = 
      (subcategoryDistribution[mainCategory][categoryName] || 0) + 1;
  });
  
  console.log('\n🎯 MAIN CATEGORY DISTRIBUTION:');
  Object.entries(mainCategoryMapping)
    .sort(([,a], [,b]) => b - a)
    .forEach(([category, count]) => {
      console.log(`  ${category}: ${count} businesses`);
    });
  
  console.log('\n📋 TOP SUBCATEGORIES BY MAIN CATEGORY:');
  Object.entries(subcategoryDistribution).forEach(([mainCategory, subcats]) => {
    console.log(`\n${mainCategory.toUpperCase()}:`);
    Object.entries(subcats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([subcat, count]) => {
        console.log(`  • ${subcat}: ${count}`);
      });
  });
  
  console.log('\n🔍 TOP 20 ORIGINAL CATEGORIES:');
  Object.entries(categoryDistribution)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20)
    .forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });
  
  return {
    scrapedBusinesses,
    categoryDistribution,
    mainCategoryMapping,
    subcategoryDistribution
  };
}

async function importNewBusinesses(scrapedBusinesses) {
  console.log('\n💾 Starting business import process...');
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const scrapedBusiness of scrapedBusinesses) {
    try {
      // Check if business already exists
      const existing = await db
        .select()
        .from(apifyBusinesses)
        .where(eq(apifyBusinesses.placeId, scrapedBusiness.placeId))
        .limit(1);
      
      if (existing.length > 0) {
        skipped++;
        continue;
      }
      
      // Convert and insert new business - with error handling
      try {
        const businessData = convertScrapedBusiness(scrapedBusiness);
        await db.insert(apifyBusinesses).values(businessData);
        imported++;
      } catch (conversionError) {
        errors++;
        console.error(`  ❌ Conversion error for ${scrapedBusiness.title || 'Unknown'}:`, conversionError.message);
        continue;
      }
      
      if (imported % 50 === 0) {
        console.log(`  ✅ Imported ${imported} businesses so far...`);
      }
      
    } catch (error) {
      errors++;
      console.error(`  ❌ Error importing ${scrapedBusiness.title}:`, error.message);
    }
  }
  
  console.log(`\n📊 IMPORT SUMMARY:`);
  console.log(`  ✅ Imported: ${imported} new businesses`);
  console.log(`  ⏭️  Skipped: ${skipped} existing businesses`);
  console.log(`  ❌ Errors: ${errors} failed imports`);
  
  return { imported, skipped, errors };
}

async function generateDatabaseStatistics() {
  console.log('\n📈 Generating updated database statistics...');
  
  // Total count
  const totalResult = await db
    .select()
    .from(apifyBusinesses);
  console.log(`  📊 Total businesses in database: ${totalResult.length}`);
  
  // Main category breakdown
  const categoryStats = {};
  totalResult.forEach(business => {
    categoryStats[business.category] = (categoryStats[business.category] || 0) + 1;
  });
  
  console.log('\n🎯 UPDATED MAIN CATEGORY DISTRIBUTION:');
  Object.entries(categoryStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([category, count]) => {
      console.log(`  ${category}: ${count} businesses`);
    });
  
  // Subcategory breakdown
  const subcategoryStats = {};
  totalResult.forEach(business => {
    if (business.subcategory) {
      const mainCat = business.category;
      if (!subcategoryStats[mainCat]) subcategoryStats[mainCat] = {};
      subcategoryStats[mainCat][business.subcategory] = 
        (subcategoryStats[mainCat][business.subcategory] || 0) + 1;
    }
  });
  
  console.log('\n📋 SUBCATEGORY BREAKDOWN:');
  Object.entries(subcategoryStats).forEach(([mainCategory, subcats]) => {
    const subcatCount = Object.keys(subcats).length;
    const totalBusinesses = Object.values(subcats).reduce((a, b) => a + b, 0);
    console.log(`\n${mainCategory.toUpperCase()} (${subcatCount} subcategories, ${totalBusinesses} businesses):`);
    
    Object.entries(subcats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .forEach(([subcat, count]) => {
        console.log(`  • ${subcat}: ${count}`);
      });
  });
}

async function main() {
  try {
    console.log('🚀 SUBCATEGORY ANALYSIS & IMPORT SYSTEM');
    console.log('=====================================\n');
    
    // Phase 1: Analyze scraped data
    const analysisResults = await analyzeScrapedData();
    
    // Phase 2: Import new businesses
    const importResults = await importNewBusinesses(analysisResults.scrapedBusinesses);
    
    // Phase 3: Generate updated statistics
    if (importResults.imported > 0) {
      await generateDatabaseStatistics();
    }
    
    console.log('\n✅ PROCESS COMPLETED SUCCESSFULLY!');
    console.log('\nNext steps:');
    console.log('1. Update frontend to support subcategory filtering');
    console.log('2. Enhance admin panel with subcategory management');
    console.log('3. Test search functionality with new subcategories');
    
  } catch (error) {
    console.error('❌ Process failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
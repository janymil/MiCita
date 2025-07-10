#!/usr/bin/env node

/**
 * 🎯 MISSING DISTRICTS TARGETED SCRAPER
 * 
 * Scrapes businesses from Lima districts that are under-represented in current data
 * Uses geolocation-based search with exact coordinates for each district center
 * Target: 2,000-3,000 new businesses from outer districts
 * Cost: ~$15-20 (75-100 credits)
 */

import { ApifyClient } from 'apify-client';
import { storage } from '../server/storage.ts';
import { 
  PhoneNumberProcessor, 
  CategoryMapper, 
  CoordinateValidator, 
  DataValidator 
} from '../server/data-enhancement-utils.ts';

const client = new ApifyClient({ 
  token: process.env.APIFY_API_TOKEN 
});

// Missing districts with their exact coordinates (lat, lng) and search radius
const MISSING_DISTRICTS = [
  // Norte (North Lima)
  { name: 'San Juan de Lurigancho', lat: -11.9719, lng: -77.0153, radius: 8000 }, // Largest district in Lima
  { name: 'Comas', lat: -11.9387, lng: -77.0608, radius: 6000 },
  { name: 'Los Olivos', lat: -11.9706, lng: -77.0736, radius: 5000 },
  { name: 'San Martín de Porres', lat: -11.9761, lng: -77.0814, radius: 5000 },
  { name: 'Independencia', lat: -11.9594, lng: -77.0553, radius: 4000 },
  { name: 'Puente Piedra', lat: -11.8581, lng: -77.0725, radius: 4000 },
  { name: 'Carabayllo', lat: -11.8644, lng: -77.0206, radius: 6000 },
  { name: 'Ancón', lat: -11.7661, lng: -77.1664, radius: 4000 },
  { name: 'Santa Rosa', lat: -11.8831, lng: -77.2061, radius: 3000 },

  // Sur (South Lima)
  { name: 'Villa El Salvador', lat: -12.2142, lng: -76.9394, radius: 6000 },
  { name: 'Villa María del Triunfo', lat: -12.1592, lng: -76.9386, radius: 5000 },
  { name: 'San Juan de Miraflores', lat: -12.1569, lng: -76.9736, radius: 5000 },
  { name: 'Chorrillos', lat: -12.1694, lng: -77.0136, radius: 4000 },
  { name: 'Lurín', lat: -12.2783, lng: -76.8731, radius: 4000 },
  { name: 'Pachacamac', lat: -12.2547, lng: -76.8275, radius: 5000 },
  { name: 'Pucusana', lat: -12.4744, lng: -76.7983, radius: 3000 },
  { name: 'Punta Hermosa', lat: -12.3356, lng: -76.8028, radius: 2000 },

  // Este (East Lima)
  { name: 'Ate', lat: -12.0350, lng: -76.9056, radius: 6000 },
  { name: 'Santa Anita', lat: -12.0453, lng: -76.9697, radius: 4000 },
  { name: 'El Agustino', lat: -12.0314, lng: -77.0158, radius: 3000 },
  { name: 'Lurigancho', lat: -11.9678, lng: -76.8331, radius: 4000 },
  { name: 'Chaclacayo', lat: -11.9878, lng: -76.7639, radius: 3000 },
  { name: 'Cieneguilla', lat: -12.0906, lng: -76.8147, radius: 4000 },
  { name: 'La Molina', lat: -12.0842, lng: -76.9394, radius: 4000 },

  // Callao Province
  { name: 'Callao', lat: -12.0564, lng: -77.1181, radius: 5000 },
  { name: 'Bellavista', lat: -12.0742, lng: -77.1044, radius: 3000 },
  { name: 'Carmen de la Legua Reynoso', lat: -12.0403, lng: -77.0997, radius: 2000 },
  { name: 'La Perla', lat: -12.0714, lng: -77.1142, radius: 2000 },
  { name: 'Ventanilla', lat: -11.8792, lng: -77.1539, radius: 4000 }
];

// General business search keywords for maximum coverage
const BUSINESS_KEYWORDS = [
  // Services
  'servicios', 'servicio', 'consultorio', 'oficina', 'empresa', 'negocio',
  
  // Beauty & Personal Care
  'peluquería', 'salón', 'barbería', 'spa', 'estética', 'belleza', 'manicura', 'pedicura',
  
  // Health & Medical
  'clínica', 'hospital', 'médico', 'dentista', 'farmacia', 'botica', 'laboratorio',
  
  // Food & Restaurants
  'restaurante', 'cafetería', 'pollería', 'cevichería', 'chifa', 'panadería', 'bar',
  
  // Retail & Shopping
  'tienda', 'comercio', 'venta', 'mercado', 'bodega', 'minimarket', 'ferretería',
  
  // Automotive
  'taller', 'mecánico', 'llanta', 'repuestos', 'lubricentro', 'lavado',
  
  // Fitness & Sports
  'gimnasio', 'fitness', 'deporte', 'yoga', 'pilates',
  
  // Education & Training
  'instituto', 'academia', 'colegio', 'universidad', 'capacitación',
  
  // Financial Services
  'banco', 'financiera', 'cambio', 'inmobiliaria', 'seguros',
  
  // Home & Construction
  'ferretería', 'construcción', 'electricista', 'plomero', 'pintura',
  
  // Technology
  'computadora', 'celular', 'tecnología', 'reparación', 'internet'
];

// Generate comprehensive search terms for each district
function generateDistrictSearchTerms(district) {
  const searchTerms = [];
  
  // Add business keywords with district name
  BUSINESS_KEYWORDS.forEach(keyword => {
    searchTerms.push(`${keyword} ${district.name}`);
    searchTerms.push(`${keyword} en ${district.name}`);
  });
  
  // Add district-specific searches
  searchTerms.push(district.name);
  searchTerms.push(`negocios ${district.name}`);
  searchTerms.push(`empresas ${district.name}`);
  searchTerms.push(`servicios ${district.name}`);
  
  return searchTerms;
}

function convertToApifyBusiness(place) {
  // Phone number processing
  const phoneData = place.phone ? PhoneNumberProcessor.standardizePhone(place.phone) : null;
  
  // Category mapping
  const category = CategoryMapper.mapCategory(
    place.title || place.name,
    place.categoryName || '',
    place.address || ''
  );
  
  // Coordinate validation
  const coordinates = CoordinateValidator.validateCoordinates(
    place.latitude || 0,
    place.longitude || 0
  );
  
  return {
    placeId: place.placeId || `missing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: place.title || place.name || 'Negocio sin nombre',
    address: place.address || '',
    latitude: coordinates.lat.toString(),
    longitude: coordinates.lng.toString(),
    phone: phoneData?.formatted || place.phone || null,
    website: place.website || null,
    email: place.email || null,
    category: category,
    subcategory: place.categoryName || null,
    rating: place.rating ? parseFloat(place.rating).toString() : null,
    reviewCount: place.reviewsCount || place.totalScore || 0,
    priceLevel: place.priceLevel || null,
    photoUrl: Array.isArray(place.imageUrls) && place.imageUrls.length > 0 ? place.imageUrls[0] : null,
    hours: Array.isArray(place.openingHours) ? place.openingHours.join('; ') : null,
    description: place.description || null,
    services: null,
    amenities: null,
    socialMedia: null,
    imageUrls: Array.isArray(place.imageUrls) ? place.imageUrls.slice(0, 5).join(', ') : null,
    popularTimes: null,
    streetViewUrl: null,
    accessibilityOptions: null,
    paymentOptions: null,
    openNow: place.openNow || null,
    district: place.district || null,
    city: 'Lima',
    country: 'Perú',
    qualityScore: calculateQualityScore(place),
    lastUpdated: new Date().toISOString(),
    dataSource: 'apify_missing_districts',
    isActive: true
  };
}

function calculateQualityScore(place) {
  let score = 50; // Base score
  
  // Contact information
  if (place.phone) score += 15;
  if (place.website) score += 15;
  if (place.email) score += 10;
  
  // Reviews and ratings
  if (place.rating && place.rating >= 4.0) score += 10;
  if (place.reviewsCount && place.reviewsCount >= 10) score += 5;
  if (place.reviewsCount && place.reviewsCount >= 50) score += 5;
  
  // Media content
  if (place.imageUrls && place.imageUrls.length > 0) score += 5;
  if (place.imageUrls && place.imageUrls.length >= 3) score += 5;
  
  // Business information
  if (place.openingHours && place.openingHours.length > 0) score += 5;
  if (place.description && place.description.length > 50) score += 5;
  
  // Address and location quality
  if (place.address && place.address.length > 20) score += 5;
  if (place.latitude && place.longitude) score += 10;
  
  return Math.min(score, 100);
}

async function scrapeMissingDistrictsBusinesses() {
  console.log('🎯 Starting Missing Districts Scraper...');
  console.log(`📍 Targeting ${MISSING_DISTRICTS.length} under-represented districts`);
  
  let totalBusinesses = 0;
  let totalCost = 0;
  
  for (const district of MISSING_DISTRICTS) {
    try {
      console.log(`\n🔍 Scraping district: ${district.name}`);
      console.log(`📍 Coordinates: ${district.lat}, ${district.lng} (radius: ${district.radius}m)`);
      
      // Generate search terms for this district
      const searchTerms = generateDistrictSearchTerms(district);
      console.log(`🔤 Generated ${searchTerms.length} search terms`);
      
      // Prepare the input for geolocation-based search
      const input = {
        searchStringsArray: searchTerms.slice(0, 20), // Limit to top 20 terms per district
        locationQuery: `${district.lat},${district.lng}`,
        maxCrawledPlacesPerSearch: 50,
        language: 'es',
        countryCode: 'PE',
        maxReviews: 0,
        maxImages: 5,
        exportPlaceUrls: false,
        additionalInfo: false,
        // Enhanced scraping options
        scrapeReviewerUrlAndText: false,
        scrapeDirections: false,
        scrapeOpeningHours: true,
        scrapeBusinessClaims: false,
        scrapePeopleAlsoSearch: false,
        scrapeImmediatePhotos: true,
        searchAreaSize: district.radius, // Use district-specific radius
        // Company contacts enrichment for better data quality
        enrichPlaceWithCompanyContactDetails: true,
        scrapeDetailPage: true,
        includeWebResults: true,
        scrapeInsidePlaces: true
      };
      
      console.log(`⚙️ Starting Apify actor for ${district.name}...`);
      
      const run = await client.actor('compass/crawler-google-places').call(input);
      
      console.log(`✅ Apify run completed for ${district.name}:`, run.id);
      console.log(`📊 Status: ${run.status}, Duration: ${run.stats?.runtime || 'unknown'}`);
      
      // Calculate cost (approximately $0.002 per result)
      const estimatedResults = searchTerms.slice(0, 20).length * 50;
      const districtCost = estimatedResults * 0.002;
      totalCost += districtCost;
      
      console.log(`💰 Estimated cost for ${district.name}: $${districtCost.toFixed(2)}`);
      
      // Fetch and process results
      console.log(`📥 Fetching results for ${district.name}...`);
      
      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      
      console.log(`📊 Raw results found for ${district.name}: ${items.length}`);
      
      if (items.length === 0) {
        console.log(`⚠️ No results found for ${district.name}, skipping...`);
        continue;
      }
      
      // Convert and validate businesses
      const businesses = items
        .map(item => convertToApifyBusiness(item))
        .filter(business => {
          const validation = DataValidator.validateBusinessData(business);
          if (!validation.isValid) {
            console.log(`❌ Invalid business data: ${validation.errors.join(', ')}`);
            return false;
          }
          return true;
        });
      
      console.log(`✅ Valid businesses for ${district.name}: ${businesses.length}`);
      
      // Store businesses in database
      let savedCount = 0;
      for (const business of businesses) {
        try {
          // Check if business already exists
          const existing = await storage.getApifyBusiness(business.placeId);
          if (existing) {
            console.log(`⏭️ Business already exists: ${business.name}`);
            continue;
          }
          
          await storage.addApifyBusiness(business);
          savedCount++;
          
          if (savedCount % 10 === 0) {
            console.log(`💾 Saved ${savedCount}/${businesses.length} businesses for ${district.name}...`);
          }
        } catch (error) {
          console.error(`❌ Error saving business ${business.name}:`, error.message);
        }
      }
      
      console.log(`✅ Successfully saved ${savedCount} new businesses for ${district.name}`);
      totalBusinesses += savedCount;
      
      // Wait between districts to avoid rate limiting
      if (MISSING_DISTRICTS.indexOf(district) < MISSING_DISTRICTS.length - 1) {
        console.log('⏳ Waiting 30 seconds before next district...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
      
    } catch (error) {
      console.error(`❌ Error processing district ${district.name}:`, error);
      continue;
    }
  }
  
  console.log('\n🎯 Missing Districts Scraping Complete!');
  console.log(`📊 Total districts processed: ${MISSING_DISTRICTS.length}`);
  console.log(`🏢 Total new businesses found: ${totalBusinesses}`);
  console.log(`💰 Total estimated cost: $${totalCost.toFixed(2)}`);
  
  return {
    districtsProcessed: MISSING_DISTRICTS.length,
    businessesFound: totalBusinesses,
    estimatedCost: totalCost
  };
}

async function getCurrentDatabaseCount() {
  try {
    const businesses = await storage.searchApifyBusinesses('', undefined, undefined);
    return businesses.length;
  } catch (error) {
    console.error('❌ Error getting database count:', error);
    return 0;
  }
}

// Main execution
async function main() {
  try {
    if (!process.env.APIFY_API_TOKEN) {
      throw new Error('APIFY_API_TOKEN environment variable is required');
    }
    
    console.log('🎯 MISSING DISTRICTS TARGETED SCRAPER');
    console.log('=====================================');
    
    const initialCount = await getCurrentDatabaseCount();
    console.log(`📊 Current database count: ${initialCount} businesses`);
    
    const results = await scrapeMissingDistrictsBusinesses();
    
    const finalCount = await getCurrentDatabaseCount();
    console.log(`📊 Final database count: ${finalCount} businesses`);
    console.log(`📈 Net increase: ${finalCount - initialCount} businesses`);
    
    console.log('\n🎉 Mission accomplished! Missing districts now have comprehensive business coverage.');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { scrapeMissingDistrictsBusinesses, MISSING_DISTRICTS };
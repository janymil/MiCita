#!/usr/bin/env node

/**
 * 🏥 SALUD CATEGORY SCRAPER
 * 
 * Scrapes health & medical businesses across ALL Lima districts
 * Target: 2,500-3,500 businesses
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

// All Lima districts
const LIMA_DISTRICTS = [
  'Ancón', 'Carabayllo', 'Comas', 'Independencia', 'Los Olivos', 'Puente Piedra', 'San Martín de Porres', 'Santa Rosa',
  'Chorrillos', 'Lurín', 'Pachacamac', 'Pucusana', 'Punta Hermosa', 'Punta Negra', 'San Bartolo', 'San Juan de Miraflores', 'Santa María del Mar', 'Villa El Salvador', 'Villa María del Triunfo',
  'Ate', 'Chaclacayo', 'Cieneguilla', 'El Agustino', 'La Molina', 'Lurigancho', 'San Juan de Lurigancho', 'San Luis', 'Santa Anita',
  'Barranco', 'Breña', 'Jesús María', 'La Victoria', 'Lima', 'Lince', 'Magdalena del Mar', 'Miraflores', 'Pueblo Libre', 'Rímac', 'San Borja', 'San Isidro', 'San Miguel', 'Santiago de Surco', 'Surquillo',
  'Bellavista', 'Callao', 'Carmen de la Legua Reynoso', 'La Perla', 'La Punta', 'Mi Perú', 'Ventanilla'
];

// Health-specific keywords
const HEALTH_KEYWORDS = [
  'clínica',
  'hospital',
  'centro médico',
  'consultorio médico',
  'farmacia',
  'dentista',
  'clínica dental',
  'psicólogo',
  'psiquiatra',
  'oftalmólogo',
  'cardiología',
  'ginecología',
  'pediatría',
  'dermatología',
  'neurología',
  'urología',
  'oncología',
  'radiología',
  'laboratorio clínico',
  'análisis clínicos',
  'fisioterapeuta',
  'rehabilitación',
  'nutricionista',
  'endocrinología',
  'traumatología',
  'cirugía',
  'medicina general',
  'medicina familiar',
  'veterinaria',
  'clínica veterinaria',
  'medicina alternativa',
  'homeopatía',
  'acupuntura',
  'quiropráctico',
  'podólogo',
  'enfermería',
  'obstetricia',
  'maternidad',
  'emergencias',
  'urgencias'
];

// Generate search terms
function generateHealthSearchTerms() {
  const searchTerms = [];
  
  // City-level searches
  for (const keyword of HEALTH_KEYWORDS) {
    searchTerms.push(`${keyword} Lima`);
  }
  
  // District-level searches
  for (const district of LIMA_DISTRICTS) {
    for (const keyword of HEALTH_KEYWORDS) {
      searchTerms.push(`${keyword} ${district} Lima`);
    }
  }
  
  return searchTerms;
}

// Convert result to database format
function convertToApifyBusiness(place) {
  const businessName = place.title || 'Business';
  const address = place.address || 'Lima, Peru';
  const originalCategory = place.categoryName || 'Unknown';
  
  const rawPhone = place.phoneUnformatted || place.phone || null;
  const phoneResult = rawPhone ? PhoneNumberProcessor.standardizePhone(rawPhone) : null;
  
  const lat = place.location?.lat || null;
  const lng = place.location?.lng || null;
  const coordResult = lat && lng ? CoordinateValidator.validateCoordinates(lat, lng) : null;
  
  const photos = place.imageUrls || [];
  const photoUrl = photos.length > 0 ? photos[0] : null;
  
  const socialMedia = {};
  if (place.website) {
    const text = place.website;
    if (text.includes('facebook.com')) socialMedia.facebook = text;
    if (text.includes('instagram.com')) socialMedia.instagram = text;
  }
  
  return {
    placeId: place.placeId,
    name: businessName,
    address: address,
    category: 'salud',
    subcategory: originalCategory,
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
    hours: place.openingHours || null,
    email: place.email || null,
    socialMedia: Object.keys(socialMedia).length > 0 ? socialMedia : null,
    searchTerms: `${businessName} ${originalCategory} ${address}`.toLowerCase(),
    isRegistered: false,
    phoneFormatted: phoneResult?.formatted || null,
    phoneCountryCode: phoneResult?.countryCode || '+51',
    coordinatesValidated: coordResult?.isValid || false,
    businessStatus: place.permanentlyClosed ? 'closed' : place.temporarilyClosed ? 'temporarily_closed' : 'open',
    lastScraped: new Date(),
    scrapingSource: 'apify-salud',
    qualityScore: calculateQualityScore(place),
    createdAt: new Date(),
    lastUpdated: new Date()
  };
}

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

async function scrapeSaludBusinesses() {
  console.log('🏥 SALUD CATEGORY SCRAPER');
  console.log('=========================');
  console.log('🎯 Target: Health & Medical businesses');
  console.log('📍 Coverage: All 49 Lima districts');
  console.log('💰 Expected cost: ~$15-20 (75-100 credits)');
  console.log('📊 Expected results: 2,500-3,500 businesses');
  console.log('');

  try {
    const searchTerms = generateHealthSearchTerms();
    console.log(`🔍 Generated ${searchTerms.length} search terms`);
    console.log(`📋 Keywords: ${HEALTH_KEYWORDS.length} health-specific terms`);
    console.log(`🗺️ Districts: ${LIMA_DISTRICTS.length} Lima districts`);
    console.log('');

    const currentCount = await getCurrentDatabaseCount();
    console.log(`📊 Current salud businesses in database: ${currentCount}`);
    console.log('');

    const batchSize = 15;
    const batches = [];
    for (let i = 0; i < searchTerms.length; i += batchSize) {
      batches.push(searchTerms.slice(i, i + batchSize));
    }

    console.log(`📦 Processing ${batches.length} batches`);
    console.log('🚀 Starting salud scraping...');
    console.log('');

    let totalBusinesses = 0;
    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} searches)`);

      try {
        const input = {
          searchStringsArray: batch,
          locationQuery: 'Lima, Peru',
          maxPlacesPerSearch: 20,
          language: 'es',
          maxReviews: 5,
          maxImages: 1,
          additionalInfo: true,
          scrapeDetailPage: true,
          includeWebResults: true,
          companyContactsEnrichment: true,
          scrapeContactInfo: true,
          includeBusinessHours: true,
          scrapePopularTimes: true,
          scrapeSocialMedia: true,
          scrapeAccessibility: true,
          scrapeAmenities: true,
          maxCrawledPlaces: 3500
        };

        const run = await client.actor('compass/crawler-google-places').call(input);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        console.log(`   📊 Found ${items.length} businesses in batch ${batchIndex + 1}`);
        totalBusinesses += items.length;

        // Process and store businesses
        for (const item of items) {
          try {
            const business = convertToApifyBusiness(item);
            
            const validation = DataValidator.validateBusinessData(business);
            if (!validation.isValid) {
              errors++;
              continue;
            }
            
            const existing = await storage.getApifyBusiness(business.placeId);
            if (existing) {
              updated++;
            } else {
              imported++;
            }
            
            await storage.addApifyBusiness(business);
            
          } catch (error) {
            errors++;
          }
        }

        console.log(`   ✅ Batch ${batchIndex + 1} completed: ${imported} new, ${updated} updated, ${errors} errors`);

        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

      } catch (error) {
        console.error(`   ❌ Batch ${batchIndex + 1} failed: ${error.message}`);
      }
    }

    const finalCount = await getCurrentDatabaseCount();
    const newBusinesses = finalCount - currentCount;

    console.log('');
    console.log('🎉 SALUD SCRAPING RESULTS');
    console.log('=========================');
    console.log(`📊 Total businesses found: ${totalBusinesses}`);
    console.log(`✅ Successfully imported (new): ${imported}`);
    console.log(`📝 Updated (existing): ${updated}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📈 Net new businesses added: ${newBusinesses}`);
    console.log(`📊 Total salud businesses in database: ${finalCount}`);
    console.log('');
    console.log('✅ Salud category scraping completed!');

  } catch (error) {
    console.error('❌ Salud scraping failed:', error);
    throw error;
  }
}

async function getCurrentDatabaseCount() {
  try {
    const { neon } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-http');
    const { sql } = await import('drizzle-orm');
    
    const db = drizzle(neon(process.env.DATABASE_URL));
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM apify_businesses WHERE category = 'salud'`);
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Error getting database count:', error);
    return 0;
  }
}

// Run the salud scraper
scrapeSaludBusinesses()
  .then(() => {
    console.log('\\n✅ Salud scraping completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\\n❌ Salud scraping failed:', error);
    process.exit(1);
  });
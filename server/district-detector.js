/**
 * District Detection and Assignment Script
 * 
 * This script analyzes business addresses and automatically assigns districts
 * using multiple detection methods:
 * 1. Pattern matching from addresses
 * 2. Coordinate-based reverse geocoding (when available)
 * 3. Manual assignment for edge cases
 */

import { db } from "./db.js";
import { businesses, apifyBusinesses, publicBusinesses } from "../shared/schema.js";

// Lima districts and their common variations/spellings
const LIMA_DISTRICTS = {
  // Central Lima
  'cercado de lima': ['cercado de lima', 'lima cercado', 'lima centro', 'centro de lima'],
  'rimac': ['rimac', 'rímac'],
  'san luis': ['san luis', 'san luís'],
  
  // North Lima
  'comas': ['comas'],
  'independencia': ['independencia'],
  'los olivos': ['los olivos'],
  'san martin de porres': ['san martin de porres', 'san martín de porres', 'smp'],
  'santa rosa': ['santa rosa'],
  'ancón': ['ancon', 'ancón'],
  'carabayllo': ['carabayllo'],
  'puente piedra': ['puente piedra'],
  'santa maría del mar': ['santa maría del mar', 'santa maria del mar'],
  
  // East Lima
  'ate': ['ate', 'ate vitarte'],
  'chaclacayo': ['chaclacayo'],
  'cieneguilla': ['cieneguilla'],
  'el agustino': ['el agustino'],
  'la molina': ['la molina', 'molina'],
  'lurigancho': ['lurigancho', 'lurigancho chosica'],
  'san juan de lurigancho': ['san juan de lurigancho', 'sjl'],
  'santa anita': ['santa anita'],
  'vitarte': ['vitarte'],
  
  // South Lima
  'barranco': ['barranco'],
  'chorrillos': ['chorrillos'],
  'lurín': ['lurin', 'lurín'],
  'pachacamac': ['pachacamac'],
  'pucusana': ['pucusana'],
  'punta hermosa': ['punta hermosa'],
  'punta negra': ['punta negra'],
  'san bartolo': ['san bartolo'],
  'san juan de miraflores': ['san juan de miraflores', 'sjm'],
  'santa maría del mar': ['santa maría del mar', 'santa maria del mar'],
  'villa el salvador': ['villa el salvador', 'ves'],
  'villa maría del triunfo': ['villa maría del triunfo', 'villa maria del triunfo', 'vmt'],
  
  // West Lima
  'bellavista': ['bellavista'],
  'callao': ['callao'],
  'carmen de la legua reynoso': ['carmen de la legua reynoso', 'carmen de la legua'],
  'la perla': ['la perla'],
  'la punta': ['la punta'],
  'ventanilla': ['ventanilla'],
  
  // Central Lima Districts
  'breña': ['breña', 'brena'],
  'jesús maría': ['jesús maría', 'jesus maria'],
  'la victoria': ['la victoria'],
  'lince': ['lince'],
  'magdalena del mar': ['magdalena del mar', 'magdalena'],
  'pueblo libre': ['pueblo libre'],
  'san miguel': ['san miguel'],
  
  // Modern Lima Districts
  'miraflores': ['miraflores'],
  'san isidro': ['san isidro'],
  'san borja': ['san borja'],
  'surco': ['surco', 'santiago de surco'],
  'surquillo': ['surquillo'],
  
  // Additional districts
  'santa catalina': ['santa catalina'],
  'la molina': ['la molina'],
  'monterrico': ['monterrico'], // Part of Surco but commonly used
  'san luis': ['san luis'],
  'barranco': ['barranco'],
};

class DistrictDetector {
  /**
   * Extract district from address using pattern matching
   */
  static detectDistrictFromAddress(address) {
    if (!address || typeof address !== 'string') {
      return null;
    }
    
    const addressLower = address.toLowerCase();
    
    // Look for explicit district patterns
    for (const [district, variations] of Object.entries(LIMA_DISTRICTS)) {
      for (const variation of variations) {
        // Use word boundaries to ensure exact matches
        const regex = new RegExp(`\\b${variation.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(addressLower)) {
          // Special handling to avoid false positives
          if (district === 'miraflores' && addressLower.includes('san juan')) {
            continue; // Skip Miraflores if "San Juan" is present
          }
          return district;
        }
      }
    }
    
    // Look for postal code patterns (Lima districts have specific postal codes)
    const postalCodeMatch = address.match(/\b(150\d{2})\b/);
    if (postalCodeMatch) {
      const postalCode = postalCodeMatch[1];
      return this.getDistrictByPostalCode(postalCode);
    }
    
    return null;
  }
  
  /**
   * Map postal codes to districts (Lima uses 150XX format)
   */
  static getDistrictByPostalCode(postalCode) {
    const postalCodeMap = {
      '15001': 'cercado de lima',
      '15021': 'san borja',
      '15036': 'san isidro',
      '15046': 'miraflores',
      '15072': 'lince',
      '15073': 'san isidro',
      '15076': 'magdalena del mar',
      '15084': 'pueblo libre',
      '15086': 'san miguel',
      // Add more as needed
    };
    
    return postalCodeMap[postalCode] || null;
  }
  
  /**
   * Use coordinates for reverse geocoding (simplified version)
   * In a real implementation, you'd use Google Maps Geocoding API
   */
  static detectDistrictFromCoordinates(lat, lng) {
    if (!lat || !lng) return null;
    
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    // Basic coordinate ranges for major Lima districts
    // These are approximate and would be more accurate with proper geocoding
    const districtBounds = {
      'miraflores': { latMin: -12.14, latMax: -12.10, lngMin: -77.04, lngMax: -77.02 },
      'san isidro': { latMin: -12.11, latMax: -12.08, lngMin: -77.05, lngMax: -77.03 },
      'san borja': { latMin: -12.12, latMax: -12.08, lngMin: -77.02, lngMax: -76.99 },
      'surco': { latMin: -12.14, latMax: -12.10, lngMin: -77.02, lngMax: -76.98 },
      'barranco': { latMin: -12.15, latMax: -12.13, lngMin: -77.03, lngMax: -77.01 },
      'pueblo libre': { latMin: -12.09, latMax: -12.07, lngMin: -77.08, lngMax: -77.06 },
      'magdalena del mar': { latMin: -12.10, latMax: -12.08, lngMin: -77.08, lngMax: -77.06 },
      'san miguel': { latMin: -12.08, latMax: -12.06, lngMin: -77.09, lngMax: -77.07 },
      'jesús maría': { latMin: -12.08, latMax: -12.06, lngMin: -77.06, lngMax: -77.04 },
      'lince': { latMin: -12.08, latMax: -12.06, lngMin: -77.05, lngMax: -77.03 },
    };
    
    for (const [district, bounds] of Object.entries(districtBounds)) {
      if (latitude >= bounds.latMin && latitude <= bounds.latMax &&
          longitude >= bounds.lngMin && longitude <= bounds.lngMax) {
        return district;
      }
    }
    
    return null;
  }
  
  /**
   * Main detection function that tries multiple methods
   */
  static detectDistrict(business) {
    // Method 1: Extract from address
    let district = this.detectDistrictFromAddress(business.address);
    if (district) {
      console.log(`📍 District detected from address: "${business.name}" → ${district}`);
      return district;
    }
    
    // Method 2: Use coordinates if available
    if (business.latitude && business.longitude) {
      district = this.detectDistrictFromCoordinates(business.latitude, business.longitude);
      if (district) {
        console.log(`🌐 District detected from coordinates: "${business.name}" → ${district}`);
        return district;
      }
    }
    
    // Method 3: Manual assignment for special cases
    district = this.manualDistrictAssignment(business);
    if (district) {
      console.log(`✋ District manually assigned: "${business.name}" → ${district}`);
      return district;
    }
    
    console.log(`❓ Could not detect district for: "${business.name}" (${business.address})`);
    return null;
  }
  
  /**
   * Manual assignment for businesses with unclear addresses
   */
  static manualDistrictAssignment(business) {
    const name = business.name?.toLowerCase() || '';
    const address = business.address?.toLowerCase() || '';
    
    // Business name contains district
    for (const [district, variations] of Object.entries(LIMA_DISTRICTS)) {
      for (const variation of variations) {
        if (name.includes(variation)) {
          return district;
        }
      }
    }
    
    // Known business locations (you could expand this)
    const knownLocations = {
      'jockey plaza': 'surco',
      'larcomar': 'miraflores',
      'plaza san miguel': 'san miguel',
      'megaplaza': 'independencia',
      'mall del sur': 'san juan de miraflores',
    };
    
    for (const [landmark, district] of Object.entries(knownLocations)) {
      if (address.includes(landmark)) {
        return district;
      }
    }
    
    return null;
  }
  
  /**
   * Process all ApifyBusinesses and assign districts
   */
  static async processApifyBusinesses() {
    console.log('🔄 Processing Apify businesses...');
    
    const businesses = await db.select().from(apifyBusinesses);
    let processed = 0;
    let detected = 0;
    
    for (const business of businesses) {
      const district = this.detectDistrict(business);
      
      if (district) {
        // Update the business with detected district
        await db
          .update(apifyBusinesses)
          .set({ 
            subcategory: district, // Temporarily store in subcategory field
            lastUpdated: new Date()
          })
          .where({ id: business.id });
        detected++;
      }
      
      processed++;
      
      if (processed % 50 === 0) {
        console.log(`📊 Processed ${processed}/${businesses.length} businesses (${detected} districts detected)`);
      }
    }
    
    console.log(`✅ Completed Apify businesses: ${detected}/${processed} districts detected`);
    return { processed, detected };
  }
  
  /**
   * Process registered businesses and assign districts
   */
  static async processRegisteredBusinesses() {
    console.log('🔄 Processing registered businesses...');
    
    const businessList = await db.select().from(businesses);
    let processed = 0;
    let detected = 0;
    
    for (const business of businessList) {
      const district = this.detectDistrict(business);
      
      if (district) {
        // For registered businesses, we could store in a new field or in businessSettings
        console.log(`📝 Registered business district detected: ${business.name} → ${district}`);
        detected++;
      }
      
      processed++;
    }
    
    console.log(`✅ Completed registered businesses: ${detected}/${processed} districts detected`);
    return { processed, detected };
  }
  
  /**
   * Generate report of undetected districts for manual review
   */
  static async generateManualReviewReport() {
    console.log('📋 Generating manual review report...');
    
    const apifyBusinesses = await db.select().from(apifyBusinesses);
    const undetected = [];
    
    for (const business of apifyBusinesses) {
      const district = this.detectDistrict(business);
      if (!district) {
        undetected.push({
          id: business.id,
          name: business.name,
          address: business.address,
          coordinates: business.latitude && business.longitude 
            ? `${business.latitude}, ${business.longitude}` 
            : 'No coordinates'
        });
      }
    }
    
    console.log(`📄 Found ${undetected.length} businesses needing manual district assignment:`);
    undetected.slice(0, 10).forEach(business => {
      console.log(`   • ${business.name} - ${business.address} (${business.coordinates})`);
    });
    
    if (undetected.length > 10) {
      console.log(`   ... and ${undetected.length - 10} more`);
    }
    
    return undetected;
  }
  
  /**
   * Main execution function
   */
  static async run() {
    console.log('🚀 Starting District Detection and Assignment...\n');
    
    try {
      // Process Apify businesses
      const apifyResults = await this.processApifyBusinesses();
      console.log('');
      
      // Process registered businesses
      const registeredResults = await this.processRegisteredBusinesses();
      console.log('');
      
      // Generate manual review report
      const undetected = await this.generateManualReviewReport();
      console.log('');
      
      // Summary
      console.log('📊 SUMMARY:');
      console.log(`   Apify businesses: ${apifyResults.detected}/${apifyResults.processed} districts detected`);
      console.log(`   Registered businesses: ${registeredResults.detected}/${registeredResults.processed} districts detected`);
      console.log(`   Businesses needing manual review: ${undetected.length}`);
      console.log('');
      console.log('✅ District detection complete!');
      
    } catch (error) {
      console.error('❌ Error during district detection:', error);
    }
  }
}

// Export for use in other scripts
export { DistrictDetector, LIMA_DISTRICTS };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  DistrictDetector.run();
}
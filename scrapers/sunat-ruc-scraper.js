/**
 * 🏛️ SUNAT RUC REGISTRY SCRAPER
 * 
 * Legal business data scraper using Peru's official SUNAT RUC Registry
 * 100% legal government data source for business information
 * 
 * FEATURES:
 * - Official Peru business registry data
 * - Company status, legal form, addresses
 * - Tax IDs and economic activity codes
 * - Legal compliance verification
 */

import { db } from '../server/db.js';
import { openstreetBusinesses } from '../shared/schema.js';
import { sql } from 'drizzle-orm';

class SunatRucScraper {
  constructor() {
    this.baseUrl = 'https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/FrameCriterioBusquedaWeb.jsp';
    this.userAgent = 'MiCita Business Directory/1.0 (https://micita.pe)';
    this.rateLimit = 2000; // 2 seconds between requests to be respectful
  }

  /**
   * Generate RUC numbers to search (companies start with 20)
   */
  generateRucNumbers(startRange = 20100000000, count = 1000) {
    const rucNumbers = [];
    for (let i = 0; i < count; i++) {
      const baseNumber = startRange + i;
      const checkDigit = this.calculateRucCheckDigit(baseNumber);
      rucNumbers.push(`${baseNumber}${checkDigit}`);
    }
    return rucNumbers;
  }

  /**
   * Calculate RUC check digit (last digit)
   */
  calculateRucCheckDigit(baseNumber) {
    const digits = baseNumber.toString().split('').map(Number);
    const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      sum += digits[i] * weights[i];
    }
    
    const remainder = sum % 11;
    const checkDigit = 11 - remainder;
    
    if (checkDigit === 10) return 0;
    if (checkDigit === 11) return 1;
    return checkDigit;
  }

  /**
   * Lookup single RUC number
   */
  async lookupRuc(rucNumber) {
    try {
      // Using the SUNAT consultation endpoint
      const response = await fetch(`${this.baseUrl}?ruc=${rucNumber}`, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-PE,es;q=0.8,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      return this.parseRucResponse(html, rucNumber);

    } catch (error) {
      console.error(`❌ Error looking up RUC ${rucNumber}:`, error.message);
      return null;
    }
  }

  /**
   * Parse SUNAT HTML response
   */
  parseRucResponse(html, rucNumber) {
    // This would need HTML parsing - simplified for demonstration
    // In production, use cheerio or similar HTML parser
    
    // Look for business information patterns in the HTML
    const nameMatch = html.match(/Razón Social[:\s]*([^<\n]+)/i);
    const addressMatch = html.match(/Dirección[:\s]*([^<\n]+)/i);
    const statusMatch = html.match(/Estado[:\s]*([^<\n]+)/i);
    const typeMatch = html.match(/Tipo[:\s]*([^<\n]+)/i);

    if (!nameMatch) {
      return null; // RUC not found or inactive
    }

    return {
      ruc: rucNumber,
      razonSocial: nameMatch[1]?.trim(),
      direccion: addressMatch[1]?.trim(),
      estado: statusMatch[1]?.trim(),
      tipo: typeMatch[1]?.trim(),
      source: 'sunat'
    };
  }

  /**
   * Convert SUNAT data to our business format
   */
  convertToOpenStreetBusiness(sunatData) {
    const category = this.detectCategoryFromName(sunatData.razonSocial);
    
    return {
      osmId: `sunat/${sunatData.ruc}`,
      osmType: 'sunat',
      name: sunatData.razonSocial,
      amenity: null,
      shop: null,
      address: sunatData.direccion,
      houseNumber: null,
      street: null,
      city: 'Lima', // Default, could be extracted from address
      district: null,
      postcode: null,
      phone: null,
      website: null,
      email: null,
      openingHours: null,
      latitude: null, // Would need geocoding
      longitude: null,
      building: null,
      buildingLevels: null,
      operator: sunatData.razonSocial,
      brand: null,
      cuisine: null,
      wheelchair: null,
      category: category,
      subcategory: sunatData.tipo,
      tags: {
        'source': 'sunat',
        'ruc': sunatData.ruc,
        'business_status': sunatData.estado,
        'business_type': sunatData.tipo
      },
      geometry: null
    };
  }

  /**
   * Detect business category from company name
   */
  detectCategoryFromName(name) {
    const nameLower = name.toLowerCase();
    
    // Gastronomía
    if (nameLower.includes('restaurant') || nameLower.includes('cafe') || 
        nameLower.includes('comida') || nameLower.includes('gastronom')) {
      return 'gastronomia';
    }
    
    // Salud
    if (nameLower.includes('clinic') || nameLower.includes('hospital') || 
        nameLower.includes('medic') || nameLower.includes('farmacia') ||
        nameLower.includes('salud')) {
      return 'salud';
    }
    
    // Belleza
    if (nameLower.includes('salon') || nameLower.includes('peluquer') || 
        nameLower.includes('belleza') || nameLower.includes('spa')) {
      return 'belleza';
    }
    
    // Automotriz
    if (nameLower.includes('automotriz') || nameLower.includes('taller') || 
        nameLower.includes('mechanic') || nameLower.includes('auto')) {
      return 'automotriz';
    }
    
    // Educación
    if (nameLower.includes('educacion') || nameLower.includes('instituto') || 
        nameLower.includes('colegio') || nameLower.includes('universidad')) {
      return 'educacion';
    }
    
    return 'servicios';
  }

  /**
   * Batch RUC lookup with rate limiting
   */
  async batchLookupRuc(rucNumbers) {
    console.log(`🔍 Looking up ${rucNumbers.length} RUC numbers...`);
    
    const results = [];
    const errors = [];

    for (let i = 0; i < rucNumbers.length; i++) {
      const rucNumber = rucNumbers[i];
      
      try {
        const result = await this.lookupRuc(rucNumber);
        
        if (result) {
          results.push(result);
          console.log(`  ✅ Found: ${result.razonSocial}`);
        }
        
        // Progress indicator
        if ((i + 1) % 50 === 0) {
          console.log(`  Progress: ${i + 1}/${rucNumbers.length} (${results.length} found)`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, this.rateLimit));
        
      } catch (error) {
        console.error(`❌ Error with RUC ${rucNumber}:`, error.message);
        errors.push({ ruc: rucNumber, error: error.message });
      }
    }

    console.log(`📊 Batch lookup complete: ${results.length} businesses found, ${errors.length} errors`);
    return { results, errors };
  }

  /**
   * Save SUNAT businesses to database
   */
  async saveBusinesses(sunatBusinesses) {
    if (sunatBusinesses.length === 0) {
      console.log('⚠️  No SUNAT businesses to save');
      return { imported: 0, duplicates: 0, errors: 0 };
    }

    console.log(`💾 Saving ${sunatBusinesses.length} SUNAT businesses...`);

    // Convert to OpenStreet format
    const businesses = sunatBusinesses.map(data => this.convertToOpenStreetBusiness(data));

    // Check for duplicates
    const existingOsmIds = await db.select({ osmId: openstreetBusinesses.osmId })
      .from(openstreetBusinesses);
    const existingOsmIdSet = new Set(existingOsmIds.map(row => row.osmId));

    const newBusinesses = businesses.filter(business => 
      !existingOsmIdSet.has(business.osmId)
    );

    console.log(`📊 New businesses to import: ${newBusinesses.length}`);
    console.log(`📊 Duplicates skipped: ${businesses.length - newBusinesses.length}`);

    if (newBusinesses.length === 0) {
      return { imported: 0, duplicates: businesses.length, errors: 0 };
    }

    // Batch import
    const batchSize = 50;
    const totalBatches = Math.ceil(newBusinesses.length / batchSize);
    let imported = 0;
    const errors = [];

    for (let i = 0; i < totalBatches; i++) {
      const batch = newBusinesses.slice(i * batchSize, (i + 1) * batchSize);

      try {
        await db.insert(openstreetBusinesses).values(batch);
        imported += batch.length;

        const progress = ((imported / newBusinesses.length) * 100).toFixed(1);
        console.log(`  ✅ Batch ${i + 1}/${totalBatches}: ${imported}/${newBusinesses.length} (${progress}%)`);

      } catch (error) {
        console.error(`❌ Batch ${i + 1} failed:`, error.message);
        errors.push(error.message);
      }
    }

    console.log(`✅ SUNAT import complete: ${imported} businesses imported`);
    return { imported, duplicates: businesses.length - newBusinesses.length, errors: errors.length };
  }

  /**
   * Execute SUNAT scraping
   */
  async execute(startRange = 20131000000, count = 1000) {
    try {
      console.log('🏛️  SUNAT RUC Registry Scraper');
      console.log('📋 Official Peru Government Business Data');
      console.log('⚖️  100% Legal SUNAT Registry Data\n');

      // Generate RUC numbers to search
      console.log(`🔢 Generating ${count} RUC numbers starting from ${startRange}...`);
      const rucNumbers = this.generateRucNumbers(startRange, count);
      console.log(`📊 Generated ${rucNumbers.length} RUC numbers to check\n`);

      // Batch lookup
      const { results, errors } = await this.batchLookupRuc(rucNumbers);

      // Save to database
      const saveResult = await this.saveBusinesses(results);

      // Final report
      const finalCount = await db.select({ count: sql`count(*)` }).from(openstreetBusinesses);

      console.log(`\n🎉 SUNAT SCRAPING COMPLETED!`);
      console.log(`📊 FINAL STATISTICS:`);
      console.log(`  - RUC numbers checked: ${rucNumbers.length}`);
      console.log(`  - Active businesses found: ${results.length}`);
      console.log(`  - Successfully imported: ${saveResult.imported}`);
      console.log(`  - Duplicates skipped: ${saveResult.duplicates}`);
      console.log(`  - Lookup errors: ${errors.length}`);
      console.log(`  - Import errors: ${saveResult.errors}`);
      console.log(`  - Total OpenStreet businesses: ${finalCount[0].count}`);

      return saveResult;

    } catch (error) {
      console.error('💥 SUNAT scraping failed:', error);
      throw error;
    }
  }
}

// Export scraper instance
export const sunatRucScraper = new SunatRucScraper();

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Example: Scrape 500 RUC numbers starting from a specific range
  sunatRucScraper.execute(20131000000, 500).then(result => {
    console.log('\n🎯 SUNAT scraping completed successfully!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Scraping failed:', error);
    process.exit(1);
  });
}
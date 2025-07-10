/**
 * 🔗 PERU APIS INTEGRATION SCRAPER
 * 
 * Legal business data integration using Peru APIs and open-source endpoints
 * Combines multiple legal data sources for comprehensive coverage
 * 
 * SOURCES:
 * - PeruAPIs.com (RUC lookup, DNI lookup)
 * - consulta-peru API (Open source DNI/RUC)
 * - peru-consult-api (GraphQL company lookup)
 */

import { db } from '../server/db.js';
import { openstreetBusinesses } from '../shared/schema.js';
import { sql } from 'drizzle-orm';

class PeruApisIntegration {
  constructor() {
    this.peruApisBase = 'https://www.peruapis.com';
    this.consultaPeruBase = 'https://consulta-peru.vercel.app/api/v1'; // Example endpoint
    this.userAgent = 'MiCita Business Directory/1.0 (https://micita.pe)';
    this.rateLimit = 1000; // 1 second between requests
  }

  /**
   * Lookup business using PeruAPIs.com
   */
  async lookupWithPeruAPIs(rucNumber) {
    try {
      const response = await fetch(`${this.peruApisBase}/api/ruc/${rucNumber}`, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`PeruAPIs HTTP ${response.status}`);
      }

      const data = await response.json();
      
      return {
        source: 'peruapis',
        ruc: data.ruc,
        razonSocial: data.razonSocial,
        nombreComercial: data.nombreComercial,
        tipo: data.tipo,
        estado: data.estado,
        condicion: data.condicion,
        direccion: data.direccion,
        distrito: data.distrito,
        provincia: data.provincia,
        departamento: data.departamento,
        actividadEconomica: data.actEconomicas?.[0]?.desc || null,
        fechaInscripcion: data.fechaInscripcion
      };

    } catch (error) {
      console.error(`❌ PeruAPIs lookup failed for ${rucNumber}:`, error.message);
      return null;
    }
  }

  /**
   * Lookup business using consulta-peru API
   */
  async lookupWithConsultaPeru(rucNumber) {
    try {
      const response = await fetch(`${this.consultaPeruBase}/ruc/${rucNumber}`, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Consulta-Peru HTTP ${response.status}`);
      }

      const data = await response.json();
      
      return {
        source: 'consulta-peru',
        ruc: data.ruc,
        razonSocial: data.razonSocial,
        nombreComercial: data.nombreComercial,
        estado: data.estado,
        direccion: data.direccion,
        distrito: data.distrito,
        provincia: data.provincia
      };

    } catch (error) {
      console.error(`❌ Consulta-Peru lookup failed for ${rucNumber}:`, error.message);
      return null;
    }
  }

  /**
   * Multi-source business lookup
   */
  async multiSourceLookup(rucNumber) {
    console.log(`🔍 Multi-source lookup for RUC: ${rucNumber}`);

    // Try multiple sources in order of preference
    const sources = [
      () => this.lookupWithPeruAPIs(rucNumber),
      () => this.lookupWithConsultaPeru(rucNumber)
    ];

    for (const sourceFunction of sources) {
      try {
        const result = await sourceFunction();
        if (result) {
          console.log(`  ✅ Found in ${result.source}: ${result.razonSocial}`);
          return result;
        }
      } catch (error) {
        console.error(`  ❌ Source failed:`, error.message);
      }

      // Rate limiting between sources
      await new Promise(resolve => setTimeout(resolve, this.rateLimit));
    }

    console.log(`  ❌ Not found in any source: ${rucNumber}`);
    return null;
  }

  /**
   * Convert API data to OpenStreet business format
   */
  convertToOpenStreetBusiness(apiData) {
    const category = this.detectCategoryFromActivity(apiData.actividadEconomica, apiData.razonSocial);
    
    // Build full address
    const addressParts = [apiData.direccion, apiData.distrito, apiData.provincia, apiData.departamento]
      .filter(Boolean);
    const fullAddress = addressParts.join(', ');

    return {
      osmId: `${apiData.source}/${apiData.ruc}`,
      osmType: apiData.source,
      name: apiData.nombreComercial || apiData.razonSocial,
      amenity: null,
      shop: null,
      address: fullAddress,
      houseNumber: null,
      street: null,
      city: apiData.provincia || 'Lima',
      district: apiData.distrito,
      postcode: null,
      phone: null,
      website: null,
      email: null,
      openingHours: null,
      latitude: null, // Would need geocoding service
      longitude: null,
      building: null,
      buildingLevels: null,
      operator: apiData.razonSocial,
      brand: apiData.nombreComercial,
      cuisine: null,
      wheelchair: null,
      category: category,
      subcategory: apiData.tipo,
      tags: {
        'source': apiData.source,
        'ruc': apiData.ruc,
        'business_status': apiData.estado,
        'business_condition': apiData.condicion,
        'business_type': apiData.tipo,
        'economic_activity': apiData.actividadEconomica,
        'registration_date': apiData.fechaInscripcion,
        'department': apiData.departamento,
        'province': apiData.provincia
      },
      geometry: null
    };
  }

  /**
   * Detect category from economic activity
   */
  detectCategoryFromActivity(activity, businessName) {
    if (!activity && !businessName) return 'servicios';
    
    const text = `${activity} ${businessName}`.toLowerCase();
    
    // Gastronomía
    if (text.includes('restaurant') || text.includes('comida') || 
        text.includes('gastronom') || text.includes('cafe') ||
        text.includes('bar') || text.includes('alimentar')) {
      return 'gastronomia';
    }
    
    // Salud
    if (text.includes('salud') || text.includes('medic') || 
        text.includes('clinic') || text.includes('hospital') ||
        text.includes('farmacia') || text.includes('odontolog')) {
      return 'salud';
    }
    
    // Belleza
    if (text.includes('belleza') || text.includes('peluquer') || 
        text.includes('salon') || text.includes('cosmet') ||
        text.includes('spa') || text.includes('estetica')) {
      return 'belleza';
    }
    
    // Automotriz
    if (text.includes('automotriz') || text.includes('vehicul') || 
        text.includes('automov') || text.includes('taller') ||
        text.includes('mechanic') || text.includes('combustible')) {
      return 'automotriz';
    }
    
    // Educación
    if (text.includes('educacion') || text.includes('enseñanza') || 
        text.includes('instituto') || text.includes('colegio') ||
        text.includes('universidad') || text.includes('capacitacion')) {
      return 'educacion';
    }
    
    // Fitness
    if (text.includes('gimnasio') || text.includes('fitness') || 
        text.includes('deporte') || text.includes('entrenamiento')) {
      return 'fitness';
    }
    
    return 'servicios';
  }

  /**
   * Generate valid RUC numbers for businesses
   */
  generateBusinessRucNumbers(startRange = 20100000000, count = 1000) {
    const rucNumbers = [];
    for (let i = 0; i < count; i++) {
      const baseNumber = startRange + i;
      const checkDigit = this.calculateRucCheckDigit(baseNumber);
      rucNumbers.push(`${baseNumber}${checkDigit}`);
    }
    return rucNumbers;
  }

  /**
   * Calculate RUC check digit
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
   * Batch business lookup across multiple APIs
   */
  async batchMultiSourceLookup(rucNumbers) {
    console.log(`🔍 Multi-source batch lookup for ${rucNumbers.length} RUC numbers...`);
    
    const results = [];
    const errors = [];

    for (let i = 0; i < rucNumbers.length; i++) {
      const rucNumber = rucNumbers[i];
      
      try {
        const result = await this.multiSourceLookup(rucNumber);
        
        if (result) {
          results.push(result);
        }
        
        // Progress indicator
        if ((i + 1) % 25 === 0) {
          console.log(`  Progress: ${i + 1}/${rucNumbers.length} (${results.length} found)`);
        }
        
        // Rate limiting between lookups
        await new Promise(resolve => setTimeout(resolve, this.rateLimit));
        
      } catch (error) {
        console.error(`❌ Error with RUC ${rucNumber}:`, error.message);
        errors.push({ ruc: rucNumber, error: error.message });
      }
    }

    console.log(`📊 Multi-source lookup complete: ${results.length} businesses found, ${errors.length} errors`);
    return { results, errors };
  }

  /**
   * Execute Peru APIs integration
   */
  async execute(startRange = 20131000000, count = 500) {
    try {
      console.log('🔗 PERU APIS INTEGRATION SCRAPER');
      console.log('📋 Multi-Source Legal Business Data');
      console.log('⚖️  100% Legal API Data Sources\n');

      // Get current database count
      const currentCount = await db.select({ count: sql`count(*)` }).from(openstreetBusinesses);
      console.log(`📊 Current OpenStreet businesses: ${currentCount[0].count || 0}\n`);

      // Generate RUC numbers
      console.log(`🔢 Generating ${count} RUC numbers starting from ${startRange}...`);
      const rucNumbers = this.generateBusinessRucNumbers(startRange, count);
      console.log(`📊 Generated ${rucNumbers.length} RUC numbers to check\n`);

      // Multi-source lookup
      const { results, errors } = await this.batchMultiSourceLookup(rucNumbers);

      // Convert and save
      if (results.length > 0) {
        const businesses = results.map(data => this.convertToOpenStreetBusiness(data));
        
        // Check for duplicates
        const existingOsmIds = await db.select({ osmId: openstreetBusinesses.osmId })
          .from(openstreetBusinesses);
        const existingOsmIdSet = new Set(existingOsmIds.map(row => row.osmId));

        const newBusinesses = businesses.filter(business => 
          !existingOsmIdSet.has(business.osmId)
        );

        console.log(`\n💾 Saving ${newBusinesses.length} new businesses...`);

        if (newBusinesses.length > 0) {
          // Batch import
          const batchSize = 25;
          const totalBatches = Math.ceil(newBusinesses.length / batchSize);
          let imported = 0;

          for (let i = 0; i < totalBatches; i++) {
            const batch = newBusinesses.slice(i * batchSize, (i + 1) * batchSize);

            try {
              await db.insert(openstreetBusinesses).values(batch);
              imported += batch.length;

              const progress = ((imported / newBusinesses.length) * 100).toFixed(1);
              console.log(`  ✅ Batch ${i + 1}/${totalBatches}: ${imported}/${newBusinesses.length} (${progress}%)`);

            } catch (error) {
              console.error(`❌ Batch ${i + 1} failed:`, error.message);
            }
          }

          console.log(`✅ API import complete: ${imported} businesses imported`);
        }
      }

      // Final report
      const finalCount = await db.select({ count: sql`count(*)` }).from(openstreetBusinesses);

      console.log(`\n🎉 PERU APIS INTEGRATION COMPLETED!`);
      console.log(`📊 FINAL STATISTICS:`);
      console.log(`  - RUC numbers checked: ${rucNumbers.length}`);
      console.log(`  - Businesses found: ${results.length}`);
      console.log(`  - Lookup errors: ${errors.length}`);
      console.log(`  - Total OpenStreet businesses: ${finalCount[0].count}`);

      return {
        checked: rucNumbers.length,
        found: results.length,
        errors: errors.length,
        totalBusinesses: finalCount[0].count
      };

    } catch (error) {
      console.error('💥 Peru APIs integration failed:', error);
      throw error;
    }
  }
}

// Export integration instance
export const peruApisIntegration = new PeruApisIntegration();

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  peruApisIntegration.execute(20131000000, 200).then(result => {
    console.log('\n🎯 Peru APIs integration completed successfully!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Integration failed:', error);
    process.exit(1);
  });
}
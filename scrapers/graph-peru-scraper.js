/**
 * 🇵🇪 GRAPH PERÚ API INTEGRATION
 * 
 * High-quality legal business data using Graph Perú API by Daustinn
 * FREE API with official SUNAT and RENIEC data
 * 
 * FEATURES:
 * - 100% legal official Peru government data
 * - No API key required, completely free
 * - REST and GraphQL support
 * - Redis caching for fast responses
 * - Cloudflare CDN for global availability
 * - 50 queries per minute rate limit
 */

import { db } from '../server/db.js';
import { openstreetBusinesses } from '../shared/schema.js';
import { sql } from 'drizzle-orm';

class GraphPeruIntegration {
  constructor() {
    this.baseUrl = 'https://graphperu.daustinn.com/api';
    this.userAgent = 'MiCita Business Directory/1.0 (https://micita.pe)';
    this.rateLimit = 1200; // 1.2 seconds between requests (50/minute = safe margin)
  }

  /**
   * REST API business lookup by RUC
   */
  async lookupBusinessByRuc(rucNumber) {
    try {
      const response = await fetch(`${this.baseUrl}/query/${rucNumber}`, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Check if it's a business (RUC starts with 20 for companies)
      if (!rucNumber.startsWith('20') || !data.DocumentId) {
        return null;
      }

      return {
        source: 'graph-peru',
        documentId: data.DocumentId,
        name: data.Name,
        state: data.State,
        condition: data.Condition,
        address: data.Address,
        ubigeo: data.Ubigeo,
        viaType: data.ViaType,
        viaName: data.ViaName,
        zoneType: data.ZoneType,
        number: data.Number,
        district: data.District,
        province: data.Province,
        region: data.Region,
        resourceOf: data.ResourceOf
      };

    } catch (error) {
      console.error(`❌ Graph Perú lookup failed for RUC ${rucNumber}:`, error.message);
      return null;
    }
  }

  /**
   * GraphQL business lookup (alternative method)
   */
  async lookupBusinessGraphQL(rucNumber) {
    try {
      const query = `
        query {
          business(match: "${rucNumber}") {
            documentID
            name
            state
            condition
            address
            ubigeo
            viaType
            viaName
            zoneType
            number
            district
            province
            region
            resourceOf
          }
        }
      `;

      const response = await fetch(`${this.baseUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.userAgent
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`GraphQL HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      const business = result.data?.business;
      if (!business || !business.documentID) {
        return null;
      }

      return {
        source: 'graph-peru-graphql',
        documentId: business.documentID,
        name: business.name,
        state: business.state,
        condition: business.condition,
        address: business.address,
        ubigeo: business.ubigeo,
        viaType: business.viaType,
        viaName: business.viaName,
        zoneType: business.zoneType,
        number: business.number,
        district: business.district,
        province: business.province,
        region: business.region,
        resourceOf: business.resourceOf
      };

    } catch (error) {
      console.error(`❌ Graph Perú GraphQL lookup failed for RUC ${rucNumber}:`, error.message);
      return null;
    }
  }

  /**
   * Convert Graph Perú data to OpenStreet business format
   */
  convertToOpenStreetBusiness(graphPeruData) {
    const category = this.detectCategoryFromName(graphPeruData.name);
    
    // Build complete address
    const addressParts = [];
    if (graphPeruData.viaType && graphPeruData.viaName) {
      addressParts.push(`${graphPeruData.viaType} ${graphPeruData.viaName}`);
    }
    if (graphPeruData.number) {
      addressParts.push(graphPeruData.number.toString());
    }
    if (graphPeruData.zoneType) {
      addressParts.push(graphPeruData.zoneType);
    }
    if (graphPeruData.district) {
      addressParts.push(graphPeruData.district);
    }
    if (graphPeruData.province && graphPeruData.province !== graphPeruData.district) {
      addressParts.push(graphPeruData.province);
    }
    if (graphPeruData.region && graphPeruData.region !== graphPeruData.province) {
      addressParts.push(graphPeruData.region);
    }

    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : graphPeruData.address;

    return {
      osmId: `graph-peru/${graphPeruData.documentId}`,
      osmType: 'graph-peru',
      name: graphPeruData.name,
      amenity: null,
      shop: null,
      address: fullAddress,
      houseNumber: graphPeruData.number ? graphPeruData.number.toString() : null,
      street: graphPeruData.viaName,
      city: graphPeruData.province || 'Lima',
      district: graphPeruData.district,
      postcode: null,
      phone: null,
      website: null,
      email: null,
      openingHours: null,
      latitude: null, // Would need geocoding
      longitude: null,
      building: null,
      buildingLevels: null,
      operator: graphPeruData.name,
      brand: null,
      cuisine: null,
      wheelchair: null,
      category: category,
      subcategory: 'Empresa registrada',
      tags: {
        'source': graphPeruData.source,
        'ruc': graphPeruData.documentId,
        'business_state': graphPeruData.state,
        'business_condition': graphPeruData.condition,
        'ubigeo': graphPeruData.ubigeo,
        'via_type': graphPeruData.viaType,
        'zone_type': graphPeruData.zoneType,
        'resource_of': graphPeruData.resourceOf,
        'province': graphPeruData.province,
        'region': graphPeruData.region
      },
      geometry: null
    };
  }

  /**
   * Detect business category from company name
   */
  detectCategoryFromName(name) {
    if (!name) return 'servicios';
    
    const nameLower = name.toLowerCase();
    
    // Gastronomía
    if (nameLower.includes('restaurant') || nameLower.includes('cafe') || 
        nameLower.includes('comida') || nameLower.includes('gastronom') ||
        nameLower.includes('panaderia') || nameLower.includes('pizzeria') ||
        nameLower.includes('bar') || nameLower.includes('cocina')) {
      return 'gastronomia';
    }
    
    // Salud
    if (nameLower.includes('clinic') || nameLower.includes('hospital') || 
        nameLower.includes('medic') || nameLower.includes('farmacia') ||
        nameLower.includes('salud') || nameLower.includes('dental') ||
        nameLower.includes('odontolog') || nameLower.includes('veterinari')) {
      return 'salud';
    }
    
    // Belleza
    if (nameLower.includes('salon') || nameLower.includes('peluquer') || 
        nameLower.includes('belleza') || nameLower.includes('spa') ||
        nameLower.includes('estetica') || nameLower.includes('cosmet') ||
        nameLower.includes('barber')) {
      return 'belleza';
    }
    
    // Automotriz
    if (nameLower.includes('automotriz') || nameLower.includes('taller') || 
        nameLower.includes('mechanic') || nameLower.includes('auto') ||
        nameLower.includes('vehicul') || nameLower.includes('lubricant') ||
        nameLower.includes('llantas') || nameLower.includes('repuesto')) {
      return 'automotriz';
    }
    
    // Educación
    if (nameLower.includes('educacion') || nameLower.includes('instituto') || 
        nameLower.includes('colegio') || nameLower.includes('universidad') ||
        nameLower.includes('academica') || nameLower.includes('capacitacion') ||
        nameLower.includes('enseñanza') || nameLower.includes('escuela')) {
      return 'educacion';
    }
    
    // Fitness
    if (nameLower.includes('gimnasio') || nameLower.includes('fitness') || 
        nameLower.includes('deporte') || nameLower.includes('entrenamiento') ||
        nameLower.includes('gym') || nameLower.includes('yoga')) {
      return 'fitness';
    }
    
    return 'servicios';
  }

  /**
   * Generate valid business RUC numbers
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
   * Calculate RUC check digit (validation)
   */
  calculateRucCheckDigit(baseNumber) {
    const numberStr = baseNumber.toString();
    if (numberStr.length !== 10) {
      throw new Error(`Base number must be 10 digits, got ${numberStr.length}`);
    }
    
    const digits = numberStr.split('').map(Number);
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
   * Batch business lookup with rate limiting
   */
  async batchLookupBusinesses(rucNumbers) {
    console.log(`🔍 Graph Perú batch lookup for ${rucNumbers.length} RUC numbers...`);
    console.log(`⚡ FREE API - No key required - 50 queries/minute limit\n`);
    
    const results = [];
    const errors = [];
    let processed = 0;

    for (const rucNumber of rucNumbers) {
      try {
        // Try REST API first (primary method)
        let result = await this.lookupBusinessByRuc(rucNumber);
        
        // Fallback to GraphQL if REST fails
        if (!result) {
          await new Promise(resolve => setTimeout(resolve, 200)); // Small delay
          result = await this.lookupBusinessGraphQL(rucNumber);
        }
        
        if (result) {
          results.push(result);
          console.log(`  ✅ Found: ${result.name} (${result.district})`);
        }
        
        processed++;
        
        // Progress indicator
        if (processed % 25 === 0) {
          console.log(`  📊 Progress: ${processed}/${rucNumbers.length} (${results.length} found)`);
        }
        
        // Rate limiting - respect 50 queries/minute limit
        await new Promise(resolve => setTimeout(resolve, this.rateLimit));
        
      } catch (error) {
        console.error(`❌ Error with RUC ${rucNumber}:`, error.message);
        errors.push({ ruc: rucNumber, error: error.message });
      }
    }

    console.log(`\n📊 Batch lookup complete: ${results.length} businesses found, ${errors.length} errors`);
    return { results, errors };
  }

  /**
   * Save businesses to database
   */
  async saveBusinesses(graphPeruBusinesses) {
    if (graphPeruBusinesses.length === 0) {
      console.log('⚠️  No Graph Perú businesses to save');
      return { imported: 0, duplicates: 0, errors: 0 };
    }

    console.log(`💾 Saving ${graphPeruBusinesses.length} Graph Perú businesses...`);

    // Convert to OpenStreet format
    const businesses = graphPeruBusinesses.map(data => this.convertToOpenStreetBusiness(data));

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

    console.log(`✅ Graph Perú import complete: ${imported} businesses imported`);
    return { imported, duplicates: businesses.length - newBusinesses.length, errors: errors.length };
  }

  /**
   * Execute Graph Perú business scraping
   */
  async execute(startRange = 20131000000, count = 200) {
    try {
      console.log('🇵🇪 GRAPH PERÚ API INTEGRATION');
      console.log('📋 Official SUNAT & RENIEC Data via Daustinn API');
      console.log('💰 100% FREE - No API Key Required');
      console.log('⚡ Redis Cached - Cloudflare CDN\n');

      // Get current database count
      const currentCount = await db.select({ count: sql`count(*)` }).from(openstreetBusinesses);
      console.log(`📊 Current OpenStreet businesses: ${currentCount[0].count || 0}\n`);

      // Generate RUC numbers (companies start with 20)
      console.log(`🔢 Generating ${count} business RUC numbers starting from ${startRange}...`);
      const rucNumbers = this.generateBusinessRucNumbers(startRange, count);
      console.log(`📊 Generated ${rucNumbers.length} valid RUC numbers\n`);

      // Batch lookup
      const { results, errors } = await this.batchLookupBusinesses(rucNumbers);

      // Save to database
      const saveResult = await this.saveBusinesses(results);

      // Final report
      const finalCount = await db.select({ count: sql`count(*)` }).from(openstreetBusinesses);

      console.log(`\n🎉 GRAPH PERÚ INTEGRATION COMPLETED!`);
      console.log(`📊 FINAL STATISTICS:`);
      console.log(`  - RUC numbers checked: ${rucNumbers.length}`);
      console.log(`  - Active businesses found: ${results.length}`);
      console.log(`  - Successfully imported: ${saveResult.imported}`);
      console.log(`  - Duplicates skipped: ${saveResult.duplicates}`);
      console.log(`  - Lookup errors: ${errors.length}`);
      console.log(`  - Import errors: ${saveResult.errors}`);
      console.log(`  - Total OpenStreet businesses: ${finalCount[0].count}`);

      // Category analysis
      if (results.length > 0) {
        const categoryStats = {};
        const districtStats = {};
        
        for (const business of results) {
          const category = this.detectCategoryFromName(business.name);
          categoryStats[category] = (categoryStats[category] || 0) + 1;
          
          if (business.district) {
            districtStats[business.district] = (districtStats[business.district] || 0) + 1;
          }
        }
        
        console.log(`\n📋 CATEGORY DISTRIBUTION:`);
        Object.entries(categoryStats)
          .sort(([,a], [,b]) => b - a)
          .forEach(([category, count]) => {
            console.log(`  ${category}: ${count} businesses`);
          });
        
        console.log(`\n🏘️ TOP DISTRICTS:`);
        Object.entries(districtStats)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .forEach(([district, count]) => {
            console.log(`  ${district}: ${count} businesses`);
          });
      }

      return saveResult;

    } catch (error) {
      console.error('💥 Graph Perú integration failed:', error);
      throw error;
    }
  }
}

// Export integration instance
export const graphPeruIntegration = new GraphPeruIntegration();

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Example: Check 100 RUC numbers from a specific range
  graphPeruIntegration.execute(20131000000, 100).then(result => {
    console.log('\n🎯 Graph Perú integration completed successfully!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Integration failed:', error);
    process.exit(1);
  });
}
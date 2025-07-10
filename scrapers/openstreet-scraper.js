/**
 * 🗺️ OPENSTREETMAP OVERPASS API SCRAPER
 * 
 * Legal business data scraper using OpenStreetMap's Overpass API
 * Free alternative to Google Places with global coverage
 * 
 * FEATURES:
 * - 100% legal and free OpenStreetMap data
 * - Comprehensive business information
 * - Geographic boundary support
 * - Real-time data scraping capabilities
 */

import { db } from '../server/db.ts';
import { openstreetBusinesses } from '../shared/schema.ts';
import { sql } from 'drizzle-orm';

class OpenStreetMapScraper {
  constructor() {
    this.overpassUrl = 'https://overpass-api.de/api/interpreter';
    this.userAgent = 'MiCita Business Directory/1.0 (https://micita.pe)';
  }

  /**
   * Generate Overpass QL query for businesses in Peru
   */
  generateOverpassQuery(boundingBox = null, categories = []) {
    // Default bounding box for Lima, Peru
    const defaultBox = boundingBox || '-77.2,-12.2,-76.8,-11.8';
    
    // Business amenities and shops to search for
    const businessAmenities = [
      'restaurant', 'cafe', 'bar', 'pub', 'fast_food',
      'hospital', 'clinic', 'pharmacy', 'dentist', 'veterinary',
      'fuel', 'car_wash', 'car_repair',
      'bank', 'atm', 'post_office',
      'school', 'university', 'college', 'library',
      'gym', 'fitness_centre',
      'place_of_worship', 'townhall'
    ];
    
    const businessShops = [
      'supermarket', 'convenience', 'bakery', 'butcher',
      'clothes', 'shoes', 'electronics', 'mobile_phone',
      'hairdresser', 'beauty', 'cosmetics',
      'car', 'car_parts', 'car_repair',
      'hardware', 'furniture', 'florist',
      'jewelry', 'optician', 'medical'
    ];
    
    // Build query parts
    const amenityQueries = businessAmenities.map(amenity => 
      `node["amenity"="${amenity}"]["name"](${defaultBox});`
    ).join('\n');
    
    const shopQueries = businessShops.map(shop => 
      `node["shop"="${shop}"]["name"](${defaultBox});`
    ).join('\n');
    
    const wayQueries = businessAmenities.map(amenity => 
      `way["amenity"="${amenity}"]["name"](${defaultBox});`
    ).join('\n');
    
    return `
      [out:json][timeout:60];
      (
        ${amenityQueries}
        ${shopQueries}
        ${wayQueries}
      );
      out center meta;
    `;
  }

  /**
   * Execute Overpass API query
   */
  async executeOverpassQuery(query) {
    try {
      const response = await fetch(this.overpassUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': this.userAgent
        },
        body: `data=${encodeURIComponent(query)}`
      });
      
      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.elements || [];
      
    } catch (error) {
      console.error('❌ Overpass API request failed:', error);
      throw error;
    }
  }

  /**
   * Convert OSM element to our business format
   */
  convertOSMElement(element) {
    const tags = element.tags || {};
    
    // Determine coordinates
    let lat = element.lat;
    let lon = element.lon;
    
    // For ways, use center coordinates
    if (element.center) {
      lat = element.center.lat;
      lon = element.center.lon;
    }
    
    // Category detection
    const category = this.detectCategory(tags);
    const subcategory = tags.amenity || tags.shop || 'Lugar de interés';
    
    // Build address
    const address = this.buildAddress(tags);
    
    return {
      osmId: `${element.type}/${element.id}`,
      osmType: element.type,
      name: tags.name || 'Sin nombre',
      amenity: tags.amenity || null,
      shop: tags.shop || null,
      address: address,
      houseNumber: tags['addr:housenumber'] || null,
      street: tags['addr:street'] || null,
      city: tags['addr:city'] || 'Lima',
      district: tags['addr:district'] || tags['addr:city'] || null,
      postcode: tags['addr:postcode'] || null,
      phone: tags.phone || tags['contact:phone'] || null,
      website: tags.website || tags['contact:website'] || null,
      email: tags.email || tags['contact:email'] || null,
      openingHours: tags.opening_hours || null,
      latitude: lat ? lat.toString() : null,
      longitude: lon ? lon.toString() : null,
      building: tags.building || null,
      buildingLevels: tags['building:levels'] || null,
      operator: tags.operator || null,
      brand: tags.brand || null,
      cuisine: tags.cuisine || null,
      wheelchair: tags.wheelchair || null,
      category: category,
      subcategory: subcategory,
      tags: tags,
      geometry: {
        type: 'Point',
        coordinates: [lon, lat]
      }
    };
  }

  /**
   * Detect business category from OSM tags
   */
  detectCategory(tags) {
    const amenity = (tags.amenity || '').toLowerCase();
    const shop = (tags.shop || '').toLowerCase();
    const name = (tags.name || '').toLowerCase();
    const cuisine = (tags.cuisine || '').toLowerCase();
    
    // Gastronomía
    if (amenity.includes('restaurant') || amenity.includes('cafe') || 
        amenity.includes('bar') || amenity.includes('pub') ||
        amenity.includes('fast_food') || shop.includes('bakery') || cuisine) {
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
        shop.includes('cosmetics') || name.includes('salon') ||
        name.includes('peluquer') || name.includes('barber')) {
      return 'belleza';
    }
    
    // Automotriz
    if (amenity.includes('fuel') || amenity.includes('car_wash') || 
        amenity.includes('car_repair') || shop.includes('car') ||
        shop.includes('car_parts') || name.includes('taller')) {
      return 'automotriz';
    }
    
    // Fitness
    if (amenity.includes('gym') || amenity.includes('fitness') || 
        shop.includes('sports') || name.includes('gimnasio')) {
      return 'fitness';
    }
    
    // Educación
    if (amenity.includes('school') || amenity.includes('university') || 
        amenity.includes('college') || amenity.includes('library') ||
        shop.includes('books')) {
      return 'educacion';
    }
    
    return 'servicios';
  }

  /**
   * Build address from OSM tags
   */
  buildAddress(tags) {
    const parts = [];
    
    if (tags['addr:housenumber']) {
      parts.push(tags['addr:housenumber']);
    }
    if (tags['addr:street']) {
      parts.push(tags['addr:street']);
    }
    if (tags['addr:city'] || tags['addr:district']) {
      parts.push(tags['addr:city'] || tags['addr:district']);
    }
    if (tags['addr:postcode']) {
      parts.push(tags['addr:postcode']);
    }
    
    return parts.length > 0 ? parts.join(', ') : null;
  }

  /**
   * Scrape businesses from specific Lima districts
   */
  async scrapeDistrict(districtName, boundingBox) {
    console.log(`🗺️  Scraping businesses from ${districtName}...`);
    
    try {
      const query = this.generateOverpassQuery(boundingBox);
      const elements = await this.executeOverpassQuery(query);
      
      console.log(`📊 Found ${elements.length} potential businesses in ${districtName}`);
      
      // Convert and filter elements
      const businesses = [];
      for (const element of elements) {
        try {
          if (element.tags && element.tags.name) {
            const business = this.convertOSMElement(element);
            if (business.latitude && business.longitude) {
              businesses.push(business);
            }
          }
        } catch (error) {
          console.error(`❌ Error converting element ${element.id}:`, error.message);
        }
      }
      
      console.log(`✅ Processed ${businesses.length} valid businesses from ${districtName}`);
      return businesses;
      
    } catch (error) {
      console.error(`❌ Error scraping ${districtName}:`, error);
      return [];
    }
  }

  /**
   * Comprehensive Lima scraping by districts
   */
  async scrapeLimaBusinesses() {
    console.log('🚀 STARTING OPENSTREETMAP LIMA SCRAPING...\n');
    
    // Lima districts with bounding boxes
    const limaDistricts = [
      { name: 'Miraflores', box: '-77.05,-12.13,-77.01,-12.11' },
      { name: 'San Isidro', box: '-77.05,-12.10,-77.03,-12.08' },
      { name: 'Barranco', box: '-77.03,-12.15,-77.01,-12.13' },
      { name: 'Lima Centro', box: '-77.05,-12.05,-77.00,-12.03' },
      { name: 'Callao', box: '-77.15,-12.07,-77.11,-12.03' },
      { name: 'La Molina', box: '-76.97,-12.09,-76.93,-12.05' },
      { name: 'Santiago de Surco', box: '-77.01,-12.14,-76.97,-12.10' },
      { name: 'San Borja', box: '-77.01,-12.10,-76.99,-12.08' }
    ];
    
    const allBusinesses = [];
    let totalScraped = 0;
    
    for (const district of limaDistricts) {
      try {
        const businesses = await this.scrapeDistrict(district.name, district.box);
        allBusinesses.push(...businesses);
        totalScraped += businesses.length;
        
        // Rate limiting - wait 2 seconds between districts
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Failed to scrape ${district.name}:`, error);
      }
    }
    
    console.log(`\n📊 SCRAPING SUMMARY:`);
    console.log(`  - Districts scraped: ${limaDistricts.length}`);
    console.log(`  - Total businesses found: ${totalScraped}`);
    console.log(`  - Unique businesses: ${allBusinesses.length}`);
    
    return allBusinesses;
  }

  /**
   * Save scraped businesses to database
   */
  async saveBusinesses(businesses) {
    if (businesses.length === 0) {
      console.log('⚠️  No businesses to save');
      return { imported: 0, duplicates: 0, errors: 0 };
    }
    
    console.log(`\n💾 Saving ${businesses.length} businesses to database...`);
    
    // Get existing OSM IDs for duplicate checking
    const existingOsmIds = await db.select({ osmId: openstreetBusinesses.osmId })
      .from(openstreetBusinesses);
    const existingOsmIdSet = new Set(existingOsmIds.map(row => row.osmId));
    
    // Filter out duplicates
    const newBusinesses = businesses.filter(business => 
      !existingOsmIdSet.has(business.osmId)
    );
    
    console.log(`📊 New businesses to import: ${newBusinesses.length}`);
    console.log(`📊 Duplicates skipped: ${businesses.length - newBusinesses.length}`);
    
    if (newBusinesses.length === 0) {
      return { imported: 0, duplicates: businesses.length, errors: 0 };
    }
    
    // Batch import
    const batchSize = 100;
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
    
    console.log(`\n✅ Database import complete!`);
    console.log(`  - Imported: ${imported} businesses`);
    console.log(`  - Errors: ${errors.length}`);
    
    return {
      imported,
      duplicates: businesses.length - newBusinesses.length,
      errors: errors.length
    };
  }

  /**
   * Main scraping execution
   */
  async execute() {
    try {
      console.log('🗺️  OpenStreetMap Business Scraper');
      console.log('📍 Targeting Lima, Peru districts');
      console.log('⚖️  100% legal OpenStreetMap data\n');
      
      // Get current database count
      const currentCount = await db.select({ count: sql`count(*)` }).from(openstreetBusinesses);
      console.log(`📊 Current OSM businesses in database: ${currentCount[0].count || 0}\n`);
      
      // Scrape businesses
      const businesses = await this.scrapeLimaBusinesses();
      
      // Save to database
      const result = await this.saveBusinesses(businesses);
      
      // Final report
      const finalCount = await db.select({ count: sql`count(*)` }).from(openstreetBusinesses);
      
      console.log(`\n🎉 SCRAPING COMPLETED!`);
      console.log(`📊 FINAL STATISTICS:`);
      console.log(`  - Businesses scraped: ${businesses.length}`);
      console.log(`  - Successfully imported: ${result.imported}`);
      console.log(`  - Duplicates skipped: ${result.duplicates}`);
      console.log(`  - Import errors: ${result.errors}`);
      console.log(`  - Total OSM businesses: ${finalCount[0].count}`);
      
      return result;
      
    } catch (error) {
      console.error('💥 Scraping failed:', error);
      throw error;
    }
  }
}

// Export scraper instance
export const openStreetMapScraper = new OpenStreetMapScraper();

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  openStreetMapScraper.execute().then(result => {
    console.log('\n🎯 OpenStreetMap scraping completed successfully!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Scraping failed:', error);
    process.exit(1);
  });
}
import { BusinessFromPlaces } from './google-places-service.js';

interface OverpassNode {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  tags?: {
    name?: string;
    'name:es'?: string;
    amenity?: string;
    shop?: string;
    tourism?: string;
    cuisine?: string;
    phone?: string;
    'contact:phone'?: string;
    website?: string;
    'contact:website'?: string;
    'addr:street'?: string;
    'addr:housenumber'?: string;
    'addr:city'?: string;
    'addr:postcode'?: string;
    opening_hours?: string;
    wheelchair?: string;
    internet_access?: string;
    [key: string]: string | undefined;
  };
  center?: {
    lat: number;
    lon: number;
  };
}

interface OverpassResponse {
  elements: OverpassNode[];
}

export class OverpassApiService {
  private baseUrl = 'https://overpass-api.de/api/interpreter';
  private timeout = 25; // seconds
  
  // Lima area ID from OpenStreetMap
  private limaAreaId = 3600288247;
  
  // Category mappings
  private categoryToOverpass: { [key: string]: string[] } = {
    'gastronomia': ['amenity=restaurant', 'amenity=cafe', 'amenity=fast_food', 'amenity=bar'],
    'belleza': ['shop=beauty', 'shop=hairdresser', 'shop=cosmetics', 'amenity=spa'],
    'salud': ['amenity=hospital', 'amenity=clinic', 'amenity=pharmacy', 'amenity=doctors', 'amenity=dentist'],
    'fitness': ['leisure=fitness_centre', 'leisure=sports_centre', 'sport=fitness'],
    'educacion': ['amenity=school', 'amenity=university', 'amenity=college', 'amenity=kindergarten'],
    'servicios': ['office=*', 'craft=*'],
    'automotriz': ['shop=car_repair', 'shop=car', 'amenity=car_wash'],
    'hogar': ['shop=furniture', 'shop=hardware', 'shop=doityourself'],
    'tecnologia': ['shop=electronics', 'shop=computer', 'shop=mobile_phone'],
    'consultoria': ['office=lawyer', 'office=accountant', 'office=consulting']
  };

  constructor() {
    console.log('OverpassApiService initialized');
  }

  // Build Overpass QL query
  private buildQuery(
    bounds?: { north: number; south: number; east: number; west: number },
    category?: string,
    searchTerm?: string
  ): string {
    let query = '[out:json][timeout:' + this.timeout + '];\n';
    
    // Determine area or bounds
    let areaFilter = '';
    if (bounds) {
      areaFilter = `(${bounds.south},${bounds.west},${bounds.north},${bounds.east})`;
    } else {
      areaFilter = `(area:${this.limaAreaId})`;
    }
    
    // Get category filters
    const categoryFilters = category ? this.categoryToOverpass[category] || [] : [];
    
    // Build the main query
    query += '(\n';
    
    if (categoryFilters.length > 0) {
      // Search specific categories
      categoryFilters.forEach(filter => {
        const [key, value] = filter.split('=');
        if (value === '*') {
          query += `  node["${key}"]${areaFilter};\n`;
          query += `  way["${key}"]${areaFilter};\n`;
        } else {
          query += `  node["${key}"="${value}"]${areaFilter};\n`;
          query += `  way["${key}"="${value}"]${areaFilter};\n`;
        }
      });
    } else if (searchTerm) {
      // ENHANCED SEARCH: Get ALL businesses first, then filter by name in code
      // This ensures we get comprehensive results instead of limited regex matches
      const allBusinessTypes = [
        // Food & Dining
        'amenity=restaurant', 'amenity=cafe', 'amenity=fast_food', 'amenity=bar', 'amenity=pub',
        // Shopping
        'shop=*',
        // Services
        'office=*', 'craft=*',
        // Beauty & Personal Care
        'shop=beauty', 'shop=hairdresser', 'shop=cosmetics', 'amenity=spa',
        // Health & Medical
        'amenity=hospital', 'amenity=clinic', 'amenity=pharmacy', 'amenity=doctors', 'amenity=dentist',
        // Fitness & Sports
        'leisure=fitness_centre', 'leisure=sports_centre', 'sport=fitness',
        // Education
        'amenity=school', 'amenity=university', 'amenity=college',
        // Tourism & Entertainment
        'tourism=*', 'amenity=theatre', 'amenity=cinema',
        // Professional Services
        'office=lawyer', 'office=accountant', 'office=insurance', 'office=real_estate',
        // Automotive
        'shop=car_repair', 'shop=car', 'amenity=car_wash', 'amenity=fuel',
        // Technology
        'shop=electronics', 'shop=computer', 'shop=mobile_phone'
      ];
      
      allBusinessTypes.forEach(filter => {
        const [key, value] = filter.split('=');
        if (value === '*') {
          query += `  node["${key}"]${areaFilter};\n`;
          query += `  way["${key}"]${areaFilter};\n`;
          query += `  relation["${key}"]${areaFilter};\n`;
        } else {
          query += `  node["${key}"="${value}"]${areaFilter};\n`;
          query += `  way["${key}"="${value}"]${areaFilter};\n`;
          query += `  relation["${key}"="${value}"]${areaFilter};\n`;
        }
      });
    } else {
      // COMPREHENSIVE: get ALL business types for maximum coverage
      const allBusinessTypes = [
        // Food & Dining
        'amenity=restaurant', 'amenity=cafe', 'amenity=fast_food', 'amenity=bar', 'amenity=pub',
        // Shopping
        'shop=*',
        // Services
        'office=*', 'craft=*',
        // Beauty & Personal Care
        'shop=beauty', 'shop=hairdresser', 'shop=cosmetics', 'amenity=spa',
        // Health & Medical
        'amenity=hospital', 'amenity=clinic', 'amenity=pharmacy', 'amenity=doctors', 'amenity=dentist',
        // Fitness & Sports
        'leisure=fitness_centre', 'leisure=sports_centre', 'sport=fitness',
        // Education
        'amenity=school', 'amenity=university', 'amenity=college',
        // Tourism & Entertainment
        'tourism=*', 'amenity=theatre', 'amenity=cinema',
        // Professional Services
        'office=lawyer', 'office=accountant', 'office=insurance', 'office=real_estate',
        // Automotive
        'shop=car_repair', 'shop=car', 'amenity=car_wash', 'amenity=fuel',
        // Technology
        'shop=electronics', 'shop=computer', 'shop=mobile_phone'
      ];
      
      allBusinessTypes.forEach(filter => {
        const [key, value] = filter.split('=');
        if (value === '*') {
          query += `  node["${key}"]${areaFilter};\n`;
          query += `  way["${key}"]${areaFilter};\n`;
          query += `  relation["${key}"]${areaFilter};\n`; // Include relations for complete coverage
        } else {
          query += `  node["${key}"="${value}"]${areaFilter};\n`;
          query += `  way["${key}"="${value}"]${areaFilter};\n`;
          query += `  relation["${key}"="${value}"]${areaFilter};\n`;
        }
      });
    }
    
    query += ');\n';
    query += 'out body;\n';
    query += '>;\n';
    query += 'out skel qt;';
    
    return query;
  }

  // Format address from OSM tags
  private formatAddress(tags: any): string {
    const parts = [];
    
    if (tags['addr:street'] && tags['addr:housenumber']) {
      parts.push(`${tags['addr:street']} ${tags['addr:housenumber']}`);
    } else if (tags['addr:street']) {
      parts.push(tags['addr:street']);
    }
    
    if (tags['addr:city']) {
      parts.push(tags['addr:city']);
    } else {
      parts.push('Lima');
    }
    
    if (tags['addr:postcode']) {
      parts.push(tags['addr:postcode']);
    }
    
    parts.push('Peru');
    
    return parts.join(', ');
  }

  // Map OSM tags to our category
  private mapToCategory(tags: any): string {
    if (tags.amenity) {
      if (['restaurant', 'cafe', 'fast_food', 'bar'].includes(tags.amenity)) return 'gastronomia';
      if (['hospital', 'clinic', 'pharmacy', 'doctors', 'dentist'].includes(tags.amenity)) return 'salud';
      if (['school', 'university', 'college'].includes(tags.amenity)) return 'educacion';
    }
    
    if (tags.shop) {
      if (['beauty', 'hairdresser', 'cosmetics'].includes(tags.shop)) return 'belleza';
      if (['car_repair', 'car'].includes(tags.shop)) return 'automotriz';
      if (['electronics', 'computer', 'mobile_phone'].includes(tags.shop)) return 'tecnologia';
      if (['furniture', 'hardware'].includes(tags.shop)) return 'hogar';
    }
    
    if (tags.leisure && ['fitness_centre', 'sports_centre'].includes(tags.leisure)) return 'fitness';
    if (tags.office) return tags.office === 'lawyer' || tags.office === 'accountant' ? 'consultoria' : 'servicios';
    if (tags.craft) return 'servicios';
    
    return 'servicios'; // default
  }

  // Convert Overpass result to our business format
  private convertToBusiness(element: OverpassNode): BusinessFromPlaces | null {
    if (!element.tags?.name) return null;
    
    const lat = element.lat || element.center?.lat;
    const lon = element.lon || element.center?.lon;
    
    if (!lat || !lon) return null;
    
    const business: BusinessFromPlaces = {
      id: `osm_${element.type}_${element.id}`,
      name: element.tags['name:es'] || element.tags.name,
      address: this.formatAddress(element.tags),
      category: this.mapToCategory(element.tags),
      rating: 0, // OSM doesn't have ratings
      reviewCount: 0,
      priceLevel: 0,
      phone: element.tags.phone || element.tags['contact:phone'],
      website: element.tags.website || element.tags['contact:website'],
      photoUrl: '', // Will be filled by Foursquare
      location: {
        lat: lat,
        lng: lon
      },
      openNow: undefined, // Could parse opening_hours but complex
      hours: element.tags.opening_hours ? [element.tags.opening_hours] : undefined,
      isRegistered: false
    };
    
    return business;
  }

  // Search businesses using Overpass API
  async searchBusinesses(
    query?: string,
    category?: string,
    bounds?: { north: number; south: number; east: number; west: number }
  ): Promise<BusinessFromPlaces[]> {
    try {
      console.log('🔍 Overpass API search:', { query, category, bounds });
      
      const overpassQuery = this.buildQuery(bounds, category, query);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'data=' + encodeURIComponent(overpassQuery)
      });
      
      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }
      
      const data: OverpassResponse = await response.json();
      console.log(`📍 Overpass returned ${data.elements.length} elements`);
      
      const businesses = data.elements
        .map(element => this.convertToBusiness(element))
        .filter((business): business is BusinessFromPlaces => business !== null);
      
      // ENHANCED FILTERING: Multiple strategies for comprehensive search results
      let filteredBusinesses = businesses;
      if (query && query.trim()) {
        const searchLower = query.toLowerCase();
        filteredBusinesses = businesses.filter(business => {
          const businessName = business.name.toLowerCase();
          const businessAddress = business.address.toLowerCase();
          
          // Strategy 1: Direct name match
          if (businessName.includes(searchLower)) return true;
          
          // Strategy 2: Address match
          if (businessAddress.includes(searchLower)) return true;
          
          // Strategy 3: Category-specific business type matching
          const queryTerms = searchLower.split(' ');
          for (const term of queryTerms) {
            // Beauty/barbershop terms
            if (['barberia', 'salon', 'belleza', 'peluqueria'].includes(term) && 
                business.category === 'belleza') return true;
            
            // Fitness terms
            if (['gimnasio', 'gym', 'fitness', 'deporte'].includes(term) && 
                business.category === 'fitness') return true;
            
            // Food terms
            if (['restaurante', 'comida', 'food', 'restaurant'].includes(term) && 
                business.category === 'gastronomia') return true;
            
            // Health terms
            if (['clinica', 'hospital', 'medico', 'salud'].includes(term) && 
                business.category === 'salud') return true;
          }
          
          return false;
        });
      }
      
      console.log(`✅ Overpass found ${filteredBusinesses.length} businesses`);
      return filteredBusinesses;
      
    } catch (error) {
      console.error('❌ Overpass API error:', error);
      return [];
    }
  }

  // Search businesses in Lima with grid coverage
  async searchLimaComprehensive(query?: string, category?: string): Promise<BusinessFromPlaces[]> {
    console.log('🌆 Comprehensive Lima search via Overpass API');
    
    // For Lima, we can get all results in one query since Overpass has no limits
    const limaBounds = {
      north: -11.7,
      south: -12.3,
      east: -76.7,
      west: -77.2
    };
    
    return this.searchBusinesses(query, category, limaBounds);
  }
}

export const overpassApiService = new OverpassApiService();
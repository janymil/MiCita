
import { BusinessFromPlaces } from './google-places-service.js';

interface FoursquarePhoto {
  id: string;
  prefix: string;
  suffix: string;
  width: number;
  height: number;
}

interface FoursquareCategory {
  id: number;
  name: string;
  icon: {
    prefix: string;
    suffix: string;
  };
}

interface FoursquareLocation {
  address?: string;
  formatted_address: string;
  locality?: string;
  postcode?: string;
  country: string;
}

interface FoursquareHours {
  display: string;
  is_local_holiday: boolean;
  open_now: boolean;
}

interface FoursquareVenue {
  fsq_id: string;
  name: string;
  location: FoursquareLocation;
  categories: FoursquareCategory[];
  distance?: number;
  tel?: string;
  website?: string;
  hours?: FoursquareHours;
  rating?: number;
  price?: number;
  photos?: FoursquarePhoto[];
  popularity?: number;
  verified?: boolean;
  geocodes: {
    main: {
      latitude: number;
      longitude: number;
    };
  };
}

interface FoursquareSearchResponse {
  results: FoursquareVenue[];
}

export class FoursquareApiService {
  private apiKey: string;
  private baseUrl = 'https://api.foursquare.com/v3/places';
  
  // Category mappings to Foursquare category IDs (v3 format)
  private categoryToFoursquare: { [key: string]: number[] } = {
    'gastronomia': [13065, 13032, 13003], // Restaurant, Cafe, Bar
    'belleza': [11134, 11133], // Beauty Salon, Hair Salon
    'salud': [15014, 15011, 15018], // Hospital, Doctor, Pharmacy
    'fitness': [18021, 18022], // Gym, Sports Center
    'educacion': [12013, 12014], // School, University
    'servicios': [11123, 11126], // Professional Services, Office
    'automotriz': [19005, 19006], // Auto Repair, Car Dealer
    'hogar': [17086, 17057], // Furniture Store, Hardware Store
    'tecnologia': [17058, 17141], // Electronics Store, Computer Store
    'consultoria': [11128, 12078] // Law Office, Accountant
  };

  constructor() {
    this.apiKey = process.env.FOURSQUARE_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('⚠️ Foursquare API key not configured - using OSM data only');
    } else {
      console.log(`🔑 Foursquare API key configured: ${this.apiKey.substring(0, 10)}...`);
    }
  }

  // Build category filter string
  private getCategoryFilter(category?: string): string {
    if (!category || !this.categoryToFoursquare[category]) {
      return '';
    }
    return this.categoryToFoursquare[category].join(',');
  }

  // Format photo URL
  private getPhotoUrl(photo: FoursquarePhoto): string {
    return `${photo.prefix}300x200${photo.suffix}`;
  }

  // Map Foursquare categories to our categories
  private mapToOurCategory(categories: FoursquareCategory[]): string {
    if (!categories || categories.length === 0) return 'servicios';
    
    const categoryId = categories[0].id;
    
    // Check each category mapping
    for (const [ourCategory, fsqIds] of Object.entries(this.categoryToFoursquare)) {
      if (fsqIds.includes(categoryId)) {
        return ourCategory;
      }
    }
    
    return 'servicios';
  }

  // Convert Foursquare v3 venue to our business format
  private convertToBusiness(venue: FoursquareVenue): BusinessFromPlaces {
    return {
      id: `fsq_${venue.fsq_id}`,
      name: venue.name,
      address: venue.location?.formatted_address || 'Lima, Peru',
      category: this.mapToOurCategory(venue.categories),
      rating: venue.rating || 0,
      reviewCount: 0, // v3 API doesn't include review count in basic search
      priceLevel: venue.price || 0,
      phone: venue.tel,
      website: venue.website,
      photoUrl: venue.photos?.[0] ? this.getPhotoUrl(venue.photos[0]) : '',
      location: {
        lat: venue.geocodes?.main?.latitude || 0,
        lng: venue.geocodes?.main?.longitude || 0
      },
      openNow: venue.hours?.open_now,
      hours: venue.hours?.display ? [venue.hours.display] : undefined,
      isRegistered: false
    };
  }

  // Search businesses using Foursquare Places API v3
  async searchBusinesses(
    query?: string,
    category?: string,
    location: string = 'Lima, Peru',
    limit: number = 50
  ): Promise<BusinessFromPlaces[]> {
    if (!this.apiKey) {
      console.log('⚠️ Foursquare API not configured');
      return [];
    }

    try {
      console.log('🔍 Foursquare API search:', { query, category, location });
      
      // Build search parameters
      const params = new URLSearchParams({
        limit: Math.min(limit, 50).toString() // Foursquare v3 has max 50 limit
      });
      
      // Add location - convert to lat,lng if needed
      if (location.includes(',')) {
        // Already in lat,lng format
        params.append('ll', location);
      } else {
        // Default to Lima center coordinates
        params.append('ll', '-12.05,-77.05');
      }
      
      // Add query parameter
      if (query) {
        params.append('query', query);
      }
      
      // Add category filter if specified
      const categoryFilter = this.getCategoryFilter(category);
      if (categoryFilter) {
        params.append('categories', categoryFilter);
      }
      
      // Add search radius (in meters)
      params.append('radius', '10000'); // 10km radius
      
      // Add fields to include additional data
      params.append('fields', 'name,location,categories,tel,website,hours,rating,price,photos,geocodes');
      
      const url = `${this.baseUrl}/search?${params}`;
      
      console.log('🌐 Foursquare API URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': this.apiKey
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Foursquare API error: ${response.status} - ${errorText}`);
        throw new Error(`Foursquare API error: ${response.status}`);
      }
      
      const data: FoursquareSearchResponse = await response.json();
      console.log(`📍 Foursquare v3 returned ${data.results?.length || 0} venues`);
      
      if (!data.results || data.results.length === 0) {
        console.log('🔍 No results from Foursquare');
        return [];
      }
      
      // Convert venues to our business format
      const businesses = data.results.map((venue: FoursquareVenue) => this.convertToBusiness(venue));
      
      console.log(`✅ Foursquare found ${businesses.length} businesses`);
      return businesses;
      
    } catch (error) {
      console.error('❌ Foursquare API error:', error);
      return [];
    }
  }

  // Get detailed information about a business
  async getBusinessDetails(fsqId: string): Promise<any> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const url = `${this.baseUrl}/${fsqId}`;
      
      // Add fields parameter to get all available data
      const params = new URLSearchParams({
        fields: 'name,location,categories,tel,website,hours,rating,price,photos,geocodes,hours_popular,stats,verified'
      });
      
      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': this.apiKey
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Foursquare Details API error: ${response.status} - ${errorText}`);
        throw new Error(`Foursquare API error: ${response.status}`);
      }
      
      const venue = await response.json();
      
      // Return detailed venue data with proper coordinates
      return {
        ...venue,
        location: {
          ...venue.location,
          lat: venue.geocodes?.main?.latitude || 0,
          lng: venue.geocodes?.main?.longitude || 0
        }
      };
      
    } catch (error) {
      console.error('❌ Foursquare Details API error:', error);
      return null;
    }
  }

  // Enrich businesses with Foursquare data
  async enrichBusinesses(businesses: BusinessFromPlaces[]): Promise<BusinessFromPlaces[]> {
    if (!this.apiKey) {
      console.log('⚠️ Foursquare API key not configured - returning pure OpenStreetMap data');
      return businesses;
    }

    console.log(`🔄 Attempting Foursquare enrichment for ${Math.min(businesses.length, 10)} businesses`);
    
    // Limit enrichment to avoid rate limits and improve performance
    const businessesToEnrich = businesses.slice(0, 5);
    
    // Process in smaller batches
    const batchSize = 3;
    const enrichedBusinesses: BusinessFromPlaces[] = [];
    
    for (let i = 0; i < businessesToEnrich.length; i += batchSize) {
      const batch = businessesToEnrich.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (business) => {
        try {
          // Search near the business location with a small radius
          const searchResults = await this.searchBusinesses(
            business.name,
            business.category,
            `${business.location.lat},${business.location.lng}`,
            5
          );
          
          // Find the best match by name similarity
          let bestMatch = null;
          let bestScore = 0;
          
          for (const result of searchResults) {
            const score = this.calculateNameSimilarity(business.name, result.name);
            if (score > bestScore && score > 0.6) { // Minimum 60% similarity
              bestMatch = result;
              bestScore = score;
            }
          }
          
          if (bestMatch) {
            // Merge Foursquare data with existing business
            return {
              ...business,
              rating: bestMatch.rating || business.rating,
              phone: bestMatch.phone || business.phone,
              website: bestMatch.website || business.website,
              photoUrl: bestMatch.photoUrl || business.photoUrl,
              openNow: bestMatch.openNow !== undefined ? bestMatch.openNow : business.openNow,
              hours: bestMatch.hours || business.hours,
              // Keep original coordinates and ID from Overpass
              location: business.location,
              id: business.id
            };
          }
        } catch (error) {
          console.error(`Failed to enrich business ${business.name}:`, error);
        }
        
        return business;
      });
      
      const batchResults = await Promise.all(batchPromises);
      enrichedBusinesses.push(...batchResults);
      
      // Small delay between batches to be respectful to the API
      if (i + batchSize < businessesToEnrich.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Return enriched businesses plus the rest unenriched
    return [
      ...enrichedBusinesses,
      ...businesses.slice(businessesToEnrich.length)
    ];
  }
  
  // Calculate name similarity for matching
  private calculateNameSimilarity(name1: string, name2: string): number {
    const clean1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const clean2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (clean1 === clean2) return 1;
    if (clean1.includes(clean2) || clean2.includes(clean1)) return 0.8;
    
    // Simple Levenshtein distance
    const len1 = clean1.length;
    const len2 = clean2.length;
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
    
    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const indicator = clean1[i - 1] === clean2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    const distance = matrix[len2][len1];
    return 1 - distance / Math.max(len1, len2);
  }
}

export const foursquareApiService = new FoursquareApiService();

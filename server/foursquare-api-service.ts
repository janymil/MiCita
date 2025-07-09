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
}

interface FoursquareSearchResponse {
  results: FoursquareVenue[];
}

export class FoursquareApiService {
  private apiKey: string;
  private clientId: string;
  private clientSecret: string;
  private baseUrl = 'https://api.foursquare.com/v2/venues';
  
  // Category mappings to Foursquare category IDs
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
    // Split the 48-char key into client_id (first 24) and client_secret (last 24)
    this.clientId = this.apiKey.substring(0, 24);
    this.clientSecret = this.apiKey.substring(24);
    
    if (!this.apiKey || this.apiKey.length !== 48) {
      console.warn('⚠️ Foursquare API key not configured correctly - using OSM data only');
    } else {
      console.log(`🔑 Foursquare v2 API configured: client_id=${this.clientId.substring(0, 8)}... client_secret=${this.clientSecret.substring(0, 8)}...`);
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

  // Convert Foursquare v2 venue to our business format
  private convertV2ToBusiness(venue: any): BusinessFromPlaces {
    return {
      id: `fsq_${venue.id}`,
      name: venue.name,
      address: venue.location?.formattedAddress?.join(', ') || 'Lima, Peru',
      category: this.mapV2ToOurCategory(venue.categories),
      rating: venue.rating || 0,
      reviewCount: venue.ratingSignals || 0,
      priceLevel: venue.price?.tier || 0,
      phone: venue.contact?.phone,
      website: venue.url,
      photoUrl: venue.photos?.groups?.[0]?.items?.[0] ? 
        `${venue.photos.groups[0].items[0].prefix}300x200${venue.photos.groups[0].items[0].suffix}` : '',
      location: {
        lat: venue.location?.lat || 0,
        lng: venue.location?.lng || 0
      },
      openNow: venue.hours?.status === 'Open',
      hours: venue.hours?.timeframes?.map((tf: any) => tf.open?.map((o: any) => `${tf.days}: ${o.start}-${o.end}`)).flat(),
      isRegistered: false
    };
  }

  // Map v2 categories to our categories
  private mapV2ToOurCategory(categories: any[]): string {
    if (!categories || categories.length === 0) return 'servicios';
    
    const categoryName = categories[0].name?.toLowerCase() || '';
    
    if (categoryName.includes('restaurant') || categoryName.includes('food')) return 'gastronomia';
    if (categoryName.includes('salon') || categoryName.includes('beauty') || categoryName.includes('barber')) return 'belleza';
    if (categoryName.includes('gym') || categoryName.includes('fitness')) return 'fitness';
    if (categoryName.includes('health') || categoryName.includes('medical')) return 'salud';
    
    return 'servicios';
  }

  // Search businesses using Foursquare API
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
      
      // Try the full API key as oauth_token (common format)
      const params = new URLSearchParams({
        oauth_token: this.apiKey,
        v: '20250109', // API version (today's date)
        limit: limit.toString()
      });
      
      // Add location - use ll (latitude,longitude) format for v2 API
      if (location.includes(',')) {
        params.append('ll', location);
      } else {
        params.append('ll', '-12.05,-77.05'); // Lima center coordinates
      }
      
      // Add query
      if (query) {
        params.append('query', query);
      }
      
      // For v2 API, use intent instead of categories for better results
      params.append('intent', 'browse');
      
      const url = `${this.baseUrl}/search?${params}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Foursquare API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`📍 Foursquare v2 returned ${data.response?.venues?.length || 0} venues`);
      
      // v2 API has different response structure
      const venues = data.response?.venues || [];
      const businesses = venues.map((venue: any) => this.convertV2ToBusiness(venue));
      
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
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': this.apiKey
        }
      });
      
      if (!response.ok) {
        throw new Error(`Foursquare API error: ${response.status}`);
      }
      
      const venue = await response.json();
      
      // Return detailed venue data including coordinates
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

    console.log(`🔄 Attempting Foursquare enrichment for ${Math.min(businesses.length, 20)} businesses`);
    
    // Limit enrichment to avoid rate limits and improve performance
    const businessesToEnrich = businesses.slice(0, 20);
    
    // Process in smaller batches to avoid overwhelming the API
    const batchSize = 5;
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
            3
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
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Return enriched businesses plus the rest unenriched
    return [
      ...enrichedBusinesses,
      ...businesses.slice(20)
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
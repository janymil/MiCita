import crypto from 'crypto';
import { DBStorage } from './db-storage.js';
import { GooglePlacesService, BusinessFromPlaces } from './google-places-service.js';
import { InsertCachedGoogleBusiness, InsertSearchCache, CachedGoogleBusiness } from '../shared/schema.js';

export class GooglePlacesCacheService {
  private storage: DBStorage;
  private googlePlacesService: GooglePlacesService;
  private cacheExpirationHours: number = 24;

  constructor(storage: DBStorage, googlePlacesService: GooglePlacesService) {
    this.storage = storage;
    this.googlePlacesService = googlePlacesService;
  }

  // Generate query hash for caching
  private generateQueryHash(query: string, category?: string, location?: string): string {
    const searchKey = `${query.toLowerCase()}_${category || 'all'}_${location || 'Lima, Peru'}`;
    return crypto.createHash('md5').update(searchKey).digest('hex');
  }

  // Convert Google Places business to cache format
  private convertBusinessToCache(business: BusinessFromPlaces): InsertCachedGoogleBusiness {
    // Create search terms
    const searchTerms = [
      business.name.toLowerCase(),
      business.address.toLowerCase(),
      business.category
    ].join(' ');

    return {
      placeId: business.id,
      name: business.name,
      address: business.address,
      category: business.category,
      rating: business.rating.toString(),
      reviewCount: business.reviewCount,
      priceLevel: business.priceLevel,
      phone: business.phone || null,
      website: business.website || null,
      photoUrl: business.photoUrl || null,
      latitude: business.location.lat.toString(),
      longitude: business.location.lng.toString(),
      openNow: business.openNow || null,
      hours: business.hours || null,
      searchTerms,
      isRegistered: business.isRegistered,
    };
  }

  // Convert cached business to BusinessFromPlaces format
  private convertCacheToBusinessFromPlaces(cached: CachedGoogleBusiness): BusinessFromPlaces {
    return {
      id: cached.placeId,
      name: cached.name,
      address: cached.address,
      category: cached.category,
      rating: parseFloat(cached.rating || '0'),
      reviewCount: cached.reviewCount || 0,
      priceLevel: cached.priceLevel || 0,
      phone: cached.phone || undefined,
      website: cached.website || undefined,
      photoUrl: cached.photoUrl || undefined,
      location: {
        lat: parseFloat(cached.latitude),
        lng: parseFloat(cached.longitude),
      },
      openNow: cached.openNow || undefined,
      hours: cached.hours || undefined,
      isRegistered: cached.isRegistered || false,
    };
  }

  // Main search method with caching
  async searchBusinesses(query: string, category?: string, location = 'Lima, Peru'): Promise<BusinessFromPlaces[]> {
    const queryHash = this.generateQueryHash(query, category, location);
    
    console.log(`🔍 Searching with cache: "${query}" (category: ${category || 'all'})`);

    // Step 1: Check cached search results
    try {
      const cachedSearch = await this.storage.getSearchCache(queryHash);
      if (cachedSearch && new Date(cachedSearch.expiresAt) > new Date()) {
        console.log('✅ Found cached search results');
        const cachedBusinesses = await this.storage.getCachedGoogleBusinessesByIds(cachedSearch.businessIds || []);
        return cachedBusinesses.map(cached => this.convertCacheToBusinessFromPlaces(cached));
      }
    } catch (error) {
      console.error('❌ Error checking cached search:', error);
    }

    // Step 2: Search in cached businesses
    try {
      const cachedResults = await this.storage.searchCachedGoogleBusinesses(query, category);
      console.log(`📁 Found ${cachedResults.length} cached businesses`);
      
      if (cachedResults.length >= 20) {
        console.log('✅ Using cached results (sufficient data)');
        return cachedResults.map(cached => this.convertCacheToBusinessFromPlaces(cached));
      }
    } catch (error) {
      console.error('❌ Error searching cached businesses:', error);
    }

    // Step 3: Fetch from Google API
    console.log('🌐 Fetching fresh results from Google Places API');
    const freshResults = await this.googlePlacesService.searchBusinesses(query, category, location);
    
    if (freshResults.length === 0) {
      console.log('❌ No results from Google API');
      return [];
    }

    // Step 4: Cache the results (non-blocking)
    this.cacheResultsAsync(freshResults, queryHash, query, category, location);

    return freshResults;
  }

  // Cache results asynchronously (non-blocking)
  private async cacheResultsAsync(results: BusinessFromPlaces[], queryHash: string, query: string, category?: string, location?: string) {
    try {
      console.log(`💾 Caching ${results.length} fresh businesses`);
      
      // Cache individual businesses
      for (const business of results) {
        try {
          const cacheData = this.convertBusinessToCache(business);
          await this.storage.cacheBusiness(cacheData);
        } catch (error) {
          console.error(`❌ Error caching business ${business.name}:`, error);
        }
      }

      // Cache search pattern
      try {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + this.cacheExpirationHours);
        
        await this.storage.saveSearchCache({
          queryHash,
          originalQuery: query,
          category: category || null,
          location: location || 'Lima, Peru',
          businessIds: results.map(b => b.id),
          totalResults: results.length,
          googleApiCalls: Math.ceil(results.length / 20),
          expiresAt: expiresAt,
        });

        console.log(`✅ Cached search results for future use`);
      } catch (error) {
        console.error('❌ Error saving search cache:', error);
      }
    } catch (error) {
      console.error('❌ Error in caching process:', error);
    }
  }

  // Clean expired cache
  async cleanExpiredCache(): Promise<void> {
    try {
      console.log('🧹 Cleaning expired cache...');
      await this.storage.cleanExpiredCache();
    } catch (error) {
      console.error('❌ Error cleaning cache:', error);
    }
  }
}
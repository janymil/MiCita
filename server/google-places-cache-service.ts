import crypto from 'crypto';
import { DBStorage } from './db-storage.js';
import { GooglePlacesService, BusinessFromPlaces } from './google-places-service.js';
import { InsertCachedGoogleBusiness, InsertSearchCache, CachedGoogleBusiness } from '../shared/schema.js';

export class GooglePlacesCacheService {
  private storage: DBStorage;
  private googlePlacesService: GooglePlacesService;
  private cacheExpirationHours: number = 24; // Cache expires after 24 hours

  constructor(storage: DBStorage, googlePlacesService: GooglePlacesService) {
    this.storage = storage;
    this.googlePlacesService = googlePlacesService;
  }

  // Generate a consistent hash for search queries
  private generateQueryHash(query: string, category?: string, location?: string): string {
    const searchKey = `${query.toLowerCase()}_${category || 'all'}_${location || 'Lima, Peru'}`;
    return crypto.createHash('md5').update(searchKey).digest('hex');
  }

  // Convert Google Places business to cache format
  private businessToCache = (business: BusinessFromPlaces): InsertCachedGoogleBusiness => {
    // Create search terms for full-text search
    const searchTerms = [
      business.name.toLowerCase(),
      business.address.toLowerCase(),
      business.category,
      // Extract key words from address
      ...business.address.toLowerCase().split(/[,\s]+/).filter(word => word.length > 2),
      // Add category synonyms
      ...this.getCategorySynonyms(business.category)
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
  };

  // Convert cached business to BusinessFromPlaces format
  private cacheToBusinessFromPlaces(cached: CachedGoogleBusiness): BusinessFromPlaces {
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

  // Get category synonyms for better search
  private getCategorySynonyms(category: string): string[] {
    const synonyms: { [key: string]: string[] } = {
      'belleza': ['salon', 'peluqueria', 'barberia', 'spa', 'estetica'],
      'salud': ['hospital', 'clinica', 'doctor', 'medico', 'dentista', 'farmacia'],
      'fitness': ['gimnasio', 'gym', 'yoga', 'pilates', 'entrenamiento'],
      'educacion': ['escuela', 'colegio', 'universidad', 'instituto', 'academia'],
      'gastronomia': ['restaurant', 'comida', 'cafe', 'bar', 'panaderia'],
      'automotriz': ['taller', 'mecanico', 'lavado', 'repuestos'],
      'consultoria': ['abogado', 'contador', 'consultor', 'asesoria'],
      'servicios': ['servicio', 'reparacion', 'mantenimiento']
    };

    return synonyms[category] || [];
  }

  // Main search method with caching
  async searchBusinesses(query: string, category?: string, location = 'Lima, Peru'): Promise<BusinessFromPlaces[]> {
    const queryHash = this.generateQueryHash(query, category, location);
    
    console.log(`🔍 Searching with cache: "${query}" (category: ${category || 'all'})`);

    // Step 1: Check if exact search was cached recently
    const cachedSearch = await this.storage.getSearchCache(queryHash);
    if (cachedSearch && new Date(cachedSearch.expiresAt) > new Date()) {
      console.log('✅ Found cached search results');
      const cachedBusinesses = await this.storage.getCachedGoogleBusinessesByIds(cachedSearch.businessIds || []);
      return cachedBusinesses.map(this.cacheToBusinessFromPlaces);
    }

    // Step 2: Search in cached businesses first
    const cachedResults = await this.storage.searchCachedGoogleBusinesses(query, category);
    console.log(`📁 Found ${cachedResults.length} cached businesses`);

    // Step 3: If we have enough cached results, return them
    if (cachedResults.length >= 20) {
      console.log('✅ Using cached results (sufficient data)');
      return cachedResults.map(this.cacheToBusinessFromPlaces);
    }

    // Step 4: Not enough cached results, fetch from Google API
    console.log('🌐 Fetching fresh results from Google Places API');
    const freshResults = await this.googlePlacesService.searchBusinesses(query, category, location);
    
    if (freshResults.length === 0) {
      console.log('❌ No results from Google API');
      return cachedResults.map(this.cacheToBusinessFromPlaces);
    }

    // Step 5: Cache the fresh results
    console.log(`💾 Caching ${freshResults.length} fresh businesses`);
    try {
      const businessesToCache = freshResults.map(business => this.businessToCache(business));
      await this.storage.cacheBusinesses(businessesToCache);
    } catch (error) {
      console.error('❌ Error caching businesses:', error);
      // Return results anyway, caching is optional
    }

    // Step 6: Save search pattern
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.cacheExpirationHours);
      
      await this.storage.saveSearchCache({
        queryHash,
        originalQuery: query,
        category: category || null,
        location,
        businessIds: freshResults.map(b => b.id),
        totalResults: freshResults.length,
        googleApiCalls: Math.ceil(freshResults.length / 20), // Estimate API calls
        expiresAt: expiresAt,
      });

      console.log(`✅ Cached search results for future use`);
    } catch (error) {
      console.error('❌ Error saving search cache:', error);
      // Continue anyway, caching is optional
    }
    
    return freshResults;
  }

  // Clean expired cache (call this periodically)
  async cleanExpiredCache(): Promise<void> {
    console.log('🧹 Cleaning expired cache...');
    await this.storage.cleanExpiredCache();
  }

  // Get cache statistics
  async getCacheStats(): Promise<{
    totalCachedBusinesses: number;
    totalCachedSearches: number;
    oldestCacheDate: Date | null;
    newestCacheDate: Date | null;
  }> {
    // This would need specific queries to get stats
    return {
      totalCachedBusinesses: 0,
      totalCachedSearches: 0,
      oldestCacheDate: null,
      newestCacheDate: null,
    };
  }
}
/**
 * 🔍 UNIFIED SEARCH INTEGRATION
 * 
 * Integrates OpenStreetMap businesses into the main search system
 * Provides Google Places-like functionality with location-rich data
 */

import { db } from './server/db.js';
import { apifyBusinesses, openstreetBusinesses } from './shared/schema.js';
import { sql, eq, and, or, ilike, desc, asc } from 'drizzle-orm';

class UnifiedSearchSystem {
  constructor() {
    this.searchCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Combined search across Apify and OpenStreetMap data
   */
  async searchAllBusinesses(params) {
    const {
      query = '',
      category = 'all',
      subcategory,
      city = 'Lima',
      district = 'all',
      minRating = 0,
      filters = {},
      sort = 'relevance',
      page = 1,
      limit = 12,
      mapBounds = null
    } = params;

    console.log('🔍 Unified search request:', {
      query, category, subcategory, city, district, minRating, filters, sort, page, mapBounds
    });

    const cacheKey = JSON.stringify(params);
    const cached = this.searchCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('📋 Using cached results');
      return cached.data;
    }

    try {
      // Search Apify businesses (existing system)
      const apifyResults = await this.searchApifyBusinesses(params);
      
      // Search OpenStreetMap businesses (new)
      const osmResults = await this.searchOpenStreetBusinesses(params);
      
      // Combine and rank results
      const combinedResults = this.combineAndRankResults(apifyResults, osmResults, params);
      
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const paginatedResults = combinedResults.slice(startIndex, startIndex + limit);
      
      const result = {
        results: paginatedResults,
        totalResults: combinedResults.length,
        currentPage: page,
        totalPages: Math.ceil(combinedResults.length / limit),
        hasNextPage: page < Math.ceil(combinedResults.length / limit),
        hasPrevPage: page > 1,
        apifyCount: apifyResults.length,
        osmCount: osmResults.length,
        combinedCount: combinedResults.length
      };

      // Cache results
      this.searchCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('❌ Unified search error:', error);
      throw error;
    }
  }

  /**
   * Search Apify businesses (existing data)
   */
  async searchApifyBusinesses(params) {
    const { query, category, district, minRating, filters, mapBounds } = params;
    
    let apifyQuery = db.select().from(apifyBusinesses);
    const conditions = [];

    // Text search
    if (query) {
      conditions.push(
        or(
          ilike(apifyBusinesses.name, `%${query}%`),
          ilike(apifyBusinesses.searchTerms, `%${query}%`),
          ilike(apifyBusinesses.address, `%${query}%`)
        )
      );
    }

    // Category filter
    if (category && category !== 'all') {
      conditions.push(eq(apifyBusinesses.category, category));
    }

    // District filter
    if (district && district !== 'all') {
      conditions.push(eq(apifyBusinesses.district, district));
    }

    // Rating filter
    if (minRating > 0) {
      conditions.push(sql`${apifyBusinesses.rating} >= ${minRating}`);
    }

    // Contact filters
    if (filters?.hasPhone === 'true') {
      conditions.push(sql`${apifyBusinesses.phone} IS NOT NULL AND ${apifyBusinesses.phone} != ''`);
    }
    if (filters?.hasWebsite === 'true') {
      conditions.push(sql`${apifyBusinesses.website} IS NOT NULL AND ${apifyBusinesses.website} != ''`);
    }
    if (filters?.hasEmail === 'true') {
      conditions.push(sql`${apifyBusinesses.email} IS NOT NULL AND ${apifyBusinesses.email} != ''`);
    }

    // Map bounds filter
    if (mapBounds) {
      const { north, south, east, west } = mapBounds;
      conditions.push(
        and(
          sql`${apifyBusinesses.latitude} >= ${south}`,
          sql`${apifyBusinesses.latitude} <= ${north}`,
          sql`${apifyBusinesses.longitude} >= ${west}`,
          sql`${apifyBusinesses.longitude} <= ${east}`
        )
      );
    }

    if (conditions.length > 0) {
      apifyQuery = apifyQuery.where(and(...conditions));
    }

    const results = await apifyQuery.execute();
    
    return results.map(business => ({
      ...business,
      source: 'apify',
      businessType: 'apify'
    }));
  }

  /**
   * Search OpenStreetMap businesses (new location-rich data)
   */
  async searchOpenStreetBusinesses(params) {
    const { query, category, district, filters, mapBounds } = params;
    
    let osmQuery = db.select().from(openstreetBusinesses);
    const conditions = [];

    // Text search
    if (query) {
      conditions.push(
        or(
          ilike(openstreetBusinesses.name, `%${query}%`),
          ilike(openstreetBusinesses.address, `%${query}%`),
          ilike(openstreetBusinesses.amenity, `%${query}%`),
          ilike(openstreetBusinesses.shop, `%${query}%`)
        )
      );
    }

    // Category filter (map OSM categories to our categories)
    if (category && category !== 'all') {
      conditions.push(eq(openstreetBusinesses.category, category));
    }

    // District filter
    if (district && district !== 'all') {
      conditions.push(eq(openstreetBusinesses.district, district));
    }

    // Contact filters
    if (filters?.hasPhone === 'true') {
      conditions.push(sql`${openstreetBusinesses.phone} IS NOT NULL AND ${openstreetBusinesses.phone} != ''`);
    }
    if (filters?.hasWebsite === 'true') {
      conditions.push(sql`${openstreetBusinesses.website} IS NOT NULL AND ${openstreetBusinesses.website} != ''`);
    }
    if (filters?.hasEmail === 'true') {
      conditions.push(sql`${openstreetBusinesses.email} IS NOT NULL AND ${openstreetBusinesses.email} != ''`);
    }

    // Map bounds filter
    if (mapBounds) {
      const { north, south, east, west } = mapBounds;
      conditions.push(
        and(
          sql`${openstreetBusinesses.latitude} >= ${south}`,
          sql`${openstreetBusinesses.latitude} <= ${north}`,
          sql`${openstreetBusinesses.longitude} >= ${west}`,
          sql`${openstreetBusinesses.longitude} <= ${east}`
        )
      );
    }

    if (conditions.length > 0) {
      osmQuery = osmQuery.where(and(...conditions));
    }

    const results = await osmQuery.execute();
    
    return results.map(business => ({
      id: `osm_${business.id}`,
      name: business.name,
      address: business.address,
      phone: business.phone,
      website: business.website,
      email: business.email,
      latitude: business.latitude,
      longitude: business.longitude,
      category: business.category,
      subcategory: business.subcategory,
      amenity: business.amenity,
      shop: business.shop,
      openingHours: business.openingHours,
      operator: business.operator,
      brand: business.brand,
      district: business.district,
      city: business.city,
      tags: business.tags,
      source: 'openstreetmap',
      businessType: 'openstreetmap',
      // Default values for Apify-specific fields
      rating: null,
      reviewCount: null,
      priceLevel: null,
      imageUrl: null
    }));
  }

  /**
   * Combine and rank results from both sources
   */
  combineAndRankResults(apifyResults, osmResults, params) {
    const { query, sort } = params;
    
    // Combine all results
    const allResults = [...apifyResults, ...osmResults];
    
    // Remove duplicates (same name + similar location)
    const uniqueResults = this.removeDuplicates(allResults);
    
    // Calculate relevance scores
    const scoredResults = uniqueResults.map(business => ({
      ...business,
      relevanceScore: this.calculateRelevanceScore(business, query, params)
    }));

    // Sort results
    switch (sort) {
      case 'rating':
        return scoredResults.sort((a, b) => {
          // Apify businesses with ratings first
          if (a.rating && !b.rating) return -1;
          if (!a.rating && b.rating) return 1;
          if (a.rating && b.rating) return b.rating - a.rating;
          return b.relevanceScore - a.relevanceScore;
        });
      
      case 'name':
        return scoredResults.sort((a, b) => a.name.localeCompare(b.name));
      
      case 'distance':
        // Would need user location for proper distance sorting
        return scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      default: // relevance
        return scoredResults.sort((a, b) => {
          // Prioritize businesses with contact information
          const aContactScore = this.getContactScore(a);
          const bContactScore = this.getContactScore(b);
          
          if (aContactScore !== bContactScore) {
            return bContactScore - aContactScore;
          }
          
          return b.relevanceScore - a.relevanceScore;
        });
    }
  }

  /**
   * Remove duplicate businesses
   */
  removeDuplicates(businesses) {
    const seen = new Map();
    const unique = [];

    for (const business of businesses) {
      const key = `${business.name.toLowerCase()}_${business.district || 'unknown'}`;
      
      if (!seen.has(key)) {
        seen.set(key, business);
        unique.push(business);
      } else {
        // Keep the one with more contact information
        const existing = seen.get(key);
        const existingContactScore = this.getContactScore(existing);
        const currentContactScore = this.getContactScore(business);
        
        if (currentContactScore > existingContactScore) {
          // Replace with better business
          const index = unique.findIndex(b => b === existing);
          if (index !== -1) {
            unique[index] = business;
            seen.set(key, business);
          }
        }
      }
    }

    return unique;
  }

  /**
   * Calculate relevance score
   */
  calculateRelevanceScore(business, query, params) {
    let score = 0;
    
    if (!query) return 1; // Default score for no query
    
    const searchTerm = query.toLowerCase();
    const businessName = business.name?.toLowerCase() || '';
    const businessAddress = business.address?.toLowerCase() || '';
    
    // Name match scoring
    if (businessName.includes(searchTerm)) {
      score += businessName.startsWith(searchTerm) ? 10 : 5;
    }
    
    // Address match scoring
    if (businessAddress.includes(searchTerm)) {
      score += 2;
    }
    
    // Category match scoring
    if (business.category?.toLowerCase().includes(searchTerm)) {
      score += 3;
    }
    
    // Contact information bonus
    score += this.getContactScore(business);
    
    return score;
  }

  /**
   * Get contact information score
   */
  getContactScore(business) {
    let score = 0;
    
    if (business.phone) score += 2;
    if (business.website) score += 2;
    if (business.email) score += 1;
    if (business.openingHours) score += 1;
    if (business.rating) score += 2;
    if (business.latitude && business.longitude) score += 1;
    
    return score;
  }

  /**
   * Get combined business statistics
   */
  async getBusinessStatistics() {
    try {
      const [apifyStats] = await db.select({
        total: sql`count(*)`,
        withPhone: sql`count(case when phone is not null and phone != '' then 1 end)`,
        withWebsite: sql`count(case when website is not null and website != '' then 1 end)`,
        withEmail: sql`count(case when email is not null and email != '' then 1 end)`
      }).from(apifyBusinesses);

      const [osmStats] = await db.select({
        total: sql`count(*)`,
        withPhone: sql`count(case when phone is not null and phone != '' then 1 end)`,
        withWebsite: sql`count(case when website is not null and website != '' then 1 end)`,
        withEmail: sql`count(case when email is not null and email != '' then 1 end)`,
        withHours: sql`count(case when opening_hours is not null and opening_hours != '' then 1 end)`,
        withCoordinates: sql`count(case when latitude is not null and longitude is not null then 1 end)`
      }).from(openstreetBusinesses);

      return {
        apify: {
          total: parseInt(apifyStats.total),
          withPhone: parseInt(apifyStats.withPhone),
          withWebsite: parseInt(apifyStats.withWebsite),
          withEmail: parseInt(apifyStats.withEmail)
        },
        openstreetmap: {
          total: parseInt(osmStats.total),
          withPhone: parseInt(osmStats.withPhone),
          withWebsite: parseInt(osmStats.withWebsite),
          withEmail: parseInt(osmStats.withEmail),
          withHours: parseInt(osmStats.withHours),
          withCoordinates: parseInt(osmStats.withCoordinates)
        },
        combined: {
          total: parseInt(apifyStats.total) + parseInt(osmStats.total),
          withContact: parseInt(apifyStats.withPhone) + parseInt(apifyStats.withWebsite) + 
                      parseInt(osmStats.withPhone) + parseInt(osmStats.withWebsite)
        }
      };

    } catch (error) {
      console.error('❌ Error getting business statistics:', error);
      return null;
    }
  }
}

// Export unified search system
export const unifiedSearchSystem = new UnifiedSearchSystem();

// Test search if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  unifiedSearchSystem.searchAllBusinesses({
    query: 'restaurant',
    category: 'gastronomia',
    city: 'Lima',
    limit: 10
  }).then(results => {
    console.log('\n🔍 UNIFIED SEARCH TEST RESULTS:');
    console.log(`📊 Total Results: ${results.totalResults}`);
    console.log(`📊 Apify: ${results.apifyCount}, OSM: ${results.osmCount}`);
    console.log(`📊 Combined: ${results.combinedCount}`);
    
    console.log('\n🏢 Sample Results:');
    results.results.slice(0, 5).forEach((business, index) => {
      console.log(`${index + 1}. ${business.name} (${business.source})`);
      console.log(`   📍 ${business.address}`);
      console.log(`   📞 ${business.phone || 'No phone'}`);
      console.log(`   🌐 ${business.website || 'No website'}`);
      console.log(`   ⭐ ${business.rating || 'No rating'}`);
      console.log('');
    });
    
    process.exit(0);
  }).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}
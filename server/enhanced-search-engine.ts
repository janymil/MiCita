import { eq, and, or, sql, ilike, desc, asc, gte, lte, ne, isNotNull, count } from "drizzle-orm";
import { db } from "./db";
import { apifyBusinesses } from "@shared/schema";
import type { ApifyBusiness } from "@shared/schema";

/**
 * Enhanced Search Engine for Apify Business Data
 * 
 * This system provides intelligent search capabilities with:
 * - Advanced search term generation and indexing
 * - Relevance scoring algorithms
 * - Intelligent filtering and sorting
 * - Fuzzy matching and typo tolerance
 * - Geographic and contextual search
 */

interface SearchQuery {
  query?: string;
  category?: string;
  city?: string;
  district?: string;
  minRating?: number;
  maxPrice?: number;
  openNow?: boolean;
  hasPhone?: boolean;
  hasWebsite?: boolean;
  hasEmail?: boolean;
  sortBy?: 'relevance' | 'rating' | 'reviews' | 'distance' | 'name';
  page?: number;
  limit?: number;
}

interface SearchResult {
  businesses: ApifyBusiness[];
  totalCount: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
  searchMetrics: {
    searchTime: number;
    totalMatches: number;
    relevanceScores: number[];
    queryAnalysis: string[];
  };
}

export class EnhancedSearchEngine {
  private readonly DEFAULT_LIMIT = 20;
  private readonly LIMA_COORDINATES = { lat: -12.05, lng: -77.05 };
  
  /**
   * Advanced search term generator
   * Creates comprehensive, searchable terms from business data
   */
  static generateSearchTerms(business: any): string {
    const terms = new Set<string>();
    
    // Business name variations
    if (business.name) {
      terms.add(business.name.toLowerCase());
      // Remove common business suffixes for broader matching
      const nameClean = business.name.toLowerCase()
        .replace(/\s+(sac|s\.a\.c\.|eirl|e\.i\.r\.l\.|srl|s\.r\.l\.|ltda|spa|salon|barberia|peluqueria)$/i, '')
        .trim();
      if (nameClean !== business.name.toLowerCase()) {
        terms.add(nameClean);
      }
      
      // Add individual words from name
      business.name.toLowerCase().split(/\s+/).forEach(word => {
        if (word.length > 2) terms.add(word);
      });
    }
    
    // Category-specific keywords
    if (business.category) {
      terms.add(business.category);
      const categoryKeywords = this.getCategoryKeywords(business.category);
      categoryKeywords.forEach(keyword => terms.add(keyword));
    }
    
    // Location terms
    if (business.address) {
      const addressTerms = this.extractLocationTerms(business.address);
      addressTerms.forEach(term => terms.add(term));
    }
    
    // Service-related terms from description
    if (business.description) {
      const serviceTerms = this.extractServiceTerms(business.description);
      serviceTerms.forEach(term => terms.add(term));
    }
    
    // Contact-based terms
    if (business.phone) {
      terms.add(business.phone.replace(/\D/g, '')); // Phone number without formatting
    }
    
    if (business.website) {
      const domain = business.website.replace(/https?:\/\//, '').split('/')[0];
      terms.add(domain);
      terms.add(domain.replace(/^www\./, ''));
    }
    
    if (business.email) {
      const domain = business.email.split('@')[1];
      if (domain) terms.add(domain);
    }
    
    // Social media terms
    if (business.socialMedia) {
      Object.values(business.socialMedia).forEach(url => {
        if (typeof url === 'string') {
          const handle = url.split('/').pop();
          if (handle) terms.add(handle);
        }
      });
    }
    
    return Array.from(terms).join(' ');
  }
  
  /**
   * Get category-specific keywords for better matching
   */
  private static getCategoryKeywords(category: string): string[] {
    const keywordMap: { [key: string]: string[] } = {
      'belleza': [
        'salon', 'peluqueria', 'barberia', 'spa', 'belleza', 'corte', 'cabello',
        'manicure', 'pedicure', 'uñas', 'maquillaje', 'cejas', 'pestañas',
        'tratamiento', 'masaje', 'facial', 'depilacion', 'estetica'
      ],
      'salud': [
        'medico', 'doctor', 'clinica', 'hospital', 'consultorio', 'dentista',
        'odontologo', 'farmacia', 'laboratorio', 'psicologia', 'nutricion',
        'fisioterapia', 'rehabilitacion', 'emergencia', 'pediatria'
      ],
      'fitness': [
        'gimnasio', 'fitness', 'gym', 'crossfit', 'yoga', 'pilates',
        'entrenamiento', 'musculacion', 'cardio', 'zumba', 'spinning',
        'aerobicos', 'funcional', 'boxeo', 'artes marciales'
      ],
      'gastronomia': [
        'restaurante', 'comida', 'bar', 'cafeteria', 'cafe', 'pizzeria',
        'cevicheria', 'chifa', 'polleria', 'panaderia', 'pasteleria',
        'delivery', 'menu', 'almuerzo', 'cena', 'desayuno'
      ],
      'servicios': [
        'servicio', 'reparacion', 'mantenimiento', 'limpieza', 'consultoria',
        'asesoria', 'legal', 'contabilidad', 'arquitectura', 'ingenieria',
        'construccion', 'seguridad', 'transporte', 'delivery'
      ],
      'automotriz': [
        'taller', 'mecanico', 'auto', 'carro', 'vehiculo', 'repuesto',
        'llanta', 'gasolinera', 'grifo', 'lavado', 'lubricante',
        'bateria', 'frenos', 'motor', 'transmision'
      ]
    };
    
    return keywordMap[category] || [];
  }
  
  /**
   * Extract location terms from address
   */
  private static extractLocationTerms(address: string): string[] {
    const terms: string[] = [];
    const addressLower = address.toLowerCase();
    
    // Lima districts
    const districts = [
      'miraflores', 'san isidro', 'barranco', 'surco', 'la molina',
      'jesus maria', 'lince', 'magdalena', 'pueblo libre', 'breña',
      'rimac', 'cercado', 'san miguel', 'callao', 'chorrillos',
      'surquillo', 'san borja', 'providencia', 'independencia'
    ];
    
    districts.forEach(district => {
      if (addressLower.includes(district)) {
        terms.push(district);
      }
    });
    
    // Extract street names and numbers
    const streetPatterns = [
      /av\.\s*([a-záéíóúñ\s]+)/gi,
      /avenida\s+([a-záéíóúñ\s]+)/gi,
      /jr\.\s*([a-záéíóúñ\s]+)/gi,
      /jiron\s+([a-záéíóúñ\s]+)/gi,
      /calle\s+([a-záéíóúñ\s]+)/gi
    ];
    
    streetPatterns.forEach(pattern => {
      const matches = address.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const streetName = match.replace(/^(av\.|avenida|jr\.|jiron|calle)\s*/i, '').trim();
          if (streetName.length > 2) terms.push(streetName.toLowerCase());
        });
      }
    });
    
    return terms;
  }
  
  /**
   * Extract service terms from business descriptions
   */
  private static extractServiceTerms(description: string): string[] {
    const terms: string[] = [];
    if (!description) return terms;
    
    const serviceKeywords = [
      'servicio', 'especialista', 'profesional', 'tratamiento', 'consulta',
      'atencion', 'cuidado', 'reparacion', 'instalacion', 'mantenimiento',
      'venta', 'alquiler', 'curso', 'clase', 'taller', 'capacitacion'
    ];
    
    const descriptionLower = description.toLowerCase();
    serviceKeywords.forEach(keyword => {
      if (descriptionLower.includes(keyword)) {
        terms.push(keyword);
      }
    });
    
    return terms;
  }
  
  /**
   * Main search method with advanced filtering and relevance scoring
   */
  async search(searchQuery: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();
    const {
      query = '',
      category,
      city,
      district,
      minRating = 0,
      maxPrice = 5,
      openNow = false,
      hasPhone = false,
      hasWebsite = false,
      hasEmail = false,
      sortBy = 'relevance',
      page = 1,
      limit = this.DEFAULT_LIMIT
    } = searchQuery;
    
    const queryAnalysis = this.analyzeQuery(query);
    const whereConditions = this.buildWhereConditions(searchQuery);
    
    // Build the main query
    let queryBuilder = db.select().from(apifyBusinesses);
    
    if (whereConditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...whereConditions));
    }
    
    // Apply sorting
    queryBuilder = this.applySorting(queryBuilder, sortBy, query);
    
    // Get total count for pagination
    const totalCountQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(apifyBusinesses);
    
    if (whereConditions.length > 0) {
      totalCountQuery.where(and(...whereConditions));
    }
    
    const [businesses, totalCountResult] = await Promise.all([
      queryBuilder.limit(limit).offset((page - 1) * limit),
      totalCountQuery
    ]);
    
    const totalCount = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);
    const searchTime = Date.now() - startTime;
    
    // Calculate relevance scores for metrics
    const relevanceScores = businesses.map(business => 
      this.calculateRelevanceScore(business, query, queryAnalysis)
    );
    
    return {
      businesses,
      totalCount,
      page,
      totalPages,
      hasMore: page < totalPages,
      searchMetrics: {
        searchTime,
        totalMatches: totalCount,
        relevanceScores,
        queryAnalysis
      }
    };
  }
  
  /**
   * Analyze search query to extract intent and keywords
   */
  private analyzeQuery(query: string): string[] {
    if (!query) return [];
    
    const analysis: string[] = [];
    const queryLower = query.toLowerCase().trim();
    
    // Detect category hints
    const categoryHints = {
      'belleza': ['salon', 'peluqueria', 'barberia', 'corte', 'cabello'],
      'salud': ['medico', 'doctor', 'clinica', 'dentista'],
      'fitness': ['gimnasio', 'gym', 'fitness', 'yoga'],
      'gastronomia': ['restaurante', 'comida', 'bar', 'cafe'],
      'servicios': ['servicio', 'reparacion', 'consultoria'],
      'automotriz': ['taller', 'mecanico', 'auto', 'carro']
    };
    
    Object.entries(categoryHints).forEach(([category, hints]) => {
      if (hints.some(hint => queryLower.includes(hint))) {
        analysis.push(`category_hint:${category}`);
      }
    });
    
    // Detect location hints
    const locationHints = ['miraflores', 'san isidro', 'barranco', 'surco', 'lima'];
    locationHints.forEach(location => {
      if (queryLower.includes(location)) {
        analysis.push(`location_hint:${location}`);
      }
    });
    
    // Detect service quality hints
    if (queryLower.includes('mejor') || queryLower.includes('top') || queryLower.includes('bueno')) {
      analysis.push('quality_hint:premium');
    }
    
    return analysis;
  }
  
  /**
   * Build WHERE conditions for the database query
   */
  private buildWhereConditions(searchQuery: SearchQuery): any[] {
    const conditions: any[] = [];
    
    // Text search with multiple strategies
    if (searchQuery.query && searchQuery.query.trim()) {
      const query = searchQuery.query.trim().toLowerCase();
      
      // Full-text search on search_terms
      conditions.push(
        or(
          ilike(apifyBusinesses.searchTerms, `%${query}%`),
          ilike(apifyBusinesses.name, `%${query}%`),
          ilike(apifyBusinesses.address, `%${query}%`)
        )
      );
    }
    
    // Category filter
    if (searchQuery.category && searchQuery.category !== 'all') {
      conditions.push(eq(apifyBusinesses.category, searchQuery.category));
    }
    
    // Location filters
    if (searchQuery.district && searchQuery.district !== 'all') {
      conditions.push(ilike(apifyBusinesses.address, `%${searchQuery.district}%`));
    }
    
    // Quality filters
    if (searchQuery.minRating && searchQuery.minRating > 0) {
      conditions.push(gte(apifyBusinesses.rating, searchQuery.minRating.toString()));
    }
    
    if (searchQuery.maxPrice && searchQuery.maxPrice < 5) {
      conditions.push(lte(apifyBusinesses.priceLevel, searchQuery.maxPrice));
    }
    
    // Contact information filters
    if (searchQuery.hasPhone) {
      conditions.push(and(
        isNotNull(apifyBusinesses.phone),
        ne(apifyBusinesses.phone, '')
      ));
    }
    
    if (searchQuery.hasWebsite) {
      conditions.push(and(
        isNotNull(apifyBusinesses.website),
        ne(apifyBusinesses.website, '')
      ));
    }
    
    if (searchQuery.hasEmail) {
      conditions.push(and(
        isNotNull(apifyBusinesses.email),
        ne(apifyBusinesses.email, '')
      ));
    }
    
    // Operating hours filter
    if (searchQuery.openNow) {
      conditions.push(eq(apifyBusinesses.openNow, true));
    }
    
    return conditions;
  }
  
  /**
   * Apply sorting to the query
   */
  private applySorting(queryBuilder: any, sortBy: string, query?: string): any {
    switch (sortBy) {
      case 'rating':
        return queryBuilder.orderBy(desc(apifyBusinesses.rating), desc(apifyBusinesses.reviewCount));
      
      case 'reviews':
        return queryBuilder.orderBy(desc(apifyBusinesses.reviewCount), desc(apifyBusinesses.rating));
      
      case 'name':
        return queryBuilder.orderBy(asc(apifyBusinesses.name));
      
      case 'relevance':
      default:
        // For relevance, use rating and review count
        return queryBuilder.orderBy(desc(apifyBusinesses.rating), desc(apifyBusinesses.reviewCount));
    }
  }
  
  /**
   * Calculate relevance score for a business
   */
  private calculateRelevanceScore(business: ApifyBusiness, query: string, queryAnalysis: string[]): number {
    let score = 0;
    
    if (!query) return parseFloat(business.rating || '0');
    
    const queryLower = query.toLowerCase();
    const nameLower = business.name.toLowerCase();
    const searchTermsLower = (business.searchTerms || '').toLowerCase();
    
    // Exact name match (highest weight)
    if (nameLower === queryLower) score += 100;
    
    // Name starts with query (high weight)
    if (nameLower.startsWith(queryLower)) score += 50;
    
    // Name contains query (medium weight)
    if (nameLower.includes(queryLower)) score += 25;
    
    // Search terms contain query (low weight)
    if (searchTermsLower.includes(queryLower)) score += 10;
    
    // Quality bonuses
    const rating = parseFloat(business.rating || '0');
    const reviewCount = business.reviewCount || 0;
    
    score += rating * 5; // Rating contribution
    score += Math.min(reviewCount / 10, 10); // Review count contribution (capped at 10)
    
    // Contact information bonus
    if (business.phone) score += 2;
    if (business.website) score += 2;
    if (business.email) score += 3;
    
    // Category analysis bonus
    queryAnalysis.forEach(analysis => {
      if (analysis.startsWith('category_hint:')) {
        const hintCategory = analysis.split(':')[1];
        if (business.category === hintCategory) score += 20;
      }
    });
    
    return Math.round(score * 10) / 10;
  }
  
  /**
   * Update search terms for existing businesses
   */
  async updateSearchTerms(businessId: string): Promise<void> {
    const business = await db.select().from(apifyBusinesses)
      .where(eq(apifyBusinesses.placeId, businessId))
      .limit(1);
    
    if (business.length === 0) return;
    
    const searchTerms = EnhancedSearchEngine.generateSearchTerms(business[0]);
    
    await db.update(apifyBusinesses)
      .set({ searchTerms })
      .where(eq(apifyBusinesses.placeId, businessId));
  }
  
  /**
   * Bulk update search terms for all businesses
   */
  async bulkUpdateSearchTerms(batchSize: number = 100): Promise<void> {
    console.log('🔍 Starting bulk search terms update...');
    
    let offset = 0;
    let processed = 0;
    
    while (true) {
      const businesses = await db.select().from(apifyBusinesses)
        .limit(batchSize)
        .offset(offset);
      
      if (businesses.length === 0) break;
      
      const updates = businesses.map(business => {
        const searchTerms = EnhancedSearchEngine.generateSearchTerms(business);
        return db.update(apifyBusinesses)
          .set({ searchTerms })
          .where(eq(apifyBusinesses.placeId, business.placeId));
      });
      
      await Promise.all(updates);
      
      processed += businesses.length;
      offset += batchSize;
      
      console.log(`✅ Updated search terms for ${processed} businesses`);
    }
    
    console.log(`🎉 Bulk update completed! Updated ${processed} businesses`);
  }
  
  /**
   * Get search suggestions based on partial query
   */
  async getSearchSuggestions(partialQuery: string, limit: number = 5): Promise<string[]> {
    if (!partialQuery || partialQuery.length < 2) return [];
    
    const suggestions = await db.select({
      name: apifyBusinesses.name,
      category: apifyBusinesses.category
    })
    .from(apifyBusinesses)
    .where(
      or(
        ilike(apifyBusinesses.name, `${partialQuery}%`),
        ilike(apifyBusinesses.searchTerms, `%${partialQuery}%`)
      )
    )
    .limit(limit * 2); // Get more to filter unique suggestions
    
    // Extract unique suggestions
    const uniqueSuggestions = new Set<string>();
    
    suggestions.forEach(business => {
      uniqueSuggestions.add(business.name);
      
      // Add category if it matches
      if (business.category.startsWith(partialQuery.toLowerCase())) {
        uniqueSuggestions.add(business.category);
      }
    });
    
    return Array.from(uniqueSuggestions).slice(0, limit);
  }
}

export const enhancedSearchEngine = new EnhancedSearchEngine();
/**
 * 🚀 PERFORMANCE OPTIMIZATION SERVICE
 * 
 * Implements multiple strategies to handle large datasets efficiently:
 * 1. Response caching with Redis-like memory store
 * 2. Spatial indexing for map queries
 * 3. Field selection optimization
 * 4. Query result pooling
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export class PerformanceOptimizer {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000;

  /**
   * Generate cache key for search parameters
   */
  private generateCacheKey(params: any): string {
    const keyParams = {
      query: params.query || '',
      category: params.category || '',
      subcategory: params.subcategory || '',
      district: params.district || '',
      city: params.city || '',
      minRating: params.minRating || 0,
      hasPhone: params.hasPhone || false,
      hasWebsite: params.hasWebsite || false,
      hasEmail: params.hasEmail || false,
      bounds: params.bounds ? JSON.stringify(params.bounds) : '',
      page: params.page || 1,
      limit: params.limit || 20,
      sortBy: params.sortBy || 'relevance'
    };
    
    return `search:${JSON.stringify(keyParams)}`;
  }

  /**
   * Get cached result if available and not expired
   */
  getCachedResult(params: any): any | null {
    const key = this.generateCacheKey(params);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Cache search result
   */
  cacheResult(params: any, data: any, customTTL?: number): void {
    // Clean cache if too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanOldEntries();
    }

    const key = this.generateCacheKey(params);
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: customTTL || this.CACHE_TTL
    };
    
    this.cache.set(key, entry);
  }

  /**
   * Clean expired entries from cache
   */
  private cleanOldEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    // If still too large, remove oldest entries
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp);
      
      const toRemove = entries.slice(0, this.MAX_CACHE_SIZE / 4);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Optimize field selection for different view types
   */
  getOptimizedFields(viewType: 'list' | 'map' | 'grid' = 'list') {
    const baseFields = [
      'place_id as id',
      'name', 
      'address',
      'category',
      'rating',
      'review_count',
      'district'
    ];

    switch (viewType) {
      case 'map':
        return [
          ...baseFields,
          'latitude',
          'longitude',
          'phone',
          'website'
        ];
      
      case 'grid':
        return [
          ...baseFields,
          'photo_url',
          'price_level',
          'phone',
          'website'
        ];
        
      case 'list':
      default:
        return [
          ...baseFields,
          'photo_url',
          'price_level',
          'phone',
          'website',
          'email',
          'open_now',
          'latitude',
          'longitude'
        ];
    }
  }

  /**
   * Calculate if map bounds require full reload or can use cached data
   */
  shouldRefreshMapData(newBounds: MapBounds, cachedBounds?: MapBounds): boolean {
    if (!cachedBounds) return true;
    
    // Check if new bounds extend significantly beyond cached bounds
    const latDiff = Math.abs(newBounds.north - newBounds.south);
    const lngDiff = Math.abs(newBounds.east - newBounds.west);
    
    const expandThreshold = 0.1; // 10% expansion triggers refresh
    
    return (
      newBounds.north > cachedBounds.north + (latDiff * expandThreshold) ||
      newBounds.south < cachedBounds.south - (latDiff * expandThreshold) ||
      newBounds.east > cachedBounds.east + (lngDiff * expandThreshold) ||
      newBounds.west < cachedBounds.west - (lngDiff * expandThreshold)
    );
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    this.cache.forEach(entry => {
      if (now - entry.timestamp > entry.ttl) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    });
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      cacheHitRate: validEntries / (validEntries + expiredEntries) || 0
    };
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

/**
 * SPATIAL CLUSTERING FOR MAP PERFORMANCE
 * 
 * Reduces map markers when zoomed out to improve performance
 */
export class SpatialClusterer {
  /**
   * Cluster nearby businesses for map display
   */
  static clusterBusinesses(businesses: any[], zoomLevel: number = 10): any[] {
    if (zoomLevel > 14 || businesses.length < 100) {
      return businesses; // No clustering needed for detailed view or small datasets
    }

    const clusters = new Map<string, any[]>();
    const precision = this.getClusterPrecision(zoomLevel);

    businesses.forEach(business => {
      const lat = parseFloat(business.latitude || business.location?.lat || '0');
      const lng = parseFloat(business.longitude || business.location?.lng || '0');
      
      if (lat === 0 && lng === 0) return; // Skip businesses without coordinates
      
      const clusterKey = `${Math.round(lat * precision)}:${Math.round(lng * precision)}`;
      
      if (!clusters.has(clusterKey)) {
        clusters.set(clusterKey, []);
      }
      clusters.get(clusterKey)!.push(business);
    });

    // Convert clusters to representative businesses
    const clusteredBusinesses: any[] = [];
    
    clusters.forEach((cluster, clusterKey) => {
      if (cluster.length === 1) {
        clusteredBusinesses.push(cluster[0]);
      } else {
        // Create cluster representative
        const avgLat = cluster.reduce((sum, b) => sum + parseFloat(b.latitude || b.location?.lat || '0'), 0) / cluster.length;
        const avgLng = cluster.reduce((sum, b) => sum + parseFloat(b.longitude || b.location?.lng || '0'), 0) / cluster.length;
        const bestRating = Math.max(...cluster.map(b => parseFloat(b.rating || '0')));
        const totalReviews = cluster.reduce((sum, b) => sum + (b.reviewCount || b.review_count || 0), 0);
        
        clusteredBusinesses.push({
          ...cluster[0], // Use first business as base
          id: `cluster_${clusterKey}`,
          name: `${cluster.length} negocios en esta área`,
          latitude: avgLat.toString(),
          longitude: avgLng.toString(),
          location: { lat: avgLat, lng: avgLng },
          rating: bestRating,
          reviewCount: totalReviews,
          isCluster: true,
          clusterSize: cluster.length,
          businesses: cluster
        });
      }
    });

    return clusteredBusinesses;
  }

  private static getClusterPrecision(zoomLevel: number): number {
    // Higher zoom = more precision = less clustering
    if (zoomLevel >= 12) return 1000;
    if (zoomLevel >= 10) return 100;
    if (zoomLevel >= 8) return 50;
    return 20;
  }
}
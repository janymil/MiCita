/**
 * Search Analytics and Tracking System
 * 
 * This module provides comprehensive search analytics including:
 * - Search query tracking and analysis
 * - User behavior patterns
 * - Popular searches and trends
 * - Performance metrics
 * - Search success rates
 */

import { db } from "./db.js";
import { sql } from "drizzle-orm";

class SearchAnalytics {
  
  constructor() {
    this.sessionData = new Map(); // In-memory session tracking
    this.searchCache = new Map(); // Recent searches cache
    this.trendingSearches = new Map(); // Trending searches tracking
  }
  
  /**
   * Track a search query and its results
   */
  async trackSearch(searchData) {
    const {
      query,
      category,
      district,
      filters,
      resultsCount,
      searchTime,
      userAgent,
      ip,
      sessionId,
      userId = null
    } = searchData;
    
    const searchId = this.generateSearchId();
    const timestamp = new Date().toISOString();
    
    const searchRecord = {
      searchId,
      timestamp,
      query: query?.toLowerCase().trim() || '',
      category: category || 'all',
      district: district || 'all',
      filters: JSON.stringify(filters || {}),
      resultsCount: resultsCount || 0,
      searchTime: searchTime || 0,
      userAgent: userAgent || '',
      ip: this.hashIP(ip || ''),
      sessionId: sessionId || '',
      userId,
      success: resultsCount > 0
    };
    
    // Store in session data for immediate analytics
    this.storeSessionData(searchRecord);
    
    // Update trending searches
    this.updateTrendingSearches(query);
    
    // Log search for analysis
    console.log('📊 Search tracked:', {
      query: searchRecord.query,
      category: searchRecord.category,
      resultsCount: searchRecord.resultsCount,
      searchTime: `${searchRecord.searchTime}ms`,
      success: searchRecord.success
    });
    
    return searchRecord;
  }
  
  /**
   * Track user interaction with search results
   */
  async trackInteraction(interactionData) {
    const {
      searchId,
      businessId,
      businessName,
      action, // 'click', 'view', 'save', 'book', 'call', 'visit_website'
      position, // Position in search results
      timestamp = new Date().toISOString()
    } = interactionData;
    
    const interaction = {
      searchId,
      businessId,
      businessName,
      action,
      position,
      timestamp
    };
    
    // Store interaction data
    this.storeInteractionData(interaction);
    
    console.log('👆 Interaction tracked:', {
      action,
      businessName,
      position
    });
    
    return interaction;
  }
  
  /**
   * Get search analytics summary
   */
  getAnalyticsSummary(timeframe = '24h') {
    const now = Date.now();
    const timeframMs = this.parseTimeframe(timeframe);
    const cutoff = now - timeframMs;
    
    const recentSearches = Array.from(this.sessionData.values())
      .filter(search => new Date(search.timestamp).getTime() > cutoff);
    
    const totalSearches = recentSearches.length;
    const successfulSearches = recentSearches.filter(s => s.success).length;
    const successRate = totalSearches > 0 ? (successfulSearches / totalSearches * 100).toFixed(1) : 0;
    
    const avgSearchTime = recentSearches.length > 0 
      ? (recentSearches.reduce((sum, s) => sum + s.searchTime, 0) / recentSearches.length).toFixed(0)
      : 0;
    
    const avgResultsCount = recentSearches.length > 0
      ? (recentSearches.reduce((sum, s) => sum + s.resultsCount, 0) / recentSearches.length).toFixed(1)
      : 0;
    
    // Top searches
    const queryFrequency = {};
    recentSearches.forEach(search => {
      if (search.query) {
        queryFrequency[search.query] = (queryFrequency[search.query] || 0) + 1;
      }
    });
    
    const topSearches = Object.entries(queryFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));
    
    // Category breakdown
    const categoryBreakdown = {};
    recentSearches.forEach(search => {
      const cat = search.category || 'all';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    });
    
    // District breakdown
    const districtBreakdown = {};
    recentSearches.forEach(search => {
      const dist = search.district || 'all';
      districtBreakdown[dist] = (districtBreakdown[dist] || 0) + 1;
    });
    
    return {
      timeframe,
      summary: {
        totalSearches,
        successfulSearches,
        successRate: `${successRate}%`,
        avgSearchTime: `${avgSearchTime}ms`,
        avgResultsCount
      },
      topSearches,
      categoryBreakdown: Object.entries(categoryBreakdown)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category, count]) => ({ category, count })),
      districtBreakdown: Object.entries(districtBreakdown)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([district, count]) => ({ district, count })),
      trending: this.getTrendingSearches()
    };
  }
  
  /**
   * Get search suggestions based on analytics
   */
  getSearchSuggestions(partialQuery = '', limit = 5) {
    const queryLower = partialQuery.toLowerCase().trim();
    
    // Get suggestions from recent searches
    const recentQueries = Array.from(this.sessionData.values())
      .map(search => search.query)
      .filter(query => query && query.includes(queryLower))
      .filter((query, index, self) => self.indexOf(query) === index) // Remove duplicates
      .slice(0, limit);
    
    // Get trending suggestions
    const trendingSuggestions = Array.from(this.trendingSearches.entries())
      .filter(([query]) => query.includes(queryLower))
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([query]) => query);
    
    // Combine and deduplicate
    const allSuggestions = [...new Set([...recentQueries, ...trendingSuggestions])];
    
    return allSuggestions.slice(0, limit).map(query => ({
      value: query,
      label: this.capitalizeQuery(query),
      type: 'recent',
      frequency: this.trendingSearches.get(query) || 1
    }));
  }
  
  /**
   * Get popular categories based on search data
   */
  getPopularCategories(limit = 5) {
    const categoryCount = {};
    
    Array.from(this.sessionData.values()).forEach(search => {
      if (search.category && search.category !== 'all') {
        categoryCount[search.category] = (categoryCount[search.category] || 0) + 1;
      }
    });
    
    return Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([category, count]) => ({
        category,
        count,
        percentage: ((count / Array.from(this.sessionData.values()).length) * 100).toFixed(1)
      }));
  }
  
  /**
   * Get search performance metrics
   */
  getPerformanceMetrics() {
    const searches = Array.from(this.sessionData.values());
    
    if (searches.length === 0) {
      return {
        totalSearches: 0,
        avgSearchTime: 0,
        slowSearches: 0,
        fastSearches: 0,
        emptyResults: 0
      };
    }
    
    const searchTimes = searches.map(s => s.searchTime);
    const avgSearchTime = searchTimes.reduce((sum, time) => sum + time, 0) / searchTimes.length;
    
    const slowSearches = searches.filter(s => s.searchTime > 1000).length; // > 1 second
    const fastSearches = searches.filter(s => s.searchTime < 200).length; // < 200ms
    const emptyResults = searches.filter(s => s.resultsCount === 0).length;
    
    return {
      totalSearches: searches.length,
      avgSearchTime: Math.round(avgSearchTime),
      slowSearches,
      fastSearches,
      emptyResults,
      performance: {
        fast: `${((fastSearches / searches.length) * 100).toFixed(1)}%`,
        slow: `${((slowSearches / searches.length) * 100).toFixed(1)}%`,
        empty: `${((emptyResults / searches.length) * 100).toFixed(1)}%`
      }
    };
  }
  
  /**
   * Clean up old analytics data
   */
  cleanup(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    const cutoff = Date.now() - maxAge;
    
    // Clean session data
    for (const [key, search] of this.sessionData.entries()) {
      if (new Date(search.timestamp).getTime() < cutoff) {
        this.sessionData.delete(key);
      }
    }
    
    // Clean trending searches (decay old trends)
    for (const [query, count] of this.trendingSearches.entries()) {
      const newCount = Math.max(1, Math.floor(count * 0.9)); // 10% decay
      if (newCount <= 1) {
        this.trendingSearches.delete(query);
      } else {
        this.trendingSearches.set(query, newCount);
      }
    }
    
    console.log('🧹 Analytics cleanup completed');
  }
  
  // Helper methods
  
  generateSearchId() {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  hashIP(ip) {
    // Simple hash for privacy (in production, use proper hashing)
    return ip.split('').reduce((hash, char) => {
      const charCode = char.charCodeAt(0);
      hash = ((hash << 5) - hash) + charCode;
      return hash & hash; // Convert to 32-bit integer
    }, 0).toString();
  }
  
  storeSessionData(searchRecord) {
    this.sessionData.set(searchRecord.searchId, searchRecord);
    
    // Limit memory usage - keep only recent 1000 searches
    if (this.sessionData.size > 1000) {
      const oldest = Array.from(this.sessionData.entries())
        .sort(([,a], [,b]) => new Date(a.timestamp) - new Date(b.timestamp))[0];
      this.sessionData.delete(oldest[0]);
    }
  }
  
  storeInteractionData(interaction) {
    // For now, just log interactions
    // In production, you'd store this in a database
    console.log('💾 Interaction stored:', interaction);
  }
  
  updateTrendingSearches(query) {
    if (!query || query.length < 2) return;
    
    const normalizedQuery = query.toLowerCase().trim();
    const currentCount = this.trendingSearches.get(normalizedQuery) || 0;
    this.trendingSearches.set(normalizedQuery, currentCount + 1);
  }
  
  getTrendingSearches(limit = 10) {
    return Array.from(this.trendingSearches.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([query, count]) => ({
        query: this.capitalizeQuery(query),
        count
      }));
  }
  
  capitalizeQuery(query) {
    return query.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  parseTimeframe(timeframe) {
    const timeframeMap = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    return timeframeMap[timeframe] || timeframeMap['24h'];
  }
}

// Create singleton instance
const searchAnalytics = new SearchAnalytics();

// Auto-cleanup every hour
setInterval(() => {
  searchAnalytics.cleanup();
}, 60 * 60 * 1000);

export { searchAnalytics, SearchAnalytics };
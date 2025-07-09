/**
 * Search Personalization System
 * 
 * This module provides personalized search experiences based on:
 * - User search history and preferences
 * - Geographic location patterns
 * - Category preferences
 * - Time-based patterns
 * - Business interaction history
 */

class SearchPersonalization {
  
  constructor() {
    this.userProfiles = new Map(); // User preference profiles
    this.sessionProfiles = new Map(); // Session-based preferences
    this.locationPatterns = new Map(); // Location-based patterns
  }
  
  /**
   * Build or update user profile based on search history
   */
  updateUserProfile(userId, searchData) {
    if (!userId) return;
    
    let profile = this.userProfiles.get(userId) || {
      userId,
      preferences: {
        categories: {},
        districts: {},
        priceRanges: {},
        features: {}
      },
      searchHistory: [],
      interactionHistory: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    // Update category preferences
    if (searchData.category && searchData.category !== 'all') {
      profile.preferences.categories[searchData.category] = 
        (profile.preferences.categories[searchData.category] || 0) + 1;
    }
    
    // Update district preferences
    if (searchData.district && searchData.district !== 'all') {
      profile.preferences.districts[searchData.district] = 
        (profile.preferences.districts[searchData.district] || 0) + 1;
    }
    
    // Update feature preferences
    if (searchData.filters) {
      Object.entries(searchData.filters).forEach(([filter, value]) => {
        if (value) {
          profile.preferences.features[filter] = 
            (profile.preferences.features[filter] || 0) + 1;
        }
      });
    }
    
    // Add to search history (keep last 50)
    profile.searchHistory.unshift({
      query: searchData.query,
      timestamp: new Date().toISOString(),
      resultsCount: searchData.resultsCount
    });
    profile.searchHistory = profile.searchHistory.slice(0, 50);
    
    profile.lastUpdated = new Date().toISOString();
    this.userProfiles.set(userId, profile);
    
    console.log(`👤 User profile updated for ${userId}:`, {
      topCategory: this.getTopPreference(profile.preferences.categories),
      topDistrict: this.getTopPreference(profile.preferences.districts),
      searchHistoryLength: profile.searchHistory.length
    });
    
    return profile;
  }
  
  /**
   * Update session-based preferences (for anonymous users)
   */
  updateSessionProfile(sessionId, searchData) {
    if (!sessionId) return;
    
    let profile = this.sessionProfiles.get(sessionId) || {
      sessionId,
      preferences: {
        categories: {},
        districts: {},
        queryPatterns: []
      },
      searches: [],
      startTime: new Date().toISOString()
    };
    
    // Update session preferences
    if (searchData.category && searchData.category !== 'all') {
      profile.preferences.categories[searchData.category] = 
        (profile.preferences.categories[searchData.category] || 0) + 1;
    }
    
    if (searchData.district && searchData.district !== 'all') {
      profile.preferences.districts[searchData.district] = 
        (profile.preferences.districts[searchData.district] || 0) + 1;
    }
    
    // Track query patterns
    if (searchData.query) {
      profile.preferences.queryPatterns.push(searchData.query.toLowerCase());
      profile.preferences.queryPatterns = profile.preferences.queryPatterns.slice(-10); // Keep last 10
    }
    
    // Add search to session
    profile.searches.push({
      query: searchData.query,
      category: searchData.category,
      timestamp: new Date().toISOString()
    });
    
    this.sessionProfiles.set(sessionId, profile);
    
    return profile;
  }
  
  /**
   * Get personalized search suggestions
   */
  getPersonalizedSuggestions(userId, sessionId, partialQuery = '', limit = 5) {
    const suggestions = [];
    
    // Get user profile suggestions
    if (userId) {
      const userProfile = this.userProfiles.get(userId);
      if (userProfile) {
        suggestions.push(...this.extractUserSuggestions(userProfile, partialQuery));
      }
    }
    
    // Get session profile suggestions
    if (sessionId) {
      const sessionProfile = this.sessionProfiles.get(sessionId);
      if (sessionProfile) {
        suggestions.push(...this.extractSessionSuggestions(sessionProfile, partialQuery));
      }
    }
    
    // Remove duplicates and limit
    const uniqueSuggestions = suggestions
      .filter((suggestion, index, self) => 
        index === self.findIndex(s => s.value === suggestion.value)
      )
      .slice(0, limit);
    
    return uniqueSuggestions;
  }
  
  /**
   * Personalize search results based on user preferences
   */
  personalizeResults(businesses, userId, sessionId, searchQuery) {
    let profile = null;
    
    // Get user or session profile
    if (userId) {
      profile = this.userProfiles.get(userId);
    } else if (sessionId) {
      profile = this.sessionProfiles.get(sessionId);
    }
    
    if (!profile) {
      return businesses; // No personalization data
    }
    
    // Score businesses based on user preferences
    const scoredBusinesses = businesses.map(business => ({
      ...business,
      personalizedScore: this.calculatePersonalizedScore(business, profile, searchQuery)
    }));
    
    // Sort by personalized score (keeping original relevance as secondary)
    scoredBusinesses.sort((a, b) => {
      const scoreDiff = b.personalizedScore - a.personalizedScore;
      if (Math.abs(scoreDiff) < 0.1) {
        // If personalized scores are similar, use original relevance
        return (b.relevanceScore || 0) - (a.relevanceScore || 0);
      }
      return scoreDiff;
    });
    
    console.log(`🎯 Personalized ${businesses.length} results for ${userId || sessionId}`);
    
    return scoredBusinesses;
  }
  
  /**
   * Get user insights for analytics
   */
  getUserInsights(userId) {
    const profile = this.userProfiles.get(userId);
    if (!profile) return null;
    
    const topCategory = this.getTopPreference(profile.preferences.categories);
    const topDistrict = this.getTopPreference(profile.preferences.districts);
    const topFeatures = Object.entries(profile.preferences.features)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([feature, count]) => ({ feature, count }));
    
    const recentSearches = profile.searchHistory.slice(0, 10);
    const searchFrequency = profile.searchHistory.length;
    
    return {
      userId,
      preferences: {
        topCategory,
        topDistrict,
        topFeatures
      },
      activity: {
        totalSearches: searchFrequency,
        recentSearches,
        lastActive: profile.lastUpdated
      },
      memberSince: profile.createdAt
    };
  }
  
  /**
   * Get aggregated personalization insights
   */
  getPersonalizationInsights() {
    const totalUsers = this.userProfiles.size;
    const totalSessions = this.sessionProfiles.size;
    
    // Aggregate category preferences
    const categoryPrefs = {};
    this.userProfiles.forEach(profile => {
      Object.entries(profile.preferences.categories).forEach(([cat, count]) => {
        categoryPrefs[cat] = (categoryPrefs[cat] || 0) + count;
      });
    });
    
    // Aggregate district preferences
    const districtPrefs = {};
    this.userProfiles.forEach(profile => {
      Object.entries(profile.preferences.districts).forEach(([dist, count]) => {
        districtPrefs[dist] = (districtPrefs[dist] || 0) + count;
      });
    });
    
    return {
      totalUsers,
      totalSessions,
      topCategories: Object.entries(categoryPrefs)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category, count]) => ({ category, count })),
      topDistricts: Object.entries(districtPrefs)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([district, count]) => ({ district, count }))
    };
  }
  
  // Helper methods
  
  extractUserSuggestions(userProfile, partialQuery) {
    const suggestions = [];
    const queryLower = partialQuery.toLowerCase();
    
    // Suggestions from search history
    userProfile.searchHistory.forEach(search => {
      if (search.query && search.query.toLowerCase().includes(queryLower)) {
        suggestions.push({
          value: search.query.toLowerCase(),
          label: search.query,
          type: 'personal_history',
          weight: 10
        });
      }
    });
    
    // Suggestions from category preferences
    Object.entries(userProfile.preferences.categories).forEach(([category, count]) => {
      if (category.includes(queryLower)) {
        suggestions.push({
          value: category,
          label: this.capitalizeFirst(category),
          type: 'personal_category',
          weight: count
        });
      }
    });
    
    return suggestions;
  }
  
  extractSessionSuggestions(sessionProfile, partialQuery) {
    const suggestions = [];
    const queryLower = partialQuery.toLowerCase();
    
    // Suggestions from session query patterns
    sessionProfile.preferences.queryPatterns.forEach(query => {
      if (query.includes(queryLower)) {
        suggestions.push({
          value: query,
          label: this.capitalizeFirst(query),
          type: 'session_pattern',
          weight: 5
        });
      }
    });
    
    return suggestions;
  }
  
  calculatePersonalizedScore(business, profile, searchQuery) {
    let score = 0;
    
    // Category preference boost
    if (profile.preferences.categories[business.category]) {
      const categoryWeight = profile.preferences.categories[business.category];
      score += categoryWeight * 0.3; // 30% weight for category preference
    }
    
    // District preference boost
    if (business.address && profile.preferences.districts) {
      const businessDistrict = this.extractDistrictFromAddress(business.address);
      if (businessDistrict && profile.preferences.districts[businessDistrict]) {
        const districtWeight = profile.preferences.districts[businessDistrict];
        score += districtWeight * 0.2; // 20% weight for district preference
      }
    }
    
    // Feature preference boost
    if (profile.preferences.features) {
      if (profile.preferences.features.hasPhone && business.phone) {
        score += 0.1;
      }
      if (profile.preferences.features.hasWebsite && business.website) {
        score += 0.1;
      }
      if (profile.preferences.features.minRating && business.rating >= 4) {
        score += 0.1;
      }
    }
    
    // Recent search pattern boost
    if (profile.searchHistory) {
      const recentQueries = profile.searchHistory.slice(0, 5).map(s => s.query?.toLowerCase());
      const businessName = business.name.toLowerCase();
      
      recentQueries.forEach(query => {
        if (query && businessName.includes(query)) {
          score += 0.2;
        }
      });
    }
    
    return score;
  }
  
  extractDistrictFromAddress(address) {
    // Simple district extraction - in production, use more sophisticated method
    const districts = [
      'miraflores', 'san isidro', 'san borja', 'surco', 'barranco',
      'lince', 'breña', 'pueblo libre', 'magdalena', 'jesus maria'
    ];
    
    const addressLower = address.toLowerCase();
    return districts.find(district => addressLower.includes(district));
  }
  
  getTopPreference(preferences) {
    if (!preferences || Object.keys(preferences).length === 0) return null;
    
    return Object.entries(preferences)
      .sort(([,a], [,b]) => b - a)[0][0];
  }
  
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  /**
   * Clean up old session profiles
   */
  cleanup(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const cutoff = Date.now() - maxAge;
    
    for (const [sessionId, profile] of this.sessionProfiles.entries()) {
      if (new Date(profile.startTime).getTime() < cutoff) {
        this.sessionProfiles.delete(sessionId);
      }
    }
    
    console.log('🧹 Personalization cleanup completed');
  }
}

// Create singleton instance
const searchPersonalization = new SearchPersonalization();

// Auto-cleanup every hour
setInterval(() => {
  searchPersonalization.cleanup();
}, 60 * 60 * 1000);

export { searchPersonalization, SearchPersonalization };
# Filtering System Fixes - Implementation Guide

## Critical Fix 1: Unified Filtering Layer

### Problem
Filters are only applied to Apify businesses, not to registered or public businesses from the local database.

### Solution
Add a unified filtering function that applies to all business types after they are combined.

### Implementation

**File**: `/server/routes.ts`

**Add after line 438** (replace the `combinedResults` assignment):

```typescript
// Unified filtering function that applies to all business types
const applyUnifiedFilters = (businesses: any[], searchQuery: SearchQuery): any[] => {
  return businesses.filter(business => {
    // Rating filter - convert string ratings to numbers for comparison
    if (searchQuery.minRating && searchQuery.minRating > 0) {
      const rating = parseFloat(business.rating || '0');
      if (rating < searchQuery.minRating) return false;
    }

    // Price filter - handle missing priceLevel gracefully
    if (searchQuery.maxPrice && searchQuery.maxPrice < 5) {
      const priceLevel = business.priceLevel || 0;
      if (priceLevel > searchQuery.maxPrice) return false;
    }

    // Contact filters - check for existence and non-empty values
    if (searchQuery.hasPhone) {
      if (!business.phone || business.phone.trim() === '') return false;
    }
    
    if (searchQuery.hasWebsite) {
      if (!business.website || business.website.trim() === '') return false;
    }
    
    if (searchQuery.hasEmail) {
      if (!business.email || business.email.trim() === '') return false;
    }

    // Open now filter - only apply to businesses with openNow data
    if (searchQuery.openNow) {
      if (business.type === 'registered' || business.type === 'public') {
        // For registered/public businesses without openNow data, exclude them
        // This prevents false positives until business hours are implemented
        return false;
      }
      if (business.openNow !== true) return false;
    }

    // District filter - improved matching logic
    if (searchQuery.district && searchQuery.district !== 'all') {
      if (!business.address) return false;
      
      const addressLower = business.address.toLowerCase();
      const districtLower = searchQuery.district.toLowerCase();
      
      // Use word boundary matching to avoid false positives
      const districtRegex = new RegExp(`\\b${districtLower}\\b`, 'i');
      if (!districtRegex.test(addressLower)) {
        // Also check for common district variations
        const districtVariations = {
          'miraflores': ['miraflores'],
          'san juan de miraflores': ['san juan de miraflores', 'sjm'],
          'san isidro': ['san isidro'],
          'san miguel': ['san miguel'],
          'san borja': ['san borja'],
          'surco': ['surco', 'santiago de surco'],
          'la molina': ['la molina'],
          'barranco': ['barranco'],
          'jesus maria': ['jesus maria', 'jesús maría'],
          'magdalena': ['magdalena'],
          'pueblo libre': ['pueblo libre'],
          'lince': ['lince'],
          'breña': ['breña', 'brena'],
          'callao': ['callao'],
          'chorrillos': ['chorrillos']
        };
        
        const variations = districtVariations[districtLower] || [districtLower];
        const matchesVariation = variations.some(variation => {
          const variationRegex = new RegExp(`\\b${variation}\\b`, 'i');
          return variationRegex.test(addressLower);
        });
        
        if (!matchesVariation) return false;
      }
    }

    return true;
  });
};

// Apply category normalization
const normalizeCategory = (category: string): string => {
  const categoryMap = {
    'gastronomía': 'gastronomia',
    'belleza': 'belleza',
    'salud': 'salud',
    'fitness': 'fitness',
    'restaurante': 'gastronomia',
    'comida': 'gastronomia',
    'servicios': 'servicios',
    'automotriz': 'automotriz'
  };
  
  return categoryMap[category.toLowerCase()] || category.toLowerCase();
};

// Normalize categories for all businesses
const normalizedResults = [
  ...businessesWithCustomUrl.map(b => ({ ...b, category: normalizeCategory(b.category) })),
  ...publicBusinesses.map(p => ({ ...p, category: normalizeCategory(p.category), type: "public" })),
  ...formattedResults.map(f => ({ ...f, category: normalizeCategory(f.category) }))
];

// Apply unified filters to combined results
const filteredResults = applyUnifiedFilters(normalizedResults, searchQuery);
```

**Replace the response** (around line 440):

```typescript
res.json({
  results: filteredResults, // Use filtered results instead of combinedResults
  pagination: {
    currentPage: searchResult.page,
    totalPages: searchResult.totalPages,
    totalResults: filteredResults.length, // Update to reflect filtered count
    actualResults: filteredResults.length,
    resultsPerPage: parseInt(limit as string),
    hasNextPage: searchResult.hasMore,
    hasPrevPage: searchResult.page > 1,
    mightHaveMore: searchResult.hasMore
  },
  searchMetrics: {
    searchTime: searchResult.searchMetrics.searchTime,
    totalMatches: filteredResults.length, // Update to reflect filtered count
    queryAnalysis: searchResult.searchMetrics.queryAnalysis,
    averageRelevanceScore: searchResult.searchMetrics.relevanceScores.length > 0 
      ? (searchResult.searchMetrics.relevanceScores.reduce((a, b) => a + b, 0) / searchResult.searchMetrics.relevanceScores.length).toFixed(1)
      : 0
  }
});
```

## Fix 2: Enhanced District Filtering

### Problem
Current district filtering uses simple string matching which causes false positives.

### Solution
Implement proper district matching with word boundaries and variations.

### Implementation

**File**: `/server/enhanced-search-engine.ts`

**Replace the district filtering condition** (around line 375):

```typescript
// Location filters
if (searchQuery.district && searchQuery.district !== 'all') {
  const districtLower = searchQuery.district.toLowerCase();
  
  // Create a more specific district matching condition
  const districtCondition = or(
    // Word boundary matching for exact district names
    sql`LOWER(${apifyBusinesses.address}) ~ ${`\\b${districtLower}\\b`}`,
    
    // Handle common district variations
    ...getDistrictVariations(districtLower).map(variation => 
      sql`LOWER(${apifyBusinesses.address}) ~ ${`\\b${variation}\\b`}`
    )
  );
  
  conditions.push(districtCondition);
}
```

**Add helper function to enhanced-search-engine.ts**:

```typescript
private static getDistrictVariations(district: string): string[] {
  const variations = {
    'miraflores': ['miraflores'],
    'san juan de miraflores': ['san juan de miraflores', 'sjm'],
    'san isidro': ['san isidro'],
    'san miguel': ['san miguel'],
    'san borja': ['san borja'],
    'surco': ['surco', 'santiago de surco'],
    'la molina': ['la molina'],
    'barranco': ['barranco'],
    'jesus maria': ['jesus maria', 'jesús maría'],
    'magdalena': ['magdalena'],
    'pueblo libre': ['pueblo libre'],
    'lince': ['lince'],
    'breña': ['breña', 'brena'],
    'callao': ['callao'],
    'chorrillos': ['chorrillos']
  };
  
  return variations[district] || [district];
}
```

## Fix 3: Map Bounds Filtering

### Problem
Map bounds filtering doesn't work for registered businesses.

### Solution
Add geographic filtering to the unified filtering layer.

### Implementation

**Add to the unified filtering function**:

```typescript
// Map bounds filter - check if business is within specified coordinates
if (searchQuery.bounds) {
  const bounds = typeof searchQuery.bounds === 'string' 
    ? JSON.parse(searchQuery.bounds) 
    : searchQuery.bounds;
    
  const lat = parseFloat(business.location?.lat || business.latitude || '0');
  const lng = parseFloat(business.location?.lng || business.longitude || '0');
  
  // Skip businesses without location data
  if (lat === 0 && lng === 0) return false;
  
  // Check if business is within bounds
  if (lat < bounds.south || lat > bounds.north || 
      lng < bounds.west || lng > bounds.east) {
    return false;
  }
}
```

## Fix 4: Update SearchQuery Interface

### Problem
The SearchQuery interface needs to include the bounds parameter.

### Solution
Update the interface in enhanced-search-engine.ts.

### Implementation

**File**: `/server/enhanced-search-engine.ts`

**Update the SearchQuery interface** (around line 17):

```typescript
interface SearchQuery {
  query?: string;
  category?: string;
  subcategory?: string;
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
  bounds?: string | { north: number; south: number; east: number; west: number; }; // Add bounds parameter
}
```

## Testing the Fixes

After implementing these fixes, test with these commands:

```bash
# Test rating filter (should work for all business types)
curl -s "http://localhost:5000/api/search?minRating=4&limit=3"

# Test district filter (should avoid false positives)
curl -s "http://localhost:5000/api/search?district=miraflores&limit=3"

# Test contact filters (should work for all business types)
curl -s "http://localhost:5000/api/search?hasPhone=true&limit=3"

# Test combined filters
curl -s "http://localhost:5000/api/search?category=belleza&minRating=4&hasPhone=true&limit=3"

# Test map bounds
curl -s "http://localhost:5000/api/search?bounds={\"north\":-12.0,\"south\":-12.1,\"east\":-77.0,\"west\":-77.1}&limit=3"
```

## Expected Results

After implementing these fixes:

1. **Rating filter**: Should exclude businesses with ratings below the specified minimum across all business types
2. **District filter**: Should provide more accurate district matching with fewer false positives
3. **Contact filters**: Should work consistently across all business types
4. **Combined filters**: Should apply ALL filters to ALL business types
5. **Map bounds**: Should work for all businesses with location data

## Performance Impact

- **Minimal**: The unified filtering happens after database queries, so it doesn't impact database performance
- **Client-side**: Results are pre-filtered, reducing client-side processing
- **Memory**: Slight increase in memory usage due to additional filtering operations

## Migration Notes

1. These changes are backward compatible
2. No database schema changes required
3. Frontend code doesn't need modifications
4. API response format remains the same

## Rollback Plan

If issues arise:
1. Comment out the unified filtering function
2. Revert to using `combinedResults` directly
3. The system will return to the previous (partially working) state
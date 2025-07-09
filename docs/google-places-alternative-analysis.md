# Google Places API Alternative Analysis

## Current Situation

### Problems with Google Places API
1. **Cost**: No free tier, charges from the first request
2. **Pricing**: 
   - Text Search: $32 per 1,000 requests
   - Nearby Search: $32 per 1,000 requests
   - Place Details: $17 per 1,000 requests
3. **Monthly Cost Estimate**: For a small app with 1,000 searches/day = ~$960/month

### Current Implementation Issues
- Limited to 60 results per search (3 pages × 20 results)
- Expensive grid-based searches multiply API calls
- Each business detail request adds cost
- No way to cache effectively due to Google's ToS

## Alternative Services Analysis

### 1. OpenStreetMap + Overpass API
**Pros:**
- ✅ 100% FREE - No API limits
- ✅ No registration required
- ✅ Can query large areas efficiently
- ✅ Good coverage in Lima metropolitan area
- ✅ Returns all results (no pagination limits)

**Cons:**
- ❌ Limited business details (no reviews, photos, hours)
- ❌ Data quality varies (community-driven)
- ❌ No phone numbers for most businesses
- ❌ Complex query syntax

**Best for:** Base layer of business discovery

### 2. Foursquare Places API
**Pros:**
- ✅ 100,000 requests/month free tier
- ✅ Excellent business data (photos, tips, ratings)
- ✅ Good coverage in Lima
- ✅ Regular data updates
- ✅ Business hours and contact info

**Cons:**
- ❌ Limited to 50 results per search
- ❌ Rate limits (500 requests/hour)
- ❌ Requires API key

**Best for:** Enriching business details

### 3. Mapbox Search API
**Pros:**
- ✅ 100,000 requests/month free
- ✅ Good geocoding capabilities
- ✅ POI search with categories
- ✅ Address autosuggest

**Cons:**
- ❌ Limited business details
- ❌ Fewer POIs than Google
- ❌ Focus on navigation, not business discovery

### 4. HERE Places API
**Pros:**
- ✅ 250,000 transactions/month free
- ✅ Good global coverage
- ✅ Business categories and basic info

**Cons:**
- ❌ Limited detail compared to Google
- ❌ Fewer user reviews
- ❌ Complex pricing after free tier

## Recommended Solution: Hybrid Approach

### Architecture: Overpass API + Foursquare

```
User Search
    ↓
Overpass API (Free)
- Get all businesses in area
- Basic info (name, location, type)
- No limits on results
    ↓
Filter & Rank Results
    ↓
Foursquare API (Top 20-30)
- Get ratings, photos, hours
- Phone numbers
- User tips/reviews
    ↓
Combined Results to User
```

### Implementation Strategy

1. **Primary Search: Overpass API**
   - Query by location + business type
   - Get comprehensive list of businesses
   - Cache results by geographic area

2. **Enhancement: Foursquare API**
   - Enrich top 20-30 results per search
   - Get photos, ratings, hours
   - Cache enhanced details for 24 hours

3. **Fallback: Local Database**
   - Store previously fetched businesses
   - Build local knowledge base over time

### Cost Comparison

| Service | Monthly Searches | Monthly Cost |
|---------|-----------------|--------------|
| Google Places | 30,000 | ~$960 |
| Overpass + Foursquare | Unlimited + 100k | $0 |
| Savings | - | $960/month |

### Technical Implementation

1. **Overpass API Queries**
```
// Find restaurants in Lima
[out:json];
(
  node["amenity"="restaurant"](area:3600288247);
  way["amenity"="restaurant"](area:3600288247);
);
out body;
```

2. **Foursquare Integration**
```typescript
// Search for venue details
GET https://api.foursquare.com/v3/places/search
Headers: Authorization: fsq3...
Params: ll=-12.0464,-77.0428&categories=13065&limit=20
```

3. **Caching Strategy**
- Cache Overpass results by geohash (geographic tiles)
- Cache Foursquare details for 24 hours
- Build progressive enhancement

### Data Mapping

| Google Places | Overpass | Foursquare |
|--------------|----------|------------|
| place_id | @id | fsq_id |
| name | name | name |
| formatted_address | addr:* tags | location.formatted_address |
| rating | - | rating |
| user_ratings_total | - | stats.total_ratings |
| photos | - | photos |
| opening_hours | opening_hours | hours |
| phone_number | phone | tel |
| website | website | website |
| types | amenity/shop | categories |

### Migration Plan

1. **Phase 1: Add Overpass API**
   - Implement Overpass service
   - Create query builders for different categories
   - Test coverage in Lima

2. **Phase 2: Add Foursquare Enhancement**
   - Implement Foursquare service
   - Add detail fetching for top results
   - Handle rate limits

3. **Phase 3: Remove Google Places**
   - Switch search endpoints
   - Update caching logic
   - Remove Google Places dependencies

### Expected Results

1. **Coverage**: Better (unlimited results vs 60)
2. **Cost**: Free vs $960/month
3. **Data Quality**: Slightly lower but acceptable
4. **Performance**: Similar (with proper caching)

### Risks and Mitigations

1. **Risk**: Missing some businesses
   - **Mitigation**: Allow users to add missing businesses

2. **Risk**: Less detailed information
   - **Mitigation**: Progressive enhancement with Foursquare

3. **Risk**: Overpass API downtime
   - **Mitigation**: Implement fallback to cached data

### Conclusion

The Overpass + Foursquare combination provides:
- ✅ Comprehensive business coverage
- ✅ Zero monthly cost
- ✅ Sufficient detail for user needs
- ✅ Scalable architecture

This solution trades some data richness for massive cost savings while maintaining good user experience.
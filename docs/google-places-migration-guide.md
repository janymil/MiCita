# Google Places API Migration Guide

## Overview

We've successfully replaced Google Places API with a combination of:
- **Overpass API (OpenStreetMap)**: Free, unlimited searches
- **Foursquare API**: Free tier with 100k requests/month for business details

## Implementation Summary

### 1. New Services Created

#### Overpass API Service (`server/overpass-api-service.ts`)
- Searches OpenStreetMap data
- No API key required
- Returns all businesses in an area (no pagination limits)
- Provides basic info: name, location, category, address

#### Foursquare API Service (`server/foursquare-api-service.ts`)
- Enriches business data with ratings, photos, hours
- Requires API key (free tier available)
- Provides detailed business information

### 2. How It Works

```
User Search → Overpass API → Get all businesses
                ↓
         Foursquare API → Enrich top 30 results
                ↓
           Cache Results → Store for 24 hours
                ↓
          Return to User
```

### 3. Setup Instructions

#### Step 1: Get Foursquare API Key
1. Go to https://foursquare.com/developers/apps
2. Create a new app
3. Copy the API key

#### Step 2: Configure Environment
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your Foursquare API key
FOURSQUARE_API_KEY=fsq3xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Step 3: No Additional Setup!
- Overpass API works without configuration
- The system will automatically use the new services

### 4. Benefits

1. **Cost Savings**: $0/month vs $960/month with Google
2. **More Results**: Unlimited results vs 60 max
3. **Better Coverage**: Full Lima coverage with grid search
4. **No Page Reloads**: Smooth map interactions

### 5. Data Mapping

| Feature | Google Places | New Solution |
|---------|--------------|--------------|
| Business Name | ✓ | ✓ (OSM + Foursquare) |
| Address | ✓ | ✓ (OSM) |
| Phone | ✓ | ✓ (Foursquare) |
| Website | ✓ | ✓ (Foursquare) |
| Rating | ✓ | ✓ (Foursquare) |
| Photos | ✓ | ✓ (Foursquare) |
| Hours | ✓ | ✓ (Foursquare) |
| Reviews | ✓ | ✗ (Not in free tier) |

### 6. Search Examples

#### Basic Search
```
Query: "barberia"
Result: All barber shops in Lima from OSM + ratings/photos from Foursquare
```

#### Category Search
```
Category: "belleza"
Result: All beauty salons, hair salons, spas in the area
```

#### Map-based Search
```
Action: Move map to Miraflores
Result: Real-time search of visible area without page reload
```

### 7. Troubleshooting

**Q: No photos showing?**
A: Check if FOURSQUARE_API_KEY is set correctly

**Q: Search returns no results?**
A: Overpass API might be temporarily down. Results will come from cache.

**Q: How to add missing businesses?**
A: Users can register their business through the platform

### 8. Future Improvements

1. Add more photo sources (Unsplash API for categories)
2. Implement user-submitted photos
3. Add review system to replace Google reviews
4. Consider adding Yelp API for additional data

### 9. Monitoring Usage

Foursquare API usage can be monitored at:
https://foursquare.com/developers/apps/[your-app-id]/analytics

Free tier limits:
- 100,000 API calls/month
- 500 API calls/hour

With caching, this should be more than sufficient for normal usage.
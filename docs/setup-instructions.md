# Setup Instructions for New Search System

## 🚀 Quick Start

Your search system now uses **free APIs** instead of expensive Google Places API!

### ✅ **What's Already Working**
- **OpenStreetMap (Overpass API)**: Already working, no setup needed
- **Modern search interface**: Airbnb-style design
- **Interactive map**: OpenStreetMap with custom markers
- **Unlimited results**: No more 60-result limit

### 🔧 **Optional: Add Foursquare for Enhanced Data**

To get business photos, ratings, and hours (100k requests/month free):

1. **Get API Key**:
   - Visit: https://foursquare.com/developers/apps
   - Create account and new app
   - Copy the API key (starts with `fsq3...`)

2. **Add to Environment**:
   ```bash
   # Edit your .env file
   FOURSQUARE_API_KEY=fsq3xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. **Restart Server**:
   ```bash
   npm run dev
   ```

### 🧪 **Test the APIs**

Visit: `http://localhost:5173/api/test-apis`

You should see:
```json
{
  "overpass": {
    "working": true,
    "count": 150,
    "sample": [...]
  },
  "foursquare": {
    "working": true,
    "count": 5,
    "sample": [...],
    "apiKeyConfigured": true
  }
}
```

### 🔍 **Test Search**

1. Go to `/buscar` 
2. Search for "barberia" or "restaurant"
3. You should see:
   - **Hundreds of results** (not just 60!)
   - **Modern card design**
   - **Interactive map** without page reloads
   - **Photos and ratings** (if Foursquare is configured)

## 💰 **Cost Comparison**

| Feature | Google Places | New System |
|---------|---------------|------------|
| **Monthly Cost** | $960 | $0 |
| **Search Limit** | 60 results max | Unlimited |
| **API Calls** | $32 per 1k | Free |
| **Setup Complexity** | High | None |

## 🆘 **Troubleshooting**

### **No photos showing?**
- Foursquare API key not configured (optional)
- Check `.env` file has correct key

### **Search returns few results?**
- OpenStreetMap data varies by area
- More businesses will appear as OSM data improves

### **Map not loading?**
- Check internet connection
- OpenStreetMap tiles loading from CDN

### **API test fails?**
```bash
# Check API test endpoint
curl http://localhost:5173/api/test-apis
```

## 🎯 **Benefits You'll See**

1. **More Results**: Complete coverage of Lima businesses
2. **Better UX**: No page reloads, smooth animations
3. **Modern Design**: Airbnb-style cards and interactions
4. **Mobile Friendly**: Responsive on all devices
5. **Fast Performance**: Cached results, optimized loading
6. **Zero Cost**: No more API bills!

The system is ready to use immediately with OpenStreetMap. Adding Foursquare enhances the experience with photos and ratings but is optional.
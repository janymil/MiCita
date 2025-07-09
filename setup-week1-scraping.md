# Week 1 Scraping Setup Guide

## 🚀 Quick Start for Week 1 Apify Scraping

### Prerequisites
- ✅ Apify account with API token
- ✅ Database running with apifyBusinesses table
- ✅ Server running on http://localhost:5173

### Step 1: Get Apify API Token

1. **Create Apify Account**:
   - Go to https://apify.com/
   - Sign up for a free account
   - Free tier includes 10 credits (~$2)

2. **Get API Token**:
   - Visit https://console.apify.com/account/integrations
   - Copy your API token (starts with `apify_api_`)

3. **Add to Environment**:
   ```bash
   # Add to your .env file
   APIFY_API_TOKEN=apify_api_your_token_here
   ```

### Step 2: Initialize Database

Run the database migration to create the apifyBusinesses table:

```bash
# Option 1: Manual SQL
psql -d your_database -f migrations/create-apify-businesses.sql

# Option 2: Using Drizzle (if configured)
npm run db:push
```

### Step 3: Start Week 1 Scraping

#### Option A: Using Test Script (Recommended)
```bash
# Run the automated test script
node test-apify-week1.js
```

#### Option B: Manual API Calls
```bash
# Test API integration
curl -X GET http://localhost:5173/api/test-apis

# Check wave status
curl -X GET http://localhost:5173/api/apify/waves

# Execute Wave 1 (Lima Premium Districts)
curl -X POST http://localhost:5173/api/apify/waves/wave-1-lima-premium/execute

# Execute Wave 2 (Lima Business Centers)
curl -X POST http://localhost:5173/api/apify/waves/wave-2-lima-business/execute
```

#### Option C: Admin Dashboard
```bash
# Open in browser
http://localhost:5173/admin/apify-scraping
```

### Step 4: Monitor Progress

The scraping process will:
1. **Wave 1**: Target 2,000 businesses in premium Lima districts
2. **Wave 2**: Target 1,500 businesses in business centers
3. **Total**: ~3,500 businesses with phone numbers, websites, photos

**Expected Timeline**:
- Wave 1: 2-3 hours
- Wave 2: 2-3 hours
- Total: 4-6 hours

### Step 5: Verify Results

After completion, test the search functionality:

```bash
# Test search with new data
curl "http://localhost:5173/api/search?q=barberia&category=belleza"

# Should return many results from Lima premium districts
```

## 📊 Expected Results

### Wave 1: Lima Premium Districts
- **Districts**: Miraflores, San Isidro, La Molina, Surco, Barranco
- **Businesses**: ~2,000
- **Quality**: 70%+ with phone numbers, 50%+ with websites
- **Credits**: ~40 ($8)

### Wave 2: Lima Business Centers  
- **Districts**: Centro de Lima, Lince, Jesús María, Magdalena
- **Businesses**: ~1,500
- **Quality**: 80%+ with phone numbers, 40%+ with websites
- **Credits**: ~30 ($6)

### Total Week 1 Results
- **📍 Coverage**: 9 Lima districts
- **🏢 Businesses**: 3,500+
- **💰 Cost**: ~$14 (70 credits)
- **📞 Phone Numbers**: 2,500+ businesses
- **🌐 Websites**: 1,400+ businesses

## 🔧 Troubleshooting

### Common Issues

**1. "APIFY_API_TOKEN not found"**
```bash
# Solution: Add token to .env file
echo "APIFY_API_TOKEN=your_token_here" >> .env
```

**2. "Database connection error"**
```bash
# Solution: Check database is running
pg_isready -h localhost -p 5432
```

**3. "Actor not found"**
```bash
# Solution: Check Apify actor exists
# We use: compass/crawler-google-places
```

**4. "Insufficient credits"**
```bash
# Solution: Check Apify account credits
# Visit: https://console.apify.com/account/billing
```

### Performance Tips

1. **Monitor Credits**: Each wave uses ~30-50 credits
2. **Batch Processing**: Waves run in batches to avoid rate limits
3. **Quality Focus**: Premium districts have better data quality
4. **Error Handling**: Failed businesses are logged but don't stop the wave

## 🎯 Success Criteria

After Week 1, you should have:
- ✅ 3,500+ businesses in database
- ✅ Fast search results (< 1 second)
- ✅ Rich business data (photos, ratings, hours)
- ✅ Complete Lima premium coverage
- ✅ Foundation for Week 2 expansion

## 🚀 Next Steps

After Week 1 completion:
1. **Week 2**: Popular Lima districts + Beauty/Wellness focus
2. **Week 3**: Secondary cities + Professional services
3. **Week 4**: Food/Hospitality + Niche services
4. **Final Goal**: 10,000+ businesses across Peru

---

**Need Help?**
- Check logs in terminal for detailed progress
- Visit admin dashboard for real-time monitoring
- Review API responses for error details
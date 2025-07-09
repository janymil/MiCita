# 🚀 Complete Scraping Execution Guide

## **Overview**
This guide covers the new category-based scraping system that provides balanced coverage across all business types in Lima Metropolitana.

## **✅ What You Get**

### **Balanced Category Coverage**
- **Belleza**: 3,000-4,000 businesses (instead of 80%)
- **Salud**: 2,500-3,500 businesses 
- **Gastronomía**: 4,000-5,000 businesses
- **Fitness**: 1,500-2,000 businesses
- **Automotriz**: 2,000-2,500 businesses
- **Servicios**: 3,000-4,000 businesses
- **Comercio**: 2,500-3,500 businesses
- **Turismo**: 1,000-1,500 businesses

### **Complete Geographic Coverage**
- **All 49 Lima districts** including:
  - Premium districts (Miraflores, San Isidro, etc.)
  - Working-class districts (Carabayllo, Ancón, etc.)
  - All zones: Norte, Sur, Este, Centro, Oeste

### **Enhanced Data Quality**
- **Original categories preserved** as subcategories
- **Logical main categories** for organization
- **Complete business information**: phone, website, photos, hours, ratings
- **Social media profiles** and contact enrichment

## **📁 Files Created**

### **Documentation**
- `LIMA-BUSINESS-CATEGORIES.md` - Complete category system
- `SCRAPING-EXECUTION-GUIDE.md` - This file

### **Individual Category Scrapers**
- `scrapers/belleza-scraper.js` - Beauty businesses
- `scrapers/salud-scraper.js` - Health businesses  
- `scrapers/gastronomia-scraper.js` - Food businesses
- `scrapers/fitness-scraper.js` - Fitness businesses
- `scrapers/automotriz-scraper.js` - Automotive businesses
- `scrapers/servicios-scraper.js` - Professional services
- `scrapers/comercio-scraper.js` - Retail businesses
- `scrapers/turismo-scraper.js` - Tourism businesses

### **Master Controller**
- `scrapers/master-scraper.js` - Executes all scrapers in sequence

## **🚀 How to Execute**

### **Option 1: Run All Categories (Recommended)**
```bash
# Run all category scrapers in sequence
npx tsx scrapers/master-scraper.js
```

**What it does:**
- Executes all 8 category scrapers automatically
- Balanced coverage across all business types
- Total: 15,000-20,000 businesses
- Cost: ~$100-150 (500-750 credits)
- Duration: 4-6 hours

### **Option 2: Run Individual Categories**
```bash
# Run specific category scrapers
npx tsx scrapers/belleza-scraper.js      # Beauty businesses
npx tsx scrapers/salud-scraper.js        # Health businesses
npx tsx scrapers/gastronomia-scraper.js  # Food businesses
npx tsx scrapers/fitness-scraper.js      # Fitness businesses
npx tsx scrapers/automotriz-scraper.js   # Automotive businesses
npx tsx scrapers/servicios-scraper.js    # Professional services
npx tsx scrapers/comercio-scraper.js     # Retail businesses
npx tsx scrapers/turismo-scraper.js      # Tourism businesses
```

## **💰 Cost Breakdown**

| Category | Expected Businesses | Cost | Credits |
|----------|-------------------|------|---------|
| Belleza | 3,000-4,000 | $20-25 | 100-125 |
| Salud | 2,500-3,500 | $15-20 | 75-100 |
| Gastronomía | 4,000-5,000 | $25-30 | 125-150 |
| Fitness | 1,500-2,000 | $10-15 | 50-75 |
| Automotriz | 2,000-2,500 | $12-18 | 60-90 |
| Servicios | 3,000-4,000 | $18-25 | 90-125 |
| Comercio | 2,500-3,500 | $15-22 | 75-110 |
| Turismo | 1,000-1,500 | $8-12 | 40-60 |
| **TOTAL** | **15,000-20,000** | **$100-150** | **500-750** |

## **🎯 Key Improvements**

### **Before (Current System)**
- ❌ 80% beauty businesses (unbalanced)
- ❌ Only 5 premium districts
- ❌ Limited to 2,000 businesses
- ❌ Single wave approach

### **After (New System)**
- ✅ Balanced 12.5% per category
- ✅ All 49 Lima districts
- ✅ 15,000-20,000 businesses
- ✅ Category-specific approach

## **📊 Expected Results**

### **Database Structure**
```sql
-- Main categories (logical grouping)
category: 'belleza', 'salud', 'gastronomia', 'fitness', 'automotriz', 'servicios', 'comercio', 'turismo'

-- Subcategories (original scraped categories)
subcategory: 'Barbería', 'Centro de estética', 'Restaurante', 'Clínica', etc.
```

### **Geographic Distribution**
- **Lima Norte**: 20% of businesses
- **Lima Sur**: 25% of businesses  
- **Lima Este**: 20% of businesses
- **Lima Centro**: 25% of businesses
- **Lima Oeste**: 10% of businesses

## **🔧 Technical Details**

### **Search Strategy**
Each scraper generates searches like:
- `barbería Lima` (city-level)
- `barbería Miraflores Lima` (district-level)
- `barbería Carabayllo Lima` (district-level)
- `restaurante San Juan de Lurigancho Lima`

### **Deduplication**
- **Automatic**: Uses `place_id` unique constraint
- **Cross-category**: Same business won't be duplicated across categories
- **Updates**: Existing businesses get enhanced with new data

### **Rate Limiting**
- **3-second delays** between batches
- **30-second delays** between scrapers
- **Batch processing** to avoid API limits

## **🚨 Important Notes**

### **Prerequisites**
1. **APIFY_API_TOKEN** must be set in environment/secrets
2. **Sufficient credits** in Apify account (500-750 credits)
3. **Database space** for 15,000-20,000 businesses
4. **Stable internet** for 4-6 hour execution

### **Monitoring**
- **Progress logs** show batch completion
- **Error handling** continues on individual failures
- **Final reports** show total results
- **Database counts** updated in real-time

### **Recovery**
- **Individual scrapers** can be re-run if they fail
- **Deduplication** prevents duplicate businesses
- **Incremental updates** enhance existing data

## **🎉 After Completion**

### **Your Database Will Have:**
- ✅ **15,000-20,000 businesses** across Lima
- ✅ **Balanced category distribution**
- ✅ **Complete geographic coverage**
- ✅ **Enhanced business data**
- ✅ **Original categories preserved**

### **Ready For:**
- 🔍 **Comprehensive search** across all categories
- 📱 **Mobile app** with full Lima coverage
- 🎯 **Targeted marketing** by category/district
- 📊 **Business analytics** and insights
- 🚀 **Booking system** integration

## **🚀 Next Steps**

1. **Execute the scrapers** using the master script
2. **Monitor progress** through console logs
3. **Verify results** in your database
4. **Test search functionality** across categories
5. **Deploy your app** with comprehensive coverage!

---

**Ready to scrape all of Lima's businesses? Run the master scraper and get comprehensive coverage across all categories and districts!**
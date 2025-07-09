# 🚀 Enhanced Apify Scraping Guide

## Overview
This guide covers the enhanced Apify scraping system with maximum data extraction capabilities. All old test scripts have been removed to avoid confusion.

## 📁 Current Scripts

### Production Script
- **`run-enhanced-wave1.js`** - Enhanced Wave 1 execution with maximum data extraction

### Configuration Files
- **`postcss.config.js`** - PostCSS configuration (frontend)

### Documentation
- **`ENHANCED-SCRAPING-COMPARISON.md`** - Feature comparison and ROI analysis
- **`docs/apify-scraping-prd.md`** - Complete product requirements
- **`docs/week1-scraping-plan.md`** - Week 1 implementation plan
- **`setup-week1-scraping.md`** - Setup instructions

## 🚀 How to Execute Enhanced Wave 1

### Prerequisites
1. **Apify API Token** in `.env` file:
   ```bash
   APIFY_API_TOKEN=your_token_here
   ```

2. **Database connection** configured in `DATABASE_URL`

### Execute Enhanced Scraping
```bash
# Run Enhanced Wave 1 with maximum data extraction
node run-enhanced-wave1.js
```

## 📊 What You Get

### Enhanced Features
- 📧 **Email addresses** (40% coverage)
- 📱 **Social media profiles** (Facebook, Instagram, etc.)
- 📸 **10 photos per business** (vs 2 standard)
- ⏰ **Busy hours data** for optimal booking
- 🗺️ **Street View URLs** for visual verification
- ♿ **Accessibility & amenities** data
- 📊 **Review sentiment analysis**

### Cost
- **$12 total** (60 credits)
- **$4 additional** for enhanced features
- **1,100% ROI** on the $4 investment

### Results
- **2,000 businesses** in Lima premium districts
- **800+ email addresses** for marketing
- **20,000+ photos** for rich profiles
- **Comprehensive business intelligence**

## 🎯 Target Districts

- **Miraflores** - Premium tourist district
- **San Isidro** - Financial center
- **La Molina** - Upscale residential
- **Santiago de Surco** - Modern commercial
- **Barranco** - Cultural neighborhood

## 🏢 Business Categories

- **Belleza** - Hair salons, spas, beauty centers
- **Salud** - Clinics, dentists, pharmacies
- **Gastronomía** - Restaurants, cafes, bars
- **Fitness** - Gyms, yoga studios, sports centers
- **Servicios** - Professional services, repairs
- **Automotriz** - Car services, mechanics

## ✅ Deduplication

- **Automatic deduplication** via `place_id` unique constraint
- **No duplicates** will be created
- **Existing 491 businesses** will be updated with enhanced data
- **~1,500 new businesses** will be added

## 🔄 Next Steps

After Wave 1 completion:
1. Test search functionality with enhanced data
2. Verify email addresses and social media profiles
3. Check busy hours data for booking optimization
4. Prepare for Wave 2 execution

## 📞 Support

If you encounter issues:
1. Check that `APIFY_API_TOKEN` is set in `.env`
2. Verify database connection is working
3. Ensure sufficient Apify credits (~60 credits needed)
4. Check terminal output for detailed error messages

---

**All old test scripts have been removed to avoid confusion. Use only `run-enhanced-wave1.js` for production scraping.**
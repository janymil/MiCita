# Week 1 Scraping Implementation Plan

## Overview
Based on the Apify Scraping PRD, Week 1 focuses on Lima's premium and business districts to establish a strong foundation of high-quality business data.

## Week 1 Execution Plan

### Wave 1: Lima Premium Districts (Days 1-2)
**Target**: High-income areas with established businesses
- **Districts**: Miraflores, San Isidro, La Molina, Surco, Barranco
- **Categories**: All business types (belleza, salud, gastronomia, fitness, servicios)
- **Expected Results**: 2,000 businesses
- **Estimated Credits**: 40 credits

### Wave 2: Lima Business Centers (Days 3-4)
**Target**: Commercial and financial districts
- **Districts**: Centro de Lima, Lince, Jesús María, Magdalena
- **Categories**: Professional services, restaurants, retail
- **Expected Results**: 1,500 businesses
- **Estimated Credits**: 30 credits

## Implementation Steps

### 1. Pre-requisites Check
- ✅ Apify Wave Scraper service implemented
- ✅ Database schema with apifyBusinesses table
- ✅ API endpoints for wave execution
- ⚠️ **Need**: APIFY_API_TOKEN environment variable

### 2. Environment Setup
```bash
# Add to .env file
APIFY_API_TOKEN=your_apify_api_token_here
```

### 3. Wave Execution Commands

#### Execute Wave 1 (Lima Premium Districts)
```bash
# Start Wave 1 via API
curl -X POST http://localhost:5173/api/apify/waves/wave-1-lima-premium/execute

# Or via test endpoint
curl -X GET http://localhost:5173/api/apify/waves
```

#### Execute Wave 2 (Lima Business Centers)
```bash
# Start Wave 2 via API
curl -X POST http://localhost:5173/api/apify/waves/wave-2-lima-business/execute
```

### 4. Monitoring Progress
```bash
# Check all waves status
curl -X GET http://localhost:5173/api/apify/waves

# Sample response:
{
  "waves": [
    {
      "id": "wave-1-lima-premium",
      "name": "Lima Premium Districts",
      "progress": {
        "status": "completed",
        "businessesFound": 2150,
        "businessesProcessed": 2089,
        "creditsUsed": 38,
        "errors": []
      }
    }
  ],
  "summary": {
    "totalWaves": 8,
    "completedWaves": 1,
    "totalBusinessesFound": 2150,
    "totalBusinessesProcessed": 2089,
    "totalErrors": 0,
    "estimatedCreditsUsed": 38
  }
}
```

## Search Terms Generated

### Wave 1 Premium Districts
- **Miraflores**: "barbería Miraflores Lima", "restaurante Miraflores Lima", "clínica Miraflores Lima"
- **San Isidro**: "peluquería San Isidro Lima", "gimnasio San Isidro Lima", "consultorio San Isidro Lima"
- **La Molina**: "spa La Molina Lima", "dentista La Molina Lima", "cafetería La Molina Lima"
- **Surco**: "fitness Santiago de Surco Lima", "abogado Santiago de Surco Lima"
- **Barranco**: "restaurante Barranco Lima", "bar Barranco Lima", "galería Barranco Lima"

### Wave 2 Business Centers
- **Centro de Lima**: "inmobiliaria Centro de Lima", "contador Centro de Lima", "farmacia Centro de Lima"
- **Lince**: "consultorio Lince Lima", "panadería Lince Lima", "taller mecánico Lince Lima"
- **Jesús María**: "clínica Jesús María Lima", "restaurante Jesús María Lima"
- **Magdalena**: "servicios Magdalena del Mar Lima", "gasolinera Magdalena del Mar Lima"

## Expected Results

### Wave 1 Quality Metrics
- **Premium Districts**: High phone number coverage (70%+)
- **Business Hours**: Most businesses have complete hours (80%+)
- **Websites**: Higher website coverage (50%+)
- **Photos**: Professional photos available (60%+)

### Wave 2 Quality Metrics
- **Business Centers**: Complete address information (95%+)
- **Professional Services**: Phone numbers essential (80%+)
- **Commercial Areas**: Operating hours critical (90%+)

## Success Criteria

### Quantitative Targets
- ✅ **3,500+ businesses** total from both waves
- ✅ **70%+ phone coverage** in premium districts
- ✅ **50%+ website coverage** in business centers
- ✅ **Complete GPS coordinates** for all businesses
- ✅ **85%+ correct categorization** using our mapping

### Quality Validation
- Manual review of 50 businesses per wave
- Verify phone numbers for 10% sample
- Check address accuracy for all businesses
- Validate business hours format

## Post-Wave Processing

### Data Enhancement
1. **Category Standardization**: Map all businesses to our 6 categories
2. **Address Normalization**: Ensure consistent Lima address format
3. **Duplicate Detection**: Remove businesses with same placeId
4. **Contact Validation**: Flag businesses with phone/website for priority

### Database Optimization
1. **Search Index**: Create search terms index for fast queries
2. **Geographic Index**: Lat/lng indexing for map searches
3. **Category Index**: Fast category-based filtering
4. **Cache Warming**: Pre-populate search caches

## Timeline

### Day 1 (Today)
- ✅ Environment setup and API token configuration
- ✅ Execute Wave 1 (Lima Premium Districts)
- ✅ Monitor progress and handle any issues
- ✅ Initial data quality assessment

### Day 2
- ✅ Complete Wave 1 processing
- ✅ Execute Wave 2 (Lima Business Centers)
- ✅ Data validation and cleanup
- ✅ Search functionality testing

### Days 3-4
- ✅ Complete Wave 2 processing
- ✅ Quality assurance and manual validation
- ✅ Database optimization and indexing
- ✅ Prepare for Week 2 waves

## Cost Tracking

### Estimated Costs
- **Wave 1**: 40 credits (~$8)
- **Wave 2**: 30 credits (~$6)
- **Total Week 1**: 70 credits (~$14)

### Credit Monitoring
- Track actual vs estimated credit usage
- Monitor cost per business acquired
- Optimize search terms for efficiency

## Next Steps

After Week 1 completion:
1. **Data Analysis**: Review coverage and quality metrics
2. **Search Testing**: Verify search functionality works with new data
3. **User Testing**: Test search experience with real Lima data
4. **Week 2 Planning**: Prepare Wave 3 and Wave 4 execution

This foundation will provide 3,500+ high-quality businesses in Lima's most important districts, setting the stage for comprehensive city-wide coverage in subsequent weeks.
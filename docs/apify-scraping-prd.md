# Product Requirements Document: Apify Business Scraping System

## Overview
Comprehensive strategy for scraping authentic business data from Google Places via Apify to build a robust database of 10,000+ businesses across Peru, organized by strategic waves targeting high-value areas and categories.

## Objectives
- **Primary Goal**: Build database of 10,000+ authentic businesses with contact information
- **Coverage**: Complete Lima metropolitan area + major Peruvian cities
- **Quality**: Phone numbers, websites, ratings, photos, and operating hours
- **Cost Efficiency**: Minimize Apify credits while maximizing data quality
- **Timeline**: 4-week implementation across 8 strategic waves

## Wave-Based Scraping Strategy

### Wave 1: Lima Premium Districts (Week 1)
**Target**: High-income areas with established businesses
- **Districts**: Miraflores, San Isidro, La Molina, Surco, Barranco
- **Categories**: All business types
- **Expected Results**: 2,000 businesses
- **Rationale**: Premium areas have highest business registration rates and complete contact information

### Wave 2: Lima Business Centers (Week 1) 
**Target**: Commercial and financial districts
- **Districts**: Centro de Lima, Lince, Jesús María, Magdalena
- **Categories**: Professional services, restaurants, retail
- **Expected Results**: 1,500 businesses
- **Rationale**: High concentration of registered businesses with websites

### Wave 3: Popular Lima Districts (Week 2)
**Target**: High-population residential areas with commercial activity
- **Districts**: San Juan de Lurigancho, Villa El Salvador, San Martín de Porres, Comas
- **Categories**: Essential services (health, beauty, food, automotive)
- **Expected Results**: 2,500 businesses
- **Rationale**: Large population density creates service demand

### Wave 4: Beauty & Wellness Focus (Week 2)
**Target**: Specialized beauty and wellness businesses across all Lima
- **Categories**: Barbershops, hair salons, spas, gyms, yoga studios
- **Location**: All Lima districts
- **Expected Results**: 1,000 businesses
- **Rationale**: High appointment-booking potential for MiCita platform

### Wave 5: Major Secondary Cities (Week 3)
**Target**: Peru's largest cities outside Lima
- **Cities**: Arequipa, Trujillo, Chiclayo, Piura, Iquitos
- **Categories**: All business types with focus on services
- **Expected Results**: 1,500 businesses
- **Rationale**: Establish national presence beyond Lima

### Wave 6: Health & Professional Services (Week 3)
**Target**: High-value service providers across all covered cities
- **Categories**: Medical clinics, dental offices, veterinarians, law firms, accounting
- **Location**: All previously covered areas
- **Expected Results**: 800 businesses
- **Rationale**: Professional services have highest booking values

### Wave 7: Food & Hospitality (Week 4)
**Target**: Restaurant and hospitality businesses
- **Categories**: Restaurants, cafés, bars, catering, food trucks
- **Location**: All covered areas with focus on tourist zones
- **Expected Results**: 1,200 businesses
- **Rationale**: High customer volume and repeat booking potential

### Wave 8: Niche & Specialty Services (Week 4)
**Target**: Specialized services and remaining gaps
- **Categories**: Auto services, home services, education, entertainment
- **Location**: Gap analysis of underrepresented areas
- **Expected Results**: 500 businesses
- **Rationale**: Complete comprehensive coverage

## Technical Implementation

### Apify Actor Configuration
```javascript
{
  "searchStringsArray": [
    "barbería Lima Miraflores",
    "restaurante Lima San Isidro", 
    "clínica dental Lima Surco"
  ],
  "locationQuery": "Lima, Peru",
  "maxPlacesPerSearch": 200,
  "language": "es",
  "allPlacesNoSearchAction": "random",
  "maxReviews": 5,
  "maxImages": 3,
  "exportPlaceUrls": false,
  "additionalInfo": true,
  "reviewsTranslation": "originalAndTranslated"
}
```

### Search Term Strategy

#### Lima Districts Priority List
1. **Tier 1 (Premium)**: Miraflores, San Isidro, La Molina, Surco
2. **Tier 2 (Commercial)**: Centro Lima, Lince, Jesús María, Magdalena  
3. **Tier 3 (Popular)**: SJL, Villa El Salvador, Los Olivos, Independencia

#### Business Categories by Priority
1. **High-Value Services**: Medical, dental, legal, accounting, veterinary
2. **Beauty & Wellness**: Barbershops, salons, spas, gyms, yoga
3. **Food & Beverage**: Restaurants, cafés, bars, bakeries
4. **Automotive**: Mechanics, car wash, gas stations, parts
5. **Retail & Commercial**: Stores, pharmacies, supermarkets
6. **Home Services**: Plumbing, electrical, cleaning, repair

### Data Quality Standards

#### Minimum Requirements per Business
- ✅ Business name and address
- ✅ Category classification 
- ✅ GPS coordinates
- ⭐ Phone number (target: 60% coverage)
- ⭐ Website/social media (target: 40% coverage)
- ⭐ Business hours (target: 70% coverage)
- ⭐ Customer rating (target: 90% coverage)

#### Data Enhancement Pipeline
1. **Primary Scrape**: Basic business information
2. **Contact Enhancement**: Focus on businesses with missing phone/website
3. **Photo Collection**: Download and store business photos
4. **Review Processing**: Extract key customer insights
5. **Category Standardization**: Map to MiCita categories

## Resource Planning

### Apify Credit Estimation
- **Cost per business**: ~0.02 credits (with bulk optimization)
- **Total target**: 10,000 businesses
- **Estimated cost**: 200 credits (~$40)
- **Safety buffer**: 50% = 300 credits (~$60 total)

### Time Allocation
- **Wave execution**: 3-4 days per wave
- **Data processing**: 1 day per wave  
- **Quality validation**: 1 day per wave
- **System integration**: 1 day per wave

### Storage Requirements
- **Database storage**: ~50MB for 10,000 businesses
- **Photo storage**: ~2GB (200 photos avg per business)
- **Backup storage**: 100% redundancy

## Success Metrics

### Quantity Targets
- ✅ **10,000+ total businesses** across all waves
- ✅ **60% with phone numbers** (6,000 businesses)
- ✅ **40% with websites** (4,000 businesses)
- ✅ **80% Lima coverage** (8,000 Lima businesses)
- ✅ **20% national coverage** (2,000 other cities)

### Quality Targets
- ✅ **95% accurate addresses** with GPS coordinates
- ✅ **90% correct category mapping** to MiCita system
- ✅ **85% current business status** (active/operating)
- ✅ **70% complete business hours** information

### Performance Targets
- ✅ **Sub-second search response** for any category/location
- ✅ **Zero external API dependency** after scraping complete
- ✅ **100% system uptime** during scraping operations

## Risk Mitigation

### Technical Risks
- **Apify rate limiting**: Implement 2-second delays between requests
- **Data corruption**: Real-time validation and backup systems
- **IP blocking**: Rotate proxies and distribute requests
- **Category misclassification**: Manual review of 5% sample

### Business Risks  
- **Outdated information**: Monthly refresh cycles for high-priority businesses
- **Incomplete coverage**: Gap analysis and targeted re-scraping
- **Competitor access**: Rate-limit public API endpoints
- **Legal compliance**: Respect robots.txt and fair use policies

## Implementation Timeline

### Week 1: Foundation & Premium Areas
- **Days 1-2**: Wave 1 (Lima Premium Districts)
- **Days 3-4**: Wave 2 (Lima Business Centers)  
- **Days 5-7**: Data processing and system integration

### Week 2: Popular Areas & Specialization
- **Days 8-9**: Wave 3 (Popular Lima Districts)
- **Days 10-11**: Wave 4 (Beauty & Wellness Focus)
- **Days 12-14**: Quality validation and optimization

### Week 3: National Expansion
- **Days 15-16**: Wave 5 (Major Secondary Cities)
- **Days 17-18**: Wave 6 (Health & Professional Services)
- **Days 19-21**: Database optimization and search indexing

### Week 4: Completion & Polish
- **Days 22-23**: Wave 7 (Food & Hospitality)
- **Days 24-25**: Wave 8 (Niche & Specialty Services)
- **Days 26-28**: Final quality assurance and documentation

## Monitoring & Analytics

### Real-Time Dashboards
- **Scraping progress**: Businesses per hour/day
- **Data quality metrics**: Contact info completion rates
- **System performance**: Database query response times
- **Cost tracking**: Apify credits consumption

### Weekly Reports
- **Coverage analysis**: Geographic and category gaps
- **Quality assessment**: Manual validation results  
- **Performance metrics**: Search speed and accuracy
- **Cost efficiency**: Credits per quality business record

## Future Enhancements

### Phase 2 Opportunities (Post-Launch)
- **Business verification**: Phone/email validation campaigns
- **Content enrichment**: Social media profile integration
- **Dynamic updates**: Real-time business status monitoring
- **User contributions**: Community-driven data updates
- **AI categorization**: Automated business type classification

### Integration Points
- **MiCita booking system**: Direct appointment scheduling
- **Google Maps**: Visual location services
- **Social media APIs**: Enhanced business profiles
- **Payment systems**: Transaction processing integration

---

**Prepared by**: MiCita Development Team  
**Date**: July 9, 2025  
**Version**: 1.0  
**Status**: Ready for Implementation
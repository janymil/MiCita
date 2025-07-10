# 📋 LEGAL BUSINESS DATA SOURCES FOR PERU

## Overview

This guide provides a comprehensive overview of legal alternatives to Google Places data for building business directories in Peru. All sources listed are 100% legal and comply with data protection regulations.

## 🏛️ Official Government Sources

### 1. SUNAT RUC Registry
- **What it is**: Peru's official tax authority business registry
- **Data Available**: Company names, tax IDs, addresses, business status, legal forms
- **Coverage**: All registered businesses in Peru (~2.5 million records)
- **Access**: Public web portal at `e-consultaruc.sunat.gob.pe`
- **API**: No official API, requires web scraping
- **Legal Status**: ✅ Public government data
- **Cost**: Free
- **Implementation**: `scrapers/sunat-ruc-scraper.js`

### 2. SUNARP (Public Registry)
- **What it is**: Public registry for business incorporation
- **Data Available**: Corporate structure, legal representatives, incorporation dates
- **Coverage**: All legally incorporated companies
- **Access**: Public registry offices and online portal
- **Legal Status**: ✅ Public government data
- **Cost**: Small fees for detailed reports

## 🔗 Third-Party API Providers

### 3. PeruAPIs.com
- **Service**: RUC lookup, DNI lookup, vehicle registration
- **API Endpoints**: 
  - `/api/ruc/{ruc}` - Company lookup
  - `/api/dni/{dni}` - Person lookup
  - `/api/cambio/` - Exchange rates
- **Data Format**: JSON responses
- **Features**: "Exact data through RUC 10 or RUC 20 consultation"
- **Legal Status**: ✅ Uses official SUNAT data
- **Cost**: Paid service (check current pricing)
- **Implementation**: `scrapers/peru-apis-scraper.js`

### 4. Consulta-Peru (Open Source)
- **GitHub**: `martinsam16/consulta-peru`
- **API Endpoints**:
  - `/api/v1/dni/{dni}` - Person lookup
  - `/api/v1/ruc/{ruc}` - Company lookup
  - `/cambio/` - Exchange rates
- **Technology**: Open source, community maintained
- **Legal Status**: ✅ Uses official government data
- **Cost**: Free
- **Implementation**: Integrated in `scrapers/peru-apis-scraper.js`

### 5. Peru-Consult-API
- **GitHub**: `giansalex/peru-consult-api`
- **Technology**: Docker, GraphQL support
- **Features**: DNI and RUC consultation
- **GraphQL Example**:
```graphql
query {
  company(ruc: "20131312955") {
    ruc
    razonSocial
  }
}
```
- **Legal Status**: ✅ Uses official government data
- **Cost**: Free (self-hosted)

### 6. Graph Perú by Daustinn ⭐ **RECOMMENDED**
- **API**: `https://graphperu.daustinn.com/api`
- **Technology**: REST + GraphQL, Redis caching, Cloudflare CDN
- **Features**: 
  - Complete business information (RUC lookup)
  - Person information (DNI lookup)
  - No API key required
  - 50 queries per minute rate limit
- **Data Fields**: Name, state, condition, complete address, district, province, region, ubigeo
- **Legal Status**: ✅ Official SUNAT and RENIEC data
- **Cost**: **100% FREE**
- **Implementation**: `scrapers/graph-peru-scraper.js`

## 🌍 International Data Providers

### 6. GlobalDatabase
- **Coverage**: 21,777 companies in Peru
- **Contact Data**: 20,720 employee emails, 2,543 direct phone numbers
- **API**: Available with live demo
- **Features**: Company details, financial data, employee information
- **Legal Status**: ✅ GDPR/CCPA compliant
- **Cost**: Commercial pricing

### 7. BoldData
- **Source**: Official trade registers, Chambers of Commerce
- **Data Fields**: Company details, financial info, contact data, group structure
- **Compliance**: ✅ GDPR/CCPA compliant, DDMA audited
- **Update Frequency**: Daily updates
- **Cost**: Commercial pricing

### 8. Info-Clipper
- **Source**: Peruvian Company Register
- **Data**: Legal representatives, directors, financial performance, credit ratings
- **Features**: Corporate tree analysis, litigation records
- **Legal Status**: ✅ Official company register data
- **Cost**: Commercial pricing

## 🗺️ OpenStreetMap (OSM)

### 9. OpenStreetMap Business Data
- **What it is**: Collaborative mapping project with business information
- **Data Available**: Business names, addresses, phone numbers, websites, opening hours
- **Coverage**: Global coverage including Peru
- **Access Methods**:
  - Overpass API for real-time queries
  - Planet dumps for bulk downloads
  - GeoJSON exports for specific regions
- **Legal Status**: ✅ Open Database License (ODbL)
- **Cost**: Free
- **Implementation**: 
  - `scrapers/openstreet-scraper.js` - Live scraping
  - `import-openstreet-geojson.js` - Bulk import

## 📊 Implementation Comparison

| Source | Coverage | Data Quality | Cost | API Available | Real-time |
|--------|----------|--------------|------|---------------|-----------|
| SUNAT RUC | 2.5M+ | Official ⭐⭐⭐⭐⭐ | Free | No | Yes |
| PeruAPIs | High | Official ⭐⭐⭐⭐⭐ | Paid | Yes | Yes |
| Consulta-Peru | High | Official ⭐⭐⭐⭐⭐ | Free | Yes | Yes |
| OpenStreetMap | 53K+ | Community ⭐⭐⭐⭐ | Free | Yes | Yes |
| GlobalDatabase | 21K+ | Commercial ⭐⭐⭐⭐ | Paid | Yes | Yes |

## 🚀 Recommended Implementation Strategy

### Phase 1: Foundation (Free Sources)
1. **OpenStreetMap Import**: Import 53,806 businesses from GeoJSON
2. **SUNAT Integration**: Add official business verification
3. **Consulta-Peru API**: Real-time business lookups

### Phase 2: Enhancement (Paid Sources)
1. **PeruAPIs Integration**: Premium official data
2. **Commercial Providers**: GlobalDatabase or BoldData for enhanced contact info

### Phase 3: Continuous Updates
1. **Scheduled Scraping**: Regular OpenStreetMap updates
2. **RUC Verification**: Periodic SUNAT status checks
3. **Data Enrichment**: Ongoing contact information enhancement

## 🔧 Technical Implementation

### Current Implementation Status

✅ **Completed**:
- OpenStreetMap GeoJSON import system
- Database schema for legal data sources
- OpenStreetMap live scraper
- SUNAT RUC scraper framework
- Peru APIs integration system

🚧 **In Progress**:
- OpenStreetMap bulk import (53,806 businesses)

⏳ **Planned**:
- SUNAT batch processing
- Commercial API integrations
- Automated data verification

### Database Structure

```sql
CREATE TABLE openstreet_businesses (
  id SERIAL PRIMARY KEY,
  osm_id TEXT UNIQUE NOT NULL,
  osm_type TEXT,
  name TEXT,
  category TEXT DEFAULT 'servicios',
  subcategory TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  email TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  tags JSONB,
  -- ... additional fields
);
```

## ⚖️ Legal Compliance

### Data Protection Compliance
- **Peru PDPL**: Personal Data Protection Law compliance
- **GDPR**: European data protection (for international users)
- **Attribution**: Proper attribution for OpenStreetMap data
- **Terms of Service**: Compliance with all API terms

### Best Practices
1. **Rate Limiting**: Respectful API usage (1-2 seconds between requests)
2. **Attribution**: Proper data source attribution
3. **Data Retention**: Appropriate data retention policies
4. **User Consent**: Clear data usage consent where required

## 📈 Scaling Strategy

### Target Coverage
- **Current**: 8,580 businesses (Apify scraped data)
- **Phase 1**: +53,806 businesses (OpenStreetMap)
- **Phase 2**: +10,000 businesses (SUNAT verification)
- **Phase 3**: +50,000 businesses (Commercial sources)
- **Target Total**: 120,000+ businesses

### Cost Projection
- **Free Sources**: $0/month (OSM, SUNAT, Consulta-Peru)
- **Paid APIs**: $50-200/month (PeruAPIs, usage-based)
- **Commercial Data**: $500-1000/month (GlobalDatabase, BoldData)
- **Total Estimated**: $550-1200/month for comprehensive coverage

## 🎯 Success Metrics

### Data Quality Indicators
- **Contact Information**: Phone numbers, websites, emails
- **Address Accuracy**: Precise addresses with district information
- **Business Status**: Active vs inactive business verification
- **Category Coverage**: Balanced distribution across business types

### Performance Metrics
- **Search Response Time**: <500ms for local database queries
- **Data Freshness**: Monthly updates from all sources
- **Coverage Completeness**: 90%+ of active businesses in target districts

This comprehensive approach ensures legal compliance while building the most complete business directory for Peru.
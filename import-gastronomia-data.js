import fs from 'fs';
import path from 'path';
import { db } from './server/db.js';
import { apifyBusinesses } from './shared/schema.js';

function extractServiceKeywords(business) {
  const services = [];
  
  // Extract from additional info
  if (business.additionalInfo) {
    Object.keys(business.additionalInfo).forEach(key => {
      services.push(key);
      if (Array.isArray(business.additionalInfo[key])) {
        business.additionalInfo[key].forEach(item => {
          if (typeof item === 'object') {
            Object.keys(item).forEach(subKey => services.push(subKey));
          }
        });
      }
    });
  }
  
  // Extract from categories
  if (business.categories) {
    services.push(...business.categories);
  }
  
  // Extract from description if available
  if (business.description) {
    services.push(business.description);
  }
  
  return [...new Set(services)]; // Remove duplicates
}

function buildAmenities(business) {
  const amenities = {};
  
  if (business.additionalInfo) {
    Object.entries(business.additionalInfo).forEach(([category, items]) => {
      if (Array.isArray(items)) {
        items.forEach(item => {
          if (typeof item === 'object') {
            Object.entries(item).forEach(([key, value]) => {
              amenities[key] = value;
            });
          }
        });
      }
    });
  }
  
  // Add basic amenities based on available data
  amenities['Has_Phone'] = !!business.phone;
  amenities['Has_Website'] = !!business.website;
  amenities['Has_Images'] = !!(business.imageUrls && business.imageUrls.length > 0);
  amenities['Has_Reviews'] = !!(business.reviews && business.reviews.length > 0);
  amenities['Claim_Available'] = business.claimThisBusiness || false;
  amenities['Street_View_Available'] = !!(business.imageUrls && business.imageUrls.some(url => url.includes('streetviewpixels')));
  
  return amenities;
}

function parsePriceLevel(priceString) {
  if (!priceString) return 0;
  
  // Handle different price formats - all should be converted to PEN levels
  if (typeof priceString === 'number') return Math.min(4, Math.max(0, priceString));
  
  const str = priceString.toString().toLowerCase();
  
  // Convert dollar signs to PEN equivalent levels (assuming $1 ≈ 3.8 PEN)
  const dollarCount = (str.match(/\$/g) || []).length;
  if (dollarCount > 0) return Math.min(4, dollarCount);
  
  // Extract numbers from PEN ranges
  const penMatch = str.match(/pen\s*(\d+)/);
  if (penMatch) {
    const amount = parseInt(penMatch[1]);
    if (amount < 15) return 1;      // Budget: < 15 PEN
    if (amount < 30) return 2;      // Moderate: 15-30 PEN
    if (amount < 50) return 3;      // Mid-range: 30-50 PEN
    return 4;                       // Premium: 50+ PEN
  }
  
  // Handle numeric ranges like "10-20"
  const rangeMatch = str.match(/(\d+)-(\d+)/);
  if (rangeMatch) {
    const avgAmount = (parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2;
    if (avgAmount < 15) return 1;
    if (avgAmount < 30) return 2;
    if (avgAmount < 50) return 3;
    return 4;
  }
  
  return 0;
}

function calculateQualityScore(business) {
  let score = 50; // Base score
  
  // Add points for completeness
  if (business.phone) score += 10;
  if (business.website) score += 10;
  if (business.description) score += 10;
  if (business.imageUrls && business.imageUrls.length > 0) score += 15;
  if (business.reviews && business.reviews.length > 0) score += 10;
  if (business.openingHours && business.openingHours.length > 0) score += 5;
  
  // Add points for rating quality
  if (business.totalScore >= 4) score += 10;
  else if (business.totalScore >= 3) score += 5;
  
  // Add points for review count
  if (business.reviewsCount > 10) score += 10;
  else if (business.reviewsCount > 5) score += 5;
  
  return Math.min(100, score);
}

async function importGastronomiaData() {
  try {
    console.log('🍽️ Starting comprehensive gastronomia data import...');
    
    // Read the JSON file
    const filePath = path.join(process.cwd(), 'attached_assets', 'dataset_crawler-google-places_2025-07-09_21-14-35-511.json');
    const jsonData = fs.readFileSync(filePath, 'utf8');
    const businesses = JSON.parse(jsonData);
    
    console.log(`📊 Found ${businesses.length} businesses to import`);
    
    let importedCount = 0;
    let skippedCount = 0;
    let errors = [];
    
    for (const business of businesses) {
      try {
        // Build comprehensive business data
        const businessData = {
          // Core identifiers
          placeId: business.placeId || `generated_${Date.now()}_${Math.random()}`,
          name: business.title || 'Unknown Business',
          address: business.address || `${business.street || ''}, ${business.city || 'Lima'}`.trim(),
          
          // Categories
          category: 'Gastronomía', // Main category for all businesses
          subcategory: business.categoryName || 'Restaurante', // Original category becomes subcategory
          
          // Ratings and reviews
          rating: business.totalScore ? parseFloat(business.totalScore.toString()) : 0,
          reviewCount: business.reviewsCount || 0,
          priceLevel: parsePriceLevel(business.price),
          
          // Contact information
          phone: business.phone || null,
          website: business.website || null,
          email: null, // Will be filled later if lead enrichment is available
          
          // Location data
          latitude: business.location?.lat ? parseFloat(business.location.lat.toString()) : 0,
          longitude: business.location?.lng ? parseFloat(business.location.lng.toString()) : 0,
          
          // Images
          photoUrl: business.imageUrls?.[0] || business.imageUrl || null,
          
          // Status and hours
          openNow: business.temporarilyClosed === false && business.permanentlyClosed === false,
          hours: business.openingHours || [],
          
          // Search optimization
          searchTerms: [
            business.title,
            business.categoryName,
            business.address,
            business.neighborhood,
            business.city,
            ...(business.categories || [])
          ].filter(Boolean).join(' ').toLowerCase(),
          
          isRegistered: false,
          lastUpdated: new Date(),
          
          // Enhanced data for modern UI
          streetViewUrl: business.imageUrls?.find(url => url.includes('streetviewpixels')) || null,
          photos: business.imageUrls || [],
          
          // Popular times (if available)
          popularTimes: {},
          currentPopularity: null,
          livePopularityStatus: null,
          
          createdAt: new Date(),
          
          // Enhanced fields
          description: business.description || business.subTitle || null,
          services: extractServiceKeywords(business),
          socialMedia: {},
          imageUrls: business.imageUrls || [],
          verifiedStatus: business.claimThisBusiness ? 'claimable' : 'unverified',
          dataFreshnessScore: 90, // Fresh scraped data
          phoneFormatted: business.phone || null,
          phoneCountryCode: '+51',
          coordinatesValidated: !!(business.location?.lat && business.location?.lng),
          businessStatus: business.permanentlyClosed ? 'closed' : 
                         (business.temporarilyClosed ? 'temporarily_closed' : 'open'),
          amenities: buildAmenities(business),
          priceRangeText: business.price ? business.price.toString() : null,
          lastScraped: new Date(business.scrapedAt || new Date()),
          scrapingSource: 'apify',
          qualityScore: calculateQualityScore(business)
        };
        
        // Insert into database with comprehensive conflict resolution
        await db.insert(apifyBusinesses)
          .values(businessData)
          .onConflictDoUpdate({
            target: apifyBusinesses.placeId,
            set: {
              name: businessData.name,
              address: businessData.address,
              category: businessData.category,
              subcategory: businessData.subcategory,
              rating: businessData.rating,
              reviewCount: businessData.reviewCount,
              priceLevel: businessData.priceLevel,
              phone: businessData.phone,
              website: businessData.website,
              photoUrl: businessData.photoUrl,
              latitude: businessData.latitude,
              longitude: businessData.longitude,
              openNow: businessData.openNow,
              hours: businessData.hours,
              searchTerms: businessData.searchTerms,
              streetViewUrl: businessData.streetViewUrl,
              photos: businessData.photos,
              description: businessData.description,
              services: businessData.services,
              imageUrls: businessData.imageUrls,
              verifiedStatus: businessData.verifiedStatus,
              dataFreshnessScore: businessData.dataFreshnessScore,
              phoneFormatted: businessData.phoneFormatted,
              coordinatesValidated: businessData.coordinatesValidated,
              businessStatus: businessData.businessStatus,
              amenities: businessData.amenities,
              priceRangeText: businessData.priceRangeText,
              lastScraped: businessData.lastScraped,
              qualityScore: businessData.qualityScore,
              lastUpdated: new Date(),
            }
          });
        
        importedCount++;
        
        if (importedCount % 50 === 0) {
          console.log(`✅ Imported ${importedCount} businesses...`);
        }
        
      } catch (error) {
        console.error(`❌ Error importing business ${business.title}:`, error.message);
        errors.push({ business: business.title, error: error.message });
        skippedCount++;
      }
    }
    
    console.log(`\n🎉 Import completed!`);
    console.log(`✅ Successfully imported: ${importedCount} businesses`);
    console.log(`⚠️ Skipped: ${skippedCount} businesses`);
    
    if (errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      errors.slice(0, 5).forEach(err => {
        console.log(`  • ${err.business}: ${err.error}`);
      });
      if (errors.length > 5) {
        console.log(`  ... and ${errors.length - 5} more errors`);
      }
    }
    
    // Show comprehensive statistics
    console.log('\n📊 Import Statistics:');
    
    const subcategoryCounts = {};
    const businessesWithImages = businesses.filter(b => b.imageUrls && b.imageUrls.length > 0).length;
    const businessesWithPhone = businesses.filter(b => b.phone).length;
    const businessesWithWebsite = businesses.filter(b => b.website).length;
    const businessesWithReviews = businesses.filter(b => b.reviews && b.reviews.length > 0).length;
    
    businesses.forEach(b => {
      const category = b.categoryName || 'Unknown';
      subcategoryCounts[category] = (subcategoryCounts[category] || 0) + 1;
    });
    
    console.log(`📸 Businesses with images: ${businessesWithImages}/${businesses.length}`);
    console.log(`📞 Businesses with phone: ${businessesWithPhone}/${businesses.length}`);
    console.log(`🌐 Businesses with website: ${businessesWithWebsite}/${businesses.length}`);
    console.log(`⭐ Businesses with reviews: ${businessesWithReviews}/${businesses.length}`);
    
    console.log('\n🏷️ Subcategories created:');
    Object.entries(subcategoryCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([subcategory, count]) => {
        console.log(`  • ${subcategory}: ${count} businesses`);
      });
    
  } catch (error) {
    console.error('💥 Import failed:', error);
  } finally {
    console.log('Import process finished.');
  }
}

// Run the import
importGastronomiaData();
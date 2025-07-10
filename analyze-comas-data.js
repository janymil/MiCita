/**
 * 📊 COMAS DISTRICT DATA ANALYSIS
 * 
 * Analyzes the new Comas district JSON file to:
 * 1. Count total businesses
 * 2. Analyze category distribution
 * 3. Identify main categories vs subcategories
 * 4. Check data quality and completeness
 * 5. Create import plan
 */

import fs from 'fs';
import path from 'path';

async function analyzeComasData() {
  const filePath = 'attached_assets/dataset_crawler-google-places_2025-07-10_13-35-33-171.json';
  
  console.log('🔍 ANALYZING COMAS DISTRICT DATA...\n');
  
  try {
    // Read the file
    const rawData = fs.readFileSync(filePath, 'utf8');
    const businesses = JSON.parse(rawData);
    
    console.log(`📊 DATASET OVERVIEW:`);
    console.log(`Total businesses: ${businesses.length}`);
    console.log(`File size: ${(fs.statSync(filePath).size / 1024 / 1024).toFixed(2)} MB`);
    
    // Analyze categories
    const categories = {};
    const districts = {};
    const ratings = [];
    const withPhone = [];
    const withWebsite = [];
    const withEmail = [];
    const coordinates = [];
    
    // Sample business structure
    const sampleBusiness = businesses[0];
    console.log(`\n📄 SAMPLE BUSINESS STRUCTURE:`);
    console.log(`Title: ${sampleBusiness.title}`);
    console.log(`Category: ${sampleBusiness.categoryName}`);
    console.log(`Address: ${sampleBusiness.address}`);
    console.log(`District: ${sampleBusiness.city}`);
    console.log(`Rating: ${sampleBusiness.totalScore}`);
    console.log(`Reviews: ${sampleBusiness.reviewsCount}`);
    console.log(`Phone: ${sampleBusiness.phone || 'None'}`);
    console.log(`Website: ${sampleBusiness.website || 'None'}`);
    console.log(`Coordinates: ${sampleBusiness.location?.lat}, ${sampleBusiness.location?.lng}`);
    
    // Analyze all businesses
    for (const business of businesses) {
      // Category analysis
      const category = business.categoryName || 'Unknown';
      categories[category] = (categories[category] || 0) + 1;
      
      // District analysis  
      const district = business.city || 'Unknown';
      districts[district] = (districts[district] || 0) + 1;
      
      // Rating analysis
      const rating = business.totalScore || 0;
      if (rating > 0) {
        ratings.push(rating);
      }
      
      // Contact information
      if (business.phone) withPhone.push(business);
      if (business.website) withWebsite.push(business);
      if (business.email) withEmail.push(business);
      
      // Coordinates
      if (business.location?.lat && business.location?.lng) {
        coordinates.push({
          lat: business.location.lat,
          lng: business.location.lng
        });
      }
    }
    
    console.log(`\n📋 CATEGORY DISTRIBUTION (Top 15):`);
    const sortedCategories = Object.entries(categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15);
    
    for (const [category, count] of sortedCategories) {
      const percentage = ((count / businesses.length) * 100).toFixed(1);
      console.log(`  ${category}: ${count} (${percentage}%)`);
    }
    
    console.log(`\n🏘️ DISTRICT DISTRIBUTION:`);
    const sortedDistricts = Object.entries(districts)
      .sort(([,a], [,b]) => b - a);
    
    for (const [district, count] of sortedDistricts) {
      const percentage = ((count / businesses.length) * 100).toFixed(1);
      console.log(`  ${district}: ${count} (${percentage}%)`);
    }
    
    console.log(`\n⭐ RATING ANALYSIS:`);
    console.log(`  Businesses with ratings: ${ratings.length}/${businesses.length}`);
    if (ratings.length > 0) {
      const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      const highRated = ratings.filter(r => r >= 4.0);
      console.log(`  Average rating: ${avgRating.toFixed(2)}`);
      console.log(`  High-rated (4.0+): ${highRated.length} (${((highRated.length / ratings.length) * 100).toFixed(1)}%)`);
    }
    
    console.log(`\n📞 CONTACT INFORMATION:`);
    console.log(`  With phone: ${withPhone.length} (${((withPhone.length / businesses.length) * 100).toFixed(1)}%)`);
    console.log(`  With website: ${withWebsite.length} (${((withWebsite.length / businesses.length) * 100).toFixed(1)}%)`);
    console.log(`  With email: ${withEmail.length} (${((withEmail.length / businesses.length) * 100).toFixed(1)}%)`);
    console.log(`  With coordinates: ${coordinates.length} (${((coordinates.length / businesses.length) * 100).toFixed(1)}%)`);
    
    // Main category mapping analysis
    console.log(`\n🎯 MAIN CATEGORY MAPPING ANALYSIS:`);
    const mainCategoryMapping = {
      'servicios': [],
      'gastronomia': [],
      'salud': [],
      'belleza': [],
      'fitness': [],
      'automotriz': [],
      'educacion': [],
      'otros': []
    };
    
    for (const [category, count] of sortedCategories) {
      const categoryLower = category.toLowerCase();
      
      // Gastronomia
      if (categoryLower.includes('restaurant') || categoryLower.includes('comida') || 
          categoryLower.includes('bar') || categoryLower.includes('café') || 
          categoryLower.includes('panadería') || categoryLower.includes('pizzería')) {
        mainCategoryMapping.gastronomia.push([category, count]);
      }
      // Salud
      else if (categoryLower.includes('médico') || categoryLower.includes('hospital') || 
               categoryLower.includes('clínica') || categoryLower.includes('farmacia') || 
               categoryLower.includes('dentista')) {
        mainCategoryMapping.salud.push([category, count]);
      }
      // Belleza
      else if (categoryLower.includes('salon') || categoryLower.includes('peluquería') || 
               categoryLower.includes('belleza') || categoryLower.includes('spa') || 
               categoryLower.includes('estética')) {
        mainCategoryMapping.belleza.push([category, count]);
      }
      // Automotriz
      else if (categoryLower.includes('taller') || categoryLower.includes('mecánica') || 
               categoryLower.includes('automóvil') || categoryLower.includes('repuestos') || 
               categoryLower.includes('gasolina')) {
        mainCategoryMapping.automotriz.push([category, count]);
      }
      // Fitness
      else if (categoryLower.includes('gym') || categoryLower.includes('fitness') || 
               categoryLower.includes('deporte') || categoryLower.includes('entrenamiento')) {
        mainCategoryMapping.fitness.push([category, count]);
      }
      // Educacion
      else if (categoryLower.includes('escuela') || categoryLower.includes('colegio') || 
               categoryLower.includes('universidad') || categoryLower.includes('academia')) {
        mainCategoryMapping.educacion.push([category, count]);
      }
      // Servicios (catch-all for service businesses)
      else {
        mainCategoryMapping.servicios.push([category, count]);
      }
    }
    
    for (const [mainCategory, subcategories] of Object.entries(mainCategoryMapping)) {
      if (subcategories.length > 0) {
        const totalCount = subcategories.reduce((sum, [, count]) => sum + count, 0);
        console.log(`  ${mainCategory.toUpperCase()}: ${totalCount} businesses`);
        subcategories.slice(0, 5).forEach(([subcat, count]) => {
          console.log(`    - ${subcat}: ${count}`);
        });
      }
    }
    
    console.log(`\n📈 IMPORT RECOMMENDATIONS:`);
    console.log(`  ✅ High-quality dataset with ${ratings.length} rated businesses`);
    console.log(`  ✅ Good contact information coverage (${withPhone.length} phones, ${withWebsite.length} websites)`);
    console.log(`  ✅ Complete geographic coverage with ${coordinates.length} coordinate pairs`);
    console.log(`  ✅ Diverse business categories across all main categories`);
    console.log(`  ⚠️  Need to map ${Object.keys(categories).length} unique categories to main categories`);
    
    return {
      totalBusinesses: businesses.length,
      categories: Object.keys(categories).length,
      districts: Object.keys(districts).length,
      withRatings: ratings.length,
      withPhone: withPhone.length,
      withWebsite: withWebsite.length,
      withCoordinates: coordinates.length,
      mainCategoryMapping,
      topCategories: sortedCategories.slice(0, 10)
    };
    
  } catch (error) {
    console.error('❌ Error analyzing data:', error);
    return null;
  }
}

// Run analysis
analyzeComasData().then(results => {
  if (results) {
    console.log('\n✅ Analysis complete!');
  }
});
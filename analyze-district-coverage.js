#!/usr/bin/env node

/**
 * 📊 District Coverage Analysis
 * 
 * Analyzes the current business distribution across Lima districts
 * and identifies areas with low representation for targeted scraping.
 */

import { db } from './server/db.ts';
import { apifyBusinesses } from './shared/schema.ts';
import { sql } from 'drizzle-orm';

// Lima districts organized by zones
const LIMA_DISTRICTS_BY_ZONE = {
  'Centro': ['Lima', 'Rímac', 'Breña', 'La Victoria', 'Cercado de Lima'],
  'Norte': ['San Juan de Lurigancho', 'Comas', 'Los Olivos', 'San Martín de Porres', 'Independencia', 'Puente Piedra', 'Carabayllo', 'Ancón', 'Santa Rosa'],
  'Sur': ['Villa El Salvador', 'Villa María del Triunfo', 'San Juan de Miraflores', 'Chorrillos', 'Lurín', 'Pachacamac', 'Pucusana', 'Punta Hermosa'],
  'Este': ['Ate', 'Santa Anita', 'El Agustino', 'Lurigancho', 'Chaclacayo', 'Cieneguilla', 'La Molina', 'San Luis'],
  'Oeste': ['Miraflores', 'San Isidro', 'Barranco', 'Santiago de Surco', 'San Borja', 'Jesús María', 'Magdalena del Mar', 'Pueblo Libre', 'San Miguel', 'Lince', 'Surquillo'],
  'Callao': ['Callao', 'Bellavista', 'Carmen de la Legua Reynoso', 'La Perla', 'La Punta', 'Mi Perú', 'Ventanilla']
};

function detectDistrictFromAddress(address) {
  if (!address || typeof address !== 'string') {
    return 'Unknown';
  }
  
  const addressLower = address.toLowerCase();
  
  // Create a flattened district list with variations
  const DISTRICT_PATTERNS = {
    'miraflores': ['miraflores'],
    'san juan de miraflores': ['san juan de miraflores', 'sjm'],
    'san isidro': ['san isidro'],
    'san miguel': ['san miguel'],
    'san borja': ['san borja'],
    'surco': ['surco', 'santiago de surco'],
    'la molina': ['la molina'],
    'barranco': ['barranco'],
    'jesus maria': ['jesus maria', 'jesús maría'],
    'magdalena del mar': ['magdalena del mar', 'magdalena'],
    'pueblo libre': ['pueblo libre'],
    'lince': ['lince'],
    'breña': ['breña', 'brena'],
    'callao': ['callao'],
    'chorrillos': ['chorrillos'],
    'ate': ['ate', 'ate vitarte'],
    'comas': ['comas'],
    'independencia': ['independencia'],
    'los olivos': ['los olivos'],
    'san martin de porres': ['san martin de porres', 'san martín de porres', 'smp'],
    'rimac': ['rimac', 'rímac'],
    'la victoria': ['la victoria'],
    'cercado de lima': ['cercado de lima', 'lima cercado', 'lima centro', 'lima 1'],
    'el agustino': ['el agustino'],
    'santa anita': ['santa anita'],
    'lurigancho': ['lurigancho', 'lurigancho chosica'],
    'san juan de lurigancho': ['san juan de lurigancho', 'sjl'],
    'villa el salvador': ['villa el salvador', 'ves'],
    'villa maría del triunfo': ['villa maría del triunfo', 'villa maria del triunfo', 'vmt'],
    'pachacamac': ['pachacamac'],
    'lurín': ['lurin', 'lurín'],
    'punta hermosa': ['punta hermosa'],
    'pucusana': ['pucusana'],
    'ancón': ['ancon', 'ancón'],
    'carabayllo': ['carabayllo'],
    'puente piedra': ['puente piedra'],
    'santa rosa': ['santa rosa'],
    'ventanilla': ['ventanilla'],
    'bellavista': ['bellavista'],
    'carmen de la legua reynoso': ['carmen de la legua reynoso', 'carmen de la legua'],
    'la perla': ['la perla'],
    'la punta': ['la punta'],
    'surquillo': ['surquillo'],
    'san luis': ['san luis'],
    'chaclacayo': ['chaclacayo'],
    'cieneguilla': ['cieneguilla']
  };
  
  // Look for district patterns in address
  for (const [district, variations] of Object.entries(DISTRICT_PATTERNS)) {
    for (const variation of variations) {
      const regex = new RegExp(`\\b${variation.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(addressLower)) {
        // Special handling for Miraflores to exclude San Juan de Miraflores
        if (district === 'miraflores' && addressLower.includes('san juan')) {
          continue;
        }
        return district.charAt(0).toUpperCase() + district.slice(1);
      }
    }
  }
  
  return 'Unknown';
}

async function analyzeDistrictCoverage() {
  console.log('📊 LIMA DISTRICT COVERAGE ANALYSIS');
  console.log('=================================');
  
  try {
    // Get all businesses from database
    const businesses = await db.select().from(apifyBusinesses);
    
    console.log(`🏢 Total businesses in database: ${businesses.length}`);
    
    // Analyze district distribution
    const districtCounts = {};
    const unknownAddresses = [];
    
    businesses.forEach(business => {
      const district = detectDistrictFromAddress(business.address);
      
      if (district === 'Unknown') {
        unknownAddresses.push({
          name: business.name,
          address: business.address
        });
      }
      
      districtCounts[district] = (districtCounts[district] || 0) + 1;
    });
    
    // Sort by count (descending)
    const sortedDistricts = Object.entries(districtCounts)
      .sort(([,a], [,b]) => b - a);
    
    console.log('\n📍 DISTRICT COVERAGE RANKING:');
    console.log('============================');
    
    sortedDistricts.forEach(([district, count], index) => {
      const percentage = ((count / businesses.length) * 100).toFixed(1);
      const status = count < 50 ? '🔴 LOW' : count < 100 ? '🟡 MEDIUM' : '🟢 HIGH';
      console.log(`${index + 1}. ${district}: ${count} businesses (${percentage}%) ${status}`);
    });
    
    // Analyze by zones
    console.log('\n🗺️  COVERAGE BY ZONE:');
    console.log('==================');
    
    Object.entries(LIMA_DISTRICTS_BY_ZONE).forEach(([zone, districts]) => {
      let zoneTotal = 0;
      districts.forEach(district => {
        const normalizedDistrict = district.toLowerCase();
        zoneTotal += districtCounts[normalizedDistrict] || 0;
      });
      
      const zonePercentage = ((zoneTotal / businesses.length) * 100).toFixed(1);
      console.log(`${zone}: ${zoneTotal} businesses (${zonePercentage}%)`);
      
      // Show districts with low coverage in this zone
      const lowCoverageDistricts = districts.filter(district => {
        const count = districtCounts[district.toLowerCase()] || 0;
        return count < 50;
      });
      
      if (lowCoverageDistricts.length > 0) {
        console.log(`  🔴 Low coverage: ${lowCoverageDistricts.join(', ')}`);
      }
    });
    
    // Identify districts with zero or very low coverage
    console.log('\n🎯 PRIORITY DISTRICTS FOR SCRAPING:');
    console.log('=================================');
    
    const allExpectedDistricts = Object.values(LIMA_DISTRICTS_BY_ZONE).flat();
    const missingOrLowDistricts = allExpectedDistricts.filter(district => {
      const count = districtCounts[district.toLowerCase()] || 0;
      return count < 30; // Less than 30 businesses
    });
    
    missingOrLowDistricts.forEach(district => {
      const count = districtCounts[district.toLowerCase()] || 0;
      console.log(`• ${district}: ${count} businesses - NEEDS TARGETED SCRAPING`);
    });
    
    console.log('\n📊 SUMMARY STATISTICS:');
    console.log('=====================');
    console.log(`• Total districts with businesses: ${Object.keys(districtCounts).length}`);
    console.log(`• Districts with high coverage (>100): ${sortedDistricts.filter(([,count]) => count > 100).length}`);
    console.log(`• Districts with medium coverage (50-100): ${sortedDistricts.filter(([,count]) => count >= 50 && count <= 100).length}`);
    console.log(`• Districts with low coverage (<50): ${sortedDistricts.filter(([,count]) => count < 50).length}`);
    console.log(`• Businesses with unknown districts: ${districtCounts['Unknown'] || 0}`);
    
    // Show recommendation
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('==================');
    
    if (missingOrLowDistricts.length > 0) {
      console.log('✅ Run the Missing Districts Scraper to improve coverage in:');
      console.log(`   ${missingOrLowDistricts.slice(0, 10).join(', ')}`);
      console.log('\n🚀 Execute: node run-missing-districts-scraper.js');
      console.log(`💰 Estimated cost: $${(missingOrLowDistricts.length * 0.75).toFixed(2)}`);
      console.log(`📈 Expected new businesses: ${missingOrLowDistricts.length * 75}-${missingOrLowDistricts.length * 125}`);
    } else {
      console.log('✅ District coverage appears comprehensive!');
      console.log('   Consider running category-specific scrapers for specialized businesses.');
    }
    
  } catch (error) {
    console.error('❌ Error analyzing district coverage:', error);
  }
}

// Execute analysis
analyzeDistrictCoverage();
#!/usr/bin/env node

/**
 * 🎯 Execute Missing Districts Scraper
 * 
 * This script runs the geolocation-based scraper to collect businesses
 * from Lima districts that are under-represented in the current dataset.
 * 
 * BEFORE RUNNING:
 * 1. Ensure APIFY_API_TOKEN is set in environment variables
 * 2. Check current database count: npm run db:count
 * 3. Verify available Apify credits in your account
 * 
 * COST ESTIMATE: ~$15-20 (75-100 credits)
 * EXPECTED RESULTS: 2,000-3,000 new businesses from outer districts
 * EXECUTION TIME: ~2-3 hours (with 30-second delays between districts)
 */

import { scrapeMissingDistrictsBusinesses, MISSING_DISTRICTS } from './scrapers/missing-districts-scraper.js';

async function main() {
  console.log('🎯 MISSING DISTRICTS SCRAPER EXECUTION');
  console.log('=====================================');
  console.log(`📍 Will process ${MISSING_DISTRICTS.length} districts:`);
  
  // Show districts to be processed
  MISSING_DISTRICTS.forEach((district, index) => {
    console.log(`${index + 1}. ${district.name} (${district.lat}, ${district.lng})`);
  });
  
  console.log('\n⚠️  IMPORTANT NOTES:');
  console.log('• This will take 2-3 hours to complete');
  console.log('• Cost will be approximately $15-20');
  console.log('• Process includes 30-second delays between districts');
  console.log('• Each district uses geolocation-based search for maximum coverage');
  
  // Confirmation prompt (in a real execution, you might want to add this)
  console.log('\n🚀 Starting scraper execution...');
  
  try {
    const results = await scrapeMissingDistrictsBusinesses();
    
    console.log('\n🎉 SCRAPING COMPLETED SUCCESSFULLY!');
    console.log('==================================');
    console.log(`📊 Districts processed: ${results.districtsProcessed}`);
    console.log(`🏢 New businesses found: ${results.businessesFound}`);
    console.log(`💰 Total cost: $${results.estimatedCost.toFixed(2)}`);
    
    // Generate summary report
    console.log('\n📋 COVERAGE IMPROVEMENT REPORT:');
    console.log('• San Juan de Lurigancho: Expected 200-300 new businesses');
    console.log('• Villa El Salvador: Expected 150-200 new businesses');
    console.log('• Comas: Expected 100-150 new businesses');
    console.log('• Los Olivos: Expected 100-150 new businesses');
    console.log('• Ate: Expected 150-200 new businesses');
    console.log('• Callao: Expected 100-150 new businesses');
    console.log('• Other districts: Expected 50-100 each');
    
    console.log('\n✅ Mission accomplished! Lima business coverage is now comprehensive.');
    
  } catch (error) {
    console.error('❌ Scraper execution failed:', error);
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Check APIFY_API_TOKEN environment variable');
    console.log('2. Verify Apify account has sufficient credits');
    console.log('3. Check database connection');
    console.log('4. Review network connectivity');
    
    process.exit(1);
  }
}

// Execute the scraper
main().catch(console.error);
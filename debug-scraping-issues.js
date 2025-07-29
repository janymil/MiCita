/**
 * 🐛 DEBUG SCRIPT FOR SCRAPING ISSUES
 * 
 * This script helps debug:
 * 1. Working hours showing as "0 1 Cerrado" 
 * 2. Only showing 2 lines instead of all hours
 * 3. Gallery images broken and disappearing
 * 4. Only one image when business has more on Google Maps
 */

import { ApifyScrapingService } from './lib/apify-scraping-service.js';
import { storage } from './server/db.js';

async function debugScrapingIssues() {
  console.log('🐛 Starting scraping issues debug session...');
  console.log('===============================================');
  
  try {
    // Test with a known business URL that should have working hours and multiple images
    const testUrl = "https://www.google.com/maps/place/Barberia+Nicolas/@-12.0547589,-77.0365647,17z/data=!3m1!4b1!4m6!3m5!1s0x9105c8b5d3f9f7f7:0x123456789!8m2!3d-12.0547589!4d-77.0365647!16s%2Fg%2F11something";
    
    console.log('🔍 Testing with URL:', testUrl);
    console.log('');
    
    const scrapingService = new ApifyScrapingService();
    
    console.log('📊 Starting Google Maps scraping...');
    const result = await scrapingService.scrapeGooglePlacesBusiness(testUrl);
    
    console.log('');
    console.log('🕐 WORKING HOURS ANALYSIS:');
    console.log('=========================');
    console.log('Hours data type:', typeof result.hours);
    console.log('Hours data:', JSON.stringify(result.hours, null, 2));
    console.log('Number of days with hours:', Object.keys(result.hours || {}).length);
    
    console.log('');
    console.log('📸 IMAGES ANALYSIS:');
    console.log('==================');
    console.log('Images array length:', result.images?.length || 0);
    console.log('First 5 image URLs:');
    (result.images || []).slice(0, 5).forEach((url, index) => {
      console.log(`  ${index + 1}. ${url}`);
    });
    
    console.log('');
    console.log('📋 FULL RESULT STRUCTURE:');
    console.log('=========================');
    console.log('Result keys:', Object.keys(result));
    console.log('Name:', result.name);
    console.log('Address:', result.address);
    console.log('Phone:', result.phone);
    console.log('Website:', result.website);
    console.log('Rating:', result.rating);
    console.log('Review Count:', result.reviewCount);
    
    // Test database storage and retrieval
    console.log('');
    console.log('🗄️  DATABASE STORAGE TEST:');
    console.log('==========================');
    
    // Try to find an existing business to test gallery
    const businesses = await storage.searchApifyBusinesses('barberia', 'belleza');
    if (businesses.length > 0) {
      const testBusiness = businesses[0];
      console.log(`Found test business: ${testBusiness.name}`);
      console.log('Business hours in DB:', testBusiness.hours);
      console.log('Business photos in DB:', testBusiness.photos?.length || 0);
      console.log('Business imageUrls in DB:', testBusiness.imageUrls?.length || 0);
      
      // Check if it's a registered business with gallery
      const registeredBusinesses = await storage.getBusinesses();
      const registeredBusiness = registeredBusinesses.find(b => b.name.toLowerCase().includes('barberia'));
      
      if (registeredBusiness) {
        console.log(`Found registered business: ${registeredBusiness.name}`);
        const gallery = await storage.getGalleryByBusinessId(registeredBusiness.id);
        console.log('Gallery items count:', gallery.length);
        gallery.forEach((item, index) => {
          console.log(`  Gallery ${index + 1}: ${item.imageUrl}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Debug session failed:', error);
    console.error('Error stack:', error.stack);
  }
  
  console.log('');
  console.log('🎯 DEBUG CONCLUSIONS:');
  console.log('=====================');
  console.log('✅ Check the above output to identify:');
  console.log('  1. How working hours data is structured');
  console.log('  2. How many images are being captured');
  console.log('  3. Whether database storage is working correctly');
  console.log('  4. Whether gallery images have correct URLs');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  debugScrapingIssues()
    .then(() => {
      console.log('✅ Debug session completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Debug session failed:', error);
      process.exit(1);
    });
}

export { debugScrapingIssues };

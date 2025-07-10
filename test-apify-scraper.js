#!/usr/bin/env node

/**
 * Test Apify Scraper to Debug Zero Results Issue
 */

import { ApifyClient } from 'apify-client';

async function testApifyScraper() {
  const client = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
  });

  console.log('🧪 Testing Apify scraper with simple configuration...');

  // Simple test configuration
  const input = {
    searchStringsArray: ['restaurant', 'cafeteria', 'salon de belleza'],
    locationQuery: 'Lima, Peru',
    maxCrawledPlacesPerSearch: 10,
    language: 'es',
    countryCode: 'pe',
    maxReviews: 0,
    maxImages: 1,
    additionalInfo: false,
    // Remove minRating filter to test
    // minRating: 4.0,
    scrapeOpeningHours: true,
    scrapeDetailPage: false,
    includeWebResults: false,
    enrichPlaceWithCompanyContactDetails: false
  };

  console.log('🔧 Test configuration:', JSON.stringify(input, null, 2));

  try {
    console.log('🚀 Starting Apify test run...');
    
    const run = await client.actor('compass/crawler-google-places').call(input);
    
    console.log('✅ Apify run completed:', run.id);
    console.log('📊 Status:', run.status);
    console.log('📊 Stats:', run.stats);
    
    // Fetch results
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    console.log('📊 Raw results found:', items.length);
    
    if (items.length > 0) {
      console.log('🔍 Sample result:', JSON.stringify(items[0], null, 2));
      
      // Test with rating filter
      const highRatedItems = items.filter(item => {
        const rating = parseFloat(item.rating);
        return rating && rating >= 4.0;
      });
      
      console.log('⭐ High-rated results (4.0+):', highRatedItems.length);
      
      if (highRatedItems.length > 0) {
        console.log('⭐ Sample high-rated:', {
          name: highRatedItems[0].title,
          rating: highRatedItems[0].rating,
          address: highRatedItems[0].address
        });
      }
    } else {
      console.log('❌ No results found in test run');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
    console.error('Error details:', error.message);
    if (error.data) {
      console.error('Error data:', error.data);
    }
  }
}

testApifyScraper().catch(console.error);
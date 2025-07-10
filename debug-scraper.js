#!/usr/bin/env node

/**
 * Debug the Missing Districts Scraper Issue
 */

import { ApifyClient } from 'apify-client';

async function debugScraper() {
  const client = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
  });

  console.log('🔍 Debugging scraper with minimal configuration...');

  // Test the exact configuration that was failing
  const input = {
    searchStringsArray: ['restaurant Lima'],
    locationQuery: 'Lima, Peru',
    maxCrawledPlacesPerSearch: 5,
    language: 'es',
    countryCode: 'pe',
    maxReviews: 0,
    maxImages: 1,
    exportPlaceUrls: false,
    additionalInfo: true,
    scrapeOpeningHours: true,
    scrapeDetailPage: true,
    includeWebResults: true,
    enrichPlaceWithCompanyContactDetails: true,
    scrapePopularTimes: true,
    scrapeServiceOptions: true,
    scrapeMenuLink: true,
    scrapeReservationLink: true
  };

  console.log('📝 Configuration:', JSON.stringify(input, null, 2));

  try {
    const run = await client.actor('compass/crawler-google-places').call(input);
    
    console.log('✅ Run completed:', {
      id: run.id,
      status: run.status,
      stats: run.stats
    });
    
    // Check if the run was successful
    if (run.status === 'SUCCEEDED') {
      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      console.log('📊 Results found:', items.length);
      
      if (items.length > 0) {
        console.log('🎯 First result sample:', {
          title: items[0].title,
          address: items[0].address,
          rating: items[0].rating,
          reviewsCount: items[0].reviewsCount
        });
      }
    } else {
      console.log('❌ Run failed:', run.status);
      console.log('Error info:', run.statusMessage || 'No error message');
    }
    
  } catch (error) {
    console.error('❌ Scraper error:', error.message);
    console.error('Error type:', error.type);
    console.error('Status code:', error.statusCode);
    
    if (error.data) {
      console.error('Error data:', error.data);
    }
  }
}

debugScraper().catch(console.error);
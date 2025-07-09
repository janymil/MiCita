#!/usr/bin/env node

/**
 * Update search terms for existing businesses in the database
 * This enhances discoverability without touching the Apify scraper
 */

import { enhancedSearchEngine } from './server/enhanced-search-engine.js';

async function updateExistingSearchTerms() {
  console.log('🔍 Starting search terms enhancement for existing businesses...');
  console.log('This will make your 491 businesses much more discoverable!');
  
  try {
    await enhancedSearchEngine.bulkUpdateSearchTerms(50);
    console.log('✅ Search terms update completed successfully!');
    console.log('Your businesses are now much more discoverable with enhanced keywords.');
  } catch (error) {
    console.error('❌ Failed to update search terms:', error);
  }
}

updateExistingSearchTerms();
#!/usr/bin/env node

import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ 
  token: process.env.APIFY_API_TOKEN 
});

async function checkRuns() {
  try {
    console.log('🔍 Checking recent Apify runs...');
    const runs = await client.actor('compass/crawler-google-places').runs().list({ limit: 20 });
    
    console.log(`Found ${runs.items.length} recent runs:\n`);
    
    runs.items.forEach((run, i) => {
      const items = run.stats?.outputDatasetItems || 0;
      const status = run.status;
      const startDate = new Date(run.startedAt).toLocaleString();
      
      console.log(`${i+1}. Run ID: ${run.id}`);
      console.log(`   Status: ${status}`);
      console.log(`   Started: ${startDate}`);
      console.log(`   Items scraped: ${items}`);
      console.log(`   Dataset ID: ${run.defaultDatasetId}`);
      console.log('');
    });
    
    // Find the run with the most items
    const bestRun = runs.items.reduce((best, current) => {
      const currentItems = current.stats?.outputDatasetItems || 0;
      const bestItems = best.stats?.outputDatasetItems || 0;
      return currentItems > bestItems ? current : best;
    });
    
    if (bestRun && (bestRun.stats?.outputDatasetItems || 0) > 0) {
      console.log('🎯 Best run found:');
      console.log(`   Run ID: ${bestRun.id}`);
      console.log(`   Items: ${bestRun.stats?.outputDatasetItems}`);
      console.log(`   Status: ${bestRun.status}`);
      console.log(`   Dataset ID: ${bestRun.defaultDatasetId}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking runs:', error.message);
  }
}

checkRuns().then(() => process.exit(0)).catch(() => process.exit(1));
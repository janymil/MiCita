#!/usr/bin/env node

import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ 
  token: process.env.APIFY_API_TOKEN 
});

async function findLargeDatasets() {
  try {
    console.log('🔍 Searching for large datasets across all actors...');
    
    // Check different potential actor names
    const actorNames = [
      'compass/crawler-google-places',
      'dtrungtin/google-maps-scraper',
      'epctex/google-maps-scraper',
      'tugkan/google-maps-reviews-scraper'
    ];
    
    for (const actorName of actorNames) {
      try {
        console.log(`\n🔍 Checking actor: ${actorName}`);
        const runs = await client.actor(actorName).runs().list({ limit: 20 });
        
        for (const run of runs.items) {
          if (run.defaultDatasetId) {
            try {
              const dataset = await client.dataset(run.defaultDatasetId);
              const info = await dataset.get();
              
              if (info.itemCount > 50) {
                console.log(`📊 Large dataset found!`);
                console.log(`   Actor: ${actorName}`);
                console.log(`   Run ID: ${run.id}`);
                console.log(`   Items: ${info.itemCount}`);
                console.log(`   Status: ${run.status}`);
                console.log(`   Started: ${new Date(run.startedAt).toLocaleString()}`);
                console.log(`   Dataset ID: ${run.defaultDatasetId}`);
                
                // Sample one item to check if it's Peru data
                const { items } = await dataset.listItems({ limit: 1 });
                if (items.length > 0) {
                  const sample = items[0];
                  console.log(`   Sample location: ${sample.address || sample.location || 'Unknown'}`);
                  
                  // Check if it's Peru data
                  const address = (sample.address || sample.location || '').toLowerCase();
                  if (address.includes('peru') || address.includes('lima')) {
                    console.log(`   🎯 PERU DATA FOUND!`);
                    return { 
                      actorName, 
                      runId: run.id, 
                      datasetId: run.defaultDatasetId, 
                      count: info.itemCount,
                      sample
                    };
                  }
                }
              }
            } catch (datasetError) {
              // Skip datasets we can't access
            }
          }
        }
      } catch (actorError) {
        console.log(`   ❌ Cannot access actor: ${actorName}`);
      }
    }
    
    // Also check our account's datasets directly
    console.log('\n🔍 Checking account datasets directly...');
    const datasets = await client.datasets().list({ limit: 50 });
    
    for (const dataset of datasets.items) {
      try {
        const info = await client.dataset(dataset.id).get();
        if (info.itemCount > 50) {
          console.log(`📊 Dataset ${dataset.id}: ${info.itemCount} items`);
          
          // Sample to check content
          const { items } = await client.dataset(dataset.id).listItems({ limit: 1 });
          if (items.length > 0) {
            const sample = items[0];
            const address = (sample.address || sample.location || sample.title || '').toLowerCase();
            console.log(`   Sample: ${sample.title || 'Unknown'} - ${address}`);
            
            if (address.includes('peru') || address.includes('lima')) {
              console.log(`   🎯 PERU DATA FOUND in dataset ${dataset.id}!`);
              return { 
                datasetId: dataset.id, 
                count: info.itemCount,
                sample,
                direct: true
              };
            }
          }
        }
      } catch (e) {
        // Skip datasets we can't access
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

findLargeDatasets().then(result => {
  if (result) {
    console.log(`\n✅ Found Peru dataset with ${result.count} businesses!`);
    if (result.direct) {
      console.log(`Dataset ID: ${result.datasetId}`);
    } else {
      console.log(`Actor: ${result.actorName}`);
      console.log(`Run ID: ${result.runId}`);
      console.log(`Dataset ID: ${result.datasetId}`);
    }
  } else {
    console.log('\n❌ No large Peru datasets found');
  }
  process.exit(0);
}).catch(() => process.exit(1));
#!/usr/bin/env node

import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ 
  token: process.env.APIFY_API_TOKEN 
});

async function checkDataset(runId, datasetId) {
  try {
    console.log(`📊 Checking dataset ${datasetId} from run ${runId}...`);
    const dataset = await client.dataset(datasetId);
    const { items } = await dataset.listItems({ limit: 5 });
    
    console.log(`Found ${items.length} sample items`);
    if (items.length > 0) {
      console.log('Sample business:', JSON.stringify(items[0], null, 2));
    }
    
    // Get total count
    const info = await dataset.get();
    console.log(`Total items in dataset: ${info.itemCount}`);
    
    return { items, totalCount: info.itemCount };
  } catch (error) {
    console.error(`Error checking dataset: ${error.message}`);
    return { items: [], totalCount: 0 };
  }
}

async function checkAll() {
  try {
    // Get all runs and look for the one with data
    const runs = await client.actor('compass/crawler-google-places').runs().list({ limit: 50 });
    console.log(`Checking ${runs.items.length} runs for data...\n`);
    
    for (const run of runs.items) {
      if (run.defaultDatasetId) {
        const result = await checkDataset(run.id, run.defaultDatasetId);
        if (result.totalCount > 0) {
          console.log(`\n🎯 FOUND DATA! Run ${run.id} has ${result.totalCount} items`);
          console.log(`Status: ${run.status}`);
          console.log(`Started: ${new Date(run.startedAt).toLocaleString()}`);
          if (run.finishedAt) {
            console.log(`Finished: ${new Date(run.finishedAt).toLocaleString()}`);
          }
          console.log(`Dataset ID: ${run.defaultDatasetId}`);
          
          // Stop after finding the first run with data
          return { runId: run.id, datasetId: run.defaultDatasetId, count: result.totalCount };
        }
      }
    }
    
    console.log('❌ No runs found with data');
    return null;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

checkAll().then(result => {
  if (result) {
    console.log(`\n✅ Ready to import ${result.count} businesses from run ${result.runId}`);
  }
  process.exit(0);
}).catch(() => process.exit(1));
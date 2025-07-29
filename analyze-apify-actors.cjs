#!/usr/bin/env node

/**
 * DETAILED APIFY ACTOR ANALYSIS
 * 
 * This script will:
 * 1. List all available actors
 * 2. Test the specific Google Places actor
 * 3. Check actor configuration and permissions
 */

require('dotenv').config();
const { ApifyClient } = require('apify-client');

async function analyzeApifyActors() {
  console.log('🎭 DETAILED APIFY ACTOR ANALYSIS');
  console.log('=================================\n');

  const client = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
  });

  try {
    // 1. List all available actors
    console.log('📋 1. LISTING ALL AVAILABLE ACTORS');
    console.log('-----------------------------------');
    
    const actors = await client.actors().list({ limit: 50 });
    console.log(`Total actors available: ${actors.total}\n`);
    
    console.log('Available actors:');
    actors.items.forEach((actor, index) => {
      console.log(`  ${index + 1}. ${actor.name} (${actor.id})`);
      if (actor.name.toLowerCase().includes('google') || actor.name.toLowerCase().includes('maps') || actor.name.toLowerCase().includes('places')) {
        console.log(`     🎯 GOOGLE/MAPS ACTOR FOUND! ^^^`);
      }
    });

    // 2. Search specifically for Google Places actors
    console.log('\n🔍 2. SEARCHING FOR GOOGLE PLACES ACTORS');
    console.log('------------------------------------------');
    
    const searchResults = await client.actors().list({ 
      limit: 50,
      search: 'google places'
    });
    
    console.log(`Found ${searchResults.items.length} Google Places related actors:`);
    searchResults.items.forEach((actor, index) => {
      console.log(`  ${index + 1}. ${actor.name} (${actor.id})`);
      console.log(`     Description: ${actor.description || 'No description'}`);
      console.log(`     Created by: ${actor.username}`);
      console.log(`     Public: ${actor.isPublic ? 'Yes' : 'No'}`);
      console.log(`     ---`);
    });

    // 3. Test the specific actor we're using
    console.log('\n🧪 3. TESTING SPECIFIC GOOGLE PLACES ACTOR');
    console.log('--------------------------------------------');
    
    const targetActorId = 'compass/crawler-google-places';
    console.log(`Testing actor: ${targetActorId}`);
    
    try {
      // First, check if the actor exists and get its details
      const actorInfo = await client.actor(targetActorId).get();
      console.log(`✅ Actor found: ${actorInfo.name}`);
      console.log(`   Description: ${actorInfo.description}`);
      console.log(`   Created by: ${actorInfo.username}`);
      console.log(`   Public: ${actorInfo.isPublic ? 'Yes' : 'No'}`);
      console.log(`   Last modified: ${actorInfo.modifiedAt}`);
      
      // Check input schema
      const inputSchema = await client.actor(targetActorId).getInputSchema();
      console.log(`   Input schema available: ${inputSchema ? 'Yes' : 'No'}`);
      
      if (inputSchema && inputSchema.properties) {
        console.log('   Required fields:');
        Object.keys(inputSchema.properties).forEach(field => {
          const prop = inputSchema.properties[field];
          console.log(`     - ${field}: ${prop.type} ${prop.description ? `(${prop.description})` : ''}`);
        });
      }

    } catch (error) {
      console.error(`❌ Error accessing actor ${targetActorId}:`, error.message);
      
      // Let's try alternative Google Places actors
      console.log('\n🔍 Trying alternative Google Places actors...');
      
      const alternatives = [
        'apify/google-maps-scraper',
        'dtrungtin/google-maps-scraper', 
        'maxcopell/google-maps-scraper',
        'compass/google-maps-scraper'
      ];
      
      for (const altActorId of alternatives) {
        try {
          const altActor = await client.actor(altActorId).get();
          console.log(`✅ Alternative found: ${altActor.name} (${altActorId})`);
          console.log(`   Description: ${altActor.description}`);
          console.log(`   Public: ${altActor.isPublic ? 'Yes' : 'No'}`);
        } catch (altError) {
          console.log(`❌ ${altActorId}: Not accessible`);
        }
      }
    }

    // 4. Test a simple actor run (if possible)
    console.log('\n🚀 4. TESTING SIMPLE ACTOR RUN');
    console.log('-------------------------------');
    
    try {
      console.log('Attempting a test run with minimal input...');
      
      const testInput = {
        startUrls: [
          {
            url: "https://www.google.com/maps/place/Starbucks/@-12.046373,-77.042755,17z",
            method: "GET"
          }
        ],
        language: "es-419",
        maxReviews: 1,
        scrapeReviewsPersonalData: false,
        includeWebResults: false
      };
      
      console.log('Test input:', JSON.stringify(testInput, null, 2));
      
      const run = await client.actor(targetActorId).call(testInput, {
        timeout: 30 // 30 second timeout for test
      });
      
      console.log(`✅ Test run started successfully!`);
      console.log(`   Run ID: ${run.id}`);
      console.log(`   Status: ${run.status}`);
      
      // Try to get some results
      if (run.defaultDatasetId) {
        const dataset = await client.dataset(run.defaultDatasetId).listItems();
        console.log(`   Results: ${dataset.items.length} items found`);
        
        if (dataset.items.length > 0) {
          console.log('   Sample result keys:', Object.keys(dataset.items[0]));
        }
      }
      
    } catch (runError) {
      console.error('❌ Test run failed:', runError.message);
      
      if (runError.message.includes('not found')) {
        console.log('💡 The actor might not exist or might have been renamed');
      } else if (runError.message.includes('permission') || runError.message.includes('access')) {
        console.log('💡 You might not have permission to use this actor');
      } else if (runError.message.includes('input')) {
        console.log('💡 The input format might be incorrect');
      }
    }

  } catch (error) {
    console.error('❌ Failed to analyze Apify actors:', error.message);
  }
}

// Run the analysis
analyzeApifyActors().catch(console.error);

#!/usr/bin/env node

/**
 * COMPREHENSIVE SCRAPING SYSTEM DEBUG SCRIPT
 * 
 * This script will test every component of the scraping system:
 * 1. Environment variables
 * 2. Apify service connection
 * 3. API routes (start, status, results)
 * 4. Orchestrator logic
 * 5. Data processing pipeline
 * 6. Frontend integration points
 */

const http = require('http');
const https = require('https');
const path = require('path');
require('dotenv').config();

console.log('🔍 COMPREHENSIVE SCRAPING SYSTEM ANALYSIS');
console.log('==========================================\n');

// 1. ENVIRONMENT VARIABLES CHECK
console.log('📋 1. ENVIRONMENT VARIABLES');
console.log('----------------------------');
const requiredVars = ['APIFY_API_TOKEN', 'OPENAI_API_KEY', 'DATABASE_URL'];
const optionalVars = ['EMAIL_USER', 'EMAIL_PASS', 'PIXABAY_API_KEY'];

console.log('Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const displayValue = value ? `${value.substring(0, 20)}...` : 'Not set';
  console.log(`  ${status} ${varName}: ${displayValue}`);
});

console.log('\nOptional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '⚠️';
  const displayValue = value ? `${value.substring(0, 20)}...` : 'Not set';
  console.log(`  ${status} ${varName}: ${displayValue}`);
});

// 2. APIFY SERVICE TEST
console.log('\n📡 2. APIFY SERVICE CONNECTION TEST');
console.log('------------------------------------');

async function testApifyConnection() {
  try {
    const { ApifyClient } = require('apify-client');
    const client = new ApifyClient({
      token: process.env.APIFY_API_TOKEN,
    });
    
    console.log('✅ Apify client initialized successfully');
    
    // Test with a simple actor call
    console.log('🔍 Testing basic Apify connection...');
    const actors = await client.actors().list({ limit: 1 });
    console.log(`✅ Apify connection successful - Found ${actors.total} available actors`);
    
    // Test our specific 3 actors
    console.log('\n🎯 Testing OUR SPECIFIC 3 ACTORS:');
    const ourActors = [
      'cleansyntax/facebook-pages-scraper',
      'apify/instagram-scraper', 
      'compass/crawler-google-places'
    ];
    
    for (const actorId of ourActors) {
      try {
        console.log(`🔍 Testing actor: ${actorId}`);
        const actor = await client.actor(actorId).get();
        console.log(`✅ ${actorId} - Available (${actor.title})`);
      } catch (error) {
        console.log(`❌ ${actorId} - NOT AVAILABLE: ${error.message}`);
      }
    }
    
    // Test a real Google Maps URL with our actor
    console.log('\n🗺️ Testing Google Places actor with real URL...');
    try {
      const testUrl = 'https://www.google.com/maps/place/Starbucks/@-12.0464,-77.0428,17z';
      console.log(`🔍 Testing URL: ${testUrl}`);
      
      const runInput = {
        includeWebResults: true,
        language: "es-419",
        maxImages: 5,
        maxReviews: 5,
        startUrls: [{ url: testUrl, method: "GET" }]
      };
      
      console.log('🚀 Starting Google Places actor...');
      const run = await client.actor("compass/crawler-google-places").call(runInput);
      console.log(`✅ Google Places actor started successfully! Run ID: ${run.id}`);
      
      // Wait a bit and check results
      console.log('⏳ Waiting 10 seconds for results...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      const dataset = await client.dataset(run.defaultDatasetId).listItems();
      console.log(`📊 Results: ${dataset.items.length} items found`);
      
      if (dataset.items.length > 0) {
        const item = dataset.items[0];
        console.log(`✅ Sample data: ${item.title || item.name || 'Business found'}`);
      }
      
    } catch (error) {
      console.log(`❌ Google Places test failed: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Apify connection failed:', error.message);
    return false;
  }
}

// 3. GOOGLE MAPS URL VALIDATION TEST
console.log('\n🗺️ 3. GOOGLE MAPS URL VALIDATION');
console.log('----------------------------------');

const testUrls = [
  'https://www.google.com/maps/place/Restaurant+Example/@-12.0464,-77.0428,17z',
  'https://maps.google.com/maps?q=restaurant',
  'https://goo.gl/maps/abc123',
  'https://maps.app.goo.gl/abc123',
  'https://invalid-url.com',
  ''
];

function validateGoogleMapsUrl(url) {
  if (!url) return { valid: true, reason: 'Optional field' };
  
  const patterns = [
    /^https:\/\/(?:www\.)?google\.com\/maps\/place\//,
    /^https:\/\/(?:www\.)?google\.com\/maps\/@/,
    /^https:\/\/maps\.google\.com\/maps\?/,
    /^https:\/\/goo\.gl\/maps\//,
    /^https:\/\/maps\.app\.goo\.gl\//
  ];
  
  const isValid = patterns.some(pattern => pattern.test(url));
  return { 
    valid: isValid, 
    reason: isValid ? 'Valid Google Maps URL' : 'Invalid format' 
  };
}

testUrls.forEach(url => {
  const result = validateGoogleMapsUrl(url);
  const status = result.valid ? '✅' : '❌';
  const displayUrl = url || '(empty)';
  console.log(`  ${status} ${displayUrl} - ${result.reason}`);
});

// 4. SERVER API ROUTES TEST  
async function testApiRoutes() {
  console.log('\n🌐 4. API ROUTES TEST');
  console.log('---------------------');
  
  const baseUrl = 'http://localhost:3001';
  
  // Helper function to make HTTP requests
  function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https:') ? https : http;
      const req = protocol.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({ status: res.statusCode, data: jsonData });
          } catch (e) {
            resolve({ status: res.statusCode, data: data });
          }
        });
      });
      
      req.on('error', reject);
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }
  
  try {
    // Test 1: Start scraping endpoint
    console.log('🚀 Testing /api/scraping/start endpoint...');
    const startResult = await makeRequest(`${baseUrl}/api/scraping/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessId: 'test-business-123',
        businessName: 'Test Restaurant',
        googleMapsUrl: 'https://www.google.com/maps/place/Test+Restaurant/@-12.0464,-77.0428,17z',
        category: 'Restaurant'
      })
    });
    
    if (startResult.status === 200) {
      console.log('✅ Start endpoint working');
      console.log(`📋 Job ID: ${startResult.data.jobId}`);
      
      // Test 2: Status endpoint
      console.log('📊 Testing /api/scraping/status endpoint...');
      const statusResult = await makeRequest(`${baseUrl}/api/scraping/status/${startResult.data.jobId}`);
      
      if (statusResult.status === 200) {
        console.log('✅ Status endpoint working');
        console.log(`📊 Status: ${statusResult.data.data.status}`);
        console.log(`📈 Progress: ${statusResult.data.data.progress}%`);
      } else {
        console.log('❌ Status endpoint failed:', statusResult.status);
      }
      
      // Test 3: Results endpoint (should fail since job is not completed)
      console.log('📋 Testing /api/scraping/results endpoint...');
      const resultsResult = await makeRequest(`${baseUrl}/api/scraping/results/${startResult.data.jobId}`);
      
      if (resultsResult.status === 400) {
        console.log('✅ Results endpoint working (correctly rejecting incomplete job)');
      } else {
        console.log('⚠️ Results endpoint behavior unexpected:', resultsResult.status);
      }
      
    } else {
      console.log('❌ Start endpoint failed:', startResult.status, startResult.data);
    }
    
  } catch (error) {
    console.log('❌ API test failed - is the server running?');
    console.log('💡 Run: npm run dev:server');
  }
}

// 5. FILE STRUCTURE ANALYSIS
console.log('\n📁 5. FILE STRUCTURE ANALYSIS');
console.log('------------------------------');

const criticalFiles = [
  'client/src/components/auto-setup-tab.tsx',
  'server/routes/scraping.ts',
  'services/scraping-orchestrator.ts',
  'lib/apify-scraping-service.ts',
  'services/data-merger.ts',
  'services/data-processor.ts',
  'services/ai-enhancer.ts'
];

const fs = require('fs');

criticalFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  try {
    const stats = fs.statSync(fullPath);
    console.log(`✅ ${file} (${(stats.size / 1024).toFixed(1)}KB)`);
  } catch (error) {
    console.log(`❌ ${file} - Missing!`);
  }
});

// 6. DEPENDENCY CHECK
console.log('\n📦 6. DEPENDENCY CHECK');
console.log('----------------------');

const requiredDeps = [
  'apify-client',
  '@tanstack/react-query',
  'zod',
  'openai'
];

try {
  const packageJson = require('./package.json');
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  requiredDeps.forEach(dep => {
    if (allDeps[dep]) {
      console.log(`✅ ${dep}: ${allDeps[dep]}`);
    } else {
      console.log(`❌ ${dep}: Missing!`);
    }
  });
} catch (error) {
  console.log('❌ Could not read package.json');
}

// 7. EXECUTION SUMMARY
async function runCompleteAnalysis() {
  console.log('\n🔬 RUNNING COMPLETE ANALYSIS...');
  console.log('================================\n');
  
  let apifyOk = false;
  try {
    apifyOk = await testApifyConnection();
  } catch (error) {
    console.log('❌ Apify test failed');
  }
  
  // Wait a bit before testing API
  console.log('\n⏳ Waiting 2 seconds before API test...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testApiRoutes();
  
  console.log('\n📊 FINAL ANALYSIS SUMMARY');
  console.log('=========================');
  console.log(`✅ Environment Variables: ${requiredVars.every(v => process.env[v]) ? 'OK' : 'MISSING'}`);
  console.log(`✅ Apify Connection: ${apifyOk ? 'OK' : 'FAILED'}`);
  console.log(`✅ File Structure: ${criticalFiles.every(f => {
    try { fs.statSync(path.join(__dirname, f)); return true; } catch { return false; }
  }) ? 'OK' : 'MISSING FILES'}`);
  
  console.log('\n🚀 RECOMMENDED ACTIONS:');
  console.log('1. Ensure server is running: npm run dev:server');
  console.log('2. Test with a real Google Maps URL');
  console.log('3. Monitor browser console for frontend errors');
  console.log('4. Check terminal logs for backend errors');
  
  if (!apifyOk) {
    console.log('\n❌ CRITICAL: Apify connection failed!');
    console.log('   - Check APIFY_API_TOKEN in .env file');
    console.log('   - Verify internet connection');
    console.log('   - Check Apify account status');
  }
}

// Run the analysis
runCompleteAnalysis().catch(console.error);

#!/usr/bin/env node

// Test script for Apify Week 1 scraping
// This script tests the Apify API integration and starts Wave 1

const BASE_URL = 'http://localhost:5000';

async function testApifyAPIs() {
  console.log('🧪 Testing Apify API integration...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/test-apis`);
    const data = await response.json();
    
    console.log('📊 API Test Results:');
    console.log('===================');
    
    // Check cached data
    if (data.cached) {
      console.log(`📚 Cached Data: ${data.cached.status}`);
      console.log(`   Message: ${data.cached.message}`);
      console.log(`   Count: ${data.cached.count}`);
    }
    
    // Check Apify API
    if (data.apify) {
      console.log(`🔧 Apify API: ${data.apify.status}`);
      console.log(`   Message: ${data.apify.message}`);
      console.log(`   Count: ${data.apify.count}`);
    }
    
    return data.apify?.status === 'working';
    
  } catch (error) {
    console.error('❌ Error testing APIs:', error.message);
    return false;
  }
}

async function getWaveStatus() {
  console.log('\n📋 Getting wave configurations...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/apify/waves`);
    const data = await response.json();
    
    console.log('🌊 Wave Status:');
    console.log('===============');
    
    // Show summary
    if (data.summary) {
      console.log(`Total Waves: ${data.summary.totalWaves}`);
      console.log(`Completed: ${data.summary.completedWaves}`);
      console.log(`Businesses Found: ${data.summary.totalBusinessesFound}`);
      console.log(`Businesses Processed: ${data.summary.totalBusinessesProcessed}`);
      console.log(`Credits Used: ${data.summary.estimatedCreditsUsed}`);
    }
    
    // Show Week 1 waves
    const week1Waves = data.waves.filter(w => w.id.includes('wave-1') || w.id.includes('wave-2'));
    
    console.log('\n🎯 Week 1 Waves:');
    console.log('================');
    
    week1Waves.forEach(wave => {
      console.log(`${wave.name} (${wave.id})`);
      console.log(`  Status: ${wave.progress?.status || 'pending'}`);
      console.log(`  Cities: ${wave.cities.join(', ')}`);
      console.log(`  Districts: ${wave.districts.slice(0, 3).join(', ')}${wave.districts.length > 3 ? '...' : ''}`);
      console.log(`  Target: ${wave.maxBusinesses} businesses`);
      console.log(`  Credits: ${wave.estimatedCredits}`);
      
      if (wave.progress) {
        console.log(`  Found: ${wave.progress.businessesFound}`);
        console.log(`  Processed: ${wave.progress.businessesProcessed}`);
        console.log(`  Errors: ${wave.progress.errors.length}`);
      }
      console.log('');
    });
    
    return week1Waves;
    
  } catch (error) {
    console.error('❌ Error getting wave status:', error.message);
    return [];
  }
}

async function executeWave1() {
  console.log('🚀 Starting Wave 1: Lima Premium Districts...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/apify/waves/wave-1-lima-premium/execute`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Wave 1 execution started successfully!');
      console.log(`📨 Message: ${data.message}`);
      console.log(`🆔 Wave ID: ${data.waveId}`);
      console.log('\n⏳ Wave is running in background...');
      console.log('💡 Check progress at: http://localhost:5173/admin/apify-scraping');
      
      // Poll for updates
      console.log('\n📊 Monitoring progress (60 seconds)...');
      
      for (let i = 0; i < 12; i++) { // 12 iterations = 60 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const statusResponse = await fetch(`${BASE_URL}/api/apify/waves`);
        const statusData = await statusResponse.json();
        
        const wave1 = statusData.waves.find(w => w.id === 'wave-1-lima-premium');
        if (wave1?.progress) {
          console.log(`   Status: ${wave1.progress.status} | Found: ${wave1.progress.businessesFound} | Processed: ${wave1.progress.businessesProcessed}`);
          
          if (wave1.progress.status === 'completed') {
            console.log('🎉 Wave 1 completed successfully!');
            break;
          }
          
          if (wave1.progress.status === 'failed') {
            console.log('❌ Wave 1 failed');
            console.log('Errors:', wave1.progress.errors);
            break;
          }
        }
      }
      
      return true;
    } else {
      console.error('❌ Failed to start Wave 1');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error executing Wave 1:', error.message);
    return false;
  }
}

async function main() {
  console.log('🎯 Apify Week 1 Scraping Test');
  console.log('============================\n');
  
  // Step 1: Test API integration
  const apiWorking = await testApifyAPIs();
  
  if (!apiWorking) {
    console.log('\n❌ Apify API not working. Please check:');
    console.log('1. APIFY_API_TOKEN is set in .env');
    console.log('2. Server is running on http://localhost:5173');
    console.log('3. Apify account has sufficient credits');
    return;
  }
  
  // Step 2: Get current wave status
  const waves = await getWaveStatus();
  
  // Step 3: Check if Wave 1 is already completed
  const wave1 = waves.find(w => w.id === 'wave-1-lima-premium');
  
  if (wave1?.progress?.status === 'completed') {
    console.log('✅ Wave 1 is already completed!');
    console.log(`   Businesses found: ${wave1.progress.businessesFound}`);
    console.log(`   Businesses processed: ${wave1.progress.businessesProcessed}`);
    console.log(`   Credits used: ${wave1.progress.creditsUsed}`);
    return;
  }
  
  if (wave1?.progress?.status === 'running') {
    console.log('⏳ Wave 1 is already running...');
    return;
  }
  
  // Step 4: Execute Wave 1
  console.log('🚀 Ready to execute Wave 1!');
  console.log('Expected results:');
  console.log('- 2,000 businesses from Lima premium districts');
  console.log('- Miraflores, San Isidro, La Molina, Surco, Barranco');
  console.log('- ~40 Apify credits (~$8)');
  console.log('');
  
  const proceed = true; // Auto-proceed for this test
  
  if (proceed) {
    const success = await executeWave1();
    
    if (success) {
      console.log('\n🎉 Wave 1 execution completed!');
      console.log('👉 Next steps:');
      console.log('1. Monitor progress in admin dashboard');
      console.log('2. Test search functionality with new data');
      console.log('3. Prepare for Wave 2 execution');
    }
  }
}

// Run the test
main().catch(console.error);
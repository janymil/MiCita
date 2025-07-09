#!/usr/bin/env node

// Verification script to ensure system is ready for Week 1 Apify scraping
console.log('🔍 Verifying Week 1 Scraping Readiness...\n');

const checks = [];

// Check 1: Environment Variables
function checkEnvironment() {
  console.log('1. Checking environment variables...');
  
  const hasApifyToken = process.env.APIFY_API_TOKEN;
  const hasDbUrl = process.env.DATABASE_URL;
  
  if (hasApifyToken) {
    console.log('   ✅ APIFY_API_TOKEN found');
    checks.push(true);
  } else {
    console.log('   ❌ APIFY_API_TOKEN missing');
    console.log('      Add to .env: APIFY_API_TOKEN=your_token_here');
    checks.push(false);
  }
  
  if (hasDbUrl) {
    console.log('   ✅ DATABASE_URL found');
  } else {
    console.log('   ⚠️  DATABASE_URL missing (might use default)');
  }
  
  console.log('');
}

// Check 2: Server Status
async function checkServer() {
  console.log('2. Checking server status...');
  
  try {
    const response = await fetch('http://localhost:5000/api/test-apis');
    if (response.ok) {
      console.log('   ✅ Server is running');
      checks.push(true);
    } else {
      console.log('   ❌ Server error:', response.status);
      checks.push(false);
    }
  } catch (error) {
    console.log('   ❌ Server not accessible');
    console.log('      Start server: npm run dev');
    checks.push(false);
  }
  
  console.log('');
}

// Check 3: Database Schema
async function checkDatabase() {
  console.log('3. Checking database schema...');
  
  try {
    const response = await fetch('http://localhost:5000/api/apify/waves');
    if (response.ok) {
      console.log('   ✅ Database schema ready');
      checks.push(true);
    } else {
      console.log('   ❌ Database schema error');
      console.log('      Run: npm run db:push');
      checks.push(false);
    }
  } catch (error) {
    console.log('   ❌ Database not accessible');
    checks.push(false);
  }
  
  console.log('');
}

// Check 4: Apify API Access
async function checkApifyAPI() {
  console.log('4. Checking Apify API access...');
  
  try {
    const response = await fetch('http://localhost:5000/api/test-apis');
    const data = await response.json();
    
    if (data.apify && data.apify.status === 'working') {
      console.log('   ✅ Apify API working');
      console.log(`      Message: ${data.apify.message}`);
      checks.push(true);
    } else {
      console.log('   ❌ Apify API not working');
      console.log(`      Error: ${data.apify?.message || 'Unknown error'}`);
      checks.push(false);
    }
  } catch (error) {
    console.log('   ❌ Could not test Apify API');
    checks.push(false);
  }
  
  console.log('');
}

// Check 5: Wave Configurations
async function checkWaveConfigs() {
  console.log('5. Checking wave configurations...');
  
  try {
    const response = await fetch('http://localhost:5000/api/apify/waves');
    const data = await response.json();
    
    if (data.waves && data.waves.length >= 8) {
      console.log('   ✅ All 8 waves configured');
      
      const week1Waves = data.waves.filter(w => w.id.includes('wave-1') || w.id.includes('wave-2'));
      console.log(`   📊 Week 1 waves: ${week1Waves.length}/2`);
      
      week1Waves.forEach(wave => {
        console.log(`      - ${wave.name}: ${wave.maxBusinesses} businesses, ${wave.estimatedCredits} credits`);
      });
      
      checks.push(true);
    } else {
      console.log('   ❌ Wave configurations incomplete');
      checks.push(false);
    }
  } catch (error) {
    console.log('   ❌ Could not load wave configurations');
    checks.push(false);
  }
  
  console.log('');
}

// Check 6: Existing Data
async function checkExistingData() {
  console.log('6. Checking existing data...');
  
  try {
    const response = await fetch('http://localhost:5000/api/test-apis');
    const data = await response.json();
    
    if (data.cached && data.cached.count > 0) {
      console.log(`   📊 Found ${data.cached.count} existing businesses`);
      console.log('   ✅ Database is populated');
    } else {
      console.log('   📊 No existing businesses found');
      console.log('   ✅ Clean slate for scraping');
    }
    
    checks.push(true);
  } catch (error) {
    console.log('   ❌ Could not check existing data');
    checks.push(false);
  }
  
  console.log('');
}

// Summary
function showSummary() {
  const passed = checks.filter(Boolean).length;
  const total = checks.length;
  
  console.log('📋 SUMMARY');
  console.log('==========');
  console.log(`Checks passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('✅ System is ready for Week 1 scraping!');
    console.log('');
    console.log('🚀 Next steps:');
    console.log('1. Run: node test-apify-week1.js');
    console.log('2. Or execute Wave 1 manually via API');
    console.log('3. Monitor progress in admin dashboard');
    console.log('');
    console.log('📊 Week 1 targets:');
    console.log('- Wave 1: 2,000 businesses (Lima Premium)');
    console.log('- Wave 2: 1,500 businesses (Lima Business)');
    console.log('- Total: 3,500+ businesses');
    console.log('- Cost: ~$14 (70 credits)');
  } else {
    console.log('❌ System not ready. Please fix the issues above.');
    console.log('');
    console.log('💡 Quick fixes:');
    console.log('1. Set APIFY_API_TOKEN in .env');
    console.log('2. Start server: npm run dev');
    console.log('3. Run migrations: npm run db:push');
  }
}

// Run all checks
async function main() {
  checkEnvironment();
  await checkServer();
  await checkDatabase();
  await checkApifyAPI();
  await checkWaveConfigs();
  await checkExistingData();
  showSummary();
}

main().catch(console.error);
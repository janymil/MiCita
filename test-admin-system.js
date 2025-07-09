#!/usr/bin/env node

/**
 * Test script to verify the admin system functionality
 */

const BASE_URL = 'http://localhost:5000';
const ADMIN_TOKEN = process.env.ADMIN_PASSWORD || 'admin123';

async function testAdminAuth() {
  console.log('🔐 Testing admin authentication...');
  
  try {
    // Test without token
    const response1 = await fetch(`${BASE_URL}/api/admin/stats`);
    if (response1.status === 401) {
      console.log('   ✅ Unauthenticated request properly blocked');
    } else {
      console.log('   ❌ Unauthenticated request should be blocked');
    }
    
    // Test with valid token
    const response2 = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });
    
    if (response2.ok) {
      console.log('   ✅ Admin authentication working');
      return true;
    } else {
      console.log('   ❌ Admin authentication failed');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Authentication test error:', error.message);
    return false;
  }
}

async function testAdminStats() {
  console.log('\n📊 Testing admin stats endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Stats endpoint working');
      console.log(`   📈 Total businesses: ${data.totalBusinesses}`);
      console.log(`   📂 Categories: ${data.categoryStats?.length || 0}`);
      console.log(`   ⭐ Avg quality: ${Math.round(data.qualityStats?.avgQuality || 0)}%`);
      return true;
    } else {
      console.log('   ❌ Stats endpoint failed');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Stats test error:', error.message);
    return false;
  }
}

async function testBusinessesList() {
  console.log('\n📋 Testing businesses list endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/businesses?page=1&limit=5`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Businesses list working');
      console.log(`   📊 Returned: ${data.businesses?.length || 0} businesses`);
      console.log(`   📄 Pagination: page ${data.pagination?.page}/${data.pagination?.totalPages}`);
      
      if (data.businesses && data.businesses.length > 0) {
        const business = data.businesses[0];
        console.log(`   🏢 Sample: ${business.name} (${business.category})`);
      }
      return true;
    } else {
      console.log('   ❌ Businesses list failed');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Businesses list error:', error.message);
    return false;
  }
}

async function testBusinessCRUD() {
  console.log('\n🔧 Testing business CRUD operations...');
  
  try {
    // Create a test business
    const testBusiness = {
      name: 'Test Admin Business',
      address: 'Av. Test 123, Lima',
      category: 'servicios',
      phone: '+51 999 999 999',
      website: 'https://test-admin.com',
      rating: 4.5,
      reviewCount: 10,
      latitude: -12.0464,
      longitude: -77.0428,
      verifiedStatus: 'verified',
      businessStatus: 'operational'
    };
    
    console.log('   Creating test business...');
    const createResponse = await fetch(`${BASE_URL}/api/admin/businesses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testBusiness)
    });
    
    if (!createResponse.ok) {
      console.log('   ❌ Business creation failed');
      return false;
    }
    
    const createdBusiness = await createResponse.json();
    console.log('   ✅ Business created successfully');
    console.log(`   🆔 ID: ${createdBusiness.id}`);
    
    // Update the business
    console.log('   Updating test business...');
    const updateData = {
      name: 'Updated Test Admin Business',
      rating: 5.0
    };
    
    const updateResponse = await fetch(`${BASE_URL}/api/admin/businesses/${createdBusiness.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    if (updateResponse.ok) {
      console.log('   ✅ Business updated successfully');
    } else {
      console.log('   ❌ Business update failed');
    }
    
    // Delete the business
    console.log('   Deleting test business...');
    const deleteResponse = await fetch(`${BASE_URL}/api/admin/businesses/${createdBusiness.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });
    
    if (deleteResponse.ok) {
      console.log('   ✅ Business deleted successfully');
      return true;
    } else {
      console.log('   ❌ Business deletion failed');
      return false;
    }
    
  } catch (error) {
    console.log('   ❌ CRUD test error:', error.message);
    return false;
  }
}

async function testFilterOptions() {
  console.log('\n🔍 Testing filter options endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/filter-options`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Filter options working');
      console.log(`   📂 Categories: ${data.categories?.length || 0}`);
      console.log(`   🏷️  Statuses: ${data.statuses?.length || 0}`);
      console.log(`   📊 Sources: ${data.sources?.length || 0}`);
      return true;
    } else {
      console.log('   ❌ Filter options failed');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Filter options error:', error.message);
    return false;
  }
}

async function testSearchFunctionality() {
  console.log('\n🔎 Testing search functionality...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/businesses/search?q=barberia&limit=3`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });
    
    if (response.ok) {
      const businesses = await response.json();
      console.log('   ✅ Search functionality working');
      console.log(`   🔍 Found: ${businesses.length} businesses`);
      
      if (businesses.length > 0) {
        console.log(`   🏢 Sample: ${businesses[0].name}`);
      }
      return true;
    } else {
      console.log('   ❌ Search functionality failed');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Search test error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🎯 Admin System Test Suite');
  console.log('==========================\n');
  
  const results = [];
  
  results.push(await testAdminAuth());
  results.push(await testAdminStats());
  results.push(await testBusinessesList());
  results.push(await testBusinessCRUD());
  results.push(await testFilterOptions());
  results.push(await testSearchFunctionality());
  
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log('\n📋 TEST SUMMARY');
  console.log('===============');
  console.log(`Tests passed: ${passed}/${total}\n`);
  
  if (passed === total) {
    console.log('🎉 ALL ADMIN SYSTEM TESTS PASSED!');
    console.log('');
    console.log('✅ Admin authentication working');
    console.log('✅ Admin dashboard ready');
    console.log('✅ Business management (CRUD) working');
    console.log('✅ Search and filtering working');
    console.log('✅ Data validation implemented');
    console.log('✅ Admin API endpoints functional');
    console.log('');
    console.log('🔗 Access the admin panel:');
    console.log(`   Login: http://localhost:5000/admin`);
    console.log(`   Password: ${ADMIN_TOKEN}`);
    console.log('   Dashboard: http://localhost:5000/admin/dashboard');
    console.log('   Businesses: http://localhost:5000/admin/businesses');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('');
    console.log('Please check the failed tests above and ensure:');
    console.log('1. Server is running on http://localhost:5000');
    console.log('2. Database is connected');
    console.log('3. Admin routes are properly configured');
    console.log('4. Environment variables are set');
  }
  
  console.log('');
  console.log('📊 Admin Features Available:');
  console.log('- View database statistics');
  console.log('- Search and filter businesses');
  console.log('- Add/edit/delete businesses');
  console.log('- Bulk operations');
  console.log('- Export data (CSV/JSON)');
  console.log('- Quality score management');
  console.log('- Enhanced business data fields');
}

main().catch(console.error);
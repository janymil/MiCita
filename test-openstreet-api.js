#!/usr/bin/env node

async function testAPI() {
  console.log('🧪 Testing OpenStreet API endpoints...\n');
  
  const baseUrl = 'http://localhost:5000';
  const adminToken = process.env.ADMIN_PASSWORD || 'admin123';
  
  // Test filter options
  console.log('1. Testing filter options...');
  try {
    const response = await fetch(`${baseUrl}/api/admin/openstreet/filter-options`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Filter options API working');
      console.log(`   Categories: ${data.categories?.length || 0}`);
      console.log(`   Amenities: ${data.amenities?.length || 0}`);
      console.log(`   Districts: ${data.districts?.length || 0}`);
      console.log(`   OSM Types: ${data.osmTypes?.length || 0}`);
      if (data.categories?.length > 0) {
        console.log(`   Sample categories: ${data.categories.slice(0, 3).join(', ')}`);
      }
    } else {
      console.log(`❌ Filter options failed: ${response.status} ${await response.text()}`);
    }
  } catch (error) {
    console.log(`❌ Filter options error: ${error.message}`);
  }
  
  console.log('\n2. Testing businesses list...');
  try {
    const response = await fetch(`${baseUrl}/api/admin/openstreet/businesses?page=1&limit=5`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Businesses API working');
      console.log(`   Total: ${data.total || 0}`);
      console.log(`   Current page: ${data.page || 0}`);
      console.log(`   Returned: ${data.businesses?.length || 0}`);
      
      if (data.businesses?.length > 0) {
        console.log('\n   Sample business:');
        const sample = data.businesses[0];
        console.log(`   - Name: ${sample.name || 'N/A'}`);
        console.log(`   - OSM ID: ${sample.osmId || 'N/A'}`);
        console.log(`   - Category: ${sample.category || 'N/A'}`);
        console.log(`   - District: ${sample.district || 'N/A'}`);
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ Businesses failed: ${response.status} ${errorText}`);
    }
  } catch (error) {
    console.log(`❌ Businesses error: ${error.message}`);
  }
  
  console.log('\n3. Testing with different auth token...');
  try {
    const response = await fetch(`${baseUrl}/api/admin/openstreet/businesses?page=1&limit=1`, {
      headers: {
        'Authorization': `Bearer wrongtoken`
      }
    });
    
    console.log(`Expected 401, got: ${response.status}`);
  } catch (error) {
    console.log(`Auth test error: ${error.message}`);
  }
  
  console.log('\n4. Testing without auth...');
  try {
    const response = await fetch(`${baseUrl}/api/admin/openstreet/businesses?page=1&limit=1`);
    console.log(`Expected 401, got: ${response.status}`);
  } catch (error) {
    console.log(`No auth test error: ${error.message}`);
  }
}

testAPI().catch(console.error);
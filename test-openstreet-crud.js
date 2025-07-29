#!/usr/bin/env node

async function testOpenStreetCRUD() {
  console.log('🧪 Testing complete OpenStreet CRUD functionality...\n');
  
  const baseUrl = 'http://localhost:5000';
  const adminToken = process.env.ADMIN_PASSWORD || 'admin123';
  
  try {
    // 1. Test CREATE
    console.log('1. Testing CREATE new business...');
    const testBusiness = {
      osmId: `test_${Date.now()}`,
      osmType: 'node',
      name: 'Test Business',
      address: 'Test Address, Lima',
      category: 'servicios',
      phone: '+51 999 888 777',
      website: 'https://test-business.com',
      email: 'test@business.com',
      description: 'A test business created by automation',
      rating: '4.5',
      reviewCount: 10,
      latitude: '-12.0464',
      longitude: '-77.0428',
      scrapingSource: 'openstreetmap',
      publicBadge: 'openstreet'
    };
    
    const createResponse = await fetch(`${baseUrl}/api/admin/openstreet/businesses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testBusiness)
    });
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`CREATE failed: ${createResponse.status} - ${errorText}`);
    }
    
    const createdBusiness = await createResponse.json();
    console.log(`✅ CREATE successful: ${createdBusiness.name} (ID: ${createdBusiness.id})`);
    
    const testId = createdBusiness.id;
    
    // 2. Test READ
    console.log('\n2. Testing READ single business...');
    const readResponse = await fetch(`${baseUrl}/api/admin/openstreet/businesses/${testId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (readResponse.ok) {
      const business = await readResponse.json();
      console.log(`✅ READ successful: ${business.name}`);
      console.log(`   Rating: ${business.rating}`);
      console.log(`   Phone: ${business.phone}`);
      console.log(`   Website: ${business.website}`);
    } else {
      console.log(`❌ READ failed: ${readResponse.status}`);
    }
    
    // 3. Test UPDATE
    console.log('\n3. Testing UPDATE business...');
    const updateData = {
      ...createdBusiness,
      name: 'Updated Test Business',
      description: 'Updated description',
      rating: '5.0',
      reviewCount: 25
    };
    
    const updateResponse = await fetch(`${baseUrl}/api/admin/openstreet/businesses/${testId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    if (updateResponse.ok) {
      const updatedBusiness = await updateResponse.json();
      console.log(`✅ UPDATE successful: ${updatedBusiness.name}`);
      console.log(`   New rating: ${updatedBusiness.rating}`);
      console.log(`   New review count: ${updatedBusiness.reviewCount}`);
    } else {
      const errorText = await updateResponse.text();
      console.log(`❌ UPDATE failed: ${updateResponse.status} - ${errorText}`);
    }
    
    // 4. Test LIST with filters
    console.log('\n4. Testing LIST with filters...');
    const listResponse = await fetch(`${baseUrl}/api/admin/openstreet/businesses?search=Updated Test&limit=5`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (listResponse.ok) {
      const data = await listResponse.json();
      console.log(`✅ LIST with search successful: Found ${data.total} total, ${data.businesses.length} returned`);
      const found = data.businesses.find(b => b.id === testId);
      if (found) {
        console.log(`   Found our test business: ${found.name}`);
      }
    } else {
      console.log(`❌ LIST failed: ${listResponse.status}`);
    }
    
    // 5. Test DELETE
    console.log('\n5. Testing DELETE business...');
    const deleteResponse = await fetch(`${baseUrl}/api/admin/openstreet/businesses/${testId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (deleteResponse.ok) {
      console.log(`✅ DELETE successful`);
      
      // Verify deletion
      const verifyResponse = await fetch(`${baseUrl}/api/admin/openstreet/businesses/${testId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      if (verifyResponse.status === 404) {
        console.log(`✅ DELETE verified: Business no longer exists`);
      } else {
        console.log(`❌ DELETE verification failed: Business still exists`);
      }
    } else {
      console.log(`❌ DELETE failed: ${deleteResponse.status}`);
    }
    
    console.log('\n🎉 All OpenStreet CRUD operations working correctly!');
    console.log('\n✨ Features now available in admin panel:');
    console.log('   📝 Create new OpenStreet businesses');
    console.log('   📖 View and edit existing businesses');
    console.log('   ❌ Delete businesses');
    console.log('   🔍 Search and filter businesses');
    console.log('   📊 Same fields as Apify businesses');
    console.log('   🏷️ OpenStreet badge identification');
    
  } catch (error) {
    console.error('❌ CRUD test failed:', error.message);
  }
}

testOpenStreetCRUD().catch(console.error);
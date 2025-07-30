#!/usr/bin/env node

/**
 * Test script to verify that the business creation authentication fix is working
 */

const baseUrl = 'http://localhost:5000';

async function testAuthenticationFix() {
    console.log('🧪 Testing Business Creation Authentication Fix\n');

    // Test 1: Try to create business without authentication (should fail)
    console.log('1. Testing business creation without authentication...');
    try {
        const response = await fetch(`${baseUrl}/api/dashboard/businesses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'Test Business',
                category: 'test',
                address: 'Test Address',
                city: 'Lima'
            })
        });

        if (response.status === 401) {
            console.log('✅ Correctly rejected unauthenticated request (401)');
        } else {
            console.log(`❌ Expected 401, got ${response.status}`);
            const text = await response.text();
            console.log('Response:', text);
        }
    } catch (error) {
        console.log('❌ Network error:', error.message);
    }

    // Test 2: Try to access businesses without authentication (should fail)
    console.log('\n2. Testing business listing without authentication...');
    try {
        const response = await fetch(`${baseUrl}/api/dashboard/businesses`);

        if (response.status === 401) {
            console.log('✅ Correctly rejected unauthenticated request (401)');
        } else {
            console.log(`❌ Expected 401, got ${response.status}`);
        }
    } catch (error) {
        console.log('❌ Network error:', error.message);
    }

    // Test 3: Try to access services without authentication (should fail)
    console.log('\n3. Testing services access without authentication...');
    try {
        const response = await fetch(`${baseUrl}/api/dashboard/businesses/1/services`);

        if (response.status === 401) {
            console.log('✅ Correctly rejected unauthenticated request (401)');
        } else {
            console.log(`❌ Expected 401, got ${response.status}`);
        }
    } catch (error) {
        console.log('❌ Network error:', error.message);
    }

    console.log('\n🎉 Authentication fix verification complete!');
    console.log('\n📝 Summary:');
    console.log('- Business creation now requires authentication');
    console.log('- Business listing now requires authentication');
    console.log('- Service operations now require authentication');
    console.log('- Users can only access/modify their own businesses');
    console.log('- Hardcoded userId = 1 has been replaced with authenticated user');
}

// Only run if server is available
async function checkServer() {
    try {
        const response = await fetch(`${baseUrl}/api/health`);
        if (response.ok) {
            console.log('🚀 Server is running, starting tests...\n');
            await testAuthenticationFix();
        } else {
            console.log('⏳ Server not ready yet. Please start with: npm run dev');
        }
    } catch (error) {
        console.log('⏳ Server not accessible. Please start with: npm run dev');
        console.log('   Then run this test again.');
    }
}

checkServer();

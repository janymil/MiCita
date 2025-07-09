#!/usr/bin/env node

/**
 * Comprehensive Filtering System Test
 * 
 * This script tests the filtering system in the search engine by making API calls
 * to various endpoints and analyzing the responses for filtering issues.
 */

const BASE_URL = 'http://localhost:5000';

// Test data for comprehensive filtering tests
const testScenarios = [
  {
    name: 'Basic Category Filter',
    params: { category: 'belleza' },
    expected: 'All results should be in belleza category'
  },
  {
    name: 'Category + Subcategory Filter',
    params: { category: 'belleza', subcategory: 'salon' },
    expected: 'Results should be in belleza category with salon subcategory'
  },
  {
    name: 'Location Filter - City',
    params: { city: 'Lima' },
    expected: 'All results should be in Lima city'
  },
  {
    name: 'Location Filter - District',
    params: { city: 'Lima', district: 'miraflores' },
    expected: 'Results should be in Miraflores district'
  },
  {
    name: 'Rating Filter',
    params: { minRating: '4' },
    expected: 'All results should have rating >= 4'
  },
  {
    name: 'Price Filter',
    params: { maxPrice: '2' },
    expected: 'All results should have price level <= 2'
  },
  {
    name: 'Contact Filter - Phone',
    params: { hasPhone: 'true' },
    expected: 'All results should have phone numbers'
  },
  {
    name: 'Contact Filter - Website',
    params: { hasWebsite: 'true' },
    expected: 'All results should have websites'
  },
  {
    name: 'Contact Filter - Email',
    params: { hasEmail: 'true' },
    expected: 'All results should have email addresses'
  },
  {
    name: 'Open Now Filter',
    params: { openNow: 'true' },
    expected: 'All results should be open now'
  },
  {
    name: 'Multiple Filters Combination',
    params: { 
      category: 'belleza', 
      city: 'Lima', 
      minRating: '3',
      hasPhone: 'true'
    },
    expected: 'Results should match all criteria: belleza category, Lima city, rating >= 3, and have phone'
  },
  {
    name: 'Query with Category',
    params: { q: 'salon', category: 'belleza' },
    expected: 'Results should contain "salon" in belleza category'
  },
  {
    name: 'Complex Location Filter',
    params: { q: 'barberia', city: 'Lima', district: 'san isidro' },
    expected: 'Results should contain "barberia" in San Isidro district'
  }
];

// Utility functions
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  
  // Add parameters to URL
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  console.log(`🔍 Making request to: ${url.toString()}`);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ Request failed: ${error.message}`);
    return null;
  }
}

// Test validation functions
function validateCategoryFilter(results, expectedCategory) {
  const issues = [];
  
  if (!results || !results.length) {
    issues.push('No results returned');
    return issues;
  }
  
  results.forEach((business, index) => {
    if (business.category !== expectedCategory) {
      issues.push(`Result ${index + 1}: Expected category '${expectedCategory}', got '${business.category}' (${business.name})`);
    }
  });
  
  return issues;
}

function validateSubcategoryFilter(results, expectedSubcategory) {
  const issues = [];
  
  if (!results || !results.length) {
    issues.push('No results returned');
    return issues;
  }
  
  results.forEach((business, index) => {
    if (business.subcategory !== expectedSubcategory) {
      issues.push(`Result ${index + 1}: Expected subcategory '${expectedSubcategory}', got '${business.subcategory}' (${business.name})`);
    }
  });
  
  return issues;
}

function validateLocationFilter(results, expectedCity, expectedDistrict) {
  const issues = [];
  
  if (!results || !results.length) {
    issues.push('No results returned');
    return issues;
  }
  
  results.forEach((business, index) => {
    if (expectedCity && business.address && !business.address.toLowerCase().includes(expectedCity.toLowerCase())) {
      issues.push(`Result ${index + 1}: Expected city '${expectedCity}' not found in address '${business.address}' (${business.name})`);
    }
    
    if (expectedDistrict && business.address && !business.address.toLowerCase().includes(expectedDistrict.toLowerCase())) {
      issues.push(`Result ${index + 1}: Expected district '${expectedDistrict}' not found in address '${business.address}' (${business.name})`);
    }
  });
  
  return issues;
}

function validateRatingFilter(results, minRating) {
  const issues = [];
  
  if (!results || !results.length) {
    issues.push('No results returned');
    return issues;
  }
  
  results.forEach((business, index) => {
    const rating = parseFloat(business.rating || '0');
    if (rating < minRating) {
      issues.push(`Result ${index + 1}: Rating ${rating} is below minimum ${minRating} (${business.name})`);
    }
  });
  
  return issues;
}

function validatePriceFilter(results, maxPrice) {
  const issues = [];
  
  if (!results || !results.length) {
    issues.push('No results returned');
    return issues;
  }
  
  results.forEach((business, index) => {
    const priceLevel = business.priceLevel || 0;
    if (priceLevel > maxPrice) {
      issues.push(`Result ${index + 1}: Price level ${priceLevel} exceeds maximum ${maxPrice} (${business.name})`);
    }
  });
  
  return issues;
}

function validateContactFilter(results, filterType) {
  const issues = [];
  
  if (!results || !results.length) {
    issues.push('No results returned');
    return issues;
  }
  
  results.forEach((business, index) => {
    let hasContact = false;
    
    switch (filterType) {
      case 'phone':
        hasContact = business.phone && business.phone.trim() !== '';
        break;
      case 'website':
        hasContact = business.website && business.website.trim() !== '';
        break;
      case 'email':
        hasContact = business.email && business.email.trim() !== '';
        break;
    }
    
    if (!hasContact) {
      issues.push(`Result ${index + 1}: Missing ${filterType} contact information (${business.name})`);
    }
  });
  
  return issues;
}

function validateOpenNowFilter(results) {
  const issues = [];
  
  if (!results || !results.length) {
    issues.push('No results returned');
    return issues;
  }
  
  results.forEach((business, index) => {
    if (business.openNow === false) {
      issues.push(`Result ${index + 1}: Business is not open now (${business.name})`);
    }
  });
  
  return issues;
}

function validateQueryFilter(results, query) {
  const issues = [];
  
  if (!results || !results.length) {
    issues.push('No results returned');
    return issues;
  }
  
  results.forEach((business, index) => {
    const queryLower = query.toLowerCase();
    const nameMatches = business.name.toLowerCase().includes(queryLower);
    const addressMatches = business.address && business.address.toLowerCase().includes(queryLower);
    const descriptionMatches = business.description && business.description.toLowerCase().includes(queryLower);
    
    if (!nameMatches && !addressMatches && !descriptionMatches) {
      issues.push(`Result ${index + 1}: Query '${query}' not found in name, address, or description (${business.name})`);
    }
  });
  
  return issues;
}

// Main test function
async function runFilteringTests() {
  console.log('🚀 Starting Comprehensive Filtering System Tests\n');
  
  const testResults = [];
  
  for (const scenario of testScenarios) {
    console.log(`\n🧪 Testing: ${scenario.name}`);
    console.log(`📋 Expected: ${scenario.expected}`);
    
    const response = await makeRequest('/api/search', scenario.params);
    
    if (!response) {
      testResults.push({
        scenario: scenario.name,
        success: false,
        issues: ['Failed to get response from API']
      });
      continue;
    }
    
    const results = response.results || [];
    console.log(`📊 Got ${results.length} results`);
    
    // Validate based on test scenario
    let issues = [];
    
    if (scenario.params.category) {
      issues.push(...validateCategoryFilter(results, scenario.params.category));
    }
    
    if (scenario.params.subcategory) {
      issues.push(...validateSubcategoryFilter(results, scenario.params.subcategory));
    }
    
    if (scenario.params.city || scenario.params.district) {
      issues.push(...validateLocationFilter(results, scenario.params.city, scenario.params.district));
    }
    
    if (scenario.params.minRating) {
      issues.push(...validateRatingFilter(results, parseFloat(scenario.params.minRating)));
    }
    
    if (scenario.params.maxPrice) {
      issues.push(...validatePriceFilter(results, parseInt(scenario.params.maxPrice)));
    }
    
    if (scenario.params.hasPhone === 'true') {
      issues.push(...validateContactFilter(results, 'phone'));
    }
    
    if (scenario.params.hasWebsite === 'true') {
      issues.push(...validateContactFilter(results, 'website'));
    }
    
    if (scenario.params.hasEmail === 'true') {
      issues.push(...validateContactFilter(results, 'email'));
    }
    
    if (scenario.params.openNow === 'true') {
      issues.push(...validateOpenNowFilter(results));
    }
    
    if (scenario.params.q) {
      issues.push(...validateQueryFilter(results, scenario.params.q));
    }
    
    testResults.push({
      scenario: scenario.name,
      success: issues.length === 0,
      issues: issues,
      resultCount: results.length,
      pagination: response.pagination
    });
    
    if (issues.length === 0) {
      console.log('✅ Test passed!');
    } else {
      console.log(`❌ Test failed with ${issues.length} issues:`);
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    // Add delay between requests to avoid overwhelming the server
    await delay(1000);
  }
  
  return testResults;
}

// Test subcategory endpoint
async function testSubcategoryEndpoint() {
  console.log('\n🧪 Testing Subcategory Endpoint');
  
  const categories = ['belleza', 'salud', 'fitness', 'gastronomia'];
  
  for (const category of categories) {
    console.log(`\n📋 Testing subcategories for: ${category}`);
    
    const response = await makeRequest(`/api/subcategories/${category}`, { includeCounts: 'true' });
    
    if (!response) {
      console.log('❌ Failed to get subcategories');
      continue;
    }
    
    console.log(`📊 Found ${response.length} subcategories`);
    
    if (response.length > 0) {
      console.log('🔍 Sample subcategories:');
      response.slice(0, 5).forEach(sub => {
        console.log(`   - ${sub.subcategory} (${sub.count} businesses)`);
      });
    }
    
    await delay(500);
  }
}

// Test pagination
async function testPagination() {
  console.log('\n🧪 Testing Pagination');
  
  const response = await makeRequest('/api/search', { 
    category: 'belleza', 
    page: '1', 
    limit: '5' 
  });
  
  if (!response) {
    console.log('❌ Failed to get paginated results');
    return;
  }
  
  console.log('📊 Pagination Info:');
  console.log(`   - Current Page: ${response.pagination.currentPage}`);
  console.log(`   - Total Pages: ${response.pagination.totalPages}`);
  console.log(`   - Total Results: ${response.pagination.totalResults}`);
  console.log(`   - Results Per Page: ${response.pagination.resultsPerPage}`);
  console.log(`   - Has Next Page: ${response.pagination.hasNextPage}`);
  console.log(`   - Has Previous Page: ${response.pagination.hasPrevPage}`);
  
  if (response.pagination.hasNextPage) {
    console.log('\n🔄 Testing next page...');
    const nextPageResponse = await makeRequest('/api/search', { 
      category: 'belleza', 
      page: '2', 
      limit: '5' 
    });
    
    if (nextPageResponse) {
      console.log(`✅ Next page loaded with ${nextPageResponse.results.length} results`);
    } else {
      console.log('❌ Failed to load next page');
    }
  }
}

// Test map bounds filtering
async function testMapBoundsFiltering() {
  console.log('\n🧪 Testing Map Bounds Filtering');
  
  // Lima center bounds
  const bounds = {
    north: -12.0,
    south: -12.1,
    east: -77.0,
    west: -77.1
  };
  
  const response = await makeRequest('/api/search', { 
    bounds: JSON.stringify(bounds)
  });
  
  if (!response) {
    console.log('❌ Failed to get map bounds results');
    return;
  }
  
  console.log(`📊 Found ${response.results.length} businesses within bounds`);
  
  // Validate that all results are within bounds
  const outOfBounds = response.results.filter(business => {
    const lat = parseFloat(business.location?.lat || '0');
    const lng = parseFloat(business.location?.lng || '0');
    
    return lat < bounds.south || lat > bounds.north || 
           lng < bounds.west || lng > bounds.east;
  });
  
  if (outOfBounds.length > 0) {
    console.log(`❌ Found ${outOfBounds.length} businesses outside bounds:`);
    outOfBounds.forEach(business => {
      console.log(`   - ${business.name} (${business.location?.lat}, ${business.location?.lng})`);
    });
  } else {
    console.log('✅ All businesses are within specified bounds');
  }
}

// Generate test report
function generateTestReport(testResults) {
  console.log('\n📋 FILTERING SYSTEM TEST REPORT');
  console.log('=' .repeat(50));
  
  const passedTests = testResults.filter(result => result.success);
  const failedTests = testResults.filter(result => !result.success);
  
  console.log(`\n📊 Summary:`);
  console.log(`   - Total Tests: ${testResults.length}`);
  console.log(`   - Passed: ${passedTests.length}`);
  console.log(`   - Failed: ${failedTests.length}`);
  console.log(`   - Success Rate: ${((passedTests.length / testResults.length) * 100).toFixed(1)}%`);
  
  if (failedTests.length > 0) {
    console.log(`\n❌ Failed Tests:`);
    failedTests.forEach(test => {
      console.log(`\n   🔍 ${test.scenario}:`);
      test.issues.forEach(issue => {
        console.log(`      - ${issue}`);
      });
    });
  }
  
  console.log(`\n✅ Passed Tests:`);
  passedTests.forEach(test => {
    console.log(`   - ${test.scenario} (${test.resultCount} results)`);
  });
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (failedTests.some(test => test.issues.some(issue => issue.includes('category')))) {
    console.log('   1. Fix category filtering - ensure all results match the specified category');
  }
  
  if (failedTests.some(test => test.issues.some(issue => issue.includes('subcategory')))) {
    console.log('   2. Fix subcategory filtering - verify subcategory mapping is correct');
  }
  
  if (failedTests.some(test => test.issues.some(issue => issue.includes('rating')))) {
    console.log('   3. Fix rating filtering - ensure minimum rating filter works correctly');
  }
  
  if (failedTests.some(test => test.issues.some(issue => issue.includes('contact')))) {
    console.log('   4. Fix contact filtering - verify null/empty contact field handling');
  }
  
  if (failedTests.some(test => test.issues.some(issue => issue.includes('location')))) {
    console.log('   5. Fix location filtering - improve district/city matching logic');
  }
  
  if (failedTests.some(test => test.issues.some(issue => issue.includes('query')))) {
    console.log('   6. Fix query filtering - ensure search terms are properly indexed');
  }
}

// Main execution
async function main() {
  try {
    console.log('🔧 Testing Filtering System...');
    
    // Test main filtering scenarios
    const testResults = await runFilteringTests();
    
    // Test subcategory endpoint
    await testSubcategoryEndpoint();
    
    // Test pagination
    await testPagination();
    
    // Test map bounds filtering
    await testMapBoundsFiltering();
    
    // Generate report
    generateTestReport(testResults);
    
    console.log('\n✅ Filtering system tests completed!');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  runFilteringTests,
  testSubcategoryEndpoint,
  testPagination,
  testMapBoundsFiltering,
  generateTestReport
};
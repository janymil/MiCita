#!/usr/bin/env node

/**
 * Analyze OpenStreet businesses data
 */

import { db } from './server/db.ts';
import { openstreetBusinesses } from './shared/schema.ts';
import { sql } from 'drizzle-orm';

async function analyzeOpenStreetData() {
  console.log('🔍 Analyzing OpenStreet businesses data...\n');
  
  try {
    // Get total count
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(openstreetBusinesses);
    
    console.log(`📊 Total OpenStreet businesses: ${count}`);
    
    if (count === 0) {
      console.log('❌ No data found in openstreet_businesses table');
      return;
    }
    
    // Get sample data
    console.log('\n📋 Sample data (first 5 records):');
    const sampleData = await db
      .select()
      .from(openstreetBusinesses)
      .limit(5);
    
    sampleData.forEach((business, index) => {
      console.log(`\n${index + 1}. ${business.name || 'Unnamed'}`);
      console.log(`   OSM ID: ${business.osmId}`);
      console.log(`   OSM Type: ${business.osmType || 'N/A'}`);
      console.log(`   Category: ${business.category || 'N/A'}`);
      console.log(`   Amenity: ${business.amenity || 'N/A'}`);
      console.log(`   Address: ${business.address || 'N/A'}`);
      console.log(`   District: ${business.district || 'N/A'}`);
      console.log(`   Phone: ${business.phone || 'N/A'}`);
      console.log(`   Website: ${business.website || 'N/A'}`);
    });
    
    // Get data distribution
    console.log('\n📈 Data Distribution:');
    
    // Categories
    const categories = await db.execute(sql`
      SELECT category, COUNT(*) as count
      FROM openstreet_businesses 
      WHERE category IS NOT NULL
      GROUP BY category 
      ORDER BY count DESC 
      LIMIT 10
    `);
    
    console.log('\nTop Categories:');
    categories.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.count}`);
    });
    
    // Amenities
    const amenities = await db.execute(sql`
      SELECT amenity, COUNT(*) as count
      FROM openstreet_businesses 
      WHERE amenity IS NOT NULL
      GROUP BY amenity 
      ORDER BY count DESC 
      LIMIT 10
    `);
    
    console.log('\nTop Amenities:');
    amenities.rows.forEach(row => {
      console.log(`  ${row.amenity}: ${row.count}`);
    });
    
    // Districts
    const districts = await db.execute(sql`
      SELECT district, COUNT(*) as count
      FROM openstreet_businesses 
      WHERE district IS NOT NULL
      GROUP BY district 
      ORDER BY count DESC 
      LIMIT 10
    `);
    
    console.log('\nTop Districts:');
    districts.rows.forEach(row => {
      console.log(`  ${row.district}: ${row.count}`);
    });
    
    // Data completeness
    console.log('\n📊 Data Completeness:');
    const completeness = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(name) as has_name,
        COUNT(amenity) as has_amenity,
        COUNT(address) as has_address,
        COUNT(district) as has_district,
        COUNT(phone) as has_phone,
        COUNT(website) as has_website,
        COUNT(category) as has_category,
        COUNT(latitude) as has_coords
      FROM openstreet_businesses
    `);
    
    const stats = completeness.rows[0];
    console.log(`  Names: ${stats.has_name}/${stats.total} (${Math.round(stats.has_name/stats.total*100)}%)`);
    console.log(`  Amenities: ${stats.has_amenity}/${stats.total} (${Math.round(stats.has_amenity/stats.total*100)}%)`);
    console.log(`  Addresses: ${stats.has_address}/${stats.total} (${Math.round(stats.has_address/stats.total*100)}%)`);
    console.log(`  Districts: ${stats.has_district}/${stats.total} (${Math.round(stats.has_district/stats.total*100)}%)`);
    console.log(`  Phone: ${stats.has_phone}/${stats.total} (${Math.round(stats.has_phone/stats.total*100)}%)`);
    console.log(`  Website: ${stats.has_website}/${stats.total} (${Math.round(stats.has_website/stats.total*100)}%)`);
    console.log(`  Category: ${stats.has_category}/${stats.total} (${Math.round(stats.has_category/stats.total*100)}%)`);
    console.log(`  Coordinates: ${stats.has_coords}/${stats.total} (${Math.round(stats.has_coords/stats.total*100)}%)`);
    
    // OSM Types
    const osmTypes = await db.execute(sql`
      SELECT osm_type, COUNT(*) as count
      FROM openstreet_businesses 
      WHERE osm_type IS NOT NULL
      GROUP BY osm_type 
      ORDER BY count DESC
    `);
    
    console.log('\nOSM Types:');
    osmTypes.rows.forEach(row => {
      console.log(`  ${row.osm_type}: ${row.count}`);
    });
    
    // Check for potential API issues
    console.log('\n🔧 Potential Issues:');
    
    // Empty names
    const emptyNames = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM openstreet_businesses 
      WHERE name IS NULL OR name = ''
    `);
    console.log(`  Businesses without names: ${emptyNames.rows[0].count}`);
    
    // Missing coordinates
    const missingCoords = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM openstreet_businesses 
      WHERE latitude IS NULL OR longitude IS NULL
    `);
    console.log(`  Businesses without coordinates: ${missingCoords.rows[0].count}`);
    
    // Test the API endpoint
    console.log('\n🌐 Testing API endpoint...');
    try {
      const response = await fetch('http://localhost:5000/api/admin/openstreet/businesses?limit=5', {
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_PASSWORD || 'admin123'}`
        }
      });
      
      if (!response.ok) {
        console.log(`❌ API Error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.log(`   Error: ${errorText}`);
      } else {
        const data = await response.json();
        console.log(`✅ API working: Retrieved ${data.businesses?.length || 0} businesses, total: ${data.total || 0}`);
      }
    } catch (error) {
      console.log(`❌ API Test Failed: ${error.message}`);
      console.log('   Make sure the server is running on port 5000');
    }
    
  } catch (error) {
    console.error('❌ Error analyzing data:', error);
  }
}

// Run the analysis
analyzeOpenStreetData().catch(console.error);
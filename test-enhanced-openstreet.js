#!/usr/bin/env node

import { db } from './server/db.ts';
import { openstreetBusinesses } from './shared/schema.ts';
import { sql } from 'drizzle-orm';

async function testEnhancedOpenstreet() {
  console.log('🧪 Testing Enhanced OpenStreet Schema...\n');
  
  try {
    // Test the new columns
    const [sample] = await db
      .select()
      .from(openstreetBusinesses)
      .limit(1);
    
    console.log('📋 Sample record with enhanced fields:');
    console.log(`Name: ${sample?.name || 'N/A'}`);
    console.log(`OSM ID: ${sample?.osmId || 'N/A'}`);
    console.log(`Rating: ${sample?.rating || 'N/A'}`);
    console.log(`Review Count: ${sample?.reviewCount || 'N/A'}`);
    console.log(`Public Badge: ${sample?.publicBadge || 'N/A'}`);
    console.log(`Marketing Badge: ${sample?.marketingBadge || 'N/A'}`);
    console.log(`Quality Score: ${sample?.qualityScore || 'N/A'}`);
    console.log(`Scraping Source: ${sample?.scrapingSource || 'N/A'}`);
    
    // Test badge distribution
    const badgeStats = await db.execute(sql`
      SELECT 
        public_badge,
        marketing_badge,
        COUNT(*) as count
      FROM openstreet_businesses 
      GROUP BY public_badge, marketing_badge
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('\n🎯 Badge Distribution:');
    badgeStats.rows.forEach(row => {
      console.log(`${row.public_badge} | ${row.marketing_badge}: ${row.count}`);
    });
    
    // Test quality scores
    const qualityStats = await db.execute(sql`
      SELECT 
        AVG(quality_score) as avg_quality,
        MIN(quality_score) as min_quality,
        MAX(quality_score) as max_quality,
        COUNT(*) as total
      FROM openstreet_businesses
    `);
    
    console.log('\n📊 Quality Scores:');
    const stats = qualityStats.rows[0];
    console.log(`Average: ${Math.round(stats.avg_quality)}`);
    console.log(`Range: ${stats.min_quality} - ${stats.max_quality}`);
    console.log(`Total records: ${stats.total}`);
    
    console.log('\n✅ Enhanced schema working correctly!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEnhancedOpenstreet().catch(console.error);
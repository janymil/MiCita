#!/usr/bin/env node

/**
 * Run marketing AI analysis on all existing businesses
 */

import { MarketingAIAnalyzer } from './server/marketing-ai-analyzer.js';

async function runBulkAnalysis() {
  console.log('🚀 Starting bulk marketing analysis...');
  console.log('📊 Analyzing 8580 businesses for marketing opportunities...');
  
  try {
    // Analyze in batches of 500 to avoid memory issues
    const batchSize = 500;
    let processed = 0;
    
    while (processed < 8580) {
      console.log(`\n📈 Processing batch: ${processed + 1} - ${Math.min(processed + batchSize, 8580)}`);
      
      await MarketingAIAnalyzer.analyzeBulkBusinesses(batchSize);
      processed += batchSize;
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n✅ Marketing analysis completed!');
    console.log('📊 Generating summary...');
    
    // Generate summary statistics
    await generateAnalysisSummary();
    
  } catch (error) {
    console.error('❌ Error during bulk analysis:', error);
    process.exit(1);
  }
}

async function generateAnalysisSummary() {
  const { db } = await import('./server/db.js');
  const { apifyBusinesses } = await import('./shared/schema.js');
  const { sql } = await import('drizzle-orm');
  
  try {
    // Get badge distribution
    const badgeStats = await db.execute(sql`
      SELECT 
        public_badge,
        marketing_badge,
        COUNT(*) as count,
        AVG(marketing_potential_score) as avg_score
      FROM apify_businesses 
      WHERE marketing_badge IS NOT NULL
      GROUP BY public_badge, marketing_badge
      ORDER BY count DESC
    `);
    
    console.log('\n📊 MARKETING ANALYSIS SUMMARY');
    console.log('=====================================');
    console.log('Badge Distribution:');
    badgeStats.rows.forEach(row => {
      console.log(`${row.public_badge} | ${row.marketing_badge}: ${row.count} businesses (avg score: ${Math.round(row.avg_score)})`);
    });
    
    // High potential businesses
    const highPotential = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM apify_businesses 
      WHERE marketing_potential_score >= 70
    `);
    
    console.log(`\n🎯 High Marketing Potential: ${highPotential.rows[0].count} businesses`);
    
    // Marketing opportunities
    const opportunities = await db.execute(sql`
      SELECT 
        jsonb_array_elements_text(marketing_opportunities) as opportunity,
        COUNT(*) as count
      FROM apify_businesses 
      WHERE marketing_opportunities IS NOT NULL 
        AND jsonb_array_length(marketing_opportunities) > 0
      GROUP BY opportunity
      ORDER BY count DESC
    `);
    
    console.log('\n🔧 Top Marketing Opportunities:');
    opportunities.rows.forEach(row => {
      console.log(`${row.opportunity}: ${row.count} businesses`);
    });
    
  } catch (error) {
    console.error('Error generating summary:', error);
  }
}

// Run the analysis
runBulkAnalysis().catch(console.error);
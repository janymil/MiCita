#!/usr/bin/env node

import { MarketingAIAnalyzer } from './server/marketing-ai-analyzer.js';

async function testAnalysis() {
  console.log('🧪 Testing marketing analysis on 10 businesses...');
  
  try {
    await MarketingAIAnalyzer.analyzeBulkBusinesses(10);
    console.log('✅ Test completed successfully!');
    
    // Check results
    const { db } = await import('./server/db.js');
    const { apifyBusinesses } = await import('./shared/schema.js');
    const { isNotNull } = await import('drizzle-orm');
    
    const results = await db
      .select({
        name: apifyBusinesses.name,
        publicBadge: apifyBusinesses.publicBadge,
        marketingBadge: apifyBusinesses.marketingBadge,
        potentialScore: apifyBusinesses.marketingPotentialScore,
        opportunities: apifyBusinesses.marketingOpportunities
      })
      .from(apifyBusinesses)
      .where(isNotNull(apifyBusinesses.marketingBadge))
      .limit(5);
    
    console.log('\n📊 Sample Results:');
    results.forEach(r => {
      console.log(`${r.name}: ${r.publicBadge} | ${r.marketingBadge} (score: ${r.potentialScore})`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAnalysis();
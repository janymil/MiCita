#!/usr/bin/env node

import { MarketingAIAnalyzer } from './server/marketing-ai-analyzer.ts';
import { db } from './server/db.ts';
import { openstreetBusinesses } from './shared/schema.ts';
import { eq, or, isNull } from 'drizzle-orm';

async function analyzeOpenStreetMarketing() {
  console.log('🤖 Starting OpenStreet businesses marketing analysis...\n');
  
  try {
    // Get businesses that need analysis
    const businessesToAnalyze = await db
      .select()
      .from(openstreetBusinesses)
      .where(or(
        isNull(openstreetBusinesses.marketingBadge),
        eq(openstreetBusinesses.marketingBadge, 'analyzing')
      ))
      .limit(100); // Analyze first 100 for testing

    console.log(`📊 Analyzing ${businessesToAnalyze.length} OpenStreet businesses...`);

    let analyzed = 0;
    let highPotential = 0;
    let websiteNeeded = 0;

    for (const business of businessesToAnalyze) {
      try {
        // Convert OpenStreet business to format expected by analyzer
        const businessData = {
          name: business.name || '',
          address: business.address || '',
          phone: business.phone,
          website: business.website,
          email: business.email,
          rating: business.rating,
          reviewCount: business.reviewCount || 0,
          isClaimedGoogle: business.isClaimedGoogle || false,
          verifiedStatus: business.verifiedStatus || 'unverified',
          socialMedia: business.socialMedia,
          hours: business.hours,
          category: business.category || '',
          subcategory: business.subcategory || '',
          photoUrl: business.photoUrl,
          imageUrls: business.imageUrls
        };

        const analysis = MarketingAIAnalyzer.analyzeBusiness(businessData);

        // Update database with analysis results
        await db
          .update(openstreetBusinesses)
          .set({
            marketingBadge: analysis.marketingBadge,
            marketingPotentialScore: Math.round(analysis.potentialScore),
            marketingOpportunities: analysis.opportunities,
            digitalPresenceScore: Math.round(analysis.digitalPresenceScore),
            marketingNotes: analysis.marketingNotes,
            lastBadgeAnalysis: new Date()
          })
          .where(eq(openstreetBusinesses.id, business.id));

        analyzed++;
        
        if (analysis.marketingBadge === 'high_potential') highPotential++;
        if (analysis.marketingBadge === 'website_needed') websiteNeeded++;

        if (analyzed % 10 === 0) {
          console.log(`✅ Analyzed ${analyzed}/${businessesToAnalyze.length} businesses...`);
        }

      } catch (error) {
        console.error(`❌ Error analyzing business ${business.id}:`, error.message);
      }
    }

    console.log('\n🎉 Analysis Complete!');
    console.log(`📈 Results:`);
    console.log(`   Total analyzed: ${analyzed}`);
    console.log(`   High potential: ${highPotential}`);
    console.log(`   Website needed: ${websiteNeeded}`);
    
    // Get summary stats
    const summaryStats = await db.execute(`
      SELECT 
        marketing_badge,
        COUNT(*) as count
      FROM openstreet_businesses 
      WHERE marketing_badge != 'analyzing'
      GROUP BY marketing_badge
      ORDER BY count DESC
    `);
    
    console.log('\n📊 OpenStreet Marketing Badge Summary:');
    summaryStats.rows?.forEach(row => {
      console.log(`   ${row.marketing_badge}: ${row.count}`);
    });

  } catch (error) {
    console.error('❌ Error during analysis:', error);
  }
}

analyzeOpenStreetMarketing().catch(console.error);
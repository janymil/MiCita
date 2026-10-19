/**
 * AI Marketing Analysis System
 * Analyzes business data to identify marketing opportunities
 */

interface BusinessData {
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  email: string | null;
  rating: string | null;
  reviewCount: number;
  isClaimedGoogle: boolean;
  verifiedStatus: string;
  socialMedia: any;
  hours: any;
  category: string;
  subcategory: string;
  photoUrl: string | null;
  imageUrls: any;
}

interface MarketingAnalysis {
  publicBadge: 'verified' | 'claimed' | 'unverified' | 'trusted' | 'premium';
  marketingBadge: 'high_potential' | 'email_ready' | 'website_needed' | 'digital_upgrade' | 'claimed' | 'no_opportunity';
  potentialScore: number; // 0-100
  opportunities: string[]; // ['website', 'seo', 'social_media', 'photography', 'google_business']
  digitalPresenceScore: number; // 0-100
  marketingNotes: string;
}

export class MarketingAIAnalyzer {
  
  /**
   * Main analysis function - determines both public and marketing badges
   */
  static analyzeBusiness(business: BusinessData): MarketingAnalysis {
    const publicBadge = this.calculatePublicBadge(business);
    const digitalPresence = this.analyzeDigitalPresence(business);
    const marketingOpportunities = this.identifyMarketingOpportunities(business);
    const potentialScore = this.calculateMarketingPotential(business, digitalPresence, marketingOpportunities);
    
    return {
      publicBadge,
      marketingBadge: this.determineMarketingBadge(potentialScore, marketingOpportunities, business),
      potentialScore,
      opportunities: marketingOpportunities,
      digitalPresenceScore: digitalPresence.score,
      marketingNotes: this.generateMarketingNotes(business, marketingOpportunities, potentialScore)
    };
  }

  /**
   * Calculate public badge shown to users
   */
  private static calculatePublicBadge(business: BusinessData): 'verified' | 'claimed' | 'unverified' | 'trusted' | 'premium' {
    // Google verified/claimed businesses
    if (business.verifiedStatus === 'verified' || business.verifiedStatus === 'claimed') {
      return 'verified';
    }
    
    // High-quality businesses (trusted badge)
    const rating = parseFloat(business.rating || '0');
    if (rating >= 4.5 && business.reviewCount >= 50) {
      return 'trusted';
    }
    
    // Default unverified
    return 'unverified';
  }

  /**
   * Analyze digital presence quality
   */
  private static analyzeDigitalPresence(business: BusinessData): { score: number; gaps: string[] } {
    let score = 0;
    const gaps: string[] = [];

    // Website presence (30 points)
    if (business.website) {
      score += 30;
    } else {
      gaps.push('website');
    }

    // Contact information (25 points)
    if (business.phone) score += 15;
    else gaps.push('phone');
    
    if (business.email) score += 10;
    else gaps.push('email');

    // Google Business optimization (20 points)
    if (business.isClaimedGoogle) {
      score += 20;
    } else {
      gaps.push('google_business');
    }

    // Visual content (15 points)
    if (business.photoUrl || (business.imageUrls && business.imageUrls.length > 0)) {
      score += 10;
      if (business.imageUrls && business.imageUrls.length >= 5) {
        score += 5; // Bonus for multiple images
      }
    } else {
      gaps.push('photography');
    }

    // Business hours (10 points)
    if (business.hours) {
      score += 10;
    } else {
      gaps.push('hours');
    }

    return { score: Math.min(score, 100), gaps };
  }

  /**
   * Identify specific marketing opportunities
   */
  private static identifyMarketingOpportunities(business: BusinessData): string[] {
    const opportunities: string[] = [];

    // Website needed
    if (!business.website && business.phone) {
      opportunities.push('website');
    }

    // Google Business claiming
    if (!business.isClaimedGoogle && business.phone) {
      opportunities.push('google_business');
    }

    // SEO optimization (if has website but low visibility)
    if (business.website && business.reviewCount < 20) {
      opportunities.push('seo');
    }

    // Social media presence
    if (!business.socialMedia && business.phone) {
      opportunities.push('social_media');
    }

    // Professional photography
    if (!business.photoUrl && business.phone) {
      opportunities.push('photography');
    }

    // Online reputation management
    const rating = parseFloat(business.rating || '0');
    if (rating > 0 && rating < 4.0 && business.reviewCount > 5) {
      opportunities.push('reputation_management');
    }

    // Digital marketing (if good business but low online presence)
    if (rating >= 4.0 && business.reviewCount >= 10 && opportunities.length >= 2) {
      opportunities.push('digital_marketing');
    }

    return opportunities;
  }

  /**
   * Calculate overall marketing potential score (0-100)
   */
  private static calculateMarketingPotential(
    business: BusinessData, 
    digitalPresence: { score: number; gaps: string[] }, 
    opportunities: string[]
  ): number {
    let score = 0;

    // Business quality indicators (40 points max)
    const rating = parseFloat(business.rating || '0');
    if (rating >= 4.0) score += 20;
    else if (rating >= 3.5) score += 10;
    
    if (business.reviewCount >= 20) score += 10;
    else if (business.reviewCount >= 5) score += 5;

    if (business.phone) score += 10; // Contactable business

    // Marketing opportunity potential (35 points max)
    const opportunityWeight = {
      'website': 10,
      'google_business': 8,
      'seo': 6,
      'social_media': 5,
      'photography': 3,
      'digital_marketing': 3
    };

    opportunities.forEach(opp => {
      score += opportunityWeight[opp as keyof typeof opportunityWeight] || 2;
    });

    // Digital presence gap (25 points max)
    // Higher gap = higher potential for improvement
    const presenceGap = 100 - digitalPresence.score;
    score += (presenceGap * 0.25);

    // Category-based adjustment
    const highValueCategories = ['salud', 'belleza', 'automotriz', 'servicios'];
    if (highValueCategories.includes(business.category)) {
      score += 10;
    }

    // Already claimed/optimized businesses have lower potential
    if (business.isClaimedGoogle && business.website && digitalPresence.score > 80) {
      score = Math.max(score - 30, 0);
    }

    return Math.min(score, 100);
  }

  /**
   * Determine marketing badge based on analysis
   */
  private static determineMarketingBadge(
    potentialScore: number, 
    opportunities: string[], 
    business: BusinessData
  ): 'high_potential' | 'email_ready' | 'website_needed' | 'digital_upgrade' | 'claimed' | 'no_opportunity' {
    
    // Already optimized
    if (business.isClaimedGoogle && business.website && potentialScore < 30) {
      return 'claimed';
    }

    // High potential for marketing
    if (potentialScore >= 70 && opportunities.length >= 3) {
      return 'high_potential';
    }

    // Specific opportunity types
    if (opportunities.includes('website') && business.phone) {
      return 'website_needed';
    }

    if (business.email && opportunities.length >= 2) {
      return 'email_ready';
    }

    if (potentialScore >= 40 && opportunities.length >= 1) {
      return 'digital_upgrade';
    }

    return 'no_opportunity';
  }

  /**
   * Generate marketing notes for sales team
   */
  private static generateMarketingNotes(
    business: BusinessData, 
    opportunities: string[], 
    potentialScore: number
  ): string {
    const notes: string[] = [];
    const rating = parseFloat(business.rating || '0');

    // Business quality assessment
    if (rating >= 4.0 && business.reviewCount >= 10) {
      notes.push(`⭐ High-quality business (${rating}/5, ${business.reviewCount} reviews)`);
    }

    // Primary opportunities
    if (opportunities.includes('website')) {
      notes.push('🌐 Needs website - has phone contact');
    }
    
    if (opportunities.includes('google_business')) {
      notes.push('📍 Google Business unclaimed - major opportunity');
    }

    if (opportunities.includes('photography')) {
      notes.push('📸 Missing photos - visual content needed');
    }

    // Contact preference
    if (business.email) {
      notes.push('📧 Email contact available');
    } else if (business.phone) {
      notes.push('📞 Phone contact only');
    }

    // Potential value
    if (potentialScore >= 80) {
      notes.push('🎯 HIGH PRIORITY - Excellent marketing potential');
    } else if (potentialScore >= 60) {
      notes.push('✅ Good potential for digital services');
    }

    return notes.join(' | ');
  }

  /**
   * Bulk analyze all businesses in database
   */
  static async analyzeBulkBusinesses(limit: number = 100): Promise<void> {
    const { db } = await import('./db.js');
    const { apifyBusinesses } = await import('../shared/schema.js');
    const { eq, isNull, or } = await import('drizzle-orm');

    // Get businesses that need analysis
    const businessesToAnalyze = await db
      .select()
      .from(apifyBusinesses)
      .where(or(
        isNull(apifyBusinesses.marketingBadge),
        eq(apifyBusinesses.marketingBadge, 'analyzing')
      ))
      .limit(limit);

    console.log(`🤖 Analyzing ${businessesToAnalyze.length} businesses for marketing potential...`);

    for (const business of businessesToAnalyze) {
      try {
        const analysis = this.analyzeBusiness({
          name: business.name,
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
        });

        // Update database
        await db
          .update(apifyBusinesses)
          .set({
            publicBadge: analysis.publicBadge,
            marketingBadge: analysis.marketingBadge,
            marketingPotentialScore: Math.round(analysis.potentialScore),
            marketingOpportunities: analysis.opportunities,
            digitalPresenceScore: Math.round(analysis.digitalPresenceScore),
            marketingNotes: analysis.marketingNotes,
            lastBadgeAnalysis: new Date()
          })
          .where(eq(apifyBusinesses.id, business.id));

      } catch (error: any) {
        console.error(`Error analyzing business ${business.id}:`, error);
      }
    }

    console.log(`✅ Completed marketing analysis for ${businessesToAnalyze.length} businesses`);
  }
}

export default MarketingAIAnalyzer;
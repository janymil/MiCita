import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthenticatedRequest } from '../auth-middleware';
import { incrementalScraping } from '../../services/incremental-scraping';
import { storage } from '../storage';
import { AIContentGenerator } from '../../services/ai-content-generator';

const router = Router();

// Schema for starting incremental scraping
const StartIncrementalScrapingSchema = z.object({
  businessId: z.number(),
  source: z.enum(['google-maps', 'facebook', 'instagram', 'kagi-search']),
  url: z.string().optional(),
  kagiSearchQuery: z.string().optional()
});

// Apply scraped data incrementally
router.post('/apply-incremental', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { businessId, scrapedData, source } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    console.log(`🔄 Applying incremental data from ${source} to business ${businessId}`);
    
    // Verify business ownership
    const business = await storage.getBusiness(businessId);
    if (!business || business.userId !== Number(userId)) {
      return res.status(404).json({
        success: false,
        message: 'Business not found or access denied'
      });
    }

    // Apply data incrementally (never overwrite existing user data)
    const result = await incrementalScraping.applyIncrementalData(
      businessId, 
      scrapedData, 
      source
    );

    // Generate AI-enhanced content if OpenAI is available
    let aiContent = null;
    if (process.env.OPENAI_API_KEY) {
      try {
        const aiGenerator = new AIContentGenerator();
        aiContent = await aiGenerator.generateContent(scrapedData);
        console.log('✨ AI content generated successfully');
      } catch (error) {
        console.log('⚠️ AI content generation failed, continuing without it:', error);
      }
    }

    res.json({
      success: true,
      message: `Successfully applied ${result.totalFields} fields incrementally`,
      result: {
        fieldsAdded: result.fieldsAdded,
        fieldsEnhanced: result.fieldsEnhanced,
        fieldsSkipped: result.fieldsSkipped,
        totalFields: result.totalFields,
        source,
        timestamp: new Date().toISOString()
      },
      aiContent: aiContent || null
    });

  } catch (error) {
    console.error('❌ Error in incremental scraping:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply incremental data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get scraping history for a business
router.get('/history/:businessId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Verify business ownership
    const business = await storage.getBusiness(businessId);
    if (!business || business.userId !== Number(userId)) {
      return res.status(404).json({ success: false, message: 'Business not found or access denied' });
    }

    const history = await incrementalScraping.getScrapingHistory(businessId);
    
    res.json({
      success: true,
      history
    });

  } catch (error) {
    console.error('❌ Error getting scraping history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get scraping history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate AI micrositio content from business data
router.post('/generate-micrositio/:businessId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Verify business ownership
    const business = await storage.getBusiness(businessId);
    if (!business || business.userId !== Number(userId)) {
      return res.status(404).json({ success: false, message: 'Business not found or access denied' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'AI content generation not available - OpenAI API key required'
      });
    }

    console.log('🤖 Generating AI micrositio content for business:', businessId);

    // Get current business settings for context
    const settings = await storage.getBusinessSettings(businessId);
    
    // Prepare business data for AI
    const businessData = {
      name: business.name,
      category: business.category,
      description: business.description,
      address: settings?.address,
      phone: business.phone,
      website: settings?.websiteUrl,
      socialMedia: {
        facebook: settings?.facebookUrl,
        instagram: settings?.instagramUrl,
        youtube: settings?.youtubeUrl
      }
    };

    const aiGenerator = new AIContentGenerator();
    const aiContent = await aiGenerator.generateContent(businessData);
    const micrositioStructure = await aiGenerator.generateMicrositioStructure(businessData, aiContent);

    res.json({
      success: true,
      aiContent,
      micrositioStructure,
      message: 'AI micrositio content generated successfully'
    });

  } catch (error) {
    console.error('❌ Error generating AI micrositio content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate AI content',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check what sources have been scraped for a business
router.get('/sources/:businessId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Verify business ownership
    const business = await storage.getBusiness(businessId);
    if (!business || business.userId !== Number(userId)) {
      return res.status(404).json({ success: false, message: 'Business not found or access denied' });
    }

    // Check which sources have been used
    const sources = {
      'google-maps': await incrementalScraping.hasBeenScraped(businessId, 'google-maps'),
      'facebook': await incrementalScraping.hasBeenScraped(businessId, 'facebook'),
      'instagram': await incrementalScraping.hasBeenScraped(businessId, 'instagram'),
      'kagi-search': await incrementalScraping.hasBeenScraped(businessId, 'kagi-search')
    };

    res.json({
      success: true,
      sources
    });

  } catch (error) {
    console.error('❌ Error checking scraped sources:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check sources',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
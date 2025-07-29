import { Request, Response } from 'express';
import { ScrapingOrchestrator } from '../../../services/scraping-orchestrator';
import { z } from 'zod';

const StartScrapingSchema = z.object({
  businessId: z.string(),
  businessName: z.string(),
  facebookUrl: z.string().url().optional(),
  instagramUrl: z.string().url().optional(),
  googlePlacesUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  category: z.string().optional(),
  address: z.string().optional(),
});

export const startScraping = async (req: Request, res: Response) => {
  try {
    console.log('🚀 Starting scraping job via API...');
    
    // Validate request body
    const validatedData = StartScrapingSchema.parse(req.body);
    
    const orchestrator = new ScrapingOrchestrator();
    
    // Start the scraping process
    const result = await orchestrator.createAndStartScraping({
      businessId: validatedData.businessId,
      urls: {
        facebook: validatedData.facebookUrl,
        instagram: validatedData.instagramUrl,
        googlePlaces: validatedData.googlePlacesUrl,
        website: validatedData.websiteUrl,
      },
      metadata: {
        businessName: validatedData.businessName,
        category: validatedData.category,
        address: validatedData.address,
      }
    });

    console.log('✅ Scraping job started successfully');
    
    res.status(200).json({
      success: true,
      jobId: result.jobId,
      status: result.status,
      message: 'Scraping job started successfully',
      estimatedDuration: '2-3 minutes',
    });
    
  } catch (error) {
    console.error('❌ Scraping job failed:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to start scraping job',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

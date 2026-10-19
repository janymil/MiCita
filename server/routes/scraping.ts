import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { ScrapingOrchestrator } from '../../services/scraping-orchestrator';
import { requireAuth, type AuthenticatedRequest } from '../auth-middleware';
import { storage } from '../storage';

const router = Router();

/** Scraping spawns paid Apify jobs, so every endpoint is authenticated. */
async function assertBusinessAccess(req: AuthenticatedRequest, businessIdRaw: string | number): Promise<boolean> {
  const businessId = Number(businessIdRaw);
  if (!Number.isFinite(businessId)) {
    // "temp-create-business" is used during onboarding before the row exists.
    return typeof businessIdRaw === 'string' && businessIdRaw.startsWith('temp-');
  }
  const business = await storage.getBusiness(businessId);
  return Boolean(business && req.user && business.userId === Number(req.user.id));
}

const StartScrapingSchema = z.object({
  businessId: z.union([z.string(), z.number()]).transform(String),
  businessName: z.string().optional(),
  facebookUrl: z.string().transform(val => val === '' ? undefined : val).optional().refine(val => !val || z.string().url().safeParse(val).success, 'Invalid URL'),
  instagramUrl: z.string().transform(val => val === '' ? undefined : val).optional().refine(val => !val || z.string().url().safeParse(val).success, 'Invalid URL'),
  googleMapsUrl: z.string().transform(val => val === '' ? undefined : val).optional().refine(val => !val || z.string().url().safeParse(val).success, 'Invalid URL'),
  websiteUrl: z.string().transform(val => val === '' ? undefined : val).optional().refine(val => !val || z.string().url().safeParse(val).success, 'Invalid URL'),
  kagiSearchQuery: z.string().transform(val => val === '' ? undefined : val).optional(),
  category: z.string().optional(),
  address: z.string().optional(),
});

const JobStatusSchema = z.object({
  jobId: z.string(),
});

// Start a new scraping job
router.post('/start', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🚀 Starting scraping job via API...');

    // Validate request body
    const validatedData = StartScrapingSchema.parse(req.body);

    if (!(await assertBusinessAccess(req, validatedData.businessId))) {
      return res.status(403).json({ success: false, message: 'No tienes acceso a este negocio' });
    }

    const orchestrator = new ScrapingOrchestrator();

    // Start the comprehensive scraping process
    const result = await orchestrator.createAndStartScraping({
      businessId: validatedData.businessId,
      userId: req.user?.id,
      urls: {
        facebook: validatedData.facebookUrl,
        instagram: validatedData.instagramUrl,
        googleMaps: validatedData.googleMapsUrl,
        website: validatedData.websiteUrl,
        kagiSearchQuery: validatedData.kagiSearchQuery,
      },
      metadata: {
        businessName: validatedData.businessName || 'Mi Negocio',
        category: validatedData.category || 'Negocio',
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

  } catch (error: any) {
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
});

// Get job status
router.get('/status/:jobId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { jobId } = req.params;

    console.log(`📊 Getting status for job: ${jobId}`);

    const orchestrator = new ScrapingOrchestrator();
    const job = await orchestrator.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const allowed = job.userId
      ? job.userId === Number(req.user?.id)
      : await assertBusinessAccess(req, job.businessId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'No tienes acceso a este trabajo' });
    }

    res.status(200).json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        error: job.error
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to get job status:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to get job status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get job results
router.get('/results/:jobId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { jobId } = req.params;

    console.log(`📋 Getting results for job: ${jobId}`);

    const orchestrator = new ScrapingOrchestrator();
    const job = await orchestrator.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const allowed = job.userId
      ? job.userId === Number(req.user?.id)
      : await assertBusinessAccess(req, job.businessId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'No tienes acceso a este trabajo' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Job is not completed yet',
        currentStatus: job.status,
        progress: job.progress
      });
    }

    res.status(200).json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        processedData: job.processedData,
        qualityScore: job.qualityScore,
        completedAt: job.completedAt
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to get job results:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to get job results',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

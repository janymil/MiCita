import express, { type Express } from "express";
import { z } from "zod";
import { db } from "./db.js";
import { apifyBusinesses, openstreetBusinesses } from "@shared/schema";
import { sql, eq, and, or, gte, lte, ne, isNotNull, desc, asc, count } from "drizzle-orm";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

// Validation schemas
const scrapingJobSchema = z.object({
  type: z.enum(['apify', 'openstreetmap', 'category', 'district', 'enhanced']),
  category: z.string().optional(),
  district: z.string().optional(),
  searchTerms: z.array(z.string()).optional(),
  maxResults: z.number().min(1).max(10000).optional(),
  enhanced: z.boolean().optional()
});

const scrapingAnalysisSchema = z.object({
  analysisType: z.enum(['category', 'district', 'quality', 'coverage']),
  filters: z.record(z.any()).optional()
});

interface ScrapingJob {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime: Date;
  endTime?: Date;
  results?: any;
  error?: string;
  config: any;
}

class ScrapingManager {
  private static jobs: Map<string, ScrapingJob> = new Map();
  private static jobCounter = 1;

  static createJob(config: any): string {
    const jobId = `job_${Date.now()}_${this.jobCounter++}`;
    const job: ScrapingJob = {
      id: jobId,
      type: config.type,
      status: 'pending',
      progress: 0,
      startTime: new Date(),
      config
    };
    this.jobs.set(jobId, job);
    return jobId;
  }

  static getJob(jobId: string): ScrapingJob | undefined {
    return this.jobs.get(jobId);
  }

  static getAllJobs(): ScrapingJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  static updateJob(jobId: string, updates: Partial<ScrapingJob>) {
    const job = this.jobs.get(jobId);
    if (job) {
      Object.assign(job, updates);
    }
  }

  static async executeScrapingJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    this.updateJob(jobId, { status: 'running', progress: 10 });

    try {
      let scriptPath = '';
      let args: string[] = [];

      switch (job.config.type) {
        case 'apify':
          scriptPath = 'run-enhanced-wave1.js';
          break;
        case 'category':
          scriptPath = `scrapers/${job.config.category}-scraper.js`;
          break;
        case 'district':
          scriptPath = 'run-missing-districts-scraper.js';
          break;
        case 'openstreetmap':
          scriptPath = 'import-openstreet-geojson.js';
          break;
        case 'enhanced':
          scriptPath = 'run-enhanced-wave1.js';
          args = ['--enhanced'];
          break;
      }

      if (!fs.existsSync(scriptPath)) {
        throw new Error(`Scraper script not found: ${scriptPath}`);
      }

      const child = spawn('tsx', [scriptPath, ...args], {
        stdio: 'pipe',
        detached: false
      });

      let output = '';
      let errorOutput = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
        // Update progress based on output
        const progressMatch = output.match(/(\d+)%|(\d+)\/(\d+)|Batch (\d+)\/(\d+)/);
        if (progressMatch) {
          let progress = 10;
          if (progressMatch[1]) {
            progress = Math.min(90, parseInt(progressMatch[1]));
          } else if (progressMatch[2] && progressMatch[3]) {
            progress = Math.min(90, (parseInt(progressMatch[2]) / parseInt(progressMatch[3])) * 100);
          } else if (progressMatch[4] && progressMatch[5]) {
            progress = Math.min(90, (parseInt(progressMatch[4]) / parseInt(progressMatch[5])) * 100);
          }
          this.updateJob(jobId, { progress });
        }
      });

      child.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          this.updateJob(jobId, {
            status: 'completed',
            progress: 100,
            endTime: new Date(),
            results: { output, summary: this.parseScrapingResults(output) }
          });
        } else {
          this.updateJob(jobId, {
            status: 'failed',
            endTime: new Date(),
            error: errorOutput || 'Scraping process failed'
          });
        }
      });

    } catch (error) {
      this.updateJob(jobId, {
        status: 'failed',
        endTime: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private static parseScrapingResults(output: string) {
    const summary: any = { businessesFound: 0, errors: 0, categories: {} };
    
    // Parse output for common patterns
    const businessMatch = output.match(/(\d+)\s+(?:businesses|negocios)/i);
    if (businessMatch) {
      summary.businessesFound = parseInt(businessMatch[1]);
    }

    const errorMatch = output.match(/(\d+)\s+errors?/i);
    if (errorMatch) {
      summary.errors = parseInt(errorMatch[1]);
    }

    // Extract category information
    const categoryMatches = output.match(/(\w+):\s*(\d+)\s*businesses/gi);
    if (categoryMatches) {
      categoryMatches.forEach(match => {
        const [, category, count] = match.match(/(\w+):\s*(\d+)/) || [];
        if (category && count) {
          summary.categories[category] = parseInt(count);
        }
      });
    }

    return summary;
  }
}

// Admin authentication middleware - same as other admin routes
const requireAdminAuth = (req: any, res: any, next: any) => {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }
  
  const token = authHeader.split(' ')[1];
  if (token !== adminPassword) {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
  
  next();
};

export function registerAdminScrapingRoutes(app: Express) {
  // Get all scraping jobs
  app.get('/api/admin/scraping/jobs', requireAdminAuth, async (req, res) => {
    try {
      const jobs = ScrapingManager.getAllJobs();
      res.json({ jobs });
    } catch (error) {
      console.error('Error fetching scraping jobs:', error);
      res.status(500).json({ error: 'Failed to fetch scraping jobs' });
    }
  });

  // Get specific job details
  app.get('/api/admin/scraping/jobs/:jobId', requireAdminAuth, async (req, res) => {
    try {
      const { jobId } = req.params;
      const job = ScrapingManager.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      res.json({ job });
    } catch (error) {
      console.error('Error fetching job details:', error);
      res.status(500).json({ error: 'Failed to fetch job details' });
    }
  });

  // Start new scraping job
  app.post('/api/admin/scraping/start', requireAdminAuth, async (req, res) => {
    try {
      const config = scrapingJobSchema.parse(req.body);
      const jobId = ScrapingManager.createJob(config);
      
      // Start job execution asynchronously
      ScrapingManager.executeScrapingJob(jobId);
      
      res.json({ jobId, message: 'Scraping job started successfully' });
    } catch (error) {
      console.error('Error starting scraping job:', error);
      res.status(500).json({ error: 'Failed to start scraping job' });
    }
  });

  // Get database statistics
  app.get('/api/admin/scraping/stats', requireAdminAuth, async (req, res) => {
    try {
      const [apifyCount, osmCount] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(apifyBusinesses),
        db.select({ count: sql<number>`count(*)` }).from(openstreetBusinesses)
      ]);

      // Category breakdown for Apify businesses
      const apifyCategories = await db
        .select({
          category: apifyBusinesses.category,
          count: sql<number>`count(*)`
        })
        .from(apifyBusinesses)
        .groupBy(apifyBusinesses.category)
        .orderBy(desc(sql`count(*)`));

      // Category breakdown for OSM businesses  
      const osmCategories = await db
        .select({
          category: openstreetBusinesses.category,
          count: sql<number>`count(*)`
        })
        .from(openstreetBusinesses)
        .groupBy(openstreetBusinesses.category)
        .orderBy(desc(sql`count(*)`));

      // Quality metrics for Apify
      const apifyQuality = await db
        .select({
          totalBusinesses: sql<number>`count(*)`,
          withPhone: sql<number>`count(case when ${apifyBusinesses.phone} is not null and ${apifyBusinesses.phone} != '' then 1 end)`,
          withWebsite: sql<number>`count(case when ${apifyBusinesses.website} is not null and ${apifyBusinesses.website} != '' then 1 end)`,
          withEmail: sql<number>`count(case when ${apifyBusinesses.email} is not null and ${apifyBusinesses.email} != '' then 1 end)`,
          withRating: sql<number>`count(case when ${apifyBusinesses.rating} is not null and ${apifyBusinesses.rating} > 0 then 1 end)`
        })
        .from(apifyBusinesses);

      // Quality metrics for OSM
      const osmQuality = await db
        .select({
          totalBusinesses: sql<number>`count(*)`,
          withPhone: sql<number>`count(case when ${openstreetBusinesses.phone} is not null and ${openstreetBusinesses.phone} != '' then 1 end)`,
          withWebsite: sql<number>`count(case when ${openstreetBusinesses.website} is not null and ${openstreetBusinesses.website} != '' then 1 end)`,
          withEmail: sql<number>`count(case when ${openstreetBusinesses.email} is not null and ${openstreetBusinesses.email} != '' then 1 end)`,
          withHours: sql<number>`count(case when ${openstreetBusinesses.openingHours} is not null and ${openstreetBusinesses.openingHours} != '' then 1 end)`
        })
        .from(openstreetBusinesses);

      res.json({
        totals: {
          apify: apifyCount[0].count,
          osm: osmCount[0].count,
          combined: apifyCount[0].count + osmCount[0].count
        },
        categories: {
          apify: apifyCategories,
          osm: osmCategories
        },
        quality: {
          apify: apifyQuality[0],
          osm: osmQuality[0]
        }
      });
    } catch (error) {
      console.error('Error fetching scraping stats:', error);
      res.status(500).json({ error: 'Failed to fetch scraping statistics' });
    }
  });

  // Available scrapers list
  app.get('/api/admin/scraping/scrapers', requireAdminAuth, async (req, res) => {
    try {
      const scrapersDir = 'scrapers';
      const scraperFiles = fs.existsSync(scrapersDir) 
        ? fs.readdirSync(scrapersDir).filter(file => file.endsWith('-scraper.js'))
        : [];

      const availableScrapers = [
        {
          id: 'apify-wave1',
          name: 'Apify Wave 1 Scraper',
          description: 'Enhanced Google Places scraping with contact enrichment',
          type: 'apify',
          estimatedCost: '$12-15',
          expectedResults: '2000-3000 businesses'
        },
        {
          id: 'openstreetmap',
          name: 'OpenStreetMap Importer',
          description: 'Import businesses from OpenStreetMap GeoJSON data',
          type: 'openstreetmap',
          estimatedCost: 'Free',
          expectedResults: '53,806 businesses'
        },
        {
          id: 'missing-districts',
          name: 'Missing Districts Scraper',
          description: 'Target under-represented Lima districts',
          type: 'district',
          estimatedCost: '$15-20',
          expectedResults: '2000-3000 businesses'
        }
      ];

      // Add category scrapers
      const categoryScrapers = scraperFiles.map(file => {
        const category = file.replace('-scraper.js', '');
        return {
          id: `category-${category}`,
          name: `${category.charAt(0).toUpperCase() + category.slice(1)} Category Scraper`,
          description: `Specialized scraper for ${category} businesses`,
          type: 'category',
          category,
          estimatedCost: '$20-30',
          expectedResults: '3000-5000 businesses'
        };
      });

      res.json({
        scrapers: [...availableScrapers, ...categoryScrapers]
      });
    } catch (error) {
      console.error('Error fetching available scrapers:', error);
      res.status(500).json({ error: 'Failed to fetch available scrapers' });
    }
  });

  // Data analysis endpoints
  app.post('/api/admin/scraping/analyze', requireAdminAuth, async (req, res) => {
    try {
      const { analysisType, filters } = scrapingAnalysisSchema.parse(req.body);
      let results: any = {};

      switch (analysisType) {
        case 'category':
          results = await analyzeCategoryDistribution(filters);
          break;
        case 'district':
          results = await analyzeDistrictCoverage(filters);
          break;
        case 'quality':
          results = await analyzeDataQuality(filters);
          break;
        case 'coverage':
          results = await analyzeCoverageGaps(filters);
          break;
      }

      res.json({ analysis: results });
    } catch (error) {
      console.error('Error performing analysis:', error);
      res.status(500).json({ error: 'Failed to perform analysis' });
    }
  });

  // Clean up or manage data
  app.post('/api/admin/scraping/cleanup', requireAdminAuth, async (req, res) => {
    try {
      const { action, target } = req.body;
      let result: any = {};

      switch (action) {
        case 'remove_duplicates':
          result = await removeDuplicateBusinesses(target);
          break;
        case 'update_categories':
          result = await updateBusinessCategories(target);
          break;
        case 'validate_contacts':
          result = await validateContactInformation(target);
          break;
      }

      res.json({ result });
    } catch (error) {
      console.error('Error performing cleanup:', error);
      res.status(500).json({ error: 'Failed to perform cleanup' });
    }
  });
}

// Analysis helper functions
async function analyzeCategoryDistribution(filters: any) {
  const apifyDistribution = await db
    .select({
      category: apifyBusinesses.category,
      count: sql<number>`count(*)`
    })
    .from(apifyBusinesses)
    .groupBy(apifyBusinesses.category)
    .orderBy(desc(sql`count(*)`));

  const osmDistribution = await db
    .select({
      category: openstreetBusinesses.category,
      count: sql<number>`count(*)`
    })
    .from(openstreetBusinesses)
    .groupBy(openstreetBusinesses.category)
    .orderBy(desc(sql`count(*)`));

  return {
    apify: apifyDistribution,
    osm: osmDistribution,
    recommendations: generateCategoryRecommendations(apifyDistribution, osmDistribution)
  };
}

async function analyzeDistrictCoverage(filters: any) {
  const apifyDistricts = await db
    .select({
      district: apifyBusinesses.district,
      count: sql<number>`count(*)`
    })
    .from(apifyBusinesses)
    .where(isNotNull(apifyBusinesses.district))
    .groupBy(apifyBusinesses.district)
    .orderBy(desc(sql`count(*)`));

  const osmDistricts = await db
    .select({
      district: openstreetBusinesses.district,
      count: sql<number>`count(*)`
    })
    .from(openstreetBusinesses)
    .where(isNotNull(openstreetBusinesses.district))
    .groupBy(openstreetBusinesses.district)
    .orderBy(desc(sql`count(*)`));

  return {
    apify: apifyDistricts,
    osm: osmDistricts,
    underRepresented: identifyUnderRepresentedDistricts(apifyDistricts, osmDistricts)
  };
}

async function analyzeDataQuality(filters: any) {
  // Quality metrics for both data sources
  return {
    apify: await getApifyQualityMetrics(),
    osm: await getOSMQualityMetrics(),
    recommendations: generateQualityRecommendations()
  };
}

async function analyzeCoverageGaps(filters: any) {
  return {
    categoryGaps: await identifyCategoryGaps(),
    geographicGaps: await identifyGeographicGaps(),
    recommendations: generateCoverageRecommendations()
  };
}

// Helper functions for analysis
function generateCategoryRecommendations(apify: any[], osm: any[]) {
  return [
    "Focus on belleza category - low representation in current data",
    "Gastronomía has good coverage but could benefit from enhanced contact data",
    "Servicios category is well represented across both sources"
  ];
}

function identifyUnderRepresentedDistricts(apify: any[], osm: any[]) {
  // Logic to identify districts with low business counts
  return apify.filter(d => d.count < 50).map(d => d.district);
}

async function getApifyQualityMetrics() {
  return await db
    .select({
      totalBusinesses: sql<number>`count(*)`,
      withPhone: sql<number>`count(case when ${apifyBusinesses.phone} is not null and ${apifyBusinesses.phone} != '' then 1 end)`,
      withWebsite: sql<number>`count(case when ${apifyBusinesses.website} is not null and ${apifyBusinesses.website} != '' then 1 end)`,
      withEmail: sql<number>`count(case when ${apifyBusinesses.email} is not null and ${apifyBusinesses.email} != '' then 1 end)`,
      avgRating: sql<number>`avg(${apifyBusinesses.rating}::numeric)`
    })
    .from(apifyBusinesses);
}

async function getOSMQualityMetrics() {
  return await db
    .select({
      totalBusinesses: sql<number>`count(*)`,
      withPhone: sql<number>`count(case when ${openstreetBusinesses.phone} is not null and ${openstreetBusinesses.phone} != '' then 1 end)`,
      withWebsite: sql<number>`count(case when ${openstreetBusinesses.website} is not null and ${openstreetBusinesses.website} != '' then 1 end)`,
      withHours: sql<number>`count(case when ${openstreetBusinesses.openingHours} is not null and ${openstreetBusinesses.openingHours} != '' then 1 end)`
    })
    .from(openstreetBusinesses);
}

function generateQualityRecommendations() {
  return [
    "Run enhanced scraping to improve contact information coverage",
    "Validate existing phone numbers and websites",
    "Consider contact enrichment for high-priority businesses"
  ];
}

async function identifyCategoryGaps() {
  return ["fitness", "educacion"]; // Categories with low representation
}

async function identifyGeographicGaps() {
  return ["Callao", "Ventanilla"]; // Districts with low coverage
}

function generateCoverageRecommendations() {
  return [
    "Run targeted scraping for fitness centers",
    "Increase coverage in outer Lima districts",
    "Focus on educational institutions"
  ];
}

// Cleanup helper functions
async function removeDuplicateBusinesses(target: string) {
  // Implementation for removing duplicates
  return { removed: 0, message: "Duplicate removal not yet implemented" };
}

async function updateBusinessCategories(target: string) {
  // Implementation for updating categories
  return { updated: 0, message: "Category updates not yet implemented" };
}

async function validateContactInformation(target: string) {
  // Implementation for validating contacts
  return { validated: 0, message: "Contact validation not yet implemented" };
}
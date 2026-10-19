import { ApifyScrapingService, ScrapingSources, FacebookBusinessData, InstagramBusinessData, GooglePlacesData, ComprehensiveBusinessData } from '../lib/apify-scraping-service';
import { DataMergingService } from './data-merger';
import { DataCleaningService } from './data-processor';
import { AIContentEnhancer } from './ai-enhancer';
import { storage } from '../server/storage.js';

export interface ScrapingJob {
  id: string;
  businessId: string;
  /** Owner of the job — required so status/results cannot be read by others. */
  userId?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  sources: ScrapingSources;
  progress: number;
  currentStep: string;
  rawData?: any;
  processedData?: any;
  qualityScore?: number;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface RawScrapedData {
  facebook?: FacebookBusinessData;
  instagram?: InstagramBusinessData;
  googleMaps?: GooglePlacesData;
  website?: any;
}

export interface ProcessedBusinessData {
  name: string;
  description?: string;
  category?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  hours?: Record<string, { open: string; close: string; closed?: boolean }>;
  profileImage?: string;
  coverImage?: string;
  galleryImages: string[];
  rating?: number;
  reviewCount?: number;
  services?: string[];
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  };
  customUrl?: string;
  qualityScore: number;
  sources: string[];
}

export class ScrapingOrchestrator {
  private apifyService: ApifyScrapingService;
  private dataMerger: DataMergingService;
  private dataCleaner: DataCleaningService;
  private aiEnhancer: AIContentEnhancer;

  // Static job storage shared across all instances
  private static jobs: Map<string, ScrapingJob> = new Map();

  constructor() {
    this.apifyService = new ApifyScrapingService();
    this.dataMerger = new DataMergingService();
    this.dataCleaner = new DataCleaningService();
    this.aiEnhancer = new AIContentEnhancer();
  }

  async createAndStartScraping(config: {
    businessId: string;
    userId?: number;
    urls: {
      facebook?: string;
      instagram?: string;
      googleMaps?: string;
      website?: string;
      kagiSearchQuery?: string;
    };
    metadata?: {
      businessName?: string;
      category?: string;
      address?: string;
    };
  }): Promise<{ jobId: string; status: string }> {
    console.log(`🚀 Creating and starting scraping job for business: ${config.businessId}`);
    
    // Generate job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create job in database
    const job: ScrapingJob = {
      id: jobId,
      businessId: config.businessId,
      userId: config.userId,
      status: 'pending',
      sources: {
        businessName: config.metadata?.businessName,
        facebookUrl: config.urls.facebook,
        instagramUrl: config.urls.instagram,
        googleMapsUrl: config.urls.googleMaps,
        websiteUrl: config.urls.website,
        kagiSearchQuery: config.urls.kagiSearchQuery,
      },
      progress: 0,
      currentStep: 'Inicializando...',
      createdAt: new Date(),
    };
    
    await this.createJob(job);
    
    // Start processing asynchronously (don't wait)
    setImmediate(() => this.startScraping(jobId));
    
    return { jobId, status: 'started' };
  }

  async startScraping(jobId: string): Promise<void> {
    console.log(`🚀 Starting comprehensive scraping job: ${jobId}`);
    
    try {
      // Get job from database
      const job = await this.getJob(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Update status to running
      await this.updateJobStatus(jobId, 'running', 10, 'Extrayendo TODOS los datos disponibles...');

      // Use the NEW COMPREHENSIVE SCRAPING METHOD
      const businessIdNum = parseInt(job.businessId);
      const comprehensiveData = await this.apifyService.scrapeAllBusinessData(job.sources, businessIdNum);
      
      await this.updateJobStatus(jobId, 'running', 70, 'Datos guardados automáticamente. Mejorando contenido...');

      // Data is already automatically saved to database by scrapeAllBusinessData
      // Now just enhance and finalize
      const cleanedData = this.dataCleaner.cleanBusinessData(comprehensiveData);
      await this.updateJobStatus(jobId, 'running', 85, 'Aplicando mejoras de IA...');

      const enhancedData = await this.enhanceWithAI(cleanedData, jobId);
      await this.updateJobStatus(jobId, 'running', 95, 'Finalizando configuración...');

      // Save comprehensive results
      await this.completeJob(jobId, {
        rawData: comprehensiveData,
        processedData: enhancedData,
        qualityScore: comprehensiveData.qualityScore
      });

      console.log(`✅ COMPREHENSIVE scraping completed: ${jobId}`);
      console.log(`📊 Quality: ${comprehensiveData.qualityScore}% | 📸 Images: ${comprehensiveData.galleryImages.length} | ⭐ Reviews: ${comprehensiveData.reviews.length}`);

      console.log(`✅ Scraping job completed: ${jobId}`);
      
    } catch (error: any) {
      console.error(`❌ Scraping job failed: ${jobId}`, error);
      await this.failJob(jobId, error instanceof Error ? error.message : String(error));
    }
  }

  private async executeScraping(sources: ScrapingSources, jobId: string): Promise<RawScrapedData> {
    const results: RawScrapedData = {};
    const promises: Promise<any>[] = [];
    
    // Count available sources to calculate progress properly
    const availableSources = [sources.facebookUrl, sources.instagramUrl, sources.googleMapsUrl].filter(Boolean);
    const totalSources = availableSources.length;
    let completedSources = 0;
    
    console.log(`🎯 Starting scraping for ${totalSources} sources:`, {
      facebook: !!sources.facebookUrl,
      instagram: !!sources.instagramUrl,
      googleMaps: !!sources.googleMapsUrl
    });
    
    if (totalSources === 0) {
      throw new Error('No hay fuentes de datos para procesar');
    }

    // Start scraping operations only for provided sources
    if (sources.facebookUrl) {
      console.log(`🔍 Starting Facebook scraping for URL: ${sources.facebookUrl}`);
      await this.updateJobStatus(jobId, 'running', 15, 'Extrayendo datos de Facebook...');
      promises.push(
        this.apifyService.scrapeFacebookBusiness(sources.facebookUrl)
          .then((data: FacebookBusinessData) => { 
            console.log(`✅ Facebook scraping completed successfully`);
            results.facebook = data;
            completedSources++;
            const progress = 15 + Math.round((completedSources / totalSources) * 30);
            return this.updateJobStatus(jobId, 'running', progress, `Facebook completado (${completedSources}/${totalSources})`);
          })
          .catch((error: any) => {
            console.error('❌ Facebook scraping failed:', error.message || error);
            completedSources++;
            return this.updateJobStatus(jobId, 'running', 15, `Error en Facebook: ${error.message || 'Error desconocido'}`);
          })
      );
    }

    if (sources.instagramUrl) {
      console.log(`🔍 Starting Instagram scraping for URL: ${sources.instagramUrl}`);
      await this.updateJobStatus(jobId, 'running', 15, 'Analizando perfil de Instagram...');
      promises.push(
        this.apifyService.scrapeInstagramBusiness(sources.instagramUrl)
          .then((data: InstagramBusinessData) => { 
            console.log(`✅ Instagram scraping completed successfully`);
            results.instagram = data;
            completedSources++;
            const progress = 15 + Math.round((completedSources / totalSources) * 30);
            return this.updateJobStatus(jobId, 'running', progress, `Instagram completado (${completedSources}/${totalSources})`);
          })
          .catch((error: any) => {
            console.error('❌ Instagram scraping failed:', error.message || error);
            completedSources++;
            return this.updateJobStatus(jobId, 'running', 15, `Error en Instagram: ${error.message || 'Error desconocido'}`);
          })
      );
    }

    if (sources.googleMapsUrl) {
      console.log(`🔍 Starting Google Maps scraping for URL: ${sources.googleMapsUrl}`);
      await this.updateJobStatus(jobId, 'running', 15, 'Buscando en Google Maps...');
      promises.push(
        this.apifyService.scrapeGooglePlacesBusiness(sources.googleMapsUrl)
          .then((data: GooglePlacesData) => { 
            console.log(`✅ Google Maps scraping completed successfully`);
            results.googleMaps = data;
            completedSources++;
            const progress = 15 + Math.round((completedSources / totalSources) * 30);
            return this.updateJobStatus(jobId, 'running', progress, `Google Maps completado (${completedSources}/${totalSources})`);
          })
          .catch((error: any) => {
            console.error('❌ Google Maps scraping failed:', error.message || error);
            console.error('❌ Full error details:', error);
            completedSources++;
            // Update job status to show the error
            return this.updateJobStatus(jobId, 'running', 15, `Error en Google Maps: ${error.message || 'Error desconocido'}`);
          })
      );
    }

    // Wait for all scraping operations to complete
    await Promise.allSettled(promises);
    await this.updateJobStatus(jobId, 'running', 45, `Extracción completada: ${Object.keys(results).length} fuentes procesadas`);

    return results;
  }

  private async processData(rawData: RawScrapedData, jobId: string): Promise<ProcessedBusinessData> {
    await this.updateJobStatus(jobId, 'running', 55, 'Fusionando datos de múltiples fuentes...');

    // Merge data from all sources
    const mergedData = this.dataMerger.mergeBusinessData(rawData);
    
    await this.updateJobStatus(jobId, 'running', 65, 'Limpiando y estandarizando datos...');

    // Clean and standardize the data
    const cleanedData = this.dataCleaner.cleanBusinessData(mergedData);

    await this.updateJobStatus(jobId, 'running', 75, 'Datos procesados correctamente');

    return cleanedData;
  }

  private async enhanceWithAI(data: ProcessedBusinessData, jobId: string): Promise<ProcessedBusinessData> {
    await this.updateJobStatus(jobId, 'running', 85, 'Mejorando descripción con IA...');

    try {
      // Enhance description if available
      if (data.description && data.category) {
        const enhancedContent = await this.aiEnhancer.enhanceBusinessDescription(
          data.description, 
          data.category
        );
        data.description = enhancedContent.enhanced;
      }

      // Generate custom URL from business name
      if (data.name) {
        data.customUrl = this.generateCustomUrl(data.name);
      }

      await this.updateJobStatus(jobId, 'running', 90, 'Contenido mejorado con IA');

    } catch (error: any) {
      console.error('AI enhancement failed, using original data:', error);
    }

    return data;
  }

  private generateCustomUrl(businessName: string): string {
    return businessName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50); // Limit length
  }

  // Database operations - Store jobs in static memory shared across instances
  private async createJob(job: ScrapingJob): Promise<void> {
    console.log('📝 Creating scraping job in database:', job.id);
    console.log('📋 Job sources:', {
      facebook: !!job.sources.facebookUrl,
      instagram: !!job.sources.instagramUrl,
      googleMaps: !!job.sources.googleMapsUrl,
      website: !!job.sources.websiteUrl
    });
    
    // Debug static storage
    console.log(`🔧 Static storage before adding job: ${ScrapingOrchestrator.jobs.size} jobs`);
    ScrapingOrchestrator.jobs.set(job.id, job);
    console.log(`🔧 Static storage after adding job: ${ScrapingOrchestrator.jobs.size} jobs`);
    console.log(`🔧 Job stored successfully: ${ScrapingOrchestrator.jobs.has(job.id)}`);
  }

  private async getJob(jobId: string): Promise<ScrapingJob | null> {
    console.log('🔍 Getting scraping job from database:', jobId);
    console.log(`🔧 Static storage contains ${ScrapingOrchestrator.jobs.size} jobs`);
    console.log(`🔧 Available job IDs: [${Array.from(ScrapingOrchestrator.jobs.keys()).join(', ')}]`);
    
    const job = ScrapingOrchestrator.jobs.get(jobId);
    if (job) {
      console.log('✅ Found job with sources:', {
        facebook: !!job.sources.facebookUrl,
        instagram: !!job.sources.instagramUrl,
        googleMaps: !!job.sources.googleMapsUrl,
        website: !!job.sources.websiteUrl
      });
    } else {
      console.error('❌ Job not found:', jobId);
    }
    return job || null;
  }

  public async getJobStatus(jobId: string): Promise<ScrapingJob | null> {
    return this.getJob(jobId);
  }

  private async updateJobStatus(
    jobId: string, 
    status: ScrapingJob['status'], 
    progress: number, 
    currentStep: string
  ): Promise<void> {
    console.log(`📊 Updating job ${jobId}: ${status} (${progress}%) - ${currentStep}`);
    const job = ScrapingOrchestrator.jobs.get(jobId);
    if (job) {
      job.status = status;
      job.progress = progress;
      job.currentStep = currentStep;
      ScrapingOrchestrator.jobs.set(jobId, job);
    }
  }

  private async completeJob(jobId: string, results: {
    rawData: RawScrapedData;
    processedData: ProcessedBusinessData;
    qualityScore: number;
  }): Promise<void> {
    console.log(`✅ Completing job ${jobId} with quality score: ${results.qualityScore}`);
    
    const job = ScrapingOrchestrator.jobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.progress = 100;
      job.currentStep = 'Completado';
      job.rawData = results.rawData;
      job.processedData = results.processedData;
      job.qualityScore = results.qualityScore;
      job.completedAt = new Date();
      ScrapingOrchestrator.jobs.set(jobId, job);
      
      console.log('✅ Job completed and stored in memory with processed data');

      // Persist to the real business record (previously a TODO: results were
      // only ever kept in memory and lost on restart).
      await this.persistResults(job, results.processedData);
    }
  }

  /**
   * Write scraped data into `businesses` / `business_settings` / `gallery`.
   * Only fills fields the owner has not set, so automation can never destroy
   * hand-written copy.
   */
  private async persistResults(job: ScrapingJob, data: ProcessedBusinessData): Promise<void> {
    const businessId = Number.parseInt(job.businessId, 10);
    if (!Number.isFinite(businessId)) {
      console.log('ℹ️ Skipping persistence: job has no real businessId yet');
      return;
    }

    try {
      const business = await storage.getBusiness(businessId);
      if (!business) return;

      const businessUpdates: Record<string, unknown> = {};
      if (!business.description && data.description) businessUpdates.description = data.description;
      if (!business.phone && data.phone) businessUpdates.phone = data.phone;
      if (!business.email && data.email) businessUpdates.email = data.email;
      if (!business.address && data.address) businessUpdates.address = data.address;
      if (!business.website && data.website) businessUpdates.website = data.website;
      if (!business.logo && data.profileImage) businessUpdates.logo = data.profileImage;
      if (!business.coverImage && data.coverImage) businessUpdates.coverImage = data.coverImage;

      if (Object.keys(businessUpdates).length > 0) {
        await storage.updateBusiness(businessId, businessUpdates as any);
      }

      const settings = await storage.getBusinessSettings(businessId);
      const settingsUpdates: Record<string, unknown> = {};
      if (!settings?.publicDescription && data.description) settingsUpdates.publicDescription = data.description;
      if (!settings?.profileImage && data.profileImage) settingsUpdates.profileImage = data.profileImage;
      if (!settings?.coverImage && data.coverImage) settingsUpdates.coverImage = data.coverImage;
      if (!settings?.streetAddress && data.address) settingsUpdates.streetAddress = data.address;
      if (!settings?.facebookUrl && data.socialMedia?.facebook) settingsUpdates.facebookUrl = data.socialMedia.facebook;
      if (!settings?.instagramUrl && data.socialMedia?.instagram) settingsUpdates.instagramUrl = data.socialMedia.instagram;
      if (!settings?.tiktokUrl && data.socialMedia?.tiktok) settingsUpdates.tiktokUrl = data.socialMedia.tiktok;
      if (!settings?.youtubeUrl && data.socialMedia?.youtube) settingsUpdates.youtubeUrl = data.socialMedia.youtube;

      if (!settings?.workingHours && data.hours) {
        settingsUpdates.workingHours = Object.fromEntries(
          Object.entries(data.hours).map(([day, value]) => [
            day,
            { enabled: !value.closed, start: value.open || '09:00', end: value.close || '17:00' },
          ]),
        );
      }

      if (Object.keys(settingsUpdates).length > 0) {
        await storage.updateBusinessSettings(businessId, settingsUpdates as any);
      }

      if (Array.isArray(data.galleryImages) && data.galleryImages.length > 0) {
        const existing = await storage.getGalleryByBusinessId(businessId);
        const known = new Set(existing.map((item) => item.imageUrl));
        for (const imageUrl of data.galleryImages.slice(0, 20)) {
          if (!imageUrl || known.has(imageUrl)) continue;
          await storage.createGalleryItem({ businessId, imageUrl, caption: null } as any).catch(() => undefined);
          known.add(imageUrl);
        }
      }

      console.log(`💾 Persisted scraped data for business ${businessId}`);
    } catch (error) {
      console.error('❌ Failed to persist scraped data:', error);
    }
  }

  private async failJob(jobId: string, error: string): Promise<void> {
    console.log(`❌ Failing job ${jobId} with error: ${error}`);
    
    const job = ScrapingOrchestrator.jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error;
      job.currentStep = `Error: ${error}`;
      ScrapingOrchestrator.jobs.set(jobId, job);
      
      console.log('❌ Job marked as failed in memory');
    }
  }

  private calculateQualityScore(data: ProcessedBusinessData): number {
    const weights = {
      hasName: 20,
      hasDescription: 15,
      hasContact: 20,
      hasImages: 15,
      hasHours: 10,
      hasCategory: 10,
      hasSocialMedia: 10
    };

    let score = 0;
    if (data.name) score += weights.hasName;
    if (data.description && data.description.length > 50) score += weights.hasDescription;
    if (data.phone || data.email) score += weights.hasContact;
    if (data.galleryImages && data.galleryImages.length > 0) score += weights.hasImages;
    if (data.hours && Object.keys(data.hours).length > 0) score += weights.hasHours;
    if (data.category) score += weights.hasCategory;
    if (data.socialMedia && Object.values(data.socialMedia).some(url => url)) score += weights.hasSocialMedia;

    return score;
  }
}

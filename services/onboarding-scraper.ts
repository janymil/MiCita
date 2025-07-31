import { ApifyScrapingService } from '../lib/apify-scraping-service';
import { storage } from '../server/storage';

/**
 * ONBOARDING SCRAPER SERVICE
 * Integrates scraping system with new user registration process
 * Automatically creates micrositio from business URLs during signup
 */
export class OnboardingScrapingService {
  private scrapingService: ApifyScrapingService;
  private storage: any;

  constructor() {
    this.scrapingService = new ApifyScrapingService();
    this.storage = storage;
  }

  /**
   * AUTO-SCRAPE DURING REGISTRATION
   * Called when new user registers and provides business URLs
   */
  async autoScrapeOnRegistration(userId: number, businessData: {
    businessName: string;
    facebookUrl?: string;
    instagramUrl?: string;
    googleMapsUrl?: string;
    websiteUrl?: string;
    category?: string;
  }): Promise<{
    businessId: number;
    scrapingJobId: string;
    qualityScore: number;
    message: string;
  }> {
    console.log('🚀 Starting auto-scraping for new user registration...');
    console.log('👤 User ID:', userId);
    console.log('🏢 Business Name:', businessData.businessName);

    try {
      // 1. Create the business record first
      const business = await this.storage.createBusiness({
        userId: userId,
        name: businessData.businessName,
        category: businessData.category || 'Servicios',
        description: 'Configuración automática en progreso...',
        address: '',
        phone: '',
        email: '',
        website: businessData.websiteUrl || ''
      });

      console.log('✅ Business created with ID:', business.id);

      // 2. Start comprehensive scraping immediately
      const scrapedData = await this.scrapingService.scrapeAllBusinessData({
        businessName: businessData.businessName,
        facebookUrl: businessData.facebookUrl,
        instagramUrl: businessData.instagramUrl,
        googleMapsUrl: businessData.googleMapsUrl,
        websiteUrl: businessData.websiteUrl
      }, business.id);

      console.log('✅ Auto-scraping completed during registration');
      console.log('📊 Quality Score:', scrapedData.qualityScore);
      console.log('📸 Images Found:', scrapedData.galleryImages.length);
      console.log('⭐ Reviews Found:', scrapedData.reviews.length);

      // 3. Generate automatic custom URL for micrositio
      const customUrl = this.generateBusinessSlug(businessData.businessName);
      
      // 4. Update business settings with scraped data and custom URL
      await this.updateBusinessSettingsFromScrapedData(scrapedData, business.id, customUrl);

      return {
        businessId: business.id,
        scrapingJobId: `onboarding_${Date.now()}_${business.id}`,
        qualityScore: scrapedData.qualityScore || 0,
        message: `Micrositio creado exitosamente con ${scrapedData.qualityScore}% de información completa`
      };

    } catch (error) {
      console.error('❌ Auto-scraping during registration failed:', error);
      
      // Create basic business even if scraping fails
      const business = await this.storage.createBusiness({
        userId: userId,
        name: businessData.businessName,
        category: businessData.category || 'Servicios',
        description: 'Negocio registrado sin información automática',
        address: '',
        phone: '',
        email: '',
        website: businessData.websiteUrl || ''
      });

      return {
        businessId: business.id,
        scrapingJobId: 'failed',
        qualityScore: 0,
        message: 'Negocio creado. Configure manualmente su información.'
      };
    }
  }

  /**
   * RETRY SCRAPING FOR EXISTING BUSINESS
   * Allow users to retry scraping after registration
   */
  async retryScraping(businessId: number, urls: {
    facebookUrl?: string;
    instagramUrl?: string;
    googleMapsUrl?: string;
    websiteUrl?: string;
    kagiSearchQuery?: string;
  }): Promise<{
    success: boolean;
    qualityScore: number;
    message: string;
  }> {
    console.log('🔄 Retrying scraping for business ID:', businessId);

    try {
      // Get business info
      const business = await this.storage.getBusinessById(businessId);
      if (!business) {
        throw new Error('Business not found');
      }

      // Perform comprehensive scraping
      const scrapedData = await this.scrapingService.scrapeAllBusinessData({
        businessName: business.name,
        ...urls
      }, businessId);

      // Update business settings
      const customUrl = this.generateBusinessSlug(business.name);
      await this.updateBusinessSettingsFromScrapedData(scrapedData, businessId, customUrl);

      console.log('✅ Retry scraping completed successfully');

      return {
        success: true,
        qualityScore: scrapedData.qualityScore || 0,
        message: `Información actualizada con ${scrapedData.qualityScore}% de completitud`
      };

    } catch (error) {
      console.error('❌ Retry scraping failed:', error);
      return {
        success: false,
        qualityScore: 0,
        message: 'Error al actualizar información automáticamente'
      };
    }
  }

  /**
   * UPDATE BUSINESS SETTINGS FROM SCRAPED DATA
   * Populates micrositio configuration with scraped information
   */
  private async updateBusinessSettingsFromScrapedData(
    scrapedData: any, 
    businessId: number, 
    customUrl: string
  ): Promise<void> {
    console.log('💾 Updating business settings from scraped data...');

    try {
      // Prepare comprehensive settings data
      const settingsData: any = {
        customUrl: customUrl,
        publicDescription: scrapedData.description || '',
        profileImageUrl: scrapedData.profileImage || '',
        bannerImageUrl: scrapedData.coverImage || '',
        
        // Contact information
        phone: scrapedData.phone || '',
        email: scrapedData.email || '',
        websiteUrl: scrapedData.website || '',
        address: scrapedData.address || '',
        district: scrapedData.neighborhood || '',
        
        // Social media
        facebookUrl: scrapedData.socialMedia?.facebook || '',
        instagramUrl: scrapedData.socialMedia?.instagram || '',
        youtubeUrl: scrapedData.socialMedia?.youtube || '',
        tiktokUrl: scrapedData.socialMedia?.tiktok || '',
        
        // Features (enable all for scraped businesses)
        enablePublicBooking: true,
        enableContactForm: true,
        enableGallery: scrapedData.galleryImages.length > 0,
        enableReviews: scrapedData.reviews.length > 0,
        
        // Business hours
        workingHours: scrapedData.hours || {},
        
        // Quality metadata
        lastScrapedAt: new Date(),
        scrapingQualityScore: scrapedData.qualityScore || 0
      };

      // Update or create business settings
      const existingSettings = await this.storage.getBusinessSettings(businessId);
      
      if (existingSettings) {
        await this.storage.updateBusinessSettings(businessId, settingsData);
      } else {
        await this.storage.createBusinessSettings({
          businessId: businessId,
          ...settingsData
        });
      }

      console.log('✅ Business settings updated from scraped data');

    } catch (error) {
      console.error('❌ Error updating business settings:', error);
      throw error;
    }
  }

  /**
   * GENERATE BUSINESS SLUG FOR CUSTOM URL
   * Creates SEO-friendly URL from business name
   */
  private generateBusinessSlug(businessName: string): string {
    const slug = businessName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove multiple hyphens
      .substring(0, 50) // Limit length
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    // Add random suffix to ensure uniqueness
    const timestamp = Date.now().toString().slice(-4);
    return `${slug}-${timestamp}`;
  }

  /**
   * GET ONBOARDING STATUS
   * Check if scraping completed successfully for a business
   */
  async getOnboardingStatus(businessId: number): Promise<{
    completed: boolean;
    qualityScore: number;
    hasGallery: boolean;
    hasReviews: boolean;
    message: string;
  }> {
    try {
      const settings = await this.storage.getBusinessSettings(businessId);
      const gallery = await this.storage.getGalleryImages(businessId);
      const reviews = await this.storage.getBusinessReviews(businessId);

      const qualityScore = settings?.scrapingQualityScore || 0;
      const hasGallery = gallery && gallery.length > 0;
      const hasReviews = reviews && reviews.length > 0;

      return {
        completed: qualityScore > 0,
        qualityScore: qualityScore,
        hasGallery: hasGallery,
        hasReviews: hasReviews,
        message: qualityScore > 70 ? 
          'Micrositio configurado exitosamente' : 
          'Configuración parcial - puede mejorar agregando más información'
      };

    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
      return {
        completed: false,
        qualityScore: 0,
        hasGallery: false,
        hasReviews: false,
        message: 'Error verificando estado de configuración'
      };
    }
  }
}
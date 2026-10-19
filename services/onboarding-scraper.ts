import { ApifyScrapingService } from '../lib/apify-scraping-service';
import { storage } from '../server/storage';

export interface OnboardingScrapingInput {
  businessName: string;
  facebookUrl?: string;
  instagramUrl?: string;
  googleMapsUrl?: string;
  websiteUrl?: string;
  kagiSearchQuery?: string;
}

export interface OnboardingResult {
  success: boolean;
  businessData: any;
  scrapingResults: any;
  qualityScore: number;
  fieldsPopulated: string[];
  errors?: string[];
}

/**
 * STAGE 4: Onboarding Integration
 * Integrates scraping system into new business registration flow
 */
export class OnboardingScrapingService {
  private scrapingService: ApifyScrapingService;

  constructor() {
    this.scrapingService = new ApifyScrapingService();
  }

  /**
   * Complete onboarding with automatic data scraping
   * This is called during new business registration
   */
  async completeOnboardingWithScraping(
    userId: number,
    basicBusinessInfo: {
      name: string;
      category?: string;
      address?: string;
    },
    scrapingInput: OnboardingScrapingInput
  ): Promise<OnboardingResult> {
    console.log('🚀 Starting onboarding with auto-scraping for:', basicBusinessInfo.name);

    try {
      const errors: string[] = [];
      let scrapingResults: any = {};

      // Create basic business first
      const business = await storage.createBusiness({
        userId,
        name: basicBusinessInfo.name,
        category: basicBusinessInfo.category || 'General',
        description: '',
        address: basicBusinessInfo.address || '',
        phone: '',
        email: '',
        website: ''
      });

      console.log('✅ Created business:', business.id);

      // Create default business settings
      const settings = await storage.createBusinessSettings({
        businessId: business.id,
        customUrl: basicBusinessInfo.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        professionalTitle: basicBusinessInfo.name,
        publicDescription: '',
        publicPhone: '',
        publicEmail: '',
        streetAddress: basicBusinessInfo.address || '',
        district: '',
        region: 'Lima',
        postalCode: '',
        facebookUrl: scrapingInput.facebookUrl || '',
        instagramUrl: scrapingInput.instagramUrl || '',
        youtubeUrl: '',
        tiktokUrl: '',
        enablePublicBooking: true,
        enableContactForm: true,
        enableGallery: true,
        enableReviews: true,
        profileImage: '',
        coverImage: '',
        workingHours: {},
        blockedDates: [],
        blockedHours: [],
        scheduleNotes: ''
      });

      console.log('✅ Created business settings');

      // Perform comprehensive scraping if URLs provided
      if (scrapingInput.facebookUrl || scrapingInput.instagramUrl || scrapingInput.googleMapsUrl) {
        try {
          console.log('🔄 Starting comprehensive data scraping...');
          
          scrapingResults = await this.scrapingService.scrapeAllBusinessData({
            businessName: scrapingInput.businessName,
            facebookUrl: scrapingInput.facebookUrl,
            instagramUrl: scrapingInput.instagramUrl,
            googleMapsUrl: scrapingInput.googleMapsUrl,
            websiteUrl: scrapingInput.websiteUrl,
            kagiSearchQuery: scrapingInput.kagiSearchQuery
          });

          console.log('✅ Scraping completed with quality score:', scrapingResults.qualityScore);

          // Apply scraped data automatically during onboarding
          await this.applyScrapedDataToNewBusiness(business.id, scrapingResults);

        } catch (scrapingError) {
          console.error('⚠️ Scraping failed during onboarding:', scrapingError);
          errors.push(`Scraping error: ${(scrapingError as Error).message}`);
        }
      }

      // Calculate final quality score and populated fields
      const updatedBusiness = await storage.getBusiness(business.id);
      const updatedSettings = await storage.getBusinessSettings(business.id);
      
      const fieldsPopulated = this.calculatePopulatedFields(updatedBusiness, updatedSettings);
      const qualityScore = this.calculateQualityScore(updatedBusiness, updatedSettings, scrapingResults);

      console.log('✅ Onboarding completed successfully');
      console.log('📊 Quality score:', qualityScore, '| Fields populated:', fieldsPopulated.length);

      return {
        success: true,
        businessData: {
          business: updatedBusiness,
          settings: updatedSettings
        },
        scrapingResults,
        qualityScore,
        fieldsPopulated,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error: any) {
      console.error('❌ Onboarding failed:', error);
      
      return {
        success: false,
        businessData: null,
        scrapingResults: {},
        qualityScore: 0,
        fieldsPopulated: [],
        errors: [`Onboarding failed: ${(error as Error).message}`]
      };
    }
  }

  /**
   * Apply scraped data to newly created business
   */
  private async applyScrapedDataToNewBusiness(businessId: number, scrapingResults: any): Promise<void> {
    console.log('🔄 Applying scraped data to new business:', businessId);

    const businessUpdates: any = {};
    const settingsUpdates: any = {};

    // Apply business-level updates
    if (scrapingResults.name && scrapingResults.name !== 'Business') {
      businessUpdates.name = scrapingResults.name;
    }
    if (scrapingResults.description) {
      businessUpdates.description = scrapingResults.description;
    }
    if (scrapingResults.phone) {
      businessUpdates.phone = scrapingResults.phone;
    }
    if (scrapingResults.email) {
      businessUpdates.email = scrapingResults.email;
    }
    if (scrapingResults.website) {
      businessUpdates.website = scrapingResults.website;
    }
    if (scrapingResults.address) {
      businessUpdates.address = scrapingResults.address;
    }

    // Apply settings-level updates
    if (scrapingResults.name) {
      settingsUpdates.professionalTitle = scrapingResults.name;
    }
    if (scrapingResults.description) {
      settingsUpdates.publicDescription = scrapingResults.description;
    }
    if (scrapingResults.phone) {
      settingsUpdates.publicPhone = scrapingResults.phone;
    }
    if (scrapingResults.email) {
      settingsUpdates.publicEmail = scrapingResults.email;
    }
    if (scrapingResults.address) {
      settingsUpdates.streetAddress = scrapingResults.address;
    }
    if (scrapingResults.profileImage) {
      settingsUpdates.profileImage = scrapingResults.profileImage;
    }
    if (scrapingResults.coverImage) {
      settingsUpdates.coverImage = scrapingResults.coverImage;
    }
    if (scrapingResults.socialMedia?.facebook) {
      settingsUpdates.facebookUrl = scrapingResults.socialMedia.facebook;
    }
    if (scrapingResults.socialMedia?.instagram) {
      settingsUpdates.instagramUrl = scrapingResults.socialMedia.instagram;
    }
    if (scrapingResults.hours && Object.keys(scrapingResults.hours).length > 0) {
      settingsUpdates.workingHours = scrapingResults.hours;
    }

    // Update business and settings
    if (Object.keys(businessUpdates).length > 0) {
      await storage.updateBusiness(businessId, businessUpdates);
      console.log('✅ Updated business with fields:', Object.keys(businessUpdates));
    }

    if (Object.keys(settingsUpdates).length > 0) {
      await storage.updateBusinessSettings(businessId, settingsUpdates);
      console.log('✅ Updated settings with fields:', Object.keys(settingsUpdates));
    }

    // Add gallery images
    if (scrapingResults.galleryImages && scrapingResults.galleryImages.length > 0) {
      console.log('📸 Adding gallery images:', scrapingResults.galleryImages.length);
      for (const imageUrl of scrapingResults.galleryImages.slice(0, 15)) {
        try {
          await storage.createGalleryItem(businessId, {
            imageUrl,
            caption: 'Imagen extraída automáticamente',
            isActive: true
          });
        } catch (error: any) {
          console.log('⚠️ Skipping duplicate image');
        }
      }
    }

    // Add reviews
    if (scrapingResults.reviews && scrapingResults.reviews.length > 0) {
      console.log('💬 Adding reviews:', scrapingResults.reviews.length);
      for (const review of scrapingResults.reviews.slice(0, 5)) {
        try {
          await storage.createReview({
            businessId,
            clientName: review.author || 'Cliente',
            rating: review.rating || 5,
            comment: review.comment || ''
          });
        } catch (error: any) {
          console.log('⚠️ Skipping duplicate review');
        }
      }
    }

    console.log('✅ Scraped data applied to new business');
  }

  /**
   * Calculate which fields have been populated
   */
  private calculatePopulatedFields(business: any, settings: any): string[] {
    const fields: string[] = [];

    if (business?.name && business.name !== 'New Business') fields.push('name');
    if (business?.description) fields.push('description');
    if (business?.phone) fields.push('phone');
    if (business?.email) fields.push('email');
    if (business?.website) fields.push('website');
    if (business?.address) fields.push('address');

    if (settings?.professionalTitle && settings.professionalTitle !== business?.name) fields.push('professionalTitle');
    if (settings?.publicDescription) fields.push('publicDescription');
    if (settings?.publicPhone) fields.push('publicPhone');
    if (settings?.publicEmail) fields.push('publicEmail');
    if (settings?.streetAddress) fields.push('streetAddress');
    if (settings?.profileImage) fields.push('profileImage');
    if (settings?.coverImage) fields.push('coverImage');
    if (settings?.facebookUrl) fields.push('facebookUrl');
    if (settings?.instagramUrl) fields.push('instagramUrl');
    if (settings?.workingHours && Object.keys(settings.workingHours).length > 0) fields.push('workingHours');

    return fields;
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(business: any, settings: any, scrapingResults: any): number {
    const fieldsPopulated = this.calculatePopulatedFields(business, settings);
    const totalPossibleFields = 15;
    
    let baseScore = (fieldsPopulated.length / totalPossibleFields) * 70;
    
    // Bonus points for rich content
    if (scrapingResults.galleryImages?.length > 0) baseScore += 15;
    if (scrapingResults.reviews?.length > 0) baseScore += 10;
    if (scrapingResults.rating > 0) baseScore += 5;

    return Math.min(Math.round(baseScore), 100);
  }
}
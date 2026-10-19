import { Request, Response, Router } from 'express';
import { storage } from '../storage';
import { requireAuth, type AuthenticatedRequest } from '../auth-middleware';
import { z } from 'zod';

const router = Router();

// Schema for scraped data application
const ApplyScrapedDataSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  profileImage: z.string().optional(),
  coverImage: z.string().optional(),
  galleryImages: z.array(z.string()).optional(),
  hours: z.record(z.any()).optional(),
  socialMedia: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    youtube: z.string().optional(),
  }).optional(),
  reviews: z.array(z.any()).optional(),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
});

// Apply scraped data to business and microsite settings
router.post('/businesses/:businessId/apply-scraped-data', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    console.log('🔄 Applying scraped data to business:', businessId);
    
    // Validate request data
    const scrapedData = ApplyScrapedDataSchema.parse(req.body);
    console.log('📊 Scraped data fields:', Object.keys(scrapedData));
    
    // Verify business ownership
    const business = await storage.getBusiness(businessId);
    if (!business || business.userId !== Number(userId)) {
      return res.status(404).json({
        success: false,
        message: 'Business not found or access denied'
      });
    }

    let fieldsUpdated = 0;

    // Update business basic information
    const businessUpdates: any = {};
    if (scrapedData.name) {
      businessUpdates.name = scrapedData.name;
      fieldsUpdated++;
    }
    if (scrapedData.description) {
      businessUpdates.description = scrapedData.description;
      fieldsUpdated++;
    }
    if (scrapedData.category) {
      businessUpdates.category = scrapedData.category;
      fieldsUpdated++;
    }
    if (scrapedData.phone) {
      businessUpdates.phone = scrapedData.phone;
      fieldsUpdated++;
    }
    if (scrapedData.email) {
      businessUpdates.email = scrapedData.email;
      fieldsUpdated++;
    }
    if (scrapedData.website) {
      businessUpdates.website = scrapedData.website;
      fieldsUpdated++;
    }
    if (scrapedData.address) {
      businessUpdates.address = scrapedData.address;
      fieldsUpdated++;
    }

    if (Object.keys(businessUpdates).length > 0) {
      await storage.updateBusiness(businessId, businessUpdates);
      console.log('✅ Updated business with fields:', Object.keys(businessUpdates));
    }

    // Get business settings (they should already exist)
    const settings = await storage.getBusinessSettings(businessId);
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Business settings not found'
      });
    }

    // Update microsite settings with scraped data
    const settingsUpdates: any = {};
    
    if (scrapedData.name && scrapedData.name !== settings.professionalTitle) {
      settingsUpdates.professionalTitle = scrapedData.name;
      fieldsUpdated++;
    }
    
    if (scrapedData.description && scrapedData.description !== settings.publicDescription) {
      settingsUpdates.publicDescription = scrapedData.description;
      fieldsUpdated++;
    }
    
    if (scrapedData.phone && scrapedData.phone !== settings.publicPhone) {
      settingsUpdates.publicPhone = scrapedData.phone;
      fieldsUpdated++;
    }
    
    if (scrapedData.email && scrapedData.email !== settings.publicEmail) {
      settingsUpdates.publicEmail = scrapedData.email;
      fieldsUpdated++;
    }
    
    if (scrapedData.address && scrapedData.address !== settings.streetAddress) {
      settingsUpdates.streetAddress = scrapedData.address;
      fieldsUpdated++;
    }
    
    if (scrapedData.profileImage && scrapedData.profileImage !== settings.profileImage) {
      settingsUpdates.profileImage = scrapedData.profileImage;
      fieldsUpdated++;
    }
    
    if (scrapedData.coverImage && scrapedData.coverImage !== settings.coverImage) {
      settingsUpdates.coverImage = scrapedData.coverImage;
      fieldsUpdated++;
    }
    
    if (scrapedData.socialMedia?.facebook && scrapedData.socialMedia.facebook !== settings.facebookUrl) {
      settingsUpdates.facebookUrl = scrapedData.socialMedia.facebook;
      fieldsUpdated++;
    }
    
    if (scrapedData.socialMedia?.instagram && scrapedData.socialMedia.instagram !== settings.instagramUrl) {
      settingsUpdates.instagramUrl = scrapedData.socialMedia.instagram;
      fieldsUpdated++;
    }
    
    if (scrapedData.socialMedia?.youtube && scrapedData.socialMedia.youtube !== settings.youtubeUrl) {
      settingsUpdates.youtubeUrl = scrapedData.socialMedia.youtube;
      fieldsUpdated++;
    }
    
    if (scrapedData.hours && Object.keys(scrapedData.hours).length > 0) {
      settingsUpdates.workingHours = scrapedData.hours;
      fieldsUpdated++;
    }

    if (Object.keys(settingsUpdates).length > 0) {
      await storage.updateBusinessSettings(businessId, settingsUpdates);
      console.log('✅ Updated settings with fields:', Object.keys(settingsUpdates));
    }

    // Add gallery images if provided
    if (scrapedData.galleryImages && scrapedData.galleryImages.length > 0) {
      console.log('📸 Adding gallery images:', scrapedData.galleryImages.length);
      for (const imageUrl of scrapedData.galleryImages.slice(0, 20)) { // Limit to 20 images
        try {
          await storage.createGalleryItem({
            businessId,
            imageUrl,
            caption: 'Imagen extraída automáticamente'
          });
          fieldsUpdated++;
        } catch (error: any) {
          console.log('⚠️ Skipping duplicate image:', imageUrl);
        }
      }
    }

    // Add reviews if provided
    if (scrapedData.reviews && scrapedData.reviews.length > 0) {
      console.log('💬 Adding reviews:', scrapedData.reviews.length);
      for (const review of scrapedData.reviews.slice(0, 10)) { // Limit to 10 reviews
        try {
          await storage.createReview({
            businessId,
            clientName: review.author || 'Cliente',
            rating: review.rating || 5,
            comment: review.comment || ''
          });
          fieldsUpdated++;
        } catch (error: any) {
          console.log('⚠️ Skipping duplicate review:', review.author);
        }
      }
    }

    console.log('✅ Data application completed. Fields updated:', fieldsUpdated);

    res.json({
      success: true,
      message: 'Scraped data applied successfully',
      fieldsUpdated,
      businessUpdated: Object.keys(businessUpdates).length > 0,
      settingsUpdated: Object.keys(settingsUpdates).length > 0,
      imagesAdded: scrapedData.galleryImages?.length || 0,
      reviewsAdded: scrapedData.reviews?.length || 0
    });

  } catch (error: any) {
    console.error('❌ Error applying scraped data:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format',
        errors: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to apply scraped data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
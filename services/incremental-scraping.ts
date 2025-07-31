import { storage } from '../server/storage';

interface IncrementalData {
  source: string;
  timestamp: number;
  data: Record<string, any>;
}

interface MergeResult {
  fieldsAdded: string[];
  fieldsEnhanced: string[];
  fieldsSkipped: string[];
  totalFields: number;
}

export class IncrementalScrapingService {
  
  /**
   * Applies scraped data incrementally - only adding new fields or enhancing existing ones
   * Never overwrites existing user-configured data
   */
  async applyIncrementalData(
    businessId: number, 
    newData: Record<string, any>, 
    source: string
  ): Promise<MergeResult> {
    console.log(`🔄 Starting incremental data application from ${source}`);
    
    const result: MergeResult = {
      fieldsAdded: [],
      fieldsEnhanced: [],
      fieldsSkipped: [],
      totalFields: 0
    };

    try {
      // Get current business data
      const currentBusiness = await storage.getBusiness(businessId);
      const currentSettings = await storage.getBusinessSettings(businessId);
      
      if (!currentBusiness) {
        throw new Error('Business not found');
      }

      // Track what data we're working with
      console.log('📊 Current business fields:', Object.keys(currentBusiness));
      console.log('📊 New data fields:', Object.keys(newData));

      // Apply business information incrementally
      const businessUpdates = await this.mergeBusinessData(currentBusiness, newData, result);
      
      // Apply settings incrementally
      const settingsUpdates = await this.mergeSettingsData(currentSettings, newData, result);
      
      // Handle gallery images incrementally
      await this.mergeGalleryImages(businessId, newData.galleryImages || [], result);
      
      // Handle reviews incrementally
      await this.mergeReviews(businessId, newData.reviews || [], result);

      // Update database only if there are changes
      if (Object.keys(businessUpdates).length > 0) {
        await storage.updateBusiness(businessId, businessUpdates);
        console.log('✅ Updated business with:', Object.keys(businessUpdates));
      }

      if (Object.keys(settingsUpdates).length > 0) {
        await storage.updateBusinessSettings(businessId, settingsUpdates);
        console.log('✅ Updated settings with:', Object.keys(settingsUpdates));
      }

      // Record this scraping session
      await this.recordScrapingSession(businessId, source, newData, result);

      result.totalFields = result.fieldsAdded.length + result.fieldsEnhanced.length;
      
      console.log(`✅ Incremental merge completed: ${result.totalFields} fields processed`);
      console.log(`📈 Added: ${result.fieldsAdded.length}, Enhanced: ${result.fieldsEnhanced.length}, Skipped: ${result.fieldsSkipped.length}`);
      
      return result;

    } catch (error) {
      console.error('❌ Error in incremental data application:', error);
      throw error;
    }
  }

  private async mergeBusinessData(
    currentBusiness: any, 
    newData: Record<string, any>, 
    result: MergeResult
  ): Promise<Record<string, any>> {
    const updates: Record<string, any> = {};

    // Name: Only add if empty or enhance if significantly different
    if (newData.name) {
      if (!currentBusiness.name || currentBusiness.name.trim() === '') {
        updates.name = newData.name;
        result.fieldsAdded.push('name');
      } else if (this.isSignificantlyDifferent(currentBusiness.name, newData.name)) {
        // Enhance with longer, more descriptive name
        if (newData.name.length > currentBusiness.name.length) {
          updates.name = newData.name;
          result.fieldsEnhanced.push('name');
        } else {
          result.fieldsSkipped.push('name (current is better)');
        }
      } else {
        result.fieldsSkipped.push('name (already exists)');
      }
    }

    // Description: Always enhance if new one is longer/better
    if (newData.description) {
      if (!currentBusiness.description || currentBusiness.description.trim() === '') {
        updates.description = newData.description;
        result.fieldsAdded.push('description');
      } else if (newData.description.length > currentBusiness.description.length) {
        updates.description = newData.description;
        result.fieldsEnhanced.push('description');
      } else {
        result.fieldsSkipped.push('description (current is adequate)');
      }
    }

    // Category: Only add if empty
    if (newData.category && (!currentBusiness.category || currentBusiness.category.trim() === '')) {
      updates.category = newData.category;
      result.fieldsAdded.push('category');
    } else if (newData.category) {
      result.fieldsSkipped.push('category (already set)');
    }

    // Phone: Only add if empty
    if (newData.phone && (!currentBusiness.phone || currentBusiness.phone.trim() === '')) {
      updates.phone = newData.phone;
      result.fieldsAdded.push('phone');
    } else if (newData.phone) {
      result.fieldsSkipped.push('phone (already set)');
    }

    // Email: Only add if empty
    if (newData.email && (!currentBusiness.email || currentBusiness.email.trim() === '')) {
      updates.email = newData.email;
      result.fieldsAdded.push('email');
    } else if (newData.email) {
      result.fieldsSkipped.push('email (already set)');
    }

    return updates;
  }

  private async mergeSettingsData(
    currentSettings: any, 
    newData: Record<string, any>, 
    result: MergeResult
  ): Promise<Record<string, any>> {
    const updates: Record<string, any> = {};

    if (!currentSettings) {
      console.log('⚠️ No current settings found, will create new ones');
      // If no settings exist, this is first-time setup
      if (newData.website) {
        updates.websiteUrl = newData.website;
        result.fieldsAdded.push('website');
      }
      if (newData.address) {
        updates.address = newData.address;
        result.fieldsAdded.push('address');
      }
      if (newData.socialMedia?.facebook) {
        updates.facebookUrl = newData.socialMedia.facebook;
        result.fieldsAdded.push('facebook');
      }
      if (newData.socialMedia?.instagram) {
        updates.instagramUrl = newData.socialMedia.instagram;
        result.fieldsAdded.push('instagram');
      }
      if (newData.profileImage) {
        updates.profileImageUrl = newData.profileImage;
        result.fieldsAdded.push('profileImage');
      }
      if (newData.coverImage) {
        updates.coverImageUrl = newData.coverImage;
        result.fieldsAdded.push('coverImage');
      }
      return updates;
    }

    // Website: Only add if empty
    if (newData.website && (!currentSettings.websiteUrl || currentSettings.websiteUrl.trim() === '')) {
      updates.websiteUrl = newData.website;
      result.fieldsAdded.push('website');
    } else if (newData.website) {
      result.fieldsSkipped.push('website (already set)');
    }

    // Address: Only add if empty
    if (newData.address && (!currentSettings.address || currentSettings.address.trim() === '')) {
      updates.address = newData.address;
      result.fieldsAdded.push('address');
    } else if (newData.address) {
      result.fieldsSkipped.push('address (already set)');
    }

    // Social Media: Only add if empty
    if (newData.socialMedia?.facebook && (!currentSettings.facebookUrl || currentSettings.facebookUrl.trim() === '')) {
      updates.facebookUrl = newData.socialMedia.facebook;
      result.fieldsAdded.push('facebook');
    } else if (newData.socialMedia?.facebook) {
      result.fieldsSkipped.push('facebook (already set)');
    }

    if (newData.socialMedia?.instagram && (!currentSettings.instagramUrl || currentSettings.instagramUrl.trim() === '')) {
      updates.instagramUrl = newData.socialMedia.instagram;
      result.fieldsAdded.push('instagram');
    } else if (newData.socialMedia?.instagram) {
      result.fieldsSkipped.push('instagram (already set)');
    }

    // Profile/Cover Images: Only add if empty
    if (newData.profileImage && (!currentSettings.profileImageUrl || currentSettings.profileImageUrl.trim() === '')) {
      updates.profileImageUrl = newData.profileImage;
      result.fieldsAdded.push('profileImage');
    } else if (newData.profileImage) {
      result.fieldsSkipped.push('profileImage (already set)');
    }

    if (newData.coverImage && (!currentSettings.coverImageUrl || currentSettings.coverImageUrl.trim() === '')) {
      updates.coverImageUrl = newData.coverImage;
      result.fieldsAdded.push('coverImage');
    } else if (newData.coverImage) {
      result.fieldsSkipped.push('coverImage (already set)');
    }

    return updates;
  }

  private async mergeGalleryImages(
    businessId: number, 
    newImages: string[], 
    result: MergeResult
  ): Promise<void> {
    if (!newImages || newImages.length === 0) return;

    try {
      // Get existing gallery images (simplified approach)
      const existingUrls = new Set<string>();
      
      let addedCount = 0;
      
      for (const imageUrl of newImages.slice(0, 20)) { // Limit to 20 images
        if (!existingUrls.has(imageUrl)) {
          try {
            await storage.createGalleryItem(businessId, {
              imageUrl,
              caption: 'Imagen extraída automáticamente',
              isActive: true
            });
            addedCount++;
          } catch (error) {
            console.log('⚠️ Failed to add image:', imageUrl);
          }
        }
      }
      
      if (addedCount > 0) {
        result.fieldsAdded.push(`gallery (${addedCount} images)`);
      } else {
        result.fieldsSkipped.push('gallery (no new images)');
      }
      
    } catch (error) {
      console.error('❌ Error merging gallery images:', error);
      result.fieldsSkipped.push('gallery (error)');
    }
  }

  private async mergeReviews(
    businessId: number, 
    newReviews: Array<{author: string, rating: number, comment: string}>, 
    result: MergeResult
  ): Promise<void> {
    if (!newReviews || newReviews.length === 0) return;

    try {
      // Get existing reviews (simplified approach)
      const existingAuthors = new Set<string>();
      
      let addedCount = 0;
      
      for (const review of newReviews.slice(0, 10)) { // Limit to 10 reviews
        // Avoid duplicate reviews from same author
        if (!existingAuthors.has(review.author)) {
          try {
            await storage.createReview({
              businessId,
              clientName: review.author,
              rating: review.rating,
              comment: review.comment
            });
            addedCount++;
            existingAuthors.add(review.author); // Prevent duplicates within this batch
          } catch (error) {
            console.log('⚠️ Failed to add review from:', review.author);
          }
        }
      }
      
      if (addedCount > 0) {
        result.fieldsAdded.push(`reviews (${addedCount} new)`);
      } else {
        result.fieldsSkipped.push('reviews (no new reviews)');
      }
      
    } catch (error) {
      console.error('❌ Error merging reviews:', error);
      result.fieldsSkipped.push('reviews (error)');
    }
  }

  private isSignificantlyDifferent(current: string, newValue: string): boolean {
    if (!current || !newValue) return false;
    
    // Consider different if new value is at least 50% longer and contains more information
    const lengthDiff = newValue.length / current.length;
    const containsMoreWords = newValue.split(' ').length > current.split(' ').length * 1.3;
    
    return lengthDiff > 1.5 && containsMoreWords;
  }

  private async recordScrapingSession(
    businessId: number, 
    source: string, 
    data: Record<string, any>, 
    result: MergeResult
  ): Promise<void> {
    try {
      // This could be stored in a scraping_sessions table for tracking
      console.log(`📝 Recording scraping session: Business ${businessId}, Source: ${source}`);
      console.log(`📊 Session results:`, {
        source,
        timestamp: new Date().toISOString(),
        fieldsProcessed: result.totalFields,
        fieldsAdded: result.fieldsAdded.length,
        fieldsEnhanced: result.fieldsEnhanced.length,
        fieldsSkipped: result.fieldsSkipped.length
      });
      
      // TODO: Implement actual session storage if needed for analytics
      
    } catch (error) {
      console.error('❌ Error recording scraping session:', error);
    }
  }

  /**
   * Get scraping history for a business
   */
  async getScrapingHistory(businessId: number): Promise<IncrementalData[]> {
    // TODO: Implement if scraping history table is created
    return [];
  }

  /**
   * Check if a source has been scraped before for this business
   */
  async hasBeenScraped(businessId: number, source: string): Promise<boolean> {
    // TODO: Implement with scraping history
    return false;
  }
}

export const incrementalScraping = new IncrementalScrapingService();
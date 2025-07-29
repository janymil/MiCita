import { ApifyClient } from 'apify-client';
import { eq, and } from 'drizzle-orm';
import * as schema from '../migrations/schema';

export interface ScrapingSources {
  facebookUrl?: string;
  instagramUrl?: string;
  googleMapsUrl?: string;
  websiteUrl?: string;
}

export interface FacebookBusinessData {
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
  priceRange?: string;
}

export interface InstagramBusinessData {
  username: string;
  fullName?: string;
  biography?: string;
  website?: string;
  profileImage?: string;
  postsCount?: number;
  followersCount?: number;
  galleryImages: string[];
  hashtags: string[];
  location?: string;
}

export interface GooglePlacesData {
  name: string;
  description?: string;
  category?: string;
  address?: string;
  streetAddress?: string;
  neighborhood?: string;
  city?: string;
  postalCode?: string;
  state?: string;
  countryCode?: string;
  phone?: string;
  website?: string;
  hours?: Record<string, { open: string; close: string; closed?: boolean }>;
  rating?: number;
  reviewCount?: number;
  reviews: Array<{
    author: string;
    rating: number;
    comment?: string;
    date?: string;
  }>;
  images: string[];
  coordinates?: [number, number];
  priceLevel?: number;
}

export class ApifyScrapingService {
  private client: ApifyClient;
  private db: any; // Database instance
  
  constructor(db?: any) {
    this.client = new ApifyClient({
      token: process.env.APIFY_API_TOKEN,
    });
    this.db = db;
  }

  async scrapeFacebookBusiness(facebookUrl: string): Promise<FacebookBusinessData> {
    try {
      console.log('🔍 Scraping Facebook business page:', facebookUrl);
      
      const run = await this.client.actor("cleansyntax/facebook-pages-scraper").call({
        urls: [facebookUrl]
      });
      
      const dataset = await this.client.dataset(run.defaultDatasetId).listItems();
      const rawData = dataset.items[0];
      
      if (!rawData) {
        throw new Error('No data found for Facebook page');
      }
      
      return this.transformFacebookData(rawData);
    } catch (error) {
      console.error('Error scraping Facebook:', error);
      throw new Error(`Failed to scrape Facebook page: ${(error as Error).message}`);
    }
  }

  async scrapeInstagramBusiness(instagramUrl: string): Promise<InstagramBusinessData> {
    try {
      console.log('🔍 Scraping Instagram business profile:', instagramUrl);
      
      const run = await this.client.actor("apify/instagram-scraper").call({
        addParentData: false,
        directUrls: [instagramUrl],
        enhanceUserSearchWithFacebookPage: false,
        isUserReelFeedURL: false,
        isUserTaggedFeedURL: false,
        resultsLimit: 5,
        resultsType: "posts",
        searchLimit: 1,
        searchType: "hashtag"
      });
      
      const dataset = await this.client.dataset(run.defaultDatasetId).listItems();
      const rawData = dataset.items[0];
      
      if (!rawData) {
        throw new Error('No data found for Instagram profile');
      }
      
      return this.transformInstagramData(rawData);
    } catch (error) {
      console.error('Error scraping Instagram:', error);
      throw new Error(`Failed to scrape Instagram profile: ${(error as Error).message}`);
    }
  }

  async scrapeGooglePlacesBusiness(googleMapsUrl: string): Promise<GooglePlacesData> {
    try {
      console.log('🔍 Scraping Google Maps business:', googleMapsUrl);
      console.log('🔧 Apify API Token present:', !!process.env.APIFY_API_TOKEN);
      
      // Use the original URL directly - Apify actor handles full Google Maps URLs perfectly
      console.log('🎯 Using original URL for scraping (no cleaning needed):', googleMapsUrl);
      
      const runInput = {
        includeWebResults: true,
        language: "es-419",
        maxImages: 20,
        maxReviews: 15,
        maximumLeadsEnrichmentRecords: 0,
        scrapeContacts: true,
        scrapeDirectories: true,
        scrapeImageAuthors: false,
        scrapePlaceDetailPage: true,
        scrapeReviewsPersonalData: true,
        scrapeTableReservationProvider: false,
        skipClosedPlaces: false,
        startUrls: [
          {
            url: googleMapsUrl,
            method: "GET"
          }
        ]
      };
      
      console.log('📋 Apify input structure:', JSON.stringify(runInput, null, 2));
      
      console.log(' Starting Apify actor: compass/crawler-google-places');
      const run = await this.client.actor("compass/crawler-google-places").call(runInput);
      
      console.log('✅ Apify actor started successfully');
      console.log('📊 Run details:', { 
        id: run.id, 
        status: run.status, 
        defaultDatasetId: run.defaultDatasetId 
      });
      
      console.log('📥 Fetching dataset items...');
      const dataset = await this.client.dataset(run.defaultDatasetId).listItems();
      console.log(`📊 Dataset contains ${dataset.items.length} items`);
      
      const rawData = dataset.items[0];
      
      if (!rawData) {
        console.error('❌ No data found in dataset');
        throw new Error('No data found for Google Maps URL');
      }
      
      console.log('✅ Raw data found, transforming...');
      console.log('📊 Raw data preview:', JSON.stringify(rawData, null, 2).substring(0, 500) + '...');
      
      // Working hours excluded from scraping - users can set manually
      
      // Enhanced image logging with proper type checking
      console.log('📸 Raw image data investigation:');
      console.log('📸 rawData.imageUrls length:', Array.isArray(rawData.imageUrls) ? rawData.imageUrls.length : 0);
      console.log('📸 rawData.images length:', Array.isArray(rawData.images) ? rawData.images.length : 0);
      console.log('📸 rawData.photos length:', Array.isArray(rawData.photos) ? rawData.photos.length : 0);
      console.log('📸 rawData.photoUrl:', rawData.photoUrl ? 'present' : 'missing');
      console.log('📸 All image keys in rawData:', Object.keys(rawData).filter(key => key.toLowerCase().includes('image') || key.toLowerCase().includes('photo')));
      
      const transformedData = this.transformGooglePlacesData(rawData);
      console.log('✅ Google Maps scraping completed successfully');
      console.log(' Transformed images count:', transformedData.images.length);
      
      return transformedData;
    } catch (error) {
      console.error('❌ Error scraping Google Maps:', error);
      console.error('❌ Error stack:', (error as Error).stack);
      throw new Error(`Failed to scrape Google Maps: ${(error as Error).message}`);
    }
  }

  private transformFacebookData(rawData: any): FacebookBusinessData {
    return {
      name: rawData.name || '',
      description: rawData.about || rawData.description || '',
      category: rawData.category || rawData.categories?.[0] || '',
      phone: rawData.phone || rawData.phoneNumber || '',
      email: rawData.email || '',
      website: rawData.website || rawData.websiteUrl || '',
      address: rawData.location?.formatted_address || rawData.address || '',
      hours: this.parseBusinessHours(rawData.hours || rawData.openingHours),
      profileImage: rawData.profilePicture || rawData.avatar || '',
      coverImage: rawData.coverPhoto || rawData.cover?.source || '',
      galleryImages: this.extractImages(rawData.photos || rawData.images || []),
      rating: parseFloat(rawData.rating) || undefined,
      reviewCount: parseInt(rawData.reviewCount) || parseInt(rawData.ratingsCount) || 0,
      services: rawData.services || [],
      priceRange: rawData.priceRange || ''
    };
  }

  private transformInstagramData(rawData: any): InstagramBusinessData {
    return {
      username: rawData.username || '',
      fullName: rawData.fullName || rawData.displayName || '',
      biography: rawData.biography || rawData.bio || '',
      website: rawData.externalUrl || rawData.website || '',
      profileImage: rawData.profilePicUrl || rawData.avatar || '',
      postsCount: parseInt(rawData.postsCount) || 0,
      followersCount: parseInt(rawData.followersCount) || 0,
      galleryImages: this.extractInstagramImages(rawData.latestPosts || []),
      hashtags: this.extractHashtags(rawData.latestPosts || []),
      location: rawData.location || ''
    };
  }

  private transformGooglePlacesData(rawData: any): GooglePlacesData {
    return {
      name: rawData.title || rawData.name || '',
      description: rawData.description || rawData.about || rawData.editorialSummary || '',
      category: rawData.categoryName || rawData.category || rawData.primaryType || '',
      address: rawData.address || rawData.formattedAddress || rawData.location?.address || '',
      streetAddress: rawData.street || rawData.streetAddress || '',
      neighborhood: rawData.neighborhood || '',
      city: rawData.city || '',
      postalCode: rawData.postalCode || '',
      state: rawData.state || rawData.region || '',
      countryCode: rawData.countryCode || '',
      phone: rawData.phoneUnformatted || rawData.phone || rawData.phoneNumber || '',
      website: rawData.website || rawData.url || rawData.websiteUrl || '',
      hours: undefined, // Excluded from scraping - users set manually
      rating: parseFloat(rawData.totalScore) || parseFloat(rawData.rating) || parseFloat(rawData.averageRating) || undefined,
      reviewCount: parseInt(rawData.reviewsCount) || parseInt(rawData.reviewCount) || parseInt(rawData.userRatingCount) || 0,
      reviews: this.parseReviews(rawData.reviews || []),
      images: this.extractImages([
        ...(rawData.imageUrls || []),
        ...(rawData.images || []),
        ...(rawData.photos || []),
        rawData.photoUrl,
        rawData.imageUrl,
        rawData.thumbnail,
        rawData.mainImage,
        ...(rawData.additionalImages || []),
        ...(rawData.galleryImages || [])
      ].filter(Boolean)), // Get ALL available images, not limited to 5
      coordinates: rawData.location?.lat && rawData.location?.lng 
        ? [rawData.location.lat, rawData.location.lng] 
        : undefined,
      priceLevel: parseInt(rawData.priceLevel) || undefined
    };
  }

  private parseBusinessHours(hours: any): Record<string, { open: string; close: string; closed?: boolean }> {
    if (!hours || typeof hours !== 'object') return {};
    
    const result: Record<string, { open: string; close: string; closed?: boolean }> = {};
    const dayMapping = {
      'monday': 'lunes',
      'tuesday': 'martes', 
      'wednesday': 'miercoles',
      'thursday': 'jueves',
      'friday': 'viernes',
      'saturday': 'sabado',
      'sunday': 'domingo'
    };

    Object.entries(hours).forEach(([day, schedule]: [string, any]) => {
      const spanishDay = (dayMapping as any)[day.toLowerCase()] || day.toLowerCase();
      
      if (typeof schedule === 'string') {
        if (schedule.toLowerCase().includes('cerrado') || schedule.toLowerCase().includes('closed')) {
          result[spanishDay] = { open: '', close: '', closed: true };
        } else {
          const match = schedule.match(/(\d{1,2}:?\d{0,2})\s*-\s*(\d{1,2}:?\d{0,2})/);
          if (match) {
            result[spanishDay] = { open: match[1], close: match[2] };
          }
        }
      } else if (schedule && typeof schedule === 'object') {
        result[spanishDay] = {
          open: schedule.open || schedule.start || '',
          close: schedule.close || schedule.end || '',
          closed: schedule.closed || false
        };
      }
    });

    return result;
  }

  private parseGoogleHours(hours: any): Record<string, { open: string; close: string; closed?: boolean }> {
    console.log('🕐 parseGoogleHours input:', JSON.stringify(hours, null, 2));
    
    if (!hours || typeof hours !== 'object') return {};
    
    const result: Record<string, { open: string; close: string; closed?: boolean }> = {};
    const dayMapping = {
      'monday': 'lunes',
      'tuesday': 'martes', 
      'wednesday': 'miercoles',
      'thursday': 'jueves',
      'friday': 'viernes',
      'saturday': 'sabado',
      'sunday': 'domingo',
      'mon': 'lunes',
      'tue': 'martes',
      'wed': 'miercoles', 
      'thu': 'jueves',
      'fri': 'viernes',
      'sat': 'sabado',
      'sun': 'domingo',
      '0': 'domingo',  // Sunday = 0
      '1': 'lunes',    // Monday = 1  
      '2': 'martes',   // Tuesday = 2
      '3': 'miercoles', // Wednesday = 3
      '4': 'jueves',   // Thursday = 4
      '5': 'viernes',  // Friday = 5
      '6': 'sabado'    // Saturday = 6
    };

    // Handle array format (common in Google APIs)
    if (Array.isArray(hours)) {
      console.log('🕐 Processing hours as array, length:', hours.length);
      hours.forEach((dayHour: any, index: number) => {
        const spanishDay = (dayMapping as any)[index.toString()] || `dia_${index}`;
        console.log(`🕐 Processing day ${index} (${spanishDay}):`, JSON.stringify(dayHour, null, 2));
        
        if (dayHour && typeof dayHour === 'object') {
          // Handle various formats from Google Maps
          let open = '';
          let close = '';
          let closed = false;
          
          if (dayHour.open && dayHour.close) {
            open = dayHour.open;
            close = dayHour.close;
          } else if (dayHour.start && dayHour.end) {
            open = dayHour.start;
            close = dayHour.end;
          } else if (dayHour.hours) {
            // Parse "9:00 AM – 9:00 PM" format
            const match = dayHour.hours.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*[–-]\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
            if (match) {
              open = match[1];
              close = match[2];
            }
          } else if (typeof dayHour.isClosed !== 'undefined') {
            closed = dayHour.isClosed;
          }
          
          result[spanishDay] = {
            open: open || '',
            close: close || '',
            closed: closed || (!open && !close)
          };
        } else if (typeof dayHour === 'string') {
          // Handle string format like "9:00 AM – 9:00 PM" or "Closed"
          if (dayHour.toLowerCase().includes('closed') || dayHour.toLowerCase().includes('cerrado')) {
            result[spanishDay] = { open: '', close: '', closed: true };
          } else {
            const match = dayHour.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*[–-]\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
            if (match) {
              result[spanishDay] = { open: match[1], close: match[2] };
            }
          }
        }
      });
    } else {
      // Handle object format
      console.log('🕐 Processing hours as object');
      Object.entries(hours).forEach(([day, schedule]: [string, any]) => {
        const spanishDay = (dayMapping as any)[day.toLowerCase()] || day.toLowerCase();
        console.log(`🕐 Processing day ${day} (${spanishDay}):`, JSON.stringify(schedule, null, 2));
        
        if (typeof schedule === 'string') {
          if (schedule.toLowerCase().includes('cerrado') || schedule.toLowerCase().includes('closed')) {
            result[spanishDay] = { open: '', close: '', closed: true };
          } else {
            const match = schedule.match(/(\d{1,2}:?\d{0,2})\s*-\s*(\d{1,2}:?\d{0,2})/);
            if (match) {
              result[spanishDay] = { open: match[1], close: match[2] };
            }
          }
        } else if (schedule && typeof schedule === 'object') {
          result[spanishDay] = {
            open: schedule.open || schedule.start || '',
            close: schedule.close || schedule.end || '',
            closed: schedule.closed || false
          };
        }
      });
    }

    console.log('🕐 parseGoogleHours result:', JSON.stringify(result, null, 2));
    return result;
  }

  private extractImages(images: any[]): string[] {
    if (!Array.isArray(images)) return [];
    
    return images
      .map(img => {
        if (typeof img === 'string') return img;
        return img.url || img.src || img.source || img.imageUrl || img.href || img.link || '';
      })
      .filter(url => url && typeof url === 'string' && url.startsWith('http'))
      .filter(url => {
        const lowercaseUrl = url.toLowerCase();
        // Filter out temporary/problematic URLs and non-business images
        return !lowercaseUrl.includes('profile-picture') && 
               !lowercaseUrl.includes('avatar') &&
               !lowercaseUrl.includes('default') &&
               !lowercaseUrl.includes('placeholder') &&
               !lowercaseUrl.includes('streetviewpixels-pa.googleapis.com') && // Remove Street View thumbnails
               !lowercaseUrl.includes('maps.googleapis.com/maps/api/streetview'); // Remove Street View APIs
      })
      .slice(0, 20); // Reasonable limit for gallery
  }

  /**
   * Save business images to gallery
   */
  public async saveBusinessImages(businessId: number, images: string[]): Promise<void> {
    if (!this.db) {
      console.log('📸 No database instance provided, skipping gallery save');
      return;
    }

    if (!images || images.length === 0) {
      console.log('📸 No images to save to gallery');
      return;
    }

    try {
      console.log(`📸 Saving ${images.length} images to gallery for business ${businessId}`);
      
      for (let i = 0; i < images.length; i++) {
        const imageUrl = images[i];
        
        // Skip invalid URLs
        if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
          console.log(`📸 Skipping invalid image URL: ${imageUrl}`);
          continue;
        }

        try {
          // Check if image already exists in gallery
          const existingImage = await this.db.select().from(schema.gallery)
            .where(and(
              eq(schema.gallery.businessId, businessId),
              eq(schema.gallery.imageUrl, imageUrl)
            ));

          if (existingImage.length > 0) {
            console.log(`📸 Image already exists in gallery: ${imageUrl.substring(0, 50)}...`);
            continue;
          }

          // Insert new gallery image
          await this.db.insert(schema.gallery).values({
            businessId: businessId,
            imageUrl: imageUrl,
            title: `Imagen ${i + 1}`,
            description: null,
            uploadedAt: new Date()
          });

          console.log(`📸 Saved image ${i + 1}/${images.length} to gallery: ${imageUrl.substring(0, 50)}...`);
        } catch (imageError) {
          console.error(`📸 Error saving image ${i + 1}:`, imageError);
        }
      }

      console.log(`📸 Successfully saved ${images.length} images to gallery for business ${businessId}`);
    } catch (error) {
      console.error(`📸 Error saving images to gallery for business ${businessId}:`, error);
    }
  }

  public getImageUrls(images: string[]): string[] {
    if (!images || images.length === 0) {
      console.log('📸 No images to extract URLs from');
      return [];
    }

    console.log(`📸 Extracting image URLs from ${images.length} images`);
    
    return images.filter(url => {
      // Skip invalid URLs
      if (!url || typeof url !== 'string' || !url.startsWith('http')) {
        console.log(`📸 Skipping invalid image URL: ${url}`);
        return false;
      }
      return true;
    });
  }

  private extractInstagramImages(posts: any[]): string[] {
    if (!Array.isArray(posts)) return [];
    
    return posts
      .map(post => post.displayUrl || post.imageUrl || post.url || '')
      .filter(url => url && url.startsWith('http'))
      .slice(0, 20);
  }

  private extractHashtags(posts: any[]): string[] {
    if (!Array.isArray(posts)) return [];
    
    const hashtags = new Set<string>();
    
    posts.forEach(post => {
      const caption = post.caption || post.text || '';
      const matches = caption.match(/#[\w\u00C0-\u017F]+/g);
      if (matches) {
        matches.forEach((tag: string) => hashtags.add(tag.toLowerCase()));
      }
    });

    return Array.from(hashtags).slice(0, 20);
  }

  private parseReviews(reviews: any[]): Array<{
    author: string;
    rating: number;
    comment?: string;
    date?: string;
  }> {
    if (!Array.isArray(reviews)) return [];
    
    return reviews
      .map(review => ({
        author: review.author || review.name || 'Usuario',
        rating: parseInt(review.rating) || parseInt(review.stars) || 5,
        comment: review.comment || review.text || review.review || '',
        date: review.date || review.publishedAt || ''
      }))
      .filter(review => review.author)
      .slice(0, 10);
  }

}

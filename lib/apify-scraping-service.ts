import { ApifyClient } from 'apify-client';
import { eq, and } from 'drizzle-orm';
import * as schema from '../shared/schema';

export interface ScrapingSources {
  businessName?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  googleMapsUrl?: string;
  websiteUrl?: string;
  kagiSearchQuery?: string; // Added Kagi search support
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
    source?: string;
  }>;
  images: string[];
  coordinates?: [number, number];
  priceLevel?: number;
}

export interface KagiSearchData {
  name?: string;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
  };
  images?: string[];
  additionalInfo?: string[];
}

export interface ComprehensiveBusinessData {
  // Basic Info
  name: string;
  description?: string;
  category?: string;
  
  // Contact Information
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  
  // Location Details
  streetAddress?: string;
  neighborhood?: string;
  city?: string;
  postalCode?: string;
  state?: string;
  country?: string;
  coordinates?: [number, number];
  
  // Business Hours
  hours?: Record<string, { open: string; close: string; closed?: boolean }>;
  
  // Media Assets
  profileImage?: string;
  coverImage?: string;
  galleryImages: string[];
  
  // Reviews and Ratings
  rating?: number;
  reviewCount?: number;
  reviews: Array<{
    author: string;
    rating: number;
    comment?: string;
    date?: string;
    source: string;
  }>;
  
  // Social Media
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
  };
  
  // Services and Features
  services?: string[];
  priceLevel?: number;
  priceRange?: string;
  
  // Source tracking
  sources: string[];
  qualityScore: number;
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

  /**
   * COMPREHENSIVE SCRAPING SYSTEM
   * Extracts ALL possible data from all sources and automatically saves to database
   */
  async scrapeAllBusinessData(sources: ScrapingSources, businessId?: number): Promise<ComprehensiveBusinessData> {
    console.log('🚀 Starting comprehensive business data scraping...');
    console.log('📋 Sources provided:', Object.keys(sources).filter(key => sources[key as keyof ScrapingSources]));
    
    const results: {
      google?: GooglePlacesData;
      facebook?: FacebookBusinessData;
      instagram?: InstagramBusinessData;
      kagi?: KagiSearchData;
    } = {};

    const promises: Promise<void>[] = [];

    // Google Maps scraping
    if (sources.googleMapsUrl) {
      console.log('🗺️ Scraping Google Maps data...');
      promises.push(
        this.scrapeGooglePlacesBusiness(sources.googleMapsUrl)
          .then(data => { results.google = data; })
          .catch(error => console.error('❌ Google Maps scraping failed:', error))
      );
    }

    // Facebook scraping
    if (sources.facebookUrl) {
      console.log('📘 Scraping Facebook data...');
      promises.push(
        this.scrapeFacebookBusiness(sources.facebookUrl)
          .then(data => { results.facebook = data; })
          .catch(error => console.error('❌ Facebook scraping failed:', error))
      );
    }

    // Instagram scraping
    if (sources.instagramUrl) {
      console.log('📸 Scraping Instagram data...');
      promises.push(
        this.scrapeInstagramBusiness(sources.instagramUrl)
          .then(data => { results.instagram = data; })
          .catch(error => console.error('❌ Instagram scraping failed:', error))
      );
    }

    // Kagi search scraping
    if (sources.kagiSearchQuery || sources.businessName) {
      const searchQuery = sources.kagiSearchQuery || sources.businessName || 'business';
      console.log('🔍 Scraping Kagi search data...');
      promises.push(
        this.scrapeKagiSearch(searchQuery)
          .then(data => { results.kagi = data; })
          .catch(error => console.error('❌ Kagi search scraping failed:', error))
      );
    }

    // Wait for all scraping to complete
    await Promise.allSettled(promises);

    // Merge all scraped data into comprehensive format
    const mergedData = this.mergeAllScrapedData(results, sources);

    // Automatically save to database if businessId provided
    if (businessId && this.db) {
      console.log('💾 Automatically saving scraped data to database...');
      await this.saveScrapedDataToDatabase(mergedData, businessId);
    }

    console.log('✅ Comprehensive scraping completed successfully');
    console.log('📊 Final data quality score:', mergedData.qualityScore);
    
    return mergedData;
  }

  async scrapeFacebookBusiness(facebookUrl: string): Promise<FacebookBusinessData> {
    try {
      console.log('🔍 Scraping Facebook business page:', facebookUrl);
      
      // Use the proven Facebook Pages Scraper with proper configuration
      const run = await this.client.actor("4Hv5RhChiaDk6iwad").call({
        startUrls: [{ url: facebookUrl }],
        maxPages: 1,
        language: "es",
        includeReviews: true,
        maxReviews: 10,
        includeContacts: true,
        includeImages: true,
        maxImages: 50,
        scrapePhotos: true,
        scrapeVideos: false,
        includePhotos: true,
        photosCount: 30
      }, {
        timeout: 300000 // 5 minutes timeout
      });
      
      const dataset = await this.client.dataset(run.defaultDatasetId).listItems();
      const rawData = dataset.items[0];
      
      console.log('📘 Facebook raw data received:', rawData ? Object.keys(rawData) : 'No data');
      console.log('📸 Facebook photos field inspection:');
      console.log('📸 rawData.photos:', typeof rawData?.photos, Array.isArray(rawData?.photos) ? rawData.photos.length : 'not array');
      console.log('📸 rawData.images:', typeof rawData?.images, Array.isArray(rawData?.images) ? rawData.images.length : 'not array');
      console.log('📸 Full raw data sample:', JSON.stringify(rawData, null, 2).substring(0, 1000));
      
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
      
      // Use the proven Instagram Scraper with proper configuration for business profiles
      const run = await this.client.actor("shu8hvrXbJbY3Eb9W").call({
        directUrls: [instagramUrl],
        resultsType: "posts",
        resultsLimit: 30,
        searchLimit: 1,
        addParentData: true,
        enhanceUserSearchWithFacebookPage: false,
        language: "es",
        scrapePostsImages: true,
        scrapeHighlights: true,
        scrapeReels: true
      }, {
        timeout: 300000 // 5 minutes timeout
      });
      
      const dataset = await this.client.dataset(run.defaultDatasetId).listItems();
      const rawData = dataset.items[0];
      
      console.log('📸 Instagram raw data received:', rawData ? Object.keys(rawData) : 'No data');
      console.log('📸 Instagram posts field inspection:');
      console.log('📸 rawData.posts:', typeof rawData?.posts, Array.isArray(rawData?.posts) ? rawData.posts.length : 'not array');
      console.log('📸 rawData.latestPosts:', typeof rawData?.latestPosts, Array.isArray(rawData?.latestPosts) ? rawData.latestPosts.length : 'not array');
      console.log('📸 Full raw data sample:', JSON.stringify(rawData, null, 2).substring(0, 1000));
      
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
      
      console.log('🚀 Starting PROVEN Google Places actor: compass/crawler-google-places');
      const run = await this.client.actor("compass/crawler-google-places").call(runInput, {
        timeout: 300000 // 5 minutes timeout for proper data extraction
      });
      
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
      hours: this.parseGoogleHours(rawData.openingHours || rawData.hours || rawData.regularOpeningHours), // Now extract hours from Google
      rating: parseFloat(rawData.totalScore) || parseFloat(rawData.rating) || parseFloat(rawData.averageRating) || undefined,
      reviewCount: parseInt(rawData.reviewsCount) || parseInt(rawData.reviewCount) || parseInt(rawData.userRatingCount) || 0,
      reviews: this.parseReviews(rawData.reviews || []), // Enhanced review parsing
      images: this.extractImages([
        ...(Array.isArray(rawData.imageUrls) ? rawData.imageUrls : []),
        ...(Array.isArray(rawData.images) ? rawData.images : []),
        ...(Array.isArray(rawData.photos) ? rawData.photos : []),
        rawData.photoUrl,
        rawData.imageUrl,
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

  /**
   * KAGI SEARCH INTEGRATION
   * Comprehensive web search for business information
   */
  async scrapeKagiSearch(query: string): Promise<KagiSearchData> {
    try {
      console.log('🔍 Starting Kagi search for:', query);
      
      // Enhanced search queries for comprehensive business data
      const searchQueries = [
        `${query} negocio Peru contacto telefono`,
        `${query} business contact information`,
        `${query} redes sociales facebook instagram`,
        `${query} direccion ubicacion maps`,
      ];

      const searchResults: any[] = [];
      
      for (const searchQuery of searchQueries) {
        try {
          console.log(`🔍 Searching: "${searchQuery}"`);
          
          // Use web search actors from Apify that can perform comprehensive searches
          const run = await this.client.actor("apify/web-scraper").call({
            startUrls: [`https://kagi.com/search?q=${encodeURIComponent(searchQuery)}`],
            linkSelector: 'a[href]',
            pageFunction: function(context: any) {
              const { page, request } = context;
              return {
                url: request.url,
                title: page.title,
                content: page.content,
                links: page.$$eval('a', (links: any) => links.map((link: any) => ({
                  text: link.textContent,
                  href: link.href
                })))
              };
            }
          });

          const dataset = await this.client.dataset(run.defaultDatasetId).listItems();
          searchResults.push(...dataset.items);
          
        } catch (searchError) {
          console.warn(`🔍 Search query failed: "${searchQuery}"`, searchError);
        }
      }

      // Extract business information from search results
      const extractedData = this.extractBusinessDataFromKagiResults(searchResults, query);
      
      console.log('✅ Kagi search completed successfully');
      return extractedData;
      
    } catch (error) {
      console.error('❌ Error in Kagi search:', error);
      throw new Error(`Failed to perform Kagi search: ${(error as Error).message}`);
    }
  }

  private extractBusinessDataFromKagiResults(results: any[], originalQuery: string): KagiSearchData {
    console.log('🔍 Extracting business data from Kagi search results...');
    
    const extracted: KagiSearchData = {
      name: originalQuery,
      socialMedia: {},
      images: [],
      additionalInfo: []
    };

    results.forEach(result => {
      if (!result.content) return;
      
      const content = result.content.toLowerCase();
      const title = result.title || '';
      
      // Extract phone numbers
      const phoneRegex = /(\+?51\s?)?(\d{3}\s?\d{3}\s?\d{3}|\d{9})/g;
      const phones = content.match(phoneRegex);
      if (phones && !extracted.phone) {
        extracted.phone = phones[0];
      }
      
      // Extract emails
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emails = content.match(emailRegex);
      if (emails && !extracted.email) {
        extracted.email = emails[0];
      }
      
      // Extract social media links
      if (content.includes('facebook.com/') && !extracted.socialMedia?.facebook) {
        const fbMatch = content.match(/facebook\.com\/([a-zA-Z0-9.]+)/);
        if (fbMatch) extracted.socialMedia!.facebook = `https://facebook.com/${fbMatch[1]}`;
      }
      
      if (content.includes('instagram.com/') && !extracted.socialMedia?.instagram) {
        const igMatch = content.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
        if (igMatch) extracted.socialMedia!.instagram = `https://instagram.com/${igMatch[1]}`;
      }
      
      if (content.includes('youtube.com/') && !extracted.socialMedia?.youtube) {
        const ytMatch = content.match(/youtube\.com\/([a-zA-Z0-9_.-]+)/);
        if (ytMatch) extracted.socialMedia!.youtube = `https://youtube.com/${ytMatch[1]}`;
      }
      
      if (content.includes('tiktok.com/') && !extracted.socialMedia?.tiktok) {
        const ttMatch = content.match(/tiktok\.com\/([a-zA-Z0-9_.]+)/);
        if (ttMatch) extracted.socialMedia!.tiktok = `https://tiktok.com/${ttMatch[1]}`;
      }
      
      // Extract addresses (Peru-specific patterns)
      const addressRegex = /(av\.|avenida|calle|jr\.|jiron|psje\.|pasaje)\s+[a-z\sñáéíóú]+\s+\d+/gi;
      const addresses = content.match(addressRegex);
      if (addresses && !extracted.address) {
        extracted.address = addresses[0];
      }
      
      // Extract business descriptions from titles and content
      if (title.toLowerCase().includes(originalQuery.toLowerCase()) && !extracted.description) {
        extracted.description = title.substring(0, 200);
      }
      
      // Store additional useful information
      if (result.title && result.title.length > 10) {
        extracted.additionalInfo?.push(result.title);
      }
    });

    console.log('🔍 Kagi extraction completed:', Object.keys(extracted).length, 'fields found');
    return extracted;
  }

  /**
   * COMPREHENSIVE DATA MERGER
   * Intelligently merges data from all sources with priority system
   */
  private mergeAllScrapedData(results: any, sources: ScrapingSources): ComprehensiveBusinessData {
    console.log('🔄 Merging comprehensive business data from all sources...');
    
    const merged: ComprehensiveBusinessData = {
      name: sources.businessName || 'Mi Negocio',
      description: '',
      galleryImages: [],
      reviews: [],
      socialMedia: {},
      sources: [],
      qualityScore: 0
    };

    // Track sources that provided data
    const availableSources = Object.keys(results).filter(key => results[key]);
    merged.sources = availableSources.map(key => {
      switch(key) {
        case 'google': return 'Google Maps';
        case 'facebook': return 'Facebook';
        case 'instagram': return 'Instagram';
        case 'kagi': return 'Kagi Search';
        default: return key;
      }
    });

    // Priority-based merging for each field
    const priorityOrder = ['google', 'facebook', 'kagi', 'instagram'];
    
    // Merge basic information
    merged.name = this.getFirstValidValue('name', results, priorityOrder) || merged.name;
    merged.description = this.getFirstValidValue('description', results, priorityOrder) || 
                        this.getFirstValidValue('biography', results, priorityOrder) || '';
    merged.category = this.getFirstValidValue('category', results, priorityOrder) || '';
    
    // Merge contact information
    merged.phone = this.getFirstValidValue('phone', results, priorityOrder) || '';
    merged.email = this.getFirstValidValue('email', results, priorityOrder) || '';
    merged.website = this.getFirstValidValue('website', results, priorityOrder) || '';
    merged.address = this.getFirstValidValue('address', results, priorityOrder) || '';
    
    // Merge location details
    merged.streetAddress = this.getFirstValidValue('streetAddress', results, priorityOrder) || '';
    merged.neighborhood = this.getFirstValidValue('neighborhood', results, priorityOrder) || '';
    merged.city = this.getFirstValidValue('city', results, priorityOrder) || 'Lima';
    merged.postalCode = this.getFirstValidValue('postalCode', results, priorityOrder) || '';
    merged.state = this.getFirstValidValue('state', results, priorityOrder) || '';
    merged.country = 'Perú';
    merged.coordinates = this.getFirstValidValue('coordinates', results, priorityOrder);
    
    // Merge business hours
    merged.hours = this.getFirstValidValue('hours', results, priorityOrder) || {};
    
    // Merge images (combine from all sources)
    const allImages: string[] = [];
    availableSources.forEach(source => {
      const sourceData = results[source];
      if (sourceData.images) allImages.push(...sourceData.images);
      if (sourceData.galleryImages) allImages.push(...sourceData.galleryImages);
    });
    merged.galleryImages = Array.from(new Set(allImages)).slice(0, 30); // Remove duplicates, limit to 30
    
    // Select best profile and cover images
    merged.profileImage = this.getFirstValidValue('profileImage', results, priorityOrder) || 
                         merged.galleryImages[0] || '';
    merged.coverImage = this.getFirstValidValue('coverImage', results, priorityOrder) || 
                       merged.galleryImages[1] || merged.galleryImages[0] || '';
    
    // Merge reviews (combine from all sources)
    availableSources.forEach(source => {
      const sourceData = results[source];
      if (sourceData.reviews && Array.isArray(sourceData.reviews)) {
        merged.reviews.push(...sourceData.reviews);
      }
    });
    
    // Merge ratings
    merged.rating = this.getFirstValidValue('rating', results, priorityOrder);
    merged.reviewCount = this.getFirstValidValue('reviewCount', results, priorityOrder) || merged.reviews.length;
    
    // Merge social media (combine all available)
    availableSources.forEach(source => {
      const sourceData = results[source];
      if (sourceData.socialMedia) {
        Object.assign(merged.socialMedia, sourceData.socialMedia);
      }
    });
    
    // Add source URLs to social media if they were scraped directly
    if (sources.facebookUrl) merged.socialMedia.facebook = sources.facebookUrl;
    if (sources.instagramUrl) merged.socialMedia.instagram = sources.instagramUrl;
    
    // Merge services and pricing
    merged.services = this.getFirstValidValue('services', results, priorityOrder) || [];
    merged.priceLevel = this.getFirstValidValue('priceLevel', results, priorityOrder);
    merged.priceRange = this.getFirstValidValue('priceRange', results, priorityOrder) || '';
    
    // Calculate quality score
    merged.qualityScore = this.calculateComprehensiveQualityScore(merged);
    
    console.log(`✅ Comprehensive data merged from ${merged.sources.length} sources`);
    console.log(`📊 Quality score: ${merged.qualityScore}%`);
    console.log(`📸 Gallery images: ${merged.galleryImages.length}`);
    console.log(`⭐ Reviews: ${merged.reviews.length}`);
    
    return merged;
  }

  private getFirstValidValue(field: string, results: any, priorityOrder: string[]): any {
    for (const source of priorityOrder) {
      if (results[source] && results[source][field] && this.isValidValue(results[source][field])) {
        return results[source][field];
      }
    }
    return null;
  }

  private isValidValue(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }

  private calculateComprehensiveQualityScore(data: ComprehensiveBusinessData): number {
    let score = 0;
    const maxScore = 100;
    
    // Basic information (30 points)
    if (data.name && data.name !== 'Mi Negocio') score += 10;
    if (data.description && data.description.length > 20) score += 10;
    if (data.category) score += 10;
    
    // Contact information (25 points) 
    if (data.phone) score += 10;
    if (data.email) score += 8;
    if (data.website) score += 7;
    
    // Location (15 points)
    if (data.address) score += 10;
    if (data.coordinates) score += 5;
    
    // Media (20 points)
    if (data.profileImage) score += 5;
    if (data.coverImage) score += 5;
    if (data.galleryImages.length > 0) score += Math.min(10, data.galleryImages.length);
    
    // Social presence (10 points)
    const socialCount = Object.keys(data.socialMedia).filter(key => data.socialMedia[key as keyof typeof data.socialMedia]).length;
    score += Math.min(10, socialCount * 2.5);
    
    return Math.min(maxScore, Math.round(score));
  }

  /**
   * AUTOMATIC DATABASE SAVING
   * Saves all scraped data to respective database tables
   */
  async saveScrapedDataToDatabase(data: ComprehensiveBusinessData, businessId: number): Promise<void> {
    if (!this.db) {
      console.log('💾 No database instance provided, skipping save');
      return;
    }

    console.log('💾 Saving comprehensive scraped data to database...');
    
    try {
      // Update business basic information
      await this.updateBusinessBasicInfo(data, businessId);
      
      // Update business settings (micrositio configuration)
      await this.updateBusinessSettings(data, businessId);
      
      // Save gallery images
      if (data.galleryImages.length > 0) {
        await this.saveGalleryImages(data.galleryImages, businessId);
      }
      
      // Save reviews
      if (data.reviews.length > 0) {
        await this.saveReviews(data.reviews, businessId);
      }
      
      console.log('✅ All scraped data saved to database successfully');
      
    } catch (error) {
      console.error('❌ Error saving scraped data to database:', error);
      throw new Error(`Failed to save scraped data: ${(error as Error).message}`);
    }
  }

  private async updateBusinessBasicInfo(data: ComprehensiveBusinessData, businessId: number): Promise<void> {
    console.log('💾 Updating business basic information...');
    
    try {
      const updateData: any = {};
      
      if (data.name && data.name !== 'Mi Negocio') updateData.name = data.name;
      if (data.description) updateData.description = data.description;
      if (data.category) updateData.category = data.category;
      if (data.phone) updateData.phone = data.phone;
      if (data.email) updateData.email = data.email;
      if (data.website) updateData.website = data.website;
      if (data.address) updateData.address = data.address;
      if (data.rating) updateData.rating = data.rating.toString();
      if (data.reviewCount) updateData.reviewCount = data.reviewCount;
      if (data.coordinates) {
        updateData.latitude = data.coordinates[0].toString();
        updateData.longitude = data.coordinates[1].toString();
      }
      
      if (Object.keys(updateData).length > 0) {
        await this.db.update(schema.businesses)
          .set(updateData)
          .where(eq(schema.businesses.id, businessId));
        
        console.log('✅ Business basic info updated');
      }
      
    } catch (error) {
      console.error('❌ Error updating business basic info:', error);
    }
  }

  private async updateBusinessSettings(data: ComprehensiveBusinessData, businessId: number): Promise<void> {
    console.log('💾 Updating business settings (micrositio)...');
    
    try {
      const settingsData: any = {};
      
      if (data.description) settingsData.publicDescription = data.description;
      if (data.phone) settingsData.publicPhone = data.phone;
      if (data.email) settingsData.publicEmail = data.email;
      if (data.address) settingsData.streetAddress = data.address;
      if (data.profileImage) settingsData.profileImage = data.profileImage;
      if (data.coverImage) settingsData.coverImage = data.coverImage;
      
      // Social media links
      if (data.socialMedia.facebook) settingsData.facebookUrl = data.socialMedia.facebook;
      if (data.socialMedia.instagram) settingsData.instagramUrl = data.socialMedia.instagram;
      if (data.socialMedia.youtube) settingsData.youtubeUrl = data.socialMedia.youtube;
      if (data.socialMedia.tiktok) settingsData.tiktokUrl = data.socialMedia.tiktok;
      
      // Working hours
      if (data.hours && Object.keys(data.hours).length > 0) {
        settingsData.workingHours = data.hours;
      }
      
      if (Object.keys(settingsData).length > 0) {
        // Check if settings exist, update or create
        const existingSettings = await this.db.select().from(schema.businessSettings)
          .where(eq(schema.businessSettings.businessId, businessId));
        
        if (existingSettings.length > 0) {
          await this.db.update(schema.businessSettings)
            .set(settingsData)
            .where(eq(schema.businessSettings.businessId, businessId));
        } else {
          await this.db.insert(schema.businessSettings)
            .values({
              businessId: businessId,
              ...settingsData
            });
        }
        
        console.log('✅ Business settings updated');
      }
      
    } catch (error) {
      console.error('❌ Error updating business settings:', error);
    }
  }

  private async saveGalleryImages(images: string[], businessId: number): Promise<void> {
    console.log(`💾 Saving ${images.length} gallery images...`);
    
    try {
      for (let i = 0; i < images.length; i++) {
        const imageUrl = images[i];
        
        if (!imageUrl || !imageUrl.startsWith('http')) continue;
        
        // Check if image already exists
        const existing = await this.db.select().from(schema.gallery)
          .where(and(
            eq(schema.gallery.businessId, businessId),
            eq(schema.gallery.imageUrl, imageUrl)
          ));
        
        if (existing.length === 0) {
          await this.db.insert(schema.gallery).values({
            businessId: businessId,
            imageUrl: imageUrl,
            caption: `Imagen ${i + 1} - Extraída automáticamente`,
            isMain: i === 0 // First image as main
          });
        }
      }
      
      console.log('✅ Gallery images saved');
      
    } catch (error) {
      console.error('❌ Error saving gallery images:', error);
    }
  }

  private async saveReviews(reviews: any[], businessId: number): Promise<void> {
    console.log(`💾 Saving ${reviews.length} reviews...`);
    
    try {
      for (const review of reviews) {
        if (!review.author || !review.rating) continue;
        
        // Check if review already exists (by author and content)
        const existing = await this.db.select().from(schema.reviews)
          .where(and(
            eq(schema.reviews.businessId, businessId),
            eq(schema.reviews.clientName, review.author),
            eq(schema.reviews.comment, review.comment || '')
          ));
        
        if (existing.length === 0) {
          await this.db.insert(schema.reviews).values({
            businessId: businessId,
            clientName: review.author,
            rating: review.rating,
            comment: review.comment || '',
            source: review.source || 'Extraído automáticamente'
          });
        }
      }
      
      console.log('✅ Reviews saved');
      
    } catch (error) {
      console.error('❌ Error saving reviews:', error);
    }
  }

  private extractInstagramImages(posts: any[]): string[] {
    console.log('📸 EXTRACTING INSTAGRAM IMAGES - Input type:', typeof posts, 'Length:', Array.isArray(posts) ? posts.length : 'Not array');
    console.log('📸 Posts data sample:', JSON.stringify(posts?.slice(0, 2), null, 2));
    
    if (!Array.isArray(posts)) {
      console.log('📸 No posts array found, returning empty');
      return [];
    }
    
    const extractedImages = posts
      .map((post, index) => {
        console.log(`📸 Processing post ${index}:`, typeof post, Object.keys(post || {}));
        const imageUrl = post?.displayUrl || post?.imageUrl || post?.url || post?.src || post?.media?.displayUrl || post?.thumbnail || post;
        console.log(`📸 Extracted URL ${index}:`, imageUrl);
        return imageUrl;
      })
      .filter(url => {
        const isValid = url && typeof url === 'string' && url.startsWith('http');
        console.log('📸 URL validation:', url?.substring(0, 50), '-> Valid:', isValid);
        return isValid;
      })
      .slice(0, 20);
    
    console.log('📸 INSTAGRAM IMAGES FINAL COUNT:', extractedImages.length);
    return extractedImages;
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
    source?: string;
  }> {
    if (!Array.isArray(reviews)) return [];
    
    return reviews
      .map(review => ({
        author: review.author || review.name || 'Usuario',
        rating: parseInt(review.rating) || parseInt(review.stars) || 5,
        comment: review.comment || review.text || review.review || '',
        date: review.date || review.publishedAt || review.time || '',
        source: 'Google Maps' // Add source tracking
      }))
      .filter(review => review.author)
      .slice(0, 20); // Increased from 10 to 20 reviews
  }

  /**
   * REAL DATA TRANSFORMATION METHODS FOR ACTUAL APIFY ACTORS
   */
  
  private transformFacebookData(rawData: any): FacebookBusinessData {
    console.log('🔄 Transforming Facebook data from REAL actor response...');
    console.log('📘 Facebook raw data keys:', rawData ? Object.keys(rawData) : 'No data');
    
    if (!rawData) {
      throw new Error('No Facebook data to transform');
    }

    // ACTUAL Facebook Pages Scraper response fields from logs:
    // 'facebookUrl', 'categories', 'info', 'likes', 'messenger', 'title', 'address', 
    // 'pageId', 'pageName', 'pageUrl', 'intro', 'websites', 'website', 'rating', 
    // 'followers', 'profilePictureUrl', 'coverPhotoUrl', 'profilePhoto', 'ratingOverall', 
    // 'ratingCount', 'creation_date', 'ad_status', 'facebookId', 'pageAdLibrary'
    
    const transformed: FacebookBusinessData = {
      name: rawData.title || rawData.pageName || rawData.name || 'Facebook Business',
      description: rawData.intro || rawData.info || rawData.about || '',
      category: rawData.categories?.[0] || rawData.category || '',
      phone: rawData.phone || rawData.phoneNumber || '',
      email: rawData.email || '',
      website: rawData.website || rawData.websites?.[0] || '',
      address: rawData.address || '',
      hours: this.parseFacebookHours(rawData.hours || rawData.openingHours || {}),
      profileImage: rawData.profilePictureUrl || rawData.profilePhoto || '',
      coverImage: rawData.coverPhotoUrl || rawData.coverPhoto || '',
      galleryImages: this.extractFacebookImages(rawData.photos || rawData.images || rawData.galleryImages || rawData.pagePhotos || []),
      rating: parseFloat(rawData.ratingOverall) || parseFloat(rawData.rating) || 0,
      reviewCount: parseInt(rawData.ratingCount) || parseInt(rawData.reviewCount) || 0,
      services: this.extractFacebookServices(rawData.services || []),
      priceRange: rawData.priceRange || ''
    };

    console.log('✅ Facebook data transformed:', Object.keys(transformed).length, 'fields populated');
    console.log('📝 Name:', transformed.name);
    console.log('📝 Description:', transformed.description?.substring(0, 100) + '...');
    console.log('📸 Profile Image:', transformed.profileImage ? 'Found' : 'Missing');
    console.log('📸 Cover Image:', transformed.coverImage ? 'Found' : 'Missing');
    console.log('📸 Gallery Images count:', transformed.galleryImages.length);
    console.log('📸 Gallery Images URLs:', transformed.galleryImages.slice(0, 3));
    
    return transformed;
  }

  private transformInstagramData(rawData: any): InstagramBusinessData {
    console.log('🔄 Transforming Instagram data from REAL actor response...');
    console.log('📸 Instagram raw data keys:', rawData ? Object.keys(rawData) : 'No data');
    
    if (!rawData) {
      throw new Error('No Instagram data to transform');
    }

    // ACTUAL Instagram Scraper response fields from documentation:
    // 'username', 'fullName', 'bio', 'profilePicUrl', 'followersCount', 
    // 'followingCount', 'postsCount', 'isVerified', 'isPrivate', 'url', 'posts'
    
    const transformed: InstagramBusinessData = {
      username: rawData.username || '',
      fullName: rawData.fullName || rawData.displayName || '',
      biography: rawData.bio || rawData.biography || '',
      website: rawData.externalUrl || rawData.website || '',
      profileImage: rawData.profilePicUrl || rawData.avatar || '',
      postsCount: parseInt(rawData.postsCount) || 0,
      followersCount: parseInt(rawData.followersCount) || 0,
      galleryImages: this.extractInstagramImages(rawData.posts || rawData.latestPosts || rawData.media || []),
      hashtags: this.extractHashtags(rawData.posts || rawData.latestPosts || []),
      location: rawData.location || ''
    };

    console.log('✅ Instagram data transformed:', Object.keys(transformed).length, 'fields populated');
    console.log('📝 Username:', transformed.username);
    console.log('📝 Full Name:', transformed.fullName);
    console.log('📝 Bio:', transformed.biography?.substring(0, 100) + '...');
    console.log('📸 Gallery Images count:', transformed.galleryImages.length);
    console.log('📸 Gallery Images URLs:', transformed.galleryImages.slice(0, 3));
    
    return transformed;
  }

  private transformGoogleData(rawData: any): GooglePlacesData {
    console.log('🔄 Transforming Google Maps data from REAL actor response...');
    console.log('🗺️ Google raw data keys:', rawData ? Object.keys(rawData) : 'No data');
    
    if (!rawData) {
      throw new Error('No Google Maps data to transform');
    }

    // ACTUAL Google Maps Scraper response fields from documentation:
    // 'title', 'description', 'address', 'coordinates', 'phone', 'website', 'email',
    // 'categories', 'rating', 'totalScore', 'reviews', 'images', 'openingHours',
    // 'popularTimes', 'priceLevel', 'menu', 'placeId', 'url'
    
    const transformed: GooglePlacesData = {
      name: rawData.title || rawData.name || 'Business',
      description: rawData.description || rawData.about || '',
      category: rawData.categories?.[0] || rawData.category || '',
      address: rawData.address || '',
      streetAddress: rawData.streetAddress || '',
      neighborhood: rawData.neighborhood || '',
      city: rawData.city || 'Lima',
      postalCode: rawData.postalCode || '',
      state: rawData.state || '',
      countryCode: rawData.countryCode || 'PE',
      phone: rawData.phone || '',
      website: rawData.website || '',
      hours: this.parseGoogleHours(rawData.openingHours || []),
      rating: parseFloat(rawData.rating) || parseFloat(rawData.totalScore) || 0,
      reviewCount: parseInt(rawData.totalScore) || parseInt(rawData.reviewsCount) || 0,
      reviews: this.parseReviews(rawData.reviews || []),
      images: this.extractGoogleImages(rawData),
      coordinates: this.extractCoordinates(rawData.coordinates),
      priceLevel: parseInt(rawData.priceLevel) || 0
    };

    console.log('✅ Google Maps data transformed:', Object.keys(transformed).length, 'fields populated');
    console.log('📝 Name:', transformed.name);
    console.log('📝 Address:', transformed.address);
    console.log('📞 Phone:', transformed.phone || 'Missing');
    console.log('🌐 Website:', transformed.website || 'Missing');
    console.log('⭐ Rating:', transformed.rating);
    console.log('📸 Images:', transformed.images.length);
    console.log('💬 Reviews:', transformed.reviews.length);
    
    return transformed;
  }

  private parseFacebookHours(hours: any): Record<string, { open: string; close: string; closed?: boolean }> {
    if (!hours || typeof hours !== 'object') return {};
    
    const parsedHours: Record<string, { open: string; close: string; closed?: boolean }> = {};
    
    Object.keys(hours).forEach(day => {
      const dayHours = hours[day];
      if (typeof dayHours === 'string') {
        const match = dayHours.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
        if (match) {
          parsedHours[day.toLowerCase()] = {
            open: `${match[1].padStart(2, '0')}:${match[2]}`,
            close: `${match[3].padStart(2, '0')}:${match[4]}`
          };
        } else if (dayHours.toLowerCase().includes('closed')) {
          parsedHours[day.toLowerCase()] = { open: '', close: '', closed: true };
        }
      }
    });
    
    return parsedHours;
  }

  private extractFacebookImages(photos: any[]): string[] {
    console.log('📸 EXTRACTING FACEBOOK IMAGES - Input type:', typeof photos, 'Length:', Array.isArray(photos) ? photos.length : 'Not array');
    console.log('📸 Photos data sample:', JSON.stringify(photos?.slice(0, 3), null, 2));
    
    if (!Array.isArray(photos)) {
      console.log('📸 No photos array found, returning empty');
      return [];
    }
    
    const extractedImages = photos
      .map((photo, index) => {
        console.log(`📸 Processing photo ${index}:`, typeof photo, Object.keys(photo || {}));
        const imageUrl = photo?.url || photo?.source || photo?.src || photo?.link || photo?.imageUrl || photo?.fullResolutionSrc || photo;
        console.log(`📸 Extracted URL ${index}:`, imageUrl);
        return imageUrl;
      })
      .filter(url => {
        const isValid = url && typeof url === 'string' && url.startsWith('http');
        console.log('📸 URL validation:', url?.substring(0, 50), '-> Valid:', isValid);
        return isValid;
      })
      .slice(0, 20);
    
    console.log('📸 FACEBOOK IMAGES FINAL COUNT:', extractedImages.length);
    return extractedImages;
  }

  private extractFacebookServices(services: any[]): string[] {
    if (!Array.isArray(services)) return [];
    
    return services
      .map(service => service.name || service.title || service)
      .filter(name => name && typeof name === 'string')
      .slice(0, 10);
  }

  private extractGoogleImages(rawData: any): string[] {
    console.log('📸 Raw image data investigation:');
    console.log('📸 rawData.imageUrls length:', rawData.imageUrls?.length || 0);
    console.log('📸 rawData.images length:', rawData.images?.length || 0);
    console.log('📸 rawData.photos length:', rawData.photos?.length || 0);
    console.log('📸 rawData.photoUrl:', rawData.photoUrl ? 'present' : 'missing');
    console.log('📸 All image keys in rawData:', Object.keys(rawData).filter(key => key.toLowerCase().includes('image') || key.toLowerCase().includes('photo')));
    
    const images: string[] = [];
    
    if (Array.isArray(rawData.imageUrls)) {
      images.push(...rawData.imageUrls);
    }
    
    if (Array.isArray(rawData.images)) {
      images.push(...rawData.images.map((img: any) => img.url || img.src || img));
    }
    
    if (Array.isArray(rawData.photos)) {
      images.push(...rawData.photos.map((photo: any) => photo.url || photo.src || photo));
    }
    
    if (rawData.photoUrl) {
      images.push(rawData.photoUrl);
    }
    
    if (rawData.imageUrl) {
      images.push(rawData.imageUrl);
    }
    
    const validImages = images
      .filter(img => img && typeof img === 'string' && img.startsWith('http'))
      .filter(img => !img.includes('streetviewpixels-pa.googleapis.com'))
      .slice(0, 30);
    
    console.log(`📸 Transformed images count: ${validImages.length}`);
    return validImages;
  }

  private extractCoordinates(location: any): [number, number] | undefined {
    if (!location) return undefined;
    
    const lat = parseFloat(location.lat || location.latitude);
    const lng = parseFloat(location.lng || location.longitude);
    
    if (isNaN(lat) || isNaN(lng)) return undefined;
    
    return [lat, lng];
  }

}

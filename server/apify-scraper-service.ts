import { ApifyClient } from 'apify-client';
import { storage } from './storage';
import type { InsertApifyBusiness } from '../shared/schema';

interface ApifyPlace {
  title: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewsCount?: number;
  priceLevel?: number;
  categoryName?: string;
  latitude?: number;
  longitude?: number;
  imageUrls?: string[];
  openingHours?: string[];
  placeId?: string;
  url?: string;
}

export class ApifyScraper {
  private client: ApifyClient;
  private readonly LIMA_CATEGORIES = [
    'barbería', 'peluquería', 'salón de belleza', 'spa', 'manicure', 'pedicure',
    'gimnasio', 'fitness', 'yoga', 'pilates', 'crossfit',
    'restaurante', 'cafetería', 'panadería', 'comida rápida', 'bar',
    'dentista', 'médico', 'clínica', 'farmacia', 'veterinaria',
    'taller mecánico', 'lavado de autos', 'gasolinera', 'repuestos',
    'consultorio', 'abogado', 'contador', 'inmobiliaria', 'seguros'
  ];

  constructor() {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
      throw new Error('APIFY_API_TOKEN environment variable is required');
    }
    
    this.client = new ApifyClient({ token });
    console.log('🕷️ Apify scraper initialized');
  }

  // Map category names to our system categories
  private mapToOurCategory(categoryName: string): string {
    const category = categoryName?.toLowerCase() || '';
    
    if (category.includes('barbería') || category.includes('peluquería') || 
        category.includes('salón') || category.includes('spa') || 
        category.includes('belleza') || category.includes('manicure')) {
      return 'belleza';
    }
    if (category.includes('gimnasio') || category.includes('fitness') || 
        category.includes('yoga') || category.includes('pilates')) {
      return 'fitness';
    }
    if (category.includes('restaurante') || category.includes('comida') || 
        category.includes('bar') || category.includes('cafetería')) {
      return 'gastronomia';
    }
    if (category.includes('médico') || category.includes('dentista') || 
        category.includes('clínica') || category.includes('farmacia')) {
      return 'salud';
    }
    if (category.includes('taller') || category.includes('mecánico') || 
        category.includes('auto') || category.includes('gasolinera')) {
      return 'automotriz';
    }
    
    return 'servicios';
  }

  // Convert Apify place to our business format
  private convertToCache(place: ApifyPlace): InsertApifyBusiness {
    return {
      placeId: place.placeId || `apify_${Date.now()}_${Math.random()}`,
      name: place.title,
      address: place.address || 'Lima, Peru',
      category: this.mapToOurCategory(place.categoryName || ''),
      rating: place.rating || 0,
      reviewCount: place.reviewsCount || 0,
      priceLevel: place.priceLevel || 0,
      phone: place.phone || null,
      website: place.website || null,
      email: place.email || place.companyEmail || null,  // Company email from contacts enrichment
      photoUrl: place.imageUrls?.[0] || null,
      latitude: place.latitude || -12.05,
      longitude: place.longitude || -77.05,
      openNow: null,
      hours: place.openingHours || null,
      searchTerms: `${place.title} ${place.address} ${place.categoryName || ''}`.toLowerCase(),
      lastUpdated: new Date(),
      source: 'apify'
    };
  }

  // Scrape businesses for a specific category and location
  async scrapeCategoryBusinesses(
    category: string, 
    location: string = 'Lima, Peru',
    maxPlaces: number = 100
  ): Promise<InsertApifyBusiness[]> {
    console.log(`🔍 Scraping ${category} businesses in ${location} (max: ${maxPlaces})`);

    const input = {
      searchStringsArray: [category],
      locationQuery: location,
      maxCrawledPlacesPerSearch: maxPlaces,
      language: 'es',
      searchMatching: 'all',
      placeMinimumStars: '',
      website: 'allPlaces',
      skipClosedPlaces: false,
      
      // Enhanced scraping options from the screenshot
      scrapeDetailPage: true,  // "Scrape place detail page" - enabled
      includeWebResults: true,  // "Include Web results" - enabled  
      scrapeInsidePlaces: true,  // "Scrape inside places (e.g. malls or shopping center)" - enabled
      
      // Company contacts enrichment add-on - this adds email, phone, and social media
      // This costs $0.002 per result but provides valuable contact information
      companyContactsEnrichment: true,  // "Add-on: Company contacts enrichment" - enabled
      
      // Questions extraction (optional)
      questionsPerPlace: 0,  // As shown in screenshot, set to 0 questions per place
      
      // Additional options to maximize data quality
      scrapeReservationProviders: false,  // "Scrape table reservation provider data" - disabled as shown
      maxCrawledPlaces: maxPlaces,  // Ensure we don't exceed our limits
      
      // Optimize for contact information scraping
      scrapeContactInfo: true,
      includeBusinessHours: true,
      includePhotos: true,
      includeReviews: true,
      
      // Legacy options for compatibility
      scrapePlaceDetailPage: true, // Get detailed information
      scrapeTableReservationProvider: false,
      scrapeDirectories: false,
      maxQuestions: 0,
      scrapeContacts: true, // Get contact information
      maximumLeadsEnrichmentRecords: 0,
      maxReviews: 5, // Get some reviews for quality
      reviewsSort: 'newest',
      reviewsFilterString: '',
      reviewsOrigin: 'all',
      scrapeReviewsPersonalData: false,
      scrapeImageAuthors: false,
      allPlacesNoSearchAction: ''
    };

    try {
      // Run the Actor
      const run = await this.client.actor('nwua9Gu5YrADL7ZDj').call(input);
      console.log(`📊 Apify run completed: ${run.id}`);

      // Fetch results
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
      console.log(`📍 Found ${items.length} places for ${category}`);

      // Convert to our format
      const businesses = items.map((item: ApifyPlace) => this.convertToCache(item));
      
      return businesses;
    } catch (error) {
      console.error(`❌ Error scraping ${category}:`, error);
      return [];
    }
  }

  // Comprehensive Lima business scraping
  async scrapeLimaBusinesses(): Promise<{
    totalScraped: number;
    categoriesScraped: string[];
    errors: string[];
  }> {
    console.log('🚀 Starting comprehensive Lima business scraping...');
    
    let totalScraped = 0;
    const categoriesScraped: string[] = [];
    const errors: string[] = [];

    // Process categories in batches to avoid rate limits
    const batchSize = 3;
    for (let i = 0; i < this.LIMA_CATEGORIES.length; i += batchSize) {
      const batch = this.LIMA_CATEGORIES.slice(i, i + batchSize);
      
      console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}: ${batch.join(', ')}`);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (category) => {
        try {
          const businesses = await this.scrapeCategoryBusinesses(category, 'Lima, Peru', 50);
          
          if (businesses.length > 0) {
            // Save to database
            const saved = await storage.cacheBusinesses(businesses);
            console.log(`✅ Saved ${saved.length} businesses for ${category}`);
            
            totalScraped += saved.length;
            categoriesScraped.push(category);
            return saved.length;
          }
          return 0;
        } catch (error) {
          const errorMsg = `Failed to scrape ${category}: ${error.message}`;
          console.error('❌', errorMsg);
          errors.push(errorMsg);
          return 0;
        }
      });

      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      // Rate limiting: wait between batches
      if (i + batchSize < this.LIMA_CATEGORIES.length) {
        console.log('⏳ Waiting 30 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    console.log(`🎉 Scraping completed: ${totalScraped} businesses across ${categoriesScraped.length} categories`);
    
    return {
      totalScraped,
      categoriesScraped,
      errors
    };
  }

  // Test scraping with a small sample
  async testScraping(): Promise<{ success: boolean; sampleData: any; error?: string }> {
    try {
      console.log('🧪 Testing Apify scraping with small sample...');
      
      const businesses = await this.scrapeCategoryBusinesses('barbería', 'Lima, Peru', 5);
      
      if (businesses.length > 0) {
        // Save test data
        const saved = await storage.cacheBusinesses(businesses);
        
        return {
          success: true,
          sampleData: {
            scraped: businesses.length,
            saved: saved.length,
            sample: businesses[0]
          }
        };
      } else {
        return {
          success: false,
          sampleData: null,
          error: 'No businesses found in test scraping'
        };
      }
    } catch (error) {
      return {
        success: false,
        sampleData: null,
        error: error.message
      };
    }
  }
}

export const apifyScraper = new ApifyScraper();
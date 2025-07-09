import { ApifyClient } from 'apify-client';
import { storage } from './storage.js';
import { InsertApifyBusiness } from '../shared/schema.js';
import { 
  PhoneNumberProcessor, 
  CategoryMapper, 
  CoordinateValidator, 
  DataFreshnessCalculator, 
  DataValidator, 
  SocialMediaDetector 
} from './data-enhancement-utils.js';

interface WaveConfig {
  id: string;
  name: string;
  districts: string[];
  cities: string[];
  categories: string[];
  priority: number;
  maxBusinesses: number;
  estimatedCredits: number;
}

interface ScrapeProgress {
  waveId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  businessesFound: number;
  businessesProcessed: number;
  creditsUsed: number;
  startTime?: Date;
  endTime?: Date;
  errors: string[];
}

export class ApifyWaveScraper {
  private client: ApifyClient;
  private currentProgress: Map<string, ScrapeProgress> = new Map();

  // Pre-defined wave configurations
  private readonly WAVE_CONFIGS: WaveConfig[] = [
    {
      id: 'wave-1-lima-premium',
      name: 'Enhanced Lima Premium Districts',
      districts: ['Miraflores', 'San Isidro', 'La Molina', 'Santiago de Surco', 'Barranco'],
      cities: ['Lima'],
      categories: ['belleza', 'salud', 'gastronomia', 'fitness', 'servicios', 'automotriz'],
      priority: 1,
      maxBusinesses: 2000,
      estimatedCredits: 60  // Increased from 40 to 60 due to enhanced features (+50% for 5x more data)
    },
    {
      id: 'wave-2-lima-business',
      name: 'Lima Business Centers',
      districts: ['Centro de Lima', 'Lince', 'Jesús María', 'Magdalena del Mar'],
      cities: ['Lima'],
      categories: ['servicios', 'gastronomia', 'salud', 'automotriz'],
      priority: 2,
      maxBusinesses: 1500,
      estimatedCredits: 30
    },
    {
      id: 'wave-3-lima-popular',
      name: 'Popular Lima Districts', 
      districts: ['San Juan de Lurigancho', 'Villa El Salvador', 'San Martín de Porres', 'Comas'],
      cities: ['Lima'],
      categories: ['belleza', 'salud', 'gastronomia', 'automotriz'],
      priority: 3,
      maxBusinesses: 2500,
      estimatedCredits: 50
    },
    {
      id: 'wave-4-beauty-wellness',
      name: 'Beauty & Wellness Focus',
      districts: [], // All Lima districts
      cities: ['Lima'],
      categories: ['belleza', 'fitness'],
      priority: 4,
      maxBusinesses: 1000,
      estimatedCredits: 20
    },
    {
      id: 'wave-5-secondary-cities',
      name: 'Major Secondary Cities',
      districts: [],
      cities: ['Arequipa', 'Trujillo', 'Chiclayo', 'Piura', 'Iquitos'],
      categories: ['belleza', 'salud', 'gastronomia', 'fitness', 'servicios'],
      priority: 5,
      maxBusinesses: 1500,
      estimatedCredits: 35
    },
    {
      id: 'wave-6-health-professional',
      name: 'Health & Professional Services',
      districts: [],
      cities: ['Lima', 'Arequipa', 'Trujillo', 'Chiclayo'],
      categories: ['salud', 'servicios'],
      priority: 6,
      maxBusinesses: 800,
      estimatedCredits: 20
    },
    {
      id: 'wave-7-food-hospitality',
      name: 'Food & Hospitality',
      districts: [],
      cities: ['Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Cusco'],
      categories: ['gastronomia'],
      priority: 7,
      maxBusinesses: 1200,
      estimatedCredits: 25
    },
    {
      id: 'wave-8-niche-specialty',
      name: 'Niche & Specialty Services',
      districts: [],
      cities: ['Lima'],
      categories: ['automotriz', 'servicios'],
      priority: 8,
      maxBusinesses: 500,
      estimatedCredits: 15
    }
  ];

  constructor() {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
      throw new Error('APIFY_API_TOKEN environment variable is required');
    }
    
    this.client = new ApifyClient({ token });
    console.log('🌊 Apify Wave Scraper initialized with 8 strategic waves');
  }

  // Get all wave configurations
  getWaveConfigs(): WaveConfig[] {
    return this.WAVE_CONFIGS;
  }

  // Get current progress for all waves
  getAllProgress(): Map<string, ScrapeProgress> {
    return this.currentProgress;
  }

  // Get specific wave progress
  getWaveProgress(waveId: string): ScrapeProgress | undefined {
    return this.currentProgress.get(waveId);
  }

  // Generate search terms for a specific wave
  private generateSearchTerms(wave: WaveConfig): string[] {
    const searchTerms: string[] = [];
    const categoryKeywords = {
      belleza: ['barbería', 'peluquería', 'salón de belleza', 'spa', 'manicure', 'pedicure'],
      fitness: ['gimnasio', 'fitness', 'yoga', 'pilates', 'crossfit'],
      gastronomia: ['restaurante', 'cafetería', 'panadería', 'comida rápida', 'bar'],
      salud: ['clínica', 'consultorio médico', 'dentista', 'farmacia', 'veterinaria'],
      automotriz: ['taller mecánico', 'lavado de autos', 'gasolinera', 'repuestos'],
      servicios: ['consultorio', 'abogado', 'contador', 'inmobiliaria']
    };

    // Generate location-specific searches
    for (const city of wave.cities) {
      for (const category of wave.categories) {
        const keywords = categoryKeywords[category as keyof typeof categoryKeywords] || [category];
        
        for (const keyword of keywords) {
          // City-level searches
          searchTerms.push(`${keyword} ${city}`);
          
          // District-level searches for Lima
          if (city === 'Lima' && wave.districts.length > 0) {
            for (const district of wave.districts) {
              searchTerms.push(`${keyword} ${district} Lima`);
            }
          }
        }
      }
    }

    return searchTerms;
  }

  // Map Apify category to our system using enhanced category mapper
  private mapToOurCategory(businessName: string, categoryName: string, address: string): string {
    return CategoryMapper.mapCategory(businessName, categoryName, address);
  }

  // Convert Apify result to our business format with enhanced processing
  private convertToApifyBusiness(place: any): InsertApifyBusiness {
    const businessName = place.title || 'Business';
    const address = place.address || 'Lima, Peru';
    const categoryName = place.categoryName || '';
    
    // Enhanced phone processing
    const rawPhone = place.phoneUnformatted || place.phone || null;
    const phoneResult = rawPhone ? PhoneNumberProcessor.standardizePhone(rawPhone) : null;
    
    // Enhanced coordinate validation
    const lat = place.location?.lat || null;
    const lng = place.location?.lng || null;
    let finalLat = lat;
    let finalLng = lng;
    let coordinatesValidated = false;
    
    if (lat && lng) {
      const coordResult = CoordinateValidator.validateCoordinates(lat, lng);
      coordinatesValidated = coordResult.isValid;
      
      if (!coordResult.isValid && coordResult.correctedLat && coordResult.correctedLng) {
        finalLat = coordResult.correctedLat;
        finalLng = coordResult.correctedLng;
        coordinatesValidated = true;
      }
    }
    
    // Fallback to district-based coordinates if invalid
    if (!coordinatesValidated) {
      const defaultCoords = CoordinateValidator.getDefaultCoordinates(address);
      finalLat = defaultCoords.lat;
      finalLng = defaultCoords.lng;
    }
    
    // Enhanced category mapping
    const category = this.mapToOurCategory(businessName, categoryName, address);
    
    // Extract social media from website and description
    const websiteText = place.website || '';
    const descriptionText = place.description || '';
    const socialMedia = SocialMediaDetector.extractSocialMedia(`${websiteText} ${descriptionText}`);
    
    // Process multiple images
    const imageUrls = place.imageUrls || [];
    const photoUrl = imageUrls.length > 0 ? imageUrls[0] : null;
    
    // Enhanced search terms
    const searchTerms = `${businessName} ${address} ${categoryName} ${category}`.toLowerCase();
    
    // Calculate data freshness
    const businessData = {
      name: businessName,
      phone: rawPhone,
      website: place.website,
      address: address,
      rating: place.totalScore || place.rating || 0,
      hours: place.openingHours,
      photo_url: photoUrl,
      createdAt: new Date(),
      lastUpdated: new Date()
    };
    
    const freshnessScore = DataFreshnessCalculator.calculateFreshness(businessData);
    
    // Prepare enhanced business object
    const enhancedBusiness = {
      placeId: place.placeId || `apify_${Date.now()}_${Math.random()}`,
      name: businessName,
      address: address,
      category: category,
      rating: place.totalScore || place.rating || 0,
      reviewCount: place.reviewsCount || 0,
      priceLevel: place.priceLevel || 0,
      phone: rawPhone,
      website: place.website || null,
      email: place.email || place.companyEmail || null,  // Company email from contacts enrichment
      photoUrl: photoUrl,
      latitude: finalLat,
      longitude: finalLng,
      openNow: null,
      hours: place.openingHours ? JSON.stringify(place.openingHours) : null,
      searchTerms: searchTerms,
      isRegistered: false,
      
      // Enhanced fields
      description: place.description || null,
      services: place.services || null,
      socialMedia: Object.keys(socialMedia).length > 0 ? socialMedia : null,
      imageUrls: imageUrls.length > 0 ? imageUrls : null,
      verifiedStatus: 'scraped',
      dataFreshnessScore: freshnessScore,
      phoneFormatted: phoneResult?.formatted || null,
      phoneCountryCode: phoneResult?.countryCode || '+51',
      coordinatesValidated: coordinatesValidated,
      businessStatus: 'operational',
      amenities: place.amenities || null,
      priceRangeText: place.priceRangeText || null,
      lastScraped: new Date(),
      scrapingSource: 'apify'
    };
    
    return enhancedBusiness as InsertApifyBusiness;
  }

  // Execute a single wave
  async executeWave(waveId: string): Promise<ScrapeProgress> {
    const wave = this.WAVE_CONFIGS.find(w => w.id === waveId);
    if (!wave) {
      throw new Error(`Wave configuration not found: ${waveId}`);
    }

    // Initialize progress tracking
    const progress: ScrapeProgress = {
      waveId,
      status: 'running',
      businessesFound: 0,
      businessesProcessed: 0,
      creditsUsed: 0,
      startTime: new Date(),
      errors: []
    };
    
    this.currentProgress.set(waveId, progress);

    try {
      console.log(`🌊 Starting ${wave.name} (${waveId})`);
      console.log(`📍 Targeting: ${wave.cities.join(', ')}`);
      console.log(`🏢 Categories: ${wave.categories.join(', ')}`);
      
      const searchTerms = this.generateSearchTerms(wave);
      console.log(`🔍 Generated ${searchTerms.length} search terms`);

      // Batch search terms to avoid overwhelming Apify
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < searchTerms.length; i += batchSize) {
        batches.push(searchTerms.slice(i, i + batchSize));
      }

      let totalBusinesses = 0;
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} searches`);

        try {
          const input = {
            searchStringsArray: batch,
            locationQuery: wave.cities[0] + ', Peru',
            maxPlacesPerSearch: Math.ceil(wave.maxBusinesses / searchTerms.length),
            language: 'es',
            allPlacesNoSearchAction: '',
            maxReviews: 5,  // Increased from 3 to 5 for better insights
            maxImages: 1,  // Single photo per business
            exportPlaceUrls: false,
            additionalInfo: true,
            
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
            maxCrawledPlaces: wave.maxBusinesses,  // Ensure we don't exceed our limits
            
            // ENHANCED: Maximum data extraction features
            scrapeContactInfo: true,
            includeBusinessHours: true,
            includePhotos: true,
            includeReviews: true,
            
            // ENHANCED: Business intelligence and popular times
            scrapePopularTimes: true,   // Get busy hours graph data
            scrapeStreetView: true,     // Get Street View image URLs
            scrapeMoreImages: true,     // Get additional photos from various sources
            
            // ENHANCED: Social media and web presence detection
            scrapeSocialMedia: true,    // Extract Facebook, Instagram, etc.
            scrapeWebsite: true,        // Enhanced website detection
            
            // ENHANCED: Location and accessibility data
            scrapeAccessibility: true,  // Wheelchair access, parking, etc.
            scrapeAmenities: true,      // WiFi, air conditioning, etc.
            
            // ENHANCED: Contact validation and verification
            verifyPhoneNumbers: true,   // Phone number validation
            validateAddresses: true,    // Address verification
            
            // ENHANCED: Review and sentiment analysis
            scrapeReviewSentiment: true, // Positive/negative review analysis
            includeReviewPhotos: true,   // Photos from customer reviews
          };

          const run = await this.client.actor('compass/crawler-google-places').call(input);
          const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

          console.log(`📊 Batch ${batchIndex + 1} found ${items.length} businesses`);
          progress.businessesFound += items.length;

          // Process and store businesses with validation and retry
          for (const item of items) {
            try {
              const business = this.convertToApifyBusiness(item);
              
              // Validate business data before storing
              const validation = DataValidator.validateBusinessData(business);
              if (!validation.isValid) {
                progress.errors.push(`Validation failed for ${business.name}: ${validation.errors.join(', ')}`);
                continue;
              }
              
              // Log warnings if any
              if (validation.warnings.length > 0) {
                console.warn(`⚠️ Warnings for ${business.name}: ${validation.warnings.join(', ')}`);
              }
              
              // Store with retry logic
              await DataValidator.validateWithRetry(
                () => storage.addApifyBusiness(business),
                3, // max retries
                1000 // initial delay
              );
              
              progress.businessesProcessed++;
              totalBusinesses++;
            } catch (error) {
              progress.errors.push(`Error processing business: ${error.message}`);
            }
          }

          // Update progress
          this.currentProgress.set(waveId, { ...progress });

          // Add delay between batches to respect rate limits
          if (batchIndex < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }

        } catch (error) {
          const errorMsg = `Batch ${batchIndex + 1} failed: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          progress.errors.push(errorMsg);
        }
      }

      // Mark wave as completed
      progress.status = 'completed';
      progress.endTime = new Date();
      progress.creditsUsed = wave.estimatedCredits; // Estimate for now
      
      console.log(`✅ ${wave.name} completed:`);
      console.log(`   📊 Businesses found: ${progress.businessesFound}`);
      console.log(`   💾 Businesses processed: ${progress.businessesProcessed}`);
      console.log(`   ⚠️ Errors: ${progress.errors.length}`);

    } catch (error) {
      progress.status = 'failed';
      progress.endTime = new Date();
      progress.errors.push(`Wave execution failed: ${error.message}`);
      console.error(`❌ ${wave.name} failed:`, error);
    }

    this.currentProgress.set(waveId, progress);
    return progress;
  }

  // Execute multiple waves in sequence
  async executeWaves(waveIds: string[]): Promise<Map<string, ScrapeProgress>> {
    const results = new Map<string, ScrapeProgress>();
    
    for (const waveId of waveIds) {
      console.log(`\n🚀 Starting wave execution: ${waveId}`);
      const result = await this.executeWave(waveId);
      results.set(waveId, result);
      
      // Add delay between waves
      if (waveIds.indexOf(waveId) < waveIds.length - 1) {
        console.log('⏸️ Pausing 30 seconds between waves...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
    
    return results;
  }

  // Execute all waves in order
  async executeAllWaves(): Promise<Map<string, ScrapeProgress>> {
    const sortedWaves = this.WAVE_CONFIGS
      .sort((a, b) => a.priority - b.priority)
      .map(w => w.id);
    
    console.log('🌊 Starting comprehensive wave-based scraping');
    console.log(`📋 Execution order: ${sortedWaves.join(' → ')}`);
    
    return await this.executeWaves(sortedWaves);
  }

  // Get summary statistics
  getSummaryStats(): {
    totalWaves: number;
    completedWaves: number;
    totalBusinessesFound: number;
    totalBusinessesProcessed: number;
    totalErrors: number;
    estimatedCreditsUsed: number;
  } {
    const progress = Array.from(this.currentProgress.values());
    
    return {
      totalWaves: this.WAVE_CONFIGS.length,
      completedWaves: progress.filter(p => p.status === 'completed').length,
      totalBusinessesFound: progress.reduce((sum, p) => sum + p.businessesFound, 0),
      totalBusinessesProcessed: progress.reduce((sum, p) => sum + p.businessesProcessed, 0),
      totalErrors: progress.reduce((sum, p) => sum + p.errors.length, 0),
      estimatedCreditsUsed: progress.reduce((sum, p) => sum + p.creditsUsed, 0)
    };
  }
}

export const apifyWaveScraper = new ApifyWaveScraper();
import { ApifyClient } from 'apify-client';
import { storage } from './storage.js';
import { InsertApifyBusiness } from '../shared/schema.js';

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
      name: 'Lima Premium Districts',
      districts: ['Miraflores', 'San Isidro', 'La Molina', 'Santiago de Surco', 'Barranco'],
      cities: ['Lima'],
      categories: ['belleza', 'salud', 'gastronomia', 'fitness', 'servicios'],
      priority: 1,
      maxBusinesses: 2000,
      estimatedCredits: 40
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

  // Map Apify category to our system
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

  // Convert Apify result to our business format
  private convertToApifyBusiness(place: any): InsertApifyBusiness {
    return {
      placeId: place.placeId || `apify_${Date.now()}_${Math.random()}`,
      name: place.title || 'Business',
      address: place.address || 'Lima, Peru',
      category: this.mapToOurCategory(place.categoryName || ''),
      rating: place.totalScore || place.rating || 0,
      reviewCount: place.reviewsCount || 0,
      priceLevel: place.priceLevel || 0,
      phone: place.phoneUnformatted || place.phone || null,
      website: place.website || null,
      photoUrl: place.imageUrls?.[0] || null,
      latitude: place.location?.lat || -12.05,
      longitude: place.location?.lng || -77.05,
      openNow: null,
      hours: place.openingHours ? JSON.stringify(place.openingHours) : null,
      searchTerms: `${place.title} ${place.address} ${place.categoryName || ''}`.toLowerCase(),
      isRegistered: false
    };
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
            allPlacesNoSearchAction: 'random',
            maxReviews: 3,
            maxImages: 2,
            exportPlaceUrls: false,
            additionalInfo: true
          };

          const run = await this.client.actor('compass/google-maps-scraper').call(input);
          const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

          console.log(`📊 Batch ${batchIndex + 1} found ${items.length} businesses`);
          progress.businessesFound += items.length;

          // Process and store businesses
          for (const item of items) {
            try {
              const business = this.convertToApifyBusiness(item);
              await storage.addApifyBusiness(business);
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
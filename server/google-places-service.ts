interface GooglePlacesResult {
  place_id: string;
  name: string;
  formatted_address: string;
  types: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: {
    open_now: boolean;
    periods: Array<{
      open: { day: number; time: string };
      close: { day: number; time: string };
    }>;
    weekday_text: string[];
  };
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
    profile_photo_url?: string;
  }>;
  editorial_summary?: {
    overview: string;
  };
  business_status?: string;
}

interface GooglePlacesSearchResponse {
  results: GooglePlacesResult[];
  status: string;
  next_page_token?: string;
  error_message?: string;
}

export interface BusinessFromPlaces {
  id: string;
  name: string;
  address: string;
  category: string;
  rating: number;
  reviewCount: number;
  priceLevel: number;
  phone?: string;
  website?: string;
  photoUrl?: string;
  location: {
    lat: number;
    lng: number;
  };
  openNow?: boolean;
  hours?: string[];
  isRegistered: boolean;
}

export class GooglePlacesService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';

  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
    if (!this.apiKey) {
      console.error('Google Places API key not found in environment variables. Please set GOOGLE_PLACES_API_KEY.');
    } else {
      console.log('Google Places API initialized successfully');
    }
  }

  // Category mapping from our system to Google Places types
  private getCategoryTypes(category?: string): string[] {
    const categoryMap: { [key: string]: string[] } = {
      'belleza': ['beauty_salon', 'hair_care', 'spa'],
      'salud': ['hospital', 'doctor', 'dentist', 'pharmacy', 'physiotherapist'],
      'fitness': ['gym', 'fitness_center', 'yoga_studio'],
      'educacion': ['school', 'university', 'driving_school', 'language_school'],
      'servicios': ['plumber', 'electrician', 'lawyer', 'accountant', 'real_estate_agency'],
      'gastronomia': ['restaurant', 'meal_takeaway', 'bakery', 'cafe'],
      'automotriz': ['car_dealer', 'car_repair', 'car_wash', 'gas_station'],
      'hogar': ['furniture_store', 'home_goods_store', 'hardware_store'],
      'tecnologia': ['electronics_store', 'computer_store', 'cell_phone_store'],
      'consultoria': ['lawyer', 'accountant', 'insurance_agency', 'financial_planner']
    };

    return categoryMap[category || ''] || ['establishment'];
  }

  // Map Google Places types to our categories
  private mapToOurCategory(types: string[]): string {
    const typeToCategory: { [key: string]: string } = {
      'beauty_salon': 'belleza',
      'hair_care': 'belleza',
      'spa': 'belleza',
      'hospital': 'salud',
      'doctor': 'salud',
      'dentist': 'salud',
      'pharmacy': 'salud',
      'physiotherapist': 'salud',
      'gym': 'fitness',
      'fitness_center': 'fitness',
      'yoga_studio': 'fitness',
      'school': 'educacion',
      'university': 'educacion',
      'driving_school': 'educacion',
      'restaurant': 'gastronomia',
      'meal_takeaway': 'gastronomia',
      'bakery': 'gastronomia',
      'cafe': 'gastronomia',
      'car_dealer': 'automotriz',
      'car_repair': 'automotriz',
      'car_wash': 'automotriz',
      'lawyer': 'consultoria',
      'accountant': 'consultoria',
      'insurance_agency': 'consultoria'
    };

    for (const type of types) {
      if (typeToCategory[type]) {
        return typeToCategory[type];
      }
    }

    return 'servicios'; // Default category
  }

  // Multi-district search strategy for Lima to get broader coverage
  async searchLimaDistricts(query: string, category?: string): Promise<BusinessFromPlaces[]> {
    const limaDistricts = [
      'Lima Centro, Lima, Peru',
      'Miraflores, Lima, Peru', 
      'San Isidro, Lima, Peru',
      'Surco, Lima, Peru',
      'La Molina, Lima, Peru',
      'San Juan de Lurigancho, Lima, Peru',
      'Villa El Salvador, Lima, Peru',
      'Ate, Lima, Peru',
      'Comas, Lima, Peru',
      'San Martin de Porres, Lima, Peru'
    ];

    const allBusinesses: BusinessFromPlaces[] = [];
    const uniqueBusinesses = new Set<string>();

    console.log(`🔍 Searching ${limaDistricts.length} Lima districts for: "${query}"`);

    for (const district of limaDistricts) {
      try {
        const searchQuery = `${query} ${district}`;
        const url = `${this.baseUrl}/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${this.apiKey}&language=es&region=pe`;
        
        const response = await fetch(url);
        const data: GooglePlacesSearchResponse = await response.json();

        if (data.status === 'OK') {
          console.log(`📍 ${district}: Found ${data.results.length} results`);
          
          for (const place of data.results) {
            // Skip duplicates using place_id
            if (uniqueBusinesses.has(place.place_id)) {
              continue;
            }
            uniqueBusinesses.add(place.place_id);

            // Filter by category if specified
            if (category && !place.types.some(type => this.getCategoryTypes(category).includes(type))) {
              continue;
            }

            let photoUrl = '';
            if (place.photos && place.photos.length > 0) {
              photoUrl = `${this.baseUrl}/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${this.apiKey}`;
            }

            const business: BusinessFromPlaces = {
              id: place.place_id,
              name: place.name,
              address: place.formatted_address,
              category: this.mapToOurCategory(place.types),
              rating: place.rating || 0,
              reviewCount: place.user_ratings_total || 0,
              priceLevel: place.price_level || 0,
              phone: place.formatted_phone_number || undefined,
              website: place.website || undefined,
              photoUrl,
              location: {
                lat: place.geometry.location.lat,
                lng: place.geometry.location.lng
              },
              openNow: place.opening_hours?.open_now || undefined,
              hours: place.opening_hours?.weekday_text || undefined,
              isRegistered: false
            };

            allBusinesses.push(business);
          }
        } else {
          console.log(`❌ ${district}: API error - ${data.status}`);
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error searching district ${district}:`, error);
      }
    }

    console.log(`✅ Multi-district search complete: Found ${allBusinesses.length} unique businesses across Lima`);
    return allBusinesses;
  }

  async searchBusinesses(query: string, category?: string, location = 'Lima, Peru'): Promise<BusinessFromPlaces[]> {
    if (!this.apiKey) {
      console.error('Google Places API not configured');
      return [];
    }

    try {
      const types = this.getCategoryTypes(category);
      
      // Build search query - if no query, use category or general business search
      let searchQuery = query || '';
      if (!searchQuery && category) {
        // Use category name in Spanish for better results
        const categoryNames: { [key: string]: string } = {
          'belleza': 'salon de belleza',
          'gastronomia': 'restaurantes',
          'salud': 'clinicas doctores',
          'fitness': 'gimnasios',
          'educacion': 'colegios universidades',
          'servicios': 'servicios profesionales',
          'automotriz': 'talleres mecanicos',
          'hogar': 'tiendas para el hogar',
          'tecnologia': 'tiendas electronicas',
          'consultoria': 'consultores abogados'
        };
        searchQuery = categoryNames[category] || 'negocios';
      }
      if (!searchQuery) {
        searchQuery = 'negocios restaurantes servicios'; // Default broad search
      }
      
      // Use location with radius for broader coverage - Lima metropolitan area
      const locationParam = location === 'Lima, Peru' ? 'Lima, Peru' : location;
      let searchUrl = '';
      
      // For Lima, use multi-district search strategy to get broader coverage
      if (location === 'Lima, Peru') {
        console.log(`🌍 Using multi-district search strategy for comprehensive Lima coverage`);
        return await this.searchLimaDistricts(searchQuery, category);
      } else {
        // Fallback to text search for other locations
        searchUrl = `${this.baseUrl}/textsearch/json?query=${encodeURIComponent(searchQuery + ' ' + locationParam)}&key=${this.apiKey}&language=es&region=pe`;
        console.log(`🔍 Using text search for location: ${locationParam}`);
      }

      let allBusinesses: BusinessFromPlaces[] = [];
      let nextPageToken: string | undefined;
      let requestCount = 0;
      const maxRequests = 10; // Get up to 200 results (10 pages × 20 results)
      
      do {
        let url = searchUrl;
        if (nextPageToken) {
          // For pagination, use the base URL with pagetoken
          url = `${this.baseUrl}/textsearch/json?pagetoken=${nextPageToken}&key=${this.apiKey}`;
        }

        console.log(`Searching Google Places (Request ${requestCount + 1}/${maxRequests})`);
        
        const response = await fetch(url);
        const data: GooglePlacesSearchResponse = await response.json();

        if (data.status !== 'OK') {
          console.error('Google Places API error:', data.status, data.error_message);
          break;
        }

        console.log(`Page ${requestCount + 1} returned ${data.results.length} results. Next page token: ${data.next_page_token ? 'YES' : 'NO'}`);

        const businesses: BusinessFromPlaces[] = [];

        for (const place of data.results) {
          // Filter by category if specified
          if (category && !place.types.some(type => this.getCategoryTypes(category).includes(type))) {
            continue;
          }

        let photoUrl = '';
        if (place.photos && place.photos.length > 0) {
          photoUrl = `${this.baseUrl}/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${this.apiKey}`;
        }

        const business: BusinessFromPlaces = {
          id: place.place_id,
          name: place.name,
          address: place.formatted_address,
          category: this.mapToOurCategory(place.types),
          rating: place.rating || 0,
          reviewCount: place.user_ratings_total || 0,
          priceLevel: place.price_level || 0,
          phone: place.formatted_phone_number || undefined,
          website: place.website || undefined,
          photoUrl,
          location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          },
          openNow: place.opening_hours?.open_now || undefined,
          hours: place.opening_hours?.weekday_text || undefined,
          isRegistered: false // These are external businesses
        };

          businesses.push(business);
        }

        allBusinesses = allBusinesses.concat(businesses);
        nextPageToken = data.next_page_token;
        requestCount++;
        
        // Google requires a brief delay between paginated requests
        if (nextPageToken && requestCount < maxRequests) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } while (nextPageToken && requestCount < maxRequests);

      console.log(`✅ Found ${allBusinesses.length} businesses from Google Places (${requestCount} API calls) - Geographic coverage: ${location}`);
      return allBusinesses;

    } catch (error) {
      console.error('Error searching Google Places:', error);
      return [];
    }
  }

  async getBusinessDetails(placeId: string): Promise<GooglePlacesResult | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      // Extended fields for comprehensive business data
      const fields = [
        'name', 'formatted_address', 'formatted_phone_number', 'website',
        'opening_hours', 'rating', 'user_ratings_total', 'reviews',
        'photos', 'geometry', 'types', 'price_level', 'business_status',
        'plus_code', 'utc_offset', 'vicinity', 'editorial_summary'
      ].join(',');

      const url = `${this.baseUrl}/details/json?place_id=${placeId}&fields=${fields}&key=${this.apiKey}&language=es`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        console.error('Google Places Details API error:', data.status);
        return null;
      }

      return data.result;

    } catch (error) {
      console.error('Error fetching business details:', error);
      return null;
    }
  }

  // Get photo URL for a business
  getPhotoUrl(photoReference: string, maxWidth = 400): string {
    if (!this.apiKey || !photoReference) {
      return '';
    }
    
    return `${this.baseUrl}/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${this.apiKey}`;
  }

  // Find and enrich existing business data with Google Places information
  async findAndEnrichBusiness(businessName: string, address?: string, phone?: string): Promise<any> {
    if (!this.apiKey) {
      console.warn('Google Places API not configured for business enrichment');
      return null;
    }

    try {
      // Build search query
      let searchQuery = businessName;
      if (address) {
        searchQuery += ` ${address}`;
      }

      console.log(`Searching Google Places for business enrichment: "${searchQuery}"`);

      const url = `${this.baseUrl}/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${this.apiKey}&language=es`;
      const response = await fetch(url);
      const data: GooglePlacesSearchResponse = await response.json();

      if (data.status !== 'OK' || !data.results.length) {
        console.log(`No Google Places match found for: ${businessName}`);
        return null;
      }

      // Find best match based on name similarity
      let bestMatch = data.results[0];

      if (data.results.length > 1) {
        // Score matches based on name similarity
        const scoredResults = data.results.map(place => {
          let score = 0;

          // Name similarity (simple contains check)
          if (place.name.toLowerCase().includes(businessName.toLowerCase()) || 
              businessName.toLowerCase().includes(place.name.toLowerCase())) {
            score += 50;
          }

          // Exact name match
          if (place.name.toLowerCase() === businessName.toLowerCase()) {
            score += 100;
          }

          return { place, score };
        });

        // Sort by score and take the best match
        scoredResults.sort((a, b) => b.score - a.score);
        bestMatch = scoredResults[0].place;

        console.log(`Found ${data.results.length} potential matches, selected: ${bestMatch.name} (score: ${scoredResults[0].score})`);
      }

      // Get detailed information for the best match
      const details = await this.getBusinessDetails(bestMatch.place_id);

      if (!details) {
        return null;
      }

      // Format and return enriched data
      const enrichedData = {
        googlePlaceId: bestMatch.place_id,
        name: details.name,
        description: details.editorial_summary?.overview || null,
        address: details.formatted_address,
        phone: details.formatted_phone_number,
        website: details.website,
        rating: details.rating || 0,
        reviewCount: details.user_ratings_total || 0,
        priceLevel: details.price_level || 0,
        businessStatus: details.business_status,
        location: {
          lat: details.geometry?.location?.lat,
          lng: details.geometry?.location?.lng
        },
        openingHours: details.opening_hours ? {
          openNow: details.opening_hours.open_now,
          periods: details.opening_hours.periods,
          weekdayText: details.opening_hours.weekday_text
        } : null,
        photos: details.photos ? details.photos.slice(0, 10).map(photo => ({
          reference: photo.photo_reference,
          width: photo.width,
          height: photo.height,
          url: this.getPhotoUrl(photo.photo_reference, 400)
        })) : [],
        reviews: details.reviews ? details.reviews.slice(0, 5).map(review => ({
          author: review.author_name,
          rating: review.rating,
          text: review.text,
          time: review.time,
          profilePhoto: review.profile_photo_url
        })) : [],
        types: details.types
      };

      console.log(`Successfully enriched business data from Google Places for: ${businessName}`);
      return enrichedData;

    } catch (error) {
      console.error('Error enriching business with Google Places data:', error);
      return null;
    }
  }

  // New method: Nearby Search for better map-based results
  async nearbySearch(
    location: { lat: number; lng: number },
    radius: number = 5000, // 5km default
    query?: string,
    category?: string,
    pageToken?: string
  ): Promise<{ businesses: BusinessFromPlaces[], nextPageToken?: string }> {
    if (!this.apiKey) {
      return { businesses: [] };
    }

    try {
      const types = this.getCategoryTypes(category);
      
      let url = `${this.baseUrl}/nearbysearch/json?`;
      url += `location=${location.lat},${location.lng}`;
      url += `&radius=${radius}`;
      url += `&key=${this.apiKey}`;
      url += `&language=es`;
      
      if (pageToken) {
        url = `${this.baseUrl}/nearbysearch/json?pagetoken=${pageToken}&key=${this.apiKey}`;
      } else {
        if (query) {
          url += `&keyword=${encodeURIComponent(query)}`;
        }
        if (types.length > 0) {
          // Nearby search supports one type at a time
          url += `&type=${types[0]}`;
        }
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('Nearby Search API error:', data.status, data.error_message);
        return { businesses: [] };
      }

      const businesses: BusinessFromPlaces[] = data.results.map((place: any) => {
        let photoUrl = '';
        if (place.photos && place.photos.length > 0) {
          photoUrl = this.getPhotoUrl(place.photos[0].photo_reference);
        }

        return {
          id: place.place_id,
          name: place.name,
          address: place.vicinity || place.formatted_address,
          category: this.mapToOurCategory(place.types),
          rating: place.rating || 0,
          reviewCount: place.user_ratings_total || 0,
          priceLevel: place.price_level || 0,
          photoUrl,
          location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          },
          openNow: place.opening_hours?.open_now,
          isRegistered: false
        };
      });

      return {
        businesses,
        nextPageToken: data.next_page_token
      };

    } catch (error) {
      console.error('Error in nearby search:', error);
      return { businesses: [] };
    }
  }

  // Grid-based search for comprehensive coverage
  async gridSearch(
    bounds: { north: number; south: number; east: number; west: number },
    query?: string,
    category?: string,
    gridSize: number = 0.02 // ~2.2km cells for Lima
  ): Promise<BusinessFromPlaces[]> {
    if (!this.apiKey) {
      return [];
    }

    const allBusinesses = new Map<string, BusinessFromPlaces>();
    const searchPromises: Promise<void>[] = [];
    
    // Calculate grid cells
    const latSteps = Math.ceil((bounds.north - bounds.south) / gridSize);
    const lngSteps = Math.ceil((bounds.east - bounds.west) / gridSize);
    
    console.log(`🔍 Grid search: ${latSteps}x${lngSteps} cells for bounds`, bounds);

    // Limit concurrent requests to avoid rate limits
    const maxConcurrent = 5;
    let activeRequests = 0;
    
    for (let i = 0; i < latSteps; i++) {
      for (let j = 0; j < lngSteps; j++) {
        const centerLat = bounds.south + (i + 0.5) * gridSize;
        const centerLng = bounds.west + (j + 0.5) * gridSize;
        
        // Calculate radius to cover the cell (diagonal / 2)
        const cellRadius = Math.min(
          Math.sqrt(2) * gridSize * 111000 / 2, // Convert degrees to meters
          50000 // Max 50km radius
        );

        // Wait if too many concurrent requests
        while (activeRequests >= maxConcurrent) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        activeRequests++;
        const searchPromise = this.nearbySearch(
          { lat: centerLat, lng: centerLng },
          cellRadius,
          query,
          category
        ).then(result => {
          result.businesses.forEach(business => {
            allBusinesses.set(business.id, business);
          });
          activeRequests--;
        }).catch(error => {
          console.error(`Grid cell ${i},${j} search failed:`, error);
          activeRequests--;
        });

        searchPromises.push(searchPromise);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    await Promise.all(searchPromises);
    
    const businesses = Array.from(allBusinesses.values());
    console.log(`✅ Grid search found ${businesses.length} unique businesses`);
    
    return businesses;
  }

  // Search with map bounds - intelligently chooses between strategies
  async searchWithBounds(
    bounds: { north: number; south: number; east: number; west: number },
    query?: string,
    category?: string
  ): Promise<BusinessFromPlaces[]> {
    if (!this.apiKey) {
      return [];
    }

    // Calculate area size
    const latDiff = bounds.north - bounds.south;
    const lngDiff = bounds.east - bounds.west;
    const approxAreaKm2 = latDiff * lngDiff * 111 * 111; // Rough conversion

    console.log(`📍 Search area: ~${Math.round(approxAreaKm2)} km²`);

    // For small areas (< 100 km²), use single nearby search
    if (approxAreaKm2 < 100) {
      const center = {
        lat: (bounds.north + bounds.south) / 2,
        lng: (bounds.east + bounds.west) / 2
      };
      
      // Calculate radius to cover the bounds
      const radius = Math.min(
        Math.max(
          latDiff * 111000 / 2,
          lngDiff * 111000 / 2
        ),
        50000 // Max 50km
      );

      const results: BusinessFromPlaces[] = [];
      let nextPageToken: string | undefined;
      let pageCount = 0;

      do {
        const { businesses, nextPageToken: token } = await this.nearbySearch(
          center,
          radius,
          query,
          category,
          nextPageToken
        );
        
        results.push(...businesses);
        nextPageToken = token;
        pageCount++;

        if (nextPageToken && pageCount < 3) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } while (nextPageToken && pageCount < 3);

      return results;
    }

    // For large areas, use grid search
    return this.gridSearch(bounds, query, category);
  }

  // Enhanced search for Lima with better coverage
  async searchLimaComprehensive(query: string, category?: string): Promise<BusinessFromPlaces[]> {
    // Define Lima metropolitan area bounds
    const limaBounds = {
      north: -11.7,
      south: -12.3,
      east: -76.7,
      west: -77.2
    };

    console.log('🌆 Performing comprehensive Lima search...');
    
    // Use grid search for full coverage
    const gridResults = await this.gridSearch(limaBounds, query, category, 0.03); // ~3.3km cells
    
    // If we have good results, enhance top results with details
    if (gridResults.length > 0) {
      const topResults = gridResults.slice(0, 10);
      const enhancedPromises = topResults.map(async (business) => {
        const details = await this.getBusinessDetails(business.id);
        if (details) {
          business.phone = details.formatted_phone_number;
          business.website = details.website;
          business.hours = details.opening_hours?.weekday_text;
        }
        return business;
      });
      
      await Promise.all(enhancedPromises);
    }
    
    return gridResults;
  }
}

export const googlePlacesService = new GooglePlacesService();
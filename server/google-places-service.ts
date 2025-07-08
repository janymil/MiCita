import { BusinessFromPlaces } from "@shared/schema";
import { apiAnalytics } from "./api-analytics";

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

  async searchBusinesses(query: string, category?: string, location = 'Lima, Peru'): Promise<BusinessFromPlaces[]> {
    if (!this.apiKey) {
      console.warn('Google Places API not configured - skipping Google results');
      return [];
    }

    try {
      console.log(`Google Places search: query="${query}", category="${category}", location="${location}"`);

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

      // Add location
      searchQuery += ` ${location}`;

      let allBusinesses: BusinessFromPlaces[] = [];
      let nextPageToken: string | undefined;
      let requestCount = 0;
      const maxRequests = 3; // Get up to 60 results (3 pages × 20 results)

      do {
        const url = `${this.baseUrl}/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${this.apiKey}&language=es&region=pe${nextPageToken ? `&pagetoken=${nextPageToken}` : ''}`;

        console.log(`Searching Google Places with query: ${searchQuery} (Request ${requestCount + 1}/${maxRequests})`);

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
          photoUrl,
          location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          },
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

      console.log(`Found ${allBusinesses.length} businesses from Google Places (${requestCount} API calls)`);
      apiAnalytics.track('google_places_search', {
        query,
        category,
        location,
        resultCount: allBusinesses.length,
        apiCalls: requestCount,
      });
      return allBusinesses;

    } catch (error) {
      console.error('Error searching Google Places:', error instanceof Error ? error.message : error);
      // Return empty array instead of failing the entire search
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
        console.error('Google Places Details API error:', data.status, data.error_message);
        return null;
      }

      apiAnalytics.track('google_places_details', {
        placeId,
        status: data.status,
      });

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
}

export const googlePlacesService = new GooglePlacesService();
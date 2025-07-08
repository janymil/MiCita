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
    this.apiKey = process.env.GOOGLE_API_KEY || '';
    if (!this.apiKey) {
      console.error('Google Places API key not found in environment variables');
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
      console.error('Google Places API not configured');
      return [];
    }

    try {
      const types = this.getCategoryTypes(category);
      
      // Build search query
      let searchQuery = query;
      if (category) {
        searchQuery += ` ${category}`;
      }
      searchQuery += ` ${location}`;

      const url = `${this.baseUrl}/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${this.apiKey}&language=es&region=pe`;

      console.log('Searching Google Places with query:', searchQuery);
      
      const response = await fetch(url);
      const data: GooglePlacesSearchResponse = await response.json();

      if (data.status !== 'OK') {
        console.error('Google Places API error:', data.status);
        return [];
      }

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

      console.log(`Found ${businesses.length} businesses from Google Places`);
      return businesses;

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
      const url = `${this.baseUrl}/details/json?place_id=${placeId}&fields=formatted_phone_number,website,opening_hours&key=${this.apiKey}&language=es`;
      
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
}

export const googlePlacesService = new GooglePlacesService();
/**
 * Enhanced Data Processing Utilities
 * Implements recommendations for improved data quality and validation
 */

// Phone number standardization
export class PhoneNumberProcessor {
  private static readonly PERU_COUNTRY_CODE = '+51';
  private static readonly PERU_MOBILE_PREFIXES = ['9', '8', '7', '6'];
  private static readonly PERU_LANDLINE_PREFIXES = ['1', '2', '3', '4', '5'];

  static standardizePhone(phone: string): { formatted: string; countryCode: string; isValid: boolean } {
    if (!phone) return { formatted: '', countryCode: '', isValid: false };

    // Clean the phone number
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Handle different formats
    let processedPhone = cleaned;
    
    // If it starts with +51, remove it for processing
    if (processedPhone.startsWith('+51')) {
      processedPhone = processedPhone.substring(3);
    } else if (processedPhone.startsWith('51')) {
      processedPhone = processedPhone.substring(2);
    }
    
    // Remove leading zeros
    processedPhone = processedPhone.replace(/^0+/, '');
    
    // Validate and format
    if (processedPhone.length === 9) {
      // Mobile number
      const firstDigit = processedPhone[0];
      if (this.PERU_MOBILE_PREFIXES.includes(firstDigit)) {
        return {
          formatted: `${this.PERU_COUNTRY_CODE} ${processedPhone.substring(0, 3)} ${processedPhone.substring(3, 6)} ${processedPhone.substring(6)}`,
          countryCode: this.PERU_COUNTRY_CODE,
          isValid: true
        };
      }
    } else if (processedPhone.length === 8) {
      // Landline number
      const firstDigit = processedPhone[0];
      if (this.PERU_LANDLINE_PREFIXES.includes(firstDigit)) {
        return {
          formatted: `${this.PERU_COUNTRY_CODE} ${firstDigit} ${processedPhone.substring(1, 4)} ${processedPhone.substring(4)}`,
          countryCode: this.PERU_COUNTRY_CODE,
          isValid: true
        };
      }
    } else if (processedPhone.length === 7) {
      // Lima landline without area code
      return {
        formatted: `${this.PERU_COUNTRY_CODE} 1 ${processedPhone.substring(0, 3)} ${processedPhone.substring(3)}`,
        countryCode: this.PERU_COUNTRY_CODE,
        isValid: true
      };
    }
    
    // If we can't format it properly, return original with country code
    return {
      formatted: cleaned.startsWith('+') ? cleaned : `${this.PERU_COUNTRY_CODE} ${cleaned}`,
      countryCode: this.PERU_COUNTRY_CODE,
      isValid: false
    };
  }
}

// Enhanced category mapping
export class CategoryMapper {
  private static readonly CATEGORY_KEYWORDS = {
    belleza: [
      'barbería', 'barberia', 'barber', 'peluquería', 'peluqueria', 'salon', 'salón',
      'spa', 'manicure', 'pedicure', 'estética', 'estetica', 'belleza', 'beauty',
      'nail', 'uñas', 'cabello', 'hair', 'maquillaje', 'makeup', 'cosmética',
      'depilación', 'masajes', 'tratamientos', 'facial'
    ],
    fitness: [
      'gimnasio', 'gym', 'fitness', 'yoga', 'pilates', 'crossfit', 'entrenamiento',
      'ejercicio', 'deporte', 'spinning', 'aeróbicos', 'musculación', 'cardio',
      'personal trainer', 'zumba', 'funcional', 'boxeo', 'artes marciales'
    ],
    gastronomia: [
      'restaurante', 'restaurant', 'cafetería', 'cafeteria', 'café', 'coffee',
      'panadería', 'bakery', 'comida', 'food', 'bar', 'pub', 'pizzería',
      'cevichería', 'chifa', 'pollería', 'hamburguesería', 'heladería',
      'pastelería', 'dulcería', 'jugos', 'smoothies', 'fast food', 'delivery'
    ],
    salud: [
      'clínica', 'clinica', 'consultorio', 'médico', 'doctor', 'dentista',
      'odontólogo', 'farmacia', 'pharmacy', 'hospital', 'laboratorio',
      'análisis', 'rayos x', 'ecografía', 'psicólogo', 'psiquiatra',
      'nutricionista', 'veterinaria', 'veterinario', 'oftalmólogo',
      'cardiología', 'dermatología', 'ginecología', 'pediatría'
    ],
    automotriz: [
      'taller', 'mecánico', 'automotive', 'auto', 'carro', 'vehiculo',
      'lubricentro', 'lavado', 'car wash', 'gasolinera', 'grifo',
      'repuestos', 'autopartes', 'llantas', 'batería', 'aceite',
      'pintura', 'chapa', 'soldadura', 'alineación', 'balanceado'
    ],
    servicios: [
      'abogado', 'lawyer', 'contador', 'contabilidad', 'inmobiliaria',
      'real estate', 'notaría', 'consultoría', 'asesoría', 'seguros',
      'insurance', 'bancos', 'financiera', 'créditos', 'préstamos',
      'tecnología', 'sistemas', 'reparación', 'mantenimiento', 'limpieza',
      'seguridad', 'construcción', 'arquitectura', 'diseño', 'publicidad'
    ]
  };

  static mapCategory(businessName: string, categoryName: string, address: string): string {
    const searchText = `${businessName} ${categoryName} ${address}`.toLowerCase();
    
    // Score each category
    const scores = Object.entries(this.CATEGORY_KEYWORDS).map(([category, keywords]) => {
      const score = keywords.reduce((acc, keyword) => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = searchText.match(regex);
        return acc + (matches ? matches.length : 0);
      }, 0);
      return { category, score };
    });
    
    // Find the category with highest score
    const bestMatch = scores.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    // Return best match if score > 0, otherwise default to 'servicios'
    return bestMatch.score > 0 ? bestMatch.category : 'servicios';
  }
}

// Coordinate validation
export class CoordinateValidator {
  private static readonly PERU_BOUNDS = {
    north: -0.012977,
    south: -18.448458,
    east: -68.677986,
    west: -81.362976
  };

  private static readonly LIMA_BOUNDS = {
    north: -11.8,
    south: -12.4,
    east: -76.7,
    west: -77.2
  };

  static validateCoordinates(lat: number, lng: number): {
    isValid: boolean;
    isInPeru: boolean;
    isInLima: boolean;
    correctedLat?: number;
    correctedLng?: number;
  } {
    // Check if coordinates are valid numbers
    if (isNaN(lat) || isNaN(lng)) {
      return { isValid: false, isInPeru: false, isInLima: false };
    }

    // Check if within Peru bounds
    const isInPeru = lat >= this.PERU_BOUNDS.south && lat <= this.PERU_BOUNDS.north &&
                     lng >= this.PERU_BOUNDS.west && lng <= this.PERU_BOUNDS.east;

    // Check if within Lima bounds
    const isInLima = lat >= this.LIMA_BOUNDS.south && lat <= this.LIMA_BOUNDS.north &&
                     lng >= this.LIMA_BOUNDS.west && lng <= this.LIMA_BOUNDS.east;

    // If not in Peru, try to correct common errors
    let correctedLat = lat;
    let correctedLng = lng;

    // Common error: swapped coordinates
    if (!isInPeru && lng >= this.PERU_BOUNDS.south && lng <= this.PERU_BOUNDS.north &&
        lat >= this.PERU_BOUNDS.west && lat <= this.PERU_BOUNDS.east) {
      correctedLat = lng;
      correctedLng = lat;
    }

    return {
      isValid: isInPeru,
      isInPeru,
      isInLima,
      correctedLat: correctedLat !== lat ? correctedLat : undefined,
      correctedLng: correctedLng !== lng ? correctedLng : undefined
    };
  }

  static getDefaultCoordinates(address: string): { lat: number; lng: number } {
    const addressLower = address.toLowerCase();
    
    // District-specific coordinates
    const districtCoordinates: { [key: string]: { lat: number; lng: number } } = {
      'miraflores': { lat: -12.1191, lng: -77.0351 },
      'san isidro': { lat: -12.0969, lng: -77.0378 },
      'la molina': { lat: -12.0797, lng: -76.9423 },
      'surco': { lat: -12.1460, lng: -77.0124 },
      'barranco': { lat: -12.1405, lng: -77.0196 },
      'centro': { lat: -12.0464, lng: -77.0428 },
      'lince': { lat: -12.0887, lng: -77.0387 },
      'jesús maría': { lat: -12.0771, lng: -77.0493 },
      'magdalena': { lat: -12.0964, lng: -77.0750 }
    };

    // Check for district matches
    for (const [district, coords] of Object.entries(districtCoordinates)) {
      if (addressLower.includes(district)) {
        return coords;
      }
    }

    // Default to Lima center
    return { lat: -12.0464, lng: -77.0428 };
  }
}

// Data freshness calculator
export class DataFreshnessCalculator {
  static calculateFreshness(data: any): number {
    let score = 0;
    const now = new Date();
    const createdAt = new Date(data.createdAt || data.created_at);
    const lastUpdated = new Date(data.lastUpdated || data.last_updated || createdAt);

    // Age factor (0-30 points)
    const daysSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceUpdated = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdated <= 7) score += 30;
    else if (daysSinceUpdated <= 30) score += 25;
    else if (daysSinceUpdated <= 90) score += 20;
    else if (daysSinceUpdated <= 180) score += 15;
    else if (daysSinceUpdated <= 365) score += 10;
    else score += 5;

    // Data completeness (0-40 points)
    const fields = ['name', 'phone', 'website', 'address', 'rating', 'hours', 'photo_url'];
    const completedFields = fields.filter(field => data[field] && data[field] !== '');
    score += Math.round((completedFields.length / fields.length) * 40);

    // Data quality indicators (0-30 points)
    if (data.coordinates_validated) score += 10;
    if (data.phone_formatted) score += 10;
    if (data.review_count > 0) score += 10;

    return Math.min(score, 100);
  }
}

// Enhanced data validation
export class DataValidator {
  static validateBusinessData(data: any): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!data.name || data.name.trim().length < 2) {
      errors.push('Business name is required and must be at least 2 characters');
    }

    if (!data.address || data.address.trim().length < 10) {
      errors.push('Business address is required and must be detailed');
    }

    // Phone validation
    if (data.phone) {
      const phoneResult = PhoneNumberProcessor.standardizePhone(data.phone);
      if (!phoneResult.isValid) {
        warnings.push('Phone number format may be incorrect');
      }
    }

    // Coordinate validation
    if (data.latitude && data.longitude) {
      const coordResult = CoordinateValidator.validateCoordinates(data.latitude, data.longitude);
      if (!coordResult.isValid) {
        warnings.push('Coordinates may be outside Peru bounds');
      }
    }

    // Website validation
    if (data.website && !data.website.match(/^https?:\/\/.+/)) {
      warnings.push('Website URL format may be incorrect');
    }

    // Rating validation
    if (data.rating && (data.rating < 0 || data.rating > 5)) {
      errors.push('Rating must be between 0 and 5');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validateWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      let lastError: Error;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const result = await operation();
          resolve(result);
          return;
        } catch (error) {
          lastError = error as Error;
          
          if (attempt === maxRetries) {
            reject(lastError);
            return;
          }
          
          // Exponential backoff
          const delay = delayMs * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    });
  }
}

// Social media detection
export class SocialMediaDetector {
  private static readonly SOCIAL_PATTERNS = {
    facebook: /(?:facebook\.com|fb\.com)\/([a-zA-Z0-9._-]+)/,
    instagram: /(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9._-]+)/,
    twitter: /(?:twitter\.com|x\.com)\/([a-zA-Z0-9._-]+)/,
    youtube: /(?:youtube\.com|youtu\.be)\/([a-zA-Z0-9._-]+)/,
    linkedin: /linkedin\.com\/(?:in|company)\/([a-zA-Z0-9._-]+)/,
    tiktok: /tiktok\.com\/@([a-zA-Z0-9._-]+)/,
    whatsapp: /wa\.me\/([0-9]+)/
  };

  static extractSocialMedia(text: string): { [key: string]: string } {
    const socialMedia: { [key: string]: string } = {};
    
    Object.entries(this.SOCIAL_PATTERNS).forEach(([platform, pattern]) => {
      const match = text.match(pattern);
      if (match) {
        socialMedia[platform] = match[0];
      }
    });
    
    return socialMedia;
  }
}

// Classes are already exported individually above
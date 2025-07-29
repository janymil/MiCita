import { ProcessedBusinessData } from './scraping-orchestrator';

export interface CleanedBusinessData extends ProcessedBusinessData {}

export class DataCleaningService {
  cleanBusinessData(rawData: any): CleanedBusinessData {
    console.log('🧹 Cleaning and standardizing business data...');

    const cleaned: any = { ...rawData };

    // Clean and standardize phone numbers
    cleaned.phone = this.standardizePhoneNumber(cleaned.phone);

    // Validate and clean URLs
    cleaned.website = this.validateAndCleanUrl(cleaned.website);
    
    // Clean social media URLs
    if (cleaned.socialMedia) {
      cleaned.socialMedia = this.cleanSocialMediaUrls(cleaned.socialMedia);
    }

    // Standardize address format
    cleaned.address = this.standardizeAddress(cleaned.address);

    // Clean and validate images
    cleaned.galleryImages = this.validateImageUrls(cleaned.galleryImages || []);
    cleaned.profileImage = this.validateImageUrl(cleaned.profileImage);
    cleaned.coverImage = this.validateImageUrl(cleaned.coverImage);

    // Clean business name
    cleaned.name = this.cleanBusinessName(cleaned.name);

    // Clean description
    cleaned.description = this.cleanDescription(cleaned.description);

    // Remove empty/null values
    const finalCleaned = this.removeEmptyValues(cleaned);

    console.log('✅ Data cleaning completed');

    return finalCleaned;
  }

  private standardizePhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-numeric characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Handle Peru-specific phone number formatting
    if (cleaned.match(/^\d{9}$/)) {
      // 9-digit number, add Peru country code
      return `+51${cleaned}`;
    } else if (cleaned.match(/^51\d{9}$/)) {
      // Already has country code without +
      return `+${cleaned}`;
    } else if (cleaned.match(/^\+51\d{9}$/)) {
      // Already properly formatted
      return cleaned;
    }
    
    // Return as-is if doesn't match expected patterns
    return cleaned;
  }

  private validateAndCleanUrl(url: string): string {
    if (!url) return '';
    
    try {
      // Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      // Validate URL format
      new URL(url);
      return url;
    } catch (error) {
      console.warn('Invalid URL detected:', url);
      return '';
    }
  }

  private cleanSocialMediaUrls(socialMedia: any): any {
    const cleaned: any = {};
    
    Object.keys(socialMedia).forEach(platform => {
      const url = this.validateAndCleanUrl(socialMedia[platform]);
      if (url) {
        cleaned[platform] = url;
      }
    });
    
    return cleaned;
  }

  private standardizeAddress(address: string): string {
    if (!address) return '';
    
    // Basic address cleaning
    return address
      .trim()
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/,\s*,/g, ',') // Remove duplicate commas
      .replace(/^,|,$/, ''); // Remove leading/trailing commas
  }

  private validateImageUrls(images: string[]): string[] {
    if (!Array.isArray(images)) return [];
    
    return images
      .map(url => this.validateImageUrl(url))
      .filter(url => url !== '')
      .slice(0, 20); // Limit to 20 images
  }

  private validateImageUrl(url: string): string {
    if (!url) return '';
    
    try {
      // Check if it's a valid URL
      new URL(url);
      
      // Check if it's likely an image (basic check)
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const hasImageExtension = imageExtensions.some(ext => 
        url.toLowerCase().includes(ext)
      );
      
      // Accept URLs from common image hosting services even without extensions
      const imageHosts = ['facebook.com', 'instagram.com', 'googleapis.com', 'cloudfront.net'];
      const isFromImageHost = imageHosts.some(host => url.includes(host));
      
      if (hasImageExtension || isFromImageHost) {
        return url;
      }
      
      return '';
    } catch (error) {
      return '';
    }
  }

  private cleanBusinessName(name: string): string {
    if (!name) return '';
    
    return name
      .trim()
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/[^\w\s\-\.]/g, '') // Remove special characters except hyphens and dots
      .substring(0, 100); // Limit length
  }

  private cleanDescription(description: string): string {
    if (!description) return '';
    
    return description
      .trim()
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/\n+/g, '\n') // Multiple newlines to single newline
      .substring(0, 1000); // Limit length
  }

  private removeEmptyValues(obj: any): any {
    const cleaned: any = {};
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      
      if (value !== null && value !== undefined) {
        if (typeof value === 'string' && value.trim() !== '') {
          cleaned[key] = value.trim();
        } else if (Array.isArray(value) && value.length > 0) {
          cleaned[key] = value;
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          const cleanedNested = this.removeEmptyValues(value);
          if (Object.keys(cleanedNested).length > 0) {
            cleaned[key] = cleanedNested;
          }
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          cleaned[key] = value;
        }
      }
    });
    
    return cleaned;
  }

  // Peru-specific district standardization
  private standardizeDistrict(district: string): string {
    if (!district) return '';
    
    const districtMap: { [key: string]: string } = {
      'miraflores': 'Miraflores',
      'san isidro': 'San Isidro',
      'barranco': 'Barranco',
      'la molina': 'La Molina',
      'surco': 'Santiago de Surco',
      'san borja': 'San Borja',
      'comas': 'Comas',
      'los olivos': 'Los Olivos',
      'san martin de porres': 'San Martín de Porres',
      'callao': 'Callao'
    };
    
    const normalized = district.toLowerCase().trim();
    return districtMap[normalized] || this.capitalizeWords(district);
  }

  private capitalizeWords(str: string): string {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }
}

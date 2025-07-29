import { RawScrapedData, ProcessedBusinessData } from './scraping-orchestrator';

export interface MultiSourceData {
  facebook?: any;
  instagram?: any;
  googleMaps?: any;
  website?: any;
}

export class DataMergingService {
  mergeBusinessData(sources: RawScrapedData): ProcessedBusinessData {
    console.log('🔄 Merging data from multiple sources...');

    const priorityMap = {
      name: ['googleMaps', 'facebook', 'website', 'instagram'],
      description: ['facebook', 'googleMaps', 'instagram', 'website'],
      contact: ['googleMaps', 'facebook', 'website'],
      hours: ['googleMaps', 'facebook'],
      images: ['instagram', 'facebook', 'googleMaps'],
      reviews: ['googleMaps', 'facebook'],
      location: ['googleMaps', 'facebook']
    };

    const merged: any = {
      galleryImages: [],
      sources: []
    };

    // Track which sources provided data
    if (sources.facebook) merged.sources.push('Facebook');
    if (sources.instagram) merged.sources.push('Instagram');
    if (sources.googleMaps) merged.sources.push('Google Maps');

    // Merge name with priority
    merged.name = this.mergeField('name', sources, priorityMap.name) || 'Negocio';

    // Merge description
    merged.description = this.mergeField('description', sources, priorityMap.description) || '';

    // Merge contact information
    merged.phone = this.mergeField('phone', sources, priorityMap.contact) || '';
    merged.email = this.mergeField('email', sources, priorityMap.contact) || '';
    merged.website = this.mergeField('website', sources, priorityMap.contact) || '';
    merged.address = this.mergeField('address', sources, priorityMap.location) || '';

    // Merge category
    merged.category = this.mergeField('category', sources, priorityMap.name) || '';

    // Merge hours (prioritize Google Maps, then Facebook)
    merged.hours = sources.googleMaps?.hours || sources.facebook?.hours || {};

    // Merge images (combine from all sources)
    const allImages: string[] = [];
    if (sources.instagram?.galleryImages) allImages.push(...sources.instagram.galleryImages);
    if (sources.facebook?.galleryImages) allImages.push(...sources.facebook.galleryImages);
    if (sources.googleMaps?.images) allImages.push(...sources.googleMaps.images);
    
    // Remove duplicates and limit to 20 images
    merged.galleryImages = [...new Set(allImages)].slice(0, 20);

    // Select best profile image
    merged.profileImage = sources.facebook?.profileImage || 
                         sources.instagram?.profileImage || 
                         sources.googleMaps?.images?.[0] || '';

    // Select best cover image
    merged.coverImage = sources.facebook?.coverImage || 
                       merged.galleryImages[0] || '';

    // Merge ratings and reviews
    merged.rating = sources.googleMaps?.rating || sources.facebook?.rating;
    merged.reviewCount = sources.googleMaps?.reviewCount || sources.facebook?.reviewCount || 0;

    // Extract services (this could be enhanced with AI)
    merged.services = sources.facebook?.services || [];

    // Build social media links
    merged.socialMedia = {
      facebook: this.extractFacebookUrl(sources),
      instagram: this.extractInstagramUrl(sources),
    };

    // Calculate confidence score
    merged.confidenceScore = this.calculateConfidenceScore(merged, sources);

    console.log(`✅ Data merged from ${merged.sources.length} sources with ${merged.confidenceScore}% confidence`);

    return merged;
  }

  private mergeField(field: string, sources: RawScrapedData, priority: string[]): any {
    for (const source of priority) {
      const sourceData = sources[source as keyof RawScrapedData];
      if (sourceData && sourceData[field] && this.isValidValue(sourceData[field])) {
        return sourceData[field];
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

  private extractFacebookUrl(sources: RawScrapedData): string {
    // Try to reconstruct Facebook URL from available data
    if (sources.facebook?.name) {
      const slug = sources.facebook.name.toLowerCase().replace(/\s+/g, '');
      return `https://facebook.com/${slug}`;
    }
    return '';
  }

  private extractInstagramUrl(sources: RawScrapedData): string {
    // Instagram username is usually available
    if (sources.instagram?.username) {
      return `https://instagram.com/${sources.instagram.username}`;
    }
    return '';
  }

  private calculateConfidenceScore(merged: any, sources: RawScrapedData): number {
    const sourceCount = Object.keys(sources).filter(s => sources[s as keyof RawScrapedData]).length;
    const fieldCompleteness = this.calculateFieldCompleteness(merged);
    
    // Score based on source diversity (40%) and field completeness (60%)
    return Math.round((sourceCount / 3) * 40 + fieldCompleteness * 60);
  }

  private calculateFieldCompleteness(data: any): number {
    const importantFields = [
      'name', 'description', 'phone', 'email', 'address', 
      'category', 'profileImage', 'galleryImages'
    ];
    
    let completedFields = 0;
    
    importantFields.forEach(field => {
      if (this.isValidValue(data[field])) {
        completedFields++;
      }
    });
    
    return completedFields / importantFields.length;
  }
}

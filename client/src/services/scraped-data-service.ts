// Service to handle applying scraped data to different configuration sections

export interface ScrapedDataApplication {
  applyToBusinessSettings: (selectedData: any[], micrositeForm: any, setGalleryImages: any) => void;
  applyToGallery: (galleryImages: string[], businessId: string) => Promise<void>;
  applyToWorkingHours: (hours: any, micrositeForm: any) => void;
}

class ScrapedDataService {
  applyToBusinessSettings(selectedData: any[], micrositeForm: any, setGalleryImages: any) {
    selectedData.forEach(item => {
      switch (item.field) {
        case 'professionalTitle':
          micrositeForm.setValue("professionalTitle", item.value);
          break;
        case 'publicDescription':
          micrositeForm.setValue("publicDescription", item.value);
          break;
        case 'publicPhone':
          micrositeForm.setValue("publicPhone", item.value);
          break;
        case 'publicEmail':
          micrositeForm.setValue("publicEmail", item.value);
          break;
        case 'streetAddress':
          micrositeForm.setValue("streetAddress", item.value);
          break;
        case 'profileImage':
          micrositeForm.setValue("profileImage", item.value);
          break;
        case 'coverImage':
          micrositeForm.setValue("coverImage", item.value);
          break;
        case 'facebookUrl':
          micrositeForm.setValue("facebookUrl", item.value);
          break;
        case 'instagramUrl':
          micrositeForm.setValue("instagramUrl", item.value);
          break;
        case 'galleryImages':
          setGalleryImages(item.value);
          break;
        case 'workingHours':
          this.applyToWorkingHours(item.value, micrositeForm);
          break;
        default:
          console.log(`Unknown field: ${item.field}`);
      }
    });
  }

  applyToWorkingHours(hours: any, micrositeForm: any) {
    // Convert scraped hours format to the expected format
    const convertedHours: any = {};
    
    // Map common day name variations
    const dayMap: { [key: string]: string } = {
      'monday': 'monday',
      'tuesday': 'tuesday', 
      'wednesday': 'wednesday',
      'thursday': 'thursday',
      'friday': 'friday',
      'saturday': 'saturday',
      'sunday': 'sunday',
      'lunes': 'monday',
      'martes': 'tuesday',
      'miércoles': 'wednesday',
      'miercoles': 'wednesday',
      'jueves': 'thursday',
      'viernes': 'friday',
      'sábado': 'saturday',
      'sabado': 'saturday',
      'domingo': 'sunday'
    };

    Object.entries(hours).forEach(([day, schedule]: [string, any]) => {
      const normalizedDay = dayMap[day.toLowerCase()] || day.toLowerCase();
      
      if (schedule && typeof schedule === 'object') {
        convertedHours[normalizedDay] = {
          enabled: schedule.enabled !== false && schedule.open !== false,
          start: schedule.start || schedule.open || "09:00",
          end: schedule.end || schedule.close || "17:00"
        };
      }
    });

    micrositeForm.setValue("workingHours", convertedHours);
  }

  async applyToGallery(galleryImages: string[], businessId: string) {
    try {
      const response = await fetch(`/api/gallery/${businessId}/bulk-add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: galleryImages })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save gallery images');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error saving gallery images:', error);
      throw error;
    }
  }

  // Format data for different tabs/sections
  formatForContact(scrapedData: any) {
    return {
      phone: scrapedData.phone,
      email: scrapedData.email,
      address: scrapedData.address,
      businessName: scrapedData.name
    };
  }

  formatForSocial(scrapedData: any) {
    return {
      facebookUrl: scrapedData.socialMedia?.facebook,
      instagramUrl: scrapedData.socialMedia?.instagram,
      tiktokUrl: scrapedData.socialMedia?.tiktok,
      youtubeUrl: scrapedData.socialMedia?.youtube
    };
  }

  formatForBrand(scrapedData: any) {
    return {
      profileImage: scrapedData.profileImage,
      coverImage: scrapedData.coverImage,
      businessName: scrapedData.name,
      description: scrapedData.description
    };
  }

  formatForGallery(scrapedData: any) {
    return {
      images: scrapedData.galleryImages || [],
      profileImage: scrapedData.profileImage,
      coverImage: scrapedData.coverImage
    };
  }

  formatForSchedule(scrapedData: any) {
    return {
      workingHours: scrapedData.hours,
      scheduleNotes: scrapedData.scheduleNotes
    };
  }
}

export const scrapedDataService = new ScrapedDataService();

import { BellezaTemplate } from './belleza-template';
import { SaludTemplate } from './salud-template';
import { FitnessTemplate } from './fitness-template';
import { AutomortrizTemplate } from './automotriz-template';
import { RestauranteTemplate } from './restaurante-template';
import { CafeteriaTemplate } from './cafeteria-template';
import { EducacionTemplate } from './educacion-template';
import { HogarTemplate } from './hogar-template';
import { GeneralTemplate } from './general-template';

export interface MicrositioData {
  business: {
    id: number;
    name: string;
    description: string;
    category: string;
    phone: string;
    email: string;
    address: string;
    slug: string;
  };
  settings: {
    customUrl: string;
    professionalTitle?: string;
    publicDescription?: string;
    profileImage?: string;
    coverImage?: string;
    publicPhone?: string;
    publicEmail?: string;
    streetAddress?: string;
    district?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    tiktokUrl?: string;
    youtubeUrl?: string;
    enablePublicBooking: boolean;
    enableContactForm: boolean;
    enableGallery: boolean;
    scheduleNotes?: string;
  };
  services: Array<{
    id: number;
    name: string;
    description?: string;
    price: number;
    duration: number;
  }>;
  gallery: Array<{
    id: number;
    title?: string;
    imageUrl: string;
  }>;
  reviews: Array<{
    id: number;
    clientName: string;
    rating: number;
    comment?: string;
  }>;
}

interface MicrositioTemplateProps {
  data: MicrositioData;
}

export function getMicrositioTemplate(category: string) {
  switch (category) {
    case 'belleza':
      return BellezaTemplate;
    case 'salud':
      return SaludTemplate;
    case 'fitness':
      return FitnessTemplate;
    case 'automotriz':
      return AutomortrizTemplate;
    case 'restaurante':
      return RestauranteTemplate;
    case 'cafeteria':
      return CafeteriaTemplate;
    case 'educacion':
      return EducacionTemplate;
    case 'hogar':
      return HogarTemplate;
    default:
      return GeneralTemplate;
  }
}

export type { MicrositioTemplateProps };
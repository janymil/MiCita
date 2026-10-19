import OpenAI from 'openai';

interface BusinessData {
  name?: string;
  category?: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
  galleryImages?: string[];
  reviews?: Array<{
    author: string;
    rating: number;
    comment: string;
  }>;
}

interface AIGeneratedContent {
  enhancedDescription: string;
  tagline: string;
  services: Array<{
    name: string;
    description: string;
    benefits: string[];
  }>;
  whyChooseUs: Array<{
    title: string;
    description: string;
  }>;
  callToActions: string[];
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
}

interface MicrositioStructure {
  hero: {
    title: string;
    tagline: string;
    callToAction: string;
    backgroundImage?: string;
  };
  about: {
    title: string;
    content: string;
    description: string;
  };
  services: {
    title: string;
    list: Array<{
      name: string;
      description: string;
      icon: string;
    }>;
  };
  whyChooseUs: {
    title: string;
    reasons: Array<{
      title: string;
      description: string;
    }>;
  };
  contact: {
    title: string;
    phone?: string;
    website?: string;
    address?: string;
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      youtube?: string;
    };
  };
  gallery: {
    title: string;
    images: string[];
  };
  reviews: {
    title: string;
    rating?: number;
    reviewCount?: number;
    testimonials: Array<{
      author: string;
      rating: number;
      comment: string;
    }>;
  };
  seo: {
    title: string;
    metaDescription: string;
    keywords: string;
  };
}

export class AIContentGenerator {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async generateContent(businessData: BusinessData): Promise<AIGeneratedContent> {
    const prompt = this.buildContentPrompt(businessData);

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // the newest OpenAI model is "gpt-4o-mini" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "Eres un experto en marketing digital y creación de contenido para micrositios de negocios peruanos. Tu objetivo es crear contenido atractivo, profesional y optimizado para SEO que conecte con la audiencia peruana. Responde siempre en español con un tono profesional pero cercano."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content generated');
      }

      return JSON.parse(content) as AIGeneratedContent;

    } catch (error: any) {
      console.error('Error generating AI content:', error);
      throw new Error('Failed to generate AI content');
    }
  }

  async generateMicrositioStructure(
    businessData: BusinessData, 
    aiContent: AIGeneratedContent
  ): Promise<MicrositioStructure> {
    const structurePrompt = this.buildStructurePrompt(businessData, aiContent);

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // the newest OpenAI model is "gpt-4o-mini" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "Eres un diseñador web experto especializado en crear estructuras de micrositios para negocios peruanos. Crea estructuras visuales atractivas, organizadas y fáciles de navegar que maximicen las conversiones."
          },
          {
            role: "user",
            content: structurePrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No structure generated');
      }

      return JSON.parse(content) as MicrositioStructure;

    } catch (error: any) {
      console.error('Error generating micrositio structure:', error);
      throw new Error('Failed to generate micrositio structure');
    }
  }

  private buildContentPrompt(businessData: BusinessData): string {
    return `
Genera contenido optimizado para un micrositio basado en estos datos del negocio:

DATOS DEL NEGOCIO:
- Nombre: ${businessData.name || 'Mi Negocio'}
- Categoría: ${businessData.category || 'Servicios generales'}
- Descripción actual: ${businessData.description || 'Sin descripción'}
- Teléfono: ${businessData.phone || 'No disponible'}
- Email: ${businessData.email || 'No disponible'}
- Sitio web: ${businessData.website || 'No disponible'}
- Dirección: ${businessData.address || 'Lima, Perú'}
- Calificación: ${businessData.rating || 'Sin calificación'} estrellas
- Número de reseñas: ${businessData.reviewCount || 0}
- Redes sociales: ${JSON.stringify(businessData.socialMedia || {})}

RESEÑAS DE CLIENTES:
${businessData.reviews?.slice(0, 5).map(review => 
  `- ${review.author}: ${review.rating} estrellas - "${review.comment}"`
).join('\n') || 'Sin reseñas disponibles'}

TAREAS REQUERIDAS:
1. Crea una descripción mejorada del negocio (máximo 200 palabras)
2. Genera un eslogan atractivo (máximo 15 palabras)
3. Identifica y describe 3-5 servicios principales con beneficios
4. Crea 3-4 razones por las que elegir este negocio
5. Genera 3 llamadas a la acción efectivas
6. Crea título y meta descripción SEO optimizados
7. Genera 8-10 palabras clave relevantes

IMPORTANTE:
- Adapta todo al mercado peruano
- Usa un tono profesional pero cercano
- Incluye beneficios emocionales y prácticos
- Optimiza para búsquedas locales en Lima/Perú
- Respeta la categoría y tipo de negocio

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura:
{
  "enhancedDescription": "descripción mejorada del negocio",
  "tagline": "eslogan atractivo",
  "services": [
    {
      "name": "nombre del servicio",
      "description": "descripción del servicio",
      "benefits": ["beneficio 1", "beneficio 2", "beneficio 3"]
    }
  ],
  "whyChooseUs": [
    {
      "title": "razón principal",
      "description": "explicación detallada"
    }
  ],
  "callToActions": ["CTA 1", "CTA 2", "CTA 3"],
  "metaTitle": "título SEO optimizado",
  "metaDescription": "meta descripción SEO",
  "keywords": ["palabra1", "palabra2", "palabra3"]
}`;
  }

  private buildStructurePrompt(businessData: BusinessData, aiContent: AIGeneratedContent): string {
    return `
Crea la estructura completa de un micrositio profesional basado en:

DATOS DEL NEGOCIO:
- Nombre: ${businessData.name || 'Mi Negocio'}
- Categoría: ${businessData.category || 'Servicios'}
- Dirección: ${businessData.address || 'Lima, Perú'}
- Teléfono: ${businessData.phone || ''}
- Website: ${businessData.website || ''}
- Calificación: ${businessData.rating || 0} estrellas
- Reseñas: ${businessData.reviewCount || 0}

CONTENIDO IA GENERADO:
- Descripción: ${aiContent.enhancedDescription}
- Eslogan: ${aiContent.tagline}
- Servicios: ${JSON.stringify(aiContent.services)}
- Por qué elegirnos: ${JSON.stringify(aiContent.whyChooseUs)}
- CTAs: ${JSON.stringify(aiContent.callToActions)}

GALERÍA DE IMÁGENES:
${businessData.galleryImages?.slice(0, 6).join(', ') || 'Sin imágenes disponibles'}

RESEÑAS:
${businessData.reviews?.slice(0, 3).map(r => 
  `${r.author}: ${r.rating} estrellas - "${r.comment}"`
).join('; ') || 'Sin reseñas'}

CREA UNA ESTRUCTURA COMPLETA DE MICROSITIO:
1. Sección Hero con título, eslogan y CTA principal
2. Sección Acerca de Nosotros
3. Sección de Servicios con iconos
4. Sección Por qué Elegirnos
5. Sección de Contacto con datos reales
6. Sección de Galería con imágenes
7. Sección de Reseñas con testimonios
8. Datos SEO optimizados

IMPORTANTE:
- Usa los datos reales del negocio
- Integra el contenido IA generado
- Crea títulos atractivos para cada sección
- Asigna iconos relevantes a los servicios
- Organiza todo de manera profesional

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura:
{
  "hero": {
    "title": "título principal",
    "tagline": "eslogan",
    "callToAction": "CTA principal"
  },
  "about": {
    "title": "título de la sección",
    "content": "contenido detallado",
    "description": "descripción breve"
  },
  "services": {
    "title": "título de servicios",
    "list": [
      {
        "name": "nombre servicio",
        "description": "descripción",
        "icon": "icono-sugerido"
      }
    ]
  },
  "whyChooseUs": {
    "title": "título de la sección",
    "reasons": [
      {
        "title": "razón",
        "description": "explicación"
      }
    ]
  },
  "contact": {
    "title": "título de contacto",
    "phone": "${businessData.phone || ''}",
    "website": "${businessData.website || ''}",
    "address": "${businessData.address || ''}",
    "socialMedia": ${JSON.stringify(businessData.socialMedia || {})}
  },
  "gallery": {
    "title": "título de galería",
    "images": ${JSON.stringify(businessData.galleryImages?.slice(0, 6) || [])}
  },
  "reviews": {
    "title": "título de reseñas",
    "rating": ${businessData.rating || 0},
    "reviewCount": ${businessData.reviewCount || 0},
    "testimonials": ${JSON.stringify(businessData.reviews?.slice(0, 3) || [])}
  },
  "seo": {
    "title": "${aiContent.metaTitle}",
    "metaDescription": "${aiContent.metaDescription}",
    "keywords": "${aiContent.keywords.join(', ')}"
  }
}`;
  }

  async enhanceBusinessDescription(description: string, category: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // the newest OpenAI model is "gpt-4o-mini" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "Eres un copywriter experto especializado en negocios peruanos. Mejora las descripciones para que sean más atractivas y profesionales."
          },
          {
            role: "user",
            content: `Mejora esta descripción de negocio:
            
Categoría: ${category}
Descripción actual: ${description}

Crea una descripción mejorada que sea:
- Más atractiva y profesional
- Adaptada al mercado peruano
- Entre 100-150 palabras
- Que destaque beneficios únicos
- Con un tono cercano pero profesional`
          }
        ],
        temperature: 0.7
      });

      return response.choices[0].message.content || description;

    } catch (error: any) {
      console.error('Error enhancing description:', error);
      return description; // Fallback to original
    }
  }

  async generateServices(businessData: BusinessData): Promise<Array<{name: string, description: string}>> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // the newest OpenAI model is "gpt-4o-mini" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "Eres un consultor de negocios experto. Genera servicios relevantes basados en la información del negocio."
          },
          {
            role: "user",
            content: `Genera 3-5 servicios principales para este negocio:
            
Nombre: ${businessData.name}
Categoría: ${businessData.category}
Descripción: ${businessData.description}

Responde con un array JSON de servicios con "name" y "description".`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6
      });

      const content = response.choices[0].message.content;
      if (!content) return [];

      const result = JSON.parse(content);
      return result.services || [];

    } catch (error: any) {
      console.error('Error generating services:', error);
      return [];
    }
  }
}
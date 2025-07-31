import OpenAI from 'openai';

export interface EnhancedContent {
  enhanced: string;
  seoOptimized?: string;
  short?: string;
}

export class AIContentEnhancer {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async enhanceBusinessDescription(rawDescription: string, businessType: string): Promise<EnhancedContent> {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OpenAI API key not found, returning original description');
      return { enhanced: rawDescription };
    }

    try {
      console.log('🤖 Enhancing business description with AI...');

      const prompt = `
      Mejora esta descripción de negocio para un ${businessType} en Perú. Hazla profesional, atractiva y optimizada para SEO manteniendo el significado original:
      
      Descripción original: "${rawDescription}"
      
      Requisitos:
      - Tono profesional y amigable
      - 150-300 palabras
      - Incluir palabras clave relevantes para ${businessType}
      - Dirigido a clientes peruanos
      - Destacar propuesta de valor única
      - En español peruano
      `;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      });
      
      const enhanced = response.choices[0].message.content || rawDescription;
      
      console.log('✅ Description enhanced with AI');
      
      return {
        enhanced,
        seoOptimized: enhanced, // For now, using the same content
        short: this.createShortVersion(enhanced)
      };
      
    } catch (error) {
      console.error('❌ AI enhancement failed:', error);
      return { enhanced: rawDescription };
    }
  }

  async extractServices(description: string, businessType: string): Promise<string[]> {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OpenAI API key not found, returning empty services');
      return [];
    }

    try {
      console.log('🤖 Extracting services with AI...');

      const prompt = `
      Extrae los servicios específicos que ofrece este negocio ${businessType} basándote en la descripción:
      "${description}"
      
      Devuelve una lista JSON de servicios específicos (máximo 10 servicios).
      Formato: ["Servicio 1", "Servicio 2", "Servicio 3"]
      `;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 300
      });
      
      const content = response.choices[0].message.content || '[]';
      
      try {
        const services = JSON.parse(content);
        console.log('✅ Services extracted with AI:', services);
        return Array.isArray(services) ? services : [];
      } catch (parseError) {
        console.error('Failed to parse AI services response:', parseError);
        return [];
      }
      
    } catch (error) {
      console.error('❌ AI service extraction failed:', error);
      return [];
    }
  }

  async generateBusinessSummary(data: any): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
      return `${data.name} - ${data.category || 'Negocio'} ubicado en ${data.address || 'Lima, Perú'}`;
    }

    try {
      console.log('🤖 Generating business summary with AI...');

      const prompt = `
      Crea un resumen atractivo de 1-2 líneas para este negocio basándote en la información disponible:
      
      Nombre: ${data.name}
      Categoría: ${data.category || 'No especificada'}
      Descripción: ${data.description || 'No disponible'}
      Ubicación: ${data.address || 'Lima, Perú'}
      Servicios: ${data.services?.join(', ') || 'Servicios variados'}
      
      El resumen debe ser llamativo y profesional, destacando lo que hace único a este negocio.
      `;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 150
      });
      
      const summary = response.choices[0].message.content || `${data.name} - ${data.category}`;
      
      console.log('✅ Business summary generated with AI');
      return summary;
      
    } catch (error) {
      console.error('❌ AI summary generation failed:', error);
      return `${data.name} - ${data.category || 'Negocio'} en ${data.address || 'Lima, Perú'}`;
    }
  }

  async improveBusinessName(originalName: string, category: string): Promise<string> {
    if (!process.env.OPENAI_API_KEY || !originalName) {
      return originalName || 'Mi Negocio';
    }

    try {
      // Only improve if the name seems incomplete or generic
      if (originalName.length > 20 && !this.isGenericName(originalName)) {
        return originalName; // Name seems good already
      }

      const prompt = `
      Mejora este nombre de negocio para que sea más profesional y atractivo:
      
      Nombre actual: "${originalName}"
      Categoría: ${category}
      
      Requisitos:
      - Mantener el nombre original si es específico
      - Solo mejorar si es muy genérico o incompleto
      - Máximo 50 caracteres
      - Apropiado para el mercado peruano
      
      Devuelve solo el nombre mejorado, nada más.
      `;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 100
      });
      
      const improvedName = response.choices[0].message.content?.trim() || originalName;
      
      console.log('✅ Business name improved with AI');
      return improvedName;
      
    } catch (error) {
      console.error('❌ AI name improvement failed:', error);
      return originalName;
    }
  }

  private createShortVersion(text: string): string {
    // Create a short version by taking first 100 characters and ensuring it ends properly
    if (text.length <= 100) return text;
    
    const short = text.substring(0, 100);
    const lastSpace = short.lastIndexOf(' ');
    
    return lastSpace > 50 ? short.substring(0, lastSpace) + '...' : short + '...';
  }

  private isGenericName(name: string): boolean {
    const genericTerms = [
      'negocio', 'empresa', 'servicio', 'tienda', 'local',
      'business', 'company', 'service', 'shop', 'store'
    ];
    
    const lowerName = name.toLowerCase();
    return genericTerms.some(term => lowerName.includes(term)) && name.length < 15;
  }

  // Mock method for when OpenAI is not available
  private createBasicEnhancement(description: string, businessType: string): string {
    if (!description) return `Somos un ${businessType} comprometido con brindar servicios de calidad a nuestros clientes.`;
    
    return `${description} Nos especializamos en ofrecer servicios de ${businessType} de alta calidad, con atención personalizada y la mejor experiencia para nuestros clientes en Lima, Perú.`;
  }

  /**
   * COMPREHENSIVE CONTENT ENHANCEMENT
   * Enhances all scraped business data with AI improvements
   */
  async enhanceContent(businessData: any): Promise<any> {
    console.log('🤖 Enhancing comprehensive business data with AI...');
    
    try {
      const enhanced = { ...businessData };

      // Enhance description if available
      if (businessData.description && businessData.category) {
        const enhancedDesc = await this.enhanceBusinessDescription(
          businessData.description, 
          businessData.category
        );
        enhanced.description = enhancedDesc.enhanced;
      }

      // Extract services from description if not already available
      if (!businessData.services || businessData.services.length === 0) {
        if (businessData.description && businessData.category) {
          enhanced.services = await this.extractServices(
            businessData.description, 
            businessData.category
          );
        }
      }

      console.log('✅ Comprehensive content enhancement completed');
      return enhanced;

    } catch (error) {
      console.error('❌ Error enhancing content:', error);
      return businessData; // Return original data if enhancement fails
    }
  }
}

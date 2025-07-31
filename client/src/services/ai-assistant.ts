interface ChatContext {
  userId: string;
  businessId?: string;
  userDisplayName?: string;
  businessName?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

class AIAssistantService {
  private apiKey: string | null = null;
  private basePrompt = `Eres un asistente AI especializado en ayudar a propietarios de negocios a gestionar su plataforma de citas y servicios. 

Tu nombre es "MiCita Assistant" y tienes acceso a información del usuario y su negocio.

Puedes ayudar con:
- Consultas sobre citas (hoy, pendientes, completadas, canceladas)
- Información de clientes (nuevos, frecuentes, contactos)
- Reportes de servicios (más solicitados, ingresos)
- Análisis financiero básico
- Configuración de la plataforma
- Navegación y uso de funciones

IMPORTANTE: 
- Responde siempre en español
- Sé conciso pero útil
- Si no tienes datos específicos, explica qué tipo de información puedes proporcionar
- Sugiere acciones específicas cuando sea apropiado
- Mantén un tono profesional pero amigable`;

  constructor() {
    // En un entorno real, obtener la API key de variables de entorno
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || null;
  }

  async sendMessage(
    message: string, 
    context: ChatContext, 
    previousMessages: ChatMessage[] = []
  ): Promise<string> {
    try {
      // Si no hay API key, usar respuestas simuladas
      if (!this.apiKey) {
        return this.getSimulatedResponse(message, context);
      }

      // Preparar el contexto del sistema
      const systemMessage = this.buildSystemMessage(context);
      
      // Preparar mensajes para la API
      const messages = [
        { role: 'system', content: systemMessage },
        ...previousMessages.slice(-10).map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: message }
      ];

      // Llamar a la API de OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: messages,
          max_tokens: 300,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'Lo siento, no pude procesar tu consulta.';

    } catch (error) {
      console.error('Error calling AI service:', error);
      return this.getSimulatedResponse(message, context);
    }
  }

  private buildSystemMessage(context: ChatContext): string {
    const contextInfo = `
Usuario: ${context.userDisplayName || 'Usuario'}
Negocio: ${context.businessName || 'Mi Negocio'}
ID de Usuario: ${context.userId}
ID de Negocio: ${context.businessId || 'No configurado'}
`;

    return `${this.basePrompt}

Contexto del usuario actual:
${contextInfo}

Fecha actual: ${new Date().toLocaleDateString('es-ES', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}`;
  }

  private getSimulatedResponse(message: string, context: ChatContext): string {
    const lowerMessage = message.toLowerCase();
    
    // Respuestas específicas basadas en palabras clave
    if (lowerMessage.includes('citas') && lowerMessage.includes('hoy')) {
      return `Hola ${context.userDisplayName}! Para ver las citas de hoy, puedes ir a la sección "Citas" en el menú lateral o al "Dashboard" donde verás un resumen. ¿Te gustaría que te explique cómo navegar a alguna sección específica?`;
    }
    
    if (lowerMessage.includes('pendiente')) {
      return `Las citas pendientes se muestran en la sección "Citas" con el estado "Pendiente". También puedes verlas en el calendario con colores distintivos. ¿Necesitas ayuda para confirmar o gestionar alguna cita específica?`;
    }
    
    if (lowerMessage.includes('no se presentó') || lowerMessage.includes('no show')) {
      return `Para ver quién no se presentó, ve a "Citas" y filtra por el estado "No asistió" o revisa el historial de citas en el perfil de cada cliente. ¿Te gustaría saber cómo configurar recordatorios automáticos?`;
    }
    
    if (lowerMessage.includes('ingreso') || lowerMessage.includes('ganancia') || lowerMessage.includes('dinero')) {
      return `Puedes revisar tus ingresos en la sección "Finanzas" donde encontrarás reportes detallados por período, gráficos de tendencias y análisis de rentabilidad. ¿Quieres que te explique cómo interpretar los reportes?`;
    }
    
    if (lowerMessage.includes('cliente')) {
      return `En la sección "Clientes" puedes gestionar toda la información: perfiles detallados, historial de servicios, notas y preferencias. ¿Necesitas ayuda para buscar un cliente específico o agregar uno nuevo?`;
    }
    
    if (lowerMessage.includes('servicio')) {
      return `Los servicios se gestionan en la sección "Servicios" donde puedes crear, editar precios, duraciones y descripciones. ¿Quieres saber cómo optimizar la configuración de tus servicios?`;
    }
    
    if (lowerMessage.includes('micrositio')) {
      return `Tu micrositio es tu página web personalizada donde los clientes pueden agendar citas. Ve a "Micrositio" para personalizarlo con tu logo, colores y información. ¿Necesitas ayuda con la configuración?`;
    }
    
    if (lowerMessage.includes('ayuda') || lowerMessage.includes('como') || lowerMessage.includes('cómo')) {
      return `¡Estoy aquí para ayudarte! Puedo asistirte con:

📅 **Citas y Calendario:**
• Gestión de citas y disponibilidad
• Estados y seguimiento de citas

👥 **Clientes:**
• Información y historial de clientes  
• Gestión de contactos y notas

💼 **Servicios y Finanzas:**
• Configuración de servicios y precios
• Reportes de ingresos y análisis financiero

🌐 **Micrositio y Marketing:**
• Personalización de tu página web
• Optimización de presencia online

⚙️ **Configuración y Uso:**
• Navegación de la plataforma
• Configuración de preferencias y opciones

Simplemente pregúntame lo que necesites saber, por ejemplo:
"¿Cómo creo un nuevo servicio?" o "¿Cuáles fueron mis ingresos esta semana?"`;
    }

    // Respuesta por defecto
    return `Hola ${context.userDisplayName}! Soy tu asistente AI de MiCita. 

Puedo ayudarte con:

🏢 **Gestión del Negocio:**
• Consultas sobre citas, clientes e ingresos
• Análisis de rendimiento y estadísticas

📚 **Uso de la Plataforma:**
• Cómo usar cada función de la aplicación
• Navegación y configuración de opciones

💰 **Información Financiera:**
• Reportes de ingresos y análisis de ganancias
• Tendencias y métricas de tu negocio

❓ **Soporte General:**
• Resolución de dudas sobre funcionalidades
• Mejores prácticas y consejos de uso

¿En qué puedo ayudarte específicamente?`;
  }

  // Método para obtener datos reales del usuario (se implementaría con las APIs existentes)
  async getUserBusinessData(userId: string, businessId?: string) {
    try {
      // Aquí se harían las llamadas a las APIs para obtener datos reales
      // Por ahora retornamos datos simulados
      return {
        todayAppointments: 5,
        pendingAppointments: 3,
        monthlyRevenue: 2500,
        totalClients: 45,
        noShowThisWeek: 2
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }
}

export const aiAssistant = new AIAssistantService();
export type { ChatContext, ChatMessage };

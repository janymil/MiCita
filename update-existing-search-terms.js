import { db } from './server/db.js';
import { apifyBusinesses } from './shared/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Enhanced search terms generator for existing businesses
 */
function generateEnhancedSearchTerms(business) {
  const terms = new Set();
  
  // Business name variations
  if (business.name) {
    terms.add(business.name.toLowerCase());
    
    // Remove common suffixes
    const nameClean = business.name.toLowerCase()
      .replace(/\s+(sac|s\.a\.c\.|eirl|e\.i\.r\.l\.|srl|s\.r\.l\.|ltda|spa|salon|barberia|peluqueria)$/i, '')
      .trim();
    if (nameClean !== business.name.toLowerCase()) {
      terms.add(nameClean);
    }
    
    // Individual words
    business.name.toLowerCase().split(/\s+/).forEach(word => {
      if (word.length > 2) terms.add(word);
    });
  }
  
  // Category-specific keywords
  const categoryKeywords = {
    'belleza': [
      'salon', 'peluqueria', 'barberia', 'spa', 'belleza', 'corte', 'cabello',
      'manicure', 'pedicure', 'uñas', 'maquillaje', 'cejas', 'pestañas',
      'tratamiento', 'masaje', 'facial', 'depilacion', 'estetica'
    ],
    'salud': [
      'medico', 'doctor', 'clinica', 'hospital', 'consultorio', 'dentista',
      'odontologo', 'farmacia', 'laboratorio', 'psicologia', 'nutricion',
      'fisioterapia', 'rehabilitacion', 'emergencia', 'pediatria'
    ],
    'fitness': [
      'gimnasio', 'fitness', 'gym', 'crossfit', 'yoga', 'pilates',
      'entrenamiento', 'musculacion', 'cardio', 'zumba', 'spinning',
      'aerobicos', 'funcional', 'boxeo', 'artes marciales'
    ],
    'gastronomia': [
      'restaurante', 'comida', 'bar', 'cafeteria', 'cafe', 'pizzeria',
      'cevicheria', 'chifa', 'polleria', 'panaderia', 'pasteleria',
      'delivery', 'menu', 'almuerzo', 'cena', 'desayuno'
    ],
    'servicios': [
      'servicio', 'reparacion', 'mantenimiento', 'limpieza', 'consultoria',
      'asesoria', 'legal', 'contabilidad', 'arquitectura', 'ingenieria',
      'construccion', 'seguridad', 'transporte', 'delivery'
    ],
    'automotriz': [
      'taller', 'mecanico', 'auto', 'carro', 'vehiculo', 'repuesto',
      'llanta', 'gasolinera', 'grifo', 'lavado', 'lubricante',
      'bateria', 'frenos', 'motor', 'transmision'
    ]
  };
  
  if (business.category && categoryKeywords[business.category]) {
    categoryKeywords[business.category].forEach(keyword => terms.add(keyword));
  }
  
  // Location terms from address
  if (business.address) {
    const addressLower = business.address.toLowerCase();
    
    // Lima districts
    const districts = [
      'miraflores', 'san isidro', 'barranco', 'surco', 'la molina',
      'jesus maria', 'lince', 'magdalena', 'pueblo libre', 'breña',
      'rimac', 'cercado', 'san miguel', 'callao', 'chorrillos',
      'surquillo', 'san borja', 'providencia', 'independencia'
    ];
    
    districts.forEach(district => {
      if (addressLower.includes(district)) {
        terms.add(district);
      }
    });
    
    // Add original address terms
    terms.add(business.address.toLowerCase());
  }
  
  // Contact information
  if (business.phone) {
    terms.add(business.phone.replace(/\D/g, ''));
  }
  
  if (business.website) {
    const domain = business.website.replace(/https?:\/\//, '').split('/')[0];
    terms.add(domain);
    terms.add(domain.replace(/^www\./, ''));
  }
  
  if (business.email) {
    const domain = business.email.split('@')[1];
    if (domain) terms.add(domain);
  }
  
  return Array.from(terms).join(' ');
}

async function updateSearchTerms() {
  console.log('🔍 Starting search terms update for existing businesses...');
  
  try {
    // Get all businesses
    const businesses = await db.select().from(apifyBusinesses);
    console.log(`📊 Found ${businesses.length} businesses to update`);
    
    let updated = 0;
    const batchSize = 50;
    
    for (let i = 0; i < businesses.length; i += batchSize) {
      const batch = businesses.slice(i, i + batchSize);
      
      const updates = batch.map(business => {
        const enhancedSearchTerms = generateEnhancedSearchTerms(business);
        
        return db.update(apifyBusinesses)
          .set({ searchTerms: enhancedSearchTerms })
          .where(eq(apifyBusinesses.placeId, business.placeId));
      });
      
      await Promise.all(updates);
      updated += batch.length;
      
      console.log(`✅ Updated ${updated}/${businesses.length} businesses`);
    }
    
    console.log('🎉 Search terms update completed successfully!');
    console.log(`📈 Enhanced search terms for ${updated} businesses`);
    console.log('Your businesses are now much more discoverable!');
    
  } catch (error) {
    console.error('❌ Error updating search terms:', error);
  }
}

updateSearchTerms();
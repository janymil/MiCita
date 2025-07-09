const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/home/runner/workspace/attached_assets/dataset_crawler-google-places_2025-07-09_17-56-49-308.json', 'utf8'));

console.log('🗂️ CATEGORY MAPPING TO YOUR SYSTEM');
console.log('=================================');

// Define your system categories
const systemCategories = {
  belleza: ['Barbería', 'Centro de estética', 'Peluquería', 'Salón de manicura y pedicura', 'Spa', 'Tienda de productos de belleza', 'Proveedor de productos de belleza', 'Tienda de belleza y salud', 'Tienda de cosméticos', 'Academia de estética', 'Centro de depilación láser', 'Esteticista facial', 'Balneario'],
  salud: ['Clínica ambulatoria', 'Farmacia', 'Centro médico', 'Psicólogo', 'Dentista', 'Clínica dental', 'Oftalmólogo', 'Veterinario', 'Laboratorio clínico', 'Fisioterapeuta', 'Nutricionista'],
  gastronomia: ['Restaurante', 'Cafetería', 'Panadería', 'Bar', 'Pizzería', 'Heladería', 'Comida rápida'],
  fitness: ['Gimnasio', 'Centro de yoga', 'Estudio de pilates', 'Centro de fitness', 'Entrenador personal'],
  servicios: ['Centro comercial', 'Abogado', 'Contador', 'Inmobiliaria', 'Notario', 'Consultor', 'Agencia de seguros', 'Banco', 'Tecnología', 'Limpieza', 'Seguridad', 'Construcción', 'Arquitecto', 'Diseñador', 'Publicidad'],
  automotriz: ['Taller mecánico', 'Lavado de autos', 'Gasolinera', 'Tienda de repuestos', 'Concesionario', 'Lubricentro', 'Vulcanizadora']
};

// Count businesses by your system categories
const systemCounts = {};
Object.keys(systemCategories).forEach(cat => systemCounts[cat] = 0);
systemCounts['otros'] = 0;

data.forEach(business => {
  const category = business.categoryName || 'Unknown';
  let mapped = false;
  
  for (const [systemCat, keywords] of Object.entries(systemCategories)) {
    if (keywords.includes(category)) {
      systemCounts[systemCat]++;
      mapped = true;
      break;
    }
  }
  
  if (!mapped) {
    systemCounts['otros']++;
  }
});

console.log('MAPPED TO YOUR SYSTEM CATEGORIES:');
Object.entries(systemCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([category, count]) => {
    const percentage = ((count / data.length) * 100).toFixed(1);
    console.log(`  ${category}: ${count} businesses (${percentage}%)`);
  });

// Show unmapped categories
console.log('\n🔍 UNMAPPED CATEGORIES:');
const unmappedCategories = {};
data.forEach(business => {
  const category = business.categoryName || 'Unknown';
  let mapped = false;
  
  for (const [systemCat, keywords] of Object.entries(systemCategories)) {
    if (keywords.includes(category)) {
      mapped = true;
      break;
    }
  }
  
  if (!mapped) {
    unmappedCategories[category] = (unmappedCategories[category] || 0) + 1;
  }
});

Object.entries(unmappedCategories)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .forEach(([category, count]) => {
    console.log(`  ${category}: ${count} businesses`);
  });
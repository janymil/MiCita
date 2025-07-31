// Business categories for public search
export const BUSINESS_CATEGORIES = [
  {
    id: "gastronomia",
    name: "Gastronomía", 
    icon: "utensils",
    color: "bg-gradient-to-br from-orange-500 to-red-500",
    description: "Restaurantes, cafés, comida"
  },
  {
    id: "belleza",
    name: "Belleza",
    icon: "cut", 
    color: "bg-gradient-to-br from-pink-500 to-purple-500",
    description: "Peluquerías, salones, spas"
  },
  {
    id: "servicios",
    name: "Servicios",
    icon: "settings",
    color: "bg-gradient-to-br from-blue-500 to-indigo-500", 
    description: "Servicios profesionales"
  },
  {
    id: "salud",
    name: "Salud",
    icon: "heartbeat",
    color: "bg-gradient-to-br from-green-500 to-teal-500",
    description: "Médicos, clínicas, dentistas"
  },
  {
    id: "fitness", 
    name: "Fitness",
    icon: "dumbbell",
    color: "bg-gradient-to-br from-red-500 to-orange-500",
    description: "Gimnasios, deportes, entrenamiento"
  },
  {
    id: "educacion",
    name: "Educación",
    icon: "graduation-cap",
    color: "bg-gradient-to-br from-indigo-500 to-purple-500",
    description: "Escuelas, academias, cursos"
  },
  {
    id: "automotriz",
    name: "Automotriz", 
    icon: "car",
    color: "bg-gradient-to-br from-gray-600 to-gray-800",
    description: "Talleres, repuestos, servicios"
  },
  {
    id: "hogar",
    name: "Hogar",
    icon: "home", 
    color: "bg-gradient-to-br from-yellow-500 to-orange-500",
    description: "Decoración, reparaciones"
  }
];

// Peruvian cities for location filtering
export const PERUVIAN_CITIES = [
  "Lima",
  "Arequipa", 
  "Trujillo",
  "Chiclayo",
  "Piura",
  "Iquitos",
  "Cusco",
  "Huancayo",
  "Chimbote",
  "Tacna",
  "Ica",
  "Puno",
  "Sullana",
  "Cajamarca",
  "Ayacucho",
  "Juliaca",
  "Huánuco",
  "Tumbes",
  "Talara",
  "Jaén"
];

// Districts by city for detailed location filtering
export const CITY_DISTRICTS: Record<string, string[]> = {
  "Lima": [
    "Miraflores", "San Isidro", "Barranco", "Surco", "La Molina",
    "San Borja", "Pueblo Libre", "Magdalena", "Jesús María", "Lince",
    "Cercado de Lima", "Breña", "La Victoria", "Rímac", "San Luis",
    "Chorrillos", "Villa El Salvador", "Villa María del Triunfo",
    "San Juan de Miraflores", "Surquillo", "Miraflores", "Barranco",
    "Comas", "Independencia", "Los Olivos", "San Martín de Porres",
    "Puente Piedra", "Carabayllo", "Ancón", "Santa Rosa",
    "Ate", "Chaclacayo", "Cieneguilla", "El Agustino", "La Molina",
    "Lurigancho", "San Juan de Lurigancho", "Santa Anita"
  ],
  "Arequipa": [
    "Cercado", "Cayma", "Cerro Colorado", "Characato", "Chiguata",
    "Jacobo Hunter", "La Joya", "Mariano Melgar", "Miraflores",
    "Mollebaya", "Paucarpata", "Pocsi", "Polobaya", "Quequeña",
    "Sabandia", "Sachaca", "San Juan de Siguas", "San Juan de Tarucani",
    "Santa Isabel de Siguas", "Santa Rita de Siguas", "Socabaya",
    "Tiabaya", "Uchumayo", "Vitor", "Yanahuara", "Yarabamba", "Yura"
  ],
  "Cusco": [
    "Cusco", "Ccorca", "Poroy", "San Jerónimo", "San Sebastián",
    "Santiago", "Saylla", "Wanchaq"
  ]
};

// Sort and rating options for search
export const SORT_OPTIONS = [
  { value: "relevance", label: "Relevancia" },
  { value: "rating", label: "Mejor valorados" },
  { value: "distance", label: "Más cercanos" },
  { value: "newest", label: "Más nuevos" },
  { value: "name", label: "Nombre A-Z" }
];

// Rating filters  
export const RATING_FILTERS = [
  { value: 0, label: "Todas las valoraciones" },
  { value: 3, label: "3+ estrellas" },
  { value: 4, label: "4+ estrellas" },
  { value: 4.5, label: "4.5+ estrellas" }
];

// Price level indicators
export const PRICE_LEVELS = [
  { value: 1, label: "$", description: "Económico" },
  { value: 2, label: "$$", description: "Moderado" },
  { value: 3, label: "$$$", description: "Costoso" },
  { value: 4, label: "$$$$", description: "Muy costoso" }
];

// Business hours for filtering
export const HOURS_FILTERS = [
  { value: "all", label: "Cualquier horario" },
  { value: "open_now", label: "Abierto ahora" },
  { value: "24_hours", label: "24 horas" },
  { value: "weekend", label: "Abierto fines de semana" }
];

// Features/amenities filters
export const FEATURE_FILTERS = [
  { id: "hasPhone", label: "Tiene teléfono", icon: "phone" },
  { id: "hasWebsite", label: "Tiene sitio web", icon: "globe" },
  { id: "hasEmail", label: "Tiene email", icon: "mail" },
  { id: "hasParking", label: "Estacionamiento", icon: "car" },
  { id: "acceptsCards", label: "Acepta tarjetas", icon: "credit-card" },
  { id: "hasWifi", label: "WiFi gratis", icon: "wifi" },
  { id: "wheelchairAccessible", label: "Accesible", icon: "accessibility" },
  { id: "petFriendly", label: "Pet friendly", icon: "heart" }
];

export default {
  BUSINESS_CATEGORIES,
  PERUVIAN_CITIES,
  CITY_DISTRICTS,
  SORT_OPTIONS,
  RATING_FILTERS,
  PRICE_LEVELS,
  HOURS_FILTERS,
  FEATURE_FILTERS
};
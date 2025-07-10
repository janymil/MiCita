import { Search, Heart, Dumbbell, Utensils, Coffee, Car, GraduationCap, HomeIcon } from "lucide-react";

export const PERUVIAN_CITIES = [
  "Lima", "Arequipa", "Trujillo", "Chiclayo", "Piura", "Iquitos", 
  "Cusco", "Chimbote", "Huancayo", "Tacna", "Ica", "Juliaca",
  "Cajamarca", "Pucallpa", "Sullana", "Ayacucho", "Chincha Alta",
  "Huánuco", "Tarapoto", "Puno", "Tumbes", "Talara", "Jaén",
  "Huaraz", "Chulucanas", "Ilo", "Bagua Grande", "Pisco"
];

// Districts by city mapping for dynamic district filtering
export const CITY_DISTRICTS = {
  "Lima": [
    "Cercado de Lima", "Miraflores", "San Isidro", "Barranco", "Surco", 
    "La Molina", "San Borja", "Jesús María", "Lince", "Magdalena", 
    "Pueblo Libre", "Breña", "San Miguel", "Chorrillos", "Villa El Salvador",
    "San Juan de Miraflores", "Villa María del Triunfo", "Los Olivos",
    "Comas", "Independencia", "San Martín de Porres", "Rímac", "Ate",
    "Santa Anita", "El Agustino", "La Victoria", "San Luis", "Callao"
  ].sort(),
  "Arequipa": [
    "Cercado", "Cayma", "Cerro Colorado", "Characato", "Chiguata",
    "Jacobo Hunter", "La Joya", "Mariano Melgar", "Miraflores",
    "Mollebaya", "Paucarpata", "Pocsi", "Polobaya", "Quequeña",
    "Sabandia", "Sachaca", "San Juan de Siguas", "San Juan de Tarucani",
    "Santa Isabel de Siguas", "Santa Rita de Siguas", "Socabaya",
    "Tiabaya", "Uchumayo", "Vitor", "Yanahuara", "Yarabamba", "Yura"
  ].sort(),
  "Trujillo": [
    "Trujillo", "El Porvenir", "Florencia de Mora", "Huanchaco",
    "La Esperanza", "Laredo", "Moche", "Poroto", "Salaverry",
    "Simbal", "Victor Larco Herrera"
  ].sort(),
  "Chiclayo": [
    "Chiclayo", "Chongoyape", "Eten", "Eten Puerto", "José Leonardo Ortiz",
    "La Victoria", "Lagunas", "Lambayeque", "Monsefú", "Motupe",
    "Olmos", "Pacora", "Pimentel", "Pítipo", "Pomalca", "Pucalá",
    "Puerto Eten", "Reque", "Santa Rosa", "Saña", "Túcume"
  ].sort(),
  "Cusco": [
    "Cusco", "Ccorca", "Poroy", "San Jerónimo", "San Sebastián",
    "Santiago", "Saylla", "Wanchaq"
  ].sort(),
  "Piura": [
    "Piura", "Castilla", "Catacaos", "Cura Mori", "El Tallán",
    "La Arena", "La Unión", "Las Lomas", "Tambo Grande"
  ].sort()
};

export const DEFAULT_BUSINESS_HOURS = {
  monday: { open: "09:00", close: "18:00", closed: false },
  tuesday: { open: "09:00", close: "18:00", closed: false },
  wednesday: { open: "09:00", close: "18:00", closed: false },
  thursday: { open: "09:00", close: "18:00", closed: false },
  friday: { open: "09:00", close: "18:00", closed: false },
  saturday: { open: "09:00", close: "17:00", closed: false },
  sunday: { open: "10:00", close: "16:00", closed: true }
};

export const APPOINTMENT_STATUSES = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Confirmada", color: "bg-green-100 text-green-800" },
  completed: { label: "Completada", color: "bg-blue-100 text-blue-800" },
  cancelled: { label: "Cancelada", color: "bg-red-100 text-red-800" },
  rescheduled: { label: "Reprogramada", color: "bg-purple-100 text-purple-800" },
  no_show: { label: "No Asistió", color: "bg-gray-100 text-gray-800" }
};

export const BUSINESS_CATEGORIES = [
  {
    id: "gastronomia",
    name: "Gastronomía",
    icon: "utensils",
    color: "category-gastronomia",
    description: "Restaurantes, cafés, comida"
  },
  {
    id: "belleza",
    name: "Belleza",
    icon: "cut",
    color: "category-belleza",
    description: "Peluquerías, salones, spas"
  },
  {
    id: "servicios",
    name: "Servicios",
    icon: "settings",
    color: "category-servicios",
    description: "Servicios profesionales"
  },
  {
    id: "salud",
    name: "Salud",
    icon: "heartbeat",
    color: "category-salud",
    description: "Médicos, clínicas, dentistas"
  },
  {
    id: "fitness",
    name: "Fitness",
    icon: "dumbbell",
    color: "category-fitness",
    description: "Gimnasios, deportes, entrenamiento"
  }
];

// Alias for backwards compatibility
export const categories = BUSINESS_CATEGORIES;

import { Search, Heart, Dumbbell, Utensils, Coffee, Car, GraduationCap, HomeIcon } from "lucide-react";

export const PERUVIAN_CITIES = [
  "Lima", "Arequipa", "Trujillo", "Chiclayo", "Piura", "Iquitos", 
  "Cusco", "Chimbote", "Huancayo", "Tacna", "Ica", "Juliaca",
  "Cajamarca", "Pucallpa", "Sullana", "Ayacucho", "Chincha Alta",
  "Huánuco", "Tarapoto", "Puno", "Tumbes", "Talara", "Jaén",
  "Huaraz", "Chulucanas", "Ilo", "Bagua Grande", "Pisco"
];

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
  no_show: { label: "No asistió", color: "bg-gray-100 text-gray-800" }
};

export const BUSINESS_CATEGORIES = [
  {
    id: "belleza",
    name: "Belleza",
    icon: "cut",
    color: "category-belleza",
    description: "Peluquerías, salones de belleza, spas"
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
  },
  {
    id: "restaurante",
    name: "Restaurantes",
    icon: "utensils",
    color: "category-restaurante",
    description: "Comida, restaurantes, delivery"
  },
  {
    id: "cafeteria",
    name: "Cafeterías",
    icon: "coffee",
    color: "category-cafeteria",
    description: "Coffee shops, cafés, postres"
  },
  {
    id: "automotriz",
    name: "Automotriz",
    icon: "car",
    color: "category-automotriz",
    description: "Mecánica, talleres, repuestos"
  },
  {
    id: "educacion",
    name: "Educación",
    icon: "graduation-cap",
    color: "category-educacion",
    description: "Escuelas, universidades, cursos"
  },
  {
    id: "hogar",
    name: "Hogar", 
    icon: "homeicon",
    color: "category-hogar",
    description: "Reparaciones, limpieza, jardinería"
  }
];

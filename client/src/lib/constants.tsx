import { Search, Heart, Dumbbell, Utensils, Coffee, Car, GraduationCap, Home } from "lucide-react";

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
    icon: "home",
    color: "category-hogar",
    description: "Reparaciones, limpieza, jardinería"
  }
];

export const APPOINTMENT_STATUSES = {
  scheduled: { label: "Programada", color: "bg-blue-100 text-blue-800" },
  confirmed: { label: "Confirmada", color: "bg-green-100 text-green-800" },
  completed: { label: "Completada", color: "bg-gray-100 text-gray-800" },
  cancelled: { label: "Cancelada", color: "bg-red-100 text-red-800" }
};

export const DEFAULT_BUSINESS_HOURS = {
  monday: { open: "09:00", close: "18:00", closed: false },
  tuesday: { open: "09:00", close: "18:00", closed: false },
  wednesday: { open: "09:00", close: "18:00", closed: false },
  thursday: { open: "09:00", close: "18:00", closed: false },
  friday: { open: "09:00", close: "18:00", closed: false },
  saturday: { open: "10:00", close: "16:00", closed: false },
  sunday: { closed: true }
};

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
  "Tacna"
];

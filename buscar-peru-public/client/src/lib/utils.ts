import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format business rating
export function formatRating(rating: string | number | null): number {
  if (!rating) return 0;
  const num = typeof rating === 'string' ? parseFloat(rating) : rating;
  return isNaN(num) ? 0 : Math.round(num * 10) / 10;
}

// Format review count
export function formatReviewCount(count: number | null): string {
  if (!count || count === 0) return "Sin reseñas";
  if (count === 1) return "1 reseña";
  if (count < 1000) return `${count} reseñas`;
  if (count < 1000000) return `${(count / 1000).toFixed(1)}k reseñas`;
  return `${(count / 1000000).toFixed(1)}M reseñas`;
}

// Format distance
export function formatDistance(distance: number | null): string {
  if (!distance) return "";
  if (distance < 1) return `${Math.round(distance * 1000)}m`;
  return `${distance.toFixed(1)}km`;
}

// Truncate text
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
}

// Format phone number for Peru
export function formatPhoneNumber(phone: string | null): string {
  if (!phone) return "";
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "");
  
  // Peru phone number formatting
  if (cleaned.length === 9) {
    // Mobile: 9XX XXX XXX
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  } else if (cleaned.length === 7) {
    // Landline: XXX XXXX
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith("51")) {
    // International format: +51 9XX XXX XXX
    const localNumber = cleaned.slice(2);
    return `+51 ${localNumber.slice(0, 3)} ${localNumber.slice(3, 6)} ${localNumber.slice(6)}`;
  }
  
  return phone; // Return original if doesn't match expected patterns
}

// Generate business URL slug
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Check if business is open now
export function isBusinessOpen(hours: any): boolean {
  if (!hours || typeof hours !== 'object') return false;
  
  const now = new Date();
  const currentDay = now.toLocaleLowerCase().substring(0, 3); // mon, tue, etc.
  const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight
  
  const dayHours = hours[currentDay];
  if (!dayHours || dayHours === 'closed') return false;
  
  // Parse hours like "09:00-18:00"
  const timeRange = dayHours.split('-');
  if (timeRange.length !== 2) return false;
  
  const [openTime, closeTime] = timeRange.map((time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  });
  
  return currentTime >= openTime && currentTime <= closeTime;
}

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Debounce function for search inputs
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Format business address for Peru
export function formatAddress(address: string | null, district?: string, city?: string): string {
  if (!address) return "";
  
  let formatted = address;
  
  // Add district and city if not already present
  if (district && !formatted.toLowerCase().includes(district.toLowerCase())) {
    formatted += `, ${district}`;
  }
  
  if (city && !formatted.toLowerCase().includes(city.toLowerCase())) {
    formatted += `, ${city}`;
  }
  
  return formatted;
}

// Extract coordinates from various formats
export function extractCoordinates(location: any): { lat: number; lng: number } | null {
  if (!location) return null;
  
  // Handle different coordinate formats
  if (typeof location === 'object') {
    if (location.lat !== undefined && location.lng !== undefined) {
      return { lat: Number(location.lat), lng: Number(location.lng) };
    }
    if (location.latitude !== undefined && location.longitude !== undefined) {
      return { lat: Number(location.latitude), lng: Number(location.longitude) };
    }
  }
  
  // Handle string format "lat,lng"
  if (typeof location === 'string') {
    const parts = location.split(',');
    if (parts.length === 2) {
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
  }
  
  return null;
}
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Peruvian date formatting utilities
export function formatDatePeruvian(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${day}/${month}/${year}`;
}

export function formatDateTimePeruvian(date: string | Date, time?: string): string {
  const formattedDate = formatDatePeruvian(date);
  if (time) {
    return `${formattedDate} a las ${time}`;
  }
  return formattedDate;
}

export function formatDateISO(date: string): string {
  // Convert DD/MM/YYYY to YYYY-MM-DD for HTML date inputs
  if (date.includes('/')) {
    const [day, month, year] = date.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return date;
}

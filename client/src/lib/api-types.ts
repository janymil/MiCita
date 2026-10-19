/**
 * Shared client-side shapes for dashboard API responses.
 *
 * These mirror the Drizzle tables in `shared/schema.ts` but keep only the
 * fields the UI reads, and make nullable columns explicit so components are
 * forced to handle them.
 */

export interface BusinessSummary {
  id: number;
  name: string;
  slug?: string | null;
  category?: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  isPremium?: boolean | null;
}

export interface ClientRecord {
  id: number;
  businessId?: number | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  totalAppointments?: number | null;
  lastVisit?: string | null;
  createdAt?: string | null;
}

export interface ServiceRecord {
  id: number;
  businessId?: number | null;
  name: string;
  description?: string | null;
  price?: string | null;
  duration?: number | null;
  isActive?: boolean | null;
  createdAt?: string | null;
}

export interface AppointmentRecord {
  id: number;
  businessId?: number | null;
  clientId?: number | null;
  serviceId?: number | null;
  date: string;
  time: string;
  duration?: number | null;
  status: string;
  notes?: string | null;
  clientNotes?: string | null;
  price?: string | null;
  createdAt?: string | null;
  /** Joined fields some endpoints return. */
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  serviceName?: string | null;
}

export interface NetworkingStats {
  connectionCount?: number;
  postsCount?: number;
  collaborationsCount?: number;
  eventsOrganized?: number;
  [key: string]: unknown;
}

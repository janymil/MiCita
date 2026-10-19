import type {
  InsertUser,
  InsertBusiness,
  InsertService,
  InsertClient,
  InsertAppointment,
  InsertGalleryItem,
  InsertReview,
  InsertBusinessSettings,
  InsertApifyBusiness,
  User,
  Business,
  Service,
  Client,
  Appointment,
  GalleryItem,
  Review,
  BusinessSettings,
  ApifyBusiness,
  PublicBusiness,
  Payment,
  MicrositeEvent,
  InsertMicrositeEvent,
  ContactMessage,
  InsertContactMessage,
} from "../shared/schema.js";

/**
 * Storage contract implemented by the Postgres-backed store.
 *
 * The previous in-memory `MemStorage` fallback was removed: it silently
 * returned empty data and had drifted far behind this interface. The app
 * requires a database (Neon in production), so there is exactly one
 * implementation — `DBStorage`.
 */
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Businesses
  getBusiness(id: number): Promise<Business | undefined>;
  getBusinessBySlug(slug: string): Promise<Business | undefined>;
  getBusinessesByCategory(category: string): Promise<Business[]>;
  getBusinessesByUserId(userId: number): Promise<Business[]>;
  searchBusinesses(query: string, category?: string, city?: string): Promise<Business[]>;
  getAllActiveBusinesses(): Promise<Business[]>;
  getAllPublicBusinesses(): Promise<PublicBusiness[]>;
  getFeaturedBusinesses(): Promise<Business[]>;
  createBusiness(business: InsertBusiness & { userId: number }): Promise<Business>;
  updateBusiness(id: number, business: Partial<InsertBusiness>): Promise<Business>;
  deleteBusiness(id: number): Promise<void>;

  // Services
  getServicesByBusinessId(businessId: number): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService & { businessId: number }): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service>;
  deleteService(id: number): Promise<void>;

  // Clients
  getClientsByBusinessId(businessId: number): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient & { businessId: number }): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number): Promise<void>;

  // Appointments
  getAppointmentsByBusinessId(businessId: number): Promise<Appointment[]>;
  getAppointmentsByDate(businessId: number, date: string): Promise<Appointment[]>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment & { businessId: number }): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: number): Promise<void>;

  // Gallery
  getGalleryByBusinessId(businessId: number): Promise<GalleryItem[]>;
  createGalleryItem(item: InsertGalleryItem & { businessId: number }): Promise<GalleryItem>;
  deleteGalleryItem(id: number): Promise<void>;

  // Public businesses
  getPublicBusinesses(): Promise<PublicBusiness[]>;
  searchPublicBusinesses(query: string, category?: string): Promise<PublicBusiness[]>;

  // Reviews
  getReviewsByBusinessId(businessId: number): Promise<Review[]>;
  getApprovedReviewsByBusinessId(businessId: number): Promise<Review[]>;
  getReview(id: number): Promise<Review | undefined>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: number, review: Partial<InsertReview>): Promise<Review>;
  deleteReview(id: number): Promise<void>;
  recomputeBusinessRating(businessId: number): Promise<void>;

  // Business settings
  getBusinessSettings(businessId: number): Promise<BusinessSettings | undefined>;
  getBusinessSettingsByCustomUrl(customUrl: string): Promise<BusinessSettings | undefined>;
  getPublishedMicrosites(): Promise<Array<{ businessId: number; customUrl: string; businessName: string; updatedAt: Date | null }>>;
  updateBusinessSettings(businessId: number, settings: InsertBusinessSettings): Promise<BusinessSettings>;

  // Microsite traffic
  createMicrositeEvent(event: InsertMicrositeEvent): Promise<MicrositeEvent>;
  getMicrositeEvents(businessId: number, fromISO: string, toISO: string): Promise<MicrositeEvent[]>;

  // Contact inbox
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  getContactMessages(businessId: number, status?: string): Promise<ContactMessage[]>;
  updateContactMessage(id: number, patch: Partial<InsertContactMessage> & { status?: string }): Promise<ContactMessage | undefined>;

  // Lifecycle
  getAppointmentByCancelToken(token: string): Promise<Appointment | undefined>;
  getAppointmentsNeedingReminder(fromISO: string, toISO: string): Promise<Appointment[]>;
  getPaymentsByBusinessId(businessId: number): Promise<Payment[]>;

  // Apify / scraped businesses
  getApifyBusiness(placeId: string): Promise<ApifyBusiness | undefined>;
  searchApifyBusinesses(query: string, category?: string, subcategory?: string): Promise<ApifyBusiness[]>;
  searchCachedGoogleBusinesses(query: string, category?: string): Promise<ApifyBusiness[]>;
  getSubcategoriesByCategory(
    category: string,
    includeCounts?: boolean,
  ): Promise<string[] | Array<{ subcategory: string; count: number }>>;
  getAllSubcategories(): Promise<{ category: string; subcategories: string[] }[]>;
  addApifyBusiness(business: InsertApifyBusiness): Promise<ApifyBusiness>;
  cacheBusinesses(businesses: InsertApifyBusiness[]): Promise<ApifyBusiness[]>;
}

import { DBStorage } from "./db-storage.js";

// The app requires a database connection; DBStorage is the single store.
export const storage: IStorage = new DBStorage();

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
  ServiceTransaction,
  InsertServiceTransaction,
  QueueTicket,
  InsertQueueTicket,
  WaitlistEntry,
  LoyaltyCard,
  LoyaltyEvent,
  ServicePackage,
  PackagePurchase,
  PackageRedemption,
  Promo,
  InsertPromo,
  PromoClaim,
  InsertPromoClaim,
  WhatsAppMessage,
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
  getExpiredDepositAppointments(now: Date): Promise<Appointment[]>;
  getCompletedAppointmentsNeedingReview(businessId?: number, since?: Date): Promise<Appointment[]>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment & { businessId: number }): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: number): Promise<void>;

  // Service transactions (quick cash log: cash / Yape / Plin)
  createServiceTransaction(transaction: InsertServiceTransaction & { businessId: number }): Promise<ServiceTransaction>;
  getServiceTransactions(businessId: number, from: Date, to: Date): Promise<ServiceTransaction[]>;
  getServiceTransaction(id: number): Promise<ServiceTransaction | undefined>;
  updateServiceTransaction(id: number, patch: Partial<InsertServiceTransaction>): Promise<ServiceTransaction>;
  deleteServiceTransaction(id: number): Promise<void>;

  // Virtual queue ("Saca tu turno")
  createQueueTicket(ticket: InsertQueueTicket & { businessId: number; token: string }): Promise<QueueTicket>;
  getQueueTicket(id: number): Promise<QueueTicket | undefined>;
  getQueueTicketByToken(token: string): Promise<QueueTicket | undefined>;
  getQueueTicketByAppointmentId(appointmentId: number): Promise<QueueTicket | undefined>;
  getQueueTicketsByBusinessId(businessId: number, statuses?: string[]): Promise<QueueTicket[]>;
  updateQueueTicket(
    id: number,
    patch: Partial<InsertQueueTicket> & {
      notifiedAt?: Date | null;
      seatedAt?: Date | null;
      closedAt?: Date | null;
      appointmentId?: number | null;
    },
  ): Promise<QueueTicket>;

  // Cancellation waitlist
  createWaitlistEntry(entry: Omit<WaitlistEntry, "id" | "createdAt">): Promise<WaitlistEntry>;
  getWaitlistEntry(id: number): Promise<WaitlistEntry | undefined>;
  getWaitlistEntryByToken(token: string): Promise<WaitlistEntry | undefined>;
  getWaitlistEntriesByBusinessId(businessId: number, date?: string): Promise<WaitlistEntry[]>;
  updateWaitlistEntry(
    id: number,
    patch: Partial<WaitlistEntry> & {
      notifiedAt?: Date | null;
      claimedAt?: Date | null;
      appointmentId?: number | null;
    },
  ): Promise<WaitlistEntry>;

  // Loyalty stamps
  createLoyaltyCard(card: Omit<LoyaltyCard, "id" | "createdAt" | "updatedAt">): Promise<LoyaltyCard>;
  getLoyaltyCard(id: number): Promise<LoyaltyCard | undefined>;
  getLoyaltyCardByToken(token: string): Promise<LoyaltyCard | undefined>;
  getLoyaltyCardByPhone(businessId: number, phone: string): Promise<LoyaltyCard | undefined>;
  getLoyaltyCardsByBusinessId(businessId: number): Promise<LoyaltyCard[]>;
  updateLoyaltyCard(id: number, patch: Partial<LoyaltyCard>): Promise<LoyaltyCard>;
  createLoyaltyEvent(event: Omit<LoyaltyEvent, "id" | "createdAt">): Promise<LoyaltyEvent>;
  getLoyaltyEventByAppointmentId(appointmentId: number): Promise<LoyaltyEvent | undefined>;
  getLoyaltyEventsByCardId(cardId: number): Promise<LoyaltyEvent[]>;

  // Prepaid service packages
  createServicePackage(pkg: Omit<ServicePackage, "id" | "createdAt" | "updatedAt">): Promise<ServicePackage>;
  getServicePackage(id: number): Promise<ServicePackage | undefined>;
  getServicePackagesByBusinessId(businessId: number): Promise<ServicePackage[]>;
  updateServicePackage(id: number, patch: Partial<ServicePackage>): Promise<ServicePackage>;
  createPackagePurchase(
    purchase: Omit<PackagePurchase, "id" | "createdAt" | "updatedAt">,
  ): Promise<PackagePurchase>;
  getPackagePurchase(id: number): Promise<PackagePurchase | undefined>;
  getPackagePurchaseByToken(token: string): Promise<PackagePurchase | undefined>;
  getPackagePurchasesByBusinessId(businessId: number): Promise<PackagePurchase[]>;
  getPackagePurchasesByClientId(clientId: number): Promise<PackagePurchase[]>;
  updatePackagePurchase(id: number, patch: Partial<PackagePurchase>): Promise<PackagePurchase>;
  createPackageRedemption(
    redemption: Omit<PackageRedemption, "id" | "createdAt">,
  ): Promise<PackageRedemption>;
  getPackageRedemptionByAppointmentId(appointmentId: number): Promise<PackageRedemption | undefined>;
  getPackageRedemptionsByPurchaseId(purchaseId: number): Promise<PackageRedemption[]>;

  // Promotions ("horas muertas")
  createPromo(promo: InsertPromo & { businessId: number; code: string }): Promise<Promo>;
  getPromo(id: number): Promise<Promo | undefined>;
  getPromoByCode(code: string): Promise<Promo | undefined>;
  getPromosByBusinessId(businessId: number): Promise<Promo[]>;
  updatePromo(id: number, patch: Partial<InsertPromo> & { status?: string }): Promise<Promo>;

  createPromoClaim(
    claim: InsertPromoClaim & {
      promoId: number;
      businessId: number;
      token: string;
      status?: string;
      appointmentId?: number | null;
      clientId?: number | null;
    },
  ): Promise<PromoClaim>;
  getPromoClaim(id: number): Promise<PromoClaim | undefined>;
  getPromoClaimByToken(token: string): Promise<PromoClaim | undefined>;
  getPromoClaimsByPromoId(promoId: number): Promise<PromoClaim[]>;
  getPromoClaimsByBusinessId(businessId: number): Promise<PromoClaim[]>;
  updatePromoClaim(
    id: number,
    patch: Partial<InsertPromoClaim> & {
      status?: string;
      appointmentId?: number | null;
      cancelledAt?: Date | null;
    },
  ): Promise<PromoClaim>;

  // Central WhatsApp bot audit log
  createWhatsAppMessage(message: {
    businessId?: number | null;
    direction: string;
    phone?: string | null;
    text?: string | null;
    status: string;
    providerMessageId?: string | null;
    error?: string | null;
    payload?: Record<string, unknown> | null;
  }): Promise<WhatsAppMessage>;

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
  getReviewByAppointmentId(appointmentId: number): Promise<Review | undefined>;
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
  getAppointmentsNeedingWhatsAppReminder(
    fromDate: string,
    toDate: string,
    businessId?: number,
  ): Promise<Appointment[]>;
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

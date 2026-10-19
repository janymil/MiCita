import { eq, ilike, and, desc, sql, inArray, count, isNotNull } from "drizzle-orm";
import { db } from "./db.js";
import {
  users,
  businesses,
  services,
  clients,
  appointments,
  gallery,
  publicBusinesses,
  reviews,
  businessSettings,
  apifyBusinesses,
  micrositeEvents,
  contactMessages,
  payments,

  type Payment,
  type MicrositeEvent,
  type InsertMicrositeEvent,
  type ContactMessage,
  type InsertContactMessage,
  type User,
  type Business,
  type Service,
  type Client,
  type Appointment,
  type GalleryItem,
  type PublicBusiness,
  type Review,
  type BusinessSettings,
  type ApifyBusiness,
  type InsertUser,
  type InsertBusiness,
  type InsertService,
  type InsertClient,
  type InsertAppointment,
  type InsertGalleryItem,
  type InsertPublicBusiness,
  type InsertReview,
  type InsertBusinessSettings,
  type InsertApifyBusiness,
} from "../shared/schema.js";
import { IStorage } from "./storage.js";

export class DBStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // Businesses
  async getBusiness(id: number): Promise<Business | undefined> {
    const result = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1);
    return result[0];
  }

  async getBusinessBySlug(slug: string): Promise<Business | undefined> {
    const result = await db.select().from(businesses).where(eq(businesses.slug, slug)).limit(1);
    return result[0];
  }

  async getBusinessesByCategory(category: string): Promise<Business[]> {
    return await db.select().from(businesses)
      .where(and(eq(businesses.category, category), eq(businesses.isActive, true)))
      .orderBy(desc(businesses.createdAt));
  }

  async getBusinessesByUserId(userId: number): Promise<Business[]> {
    return await db.select().from(businesses).where(eq(businesses.userId, userId));
  }

  async searchBusinesses(query: string, category?: string, city?: string): Promise<Business[]> {
    let whereConditions = [eq(businesses.isActive, true)];

    if (query && query.trim() !== '') {
      whereConditions.push(
        sql`(${businesses.name} ILIKE ${'%' + query + '%'} OR ${businesses.description} ILIKE ${'%' + query + '%'})`
      );
    }

    if (category && category !== 'all') {
      whereConditions.push(eq(businesses.category, category));
    }

    if (city && city !== 'all') {
      whereConditions.push(eq(businesses.city, city));
    }

    return await db.select().from(businesses)
      .where(and(...whereConditions))
      .orderBy(desc(businesses.rating), desc(businesses.createdAt));
  }

  async getAllActiveBusinesses(): Promise<Business[]> {
    return await db.select().from(businesses)
      .where(eq(businesses.isActive, true))
      .orderBy(desc(businesses.rating), desc(businesses.createdAt));
  }

  async getAllPublicBusinesses(): Promise<PublicBusiness[]> {
    try {
      return await db.select().from(publicBusinesses)
        .orderBy(desc(publicBusinesses.createdAt));
    } catch (error: any) {
      console.error('Error fetching all public businesses:', error);
      return [];
    }
  }

  async getFeaturedBusinesses(): Promise<Business[]> {
    return await db.select().from(businesses)
      .where(and(eq(businesses.isActive, true), eq(businesses.isPremium, true)))
      .orderBy(desc(businesses.rating))
      .limit(6);
  }

  async createBusiness(business: InsertBusiness & { userId: number }): Promise<Business> {
    const result = await db.insert(businesses).values(business).returning();
    return result[0];
  }

  async updateBusiness(id: number, business: Partial<InsertBusiness>): Promise<Business> {
    const result = await db.update(businesses)
      .set(business)
      .where(eq(businesses.id, id))
      .returning();
    return result[0];
  }

  async deleteBusiness(id: number): Promise<void> {
    // Remove dependent rows first so the FK constraints stay satisfied.
    await db.delete(appointments).where(eq(appointments.businessId, id));
    await db.delete(services).where(eq(services.businessId, id));
    await db.delete(clients).where(eq(clients.businessId, id));
    await db.delete(gallery).where(eq(gallery.businessId, id));
    await db.delete(reviews).where(eq(reviews.businessId, id));
    await db.delete(businessSettings).where(eq(businessSettings.businessId, id));
    await db.delete(businesses).where(eq(businesses.id, id));
  }

  // Services
  async getServicesByBusinessId(businessId: number): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.businessId, businessId));
  }

  async getService(id: number): Promise<Service | undefined> {
    const result = await db.select().from(services).where(eq(services.id, id)).limit(1);
    return result[0];
  }

  async createService(service: InsertService & { businessId: number }): Promise<Service> {
    const result = await db.insert(services).values(service).returning();
    return result[0];
  }

  async updateService(id: number, service: Partial<InsertService>): Promise<Service> {
    const result = await db.update(services)
      .set(service)
      .where(eq(services.id, id))
      .returning();
    return result[0];
  }

  async deleteService(id: number): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  // Clients
  async getClientsByBusinessId(businessId: number): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.businessId, businessId));
  }

  async getClient(id: number): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return result[0];
  }

  async createClient(client: InsertClient & { businessId: number }): Promise<Client> {
    const result = await db.insert(clients).values(client).returning();
    return result[0];
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client> {
    const result = await db.update(clients)
      .set(client)
      .where(eq(clients.id, id))
      .returning();
    return result[0];
  }

  async deleteClient(id: number): Promise<void> {
    // First delete any appointments associated with this client
    await db.delete(appointments).where(eq(appointments.clientId, id));

    // Then delete the client
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Appointments
  async getAppointmentsByBusinessId(businessId: number): Promise<Appointment[]> {
    return await db.select().from(appointments).where(eq(appointments.businessId, businessId));
  }

  async getAppointmentsByDate(businessId: number, date: string): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(and(
        eq(appointments.businessId, businessId),
        eq(appointments.date, date)
      ));
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    const result = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    return result[0];
  }

  async createAppointment(appointment: InsertAppointment & { businessId: number }): Promise<Appointment> {
    const result = await db.insert(appointments).values(appointment).returning();
    return result[0];
  }

  async updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment> {
    const result = await db.update(appointments)
      .set(appointment)
      .where(eq(appointments.id, id))
      .returning();
    return result[0];
  }

  async deleteAppointment(id: number): Promise<void> {
    await db.delete(appointments).where(eq(appointments.id, id));
  }

  // Gallery
  async getGalleryByBusinessId(businessId: number): Promise<GalleryItem[]> {
    return await db.select().from(gallery).where(eq(gallery.businessId, businessId));
  }

  async createGalleryItem(item: InsertGalleryItem & { businessId: number }): Promise<GalleryItem> {
    const result = await db.insert(gallery).values(item).returning();
    return result[0];
  }

  async deleteGalleryItem(id: number): Promise<void> {
    await db.delete(gallery).where(eq(gallery.id, id));
  }

  // Public Businesses
  async getPublicBusinesses(): Promise<PublicBusiness[]> {
    return await db.select().from(publicBusinesses).orderBy(desc(publicBusinesses.createdAt));
  }

  async searchPublicBusinesses(query: string, category?: string): Promise<PublicBusiness[]> {
    let whereConditions = [];

    if (query && query.trim() !== '') {
      whereConditions.push(
        sql`(${publicBusinesses.name} ILIKE ${'%' + query + '%'} OR ${publicBusinesses.description} ILIKE ${'%' + query + '%'})`
      );
    }

    if (category && category !== 'all') {
      whereConditions.push(eq(publicBusinesses.category, category));
    }

    return await db.select().from(publicBusinesses)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(publicBusinesses.createdAt));
  }

  // Reviews
  async getReviewsByBusinessId(businessId: number): Promise<Review[]> {
    return await db.select().from(reviews)
      .where(eq(reviews.businessId, businessId))
      .orderBy(desc(reviews.createdAt));
  }

  /** Only what a public visitor is allowed to see. */
  async getApprovedReviewsByBusinessId(businessId: number): Promise<Review[]> {
    return await db.select().from(reviews)
      .where(and(eq(reviews.businessId, businessId), eq(reviews.status, "approved")))
      .orderBy(desc(reviews.createdAt));
  }

  async getReview(id: number): Promise<Review | undefined> {
    const result = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
    return result[0];
  }

  async createReview(review: InsertReview): Promise<Review> {
    const result = await db.insert(reviews).values(review).returning();
    return result[0];
  }

  async updateReview(id: number, review: Partial<InsertReview>): Promise<Review> {
    const result = await db.update(reviews).set(review).where(eq(reviews.id, id)).returning();
    return result[0];
  }

  async deleteReview(id: number): Promise<void> {
    await db.delete(reviews).where(eq(reviews.id, id));
  }

  /**
   * Keep `businesses.rating` / `reviewCount` in sync with approved reviews.
   * Scraped values are preserved when the business has no approved reviews yet.
   */
  async recomputeBusinessRating(businessId: number): Promise<void> {
    const rows = await db
      .select({ rating: reviews.rating })
      .from(reviews)
      .where(and(eq(reviews.businessId, businessId), eq(reviews.status, "approved")));

    if (rows.length === 0) return;

    const average = rows.reduce((sum, row) => sum + row.rating, 0) / rows.length;
    await db.update(businesses)
      .set({
        rating: average.toFixed(2) as any,
        reviewCount: rows.length,
      })
      .where(eq(businesses.id, businessId));
  }

  // Business Settings
  async getBusinessSettings(businessId: number): Promise<BusinessSettings | undefined> {
    const result = await db.select().from(businessSettings).where(eq(businessSettings.businessId, businessId)).limit(1);
    return result[0];
  }

  /** Single indexed lookup used by the public microsite route. */
  async getBusinessSettingsByCustomUrl(customUrl: string): Promise<BusinessSettings | undefined> {
    const result = await db.select().from(businessSettings)
      .where(eq(businessSettings.customUrl, customUrl))
      .limit(1);
    return result[0];
  }

  /** Every published micrositio, for sitemap + internal linking. */
  async getPublishedMicrosites(): Promise<Array<{ businessId: number; customUrl: string; businessName: string; updatedAt: Date | null }>> {
    const rows = await db
      .select({
        businessId: businessSettings.businessId,
        customUrl: businessSettings.customUrl,
        businessName: businesses.name,
        updatedAt: businessSettings.updatedAt,
      })
      .from(businessSettings)
      .innerJoin(businesses, eq(businesses.id, businessSettings.businessId))
      .where(and(
        eq(businesses.isActive, true),
        isNotNull(businessSettings.customUrl),
      ));

    return rows
      .filter((row) => Boolean(row.customUrl))
      .map((row) => ({
        businessId: row.businessId,
        customUrl: row.customUrl as string,
        businessName: row.businessName,
        updatedAt: row.updatedAt ?? null,
      }));
  }

  async updateBusinessSettings(businessId: number, settings: InsertBusinessSettings): Promise<BusinessSettings> {
    const existing = await this.getBusinessSettings(businessId);

    if (existing) {
      const result = await db.update(businessSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(businessSettings.businessId, businessId))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(businessSettings)
        .values({ ...settings, businessId })
        .returning();
      return result[0];
    }
  }

  // Microsite traffic
  async createMicrositeEvent(event: InsertMicrositeEvent): Promise<MicrositeEvent> {
    const result = await db.insert(micrositeEvents).values(event).returning();
    return result[0];
  }

  async getMicrositeEvents(businessId: number, fromISO: string, toISO: string): Promise<MicrositeEvent[]> {
    return await db.select().from(micrositeEvents)
      .where(and(
        eq(micrositeEvents.businessId, businessId),
        sql`${micrositeEvents.day} >= ${fromISO}`,
        sql`${micrositeEvents.day} <= ${toISO}`,
      ));
  }

  // Contact inbox
  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const result = await db.insert(contactMessages).values(message).returning();
    return result[0];
  }

  async getContactMessages(businessId: number, status?: string): Promise<ContactMessage[]> {
    const conditions = [eq(contactMessages.businessId, businessId)];
    if (status && status !== "all") conditions.push(eq(contactMessages.status, status));
    return await db.select().from(contactMessages)
      .where(and(...conditions))
      .orderBy(desc(contactMessages.createdAt));
  }

  async updateContactMessage(
    id: number,
    patch: Partial<InsertContactMessage> & { status?: string },
  ): Promise<ContactMessage | undefined> {
    const result = await db.update(contactMessages)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(contactMessages.id, id))
      .returning();
    return result[0];
  }

  // Lifecycle
  async getAppointmentByCancelToken(token: string): Promise<Appointment | undefined> {
    if (!token) return undefined;
    const result = await db.select().from(appointments).where(eq(appointments.cancelToken, token)).limit(1);
    return result[0];
  }

  async getAppointmentsNeedingReminder(fromISO: string, toISO: string): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(and(
        sql`${appointments.date} >= ${fromISO}`,
        sql`${appointments.date} <= ${toISO}`,
        sql`${appointments.reminderSentAt} IS NULL`,
        inArray(appointments.status, ["pending", "confirmed"]),
      ));
  }

  async getPaymentsByBusinessId(businessId: number): Promise<Payment[]> {
    return await db.select().from(payments)
      .where(eq(payments.businessId, businessId))
      .orderBy(desc(payments.createdAt));
  }

  // Apify business methods
  async getApifyBusiness(placeId: string): Promise<ApifyBusiness | undefined> {
    const result = await db.select().from(apifyBusinesses).where(eq(apifyBusinesses.placeId, placeId)).limit(1);
    return result[0];
  }

  async searchApifyBusinesses(query: string, category?: string, subcategory?: string): Promise<ApifyBusiness[]> {
    let whereConditions = [];

    // If query is provided and not empty, search in search terms
    if (query && query.trim() && query !== '') {
      whereConditions.push(
        ilike(apifyBusinesses.searchTerms, `%${query.toLowerCase().trim()}%`)
      );
    }

    // If category is provided and not 'all', filter by category
    if (category && category !== 'all' && category !== '') {
      whereConditions.push(eq(apifyBusinesses.category, category));
    }

    // If subcategory is provided and not 'all', filter by subcategory
    if (subcategory && subcategory !== 'all' && subcategory !== '') {
      whereConditions.push(eq(apifyBusinesses.subcategory, subcategory));
    }

    const result = await db.select()
      .from(apifyBusinesses)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(apifyBusinesses.rating))
      .limit(2000);

    console.log(`🔍 Apify Search: query="${query}", category="${category}", subcategory="${subcategory}", conditions=${whereConditions.length}, results=${result.length}`);
    return result;
  }

  /** Diagnostics helper: cached (scraped) businesses matching a term/category. */
  async searchCachedGoogleBusinesses(query: string, category?: string): Promise<ApifyBusiness[]> {
    return this.searchApifyBusinesses(query, category);
  }

  /** Bulk upsert scraped businesses keyed by placeId. */
  async cacheBusinesses(businesses: InsertApifyBusiness[]): Promise<ApifyBusiness[]> {
    if (businesses.length === 0) return [];
    const saved: ApifyBusiness[] = [];
    for (const business of businesses) {
      saved.push(await this.addApifyBusiness(business));
    }
    return saved;
  }

  async getSubcategoriesByCategory(category: string, includeCounts: boolean = false): Promise<string[] | Array<{subcategory: string, count: number}>> {
    if (includeCounts) {
      const result = await db.select({ 
        subcategory: apifyBusinesses.subcategory,
        count: count()
      })
        .from(apifyBusinesses)
        .where(and(
          eq(apifyBusinesses.category, category),
          sql`${apifyBusinesses.subcategory} IS NOT NULL`,
          sql`${apifyBusinesses.subcategory} != ''`
        ))
        .groupBy(apifyBusinesses.subcategory)
        .orderBy(apifyBusinesses.subcategory);

      return result.map(r => ({ subcategory: r.subcategory!, count: r.count }));
    } else {
      const result = await db.select({ subcategory: apifyBusinesses.subcategory })
        .from(apifyBusinesses)
        .where(and(
          eq(apifyBusinesses.category, category),
          sql`${apifyBusinesses.subcategory} IS NOT NULL`,
          sql`${apifyBusinesses.subcategory} != ''`
        ))
        .groupBy(apifyBusinesses.subcategory)
        .orderBy(apifyBusinesses.subcategory);

      return result.map(r => r.subcategory).filter((s): s is string => s !== null);
    }
  }

  async getAllSubcategories(): Promise<{ category: string; subcategories: string[] }[]> {
    const result = await db.select({ 
      category: apifyBusinesses.category, 
      subcategory: apifyBusinesses.subcategory 
    })
      .from(apifyBusinesses)
      .where(sql`${apifyBusinesses.subcategory} IS NOT NULL`)
      .groupBy(apifyBusinesses.category, apifyBusinesses.subcategory)
      .orderBy(apifyBusinesses.category, apifyBusinesses.subcategory);

    // Group by category
    const grouped = result.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      if (item.subcategory) {
        acc[item.category].push(item.subcategory);
      }
      return acc;
    }, {} as { [key: string]: string[] });

    return Object.entries(grouped).map(([category, subcategories]) => ({
      category,
      subcategories
    }));
  }

  // Remove getCategoryCounts method - reverted to hardcoded categories

  async addApifyBusiness(business: InsertApifyBusiness): Promise<ApifyBusiness> {
    const result = await db.insert(apifyBusinesses)
      .values(business)
      .onConflictDoUpdate({
        target: apifyBusinesses.placeId,
        set: {
          name: business.name,
          address: business.address,
          category: business.category,
          rating: business.rating,
          reviewCount: business.reviewCount,
          priceLevel: business.priceLevel,
          phone: business.phone,
          website: business.website,
          photoUrl: business.photoUrl,
          latitude: business.latitude,
          longitude: business.longitude,
          openNow: business.openNow,
          hours: business.hours,
          searchTerms: business.searchTerms,
          isRegistered: business.isRegistered,
          lastUpdated: sql`NOW()`,
        },
      })
      .returning();
    return result[0];
  }
}
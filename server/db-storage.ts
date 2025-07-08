import { eq, ilike, and, desc, sql, inArray } from "drizzle-orm";
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
  cachedGoogleBusinesses,
  searchCache,
  type User,
  type Business,
  type Service,
  type Client,
  type Appointment,
  type GalleryItem,
  type PublicBusiness,
  type Review,
  type BusinessSettings,
  type CachedGoogleBusiness,
  type SearchCache,
  type InsertUser,
  type InsertBusiness,
  type InsertService,
  type InsertClient,
  type InsertAppointment,
  type InsertGalleryItem,
  type InsertPublicBusiness,
  type InsertReview,
  type InsertBusinessSettings,
  type InsertCachedGoogleBusiness,
  type InsertSearchCache,
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

    if (query) {
      whereConditions.push(
        sql`(${businesses.name} ILIKE ${'%' + query + '%'} OR ${businesses.description} ILIKE ${'%' + query + '%'})`
      );
    }

    if (category) {
      whereConditions.push(eq(businesses.category, category));
    }

    if (city) {
      whereConditions.push(eq(businesses.city, city));
    }

    return await db.select().from(businesses)
      .where(and(...whereConditions))
      .orderBy(desc(businesses.rating), desc(businesses.createdAt));
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

    if (query) {
      whereConditions.push(
        sql`(${publicBusinesses.name} ILIKE ${'%' + query + '%'} OR ${publicBusinesses.description} ILIKE ${'%' + query + '%'})`
      );
    }

    if (category) {
      whereConditions.push(eq(publicBusinesses.category, category));
    }

    return await db.select().from(publicBusinesses)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(publicBusinesses.createdAt));
  }

  // Reviews
  async getReviewsByBusinessId(businessId: number): Promise<Review[]> {
    return await db.select().from(reviews).where(eq(reviews.businessId, businessId));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const result = await db.insert(reviews).values(review).returning();
    return result[0];
  }

  // Business Settings
  async getBusinessSettings(businessId: number): Promise<BusinessSettings | undefined> {
    const result = await db.select().from(businessSettings).where(eq(businessSettings.businessId, businessId)).limit(1);
    return result[0];
  }

  async updateBusinessSettings(businessId: number, settings: InsertBusinessSettings): Promise<BusinessSettings> {
    const existing = await this.getBusinessSettings(businessId);
    
    if (existing) {
      const result = await db.update(businessSettings)
        .set(settings)
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

  // Cache methods for Google Places businesses
  async getCachedGoogleBusiness(placeId: string): Promise<CachedGoogleBusiness | undefined> {
    const result = await db.select().from(cachedGoogleBusinesses).where(eq(cachedGoogleBusinesses.placeId, placeId)).limit(1);
    return result[0];
  }

  async getCachedGoogleBusinessesByIds(placeIds: string[]): Promise<CachedGoogleBusiness[]> {
    if (placeIds.length === 0) return [];
    const result = await db.select().from(cachedGoogleBusinesses).where(inArray(cachedGoogleBusinesses.placeId, placeIds));
    return result;
  }

  async searchCachedGoogleBusinesses(query: string, category?: string): Promise<CachedGoogleBusiness[]> {
    let whereClause = ilike(cachedGoogleBusinesses.searchTerms, `%${query.toLowerCase()}%`);
    
    if (category) {
      whereClause = and(whereClause, eq(cachedGoogleBusinesses.category, category));
    }

    const result = await db.select()
      .from(cachedGoogleBusinesses)
      .where(whereClause)
      .orderBy(desc(cachedGoogleBusinesses.rating))
      .limit(60);
    
    return result;
  }

  async cacheBusiness(business: InsertCachedGoogleBusiness): Promise<CachedGoogleBusiness> {
    const result = await db.insert(cachedGoogleBusinesses)
      .values(business)
      .onConflictDoUpdate({
        target: cachedGoogleBusinesses.placeId,
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

  async cacheBusinesses(businesses: InsertCachedGoogleBusiness[]): Promise<CachedGoogleBusiness[]> {
    if (businesses.length === 0) return [];
    
    const results = [];
    for (const business of businesses) {
      const result = await this.cacheBusiness(business);
      results.push(result);
    }
    return results;
  }

  // Search cache methods
  async getSearchCache(queryHash: string): Promise<SearchCache | undefined> {
    const result = await db.select().from(searchCache).where(eq(searchCache.queryHash, queryHash)).limit(1);
    return result[0];
  }

  async saveSearchCache(cacheData: InsertSearchCache): Promise<SearchCache> {
    const result = await db.insert(searchCache)
      .values(cacheData)
      .onConflictDoUpdate({
        target: searchCache.queryHash,
        set: {
          businessIds: cacheData.businessIds,
          totalResults: cacheData.totalResults,
          googleApiCalls: cacheData.googleApiCalls,
          lastFetched: sql`NOW()`,
          expiresAt: cacheData.expiresAt,
        },
      })
      .returning();
    return result[0];
  }

  async cleanExpiredCache(): Promise<void> {
    // Clean expired search cache
    await db.delete(searchCache).where(sql`${searchCache.expiresAt} < NOW()`);
    
    // Clean old cached businesses (older than 30 days)
    await db.delete(cachedGoogleBusinesses).where(sql`${cachedGoogleBusinesses.lastUpdated} < NOW() - INTERVAL '30 days'`);
  }
}
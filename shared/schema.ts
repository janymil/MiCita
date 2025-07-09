import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Business profiles
export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  name: text("name").notNull(),
  slug: text("slug").unique(), // DEPRECATED: Not used for micrositios - use customUrl in businessSettings instead
  description: text("description"),
  category: text("category").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city").default("Lima"),
  country: text("country").default("Perú"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  website: text("website"),
  logo: text("logo"),
  coverImage: text("cover_image"),
  hours: jsonb("hours"),
  isActive: boolean("is_active").default(true),
  isPremium: boolean("is_premium").default(false),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Services offered by businesses
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  businessId: serial("business_id").references(() => businesses.id),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }),
  duration: integer("duration"), // in minutes
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Clients/customers
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  businessId: serial("business_id").references(() => businesses.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Appointments
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  businessId: serial("business_id").references(() => businesses.id),
  clientId: serial("client_id").references(() => clients.id),
  serviceId: serial("service_id").references(() => services.id),
  date: text("date").notNull(), // Store as 'YYYY-MM-DD' format
  time: text("time").notNull(), // Store as 'HH:MM' format
  duration: integer("duration").notNull(),
  status: text("status").notNull().default("pending"), // pending, confirmed, completed, cancelled, rescheduled, no_show
  notes: text("notes"), // Business notes
  clientNotes: text("client_notes"), // Customer notes during booking
  price: decimal("price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Business gallery
export const gallery = pgTable("gallery", {
  id: serial("id").primaryKey(),
  businessId: serial("business_id").references(() => businesses.id),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  isMain: boolean("is_main").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Public business directory (external listings)
export const publicBusinesses = pgTable("public_businesses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  phone: text("phone"),
  address: text("address"),
  city: text("city").default("Lima"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reviews
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  businessId: serial("business_id").references(() => businesses.id),
  clientName: text("client_name").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Business settings and customization
export const businessSettings = pgTable("business_settings", {
  id: serial("id").primaryKey(),
  businessId: serial("business_id").references(() => businesses.id),
  
  // Micrositio Identity & Access
  customUrl: text("custom_url"),
  professionalTitle: text("professional_title"),
  publicDescription: text("public_description"),
  
  // Brand Images
  profileImage: text("profile_image"),
  coverImage: text("cover_image"),
  
  // Extended Contact Info
  publicEmail: text("public_email"),
  publicPhone: text("public_phone"),
  streetAddress: text("street_address"),
  district: text("district"),
  region: text("region"),
  postalCode: text("postal_code"),
  country: text("country").default("Perú"),
  
  // Social Media
  facebookUrl: text("facebook_url"),
  instagramUrl: text("instagram_url"),
  tiktokUrl: text("tiktok_url"),
  youtubeUrl: text("youtube_url"),
  
  // Features
  enablePublicBooking: boolean("enable_public_booking").default(true),
  enableContactForm: boolean("enable_contact_form").default(true),
  enableGallery: boolean("enable_gallery").default(true),
  
  // Schedule Notes
  scheduleNotes: text("schedule_notes"),
  
  // Working Hours
  workingHours: jsonb("working_hours").$type<{
    [key: string]: {
      enabled: boolean;
      start: string;
      end: string;
    };
  }>().default({
    monday: { enabled: true, start: "09:00", end: "17:00" },
    tuesday: { enabled: true, start: "09:00", end: "17:00" },
    wednesday: { enabled: true, start: "09:00", end: "17:00" },
    thursday: { enabled: true, start: "09:00", end: "17:00" },
    friday: { enabled: true, start: "09:00", end: "17:00" },
    saturday: { enabled: true, start: "09:00", end: "17:00" },
    sunday: { enabled: false, start: "09:00", end: "17:00" },
  }),
  
  // Blocked dates and hours for appointments
  blockedDates: jsonb("blocked_dates").$type<{
    startDate: string;
    endDate: string;
    reason?: string;
  }[]>().default([]),
  blockedHours: jsonb("blocked_hours").$type<{
    date: string;
    startTime: string;
    endTime: string;
    reason?: string;
  }[]>().default([]),
  
  // Existing fields
  theme: text("theme").default("default"),
  primaryColor: text("primary_color"),
  bookingSettings: jsonb("booking_settings"),
  emailNotifications: boolean("email_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Apify Businesses - Enhanced businesses scraped from Apify
export const apifyBusinesses = pgTable("apify_businesses", {
  id: serial("id").primaryKey(),
  placeId: text("place_id").unique().notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  category: text("category").notNull(),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  priceLevel: integer("price_level").default(0),
  phone: text("phone"),
  website: text("website"),
  email: text("email"),  // Company email from contacts enrichment
  photoUrl: text("photo_url"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  openNow: boolean("open_now"),
  hours: jsonb("hours").$type<string[]>(),
  searchTerms: text("search_terms"),
  isRegistered: boolean("is_registered").default(false),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  
  // Enhanced fields
  description: text("description"),
  services: text("services").array(),
  socialMedia: jsonb("social_media").$type<{[key: string]: string}>(),
  imageUrls: text("image_urls").array(),
  verifiedStatus: text("verified_status").default("unverified"),
  dataFreshnessScore: integer("data_freshness_score").default(0),
  phoneFormatted: text("phone_formatted"),
  phoneCountryCode: text("phone_country_code").default("+51"),
  coordinatesValidated: boolean("coordinates_validated").default(false),
  businessStatus: text("business_status").default("unknown"),
  amenities: jsonb("amenities").$type<{[key: string]: boolean}>(),
  priceRangeText: text("price_range_text"),
  lastScraped: timestamp("last_scraped").defaultNow(),
  scrapingSource: text("scraping_source").default("apify"),
  qualityScore: integer("quality_score").default(0),
});



// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  businessId: true,
  createdAt: true,
}).extend({
  price: z.union([z.string(), z.number()]).transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num) || num <= 0) {
      throw new Error('Price must be a positive number');
    }
    return num.toString();
  }),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  businessId: true,
  createdAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  businessId: true,
  createdAt: true,
});

export const insertGallerySchema = createInsertSchema(gallery).omit({
  id: true,
  businessId: true,
  createdAt: true,
});

export const insertPublicBusinessSchema = createInsertSchema(publicBusinesses).omit({
  id: true,
  createdAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export const insertBusinessSettingsSchema = createInsertSchema(businessSettings).omit({
  id: true,
  businessId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApifyBusinessSchema = createInsertSchema(apifyBusinesses).omit({
  id: true,
  lastUpdated: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type GalleryItem = typeof gallery.$inferSelect;
export type InsertGalleryItem = z.infer<typeof insertGallerySchema>;

export type PublicBusiness = typeof publicBusinesses.$inferSelect;
export type InsertPublicBusiness = z.infer<typeof insertPublicBusinessSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type BusinessSettings = typeof businessSettings.$inferSelect;
export type InsertBusinessSettings = z.infer<typeof insertBusinessSettingsSchema>;

export type ApifyBusiness = typeof apifyBusinesses.$inferSelect;
export type InsertApifyBusiness = z.infer<typeof insertApifyBusinessSchema>;

import { boolean, decimal, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Business profiles - READ ONLY for public search
export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  userId: serial("user_id"),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  description: text("description"),
  category: text("category").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  district: text("district"),
  referencia: text("referencia"),
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

// Business settings for micrositio URLs - READ ONLY
export const businessSettings = pgTable("business_settings", {
  id: serial("id").primaryKey(),
  businessId: serial("business_id").references(() => businesses.id),
  customUrl: text("custom_url").unique(),
  showServices: boolean("show_services").default(true),
  showGallery: boolean("show_gallery").default(true),
  showReviews: boolean("show_reviews").default(true),
  showContact: boolean("show_contact").default(true),
  showBooking: boolean("show_booking").default(true),
  themeColor: text("theme_color").default("#dc2626"),
  coverImage: text("cover_image"),
  socialMedia: jsonb("social_media"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Services - READ ONLY for public display
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  businessId: serial("business_id").references(() => businesses.id),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }),
  duration: integer("duration"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Business gallery - READ ONLY
export const gallery = pgTable("gallery", {
  id: serial("id").primaryKey(),
  businessId: serial("business_id").references(() => businesses.id),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  isMain: boolean("is_main").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reviews - READ ONLY for public display
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  businessId: serial("business_id").references(() => businesses.id),
  clientName: text("client_name").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Public business directory (external listings) - READ ONLY
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

// Apify scraped businesses - READ ONLY
export const apifyBusinesses = pgTable("apify_businesses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category"),
  subcategory: text("subcategory"),
  address: text("address"),
  phone: text("phone"),
  website: text("website"),
  email: text("email"),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  reviewCount: integer("review_count"),
  city: text("city").default("Lima"),
  district: text("district"),
  description: text("description"),
  imageUrl: text("image_url"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  openingHours: jsonb("opening_hours"),
  isVerified: boolean("is_verified").default(false),
  scrapedAt: timestamp("scraped_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Search analytics - for tracking public searches
export const searchAnalytics = pgTable("search_analytics", {
  id: serial("id").primaryKey(),
  query: text("query"),
  category: text("category"),
  location: text("location"),
  resultsCount: integer("results_count"),
  searchTime: text("search_time"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Type exports
export type Business = typeof businesses.$inferSelect;
export type BusinessSettings = typeof businessSettings.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Gallery = typeof gallery.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type PublicBusiness = typeof publicBusinesses.$inferSelect;
export type ApifyBusiness = typeof apifyBusinesses.$inferSelect;

// Insert schemas (for analytics only - no business data modification)
export const insertSearchAnalyticsSchema = createInsertSchema(searchAnalytics);
export type InsertSearchAnalytics = z.infer<typeof insertSearchAnalyticsSchema>;
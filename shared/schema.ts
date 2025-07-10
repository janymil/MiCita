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
  subcategory: text("subcategory"), // Original category from scraped data
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
  district: text("district"), // Auto-detected district from address/coordinates
  isRegistered: boolean("is_registered").default(false),
  lastUpdated: timestamp("last_updated").defaultNow(),
  
  // Enhanced data for modern UI
  streetViewUrl: text("street_view_url"),
  photos: jsonb("photos").$type<string[]>(), // Array of photo URLs
  popularTimes: jsonb("popular_times").$type<{
    [day: string]: {
      hours: { hour: number; percentage: number }[];
      busyText?: string;
    }
  }>(), // Busy hours data
  currentPopularity: integer("current_popularity"), // Current busy percentage
  livePopularityStatus: text("live_popularity_status"), // "Not busy", "A little busy", etc.
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
  originalScrapedData: jsonb("original_scraped_data"), // Complete original scraped data
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



// Business Networking Tables

// Business connections/partnerships
export const businessConnections = pgTable("business_connections", {
  id: serial("id").primaryKey(),
  requesterId: serial("requester_id").references(() => businesses.id),
  recipientId: serial("recipient_id").references(() => businesses.id),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected, blocked
  connectionType: text("connection_type").notNull().default("general"), // general, partnership, referral, collaboration
  message: text("message"), // Message when requesting connection
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business networking posts/opportunities
export const networkingPosts = pgTable("networking_posts", {
  id: serial("id").primaryKey(),
  businessId: serial("business_id").references(() => businesses.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  postType: text("post_type").notNull().default("opportunity"), // opportunity, collaboration, referral, announcement, question
  category: text("category"), // Categories like: marketing, services, events, jobs, partnerships
  tags: jsonb("tags").$type<string[]>().default([]),
  attachments: jsonb("attachments").$type<string[]>().default([]), // URLs to attached files/images
  targetAudience: text("target_audience").default("all"), // all, connections, specific_categories
  isActive: boolean("is_active").default(true),
  viewCount: integer("view_count").default(0),
  likeCount: integer("like_count").default(0),
  commentCount: integer("comment_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comments on networking posts
export const networkingComments = pgTable("networking_comments", {
  id: serial("id").primaryKey(),
  postId: serial("post_id").references(() => networkingPosts.id),
  businessId: serial("business_id").references(() => businesses.id),
  content: text("content").notNull(),
  parentId: serial("parent_id").references(() => networkingComments.id), // For nested comments
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Likes on networking posts
export const networkingLikes = pgTable("networking_likes", {
  id: serial("id").primaryKey(),
  postId: serial("post_id").references(() => networkingPosts.id),
  businessId: serial("business_id").references(() => businesses.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Business collaboration projects
export const collaborationProjects = pgTable("collaboration_projects", {
  id: serial("id").primaryKey(),
  creatorId: serial("creator_id").references(() => businesses.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  projectType: text("project_type").notNull(), // joint_marketing, cross_promotion, shared_services, event_collaboration
  status: text("status").notNull().default("open"), // open, in_progress, completed, cancelled
  requiredSkills: jsonb("required_skills").$type<string[]>().default([]),
  budget: decimal("budget", { precision: 10, scale: 2 }),
  timeline: text("timeline"), // Expected timeline
  maxParticipants: integer("max_participants").default(10),
  currentParticipants: integer("current_participants").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Participants in collaboration projects
export const collaborationParticipants = pgTable("collaboration_participants", {
  id: serial("id").primaryKey(),
  projectId: serial("project_id").references(() => collaborationProjects.id),
  businessId: serial("business_id").references(() => businesses.id),
  role: text("role").default("participant"), // creator, participant, contributor
  joinedAt: timestamp("joined_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

// Business referrals
export const businessReferrals = pgTable("business_referrals", {
  id: serial("id").primaryKey(),
  referrerId: serial("referrer_id").references(() => businesses.id),
  referredBusinessId: serial("referred_business_id").references(() => businesses.id),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  serviceNeeded: text("service_needed").notNull(),
  referralNotes: text("referral_notes"),
  status: text("status").notNull().default("pending"), // pending, accepted, completed, declined
  commission: decimal("commission", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business networking events
export const networkingEvents = pgTable("networking_events", {
  id: serial("id").primaryKey(),
  organizerId: serial("organizer_id").references(() => businesses.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  eventType: text("event_type").notNull(), // workshop, meetup, webinar, conference, social
  venue: text("venue"),
  address: text("address"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  maxAttendees: integer("max_attendees"),
  currentAttendees: integer("current_attendees").default(0),
  ticketPrice: decimal("ticket_price", { precision: 10, scale: 2 }).default("0"),
  tags: jsonb("tags").$type<string[]>().default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event attendees
export const eventAttendees = pgTable("event_attendees", {
  id: serial("id").primaryKey(),
  eventId: serial("event_id").references(() => networkingEvents.id),
  businessId: serial("business_id").references(() => businesses.id),
  attendeeStatus: text("attendee_status").notNull().default("registered"), // registered, attended, cancelled
  registeredAt: timestamp("registered_at").defaultNow(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;

export type BusinessConnection = typeof businessConnections.$inferSelect;
export type InsertBusinessConnection = z.infer<typeof insertBusinessConnectionSchema>;

export type NetworkingPost = typeof networkingPosts.$inferSelect;
export type InsertNetworkingPost = z.infer<typeof insertNetworkingPostSchema>;

export type NetworkingComment = typeof networkingComments.$inferSelect;
export type InsertNetworkingComment = z.infer<typeof insertNetworkingCommentSchema>;

export type NetworkingLike = typeof networkingLikes.$inferSelect;
export type InsertNetworkingLike = z.infer<typeof insertNetworkingLikeSchema>;

export type CollaborationProject = typeof collaborationProjects.$inferSelect;
export type InsertCollaborationProject = z.infer<typeof insertCollaborationProjectSchema>;

export type CollaborationParticipant = typeof collaborationParticipants.$inferSelect;
export type InsertCollaborationParticipant = z.infer<typeof insertCollaborationParticipantSchema>;

export type BusinessReferral = typeof businessReferrals.$inferSelect;
export type InsertBusinessReferral = z.infer<typeof insertBusinessReferralSchema>;

export type NetworkingEvent = typeof networkingEvents.$inferSelect;
export type InsertNetworkingEvent = z.infer<typeof insertNetworkingEventSchema>;

export type EventAttendee = typeof eventAttendees.$inferSelect;
export type InsertEventAttendee = z.infer<typeof insertEventAttendeeSchema>;

// Insert schemas for networking tables
export const insertBusinessConnectionSchema = createInsertSchema(businessConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNetworkingPostSchema = createInsertSchema(networkingPosts).omit({
  id: true,
  businessId: true,
  viewCount: true,
  likeCount: true,
  commentCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNetworkingCommentSchema = createInsertSchema(networkingComments).omit({
  id: true,
  businessId: true,
  createdAt: true,
});

export const insertNetworkingLikeSchema = createInsertSchema(networkingLikes).omit({
  id: true,
  businessId: true,
  createdAt: true,
});

export const insertCollaborationProjectSchema = createInsertSchema(collaborationProjects).omit({
  id: true,
  creatorId: true,
  currentParticipants: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCollaborationParticipantSchema = createInsertSchema(collaborationParticipants).omit({
  id: true,
  businessId: true,
  joinedAt: true,
});

export const insertBusinessReferralSchema = createInsertSchema(businessReferrals).omit({
  id: true,
  referrerId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNetworkingEventSchema = createInsertSchema(networkingEvents).omit({
  id: true,
  organizerId: true,
  currentAttendees: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventAttendeeSchema = createInsertSchema(eventAttendees).omit({
  id: true,
  businessId: true,
  registeredAt: true,
});

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

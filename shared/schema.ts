import { AnyPgColumn, boolean, decimal, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication.
// `password` stays nullable so phone/Google-only accounts (and the two legacy
// rows created before self-hosted auth) remain valid.
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password"),
  name: text("name").notNull(),
  // Legacy column kept for backward compatibility with previously synced rows.
  stackAuthId: text("stack_auth_id").unique(),
  phone: text("phone"),
  phoneVerified: boolean("phone_verified").default(false),
  emailVerified: boolean("email_verified").default(false),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("user"), // user | admin
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Login identities (email/password, google, email OTP, phone OTP).
// Kept separate from `users` so one account can link several providers.
export const authIdentities = pgTable(
  "auth_identities",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    provider: text("provider").notNull(), // password | google | email_otp | phone_otp
    providerAccountId: text("provider_account_id").notNull(), // email, sub, or E.164 phone
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    providerAccountIdx: uniqueIndex("auth_identities_provider_account_uq").on(
      table.provider,
      table.providerAccountId,
    ),
  }),
);

// Short-lived OTP codes for email/phone verification and passwordless login.
export const verificationOtps = pgTable(
  "verification_otps",
  {
    id: serial("id").primaryKey(),
    // Email OTPs key on email, phone OTPs key on E.164 number.
    identifier: text("identifier").notNull(),
    channel: text("channel").notNull(), // email | phone
    purpose: text("purpose").notNull().default("login"), // login | verify_email | verify_phone | reset_password
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    consumedAt: timestamp("consumed_at"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    identifierIdx: index("verification_otps_identifier_idx").on(table.identifier, table.purpose),
  }),
);

// Refresh tokens (rotated on every refresh, hashed at rest).
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    tokenHash: text("token_hash").notNull(),
    familyId: text("family_id").notNull(),
    userAgent: text("user_agent"),
    ip: text("ip"),
    revokedAt: timestamp("revoked_at"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex("refresh_tokens_hash_uq").on(table.tokenHash),
    userIdx: index("refresh_tokens_user_idx").on(table.userId),
  }),
);

// Single-use password reset tokens.
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    tokenHash: text("token_hash").notNull(),
    usedAt: timestamp("used_at"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex("password_reset_tokens_hash_uq").on(table.tokenHash),
  }),
);

// Auth audit trail: security-relevant events for forensics and alerting.
export const authAuditLog = pgTable(
  "auth_audit_log",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email"),
    event: text("event").notNull(), // login_success, login_failed, otp_sent, password_reset, ...
    provider: text("provider"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    eventIdx: index("auth_audit_log_event_idx").on(table.event),
    userIdx: index("auth_audit_log_user_idx").on(table.userId),
  }),
);

// Payment records for MercadoPago (Checkout Pro preferences and Preapproval subscriptions).
export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    businessId: integer("business_id").references(() => businesses.id, { onDelete: "set null" }),
    provider: text("provider").notNull().default("mercadopago"),
    providerPreferenceId: text("provider_preference_id"),
    providerPaymentId: text("provider_payment_id"),
    externalReference: text("external_reference").notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("PEN"),
    status: text("status").notNull().default("pending"), // pending | approved | rejected | refunded
    statusDetail: text("status_detail"),
    paymentMethod: text("payment_method"),
    description: text("description"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    externalRefIdx: uniqueIndex("payments_external_reference_uq").on(table.externalReference),
    preferenceIdx: index("payments_preference_idx").on(table.providerPreferenceId),
    paymentIdx: index("payments_payment_idx").on(table.providerPaymentId),
  }),
);

// Raw webhook log so events are idempotent and replayable.
export const paymentWebhookEvents = pgTable(
  "payment_webhook_events",
  {
    id: serial("id").primaryKey(),
    provider: text("provider").notNull().default("mercadopago"),
    eventId: text("event_id"),
    eventType: text("event_type"),
    topic: text("topic"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    signatureValid: boolean("signature_valid").default(false),
    processed: boolean("processed").notNull().default(false),
    processedAt: timestamp("processed_at"),
    error: text("error"),
    receivedAt: timestamp("received_at").defaultNow(),
  },
  (table) => ({
    eventIdx: uniqueIndex("payment_webhook_events_provider_event_uq").on(table.provider, table.eventId),
  }),
);

// Business subscription state driven by MercadoPago preapproval.
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").references(() => businesses.id, { onDelete: "cascade" }).notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    plan: text("plan").notNull().default("free"), // free | premium | premium_plus
    provider: text("provider").notNull().default("mercadopago"),
    providerPreapprovalId: text("provider_preapproval_id"),
    status: text("status").notNull().default("inactive"), // inactive | pending | authorized | paused | cancelled
    amount: decimal("amount", { precision: 12, scale: 2 }),
    currency: text("currency").notNull().default("PEN"),
    currentPeriodEnd: timestamp("current_period_end"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    businessIdx: uniqueIndex("subscriptions_business_uq").on(table.businessId),
  }),
);

// Email verification tokens issued on registration (single-use, hashed).
export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    tokenHash: text("token_hash").notNull(),
    usedAt: timestamp("used_at"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex("email_verification_tokens_hash_uq").on(table.tokenHash),
  }),
);

// User preferences for dashboard appearance
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id).notNull(),
  dashboardTheme: text("dashboard_theme").default("clasico"), // clasico, moderno, natural
  primaryColor: text("primary_color").default("#dc2626"),
  isDarkMode: boolean("is_dark_mode").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  district: text("district"), // Peru-specific district (distrito)
  referencia: text("referencia"), // Peru-specific reference/landmark
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
}, (table) => ({
  businessIdx: index("services_business_idx").on(table.businessId),
}));

// Clients/customers
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  businessId: serial("business_id").references(() => businesses.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  businessIdx: index("clients_business_idx").on(table.businessId),
}));

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
  // Lifecycle: reminder delivery + self-service cancel/reschedule link
  reminderSentAt: timestamp("reminder_sent_at"),
  cancelToken: text("cancel_token"),
}, (table) => ({
  businessDateIdx: index("appointments_business_date_idx").on(table.businessId, table.date),
  statusIdx: index("appointments_status_idx").on(table.status),
}));

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
  // Where the review came from: microsite | google | facebook | manual
  source: text("source").default("microsite"),
  // Moderation: pending | approved | rejected
  status: text("status").default("pending"),
  ownerReply: text("owner_reply"),
  ownerRepliedAt: timestamp("owner_replied_at"),
  appointmentId: integer("appointment_id"),
  clientEmail: text("client_email"),
  ipHash: text("ip_hash"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  businessStatusIdx: index("reviews_business_status_idx").on(table.businessId, table.status),
}));

// ---------------------------------------------------------------------------
// Micrositio traffic + lead capture (additive)
// ---------------------------------------------------------------------------

/** Anonymous, cookie-less microsite event stream used for the traffic funnel. */
export const micrositeEvents = pgTable("microsite_events", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id, { onDelete: "cascade" }).notNull(),
  slug: text("slug"),
  type: text("type").notNull(), // view | whatsapp_click | book_click | booking_completed
  path: text("path"),
  referrer: text("referrer"),
  source: text("source"), // direct | whatsapp | instagram | google | other
  device: text("device"), // mobile | desktop | tablet
  sessionId: text("session_id"),
  day: text("day").notNull(), // YYYY-MM-DD in America/Lima (indexed for range scans)
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  businessDayIdx: index("microsite_events_business_day_idx").on(table.businessId, table.day),
  typeIdx: index("microsite_events_type_idx").on(table.type),
}));

/** Contact messages sent from a public microsite (previously only a `mailto:`). */
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  message: text("message").notNull(),
  status: text("status").notNull().default("new"), // new | read | replied | archived
  source: text("source").default("microsite"),
  ipHash: text("ip_hash"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  businessStatusIdx: index("contact_messages_business_status_idx").on(table.businessId, table.status),
}));


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
  websiteUrl: text("website_url"),
  whatsappNumber: text("whatsapp_number"),

  // Public schedule (free-form per-day text used by the microsite editor)
  mondayHours: text("monday_hours"),
  tuesdayHours: text("tuesday_hours"),
  wednesdayHours: text("wednesday_hours"),
  thursdayHours: text("thursday_hours"),
  fridayHours: text("friday_hours"),
  saturdayHours: text("saturday_hours"),
  sundayHours: text("sunday_hours"),

  // Microsite gallery images
  gallery: jsonb("gallery").$type<Array<{ id: string; imageUrl: string; title?: string }>>().default([]),

  // Features
  enablePublicBooking: boolean("enable_public_booking").default(true),
  enableContactForm: boolean("enable_contact_form").default(true),
  enableGallery: boolean("enable_gallery").default(true),
  enableReviews: boolean("enable_reviews").default(true),

  // "Sobre nosotros" block (previously rendered by the microsite but never stored)
  aboutUs: text("about_us"),
  yearsOfExperience: text("years_of_experience"),
  specializations: text("specializations"),

  // SEO / AI-generated microsite copy
  publicTitle: text("public_title"),
  servicesDescription: text("services_description"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  keywords: text("keywords"),

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
}, (table) => ({
  businessIdx: index("business_settings_business_idx").on(table.businessId),
  customUrlIdx: uniqueIndex("business_settings_custom_url_uq").on(table.customUrl),
}));

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
  isActive: boolean("is_active").default(true),
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
  socialMedia: jsonb("social_media").$type<{ [key: string]: string }>(),
  imageUrls: text("image_urls").array(),
  verifiedStatus: text("verified_status").default("unverified"),
  dataFreshnessScore: integer("data_freshness_score").default(0),
  phoneFormatted: text("phone_formatted"),
  phoneCountryCode: text("phone_country_code").default("+51"),
  coordinatesValidated: boolean("coordinates_validated").default(false),
  businessStatus: text("business_status").default("unknown"),
  amenities: jsonb("amenities").$type<{ [key: string]: boolean }>(),
  priceRangeText: text("price_range_text"),
  lastScraped: timestamp("last_scraped").defaultNow(),
  scrapingSource: text("scraping_source").default("apify"),
  qualityScore: integer("quality_score").default(0),
  originalScrapedData: jsonb("original_scraped_data"), // Complete original scraped data

  // Badge system fields
  publicBadge: text("public_badge").default("unverified"),
  marketingBadge: text("marketing_badge").default("analyzing"),
  marketingPotentialScore: integer("marketing_potential_score").default(0),
  marketingOpportunities: jsonb("marketing_opportunities").$type<string[]>().default([]),
  lastBadgeAnalysis: timestamp("last_badge_analysis").defaultNow(),
  isClaimedGoogle: boolean("is_claimed_google").default(false),
  hasWebsiteAnalysis: boolean("has_website_analysis").default(false),
  digitalPresenceScore: integer("digital_presence_score").default(0),
  marketingNotes: text("marketing_notes")
});



// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

/**
 * What an anonymous visitor is allowed to submit. Everything moderation-related
 * (`status`, `source`, `ipHash`, `ownerReply`) is set server-side only.
 */
export const publicReviewSchema = z.object({
  businessId: z.number().int().positive(),
  clientName: z.string().trim().min(2).max(80),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1200).optional().or(z.literal("")),
  clientEmail: z.string().email().max(160).optional().or(z.literal("")),
  appointmentId: z.number().int().positive().optional(),
});

export const insertMicrositeEventSchema = createInsertSchema(micrositeEvents).omit({
  id: true,
  createdAt: true,
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  ipHash: true,
});

export const insertBusinessSettingsSchema = createInsertSchema(businessSettings).omit({
  id: true,
  businessId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  gallery: z
    .array(z.object({ id: z.string(), imageUrl: z.string(), title: z.string().optional() }))
    .nullish(),
  blockedDates: z
    .array(z.object({ startDate: z.string(), endDate: z.string(), reason: z.string().optional() }))
    .nullish(),
  blockedHours: z
    .array(
      z.object({ date: z.string(), startTime: z.string(), endTime: z.string(), reason: z.string().optional() }),
    )
    .nullish(),
  workingHours: z
    .record(
      z.object({
        enabled: z.boolean(),
        start: z.string(),
        end: z.string(),
      }),
    )
    .nullish(),
});

export const insertApifyBusinessSchema = createInsertSchema(apifyBusinesses).omit({
  id: true,
  lastUpdated: true,
  createdAt: true,
});

// OpenStreetMap businesses table for legal alternative data source
export const openstreetBusinesses = pgTable('openstreet_businesses', {
  id: serial('id').primaryKey(),
  osmId: text('osm_id').unique().notNull(), // OpenStreetMap ID
  osmType: text('osm_type'), // node, way, relation
  name: text('name'),
  amenity: text('amenity'), // shop, restaurant, etc.
  shop: text('shop'), // specific shop type
  address: text('address'),
  houseNumber: text('house_number'),
  street: text('street'),
  city: text('city'),
  district: text('district'),
  postcode: text('postcode'),
  phone: text('phone'),
  website: text('website'),
  email: text('email'),
  openingHours: text('opening_hours'),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  building: text('building'),
  buildingLevels: text('building_levels'),
  operator: text('operator'),
  brand: text('brand'),
  cuisine: text('cuisine'),
  wheelchair: text('wheelchair'),
  category: text('category').default('servicios'),
  subcategory: text('subcategory'),
  tags: jsonb('tags'), // All original OSM tags
  geometry: jsonb('geometry'), // GeoJSON geometry
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Create insert and select schemas for OpenStreetMap businesses
export const insertOpenstreetBusinessSchema = createInsertSchema(openstreetBusinesses).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertOpenstreetBusiness = z.infer<typeof insertOpenstreetBusinessSchema>;
export type SelectOpenstreetBusiness = typeof openstreetBusinesses.$inferSelect;



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
  parentId: integer("parent_id").references((): AnyPgColumn => networkingComments.id), // For nested comments
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

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;

export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;

export type BusinessConnection = typeof businessConnections.$inferSelect;
export type InsertBusinessConnection = typeof businessConnections.$inferInsert;

export type NetworkingPost = typeof networkingPosts.$inferSelect;
export type InsertNetworkingPost = typeof networkingPosts.$inferInsert;

export type NetworkingComment = typeof networkingComments.$inferSelect;
export type InsertNetworkingComment = typeof networkingComments.$inferInsert;

export type NetworkingLike = typeof networkingLikes.$inferSelect;
export type InsertNetworkingLike = typeof networkingLikes.$inferInsert;

export type CollaborationProject = typeof collaborationProjects.$inferSelect;
export type InsertCollaborationProject = typeof collaborationProjects.$inferInsert;

export type CollaborationParticipant = typeof collaborationParticipants.$inferSelect;
export type InsertCollaborationParticipant = typeof collaborationParticipants.$inferInsert;

export type BusinessReferral = typeof businessReferrals.$inferSelect;
export type InsertBusinessReferral = typeof businessReferrals.$inferInsert;

export type NetworkingEvent = typeof networkingEvents.$inferSelect;
export type InsertNetworkingEvent = typeof networkingEvents.$inferInsert;

export type EventAttendee = typeof eventAttendees.$inferSelect;
export type InsertEventAttendee = typeof eventAttendees.$inferInsert;

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
}).extend({
  tags: z.array(z.string()).nullish(),
  attachments: z.array(z.string()).nullish(),
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
}).extend({
  requiredSkills: z.array(z.string()).nullish(),
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
}).extend({
  tags: z.array(z.string()).nullish(),
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
export type InsertBusinessSettings = typeof businessSettings.$inferInsert;

export type MicrositeEvent = typeof micrositeEvents.$inferSelect;
export type InsertMicrositeEvent = typeof micrositeEvents.$inferInsert;

export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = typeof contactMessages.$inferInsert;

export type ApifyBusiness = typeof apifyBusinesses.$inferSelect;
export type InsertApifyBusiness = typeof apifyBusinesses.$inferInsert;

// Auth & payments types
export type AuthIdentity = typeof authIdentities.$inferSelect;
export type VerificationOtp = typeof verificationOtps.$inferSelect;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type AuthAuditEntry = typeof authAuditLog.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type PaymentWebhookEvent = typeof paymentWebhookEvents.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;

export const publicUserColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  phone: users.phone,
  avatarUrl: users.avatarUrl,
  role: users.role,
  emailVerified: users.emailVerified,
  phoneVerified: users.phoneVerified,
  createdAt: users.createdAt,
};

export type PublicUser = {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  emailVerified: boolean | null;
  phoneVerified: boolean | null;
  createdAt: Date | null;
};

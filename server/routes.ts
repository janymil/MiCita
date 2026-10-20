import { insertAppointmentSchema, insertBusinessSchema, insertBusinessSettingsSchema, insertClientSchema, insertReviewSchema, insertServiceSchema, insertUserSchema, type Business, type InsertApifyBusiness } from "@shared/schema";
import express, { type Express } from "express";
import fs from "fs";
import { createServer, type Server } from "http";
import { createHash, randomBytes } from "crypto";
import multer from "multer";
import rateLimit from "express-rate-limit";
import path from "path";
import authRoutes from "./auth-routes.js";
import paymentRoutes from "./payment-routes.js";
import { adminBusinessRoutes } from "./admin-business-routes.js";
import { registerAdminScrapingRoutes } from "./admin-scraping-routes.js";
import { getAuthenticatedUser, verifyBusinessOwnership, verifyClientOwnership, verifyServiceOwnership } from "./auth-helpers.js";
import { requireAuth, type AuthenticatedRequest } from "./auth-middleware.js";
import { emailService } from "./email-service.js";
import { AppointmentData } from "./email-templates";
import networkingRoutes from "./networking-routes.js";
import openstreetAdminRoutes from "./openstreet-admin-routes.js";
import galleryRoutes from "./routes/gallery.js";
import deskRoutes from "./routes/desk.js";
import publicQueueRoutes from "./routes/public-queue.js";
import publicPromosRoutes from "./routes/public-promos.js";
import publicDepositRoutes from "./routes/public-deposits.js";
import publicReviewRoutes from "./routes/public-reviews.js";
import publicWaitlistRoutes from "./routes/public-waitlist.js";
import publicLoyaltyRoutes from "./routes/public-loyalty.js";
import publicPackageRoutes from "./routes/public-packages.js";
import promosRoutes from "./routes/promos.js";
import packageRoutes from "./routes/packages.js";
import whatsappWebhookRoutes from "./routes/whatsapp-webhook.js";
import scrapingRoutes from "./routes/scraping.js";
import dataApplicationRoutes from "./routes/data-application.js";
import incrementalScrapingRoutes from "./routes/incremental-scraping.js";
import { simpleAdminRoutes } from "./simple-admin-routes.js";
import { storage } from "./storage";
import userPreferencesRoutes from "./user-preferences-routes.js";
// @ts-ignore - JavaScript modules without TypeScript declarations
import { searchAnalytics } from "./search-analytics.js";
// @ts-ignore - JavaScript modules without TypeScript declarations
import { apifyBusinesses, openstreetBusinesses } from "@shared/schema";
import { and, asc, desc, eq, gte, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "./db.js";
import { performanceOptimizer, SpatialClusterer } from "./performance-optimizer";
import { googlePlacesService } from "./google-places-service.js";
// @ts-ignore - JavaScript module without TypeScript declarations
import { searchPersonalization } from "./personalization.js";
import {
  buildBuckets,
  computeBusinessMetrics,
  computeCollected,
  computePopularTimes,
  computeFunnel,
  computeSourceBreakdown,
  computeTrafficSeries,
  limaDateISO,
  money,
  resolvePeriod,
  type Granularity,
  type PeriodKey,
} from "./lib/analytics.js";
import { addMonthsISO, limaTimeHM } from "./lib/dates.js";
import { getDeskSettings } from "./lib/desk-settings.js";
import { calculateDeposit, sendDepositRequest } from "./lib/deposits.js";
import { sendBookingConfirmation, sendBookingEmails } from "./lib/booking-notify.js";
import { notifyWaitlistForSlot } from "./lib/waitlist.js";
import { isMercadoPagoConfigured } from "./payments/mercadopago.js";
import { config } from "./config.js";


// Public microsite write endpoints (views, leads, reviews) are cheap to spam,
// so they get their own bucket on top of the global API limiter.
const publicWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== "production",
  message: { message: "Demasiadas solicitudes. Intenta de nuevo más tarde." },
});

/** Hash an IP so we can rate-limit/deduplicate without storing personal data. */
function hashIp(value: string | undefined): string | null {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

// ---------------------------------------------------------------------------
// Microsite URLs
// ---------------------------------------------------------------------------

/** Paths that already belong to the app shell and can never be a business slug. */
const RESERVED_SLUGS = new Set([
  "dashboard", "admin", "api", "auth", "login", "registro", "otp", "verify-email",
  "forgot-password", "reset-password", "buscar", "business", "documentation",
  "micrositio", "cita", "citas", "uploads", "assets", "static", "embed", "health",
  "mi-cita", "micita", "sitemap", "robots", "favicon", "public", "app",
]);

/** `"Peluquería Ñuñoa & Spa"` → `"peluqueria-nunoa-spa"`. */
export function slugifyBusinessName(input: string): string {
  const base = String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return base || "negocio";
}

export function isValidCustomUrl(value: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(value) && !RESERVED_SLUGS.has(value);
}

/**
 * Find a free, valid slug: the requested base, or `base-2`, `base-3`, …
 * Never returns a reserved word.
 */
async function allocateCustomUrl(base: string, currentBusinessId?: number): Promise<string> {
  const root = slugifyBusinessName(base);
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const candidate = attempt === 1 ? root : `${root}-${attempt}`;
    if (!isValidCustomUrl(candidate)) continue;
    const owner = await storage.getBusinessSettingsByCustomUrl(candidate);
    if (!owner || owner.businessId === currentBusinessId) return candidate;
  }
  return `${root}-${Date.now().toString(36).slice(-5)}`;
}



async function sendStatusChangeEmail(appointment: any, previousAppointment: any, businessId: number) {
  try {
    const business = await storage.getBusiness(businessId);
    const client = await storage.getClient(appointment.clientId);
    const service = await storage.getService(appointment.serviceId);

    if (!business || !client || !service) {
      console.error('Missing data for email notification');
      return;
    }

    const appointmentData: AppointmentData = {
      clientName: client.name,
      clientEmail: client.email || '',
      clientPhone: client.phone || '',
      businessName: business.name,
      businessEmail: business.email || '',
      serviceName: service.name,
      date: appointment.date,
      time: appointment.time,
      duration: service.duration || 30,
      price: appointment.price,
      notes: appointment.notes || ''
    };

    // Send appropriate email based on status
    if (appointment.status === 'cancelled') {
      await emailService.sendAppointmentCancelled(appointmentData);
    } else if (appointment.status === 'rescheduled' ||
      (appointment.date !== previousAppointment.date || appointment.time !== previousAppointment.time)) {
      // Send rescheduled email if status changed to rescheduled OR if date/time changed
      const rescheduledData = {
        ...appointmentData,
        previousDate: previousAppointment.date,
        previousTime: previousAppointment.time
      };
      await emailService.sendAppointmentRescheduled(rescheduledData);
    }

    console.log(`Status change email sent for appointment ${appointment.id}: ${previousAppointment.status} → ${appointment.status}`);
  } catch (error: any) {
    console.error('Error sending status change email:', error);
  }
}

// Smart scheduling algorithm to prevent double bookings
class SmartScheduler {
  // Check if two time periods overlap
  static hasTimeOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
    return start1 < end2 && start2 < end1;
  }

  // Convert time string to minutes since midnight
  static timeToMinutes(time: string): number {
    const [hour, min] = time.split(':').map(Number);
    return hour * 60 + min;
  }

  // Get the actual service duration for an appointment
  static async getServiceDuration(serviceId: number): Promise<number> {
    try {
      const service = await storage.getService(serviceId);
      return service?.duration || 30; // Default to 30 minutes if not found
    } catch {
      return 30;
    }
  }

  // Advanced conflict detection considering actual appointment durations
  static async detectConflicts(
    proposedStart: number,
    proposedDuration: number,
    existingAppointments: any[],
    date: string
  ): Promise<{ hasConflict: boolean; conflictingAppointments: any[] }> {
    const proposedEnd = proposedStart + proposedDuration;
    const conflictingAppointments = [];
    const durationCache = new Map<number, number>();

    for (const appointment of existingAppointments) {
      if (appointment.date !== date) continue;
      // A cancelled / no-show appointment releases its slot.
      if (["cancelled", "no_show"].includes(String(appointment.status || ""))) continue;

      const appointmentStart = this.timeToMinutes(appointment.time);
      const serviceId = appointment.serviceId || 0;
      let appointmentDuration = durationCache.get(serviceId);
      if (appointmentDuration === undefined) {
        appointmentDuration = await this.getServiceDuration(serviceId);
        durationCache.set(serviceId, appointmentDuration);
      }
      const appointmentEnd = appointmentStart + appointmentDuration;

      if (this.hasTimeOverlap(proposedStart, proposedEnd, appointmentStart, appointmentEnd)) {
        conflictingAppointments.push({
          ...appointment,
          calculatedDuration: appointmentDuration,
          calculatedEndTime: appointmentEnd
        });
      }
    }

    return {
      hasConflict: conflictingAppointments.length > 0,
      conflictingAppointments
    };
  }

  // Find optimal time slots with buffer time
  static async generateOptimalSlots(
    date: string,
    workingHours: any,
    blockedDates: any[],
    blockedHours: any[],
    existingAppointments: any[],
    serviceDuration: number,
    bufferMinutes: number = 15 // 15-minute buffer between appointments
  ): Promise<any[]> {
    const slots: any[] = [];
    if (!workingHours) return slots;

    // Parse YYYY-MM-DD in local time to avoid UTC day-shift issues
    const todayISO = limaDateISO();
    const dateParts = date.split('-').map(Number);
    const selectedDate = dateParts.length === 3
      ? new Date(dateParts[0], dateParts[1] - 1, dateParts[2])
      : new Date(date);

    // Convert JavaScript day (0=Sunday) to business day (1=Monday .. 7=Sunday) and English day name
    const jsDay = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const businessDay = jsDay === 0 ? 7 : jsDay; // Sunday becomes 7, Monday stays 1
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[jsDay];

    // Check if the day is a working day (support both English day names and numeric keys)
    const daySchedule = workingHours[dayName] || workingHours[businessDay.toString()] || workingHours[jsDay.toString()];
    if (!daySchedule || !daySchedule.enabled) {
      return slots;
    }

    // Check if the date is blocked
    const isDateBlocked = blockedDates?.some(blocked => {
      const startDate = new Date(blocked.startDate);
      const endDate = new Date(blocked.endDate);
      return selectedDate >= startDate && selectedDate <= endDate;
    });

    if (isDateBlocked) {
      return slots;
    }

    const startTime = daySchedule.start || '09:00';
    const endTime = daySchedule.end || '17:00';
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    // Generate appointment slots (not just 30-min intervals)
    // Consider service duration + buffer time
    const totalSlotTime = serviceDuration + bufferMinutes;
    void totalSlotTime;

    // Cache service durations once per request instead of querying per slot.
    const durationCache = new Map<number, number>();
    const resolveDuration = async (serviceId: number): Promise<number> => {
      const cached = durationCache.get(serviceId);
      if (cached !== undefined) return cached;
      const duration = await this.getServiceDuration(serviceId);
      durationCache.set(serviceId, duration);
      return duration;
    };

    // Slots that already started today must not be offered.
    const nowMinutes = date === todayISO ? Number(limaTimeHM().slice(0, 2)) * 60 + Number(limaTimeHM().slice(3, 5)) : -1;

    for (let minutes = startMinutes; minutes <= endMinutes - serviceDuration; minutes += 15) {
      if (nowMinutes >= 0 && minutes <= nowMinutes) continue;
      const hour = Math.floor(minutes / 60);
      const min = minutes % 60;
      const timeSlot = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

      // Check if proposed appointment would end before business closes
      if (minutes + serviceDuration > endMinutes) {
        continue;
      }

      // Check if the time slot is manually blocked
      const isTimeBlocked = blockedHours?.some(blocked => {
        if (blocked.date !== date) return false;

        const blockedStart = this.timeToMinutes(blocked.startTime);
        const blockedEnd = this.timeToMinutes(blocked.endTime);

        return this.hasTimeOverlap(minutes, minutes + serviceDuration, blockedStart, blockedEnd);
      });

      if (isTimeBlocked) {
        continue;
      }

      // Advanced conflict detection with actual service durations
      const hasAppointmentConflict = await Promise.all(
        existingAppointments.map(async appointment => {
          if (appointment.date !== date) return false;
          // Cancelled / no-show appointments do not block a slot.
          if (["cancelled", "no_show"].includes(String(appointment.status || ""))) return false;

          const appointmentStart = this.timeToMinutes(appointment.time);
          // Get actual service duration for existing appointment (cached)
          const actualDuration = await resolveDuration(appointment.serviceId || 0);
          const appointmentEnd = appointmentStart + actualDuration;

          // Check for overlap including buffer time
          return this.hasTimeOverlap(
            minutes,
            minutes + serviceDuration + bufferMinutes,
            appointmentStart - bufferMinutes,
            appointmentEnd
          );
        })
      ).then(results => results.some(hasConflict => hasConflict));

      slots.push({
        time: timeSlot,
        available: !hasAppointmentConflict,
        reason: hasAppointmentConflict ? 'conflicto_cita' : null
      });
    }

    return slots;
  }
}

// Enhanced helper function using smart scheduler
async function generateAvailableTimeSlots(
  date: string,
  workingHours: any,
  blockedDates: any[],
  blockedHours: any[],
  existingAppointments: any[],
  serviceDuration: number
) {
  return await SmartScheduler.generateOptimalSlots(
    date,
    workingHours,
    blockedDates,
    blockedHours,
    existingAppointments,
    serviceDuration,
    15 // 15-minute buffer between appointments
  );
}

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Sanitize a user segment so it can never escape the uploads directory.
function safeUserSegment(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]/g, '_').slice(0, 64) || 'unknown';
}

// Configure multer for file uploads
const multerStorage = multer.diskStorage({
  destination: (req: any, file, cb) => {
    try {
      // Default uploads directory
      let uploadPath = uploadsDir;

      // If user is authenticated, create user-specific directory
      if (req.user && req.user.email) {
        uploadPath = path.join(uploadsDir, 'users', safeUserSegment(req.user.email));

        // Create the directory if it doesn't exist
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    } catch (error: any) {
      console.error('Error creating upload directory:', error);
      cb(error, uploadsDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeExt = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    cb(null, uniqueSuffix + safeExt);
  }
});

const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {

  // Authentication routes (self-hosted: password, Google OAuth, email/phone OTP)
  app.use("/api/auth", authRoutes);

  // Payment routes (MercadoPago: Checkout Pro + Preapproval subscriptions)
  app.use("/api/payments", paymentRoutes);

  // Public same-day queue ("Saca tu turno" QR) — no account required.
  app.use("/api/public/queue", publicQueueRoutes);

  // Public dead-hour promos (share link / QR).
  app.use("/api/public/promos", publicPromosRoutes);

  // Public booking deposits (MercadoPago Checkout Pro).
  app.use("/api/public/appointments", publicDepositRoutes);

  // Public review link sent after a completed service.
  app.use("/api/public/reviews", publicReviewRoutes);

  // Public cancellation waitlist.
  app.use("/api/public/waitlist", publicWaitlistRoutes);

  // Public loyalty card lookup / token view.
  app.use("/api/public/loyalty", publicLoyaltyRoutes);

  // Public prepaid packages ("bonos").
  app.use("/api/public/packages", publicPackageRoutes);

  // Inbound webhook for the platform-owned WhatsApp bot (Formatika gateway).
  // `/api/webhooks/whatsapp` is the configured production endpoint; the router
  // also accepts `/formatika` as a backwards-compatible alias.
  app.use("/api/webhooks/whatsapp", whatsappWebhookRoutes);

  // Get subcategories by category
  app.get("/api/subcategories/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const subcategoriesResult = await storage.getSubcategoriesByCategory(category, true);
      res.json(subcategoriesResult);
    } catch (error: any) {
      console.error('Error fetching subcategories:', error);
      res.status(500).json({ message: "Error fetching subcategories" });
    }
  });

  // Get all subcategories grouped by category
  app.get("/api/subcategories", async (req, res) => {
    try {
      const subcategoriesResult = await storage.getAllSubcategories();
      res.json(subcategoriesResult);
    } catch (error: any) {
      console.error('Error fetching all subcategories:', error);
      res.status(500).json({ message: "Error fetching subcategories" });
    }
  });

  // Public search routes with performance optimization
  app.get("/api/search", async (req, res) => {
    const startTime = Date.now();

    try {
      const {
        q,
        category,
        subcategory,
        city,
        district,
        minRating = '0',
        maxPrice = '5',
        openNow = 'false',
        hasPhone = 'false',
        hasWebsite = 'false',
        hasEmail = 'false',
        sort = 'relevance',
        page = '1',
        limit = '20',
        bounds,
        zoom = '10'
      } = req.query;

      const searchParams = {
        query: (q as string) || "",
        category: category as string,
        subcategory: subcategory as string,
        city: city as string,
        district: district as string,
        minRating: parseFloat(minRating as string),
        maxPrice: parseFloat(maxPrice as string),
        openNow: openNow === 'true',
        hasPhone: hasPhone === 'true',
        hasWebsite: hasWebsite === 'true',
        hasEmail: hasEmail === 'true',
        sortBy: sort as any,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        bounds: bounds ? JSON.parse(bounds as string) : undefined,
        zoom: parseInt(zoom as string)
      };

      // Check cache first for non-map views or frequently accessed data
      const isMapView = req.query.map_view === 'true';
      if (!isMapView) {
        const cachedResult = performanceOptimizer.getCachedResult(searchParams);
        if (cachedResult) {
          console.log('🚀 Cache hit - returning cached result');
          return res.json(cachedResult);
        }
      }

      console.log('🔍 Enhanced search request:', {
        query: q,
        category,
        subcategory,
        city,
        district,
        minRating: parseFloat(minRating as string),
        filters: { openNow, hasPhone, hasWebsite, hasEmail },
        sort,
        page: parseInt(page as string)
      });

      // Direct database search for better control
      const searchQuery = {
        query: (q as string) || "",
        category: category as string,
        subcategory: subcategory as string,
        city: city as string,
        district: district as string,
        minRating: parseFloat(minRating as string),
        maxPrice: parseFloat(maxPrice as string),
        openNow: openNow === 'true',
        hasPhone: hasPhone === 'true',
        hasWebsite: hasWebsite === 'true',
        hasEmail: hasEmail === 'true',
        sortBy: sort as any,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        bounds: bounds ? JSON.parse(bounds as string) : undefined
      };

      // Build database conditions
      const dbConditions = [];

      // Text search
      if (searchQuery.query && searchQuery.query.trim()) {
        const searchTerm = searchQuery.query.trim();
        dbConditions.push(
          sql`(${apifyBusinesses.name} ILIKE ${'%' + searchTerm + '%'} OR 
               ${apifyBusinesses.address} ILIKE ${'%' + searchTerm + '%'} OR 
               ${apifyBusinesses.searchTerms} ILIKE ${'%' + searchTerm + '%'})`
        );
      }

      // Category filter - normalize database categories
      if (searchQuery.category && searchQuery.category !== 'all') {
        const normalizedCategory = searchQuery.category.toLowerCase();
        if (normalizedCategory === 'gastronomia') {
          dbConditions.push(sql`LOWER(${apifyBusinesses.category}) = 'gastronomía'`);
        } else {
          dbConditions.push(sql`LOWER(${apifyBusinesses.category}) = ${normalizedCategory}`);
        }
      }

      // Subcategory filter
      if (searchQuery.subcategory && searchQuery.subcategory !== 'all') {
        dbConditions.push(eq(apifyBusinesses.subcategory, searchQuery.subcategory));
      }

      // District filter
      if (searchQuery.district && searchQuery.district !== 'all') {
        dbConditions.push(eq(apifyBusinesses.district, searchQuery.district));
      }

      // Rating filter
      if (searchQuery.minRating > 0) {
        dbConditions.push(gte(apifyBusinesses.rating, searchQuery.minRating.toString()));
      }

      // Contact filters
      if (searchQuery.hasPhone) {
        dbConditions.push(and(isNotNull(apifyBusinesses.phone), ne(apifyBusinesses.phone, '')));
      }
      if (searchQuery.hasWebsite) {
        dbConditions.push(and(isNotNull(apifyBusinesses.website), ne(apifyBusinesses.website, '')));
      }
      if (searchQuery.hasEmail) {
        dbConditions.push(and(isNotNull(apifyBusinesses.email), ne(apifyBusinesses.email, '')));
      }

      // Open now filter
      if (searchQuery.openNow) {
        dbConditions.push(eq(apifyBusinesses.openNow, true));
      }

      // Build the main query
      const whereCondition = dbConditions.length > 0 ? and(...dbConditions) : undefined;

      const ordering =
        searchQuery.sortBy === 'rating'
          ? [desc(apifyBusinesses.rating)]
          : searchQuery.sortBy === 'reviews'
            ? [desc(apifyBusinesses.reviewCount)]
            : searchQuery.sortBy === 'name'
              ? [asc(apifyBusinesses.name)]
              : [desc(apifyBusinesses.rating), desc(apifyBusinesses.reviewCount)];

      const fullBusinessQuery = (whereCondition
        ? db.select().from(apifyBusinesses).where(whereCondition)
        : db.select().from(apifyBusinesses)
      ).orderBy(...ordering);

      const countQuery = whereCondition
        ? db.select({ count: sql<number>`count(*)` }).from(apifyBusinesses).where(whereCondition)
        : db.select({ count: sql<number>`count(*)` }).from(apifyBusinesses);

      // Map view returns the same row shape (the client only reads the fields
      // it needs); this keeps a single, type-safe query path.
      const apifyResultQuery = isMapView
        ? fullBusinessQuery
        : fullBusinessQuery.limit(searchParams.limit).offset((searchParams.page - 1) * searchParams.limit);

      // Also search OpenStreetMap businesses with similar filters
      const osmConditions: any[] = [];

      // Apply same search conditions to OSM data
      if (searchQuery.query && searchQuery.query.trim()) {
        const searchTerm = searchQuery.query.trim();
        osmConditions.push(
          sql`(${openstreetBusinesses.name} ILIKE ${'%' + searchTerm + '%'} OR 
               ${openstreetBusinesses.address} ILIKE ${'%' + searchTerm + '%'} OR 
               ${openstreetBusinesses.amenity} ILIKE ${'%' + searchTerm + '%'} OR
               ${openstreetBusinesses.shop} ILIKE ${'%' + searchTerm + '%'})`
        );
      }

      if (searchQuery.category && searchQuery.category !== 'all') {
        osmConditions.push(eq(openstreetBusinesses.category, searchQuery.category));
      }

      if (searchQuery.district && searchQuery.district !== 'all') {
        osmConditions.push(eq(openstreetBusinesses.district, searchQuery.district));
      }

      if (searchQuery.hasPhone) {
        osmConditions.push(and(isNotNull(openstreetBusinesses.phone), ne(openstreetBusinesses.phone, '')));
      }
      if (searchQuery.hasWebsite) {
        osmConditions.push(and(isNotNull(openstreetBusinesses.website), ne(openstreetBusinesses.website, '')));
      }
      if (searchQuery.hasEmail) {
        osmConditions.push(and(isNotNull(openstreetBusinesses.email), ne(openstreetBusinesses.email, '')));
      }

      const osmWhereCondition = osmConditions.length > 0 ? and(...osmConditions) : undefined;

      // Apply OSM sorting (no ratings, so sort by name or contact quality)
      const osmQuery = (osmWhereCondition
        ? db.select().from(openstreetBusinesses).where(osmWhereCondition)
        : db.select().from(openstreetBusinesses)
      ).orderBy(asc(openstreetBusinesses.name));

      // Count OSM businesses
      const osmCountQuery = osmWhereCondition
        ? db.select({ count: sql<number>`count(*)` }).from(openstreetBusinesses).where(osmWhereCondition)
        : db.select({ count: sql<number>`count(*)` }).from(openstreetBusinesses);

      // Execute all queries
      const [apifyBusinessesList, totalCountResult, osmBusinessesList, osmCountResult] = await Promise.all([
        apifyResultQuery,
        countQuery,
        isMapView ? osmQuery : osmQuery.limit(Math.max(5, searchParams.limit - 10)), // Get some OSM results
        osmCountQuery
      ]);

      const totalApifyCount = totalCountResult[0]?.count || 0;
      const totalOsmCount = osmCountResult[0]?.count || 0;

      // Convert OSM businesses to compatible format
      const formattedOsmBusinesses = osmBusinessesList.map(osm => ({
        placeId: `osm_${osm.id}`,
        name: osm.name,
        address: osm.address,
        phone: osm.phone,
        website: osm.website,
        email: osm.email,
        latitude: osm.latitude,
        longitude: osm.longitude,
        rating: null,
        reviewCount: null,
        priceLevel: null,
        category: osm.category,
        subcategory: osm.subcategory,
        district: osm.district,
        city: osm.city,
        imageUrl: null,
        openNow: null,
        source: 'openstreetmap',
        businessType: 'openstreetmap',
        amenity: osm.amenity,
        shop: osm.shop,
        openingHours: osm.openingHours,
        operator: osm.operator,
        brand: osm.brand
      }));

      // Combine results - prioritize Apify (with ratings) but include OSM for coverage
      const combinedBusinesses = [...apifyBusinessesList, ...formattedOsmBusinesses];
      const totalCount = totalApifyCount + totalOsmCount;

      // Create search result format
      const searchResult = {
        businesses: apifyBusinessesList,
        totalCount,
        page: searchQuery.page,
        totalPages: Math.ceil(totalCount / searchQuery.limit),
        hasMore: searchQuery.page < Math.ceil(totalCount / searchQuery.limit),
        searchMetrics: {
          searchTime: 50, // Approximate
          totalMatches: totalCount,
          relevanceScores: [],
          queryAnalysis: []
        }
      };



      // Convert Apify businesses to expected frontend format with performance optimization
      let formattedResults = searchResult.businesses.map(business => ({
        id: business.placeId,
        name: business.name,
        address: business.address,
        category: business.category,
        rating: parseFloat(business.rating || '0'),
        reviewCount: business.reviewCount || 0,
        priceLevel: business.priceLevel || 0,
        phone: business.phone || undefined,
        website: business.website || undefined,
        email: business.email || undefined,
        photoUrl: business.photoUrl || undefined,
        location: {
          lat: parseFloat(business.latitude || '0'),
          lng: parseFloat(business.longitude || '0'),
        },
        openNow: business.openNow || undefined,
        hours: business.hours || undefined,
        isRegistered: business.isRegistered || false,
        type: "google"
      }));

      // Apply spatial clustering for map view if many results
      if (isMapView && formattedResults.length > 50) {
        formattedResults = SpatialClusterer.clusterBusinesses(formattedResults, searchParams.zoom);
        console.log(`🗺️ Applied clustering: ${searchResult.businesses.length} → ${formattedResults.length} markers`);
      }

      // Add registered businesses to the beginning of results for priority
      let registeredBusinesses: Business[] = [];

      try {
        // Only fetch registered businesses if they match search criteria
        if (!searchQuery.query && (!searchQuery.category || searchQuery.category === 'all') && !searchQuery.city) {
          registeredBusinesses = await storage.getAllActiveBusinesses();
        } else {
          registeredBusinesses = await storage.searchBusinesses(searchQuery.query, searchQuery.category, searchQuery.city);
        }

        console.log('🏢 Registered businesses found:', registeredBusinesses.length);
      } catch (error: any) {
        console.error('❌ Registered business search error:', error);
        registeredBusinesses = [];
      }

      // For registered businesses, get their customUrl and coverImage from settings
      const businessesWithCustomUrl = await Promise.all(
        registeredBusinesses.map(async (business) => {
          const settings = await storage.getBusinessSettings(business.id);
          return {
            ...business,
            customUrl: settings?.customUrl || business.slug,
            coverImage: settings?.coverImage || business.coverImage,
            type: "registered"
          };
        })
      );

      // Enhanced district detection function
      const detectDistrictFromBusiness = (business: any): string | null => {
        // First check if business already has district field (for ApifyBusinesses)
        if (business.district) {
          return business.district.toLowerCase();
        }

        // District detection from address
        if (!business.address || typeof business.address !== 'string') {
          return null;
        }

        const addressLower = business.address.toLowerCase();

        // Lima districts and their variations
        const LIMA_DISTRICTS = {
          'miraflores': ['miraflores'],
          'san juan de miraflores': ['san juan de miraflores', 'sjm'],
          'san isidro': ['san isidro'],
          'san miguel': ['san miguel'],
          'san borja': ['san borja'],
          'surco': ['surco', 'santiago de surco'],
          'la molina': ['la molina'],
          'barranco': ['barranco'],
          'jesus maria': ['jesus maria', 'jesús maría'],
          'magdalena del mar': ['magdalena del mar', 'magdalena'],
          'pueblo libre': ['pueblo libre'],
          'lince': ['lince'],
          'breña': ['breña', 'brena'],
          'callao': ['callao'],
          'chorrillos': ['chorrillos'],
          'ate': ['ate', 'ate vitarte'],
          'comas': ['comas'],
          'independencia': ['independencia'],
          'los olivos': ['los olivos'],
          'san martin de porres': ['san martin de porres', 'san martín de porres', 'smp'],
          'rimac': ['rimac', 'rímac'],
          'la victoria': ['la victoria'],
          'cercado de lima': ['cercado de lima', 'lima cercado', 'lima centro'],
          'el agustino': ['el agustino'],
          'santa anita': ['santa anita'],
          'lurigancho': ['lurigancho', 'lurigancho chosica'],
          'san juan de lurigancho': ['san juan de lurigancho', 'sjl'],
          'villa el salvador': ['villa el salvador', 'ves'],
          'villa maría del triunfo': ['villa maría del triunfo', 'villa maria del triunfo', 'vmt'],
          'pachacamac': ['pachacamac'],
          'lurín': ['lurin', 'lurín'],
          'punta hermosa': ['punta hermosa'],
          'pucusana': ['pucusana'],
          'santa maría del mar': ['santa maría del mar', 'santa maria del mar'],
          'ancón': ['ancon', 'ancón'],
          'carabayllo': ['carabayllo'],
          'puente piedra': ['puente piedra'],
          'santa rosa': ['santa rosa'],
          'ventanilla': ['ventanilla'],
          'bellavista': ['bellavista'],
          'carmen de la legua reynoso': ['carmen de la legua reynoso', 'carmen de la legua'],
          'la perla': ['la perla'],
          'la punta': ['la punta'],
          'surquillo': ['surquillo'],
          'san luis': ['san luis'],
          'chaclacayo': ['chaclacayo'],
          'cieneguilla': ['cieneguilla']
        };

        // Look for district patterns in address
        for (const [district, variations] of Object.entries(LIMA_DISTRICTS)) {
          for (const variation of variations) {
            const regex = new RegExp(`\\b${variation.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'i');
            if (regex.test(addressLower)) {
              // Special handling for Miraflores to exclude San Juan de Miraflores
              if (district === 'miraflores' && addressLower.includes('san juan')) {
                continue;
              }
              return district;
            }
          }
        }

        return null;
      };

      // Unified filtering function that applies to all business types
      const applyUnifiedFilters = (businesses: any[], searchQuery: any): any[] => {
        return businesses.filter(business => {
          // Rating filter - convert string ratings to numbers for comparison
          if (searchQuery.minRating && searchQuery.minRating > 0) {
            const rating = parseFloat(business.rating || '0');
            if (rating < searchQuery.minRating) return false;
          }

          // Price filter - handle missing priceLevel gracefully
          if (searchQuery.maxPrice && searchQuery.maxPrice < 5) {
            const priceLevel = business.priceLevel || 0;
            if (priceLevel > searchQuery.maxPrice) return false;
          }

          // Contact filters - check for existence and non-empty values
          if (searchQuery.hasPhone) {
            if (!business.phone || business.phone.trim() === '') return false;
          }

          if (searchQuery.hasWebsite) {
            if (!business.website || business.website.trim() === '') return false;
          }

          if (searchQuery.hasEmail) {
            if (!business.email || business.email.trim() === '') return false;
          }

          // Open now filter - only apply to businesses with openNow data
          if (searchQuery.openNow) {
            if (business.type === 'registered' || business.type === 'public') {
              // For registered/public businesses without openNow data, exclude them
              // This prevents false positives until business hours are implemented
              return false;
            }
            if (business.openNow !== true) return false;
          }

          // District filter - enhanced automatic detection
          if (searchQuery.district && searchQuery.district !== 'all') {
            const detectedDistrict = detectDistrictFromBusiness(business);
            const targetDistrict = searchQuery.district.toLowerCase();

            if (!detectedDistrict || detectedDistrict !== targetDistrict) {
              return false;
            }
          }

          // Map bounds filter - check if business is within specified coordinates
          if (searchQuery.bounds) {
            const bounds = typeof searchQuery.bounds === 'string'
              ? JSON.parse(searchQuery.bounds)
              : searchQuery.bounds;

            const lat = parseFloat(business.location?.lat || business.latitude || '0');
            const lng = parseFloat(business.location?.lng || business.longitude || '0');

            // Skip businesses without location data
            if (lat === 0 && lng === 0) return false;

            // Check if business is within bounds
            if (lat < bounds.south || lat > bounds.north ||
              lng < bounds.west || lng > bounds.east) {
              return false;
            }
          }

          return true;
        });
      };

      // Apply category normalization for frontend display
      const normalizeCategory = (category: string): string => {
        const categoryMap: Record<string, string> = {
          'gastronomía': 'gastronomia',
          'belleza': 'belleza',
          'salud': 'salud',
          'fitness': 'fitness',
          'servicios': 'servicios',
          'automotriz': 'automotriz'
        };

        return categoryMap[category.toLowerCase()] || category.toLowerCase();
      };

      // Normalize categories and combine results with registered businesses first
      const normalizedResults = [
        ...businessesWithCustomUrl.map(b => ({ ...b, category: normalizeCategory(b.category) })),
        ...formattedResults.map(f => ({ ...f, category: normalizeCategory(f.category) }))
      ];

      // Use the actual database result totals instead of client-side filtering
      const totalResults = parseInt(searchResult.totalCount.toString()) + businessesWithCustomUrl.length;

      // Apply simple pagination to the combined results
      const startIndex = (searchQuery.page - 1) * searchQuery.limit;
      const endIndex = startIndex + searchQuery.limit;

      // For the first page, prioritize registered businesses
      let paginatedResults = [];
      if (searchQuery.page === 1) {
        paginatedResults = [
          ...businessesWithCustomUrl,
          ...formattedResults.slice(0, searchQuery.limit - businessesWithCustomUrl.length)
        ];
      } else {
        // For subsequent pages, show only Apify businesses
        const adjustedStartIndex = startIndex - businessesWithCustomUrl.length;
        const adjustedEndIndex = endIndex - businessesWithCustomUrl.length;
        paginatedResults = formattedResults.slice(adjustedStartIndex, adjustedEndIndex);
      }

      // Apply personalization to paginated results only
      const userId = req.headers['x-user-id'] as string || null;
      const sessionId = (req.headers['x-session-id'] as string) || 'anonymous';
      const personalizedResults = searchPersonalization.personalizeResults(
        paginatedResults,
        userId,
        sessionId,
        searchQuery
      );

      // Calculate actual performance metrics
      const actualSearchTime = Date.now() - startTime;

      console.log('🔍 Search results summary:', {
        totalApifyBusinesses: searchResult.totalCount,
        registeredBusinesses: businessesWithCustomUrl.length,
        totalResults: totalResults,
        currentPage: searchParams.page,
        returnedResults: paginatedResults.length,
        performanceTime: `${actualSearchTime}ms`,
        cacheUsed: false,
        clustered: isMapView && searchResult.businesses.length > 50
      });

      const finalResponse = {
        results: personalizedResults,
        pagination: {
          currentPage: searchParams.page,
          totalPages: Math.ceil(totalResults / searchParams.limit),
          totalResults: totalResults,
          actualResults: personalizedResults.length,
          resultsPerPage: searchParams.limit,
          hasNextPage: endIndex < totalResults,
          hasPrevPage: searchParams.page > 1,
          mightHaveMore: endIndex < totalResults
        },
        searchMetrics: {
          searchTime: actualSearchTime,
          totalMatches: totalResults,
          queryAnalysis: searchResult.searchMetrics?.queryAnalysis || [],
          averageRelevanceScore: 0,
          filteringApplied: true,
          cacheStats: performanceOptimizer.getCacheStats()
        }
      };

      // Cache results for non-map views with fast search times
      if (!isMapView && actualSearchTime < 1000) {
        performanceOptimizer.cacheResult(searchParams, finalResponse, 5 * 60 * 1000); // 5 minutes TTL
      }

      res.json(finalResponse);

      // Track search analytics
      await searchAnalytics.trackSearch({
        query: searchQuery.query,
        category: searchQuery.category,
        district: searchQuery.district,
        filters: {
          minRating: searchQuery.minRating,
          maxPrice: searchQuery.maxPrice,
          hasPhone: searchQuery.hasPhone,
          hasWebsite: searchQuery.hasWebsite,
          hasEmail: searchQuery.hasEmail,
          openNow: searchQuery.openNow
        },
        resultsCount: totalResults,
        searchTime: searchResult.searchMetrics.searchTime,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        sessionId: (req.headers['x-session-id'] as string) || 'anonymous',
        userId: userId
      });

      // Update personalization profiles
      searchPersonalization.updateUserProfile(userId, {
        query: searchQuery.query,
        category: searchQuery.category,
        district: searchQuery.district,
        filters: {
          minRating: searchQuery.minRating,
          maxPrice: searchQuery.maxPrice,
          hasPhone: searchQuery.hasPhone,
          hasWebsite: searchQuery.hasWebsite,
          hasEmail: searchQuery.hasEmail,
          openNow: searchQuery.openNow
        },
        resultsCount: totalResults
      });

      searchPersonalization.updateSessionProfile(sessionId, {
        query: searchQuery.query,
        category: searchQuery.category,
        district: searchQuery.district,
        resultsCount: totalResults
      });

    } catch (error: any) {
      console.error('❌ Enhanced search error:', error);
      res.status(500).json({ message: "Error en la búsqueda" });
    }
  });

  // Analytics endpoints
  app.get("/api/search/analytics", async (req, res) => {
    try {
      const { timeframe = '24h' } = req.query;
      const analytics = searchAnalytics.getAnalyticsSummary(timeframe as string);
      res.json(analytics);
    } catch (error: any) {
      console.error('❌ Analytics error:', error);
      res.status(500).json({ message: "Error retrieving analytics" });
    }
  });

  app.get("/api/search/analytics/performance", async (req, res) => {
    try {
      const performance = searchAnalytics.getPerformanceMetrics();
      res.json(performance);
    } catch (error: any) {
      console.error('❌ Performance analytics error:', error);
      res.status(500).json({ message: "Error retrieving performance data" });
    }
  });

  app.get("/api/search/analytics/popular", async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const popular = searchAnalytics.getPopularCategories(parseInt(limit as string));
      res.json(popular);
    } catch (error: any) {
      console.error('❌ Popular analytics error:', error);
      res.status(500).json({ message: "Error retrieving popular data" });
    }
  });

  // Enhanced search suggestions endpoint with analytics
  app.get("/api/search/suggestions", async (req, res) => {
    try {
      const { q, limit = '5' } = req.query;

      if (!q || (q as string).length < 2) {
        // Return trending searches if no query
        const trending = searchAnalytics.getTrendingSearches(parseInt(limit as string));
        return res.json(trending.map((item: any) => ({
          value: item.query.toLowerCase(),
          label: item.query,
          type: 'trending',
          count: item.count
        })));
      }

      // Get analytics-based suggestions
      const analyticsSuggestions = searchAnalytics.getSearchSuggestions(
        q as string,
        parseInt(limit as string)
      );

      // Get database-based suggestions
      const { enhancedSearchEngine } = await import('./enhanced-search-engine');
      const dbSuggestions = await enhancedSearchEngine.getSearchSuggestions(
        q as string,
        parseInt(limit as string)
      );

      // Combine and prioritize suggestions
      const combinedSuggestions = [
        ...analyticsSuggestions,
        ...dbSuggestions
      ];

      // Remove duplicates and limit results
      const uniqueSuggestions = combinedSuggestions
        .filter((suggestion, index, self) =>
          index === self.findIndex(s => s.value === suggestion.value)
        )
        .slice(0, parseInt(limit as string));

      res.json(uniqueSuggestions);
    } catch (error: any) {
      console.error('❌ Search suggestions error:', error);
      res.status(500).json({ message: "Error obteniendo sugerencias" });
    }
  });

  // Get category counts
  app.get("/api/categories/counts", async (req, res) => {
    try {
      // Get category counts directly from database
      const categoryCounts = await db
        .select({
          category: apifyBusinesses.category,
          count: sql<number>`count(*)`
        })
        .from(apifyBusinesses)
        .groupBy(apifyBusinesses.category)
        .orderBy(sql`count(*) DESC`);

      // Normalize category names for frontend
      const normalizedCounts = categoryCounts.map(item => ({
        category: item.category.toLowerCase() === 'gastronomía' ? 'gastronomia' : item.category.toLowerCase(),
        count: item.count
      }));

      res.json(normalizedCounts);
    } catch (error: any) {
      console.error('Error fetching category counts:', error);
      res.status(500).json({ error: "Failed to fetch category counts" });
    }
  });

  // Get subcategories by category
  app.get("/api/subcategories/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const { includeCounts } = req.query;

      // Normalize category name to match database format
      const categoryMap: Record<string, string> = {
        'gastronomia': 'Gastronomía',
        'belleza': 'belleza',
        'salud': 'salud',
        'fitness': 'fitness',
        'servicios': 'servicios'
      };

      const normalizedCategory = categoryMap[category.toLowerCase()] || category;

      if (includeCounts === 'true') {
        const subcategoriesWithCounts = await storage.getSubcategoriesByCategory(normalizedCategory, true);
        res.json(subcategoriesWithCounts);
      } else {
        const subcategories = await storage.getSubcategoriesByCategory(normalizedCategory);
        res.json(subcategories);
      }
    } catch (error: any) {
      console.error('❌ Error getting subcategories:', error);
      res.status(500).json({ message: "Error obteniendo subcategorías" });
    }
  });

  // Get all subcategories grouped by category
  app.get("/api/subcategories", async (req, res) => {
    try {
      const subcategories = await storage.getAllSubcategories();
      res.json(subcategories);
    } catch (error: any) {
      console.error('❌ Error getting all subcategories:', error);
      res.status(500).json({ message: "Error obteniendo subcategorías" });
    }
  });

  // Remove dynamic categories endpoint - reverted to hardcoded

  // Remove dynamic category counts endpoint - reverted to hardcoded

  // Test API endpoints to verify services are working
  app.get("/api/test-apis", async (req, res) => {
    try {
      const results = {
        cached: { status: 'unknown', message: '', count: 0 },
        apify: { status: 'unknown', message: '', count: 0 }
      };

      // Test cached data availability
      try {
        console.log('🧪 Testing cached business data...');
        const cachedResults = await storage.searchCachedGoogleBusinesses('barberia', 'belleza');
        results.cached = {
          status: 'working',
          message: `Found ${cachedResults.length} businesses from Apify cache`,
          count: cachedResults.length
        };
      } catch (error: any) {
        results.cached = {
          status: 'error',
          message: `Cached data error: ${error.message}`,
          count: 0
        };
      }

      // Test Apify API
      try {
        console.log('🧪 Testing Apify scraping...');
        const { apifyScraper } = await import('./apify-scraper-service');
        const testResult = await apifyScraper.testScraping();

        if (testResult.success) {
          results.apify = {
            status: 'working',
            message: `Successfully scraped ${testResult.sampleData.scraped} businesses`,
            count: testResult.sampleData.scraped
          };
        } else {
          results.apify = {
            status: 'error',
            message: testResult.error || 'Unknown Apify error',
            count: 0
          };
        }
      } catch (error: any) {
        results.apify = {
          status: 'error',
          message: `Apify API error: ${error.message}`,
          count: 0
        };
      }

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Apify scraping endpoints
  app.post("/api/scrape/test", async (req, res) => {
    try {
      console.log('🧪 Running Apify test scraping...');
      const { apifyScraper } = await import('./apify-scraper-service');
      const result = await apifyScraper.testScraping();

      res.json({
        success: result.success,
        message: result.success ? 'Test scraping completed successfully' : 'Test scraping failed',
        data: result.sampleData,
        error: result.error
      });
    } catch (error: any) {
      console.error('Test scraping error:', error);
      res.status(500).json({
        success: false,
        message: 'Test scraping failed',
        error: error.message
      });
    }
  });

  app.post("/api/scrape/category", async (req, res) => {
    try {
      const { category, location = 'Lima, Peru', maxPlaces = 50 } = req.body;

      if (!category) {
        return res.status(400).json({ message: 'Category is required' });
      }

      console.log(`🔍 Scraping ${category} businesses...`);
      const { apifyScraper } = await import('./apify-scraper-service');
      const businesses = await apifyScraper.scrapeCategoryBusinesses(category, location, maxPlaces);

      res.json({
        success: true,
        message: `Successfully scraped ${businesses.length} businesses`,
        data: {
          category,
          location,
          scraped: businesses.length,
          businesses: businesses.slice(0, 5) // Return first 5 as sample
        }
      });
    } catch (error: any) {
      console.error('Category scraping error:', error);
      res.status(500).json({
        success: false,
        message: 'Category scraping failed',
        error: error.message
      });
    }
  });

  app.post("/api/scrape/lima-comprehensive", async (req, res) => {
    try {
      console.log('🚀 Starting comprehensive Lima business scraping...');
      const { apifyScraper } = await import('./apify-scraper-service');

      // Start scraping in background and return immediately
      res.json({
        success: true,
        message: 'Comprehensive Lima scraping started',
        status: 'running',
        note: 'This process will run in background. Check logs for progress.'
      });

      // Run scraping in background
      apifyScraper.scrapeLimaBusinesses().then(result => {
        console.log('🎉 Comprehensive scraping completed:', result);
      }).catch(error => {
        console.error('❌ Comprehensive scraping failed:', error);
      });

    } catch (error: any) {
      console.error('Comprehensive scraping error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start comprehensive scraping',
        error: error.message
      });
    }
  });

  // Business details endpoint (cached data only)
  app.get("/api/places/:placeId", async (req, res) => {
    try {
      const { placeId } = req.params;

      // Check Apify businesses
      const apifyBusiness = await storage.getApifyBusiness(placeId);

      if (apifyBusiness) {
        res.json({
          name: apifyBusiness.name,
          address: apifyBusiness.address,
          phone: apifyBusiness.phone,
          website: apifyBusiness.website,
          rating: apifyBusiness.rating,
          reviewCount: apifyBusiness.reviewCount,
          photoUrl: apifyBusiness.photoUrl,
          hours: apifyBusiness.hours,
          category: apifyBusiness.category,
          latitude: apifyBusiness.latitude,
          longitude: apifyBusiness.longitude
        });
        return;
      }

      return res.status(404).json({ message: "Negocio no encontrado en los datos almacenados" });
    } catch (error: any) {
      console.error("Error fetching place details:", error);
      res.status(500).json({ message: "Error obteniendo detalles del negocio" });
    }
  });

  // Pull fresh data from Apify dataset
  app.post("/api/apify/pull-fresh", async (req, res) => {
    try {
      console.log('🔄 Pulling fresh data from Apify dataset...');
      const apifyToken = process.env.APIFY_API_TOKEN;
      if (!apifyToken) {
        return res.status(500).json({ message: "APIFY_API_TOKEN is not configured" });
      }

      const response = await fetch(`https://api.apify.com/v2/datasets/jC3uI7WSuQKRTj2i1/items?token=${apifyToken}&clean=true&format=json&limit=2000`);

      if (!response.ok) {
        throw new Error(`Apify API error: ${response.status}`);
      }

      const apifyData = await response.json();
      console.log(`📦 Retrieved ${apifyData.length} businesses from Apify dataset`);

      let processed = 0;

      for (const item of apifyData) { // Process all items
        try {
          const cacheData = {
            placeId: item.placeId || `apify_${Date.now()}_${Math.random()}`,
            name: item.title || 'Business',
            address: item.address || 'Lima, Peru',
            category: mapCategoryFromApify(item.categoryName || ''),
            rating: (item.totalScore || item.rating || 0).toString(),
            reviewCount: item.reviewsCount || 0,
            priceLevel: item.priceLevel || 0,
            phone: item.phoneUnformatted || item.phone || null,
            website: item.website || null,
            photoUrl: item.imageUrls?.[0] || null,
            latitude: item.location?.lat?.toString() || '0',
            longitude: item.location?.lng?.toString() || '0',
            openNow: null,
            hours: item.openingHours ? JSON.stringify(item.openingHours) : null,
            searchTerms: `${item.title} ${item.address} ${item.categoryName}`.toLowerCase(),
            isRegistered: false
          };

          await storage.addApifyBusiness(cacheData as InsertApifyBusiness);
          processed++;
        } catch (error: any) {
          console.error(`❌ Error processing business: ${error.message}`);
        }
      }

      res.json({
        success: true,
        message: `Successfully processed ${processed} businesses from Apify dataset`,
        processed,
        total: apifyData.length
      });

    } catch (error: any) {
      console.error('❌ Error pulling fresh Apify data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to pull fresh data',
        error: error.message
      });
    }
  });

  // Map Apify categories to our system
  function mapCategoryFromApify(categoryName: string): string {
    const category = categoryName?.toLowerCase() || '';

    if (category.includes('barbería') || category.includes('peluquería') ||
      category.includes('salón') || category.includes('spa') ||
      category.includes('belleza') || category.includes('manicure')) {
      return 'belleza';
    }
    if (category.includes('gimnasio') || category.includes('fitness') ||
      category.includes('yoga') || category.includes('pilates')) {
      return 'fitness';
    }
    if (category.includes('restaurante') || category.includes('comida') ||
      category.includes('bar') || category.includes('cafetería')) {
      return 'gastronomia';
    }
    if (category.includes('médico') || category.includes('dentista') ||
      category.includes('clínica') || category.includes('farmacia')) {
      return 'salud';
    }
    if (category.includes('taller') || category.includes('mecánico') ||
      category.includes('auto') || category.includes('gasolinera')) {
      return 'automotriz';
    }

    return 'servicios';
  }

  // Wave-based scraping endpoints
  app.get("/api/apify/waves", async (req, res) => {
    try {
      const { apifyWaveScraper } = await import('./apify-wave-scraper.js');
      const waves = apifyWaveScraper.getWaveConfigs();
      const progress = apifyWaveScraper.getAllProgress();
      const stats = apifyWaveScraper.getSummaryStats();

      res.json({
        waves: waves.map(wave => ({
          ...wave,
          progress: progress.get(wave.id) || { status: 'pending', businessesFound: 0, businessesProcessed: 0, creditsUsed: 0, errors: [] }
        })),
        summary: stats
      });
    } catch (error: any) {
      console.error("Error getting wave status:", error);
      res.status(500).json({ message: "Error obteniendo estado de las olas" });
    }
  });

  app.post("/api/apify/waves/:waveId/execute", async (req, res) => {
    try {
      const { waveId } = req.params;
      const { apifyWaveScraper } = await import('./apify-wave-scraper.js');

      // Start wave execution in background
      res.json({
        success: true,
        message: `Wave ${waveId} started in background`,
        waveId
      });

      // Execute wave asynchronously
      apifyWaveScraper.executeWave(waveId).then(result => {
        console.log(`🎉 Wave ${waveId} completed:`, result);
      }).catch(error => {
        console.error(`❌ Wave ${waveId} failed:`, error);
      });

    } catch (error: any) {
      console.error("Error starting wave:", error);
      res.status(500).json({
        success: false,
        message: "Error iniciando ola de scraping",
        error: error.message
      });
    }
  });

  app.post("/api/apify/waves/execute-all", async (req, res) => {
    try {
      const { apifyWaveScraper } = await import('./apify-wave-scraper.js');

      res.json({
        success: true,
        message: "All waves started in background - this will take several hours",
        estimatedDuration: "4-6 hours",
        targetBusinesses: 10000
      });

      // Execute all waves asynchronously
      apifyWaveScraper.executeAllWaves().then(results => {
        console.log('🎉 All waves completed:', results);
      }).catch(error => {
        console.error('❌ Wave execution failed:', error);
      });

    } catch (error: any) {
      console.error("Error starting all waves:", error);
      res.status(500).json({
        success: false,
        message: "Error iniciando todas las olas",
        error: error.message
      });
    }
  });



  // Public appointment availability endpoint
  // ---------------------------------------------------------------------
  // Self-service appointment management (token from the reminder email)
  // ---------------------------------------------------------------------

  const loadTokenAppointment = async (token: string) => {
    if (!token || token.length < 20) return null;
    const appointment = await storage.getAppointmentByCancelToken(token);
    if (!appointment) return null;
    const [client, service, business] = await Promise.all([
      appointment.clientId ? storage.getClient(appointment.clientId) : Promise.resolve(undefined),
      appointment.serviceId ? storage.getService(appointment.serviceId) : Promise.resolve(undefined),
      storage.getBusiness(appointment.businessId),
    ]);
    return { appointment, client, service, business };
  };

  app.get("/api/public/appointments/:token", async (req, res) => {
    try {
      const found = await loadTokenAppointment(String(req.params.token));
      if (!found) return res.status(404).json({ message: "Cita no encontrada" });
      const { appointment, client, service, business } = found;
      const deskSettings = await getDeskSettings(appointment.businessId);

      res.set("Cache-Control", "no-store");
      res.json({
        appointment: {
          id: appointment.id,
          date: appointment.date,
          time: appointment.time,
          duration: appointment.duration,
          status: appointment.status,
          price: appointment.price,
          notes: appointment.clientNotes,
        },
        deposit: appointment.depositAmount
          ? {
              required: true,
              amount: Number(appointment.depositAmount),
              status: appointment.depositStatus,
              expiresAt: appointment.depositExpiresAt,
              paidAt: appointment.depositPaidAt,
              policy: deskSettings.depositPolicy,
              checkoutAvailable: isMercadoPagoConfigured(),
            }
          : null,
        client: client ? { name: client.name, email: client.email, phone: client.phone } : null,
        service: service ? { id: service.id, name: service.name, duration: service.duration, price: service.price } : null,
        business: business ? { id: business.id, name: business.name, phone: business.phone, email: business.email } : null,
        canManage: ["pending", "confirmed"].includes(appointment.status),
      });
    } catch (error: any) {
      console.error("Error loading appointment by token:", error);
      res.status(500).json({ message: "Error cargando la cita" });
    }
  });

  app.post("/api/public/appointments/:token/cancel", publicWriteLimiter, async (req, res) => {
    try {
      const found = await loadTokenAppointment(String(req.params.token));
      if (!found) return res.status(404).json({ message: "Cita no encontrada" });
      const { appointment, client, service, business } = found;

      if (!["pending", "confirmed"].includes(appointment.status)) {
        return res.status(400).json({ message: "Esta cita ya no se puede cancelar" });
      }

      const updates: any = { status: "cancelled" };
      if (appointment.depositStatus === "pending") updates.depositStatus = "expired";
      const updated = await storage.updateAppointment(appointment.id, updates);

      // A cancelled booking frees a slot: offer it to matching waitlist entries.
      void notifyWaitlistForSlot({
        businessId: appointment.businessId,
        serviceId: appointment.serviceId,
        date: appointment.date,
        time: appointment.time,
        excludePhone: client?.phone ?? null,
      }).catch((error) => console.error("Waitlist notification failed:", error));

      if (business && client?.email && service) {
        void emailService.sendAppointmentCancelled({
          clientName: client.name,
          clientEmail: client.email,
          clientPhone: client.phone ?? "",
          businessName: business.name,
          businessEmail: business.email ?? "",
          serviceName: service.name,
          date: appointment.date,
          time: appointment.time,
          duration: appointment.duration ?? 30,
          price: Number(appointment.price ?? 0),
        });
      }

      res.json({ ok: true, appointment: updated, message: "Tu cita fue cancelada" });
    } catch (error: any) {
      console.error("Error cancelling appointment by token:", error);
      res.status(500).json({ message: "Error cancelando la cita" });
    }
  });

  app.post("/api/public/appointments/:token/reschedule", publicWriteLimiter, async (req, res) => {
    try {
      const found = await loadTokenAppointment(String(req.params.token));
      if (!found) return res.status(404).json({ message: "Cita no encontrada" });
      const { appointment, client, service, business } = found;

      if (!["pending", "confirmed"].includes(appointment.status)) {
        return res.status(400).json({ message: "Esta cita ya no se puede reprogramar" });
      }

      const date = String(req.body?.date || "");
      const time = String(req.body?.time || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
        return res.status(400).json({ message: "Fecha u hora inválida" });
      }

      const settings = await storage.getBusinessSettings(appointment.businessId);
      const sameDay = await storage.getAppointmentsByDate(appointment.businessId, date);
      const others = sameDay.filter((other) => other.id !== appointment.id);

      const slots = await generateAvailableTimeSlots(
        date,
        settings?.workingHours ?? {},
        (settings as any)?.blockedDates ?? [],
        (settings as any)?.blockedHours ?? [],
        others,
        service?.duration ?? appointment.duration ?? 30,
      );
      const slot = slots.find((candidate) => candidate.time === time);
      if (!slot || !slot.available) {
        return res.status(409).json({ message: "Ese horario no está disponible" });
      }

      const updated = await storage.updateAppointment(appointment.id, {
        date,
        time,
        status: appointment.depositStatus === "pending" ? "pending" : "rescheduled",
        ...(appointment.depositStatus === "pending"
          ? {
              depositExpiresAt: new Date(
                Date.now() + (await getDeskSettings(appointment.businessId)).depositHoldMinutes * 60_000,
              ),
            }
          : {}),
      } as any);

      if (business && client?.email) {
        void emailService.sendAppointmentRescheduled({
          clientName: client.name,
          clientEmail: client.email,
          clientPhone: client.phone ?? "",
          businessName: business.name,
          businessEmail: business.email ?? "",
          serviceName: service?.name ?? "Servicio",
          date,
          time,
          duration: service?.duration ?? appointment.duration ?? 30,
          price: Number(appointment.price ?? 0),
          previousDate: appointment.date,
          previousTime: appointment.time,
        });
      }

      res.json({ ok: true, appointment: updated, message: "Tu cita fue reprogramada" });
    } catch (error: any) {
      console.error("Error rescheduling appointment by token:", error);
      res.status(500).json({ message: "Error reprogramando la cita" });
    }
  });


  // Public availability: working hours + blocked dates/hours + real conflicts.
  app.get("/api/appointments/availability/:businessId", async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const { date, serviceId } = req.query;

      if (!date || !serviceId) {
        return res.status(400).json({ message: "Fecha y servicio son requeridos" });
      }

      const settings = await storage.getBusinessSettings(businessId);
      const service = await storage.getService(parseInt(serviceId as string));

      if (!service) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      const existingAppointments = await storage.getAppointmentsByDate(businessId, date as string);

      const availableSlots = await generateAvailableTimeSlots(
        date as string,
        settings?.workingHours || {},
        (settings as any)?.blockedDates || [],
        (settings as any)?.blockedHours || [],
        existingAppointments,
        service.duration || 30
      );

      res.json(availableSlots);
    } catch (error: any) {
      console.error("Error getting availability:", error);
      res.status(500).json({ message: "Error obteniendo disponibilidad" });
    }
  });


  // Enhanced appointment creation with smart scheduling validation
  app.post("/api/appointments/public", async (req, res) => {
    try {
      const appointmentData = req.body;

      // Validate required fields
      if (!appointmentData.businessId || !appointmentData.serviceId || !appointmentData.date ||
        !appointmentData.time || !appointmentData.clientName || !appointmentData.clientPhone ||
        !appointmentData.clientEmail) {
        return res.status(400).json({ message: "Todos los campos son requeridos" });
      }

      // Get business settings and service information
      const settings = await storage.getBusinessSettings(appointmentData.businessId);
      const service = await storage.getService(appointmentData.serviceId);

      if (!service) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      // Deposit settings are evaluated before creating the row so the slot can
      // be held as `pending` instead of being confirmed without payment.
      const deskSettings = await getDeskSettings(appointmentData.businessId);
      const depositAmount = deskSettings.depositEnabled
        ? calculateDeposit(
            Number(service.price ?? 0),
            deskSettings.depositType,
            deskSettings.depositValue,
          )
        : 0;
      const requiresDeposit = depositAmount > 0;
      const depositExpiresAt = requiresDeposit
        ? new Date(Date.now() + deskSettings.depositHoldMinutes * 60_000)
        : null;

      // Get all existing appointments for conflict detection
      const existingAppointments = await storage.getAppointmentsByDate(appointmentData.businessId, appointmentData.date);

      // Advanced conflict detection using SmartScheduler
      const proposedStartMinutes = SmartScheduler.timeToMinutes(appointmentData.time);
      const conflictCheck = await SmartScheduler.detectConflicts(
        proposedStartMinutes,
        service.duration ?? 30,
        existingAppointments,
        appointmentData.date
      );

      if (conflictCheck.hasConflict) {
        return res.status(409).json({
          message: "El horario seleccionado tiene conflicto con otra cita",
          conflicts: conflictCheck.conflictingAppointments,
          suggestedAction: "Por favor selecciona otro horario"
        });
      }

      // Double-check availability using the slot generation
      const availableSlots = await generateAvailableTimeSlots(
        appointmentData.date,
        settings?.workingHours || {},
        settings?.blockedDates || [],
        settings?.blockedHours || [],
        existingAppointments,
        service.duration ?? 30
      );

      const requestedSlot = availableSlots.find(slot => slot.time === appointmentData.time);

      if (!requestedSlot || !requestedSlot.available) {
        return res.status(400).json({
          message: "El horario seleccionado ya no está disponible",
          reason: requestedSlot?.reason || "slot_unavailable"
        });
      }

      // Create or find client (with duplicate prevention)
      let client = await storage.getClientsByBusinessId(appointmentData.businessId)
        .then(clients => clients.find(c =>
          (c.email ?? '').toLowerCase() === appointmentData.clientEmail.toLowerCase()
        ));

      // If no email match, check phone as secondary option
      if (!client) {
        client = await storage.getClientsByBusinessId(appointmentData.businessId)
          .then(clients => clients.find(c =>
            c.phone === appointmentData.clientPhone
          ));
      }

      if (!client) {
        client = await storage.createClient({
          businessId: appointmentData.businessId,
          name: appointmentData.clientName,
          phone: appointmentData.clientPhone,
          email: appointmentData.clientEmail.toLowerCase()
        });
      }

      // Create appointment with additional metadata
      const appointment = await storage.createAppointment({
        businessId: appointmentData.businessId,
        clientId: client.id,
        serviceId: appointmentData.serviceId,
        date: appointmentData.date,
        time: appointmentData.time,
        duration: service.duration ?? 30,
        status: 'pending', // Always start as pending for public bookings
        notes: `Reserva online - ${service.name}`,
        clientNotes: appointmentData.clientNotes || null,
        price: service.price,
        // Signed token used by the reminder email's cancel/reschedule link.
        cancelToken: randomBytes(24).toString("hex"),
        depositAmount: requiresDeposit ? depositAmount.toFixed(2) : null,
        depositStatus: requiresDeposit ? "pending" : null,
        depositExpiresAt,
      } as any);

      // Get business information for email
      const [business, businessSettings] = await Promise.all([
        storage.getBusiness(appointmentData.businessId),
        storage.getBusinessSettings(appointmentData.businessId)
      ]);

      // Traffic funnel: record the conversion (fire-and-forget, never blocks booking).
      void storage.createMicrositeEvent({
        businessId: appointment.businessId,
        slug: businessSettings?.customUrl ?? null,
        type: "booking_completed",
        day: limaDateISO(),
        source: "direct",
        metadata: { serviceId: service.id, appointmentId: appointment.id },
      } as any).catch(() => undefined);

      // Deposit bookings wait for payment before the normal confirmation is
      // sent. Non-deposit bookings confirm immediately.
      if (requiresDeposit) {
        void sendDepositRequest(appointment.id).catch((error) =>
          console.error("Deposit request WhatsApp failed:", error),
        );
      } else {
        void sendBookingConfirmation(appointment.id).catch((error) =>
          console.error("WhatsApp confirmation failed:", error),
        );
        void sendBookingEmails(appointment.id).catch((error) =>
          console.error("Booking emails failed:", error),
        );
      }

      res.json({
        success: true,
        appointment: {
          ...appointment,
          serviceName: service.name,
          clientName: client.name,
          duration: service.duration ?? 30
        },
        manageUrl: appointment.cancelToken
          ? `${config.appUrl.replace(/\/$/, "")}/cita/${appointment.cancelToken}`
          : null,
        deposit: requiresDeposit
          ? {
              required: true,
              status: "pending",
              amount: depositAmount,
              expiresAt: depositExpiresAt?.toISOString() ?? null,
              policy: deskSettings.depositPolicy,
              checkoutAvailable: isMercadoPagoConfigured(),
            }
          : null,
        message: requiresDeposit
          ? "Reserva creada. Falta el depósito para confirmar."
          : "Cita creada exitosamente",
        bookingDetails: {
          service: service.name,
          date: appointmentData.date,
          time: appointmentData.time,
          duration: `${service.duration} minutos`,
          price: `S/ ${service.price}`
        }
      });
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Error creando la cita" });
    }
  });

  // Endpoint to check real-time availability for a specific time slot
  app.post("/api/appointments/check-availability", async (req, res) => {
    try {
      const { businessId, serviceId, date, time } = req.body;

      if (!businessId || !serviceId || !date || !time) {
        return res.status(400).json({ message: "Todos los campos son requeridos" });
      }

      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      const existingAppointments = await storage.getAppointmentsByDate(businessId, date);
      const proposedStartMinutes = SmartScheduler.timeToMinutes(time);

      const conflictCheck = await SmartScheduler.detectConflicts(
        proposedStartMinutes,
        service.duration ?? 30,
        existingAppointments,
        date
      );

      res.json({
        available: !conflictCheck.hasConflict,
        conflicts: conflictCheck.conflictingAppointments,
        serviceInfo: {
          name: service.name,
          duration: service.duration ?? 30,
          price: service.price
        }
      });
    } catch (error: any) {
      console.error("Error checking availability:", error);
      res.status(500).json({ message: "Error verificando disponibilidad" });
    }
  });

  app.get("/api/categories", async (req, res) => {
    const categories = [
      { id: "belleza", name: "Belleza", icon: "cut", color: "from-pink-500 to-pink-600", count: 1847 },
      { id: "salud", name: "Salud", icon: "heartbeat", color: "from-green-500 to-green-600", count: 2145 },
      { id: "fitness", name: "Fitness", icon: "dumbbell", color: "from-blue-500 to-blue-600", count: 892 },
      { id: "restaurante", name: "Restaurantes", icon: "utensils", color: "from-orange-500 to-orange-600", count: 3256 },
      { id: "cafeteria", name: "Cafeterías", icon: "coffee", color: "from-yellow-500 to-yellow-600", count: 1123 },
      { id: "automotriz", name: "Automotriz", icon: "car", color: "from-red-500 to-red-700", count: 756 },
      { id: "educacion", name: "Educación", icon: "graduation-cap", color: "from-purple-500 to-purple-600", count: 945 },
      { id: "hogar", name: "Hogar", icon: "home", color: "from-yellow-500 to-yellow-600", count: 1089 }
    ];
    res.json(categories);
  });

  app.get("/api/featured", async (req, res) => {
    try {
      const featured = await storage.getFeaturedBusinesses();

      // Add customUrl and coverImage from settings for each featured business
      const featuredWithCustomUrl = await Promise.all(
        featured.map(async (business) => {
          const settings = await storage.getBusinessSettings(business.id);
          return {
            ...business,
            customUrl: settings?.customUrl || business.slug,
            coverImage: settings?.coverImage || business.coverImage
          };
        })
      );

      res.json(featuredWithCustomUrl);
    } catch (error: any) {
      res.status(500).json({ message: "Error obteniendo negocios destacados" });
    }
  });

  // Business microsite routes
  app.get("/api/business/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const business = await storage.getBusinessBySlug(slug);

      if (!business) {
        return res.status(404).json({ message: "Negocio no encontrado" });
      }

      const [services, gallery, reviews] = await Promise.all([
        storage.getServicesByBusinessId(business.id),
        storage.getGalleryByBusinessId(business.id),
        storage.getReviewsByBusinessId(business.id)
      ]);

      res.json({ business, services, gallery, reviews });
    } catch (error: any) {
      res.status(500).json({ message: "Error obteniendo negocio" });
    }
  });

  // Business dashboard routes - Protected with authentication
  app.get("/api/dashboard/businesses", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      console.log('📊 Dashboard businesses request from user:', req.user?.email);
      const dbUser = await getAuthenticatedUser(req, res);
      if (!dbUser) return; // Response already sent

      console.log('👤 Database user found:', { id: dbUser.id, email: dbUser.email, stackAuthId: dbUser.stackAuthId });
      const businesses = await storage.getBusinessesByUserId(dbUser.id);
      console.log('🏢 Found businesses for user:', businesses.length, businesses.map(b => ({ id: b.id, name: b.name })));
      res.json(businesses);
    } catch (error: any) {
      console.error('Error getting businesses:', error);
      res.status(500).json({ message: "Error obteniendo negocios" });
    }
  });

  app.post("/api/dashboard/businesses", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const businessData = insertBusinessSchema.parse(req.body);

      const dbUser = await getAuthenticatedUser(req, res);
      if (!dbUser) return; // Response already sent

      // Check if user already has a business
      const existingBusinesses = await storage.getBusinessesByUserId(dbUser.id);
      if (existingBusinesses.length > 0) {
        // Return error if user already has a business
        return res.status(400).json({
          message: "Ya tienes un negocio registrado. Solo puedes tener un negocio por cuenta."
        });
      }

      // Provision the micrositio in the same transaction-like step: a business
      // without settings is not bookable and has no public URL.
      const customUrl = await allocateCustomUrl(
        (businessData as any).name || (businessData as any).slug || "negocio",
      );
      const business = await storage.createBusiness({
        ...businessData,
        slug: null, // legacy column — public URLs live in settings.customUrl
        userId: dbUser.id,
      });

      await storage.updateBusinessSettings(business.id, {
        customUrl,
        profileImage: business.logo ?? null,
        coverImage: business.coverImage ?? null,
        publicEmail: business.email ?? null,
        publicPhone: business.phone ?? null,
        streetAddress: business.address ?? null,
        district: business.district ?? null,
        publicDescription: business.description ?? null,
        workingHours: (business.hours as any) ?? undefined,
      } as any);

      res.json({ ...business, customUrl });
    } catch (error: any) {
      console.error('Error creating business:', error);
      res.status(400).json({ message: "Error creando negocio" });
    }
  });

  // Services routes - Protected with authentication
  app.get("/api/dashboard/businesses/:businessId/services", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const businessId = parseInt(req.params.businessId);

      const dbUser = await verifyBusinessOwnership(req, res, businessId);
      if (!dbUser) return; // Response already sent

      const services = await storage.getServicesByBusinessId(businessId);
      res.json(services);
    } catch (error: any) {
      console.error('Error getting services:', error);
      res.status(500).json({ message: "Error obteniendo servicios" });
    }
  });

  app.post("/api/dashboard/businesses/:businessId/services", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      console.log("Creating service with data:", req.body);

      const dbUser = await verifyBusinessOwnership(req, res, businessId);
      if (!dbUser) return; // Response already sent

      // Validate the request body
      const serviceData = insertServiceSchema.parse(req.body);
      console.log("Parsed service data:", serviceData);

      const service = await storage.createService({
        ...serviceData,
        businessId
      });

      console.log("Service created successfully:", service);
      res.json(service);
    } catch (error: any) {
      console.error("Error creating service:", error);
      if (error.name === 'ZodError') {
        res.status(400).json({
          message: "Datos del servicio inválidos",
          details: error.errors
        });
      } else {
        res.status(400).json({
          message: "Error creando servicio",
          details: error.message
        });
      }
    }
  });

  app.put("/api/dashboard/services/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);

      const dbUser = await verifyServiceOwnership(req, res, id);
      if (!dbUser) return; // Response already sent

      const serviceData = insertServiceSchema.partial().parse(req.body);

      const service = await storage.updateService(id, serviceData);
      res.json(service);
    } catch (error: any) {
      console.error('Error updating service:', error);
      res.status(400).json({ message: "Error actualizando servicio" });
    }
  });

  app.delete("/api/dashboard/services/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);

      const dbUser = await verifyServiceOwnership(req, res, id);
      if (!dbUser) return; // Response already sent

      await storage.deleteService(id);
      res.json({ message: "Servicio eliminado" });
    } catch (error: any) {
      console.error('Error deleting service:', error);
      res.status(500).json({ message: "Error eliminando servicio" });
    }
  });

  app.put("/api/dashboard/clients/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);

      const dbUser = await verifyClientOwnership(req, res, id);
      if (!dbUser) return; // Response already sent

      const clientData = insertClientSchema.partial().parse(req.body);

      const client = await storage.updateClient(id, clientData);
      res.json(client);
    } catch (error: any) {
      console.error('Error updating client:', error);
      res.status(400).json({ message: "Error actualizando cliente" });
    }
  });

  app.delete("/api/dashboard/clients/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);

      const dbUser = await verifyClientOwnership(req, res, id);
      if (!dbUser) return; // Response already sent

      await storage.deleteClient(id);
      res.json({ message: "Cliente eliminado exitosamente" });
    } catch (error: any) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Error eliminando cliente" });
    }
  });

  // Clients routes
  app.get("/api/dashboard/businesses/:businessId/clients", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const businessId = parseInt(req.params.businessId);

      const dbUser = await verifyBusinessOwnership(req, res, businessId);
      if (!dbUser) return; // Response already sent

      const clients = await storage.getClientsByBusinessId(businessId);
      res.json(clients);
    } catch (error: any) {
      console.error('Error getting clients:', error);
      res.status(500).json({ message: "Error obteniendo clientes" });
    }
  });

  app.post("/api/dashboard/businesses/:businessId/clients", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const businessId = parseInt(req.params.businessId);

      const dbUser = await verifyBusinessOwnership(req, res, businessId);
      if (!dbUser) return; // Response already sent

      const clientData = insertClientSchema.parse(req.body);

      const client = await storage.createClient({
        ...clientData,
        businessId
      });

      res.json(client);
    } catch (error: any) {
      console.error('Error creating client:', error);
      res.status(400).json({ message: "Error creando cliente" });
    }
  });

  // Appointments routes
  app.get("/api/dashboard/businesses/:businessId/appointments", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const { date } = req.query;

      // CRITICAL: Verify user owns this business before returning appointments
      const dbUser = await verifyBusinessOwnership(req, res, businessId);
      if (!dbUser) return; // Response already sent

      let appointments;
      if (date) {
        appointments = await storage.getAppointmentsByDate(businessId, date as string);
      } else {
        appointments = await storage.getAppointmentsByBusinessId(businessId);
      }

      res.json(appointments);
    } catch (error: any) {
      res.status(500).json({ message: "Error obteniendo citas" });
    }
  });

  app.post("/api/dashboard/businesses/:businessId/appointments", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const businessId = parseInt(req.params.businessId);

      // CRITICAL: Verify user owns this business before creating appointments
      const dbUser = await verifyBusinessOwnership(req, res, businessId);
      if (!dbUser) return; // Response already sent

      const appointmentData = insertAppointmentSchema.parse(req.body);

      // The dashboard must obey the same rules as the public booking flow.
      if (appointmentData.date && appointmentData.time) {
        const service = appointmentData.serviceId
          ? await storage.getService(appointmentData.serviceId)
          : undefined;
        const duration = appointmentData.duration ?? service?.duration ?? 30;

        const sameDay = await storage.getAppointmentsByDate(businessId, appointmentData.date);
        const conflict = await SmartScheduler.detectConflicts(
          SmartScheduler.timeToMinutes(appointmentData.time),
          duration,
          sameDay.filter((existing) => existing.status !== "cancelled" && existing.status !== "no_show"),
          appointmentData.date,
        );

        if (conflict.hasConflict) {
          return res.status(409).json({
            message: "Ese horario ya está ocupado por otra cita",
            conflicts: conflict.conflictingAppointments,
          });
        }
      }

      const appointment = await storage.createAppointment({
        ...appointmentData,
        businessId,
        cancelToken: (appointmentData as any).cancelToken ?? randomBytes(24).toString("hex"),
      } as any);

      res.json(appointment);
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      res.status(400).json({ message: "Error creando cita" });
    }
  });

  // Update appointment with enhanced validation and status management
  app.put("/api/dashboard/businesses/:businessId/appointments/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const appointmentId = parseInt(req.params.id);

      // CRITICAL: Verify user owns this business before updating appointments
      const dbUser = await verifyBusinessOwnership(req, res, businessId);
      if (!dbUser) return; // Response already sent
      const appointmentData = req.body;

      // Validate that this appointment belongs to the business
      const existingAppointment = await storage.getAppointment(appointmentId);
      if (!existingAppointment || existingAppointment.businessId !== businessId) {
        return res.status(404).json({ message: "Cita no encontrada" });
      }

      // Validate appointment data
      const validatedData = insertAppointmentSchema.partial().parse(appointmentData);

      // If date or time is being changed, check for conflicts
      if (validatedData.date || validatedData.time) {
        const newDate = validatedData.date || existingAppointment.date;
        const newTime = validatedData.time || existingAppointment.time;

        // Get service duration for conflict checking
        const service = await storage.getService(existingAppointment.serviceId);
        if (!service) {
          return res.status(400).json({ message: "Servicio no encontrado" });
        }

        // Check for conflicts (excluding current appointment)
        const existingAppointments = await storage.getAppointmentsByDate(businessId, newDate);
        const otherAppointments = existingAppointments.filter(apt => apt.id !== appointmentId);

        const proposedStartMinutes = SmartScheduler.timeToMinutes(newTime);
        const conflictCheck = await SmartScheduler.detectConflicts(
          proposedStartMinutes,
          service.duration ?? 30,
          otherAppointments,
          newDate
        );

        if (conflictCheck.hasConflict) {
          return res.status(409).json({
            message: "El nuevo horario tiene conflicto con otra cita",
            conflicts: conflictCheck.conflictingAppointments
          });
        }
      }

      const appointment = await storage.updateAppointment(appointmentId, validatedData);

      // Send email notifications for status changes or date/time changes
      if ((validatedData.status && validatedData.status !== existingAppointment.status) ||
        (validatedData.date && validatedData.date !== existingAppointment.date) ||
        (validatedData.time && validatedData.time !== existingAppointment.time)) {
        await sendStatusChangeEmail(appointment, existingAppointment, businessId);
      }

      res.json(appointment);
    } catch (error: any) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "Error actualizando la cita" });
    }
  });

  // Delete appointment
  app.delete("/api/dashboard/businesses/:businessId/appointments/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const businessId = parseInt(req.params.businessId);

      // CRITICAL: Verify user owns this business before deleting appointments
      const dbUser = await verifyBusinessOwnership(req, res, businessId);
      if (!dbUser) return; // Response already sent

      // Validate that this appointment belongs to the business
      const existingAppointment = await storage.getAppointment(appointmentId);
      if (!existingAppointment || existingAppointment.businessId !== businessId) {
        return res.status(404).json({ message: "Cita no encontrada" });
      }

      await storage.deleteAppointment(appointmentId);
      res.json({ message: "Cita eliminada exitosamente" });
    } catch (error: any) {
      console.error("Error deleting appointment:", error);
      res.status(500).json({ message: "Error eliminando la cita" });
    }
  });

  // Analytics routes
  app.get("/api/dashboard/businesses/:businessId/analytics", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const businessId = parseInt(req.params.businessId);

      // CRITICAL: Verify user owns this business before returning analytics
      const dbUser = await verifyBusinessOwnership(req, res, businessId);
      if (!dbUser) return; // Response already sent

      // Every KPI is derived from the service date (appointment.date) in Lima time.
      const period = resolvePeriod((String(req.query.period || "thisMonth")) as PeriodKey, limaDateISO());
      const granularity = String(req.query.granularity || "week") as Granularity;

      const [appointments, clients, services, settings, events, payments] = await Promise.all([
        storage.getAppointmentsByBusinessId(businessId),
        storage.getClientsByBusinessId(businessId),
        storage.getServicesByBusinessId(businessId),
        storage.getBusinessSettings(businessId),
        storage.getMicrositeEvents(businessId, period.previousFrom, period.to),
        storage.getPaymentsByBusinessId(businessId),
      ]);

      // One pass for names instead of one query per appointment (removes the old N+1).
      const clientNames = new Map<number, string>(clients.map((client) => [client.id, client.name]));
      const serviceNames = new Map<number, string>(services.map((service) => [service.id, service.name]));

      const metrics = computeBusinessMetrics({
        appointments,
        clients,
        services,
        period,
        granularity,
        workingHours: (settings?.workingHours ?? null) as any,
        events,
        clientNames,
        serviceNames,
      });

      // "Cobrado" comes from the payments ledger, never from appointment prices.
      const collected = computeCollected(payments, period);

      res.json({
        ...metrics,
        // ---- legacy keys (older UI components still read these) ----
        revenue: metrics.revenue,
        appointments: metrics.appointmentsCreatedInPeriod,
        newClients: metrics.newClients,
        // ---- invoiced vs collected ----
        collected,
        invoiced: metrics.revenue,
        receivable: Math.max(0, metrics.revenue - collected),
        paymentsCount: payments.filter((payment) => payment.status === "approved").length,
        pendingPaymentOrders: payments.filter((payment) => payment.status === "pending").length,
        // ---- microsite traffic ----
        trafficSeries: computeTrafficSeries(events, period),
        sourceBreakdown: computeSourceBreakdown(events),
        funnel: computeFunnel(events, metrics.appointmentsCreatedInPeriod, metrics.completedAppointments),
      });
    } catch (error: any) {
      console.error("Error getting analytics:", error);
      res.status(500).json({ message: "Error obteniendo analytics" });
    }
  });

  // Financial data endpoint
  app.get("/api/dashboard/businesses/:businessId/financials", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const dbUser = await verifyBusinessOwnership(req, res, businessId);
      if (!dbUser) return;

      const period = resolvePeriod((String(req.query.period || "thisMonth")) as PeriodKey, limaDateISO());

      const [appointments, services, clients, settings, payments] = await Promise.all([
        storage.getAppointmentsByBusinessId(businessId),
        storage.getServicesByBusinessId(businessId),
        storage.getClientsByBusinessId(businessId),
        storage.getBusinessSettings(businessId),
        storage.getPaymentsByBusinessId(businessId),
      ]);

      const clientNames = new Map<number, string>(clients.map((client) => [client.id, client.name]));
      const serviceNames = new Map<number, string>(services.map((service) => [service.id, service.name]));

      const metrics = computeBusinessMetrics({
        appointments,
        clients,
        services,
        period,
        granularity: "week",
        workingHours: (settings?.workingHours ?? null) as any,
        clientNames,
        serviceNames,
      });

      // Last 12 months of billed revenue, attributed to the service date.
      const monthlyFrom = `${addMonthsISO(limaDateISO(), -11).slice(0, 7)}-01`;
      const monthlyPeriod = {
        key: "all" as PeriodKey,
        from: monthlyFrom,
        to: limaDateISO(),
        previousFrom: monthlyFrom,
        previousTo: monthlyFrom,
      };
      const monthlyData = buildBuckets(appointments, monthlyPeriod, "month").map((bucket) => ({
        month: bucket.label,
        revenue: bucket.revenue,
        appointments: bucket.completed,
      }));

      // Transactions are ordered by when the service happened, not when it was booked.
      const recentTransactions = appointments
        .filter((appointment) => appointment.status === "completed")
        .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))
        .slice(0, 10)
        .map((appointment) => ({
          id: appointment.id,
          date: appointment.date,
          time: appointment.time,
          clientName: clientNames.get(appointment.clientId ?? 0) ?? "Cliente",
          serviceName: serviceNames.get(appointment.serviceId ?? 0) ?? "Servicio",
          amount: money(appointment.price),
          status: appointment.status,
        }));

      const collected = computeCollected(payments, period);
      const approvedPayments = payments.filter((payment) => payment.status === "approved");

      const financialData = {
        // legacy keys
        totalRevenue: metrics.revenue,
        pendingPayments: metrics.pendingPayments,
        averageAppointmentValue: metrics.averageAppointmentValue,
        completedAppointments: metrics.completedAppointments,
        monthlyData,
        recentTransactions,
        paymentStatusData: [
          { name: "Facturado", value: metrics.revenue, count: metrics.completedAppointments },
          { name: "Por cobrar", value: metrics.pendingPayments, count: metrics.pendingAppointments },
        ],
        period: period.key,
        // new, explicit money semantics
        range: period,
        invoiced: metrics.revenue,
        collected,
        receivable: Math.max(0, metrics.revenue - collected),
        growth: metrics.revenueGrowth,
        appointmentsCompletedGrowth: metrics.completedGrowth,
        cancelledInPeriod: metrics.cancelledInPeriod,
        noShowInPeriod: metrics.noShowInPeriod,
        occupancyRate: metrics.occupancyRate,
        payments: approvedPayments.slice(0, 20).map((payment) => ({
          id: payment.id,
          amount: money(payment.amount),
          status: payment.status,
          currency: payment.currency,
          method: payment.paymentMethod,
          paidAt: payment.paidAt,
          createdAt: payment.createdAt,
        })),
      };

      res.json(financialData);
    } catch (error: any) {
      console.error("Error getting financial data:", error);
      res.status(500).json({ message: "Error obteniendo datos financieros" });
    }
  });

  // ---------------------------------------------------------------------
  // CSV exports (the "Exportar" button in Finanzas used to do nothing)
  // ---------------------------------------------------------------------
  app.get("/api/dashboard/businesses/:businessId/export/:dataset", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const dataset = String(req.params.dataset || "").replace(/\.csv$/i, "");
      const dbUser = await verifyBusinessOwnership(req, res, businessId);
      if (!dbUser) return;

      const cell = (value: unknown): string => {
        if (value === null || value === undefined) return "";
        const text = value instanceof Date ? value.toISOString() : String(value);
        return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
      };
      const toCsv = (headers: string[], rows: unknown[][]): string =>
        `\uFEFF${[headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;

      let csv = "";
      let filename = `micita-${dataset}-${limaDateISO()}.csv`;

      if (dataset === "appointments" || dataset === "citas") {
        const [appointments, clients, services] = await Promise.all([
          storage.getAppointmentsByBusinessId(businessId),
          storage.getClientsByBusinessId(businessId),
          storage.getServicesByBusinessId(businessId),
        ]);
        const clientNames = new Map(clients.map((client) => [client.id, client.name]));
        const serviceNames = new Map(services.map((service) => [service.id, service.name]));
        csv = toCsv(
          ["ID", "Fecha", "Hora", "Cliente", "Servicio", "Estado", "Precio", "Duracion (min)", "Creada"],
          appointments
            .slice()
            .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
            .map((appointment) => [
              appointment.id,
              appointment.date,
              appointment.time,
              clientNames.get(appointment.clientId ?? 0) ?? "Cliente",
              serviceNames.get(appointment.serviceId ?? 0) ?? "Servicio",
              appointment.status,
              appointment.price ?? "",
              appointment.duration ?? "",
              appointment.createdAt ?? "",
            ]),
        );
      } else if (dataset === "clients" || dataset === "clientes") {
        const clients = await storage.getClientsByBusinessId(businessId);
        csv = toCsv(
          ["ID", "Nombre", "Email", "Telefono", "Notas", "Creado"],
          clients.map((client) => [client.id, client.name, client.email, client.phone, client.notes, client.createdAt]),
        );
      } else if (dataset === "revenue" || dataset === "ingresos") {
        const [appointments, clients, services] = await Promise.all([
          storage.getAppointmentsByBusinessId(businessId),
          storage.getClientsByBusinessId(businessId),
          storage.getServicesByBusinessId(businessId),
        ]);
        const clientNames = new Map(clients.map((client) => [client.id, client.name]));
        const serviceNames = new Map(services.map((service) => [service.id, service.name]));
        csv = toCsv(
          ["Fecha", "Cliente", "Servicio", "Monto", "Estado"],
          appointments
            .filter((appointment) => appointment.status === "completed")
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((appointment) => [
              appointment.date,
              clientNames.get(appointment.clientId ?? 0) ?? "Cliente",
              serviceNames.get(appointment.serviceId ?? 0) ?? "Servicio",
              money(appointment.price),
              appointment.status,
            ]),
        );
      } else if (dataset === "reviews" || dataset === "resenas") {
        const reviews = await storage.getReviewsByBusinessId(businessId);
        csv = toCsv(
          ["Fecha", "Cliente", "Calificacion", "Estado", "Fuente", "Comentario", "Respuesta"],
          reviews.map((review) => [
            review.createdAt ?? "",
            review.clientName,
            review.rating,
            review.status ?? "",
            review.source ?? "",
            review.comment ?? "",
            review.ownerReply ?? "",
          ]),
        );
      } else if (dataset === "messages" || dataset === "mensajes") {
        const messages = await storage.getContactMessages(businessId, "all");
        csv = toCsv(
          ["Fecha", "Nombre", "Email", "Telefono", "Estado", "Mensaje"],
          messages.map((message) => [
            message.createdAt ?? "",
            message.name,
            message.email ?? "",
            message.phone ?? "",
            message.status,
            message.message,
          ]),
        );
      } else {
        return res.status(404).json({ message: "Conjunto de datos no encontrado" });
      }

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error: any) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ message: "Error generando el archivo" });
    }
  });


  const httpServer = createServer(app);
  // Micrositio routes

  /**
   * Resolve a public slug to its business + settings with a single indexed
   * lookup (previously this scanned every business and every settings row).
   */
  const resolveMicrosite = async (rawSlug: string) => {
    const slug = String(rawSlug || "").trim().toLowerCase();
    if (!slug) return null;
    const settings = await storage.getBusinessSettingsByCustomUrl(slug);
    if (!settings) return null;
    const business = await storage.getBusiness(settings.businessId);
    if (!business || business.isActive === false) return null;
    return { business, settings };
  };

  app.get("/api/micrositio/:slug", async (req, res) => {
    const slug = req.params.slug;
    try {
      const resolved = await resolveMicrosite(slug);
      if (!resolved) {
        return res.status(404).json({ error: "Negocio no encontrado" });
      }
      const { business, settings } = resolved;

      const [services, galleryRows, reviews, deskSettings] = await Promise.all([
        storage.getServicesByBusinessId(business.id),
        storage.getGalleryByBusinessId(business.id),
        storage.getApprovedReviewsByBusinessId(business.id),
        getDeskSettings(business.id),
      ]);

      // Two stores exist for historical reasons: the editor writes the jsonb
      // `settings.gallery`, while imports/admin write the `gallery` table.
      // The public page shows the union so neither pipeline can lose images.
      const mergedGallery = new Map<string, { id: string | number; imageUrl: string; title?: string }>();
      const settingsGallery = Array.isArray((settings as any).gallery) ? ((settings as any).gallery as any[]) : [];
      for (const item of settingsGallery) {
        if (item?.imageUrl) {
          mergedGallery.set(item.imageUrl, {
            id: item.id ?? item.imageUrl,
            imageUrl: item.imageUrl,
            title: item.title,
          });
        }
      }
      for (const item of galleryRows) {
        if (item.imageUrl && !mergedGallery.has(item.imageUrl)) {
          mergedGallery.set(item.imageUrl, {
            id: item.id,
            imageUrl: item.imageUrl,
            title: item.caption ?? undefined,
          });
        }
      }

      const activeServices = services.filter((service) => service.isActive !== false);
      const approvedRatings = reviews.map((review) => review.rating);
      const publicRating = approvedRatings.length
        ? approvedRatings.reduce((sum, rating) => sum + rating, 0) / approvedRatings.length
        : Number.parseFloat(String(business.rating ?? 0)) || 0;

      // Public cache: short enough to reflect edits, long enough to absorb traffic.
      res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
      res.json({
        business,
        settings,
        services: activeServices,
        gallery: Array.from(mergedGallery.values()),
        reviews,
        desk: {
          queueEnabled: deskSettings.queueEnabled,
          promosEnabled: deskSettings.promosEnabled,
          showQueueOnMicrosite: deskSettings.showQueueOnMicrosite,
          showPromosOnMicrosite: deskSettings.showPromosOnMicrosite,
          waitlistEnabled: deskSettings.waitlistEnabled,
          showWaitlistOnMicrosite: deskSettings.showWaitlistOnMicrosite,
          loyaltyEnabled: deskSettings.loyaltyEnabled,
          showLoyaltyOnMicrosite: deskSettings.showLoyaltyOnMicrosite,
          loyaltyStampsRequired: deskSettings.loyaltyStampsRequired,
          loyaltyReward: deskSettings.loyaltyReward,
          packagesEnabled: deskSettings.packagesEnabled,
          showPackagesOnMicrosite: deskSettings.showPackagesOnMicrosite,
        },
        stats: {
          rating: Math.round(publicRating * 10) / 10,
          reviewCount: approvedRatings.length || business.reviewCount || 0,
          serviceCount: activeServices.length,
        },
      });
    } catch (error: any) {
      console.error("Error in micrositio route:", error);
      res.status(500).json({ error: "Error obteniendo datos del negocio" });
    }
  });


  // Anonymous traffic beacon (view / whatsapp_click / book_click).
  app.post("/api/micrositio/:slug/events", publicWriteLimiter, async (req, res) => {
    try {
      const resolved = await resolveMicrosite(req.params.slug);
      if (!resolved) return res.status(404).json({ ok: false });

      const allowed = new Set(["view", "whatsapp_click", "book_click", "booking_completed"]);
      const type = String(req.body?.type || "");
      if (!allowed.has(type)) {
        return res.status(400).json({ ok: false, message: "Tipo de evento inválido" });
      }

      const referrer = typeof req.body?.referrer === "string" ? req.body.referrer.slice(0, 500) : null;
      const classify = (value: string | null): string => {
        if (!value) return "direct";
        const lower = value.toLowerCase();
        if (lower.includes("whatsapp") || lower.includes("wa.me")) return "whatsapp";
        if (lower.includes("instagram")) return "instagram";
        if (lower.includes("facebook")) return "facebook";
        if (lower.includes("google")) return "google";
        if (lower.includes("tiktok")) return "tiktok";
        return "other";
      };
      const userAgent = String(req.headers["user-agent"] || "");
      const device = /mobile/i.test(userAgent) ? "mobile" : /tablet|ipad/i.test(userAgent) ? "tablet" : "desktop";

      await storage.createMicrositeEvent({
        businessId: resolved.business.id,
        slug: String(req.params.slug).slice(0, 120),
        type,
        path: typeof req.body?.path === "string" ? req.body.path.slice(0, 300) : null,
        referrer,
        source: classify(referrer),
        device,
        sessionId: typeof req.body?.sessionId === "string" ? req.body.sessionId.slice(0, 64) : null,
        day: limaDateISO(),
        metadata: typeof req.body?.metadata === "object" && req.body.metadata ? req.body.metadata : null,
      } as any);

      res.status(202).json({ ok: true });
    } catch (error: any) {
      console.error("Error recording microsite event:", error);
      res.status(500).json({ ok: false });
    }
  });

  // Contact form → stored lead + notification email (no more silent mailto:).
  app.post("/api/micrositio/:slug/contact", publicWriteLimiter, async (req, res) => {
    try {
      const resolved = await resolveMicrosite(req.params.slug);
      if (!resolved) return res.status(404).json({ ok: false, message: "Negocio no encontrado" });

      const name = String(req.body?.name || "").trim();
      const message = String(req.body?.message || "").trim();
      const email = String(req.body?.email || "").trim();
      const phone = String(req.body?.phone || "").trim();

      if (name.length < 2 || message.length < 5) {
        return res.status(400).json({ ok: false, message: "Escribe tu nombre y tu consulta" });
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ ok: false, message: "Email inválido" });
      }

      const saved = await storage.createContactMessage({
        businessId: resolved.business.id,
        name: name.slice(0, 120),
        email: email ? email.slice(0, 160) : null,
        phone: phone ? phone.slice(0, 40) : null,
        message: message.slice(0, 2000),
        source: "microsite",
        ipHash: hashIp(req.ip),
      } as any);

      const businessEmail = resolved.settings.publicEmail || resolved.business.email;
      if (businessEmail) {
        void emailService.sendBusinessMessage({
          businessName: resolved.business.name,
          businessEmail,
          name: saved.name,
          email: saved.email,
          phone: saved.phone,
          message: saved.message,
        });
      }

      res.status(201).json({ ok: true, id: saved.id, message: "Mensaje enviado" });
    } catch (error: any) {
      console.error("Error creating contact message:", error);
      res.status(500).json({ ok: false, message: "Error enviando el mensaje" });
    }
  });

  // Demand heatmap so visitors can see the best time to book.
  app.get("/api/micrositio/:slug/popular-times", async (req, res) => {
    try {
      const resolved = await resolveMicrosite(req.params.slug);
      if (!resolved) return res.status(404).json({ error: "Negocio no encontrado" });

      const appointments = await storage.getAppointmentsByBusinessId(resolved.business.id);
      res.set("Cache-Control", "public, max-age=300");
      res.json({ cells: computePopularTimes(appointments) });
    } catch (error: any) {
      console.error("Error computing popular times:", error);
      res.status(500).json({ error: "Error obteniendo horarios populares" });
    }
  });

  // Reviews routes

  // Owner inbox: every review (any status) plus computed stats.
  app.get("/api/dashboard/businesses/:businessId/reviews", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const dbUser = await verifyBusinessOwnership(req, res, businessId);
      if (!dbUser) return;

      const reviews = await storage.getReviewsByBusinessId(businessId);
      const approved = reviews.filter((review) => (review.status ?? "approved") === "approved");
      const averageRating = approved.length
        ? approved.reduce((sum, review) => sum + review.rating, 0) / approved.length
        : 0;

      res.json({
        reviews,
        stats: {
          total: reviews.length,
          approved: approved.length,
          pending: reviews.filter((review) => review.status === "pending").length,
          averageRating,
          replyRate: approved.length
            ? (approved.filter((review) => review.ownerReply).length / approved.length) * 100
            : 0,
        },
      });
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Error obteniendo reseñas" });
    }
  });

  // Contact inbox (messages sent from the public microsite).
  app.get("/api/dashboard/businesses/:businessId/messages", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const dbUser = await verifyBusinessOwnership(req, res, businessId);
      if (!dbUser) return;

      const messages = await storage.getContactMessages(businessId, String(req.query.status || "all"));
      res.json({
        messages,
        unread: messages.filter((message) => message.status === "new").length,
      });
    } catch (error: any) {
      console.error("Error fetching contact messages:", error);
      res.status(500).json({ message: "Error obteniendo mensajes" });
    }
  });

  app.patch("/api/dashboard/businesses/:businessId/messages/:messageId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const messageId = parseInt(req.params.messageId);
      const dbUser = await verifyBusinessOwnership(req, res, businessId);
      if (!dbUser) return;

      const messages = await storage.getContactMessages(businessId, "all");
      if (!messages.some((message) => message.id === messageId)) {
        return res.status(404).json({ message: "Mensaje no encontrado" });
      }

      const status = String(req.body?.status || "read");
      if (!["new", "read", "replied", "archived"].includes(status)) {
        return res.status(400).json({ message: "Estado inválido" });
      }

      const updated = await storage.updateContactMessage(messageId, { status });
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating contact message:", error);
      res.status(500).json({ message: "Error actualizando mensaje" });
    }
  });


  // Public review submission. Everything moderation-related is server-side.
  app.post("/api/reviews", publicWriteLimiter, async (req, res) => {
    try {
      const businessId = Number(req.body?.businessId);
      const clientName = String(req.body?.clientName || "").trim();
      const rating = Number(req.body?.rating);
      const comment = String(req.body?.comment || "").trim();
      const clientEmail = String(req.body?.clientEmail || "").trim().toLowerCase();
      const appointmentId = req.body?.appointmentId ? Number(req.body.appointmentId) : undefined;

      if (!Number.isInteger(businessId) || businessId <= 0) {
        return res.status(400).json({ message: "Negocio inválido" });
      }
      if (clientName.length < 2 || clientName.length > 80) {
        return res.status(400).json({ message: "Escribe tu nombre" });
      }
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "La calificación debe estar entre 1 y 5" });
      }
      if (comment.length > 1200) {
        return res.status(400).json({ message: "La reseña es demasiado larga" });
      }
      if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
        return res.status(400).json({ message: "Email inválido" });
      }

      const business = await storage.getBusiness(businessId);
      if (!business || business.isActive === false) {
        return res.status(404).json({ message: "Negocio no encontrado" });
      }

      if (appointmentId) {
        const appointment = await storage.getAppointment(appointmentId);
        if (!appointment || appointment.businessId !== businessId) {
          return res.status(400).json({ message: "Cita inválida" });
        }
        if (appointment.status !== "completed") {
          return res.status(400).json({ message: "Solo puedes reseñar citas completadas" });
        }
      }

      // Simple anti-spam: one review per client name/email per business per day.
      const existing = await storage.getReviewsByBusinessId(businessId);
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const duplicate = existing.some((review) => {
        const created = review.createdAt ? new Date(review.createdAt).getTime() : 0;
        if (created < dayAgo) return false;
        const sameName = review.clientName.trim().toLowerCase() === clientName.toLowerCase();
        const sameEmail = Boolean(clientEmail) && (review.clientEmail || "").toLowerCase() === clientEmail;
        return sameName || sameEmail;
      });
      if (duplicate) {
        return res.status(429).json({ message: "Ya recibimos tu reseña hoy. ¡Gracias!" });
      }

      const review = await storage.createReview({
        businessId,
        clientName,
        rating,
        comment: comment || null,
        clientEmail: clientEmail || null,
        appointmentId: appointmentId ?? null,
        source: "microsite",
        status: "pending",
        ipHash: hashIp(req.ip),
      } as any);

      res.status(201).json({
        review,
        message: "¡Gracias! Tu reseña será publicada después de la revisión del negocio.",
      });
    } catch (error: any) {
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Error creando reseña" });
    }
  });


  // Moderation: approve / reject / reply.
  app.patch("/api/dashboard/businesses/:businessId/reviews/:reviewId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const reviewId = parseInt(req.params.reviewId);
      const dbUser = await verifyBusinessOwnership(req, res, businessId);
      if (!dbUser) return;

      const review = await storage.getReview(reviewId);
      if (!review || review.businessId !== businessId) {
        return res.status(404).json({ message: "Reseña no encontrada" });
      }

      const patch: Record<string, unknown> = {};
      if (typeof req.body?.status === "string") {
        if (!["pending", "approved", "rejected"].includes(req.body.status)) {
          return res.status(400).json({ message: "Estado inválido" });
        }
        patch.status = req.body.status;
      }
      if (typeof req.body?.ownerReply === "string") {
        patch.ownerReply = req.body.ownerReply.slice(0, 1200);
        patch.ownerRepliedAt = new Date();
      }

      const updated = await storage.updateReview(reviewId, patch as any);
      await storage.recomputeBusinessRating(businessId);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating review:", error);
      res.status(500).json({ message: "Error actualizando reseña" });
    }
  });

  // Delete a review (dashboard only)
  app.delete("/api/dashboard/businesses/:businessId/reviews/:reviewId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const reviewId = parseInt(req.params.reviewId);

      const dbUser = await verifyBusinessOwnership(req, res, businessId);
      if (!dbUser) return;

      const review = await storage.getReview(reviewId);
      if (!review || review.businessId !== businessId) {
        return res.status(404).json({ message: "Reseña no encontrada" });
      }

      await storage.deleteReview(reviewId);
      await storage.recomputeBusinessRating(businessId);
      res.json({ message: "Reseña eliminada" });
    } catch (error: any) {
      console.error("Error deleting review:", error);
      res.status(500).json({ message: "Error eliminando reseña" });
    }
  });

  // Business settings routes
  app.get("/api/dashboard/businesses/:id/settings", requireAuth, async (req: AuthenticatedRequest, res) => {
    const businessId = parseInt(req.params.id);
    try {
      const dbUser = await verifyBusinessOwnership(req, res, businessId);
      if (!dbUser) return;

      const settings = await storage.getBusinessSettings(businessId);
      res.json(settings ?? { businessId, customUrl: null });
    } catch (error: any) {
      res.status(500).json({ error: "Error obteniendo configuración" });
    }
  });

  const updateBusinessSettingsHandler = async (req: AuthenticatedRequest, res: any) => {
    const businessId = parseInt(req.params.id);
    try {
      const dbUser = await verifyBusinessOwnership(req, res, businessId);
      if (!dbUser) return;

      const raw: Record<string, any> = { ...req.body };

      // The editor historically sent `galleryImages` while the column is
      // `gallery`. Normalise both so neither pipeline loses images.
      if (Array.isArray(raw.galleryImages)) {
        raw.gallery = raw.galleryImages
          .filter((image: any) => image && typeof image.imageUrl === "string")
          .map((image: any) => ({
            id: String(image.id ?? image.imageUrl),
            imageUrl: image.imageUrl,
            title: typeof image.title === "string" ? image.title : undefined,
          }));
        delete raw.galleryImages;
      }

      if (typeof raw.customUrl === "string") {
        const requested = raw.customUrl.trim().toLowerCase();
        if (requested === "") {
          raw.customUrl = null;
        } else if (!isValidCustomUrl(requested)) {
          return res.status(400).json({
            error: "URL inválida",
            message: "La URL debe tener entre 3 y 40 caracteres: letras minúsculas, números o guiones (sin espacios ni acentos).",
          });
        } else {
          const owner = await storage.getBusinessSettingsByCustomUrl(requested);
          if (owner && owner.businessId !== businessId) {
            return res.status(409).json({
              error: "URL ocupada",
              message: "Esa URL ya está en uso por otro negocio. Prueba con otra.",
            });
          }
          raw.customUrl = requested;
        }
      }

      const body = insertBusinessSettingsSchema.partial().parse(raw);
      // jsonb columns (gallery, desk_settings) are `unknown` in the generated
      // insert schema; the DB layer accepts the parsed object as-is.
      const settings = await storage.updateBusinessSettings(businessId, body as any);
      res.json(settings);
    } catch (error: any) {
      console.error("Error updating settings:", error);
      if (error?.name === "ZodError") {
        return res.status(400).json({
          error: "Datos inválidos",
          message: "Revisa los campos del formulario.",
          details: error?.errors ?? error?.issues,
        });
      }
      res.status(500).json({ error: "Error actualizando configuración", details: error?.message || "Unknown error" });
    }
  };

  app.put("/api/dashboard/businesses/:id/settings", requireAuth, updateBusinessSettingsHandler);
  app.patch("/api/dashboard/businesses/:id/settings", requireAuth, updateBusinessSettingsHandler);

  // Update business profile and hours
  app.put("/api/dashboard/businesses/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    const businessId = parseInt(req.params.id);
    try {
      const dbUser = await verifyBusinessOwnership(req, res, businessId);
      if (!dbUser) return;

      const businessData = insertBusinessSchema.partial().parse(req.body);
      const updatedBusiness = await storage.updateBusiness(businessId, businessData);

      // Also sync workingHours to businessSettings if hours JSON was provided
      if (businessData.hours) {
        try {
          const parsedHours = typeof businessData.hours === 'string'
            ? JSON.parse(businessData.hours)
            : businessData.hours;
          await storage.updateBusinessSettings(businessId, { workingHours: parsedHours });
        } catch (err) {
          console.error("Error syncing hours to businessSettings:", err);
        }
      }

      res.json(updatedBusiness);
    } catch (error: any) {
      console.error("Error updating business:", error);
      res.status(400).json({ message: "Error actualizando negocio", details: error?.message });
    }
  });

  app.delete("/api/dashboard/businesses/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const businessId = parseInt(req.params.id);
      const dbUser = await verifyBusinessOwnership(req, res, businessId);
      if (!dbUser) return;

      await storage.deleteBusiness(businessId);
      res.json({ message: "Negocio eliminado exitosamente" });
    } catch (error: any) {
      res.status(404).json({ message: error instanceof Error ? error.message : "Error eliminando negocio" });
    }
  });

  // Google Places enrichment endpoint
  app.post("/api/dashboard/businesses/:id/enrich-google", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const businessId = parseInt(req.params.id);
      const dbUser = await verifyBusinessOwnership(req, res, businessId);
      if (!dbUser) return;

      if (!googlePlacesService.isConfigured()) {
        return res.status(503).json({
          message: "La integración con Google Places no está configurada (GOOGLE_MAPS_API_KEY)",
        });
      }

      const business = await storage.getBusiness(businessId);


      if (!business) {
        return res.status(404).json({ message: "Negocio no encontrado" });
      }

      console.log(`Enriching business ${business.name} with Google Places data...`);

      // Search for the business in Google Places
      const enrichedData = await googlePlacesService.findAndEnrichBusiness(
        business.name,
        business.address,
        business.phone
      );

      if (!enrichedData) {
        return res.status(404).json({
          message: "No se encontró información en Google Places para este negocio",
          business: {
            name: business.name,
            address: business.address,
            phone: business.phone
          }
        });
      }

      console.log(`Successfully enriched ${business.name} with Google data:`, {
        rating: enrichedData.rating,
        reviewCount: enrichedData.reviewCount,
        photosCount: enrichedData.photos?.length || 0,
      });

      // Return the enriched data
      res.json({
        ...enrichedData,
        message: "Negocio enriquecido exitosamente con datos de Google Places"
      });

    } catch (error: any) {
      console.error("Error enriching business with Google Places:", error);
      res.status(500).json({
        message: "Error enriqueciendo negocio con Google Places",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  });

  // Gallery upload — the microsite editor posts field `file`; older clients
  // (microsite-settings-new) post `image`. Accept both so no client breaks.
  app.post("/api/upload/gallery", requireAuth, upload.fields([
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]), async (req: AuthenticatedRequest, res) => {
    try {
      const files = (req.files ?? {}) as Record<string, Express.Multer.File[] | undefined>;
      const file = files.file?.[0] ?? files.image?.[0] ?? (req.file as Express.Multer.File | undefined);

      if (!file) {
        return res.status(400).json({ error: "No se proporcionó ninguna imagen" });
      }

      const segment = req.user?.email ? safeUserSegment(req.user.email) : "anon";
      const url = `/uploads/users/${segment}/${file.filename}`;

      res.json({ url, galleryUrl: url, filename: file.filename, size: file.size });
    } catch (error: any) {
      console.error("Error uploading gallery image:", error);
      res.status(500).json({ error: "Error al subir la imagen" });
    }
  });

  // Image upload endpoint
  app.post("/api/upload", requireAuth, upload.single('image'), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No se proporcionó ninguna imagen" });
      }

      // Create the correct URL path for user-specific uploads
      let imageUrl: string;
      if (req.user && req.user.email) {
        imageUrl = `/uploads/users/${safeUserSegment(req.user.email)}/${req.file.filename}`;
      } else {
        imageUrl = `/uploads/${req.file.filename}`;
      }

      res.json({ url: imageUrl });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      res.status(500).json({ error: "Error al subir la imagen" });
    }
  });

  // Admin routes
  app.use('/api/admin', simpleAdminRoutes);
  app.use('/api/admin/v2', adminBusinessRoutes);
  app.use('/api/admin', openstreetAdminRoutes);
  app.use('/api/networking', networkingRoutes);
  app.use(userPreferencesRoutes);
  // Owner's mobile desk: Chair Mode walk-ins + daily cash drawer.
  app.use('/api/dashboard/businesses', deskRoutes);
  // Owner promotions ("horas muertas") management.
  app.use('/api/dashboard/businesses', promosRoutes);
  // Owner prepaid packages ("bonos") management.
  app.use('/api/dashboard/businesses', packageRoutes);

  // Register admin scraping routes
  registerAdminScrapingRoutes(app);

  // Register scraping API routes
  app.use('/api/scraping', scrapingRoutes);
  app.use('/api/incremental-scraping', incrementalScrapingRoutes);
  app.use('/api/dashboard', dataApplicationRoutes);

  // Register gallery API routes
  app.use('/api/gallery', galleryRoutes);

  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir, { index: false, dotfiles: 'deny' }));

  return httpServer;
}
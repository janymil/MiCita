import { insertAppointmentSchema, insertBusinessSchema, insertBusinessSettingsSchema, insertClientSchema, insertReviewSchema, insertServiceSchema, insertUserSchema } from "@shared/schema";
import express, { type Express } from "express";
import fs from "fs";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { adminBusinessRoutes } from "./admin-business-routes.js";
import { registerAdminScrapingRoutes } from "./admin-scraping-routes.js";
import { getAuthenticatedUser, verifyBusinessOwnership, verifyClientOwnership, verifyServiceOwnership } from "./auth-helpers.js";
import { requireAuth, type AuthenticatedRequest } from "./auth-middleware.js";
import { emailService } from "./email-service.js";
import { AppointmentData } from "./email-templates";
import networkingRoutes from "./networking-routes.js";
import openstreetAdminRoutes from "./openstreet-admin-routes.js";
import galleryRoutes from "./routes/gallery.js";
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
import { stackServerApp } from "../stack/server.js";
import { db } from "./db.js";
import { performanceOptimizer, SpatialClusterer } from "./performance-optimizer";
import { searchPersonalization } from "./personalization.js";


// Helper function to send email notifications for status changes
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
  } catch (error) {
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

    for (const appointment of existingAppointments) {
      if (appointment.date !== date) continue;

      const appointmentStart = this.timeToMinutes(appointment.time);
      const appointmentDuration = await this.getServiceDuration(appointment.serviceId);
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
  ): any[] {
    const slots = [];
    const selectedDate = new Date(date);
    // Convert JavaScript day (0=Sunday) to business day (1=Monday)
    const jsDay = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const businessDay = jsDay === 0 ? 7 : jsDay; // Sunday becomes 7, Monday stays 1

    // Check if the day is a working day
    const daySchedule = workingHours[businessDay.toString()];
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

    const startTime = daySchedule.start;
    const endTime = daySchedule.end;
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    // Generate appointment slots (not just 30-min intervals)
    // Consider service duration + buffer time
    const totalSlotTime = serviceDuration + bufferMinutes;

    for (let minutes = startMinutes; minutes <= endMinutes - serviceDuration; minutes += 15) {
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

          const appointmentStart = this.timeToMinutes(appointment.time);
          // Get actual service duration for existing appointment
          const actualDuration = await this.getServiceDuration(appointment.serviceId || 0);
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

// Configure multer for file uploads
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
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

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(userData.email);

      if (existingUser) {
        return res.status(400).json({ message: "Email ya está registrado" });
      }

      const user = await storage.createUser(userData);
      res.json({ user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
      res.status(400).json({ message: "Datos inválidos" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);

      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Credenciales inválidas" });
      }

      res.json({ user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
      res.status(400).json({ message: "Error en el login" });
    }
  });

  // Stack Auth user sync endpoint
  app.post("/api/auth/sync", async (req, res) => {
    try {
      // Get the authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No authorization token provided' });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify the token with Stack Auth
      const stackUser = await stackServerApp.verifyToken(token);

      if (!stackUser) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }

      // Import the sync function
      const { syncUserWithDatabase, getUserByStackId } = await import('./auth-sync.js');

      // Try to get existing user first
      let dbUser;
      try {
        dbUser = await getUserByStackId(stackUser.id);
      } catch (error) {
        // If user doesn't exist, sync will create them
        dbUser = await syncUserWithDatabase(stackUser.id);
      }

      // Get user's businesses
      const businesses = await storage.getBusinessesByUserId(dbUser.id);

      res.json({
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          stackAuthId: dbUser.stackAuthId
        },
        businesses
      });
    } catch (error) {
      console.error('Error syncing user:', error);
      res.status(500).json({ message: "Error syncing user with database" });
    }
  });

  // Get subcategories by category
  app.get("/api/subcategories/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const subcategoriesResult = await storage.getSubcategoriesByCategory(category, true);
      res.json(subcategoriesResult);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      res.status(500).json({ message: "Error fetching subcategories" });
    }
  });

  // Get all subcategories grouped by category
  app.get("/api/subcategories", async (req, res) => {
    try {
      const subcategoriesResult = await storage.getAllSubcategories();
      res.json(subcategoriesResult);
    } catch (error) {
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
      let dbQuery = db.select().from(apifyBusinesses);
      if (dbConditions.length > 0) {
        dbQuery = dbQuery.where(and(...dbConditions));
      }

      // Apply sorting
      switch (searchQuery.sortBy) {
        case 'rating':
          dbQuery = dbQuery.orderBy(desc(apifyBusinesses.rating));
          break;
        case 'reviews':
          dbQuery = dbQuery.orderBy(desc(apifyBusinesses.reviewCount));
          break;
        case 'name':
          dbQuery = dbQuery.orderBy(asc(apifyBusinesses.name));
          break;
        default:
          // Default relevance sort
          dbQuery = dbQuery.orderBy(desc(apifyBusinesses.rating), desc(apifyBusinesses.reviewCount));
      }

      // Get total count
      let countQuery = db.select({ count: sql<number>`count(*)` }).from(apifyBusinesses);
      if (dbConditions.length > 0) {
        countQuery = countQuery.where(and(...dbConditions));
      }

      // Execute queries with performance optimization
      // For map view with many results, use optimized field selection
      if (isMapView) {
        const optimizedFields = performanceOptimizer.getOptimizedFields('map');
        dbQuery = db.select({
          placeId: apifyBusinesses.placeId,
          name: apifyBusinesses.name,
          address: apifyBusinesses.address,
          category: apifyBusinesses.category,
          rating: apifyBusinesses.rating,
          reviewCount: apifyBusinesses.reviewCount,
          district: apifyBusinesses.district,
          latitude: apifyBusinesses.latitude,
          longitude: apifyBusinesses.longitude,
          phone: apifyBusinesses.phone,
          website: apifyBusinesses.website
        }).from(apifyBusinesses);

        // Re-apply conditions for optimized query
        if (dbConditions.length > 0) {
          dbQuery = dbQuery.where(and(...dbConditions));
        }

        // Apply same sorting
        switch (searchParams.sortBy) {
          case 'rating':
            dbQuery = dbQuery.orderBy(desc(apifyBusinesses.rating));
            break;
          case 'reviews':
            dbQuery = dbQuery.orderBy(desc(apifyBusinesses.reviewCount));
            break;
          case 'name':
            dbQuery = dbQuery.orderBy(asc(apifyBusinesses.name));
            break;
          default:
            dbQuery = dbQuery.orderBy(desc(apifyBusinesses.rating), desc(apifyBusinesses.reviewCount));
        }
      }

      // Also search OpenStreetMap businesses with similar filters
      let osmQuery = db.select().from(openstreetBusinesses);
      const osmConditions = [];

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

      if (osmConditions.length > 0) {
        osmQuery = osmQuery.where(and(...osmConditions));
      }

      // Apply OSM sorting (no ratings, so sort by name or contact quality)
      osmQuery = osmQuery.orderBy(asc(openstreetBusinesses.name));

      // Count OSM businesses
      let osmCountQuery = db.select({ count: sql<number>`count(*)` }).from(openstreetBusinesses);
      if (osmConditions.length > 0) {
        osmCountQuery = osmCountQuery.where(and(...osmConditions));
      }

      // Execute all queries
      const [apifyBusinessesList, totalCountResult, osmBusinessesList, osmCountResult] = await Promise.all([
        isMapView ? dbQuery : dbQuery.limit(searchParams.limit).offset((searchParams.page - 1) * searchParams.limit),
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
      let registeredBusinesses = [];

      try {
        // Only fetch registered businesses if they match search criteria
        if (!searchQuery.query && (!searchQuery.category || searchQuery.category === 'all') && !searchQuery.city) {
          registeredBusinesses = await storage.getAllActiveBusinesses();
        } else {
          registeredBusinesses = await storage.searchBusinesses(searchQuery.query, searchQuery.category, searchQuery.city);
        }

        console.log('🏢 Registered businesses found:', registeredBusinesses.length);
      } catch (error) {
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
        const categoryMap = {
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
      const sessionId = req.sessionID || req.headers['x-session-id'] as string || null;
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
        sessionId: req.sessionID || req.headers['x-session-id'],
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

    } catch (error) {
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
    } catch (error) {
      console.error('❌ Analytics error:', error);
      res.status(500).json({ message: "Error retrieving analytics" });
    }
  });

  app.get("/api/search/analytics/performance", async (req, res) => {
    try {
      const performance = searchAnalytics.getPerformanceMetrics();
      res.json(performance);
    } catch (error) {
      console.error('❌ Performance analytics error:', error);
      res.status(500).json({ message: "Error retrieving performance data" });
    }
  });

  app.get("/api/search/analytics/popular", async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const popular = searchAnalytics.getPopularCategories(parseInt(limit as string));
      res.json(popular);
    } catch (error) {
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
        return res.json(trending.map(item => ({
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
    } catch (error) {
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
    } catch (error) {
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
      const categoryMap = {
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
    } catch (error) {
      console.error('❌ Error getting subcategories:', error);
      res.status(500).json({ message: "Error obteniendo subcategorías" });
    }
  });

  // Get all subcategories grouped by category
  app.get("/api/subcategories", async (req, res) => {
    try {
      const subcategories = await storage.getAllSubcategories();
      res.json(subcategories);
    } catch (error) {
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
      } catch (error) {
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
      } catch (error) {
        results.apify = {
          status: 'error',
          message: `Apify API error: ${error.message}`,
          count: 0
        };
      }

      res.json(results);
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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

    } catch (error) {
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
    } catch (error) {
      console.error("Error fetching place details:", error);
      res.status(500).json({ message: "Error obteniendo detalles del negocio" });
    }
  });

  // Pull fresh data from Apify dataset
  app.post("/api/apify/pull-fresh", async (req, res) => {
    try {
      console.log('🔄 Pulling fresh data from Apify dataset...');

      const response = await fetch('https://api.apify.com/v2/datasets/jC3uI7WSuQKRTj2i1/items?token=apify_api_SThnhfb7cGOxixoqRUbdxCnjvoP6Kc33SbEq&clean=true&format=json&limit=2000');

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

          await storage.addApifyBusiness(cacheData);
          processed++;
        } catch (error) {
          console.error(`❌ Error processing business: ${error.message}`);
        }
      }

      res.json({
        success: true,
        message: `Successfully processed ${processed} businesses from Apify dataset`,
        processed,
        total: apifyData.length
      });

    } catch (error) {
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
    } catch (error) {
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

    } catch (error) {
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

    } catch (error) {
      console.error("Error starting all waves:", error);
      res.status(500).json({
        success: false,
        message: "Error iniciando todas las olas",
        error: error.message
      });
    }
  });



  // Public appointment availability endpoint
  app.get("/api/appointments/availability/:businessId", async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const { date, serviceId } = req.query;

      if (!date || !serviceId) {
        return res.status(400).json({ message: "Fecha y servicio son requeridos" });
      }

      // Get business settings for working hours and blocked times
      const settings = await storage.getBusinessSettings(businessId);
      const service = await storage.getService(parseInt(serviceId as string));

      if (!service) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      // Get existing appointments for the date
      const existingAppointments = await storage.getAppointmentsByDate(businessId, date as string);

      // Generate available time slots
      const availableSlots = await generateAvailableTimeSlots(
        date as string,
        settings?.workingHours || {},
        settings?.blockedDates || [],
        settings?.blockedHours || [],
        existingAppointments,
        service.duration || 30
      );

      res.json(availableSlots);
    } catch (error) {
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

      // Get all existing appointments for conflict detection
      const existingAppointments = await storage.getAppointmentsByDate(appointmentData.businessId, appointmentData.date);

      // Advanced conflict detection using SmartScheduler
      const proposedStartMinutes = SmartScheduler.timeToMinutes(appointmentData.time);
      const conflictCheck = await SmartScheduler.detectConflicts(
        proposedStartMinutes,
        service.duration,
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
        service.duration
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
          c.email.toLowerCase() === appointmentData.clientEmail.toLowerCase()
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
        duration: service.duration,
        status: 'pending', // Always start as pending for public bookings
        notes: `Reserva online - ${service.name}`,
        clientNotes: appointmentData.clientNotes || null,
        price: service.price
      });

      // Get business information for email
      const [business, businessSettings] = await Promise.all([
        storage.getBusiness(appointmentData.businessId),
        storage.getBusinessSettings(appointmentData.businessId)
      ]);

      // Send confirmation emails
      if (business) {
        const emailData: AppointmentData = {
          clientName: client.name,
          clientEmail: client.email,
          clientPhone: client.phone,
          businessName: business.name,
          businessEmail: businessSettings?.publicEmail || business.email || 'no-reply@example.com',
          serviceName: service.name,
          date: appointmentData.date,
          time: appointmentData.time,
          duration: service.duration,
          price: service.price,
          notes: appointmentData.clientNotes || undefined
        };

        // Send emails using Nodemailer
        try {
          const emailResults = await emailService.sendAppointmentEmails(emailData);
          console.log('Email send results:', emailResults);
        } catch (error) {
          console.error('Error sending emails:', error);
        }
      }

      res.json({
        success: true,
        appointment: {
          ...appointment,
          serviceName: service.name,
          clientName: client.name,
          duration: service.duration
        },
        message: "Cita creada exitosamente",
        bookingDetails: {
          service: service.name,
          date: appointmentData.date,
          time: appointmentData.time,
          duration: `${service.duration} minutos`,
          price: `S/ ${service.price}`
        }
      });
    } catch (error) {
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
        service.duration,
        existingAppointments,
        date
      );

      res.json({
        available: !conflictCheck.hasConflict,
        conflicts: conflictCheck.conflictingAppointments,
        serviceInfo: {
          name: service.name,
          duration: service.duration,
          price: service.price
        }
      });
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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

      // NO SLUG GENERATION - micrositio URLs are handled through settings customUrl only
      const business = await storage.createBusiness({
        ...businessData,
        slug: null, // No slug needed - customUrl in settings handles micrositio access
        userId: dbUser.id // Use authenticated user's database ID
      });

      res.json(business);
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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

      const appointment = await storage.createAppointment({
        ...appointmentData,
        businessId
      });

      res.json(appointment);
    } catch (error) {
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
          service.duration,
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
    } catch (error) {
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
    } catch (error) {
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

      const [appointments, clients, services] = await Promise.all([
        storage.getAppointmentsByBusinessId(businessId),
        storage.getClientsByBusinessId(businessId),
        storage.getServicesByBusinessId(businessId)
      ]);

      // Calculate analytics
      const thisMonth = new Date();
      thisMonth.setDate(1);

      const monthlyAppointments = appointments.filter(a => a.createdAt && a.createdAt >= thisMonth);
      const completedAppointments = appointments.filter(a => a.status === 'completed');
      const monthlyRevenue = completedAppointments
        .filter(a => a.createdAt && a.createdAt >= thisMonth)
        .reduce((sum, a) => sum + parseFloat(a.price || "0"), 0);
      const newClientsThisMonth = clients.filter(c => c.createdAt && c.createdAt >= thisMonth);

      // Calculate real weekly revenue for the last 7 weeks
      const now = new Date();
      const weeklyRevenue = [];
      for (let i = 6; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i * 7) - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const weekAppointments = appointments.filter(a => {
          if (!a.createdAt) return false;
          const appointmentDate = new Date(a.createdAt);
          return appointmentDate >= weekStart && appointmentDate <= weekEnd &&
            a.status === 'completed'; // Only count completed appointments for revenue
        });

        const weekRevenue = weekAppointments.reduce((sum, a) => sum + parseFloat(a.price || "0"), 0);
        weeklyRevenue.push(weekRevenue);
      }

      // Get upcoming appointments with proper names
      const upcomingAppointments = await Promise.all(
        appointments
          .filter(a => {
            const appointmentDate = new Date(`${a.date}T${a.time}`);
            return appointmentDate > new Date() && (a.status === 'pending' || a.status === 'confirmed');
          })
          .sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA.getTime() - dateB.getTime();
          })
          .slice(0, 5)
          .map(async (appointment) => {
            const [client, service] = await Promise.all([
              storage.getClient(appointment.clientId || 0),
              storage.getService(appointment.serviceId || 0)
            ]);

            return {
              ...appointment,
              clientName: client?.name || 'Cliente Desconocido',
              serviceName: service?.name || 'Servicio Desconocido'
            };
          })
      );

      // Count appointments by status
      const pendingAppointments = appointments.filter(a => a.status === 'pending').length;
      const confirmedToday = appointments.filter(a => {
        const today = new Date().toISOString().split('T')[0];
        return a.date === today && a.status === 'confirmed';
      }).length;

      // Financial analytics
      const totalRevenue = completedAppointments.reduce((sum, a) => sum + parseFloat(a.price || "0"), 0);
      const pendingPayments = appointments
        .filter(a => a.status === 'pending' || a.status === 'confirmed')
        .reduce((sum, a) => sum + parseFloat(a.price || "0"), 0);
      const averageAppointmentValue = completedAppointments.length > 0
        ? totalRevenue / completedAppointments.length
        : 0;

      const analytics = {
        revenue: monthlyRevenue,
        appointments: monthlyAppointments.length,
        newClients: newClientsThisMonth.length,
        totalClients: clients.length,
        totalServices: services.length,
        pendingAppointments,
        confirmedToday,
        weeklyRevenue,
        upcomingAppointments,
        // Financial data
        totalRevenue,
        pendingPayments,
        averageAppointmentValue,
        completedAppointments: completedAppointments.length
      };

      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Error obteniendo analytics" });
    }
  });

  // Financial data endpoint
  app.get("/api/dashboard/businesses/:businessId/financials", async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const { period = 'thisMonth' } = req.query;

      const [appointments, services] = await Promise.all([
        storage.getAppointmentsByBusinessId(businessId),
        storage.getServicesByBusinessId(businessId)
      ]);

      // Calculate date ranges based on period
      const now = new Date();
      let startDate: Date;
      let endDate = new Date();

      switch (period) {
        case 'lastMonth':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        case 'last3Months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case 'thisYear':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'thisMonth':
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }

      // Filter appointments by period
      const periodAppointments = appointments.filter(a => {
        if (!a.createdAt) return false;
        const appointmentDate = new Date(a.createdAt);
        return appointmentDate >= startDate && appointmentDate <= endDate;
      });

      const completedAppointments = periodAppointments.filter(a => a.status === 'completed');
      const pendingAppointments = periodAppointments.filter(a => a.status === 'pending' || a.status === 'confirmed');

      // Calculate financial metrics
      const totalRevenue = completedAppointments.reduce((sum, a) => sum + parseFloat(a.price || "0"), 0);
      const pendingPayments = pendingAppointments.reduce((sum, a) => sum + parseFloat(a.price || "0"), 0);
      const averageAppointmentValue = completedAppointments.length > 0
        ? totalRevenue / completedAppointments.length
        : 0;

      // Generate monthly revenue chart data
      const monthlyData = [];
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const monthAppointments = appointments.filter(a => {
          if (!a.createdAt || a.status !== 'completed') return false;
          const appointmentDate = new Date(a.createdAt);
          return appointmentDate >= monthStart && appointmentDate <= monthEnd;
        });

        const monthRevenue = monthAppointments.reduce((sum, a) => sum + parseFloat(a.price || "0"), 0);

        monthlyData.push({
          month: monthStart.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
          revenue: monthRevenue,
          appointments: monthAppointments.length
        });
      }

      // Recent transactions (completed appointments)
      const recentTransactions = await Promise.all(
        completedAppointments
          .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
          .slice(0, 10)
          .map(async (appointment) => {
            const [client, service] = await Promise.all([
              storage.getClient(appointment.clientId || 0),
              storage.getService(appointment.serviceId || 0)
            ]);

            return {
              id: appointment.id,
              date: appointment.date,
              time: appointment.time,
              clientName: client?.name || 'Cliente Desconocido',
              serviceName: service?.name || 'Servicio Desconocido',
              amount: parseFloat(appointment.price || "0"),
              status: appointment.status
            };
          })
      );

      // Payment status distribution
      const paymentStatusData = [
        { name: 'Completados', value: totalRevenue, count: completedAppointments.length },
        { name: 'Pendientes', value: pendingPayments, count: pendingAppointments.length }
      ];

      const financialData = {
        totalRevenue,
        pendingPayments,
        averageAppointmentValue,
        completedAppointments: completedAppointments.length,
        monthlyData,
        recentTransactions,
        paymentStatusData,
        period
      };

      res.json(financialData);
    } catch (error) {
      console.error("Error getting financial data:", error);
      res.status(500).json({ message: "Error obteniendo datos financieros" });
    }
  });

  const httpServer = createServer(app);
  // Micrositio routes
  app.get("/api/micrositio/:slug", async (req, res) => {
    const slug = req.params.slug;
    console.log(`Looking for micrositio with slug: ${slug}`);

    try {
      // Get all business settings to find one with matching custom URL
      const businesses = await storage.searchBusinesses("");
      console.log(`Found ${businesses.length} businesses to search through`);

      let foundBusiness = null;
      let foundSettings = null;

      for (const business of businesses) {
        const settings = await storage.getBusinessSettings(business.id);
        console.log(`Business ${business.id} (${business.name}) has customUrl: ${settings?.customUrl}, slug: ${business.slug}`);

        // ONLY check customUrl in settings - ignore business slug completely
        if (settings?.customUrl && settings.customUrl === slug) {
          foundBusiness = business;
          foundSettings = settings;
          console.log(`Found matching business: ${business.name} with customUrl: ${settings.customUrl}`);
          break;
        }
      }

      if (!foundBusiness || !foundSettings) {
        console.log(`No business found with customUrl: ${slug}`);
        return res.status(404).json({ error: "Negocio no encontrado" });
      }

      const services = await storage.getServicesByBusinessId(foundBusiness.id);
      const gallery = await storage.getGalleryByBusinessId(foundBusiness.id);
      const reviews = await storage.getReviewsByBusinessId(foundBusiness.id);

      console.log(`Returning micrositio data for: ${foundBusiness.name}`);
      res.json({
        business: foundBusiness,
        settings: foundSettings,
        services,
        gallery,
        reviews
      });
    } catch (error) {
      console.error("Error in micrositio route:", error);
      res.status(500).json({ error: "Error obteniendo datos del negocio" });
    }
  });

  // Reviews routes
  // Get reviews for a business (both scraped and customer reviews)
  app.get("/api/dashboard/businesses/:businessId/reviews", async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const reviews = await storage.getReviewsByBusinessId(businessId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Error obteniendo reseñas" });
    }
  });

  // Create a new customer review (public endpoint for microsite)
  app.post("/api/reviews", async (req, res) => {
    try {
      const reviewData = insertReviewSchema.parse(req.body);

      // Add source to identify this as a customer review
      const newReview = await storage.createReview({
        ...reviewData,
        source: 'customer', // vs 'scraped' for Google Maps reviews
        createdAt: new Date().toISOString()
      });

      res.status(201).json(newReview);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Error creando reseña" });
    }
  });

  // Delete a review (dashboard only)
  app.delete("/api/dashboard/businesses/:businessId/reviews/:reviewId", async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const reviewId = parseInt(req.params.reviewId);

      // Verify review belongs to business
      const review = await storage.getReviewsByBusinessId(businessId);
      if (!review.find(r => r.id === reviewId)) {
        return res.status(404).json({ message: "Reseña no encontrada" });
      }

      await storage.deleteReview(reviewId);
      res.json({ message: "Reseña eliminada" });
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ message: "Error eliminando reseña" });
    }
  });

  // Business settings routes
  app.get("/api/dashboard/businesses/:id/settings", async (req, res) => {
    const businessId = parseInt(req.params.id);
    try {
      const settings = await storage.getBusinessSettings(businessId);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Error obteniendo configuración" });
    }
  });

  app.put("/api/dashboard/businesses/:id/settings", async (req, res) => {
    const businessId = parseInt(req.params.id);
    try {
      console.log("Received settings update request:", req.body);
      const body = insertBusinessSettingsSchema.parse(req.body);
      console.log("Parsed settings data:", body);

      // customUrl is stored in settings ONLY - do NOT touch business slug

      const settings = await storage.updateBusinessSettings(businessId, body);
      console.log("Settings updated successfully:", settings);
      res.json(settings);
    } catch (error: any) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Error actualizando configuración", details: error?.message || "Unknown error" });
    }
  });

  app.delete("/api/dashboard/businesses/:id", async (req, res) => {
    try {
      const businessId = parseInt(req.params.id);
      await storage.deleteBusiness(businessId);
      res.json({ message: "Negocio eliminado exitosamente" });
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : "Error eliminando negocio" });
    }
  });

  // Google Places enrichment endpoint
  app.post("/api/dashboard/businesses/:id/enrich-google", async (req, res) => {
    try {
      const businessId = parseInt(req.params.id);
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
        reviewsCount: enrichedData.reviews?.length || 0
      });

      // Return the enriched data
      res.json({
        ...enrichedData,
        message: "Negocio enriquecido exitosamente con datos de Google Places"
      });

    } catch (error) {
      console.error("Error enriching business with Google Places:", error);
      res.status(500).json({
        message: "Error enriqueciendo negocio con Google Places",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  });

  // Image upload endpoint
  app.post("/api/upload", upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No se proporcionó ninguna imagen" });
      }

      // Return the URL of the uploaded file
      const imageUrl = `/uploads/${req.file.filename}`;
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

  // Register admin scraping routes
  registerAdminScrapingRoutes(app);

  // Register scraping API routes
  app.use('/api/scraping', scrapingRoutes);
  app.use('/api/incremental-scraping', incrementalScrapingRoutes);
  app.use('/api/dashboard', dataApplicationRoutes);

  // Register gallery API routes
  app.use('/api/gallery', galleryRoutes);

  // Debug endpoint to check email configuration (remove in production)
  app.get("/api/debug/email-config", (req, res) => {
    const hasSendGridKey = !!process.env.SENDGRID_API_KEY;
    const hasVerifiedSender = !!process.env.SENDGRID_VERIFIED_SENDER;

    res.json({
      emailService: 'SendGrid',
      configured: hasSendGridKey && hasVerifiedSender,
      hasSendGridKey,
      hasVerifiedSender,
      apiKey: hasSendGridKey ? 'SG.' + process.env.SENDGRID_API_KEY?.substring(3, 6) + '***' : 'NOT SET',
      verifiedSender: process.env.SENDGRID_VERIFIED_SENDER || 'NOT SET'
    });
  });

  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  return httpServer;
}
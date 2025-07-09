import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insertUserSchema, insertBusinessSchema, insertServiceSchema, insertClientSchema, insertAppointmentSchema, insertGallerySchema, insertReviewSchema, insertBusinessSettingsSchema } from "@shared/schema";
import { emailService } from "./email-service.js";
import { AppointmentData } from "./email-templates";
import { googlePlacesService } from "./google-places-service.js";
import { GooglePlacesCacheService } from "./google-places-cache-service-simple.js";
import { DBStorage } from "./db-storage.js";
import { overpassApiService } from "./overpass-api-service.js";
import { foursquareApiService } from "./foursquare-api-service.js";

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
      clientEmail: client.email,
      clientPhone: client.phone,
      businessName: business.name,
      businessEmail: business.email,
      serviceName: service.name,
      date: appointment.date,
      time: appointment.time,
      duration: service.duration,
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
    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Check if the day is a working day
    const daySchedule = workingHours[dayName];
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
  // Initialize cache service
  const cacheService = new GooglePlacesCacheService(storage as DBStorage, googlePlacesService);
  
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

  // Public search routes
  app.get("/api/search", async (req, res) => {
    try {
      const { q, category, city, bounds, page = '1' } = req.query;
      const query = (q as string) || "";
      const currentPage = parseInt(page as string);
      const resultsPerPage = 20;

      console.log('Search request:', { query, category, city, bounds: !!bounds, page: currentPage });
      
      let googlePlaces = [];
      
      // If bounds are provided, do a fresh map-based search
      if (bounds && typeof bounds === 'string') {
        console.log('🗺️ Map-based search with bounds');
        try {
          const boundsData = JSON.parse(bounds);
          
          // Use Overpass API for bounds-based search
          const overpassResults = await overpassApiService.searchBusinesses(
            query,
            category as string,
            boundsData
          );
          
          // Enrich top results with Foursquare data
          googlePlaces = await foursquareApiService.enrichBusinesses(overpassResults);
          
          console.log(`🎯 Found ${googlePlaces.length} businesses in map bounds`);
        } catch (error) {
          console.error('Error parsing bounds or searching map area:', error);
          // Fallback to cached search
          googlePlaces = await cacheService.searchBusinesses(query, category as string, city as string || 'Lima, Peru');
        }
      } else {
        // For Lima searches without bounds, use comprehensive search
        const location = city as string || 'Lima, Peru';
        
        if (location === 'Lima, Peru' || location.toLowerCase().includes('lima')) {
          console.log('🌆 COMPREHENSIVE SYSTEM: Using enhanced OpenStreetMap data for complete Lima coverage');
          
          // Get comprehensive results from enhanced Overpass API with ALL business types
          googlePlaces = await overpassApiService.searchLimaComprehensive(query, category as string);
          console.log(`🗺️ Enhanced Overpass API found ${googlePlaces.length} businesses from OpenStreetMap`);
          
          // Skip Foursquare enrichment for now due to API authentication issues
          console.log(`✅ COMPREHENSIVE SYSTEM: Found ${googlePlaces.length} total businesses using cost-free OpenStreetMap data`);
        } else {
          // For other cities, use Overpass API + Foursquare enrichment
          console.log('🔍 Using Overpass + Foursquare search for location:', location);
          const overpassResults = await overpassApiService.searchBusinesses(query, category as string);
          googlePlaces = await foursquareApiService.enrichBusinesses(overpassResults);
        }
      }
      
      const [businesses, publicBusinesses] = await Promise.all([
        storage.searchBusinesses(query, category as string, city as string),
        storage.searchPublicBusinesses(query, category as string)
      ]);
      
      console.log('Search results before pagination:', { 
        businesses: businesses.length, 
        publicBusinesses: publicBusinesses.length, 
        googlePlaces: googlePlaces.length 
      });

      // For registered businesses, get their customUrl and coverImage from settings
      const businessesWithCustomUrl = await Promise.all(
        businesses.map(async (business) => {
          const settings = await storage.getBusinessSettings(business.id);
          return {
            ...business,
            customUrl: settings?.customUrl || business.slug,
            coverImage: settings?.coverImage || business.coverImage,
            type: "registered"
          };
        })
      );

      // Combine all results first
      const combinedResults = [
        ...businessesWithCustomUrl,
        ...publicBusinesses.map(p => ({ ...p, type: "public" })),
        ...googlePlaces.map(p => ({ ...p, type: "google" }))
      ];

      // Apply server-side pagination with smart total estimation
      const totalResults = combinedResults.length;
      const googlePlacesCount = googlePlaces.length;
      
      // If we have exactly multiples of 20 Google Places results, there might be more available
      const mightHaveMore = googlePlacesCount >= 60 && googlePlacesCount % 20 === 0;
      
      // Estimate total available results - Google Places can have hundreds of results
      const estimatedTotalResults = mightHaveMore ? Math.max(totalResults, 200) : totalResults;
      const totalPages = Math.ceil(estimatedTotalResults / resultsPerPage);
      
      const startIndex = (currentPage - 1) * resultsPerPage;
      const endIndex = startIndex + resultsPerPage;
      const paginatedResults = combinedResults.slice(startIndex, endIndex);

      console.log('Pagination applied:', { 
        actualResults: totalResults,
        estimatedTotalResults, 
        totalPages, 
        currentPage, 
        startIndex, 
        endIndex,
        paginatedResults: paginatedResults.length,
        mightHaveMore 
      });

      res.json({
        results: paginatedResults,
        pagination: {
          currentPage,
          totalPages,
          totalResults: estimatedTotalResults, // Use estimated total for frontend
          actualResults: totalResults, // Keep track of actual fetched results
          resultsPerPage,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
          mightHaveMore
        }
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ message: "Error en la búsqueda" });
    }
  });

  // Test API endpoints to verify services are working
  app.get("/api/test-apis", async (req, res) => {
    try {
      const results = {
        overpass: { status: 'unknown', message: '', count: 0 },
        foursquare: { status: 'unknown', message: '', count: 0 },
        apify: { status: 'unknown', message: '', count: 0 }
      };

      // Test Overpass API
      try {
        console.log('🧪 Testing Overpass API...');
        const overpassResults = await overpassApiService.searchBusinesses('barberia', 'belleza');
        results.overpass = {
          status: 'working',
          message: `Found ${overpassResults.length} businesses from OpenStreetMap`,
          count: overpassResults.length
        };
      } catch (error) {
        results.overpass = {
          status: 'error',
          message: `Overpass API error: ${error.message}`,
          count: 0
        };
      }

      // Test Foursquare API
      try {
        console.log('🧪 Testing Foursquare API...');
        const foursquareResults = await foursquareApiService.searchBusinesses('barberia', 'belleza', 'Lima, Peru', 5);
        results.foursquare = {
          status: 'working',
          message: `Found ${foursquareResults.length} businesses from Foursquare`,
          count: foursquareResults.length
        };
      } catch (error) {
        results.foursquare = {
          status: 'error',
          message: `Foursquare API error: ${error.message}`,
          count: 0
        };
      }

      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Business details endpoint (supports multiple ID formats)
  app.get("/api/places/:placeId", async (req, res) => {
    try {
      const { placeId } = req.params;
      
      // Handle different ID formats
      if (placeId.startsWith('fsq_')) {
        // Foursquare ID
        const fsqId = placeId.replace('fsq_', '');
        const details = await foursquareApiService.getBusinessDetails(fsqId);
        
        if (!details) {
          return res.status(404).json({ message: "Negocio no encontrado" });
        }
        
        res.json(details);
      } else if (placeId.startsWith('osm_')) {
        // OpenStreetMap ID - return basic info since OSM doesn't have detail API
        return res.status(404).json({ message: "Detalles no disponibles para negocios de OpenStreetMap" });
      } else {
        // Legacy Google Places ID
        const details = await googlePlacesService.getBusinessDetails(placeId);
        
        if (!details) {
          return res.status(404).json({ message: "Negocio no encontrado" });
        }

        res.json(details);
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
      res.status(500).json({ message: "Error obteniendo detalles del negocio" });
    }
  });

  // Test endpoint for new APIs
  app.get("/api/test-apis", async (req, res) => {
    try {
      console.log('🧪 Testing new API integrations...');
      
      // Test Overpass API
      const overpassResults = await overpassApiService.searchBusinesses('restaurant', 'gastronomia');
      console.log(`Overpass API: ${overpassResults.length} results`);
      
      // Test Foursquare API (if configured)
      let foursquareResults = [];
      try {
        foursquareResults = await foursquareApiService.searchBusinesses('restaurant', 'gastronomia', 'Lima, Peru', 5);
        console.log(`Foursquare API: ${foursquareResults.length} results`);
      } catch (error) {
        console.log('Foursquare API error:', error.message);
      }
      
      res.json({
        overpass: {
          working: overpassResults.length > 0,
          count: overpassResults.length,
          sample: overpassResults.slice(0, 2)
        },
        foursquare: {
          working: foursquareResults.length > 0,
          count: foursquareResults.length,
          sample: foursquareResults.slice(0, 2),
          apiKeyConfigured: !!process.env.FOURSQUARE_API_KEY
        }
      });
    } catch (error) {
      console.error('API test error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cache management endpoint
  app.post("/api/cache/clean", async (req, res) => {
    try {
      await cacheService.cleanExpiredCache();
      res.json({ message: "Cache limpiado exitosamente" });
    } catch (error) {
      console.error("Error cleaning cache:", error);
      res.status(500).json({ message: "Error limpiando cache" });
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
        service.duration
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

  // Business dashboard routes
  app.get("/api/dashboard/businesses", async (req, res) => {
    try {
      // TODO: Get from authenticated user session
      const userId = 1; // Mock user ID
      const businesses = await storage.getBusinessesByUserId(userId);
      res.json(businesses);
    } catch (error) {
      res.status(500).json({ message: "Error obteniendo negocios" });
    }
  });

  app.post("/api/dashboard/businesses", async (req, res) => {
    try {
      const businessData = insertBusinessSchema.parse(req.body);
      const userId = 1; // Mock user ID

      // Check if user already has a business
      const existingBusinesses = await storage.getBusinessesByUserId(userId);
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
        userId
      });

      res.json(business);
    } catch (error) {
      res.status(400).json({ message: "Error creando negocio" });
    }
  });

  // Services routes
  app.get("/api/dashboard/businesses/:businessId/services", async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const services = await storage.getServicesByBusinessId(businessId);
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Error obteniendo servicios" });
    }
  });

  app.post("/api/dashboard/businesses/:businessId/services", async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      console.log("Creating service with data:", req.body);

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

  app.put("/api/dashboard/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const serviceData = insertServiceSchema.partial().parse(req.body);

      const service = await storage.updateService(id, serviceData);
      res.json(service);
    } catch (error) {
      res.status(400).json({ message: "Error actualizando servicio" });
    }
  });

  app.delete("/api/dashboard/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteService(id);
      res.json({ message: "Servicio eliminado" });
    } catch (error) {
      res.status(500).json({ message: "Error eliminando servicio" });
    }
  });

  app.put("/api/dashboard/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const clientData = insertClientSchema.partial().parse(req.body);

      const client = await storage.updateClient(id, clientData);
      res.json(client);
    } catch (error) {
      res.status(400).json({ message: "Error actualizando cliente" });
    }
  });

  app.delete("/api/dashboard/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteClient(id);
      res.json({ message: "Cliente eliminado exitosamente" });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Error eliminando cliente" });
    }
  });

  // Clients routes
  app.get("/api/dashboard/businesses/:businessId/clients", async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const clients = await storage.getClientsByBusinessId(businessId);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Error obteniendo clientes" });
    }
  });

  app.post("/api/dashboard/businesses/:businessId/clients", async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const clientData = insertClientSchema.parse(req.body);

      const client = await storage.createClient({
        ...clientData,
        businessId
      });

      res.json(client);
    } catch (error) {
      res.status(400).json({ message: "Error creando cliente" });
    }
  });

  // Appointments routes
  app.get("/api/dashboard/businesses/:businessId/appointments", async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const { date } = req.query;

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

  app.post("/api/dashboard/businesses/:businessId/appointments", async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
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
  app.put("/api/dashboard/businesses/:businessId/appointments/:id", async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const businessId = parseInt(req.params.businessId);
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
  app.delete("/api/dashboard/businesses/:businessId/appointments/:id", async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const businessId = parseInt(req.params.businessId);

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
  app.get("/api/dashboard/businesses/:businessId/analytics", async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);

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
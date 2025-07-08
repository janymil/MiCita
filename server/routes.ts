import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insertUserSchema, insertBusinessSchema, insertServiceSchema, insertClientSchema, insertAppointmentSchema, insertGallerySchema, insertReviewSchema, insertBusinessSettingsSchema } from "@shared/schema";
import { sendGridEmailService } from "./sendgrid-email-service";
import { AppointmentData } from "./email-templates";

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
  static generateOptimalSlots(
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
      const hasAppointmentConflict = existingAppointments.some(appointment => {
        if (appointment.date !== date) return false;
        
        const appointmentStart = this.timeToMinutes(appointment.time);
        // Use a conservative estimate for existing appointments if duration unknown
        const estimatedDuration = 60; // Conservative 60-minute estimate
        const appointmentEnd = appointmentStart + estimatedDuration;
        
        // Check for overlap including buffer time
        return this.hasTimeOverlap(
          minutes, 
          minutes + serviceDuration + bufferMinutes,
          appointmentStart - bufferMinutes, 
          appointmentEnd
        );
      });
      
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
function generateAvailableTimeSlots(
  date: string,
  workingHours: any,
  blockedDates: any[],
  blockedHours: any[],
  existingAppointments: any[],
  serviceDuration: number
) {
  return SmartScheduler.generateOptimalSlots(
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

  // Public search routes
  app.get("/api/search", async (req, res) => {
    try {
      const { q, category, city } = req.query;
      const query = (q as string) || "";
      
      const [businesses, publicBusinesses] = await Promise.all([
        storage.searchBusinesses(query, category as string, city as string),
        storage.searchPublicBusinesses(query, category as string)
      ]);
      
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
      
      const combinedResults = [
        ...businessesWithCustomUrl,
        ...publicBusinesses.map(p => ({ ...p, type: "public" }))
      ];
      
      res.json(combinedResults);
    } catch (error) {
      res.status(500).json({ message: "Error en la búsqueda" });
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
      const availableSlots = generateAvailableTimeSlots(
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
      const availableSlots = generateAvailableTimeSlots(
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
          c.email.toLowerCase() === appointmentData.clientEmail.toLowerCase() ||
          c.phone === appointmentData.clientPhone
        ));
      
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

        // Send emails asynchronously (don't wait for completion)
        sendGridEmailService.sendAppointmentEmails(emailData)
          .then(result => {
            console.log('Email send results:', result);
          })
          .catch(error => {
            console.error('Failed to send appointment emails:', error);
          });
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
        .filter(a => a.status === 'confirmed')
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

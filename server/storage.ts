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
  type User, 
  type InsertUser,
  type Business,
  type InsertBusiness,
  type Service,
  type InsertService,
  type Client,
  type InsertClient,
  type Appointment,
  type InsertAppointment,
  type GalleryItem,
  type InsertGalleryItem,
  type PublicBusiness,
  type InsertPublicBusiness,
  type Review,
  type InsertReview,
  type BusinessSettings,
  type InsertBusinessSettings
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Businesses
  getBusiness(id: number): Promise<Business | undefined>;
  getBusinessBySlug(slug: string): Promise<Business | undefined>;
  getBusinessesByCategory(category: string): Promise<Business[]>;
  getBusinessesByUserId(userId: number): Promise<Business[]>;
  searchBusinesses(query: string, category?: string, city?: string): Promise<Business[]>;
  getFeaturedBusinesses(): Promise<Business[]>;
  createBusiness(business: InsertBusiness & { userId: number }): Promise<Business>;
  updateBusiness(id: number, business: Partial<InsertBusiness>): Promise<Business>;
  
  // Services
  getServicesByBusinessId(businessId: number): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService & { businessId: number }): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service>;
  deleteService(id: number): Promise<void>;
  
  // Clients
  getClientsByBusinessId(businessId: number): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient & { businessId: number }): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number): Promise<void>;
  
  // Appointments
  getAppointmentsByBusinessId(businessId: number): Promise<Appointment[]>;
  getAppointmentsByDate(businessId: number, date: string): Promise<Appointment[]>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment & { businessId: number }): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: number): Promise<void>;
  
  // Gallery
  getGalleryByBusinessId(businessId: number): Promise<GalleryItem[]>;
  createGalleryItem(item: InsertGalleryItem & { businessId: number }): Promise<GalleryItem>;
  deleteGalleryItem(id: number): Promise<void>;
  
  // Public Businesses
  getPublicBusinesses(): Promise<PublicBusiness[]>;
  searchPublicBusinesses(query: string, category?: string): Promise<PublicBusiness[]>;
  
  // Reviews
  getReviewsByBusinessId(businessId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  
  // Business Settings
  getBusinessSettings(businessId: number): Promise<BusinessSettings | undefined>;
  updateBusinessSettings(businessId: number, settings: InsertBusinessSettings): Promise<BusinessSettings>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private businesses: Map<number, Business> = new Map();
  private services: Map<number, Service> = new Map();
  private clients: Map<number, Client> = new Map();
  private appointments: Map<number, Appointment> = new Map();
  private gallery: Map<number, GalleryItem> = new Map();
  private publicBusinesses: Map<number, PublicBusiness> = new Map();
  private reviews: Map<number, Review> = new Map();
  private businessSettings: Map<number, BusinessSettings> = new Map();
  
  private currentUserId = 1;
  private currentBusinessId = 1;
  private currentServiceId = 1;
  private currentClientId = 1;
  private currentAppointmentId = 1;
  private currentGalleryId = 1;
  private currentPublicBusinessId = 1;
  private currentReviewId = 1;
  private currentSettingsId = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed sample data for demo
    const sampleUser: User = {
      id: 1,
      email: "spa@relajante.pe",
      password: "hashed_password",
      name: "María Rodríguez",
      createdAt: new Date()
    };
    this.users.set(1, sampleUser);
    this.currentUserId = 2;

    const sampleBusiness: Business = {
      id: 1,
      userId: 1,
      name: "Spa Relajante Lima",
      slug: "spa-relajante-lima",
      description: "Centro de relajación y belleza con servicios premium de spa y tratamientos faciales.",
      category: "belleza",
      phone: "+51 1 234-5678",
      email: "info@sparelajantelima.pe",
      address: "Av. Larco 345",
      city: "Lima",
      country: "Perú",
      latitude: "-12.1216",
      longitude: "-77.0314",
      website: "https://sparelajantelima.pe",
      logo: null,
      coverImage: "https://images.unsplash.com/photo-1600334129128-685c5582fd35",
      hours: {
        monday: { open: "09:00", close: "20:00" },
        tuesday: { open: "09:00", close: "20:00" },
        wednesday: { open: "09:00", close: "20:00" },
        thursday: { open: "09:00", close: "20:00" },
        friday: { open: "09:00", close: "20:00" },
        saturday: { open: "10:00", close: "18:00" },
        sunday: { closed: true }
      },
      isActive: true,
      isPremium: true,
      rating: "4.9",
      reviewCount: 142,
      createdAt: new Date()
    };
    this.businesses.set(1, sampleBusiness);
    this.currentBusinessId = 2;

    // Add more sample businesses
    const businesses = [
      {
        id: 2,
        userId: 1,
        name: "Clínica Salud Integral",
        slug: "clinica-salud-integral",
        description: "Atención médica integral con especialistas en medicina general y familiar.",
        category: "salud",
        rating: "4.8",
        reviewCount: 98,
        address: "San Borja, Lima"
      },
      {
        id: 3,
        userId: 1,
        name: "FitZone Gym",
        slug: "fitzone-gym",
        description: "Gimnasio completo con equipos modernos y entrenadores personales certificados.",
        category: "fitness",
        rating: "4.7",
        reviewCount: 156,
        address: "La Molina, Lima"
      }
    ];

    businesses.forEach(b => {
      this.businesses.set(b.id, {
        ...sampleBusiness,
        ...b,
        createdAt: new Date()
      });
    });
    this.currentBusinessId = 4;

    // Sample services
    const sampleServices = [
      { businessId: 1, name: "Tratamiento Facial Completo", price: "120.00", duration: 60 },
      { businessId: 1, name: "Masaje Relajante", price: "80.00", duration: 45 },
      { businessId: 1, name: "Aromaterapia", price: "90.00", duration: 50 }
    ];

    sampleServices.forEach(s => {
      this.services.set(this.currentServiceId, {
        id: this.currentServiceId,
        businessId: s.businessId,
        name: s.name,
        description: "",
        price: s.price,
        duration: s.duration,
        isActive: true,
        createdAt: new Date()
      });
      this.currentServiceId++;
    });

    // Sample public businesses
    const publicBiz = [
      { name: "Restaurante Central", category: "restaurante", city: "Lima", rating: "4.9" },
      { name: "Café de la Paz", category: "cafeteria", city: "Lima", rating: "4.6" },
      { name: "Mecánica Rápida", category: "automotriz", city: "Lima", rating: "4.3" }
    ];

    publicBiz.forEach(p => {
      this.publicBusinesses.set(this.currentPublicBusinessId, {
        id: this.currentPublicBusinessId,
        name: p.name,
        category: p.category,
        description: "",
        phone: null,
        address: "",
        city: p.city,
        rating: p.rating,
        reviewCount: Math.floor(Math.random() * 200),
        isVerified: false,
        createdAt: new Date()
      });
      this.currentPublicBusinessId++;
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: this.currentUserId++,
      createdAt: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  async getBusiness(id: number): Promise<Business | undefined> {
    return this.businesses.get(id);
  }

  async getBusinessBySlug(slug: string): Promise<Business | undefined> {
    return Array.from(this.businesses.values()).find(business => business.slug === slug);
  }

  async getBusinessesByCategory(category: string): Promise<Business[]> {
    return Array.from(this.businesses.values()).filter(business => business.category === category);
  }

  async getBusinessesByUserId(userId: number): Promise<Business[]> {
    return Array.from(this.businesses.values()).filter(business => business.userId === userId);
  }

  async searchBusinesses(query: string, category?: string, city?: string): Promise<Business[]> {
    return Array.from(this.businesses.values()).filter(business => {
      const matchesQuery = business.name.toLowerCase().includes(query.toLowerCase()) ||
                          business.description?.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = !category || business.category === category;
      const matchesCity = !city || business.city?.toLowerCase() === city.toLowerCase();
      
      return matchesQuery && matchesCategory && matchesCity && business.isActive;
    });
  }

  async getFeaturedBusinesses(): Promise<Business[]> {
    return Array.from(this.businesses.values())
      .filter(business => business.isActive && business.isPremium)
      .slice(0, 6);
  }

  async createBusiness(business: InsertBusiness & { userId: number }): Promise<Business> {
    const newBusiness: Business = {
      id: this.currentBusinessId++,
      userId: business.userId,
      name: business.name,
      slug: business.slug,
      description: business.description || null,
      category: business.category,
      phone: business.phone || null,
      email: business.email || null,
      address: business.address || null,
      city: business.city || null,
      country: business.country || null,
      latitude: business.latitude || null,
      longitude: business.longitude || null,
      website: business.website || null,
      logo: business.logo || null,
      coverImage: business.coverImage || null,
      hours: business.hours || null,
      isActive: business.isActive ?? true,
      isPremium: business.isPremium ?? false,
      rating: business.rating || null,
      reviewCount: business.reviewCount ?? 0,
      createdAt: new Date()
    };
    this.businesses.set(newBusiness.id, newBusiness);
    return newBusiness;
  }

  async updateBusiness(id: number, business: Partial<InsertBusiness>): Promise<Business> {
    const existing = this.businesses.get(id);
    if (!existing) throw new Error("Business not found");
    
    const updated = { ...existing, ...business };
    this.businesses.set(id, updated);
    return updated;
  }

  async getServicesByBusinessId(businessId: number): Promise<Service[]> {
    return Array.from(this.services.values()).filter(service => service.businessId === businessId);
  }

  async getService(id: number): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async createService(service: InsertService & { businessId: number }): Promise<Service> {
    const newService: Service = {
      id: this.currentServiceId++,
      businessId: service.businessId,
      name: service.name,
      description: service.description || null,
      price: service.price || null,
      duration: service.duration || null,
      isActive: service.isActive ?? true,
      createdAt: new Date()
    };
    this.services.set(newService.id, newService);
    return newService;
  }

  async updateService(id: number, service: Partial<InsertService>): Promise<Service> {
    const existing = this.services.get(id);
    if (!existing) throw new Error("Service not found");
    
    const updated = { ...existing, ...service };
    this.services.set(id, updated);
    return updated;
  }

  async deleteService(id: number): Promise<void> {
    this.services.delete(id);
  }

  async getClientsByBusinessId(businessId: number): Promise<Client[]> {
    return Array.from(this.clients.values()).filter(client => client.businessId === businessId);
  }

  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(client: InsertClient & { businessId: number }): Promise<Client> {
    const newClient: Client = {
      id: this.currentClientId++,
      businessId: client.businessId,
      name: client.name,
      email: client.email || null,
      phone: client.phone || null,
      notes: client.notes || null,
      createdAt: new Date()
    };
    this.clients.set(newClient.id, newClient);
    return newClient;
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client> {
    const existing = this.clients.get(id);
    if (!existing) throw new Error("Client not found");
    
    const updated = { ...existing, ...client };
    this.clients.set(id, updated);
    return updated;
  }

  async deleteClient(id: number): Promise<void> {
    this.clients.delete(id);
  }

  async getAppointmentsByBusinessId(businessId: number): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(appointment => appointment.businessId === businessId);
  }

  async getAppointmentsByDate(businessId: number, date: string): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(appointment => 
      appointment.businessId === businessId && 
      appointment.date.toISOString().split('T')[0] === date
    );
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async createAppointment(appointment: InsertAppointment & { businessId: number }): Promise<Appointment> {
    const newAppointment: Appointment = {
      id: this.currentAppointmentId++,
      businessId: appointment.businessId,
      clientId: appointment.clientId || 0,
      serviceId: appointment.serviceId || 0,
      date: appointment.date,
      duration: appointment.duration,
      status: appointment.status || "scheduled",
      notes: appointment.notes || null,
      price: appointment.price || null,
      createdAt: new Date()
    };
    this.appointments.set(newAppointment.id, newAppointment);
    return newAppointment;
  }

  async updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment> {
    const existing = this.appointments.get(id);
    if (!existing) throw new Error("Appointment not found");
    
    const updated = { ...existing, ...appointment };
    this.appointments.set(id, updated);
    return updated;
  }

  async deleteAppointment(id: number): Promise<void> {
    this.appointments.delete(id);
  }

  async getGalleryByBusinessId(businessId: number): Promise<GalleryItem[]> {
    return Array.from(this.gallery.values()).filter(item => item.businessId === businessId);
  }

  async createGalleryItem(item: InsertGalleryItem & { businessId: number }): Promise<GalleryItem> {
    const newItem: GalleryItem = {
      id: this.currentGalleryId++,
      businessId: item.businessId,
      imageUrl: item.imageUrl,
      caption: item.caption || null,
      isMain: item.isMain ?? false,
      createdAt: new Date()
    };
    this.gallery.set(newItem.id, newItem);
    return newItem;
  }

  async deleteGalleryItem(id: number): Promise<void> {
    this.gallery.delete(id);
  }

  async getPublicBusinesses(): Promise<PublicBusiness[]> {
    return Array.from(this.publicBusinesses.values());
  }

  async searchPublicBusinesses(query: string, category?: string): Promise<PublicBusiness[]> {
    return Array.from(this.publicBusinesses.values()).filter(business => {
      const matchesQuery = business.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = !category || business.category === category;
      return matchesQuery && matchesCategory;
    });
  }

  async getReviewsByBusinessId(businessId: number): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(review => review.businessId === businessId);
  }

  async createReview(review: InsertReview): Promise<Review> {
    const newReview: Review = {
      id: this.currentReviewId++,
      businessId: review.businessId || 0,
      rating: review.rating,
      clientName: review.clientName,
      comment: review.comment || null,
      createdAt: new Date()
    };
    this.reviews.set(newReview.id, newReview);
    return newReview;
  }

  async getBusinessSettings(businessId: number): Promise<BusinessSettings | undefined> {
    return Array.from(this.businessSettings.values()).find(settings => settings.businessId === businessId);
  }

  async updateBusinessSettings(businessId: number, settings: InsertBusinessSettings): Promise<BusinessSettings> {
    const existing = Array.from(this.businessSettings.values()).find(s => s.businessId === businessId);
    
    if (existing) {
      // Only update fields that have actual values to prevent overwriting with empty strings
      const updated = { 
        ...existing, 
        updatedAt: new Date()
      };
      
      // Update only non-empty string fields OR explicit boolean/object updates
      Object.keys(settings).forEach(key => {
        const value = settings[key as keyof InsertBusinessSettings];
        if (value !== undefined && value !== null) {
          if (typeof value === 'string') {
            // Only update strings if they're not empty, unless it's an explicit clear
            if (value.trim() !== '' || existing[key as keyof BusinessSettings] !== '') {
              (updated as any)[key] = value;
            }
          } else if (typeof value === 'boolean') {
            (updated as any)[key] = value;
          } else if (Array.isArray(value)) {
            (updated as any)[key] = value;
          } else if (typeof value === 'object' && value !== null) {
            (updated as any)[key] = value;
          }
        }
      });
      
      this.businessSettings.set(existing.id, updated);
      return updated;
    } else {
      const newSettings: BusinessSettings = {
        id: this.currentSettingsId++,
        businessId,
        
        // Micrositio fields
        customUrl: settings.customUrl || null,
        professionalTitle: settings.professionalTitle || null,
        publicDescription: settings.publicDescription || null,
        profileImage: settings.profileImage || null,
        coverImage: settings.coverImage || null,
        publicEmail: settings.publicEmail || null,
        publicPhone: settings.publicPhone || null,
        streetAddress: settings.streetAddress || null,
        district: settings.district || null,
        region: settings.region || null,
        postalCode: settings.postalCode || null,
        country: settings.country || "Perú",
        facebookUrl: settings.facebookUrl || null,
        instagramUrl: settings.instagramUrl || null,
        tiktokUrl: settings.tiktokUrl || null,
        youtubeUrl: settings.youtubeUrl || null,
        enablePublicBooking: settings.enablePublicBooking ?? true,
        enableContactForm: settings.enableContactForm ?? true,
        enableGallery: settings.enableGallery ?? true,
        scheduleNotes: settings.scheduleNotes || null,
        workingHours: settings.workingHours || {
          monday: { enabled: true, start: "09:00", end: "17:00" },
          tuesday: { enabled: true, start: "09:00", end: "17:00" },
          wednesday: { enabled: true, start: "09:00", end: "17:00" },
          thursday: { enabled: true, start: "09:00", end: "17:00" },
          friday: { enabled: true, start: "09:00", end: "17:00" },
          saturday: { enabled: true, start: "09:00", end: "17:00" },
          sunday: { enabled: false, start: "09:00", end: "17:00" },
        },
        blockedDates: Array.isArray(settings.blockedDates) ? settings.blockedDates : [],
        blockedHours: Array.isArray(settings.blockedHours) ? settings.blockedHours : [],
        
        // Existing fields
        theme: settings.theme || null,
        primaryColor: settings.primaryColor || null,
        bookingSettings: settings.bookingSettings || null,
        emailNotifications: settings.emailNotifications ?? true,
        smsNotifications: settings.smsNotifications ?? false,
        
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.businessSettings.set(newSettings.id, newSettings);
      return newSettings;
    }
  }
}

import { DBStorage } from "./db-storage.js";

// Use database storage when DATABASE_URL is available, otherwise fallback to memory storage
export const storage = process.env.DATABASE_URL ? new DBStorage() : new MemStorage();

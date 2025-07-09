import express from 'express';
import { storage } from './storage.js';
import { db } from './db.js';
import { apifyBusinesses } from '../shared/schema.js';

const router = express.Router();

// Admin authentication middleware
const adminAuth = (req: any, res: any, next: any) => {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }
  
  const token = authHeader.split(' ')[1];
  if (token !== adminPassword) {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
  
  next();
};

// Apply admin auth to all routes
router.use(adminAuth);

// Get admin dashboard stats
router.get('/stats', async (req, res) => {
  try {
    // Simple stats for now
    const businesses = await db.select().from(apifyBusinesses);
    const totalBusinesses = businesses.length;
    
    // Group by category
    const categoryStats = businesses.reduce((acc: any, business: any) => {
      const category = business.category || 'unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    
    const categoryArray = Object.entries(categoryStats).map(([category, count]) => ({
      category,
      count
    }));
    
    // Group by status
    const statusStats = businesses.reduce((acc: any, business: any) => {
      const status = business.verifiedStatus || 'unverified';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    const statusArray = Object.entries(statusStats).map(([status, count]) => ({
      status,
      count
    }));
    
    // Calculate quality stats
    const qualityScores = businesses
      .map((b: any) => b.qualityScore || 0)
      .filter((score: number) => score > 0);
    
    const qualityStats = {
      avgQuality: qualityScores.length > 0 ? qualityScores.reduce((a: number, b: number) => a + b, 0) / qualityScores.length : 0,
      minQuality: qualityScores.length > 0 ? Math.min(...qualityScores) : 0,
      maxQuality: qualityScores.length > 0 ? Math.max(...qualityScores) : 0
    };
    
    // Recent businesses (mock for now)
    const recentBusinesses = businesses.filter((b: any) => {
      const createdAt = new Date(b.createdAt || Date.now());
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return createdAt >= weekAgo;
    }).length;
    
    res.json({
      totalBusinesses,
      categoryStats: categoryArray,
      verificationStats: statusArray,
      qualityStats,
      recentBusinesses
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// Get paginated businesses with filters
router.get('/businesses', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || '';
    const category = req.query.category as string;
    const status = req.query.status as string;
    
    // Get all businesses first - direct query without limit
    let businesses = await db.select().from(apifyBusinesses);
    
    // Filter by search
    if (search) {
      businesses = businesses.filter(b => 
        b.name?.toLowerCase().includes(search.toLowerCase()) ||
        b.address?.toLowerCase().includes(search.toLowerCase()) ||
        b.searchTerms?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Filter by category
    if (category) {
      businesses = businesses.filter(b => b.category === category);
    }
    
    // Filter by status
    if (status) {
      businesses = businesses.filter(b => b.verifiedStatus === status);
    }
    
    // Calculate pagination
    const total = businesses.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedBusinesses = businesses.slice(offset, offset + limit);
    
    res.json({
      businesses: paginatedBusinesses,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Admin businesses fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// Get single business by ID
router.get('/businesses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const businesses = await db.select().from(apifyBusinesses);
    const business = businesses.find(b => b.id === id);
    
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    res.json(business);
  } catch (error) {
    console.error('Admin business fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});

// Create new business
router.post('/businesses', async (req, res) => {
  try {
    const businessData = req.body;
    
    // Validate required fields
    if (!businessData.name || !businessData.address || !businessData.category) {
      return res.status(400).json({ error: 'Name, address, and category are required' });
    }
    
    // Create business using storage
    const newBusiness = await storage.addApifyBusiness({
      placeId: businessData.placeId || `admin_${Date.now()}_${Math.random()}`,
      name: businessData.name,
      address: businessData.address,
      category: businessData.category,
      phone: businessData.phone || null,
      website: businessData.website || null,
      rating: businessData.rating || 0,
      reviewCount: businessData.reviewCount || 0,
      priceLevel: businessData.priceLevel || 0,
      latitude: businessData.latitude || -12.0464,
      longitude: businessData.longitude || -77.0428,
      openNow: businessData.openNow || null,
      hours: businessData.hours || null,
      photoUrl: businessData.photoUrl || null,
      searchTerms: `${businessData.name} ${businessData.address} ${businessData.category}`.toLowerCase(),
      isRegistered: businessData.isRegistered || false
    });
    
    res.status(201).json(newBusiness);
  } catch (error) {
    console.error('Admin business create error:', error);
    res.status(500).json({ error: 'Failed to create business' });
  }
});

// Get filter options
router.get('/filter-options', async (req, res) => {
  try {
    const businesses = await db.select().from(apifyBusinesses);
    
    const categories = [...new Set(businesses.map(b => b.category))].filter(Boolean);
    const statuses = [...new Set(businesses.map(b => b.verifiedStatus || 'unverified'))];
    const sources = [...new Set(businesses.map(b => b.scrapingSource || 'unknown'))];
    
    res.json({
      categories,
      statuses,
      sources
    });
  } catch (error) {
    console.error('Admin filter options error:', error);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

// Search businesses
router.get('/businesses/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const businesses = await db.select().from(apifyBusinesses);
    
    // Filter by search query
    const filteredBusinesses = businesses.filter(b => 
      b.name?.toLowerCase().includes(query.toLowerCase()) ||
      b.address?.toLowerCase().includes(query.toLowerCase()) ||
      b.searchTerms?.toLowerCase().includes(query.toLowerCase())
    );
    
    res.json(filteredBusinesses.slice(0, limit));
  } catch (error) {
    console.error('Admin search error:', error);
    res.status(500).json({ error: 'Failed to search businesses' });
  }
});

export { router as simpleAdminRoutes };
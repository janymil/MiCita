import express from 'express';
import { storage } from './storage.js';
import { apifyBusinesses } from '../shared/schema.js';
import { db } from './db.js';
import { eq, and, ilike, desc, asc, count, sql } from 'drizzle-orm';

const router = express.Router();

// Admin authentication middleware
const adminAuth = (req: any, res: any, next: any) => {
  // Simple admin check - in production, use proper JWT/session auth
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }
  
  const token = authHeader.split(' ')[1]; // Bearer token
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
    // Total businesses
    const totalResult = await db.select({ count: count() }).from(apifyBusinesses);
    const totalBusinesses = totalResult[0]?.count || 0;
    
    // Businesses by category
    const categoryStats = await db
      .select({
        category: apifyBusinesses.category,
        count: count()
      })
      .from(apifyBusinesses)
      .groupBy(apifyBusinesses.category);
    
    // Businesses by verification status
    const verificationStats = await db
      .select({
        status: apifyBusinesses.verifiedStatus,
        count: count()
      })
      .from(apifyBusinesses)
      .groupBy(apifyBusinesses.verifiedStatus);
    
    // Quality score distribution
    const qualityStats = await db
      .select({
        avgQuality: sql<number>`AVG(${apifyBusinesses.qualityScore})`,
        minQuality: sql<number>`MIN(${apifyBusinesses.qualityScore})`,
        maxQuality: sql<number>`MAX(${apifyBusinesses.qualityScore})`
      })
      .from(apifyBusinesses);
    
    // Recent businesses (last 7 days)
    const recentCount = await db
      .select({ count: count() })
      .from(apifyBusinesses)
      .where(sql`${apifyBusinesses.createdAt} >= NOW() - INTERVAL '7 days'`);
    
    res.json({
      totalBusinesses,
      categoryStats,
      verificationStats,
      qualityStats: qualityStats[0] || {},
      recentBusinesses: recentCount[0]?.count || 0
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
    const search = req.query.search as string;
    const category = req.query.category as string;
    const subcategory = req.query.subcategory as string;
    const status = req.query.status as string;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) || 'desc';
    

    
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const conditions = [];
    
    if (search) {
      conditions.push(
        sql`(${apifyBusinesses.name} ILIKE ${'%' + search + '%'} OR ${apifyBusinesses.address} ILIKE ${'%' + search + '%'})`
      );
    }
    
    if (category && category !== '' && category !== 'all') {
      conditions.push(eq(apifyBusinesses.category, category));
    }
    
    if (subcategory && subcategory !== '' && subcategory !== 'all') {
      conditions.push(eq(apifyBusinesses.subcategory, subcategory));
    }
    
    if (status && status !== '' && status !== 'all') {
      conditions.push(eq(apifyBusinesses.verifiedStatus, status));
    }
    
    // Build WHERE clause
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Determine sort column
    const sortColumn = sortBy === 'createdAt' ? apifyBusinesses.createdAt :
                      sortBy === 'name' ? apifyBusinesses.name :
                      sortBy === 'category' ? apifyBusinesses.category :
                      sortBy === 'rating' ? apifyBusinesses.rating :
                      sortBy === 'qualityScore' ? apifyBusinesses.qualityScore :
                      sortBy === 'verifiedStatus' ? apifyBusinesses.verifiedStatus :
                      apifyBusinesses.createdAt;
    
    // Main query
    let businessQuery = db.select().from(apifyBusinesses);
    
    if (whereCondition) {
      businessQuery = businessQuery.where(whereCondition);
    }
    
    businessQuery = sortOrder === 'asc' 
      ? businessQuery.orderBy(asc(sortColumn))
      : businessQuery.orderBy(desc(sortColumn));
    
    const businesses = await businessQuery.limit(limit).offset(offset);
    
    // Count query
    let countQuery = db.select({ count: count() }).from(apifyBusinesses);
    if (whereCondition) {
      countQuery = countQuery.where(whereCondition);
    }
    const totalResult = await countQuery;
    const total = totalResult[0]?.count || 0;
    
    res.json({
      businesses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
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
    const db = storage.getDb();
    const id = parseInt(req.params.id);
    
    const business = await db
      .select()
      .from(apifyBusinesses)
      .where(eq(apifyBusinesses.id, id))
      .limit(1);
    
    if (business.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    res.json(business[0]);
  } catch (error) {
    console.error('Admin business fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});

// Create new business
router.post('/businesses', async (req, res) => {
  try {
    const db = storage.getDb();
    const businessData = req.body;
    
    // Validate required fields
    if (!businessData.name || !businessData.address || !businessData.category) {
      return res.status(400).json({ error: 'Name, address, and category are required' });
    }
    
    // Set defaults
    const newBusiness = {
      ...businessData,
      placeId: businessData.placeId || `admin_${Date.now()}_${Math.random()}`,
      rating: businessData.rating || 0,
      reviewCount: businessData.reviewCount || 0,
      priceLevel: businessData.priceLevel || 0,
      latitude: businessData.latitude || -12.0464,
      longitude: businessData.longitude || -77.0428,
      isRegistered: businessData.isRegistered || false,
      verifiedStatus: businessData.verifiedStatus || 'unverified',
      businessStatus: businessData.businessStatus || 'unknown',
      dataFreshnessScore: businessData.dataFreshnessScore || 0,
      qualityScore: businessData.qualityScore || 0,
      phoneCountryCode: businessData.phoneCountryCode || '+51',
      coordinatesValidated: businessData.coordinatesValidated || false,
      scrapingSource: 'admin',
      searchTerms: `${businessData.name} ${businessData.address} ${businessData.category}`.toLowerCase()
    };
    
    const result = await db.insert(apifyBusinesses).values(newBusiness).returning();
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Admin business create error:', error);
    res.status(500).json({ error: 'Failed to create business' });
  }
});

// Update business
router.put('/businesses/:id', async (req, res) => {
  try {
    const db = storage.getDb();
    const id = parseInt(req.params.id);
    const updateData = req.body;
    
    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;
    
    // Update search terms if name, address, or category changed
    if (updateData.name || updateData.address || updateData.category) {
      const existing = await db
        .select()
        .from(apifyBusinesses)
        .where(eq(apifyBusinesses.id, id))
        .limit(1);
      
      if (existing.length > 0) {
        const business = existing[0];
        updateData.searchTerms = `${updateData.name || business.name} ${updateData.address || business.address} ${updateData.category || business.category}`.toLowerCase();
      }
    }
    
    // Set last updated
    updateData.lastUpdated = new Date();
    
    const result = await db
      .update(apifyBusinesses)
      .set(updateData)
      .where(eq(apifyBusinesses.id, id))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Admin business update error:', error);
    res.status(500).json({ error: 'Failed to update business' });
  }
});

// Delete business
router.delete('/businesses/:id', async (req, res) => {
  try {
    const db = storage.getDb();
    const id = parseInt(req.params.id);
    
    const result = await db
      .delete(apifyBusinesses)
      .where(eq(apifyBusinesses.id, id))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    res.json({ message: 'Business deleted successfully', business: result[0] });
  } catch (error) {
    console.error('Admin business delete error:', error);
    res.status(500).json({ error: 'Failed to delete business' });
  }
});

// Bulk operations
router.post('/businesses/bulk-update', async (req, res) => {
  try {
    const db = storage.getDb();
    const { ids, updateData } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs array is required' });
    }
    
    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;
    updateData.lastUpdated = new Date();
    
    const results = [];
    for (const id of ids) {
      try {
        const result = await db
          .update(apifyBusinesses)
          .set(updateData)
          .where(eq(apifyBusinesses.id, parseInt(id)))
          .returning();
        
        if (result.length > 0) {
          results.push(result[0]);
        }
      } catch (error) {
        console.error(`Error updating business ${id}:`, error);
      }
    }
    
    res.json({ message: `Updated ${results.length} businesses`, businesses: results });
  } catch (error) {
    console.error('Admin bulk update error:', error);
    res.status(500).json({ error: 'Failed to bulk update businesses' });
  }
});

router.delete('/businesses/bulk-delete', async (req, res) => {
  try {
    const db = storage.getDb();
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs array is required' });
    }
    
    const results = [];
    for (const id of ids) {
      try {
        const result = await db
          .delete(apifyBusinesses)
          .where(eq(apifyBusinesses.id, parseInt(id)))
          .returning();
        
        if (result.length > 0) {
          results.push(result[0]);
        }
      } catch (error) {
        console.error(`Error deleting business ${id}:`, error);
      }
    }
    
    res.json({ message: `Deleted ${results.length} businesses`, businesses: results });
  } catch (error) {
    console.error('Admin bulk delete error:', error);
    res.status(500).json({ error: 'Failed to bulk delete businesses' });
  }
});

// Export/Import operations
router.get('/businesses/export', async (req, res) => {
  try {
    const db = storage.getDb();
    const format = req.query.format as string || 'json';
    
    const businesses = await db.select().from(apifyBusinesses);
    
    if (format === 'csv') {
      // Convert to CSV
      const csvHeader = Object.keys(businesses[0] || {}).join(',');
      const csvRows = businesses.map(business => 
        Object.values(business).map(value => 
          typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
        ).join(',')
      );
      const csv = [csvHeader, ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=businesses.csv');
      res.send(csv);
    } else {
      // Default JSON export
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=businesses.json');
      res.json(businesses);
    }
  } catch (error) {
    console.error('Admin export error:', error);
    res.status(500).json({ error: 'Failed to export businesses' });
  }
});

// Search and filters
router.get('/businesses/search', async (req, res) => {
  try {
    const db = storage.getDb();
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const businesses = await db
      .select()
      .from(apifyBusinesses)
      .where(
        `${apifyBusinesses.name.name} ILIKE '%${query}%' OR 
         ${apifyBusinesses.address.name} ILIKE '%${query}%' OR 
         ${apifyBusinesses.searchTerms.name} ILIKE '%${query}%'`
      )
      .limit(limit);
    
    res.json(businesses);
  } catch (error) {
    console.error('Admin search error:', error);
    res.status(500).json({ error: 'Failed to search businesses' });
  }
});

// Get unique values for filters
router.get('/filter-options', async (req, res) => {
  try {
    const db = storage.getDb();
    
    const categories = await db
      .selectDistinct({ category: apifyBusinesses.category })
      .from(apifyBusinesses);
    
    const statuses = await db
      .selectDistinct({ status: apifyBusinesses.verifiedStatus })
      .from(apifyBusinesses);
    
    const sources = await db
      .selectDistinct({ source: apifyBusinesses.scrapingSource })
      .from(apifyBusinesses);
    
    res.json({
      categories: categories.map(c => c.category),
      statuses: statuses.map(s => s.status),
      sources: sources.map(s => s.source)
    });
  } catch (error) {
    console.error('Admin filter options error:', error);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

export { router as adminRoutes };
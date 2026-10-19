import express from 'express';
import { db } from './db.js';
import { apifyBusinesses } from '../shared/schema.js';
import { eq, and, or, gte, lte, like, sql, desc, asc, count, inArray } from 'drizzle-orm';
import { adminAuth } from './admin-auth.js';

const router = express.Router();

// Apply admin auth to all routes
router.use(adminAuth);

// GET /api/admin/stats - Get admin dashboard stats
router.get('/stats', async (req, res) => {
  try {
    // Get all businesses for stats
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
    
    // Recent businesses
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
  } catch (error: any) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// GET /api/admin/test - Test endpoint to check database
router.get('/test', async (req, res) => {
  try {
    const businesses = await db.select().from(apifyBusinesses).limit(5);
    res.json({
      message: 'Test successful',
      businessCount: businesses.length,
      sampleBusiness: businesses[0] || null
    });
  } catch (error: any) {
    console.error('Test error:', error);
    res.status(500).json({ error: 'Test failed', details: error.message });
  }
});

// Helper function to build where conditions
function buildWhereConditions(filters: any) {
  const conditions = [];
  
  // Search across multiple fields
  if (filters.search) {
    conditions.push(
      or(
        like(apifyBusinesses.name, `%${filters.search}%`),
        like(apifyBusinesses.address, `%${filters.search}%`),
        like(apifyBusinesses.phone, `%${filters.search}%`),
        like(apifyBusinesses.searchTerms, `%${filters.search}%`)
      )
    );
  }
  
  // Category filter
  if (filters.category) {
    conditions.push(eq(apifyBusinesses.category, filters.category));
  }
  
  // Subcategory filter
  if (filters.subcategory) {
    conditions.push(eq(apifyBusinesses.subcategory, filters.subcategory));
  }
  
  // Status filter
  if (filters.status) {
    conditions.push(eq(apifyBusinesses.verifiedStatus, filters.status));
  }
  
  // District filter
  if (filters.district) {
    conditions.push(eq(apifyBusinesses.district, filters.district));
  }
  
  // Active status filter
  if (filters.isActive !== undefined) {
    const isActive = filters.isActive === 'true';
    conditions.push(eq(apifyBusinesses.isActive, isActive));
  }
  
  // Rating filters
  if (filters.minRating !== undefined && !isNaN(parseFloat(filters.minRating))) {
    conditions.push(gte(apifyBusinesses.rating, filters.minRating));
  }
  
  if (filters.maxRating !== undefined && !isNaN(parseFloat(filters.maxRating))) {
    conditions.push(lte(apifyBusinesses.rating, filters.maxRating));
  }
  
  // Review count filters
  if (filters.minReviews !== undefined && !isNaN(parseInt(filters.minReviews))) {
    conditions.push(gte(apifyBusinesses.reviewCount, parseInt(filters.minReviews)));
  }
  
  if (filters.maxReviews !== undefined && !isNaN(parseInt(filters.maxReviews))) {
    conditions.push(lte(apifyBusinesses.reviewCount, parseInt(filters.maxReviews)));
  }
  
  return conditions.length > 0 ? and(...conditions) : undefined;
}

// Helper function to build order by clause
function buildOrderBy(sortField: string, sortDirection: string) {
  const direction = sortDirection === 'asc' ? asc : desc;
  
  switch (sortField) {
    case 'name':
      return direction(apifyBusinesses.name);
    case 'category':
      return direction(apifyBusinesses.category);
    case 'rating':
      return direction(apifyBusinesses.rating);
    case 'reviewCount':
      return direction(apifyBusinesses.reviewCount);
    case 'qualityScore':
      return direction(apifyBusinesses.qualityScore);
    case 'verifiedStatus':
      return direction(apifyBusinesses.verifiedStatus);
    case 'createdAt':
      return direction(apifyBusinesses.createdAt);
    case 'lastUpdated':
      return direction(apifyBusinesses.lastUpdated);
    default:
      return desc(apifyBusinesses.createdAt);
  }
}

// GET /api/admin/businesses - List businesses with filters and pagination
router.get('/businesses', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Cap at 100
    const sortField = req.query.sortField as string || 'createdAt';
    const sortDirection = req.query.sortDirection as string || 'desc';
    
    // Extract filters
    const filters = {
      search: req.query.search as string,
      category: req.query.category as string,
      subcategory: req.query.subcategory as string,
      status: req.query.status as string,
      district: req.query.district as string,
      isActive: req.query.isActive as string,
      minRating: req.query.minRating as string,
      maxRating: req.query.maxRating as string,
      minReviews: req.query.minReviews as string,
      maxReviews: req.query.maxReviews as string,
    };
    
    console.log('Business query filters:', filters);
    
    // Build where conditions
    const whereConditions = buildWhereConditions(filters);
    const orderBy = buildOrderBy(sortField, sortDirection);
    
    // Get total count
    const totalResult = await db
      .select({ count: count(apifyBusinesses.id) })
      .from(apifyBusinesses)
      .where(whereConditions);
    
    const total = Number(totalResult[0]?.count || 0);
    
    // Get paginated results
    const offset = (page - 1) * limit;
    const businesses = await db
      .select()
      .from(apifyBusinesses)
      .where(whereConditions)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
    
    res.json({
      businesses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    });
    
  } catch (error: any) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// GET /api/admin/businesses/filter-options - Get filter options
router.get('/businesses/filter-options', async (req, res) => {
  try {
    // Get all unique values for filters
    const businesses = await db.select().from(apifyBusinesses);
    
    console.log(`Found ${businesses.length} businesses for filter options`);
    
    // Sample first few businesses to see data structure
    if (businesses.length > 0) {
      console.log('Sample business:', {
        category: businesses[0].category,
        subcategory: businesses[0].subcategory,
        verifiedStatus: businesses[0].verifiedStatus,
        district: businesses[0].district
      });
    }
    
    const categories = [...new Set(businesses.map(b => b.category).filter(Boolean))].sort();
    const statuses = [...new Set(businesses.map(b => b.verifiedStatus).filter(Boolean))].sort();
    const districts = [...new Set(businesses.map(b => b.district).filter(Boolean))].sort();
    
    console.log('Filter options found:', {
      categories: categories.length,
      statuses: statuses.length,
      districts: districts.length
    });
    
    // Group subcategories by category
    const subcategories: { [key: string]: string[] } = {};
    businesses.forEach(business => {
      if (business.category && business.subcategory) {
        if (!subcategories[business.category]) {
          subcategories[business.category] = [];
        }
        if (!subcategories[business.category].includes(business.subcategory)) {
          subcategories[business.category].push(business.subcategory);
        }
      }
    });
    
    // Sort subcategories
    Object.keys(subcategories).forEach(category => {
      subcategories[category].sort();
    });
    
    console.log('Subcategories by category:', Object.keys(subcategories).reduce((acc, cat) => {
      acc[cat] = subcategories[cat].length;
      return acc;
    }, {} as any));
    
    res.json({
      categories,
      subcategories,
      statuses,
      districts
    });
    
  } catch (error: any) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

// GET /api/admin/businesses/:id - Get single business
router.get('/businesses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid business ID' });
    }
    
    const business = await db
      .select()
      .from(apifyBusinesses)
      .where(eq(apifyBusinesses.id, id))
      .limit(1);
    
    if (business.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    res.json(business[0]);
    
  } catch (error: any) {
    console.error('Error fetching business:', error);
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});

// POST /api/admin/businesses - Create new business
router.post('/businesses', async (req, res) => {
  try {
    const businessData = req.body;
    
    // Validate required fields
    if (!businessData.name || !businessData.address || !businessData.category) {
      return res.status(400).json({ 
        error: 'Name, address, and category are required' 
      });
    }
    
    // Create business
    const newBusiness = await db
      .insert(apifyBusinesses)
      .values({
        placeId: businessData.placeId || `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: businessData.name,
        address: businessData.address,
        category: businessData.category,
        subcategory: businessData.subcategory || null,
        phone: businessData.phone || null,
        website: businessData.website || null,
        email: businessData.email || null,
        rating: businessData.rating?.toString() || '0',
        reviewCount: businessData.reviewCount || 0,
        qualityScore: businessData.qualityScore || 0,
        verifiedStatus: businessData.verifiedStatus || 'unverified',
        businessStatus: businessData.businessStatus || 'operational',
        latitude: businessData.latitude?.toString() || '-12.0464',
        longitude: businessData.longitude?.toString() || '-77.0428',
        district: businessData.district || null,
        isActive: businessData.isActive !== false,
        searchTerms: `${businessData.name} ${businessData.address} ${businessData.category}`.toLowerCase()
      })
      .returning();
    
    res.status(201).json(newBusiness[0]);
    
  } catch (error: any) {
    console.error('Error creating business:', error);
    res.status(500).json({ error: 'Failed to create business' });
  }
});

// PUT /api/admin/businesses/:id - Update business
router.put('/businesses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid business ID' });
    }
    
    // Check if business exists
    const existingBusiness = await db
      .select()
      .from(apifyBusinesses)
      .where(eq(apifyBusinesses.id, id))
      .limit(1);
    
    if (existingBusiness.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    // Update business
    const updatedBusiness = await db
      .update(apifyBusinesses)
      .set({
        ...updates,
        lastUpdated: new Date()
      })
      .where(eq(apifyBusinesses.id, id))
      .returning();
    
    res.json(updatedBusiness[0]);
    
  } catch (error: any) {
    console.error('Error updating business:', error);
    res.status(500).json({ error: 'Failed to update business' });
  }
});

// DELETE /api/admin/businesses/:id - Delete business
router.delete('/businesses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid business ID' });
    }
    
    // Check if business exists
    const existingBusiness = await db
      .select()
      .from(apifyBusinesses)
      .where(eq(apifyBusinesses.id, id))
      .limit(1);
    
    if (existingBusiness.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    // Delete business
    await db
      .delete(apifyBusinesses)
      .where(eq(apifyBusinesses.id, id));
    
    res.json({ message: 'Business deleted successfully' });
    
  } catch (error: any) {
    console.error('Error deleting business:', error);
    res.status(500).json({ error: 'Failed to delete business' });
  }
});

// PATCH /api/admin/businesses/bulk - Bulk update businesses
router.patch('/businesses/bulk', async (req, res) => {
  try {
    const { ids, updates } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty ids array' });
    }
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid updates object' });
    }
    
    // Validate IDs
    const validIds = ids.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));
    
    if (validIds.length === 0) {
      return res.status(400).json({ error: 'No valid IDs provided' });
    }
    
    // Update businesses
    const updatedBusinesses = await db
      .update(apifyBusinesses)
      .set({
        ...updates,
        lastUpdated: new Date()
      })
      .where(inArray(apifyBusinesses.id, validIds))
      .returning();
    
    res.json({
      message: `Successfully updated ${updatedBusinesses.length} businesses`,
      updatedCount: updatedBusinesses.length,
      businesses: updatedBusinesses
    });
    
  } catch (error: any) {
    console.error('Error bulk updating businesses:', error);
    res.status(500).json({ error: 'Failed to bulk update businesses' });
  }
});

// DELETE /api/admin/businesses/bulk - Bulk delete businesses
router.delete('/businesses/bulk', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty ids array' });
    }
    
    // Validate IDs
    const validIds = ids.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));
    
    if (validIds.length === 0) {
      return res.status(400).json({ error: 'No valid IDs provided' });
    }
    
    // Delete businesses
    const deletedBusinesses = await db
      .delete(apifyBusinesses)
      .where(inArray(apifyBusinesses.id, validIds))
      .returning();
    
    res.json({
      message: `Successfully deleted ${deletedBusinesses.length} businesses`,
      deletedCount: deletedBusinesses.length
    });
    
  } catch (error: any) {
    console.error('Error bulk deleting businesses:', error);
    res.status(500).json({ error: 'Failed to bulk delete businesses' });
  }
});

// GET /api/admin/businesses/export - Export businesses
router.get('/businesses/export', async (req, res) => {
  try {
    const format = req.query.format as string || 'csv';
    const idsParam = req.query.ids as string;
    
    // Extract filters for export (same as listing)
    const filters = {
      search: req.query.search as string,
      category: req.query.category as string,
      subcategory: req.query.subcategory as string,
      status: req.query.status as string,
      district: req.query.district as string,
      isActive: req.query.isActive as string,
      minRating: req.query.minRating as string,
      maxRating: req.query.maxRating as string,
      minReviews: req.query.minReviews as string,
      maxReviews: req.query.maxReviews as string,
    };
    
    let whereConditions = buildWhereConditions(filters);
    
    // If specific IDs are requested, filter by those
    if (idsParam) {
      const ids = idsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
      if (ids.length > 0) {
        const idCondition = inArray(apifyBusinesses.id, ids);
        whereConditions = whereConditions ? and(whereConditions, idCondition) : idCondition;
      }
    }
    
    // Get businesses
    const businesses = await db
      .select()
      .from(apifyBusinesses)
      .where(whereConditions)
      .orderBy(desc(apifyBusinesses.createdAt));
    
    if (format === 'csv') {
      // Create CSV
      const headers = [
        'ID', 'Place ID', 'Name', 'Address', 'Category', 'Subcategory',
        'Phone', 'Website', 'Email', 'Rating', 'Review Count',
        'Quality Score', 'Status', 'District', 'Active', 'Created At'
      ];
      
      const rows = businesses.map(b => [
        b.id,
        `"${b.placeId || ''}"`,
        `"${b.name || ''}"`,
        `"${b.address || ''}"`,
        `"${b.category || ''}"`,
        `"${b.subcategory || ''}"`,
        `"${b.phone || ''}"`,
        `"${b.website || ''}"`,
        `"${b.email || ''}"`,
        b.rating || '0',
        b.reviewCount || '0',
        b.qualityScore || '0',
        `"${b.verifiedStatus || 'unverified'}"`,
        `"${b.district || ''}"`,
        b.isActive ? 'Yes' : 'No',
        `"${b.createdAt ? new Date(b.createdAt).toISOString() : ''}"`
      ]);
      
      const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="businesses-export-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
      
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="businesses-export-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(businesses);
      
    } else {
      res.status(400).json({ error: 'Unsupported export format. Use csv or json.' });
    }
    
  } catch (error: any) {
    console.error('Error exporting businesses:', error);
    res.status(500).json({ error: 'Failed to export businesses' });
  }
});

// GET /api/admin/businesses/stats - Get business statistics
router.get('/businesses/stats', async (req, res) => {
  try {
    const businesses = await db.select().from(apifyBusinesses);
    
    const stats = {
      total: businesses.length,
      verified: businesses.filter(b => b.verifiedStatus === 'verified').length,
      active: businesses.filter(b => b.isActive !== false).length,
      byCategory: {} as { [key: string]: number },
      byDistrict: {} as { [key: string]: number },
      averageRating: 0,
      averageQuality: 0,
      totalReviews: 0
    };
    
    // Calculate category distribution
    businesses.forEach(b => {
      if (b.category) {
        stats.byCategory[b.category] = (stats.byCategory[b.category] || 0) + 1;
      }
      if (b.district) {
        stats.byDistrict[b.district] = (stats.byDistrict[b.district] || 0) + 1;
      }
    });
    
    // Calculate averages
    const validRatings = businesses.filter(b => b.rating != null && parseFloat(b.rating.toString()) > 0);
    if (validRatings.length > 0) {
      stats.averageRating = validRatings.reduce((sum, b) => sum + parseFloat(b.rating?.toString() ?? '0'), 0) / validRatings.length;
    }
    
    const validQuality = businesses.filter(b => b.qualityScore != null && b.qualityScore > 0);
    if (validQuality.length > 0) {
      stats.averageQuality = validQuality.reduce((sum, b) => sum + (b.qualityScore ?? 0), 0) / validQuality.length;
    }
    
    stats.totalReviews = businesses.reduce((sum, b) => sum + (b.reviewCount || 0), 0);
    
    res.json(stats);
    
  } catch (error: any) {
    console.error('Error fetching business stats:', error);
    res.status(500).json({ error: 'Failed to fetch business statistics' });
  }
});

export { router as adminBusinessRoutes };
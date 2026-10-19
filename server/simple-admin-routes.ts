import express from 'express';
import { storage } from './storage.js';
import { db } from './db.js';
import { eq, inArray } from 'drizzle-orm';
import { apifyBusinesses } from '../shared/schema.js';
import { adminAuth } from './admin-auth.js';

const router = express.Router();

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
  } catch (error: any) {
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
    const subcategory = req.query.subcategory as string;
    const status = req.query.status as string;
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as string || 'desc';
    const minRating = parseFloat(req.query.minRating as string);
    const maxRating = parseFloat(req.query.maxRating as string);
    const minReviews = parseInt(req.query.minReviews as string);
    const maxReviews = parseInt(req.query.maxReviews as string);
    
    // Debug logging
    console.log('Filter params:', {
      search, category, subcategory, status,
      minRating, maxRating, minReviews, maxReviews,
      sortBy, sortOrder
    });
    
    // Get all businesses first - direct query without limit
    let businesses = await db.select().from(apifyBusinesses);
    console.log(`Total businesses before filtering: ${businesses.length}`);
    
    // Filter by search
    if (search) {
      const beforeCount = businesses.length;
      businesses = businesses.filter(b => 
        b.name?.toLowerCase().includes(search.toLowerCase()) ||
        b.address?.toLowerCase().includes(search.toLowerCase()) ||
        b.searchTerms?.toLowerCase().includes(search.toLowerCase())
      );
      console.log(`After search filter: ${beforeCount} -> ${businesses.length}`);
    }
    
    // Filter by category
    if (category) {
      const beforeCount = businesses.length;
      businesses = businesses.filter(b => b.category === category);
      console.log(`After category filter: ${beforeCount} -> ${businesses.length}`);
    }
    
    // Filter by subcategory
    if (subcategory) {
      const beforeCount = businesses.length;
      businesses = businesses.filter(b => b.subcategory === subcategory);
      console.log(`After subcategory filter: ${beforeCount} -> ${businesses.length}`);
    }
    
    // Filter by status
    if (status) {
      const beforeCount = businesses.length;
      businesses = businesses.filter(b => b.verifiedStatus === status);
      console.log(`After status filter: ${beforeCount} -> ${businesses.length}`);
    }
    
    // Filter by rating
    if (!isNaN(minRating)) {
      const beforeCount = businesses.length;
      businesses = businesses.filter(b => {
        const rating = parseFloat(b.rating?.toString() || '0');
        return rating >= minRating;
      });
      console.log(`After minRating filter (>= ${minRating}): ${beforeCount} -> ${businesses.length}`);
    }
    if (!isNaN(maxRating)) {
      const beforeCount = businesses.length;
      businesses = businesses.filter(b => {
        const rating = parseFloat(b.rating?.toString() || '0');
        return rating <= maxRating;
      });
      console.log(`After maxRating filter (<= ${maxRating}): ${beforeCount} -> ${businesses.length}`);
    }
    
    // Filter by review count
    if (!isNaN(minReviews)) {
      const beforeCount = businesses.length;
      businesses = businesses.filter(b => (b.reviewCount ?? 0) >= minReviews);
      console.log(`After minReviews filter (>= ${minReviews}): ${beforeCount} -> ${businesses.length}`);
    }
    if (!isNaN(maxReviews)) {
      const beforeCount = businesses.length;
      businesses = businesses.filter(b => (b.reviewCount ?? 0) <= maxReviews);
      console.log(`After maxReviews filter (<= ${maxReviews}): ${beforeCount} -> ${businesses.length}`);
    }
    
    // Sort businesses
    businesses.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'rating':
          aValue = parseFloat(a.rating?.toString() || '0');
          bValue = parseFloat(b.rating?.toString() || '0');
          break;
        case 'reviewCount':
          aValue = a.reviewCount || 0;
          bValue = b.reviewCount || 0;
          break;
        case 'qualityScore':
          aValue = a.qualityScore || 0;
          bValue = b.qualityScore || 0;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        default:
          aValue = (a as Record<string, any>)[sortBy] ?? '';
          bValue = (b as Record<string, any>)[sortBy] ?? '';
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
    console.error('Admin filter options error:', error);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

// Export businesses (must be before /:id route)
router.get('/businesses/export', async (req, res) => {
  try {
    const format = req.query.format as string || 'csv';
    const businesses = await db.select().from(apifyBusinesses);
    
    if (format === 'csv') {
      // Create CSV header
      const headers = [
        'ID', 'Name', 'Address', 'Category', 'Subcategory', 
        'Phone', 'Website', 'Email', 'Rating', 'Reviews',
        'Quality Score', 'Status', 'District', 'Created At'
      ];
      
      // Create CSV rows
      const rows = businesses.map(b => [
        b.id,
        `"${b.name || ''}"`,
        `"${b.address || ''}"`,
        b.category || '',
        b.subcategory || '',
        b.phone || '',
        b.website || '',
        b.email || '',
        b.rating || '0',
        b.reviewCount || '0',
        b.qualityScore || '0',
        b.verifiedStatus || 'unverified',
        b.district || '',
        b.createdAt || ''
      ]);
      
      // Combine header and rows
      const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="businesses.csv"');
      res.send(csv);
    } else {
      res.status(400).json({ error: 'Unsupported export format' });
    }
  } catch (error: any) {
    console.error('Admin export error:', error);
    res.status(500).json({ error: 'Failed to export businesses' });
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
  } catch (error: any) {
    console.error('Admin search error:', error);
    res.status(500).json({ error: 'Failed to search businesses' });
  }
});

// Bulk delete businesses (must be before /:id route)
router.delete('/businesses/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ids array' });
    }
    
    // Delete multiple businesses
    await db.delete(apifyBusinesses).where(inArray(apifyBusinesses.id, ids));
    
    res.json({ 
      message: `Successfully deleted ${ids.length} businesses`,
      deletedCount: ids.length 
    });
  } catch (error: any) {
    console.error('Admin bulk delete error:', error);
    res.status(500).json({ error: 'Failed to bulk delete businesses' });
  }
});

// Bulk update businesses (must be before /:id route)
router.put('/businesses/bulk-update', async (req, res) => {
  try {
    const { ids, updates } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ids array' });
    }
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid updates object' });
    }
    
    // Update multiple businesses
    await db.update(apifyBusinesses)
      .set({
        ...updates,
        lastUpdated: new Date()
      })
      .where(inArray(apifyBusinesses.id, ids));
    
    res.json({ 
      message: `Successfully updated ${ids.length} businesses`,
      updatedCount: ids.length 
    });
  } catch (error: any) {
    console.error('Admin bulk update error:', error);
    res.status(500).json({ error: 'Failed to bulk update businesses' });
  }
});

// Delete single business
router.delete('/businesses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if business exists
    const businesses = await db.select().from(apifyBusinesses);
    const business = businesses.find(b => b.id === id);
    
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    // Delete the business
    await db.delete(apifyBusinesses).where(eq(apifyBusinesses.id, id));
    
    res.json({ message: 'Business deleted successfully' });
  } catch (error: any) {
    console.error('Admin delete business error:', error);
    res.status(500).json({ error: 'Failed to delete business' });
  }
});

// Bulk delete businesses
router.delete('/businesses/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ids array' });
    }
    
    // Delete multiple businesses
    await db.delete(apifyBusinesses).where(inArray(apifyBusinesses.id, ids));
    
    res.json({ 
      message: `Successfully deleted ${ids.length} businesses`,
      deletedCount: ids.length 
    });
  } catch (error: any) {
    console.error('Admin bulk delete error:', error);
    res.status(500).json({ error: 'Failed to bulk delete businesses' });
  }
});

// Update business
router.put('/businesses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    // Check if business exists
    const businesses = await db.select().from(apifyBusinesses);
    const business = businesses.find(b => b.id === id);
    
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    // Update the business
    const [updatedBusiness] = await db.update(apifyBusinesses)
      .set({
        ...updates,
        lastUpdated: new Date()
      })
      .where(eq(apifyBusinesses.id, id))
      .returning();
    
    res.json(updatedBusiness);
  } catch (error: any) {
    console.error('Admin update business error:', error);
    res.status(500).json({ error: 'Failed to update business' });
  }
});

// Bulk update businesses
router.put('/businesses/bulk-update', async (req, res) => {
  try {
    const { ids, updates } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ids array' });
    }
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid updates object' });
    }
    
    // Update multiple businesses
    await db.update(apifyBusinesses)
      .set({
        ...updates,
        lastUpdated: new Date()
      })
      .where(inArray(apifyBusinesses.id, ids));
    
    res.json({ 
      message: `Successfully updated ${ids.length} businesses`,
      updatedCount: ids.length 
    });
  } catch (error: any) {
    console.error('Admin bulk update error:', error);
    res.status(500).json({ error: 'Failed to bulk update businesses' });
  }
});

export { router as simpleAdminRoutes };
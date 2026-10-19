import { Router } from 'express';
import { db } from './db.js';
import { openstreetBusinesses } from '../shared/schema.js';
import { eq, like, and, or, isNotNull, isNull, desc, asc, sql } from 'drizzle-orm';
import { adminAuth } from './admin-auth.js';

const router = Router();

// Apply admin authentication to all routes
router.use(adminAuth);

// Get filter options for dropdowns
router.get('/openstreet/filter-options', async (req, res) => {
  try {
    // Get unique categories
    const categories = await db
      .selectDistinct({ category: openstreetBusinesses.category })
      .from(openstreetBusinesses)
      .where(isNotNull(openstreetBusinesses.category))
      .orderBy(openstreetBusinesses.category);

    // Get unique amenities
    const amenities = await db
      .selectDistinct({ amenity: openstreetBusinesses.amenity })
      .from(openstreetBusinesses)
      .where(isNotNull(openstreetBusinesses.amenity))
      .orderBy(openstreetBusinesses.amenity);

    // Get unique districts
    const districts = await db
      .selectDistinct({ district: openstreetBusinesses.district })
      .from(openstreetBusinesses)
      .where(isNotNull(openstreetBusinesses.district))
      .orderBy(openstreetBusinesses.district);

    // Get unique OSM types
    const osmTypes = await db
      .selectDistinct({ osmType: openstreetBusinesses.osmType })
      .from(openstreetBusinesses)
      .where(isNotNull(openstreetBusinesses.osmType))
      .orderBy(openstreetBusinesses.osmType);

    res.json({
      categories: categories.map(c => c.category).filter(Boolean),
      amenities: amenities.map(a => a.amenity).filter(Boolean),
      districts: districts.map(d => d.district).filter(Boolean),
      osmTypes: osmTypes.map(t => t.osmType).filter(Boolean)
    });
  } catch (error: any) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

// Get paginated businesses with filters
router.get('/openstreet/businesses', async (req, res) => {
  try {
    const page = String(req.query.page ?? '1');
    const limit = String(req.query.limit ?? '20');
    const search = String(req.query.search ?? '');
    const category = String(req.query.category ?? '');
    const amenity = String(req.query.amenity ?? '');
    const district = String(req.query.district ?? '');
    const hasPhone = String(req.query.hasPhone ?? '');
    const hasWebsite = String(req.query.hasWebsite ?? '');
    const wheelchair = String(req.query.wheelchair ?? '');
    const osmType = String(req.query.osmType ?? '');
    const sortField = String(req.query.sortField ?? 'createdAt');
    const sortDirection = String(req.query.sortDirection ?? 'desc');

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build filters
    const filters = [];

    if (search) {
      filters.push(
        or(
          like(openstreetBusinesses.name, `%${search}%`),
          like(openstreetBusinesses.address, `%${search}%`),
          like(openstreetBusinesses.osmId, `%${search}%`)
        )
      );
    }

    if (category) {
      filters.push(eq(openstreetBusinesses.category, category));
    }

    if (amenity) {
      filters.push(eq(openstreetBusinesses.amenity, amenity));
    }

    if (district) {
      filters.push(eq(openstreetBusinesses.district, district));
    }

    if (hasPhone === 'yes') {
      filters.push(isNotNull(openstreetBusinesses.phone));
    } else if (hasPhone === 'no') {
      filters.push(isNull(openstreetBusinesses.phone));
    }

    if (hasWebsite === 'yes') {
      filters.push(isNotNull(openstreetBusinesses.website));
    } else if (hasWebsite === 'no') {
      filters.push(isNull(openstreetBusinesses.website));
    }

    if (wheelchair) {
      filters.push(eq(openstreetBusinesses.wheelchair, wheelchair));
    }

    if (osmType) {
      filters.push(eq(openstreetBusinesses.osmType, osmType));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(openstreetBusinesses)
      .where(whereClause);

    // Get businesses
    const sortColumn = 
      sortField === 'name' ? openstreetBusinesses.name :
      sortField === 'createdAt' ? openstreetBusinesses.createdAt :
      openstreetBusinesses.createdAt;

    const orderBy = sortDirection === 'asc' ? asc(sortColumn) : desc(sortColumn);

    const businesses = await db
      .select()
      .from(openstreetBusinesses)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limitNum)
      .offset(offset);

    res.json({
      businesses,
      total: Number(count),
      page: pageNum,
      totalPages: Math.ceil(Number(count) / limitNum)
    });
  } catch (error: any) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// Get single business
router.get('/openstreet/businesses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [business] = await db
      .select()
      .from(openstreetBusinesses)
      .where(eq(openstreetBusinesses.id, parseInt(id)))
      .limit(1);

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json(business);
  } catch (error: any) {
    console.error('Error fetching business:', error);
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});

// Update business
router.put('/openstreet/businesses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.osmId;
    delete updates.createdAt;

    const [updated] = await db
      .update(openstreetBusinesses)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(openstreetBusinesses.id, parseInt(id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating business:', error);
    res.status(500).json({ error: 'Failed to update business' });
  }
});

// Delete single business
router.delete('/openstreet/businesses/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [deleted] = await db
      .delete(openstreetBusinesses)
      .where(eq(openstreetBusinesses.id, parseInt(id)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting business:', error);
    res.status(500).json({ error: 'Failed to delete business' });
  }
});

// Bulk delete businesses
router.delete('/openstreet/businesses/bulk', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ids array' });
    }

    await db
      .delete(openstreetBusinesses)
      .where(sql`${openstreetBusinesses.id} IN ${ids}`);

    res.json({ success: true, deleted: ids.length });
  } catch (error: any) {
    console.error('Error bulk deleting businesses:', error);
    res.status(500).json({ error: 'Failed to delete businesses' });
  }
});

// Export businesses to CSV
router.get('/openstreet/businesses/export', async (req, res) => {
  try {
    const search = String(req.query.search ?? '');
    const category = String(req.query.category ?? '');
    const amenity = String(req.query.amenity ?? '');
    const district = String(req.query.district ?? '');
    const ids = String(req.query.ids ?? '');

    // Build filters
    const filters = [];

    if (ids) {
      const idArray = ids.split(',').map((id: string) => parseInt(id));
      filters.push(sql`${openstreetBusinesses.id} IN ${idArray}`);
    } else {
      if (search) {
        filters.push(
          or(
            like(openstreetBusinesses.name, `%${search}%`),
            like(openstreetBusinesses.address, `%${search}%`)
          )
        );
      }

      if (category) {
        filters.push(eq(openstreetBusinesses.category, category));
      }

      if (amenity) {
        filters.push(eq(openstreetBusinesses.amenity, amenity));
      }

      if (district) {
        filters.push(eq(openstreetBusinesses.district, district));
      }
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const businesses = await db
      .select()
      .from(openstreetBusinesses)
      .where(whereClause)
      .orderBy(desc(openstreetBusinesses.createdAt));

    // Convert to CSV
    const headers = [
      'ID',
      'OSM ID',
      'OSM Type',
      'Name',
      'Category',
      'Amenity',
      'Shop',
      'Address',
      'District',
      'City',
      'Phone',
      'Website',
      'Email',
      'Opening Hours',
      'Wheelchair Access',
      'Latitude',
      'Longitude',
      'Operator',
      'Brand',
      'Created At'
    ];

    const rows = businesses.map(b => [
      b.id,
      b.osmId,
      b.osmType || '',
      b.name || '',
      b.category || '',
      b.amenity || '',
      b.shop || '',
      b.address || '',
      b.district || '',
      b.city || '',
      b.phone || '',
      b.website || '',
      b.email || '',
      b.openingHours || '',
      b.wheelchair || '',
      b.latitude || '',
      b.longitude || '',
      b.operator || '',
      b.brand || '',
      b.createdAt?.toISOString() || ''
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => 
          typeof cell === 'string' && cell.includes(',') 
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell
        ).join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="openstreet-businesses-export.csv"`);
    res.send(csvContent);
  } catch (error: any) {
    console.error('Error exporting businesses:', error);
    res.status(500).json({ error: 'Failed to export businesses' });
  }
});

// Get statistics
router.get('/openstreet/statistics', async (req, res) => {
  try {
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as with_phone,
        COUNT(CASE WHEN website IS NOT NULL THEN 1 END) as with_website,
        COUNT(CASE WHEN wheelchair = 'yes' THEN 1 END) as wheelchair_accessible,
        COUNT(DISTINCT category) as categories,
        COUNT(DISTINCT amenity) as amenities,
        COUNT(DISTINCT district) as districts
      FROM openstreet_businesses
    `);

    res.json((stats as any)[0]);
  } catch (error: any) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
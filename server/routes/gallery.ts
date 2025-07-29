import { Router, Request, Response } from 'express';
import { db } from '../db';
import { gallery } from '../../migrations/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Bulk add gallery images
router.post('/:businessId/bulk-add', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { images } = req.body;

    if (!images || !Array.isArray(images)) {
      return res.status(400).json({
        success: false,
        message: 'Images array is required'
      });
    }

    // Insert all images
    const galleryItems = images.map((imageUrl: string, index: number) => ({
      businessId: parseInt(businessId),
      imageUrl,
      caption: `Auto-imported image ${index + 1}`,
      isMain: false
    }));

    const insertedItems = await db.insert(gallery).values(galleryItems).returning();

    res.status(200).json({
      success: true,
      data: insertedItems,
      message: `Successfully added ${insertedItems.length} images to gallery`
    });

  } catch (error) {
    console.error('Error bulk adding gallery images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add gallery images',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get gallery images for business
router.get('/:businessId', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;

    const images = await db
      .select()
      .from(gallery)
      .where(eq(gallery.businessId, parseInt(businessId)))
      .orderBy(gallery.createdAt);

    res.status(200).json({
      success: true,
      data: images
    });

  } catch (error) {
    console.error('Error fetching gallery images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gallery images',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete gallery image
router.delete('/:businessId/images/:imageId', async (req: Request, res: Response) => {
  try {
    const { businessId, imageId } = req.params;

    await db
      .delete(gallery)
      .where(eq(gallery.id, parseInt(imageId)));

    res.status(200).json({
      success: true,
      message: 'Gallery image deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting gallery image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete gallery image',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

import express from 'express';
import { z } from 'zod';
import { db } from './db.js';
import { userPreferences, insertUserPreferencesSchema } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth, type AuthenticatedRequest } from './auth-middleware.js';
import { getAuthenticatedUser } from './auth-helpers.js';

const router = express.Router();

// Get user preferences
router.get('/api/user/preferences', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const dbUser = await getAuthenticatedUser(req, res);
    if (!dbUser) return; // Response already sent
    
    const userId = dbUser.id;

    const preferences = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    if (preferences.length === 0) {
      // Create default preferences if none exist
      const defaultPrefs = await db
        .insert(userPreferences)
        .values({
          userId: userId,
          dashboardTheme: 'clasico',
          primaryColor: '#dc2626',
          isDarkMode: false,
        })
        .returning();

      return res.json(defaultPrefs[0]);
    }

    res.json(preferences[0]);
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update user preferences
router.put('/api/user/preferences', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const dbUser = await getAuthenticatedUser(req, res);
    if (!dbUser) return; // Response already sent
    
    const userId = dbUser.id;

    const updateSchema = z.object({
      dashboardTheme: z.string().optional(),
      primaryColor: z.string().optional(),
      isDarkMode: z.boolean().optional(),
    });

    const validated = updateSchema.parse(req.body);

    // Check if preferences exist
    const existing = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    let result;

    if (existing.length === 0) {
      // Create new preferences
      result = await db
        .insert(userPreferences)
        .values({
          userId: userId,
          ...validated,
        })
        .returning();
    } else {
      // Update existing preferences
      result = await db
        .update(userPreferences)
        .set({
          ...validated,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, userId))
        .returning();
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating user preferences:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;

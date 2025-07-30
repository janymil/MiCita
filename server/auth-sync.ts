import { db } from './db.js';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { stackServerApp } from '../stack/server.js';

export async function syncUserWithDatabase(stackUserId: string) {
  try {
    // Get user from Stack Auth
    const stackUser = await stackServerApp.getUser({ userId: stackUserId });
    
    if (!stackUser) {
      throw new Error('User not found in Stack Auth');
    }

    const email = stackUser.primaryEmail || stackUser.email || '';
    const name = stackUser.displayName || email.split('@')[0];

    // Check if user exists in local database
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length === 0) {
      // Create user in local database
      const newUser = await db.insert(users)
        .values({
          email,
          name,
          password: 'stack-auth', // Placeholder since auth is handled by Stack
          stackAuthId: stackUserId
        })
        .returning();

      return newUser[0];
    } else {
      // Update existing user with Stack Auth ID if not set
      if (!existingUser[0].stackAuthId) {
        await db.update(users)
          .set({ stackAuthId: stackUserId })
          .where(eq(users.id, existingUser[0].id));
      }
      
      return existingUser[0];
    }
  } catch (error) {
    console.error('Error syncing user with database:', error);
    throw error;
  }
}

export async function getUserByStackId(stackUserId: string) {
  try {
    const user = await db.select()
      .from(users)
      .where(eq(users.stackAuthId, stackUserId))
      .limit(1);

    if (user.length === 0) {
      // User not in database yet, sync from Stack Auth
      return await syncUserWithDatabase(stackUserId);
    }

    return user[0];
  } catch (error) {
    console.error('Error getting user by Stack ID:', error);
    throw error;
  }
}

import { eq } from 'drizzle-orm';
import { users } from '../shared/schema.js';
import { stackServerApp } from '../stack/server.js';
import { db } from './db.js';

export async function syncUserWithDatabase(stackUserId: string) {
  try {
    console.log('🔍 Syncing user with Stack ID:', stackUserId);
    
    // First, try to find user by Stack Auth ID in local database
    const existingUserByStackId = await db.select()
      .from(users)
      .where(eq(users.stackAuthId, stackUserId))
      .limit(1);

    if (existingUserByStackId.length > 0) {
      console.log('✅ Found user by Stack ID:', existingUserByStackId[0].email);
      return existingUserByStackId[0];
    }

    // Get user from Stack Auth using listUsers (getUser is buggy)
    const allUsers = await stackServerApp.listUsers();
    const stackUser = allUsers.find(u => u.id === stackUserId);

    if (!stackUser) {
      console.error('❌ User not found in Stack Auth for ID:', stackUserId);
      throw new Error('User not found in Stack Auth');
    }

    const email = stackUser.primaryEmail || stackUser.email || '';
    const name = stackUser.displayName || email.split('@')[0];
    console.log('🔍 Stack user found:', { email, name, stackUserId });

    // Check if user exists in local database by email
    const existingUserByEmail = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUserByEmail.length === 0) {
      console.log('🆕 Creating new user in database');
      // Create user in local database
      const newUser = await db.insert(users)
        .values({
          email,
          name,
          password: 'stack-auth', // Placeholder since auth is handled by Stack
          stackAuthId: stackUserId
        })
        .returning();

      console.log('✅ Created new user:', newUser[0].email);
      return newUser[0];
    } else {
      console.log('🔄 Updating existing user with Stack Auth ID');
      // Update existing user with Stack Auth ID if not set
      if (!existingUserByEmail[0].stackAuthId) {
        await db.update(users)
          .set({ stackAuthId: stackUserId })
          .where(eq(users.id, existingUserByEmail[0].id));
        
        // Return updated user
        const updatedUser = await db.select()
          .from(users)
          .where(eq(users.id, existingUserByEmail[0].id))
          .limit(1);
        
        console.log('✅ Updated user with Stack ID:', updatedUser[0].email);
        return updatedUser[0];
      }

      console.log('✅ Found existing user:', existingUserByEmail[0].email);
      return existingUserByEmail[0];
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

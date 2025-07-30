import dotenv from "dotenv";
dotenv.config();

import { Pool } from "@neondatabase/serverless";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Define public.users table
const users = pgTable("users", {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    name: text("name").notNull(),
    stackAuthId: text("stack_auth_id").unique(),
    createdAt: timestamp("created_at").defaultNow(),
});

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function linkStackAuth() {
    try {
        console.log("🔍 CHECKING NEON_AUTH.USERS_SYNC TABLE");

        // Check what's in users_sync table
        const usersSync = await db.execute(sql`
      SELECT * FROM neon_auth.users_sync 
      WHERE email = 'jan.milata@gmail.com'
    `);

        console.log(`Found ${usersSync.rows.length} records in users_sync:`);
        usersSync.rows.forEach(u => {
            console.log("Stack Auth User:", JSON.stringify(u, null, 2));
        });

        if (usersSync.rows.length > 0) {
            const stackUser = usersSync.rows[0];

            console.log("\n🔗 LINKING STACK AUTH USER TO PUBLIC USER");

            // Update public.users with Stack Auth ID
            const updated = await db.update(users)
                .set({ stackAuthId: stackUser.id })
                .where(eq(users.email, 'jan.milata@gmail.com'))
                .returning();

            if (updated.length > 0) {
                console.log("✅ SUCCESS! Users are now linked:");
                console.log(`   Public User ID: ${updated[0].id}`);
                console.log(`   Stack Auth ID: ${updated[0].stackAuthId}`);
                console.log(`   Email: ${updated[0].email}`);
            }
        } else {
            console.log("❌ No Stack Auth user found. Please log in with Stack Auth first.");
        }

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await pool.end();
    }
}

linkStackAuth();

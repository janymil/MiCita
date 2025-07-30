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

async function linkStackAuthUser() {
    try {
        console.log("🔍 Looking for Stack Auth user in neon_auth schema...");

        // Query the neon_auth schema to find the user
        const stackAuthUsers = await db.execute(sql`
      SELECT id, email, name, created_at 
      FROM neon_auth.users 
      WHERE email = 'jan.milata@gmail.com'
    `);

        console.log(`📊 Found ${stackAuthUsers.length} users in neon_auth schema`);

        if (stackAuthUsers.length > 0) {
            const stackUser = stackAuthUsers[0];
            console.log(`
🔗 Stack Auth User Found:
   ID: ${stackUser.id}
   Email: ${stackUser.email}
   Name: ${stackUser.name}
   Created: ${stackUser.created_at}
      `);

            // Update the public.users table with the Stack Auth ID
            console.log("🔄 Linking Stack Auth user to existing public user...");

            const updatedUser = await db.update(users)
                .set({ stackAuthId: stackUser.id })
                .where(eq(users.email, 'jan.milata@gmail.com'))
                .returning();

            if (updatedUser.length > 0) {
                console.log("✅ Successfully linked users!");
                console.log(`   Public User ID: ${updatedUser[0].id}`);
                console.log(`   Stack Auth ID: ${updatedUser[0].stackAuthId}`);
            } else {
                console.log("❌ No public user found to update");
            }

        } else {
            console.log("❌ No Stack Auth user found with that email");
        }

    } catch (error) {
        console.error("❌ Error:", error);

        // If we can't access neon_auth schema, try to list available schemas
        try {
            console.log("\n🔍 Checking available schemas...");
            const schemas = await db.execute(sql`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name IN ('public', 'neon_auth', 'auth')
      `);
            console.log("Available schemas:", schemas.map(s => s.schema_name));
        } catch (schemaError) {
            console.log("Could not check schemas:", schemaError.message);
        }
    } finally {
        await pool.end();
    }
}

linkStackAuthUser();

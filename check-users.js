import dotenv from "dotenv";
dotenv.config();

import { Pool } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";

// Define schema inline to avoid import issues
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

const users = pgTable("users", {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    name: text("name").notNull(),
    stackAuthId: text("stack_auth_id").unique(),
    createdAt: timestamp("created_at").defaultNow(),
});

const businesses = pgTable("businesses", {
    id: serial("id").primaryKey(),
    userId: serial("user_id"),
    name: text("name").notNull(),
    category: text("category").notNull(),
});

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function checkUsers() {
    try {
        console.log("🔍 Checking users in database...");

        // Get all users with email jan.milata@gmail.com
        const allUsers = await db.select().from(users);
        console.log(`📊 Total users in database: ${allUsers.length}`);

        const janUsers = allUsers.filter(user => user.email === 'jan.milata@gmail.com');
        console.log(`👤 Users with jan.milata@gmail.com: ${janUsers.length}`);

        for (const user of janUsers) {
            console.log(`
📋 User Details:
   ID: ${user.id}
   Email: ${user.email}
   Name: ${user.name}
   Stack Auth ID: ${user.stackAuthId || 'None'}
   Created: ${user.createdAt}
      `);

            // Get businesses for this user
            const userBusinesses = await db.select().from(businesses).where(eq(businesses.userId, user.id));
            console.log(`   Businesses: ${userBusinesses.length}`);
            for (const business of userBusinesses) {
                console.log(`     - ${business.name} (${business.category})`);
            }
        }

        // Show all users for debugging
        console.log('\n📝 All users in database:');
        for (const user of allUsers) {
            console.log(`   ${user.id}: ${user.email} (Stack ID: ${user.stackAuthId || 'None'})`);
        }

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await pool.end();
    }
}

checkUsers();

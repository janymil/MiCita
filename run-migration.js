import dotenv from "dotenv";
dotenv.config();

import { Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function runMigration() {
    try {
        console.log("🔄 Running Stack Auth migration...");

        // Add stack_auth_id column
        await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS stack_auth_id TEXT UNIQUE;
    `);

        // Create index
        await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_users_stack_auth_id ON users(stack_auth_id);
    `);

        console.log("✅ Migration completed successfully!");

    } catch (error) {
        console.error("❌ Migration error:", error);
    } finally {
        await pool.end();
    }
}

runMigration();

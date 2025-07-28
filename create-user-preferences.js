import dotenv from "dotenv";
dotenv.config();

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const sql = postgres(connectionString);
const db = drizzle(sql);

const createUserPreferencesTable = async () => {
  try {
    console.log("Creating user_preferences table...");
    
    // Create the table
    await sql`
      CREATE TABLE IF NOT EXISTS "user_preferences" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "dashboard_theme" text DEFAULT 'clasico',
        "primary_color" text DEFAULT '#dc2626',
        "is_dark_mode" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `;
    
    // Add foreign key constraint
    await sql`
      DO $$ BEGIN
       ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" 
       FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
    `;
    
    // Create unique index
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "user_preferences_user_id_unique" 
      ON "user_preferences" ("user_id");
    `;
    
    console.log("✅ user_preferences table created successfully!");
    console.log("✅ All existing business data preserved!");
    
  } catch (error) {
    console.error("❌ Error creating user_preferences table:", error);
  } finally {
    await sql.end();
  }
};

createUserPreferencesTable();

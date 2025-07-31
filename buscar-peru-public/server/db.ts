import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString, { max: 1 });

export const db = drizzle(sql, { schema });

// Test connection on startup
sql`SELECT 1`
  .then(() => console.log("✅ Database connected successfully"))
  .catch((err) => console.error("❌ Database connection failed:", err));
import dotenv from "dotenv";
dotenv.config();

import { Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function analyzeDatabase() {
    try {
        console.log("🔍 COMPLETE DATABASE ANALYSIS");
        console.log("=".repeat(50));

        // 1. Check available schemas
        console.log("\n📁 SCHEMAS:");
        const schemasResult = await db.execute(sql`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `);

        console.log("Debug - schemasResult type:", typeof schemasResult);
        console.log("Debug - schemasResult length:", schemasResult?.length);
        console.log("Debug - schemasResult:", schemasResult);

        if (Array.isArray(schemasResult)) {
            for (const schema of schemasResult) {
                console.log(`   - ${schema.schema_name}`);
            }
        } else {
            console.log("   Schema result is not an array");
        }

        // 2. Tables in public schema
        console.log("\n📋 PUBLIC SCHEMA TABLES:");
        const publicTables = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

        for (const table of publicTables) {
            console.log(`   - ${table.table_name}`);
        }

        // 3. Check neon_auth schema
        console.log("\n🔐 NEON_AUTH SCHEMA:");
        try {
            const authTables = await db.execute(sql`
        SELECT table_name
        FROM information_schema.tables 
        WHERE table_schema = 'neon_auth'
        ORDER BY table_name
      `);

            console.log("   Tables:");
            for (const table of authTables) {
                console.log(`     - ${table.table_name}`);
            }
        } catch (error) {
            console.log(`   ❌ Cannot access: ${error.message}`);
        }

        // 4. Current users in public.users
        console.log("\n👥 PUBLIC.USERS:");
        const publicUsers = await db.execute(sql`
      SELECT id, email, name, stack_auth_id, created_at 
      FROM users
      ORDER BY id
    `);

        for (const user of publicUsers) {
            console.log(`   - ID:${user.id} | ${user.email} | Stack ID: ${user.stack_auth_id || 'NULL'}`);
        }

        // 5. Businesses linked to users
        console.log("\n🏢 BUSINESSES:");
        const businesses = await db.execute(sql`
      SELECT b.id, b.name, b.user_id, b.category, u.email as owner_email
      FROM businesses b 
      JOIN users u ON b.user_id = u.id
      ORDER BY b.id
    `);

        for (const business of businesses) {
            console.log(`   - ${business.name} (${business.category}) | Owner: ${business.owner_email}`);
        }

        // 6. Try to check neon_auth users
        console.log("\n🔐 NEON_AUTH.USERS:");
        try {
            const authUsers = await db.execute(sql`
        SELECT id, email, name, created_at 
        FROM neon_auth.users
        ORDER BY created_at DESC
      `);

            for (const user of authUsers) {
                console.log(`   - ID: ${user.id}`);
                console.log(`     Email: ${user.email}`);
                console.log(`     Name: ${user.name}`);
                console.log(`     Created: ${user.created_at}`);
                console.log("");
            }
        } catch (error) {
            console.log(`   ❌ Cannot access: ${error.message}`);
        }

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await pool.end();
    }
}

analyzeDatabase();

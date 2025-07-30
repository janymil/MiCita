import dotenv from "dotenv";
dotenv.config();

import { Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function analyzeComplete() {
    try {
        console.log("🔍 COMPLETE DATABASE ANALYSIS");
        console.log("=".repeat(50));

        // 1. Check schemas
        const schemas = await db.execute(sql`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `);

        console.log("\n📁 AVAILABLE SCHEMAS:");
        schemas.rows.forEach(s => console.log(`   - ${s.schema_name}`));

        // 2. Public schema tables
        const publicTables = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

        console.log("\n📋 PUBLIC SCHEMA TABLES:");
        publicTables.rows.forEach(t => console.log(`   - ${t.table_name}`));

        // 3. Check neon_auth schema tables
        console.log("\n🔐 NEON_AUTH SCHEMA TABLES:");
        try {
            const authTables = await db.execute(sql`
        SELECT table_name
        FROM information_schema.tables 
        WHERE table_schema = 'neon_auth'
        ORDER BY table_name
      `);
            authTables.rows.forEach(t => console.log(`   - ${t.table_name}`));
        } catch (error) {
            console.log(`   ❌ Cannot access neon_auth: ${error.message}`);
        }

        // 4. Analyze public.users structure
        console.log("\n👤 PUBLIC.USERS TABLE STRUCTURE:");
        const userColumns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `);
        userColumns.rows.forEach(c => console.log(`   - ${c.column_name}: ${c.data_type} ${c.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`));

        // 5. Current users in public schema
        console.log("\n👥 PUBLIC.USERS DATA:");
        const publicUsers = await db.execute(sql`
      SELECT id, email, name, stack_auth_id, created_at 
      FROM users
    `);
        publicUsers.rows.forEach(u => console.log(`   - ID:${u.id} | ${u.email} | Stack ID: ${u.stack_auth_id || 'NULL'}`));

        // 6. Current businesses
        console.log("\n🏢 BUSINESSES DATA:");
        const businesses = await db.execute(sql`
      SELECT b.id, b.name, b.user_id, b.category, u.email as owner_email
      FROM businesses b 
      JOIN users u ON b.user_id = u.id
    `);
        businesses.rows.forEach(b => console.log(`   - ${b.name} | Category: ${b.category} | Owner: ${b.owner_email} (User ID: ${b.user_id})`));

        // 7. Try to check neon_auth users
        console.log("\n🔐 NEON_AUTH.USERS DATA:");
        try {
            const authUsers = await db.execute(sql`
        SELECT id, email, name, created_at 
        FROM neon_auth.users
        WHERE email = 'jan.milata@gmail.com'
      `);
            if (authUsers.rows.length > 0) {
                authUsers.rows.forEach(u => console.log(`   - Stack ID: ${u.id} | ${u.email} | Name: ${u.name}`));
            } else {
                console.log("   - No users found with jan.milata@gmail.com");
            }
        } catch (error) {
            console.log(`   ❌ Cannot query neon_auth.users: ${error.message}`);
        }

        console.log("\n" + "=".repeat(50));
        console.log("📊 SUMMARY:");
        console.log(`   - Public users: ${publicUsers.rows.length}`);
        console.log(`   - Businesses: ${businesses.rows.length}`);
        console.log(`   - User with Stack ID: ${publicUsers.rows.filter(u => u.stack_auth_id).length}`);

    } catch (error) {
        console.error("❌ Analysis Error:", error);
    } finally {
        await pool.end();
    }
}

analyzeComplete();

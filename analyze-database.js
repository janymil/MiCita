import dotenv from "dotenv";
dotenv.config();

import { Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function analyzeDatabase() {
  try {
    console.log("🔍 ANALYZING COMPLETE DATABASE STRUCTURE");
    console.log("=".repeat(60));

    // 1. Check all schemas
    console.log("\n📁 AVAILABLE SCHEMAS:");
    const schemas = await db.execute(sql`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `);
    schemas.rows?.forEach(s => console.log(`   - ${s.schema_name}`)) ||
      schemas.forEach?.(s => console.log(`   - ${s.schema_name}`)) ||
      console.log("Schemas result:", schemas);

    // 2. Check tables in public schema
    console.log("\n📋 PUBLIC SCHEMA TABLES:");
    const publicTables = await db.execute(sql`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    publicTables.rows?.forEach(t => console.log(`   - ${t.table_name} (${t.table_type})`)) ||
      publicTables.forEach?.(t => console.log(`   - ${t.table_name} (${t.table_type})`)) ||
      console.log("Public tables result:", publicTables);
      WHERE table_schema = 'public'
      ORDER BY table_name
      `);
        publicTables.forEach(t => console.log(`   - ${ t.table_name } (${ t.table_type })`));

        // 3. Check neon_auth schema tables (if accessible)
        console.log("\n🔐 NEON_AUTH SCHEMA TABLES:");
        try {
            const authTables = await db.execute(sql`
        SELECT table_name, table_type
        FROM information_schema.tables 
        WHERE table_schema = 'neon_auth'
        ORDER BY table_name
      `);
            authTables.forEach(t => console.log(`   - ${ t.table_name } (${ t.table_type })`));
        } catch (error) {
            console.log(`   ❌ Cannot access neon_auth schema: ${ error.message } `);
        }

        // 4. Analyze public.users table structure
        console.log("\n👤 PUBLIC.USERS TABLE STRUCTURE:");
        const userColumns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
      `);
        userColumns.forEach(c => console.log(`   - ${ c.column_name }: ${ c.data_type } ${ c.is_nullable === 'NO' ? 'NOT NULL' : 'NULL' } ${ c.column_default ? `DEFAULT ${c.column_default}` : '' } `));

        // 5. Analyze businesses table structure
        console.log("\n🏢 PUBLIC.BUSINESSES TABLE STRUCTURE:");
        const businessColumns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'businesses'
      ORDER BY ordinal_position
      `);
        businessColumns.forEach(c => console.log(`   - ${ c.column_name }: ${ c.data_type } ${ c.is_nullable === c.is_nullable === 'NO' ? 'NOT NULL' : 'NULL' } ${ c.column_default ? `DEFAULT ${c.column_default}` : '' } `));

        // 6. Check current data
        console.log("\n📊 CURRENT DATA ANALYSIS:");

        // Users in public schema
        const publicUsers = await db.execute(sql`SELECT id, email, name, stack_auth_id, created_at FROM users`);
        console.log(`\n👥 PUBLIC.USERS(${ publicUsers.length } users): `);
        publicUsers.forEach(u => console.log(`   - ID:${ u.id } | ${ u.email } | Stack ID: ${ u.stack_auth_id || 'NULL' } | Created: ${ u.created_at } `));

        // Businesses
        const businesses = await db.execute(sql`
      SELECT b.id, b.name, b.user_id, b.category, u.email as owner_email
      FROM businesses b 
      JOIN users u ON b.user_id = u.id
      `);
        console.log(`\n🏢 BUSINESSES(${ businesses.length } businesses): `);
        businesses.forEach(b => console.log(`   - ID:${ b.id } | ${ b.name } | Category: ${ b.category } | Owner: ${ b.owner_email } (ID: ${ b.user_id })`));

        // 7. Try to check neon_auth users (if possible)
        console.log("\n🔐 NEON_AUTH USERS:");
        try {
            const authUsers = await db.execute(sql`
        SELECT id, email, name, created_at 
        FROM neon_auth.users
        WHERE email = 'jan.milata@gmail.com'
      `);
            console.log(`   Found ${ authUsers.length } users in neon_auth: `);
            authUsers.forEach(u => console.log(`   - ID: ${ u.id } | ${ u.email } | Name: ${ u.name } | Created: ${ u.created_at } `));
        } catch (error) {
            console.log(`   ❌ Cannot query neon_auth.users: ${ error.message } `);
        }

        // 8. Check foreign key relationships
        console.log("\n🔗 FOREIGN KEY RELATIONSHIPS:");
        const fks = await db.execute(sql`
    SELECT
    tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      `);
        fks.forEach(fk => console.log(`   - ${ fk.table_name }.${ fk.column_name } -> ${ fk.foreign_table_name }.${ fk.foreign_column_name } `));

    } catch (error) {
        console.error("❌ Analysis Error:", error);
    } finally {
        await pool.end();
    }
}

analyzeDatabase();

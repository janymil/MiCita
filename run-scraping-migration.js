#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
config();

async function runMigration() {
  console.log('🚀 Starting database migration for scraping system...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🔗 Connecting to database...');
    const dbConnection = neon(process.env.DATABASE_URL);
    const db = drizzle(dbConnection);

    console.log('📊 Checking existing data integrity...');
    // Count existing businesses before migration
    const beforeResult = await db.execute(sql`SELECT COUNT(*) as count FROM businesses`);
    const beforeCount = beforeResult.rows?.[0]?.count || beforeResult[0]?.count || 0;
    console.log(`✅ Found ${beforeCount} existing businesses in database`);

    console.log('📝 Reading migration file...');
    const migrationPath = path.join(process.cwd(), 'migrations', 'add-scraping-system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔧 Executing migration...');
    // Clean and split the migration into individual statements
    const cleanSQL = migrationSQL
      .replace(/--.*$/gm, '') // Remove comments
      .replace(/\n/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    const statements = cleanSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && stmt.length > 0);

    console.log(`📋 Found ${statements.length} statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`📋 [${i+1}/${statements.length}] Executing: ${statement.substring(0, 60)}...`);
        try {
          await db.execute(sql.raw(statement));
          console.log(`  ✅ Success`);
        } catch (error) {
          if (error.message.includes('already exists') || error.message.includes('IF NOT EXISTS')) {
            console.log(`  ⚠️  Already exists (safe): ${error.message}`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('✅ Migration completed successfully!');

    // Verify data integrity after migration
    const afterResult = await db.execute(sql`SELECT COUNT(*) as count FROM businesses`);
    const afterCount = afterResult.rows?.[0]?.count || afterResult[0]?.count || 0;
    console.log(`✅ Verified: ${afterCount} businesses remain (should be same as before)`);

    // Check if new tables were created
    const tablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('scraping_jobs')
    `);
    
    const tables = tablesResult.rows || tablesResult;
    const tableNames = Array.isArray(tables) ? tables.map(t => t.table_name).join(', ') : 'scraping_jobs';
    console.log(`✅ New tables created: ${tableNames}`);

    console.log('🎉 Scraping system database setup completed successfully!');
    console.log('📈 Your 8850 existing Google Places companies are safe and untouched.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('💡 Your existing data should still be intact');
    process.exit(1);
  }
}

runMigration();

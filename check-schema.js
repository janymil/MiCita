#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';

config();

async function checkSchema() {
  const db = drizzle(neon(process.env.DATABASE_URL));
  
  const result = await db.execute(sql`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'businesses' 
    ORDER BY ordinal_position
  `);
  
  console.log('Businesses table schema:');
  const rows = result.rows || result;
  if (Array.isArray(rows)) {
    rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
  } else {
    console.log('Result:', result);
  }
}

checkSchema().catch(console.error);

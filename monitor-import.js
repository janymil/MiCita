#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';

const db = drizzle(neon(process.env.DATABASE_URL));

async function getCurrentCount() {
  try {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM apify_businesses`);
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Error getting count:', error.message);
    return 0;
  }
}

async function getLatestBusinesses() {
  try {
    const result = await db.execute(sql`
      SELECT name, address, category, rating, phone, website 
      FROM apify_businesses 
      ORDER BY "lastUpdated" DESC 
      LIMIT 5
    `);
    return result.rows;
  } catch (error) {
    console.error('Error getting latest businesses:', error.message);
    return [];
  }
}

function readLogTail() {
  try {
    const log = readFileSync('import_progress.log', 'utf8');
    const lines = log.split('\n');
    return lines.slice(-10).filter(line => line.trim()).join('\n');
  } catch (error) {
    return 'Log file not found or empty';
  }
}

async function monitorProgress() {
  console.log('📊 Import Progress Monitor');
  console.log('==========================');
  
  const startTime = Date.now();
  let previousCount = await getCurrentCount();
  console.log(`Starting count: ${previousCount} businesses`);
  console.log('Target: 2217 businesses from Apify run');
  console.log('');
  
  const interval = setInterval(async () => {
    const currentCount = await getCurrentCount();
    const change = currentCount - previousCount;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`[${new Date().toLocaleTimeString()}] Count: ${currentCount} (+${change}) | Elapsed: ${elapsed}s`);
    
    if (change > 0) {
      console.log('Recent additions:');
      const latest = await getLatestBusinesses();
      latest.slice(0, 3).forEach((business, i) => {
        console.log(`  ${i+1}. ${business.name} - ${business.category} (${business.rating}⭐)`);
      });
    }
    
    // Show log tail
    const logTail = readLogTail();
    if (logTail && logTail.includes('Error') || logTail.includes('completed')) {
      console.log('\nRecent log:');
      console.log(logTail);
    }
    
    console.log('─'.repeat(60));
    
    previousCount = currentCount;
    
    // Stop monitoring after reaching target or 30 minutes
    if (currentCount >= 2217 || elapsed > 1800) {
      clearInterval(interval);
      console.log('🎉 Import monitoring complete!');
      
      if (currentCount >= 2217) {
        console.log('✅ Target reached! All businesses imported successfully.');
      } else {
        console.log(`⏱️ Monitoring stopped after 30 minutes. Current: ${currentCount}/2217`);
      }
      
      process.exit(0);
    }
  }, 30000); // Check every 30 seconds
}

monitorProgress().catch(console.error);
#!/usr/bin/env node

import { db } from './server/db.ts';
import { openstreetBusinesses } from './shared/schema.ts';
import { sql } from 'drizzle-orm';

async function quickCheck() {
  console.log('🔍 Quick OpenStreet Data Check...\n');
  
  try {
    // Total count
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(openstreetBusinesses);
    
    console.log(`📊 Total: ${count}`);
    
    // Sample record
    const [sample] = await db
      .select()
      .from(openstreetBusinesses)
      .limit(1);
    
    console.log('\n📋 Sample record:');
    console.log(`Name: ${sample?.name || 'N/A'}`);
    console.log(`OSM ID: ${sample?.osmId || 'N/A'}`);
    console.log(`Category: ${sample?.category || 'N/A'}`);
    console.log(`District: ${sample?.district || 'N/A'}`);
    
    // Test API endpoint
    console.log('\n🌐 Testing API...');
    
    const testPort = process.env.PORT || 5000;
    const adminToken = process.env.ADMIN_PASSWORD || 'admin123';
    
    const response = await fetch(`http://localhost:${testPort}/api/admin/openstreet/businesses?limit=1`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ API OK: ${data.total || 0} total, returned ${data.businesses?.length || 0}`);
    } else {
      console.log(`❌ API Error: ${response.status} ${response.statusText}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

quickCheck().catch(console.error);
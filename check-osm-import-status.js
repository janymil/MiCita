/**
 * 📊 CHECK OPENSTREETMAP IMPORT STATUS
 * 
 * Monitor the progress of OpenStreetMap business import
 * Shows data quality metrics and import statistics
 */

import { db } from './server/db.js';
import { openstreetBusinesses } from './shared/schema.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';

async function checkImportStatus() {
  try {
    console.log('📊 OPENSTREETMAP IMPORT STATUS CHECK\n');

    // Get current import count
    const [currentCount] = await db.select({ 
      count: sql`count(*)` 
    }).from(openstreetBusinesses);

    console.log(`📈 IMPORT PROGRESS:`);
    console.log(`  Current imported: ${currentCount.count.toLocaleString()}`);
    console.log(`  Target total: 53,806`);
    console.log(`  Progress: ${((currentCount.count / 53806) * 100).toFixed(1)}%`);
    console.log(`  Remaining: ${(53806 - currentCount.count).toLocaleString()}\n`);

    // Data quality analysis
    const [qualityStats] = await db.select({
      total: sql`count(*)`,
      withPhone: sql`count(case when phone is not null and phone != '' then 1 end)`,
      withWebsite: sql`count(case when website is not null and website != '' then 1 end)`,
      withEmail: sql`count(case when email is not null and email != '' then 1 end)`,
      withHours: sql`count(case when opening_hours is not null and opening_hours != '' then 1 end)`,
      withCoordinates: sql`count(case when latitude is not null and longitude is not null then 1 end)`,
      withAddress: sql`count(case when address is not null and address != '' then 1 end)`
    }).from(openstreetBusinesses);

    console.log(`📋 DATA QUALITY METRICS:`);
    console.log(`  📞 Phone numbers: ${qualityStats.withPhone} (${((qualityStats.withPhone / qualityStats.total) * 100).toFixed(1)}%)`);
    console.log(`  🌐 Websites: ${qualityStats.withWebsite} (${((qualityStats.withWebsite / qualityStats.total) * 100).toFixed(1)}%)`);
    console.log(`  📧 Email addresses: ${qualityStats.withEmail} (${((qualityStats.withEmail / qualityStats.total) * 100).toFixed(1)}%)`);
    console.log(`  🕒 Opening hours: ${qualityStats.withHours} (${((qualityStats.withHours / qualityStats.total) * 100).toFixed(1)}%)`);
    console.log(`  📍 Coordinates: ${qualityStats.withCoordinates} (${((qualityStats.withCoordinates / qualityStats.total) * 100).toFixed(1)}%)`);
    console.log(`  🏠 Addresses: ${qualityStats.withAddress} (${((qualityStats.withAddress / qualityStats.total) * 100).toFixed(1)}%)\n`);

    // Category distribution
    const categoryStats = await db.select({
      category: openstreetBusinesses.category,
      count: sql`count(*)`
    })
    .from(openstreetBusinesses)
    .groupBy(openstreetBusinesses.category)
    .orderBy(sql`count(*) desc`)
    .limit(10);

    console.log(`📊 TOP CATEGORIES:`);
    categoryStats.forEach(stat => {
      console.log(`  ${stat.category}: ${stat.count} businesses`);
    });
    console.log('');

    // District distribution
    const districtStats = await db.select({
      district: openstreetBusinesses.district,
      count: sql`count(*)`
    })
    .from(openstreetBusinesses)
    .where(sql`district is not null`)
    .groupBy(openstreetBusinesses.district)
    .orderBy(sql`count(*) desc`)
    .limit(10);

    console.log(`🏘️ TOP DISTRICTS:`);
    districtStats.forEach(stat => {
      console.log(`  ${stat.district}: ${stat.count} businesses`);
    });
    console.log('');

    // Sample high-quality businesses
    const sampleBusinesses = await db.select({
      name: openstreetBusinesses.name,
      phone: openstreetBusinesses.phone,
      website: openstreetBusinesses.website,
      address: openstreetBusinesses.address,
      district: openstreetBusinesses.district,
      openingHours: openstreetBusinesses.openingHours
    })
    .from(openstreetBusinesses)
    .where(sql`phone is not null and website is not null`)
    .limit(5);

    console.log(`✨ SAMPLE HIGH-QUALITY BUSINESSES:`);
    sampleBusinesses.forEach((business, index) => {
      console.log(`${index + 1}. ${business.name}`);
      console.log(`   📍 ${business.address}`);
      console.log(`   📞 ${business.phone}`);
      console.log(`   🌐 ${business.website}`);
      if (business.openingHours) {
        console.log(`   🕒 ${business.openingHours}`);
      }
      console.log('');
    });

    // Check GeoJSON file size to estimate remaining data
    try {
      const geojsonStats = fs.statSync('./attached_assets/export.geojson');
      const fileSizeMB = (geojsonStats.size / 1024 / 1024).toFixed(1);
      console.log(`📄 SOURCE FILE INFO:`);
      console.log(`  GeoJSON size: ${fileSizeMB} MB`);
      console.log(`  File contains: 53,806 total businesses`);
      console.log(`  Average size per business: ${(geojsonStats.size / 53806).toFixed(0)} bytes\n`);
    } catch (error) {
      console.log(`⚠️  Could not read GeoJSON file stats\n`);
    }

    // Comparison with Apify data
    try {
      const { apifyBusinesses } = await import('./shared/schema.js');
      const [apifyCount] = await db.select({ 
        count: sql`count(*)` 
      }).from(apifyBusinesses);

      console.log(`🔗 COMPARISON WITH EXISTING DATA:`);
      console.log(`  Apify businesses: ${apifyCount.count.toLocaleString()}`);
      console.log(`  OpenStreetMap businesses: ${qualityStats.total.toLocaleString()}`);
      console.log(`  Combined total: ${(parseInt(apifyCount.count) + parseInt(qualityStats.total)).toLocaleString()}`);
      console.log(`  Data overlap potential: Minimal (different sources)\n`);
    } catch (error) {
      console.log(`⚠️  Could not compare with Apify data\n`);
    }

    console.log(`🎯 NEXT STEPS:`);
    if (currentCount.count < 53806) {
      console.log(`  ⏳ Continue import to reach 53,806 total businesses`);
      console.log(`  📈 Current rate: ~1,000 businesses per import session`);
      console.log(`  🕒 Estimated completion: ${Math.ceil((53806 - currentCount.count) / 1000)} more sessions`);
    } else {
      console.log(`  ✅ Import complete! All 53,806 businesses imported`);
      console.log(`  🔗 Ready to integrate with unified search system`);
      console.log(`  🚀 Deploy comprehensive business directory`);
    }

  } catch (error) {
    console.error('❌ Error checking import status:', error);
  }
}

// Execute status check
checkImportStatus().then(() => {
  console.log('\n📊 Status check completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Status check failed:', error);
  process.exit(1);
});
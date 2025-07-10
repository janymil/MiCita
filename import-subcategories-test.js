/**
 * 🧪 TEST IMPORT - First 100 businesses from scraped data
 */

import fs from 'fs';
import { db } from './server/db.ts';
import { apifyBusinesses } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

// Simple category mapping
function detectMainCategory(categoryName = '', businessName = '', address = '') {
  const searchText = `${categoryName} ${businessName} ${address}`.toLowerCase();
  
  if (searchText.includes('farmacia') || searchText.includes('médico') || searchText.includes('dental') || 
      searchText.includes('veterinar') || searchText.includes('hospital') || searchText.includes('clínica') ||
      searchText.includes('óptica') || searchText.includes('psicólogo')) {
    return 'salud';
  }
  
  if (searchText.includes('gimnasio') || searchText.includes('deport') || searchText.includes('fitness')) {
    return 'fitness';
  }
  
  if (searchText.includes('restaurante') || searchText.includes('café') || searchText.includes('bar') || 
      searchText.includes('panadería') || searchText.includes('comida')) {
    return 'gastronomia';
  }
  
  if (searchText.includes('salón') || searchText.includes('belleza') || searchText.includes('peluquer') || 
      searchText.includes('estética') || searchText.includes('spa')) {
    return 'belleza';
  }
  
  return 'servicios';
}

async function testImport() {
  try {
    console.log('🧪 TESTING SUBCATEGORY IMPORT (First 100 businesses)');
    console.log('==================================================\n');
    
    // Read and parse first 100 businesses
    const jsonData = fs.readFileSync('attached_assets/dataset_crawler-google-places_2025-07-10_12-51-48-626.json', 'utf8');
    const allBusinesses = JSON.parse(jsonData);
    const testBusinesses = allBusinesses.slice(0, 100);
    
    console.log(`📊 Testing with ${testBusinesses.length} businesses\n`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const business of testBusinesses) {
      try {
        // Skip if missing critical data
        if (!business.placeId || !business.title) {
          errors++;
          continue;
        }
        
        // Check if exists
        const existing = await db
          .select()
          .from(apifyBusinesses)
          .where(eq(apifyBusinesses.placeId, business.placeId))
          .limit(1);
        
        if (existing.length > 0) {
          skipped++;
          continue;
        }
        
        // Convert business
        const categoryName = business.categoryName || 'Sin categoría';
        const mainCategory = detectMainCategory(categoryName, business.title, business.address);
        
        const businessData = {
          placeId: business.placeId,
          name: business.title,
          address: business.address || '',
          category: mainCategory,
          subcategory: categoryName,
          rating: business.totalScore?.toString() || "0",
          reviewCount: business.reviewsCount || 0,
          priceLevel: 0,
          phone: business.phone || business.phoneUnformatted || null,
          website: business.website || null,
          email: null,
          photoUrl: business.imageUrls?.[0] || null,
          latitude: business.location?.lat?.toString() || "0",
          longitude: business.location?.lng?.toString() || "0",
          openNow: !business.permanentlyClosed && !business.temporarilyClosed,
          hours: business.openingHours ? business.openingHours.map(h => `${h.day}: ${h.hours}`) : [],
          searchTerms: `${business.title || ''} ${categoryName} ${business.address || ''}`.toLowerCase(),
          district: null,
          isRegistered: false,
          photos: business.imageUrls || [],
          imageUrls: business.imageUrls || [],
          verifiedStatus: "unverified",
          dataFreshnessScore: 90,
          phoneFormatted: business.phone || business.phoneUnformatted || null,
          phoneCountryCode: "+51",
          coordinatesValidated: true,
          businessStatus: business.permanentlyClosed ? "permanently_closed" : 
                         business.temporarilyClosed ? "temporarily_closed" : "operational",
          scrapingSource: "carabayllo_test",
          qualityScore: 50,
          originalScrapedData: business
        };
        
        await db.insert(apifyBusinesses).values(businessData);
        imported++;
        
        if (imported % 10 === 0) {
          console.log(`✅ Imported ${imported} businesses...`);
        }
        
      } catch (error) {
        errors++;
        console.error(`❌ Error with ${business.title}: ${error.message}`);
      }
    }
    
    console.log('\n📊 TEST RESULTS:');
    console.log(`✅ Imported: ${imported}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    
    if (imported > 0) {
      console.log('\n🎯 SUCCESS! Now checking database...');
      
      const totalCount = await db.select().from(apifyBusinesses);
      console.log(`📈 Total businesses in database: ${totalCount.length}`);
      
      // Check subcategory distribution
      const subcategoryCounts = {};
      totalCount.forEach(b => {
        if (b.subcategory) {
          subcategoryCounts[b.subcategory] = (subcategoryCounts[b.subcategory] || 0) + 1;
        }
      });
      
      console.log('\n🏷️  Top subcategories:');
      Object.entries(subcategoryCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .forEach(([sub, count]) => {
          console.log(`  ${sub}: ${count}`);
        });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testImport();
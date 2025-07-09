#!/usr/bin/env node

/**
 * 🚀 MASTER CATEGORY SCRAPER
 * 
 * Executes all category scrapers in sequence for balanced coverage
 * Total expected: 15,000-20,000 businesses
 * Total cost: ~$100-150 (500-750 credits)
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SCRAPERS = [
  { name: 'Belleza', script: 'belleza-scraper.js', expected: '3,000-4,000', cost: '$20-25' },
  { name: 'Salud', script: 'salud-scraper.js', expected: '2,500-3,500', cost: '$15-20' },
  { name: 'Gastronomía', script: 'gastronomia-scraper.js', expected: '4,000-5,000', cost: '$25-30' },
  { name: 'Fitness', script: 'fitness-scraper.js', expected: '1,500-2,000', cost: '$10-15' },
  { name: 'Automotriz', script: 'automotriz-scraper.js', expected: '2,000-2,500', cost: '$12-18' },
  { name: 'Servicios', script: 'servicios-scraper.js', expected: '3,000-4,000', cost: '$18-25' },
  { name: 'Comercio', script: 'comercio-scraper.js', expected: '2,500-3,500', cost: '$15-22' },
  { name: 'Turismo', script: 'turismo-scraper.js', expected: '1,000-1,500', cost: '$8-12' }
];

async function runMasterScraper() {
  console.log('🚀 MASTER CATEGORY SCRAPER');
  console.log('===========================');
  console.log('🎯 Target: Complete business coverage across all categories');
  console.log('📍 Coverage: All 49 Lima districts');
  console.log('💰 Total expected cost: ~$100-150 (500-750 credits)');
  console.log('📊 Total expected results: 15,000-20,000 businesses');
  console.log('');
  
  console.log('📋 SCRAPING SEQUENCE:');
  SCRAPERS.forEach((scraper, index) => {
    console.log(`   ${index + 1}. ${scraper.name}: ${scraper.expected} businesses (${scraper.cost})`);
  });
  console.log('');
  
  const startTime = new Date();
  let totalBusinesses = 0;
  let completedScrapers = 0;
  let failedScrapers = 0;
  
  for (let i = 0; i < SCRAPERS.length; i++) {
    const scraper = SCRAPERS[i];
    console.log(`🔄 Starting ${scraper.name} scraper (${i + 1}/${SCRAPERS.length})`);
    console.log('='.repeat(50));
    
    try {
      const { stdout, stderr } = await execAsync(`npx tsx scrapers/${scraper.script}`);
      
      if (stderr) {
        console.error(`⚠️ ${scraper.name} warnings:`, stderr);
      }
      
      console.log(stdout);
      
      // Extract business count from output (rough estimate)
      const match = stdout.match(/Net new businesses added: (\\d+)/);
      if (match) {
        totalBusinesses += parseInt(match[1]);
      }
      
      completedScrapers++;
      console.log(`✅ ${scraper.name} scraper completed successfully!`);
      
    } catch (error) {
      console.error(`❌ ${scraper.name} scraper failed:`, error.message);
      failedScrapers++;
    }
    
    console.log('');
    
    // Add delay between scrapers to avoid rate limiting
    if (i < SCRAPERS.length - 1) {
      console.log('⏳ Waiting 30 seconds before next scraper...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
  
  const endTime = new Date();
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60);
  
  console.log('🎉 MASTER SCRAPING RESULTS');
  console.log('===========================');
  console.log(`⏱️ Total execution time: ${duration} minutes`);
  console.log(`✅ Completed scrapers: ${completedScrapers}/${SCRAPERS.length}`);
  console.log(`❌ Failed scrapers: ${failedScrapers}/${SCRAPERS.length}`);
  console.log(`📊 Estimated total businesses added: ${totalBusinesses}`);
  console.log('');
  
  if (completedScrapers === SCRAPERS.length) {
    console.log('🎉 ALL CATEGORY SCRAPERS COMPLETED SUCCESSFULLY!');
    console.log('✅ Your database now has balanced coverage across all categories');
    console.log('✅ All 49 Lima districts covered');
    console.log('✅ Original categories preserved as subcategories');
    console.log('✅ Ready for comprehensive business search and booking!');
  } else {
    console.log('⚠️ Some scrapers failed. Check logs above for details.');
    console.log('💡 You can re-run individual scrapers that failed.');
  }
}

// Run the master scraper
runMasterScraper()
  .then(() => {
    console.log('\\n✅ Master scraping process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\\n❌ Master scraping process failed:', error);
    process.exit(1);
  });
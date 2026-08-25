/**
 * Complete User Flow Example
 * 
 * This example simulates a complete e-commerce user flow
 * with A/B testing at multiple touchpoints
 */

import Xperiment from '../index.js';
import { resolve } from 'node:path';

Xperiment.configure({ path: resolve(import.meta.dirname, '..', 'db') });

// Simulate a user journey through an e-commerce site
async function simulateUserJourney(userId) {
  console.log(`\n👤 ${userId} starting journey...`);
  
  // Step 1: Landing page variant
  const landingExp = await Xperiment.get(userId, 'landing-page');
  
  const landingVariant = await landingExp.case();
  console.log(`  📄 Saw landing page: ${landingVariant}`);
  
  // 70% continue browsing
  if (Math.random() < 0.7) {
    await landingExp.hit(1);
    console.log('  ✓ Clicked "Browse Products"');
    
    // Step 2: Product page layout
    const productExp = await Xperiment.get(userId, 'product-layout');
    
    const layoutVariant = await productExp.case();
    console.log(`  🛍️  Viewing products in ${layoutVariant} layout`);
    
    // 60% add to cart
    if (Math.random() < 0.6) {
      await productExp.hit(2);
      console.log('  ✓ Added item to cart');
      
      // Step 3: Checkout flow
      const checkoutExp = await Xperiment.get(userId, 'checkout-process');
      
      const checkoutVariant = await checkoutExp.case();
      console.log(`  💳 Started ${checkoutVariant} checkout`);
      
      // 50% complete purchase
      if (Math.random() < 0.5) {
        await checkoutExp.hit(10);
        console.log('  ✅ Completed purchase!');
        
        // Bonus points for entire funnel completion
        await landingExp.hit(5);
        await productExp.hit(5);
      } else {
        await checkoutExp.miss(1);
        console.log('  ❌ Abandoned cart');
      }
    } else {
      await productExp.miss(1);
      console.log('  ❌ Left without adding to cart');
    }
  } else {
    await landingExp.miss(1);
    console.log('  ❌ Bounced from landing page');
  }
}

async function completeFlowExample() {
  console.log('=== Complete E-commerce Flow Example ===');
  console.log('Simulating 20 users through the funnel...\n');

  // Define all experiments
  await Xperiment.define({ hero_a: 50, hero_b: 50 }, 'landing-page');
  await Xperiment.define({ grid: 50, list: 50 }, 'product-layout');
  await Xperiment.define({ single_page: 50, multi_step: 50 }, 'checkout-process');

  // Simulate 20 users
  for (let i = 1; i <= 20; i++) {
    await simulateUserJourney(`user_${i}`);
  }

  // Generate reports for each stage
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    FUNNEL ANALYSIS                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const stages = [
    { name: 'landing-page', title: '1. Landing Page' },
    { name: 'product-layout', title: '2. Product Page' },
    { name: 'checkout-process', title: '3. Checkout' }
  ];

  for (const stage of stages) {
    const report = await Xperiment.report(stage.name);
    
    console.log(`${stage.title}`);
    console.log('─'.repeat(60));
    
    if (report.totalUsers > 0) {
      console.log(`Users reached this stage: ${report.totalUsers}`);
      console.log(`Best variant: ${report.bestCase}\n`);
      
      for (const [variant, stats] of Object.entries(report.cases)) {
        const isWinner = variant === report.bestCase;
        console.log(`${isWinner ? '🏆' : '  '} ${variant}`);
        console.log(`   Users: ${stats.users}`);
        console.log(`   Conversions: ${stats.totalHits} hits, ${stats.totalMisses} misses`);
        console.log(`   Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
        console.log(`   Net Score: ${stats.netScore}\n`);
      }
    } else {
      console.log('No data for this stage\n');
    }
  }

  // Overall recommendations
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    RECOMMENDATIONS                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  for (const stage of stages) {
    const report = await Xperiment.report(stage.name);
    if (report.bestCase) {
      const bestStats = report.cases[report.bestCase];
      console.log(`✓ ${stage.title}: Use "${report.bestCase}"`);
      console.log(`  Expected improvement: ${(bestStats.successRate * 100).toFixed(1)}% success rate\n`);
    }
  }

  // Cleanup
  console.log('\nCleaning up experiments...');
  for (const stage of stages) {
    await Xperiment.reset(stage.name);
  }
  console.log('All experiments reset completed.');
}

// Run the example
completeFlowExample().catch(console.error);

/**
 * Dashboard Example
 * 
 * This example shows how to create a dashboard that monitors
 * multiple experiments simultaneously
 */

import Xperiment from '../index.js';
import { resolve } from 'node:path';

Xperiment.configure({ path: resolve(import.meta.dirname, '..', 'db') });

// Helper function to create experiment data
async function createExperimentData(name, variants, userCount, conversionRates) {
  for (let i = 1; i <= userCount; i++) {
    const exp = new Xperiment(`user_${i}`, {
      name,
      cases: variants
    });

    const variant = await exp.case(Object.keys(variants));
    
    // Simulate conversion based on variant's conversion rate
    if (Math.random() < conversionRates[variant]) {
      const amount = Math.floor(Math.random() * 5) + 1; // Random 1-5
      await exp.hit(amount);
    } else {
      await exp.miss();
    }
  }
}

async function dashboardExample() {
  console.log('=== Experiment Dashboard ===\n');
  console.log('Setting up multiple experiments...\n');

  // Create multiple experiments
  await createExperimentData(
    'homepage-hero',
    { control: 50, variant_a: 50 },
    50,
    { control: 0.4, variant_a: 0.6 }
  );

  await createExperimentData(
    'checkout-flow',
    { old_flow: 50, new_flow: 50 },
    60,
    { old_flow: 0.5, new_flow: 0.7 }
  );

  await createExperimentData(
    'pricing-page',
    { price_high: 33, price_mid: 33, price_low: 34 },
    90,
    { price_high: 0.3, price_mid: 0.5, price_low: 0.6 }
  );

  // Generate dashboard
  const experiments = ['homepage-hero', 'checkout-flow', 'pricing-page'];
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              EXPERIMENT DASHBOARD                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  for (const name of experiments) {
    const report = await Xperiment.report(name);
    
    console.log(`📊 ${name.toUpperCase().replace(/-/g, ' ')}`);
    console.log('─'.repeat(60));
    console.log(`Total Users: ${report.totalUsers}`);
    console.log(`Effectiveness: ${report.effectiveness}%`);
    console.log(`Best Performer: ${report.bestCase} ⭐\n`);

    // Sort by net score
    const sortedCases = Object.entries(report.cases)
      .sort(([, a], [, b]) => b.netScore - a.netScore);

    for (const [variant, stats] of sortedCases) {
      const isWinner = variant === report.bestCase;
      const badge = isWinner ? '🏆' : '  ';
      
      console.log(`${badge} ${variant}`);
      console.log(`   Users: ${stats.users} | Success: ${(stats.successRate * 100).toFixed(1)}% | Net: ${stats.netScore}`);
      
      // Progress bar
      const maxScore = sortedCases[0][1].netScore;
      const barLength = Math.max(0, Math.min(30, Math.floor((stats.netScore / maxScore) * 30)));
      const bar = '█'.repeat(barLength) + '░'.repeat(30 - barLength);
      console.log(`   ${bar}`);
      console.log('');
    }
    console.log('');
  }

  // Summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                        SUMMARY                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let totalUsers = 0;
  for (const name of experiments) {
    const report = await Xperiment.report(name);
    totalUsers += report.totalUsers;
    const improvement = report.cases[report.bestCase].successRate;
    console.log(`✓ ${name}: ${report.bestCase} winning with ${(improvement * 100).toFixed(1)}% success rate`);
  }
  
  console.log(`\nTotal users tested across all experiments: ${totalUsers}`);

  // Cleanup
  // console.log('\n\nCleaning up experiments...');
  // for (const name of experiments) {
  //   await Xperiment.reset(name);
  // }
  // console.log('All experiments reset completed.');
}

// Run the example
dashboardExample().catch(console.error);

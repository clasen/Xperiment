/**
 * Multi-variant Testing Example
 * 
 * This example shows how to test multiple variants (A/B/C/D test)
 */

import Xperiment from '../index.js';

async function multivariantExample() {
  console.log('=== Multi-variant Test Example ===\n');

  // Test 4 different headlines
  const headlines = {
    headline_a: 'Buy Now and Save!',
    headline_b: 'Limited Time Offer',
    headline_c: 'Get 50% Off Today',
    headline_d: 'Join Thousands of Happy Customers'
  };

  // Define experiment with equal distribution
  await Xperiment.define(['headline_a', 'headline_b', 'headline_c', 'headline_d']);

  // Simulate 200 users
  console.log('Simulating 200 users...\n');

  await Xperiment.reset();

  for (let i = 1; i <= 100; i++) {
    const exp = await Xperiment.get(`user_${i}`);

    const variant = await exp.case();

    // Different headlines have different conversion rates
    const conversionRates = {
      headline_a: 0.3,
      headline_b: 0.5,
      headline_c: 0.7,  // Best performer
      headline_d: 0.4
    };

    if (Math.random() < conversionRates[variant]) {
      await exp.hit();
    } else {
      await exp.miss();
    }
  }

  // Generate report
  const report = await Xperiment.report();

  console.log('Test Results:');
  console.log(`Total Users: ${report.totalUsers}`);
  console.log(`Effectiveness: ${report.effectiveness}% ${report.effectiveness >= 100 ? '✓ (Representative)' : '⚠️  (Need more data)'}`);
  console.log(`\nPerformance by Variant:`);

  for (const [variant, stats] of Object.entries(report.cases)) {
    console.log(`\n${variant}: "${headlines[variant]}"`);
    console.log(`  Users: ${stats.users}`);
    console.log(`  Hits: ${stats.totalHits}`);
    console.log(`  Misses: ${stats.totalMisses}`);
    console.log(`  Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
    console.log(`  Net Score: ${stats.netScore}`);
  }

  console.log(`\n🏆 Winner: ${report.bestCase}`);
  console.log(`   "${headlines[report.bestCase]}"`);

  // Cleanup
  // await Xperiment.reset();
  console.log('\nExperiment reset completed.');
}

// Run the example
multivariantExample().catch(console.error);


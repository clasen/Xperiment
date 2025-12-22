/**
 * Weighted Tracking Example
 * 
 * This example shows how to use weighted scores to track
 * different levels of user engagement
 */

import Xperiment from '../index.js';

async function weightedTrackingExample() {
  console.log('=== Weighted Tracking Example ===\n');
  console.log('Testing two different page layouts with weighted engagement scores\n');

  // Define experiment
  await Xperiment.define({ layout_a: 50, layout_b: 50 }, 'engagement-test');

  // Simulate users with different engagement levels
  const users = [
    { id: 'user_1', actions: ['view', 'click', 'share'] },
    { id: 'user_2', actions: ['view', 'bounce'] },
    { id: 'user_3', actions: ['view', 'click', 'purchase'] },
    { id: 'user_4', actions: ['view', 'click'] },
    { id: 'user_5', actions: ['view', 'bounce'] },
    { id: 'user_6', actions: ['view', 'click', 'share', 'purchase'] },
  ];

  // Action weights
  const weights = {
    view: 0,      // No points for just viewing
    click: 1,     // 1 point for clicking
    share: 5,     // 5 points for sharing
    purchase: 10, // 10 points for purchasing
    bounce: -2    // -2 points for bouncing
  };

  for (const user of users) {
    const exp = await Xperiment.get(user.id, 'engagement-test');

    const layout = await exp.case();
    console.log(`${user.id} assigned to ${layout}`);

    let totalScore = 0;
    for (const action of user.actions) {
      const score = weights[action];
      totalScore += score;
      
      if (score > 0) {
        await exp.hit(score);
        console.log(`  ✓ ${action} (+${score})`);
      } else if (score < 0) {
        await exp.miss(Math.abs(score));
        console.log(`  ✗ ${action} (${score})`);
      }
    }
    console.log(`  Total score: ${totalScore}\n`);
  }

  // Generate report
  const report = await Xperiment.report('engagement-test');
  
  console.log('\n=== Engagement Report ===');
  console.log(`Total Users: ${report.totalUsers}\n`);
  
  for (const [layout, stats] of Object.entries(report.cases)) {
    console.log(`${layout.toUpperCase()}:`);
    console.log(`  Users: ${stats.users}`);
    console.log(`  Total Hits: ${stats.totalHits}`);
    console.log(`  Total Misses: ${stats.totalMisses}`);
    console.log(`  Net Score: ${stats.netScore}`);
    console.log(`  Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
    console.log(`  Average Score per User: ${(stats.netScore / stats.users).toFixed(2)}\n`);
  }

  console.log(`🏆 Best Layout: ${report.bestCase}`);
  console.log(`   Net Score: ${report.cases[report.bestCase].netScore}`);

  // Cleanup
  await Xperiment.reset('engagement-test');
  console.log('\nExperiment reset completed.');
}

// Run the example
weightedTrackingExample().catch(console.error);


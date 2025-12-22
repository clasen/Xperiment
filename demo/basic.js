/**
 * Basic A/B Testing Example
 * 
 * This example shows a simple A/B test with two variants
 */

import Xperiment from '../index.js';

async function basicExample() {
  console.log('=== Basic A/B Test Example ===\n');

  // Simple: just create with cases (no name needed!)
  const exp = new Xperiment('user_alice', {
    cases: { red: 50, blue: 50 }
  });

  // Get assigned variant
  const variant = await exp.case();
  console.log(`User assigned to variant: ${variant}`);

  // Simulate user interaction
  console.log('User clicks the button...');
  
  // Track success
  if (Math.random() > 0.5) {
    await exp.hit();
    console.log('✓ User completed the action (hit recorded)');
  } else {
    await exp.miss();
    console.log('✗ User did not complete the action (miss recorded)');
  }

  // Get report (uses 'default' automatically)
  const report = await Xperiment.report();
  console.log('\nReport:');
  console.log(JSON.stringify(report, null, 2));

  // Cleanup (resets 'default' automatically)
  await Xperiment.reset();
  console.log('\nExperiment reset completed.');
}

// Run the example
basicExample().catch(console.error);


import Xperiment from '../index.js';
import { resolve } from 'node:path';

Xperiment.configure({ path: resolve(import.meta.dirname, '..', 'db') });

/**
 * Demo: With vs Without Convergence
 * Shows the difference between traditional A/B testing and convergence mode
 */

async function demo() {
  console.log('🔄 Comparing: Traditional A/B Test vs Convergence Mode\n');
  
  // ========================================
  // Test 1: Traditional A/B (No Convergence)
  // ========================================
  console.log('='.repeat(60));
  console.log('Test 1: TRADITIONAL A/B TEST (No convergence)');
  console.log('='.repeat(60));
  
  await Xperiment.reset('traditional-test');
  await Xperiment.define(['control', 'variant'], 'traditional-test');
  // NO convergenceThreshold - traditional A/B test
  
  // Build data
  const db = await import('deepbase').then(m => new m.default({
    path: resolve(import.meta.dirname, '..', 'db'),
    name: 'xperiment'
  }));
  await db.set('experiments', 'traditional-test', 'user1', 'case', 'control');
  await db.set('experiments', 'traditional-test', 'user1', 'hits', 15);
  await db.set('experiments', 'traditional-test', 'user1', 'misses', 10);
  
  await db.set('experiments', 'traditional-test', 'user2', 'case', 'variant');
  await db.set('experiments', 'traditional-test', 'user2', 'hits', 22);
  await db.set('experiments', 'traditional-test', 'user2', 'misses', 3);
  
  const report1 = await Xperiment.report('traditional-test');
  console.log(`Effectiveness: ${report1.effectiveness}%`);
  console.log(`Best case: ${report1.bestCase}`);
  console.log(`Convergence threshold: ${report1.convergenceThreshold}`);
  console.log(`Converged: ${report1.converged}`);
  console.log('\nNew users assignment (should be RANDOM):');
  
  const assignments1 = {};
  for (let i = 0; i < 10; i++) {
    const exp = await Xperiment.get(`new-user-${i}`, 'traditional-test');
    const assigned = await exp.case();
    assignments1[assigned] = (assignments1[assigned] || 0) + 1;
  }
  console.log(assignments1);
  console.log('✅ Both variants assigned = Traditional A/B testing continues\n');
  
  // ========================================
  // Test 2: With Convergence Mode
  // ========================================
  console.log('='.repeat(60));
  console.log('Test 2: CONVERGENCE MODE (Auto-optimize at 80%)');
  console.log('='.repeat(60));
  
  await Xperiment.reset('convergence-test');
  await Xperiment.define(['control', 'variant'], 'convergence-test', {
    convergenceThreshold: 80  // Enable auto-convergence
  });
  
  // Build same data
  await db.set('experiments', 'convergence-test', 'user1', 'case', 'control');
  await db.set('experiments', 'convergence-test', 'user1', 'hits', 15);
  await db.set('experiments', 'convergence-test', 'user1', 'misses', 10);
  
  await db.set('experiments', 'convergence-test', 'user2', 'case', 'variant');
  await db.set('experiments', 'convergence-test', 'user2', 'hits', 22);
  await db.set('experiments', 'convergence-test', 'user2', 'misses', 3);
  
  const report2 = await Xperiment.report('convergence-test');
  console.log(`Effectiveness: ${report2.effectiveness}%`);
  console.log(`Best case: ${report2.bestCase}`);
  console.log(`Convergence threshold: ${report2.convergenceThreshold}%`);
  console.log(`Converged: ${report2.converged}`);
  console.log('\nNew users assignment (should be WINNER only):');
  
  const assignments2 = {};
  for (let i = 0; i < 10; i++) {
    const exp = await Xperiment.get(`new-user-${i}`, 'convergence-test');
    const assigned = await exp.case();
    assignments2[assigned] = (assignments2[assigned] || 0) + 1;
  }
  console.log(assignments2);
  console.log('✅ All get winner = Converged to best variant!\n');
  
  // ========================================
  // Summary
  // ========================================
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log('WITHOUT convergenceThreshold:');
  console.log('  - Traditional A/B testing');
  console.log('  - Users always get random assignment');
  console.log('  - converged = false always');
  console.log('  - Manual decision required\n');
  
  console.log('WITH convergenceThreshold:');
  console.log('  - Auto-optimization mode');
  console.log('  - Random until threshold reached');
  console.log('  - Then auto-assign winner');
  console.log('  - No manual intervention needed');
}

demo().catch(console.error);

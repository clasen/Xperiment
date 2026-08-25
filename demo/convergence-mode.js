import Xperiment from '../index.js';
import { resolve } from 'node:path';

Xperiment.configure({ path: resolve(import.meta.dirname, '..', 'db') });

/**
 * Demo: Convergence Mode
 * Shows how the experiment automatically converges to the winner
 * once a certain effectiveness threshold is reached
 */

async function demo() {
  console.log('🎯 Convergence Mode Demo\n');
  
  // Reset experiment
  await Xperiment.reset('convergence-test');
  
  // Define experiment with convergence threshold at 80%
  await Xperiment.define(['control', 'variant'], 'convergence-test', {
    convergenceThreshold: 80  // Auto-select winner at 80% effectiveness
  });
  
  console.log('📊 Experiment defined with 80% convergence threshold\n');
  
  // Simulate Phase 1: Building data (not converged yet)
  console.log('Phase 1: Building statistical confidence...\n');
  
  // Simulate 20 users for control (50% success rate)
  for (let i = 0; i < 20; i++) {
    const xp = await Xperiment.get(`user-${i}`, 'convergence-test');
    const userCase = await xp.case();
    
    if (userCase === 'control') {
      // Control has 50% success rate
      if (Math.random() < 0.5) {
        await xp.hit();
      } else {
        await xp.miss();
      }
    }
  }
  
  // Simulate 20 users for variant (80% success rate - BETTER!)
  for (let i = 20; i < 100; i++) {
    const xp = await Xperiment.get(`user-${i}`, 'convergence-test');
    const userCase = await xp.case();
    
    if (userCase === 'variant') {
      // Variant has 80% success rate
      if (Math.random() < 0.8) {
        await xp.hit();
      } else {
        await xp.miss();
      }
    }
  }
  
  let report = await Xperiment.report('convergence-test');
  console.log('Report after 40 users:');
  console.log(`  Effectiveness: ${report.effectiveness}%`);
  console.log(`  Best case: ${report.bestCase}`);
  console.log(`  Converged: ${report.converged ? '✅' : '❌'}`);
  console.log(`  Cases:`, report.cases);
  console.log('');
  
  // Simulate Phase 2: Need more data to reach 80% effectiveness
  console.log('Phase 2: Adding more data to reach convergence threshold...\n');
  
  // Add more events to reach effectiveness threshold
  for (let i = 0; i < 40; i++) {
    const userId = `user-${i}`;
    const xp = await Xperiment.get(userId, 'convergence-test');
    const userCase = await xp.case();
    
    // Continue with similar success rates
    if (userCase === 'control') {
      if (Math.random() < 0.5) {
        await xp.hit();
      } else {
        await xp.miss();
      }
    } else {
      if (Math.random() < 0.8) {
        await xp.hit();
      } else {
        await xp.miss();
      }
    }
  }
  
  report = await Xperiment.report('convergence-test');
  console.log('Report after more events:');
  console.log(`  Effectiveness: ${report.effectiveness}%`);
  console.log(`  Best case: ${report.bestCase}`);
  console.log(`  Converged: ${report.converged ? '✅ YES!' : '❌'}`);
  console.log(`  Cases:`, report.cases);
  console.log('');
  
  // Simulate Phase 3: New users after convergence
  if (report.converged) {
    console.log('🎉 Phase 3: Convergence reached! Testing new user assignments...\n');
    
    // Test 10 new users - they should ALL get the winning case
    const newUserCases = {};
    for (let i = 100; i < 110; i++) {
      const xp = await Xperiment.get(`new-user-${i}`, 'convergence-test');
      const userCase = await xp.case();
      newUserCases[userCase] = (newUserCases[userCase] || 0) + 1;
    }
    
    console.log('New users assignment (should all be winner):');
    console.log(newUserCases);
    console.log('');
    
    if (newUserCases[report.bestCase] === 10) {
      console.log('✅ SUCCESS: All new users got the winning case!');
    } else {
      console.log('⚠️  Some users got different cases (low effectiveness)');
    }
  } else {
    console.log('⚠️  Convergence threshold not reached yet.');
    console.log(`   Need ${80 - report.effectiveness}% more effectiveness.`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Summary:');
  console.log('- convergenceThreshold: When set, auto-selects winner');
  console.log('- Before threshold: Random assignment continues');
  console.log('- After threshold: All new users get best performing case');
  console.log('- Useful for: Auto-optimization after statistical confidence');
}

demo().catch(console.error);

/**
 * Score Usage Demo
 * 
 * Demonstrates the score() method for tracking non-incremental metrics
 * like engagement time, scroll depth, or revenue per user.
 */

import Xperiment from '../index.js';
import { resolve } from 'node:path';

Xperiment.configure({ path: resolve(import.meta.dirname, '..', 'db') });

console.log('🎯 Score Usage Demo - Engagement Time Tracking\n');

// Define experiment: testing two video player layouts
await Xperiment.define(['compact_player', 'immersive_player'], 'video-engagement');

// Simulate multiple users watching videos
const users = [
  { id: 'user_001', watchTime: 145 },  // 2:25 minutes
  { id: 'user_002', watchTime: 89 },   // 1:29 minutes
  { id: 'user_003', watchTime: 312 },  // 5:12 minutes
  { id: 'user_004', watchTime: 45 },   // 0:45 minutes
  { id: 'user_005', watchTime: 201 },  // 3:21 minutes
  { id: 'user_006', watchTime: 178 },  // 2:58 minutes
  { id: 'user_007', watchTime: 93 },   // 1:33 minutes
  { id: 'user_008', watchTime: 267 },  // 4:27 minutes
];

console.log('Simulating user video engagement...\n');

for (const user of users) {
  const exp = await Xperiment.get(user.id, 'video-engagement');
  const layout = await exp.case();
  
  // Set the engagement time score (non-incremental)
  await exp.score(user.watchTime);
  
  const minutes = Math.floor(user.watchTime / 60);
  const seconds = user.watchTime % 60;
  console.log(`${user.id} [${layout}] watched for ${minutes}:${seconds.toString().padStart(2, '0')}`);
}

// Generate report
console.log('\n📊 Engagement Report:\n');
const report = await Xperiment.report('video-engagement');

for (const [layout, stats] of Object.entries(report.cases)) {
  const avgEngagement = stats.totalHits / stats.users;
  const avgMinutes = Math.floor(avgEngagement / 60);
  const avgSeconds = Math.round(avgEngagement % 60);
  
  console.log(`${layout}:`);
  console.log(`  Users: ${stats.users}`);
  console.log(`  Total engagement time: ${Math.floor(stats.totalHits / 60)} minutes`);
  console.log(`  Avg engagement: ${avgMinutes}:${avgSeconds.toString().padStart(2, '0')} per user`);
  console.log();
}

console.log(`🏆 Winner: ${report.bestCase}`);
console.log(`   (Higher engagement time indicates better performance)\n`);

// Clean up
await Xperiment.reset('video-engagement');
console.log('✅ Demo completed and data cleaned up');

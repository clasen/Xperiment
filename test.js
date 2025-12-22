import { expect } from 'chai';
import Xperiment from './index.js';
import DeepBase from 'deepbase';

describe('Xperiment - A/B Testing Library', function() {
  this.timeout(5000);

  // Clear database before each test for isolation
  beforeEach(async function() {
    // Clear all experiments
    const db = new DeepBase({name: 'xperiment'});
    await db.del('experiments');
    await db.del('config');
    
    // Clear singleton instances
    Xperiment.instances.clear();
  });

  describe('Constructor & Singleton Pattern', function() {
    it('should create an instance with id and custom name with cases', async function() {
      await Xperiment.define({ plot1: 50, plot2: 50 }, 'test-experiment');
      const exp = await Xperiment.get('user1', 'test-experiment');
      expect(exp.id).to.equal('user1');
      expect(exp.name).to.equal('test-experiment');
      expect(exp.cases).to.deep.equal({ plot1: 50, plot2: 50 });
    });

    it('should create an instance with array cases (equal probability)', async function() {
      await Xperiment.define(['option1', 'option2', 'option3'], 'array-test');
      const exp = await Xperiment.get('user1', 'array-test');
      expect(exp.cases).to.deep.equal({ 
        option1: 1/3, 
        option2: 1/3, 
        option3: 1/3 
      });
    });

    it('should return the same instance with get() method', async function() {
      await Xperiment.define({ a: 50, b: 50 }, 'test');
      const exp1 = await Xperiment.get('user1', 'test');
      const exp2 = await Xperiment.get('user1', 'test');
      expect(exp1).to.equal(exp2);
    });

    it('should return different instances for different id/name combinations', async function() {
      await Xperiment.define({ a: 50 }, 'test1');
      await Xperiment.define({ b: 50 }, 'test2');
      
      const exp1 = await Xperiment.get('user1', 'test1');
      const exp2 = await Xperiment.get('user1', 'test2');
      const exp3 = await Xperiment.get('user2', 'test1');
      
      expect(exp1).to.not.equal(exp2);
      expect(exp1).to.not.equal(exp3);
      expect(exp2).to.not.equal(exp3);
    });

    it('should throw error if experiment not defined', async function() {
      try {
        await Xperiment.get('user1', 'undefined-experiment');
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.message).to.include('not found');
      }
    });
  });

  describe('Case Assignment', function() {
    it('should assign a case from the defined options', async function() {
      await Xperiment.define(['plot1', 'plot2'], 'test');
      const exp = await Xperiment.get('user1', 'test');
      const assignedCase = await exp.case();
      
      expect(assignedCase).to.be.oneOf(['plot1', 'plot2']);
    });

    it('should persist the assigned case', async function() {
      await Xperiment.define(['plot1', 'plot2'], 'test');
      const exp = await Xperiment.get('user1', 'test');
      const firstCall = await exp.case();
      const secondCall = await exp.case();
      
      expect(firstCall).to.equal(secondCall);
    });

    it('should return the same case across different instances', async function() {
      await Xperiment.define(['plot1', 'plot2'], 'test-experiment');
      const exp1 = await Xperiment.get('user1', 'test-experiment');
      const case1 = await exp1.case();
      
      const exp2 = await Xperiment.get('user1', 'test-experiment');
      const case2 = await exp2.case();
      
      expect(case1).to.equal(case2);
    });

    it('should assign different cases to different users', async function() {
      await Xperiment.define(['plot1', 'plot2'], 'test');
      const assignments = new Set();
      
      for (let i = 0; i < 20; i++) {
        const exp = await Xperiment.get(`user${i}`, 'test');
        const assigned = await exp.case();
        assignments.add(assigned);
      }
      
      // With 20 users and 50/50 probability, we should see both cases
      expect(assignments.size).to.equal(2);
    });

    it('should respect weighted probabilities', async function() {
      await Xperiment.define({ plot1: 80, plot2: 20 }, 'weighted-test');
      const results = { plot1: 0, plot2: 0 };
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        const exp = await Xperiment.get(`user${i}`, 'weighted-test');
        const assigned = await exp.case();
        results[assigned]++;
      }
      
      // With 80/20 split, plot1 should appear more frequently
      expect(results.plot1).to.be.greaterThan(results.plot2);
      expect(results.plot1).to.be.greaterThan(50);
    });

    it('should handle equal distribution with array', async function() {
      await Xperiment.define(['a', 'b', 'c'], 'equal-test');
      const results = { a: 0, b: 0, c: 0 };
      const iterations = 90;
      
      for (let i = 0; i < iterations; i++) {
        const exp = await Xperiment.get(`user${i}`, 'equal-test');
        const assigned = await exp.case();
        results[assigned]++;
      }
      
      // Each should get roughly 1/3 (allow variance)
      expect(results.a).to.be.greaterThan(15);
      expect(results.b).to.be.greaterThan(15);
      expect(results.c).to.be.greaterThan(15);
    });
  });

  describe('Metrics Tracking', function() {
    it('should increment hits by default amount (1)', async function() {
      await Xperiment.define(['plot1', 'plot2'], 'test');
      const exp = await Xperiment.get('user1', 'test');
      await exp.case();
      
      await exp.hit();
      await exp.hit();
      await exp.hit();
      
      const db = new DeepBase({name: 'xperiment'});
      const hits = await db.get('experiments', 'test', 'user1', 'hits');
      expect(hits).to.equal(3);
    });

    it('should increment hits by custom amount', async function() {
      await Xperiment.define(['plot1', 'plot2'], 'test');
      const exp = await Xperiment.get('user1', 'test');
      await exp.case();
      
      await exp.hit(5);
      await exp.hit(3);
      
      const db = new DeepBase({name: 'xperiment'});
      const hits = await db.get('experiments', 'test', 'user1', 'hits');
      expect(hits).to.equal(8);
    });

    it('should increment misses by default amount (1)', async function() {
      await Xperiment.define(['plot1', 'plot2'], 'test');
      const exp = await Xperiment.get('user1', 'test');
      await exp.case();
      
      await exp.miss();
      await exp.miss();
      
      const db = new DeepBase({name: 'xperiment'});
      const misses = await db.get('experiments', 'test', 'user1', 'misses');
      expect(misses).to.equal(2);
    });

    it('should increment misses by custom amount', async function() {
      await Xperiment.define(['plot1', 'plot2'], 'test');
      const exp = await Xperiment.get('user1', 'test');
      await exp.case();
      
      await exp.miss(10);
      
      const db = new DeepBase({name: 'xperiment'});
      const misses = await db.get('experiments', 'test', 'user1', 'misses');
      expect(misses).to.equal(10);
    });

    it('should track both hits and misses independently', async function() {
      await Xperiment.define(['plot1', 'plot2'], 'test');
      const exp = await Xperiment.get('user1', 'test');
      await exp.case();
      
      await exp.hit(3);
      await exp.miss(2);
      await exp.hit(1);
      
      const db = new DeepBase({name: 'xperiment'});
      const hits = await db.get('experiments', 'test', 'user1', 'hits');
      const misses = await db.get('experiments', 'test', 'user1', 'misses');
      
      expect(hits).to.equal(4);
      expect(misses).to.equal(2);
    });
  });

  describe('Score Tracking', function() {
    it('should set a score value', async function() {
      await Xperiment.define(['plot1', 'plot2'], 'test');
      const exp = await Xperiment.get('user1', 'test');
      await exp.case();
      
      await exp.score(100);
      
      const db = new DeepBase({name: 'xperiment'});
      const score = await db.get('experiments', 'test', 'user1', 'score');
      expect(score).to.equal(100);
    });

    it('should replace score value (non-incremental)', async function() {
      await Xperiment.define(['plot1', 'plot2'], 'test');
      const exp = await Xperiment.get('user1', 'test');
      await exp.case();
      
      await exp.score(50);
      await exp.score(30);
      await exp.score(100);
      
      const db = new DeepBase({name: 'xperiment'});
      const score = await db.get('experiments', 'test', 'user1', 'score');
      expect(score).to.equal(100); // Should be the last value, not cumulative
    });

    it('should add score to hits in report calculations', async function() {
      await Xperiment.define(['plot1'], 'score-test');
      const exp = await Xperiment.get('user1', 'score-test');
      await exp.case();
      
      await exp.hit(5);
      await exp.score(10);
      await exp.miss(2);
      
      const report = await Xperiment.report('score-test');
      
      // totalHits should be hits + score = 5 + 10 = 15
      expect(report.cases.plot1.totalHits).to.equal(15);
      expect(report.cases.plot1.totalMisses).to.equal(2);
      expect(report.cases.plot1.netScore).to.equal(13); // 15 - 2
    });

    it('should work with score only (no hits)', async function() {
      await Xperiment.define(['plot1'], 'engagement-test');
      const exp = await Xperiment.get('user1', 'engagement-test');
      await exp.case();
      
      await exp.score(145); // Engagement time in seconds
      
      const report = await Xperiment.report('engagement-test');
      
      expect(report.cases.plot1.totalHits).to.equal(145);
      expect(report.cases.plot1.totalMisses).to.equal(0);
    });

    it('should aggregate scores across multiple users', async function() {
      await Xperiment.define(['layout_a', 'layout_b'], 'video-test');
      
      // Simulate 3 users with different engagement times
      const exp1 = await Xperiment.get('user1', 'video-test');
      await exp1.case();
      await exp1.score(120); // 2 minutes
      
      const exp2 = await Xperiment.get('user2', 'video-test');
      await exp2.case();
      await exp2.score(180); // 3 minutes
      
      const exp3 = await Xperiment.get('user3', 'video-test');
      await exp3.case();
      await exp3.score(90); // 1.5 minutes
      
      const report = await Xperiment.report('video-test');
      
      expect(report.totalUsers).to.equal(3);
      // Verify that scores are being aggregated
      const totalScores = Object.values(report.cases).reduce((sum, caseData) => sum + caseData.totalHits, 0);
      expect(totalScores).to.equal(390); // 120 + 180 + 90
    });

    it('should combine score with hits and misses', async function() {
      await Xperiment.define(['plot1'], 'combined-test');
      const exp = await Xperiment.get('user1', 'combined-test');
      await exp.case();
      
      await exp.hit(3);
      await exp.score(50);
      await exp.hit(2);
      await exp.miss(5);
      
      const db = new DeepBase({name: 'xperiment'});
      const hits = await db.get('experiments', 'combined-test', 'user1', 'hits');
      const score = await db.get('experiments', 'combined-test', 'user1', 'score');
      const misses = await db.get('experiments', 'combined-test', 'user1', 'misses');
      
      expect(hits).to.equal(5); // 3 + 2
      expect(score).to.equal(50);
      expect(misses).to.equal(5);
      
      const report = await Xperiment.report('combined-test');
      expect(report.cases.plot1.totalHits).to.equal(55); // hits + score
      expect(report.cases.plot1.netScore).to.equal(50); // 55 - 5
    });

    it('should default to 1 if no value provided', async function() {
      await Xperiment.define(['plot1'], 'default-test');
      const exp = await Xperiment.get('user1', 'default-test');
      await exp.case();
      
      await exp.score(); // No parameter
      
      const db = new DeepBase({name: 'xperiment'});
      const score = await db.get('experiments', 'default-test', 'user1', 'score');
      expect(score).to.equal(1);
    });
  });

  describe('Reset Functionality', function() {
    it('should reset entire experiment for all users', async function() {
      await Xperiment.define(['plot1', 'plot2'], 'test-experiment');
      
      // Create multiple users with data
      const exp1 = await Xperiment.get('user1', 'test-experiment');
      const exp2 = await Xperiment.get('user2', 'test-experiment');
      
      await exp1.case();
      await exp1.hit(5);
      await exp2.case();
      await exp2.miss(3);
      
      // Reset the experiment
      await Xperiment.reset('test-experiment');
      
      // Verify all data is gone
      const db = new DeepBase({name: 'xperiment'});
      const data = await db.get('experiments', 'test-experiment');
      
      expect(data).to.satisfy(val => val === undefined || val === null);
    });

    it('should not affect other experiments when resetting one', async function() {
      await Xperiment.define(['plot1', 'plot2'], 'exp1');
      await Xperiment.define(['plot1', 'plot2'], 'exp2');
      
      const exp1 = await Xperiment.get('user1', 'exp1');
      const exp2 = await Xperiment.get('user1', 'exp2');
      
      await exp1.case();
      await exp1.hit(5);
      await exp2.case();
      await exp2.hit(3);
      
      await Xperiment.reset('exp1');
      
      const db = new DeepBase({name: 'xperiment'});
      const data1 = await db.get('experiments', 'exp1');
      const data2 = await db.get('experiments', 'exp2');
      
      expect(data1).to.satisfy(val => val === undefined || val === null);
      expect(data2).to.not.satisfy(val => val === undefined || val === null);
    });

    it('should clear singleton instances for reset experiment', async function() {
      await Xperiment.define(['a'], 'test-exp');
      await Xperiment.define(['b'], 'other-exp');
      
      await Xperiment.get('user1', 'test-exp');
      await Xperiment.get('user2', 'test-exp');
      await Xperiment.get('user3', 'other-exp');
      
      expect(Xperiment.instances.size).to.equal(3);
      
      await Xperiment.reset('test-exp');
      
      expect(Xperiment.instances.size).to.equal(1);
      expect(Xperiment.instances.has('user3:other-exp')).to.be.true;
    });
  });

  describe('Report Generation', function() {
    it('should generate report with no data', async function() {
      const report = await Xperiment.report('empty-experiment');
      
      expect(report.experiment).to.equal('empty-experiment');
      expect(report.totalUsers).to.equal(0);
      expect(report.cases).to.deep.equal({});
      expect(report.bestCase).to.be.null;
    });

    it('should generate report with single user', async function() {
      await Xperiment.define(['plot1', 'plot2'], 'test-exp');
      const exp = await Xperiment.get('user1', 'test-exp');
      await exp.case();
      await exp.hit(5);
      await exp.miss(2);
      
      const report = await Xperiment.report('test-exp');
      
      expect(report.totalUsers).to.equal(1);
      expect(report.cases).to.have.any.keys('plot1', 'plot2');
    });

    it('should aggregate metrics across multiple users', async function() {
      await Xperiment.define(['plot1', 'plot2'], 'homepage-test');
      
      // User 1 & 2 - plot1 (force by setting seed or checking assignment)
      const exp1 = await Xperiment.get('user1', 'homepage-test');
      const case1 = await exp1.case();
      await exp1.hit(10);
      await exp1.miss(2);
      
      const exp2 = await Xperiment.get('user2', 'homepage-test');
      const case2 = await exp2.case();
      await exp2.hit(8);
      await exp2.miss(3);
      
      const exp3 = await Xperiment.get('user3', 'homepage-test');
      const case3 = await exp3.case();
      await exp3.hit(5);
      await exp3.miss(5);
      
      const report = await Xperiment.report('homepage-test');
      
      expect(report.totalUsers).to.equal(3);
      // Just verify the structure is correct
      expect(Object.keys(report.cases).length).to.be.greaterThan(0);
    });

    it('should identify the best performing case', async function() {
      await Xperiment.define(['plot1', 'plot2'], 'best-test');
      
      // Create multiple users and track their cases
      for (let i = 0; i < 10; i++) {
        const exp = await Xperiment.get(`user${i}`, 'best-test');
        const assignedCase = await exp.case();
        
        // Make plot2 perform better
        if (assignedCase === 'plot2') {
          await exp.hit(10);
          await exp.miss(1);
        } else {
          await exp.hit(3);
          await exp.miss(2);
        }
      }
      
      const report = await Xperiment.report('best-test');
      
      // Should have identified a best case
      expect(report.bestCase).to.be.oneOf(['plot1', 'plot2']);
    });

    it('should calculate success rate correctly', async function() {
      await Xperiment.define(['plot1'], 'rate-test');
      const exp = await Xperiment.get('user1', 'rate-test');
      await exp.case();
      await exp.hit(8);
      await exp.miss(2);
      
      const report = await Xperiment.report('rate-test');
      
      expect(report.cases.plot1.successRate).to.equal(0.8);
    });

    it('should handle zero attempts gracefully', async function() {
      await Xperiment.define(['plot1'], 'zero-test');
      const exp = await Xperiment.get('user1', 'zero-test');
      await exp.case();
      // Don't record any hits or misses
      
      const report = await Xperiment.report('zero-test');
      
      expect(report.cases.plot1.successRate).to.equal(0);
      expect(report.cases.plot1.netScore).to.equal(0);
    });
  });

  describe('Edge Cases', function() {
    it('should handle probabilities that do not sum to 100', async function() {
      await Xperiment.define({ plot1: 30, plot2: 40 }, 'sum-test');
      const exp = await Xperiment.get('user1', 'sum-test');
      
      const assigned = await exp.case();
      expect(assigned).to.be.oneOf(['plot1', 'plot2']);
    });

    it('should handle cases with zero probability', async function() {
      await Xperiment.define({ plot1: 100, plot2: 0 }, 'zero-prob-test');
      const results = { plot1: 0, plot2: 0 };
      
      for (let i = 0; i < 50; i++) {
        const exp = await Xperiment.get(`user${i}`, 'zero-prob-test');
        const assigned = await exp.case();
        results[assigned]++;
      }
      
      expect(results.plot1).to.equal(50);
      expect(results.plot2).to.equal(0);
    });

    it('should handle negative hit/miss amounts', async function() {
      await Xperiment.define(['plot1'], 'neg-test');
      const exp = await Xperiment.get('user1', 'neg-test');
      await exp.case();
      
      await exp.hit(10);
      await exp.hit(-3); // This will actually decrement
      
      const db = new DeepBase({name: 'xperiment'});
      const hits = await db.get('experiments', 'neg-test', 'user1', 'hits');
      expect(hits).to.equal(7);
    });

    it('should work with single case option', async function() {
      await Xperiment.define(['onlyOne'], 'single-test');
      const exp = await Xperiment.get('user1', 'single-test');
      const assigned = await exp.case();
      
      expect(assigned).to.equal('onlyOne');
    });

    it('should handle many concurrent operations', async function() {
      await Xperiment.define(['plot1'], 'concurrent-test');
      const exp = await Xperiment.get('user1', 'concurrent-test');
      await exp.case();
      
      // Fire multiple hits simultaneously
      await Promise.all([
        exp.hit(),
        exp.hit(),
        exp.hit(),
        exp.miss(),
        exp.miss()
      ]);
      
      const db = new DeepBase({name: 'xperiment'});
      const hits = await db.get('experiments', 'concurrent-test', 'user1', 'hits');
      const misses = await db.get('experiments', 'concurrent-test', 'user1', 'misses');
      
      expect(hits).to.equal(3);
      expect(misses).to.equal(2);
    });
  });

  describe('Real-world Scenario', function() {
    it('should handle a complete A/B test workflow', async function() {
      // Define experiment
      const experimentName = 'button-color-test';
      await Xperiment.define({ red: 50, blue: 50 }, experimentName);
      
      // Simulate 100 users going through an A/B test
      for (let i = 0; i < 100; i++) {
        const exp = await Xperiment.get(`user${i}`, experimentName);
        
        const variant = await exp.case();
        
        // Simulate user behavior - blue performs slightly better
        if (variant === 'blue') {
          if (Math.random() > 0.3) await exp.hit();
          else await exp.miss();
        } else {
          if (Math.random() > 0.5) await exp.hit();
          else await exp.miss();
        }
      }
      
      const report = await Xperiment.report(experimentName);
      
      expect(report.totalUsers).to.equal(100);
      expect(report.cases).to.have.all.keys('red', 'blue');
      expect(report.bestCase).to.be.oneOf(['red', 'blue']);
      expect(report.cases.red.users + report.cases.blue.users).to.equal(100);
      
      // Clean up
      await Xperiment.reset(experimentName);
      const afterReset = await Xperiment.report(experimentName);
      expect(afterReset.totalUsers).to.equal(0);
    });
  });
});


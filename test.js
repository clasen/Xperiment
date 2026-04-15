import { expect } from 'chai';
import Xperiment from './index.js';
import DeepBase from 'deepbase';

describe('Xperiment - A/B Testing Library', function () {
    this.timeout(5000);

    // Clear database before each test for isolation
    beforeEach(async function () {
        // Clear all experiments
        const db = new DeepBase({ name: 'xperiment' });
        await db.del();

        // Clear singleton instances
        Xperiment.instances.clear();
    });

    after(async function () {
        const db = new DeepBase({ name: 'xperiment' });
        await db.del();
    });

    describe('Constructor & Singleton Pattern', function () {
        it('should create an instance with id and custom name with cases', async function () {
            await Xperiment.define({ plot1: 50, plot2: 50 }, 'test-experiment');
            const exp = await Xperiment.get('user1', 'test-experiment');
            expect(exp.id).to.equal('user1');
            expect(exp.name).to.equal('test-experiment');
            expect(exp.cases).to.deep.equal({ plot1: 50, plot2: 50 });
        });

        it('should create an instance with array cases (equal probability)', async function () {
            await Xperiment.define(['option1', 'option2', 'option3'], 'array-test');
            const exp = await Xperiment.get('user1', 'array-test');
            expect(exp.cases).to.deep.equal({
                option1: 1 / 3,
                option2: 1 / 3,
                option3: 1 / 3
            });
        });

        it('should return the same instance with get() method', async function () {
            await Xperiment.define({ a: 50, b: 50 }, 'test');
            const exp1 = await Xperiment.get('user1', 'test');
            const exp2 = await Xperiment.get('user1', 'test');
            expect(exp1).to.equal(exp2);
        });

        it('should return different instances for different id/name combinations', async function () {
            await Xperiment.define({ a: 50 }, 'test1');
            await Xperiment.define({ b: 50 }, 'test2');

            const exp1 = await Xperiment.get('user1', 'test1');
            const exp2 = await Xperiment.get('user1', 'test2');
            const exp3 = await Xperiment.get('user2', 'test1');

            expect(exp1).to.not.equal(exp2);
            expect(exp1).to.not.equal(exp3);
            expect(exp2).to.not.equal(exp3);
        });

        it('should throw error if experiment not defined', async function () {
            try {
                await Xperiment.get('user1', 'undefined-experiment');
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.include('not found');
            }
        });
    });

    describe('Case Assignment', function () {
        it('should assign a case from the defined options', async function () {
            await Xperiment.define(['plot1', 'plot2'], 'test');
            const exp = await Xperiment.get('user1', 'test');
            const assignedCase = await exp.case();

            expect(assignedCase).to.be.oneOf(['plot1', 'plot2']);
        });

        it('should persist the assigned case', async function () {
            await Xperiment.define(['plot1', 'plot2'], 'test');
            const exp = await Xperiment.get('user1', 'test');
            const firstCall = await exp.case();
            const secondCall = await exp.case();

            expect(firstCall).to.equal(secondCall);
        });

        it('should return the same case across different instances', async function () {
            await Xperiment.define(['plot1', 'plot2'], 'test-experiment');
            const exp1 = await Xperiment.get('user1', 'test-experiment');
            const case1 = await exp1.case();

            const exp2 = await Xperiment.get('user1', 'test-experiment');
            const case2 = await exp2.case();

            expect(case1).to.equal(case2);
        });

        it('should assign different cases to different users', async function () {
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

        it('should respect weighted probabilities', async function () {
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

        it('should handle equal distribution with array', async function () {
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

    describe('Metrics Tracking', function () {
        it('should increment hits by default amount (1)', async function () {
            await Xperiment.define(['plot1', 'plot2'], 'test');
            const exp = await Xperiment.get('user1', 'test');
            await exp.case();

            await exp.hit();
            await exp.hit();
            await exp.hit();

            const db = new DeepBase({ name: 'xperiment' });
            const hits = await db.get('test', 'experiments', 'user1', 'hits');
            expect(hits).to.equal(3);
        });

        it('should increment hits by custom amount', async function () {
            await Xperiment.define(['plot1', 'plot2'], 'test');
            const exp = await Xperiment.get('user1', 'test');
            await exp.case();

            await exp.hit(5);
            await exp.hit(3);

            const db = new DeepBase({ name: 'xperiment' });
            const hits = await db.get('test', 'experiments', 'user1', 'hits');
            expect(hits).to.equal(8);
        });

        it('should increment misses by default amount (1)', async function () {
            await Xperiment.define(['plot1', 'plot2'], 'test');
            const exp = await Xperiment.get('user1', 'test');
            await exp.case();

            await exp.miss();
            await exp.miss();

            const db = new DeepBase({ name: 'xperiment' });
            const misses = await db.get('test', 'experiments', 'user1', 'misses');
            expect(misses).to.equal(2);
        });

        it('should increment misses by custom amount', async function () {
            await Xperiment.define(['plot1', 'plot2'], 'test');
            const exp = await Xperiment.get('user1', 'test');
            await exp.case();

            await exp.miss(10);

            const db = new DeepBase({ name: 'xperiment' });
            const misses = await db.get('test', 'experiments', 'user1', 'misses');
            expect(misses).to.equal(10);
        });

        it('should track both hits and misses independently', async function () {
            await Xperiment.define(['plot1', 'plot2'], 'test');
            const exp = await Xperiment.get('user1', 'test');
            await exp.case();

            await exp.hit(3);
            await exp.miss(2);
            await exp.hit(1);

            const db = new DeepBase({ name: 'xperiment' });
            const hits = await db.get('test', 'experiments', 'user1', 'hits');
            const misses = await db.get('test', 'experiments', 'user1', 'misses');

            expect(hits).to.equal(4);
            expect(misses).to.equal(2);
        });
    });

    describe('Score Tracking', function () {
        it('should set a score value', async function () {
            await Xperiment.define(['plot1', 'plot2'], 'test');
            const exp = await Xperiment.get('user1', 'test');
            await exp.case();

            await exp.score(100);

            const db = new DeepBase({ name: 'xperiment' });
            const score = await db.get('test', 'experiments', 'user1', 'score');
            expect(score).to.equal(100);
        });

        it('should replace score value (non-incremental)', async function () {
            await Xperiment.define(['plot1', 'plot2'], 'test');
            const exp = await Xperiment.get('user1', 'test');
            await exp.case();

            await exp.score(50);
            await exp.score(30);
            await exp.score(100);

            const db = new DeepBase({ name: 'xperiment' });
            const score = await db.get('test', 'experiments', 'user1', 'score');
            expect(score).to.equal(100); // Should be the last value, not cumulative
        });

        it('should add score to hits in report calculations', async function () {
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

        it('should work with score only (no hits)', async function () {
            await Xperiment.define(['plot1'], 'engagement-test');
            const exp = await Xperiment.get('user1', 'engagement-test');
            await exp.case();

            await exp.score(145); // Engagement time in seconds

            const report = await Xperiment.report('engagement-test');

            expect(report.cases.plot1.totalHits).to.equal(145);
            expect(report.cases.plot1.totalMisses).to.equal(0);
        });

        it('should aggregate scores across multiple users', async function () {
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

        it('should combine score with hits and misses', async function () {
            await Xperiment.define(['plot1'], 'combined-test');
            const exp = await Xperiment.get('user1', 'combined-test');
            await exp.case();

            await exp.hit(3);
            await exp.score(50);
            await exp.hit(2);
            await exp.miss(5);

            const db = new DeepBase({ name: 'xperiment' });
            const hits = await db.get('combined-test', 'experiments', 'user1', 'hits');
            const score = await db.get('combined-test', 'experiments', 'user1', 'score');
            const misses = await db.get('combined-test', 'experiments', 'user1', 'misses');

            expect(hits).to.equal(5); // 3 + 2
            expect(score).to.equal(50);
            expect(misses).to.equal(5);

            const report = await Xperiment.report('combined-test');
            expect(report.cases.plot1.totalHits).to.equal(55); // hits + score
            expect(report.cases.plot1.netScore).to.equal(50); // 55 - 5
        });

        it('should default to 1 if no value provided', async function () {
            await Xperiment.define(['plot1'], 'default-test');
            const exp = await Xperiment.get('user1', 'default-test');
            await exp.case();

            await exp.score(); // No parameter

            const db = new DeepBase({ name: 'xperiment' });
            const score = await db.get('default-test', 'experiments', 'user1', 'score');
            expect(score).to.equal(1);
        });
    });

    describe('Reset Functionality', function () {
        it('should reset entire experiment for all users', async function () {
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
            const db = new DeepBase({ name: 'xperiment' });
            const data = await db.get('test-experiment', 'experiments');

            expect(data).to.satisfy(val => val === undefined || val === null);
        });

        it('should not affect other experiments when resetting one', async function () {
            await Xperiment.define(['plot1', 'plot2'], 'exp1');
            await Xperiment.define(['plot1', 'plot2'], 'exp2');

            const exp1 = await Xperiment.get('user1', 'exp1');
            const exp2 = await Xperiment.get('user1', 'exp2');

            await exp1.case();
            await exp1.hit(5);
            await exp2.case();
            await exp2.hit(3);

            await Xperiment.reset('exp1');

            const db = new DeepBase({ name: 'xperiment' });
            const data1 = await db.get('exp1', 'experiments');
            const data2 = await db.get('exp2', 'experiments');

            expect(data1).to.satisfy(val => val === undefined || val === null);
            expect(data2).to.not.satisfy(val => val === undefined || val === null);
        });

        it('should clear singleton instances for reset experiment', async function () {
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

    describe('Report Generation', function () {
        it('should generate report with no data', async function () {
            const report = await Xperiment.report('empty-experiment');

            expect(report.experiment).to.equal('empty-experiment');
            expect(report.totalUsers).to.equal(0);
            expect(report.cases).to.deep.equal({});
            expect(report.bestCase).to.be.null;
            expect(report.effectiveness).to.equal(0);
        });

        it('should generate report with single user', async function () {
            await Xperiment.define(['plot1', 'plot2'], 'test-exp');
            const exp = await Xperiment.get('user1', 'test-exp');
            await exp.case();
            await exp.hit(5);
            await exp.miss(2);

            const report = await Xperiment.report('test-exp');

            expect(report.totalUsers).to.equal(1);
            expect(report.cases).to.have.any.keys('plot1', 'plot2');
        });

        it('should aggregate metrics across multiple users', async function () {
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

        it('should identify the best performing case', async function () {
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

        it('should calculate success rate correctly', async function () {
            await Xperiment.define(['plot1'], 'rate-test');
            const exp = await Xperiment.get('user1', 'rate-test');
            await exp.case();
            await exp.hit(8);
            await exp.miss(2);

            const report = await Xperiment.report('rate-test');

            expect(report.cases.plot1.successRate).to.equal(0.8);
        });

        it('should handle zero attempts gracefully', async function () {
            await Xperiment.define(['plot1'], 'zero-test');
            const exp = await Xperiment.get('user1', 'zero-test');
            await exp.case();
            // Don't record any hits or misses

            const report = await Xperiment.report('zero-test');

            // Users without events are not counted
            expect(report.totalUsers).to.equal(0);
            expect(report.effectiveness).to.equal(0);
            expect(Object.keys(report.cases).length).to.equal(0);
        });
    });

    describe('Effectiveness Metric', function () {
        it('should return 0% effectiveness with no users with events', async function () {
            await Xperiment.define(['plot1', 'plot2'], 'no-events-test');
            const exp = await Xperiment.get('user1', 'no-events-test');
            await exp.case(); // Assign case but no hits/misses

            const report = await Xperiment.report('no-events-test');
            expect(report.effectiveness).to.equal(0);
        });

        it('should return ~50% effectiveness with half recommended users', async function () {
            await Xperiment.define(['plot1'], 'half-users-test');
            const halfUsers = Math.floor(Xperiment.RECOMMENDED_USERS / 2);
            
            // Create half the recommended users
            for (let i = 0; i < halfUsers; i++) {
                const exp = await Xperiment.get(`user${i}`, 'half-users-test');
                await exp.case();
                await exp.hit(5);
            }

            const report = await Xperiment.report('half-users-test');
            // halfUsers / Xperiment.RECOMMENDED_USERS = 50%
            expect(report.effectiveness).to.equal(50);
        });

        it('should return 100% effectiveness with recommended users or more', async function () {
            await Xperiment.define(['plot1'], 'full-users-test');
            
            // Create recommended number of users
            for (let i = 0; i < Xperiment.RECOMMENDED_USERS; i++) {
                const exp = await Xperiment.get(`user${i}`, 'full-users-test');
                await exp.case();
                await exp.hit(3);
            }

            const report = await Xperiment.report('full-users-test');
            // Xperiment.RECOMMENDED_USERS / Xperiment.RECOMMENDED_USERS = 100%
            expect(report.effectiveness).to.equal(100);
        });

        it('should not exceed 100% effectiveness with more than recommended users', async function () {
            await Xperiment.define(['plot1'], 'excess-users-test');
            const excessUsers = Math.floor(Xperiment.RECOMMENDED_USERS * 2.5);
            
            // Create more than recommended users
            for (let i = 0; i < excessUsers; i++) {
                const exp = await Xperiment.get(`user${i}`, 'excess-users-test');
                await exp.case();
                await exp.hit(5);
            }

            const report = await Xperiment.report('excess-users-test');
            // More than Xperiment.RECOMMENDED_USERS, but capped at 100%
            expect(report.effectiveness).to.equal(100);
        });

        it('should base effectiveness on minimum users across all cases', async function () {
            await Xperiment.define(['plot1', 'plot2'], 'multi-case-test');
            const db = new DeepBase({ name: 'xperiment' });

            // Plot1: More than recommended users (40 users)
            const plot1Users = Math.floor(Xperiment.RECOMMENDED_USERS * 1.33);
            for (let i = 0; i < plot1Users; i++) {
                await db.set('multi-case-test', 'experiments', `user_plot1_${i}`, 'case', 'plot1');
                await db.set('multi-case-test', 'experiments', `user_plot1_${i}`, 'hits', 5);
            }

            // Plot2: Only 1/3 of recommended users (10 users) - determines effectiveness
            const plot2Users = Math.floor(Xperiment.RECOMMENDED_USERS / 3);
            for (let i = 0; i < plot2Users; i++) {
                await db.set('multi-case-test', 'experiments', `user_plot2_${i}`, 'case', 'plot2');
                await db.set('multi-case-test', 'experiments', `user_plot2_${i}`, 'hits', 7);
            }

            const report = await Xperiment.report('multi-case-test');
            // Effectiveness based on minimum users (plot2Users / Xperiment.RECOMMENDED_USERS)
            const expectedEffectiveness = Math.round((plot2Users / Xperiment.RECOMMENDED_USERS) * 100);
            expect(report.effectiveness).to.equal(expectedEffectiveness);
        });

        it('should not count score values in effectiveness calculation', async function () {
            await Xperiment.define(['plot1'], 'score-effectiveness-test');
            
            // Create only 1 user with high score
            const exp = await Xperiment.get('user1', 'score-effectiveness-test');
            await exp.case();
            await exp.score(1000); // Large score doesn't affect user count

            const report = await Xperiment.report('score-effectiveness-test');
            // Only 1 user, so effectiveness = (1/30) * 100 = 3%
            expect(report.effectiveness).to.equal(3);
        });

        it('should base effectiveness on user count not score magnitude', async function () {
            await Xperiment.define(['plot1'], 'only-score-test');
            
            // Create recommended users, each with score
            for (let i = 0; i < Xperiment.RECOMMENDED_USERS; i++) {
                const exp = await Xperiment.get(`user${i}`, 'only-score-test');
                await exp.case();
                await exp.score(100); // Score value doesn't matter for effectiveness
            }

            const report = await Xperiment.report('only-score-test');
            // 30 users, each with score = 100% effectiveness
            expect(report.effectiveness).to.equal(100);
        });

        it('should calculate effectiveness correctly with decimal results', async function () {
            await Xperiment.define(['plot1'], 'decimal-test');
            const oneThirdUsers = Math.floor(Xperiment.RECOMMENDED_USERS / 3);
            
            // Create 1/3 of recommended users
            for (let i = 0; i < oneThirdUsers; i++) {
                const exp = await Xperiment.get(`user${i}`, 'decimal-test');
                await exp.case();
                await exp.hit(7);
            }

            const report = await Xperiment.report('decimal-test');
            // oneThirdUsers / Xperiment.RECOMMENDED_USERS = ~33.33%, should round to 33
            const expectedEffectiveness = Math.round((oneThirdUsers / Xperiment.RECOMMENDED_USERS) * 100);
            expect(report.effectiveness).to.equal(expectedEffectiveness);
        });

        it('should return coherent effectiveness value between 0 and 100', async function () {
            await Xperiment.define(['plot1', 'plot2'], 'coherence-test');

            // Create random number of events for different users
            for (let i = 0; i < 10; i++) {
                const exp = await Xperiment.get(`user${i}`, 'coherence-test');
                await exp.case();
                const hits = Math.floor(Math.random() * 20);
                const misses = Math.floor(Math.random() * 10);
                if (hits > 0) await exp.hit(hits);
                if (misses > 0) await exp.miss(misses);
            }

            const report = await Xperiment.report('coherence-test');

            // Effectiveness should always be between 0 and 100
            expect(report.effectiveness).to.be.at.least(0);
            expect(report.effectiveness).to.be.at.most(100);
            expect(Number.isInteger(report.effectiveness)).to.be.true;
        });
    });

    describe('Edge Cases', function () {
        it('should handle probabilities that do not sum to 100', async function () {
            await Xperiment.define({ plot1: 30, plot2: 40 }, 'sum-test');
            const exp = await Xperiment.get('user1', 'sum-test');

            const assigned = await exp.case();
            expect(assigned).to.be.oneOf(['plot1', 'plot2']);
        });

        it('should handle cases with zero probability', async function () {
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

        it('should handle negative hit/miss amounts', async function () {
            await Xperiment.define(['plot1'], 'neg-test');
            const exp = await Xperiment.get('user1', 'neg-test');
            await exp.case();

            await exp.hit(10);
            await exp.hit(-3); // This will actually decrement

            const db = new DeepBase({ name: 'xperiment' });
            const hits = await db.get('neg-test', 'experiments', 'user1', 'hits');
            expect(hits).to.equal(7);
        });

        it('should work with single case option', async function () {
            await Xperiment.define(['onlyOne'], 'single-test');
            const exp = await Xperiment.get('user1', 'single-test');
            const assigned = await exp.case();

            expect(assigned).to.equal('onlyOne');
        });

        it('should handle many concurrent operations', async function () {
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

            const db = new DeepBase({ name: 'xperiment' });
            const hits = await db.get('concurrent-test', 'experiments', 'user1', 'hits');
            const misses = await db.get('concurrent-test', 'experiments', 'user1', 'misses');

            expect(hits).to.equal(3);
            expect(misses).to.equal(2);
        });
    });

    describe('Real-world Scenario', function () {
        it('should handle a complete A/B test workflow', async function () {
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

    describe('Convergence Mode', function () {
        it('should set convergenceThreshold with defineConvergenceThreshold() using default name', async function () {
            await Xperiment.define(['control', 'variant']);
            await Xperiment.defineConvergenceThreshold(82);

            const db = new DeepBase({ name: 'xperiment' });
            const threshold = await db.get('default', 'config', 'convergenceThreshold');
            expect(threshold).to.equal(82);
        });

        it('should update cached instances when defineConvergenceThreshold() is called', async function () {
            await Xperiment.define(['control', 'variant'], 'conv-sync-test');
            const exp = await Xperiment.get('user1', 'conv-sync-test');
            expect(exp.convergenceThreshold).to.equal(null);

            await Xperiment.defineConvergenceThreshold(77, 'conv-sync-test');
            expect(exp.convergenceThreshold).to.equal(77);
        });

        it('should set convergenceThreshold in define()', async function () {
            await Xperiment.define(['control', 'variant'], 'conv-test-1', {
                convergenceThreshold: 80
            });

            const db = new DeepBase({ name: 'xperiment' });
            const threshold = await db.get('conv-test-1', 'config', 'convergenceThreshold');
            expect(threshold).to.equal(80);
        });

        it('should load convergenceThreshold from database', async function () {
            await Xperiment.define(['a', 'b'], 'conv-test-2', {
                convergenceThreshold: 75
            });

            const exp = await Xperiment.get('user1', 'conv-test-2');
            expect(exp.convergenceThreshold).to.equal(75);
        });

        it('should accept convergenceThreshold in get() method', async function () {
            await Xperiment.define(['a', 'b'], 'conv-test-3');

            const exp = await Xperiment.get('user1', {
                name: 'conv-test-3',
                convergenceThreshold: 85
            });

            expect(exp.convergenceThreshold).to.equal(85);
        });

        it('should accept convergenceThreshold in constructor', async function () {
            const exp = new Xperiment('user1', {
                name: 'conv-test-4',
                cases: ['a', 'b'],
                convergenceThreshold: 90
            });

            expect(exp.convergenceThreshold).to.equal(90);
        });

        it('should include convergenceThreshold and converged in report', async function () {
            await Xperiment.define(['control', 'variant'], 'conv-report-test', {
                convergenceThreshold: 80
            });

            const report = await Xperiment.report('conv-report-test');

            expect(report).to.have.property('convergenceThreshold');
            expect(report).to.have.property('converged');
            expect(report.convergenceThreshold).to.equal(80);
            expect(report.converged).to.be.false; // No data yet
        });

        it('should return converged=false when effectiveness below threshold', async function () {
            await Xperiment.define(['control', 'variant'], 'conv-below-test', {
                convergenceThreshold: 80
            });

            // Add some users but not enough to reach 80% effectiveness
            const db = new DeepBase({ name: 'xperiment' });
            // Only 10 users in each case (need 24 for 80% effectiveness)
            for (let i = 0; i < 10; i++) {
                await db.set('conv-below-test', 'experiments', `user_control_${i}`, 'case', 'control');
                await db.set('conv-below-test', 'experiments', `user_control_${i}`, 'hits', 5);
                
                await db.set('conv-below-test', 'experiments', `user_variant_${i}`, 'case', 'variant');
                await db.set('conv-below-test', 'experiments', `user_variant_${i}`, 'hits', 7);
            }

            const report = await Xperiment.report('conv-below-test');

            expect(report.effectiveness).to.be.lessThan(80);
            expect(report.converged).to.be.false;
        });

        it('should return converged=true when effectiveness reaches threshold', async function () {
            await Xperiment.define(['control', 'variant'], 'conv-reached-test', {
                convergenceThreshold: 80
            });

            // Add enough users to reach 80%+ effectiveness (24 users = 80%)
            const db = new DeepBase({ name: 'xperiment' });
            const usersNeeded = Math.ceil(Xperiment.RECOMMENDED_USERS * 0.8);
            
            for (let i = 0; i < usersNeeded; i++) {
                await db.set('conv-reached-test', 'experiments', `user_control_${i}`, 'case', 'control');
                await db.set('conv-reached-test', 'experiments', `user_control_${i}`, 'hits', 5);
                await db.set('conv-reached-test', 'experiments', `user_control_${i}`, 'misses', 2);
                
                await db.set('conv-reached-test', 'experiments', `user_variant_${i}`, 'case', 'variant');
                await db.set('conv-reached-test', 'experiments', `user_variant_${i}`, 'hits', 8);
                await db.set('conv-reached-test', 'experiments', `user_variant_${i}`, 'misses', 1);
            }

            const report = await Xperiment.report('conv-reached-test');

            // Both variants have 24 users, 24/30 = 80% effectiveness
            expect(report.effectiveness).to.be.at.least(80);
            expect(report.converged).to.be.true;
            expect(report.bestCase).to.be.oneOf(['control', 'variant']);
        });

        it('should assign winner when convergence threshold reached', async function () {
            await Xperiment.define(['control', 'variant'], 'conv-winner-test', {
                convergenceThreshold: 80
            });

            const db = new DeepBase({ name: 'xperiment' });
            const usersNeeded = Math.ceil(Xperiment.RECOMMENDED_USERS * 0.8);

            // Manually create data with variant as clear winner
            // Control: 24 users with 60% success rate
            for (let i = 0; i < usersNeeded; i++) {
                await db.set('conv-winner-test', 'experiments', `user_control_${i}`, 'case', 'control');
                await db.set('conv-winner-test', 'experiments', `user_control_${i}`, 'hits', 3);
                await db.set('conv-winner-test', 'experiments', `user_control_${i}`, 'misses', 2);
            }

            // Variant: 24 users with 88% success rate
            for (let i = 0; i < usersNeeded; i++) {
                await db.set('conv-winner-test', 'experiments', `user_variant_${i}`, 'case', 'variant');
                await db.set('conv-winner-test', 'experiments', `user_variant_${i}`, 'hits', 7);
                await db.set('conv-winner-test', 'experiments', `user_variant_${i}`, 'misses', 1);
            }

            // Check report shows convergence
            const report = await Xperiment.report('conv-winner-test');
            expect(report.converged).to.be.true;
            expect(report.bestCase).to.equal('variant');

            // New users should get the winner
            const newExp1 = await Xperiment.get('new-user-1', 'conv-winner-test');
            const case1 = await newExp1.case();
            expect(case1).to.equal('variant');

            const newExp2 = await Xperiment.get('new-user-2', 'conv-winner-test');
            const case2 = await newExp2.case();
            expect(case2).to.equal('variant');

            const newExp3 = await Xperiment.get('new-user-3', 'conv-winner-test');
            const case3 = await newExp3.case();
            expect(case3).to.equal('variant');
        });

        it('should continue random assignment before reaching threshold', async function () {
            await Xperiment.define(['control', 'variant'], 'conv-before-test', {
                convergenceThreshold: 100 // Very high threshold
            });

            // Add some data but not enough to reach 100% effectiveness
            const exp1 = await Xperiment.get('user1', 'conv-before-test');
            await exp1.case();
            await exp1.hit(15);

            const report = await Xperiment.report('conv-before-test');
            expect(report.converged).to.be.false;

            // New users should get random assignment
            const assignments = new Set();
            for (let i = 0; i < 20; i++) {
                const exp = await Xperiment.get(`new-user-${i}`, 'conv-before-test');
                const assigned = await exp.case();
                assignments.add(assigned);
            }

            // Should have both cases assigned (random distribution)
            expect(assignments.size).to.equal(2);
        });

        it('should handle convergenceThreshold of 0 (no convergence)', async function () {
            await Xperiment.define(['a', 'b'], 'no-conv-test', {
                convergenceThreshold: 0
            });

            // Even with 100% effectiveness, should not converge with threshold=0
            const db = new DeepBase({ name: 'xperiment' });
            for (let i = 0; i < Xperiment.RECOMMENDED_USERS; i++) {
                await db.set('no-conv-test', 'experiments', `user_a_${i}`, 'case', 'a');
                await db.set('no-conv-test', 'experiments', `user_a_${i}`, 'hits', 5);
            }

            const report = await Xperiment.report('no-conv-test');
            expect(report.effectiveness).to.equal(100);
            expect(report.converged).to.be.false; // threshold is 0, so no convergence

            // Should still assign randomly
            const exp = await Xperiment.get('new-user', 'no-conv-test');
            const assigned = await exp.case();
            expect(assigned).to.be.oneOf(['a', 'b']);
        });

        it('should not converge without threshold set', async function () {
            await Xperiment.define(['a', 'b'], 'no-threshold-test');

            // Add enough users for 100% effectiveness
            const db = new DeepBase({ name: 'xperiment' });
            for (let i = 0; i < Xperiment.RECOMMENDED_USERS; i++) {
                await db.set('no-threshold-test', 'experiments', `user_a_${i}`, 'case', 'a');
                await db.set('no-threshold-test', 'experiments', `user_a_${i}`, 'hits', 5);
            }

            const report = await Xperiment.report('no-threshold-test');
            expect(report.effectiveness).to.equal(100);
            expect(report.converged).to.be.false; // No threshold set
            expect(report.convergenceThreshold).to.be.null;
        });

        it('should return null convergenceThreshold in report when not set', async function () {
            await Xperiment.define(['a', 'b'], 'null-threshold-test');

            const report = await Xperiment.report('null-threshold-test');

            expect(report.convergenceThreshold).to.be.null;
            expect(report.converged).to.be.false;
        });

        it('should work with score() method for convergence calculation', async function () {
            await Xperiment.define(['control', 'variant'], 'conv-score-test', {
                convergenceThreshold: 75
            });

            const db = new DeepBase({ name: 'xperiment' });
            const usersNeeded = Math.ceil(Xperiment.RECOMMENDED_USERS * 0.75);

            // Use score with enough users to reach threshold
            for (let i = 0; i < usersNeeded; i++) {
                await db.set('conv-score-test', 'experiments', `user_control_${i}`, 'case', 'control');
                await db.set('conv-score-test', 'experiments', `user_control_${i}`, 'score', 100);
                
                await db.set('conv-score-test', 'experiments', `user_variant_${i}`, 'case', 'variant');
                await db.set('conv-score-test', 'experiments', `user_variant_${i}`, 'score', 150);
            }

            const report = await Xperiment.report('conv-score-test');

            // Both have 23 users (75% of 30), effectiveness = 75%
            expect(report.effectiveness).to.be.at.least(75);
            expect(report.converged).to.be.true;
        });
    });
});


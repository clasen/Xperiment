import DeepBase from 'deepbase';

class Xperiment {
    // Database instance for persistence
    static db = new DeepBase({ name: 'xperiment' });

    // Recommended users per variant for statistical confidence
    static RECOMMENDED_USERS = 30;

    // Singleton map to store instances by id:name
    static instances = new Map();

    /**
     * Define an experiment with its cases (persisted in database)
     * @static
     * @param {Object|Array} cases - Case probabilities as object {plot1: 50, plot2: 50} or array ['plot1', 'plot2'] for equal distribution
     * @param {string} [name='default'] - Experiment name (optional, defaults to 'default')
     * @param {Object} [options] - Additional options
     * @param {number} [options.convergenceThreshold] - Effectiveness % (0-100) to auto-select winner
     * @returns {Promise<void>}
     */
    static async define(cases, name = 'default', options = {}) {
        if (!cases) {
            throw new Error('cases parameter is required');
        }

        await Xperiment.db.set(name, 'config', 'cases', cases);

        if (options.convergenceThreshold !== undefined) {
            await Xperiment.db.set(name, 'config', 'convergenceThreshold', options.convergenceThreshold);
        }
    }

    /**
     * Constructor
     * @param {string} id - User identifier
     * @param {Object} options - Configuration options
     * @param {string} options.name - Experiment name (default: 'default')
     * @param {Object|Array} options.cases - Case probabilities. If not provided, will try to load from DB.
     * @param {number} options.convergenceThreshold - Effectiveness % (0-100) to auto-select winner
     */
    constructor(id, { name = 'default', cases, convergenceThreshold } = {}) {
        this.id = id;
        this.name = name;
        this.convergenceThreshold = convergenceThreshold;

        // If cases provided, use them (and optionally save to DB for future use)
        if (cases) {
            this._setCases(cases);
            // Optionally persist for future use (async, fire and forget)
            Xperiment.db.set(name, 'config', 'cases', cases).catch(() => { });
        } else {
            // Cases will be loaded async in get() method
            this.cases = {};
            this.caseNames = [];
        }
    }

    _setCases(cases) {
        // Convert array to object with equal probabilities
        if (Array.isArray(cases)) {
            if (cases.length === 0) {
                throw new Error('cases array cannot be empty');
            }
            const equalWeight = 1 / cases.length;
            this.cases = {};
            cases.forEach(caseName => {
                this.cases[caseName] = equalWeight;
            });
            this.caseNames = cases;
        } else if (typeof cases === 'object' && cases !== null) {
            this.cases = cases;
            this.caseNames = Object.keys(cases);
        } else {
            throw new Error('cases must be an array or object');
        }
    }

    /**
     * Get or create singleton instance for a given id and name
     * Automatically loads experiment configuration from database if not provided
     * @param {string} id - User identifier
     * @param {string|Object} nameOrOptions - Experiment name or options object
     * @param {Object|Array} cases - Optional: cases to define if experiment doesn't exist
     * @returns {Promise<Xperiment>} Singleton instance
     */
    static async get(id, nameOrOptions = 'default', cases = null) {
        // Handle flexible parameters: get(id, name, cases) or get(id, {name, cases})
        let name, casesParam, convergenceThreshold;

        if (typeof nameOrOptions === 'object') {
            name = nameOrOptions.name || 'default';
            casesParam = nameOrOptions.cases || cases;
            convergenceThreshold = nameOrOptions.convergenceThreshold;
        } else {
            name = nameOrOptions;
            casesParam = cases;
        }

        const key = `${id}:${name}`;

        if (!Xperiment.instances.has(key)) {
            // Try to load from DB first
            let loadedCases = await Xperiment.db.get(name, 'config', 'cases');
            let loadedThreshold = await Xperiment.db.get(name, 'config', 'convergenceThreshold');

            // If not in DB and cases provided, use them
            if (!loadedCases && casesParam) {
                loadedCases = casesParam;
                // Save to DB for future use
                await Xperiment.db.set(name, 'config', 'cases', casesParam);
            }

            // If still no cases, throw error
            if (!loadedCases) {
                throw new Error(`Experiment "${name}" not found. Use await Xperiment.define(cases, '${name}') first or pass cases parameter.`);
            }

            // Use provided threshold or loaded threshold
            const finalThreshold = convergenceThreshold !== undefined ? convergenceThreshold : loadedThreshold;

            Xperiment.instances.set(key, new Xperiment(id, {
                name,
                cases: loadedCases,
                convergenceThreshold: finalThreshold
            }));
        }

        return Xperiment.instances.get(key);
    }

    /**
     * Assign a case to the user (or return existing one)
     * Uses the cases defined in the constructor
     * If convergenceThreshold is set and reached, always returns the winning case
     * @returns {Promise<string>} The assigned case
     */
    async case() {
        // Check if user already has an assigned case
        // Structure is: name -> experiments -> userId -> case
        const userData = await Xperiment.db.get(this.name, 'experiments', this.id);
        if (userData && userData.case) {
            return userData.case;
        }

        // Check if convergence mode is enabled and threshold reached
        let assignedCase;
        if (this.convergenceThreshold !== undefined && this.convergenceThreshold > 0) {
            const report = await Xperiment.report(this.name);

            // If effectiveness reached threshold, assign the winning case
            if (report.effectiveness >= this.convergenceThreshold && report.bestCase) {
                assignedCase = report.bestCase;
            } else {
                // Otherwise, assign randomly
                assignedCase = this._selectRandomCase();
            }
        } else {
            // No convergence mode, assign randomly
            assignedCase = this._selectRandomCase();
        }

        // Store case assignment (stats will be added as they happen)
        await Xperiment.db.set(this.name, 'experiments', this.id, 'case', assignedCase);

        return assignedCase;
    }

    /**
     * Manually assign a specific case to the user
     * Allows manual override of automatic case assignment
     * @param {string} caseName - The case to assign
     * @returns {Promise<string>} The assigned case
     * @throws {Error} If case name is not defined in experiment
     */
    async setCase(caseName) {
        // Ensure cases are loaded
        if (this.caseNames.length === 0) {
            const loadedCases = await Xperiment.db.get(this.name, 'config', 'cases');
            if (loadedCases) {
                this._setCases(loadedCases);
            }
        }

        // Validate that the case exists
        if (!this.caseNames.includes(caseName)) {
            throw new Error(`Case "${caseName}" is not defined for experiment "${this.name}". Available cases: ${this.caseNames.join(', ')}`);
        }

        // Store case assignment manually
        await Xperiment.db.set(this.name, 'experiments', this.id, 'case', caseName);

        return caseName;
    }

    _selectRandomCase() {
        const options = this.caseNames;

        // Weighted random selection
        const weights = options.map(opt => this.cases[opt] || 0);
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);

        if (totalWeight === 0) {
            // Fallback to equal distribution if all weights are 0
            return options[Math.floor(Math.random() * options.length)];
        }

        let random = Math.random() * totalWeight;

        for (let i = 0; i < options.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return options[i];
            }
        }

        return options[options.length - 1];
    }

    /**
     * Record a success/hit for this user
     * @param {number} amount - Amount to increment (default: 1)
     * @returns {Promise<void>}
     */
    async hit(amount = 1) {
        await this.case(); // Ensure case is assigned
        await Xperiment.db.inc(this.name, 'experiments', this.id, 'hits', amount);
    }

    /**
     * Record a failure/miss for this user
     * @param {number} amount - Amount to increment (default: 1)
     * @returns {Promise<void>}
     */
    async miss(amount = 1) {
        await this.case(); // Ensure case is assigned
        await Xperiment.db.inc(this.name, 'experiments', this.id, 'misses', amount);
    }

    /**
     * Set a fixed score value for this user (non-incremental)
     * This value will be added to hits in calculations
     * @param {number} value - Fixed score value to set (default: 1)
     * @returns {Promise<void>}
     */
    async score(value = 1) {
        await this.case(); // Ensure case is assigned
        await Xperiment.db.set(this.name, 'experiments', this.id, 'score', value);
    }

    /**
     * Reset an entire experiment (all users)
     * @static
     * @param {string} name - Experiment name to reset (default: 'default')
     * @returns {Promise<void>}
     */
    static async reset(name = 'default') {
        await Xperiment.db.del(name, 'experiments');

        // Clear instances from singleton map for this experiment
        const keysToDelete = [];
        for (const [key] of Xperiment.instances) {
            if (key.endsWith(`:${name}`)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => Xperiment.instances.delete(key));
    }

    /**
     * Generate a report of experiment effectiveness
     * @static
     * @param {string} name - Experiment name (default: 'default')
     * @returns {Promise<Object>} Report with effectiveness metrics
     */
    static async report(name = 'default') {
        const experimentData = await Xperiment.db.get(name, 'experiments');
        const convergenceThreshold = await Xperiment.db.get(name, 'config', 'convergenceThreshold');

        if (!experimentData || typeof experimentData !== 'object') {
            return {
                experiment: name,
                totalUsers: 0,
                cases: {},
                bestCase: null,
                effectiveness: 0,
                convergenceThreshold: convergenceThreshold || null,
                converged: false,
                message: 'No data available for this experiment'
            };
        }

        const caseStats = {};
        let totalUsers = 0;

        // Aggregate data by case
        // Structure is: userId -> case (and stats)
        // Use DeepBase.entries() for efficient iteration
        for (const userData of await Xperiment.db.values(name, 'experiments')) {
            if (userData && userData.case) {
                const caseName = userData.case;
                const hits = userData.hits || 0;
                const score = userData.score || 0;
                const misses = userData.misses || 0;

                // Only count users with at least one event
                const hasEvents = hits > 0 || score > 0 || misses > 0;
                if (!hasEvents) continue;

                if (!caseStats[caseName]) {
                    caseStats[caseName] = {
                        users: 0,
                        totalHits: 0,
                        totalMisses: 0,
                        netScore: 0,
                        successRate: 0
                    };
                }

                caseStats[caseName].users++;
                caseStats[caseName].totalHits += hits + score;
                caseStats[caseName].totalMisses += misses;
                totalUsers++;
            }
        }

        // Calculate metrics for each case
        let bestCase = null;
        let bestScore = -Infinity;
        let minUsers = Infinity;

        for (const [caseName, stats] of Object.entries(caseStats)) {
            stats.netScore = stats.totalHits - stats.totalMisses;
            const totalEvents = stats.totalHits + stats.totalMisses;
            stats.successRate = totalEvents > 0 ? stats.totalHits / totalEvents : 0;

            // Track minimum users across all cases
            if (stats.users < minUsers) {
                minUsers = stats.users;
            }

            // Determine best case based on net score
            if (stats.netScore > bestScore) {
                bestScore = stats.netScore;
                bestCase = caseName;
            }
        }

        // Calculate effectiveness: simple formula based on minimum users per case
        // Need ~30 users per variant to be reasonably confident
        const effectiveness = minUsers === Infinity ? 0 : Math.min((minUsers / Xperiment.RECOMMENDED_USERS) * 100, 100);
        const roundedEffectiveness = Math.round(effectiveness);

        // Check if converged (threshold reached)
        const converged = convergenceThreshold !== undefined &&
            convergenceThreshold > 0 &&
            roundedEffectiveness >= convergenceThreshold &&
            bestCase !== null;

        return {
            experiment: name,
            totalUsers,
            cases: caseStats,
            bestCase,
            effectiveness: roundedEffectiveness,
            convergenceThreshold: convergenceThreshold || null,
            converged
        };
    }
}

export default Xperiment;
export { Xperiment };


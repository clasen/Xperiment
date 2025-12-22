import DeepBase from 'deepbase';

const db = new DeepBase({name: 'xperiment'});

/**
 * Xperiment - A/B Testing Library
 * Simple but powerful A/B testing with persistent storage
 */
class Xperiment {
  // Singleton map to store instances by id:name
  static instances = new Map();

  /**
   * Define an experiment with its cases (persisted in database)
   * @static
   * @param {Object|Array} cases - Case probabilities as object {plot1: 50, plot2: 50} or array ['plot1', 'plot2'] for equal distribution
   * @param {string} [name='default'] - Experiment name (optional, defaults to 'default')
   * @returns {Promise<void>}
   */
  static async define(cases, name = 'default') {
    if (!cases) {
      throw new Error('cases parameter is required');
    }
    
    await db.set('config', name, 'cases', cases);
  }

  /**
   * Constructor
   * @param {string} id - User identifier
   * @param {Object} options - Configuration options
   * @param {string} options.name - Experiment name (default: 'default')
   * @param {Object|Array} options.cases - Case probabilities. If not provided, will try to load from DB.
   */
  constructor(id, { name = 'default', cases } = {}) {
    this.id = id;
    this.name = name;
    
    // If cases provided, use them (and optionally save to DB for future use)
    if (cases) {
      this._setCases(cases);
      // Optionally persist for future use (async, fire and forget)
      db.set('config', name, 'cases', cases).catch(() => {});
    } else {
      // Cases will be loaded async in get() method
      this.cases = {};
      this.caseNames = [];
    }
  }

  /**
   * Internal method to set cases from array or object
   * @private
   */
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
    let name, casesParam;
    
    if (typeof nameOrOptions === 'object') {
      name = nameOrOptions.name || 'default';
      casesParam = nameOrOptions.cases || cases;
    } else {
      name = nameOrOptions;
      casesParam = cases;
    }
    
    const key = `${id}:${name}`;
    
    if (!Xperiment.instances.has(key)) {
      // Try to load from DB first
      let loadedCases = await db.get('config', name, 'cases');
      
      // If not in DB and cases provided, use them
      if (!loadedCases && casesParam) {
        loadedCases = casesParam;
        // Save to DB for future use
        await db.set('config', name, 'cases', casesParam);
      }
      
      // If still no cases, throw error
      if (!loadedCases) {
        throw new Error(`Experiment "${name}" not found. Use await Xperiment.define(cases, '${name}') first or pass cases parameter.`);
      }
      
      Xperiment.instances.set(key, new Xperiment(id, { name, cases: loadedCases }));
    }
    
    return Xperiment.instances.get(key);
  }

  /**
   * Assign a case to the user (or return existing one)
   * Uses the cases defined in the constructor
   * @returns {Promise<string>} The assigned case
   */
  async case() {
    // Check if user already has an assigned case
    // Structure is: experiments -> name -> userId -> case
    const userData = await db.get('experiments', this.name, this.id);
    if (userData && userData.case) {
      return userData.case;
    }

    // Assign a new case based on probabilities
    const assignedCase = this._selectRandomCase();
    
    // Store case assignment (stats will be added as they happen)
    await db.set('experiments', this.name, this.id, 'case', assignedCase);

    return assignedCase;
  }

  /**
   * Select a random case based on configured probabilities
   * @private
   * @returns {string} Selected case
   */
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
    await db.inc('experiments', this.name, this.id, 'hits', amount);
  }

  /**
   * Record a failure/miss for this user
   * @param {number} amount - Amount to increment (default: 1)
   * @returns {Promise<void>}
   */
  async miss(amount = 1) {
    await this.case(); // Ensure case is assigned
    await db.inc('experiments', this.name, this.id, 'misses', amount);
  }

  /**
   * Set a fixed score value for this user (non-incremental)
   * This value will be added to hits in calculations
   * @param {number} value - Fixed score value to set (default: 1)
   * @returns {Promise<void>}
   */
  async score(value = 1) {
    await this.case(); // Ensure case is assigned
    await db.set('experiments', this.name, this.id, 'score', value);
  }

  /**
   * Reset an entire experiment (all users)
   * @static
   * @param {string} name - Experiment name to reset (default: 'default')
   * @returns {Promise<void>}
   */
  static async reset(name = 'default') {
    await db.del('experiments', name);
    
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
    const experimentData = await db.get('experiments', name);
    
    if (!experimentData || typeof experimentData !== 'object') {
      return {
        experiment: name,
        totalUsers: 0,
        cases: {},
        bestCase: null,
        effectiveness: 0,
        message: 'No data available for this experiment'
      };
    }

    const caseStats = {};
    let totalUsers = 0;

    // Aggregate data by case
    // Structure is: userId -> case (and stats)
    // Use DeepBase.entries() for efficient iteration
    for (const userData of await db.values('experiments', name)) {
      if (userData && userData.case) {
        const caseName = userData.case;
        
        if (!caseStats[caseName]) {
          caseStats[caseName] = {
            users: 0,
            totalHits: 0,
            totalMisses: 0,
            netScore: 0,
            successRate: 0
          };
        }

        const hits = userData.hits || 0;
        const score = userData.score || 0;
        const misses = userData.misses || 0;

        caseStats[caseName].users++;
        caseStats[caseName].totalHits += hits + score;
        caseStats[caseName].totalMisses += misses;
        totalUsers++;
      }
    }

    // Calculate metrics for each case
    let bestCase = null;
    let bestScore = -Infinity;
    let minEvents = Infinity;

    for (const [caseName, stats] of Object.entries(caseStats)) {
      stats.netScore = stats.totalHits - stats.totalMisses;
      const totalEvents = stats.totalHits + stats.totalMisses;
      stats.successRate = totalEvents > 0 ? stats.totalHits / totalEvents : 0;

      // Track minimum events across all cases
      if (totalEvents < minEvents) {
        minEvents = totalEvents;
      }

      // Determine best case based on net score
      if (stats.netScore > bestScore) {
        bestScore = stats.netScore;
        bestCase = caseName;
      }
    }

    // Calculate effectiveness: simple formula based on minimum events
    // Need ~30 events per variant to be reasonably confident
    const recommendedEvents = 30;
    const effectiveness = minEvents === Infinity ? 0 : Math.min((minEvents / recommendedEvents) * 100, 100);

    return {
      experiment: name,
      totalUsers,
      cases: caseStats,
      bestCase,
      effectiveness: Math.round(effectiveness)
    };
  }
}

export default Xperiment;
export { Xperiment };


# 🧪 Xperiment: A/B testing, simplified

- **Optimize like a pro.** Intuition doesn't count, numbers do.
- Make data-driven decisions, not guesses.

## Features

- 🎯 **Simple API** - Easy to integrate and use
- 💾 **Persistent Storage** - Uses DeepBase for automatic persistence
- 🎲 **Configurable Probabilities** - Set custom weight for each variant
- 📊 **Built-in Analytics** - Track hits/misses and generate effectiveness reports
- 🔄 **Singleton Pattern** - Ensures consistent user experience
- ⚡ **Async/Await** - Modern JavaScript API
- 🎖️ **Auto-Convergence** - Automatically switch to winning variant after statistical confidence

## Installation

```bash
npm install xperiment
```

## Demo Examples

Check out the [demo folder](https://github.com/clasen/Xperiment/tree/main/demo) for complete, runnable examples:

- **basic.js** - Simple A/B test with two variants
- **multivariant.js** - Testing 4 variants simultaneously (A/B/C/D)
- **weighted-tracking.js** - Using weighted scores for different actions
- **score-usage.js** - Using score() for engagement time tracking
- **dashboard.js** - Monitoring multiple experiments with a visual dashboard
- **complete-flow.js** - Multi-stage funnel testing for e-commerce
- **convergence-mode.js** - Auto-convergence to winning variant

Run any example:
```bash
node demo/basic.js
node demo/score-usage.js
node demo/dashboard.js
node demo/convergence-mode.js
```

## Quick Start

### Simple Usage (Single Experiment)

```javascript
import Xperiment from 'xperiment';

// Create experiment directly with cases
const exp = new Xperiment('user123', {
    cases: ['variant_a', 'variant_b']
    // name is optional, defaults to 'default'
});

// Get assigned variant
const variant = await exp.case();
console.log(`User assigned to: ${variant}`);

// Track outcomes
await exp.hit();
await exp.miss();
```

### Production Usage (Multiple Users)

```javascript
import Xperiment from 'xperiment';

// 1. Define experiment once (persists in database)
await Xperiment.define(['variant_a', 'variant_b'], 'homepage-test');
// Or with custom weights: { variant_a: 30, variant_b: 70 }

// 2. Get experiment instance for each user (loads config from DB)
const exp = await Xperiment.get('user123', 'homepage-test');

// 3. Get the assigned variant (persists automatically)
const variant = await exp.case();

// 4. Track outcomes
await exp.hit(5);    // Add 5 points
await exp.miss(2);   // Subtract 2 points

// 5. Generate effectiveness report
const report = await Xperiment.report('homepage-test');
console.log(`Best variant: ${report.bestCase}`);

// 6. Reset experiment (clears all data)
await Xperiment.reset('homepage-test');
```

### Inline Usage (Quick & Simple)

```javascript
// Define and get in one step
const exp = await Xperiment.get('user123', 'my-test', ['option_a', 'option_b']);
const variant = await exp.case();
```

## API Reference

### Static Method: define()

Define an experiment with its cases. Configuration is persisted in the database.

```javascript
await Xperiment.define(cases, name = 'default', options = {})
```

**Parameters:**
- `cases` (Array|Object) - Case definitions
  - Array: `['option1', 'option2']` - Equal probability (1/n each)
  - Object: `{option1: 30, option2: 70}` - Custom weights
- `name` (string) - Experiment name (optional, defaults to `'default'`)
- `options` (object) - Additional options (optional)
  - `convergenceThreshold` (number) - Effectiveness % (0-100) to auto-select winner

**Example:**

```javascript
// Equal distribution
await Xperiment.define(['headline_a', 'headline_b', 'headline_c'], 'headline-test');

// Custom weights
await Xperiment.define({ red: 30, blue: 70 }, 'button-test');

// Using default name (no need to specify)
await Xperiment.define(['option_a', 'option_b']);

// With convergence threshold (auto-select winner at 80% effectiveness)
await Xperiment.define(['control', 'variant'], 'auto-optimize-test', {
  convergenceThreshold: 80
});
```

### Constructor

Create an experiment instance directly. Ideal for simple use cases.

```javascript
new Xperiment(id, options)
```

**Parameters:**
- `id` (string) - Unique user identifier
- `options` (object) - Configuration options
  - `name` (string) - Experiment name (default: `'default'`)
  - `cases` (Array|Object) - Case definitions (optional if loading from DB)
  - `convergenceThreshold` (number) - Effectiveness % (0-100) to auto-select winner

**Examples:**

```javascript
// Simple: just cases (uses 'default' name)
const exp1 = new Xperiment('user456', {
    cases: ['red', 'blue']
});

// With custom name and weights
const exp2 = new Xperiment('user456', {
    name: 'button-color-test',
    cases: { red: 30, blue: 70 }
});

// Array with equal probability
const exp3 = new Xperiment('user456', {
    name: 'headline-test',
    cases: ['a', 'b', 'c', 'd']  // 25% each
});

// With convergence threshold
const exp4 = new Xperiment('user456', {
    name: 'auto-test',
    cases: ['control', 'variant'],
    convergenceThreshold: 85  // Auto-select winner at 85% effectiveness
});
```

### Static Method: get()

Get or create a singleton instance for a user/experiment combination. Automatically loads experiment configuration from database.

```javascript
await Xperiment.get(id, nameOrOptions = 'default', cases = null)
```

**Parameters:**
- `id` (string) - Unique user identifier
- `nameOrOptions` (string|Object) - Experiment name or options object
  - As string: `'experiment-name'`
  - As object: `{ name: 'experiment-name', cases: [...], convergenceThreshold: 80 }`
- `cases` (Array|Object) - Optional: cases to define if experiment doesn't exist

**Returns:** Promise<Xperiment> - Experiment instance

**Examples:**

```javascript
// Load from DB (experiment must be defined first)
await Xperiment.define(['control', 'treatment'], 'my-test');
const exp1 = await Xperiment.get('user123', 'my-test');

// Inline definition
const exp2 = await Xperiment.get('user123', 'quick-test', ['a', 'b']);

// With options object
const exp3 = await Xperiment.get('user123', {
    name: 'flex-test',
    cases: ['x', 'y', 'z']
});

// Default experiment (no name needed)
const exp4 = await Xperiment.get('user123'); // uses 'default' name

// With convergence threshold
const exp5 = await Xperiment.get('user123', {
    name: 'auto-test',
    convergenceThreshold: 75
});
```

### Instance Method: case()

Get the assigned case for this user. Returns the same case on subsequent calls.

```javascript
await exp.case()
```

**Returns:** Promise<string> - The assigned case

**Example:**

```javascript
await Xperiment.define(['control', 'treatment'], 'my-test');
const exp = await Xperiment.get('user123', 'my-test');
const variant = await exp.case();
// Returns 'control' or 'treatment' based on configured probabilities
// Always returns the same value for this user
```

### Instance Method: hit()

Record a positive outcome (success).

```javascript
await exp.hit(amount = 1)
```

**Parameters:**
- `amount` (number) - Points to add (default: 1)

**Example:**

```javascript
await exp.hit();    // Add 1 point
await exp.hit(10);  // Add 10 points
```

### Instance Method: miss()

Record a negative outcome (failure).

```javascript
await exp.miss(amount = 1)
```

**Parameters:**
- `amount` (number) - Points to add (default: 1)

**Example:**

```javascript
await exp.miss();   // Add 1 miss
await exp.miss(5);  // Add 5 misses
```

### Instance Method: score()

Set a fixed score value for a user (non-incremental). Unlike `hit()` which adds to the total, `score()` sets a specific value that will be added to hits in calculations.

```javascript
await exp.score(value = 1)
```

**Parameters:**
- `value` (number) - Fixed score value to set (default: 1)

**Use cases:**
- Engagement time (seconds/minutes)
- Scroll depth percentage (0-100)
- Revenue per user
- Any metric where you track a final accumulated value per user

**Example:**

```javascript
// Track time spent on page
const engagementSeconds = 145;
await exp.score(engagementSeconds);

// Track scroll depth
const scrollPercentage = 87;
await exp.score(scrollPercentage);
```

**Note:** Each call to `score()` replaces the previous value (not incremental). The score value is added to hits when generating reports.

### Static Method: reset()

Reset an entire experiment, deleting all user data.

```javascript
await Xperiment.reset(name = 'default')
```

**Parameters:**
- `name` (string) - Experiment name to reset (default: `'default'`)

**Example:**

```javascript
await Xperiment.reset('homepage-test');
await Xperiment.reset(); // Resets 'default' experiment
```

### Static Method: report()

Generate an effectiveness report for an experiment.

```javascript
await Xperiment.report(name = 'default')
```

**Parameters:**
- `name` (string) - Experiment name (default: `'default'`)

**Returns:** Promise<Object> - Report with the following structure:

```javascript
{
    experiment: 'experiment-name',
    totalUsers: 100,
    cases: {
        'variant_a': {
            users: 50,
            totalHits: 300,
            totalMisses: 100,
            netScore: 200,
            successRate: 0.75
        },
        'variant_b': {
            users: 50,
            totalHits: 250,
            totalMisses: 150,
            netScore: 100,
            successRate: 0.625
        }
    },
    bestCase: 'variant_a',
    effectiveness: 100,
    convergenceThreshold: 80,  // null if not set
    converged: true            // true if effectiveness >= convergenceThreshold
}
```

**Example:**

```javascript
const report = await Xperiment.report('homepage-test');
console.log(`Total users tested: ${report.totalUsers}`);
console.log(`Winner: ${report.bestCase}`);
console.log(`Success rate: ${report.cases[report.bestCase].successRate * 100}%`);
console.log(`Converged: ${report.converged}`);
```

## Convergence Mode

Convergence mode allows your experiment to automatically switch from testing mode to optimization mode once you reach a certain level of statistical confidence (effectiveness).

### How It Works

1. **During testing phase**: Users are randomly assigned to variants based on configured probabilities
2. **After threshold reached**: When effectiveness reaches your configured threshold (e.g., 80%), new users automatically receive the winning variant
3. **Continuous optimization**: The experiment seamlessly transitions from exploration to exploitation

### Configuration

Set the `convergenceThreshold` parameter (0-100) representing the effectiveness percentage at which to auto-select the winner:

```javascript
// Define with convergence threshold
await Xperiment.define(['control', 'variant'], 'my-experiment', {
  convergenceThreshold: 80  // Switch to winner at 80% effectiveness
});

// Get with convergence threshold
const exp = await Xperiment.get('user123', {
  name: 'my-experiment',
  convergenceThreshold: 80
});

// Constructor with convergence threshold
const exp = new Xperiment('user123', {
  name: 'my-experiment',
  cases: ['control', 'variant'],
  convergenceThreshold: 80
});
```

### Example

```javascript
// Define experiment with 75% convergence threshold
await Xperiment.define(['old_design', 'new_design'], 'homepage-redesign', {
  convergenceThreshold: 75
});

// As users interact, track outcomes
for (let i = 0; i < 100; i++) {
  const exp = await Xperiment.get(`user${i}`, 'homepage-redesign');
  const design = await exp.case();
  
  // Track user behavior
  if (userConverted) {
    await exp.hit();
  } else {
    await exp.miss();
  }
}

// Check convergence status
const report = await Xperiment.report('homepage-redesign');
console.log(`Effectiveness: ${report.effectiveness}%`);
console.log(`Converged: ${report.converged}`);
console.log(`Best variant: ${report.bestCase}`);

// New users after convergence automatically get the winner
const newExp = await Xperiment.get('new_user', 'homepage-redesign');
const variant = await newExp.case();
// If converged, variant will always be the winning case
```

### Understanding Effectiveness

Effectiveness is calculated based on the minimum number of events across all variants:
- **0%**: No data collected yet
- **50%**: Half the recommended events (15 out of 30 per variant)
- **100%**: Recommended events or more (30+ events per variant)

The recommended number of events is `30` per variant (exported as `RECOMMENDED_EVENTS`).

### When to Use Convergence

- **Gradual rollouts**: Start with A/B testing, automatically roll out winner
- **Self-optimizing systems**: Let the system automatically optimize based on data
- **Resource efficiency**: Stop splitting traffic once you have a clear winner
- **Continuous improvement**: Keep collecting data while serving the best variant

### Notes

- Set `convergenceThreshold: 0` to disable convergence (always test)
- Omit the parameter entirely for traditional A/B testing (no auto-convergence)
- Converged experiments still track metrics for existing users
- The report's `converged` field indicates if threshold has been reached

## Usage Examples

### Simple Single Experiment

```javascript
import Xperiment from 'xperiment';

// No need to define or name - just use it!
const exp = new Xperiment('user_alice', {
    cases: ['old_checkout', 'new_checkout']
});

const variant = await exp.case();

// Show appropriate UI
if (variant === 'new_checkout') {
    showNewCheckout();
} else {
    showOldCheckout();
}

// Track conversion
if (userCompletesPurchase()) {
    await exp.hit();
} else {
    await exp.miss();
}
```

### Production with Multiple Users

```javascript
import Xperiment from 'xperiment';

// Define experiment once (persists in database)
await Xperiment.define(['old_checkout', 'new_checkout'], 'checkout-flow');

async function testUserJourney(userId) {
    // Get experiment instance for user (loads from DB)
    const exp = await Xperiment.get(userId, 'checkout-flow');
    
    const variant = await exp.case();
    
    // Show appropriate UI based on variant
    if (variant === 'new_checkout') {
        showNewCheckout();
    } else {
        showOldCheckout();
    }
    
    // Track conversion
    if (userCompletesPurchase()) {
        await exp.hit();
    } else {
        await exp.miss();
    }
}
```

### Weighted Distribution

```javascript
// Give 80% of traffic to control, 20% to new feature
await Xperiment.define({ control: 80, new_feature: 20 }, 'feature-rollout');

const exp = await Xperiment.get('user789', 'feature-rollout');
const variant = await exp.case();
```

### Multi-variant Testing (Equal Distribution)

```javascript
// Define with array for equal probability (25% each)
await Xperiment.define([
    'headline_a', 
    'headline_b', 
    'headline_c', 
    'headline_d'
], 'landing-page-headline');

const exp = await Xperiment.get('user999', 'landing-page-headline');
const headline = await exp.case();
```

### Analytics Dashboard

```javascript
async function showDashboard() {
    const experiments = ['homepage-test', 'checkout-flow', 'pricing-test'];
    
    for (const name of experiments) {
        const report = await Xperiment.report(name);
        
        console.log(`\n=== ${report.experiment} ===`);
        console.log(`Total Users: ${report.totalUsers}`);
        console.log(`Best Case: ${report.bestCase}`);
        
        for (const [caseName, stats] of Object.entries(report.cases)) {
            console.log(`\n${caseName}:`);
            console.log(`  Users: ${stats.users}`);
            console.log(`  Success Rate: ${(stats.successRate * 100).toFixed(2)}%`);
            console.log(`  Net Score: ${stats.netScore}`);
        }
    }
}
```

### Score-based Tracking

```javascript
await Xperiment.define(['layout_a', 'layout_b'], 'engagement-test');

const exp = await Xperiment.get('user555', 'engagement-test');
const layout = await exp.case();

// Track different levels of engagement
if (userClicksButton()) {
    await exp.hit(1);
}
if (userSharesContent()) {
    await exp.hit(5);
}
if (userMakesPurchase()) {
    await exp.hit(10);
}
if (userBounces()) {
    await exp.miss(1);
}
```

## Testing

Run the test suite:

```bash
npm test
```

The library includes comprehensive tests covering:
- Constructor and singleton pattern
- Case assignment and persistence
- Metrics tracking
- Reset functionality
- Report generation
- Edge cases and error handling

## How It Works

1. **Assignment**: When a user first encounters an experiment, they're randomly assigned to a case based on configured probabilities
2. **Persistence**: The assignment is immediately saved to DeepBase and will remain consistent for that user
3. **Tracking**: As the user interacts with your application, you track positive (hit) and negative (miss) outcomes
4. **Analysis**: Generate reports to see which variant performs best based on net score (hits - misses) and success rate

## Best Practices

1. **Choose meaningful experiment names** - Use descriptive names like `'homepage-hero-test'` instead of `'test1'`
2. **Track meaningful events** - Use hits for conversions, not just clicks
3. **Use weighted scoring** - Give more points to important actions (e.g., purchase = 10 points, signup = 5 points)
4. **Let tests run long enough** - Collect sufficient data before making decisions (aim for 30+ events per variant)
5. **Reset carefully** - Resetting an experiment deletes ALL user data for that experiment
6. **Use convergence wisely** - Set threshold around 70-90% for good balance between confidence and speed
7. **Monitor convergence** - Check the `converged` field in reports to know when auto-optimization begins

## Data Structure

DeepBase stores data in the following structure:

```
config/
  {experimentName}/
    cases: ['variant_a', 'variant_b'] or { variant_a: 50, variant_b: 50 }
    convergenceThreshold: 80  (optional)

experiments/
  {experimentName}/
    {userId}/
      case: 'variant_a'
      hits: 25
      misses: 10
      score: 145  (optional, set via score() method)
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.


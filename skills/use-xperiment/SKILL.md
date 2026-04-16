---
name: use-xperiment
description: Guide for using the Xperiment A/B testing library. Use when implementing experiments, split tests, variant testing, or tracking user behavior across different cases.
---

# Use Xperiment

Comprehensive guide for using **Xperiment**, a powerful A/B testing library for Node.js applications that provides persistent experiment tracking with database storage.

## When to Use

- Implementing A/B testing or multivariate experiments
- Split testing different features, UI variants, or algorithms
- Tracking user behavior across different experiment cases
- Measuring conversion rates and success metrics
- Auto-convergence to winning variants based on effectiveness
- Need persistent experiment data across application restarts

## Core Concepts

**Xperiment** manages experiments where users are assigned to different **cases** (variants) and their actions are tracked to measure effectiveness.

- **Cases**: Different variants in your experiment (e.g., 'control', 'variant-a', 'variant-b')
- **Hits**: Successful actions or conversions
- **Misses**: Failed actions or negative outcomes
- **Score**: Fixed value tracking (non-incremental)
- **Convergence**: Automatic selection of winning variant when threshold is reached

## Instructions

### 1. Defining an Experiment

Use `Xperiment.define()` to create and persist experiment configuration:

```javascript
// Equal distribution across cases
await Xperiment.define(['control', 'variant-a', 'variant-b'], 'my-experiment');

// Weighted distribution
await Xperiment.define(
  { control: 50, 'variant-a': 30, 'variant-b': 20 },
  'my-experiment'
);

// With auto-convergence
await Xperiment.define(
  ['control', 'variant-a'],
  'my-experiment',
  { convergenceThreshold: 80 } // Auto-select winner at 80% effectiveness
);
```

**Parameters:**
- `cases`: Array for equal distribution or object for weighted probabilities
- `name`: Experiment identifier (default: 'default')
- `options.convergenceThreshold`: 0-100 effectiveness % to auto-select winner

### 2. Getting an Experiment Instance

Use `Xperiment.get()` to retrieve or create a singleton instance for a user:

```javascript
// Using predefined experiment
const experiment = await Xperiment.get('user-123', 'my-experiment');

// Define on-the-fly if not exists
const experiment = await Xperiment.get('user-123', {
  name: 'my-experiment',
  cases: ['control', 'variant-a']
});

// With convergence threshold
const experiment = await Xperiment.get('user-123', {
  name: 'my-experiment',
  cases: ['control', 'variant-a'],
  convergenceThreshold: 80
});
```

**Best Practice:** Use `Xperiment.define()` first for cleaner code, then use `Xperiment.get()` with just user ID and name.

### 3. Assigning and Checking Cases

```javascript
// Get assigned case (assigns if not already assigned)
const assignedCase = await experiment.case();

// Use case in your logic
if (assignedCase === 'variant-a') {
  // Show variant A
} else {
  // Show control
}

// Manually override case assignment
await experiment.setCase('variant-b');
```

**Note:** Once a user is assigned to a case, they stay in that case unless manually changed.

If you need to clear only the assigned case (without deleting metrics), use:

```javascript
await Xperiment.resetCase('user-123', 'my-experiment');
```

### 4. Recording Events

Track user actions to measure experiment effectiveness:

```javascript
// Record a success/conversion
await experiment.hit();
await experiment.hit(5); // Increment by 5

// Record a failure
await experiment.miss();
await experiment.miss(2); // Increment by 2

// Set a fixed score (non-incremental, useful for rating systems)
await experiment.score(8.5);
```

**Metrics Calculation:**
- Success Rate = `totalHits / (totalHits + totalMisses)`
- Net Score = `totalHits - totalMisses` (score values are added to hits)

### 5. Generating Reports

View experiment results and effectiveness:

```javascript
const report = await Xperiment.report('my-experiment');

console.log(report);
// {
//   experiment: 'my-experiment',
//   totalUsers: 45,
//   cases: {
//     control: { users: 22, totalHits: 15, totalMisses: 7, netScore: 8, successRate: 0.68 },
//     'variant-a': { users: 23, totalHits: 19, totalMisses: 4, netScore: 15, successRate: 0.83 }
//   },
//   bestCase: 'variant-a',
//   effectiveness: 73, // Based on minimum users per case (22/30 * 100)
//   convergenceThreshold: 80,
//   converged: false // Not yet reached 80% threshold
// }
```

**Effectiveness Formula:** `(minUsersPerCase / 30) * 100`, capped at 100%. Requires ~30 users per variant for statistical confidence.

### 6. Convergence Mode

When convergence threshold is reached, new users are automatically assigned to the winning case:

```javascript
// Define with convergence
await Xperiment.define(
  ['control', 'variant-a'],
  'my-experiment',
  { convergenceThreshold: 80 }
);

// After reaching 80% effectiveness, all new users get the best case
const experiment = await Xperiment.get('new-user', 'my-experiment');
const case = await experiment.case(); // Returns bestCase if converged
```

**Benefits:**
- Gradually transitions to winning variant
- Maximizes positive outcomes while still testing
- No manual intervention needed

### 7. Resetting Experiments

Clear all experiment data to start fresh:

```javascript
// Reset specific experiment
await Xperiment.reset('my-experiment');

// Reset default experiment
await Xperiment.reset();
```

**Warning:** This deletes all user assignments and tracking data for the experiment.

To reset only one user's assigned case (and keep `hits`/`misses`/`score`), use:

```javascript
await Xperiment.resetCase('user-123', 'my-experiment');
```

## Complete Example

```javascript
import Xperiment from 'xperiment';

// 1. Define experiment once (e.g., at app startup)
await Xperiment.define(
  ['control', 'new-checkout'],
  'checkout-experiment',
  { convergenceThreshold: 75 }
);

// 2. For each user request
async function handleCheckout(userId) {
  const experiment = await Xperiment.get(userId, 'checkout-experiment');
  const variant = await experiment.case();
  
  if (variant === 'new-checkout') {
    // Show new checkout flow
    const result = await showNewCheckout();
    if (result.completed) {
      await experiment.hit(); // Track success
    } else {
      await experiment.miss(); // Track abandonment
    }
  } else {
    // Show control
    const result = await showControlCheckout();
    if (result.completed) {
      await experiment.hit();
    } else {
      await experiment.miss();
    }
  }
}

// 3. Check results periodically
const report = await Xperiment.report('checkout-experiment');
console.log(`Best variant: ${report.bestCase}`);
console.log(`Effectiveness: ${report.effectiveness}%`);
console.log(`Converged: ${report.converged}`);
```

## Common Patterns

### Pattern 1: Feature Flags with Tracking
```javascript
const experiment = await Xperiment.get(userId, 'feature-flag');
const enabled = await experiment.case() === 'enabled';

if (enabled) {
  // Use feature
  const success = await useNewFeature();
  if (success) await experiment.hit();
  else await experiment.miss();
}
```

### Pattern 2: Multi-Variant Testing
```javascript
await Xperiment.define(
  { control: 40, 'variant-a': 30, 'variant-b': 30 },
  'three-way-test'
);

const experiment = await Xperiment.get(userId, 'three-way-test');
const variant = await experiment.case();

switch (variant) {
  case 'control': /* ... */; break;
  case 'variant-a': /* ... */; break;
  case 'variant-b': /* ... */; break;
}
```

### Pattern 3: Score-Based Testing (Ratings, Quality Metrics)
```javascript
const experiment = await Xperiment.get(userId, 'algorithm-test');
const algorithm = await experiment.case();

const result = await runAlgorithm(algorithm);
await experiment.score(result.qualityScore); // 0-10 rating
```

## Best Practices

1. **Define experiments at startup**: Use `Xperiment.define()` during app initialization for consistency
2. **Use meaningful case names**: Descriptive names like 'new-ui', 'control', 'fast-algorithm'
3. **Track both hits and misses**: Complete data gives better insights
4. **Wait for statistical significance**: Aim for ~30 users per variant (100% effectiveness)
5. **Use convergence for production**: Automatically optimize while learning
6. **Monitor reports regularly**: Check effectiveness and adjust as needed
7. **Document experiment goals**: Keep track of what you're testing and why

## Troubleshooting

**Error: "Experiment not found"**
- Solution: Call `Xperiment.define()` first or pass `cases` parameter to `Xperiment.get()`

**Low effectiveness despite many users**
- Solution: Check that users are distributed evenly across cases. Effectiveness is based on the variant with fewest users.

**Convergence not happening**
- Solution: Ensure `convergenceThreshold` is set and enough users per variant have been tested

## Questions to Ask Users

If implementing Xperiment for a user, clarify:

- What are you testing? (feature, UI, algorithm, etc.)
- How many variants do you need?
- Should distribution be equal or weighted?
- What constitutes a "success" (hit) vs "failure" (miss)?
- Do you want auto-convergence? At what threshold?
- How will you integrate tracking into your application flow?

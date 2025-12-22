# Xperiment Demo Examples

This folder contains practical examples demonstrating various use cases of the Xperiment A/B testing library.

## Running the Examples

Make sure you have installed the dependencies first:

```bash
npm install
```

Then run any example using Node.js:

```bash
node demo/basic.js
node demo/multivariant.js
node demo/weighted-tracking.js
node demo/score-usage.js
node demo/dashboard.js
node demo/complete-flow.js
```

## Available Examples

### 1. Basic A/B Test (`basic.js`)

**What it demonstrates:**
- Creating a simple A/B test with two variants
- Assigning users to variants
- Tracking hits and misses
- Generating basic reports

**Use case:** Perfect for getting started with simple A/B tests like button colors, headlines, or CTA text.

```bash
node demo/basic.js
```

---

### 2. Multi-variant Testing (`multivariant.js`)

**What it demonstrates:**
- Testing 4 different variants simultaneously (A/B/C/D test)
- Equal probability distribution across variants
- Comparing performance across multiple options
- Identifying the winning variant

**Use case:** When you have multiple ideas to test and want to find the best performer among several options.

```bash
node demo/multivariant.js
```

---

### 3. Weighted Tracking (`weighted-tracking.js`)

**What it demonstrates:**
- Using weighted scores for different actions
- Tracking multiple engagement levels (view, click, share, purchase)
- Calculating engagement scores per user
- Comparing average engagement between variants

**Use case:** When different user actions have different values (e.g., purchase is worth more than a click).

```bash
node demo/weighted-tracking.js
```

---

### 4. Score Usage (`score-usage.js`)

**What it demonstrates:**
- Using the `score()` method for non-incremental metrics
- Tracking engagement time (watch time, session duration)
- Setting fixed values per user (not cumulative)
- Calculating average engagement scores
- Comparing performance based on continuous metrics

**Use case:** Perfect for tracking metrics like video watch time, session duration, scroll depth, or any value where you want to record a final accumulated amount per user.

```bash
node demo/score-usage.js
```

---

### 5. Dashboard (`dashboard.js`)

**What it demonstrates:**
- Managing multiple experiments simultaneously
- Creating a visual dashboard with progress bars
- Comparing experiments side-by-side
- Sorting results by performance

**Use case:** Monitoring several ongoing experiments across your application.

```bash
node demo/dashboard.js
```

---

### 6. Complete User Flow (`complete-flow.js`)

**What it demonstrates:**
- Multi-stage funnel testing
- Testing different touchpoints in a user journey
- Tracking user progression through stages
- Analyzing funnel conversion rates
- Providing actionable recommendations

**Use case:** E-commerce sites or any application with a multi-step conversion funnel.

```bash
node demo/complete-flow.js
```

## Example Output

Each demo includes detailed console output showing:
- User assignments
- Action tracking
- Success/failure rates
- Performance comparisons
- Winner identification
- Actionable insights

## Customizing Examples

Feel free to modify these examples:
- Change probability distributions in the `cases` object
- Adjust conversion rates to simulate different scenarios
- Increase/decrease the number of simulated users
- Add additional tracking points
- Modify weighted scores for different actions

## Best Practices Demonstrated

1. **Clear naming conventions** - Use descriptive experiment and variant names
2. **Appropriate sample sizes** - Test with enough users for statistical significance
3. **Weighted scoring** - Assign higher values to more important actions
4. **Multi-stage testing** - Test throughout the entire user journey
5. **Regular monitoring** - Use dashboards to track ongoing experiments
6. **Clean reporting** - Present results in an actionable format

## Next Steps

After running these examples, try:
1. Integrating Xperiment into your own application
2. Creating custom experiments for your specific use cases
3. Setting up a monitoring dashboard for production experiments
4. Implementing automated winner selection based on statistical significance

## Need Help?

Refer to the main [README.md](../README.md) for complete API documentation and additional usage information.


---
name: analyze-tests
description: Analyze test files for duplicate, redundant, and low-value test cases. Use when reviewing test quality, refactoring tests, or reducing test suite maintenance burden.
allowed-tools: Read, Glob, Grep
---

# Analyze Test Files

Systematic analysis of test files to identify duplicates, redundancies, and low-value tests that can be consolidated or removed.

## When to Use This Skill

Use this skill when you need to:
- Review test quality before merging
- Refactor bloated test files
- Reduce test suite maintenance burden
- Identify tests to consolidate with `it.each`
- Clean up tests after major refactoring

## Analysis Workflow

### Step 1: Read the Test File

Read the entire test file to understand its structure. Note:
- Number of `describe` blocks
- Number of `it`/`test` cases
- Overall organization pattern

### Step 2: Categorize Each Test

For each test, identify:
- **What behavior** is being tested
- **What operation** (add, remove, replace, error handling, etc.)
- **What input type** (primitives, objects, arrays, edge cases)

### Step 3: Flag Issues by Category

Analyze tests against the categories below and flag issues.

### Step 4: Generate Report

Produce a structured report with findings and recommendations.

## Analysis Categories

### A. Duplicate Tests

Tests that verify the same behavior with trivial variations.

**Indicators:**
- Nearly identical assertions
- Same test logic with different input values
- Copy-pasted structure with minor changes

**Example - Candidate for `it.each`:**
```typescript
// BEFORE: 3 separate tests
it("derives BASIC_SETTINGS from name path", () => { ... });
it("derives BASIC_SETTINGS from description path", () => { ... });
it("derives BASIC_SETTINGS from sidekickBasicSettings path", () => { ... });

// AFTER: 1 parameterized test
it.each([["name"], ["description"], ["sidekickBasicSettings"]])(
  "derives BASIC_SETTINGS from %s path",
  (field) => { ... }
);
```

### B. Redundant Tests

Tests with overlapping coverage where one test subsumes another.

**Indicators:**
- Multiple tests verifying the same code path
- Simple case already covered by complex case
- Error handling tested multiple ways with same outcome

**Example - Redundant Error Handling:**
```typescript
// These 4 tests all verify: "when AI fails, save without summary"
it("handles AI returning invalid JSON gracefully", ...);
it("handles AI returning wrong structure gracefully", ...);
it("handles AI returning empty response gracefully", ...);
it("handles AI throwing error gracefully", ...);

// Could consolidate to 1 parameterized test
it.each([
  ["invalid JSON", { content: "not json" }],
  ["wrong structure", { content: JSON.stringify({ wrong: "x" }) }],
  ["empty response", { content: null }],
  ["thrown error", "THROW"],
])("saves without AI summary when AI returns %s", ...);
```

### C. Low-Value Tests

Tests that provide minimal confidence or test obvious behavior.

**Indicators:**
- Testing language/framework behavior, not application logic
- Trivial edge cases (empty objects, identity operations)
- Tests of self-documenting code
- Falsy value variations that test the same code path

**Examples of Low-Value Tests:**
```typescript
// Testing basic equality (framework behavior)
it("returns empty patches when objects are identical", ...);
it("handles empty objects", ...);

// Falsy value variations (same code path as basic replace)
it("handles boolean changes", ...);  // Same as any replace
it("handles numeric zero", ...);      // Same as any replace
it("handles empty string", ...);      // Same as any replace

// Type coercion (same as basic replace)
it("handles changing property type", ...);
```

### D. Mirror Tests

Tests that verify opposite directions of the same operation.

**Indicators:**
- "X to Y" paired with "Y to X" tests
- Both test the same underlying logic

**Example:**
```typescript
// These test the same replace operation
it("handles null to value", ...);
it("handles value to null", ...);

// Could keep one or consolidate
it.each([
  [{ value: null }, { value: "something" }],
  [{ value: "something" }, { value: null }],
])("handles value <-> null transitions", (prev, curr) => { ... });
```

### E. Consolidation Opportunities

Groups of tests that could share parameterization.

**Look for:**
- 3+ tests with identical structure
- Tests differing only by input/expected values
- Tests in same `describe` block with same assertion pattern

### F. Timing Test Issues

Tests that use timing in problematic ways, causing slow or flaky tests.

**1. Real timers instead of fake timers**
```typescript
// PROBLEMATIC: Uses real time, test takes 500ms+
mockFn.mockImplementation(() =>
  new Promise(resolve => setTimeout(resolve, 500))
);

// CORRECT: Use fake timers
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

mockFn.mockImplementation(() =>
  new Promise(resolve => setTimeout(resolve, 500))
);

const promise = functionUnderTest();
await vi.advanceTimersByTimeAsync(500);
await promise;
```

**2. Missing timer cleanup**
```typescript
// PROBLEMATIC: Timer leak between tests
beforeEach(() => vi.useFakeTimers());
// Missing afterEach!

// CORRECT: Always restore real timers
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
```

**3. Arbitrary delays**
```typescript
// PROBLEMATIC: Hardcoded wait hoping async completes
await someAsyncOperation();
await new Promise(r => setTimeout(r, 100)); // Arbitrary wait
expect(result).toBeDefined();

// CORRECT: Use proper async assertions or fake timers
await someAsyncOperation();
await vi.advanceTimersByTimeAsync(100);
expect(result).toBeDefined();
```

**4. Long test timeouts hiding issues**
```typescript
// PROBLEMATIC: Long timeout hides slow test
it("handles timeout", async () => {
  // ... slow test code
}, 10000);

// CORRECT: Use fake timers, test runs instantly
it("handles timeout", async () => {
  vi.useFakeTimers();
  const promise = operationWithTimeout();
  await vi.advanceTimersByTimeAsync(5000);
  await expect(promise).rejects.toThrow("timeout");
  vi.useRealTimers();
});
```

**Good timing patterns (don't flag):**
```typescript
// Proper fake timer setup/teardown
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

// Async timer advancement
const promise = asyncOperation();
await vi.advanceTimersByTimeAsync(100);
await promise;

// Timer count verification
expect(vi.getTimerCount()).toBeGreaterThan(0);
await vi.runAllTimersAsync();
expect(vi.getTimerCount()).toBe(0);
```

## Output Format

Generate a report with this structure:

```markdown
## Test Analysis: {filename}

### Summary

| Category | Count | Recommendation |
|----------|-------|----------------|
| Duplicate tests | X | Consolidate with `it.each` |
| Redundant tests | X | Remove or merge |
| Low-value tests | X | Consider removing |
| Mirror tests | X | Consolidate |
| Timing issues | X | Use fake timers |

**Estimated reduction**: X tests -> Y tests

### Findings by Category

#### Duplicates (lines X-Y)
- `test name 1` - reason
- `test name 2` - reason
- **Recommendation**: [consolidation approach]

#### Redundant (lines X-Y)
...

#### Low-Value (lines X-Y)
...

#### Timing Issues (if found)
| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| Real timer delay | line X | Slow/flaky | Use fake timers |
| Missing cleanup | line X | Timer leak | Add afterEach |
| Arbitrary wait | line X | Flaky | Use advanceTimersByTimeAsync |
| Long timeout | line X | Slow | Use fake timers |

### Consolidation Examples

[Provide specific `it.each` refactoring for top opportunities]

### Tests to Keep

[List tests that provide unique, high-value coverage]
```

## Decision Framework

### Keep a test if:
- It tests unique business logic
- It covers a real edge case from production
- It documents important behavior
- Removing it would reduce confidence

### Remove/consolidate a test if:
- Another test already covers the same code path
- It tests framework/language behavior
- It's a trivial variation of another test
- The behavior is self-documenting

## Common Patterns by Test Type

### Unit Tests for Pure Functions
- Look for input/output variations that could be `it.each`
- Edge cases (null, undefined, empty) often redundant

### Service/Repo Tests
- Error handling tests often redundant
- Mock setup verification is low-value
- Focus on business logic branches

### Integration Tests
- These often make unit-level edge case tests redundant
- Look for unit tests that duplicate integration coverage

## Example Analysis

From `AuditLogService.test.ts`:

| Category | Count | Tests |
|----------|-------|-------|
| Duplicate | 9 | AI error handling (4), type guard (4), BASIC_SETTINGS derivation (3) |
| Low-value | 6 | Falsy values (3), empty objects (2), type coercion (1) |
| Mirror | 2 | null to value / value to null |

**Estimated reduction**: ~15 tests consolidated or removed

**Key consolidations:**
1. AI error handling: 4 tests -> 1 `it.each`
2. Type guard validation: 4 tests -> remove (covered by error handling)
3. Component derivation: 5 tests -> 2 `it.each`

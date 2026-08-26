---
name: code-comments
description: Create or audit code comments following GLaDOS commenting standards. Use when adding comments to new code or reviewing existing comments for clarity. Ensures comments explain "why" and "how", not "what", and eliminates obvious one-line comments.
allowed-tools: Read, Edit, Grep, Glob
---

# Code Comments for GLaDOS

## When to Use This Skill

Use this skill when you need to:
- Add comments to new functions or complex code
- Audit existing comments for clarity and value
- Review pull requests for comment quality
- Ensure comments follow GLaDOS standards
- Remove obvious or redundant comments

## Quick Reference

**Philosophy**: Explain architectural constraints and business logic, not code mechanics
**Focus**: WHY and HOW, not WHAT
**Location**: JSDoc at top of functions for big picture, inline for critical non-obvious details
**Avoid**: Obvious comments, numbered step lists mid-function, comments that repeat code

## Commenting Standards

### 1. JSDoc for All Exported Functions

**Every exported function must have a JSDoc comment** that includes:

1. **Summary**: One-line description of what the function does
2. **Detailed explanation**: The "why" and "how" behind the implementation
3. **Execution flow**: Step-by-step orchestration (use numbers here, not in code)
4. **Architectural constraints**: Concurrency, state management, ordering requirements
5. **Edge cases**: Non-obvious scenarios handled (in a dedicated section)

**Structure**:
```typescript
/**
 * [One-line summary of function purpose]
 *
 * [2-3 paragraphs explaining the WHY and HOW, including architectural decisions]
 *
 * Execution flow:
 * 1. [Step one]
 * 2. [Step two]
 * 3. [Step three]
 *
 * [Additional sections as needed:]
 * - State machine steps: [For state machines]
 * - Concurrency handling: [For concurrent operations]
 * - Error handling: [How different error types are handled]
 *
 * Edge cases:
 * - [Edge case 1]
 * - [Edge case 2]
 *
 * @param paramName - Purpose and expectations for this parameter
 * @returns What is returned and any important behavioral details
 */
```

### 2. Valuable Inline Comments

**DO add inline comments for**:

✅ **Critical ordering requirements**
```typescript
// CRITICAL: Check for handoff FIRST before processing empty mocks
// Handoffs indicate the bot transferred to a human agent
const handoffResult = await checkForHandoff(run, context);
```

✅ **Non-obvious architectural constraints**
```typescript
// Apply updates to preserve reference semantics expected by supervisor loop
Object.assign(run, updatedRun);
```

✅ **Safety decisions that prevent bugs**
```typescript
// IMPORTANT: We save the exact params from usage.params, not {}
// This enables multi-call scenarios where different parameters return different data.
// ActionAdapterService uses strict equality (lodash.isEqual) for matching.
const mock = { params: usage.params, response: synthesizedData };
```

✅ **Idempotency or deduplication patterns**
```typescript
jobId: `scenario-run-${runId}`, // Use consistent job ID to prevent duplicates
```

✅ **Complex business logic before multi-condition queries**
```typescript
// Find stale runs:
// 1. Incomplete + unlocked + updated_at > 10 min ago
// 2. Incomplete + locked + lock acquired > 15 min ago
const staleRuns = await repo.query(/* complex SQL */);
```

**Use `// CRITICAL:` prefix** for ordering-dependent code that will break if reordered
**Use `// IMPORTANT:` prefix** for non-obvious safety decisions or constraints

### 3. Obvious Comments to AVOID

**DO NOT add comments that**:

❌ **Repeat what the code already says**
```typescript
// BAD: Fetch scenario to get message details
const scenario = await scenarioRepo.get(run.scenarioId);

// GOOD: No comment needed - code is self-explanatory
const scenario = await scenarioRepo.get(run.scenarioId);
```

❌ **State the obvious from function name**
```typescript
// BAD
/**
 * Determines if a conversation outcome represents a handoff to human.
 */
export function isHandoffOutcome(outcome: ConversationOutcome): boolean {

// GOOD: No JSDoc comment needed - function name and signature are clear
export function isHandoffOutcome(outcome: ConversationOutcome): boolean {
```

❌ **Use numbered steps within function body**
```typescript
// BAD: Numbering breaks readability and gets out of sync
function process() {
  // 1. Fetch data
  const data = await fetch();

  // 2. Transform data
  const transformed = transform(data);

  // 3. Save result
  await save(transformed);
}

// GOOD: Steps in JSDoc only
/**
 * Processes data through fetch, transform, save pipeline.
 *
 * Execution flow:
 * 1. Fetch data from repository
 * 2. Transform using business rules
 * 3. Save result to database
 */
function process() {
  const data = await fetch();
  const transformed = transform(data);
  await save(transformed);
}
```

❌ **Validate or check comments**
```typescript
// BAD: Obvious from code
// Validate session was initialized
if (!run.session) {
  throw new Error("Session not initialized");
}

// GOOD: Explain WHY if non-obvious
// Session must exist by this point; indicates setup failed in previous step
if (!run.session) {
  throw new Error("Session not initialized");
}
```

### 4. What to Document

**Focus on explaining**:

1. **WHY decisions were made**
   - "Two-phase LLM calls prevent information leakage"
   - "We use strict equality (not fuzzy matching) for safety"
   - "Lock prevents concurrent execution of same run"

2. **HOW systems work together**
   - "Supervisor loop decides next action based on evaluation"
   - "State machine progresses: idle → sending → awaiting → evaluating"
   - "Uses dependency injection for testing without real sessions"

3. **WHEN order matters**
   - "Check handoff FIRST before processing mocks"
   - "Save run state before evaluation to prevent data loss"
   - "Re-fetch after evaluation to get latest state"

4. **WHAT non-obvious business rules exist**
   - "Empty mocks are generated fresh, never persisted"
   - "Max turn limit (20) prevents infinite loops"
   - "Handoff stops test immediately"

**Do NOT include**:
- What the code syntax does (developers can read TypeScript)
- Structural metadata phrases like "Exported as pure function for testing", "This is async", "Private method"
- Obvious descriptions that just repeat descriptive function names
- Comments on standard patterns unless there's a non-obvious reason for the approach

### 5. Constants and Configuration

**Constants benefit from comments when they add value beyond the name itself.**

✅ **DO comment constants when the comment adds context**:
```typescript
// ✅ Explains consequence and relationship
/** Maximum number of failures before quarantining a run. */
const MAX_FAILURE_COUNT = 5;

// ✅ Explains what it controls and relationships
/** Failures older than this window are not counted toward MAX_FAILURE_COUNT. */
const FAILURE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// ✅ Explains usage in the system
/** Identifies the repeating BullMQ job that cleans up stale scenario runs. */
export const SWEEPER_JOB_NAME = "sweep-stale-scenario-runs";
```

❌ **DON'T comment constants that just reword the name**:
```typescript
// ❌ Just repeats the name
/** Job name for the sweeper job */
export const SWEEPER_JOB_NAME = "sweep-stale-scenario-runs";

// ❌ Obvious from the name
/** Queue name for scenario runs processing */
export const SCENARIO_RUNS_QUEUE_NAME = "scenario-runs";
```

**The "Remove the Name" Test**: If you remove the constant name from the comment, is it still meaningful?
- "Maximum number of failures before quarantining a run" → ✅ Still meaningful
- "Job name for the sweeper job" → ❌ Meaningless without the name = redundant

### 6. Parameter Documentation (@param/@returns)

**Always include @param and @returns in JSDoc for exported functions.**

These comments:
- Power IDE intellisense and tooltips
- Explain parameter purpose and caller expectations
- Document return value behavior that may not be obvious from types

```typescript
/**
 * Creates a job processor for scenario runs queue.
 *
 * This processor wraps processScenarioRun with resilience logic...
 *
 * @param crossOrgRepo - Repository for cross-org queries and stale run detection
 * @param queue - Queue instance for self-enqueueing next ticks
 * @param actions - Injectable actions for testing (dependency injection pattern)
 * @returns BullMQ processor function that handles ScenarioRunJobData
 */
```

**Include even when types are in signature** - the comment explains *purpose and expectations*, not just types.

## Comment Audit Workflow

### 1. Scan for Obvious Comments

Search for patterns:
```bash
# Find comments that just restate variable names
grep -n "// Fetch\|// Get\|// Set\|// Create\|// Update\|// Delete" <file>

# Find numbered step comments mid-function (bad pattern)
grep -n "// [0-9]\." <file>

# Find obvious validation comments
grep -n "// Validate\|// Check" <file>

# Find structural metadata phrases
grep -n "Exported as\|pure function\|for testing\|This is a\|Private method" <file>
```

### 2. Review Each Comment

For each comment, ask:
1. **Does it explain WHY or HOW, not WHAT?** If WHAT → remove or rewrite
2. **Is it non-obvious?** If obvious from code → remove
3. **Does it add value beyond the name?** (for constants) If not → remove
4. **Does it prevent a bug?** If yes → keep and make it prominent (CRITICAL/IMPORTANT)
5. **Is it in the right place?** Execution flow belongs in JSDoc, not inline
6. **Is it structural metadata?** ("exported as", "pure function") → remove

### 3. Check JSDoc Completeness

For each exported function, verify:
- [ ] Has JSDoc comment
- [ ] Explains WHY this function exists
- [ ] Documents HOW it orchestrates (execution flow)
- [ ] Lists edge cases explicitly
- [ ] Notes any ordering requirements or concurrency concerns
- [ ] Includes @param descriptions that explain purpose and expectations
- [ ] Includes @returns description with behavioral details
- [ ] Avoids structural metadata phrases ("exported as pure function")

### 4. Mark Critical Sections

Identify code that:
- Must execute in a specific order → `// CRITICAL: [why order matters]`
- Has non-obvious safety constraints → `// IMPORTANT: [why this way is safer]`
- Prevents race conditions → Document concurrency approach
- Handles subtle business rules → Explain the rule and its implications

## Examples from GLaDOS Codebase

See EXAMPLES.md for real code samples from the scenario-tester showing:
- Excellent JSDoc patterns (processScenarioRun.ts, evaluateScenarioResponse.ts)
- Valuable inline comments (handleAwaitingBotResponse.ts)
- Obvious comments to remove (sendScenarioMessage.ts)

## Best Practices Checklist

Before finalizing comments:

- [ ] All exported functions have JSDoc with @param/@returns
- [ ] JSDoc explains WHY and HOW, not WHAT
- [ ] Execution flow documented in JSDoc, not inline
- [ ] Critical ordering requirements marked with `// CRITICAL:`
- [ ] Safety constraints marked with `// IMPORTANT:`
- [ ] No numbered step comments mid-function
- [ ] No obvious comments that repeat code
- [ ] No structural metadata phrases ("exported as pure function")
- [ ] Constants only commented when adding value beyond the name
- [ ] Edge cases documented in dedicated section
- [ ] Concurrency approach documented if relevant

## Running an Audit

To audit comments in a file or directory:

```bash
# Find files with lots of inline comments (potential over-commenting)
for file in lib/actions/scenario-tester/*.ts; do
  echo "$file: $(grep -c '^[[:space:]]*\/\/' "$file") inline comments"
done | sort -t: -k2 -nr

# Find functions without JSDoc
grep -L "^\/\*\*" lib/actions/scenario-tester/*.ts
```

## Reference

For detailed examples, see:
- **EXAMPLES.md**: Real code samples with annotations
- **lib/actions/scenario-tester/**: Reference implementation
- **Code Standards**: .claude/rules/code-standards.md

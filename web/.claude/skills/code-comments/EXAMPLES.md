# Code Comment Examples from GLaDOS

This document shows real examples from the scenario-tester codebase, annotated to explain what makes them good or bad.

## Excellent JSDoc Examples

### Example 1: State Machine with Concurrency (processScenarioRun.ts)

```typescript
/**
 * Processes a single scenario run through its current execution step.
 *
 * This function implements the core state machine for scenario test execution. Each run
 * progresses through a series of steps (idle → sending_message → awaiting_bot_response →
 * evaluation_complete), with this function handling the transition logic and side effects
 * for the current step.
 *
 * Execution flow:
 * 1. Acquire processing lock to prevent concurrent execution
 * 2. Transition from queued → running on first execution
 * 3. Execute action for current step (setup, send, check response, evaluate)
 * 4. Update run state based on step results
 * 5. Release processing lock in finally block
 *
 * State machine steps:
 * - **idle**: Create test session and send initial message
 * - **sending_message**: Send customer message to bot
 * - **awaiting_bot_response**: Poll for bot response, then evaluate
 * - **evaluation_complete**: Check pass/fail, retry or complete
 * - **evaluating**: No-op (evaluation happens in awaiting_bot_response)
 *
 * The function uses dependency injection for actions to enable testing without
 * real session creation or message sending.
 *
 * Concurrency handling:
 * - Uses processing locks to prevent multiple instances from processing the same run
 * - Returns early if lock cannot be acquired
 * - Always releases lock in finally block
 *
 * Edge cases:
 * - Saves run state after bot response detection to prevent data loss on evaluation failure
 * - Refetches run after evaluation to get latest state
 * - Enforces max turn limit (20) to prevent infinite loops
 * - Preserves existing failure reasons when retrying
 */
export async function processScenarioRun(/* params */) {
  // Implementation...
}
```

**Why this is excellent**:
- ✅ Explains WHY (prevent concurrent execution, enable testing)
- ✅ Visual state flow with arrows
- ✅ Separate sections for state machine, concurrency, edge cases
- ✅ Documents architectural decision (dependency injection)
- ✅ Shows HOW system works (numbered execution flow)

---

### Example 2: Multi-Phase LLM Orchestration (evaluateScenarioResponse.ts)

```typescript
/**
 * Evaluates the bot's response against scenario success criteria and generates
 * the next customer message if the scenario is incomplete.
 *
 * This function orchestrates the full evaluation flow using two separate LLM calls:
 * 1. Fetches the scenario definition
 * 2. Evaluates success criteria (without revealing them to the customer simulator)
 * 3. If criteria not met, generates next customer message (without knowledge of criteria)
 * 4. Updates run state in repository
 *
 * The two-phase approach prevents information leakage where the customer LLM
 * could "game" the scenario by knowing what success criteria need to be met.
 *
 * The evaluation is synchronous and updates the run in place, moving it to the
 * `evaluation_complete` step. The supervisor loop decides the next action based
 * on whether the evaluation passed or requires additional conversation turns.
 *
 * Edge cases:
 * - Throws ErrorWithContext if scenario is not found (wraps NotFoundError)
 * - Handles empty conversation history (initial evaluation before any bot response)
 * - Preserves previous evaluation results to track criterion regression
 * - LLM failures propagate as ErrorWithContext with full diagnostic context
 */
export async function evaluateScenarioResponse(/* params */) {
  // Implementation...
}
```

**Why this is excellent**:
- ✅ Explains WHY two-phase approach (prevent information leakage)
- ✅ Shows HOW it fits into larger system (supervisor loop)
- ✅ Documents what happens on failure (error types)
- ✅ Edge cases clearly enumerated
- ✅ Focuses on architectural reasoning, not syntax

---

## Valuable Inline Comments

### Example 1: Critical Ordering (handleAwaitingBotResponse.ts:108)

```typescript
// CRITICAL: Check for handoff FIRST before processing empty mocks
// Handoffs indicate the bot transferred to a human agent and the test should stop immediately
const handoffResult = await checkForHandoff(run, context);

if (handoffResult.handoffDetected) {
  // Mark as passed - handoff is a valid completion path
  return {
    ...run,
    status: "completed_passed",
    completedAt: new Date(),
  };
}
```

**Why this is valuable**:
- ✅ Uses `CRITICAL:` prefix to signal importance
- ✅ Explains WHY order matters (stop test immediately)
- ✅ Not obvious from code alone that order is critical

---

### Example 2: Reference Semantics (handleAwaitingBotResponse.ts:185)

```typescript
// Apply updates to preserve reference semantics expected by supervisor loop
Object.assign(run, updatedRun);
```

**Why this is valuable**:
- ✅ Explains architectural constraint (reference semantics)
- ✅ Not obvious why Object.assign instead of reassignment
- ✅ Prevents future refactoring that would break expectations

---

### Example 3: Safety Decision (handleAwaitingBotResponse.ts:239-245)

```typescript
// IMPORTANT: We save the exact params from usage.params, not {}
// This enables multi-call scenarios where different parameters return different data.
// You may see multiple mocks with similar params (e.g., {id: "123"} and {id: "123", verbose: false}).
// This is intentional - ActionAdapterService uses strict equality (lodash.isEqual) for matching.
// When the LLM generates slightly different parameters, the self-healing loop creates a new mock
// with consistent data (synthesis includes existing mocks in context). This is safer than fuzzy
// matching, which could return wrong data for Order 123 when checking Order 55899.
const mock = {
  params: usage.params, // <-- exact params, not {}
  response: synthesizedData,
};
```

**Why this is valuable**:
- ✅ Explains WHY this choice is safer (prevents wrong data)
- ✅ Anticipates developer confusion (similar params)
- ✅ Documents constraint (strict equality)
- ✅ Prevents future "optimization" that would break safety

---

### Example 4: Idempotency Pattern (enqueueScenarioRunTick.ts:66)

```typescript
await scenarioRunsQueue.add(
  "process-scenario-run",
  { runId },
  {
    jobId: `scenario-run-${runId}`, // Use consistent job ID to prevent duplicates
    removeOnComplete: true,
  }
);
```

**Why this is valuable**:
- ✅ Explains WHY specific pattern used (deduplication)
- ✅ Short and to the point (end-of-line comment)
- ✅ Not obvious from code that jobId provides idempotency

---

### Example 5: Multi-Condition Logic (sweepStaleScenarioRuns.ts:37-39)

```typescript
// Find stale runs:
// 1. Incomplete + unlocked + updated_at > 10 min ago
// 2. Incomplete + locked + lock acquired > 15 min ago
const staleRuns = await scenarioRunsRepo.raw<DbScenarioRun>(sql`
  SELECT * FROM scenario_runs
  WHERE status IN ('queued', 'running')
  AND (
    (locked_by IS NULL AND updated_at < NOW() - INTERVAL '10 minutes')
    OR (locked_by IS NOT NULL AND locked_at < NOW() - INTERVAL '15 minutes')
  )
`);
```

**Why this is valuable**:
- ✅ Clarifies OR logic before complex SQL query
- ✅ Maps conditions to business rules
- ✅ Helps reader understand query before seeing syntax

---

## Obvious Comments to Remove

### Example 1: Code Repeats Itself (sendScenarioMessage.ts:46-50)

```typescript
// ❌ BAD
// 1. Fetch scenario to get message details
const scenario = await scenarioRepo.get(run.scenarioId);

// 2. Evaluate templates in action adapter mocks (e.g., {{dateOffset days=-7}})
// This ensures dates remain fresh on every test run
if (scenario.actionAdapterMocks && scenario.actionAdapterMocks.length > 0) {
```

**Why this is bad**:
- ❌ "Fetch scenario" is obvious from code
- ❌ Numbered steps mid-function break readability
- ❌ Should be in JSDoc, not inline

**Better approach**:
```typescript
// ✅ GOOD - Put flow in JSDoc only
const scenario = await scenarioRepo.get(run.scenarioId);

// Template evaluation ensures dates remain fresh on every run
if (scenario.actionAdapterMocks?.length > 0) {
```

---

### Example 2: Validation Comment (sendScenarioMessage.ts:103-104)

```typescript
// ❌ BAD
// 7. Validate session was initialized
if (!run.session) {
  throw new Error("Session not initialized");
}
```

**Why this is bad**:
- ❌ Code already shows validation happening
- ❌ Doesn't explain WHY validation is here

**Better approach**:
```typescript
// ✅ GOOD - Explain WHY if non-obvious
// Session must exist by this point; indicates setup failed in previous step
if (!run.session) {
  throw new Error("Session not initialized");
}

// Or even better: no comment if validation is obvious
if (!run.session) {
  throw new Error("Session not initialized");
}
```

---

### Example 3: Type Information Comment

```typescript
// ❌ BAD - Type is in signature
/**
 * Determines if a conversation outcome represents a handoff to human.
 */
export function isHandoffOutcome(
  outcome: ConversationOutcome
): boolean {
  return outcome.type === "handoff";
}
```

**Why this is bad**:
- ❌ Function name + signature already express this
- ❌ No WHY, HOW, or edge cases documented

**Better approach**:
```typescript
// ✅ GOOD - No comment needed
export function isHandoffOutcome(
  outcome: ConversationOutcome
): boolean {
  return outcome.type === "handoff";
}

// Or if there IS non-obvious behavior:
/**
 * Determines if a conversation outcome represents a handoff to human.
 *
 * Note: "handoff" type includes both explicit handoff requests and
 * implicit handoffs (e.g., bot unable to help after 3 attempts).
 */
export function isHandoffOutcome(outcome: ConversationOutcome): boolean {
```

---

## Comment Patterns Summary

### ✅ DO Comment

1. **WHY architectural decisions were made**
   ```typescript
   // Two-phase LLM calls prevent information leakage
   ```

2. **HOW systems work together**
   ```typescript
   // Supervisor loop decides next action based on evaluation result
   ```

3. **WHEN order is critical**
   ```typescript
   // CRITICAL: Check handoff FIRST before processing mocks
   ```

4. **WHAT non-obvious business rules exist**
   ```typescript
   // Empty mocks are generated fresh, never persisted
   ```

### ❌ DON'T Comment

1. **WHAT the code syntax does**
   ```typescript
   // ❌ Fetch scenario from repository
   const scenario = await repo.get(id);
   ```

2. **Type information in signatures**
   ```typescript
   // ❌ Returns boolean
   function isValid(): boolean
   ```

3. **Numbered steps mid-function**
   ```typescript
   // ❌ 1. Do this
   // ❌ 2. Then this
   ```

4. **Obvious validations**
   ```typescript
   // ❌ Check if user exists
   if (!user) throw new Error();
   ```

---

## Quick Audit Questions

For each comment, ask yourself:

1. **Does it explain WHY or HOW?** → Keep
2. **Does it explain WHAT?** → Remove (code already does this)
3. **Would removing it lose important information?** → Keep
4. **Is it a numbered step in the middle of a function?** → Move to JSDoc or remove
5. **Does it prevent a future bug?** → Keep and mark CRITICAL/IMPORTANT
6. **Would an experienced developer find it obvious?** → Remove

---

## Reference Files

Best examples from scenario-tester:
- `lib/actions/scenario-tester/processScenarioRun.ts` - State machine documentation
- `lib/actions/scenario-tester/evaluateScenarioResponse.ts` - Multi-phase orchestration
- `lib/actions/scenario-tester/handleAwaitingBotResponse.ts` - Critical ordering, safety
- `lib/actions/scenario-tester/enqueueScenarioRunTick.ts` - Clean, minimal comments

Files needing improvement:
- `lib/actions/scenario-tester/sendScenarioMessage.ts` - Remove numbered steps, obvious comments

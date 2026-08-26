---
paths: "**/*.ts, **/*.js"
---

# Code Writing Guidance

## Hard Rules

### No Placeholder Code

Never write placeholder/stub/TODO code. No `// TODO: implement`, no fake returns, no `throw new Error("not implemented")`, no mock data as real logic. Cannot implement now? Stop, ask. Half-done code rots, misleads.

### No Backward Compatibility (Default)

Default: no backward compat. Rename freely, change signatures, delete old paths. No deprecation shims, aliases, "legacy" branches.

Exception: code critical or widely depended on (many call sites, public API, persisted formats, external consumers) → STOP, ask user before breaking. Then consider compat path.

Doubt? Ask.

## Required Standards

✅ **Required:**

1. Exported functions have JSDoc comments
2. Business logic has unit tests
3. No `any` types or unsafe `as` assertions
4. External data validated at boundaries
5. Function parameters in standard order
6. Error handling includes correlation IDs
7. Database operations use StandardRepo
8. A/B tests include LangSmith tagging
9. AI standards only in AGENTS.md

❌ **Red Flags:**

- Undocumented exported functions
- Business logic without tests
- Use of `any` or unsafe type assertions
- Missing error handling/logging
- Deviation from patterns without justification

### Documentation

- **Explain "why" not just "what"** - context and reasoning
- **Document assumptions and constraints** - conditions must hold

### TypeScript

- **Never use `any`** - use `unknown`, validate at boundaries
- **Never use `as`** - use typed constructors like `newUserId()`
- **Use literal types not enums** - `type Status = "active" | "inactive"`
- **Use `catchElse` for exhaustive checking** - all cases handled
- **Use discriminated unions with `as const`** - type-safe sets, exhaustive checks
- **Validate external data** - validation library at boundaries
- **Use `validate()` function for validation** - call `validate(data, validator)` not validator direct

### Function Parameters

**Standard order:**

1. `correlationId` (if applicable)
2. `organizationId` (if applicable)
3. Gateways and repositories
4. Required parameters
5. Optional parameters (in object)

### Error Handling

- **Include correlation IDs in all error logging**
- **Use structured error types** with context (use `ErrorWithContext`)
- **Throw meaningful errors** with organizationId and correlationId

### Architecture Patterns

- **Use StandardRepo** for DB ops (multi-tenancy, timestamps, validation)
- **Separate business logic from infrastructure** - inject deps
- **Simple over clever** - optimize for readability, change
- **A/B testing must include LangSmith tagging** - use `getExperimentVariant()`

## Examples

**StandardRepo Example:**

```typescript
const repo = new StandardRepo<Conversation>(organizationId, {
  table: "conversations",
  validator: validConversation,
});
```

**Function Parameter Example:**

```typescript
async function processMessage(
  correlationId: string,
  organizationId: string,
  openAIGateway: OpenAIGateway,
  messageId: string,
  options: { model?: string } = {},
): Promise<Response>;
```

**Error Handling Example:**

```typescript
try {
  await processMessage(correlationId, organizationId, message);
} catch (error) {
  logger.error("Processing failed", {
    correlationId,
    organizationId,
    error: error.message,
  });
  throw error;
}
```

**ErrorWithContext Example:**

```typescript
import ErrorWithContext from "./lib/utils/errorWithContext";

// Throwing ErrorWithContext with structured context
throw new ErrorWithContext("Failed to process conversation", {
  correlationId,
  organizationId,
  conversationId,
  step: "ai_response_generation",
  cause: error,
});

// Catching and re-throwing with additional context
try {
  await generateResponse(prompt);
} catch (error) {
  throw new ErrorWithContext("AI response generation failed", {
    correlationId,
    organizationId,
    prompt: prompt.substring(0, 100), // Truncated for logging
    model: "gpt-4",
    cause: error,
  });
}
```

**Validation Example:**

```typescript
import { validate } from "@/lib/utils/validator/validator";

// ❌ Don't call validator directly
const myThing: Thing = validThing(json);

// ✅ Use validate() function instead
const myThing: Thing = validate(json, validThing);
```

**Discriminated Unions Example:**

```typescript
import { catchElse } from "@/lib/utils/catchElse";

// ✅ Define discriminated union with as const
const timeUnits = ["days", "minutes", "hours"] as const;
type TimeUnit = (typeof timeUnits)[number];

function createDueDate(dueIn: number, timeUnit: TimeUnit): Date {
  const now = new Date();
  switch (timeUnit) {
    case "days":
      return new Date(now.setDate(now.getDate() + dueIn));
    case "hours":
      return new Date(now.setHours(now.getHours() + dueIn));
    case "minutes":
      return new Date(now.setMinutes(now.getMinutes() + dueIn));
    default:
      catchElse(timeUnit); // Ensures all cases are handled
  }
}
```
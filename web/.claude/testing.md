---
paths: "**/*.test.ts, **/*.spec.ts"
---

# Tests

## Unit Testing

### Global Test Helpers

**IMPORTANT: Do NOT import test helpers in test files.**

Project use Vitest with `globals: true` (config `vite.config.mjs:6`). Below available globally, no import:

- `describe`, `it`, `test`, `expect`
- `vi` (for mocking)
- `beforeEach`, `afterEach`, `beforeAll`, `afterAll`

TypeScript types config via `tsconfig.json` with `"types": ["vitest/globals"]`.

**❌ Do NOT do this:**

```typescript
import { describe, it, expect, vi } from "vitest";
```

**✅ Just use them directly:**

```typescript
describe("myFunction", () => {
  it("should work", () => {
    expect(true).toBe(true);
  });
});
```

### Testing

- **All business logic in actions must have unit tests**
- **Test areas of risk** - focus on critical business logic
- **Simple test structure** - avoid `beforeEach` and nested `describe` blocks
- **Clear over DRY** - prefer readable tests over abstracted ones
- **Separate business logic from infrastructure** - makes testing easier

Multiple functions in file → unit test each function for isolation.
Use Vitest.
Function calls helpers → mock them to isolate unit.

Use explicit types. Example:

```typescript
const config: StaticBTConfigV2 = {
  //...
};

// do not do this:
// const config = { ... }
```

No `as` for ids. Check for util function, use it.
Instead of:

```typescript
const correlationId = "test-correlation" as CorrelationId;
```

Do:

```typescript
const correlationId = CorrelationId("test-correlation");
```

## Mocking

Before create mock, check codebase for existing mock, reuse.

No global mocks — tests run parallel.

Reset mocks before tests in `beforeEach`. Prefer reset individually.
Avoid `vi.clearAllMocks()` and `vi.resetAllMocks()`.

Helper function in test for domain object mocks, reuse per `it` block.
No `as` or `as any` when mocking domain objects.

### Mock Actions

Mock actions in unit tests so test focus only on function under test.
Actions = helpers in same file or imported externals.
No mocking entire modules.
Do not mock external utilities, actions, functions like this:

```typescript
// do not do this: Hoisted module mocking
describe("getBotReply", () => {
  // Mock external functions
  vi.mock("@/lib/actions/getAssistant");

  beforeEach(async () => {
    const { getAssistant } = await import("@/lib/actions/getAssistant");
    vi.mocked(getAssistant).mockReturnValue({
      id: "assistant-1",
      instructions: "Be helpful",
      transferDetectorPrompt: "Check if transfer needed",
    });
  });
});

// do not do this either: Non-hoisted Local/Scoped Module Mocking
const mockTestGuideReply = vi.fn();
const binding = createMockBindingSnapshot({ channel: "CHAT" });

vi.doMock("@/lib/actions/testGuideReply", () => ({
  testGuideReply: mockTestGuideReply,
}));
```

Instead, pass mocked function via `actions` argument to function under test.
Explore codebase for `actions` pattern.
Example:

```typescript
export function example(actions = { helper }) {
  return actions.helper();
}

export function helper() {
  return "this function should be mocked";
}
```

Mock fn not in `actions` arg → create `actions` or add to existing.

### Mock Repos

Prevent test hitting real DB → use mock repos.
Each repo has mock file, same name + `mock.ts` suffix.
Example: ActionAdapterRunsRepo.ts → ActionAdapterRunsRepo.mock.ts.
Example impl:

```typescript
export function getMockActionAdapterRunsRepo(): ExtractMockMethods<ActionAdapterRunsRepo> {
  return {
    ...getMockStandardRepo(),
    findByActionAdapterId: vi.fn(),
  };
}
```

New repo functions → add to mock file too.

Mock file missing → create it.

### Mock Services

Need mock service → check existing mocks first.
Exists → mock file same name + `mock.ts` suffix.
Example: ActionAdapterService.ts → ActionAdapterService.mock.ts.
Example impl:

```typescript
export function getMockActionAdapterService(): ExtractMockMethods<ActionAdapterService> {
  return {
    analyzeExternalActionsChanges: vi.fn(),
    create: vi.fn(),
    deleteActionAdapter: vi.fn(),
  };
}
```

New service functions → add to mock file too.

Mock file missing → create it.

### Mock Job Context

No real job context in tests → use mock to avoid side effects + external deps.
`getMockJobContext()` util provides mock.

### Mock Logger

use `getMockLogger()`

## Using Vitest

### Assertions

`toBe` check Reference Equality (Strict Identity).

`toEqual` check Deep Value Equality (Structural Equivalence).

Pick assertion match what you test.
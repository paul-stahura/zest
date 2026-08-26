---
name: writing-unit-tests
description: Writes unit tests for GLaDOS TypeScript code following project conventions. Use when creating tests for actions, services, repos, or any business logic. Ensures proper mocking patterns, Vitest setup, and adherence to GLaDOS testing standards.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Writing Unit Tests for GLaDOS

## When to Use This Skill

Use this skill when you need to:
- Write new unit tests for actions, services, or repos
- Add test coverage for business logic
- Create mocks for dependencies
- Follow GLaDOS testing conventions
- Fix or update existing tests

## Quick Reference

**Testing Framework**: Vitest
**Test Location**: `__tests__/` directory next to source file
**File Naming**: `<filename>.test.ts`
**Core Principle**: Test business logic, not infrastructure

## Testing Workflow

### 1. Identify What to Test

- **Actions**: All business logic must have unit tests
- **Focus**: Test areas of risk and critical business logic
- **Isolation**: Each function should be tested independently
- **Coverage**: When multiple functions exist in a file, test each one

### 2. Check for Existing Mocks

**Before creating new mocks, search the codebase:**

```bash
# Check for existing mock repos
find lib/repos -name "*.mock.ts"

# Check for existing mock services
find lib/services -name "*.mock.ts"

# Search for mock utilities
grep -r "getMock" lib/
```

### 3. Structure Your Test File

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { functionToTest } from "../functionToTest";
import { getMockLogger } from "@/lib/utils/logger.mock";

describe("functionToTest", () => {
  // Reset mocks individually - avoid vi.clearAllMocks()
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should describe expected behavior", () => {
    // Arrange: Set up test data and mocks
    const input = "test";

    // Act: Execute the function
    const result = functionToTest(input);

    // Assert: Verify the outcome
    expect(result).toBe("expected");
  });
});
```

**Key Conventions**:
- Simple structure - avoid nested `describe` blocks when possible
- No `beforeEach` for test data - prefer clarity over DRY
- One assertion focus per test
- Descriptive test names that explain the scenario

### 4. Mock Dependencies Using Actions Pattern

**DO NOT use vi.mock() for module mocking:**

```typescript
// ❌ WRONG - Avoid hoisted module mocking
vi.mock("@/lib/actions/helper");

// ❌ WRONG - Avoid vi.doMock()
vi.doMock("@/lib/actions/helper", () => ({
  helper: mockHelper,
}));
```

**DO use the actions parameter pattern:**

```typescript
// ✅ CORRECT - Function implementation
export function processData(
  data: string,
  actions = { helper, otherHelper }
) {
  const processed = actions.helper(data);
  return actions.otherHelper(processed);
}

// ✅ CORRECT - Test implementation
it("should process data using helper", () => {
  const mockHelper = vi.fn().mockReturnValue("processed");
  const mockOtherHelper = vi.fn().mockReturnValue("final");

  const result = processData("input", {
    helper: mockHelper,
    otherHelper: mockOtherHelper,
  });

  expect(mockHelper).toHaveBeenCalledWith("input");
  expect(result).toBe("final");
});
```

**If the function doesn't have an actions parameter:**
1. Add an `actions` parameter with default values
2. Update all helper function calls to use `actions.helperName()`
3. Update tests to pass mocked functions via actions

### 5. Mock Repositories

**Use existing mock repo files:**

```typescript
import { getMockActionAdapterRunsRepo } from "@/lib/repos/ActionAdapterRunsRepo.mock";

it("should query the database", async () => {
  const mockRepo = getMockActionAdapterRunsRepo();
  mockRepo.findByActionAdapterId.mockResolvedValue([
    /* mock data */
  ]);

  const result = await functionToTest(mockRepo);

  expect(mockRepo.findByActionAdapterId).toHaveBeenCalledWith("id");
});
```

**If the mock file doesn't exist:**

Create `<RepoName>.mock.ts` next to the repo file:

```typescript
import { vi } from "vitest";
import type { ExtractMockMethods } from "@/lib/utils/types";
import type { YourRepo } from "./YourRepo";
import { getMockStandardRepo } from "@/lib/repos/StandardRepo.mock";

export function getMockYourRepo(): ExtractMockMethods<YourRepo> {
  return {
    ...getMockStandardRepo(),
    customMethod: vi.fn(),
    anotherMethod: vi.fn(),
  };
}
```

### 6. Mock Services

**Use existing mock service files:**

```typescript
import { getMockActionAdapterService } from "@/lib/services/ActionAdapterService.mock";

it("should call the service", async () => {
  const mockService = getMockActionAdapterService();
  mockService.create.mockResolvedValue({ id: "123" });

  const result = await functionToTest(mockService);

  expect(mockService.create).toHaveBeenCalled();
});
```

**If the mock file doesn't exist:**

Create `<ServiceName>.mock.ts`:

```typescript
import { vi } from "vitest";
import type { ExtractMockMethods } from "@/lib/utils/types";
import type { YourService } from "./YourService";

export function getMockYourService(): ExtractMockMethods<YourService> {
  return {
    methodOne: vi.fn(),
    methodTwo: vi.fn(),
    methodThree: vi.fn(),
  };
}
```

### 7. Mock Domain Objects

**Create helper functions in your test file:**

```typescript
// ✅ CORRECT - Helper function with explicit types
function createMockUser(overrides?: Partial<User>): User {
  return {
    id: UserId("user-123"),
    name: "Test User",
    email: "test@example.com",
    ...overrides,
  };
}

it("should handle user data", () => {
  const user = createMockUser({ name: "Custom Name" });
  expect(processUser(user)).toBe("Custom Name");
});
```

**Avoid `as` or `as any` for domain objects:**

```typescript
// ❌ WRONG
const user = { id: "123" } as User;

// ✅ CORRECT
const user: User = {
  id: UserId("123"),
  name: "Test",
  email: "test@example.com",
};
```

### 8. Use Utility Functions for IDs

**Use type-specific constructors instead of `as`:**

```typescript
// ❌ WRONG
const correlationId = "test-correlation" as CorrelationId;

// ✅ CORRECT
const correlationId = CorrelationId("test-correlation");
```

### 9. Mock Common Utilities

**Job Context:**
```typescript
import { getMockJobContext } from "@/lib/utils/jobContext.mock";

const mockJobContext = getMockJobContext();
```

**Logger:**
```typescript
import { getMockLogger } from "@/lib/utils/logger.mock";

const mockLogger = getMockLogger();
```

### 10. Use Correct Assertions

**toBe vs toEqual:**

```typescript
// toBe: Reference equality (same object)
expect(result).toBe(sameObject);

// toEqual: Deep value equality (same structure/values)
expect(result).toEqual({ id: "123", name: "Test" });
```

**Common assertions:**
```typescript
expect(value).toBe(expected);              // Strict equality
expect(value).toEqual(expected);           // Deep equality
expect(value).toBeTruthy();                // Truthy value
expect(value).toBeFalsy();                 // Falsy value
expect(array).toHaveLength(3);             // Array length
expect(fn).toHaveBeenCalled();             // Mock was called
expect(fn).toHaveBeenCalledWith(arg);      // Mock called with args
expect(fn).toHaveBeenCalledTimes(2);       // Mock call count
expect(promise).resolves.toBe(value);      // Async success
expect(promise).rejects.toThrow(Error);    // Async error
```

## Common Patterns

### Testing Async Functions

```typescript
it("should handle async operations", async () => {
  const mockRepo = getMockRepo();
  mockRepo.find.mockResolvedValue({ id: "123" });

  const result = await asyncFunction(mockRepo);

  expect(result).toEqual({ id: "123" });
});
```

### Testing Error Handling

```typescript
it("should throw error when invalid input", () => {
  expect(() => functionToTest(null)).toThrow("Invalid input");
});

it("should handle async errors", async () => {
  const mockRepo = getMockRepo();
  mockRepo.find.mockRejectedValue(new Error("Not found"));

  await expect(asyncFunction(mockRepo)).rejects.toThrow("Not found");
});
```

### Testing Conditional Logic

```typescript
it("should return early when condition is false", () => {
  const result = functionToTest({ enabled: false });
  expect(result).toBe(null);
});

it("should process when condition is true", () => {
  const result = functionToTest({ enabled: true });
  expect(result).toBeDefined();
});
```

## Best Practices Checklist

Before submitting your test:

- [ ] All business logic has test coverage
- [ ] Tests focus on behavior, not implementation
- [ ] Mocks are reset individually in `beforeEach`
- [ ] No `vi.mock()` or `vi.doMock()` - using actions pattern
- [ ] Existing mock files are reused where possible
- [ ] New mock files created for new repos/services
- [ ] Explicit types used (no implicit `any`)
- [ ] ID types use constructor functions (not `as`)
- [ ] Domain objects use helper functions with explicit types
- [ ] Tests are simple and readable (clear over DRY)
- [ ] No global mocks that could affect parallel test runs
- [ ] Appropriate assertions (`toBe` vs `toEqual`)
- [ ] Async tests properly use `async/await`

## Running Tests

```bash
# Run all tests
make test

# Run specific test file
npx vitest run path/to/test.test.ts

# Run tests in watch mode
npx vitest watch

# Run tests with coverage
npx vitest run --coverage
```

## Reference Documentation

For detailed information, see:
- [Unit Testing Guide](../../../docs/user-guides/unit-testing.md)
- [Code Writing Guidance](../../../docs/user-guides/code-writing-guidance.md)

## Troubleshooting

**Test fails intermittently:**
- Check for global mocks affecting parallel runs
- Ensure mocks are reset in `beforeEach`
- Verify no shared state between tests

**Mock not working:**
- Verify using actions pattern, not `vi.mock()`
- Check mock is passed correctly to function
- Ensure mock function is properly configured

**Type errors in tests:**
- Use explicit types, not implicit any
- Use type constructors for IDs
- Create typed helper functions for domain objects

**Import errors:**
- Check `@/` alias is used correctly
- Verify mock files exist in same directory
- Ensure imports match file structure

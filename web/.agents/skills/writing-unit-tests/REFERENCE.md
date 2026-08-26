# Unit Testing Reference Guide

Detailed reference for GLaDOS unit testing patterns and utilities.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Mock Repository Patterns](#mock-repository-patterns)
- [Mock Service Patterns](#mock-service-patterns)
- [Actions Pattern Deep Dive](#actions-pattern-deep-dive)
- [Common Mock Utilities](#common-mock-utilities)
- [Type Utilities](#type-utilities)
- [Vitest API Reference](#vitest-api-reference)
- [Common Pitfalls](#common-pitfalls)

## Testing Philosophy

GLaDOS follows these core testing principles:

1. **Separate Business Logic from Infrastructure**
   - Business logic = pure functions, calculations, transformations
   - Infrastructure = database calls, API requests, external services
   - Test business logic without mocks; mock infrastructure at boundaries

2. **Test Areas of Risk**
   - Focus on critical business logic
   - Test edge cases and error conditions
   - Don't test trivial code or third-party libraries

3. **Clear Over DRY**
   - Prefer readable tests over abstracted ones
   - Avoid complex test setup that obscures intent
   - Duplicate test code when it improves clarity

4. **Simple Structure**
   - Avoid nested `describe` blocks
   - Minimize use of `beforeEach` for test data
   - One clear assertion focus per test

## Mock Repository Patterns

### Standard Mock Repository Structure

All repository mocks follow this pattern:

```typescript
// lib/repos/YourRepo.mock.ts
import { vi } from "vitest";
import type { ExtractMockMethods } from "@/lib/utils/types";
import type { YourRepo } from "./YourRepo";
import { getMockStandardRepo } from "@/lib/repos/StandardRepo.mock";

export function getMockYourRepo(): ExtractMockMethods<YourRepo> {
  return {
    ...getMockStandardRepo(), // Includes: findById, findAll, create, update, delete
    customMethod: vi.fn(),
    anotherMethod: vi.fn(),
  };
}
```

### Standard Repo Methods

The `getMockStandardRepo()` provides these common methods:

- `findById: vi.fn()`
- `findAll: vi.fn()`
- `create: vi.fn()`
- `update: vi.fn()`
- `delete: vi.fn()`
- `transaction: vi.fn()`

### Using Mock Repos in Tests

```typescript
import { getMockCustomerRepo } from "@/lib/repos/CustomerRepo.mock";

const mockRepo = getMockCustomerRepo();

// Configure return values
mockRepo.findById.mockResolvedValue({ id: "123", name: "Test" });

// Configure rejections
mockRepo.create.mockRejectedValue(new Error("Duplicate entry"));

// Multiple calls with different results
mockRepo.findAll
  .mockResolvedValueOnce([{ id: "1" }])
  .mockResolvedValueOnce([{ id: "1" }, { id: "2" }]);

// Verify calls
expect(mockRepo.findById).toHaveBeenCalledWith("123");
expect(mockRepo.findById).toHaveBeenCalledTimes(1);
```

## Mock Service Patterns

### Standard Mock Service Structure

```typescript
// lib/services/YourService.mock.ts
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

### Service Mock Usage

```typescript
import { getMockCustomerService } from "@/lib/services/CustomerService.mock";

const mockService = getMockCustomerService();

// Configure behavior
mockService.getCustomer.mockResolvedValue({ id: "123", name: "Test" });
mockService.updateCustomer.mockResolvedValue({ success: true });

// Test
const result = await someFunction(mockService);

// Verify
expect(mockService.getCustomer).toHaveBeenCalledWith("123");
```

## Actions Pattern Deep Dive

### Why We Use Actions Pattern

The actions pattern allows dependency injection without module mocking:

**Problems with vi.mock():**
- Hoisted to top of file (hard to control)
- Affects all tests in the file
- Can't be reset between tests easily
- Breaks with parallel test execution
- Makes tests brittle and hard to understand

**Benefits of Actions Pattern:**
- Explicit dependency injection
- Easy to mock per test
- Works with parallel execution
- Clear and testable
- Type-safe

### Converting Functions to Actions Pattern

**Before:**
```typescript
import { helper } from "./helper";

export function processData(data: string) {
  const validated = helper(data);
  return validated.toUpperCase();
}
```

**After:**
```typescript
import { helper } from "./helper";

export function processData(
  data: string,
  actions = { helper }
) {
  const validated = actions.helper(data);
  return validated.toUpperCase();
}

export { helper }; // Still export helper for other uses
```

**Test:**
```typescript
it("should process data", () => {
  const mockHelper = vi.fn().mockReturnValue("validated");

  const result = processData("input", {
    helper: mockHelper,
  });

  expect(mockHelper).toHaveBeenCalledWith("input");
  expect(result).toBe("VALIDATED");
});
```

### Multiple Dependencies

```typescript
export function complexProcess(
  data: string,
  actions = {
    validate,
    transform,
    save,
    notify,
  }
) {
  const validated = actions.validate(data);
  const transformed = actions.transform(validated);
  const saved = actions.save(transformed);
  actions.notify(saved);
  return saved;
}
```

```typescript
it("should process with multiple dependencies", () => {
  const mockValidate = vi.fn().mockReturnValue("valid");
  const mockTransform = vi.fn().mockReturnValue("transformed");
  const mockSave = vi.fn().mockReturnValue({ id: "123" });
  const mockNotify = vi.fn();

  const result = complexProcess("data", {
    validate: mockValidate,
    transform: mockTransform,
    save: mockSave,
    notify: mockNotify,
  });

  expect(mockValidate).toHaveBeenCalledWith("data");
  expect(mockTransform).toHaveBeenCalledWith("valid");
  expect(mockSave).toHaveBeenCalledWith("transformed");
  expect(mockNotify).toHaveBeenCalledWith({ id: "123" });
  expect(result).toEqual({ id: "123" });
});
```

### Async Actions

```typescript
export async function asyncProcess(
  id: string,
  actions = {
    fetchData,
    processData,
  }
) {
  const data = await actions.fetchData(id);
  return actions.processData(data);
}
```

```typescript
it("should handle async actions", async () => {
  const mockFetchData = vi.fn().mockResolvedValue({ raw: "data" });
  const mockProcessData = vi.fn().mockReturnValue({ processed: "data" });

  const result = await asyncProcess("123", {
    fetchData: mockFetchData,
    processData: mockProcessData,
  });

  expect(mockFetchData).toHaveBeenCalledWith("123");
  expect(mockProcessData).toHaveBeenCalledWith({ raw: "data" });
  expect(result).toEqual({ processed: "data" });
});
```

## Common Mock Utilities

### getMockLogger

```typescript
import { getMockLogger } from "@/lib/utils/logger.mock";

const mockLogger = getMockLogger();

// Available methods:
mockLogger.info(message, metadata);
mockLogger.warn(message, metadata);
mockLogger.error(message, metadata);
mockLogger.debug(message, metadata);

// Verify logging
expect(mockLogger.error).toHaveBeenCalledWith(
  "Error message",
  expect.objectContaining({ errorCode: "ERR_001" })
);
```

### getMockJobContext

```typescript
import { getMockJobContext } from "@/lib/utils/jobContext.mock";

const mockJobContext = getMockJobContext();

// Available properties and methods:
mockJobContext.correlationId;
mockJobContext.logger;
mockJobContext.signal; // AbortSignal
mockJobContext.state; // For job state management

// Use in tests
const result = await processJob(jobData, mockJobContext);
```

### Mock ID Constructors

Instead of using `as`, use the constructor functions:

```typescript
import {
  CustomerId,
  OrganizationId,
  ConversationId,
  CorrelationId,
  ActionAdapterId,
} from "@/lib/domain/*";

// In tests:
const customerId = CustomerId("cust-123");
const orgId = OrganizationId("org-456");
const conversationId = ConversationId("conv-789");
const correlationId = CorrelationId("corr-abc");
```

## Type Utilities

### ExtractMockMethods

Used to create properly typed mock objects:

```typescript
import type { ExtractMockMethods } from "@/lib/utils/types";
import type { YourService } from "./YourService";

export function getMockYourService(): ExtractMockMethods<YourService> {
  return {
    method1: vi.fn(),
    method2: vi.fn(),
  };
}
```

This utility ensures your mock has the same method signatures as the real service.

### Type-Safe Mock Return Values

```typescript
import type { Customer } from "@/lib/domain/Customer";

const mockCustomer: Customer = {
  id: CustomerId("123"),
  name: "Test",
  email: "test@example.com",
  // TypeScript enforces all required fields
};

mockRepo.findById.mockResolvedValue(mockCustomer);
```

## Vitest API Reference

### Mock Functions

```typescript
// Create mock
const mockFn = vi.fn();

// Return value
mockFn.mockReturnValue("result");

// Return value once
mockFn.mockReturnValueOnce("first").mockReturnValueOnce("second");

// Resolved promise
mockFn.mockResolvedValue({ data: "async result" });

// Resolved promise once
mockFn.mockResolvedValueOnce({ first: true })
  .mockResolvedValueOnce({ second: true });

// Rejected promise
mockFn.mockRejectedValue(new Error("Failed"));

// Implementation
mockFn.mockImplementation((arg) => arg * 2);

// Clear mock history
mockFn.mockClear();

// Reset mock (clear + remove implementations)
mockFn.mockReset();
```

### Assertions

```typescript
// Equality
expect(value).toBe(expected);           // Same reference
expect(value).toEqual(expected);        // Deep equality
expect(value).toStrictEqual(expected);  // Strict deep equality

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeUndefined();
expect(value).toBeNull();

// Numbers
expect(value).toBeGreaterThan(5);
expect(value).toBeGreaterThanOrEqual(5);
expect(value).toBeLessThan(10);
expect(value).toBeLessThanOrEqual(10);
expect(value).toBeCloseTo(0.3, 5); // Precision

// Strings
expect(string).toMatch(/pattern/);
expect(string).toContain("substring");

// Arrays
expect(array).toHaveLength(3);
expect(array).toContain(item);
expect(array).toContainEqual({ id: "123" });

// Objects
expect(object).toHaveProperty("key");
expect(object).toHaveProperty("key", value);
expect(object).toMatchObject({ subset: "match" });

// Functions
expect(fn).toThrow();
expect(fn).toThrow("Error message");
expect(fn).toThrow(ErrorClass);

// Async
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow("Error");

// Mock functions
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
expect(mockFn).toHaveBeenLastCalledWith(arg1);
expect(mockFn).toHaveBeenNthCalledWith(1, arg1);
```

### Test Lifecycle

```typescript
// Before/After hooks
beforeAll(() => {
  // Runs once before all tests
});

beforeEach(() => {
  // Runs before each test
});

afterEach(() => {
  // Runs after each test
});

afterAll(() => {
  // Runs once after all tests
});
```

### Test Utilities

```typescript
// Skip test
it.skip("should be skipped", () => {});

// Only run this test
it.only("should run only this", () => {});

// Test with timeout
it("should complete within 5s", async () => {
  // test
}, 5000);

// Concurrent tests
it.concurrent("test 1", async () => {});
it.concurrent("test 2", async () => {});
```

## Common Pitfalls

### Pitfall 1: Global Mocks

**Problem:**
```typescript
// ❌ This affects all tests in the file
vi.mock("@/lib/actions/helper");
```

**Solution:**
```typescript
// ✅ Use actions pattern
export function myFunction(actions = { helper }) {
  return actions.helper();
}
```

### Pitfall 2: Not Resetting Mocks

**Problem:**
```typescript
// ❌ Mock state leaks between tests
const mockFn = vi.fn();

it("test 1", () => {
  mockFn("call1");
  expect(mockFn).toHaveBeenCalledTimes(1);
});

it("test 2", () => {
  // mockFn still has call from test 1!
  expect(mockFn).toHaveBeenCalledTimes(0); // FAILS
});
```

**Solution:**
```typescript
// ✅ Reset in beforeEach
beforeEach(() => {
  mockFn.mockClear();
});
```

### Pitfall 3: Using 'as' for Types

**Problem:**
```typescript
// ❌ Type assertion bypasses type checking
const id = "123" as CustomerId;
const customer = { id: "123" } as Customer;
```

**Solution:**
```typescript
// ✅ Use constructor functions
const id = CustomerId("123");

// ✅ Use proper types
const customer: Customer = {
  id: CustomerId("123"),
  name: "Test",
  email: "test@example.com",
};
```

### Pitfall 4: Testing Implementation Details

**Problem:**
```typescript
// ❌ Testing how it's done, not what it does
it("should call helper then transformer", () => {
  const result = processData("input");
  expect(helper).toHaveBeenCalledBefore(transformer);
});
```

**Solution:**
```typescript
// ✅ Test the outcome
it("should return processed data", () => {
  const result = processData("input");
  expect(result).toEqual({ processed: true });
});
```

### Pitfall 5: Complex beforeEach Setup

**Problem:**
```typescript
// ❌ Hard to understand test setup
let customer: Customer;
let order: Order;
let result: ProcessResult;

beforeEach(() => {
  customer = createCustomer();
  order = createOrder(customer);
  result = processOrder(order);
});

it("should process order", () => {
  expect(result.success).toBe(true);
});
```

**Solution:**
```typescript
// ✅ Clear test setup
it("should process order", () => {
  const customer = createCustomer();
  const order = createOrder(customer);
  const result = processOrder(order);

  expect(result.success).toBe(true);
});
```

### Pitfall 6: Forgetting Async/Await

**Problem:**
```typescript
// ❌ Promise not awaited
it("should fetch data", () => {
  const result = fetchData(); // Returns promise
  expect(result.data).toBe("test"); // FAILS
});
```

**Solution:**
```typescript
// ✅ Properly handle async
it("should fetch data", async () => {
  const result = await fetchData();
  expect(result.data).toBe("test");
});
```

### Pitfall 7: Incorrect Assertion Type

**Problem:**
```typescript
// ❌ Using toBe for objects (reference equality)
const result = { id: "123" };
expect(result).toBe({ id: "123" }); // FAILS - different references
```

**Solution:**
```typescript
// ✅ Using toEqual for objects (deep equality)
const result = { id: "123" };
expect(result).toEqual({ id: "123" }); // PASSES
```

### Pitfall 8: Shared State Between Tests

**Problem:**
```typescript
// ❌ Shared array mutated by tests
const sharedArray = [1, 2, 3];

it("test 1", () => {
  sharedArray.push(4);
  expect(sharedArray).toHaveLength(4);
});

it("test 2", () => {
  expect(sharedArray).toHaveLength(3); // FAILS - has 4 items
});
```

**Solution:**
```typescript
// ✅ Create fresh data per test
it("test 1", () => {
  const array = [1, 2, 3];
  array.push(4);
  expect(array).toHaveLength(4);
});

it("test 2", () => {
  const array = [1, 2, 3];
  expect(array).toHaveLength(3);
});
```

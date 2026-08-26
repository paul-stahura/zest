# Unit Test Examples

This file provides concrete examples of well-written unit tests following GLaDOS conventions.

## Table of Contents

- [Simple Action Test](#simple-action-test)
- [Action with Dependencies (Actions Pattern)](#action-with-dependencies-actions-pattern)
- [Service Test with Mock Repo](#service-test-with-mock-repo)
- [Testing Error Handling](#testing-error-handling)
- [Testing Async Operations](#testing-async-operations)
- [Domain Object Helper Functions](#domain-object-helper-functions)

## Simple Action Test

Testing a pure function with no dependencies:

```typescript
// lib/actions/calculateScore.ts
export function calculateScore(points: number, multiplier: number): number {
  if (points < 0 || multiplier < 0) {
    throw new Error("Values must be positive");
  }
  return points * multiplier;
}
```

```typescript
// lib/actions/__tests__/calculateScore.test.ts
import { describe, it, expect } from "vitest";
import { calculateScore } from "../calculateScore";

describe("calculateScore", () => {
  it("should multiply points by multiplier", () => {
    const result = calculateScore(10, 2);
    expect(result).toBe(20);
  });

  it("should handle zero values", () => {
    const result = calculateScore(0, 5);
    expect(result).toBe(0);
  });

  it("should throw error for negative points", () => {
    expect(() => calculateScore(-5, 2)).toThrow("Values must be positive");
  });

  it("should throw error for negative multiplier", () => {
    expect(() => calculateScore(10, -2)).toThrow("Values must be positive");
  });
});
```

## Action with Dependencies (Actions Pattern)

Testing an action that calls helper functions:

```typescript
// lib/actions/processCustomerData.ts
import { validateEmail } from "./validateEmail";
import { formatName } from "./formatName";

export function processCustomerData(
  email: string,
  name: string,
  actions = { validateEmail, formatName }
) {
  if (!actions.validateEmail(email)) {
    throw new Error("Invalid email");
  }

  return {
    email,
    name: actions.formatName(name),
  };
}

export function validateEmail(email: string): boolean {
  return email.includes("@");
}

export function formatName(name: string): string {
  return name.trim().toUpperCase();
}
```

```typescript
// lib/actions/__tests__/processCustomerData.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { processCustomerData } from "../processCustomerData";

describe("processCustomerData", () => {
  let mockValidateEmail: ReturnType<typeof vi.fn>;
  let mockFormatName: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockValidateEmail = vi.fn();
    mockFormatName = vi.fn();
  });

  it("should process valid customer data", () => {
    mockValidateEmail.mockReturnValue(true);
    mockFormatName.mockReturnValue("JOHN DOE");

    const result = processCustomerData("john@example.com", "John Doe", {
      validateEmail: mockValidateEmail,
      formatName: mockFormatName,
    });

    expect(mockValidateEmail).toHaveBeenCalledWith("john@example.com");
    expect(mockFormatName).toHaveBeenCalledWith("John Doe");
    expect(result).toEqual({
      email: "john@example.com",
      name: "JOHN DOE",
    });
  });

  it("should throw error when email is invalid", () => {
    mockValidateEmail.mockReturnValue(false);

    expect(() =>
      processCustomerData("invalid", "John Doe", {
        validateEmail: mockValidateEmail,
        formatName: mockFormatName,
      })
    ).toThrow("Invalid email");

    expect(mockValidateEmail).toHaveBeenCalledWith("invalid");
    expect(mockFormatName).not.toHaveBeenCalled();
  });
});
```

## Service Test with Mock Repo

Testing a service that depends on a repository:

```typescript
// lib/services/__tests__/CustomerService.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { CustomerService } from "../CustomerService";
import { getMockCustomerRepo } from "@/lib/repos/CustomerRepo.mock";
import { getMockLogger } from "@/lib/utils/logger.mock";
import { CustomerId } from "@/lib/domain/Customer";

describe("CustomerService", () => {
  let service: CustomerService;
  let mockRepo: ReturnType<typeof getMockCustomerRepo>;
  let mockLogger: ReturnType<typeof getMockLogger>;

  beforeEach(() => {
    mockRepo = getMockCustomerRepo();
    mockLogger = getMockLogger();
    service = new CustomerService(mockRepo, mockLogger);
  });

  it("should find customer by id", async () => {
    const customerId = CustomerId("cust-123");
    const mockCustomer = {
      id: customerId,
      name: "John Doe",
      email: "john@example.com",
    };

    mockRepo.findById.mockResolvedValue(mockCustomer);

    const result = await service.getCustomer(customerId);

    expect(mockRepo.findById).toHaveBeenCalledWith(customerId);
    expect(result).toEqual(mockCustomer);
  });

  it("should return null when customer not found", async () => {
    const customerId = CustomerId("nonexistent");
    mockRepo.findById.mockResolvedValue(null);

    const result = await service.getCustomer(customerId);

    expect(mockRepo.findById).toHaveBeenCalledWith(customerId);
    expect(result).toBe(null);
  });

  it("should log error when database fails", async () => {
    const customerId = CustomerId("cust-123");
    const error = new Error("Database connection failed");
    mockRepo.findById.mockRejectedValue(error);

    await expect(service.getCustomer(customerId)).rejects.toThrow(
      "Database connection failed"
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Failed to get customer",
      expect.objectContaining({ customerId, error })
    );
  });
});
```

## Testing Error Handling

Examples of testing both sync and async error scenarios:

```typescript
// lib/actions/__tests__/errorHandling.test.ts
import { describe, it, expect } from "vitest";
import { processOrder, validateOrder } from "../orderProcessing";

describe("validateOrder", () => {
  it("should throw error for empty order id", () => {
    expect(() => validateOrder({ id: "", items: [] })).toThrow(
      "Order ID is required"
    );
  });

  it("should throw error for empty items", () => {
    expect(() => validateOrder({ id: "order-1", items: [] })).toThrow(
      "Order must have at least one item"
    );
  });

  it("should not throw for valid order", () => {
    expect(() =>
      validateOrder({ id: "order-1", items: [{ sku: "ABC" }] })
    ).not.toThrow();
  });
});

describe("processOrder (async)", () => {
  it("should reject when payment fails", async () => {
    const mockPaymentGateway = {
      charge: vi.fn().mockRejectedValue(new Error("Payment declined")),
    };

    await expect(
      processOrder(
        { id: "order-1", amount: 100 },
        { paymentGateway: mockPaymentGateway }
      )
    ).rejects.toThrow("Payment declined");
  });

  it("should resolve when payment succeeds", async () => {
    const mockPaymentGateway = {
      charge: vi.fn().mockResolvedValue({ transactionId: "txn-123" }),
    };

    const result = await processOrder(
      { id: "order-1", amount: 100 },
      { paymentGateway: mockPaymentGateway }
    );

    expect(result).toEqual({ transactionId: "txn-123" });
  });
});
```

## Testing Async Operations

Examples of testing promises and async functions:

```typescript
// lib/actions/__tests__/asyncOperations.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchUserData, syncUserData } from "../userSync";
import { getMockApiClient } from "@/lib/gateways/ApiClient.mock";

describe("fetchUserData", () => {
  let mockApiClient: ReturnType<typeof getMockApiClient>;

  beforeEach(() => {
    mockApiClient = getMockApiClient();
  });

  it("should fetch and return user data", async () => {
    const mockData = { id: "user-1", name: "Alice" };
    mockApiClient.get.mockResolvedValue(mockData);

    const result = await fetchUserData("user-1", mockApiClient);

    expect(mockApiClient.get).toHaveBeenCalledWith("/users/user-1");
    expect(result).toEqual(mockData);
  });

  it("should handle network errors", async () => {
    mockApiClient.get.mockRejectedValue(new Error("Network error"));

    await expect(fetchUserData("user-1", mockApiClient)).rejects.toThrow(
      "Network error"
    );
  });

  it("should retry on timeout", async () => {
    mockApiClient.get
      .mockRejectedValueOnce(new Error("Timeout"))
      .mockResolvedValueOnce({ id: "user-1", name: "Alice" });

    const result = await fetchUserData("user-1", mockApiClient, {
      retryOnTimeout: true,
    });

    expect(mockApiClient.get).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ id: "user-1", name: "Alice" });
  });
});

describe("syncUserData", () => {
  it("should handle multiple concurrent requests", async () => {
    const mockFetch = vi.fn().mockImplementation(async (id) => ({
      id,
      synced: true,
    }));

    const userIds = ["user-1", "user-2", "user-3"];
    const results = await syncUserData(userIds, { fetch: mockFetch });

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(3);
    expect(results).toEqual([
      { id: "user-1", synced: true },
      { id: "user-2", synced: true },
      { id: "user-3", synced: true },
    ]);
  });
});
```

## Domain Object Helper Functions

Creating reusable helper functions for test data:

```typescript
// lib/actions/__tests__/customerActions.test.ts
import { describe, it, expect } from "vitest";
import { processCustomer } from "../customerActions";
import type { Customer } from "@/lib/domain/Customer";
import { CustomerId } from "@/lib/domain/Customer";
import { OrganizationId } from "@/lib/domain/Organization";

// Helper function with explicit types
function createMockCustomer(overrides?: Partial<Customer>): Customer {
  return {
    id: CustomerId("cust-123"),
    organizationId: OrganizationId("org-456"),
    name: "John Doe",
    email: "john@example.com",
    status: "active",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

describe("processCustomer", () => {
  it("should process active customer", () => {
    const customer = createMockCustomer({ status: "active" });

    const result = processCustomer(customer);

    expect(result.shouldContact).toBe(true);
  });

  it("should skip inactive customer", () => {
    const customer = createMockCustomer({ status: "inactive" });

    const result = processCustomer(customer);

    expect(result.shouldContact).toBe(false);
  });

  it("should handle customer with custom organization", () => {
    const customOrgId = OrganizationId("org-custom");
    const customer = createMockCustomer({ organizationId: customOrgId });

    const result = processCustomer(customer);

    expect(result.organizationId).toBe(customOrgId);
  });

  it("should use specific dates for time-sensitive logic", () => {
    const oldDate = new Date("2020-01-01");
    const customer = createMockCustomer({ createdAt: oldDate });

    const result = processCustomer(customer);

    expect(result.isLegacyCustomer).toBe(true);
  });
});
```

## Testing with Multiple Mock Variations

Creating different mock scenarios:

```typescript
// lib/services/__tests__/OrderService.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { OrderService } from "../OrderService";
import { getMockOrderRepo } from "@/lib/repos/OrderRepo.mock";
import { OrderId } from "@/lib/domain/Order";
import type { Order } from "@/lib/domain/Order";

function createMockOrder(overrides?: Partial<Order>): Order {
  return {
    id: OrderId("order-123"),
    customerId: CustomerId("cust-456"),
    items: [],
    total: 0,
    status: "pending",
    createdAt: new Date(),
    ...overrides,
  };
}

describe("OrderService", () => {
  let service: OrderService;
  let mockRepo: ReturnType<typeof getMockOrderRepo>;

  beforeEach(() => {
    mockRepo = getMockOrderRepo();
    service = new OrderService(mockRepo);
  });

  it("should process pending orders", async () => {
    const pendingOrder = createMockOrder({ status: "pending" });
    mockRepo.findByStatus.mockResolvedValue([pendingOrder]);

    const result = await service.processPendingOrders();

    expect(mockRepo.findByStatus).toHaveBeenCalledWith("pending");
    expect(result.processed).toBe(1);
  });

  it("should skip completed orders", async () => {
    const completedOrder = createMockOrder({ status: "completed" });
    mockRepo.findByStatus.mockResolvedValue([completedOrder]);

    const result = await service.processPendingOrders();

    expect(result.processed).toBe(0);
  });

  it("should handle orders with multiple items", async () => {
    const orderWithItems = createMockOrder({
      items: [{ sku: "ABC", quantity: 2 }, { sku: "DEF", quantity: 1 }],
      total: 150,
    });

    const result = await service.calculateShipping(orderWithItems);

    expect(result.itemCount).toBe(2);
    expect(result.shippingCost).toBeGreaterThan(0);
  });
});
```

## Best Practices Demonstrated

These examples demonstrate:

1. **Clear test structure** - Arrange, Act, Assert
2. **Descriptive test names** - Explain what is being tested
3. **Actions pattern** - Dependencies injected via actions parameter
4. **Explicit types** - No implicit any or type assertions
5. **Helper functions** - Reusable mock data creators
6. **Individual mock reset** - Using beforeEach properly
7. **Appropriate assertions** - toBe vs toEqual
8. **Error testing** - Both sync and async error handling
9. **Async/await** - Proper async test patterns
10. **Mock configuration** - Setting up return values and rejections

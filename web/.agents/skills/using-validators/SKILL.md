---
name: using-validators
description: Guide for working with GLaDOS validators - type-safe validation functions for external data (Redis, APIs, databases). Use when validating data from external sources, working with untyped data, creating new validators, or finding existing validators.
---

# Using Validators

## When to Use This Skill

Activate this skill when:

- Validating data from external sources (Redis, API responses, database queries)
- Working with `unknown` typed data that needs type safety
- Creating new validator functions for domain types
- Finding existing validators before creating new ones
- Handling validation errors or debugging validation issues
- Converting untyped data to strongly-typed TypeScript objects

## What are Validators?

A **validator** is a function that:

1. Takes `unknown` data (e.g., from Redis, API responses, database queries)
2. Validates it matches a specific type structure (checking field names, types, required vs optional)
3. Returns the properly typed data or throws a `ValidationError` if validation fails

**Purpose:** When you retrieve data from external sources, it comes back as untyped data. The validator ensures:

- The data structure is correct before using it
- You get TypeScript type safety
- Corrupted/malformed data doesn't crash your app

## Instructions

### 1. Always Search for Existing Validators First

**CRITICAL:** Before creating a new validator, ALWAYS search for existing validators that match your type.

```bash
# Search for validators by domain/type name
find lib/domain -path "*/validation/*" -name "*.ts" -type f | grep -v test

# Search for specific validator function names
grep -r "validYourTypeName" lib/domain/*/validation/
```

**Common validator locations:**

- `lib/domain/*/validation/` - Domain-specific validators
- `lib/utils/validator/` - Core validator utilities
- Look for files named `valid*.ts` in the domain you're working with

**If a validator exists, USE IT.** Do not create duplicate validators.

### 2. Creating a New Validator

Only create a new validator if one doesn't exist. Follow this pattern:

```typescript
import { Validator, validate } from "@/lib/utils/validator/types";
import {
  boolean,
  field,
  object,
  optionalField,
  string,
} from "@/lib/utils/validator/validator";

// Define your data type
interface MyData {
  id: string;
  name: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

// Create a validator for it
const validMyData: Validator<MyData> = (data: unknown): MyData => {
  return object(data, () => ({
    id: field("id", string),
    name: field("name", string),
    enabled: field("enabled", boolean),
    config: optionalField("config", record(unknownLike)),
  }));
};

// Export it
export { validMyData };
```

**File Location:** Place validators in `lib/domain/<domain-name>/validation/valid<TypeName>.ts`

### 3. Using a Validator

```typescript
import { validate } from "@/lib/utils/validator/types";
import { validMyData } from "@/lib/domain/my-domain/validation/validMyData";

// Get untyped data from external source
const rawData: unknown = await redis.get("key");

// Validate it
const validatedData = validate(rawData, validMyData);
// validatedData is now typed as MyData
```

### 4. Common Validator Functions

**Basic Types:**

- `string` - Validates a string value
- `number` - Validates a number value
- `boolean` - Validates a boolean value
- `unknownLike` - Accepts any value (use sparingly)
- `text` - Validates text (longer strings)

**Object Validators:**

- `object(data, () => ({ ... }))` - Validates an object with specific fields
- `field("fieldName", validator)` - Validates a required field
- `optionalField("fieldName", validator)` - Validates an optional field

**Collection Validators:**

- `array(validator)` - Validates an array of items
- `record(validator)` - Validates a record/dictionary with string keys

**Advanced Validators:**

- `among(["value1", "value2"])` - Validates value is one of the allowed values
- `equals("exactValue")` - Validates value exactly matches
- `validate(data, validator)` - Wraps validator and throws ValidationError on failure

### 5. Composing Validators

Build complex validators from simpler ones:

```typescript
// Simple validator
const validUser: Validator<User> = (data: unknown): User => {
  return object(data, () => ({
    id: field("id", string),
    email: field("email", string),
  }));
};

// Array of users
const validUsers: Validator<User[]> = (data: unknown): User[] => {
  return array(validUser)(data);
};

// Nested objects
const validTeam: Validator<Team> = (data: unknown): Team => {
  return object(data, () => ({
    name: field("name", string),
    users: field("users", array(validUser)), // Reuse validUser
  }));
};
```

### 6. Type Aliases and Branded Types

For type aliases (branded types), use simple validators with type assertions:

```typescript
/* eslint-disable @typescript-eslint/consistent-type-assertions */
import { CustomerId } from "@/lib/domain/sidekick/Customer";
import { number } from "@/lib/utils/validator/validator";

export function validCustomerId(input: unknown): CustomerId {
  return number(input) as CustomerId;
}
```

**Note:** The `eslint-disable` comment is required for type assertions.

### 7. Handling Validation Errors

```typescript
import { validate } from "@/lib/utils/validator/types";
import { ValidationError } from "@/lib/utils/validator/ValidationError";

try {
  const data = validate(rawData, validMyData);
  // Use validated data
} catch (e) {
  if (e instanceof ValidationError) {
    // Access validation issues
    console.error("Validation failed:", e.issues);
    // e.issues is an array of { path: string[], message: string }
  }
  throw e;
}
```

## Examples

### Example 1: Simple Object Validator

**Input:** Untyped API response

```typescript
const rawData: unknown = {
  id: "123",
  name: "John Doe",
  enabled: true,
};
```

**Validator:**

```typescript
interface Config {
  id: string;
  name: string;
  enabled: boolean;
}

const validConfig: Validator<Config> = (data: unknown): Config => {
  return object(data, () => ({
    id: field("id", string),
    name: field("name", string),
    enabled: field("enabled", boolean),
  }));
};
```

**Usage:**

```typescript
const config = validate(rawData, validConfig);
// config is typed as Config
```

### Example 2: Complex Nested Validator

See `lib/domain/sidekick/validation/validExternalActions.ts` for a real-world example of:

- Nested object validation
- Array validation
- Optional fields
- Reusing validators
- Enum validation with `among()`

### Example 3: Type Alias Validator

**Input:** Branded type alias

```typescript
type FlowRunId = number & { __brand: "FlowRunId" };
```

**Validator:**

```typescript
/* eslint-disable @typescript-eslint/consistent-type-assertions */
export function validFlowRunId(input: unknown): FlowRunId {
  return number(input) as FlowRunId;
}
```

## Best Practices Checklist

- [ ] Searched for existing validators before creating new ones
- [ ] Used `field()` for required fields, `optionalField()` for optional fields
- [ ] Placed validator in `lib/domain/<domain>/validation/valid<TypeName>.ts`
- [ ] Exported validator function with `export` keyword
- [ ] Added type annotation: `Validator<YourType>`
- [ ] Imported from `@/lib/utils/validator/validator` (not relative paths)
- [ ] Used `validate()` wrapper when calling validators
- [ ] Handled `ValidationError` appropriately
- [ ] For type aliases, added `eslint-disable` comment for type assertions
- [ ] Composed validators from simpler validators when possible
- [ ] Used `unknownLike` sparingly (only when truly unknown)

## Reference Documentation

For complete details, see: `docs/user-guides/validators.md`

**Key Files:**

- Validator utilities: `lib/utils/validator/validator.ts`
- Validator types: `lib/utils/validator/types.ts`
- Example validators: `lib/domain/sidekick/validation/`
- External actions example: `lib/domain/sidekick/validation/validExternalActions.ts`

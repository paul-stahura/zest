---
paths: "lib/utils/validator/**/*.ts, lib/domain/**/validation/**/*.ts"
---

# Validators

## What are Validators?

**validator** = function that:

1. **Take unknown data** (e.g. from Redis, API responses, DB queries)
2. **Check match specific type structure** (field names, types, required vs optional)
3. **Return typed data** or throw `ValidationError` if fail

## Purpose

External data come untyped. Validator ensure:

- Structure correct before use
- TypeScript type safety
- Corrupt/malformed data no crash app

## Example

```typescript
import { Validator, validate } from "@/lib/utils/validator/types";
import {
  boolean,
  field,
  object,
  optionalField,
  record,
  string,
  unknownLike,
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

// Now use it
const rawData: unknown = {
  id: "123",
  name: "John Doe",
  enabled: true,
  config: { key: "value" },
};

const validatedData = validate(rawData, validMyData);
// validatedData is typed as MyData
```

## Common Validator Functions

### Basic Types

- `string` - string value
- `number` - number value
- `boolean` - boolean value
- `unknownLike` - any value (use sparingly)

### Object Validators

- `object(data, () => ({ ... }))` - object with specific fields
- `field("fieldName", validator)` - required field
- `optionalField("fieldName", validator)` - optional field

### Collection Validators

- `array(validator)` - array of items
- `record(validator)` - record/dict with string keys

### Example: Array of Objects

```typescript
import { array, field, object, string } from "@/lib/utils/validator/validator";

interface User {
  id: string;
  email: string;
}

const validUser: Validator<User> = (data: unknown): User => {
  return object(data, () => ({
    id: field("id", string),
    email: field("email", string),
  }));
};

const validUsers: Validator<User[]> = (data: unknown): User[] => {
  return array(validUser)(data);
};
```

## Resources

- **Validator utilities**: `lib/utils/validator/validator.ts`
- **Validator types**: `lib/utils/validator/types.ts`
- **Example validators**: `lib/domain/WebSearch/validation/`
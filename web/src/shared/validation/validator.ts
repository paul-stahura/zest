import { ValidationError, type Validator } from "@/shared/validation/types";

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}

function pathPrefix(path: readonly string[], key: string): string[] {
  return [...path, key];
}

/**
 * Validates that the value is a string.
 */
export const string: Validator<string> = (data: unknown): string => {
  if (typeof data !== "string") {
    throw new ValidationError("Expected string");
  }
  return data;
};

/**
 * Validates that the value is a finite number.
 */
export const number: Validator<number> = (data: unknown): number => {
  if (typeof data !== "number" || !Number.isFinite(data)) {
    throw new ValidationError("Expected finite number");
  }
  return data;
};

/**
 * Validates that the value is a boolean.
 */
export const boolean: Validator<boolean> = (data: unknown): boolean => {
  if (typeof data !== "boolean") {
    throw new ValidationError("Expected boolean");
  }
  return data;
};

/**
 * Accepts any JSON-like value while keeping the boundary explicit.
 */
export const unknownLike: Validator<unknown> = (data: unknown): unknown => {
  return data;
};

/**
 * Allows `undefined` or validates with the inner validator when present.
 */
export function optionalValue<T>(validator: Validator<T>): Validator<T | undefined> {
  return (data: unknown): T | undefined => {
    if (data === undefined) {
      return undefined;
    }
    return validator(data);
  };
}

/**
 * Validates each array element with the item validator.
 */
export function array<T>(item: Validator<T>): Validator<T[]> {
  return (data: unknown): T[] => {
    if (!Array.isArray(data)) {
      throw new ValidationError("Expected array");
    }
    const out: T[] = [];
    for (let i = 0; i < data.length; i += 1) {
      try {
        out.push(item(data[i]));
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new ValidationError(error.message, [`[${String(i)}]`, ...error.path]);
        }
        throw error;
      }
    }
    return out;
  };
}

/**
 * Validates a string-keyed record with a value validator.
 */
export function record<T>(value: Validator<T>): Validator<Record<string, T>> {
  return (data: unknown): Record<string, T> => {
    if (!isRecord(data)) {
      throw new ValidationError("Expected object");
    }
    const out: Record<string, T> = {};
    for (const key of Object.keys(data)) {
      try {
        out[key] = value(data[key]);
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new ValidationError(error.message, pathPrefix(error.path, key));
        }
        throw error;
      }
    }
    return out;
  };
}

type ShapeResult<TShape extends Record<string, Validator<unknown>>> = {
  [K in keyof TShape]: TShape[K] extends Validator<infer U> ? U : never;
};

/**
 * Validates an object by applying keyed validators to each property.
 */
export function object<TShape extends Record<string, Validator<unknown>>>(
  data: unknown,
  shape: () => TShape,
): ShapeResult<TShape> {
  if (!isRecord(data)) {
    throw new ValidationError("Expected object");
  }
  const spec = shape();
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Object.keys returns string[]; we know spec keys match TShape
  const keys = Object.keys(spec) as (keyof TShape & string)[];
  const out: Partial<ShapeResult<TShape>> = {};
  for (const key of keys) {
    const validator = spec[key];
    if (validator === undefined) {
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(data, key)) {
      throw new ValidationError(`Missing field: ${key}`, [key]);
    }
    try {
      const value = validator(data[key]);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- this helper assembles a generic mapped object
      out[key] = value as ShapeResult<TShape>[typeof key];
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(error.message, pathPrefix(error.path, key));
      }
      throw error;
    }
  }
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- the object was validated into the mapped shape above
  return out as ShapeResult<TShape>;
}

/**
 * Validator functions narrow unknown external data to a concrete type.
 * They throw {@link ValidationError} when the shape does not match.
 */
export type Validator<T> = (data: unknown) => T;

/**
 * Thrown when boundary validation fails; callers may attach correlation context upstream.
 */
export class ValidationError extends Error {
  public readonly path: readonly string[];

  public constructor(message: string, path: readonly string[] = []) {
    super(message);
    this.name = "ValidationError";
    this.path = path;
  }
}

/**
 * Validates external input using the supplied validator, preserving the project's boundary pattern.
 *
 * @param data - Untyped payload (files, JSON.parse, etc.)
 * @param validator - Type-safe validator
 * @returns The validated, typed value
 */
export function validate<T>(data: unknown, validator: Validator<T>): T {
  return validator(data);
}

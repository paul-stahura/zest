import { validate, ValidationError, type Validator } from "@/shared/validation/types";
import { array, number, object } from "@/shared/validation/validator";
import { IoError } from "@/shared/io/errors";
import type { Point2 } from "@/shared/io/types";

const validPoint2: Validator<Point2> = (data: unknown): Point2 => {
  return object(data, () => ({
    x: number,
    y: number,
  }));
};

/**
 * Validates a JSON payload shaped like an imported point set (used when round-tripping CSV-derived data).
 */
export const validImportedPointSetPayload: Validator<{ points: Point2[] }> = (data: unknown) => {
  return object(data, () => ({
    points: array(validPoint2),
  }));
};

/**
 * Validates untyped point rows (post-parse boundary) into canonical {@link Point2} values.
 */
export function validatePointRows(correlationId: string, points: unknown): Point2[] {
  try {
    return validate(points, array(validPoint2));
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new IoError(`Point validation failed: ${error.message}`, correlationId, { cause: error });
    }
    throw new IoError("Point validation failed", correlationId, { cause: error });
  }
}

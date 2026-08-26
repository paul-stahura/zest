import { IoError } from "@/shared/io/errors";
import type { ZestSessionEnvelopeV1 } from "@/shared/io/types";
import { validate, ValidationError, type Validator } from "@/shared/validation/types";
import { number, object, string, unknownLike } from "@/shared/validation/validator";

const versionOne = (data: unknown): 1 => {
  const n = number(data);
  if (n !== 1) {
    throw new ValidationError("Expected session envelope version 1");
  }
  return 1;
};

const validZestSessionEnvelopeV1: Validator<ZestSessionEnvelopeV1> = (data: unknown): ZestSessionEnvelopeV1 => {
  return object(data, () => ({
    version: versionOne,
    visualizationId: string,
    state: unknownLike,
  }));
};

/**
 * Parses and validates a JSON session envelope produced by {@link serializeSessionEnvelope}.
 */
export function parseSessionEnvelopeJson(correlationId: string, text: string): ZestSessionEnvelopeV1 {
  let parsed: unknown;
  try {
    const raw: unknown = JSON.parse(text);
    parsed = raw;
  } catch (error) {
    throw new IoError("Session JSON could not be parsed", correlationId, { cause: error });
  }

  try {
    return validate(parsed, validZestSessionEnvelopeV1);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new IoError(`Session JSON failed validation: ${error.message}`, correlationId, { cause: error });
    }
    throw new IoError("Session JSON failed validation", correlationId, { cause: error });
  }
}

/**
 * Serializes a typed session envelope for download or clipboard handoff.
 */
export function serializeSessionEnvelope(envelope: ZestSessionEnvelopeV1): string {
  return JSON.stringify(envelope, null, 2);
}

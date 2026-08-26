import { IoError } from "@/shared/io/errors";
import { validate, ValidationError, type Validator } from "@/shared/validation/types";
import { array, boolean, number } from "@/shared/validation/validator";
import type { MainWorkspaceSerializableState } from "@/features/main-workspace/types";
import type { Point2 } from "@/shared/io/types";
import type { ZetaDrawMode } from "@/shared/math/zetaEms";

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}

const DRAW_MODES: readonly ZetaDrawMode[] = ["all", "upToSum1", "upToSum1Vector", "bisectorLink", "lastSpiral", "lastLink"];

const validPoint2: Validator<Point2> = (data: unknown): Point2 => {
  if (!isRecord(data)) {
    throw new ValidationError("Expected point object");
  }
  const x = number(data.x);
  const y = number(data.y);
  return { x, y };
};

const validDrawMode: Validator<ZetaDrawMode> = (data: unknown): ZetaDrawMode => {
  if (typeof data !== "string") {
    throw new ValidationError("Invalid drawMode");
  }
  for (const mode of DRAW_MODES) {
    if (data === mode) {
      return mode;
    }
  }
  throw new ValidationError("Invalid drawMode");
};

function optionalBool(data: Record<string, unknown>, key: string, defaultValue: boolean): boolean {
  return Object.prototype.hasOwnProperty.call(data, key) ? boolean(data[key]) : defaultValue;
}

function optionalNumber(data: Record<string, unknown>, key: string, defaultValue: number): number {
  return Object.prototype.hasOwnProperty.call(data, key) ? number(data[key]) : defaultValue;
}

/**
 * Bisector midpoint mode: 0=Off … 4=All.
 * Accepts legacy boolean exports (true→1 R1ps, false→0).
 */
function validBisectorPointMode(data: unknown): number {
  if (typeof data === "boolean") return data ? 1 : 0;
  const n = number(data);
  if (!Number.isInteger(n) || n < 0 || n > 4) {
    throw new ValidationError("showBisectorPoint must be 0..4");
  }
  return n;
}

/**
 * Validates persisted main-workspace JSON prior to restoring module-owned state.
 */
export const validMainWorkspaceSerializedState: Validator<MainWorkspaceSerializableState> = (
  data: unknown,
): MainWorkspaceSerializableState => {
  if (!isRecord(data)) {
    throw new ValidationError("Expected object");
  }

  const sigma = number(data.sigma);
  const index = number(data.index);
  const usePolyImag = boolean(data.usePolyImag);
  const extendSpiralCount = number(data.extendSpiralCount);
  const drawMode = validDrawMode(data.drawMode);
  const showZetaEndpoint = boolean(data.showZetaEndpoint);
  const showBisectorPoint = validBisectorPointMode(data.showBisectorPoint);
  const colorLinks = optionalNumber(data, "colorLinks", 0);

  // Matrix toggles — optional with defaults (backward-compat with old exports)
  const spiralVisible  = optionalBool(data, "spiralVisible",  true);
  const spiralFirstHalf = optionalBool(data, "spiralFirstHalf", false);
  const spiralReflect  = optionalBool(data, "spiralReflect",  false);
  const spiralHalfSigma = optionalBool(data, "spiralHalfSigma", false);
  const spiralReverse  = optionalBool(data, "spiralReverse",  false);
  const inverseVisible = optionalBool(data, "inverseVisible", false);
  const inverseFirstHalf = optionalBool(data, "inverseFirstHalf", false);
  const inverseReflect = optionalBool(data, "inverseReflect", false);
  const sumXVisible    = optionalBool(data, "sumXVisible",    false);
  const sumXReflect    = optionalBool(data, "sumXReflect",    false);
  const sum2xVisible   = optionalBool(data, "sum2xVisible",   false);
  const sum2xReflect   = optionalBool(data, "sum2xReflect",   false);
  const zakVisible     = optionalBool(data, "zakVisible",     false);
  const zakReflect     = optionalBool(data, "zakReflect",     false);
  const crossingSumVisible = optionalBool(data, "crossingSumVisible", false);
  const etaVisible     = optionalBool(data, "etaVisible",     false);
  const zPrimeVisible  = optionalBool(data, "zPrimeVisible",  false);

  let importedPoints: Point2[] | undefined;
  if (Object.prototype.hasOwnProperty.call(data, "importedPoints")) {
    importedPoints = array(validPoint2)(data.importedPoints);
  }

  // Remainder layer toggles — all optional, default 0 / false
  const rHalfPoint      = optionalNumber(data, "rHalfPoint",      0);
  const rHalfR1         = optionalNumber(data, "rHalfR1",         0);
  const rHalfR2         = optionalNumber(data, "rHalfR2",         0);
  const rHalfLegsFwd    = optionalNumber(data, "rHalfLegsFwd",    0);
  const rHalfLegsInv    = optionalNumber(data, "rHalfLegsInv",    0);
  const rHalfSym        = optionalNumber(data, "rHalfSym",        0);
  const rHalfPathSigma  = optionalNumber(data, "rHalfPathSigma",  0);
  const rHalfPathIndex  = optionalNumber(data, "rHalfPathIndex",  0);
  const rpsPoint        = optionalNumber(data, "rpsPoint",        0);
  const rpsR1           = optionalNumber(data, "rpsR1",           0);
  const rpsR2           = optionalNumber(data, "rpsR2",           0);
  const rpsLegsFwd      = optionalNumber(data, "rpsLegsFwd",      0);
  const rpsLegsInv      = optionalNumber(data, "rpsLegsInv",      0);
  const rpsSym          = optionalNumber(data, "rpsSym",          0);
  const rpsPathSigma    = optionalNumber(data, "rpsPathSigma",    0);
  const rpsPathIndex    = optionalNumber(data, "rpsPathIndex",    0);
  const rakPoint        = optionalNumber(data, "rakPoint",        0);
  const rakR1           = optionalNumber(data, "rakR1",           0);
  const rakR2           = optionalNumber(data, "rakR2",           0);
  const rakLegsFwd      = optionalNumber(data, "rakLegsFwd",      0);
  const rakLegsInv      = optionalNumber(data, "rakLegsInv",      0);
  const rakSym          = optionalNumber(data, "rakSym",          0);
  const rakPathSigma    = optionalNumber(data, "rakPathSigma",    0);
  const rakPathIndex    = optionalNumber(data, "rakPathIndex",    0);
  const remainderPathLength = optionalNumber(data, "remainderPathLength", 0);

  // L-function layer — all optional with defaults
  const lfL1Enabled    = optionalBool(data,   "lfL1Enabled",    false);
  const lfL2Enabled    = optionalBool(data,   "lfL2Enabled",    false);
  const lfL1Prime      = optionalNumber(data, "lfL1Prime",      3);
  const lfL2Prime      = optionalNumber(data, "lfL2Prime",      5);
  const lfL1SpiralMode = optionalNumber(data, "lfL1SpiralMode", 0);
  const lfL2SpiralMode = optionalNumber(data, "lfL2SpiralMode", 0);
  const lfL1Reflect    = optionalBool(data,   "lfL1Reflect",    false);
  const lfL2Reflect    = optionalBool(data,   "lfL2Reflect",    false);
  const lfL1Bisector   = optionalBool(data,   "lfL1Bisector",   false);
  const lfL2Bisector   = optionalBool(data,   "lfL2Bisector",   false);
  const lfPhantomMode  = optionalNumber(data, "lfPhantomMode",  2);
  const lfUsePrimeImag = optionalBool(data,   "lfUsePrimeImag", true);

  return {
    sigma,
    index,
    usePolyImag,
    extendSpiralCount,
    drawMode,
    showZetaEndpoint,
    showBisectorPoint,
    colorLinks,
    spiralVisible,
    spiralFirstHalf,
    spiralReflect,
    spiralHalfSigma,
    spiralReverse,
    inverseVisible,
    inverseFirstHalf,
    inverseReflect,
    sumXVisible,
    sumXReflect,
    sum2xVisible,
    sum2xReflect,
    zakVisible,
    zakReflect,
    crossingSumVisible,
    etaVisible,
    zPrimeVisible,
    importedPoints,
    rHalfPoint, rHalfR1, rHalfR2, rHalfLegsFwd, rHalfLegsInv,
    rHalfSym, rHalfPathSigma, rHalfPathIndex,
    rpsPoint, rpsR1, rpsR2, rpsLegsFwd, rpsLegsInv,
    rpsSym, rpsPathSigma, rpsPathIndex,
    rakPoint, rakR1, rakR2, rakLegsFwd, rakLegsInv,
    rakSym, rakPathSigma, rakPathIndex,
    remainderPathLength,
    lfL1Enabled, lfL2Enabled,
    lfL1Prime, lfL2Prime,
    lfL1SpiralMode, lfL2SpiralMode,
    lfL1Reflect, lfL2Reflect,
    lfL1Bisector, lfL2Bisector,
    lfPhantomMode, lfUsePrimeImag,
  };
};

/**
 * Parses and validates main-workspace JSON using {@link validMainWorkspaceSerializedState}.
 */
export function parseMainWorkspaceSerializedState(correlationId: string, text: string): MainWorkspaceSerializableState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new IoError("Main workspace JSON could not be parsed", correlationId, { cause: error });
  }

  try {
    return validate(parsed, validMainWorkspaceSerializedState);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new IoError(`Main workspace JSON failed validation: ${error.message}`, correlationId, { cause: error });
    }
    throw new IoError("Main workspace JSON failed validation", correlationId, { cause: error });
  }
}

import { IoError } from "@/shared/io/errors";
import { validate, ValidationError, type Validator } from "@/shared/validation/types";
import { array, boolean, number, string } from "@/shared/validation/validator";
import type { MainWorkspaceSerializableState } from "@/features/main-workspace/types";
import { clampHurwitzFormulaQMax } from "@/shared/math/hurwitzFormulaQMax";
import type { Point2 } from "@/shared/io/types";
import type { ZetaDrawMode } from "@/shared/math/zetaEms";
import {
  defaultHurwitzCoeffs,
  resizeHurwitzCoeffs,
  type HurwitzCoeff,
} from "@/shared/math/lFunctionCalculator";

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

const validHurwitzCoeff: Validator<HurwitzCoeff> = (data: unknown): HurwitzCoeff => {
  if (!isRecord(data)) {
    throw new ValidationError("Expected Hurwitz coefficient object");
  }
  return { re: number(data.re), im: number(data.im) };
};

function hpRowOn(data: Record<string, unknown>): boolean {
  if (Object.prototype.hasOwnProperty.call(data, "on")) return boolean(data.on);
  const draw = Object.prototype.hasOwnProperty.call(data, "draw") ? boolean(data.draw) : false;
  const lines = Object.prototype.hasOwnProperty.call(data, "lines") ? boolean(data.lines) : false;
  return draw || lines;
}

const validHpRow: Validator<{ id: string; on: boolean }> = (
  data: unknown,
): { id: string; on: boolean } => {
  if (!isRecord(data)) {
    throw new ValidationError("Expected perp-through-H/2 row");
  }
  return { id: string(data.id), on: hpRowOn(data) };
};

function optionalHpRows(data: Record<string, unknown>): { id: string; on: boolean }[] {
  if (!Object.prototype.hasOwnProperty.call(data, "hpRows")) return [];
  return array(validHpRow)(data.hpRows);
}

function optionalHurwitzCoeffs(data: Record<string, unknown>): HurwitzCoeff[] {
  if (!Object.prototype.hasOwnProperty.call(data, "hmCoeffs")) {
    return defaultHurwitzCoeffs(5);
  }
  const items = array(validHurwitzCoeff)(data.hmCoeffs);
  if (items.length < 1) {
    throw new ValidationError("hmCoeffs must be non-empty");
  }
  return resizeHurwitzCoeffs(items, items.length);
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
  const showOrigin = optionalBool(data, "showOrigin", false);
  const showZetaEndpoint = boolean(data.showZetaEndpoint);
  const showBisectorPoint = validBisectorPointMode(data.showBisectorPoint);
  const showB1Star = optionalBool(data, "showB1Star", false);
  const showZetaPrimeToZeta = optionalBool(data, "showZetaPrimeToZeta", false);
  const showRightAngle = optionalBool(data, "showRightAngle", false);
  const showMStar = optionalBool(data, "showMStar", false);
  const showRho = optionalBool(data, "showRho", false);
  const showOneMinusRho = optionalBool(data, "showOneMinusRho", false);
  const showZetaLogDeriv = optionalBool(data, "showZetaLogDeriv", false);
  const showChiLogDeriv = optionalBool(data, "showChiLogDeriv", false);
  const showHStar = optionalBool(data, "showHStar", false);
  const showAkG0 = optionalBool(data, "showAkG0", false);
  const showAkQ0 = optionalBool(data, "showAkQ0", false);
  const showAkQ1 = optionalBool(data, "showAkQ1", false);
  const showAkQ2 = optionalBool(data, "showAkQ2", false);
  const showAkQ3 = optionalBool(data, "showAkQ3", false);
  const showAkQ4 = optionalBool(data, "showAkQ4", false);
  const showAkSum = optionalBool(data, "showAkSum", false);
  const colorLinks = optionalNumber(data, "colorLinks", 0);

  // Matrix toggles — optional with defaults (backward-compat with old exports)
  const spiralVisible  = optionalBool(data, "spiralVisible",  true);
  const spiralFirstHalf = optionalBool(data, "spiralFirstHalf", false);
  const fOfSVisible = optionalBool(data, "fOfSVisible", false);
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
  const allRemaindersVisible = optionalBool(data, "allRemaindersVisible", false);
  const etaVisible     = optionalBool(data, "etaVisible",     false);
  const zPrimeVisible  = optionalBool(data, "zPrimeVisible",  false);
  const zPrimeReflect  = optionalBool(data, "zPrimeReflect",  false);

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
  const lfFLEnabled    = optionalBool(data,   "lfFLEnabled",    false);
  const lfTLEnabled    = optionalBool(data,   "lfTLEnabled",    false);
  const lfL1Prime      = optionalNumber(data, "lfL1Prime",      3);
  const lfL2Prime      = optionalNumber(data, "lfL2Prime",      5);
  const lfL1SpiralMode = optionalNumber(data, "lfL1SpiralMode", 0);
  const lfL2SpiralMode = optionalNumber(data, "lfL2SpiralMode", 0);
  const lfFLSpiralMode = optionalNumber(data, "lfFLSpiralMode", 0);
  const lfTLWhich      = optionalNumber(data, "lfTLWhich",      2);
  const lfTLSpiralMode = optionalNumber(data, "lfTLSpiralMode", 0);
  const lfL1Reflect    = optionalBool(data,   "lfL1Reflect",    false);
  const lfL2Reflect    = optionalBool(data,   "lfL2Reflect",    false);
  const lfFLReflect    = optionalBool(data,   "lfFLReflect",    false);
  const lfTLReflect    = optionalBool(data,   "lfTLReflect",    false);
  const lfL1Bisector   = optionalBool(data,   "lfL1Bisector",   false);
  const lfL2Bisector   = optionalBool(data,   "lfL2Bisector",   false);
  const lfFLBisector   = optionalBool(data,   "lfFLBisector",   false);
  const lfTLBisector   = optionalBool(data,   "lfTLBisector",   false);
  const lfPhantomMode  = optionalNumber(data, "lfPhantomMode",  2);
  const lfUsePrimeImag = optionalBool(data,   "lfUsePrimeImag", true);
  const hmEnabled      = optionalBool(data,   "hmEnabled",      false);
  const hmCoeffs       = optionalHurwitzCoeffs(data);
  const hmSpiralMode   = optionalNumber(data, "hmSpiralMode",   0);
  const hmPhantomMode  = optionalNumber(data, "hmPhantomMode",  2);
  const hmReflect      = optionalBool(data,   "hmReflect",      false);
  const hmBisector     = optionalBool(data,   "hmBisector",     false);
  const hmPerp         = optionalBool(data,   "hmPerp",         false);
  const hpRows         = optionalHpRows(data);
  const hpCircle       = optionalBool(data,   "hpCircle",       false);
  const hpShowSpiral   = optionalBool(data,   "hpShowSpiral",   false);
  const hpShowReverse  = optionalBool(data,   "hpShowReverse",  false);
  const hpShowOH       = optionalBool(data,   "hpShowOH",       false);
  const hpShowPerp     = optionalBool(data,   "hpShowPerp",     false);
  const hpShowBLink    = optionalBool(data,   "hpShowBLink",    true);
  const hpShowBPoint   = optionalBool(data,   "hpShowBPoint",   true);
  const hpShowQ2Circle = optionalBool(data,   "hpShowQ2Circle", false);
  const hpShowQ3Circle = optionalBool(data,   "hpShowQ3Circle", false);
  const hpShowQ4Circle = optionalBool(data,   "hpShowQ4Circle", false);
  const hpShowQ5Circle = optionalBool(data,   "hpShowQ5Circle", false);
  const hpShowQ6Circle = optionalBool(data,   "hpShowQ6Circle", false);
  const hpShowH        = optionalBool(data,   "hpShowH",        false);
  const hpShowB1Star   = optionalBool(data,   "hpShowB1Star",   false);
  const hpQ2OmegaOn    = optionalBool(data,   "hpQ2OmegaOn",    false);
  const hpQ2OmegaDeg   = optionalNumber(data, "hpQ2OmegaDeg",   0);
  const hpQ2OmegaLock  = optionalBool(data,   "hpQ2OmegaLock",  false);
  const hpOmegaOn      = optionalBool(data,   "hpOmegaOn",      false);
  const hpOmegaDeg     = optionalNumber(data, "hpOmegaDeg",     0);
  const hpQ3OmegaLock  = optionalBool(data,   "hpQ3OmegaLock",  false);
  const hpQ4OmegaOn    = optionalBool(data,   "hpQ4OmegaOn",    false);
  const hpQ4OmegaDeg   = optionalNumber(data, "hpQ4OmegaDeg",   0);
  const hpQ4OmegaLock  = optionalBool(data,   "hpQ4OmegaLock",  false);
  const hpQ5OmegaOn    = optionalBool(data,   "hpQ5OmegaOn",    false);
  const hpQ5OmegaDeg   = optionalNumber(data, "hpQ5OmegaDeg",   0);
  const hpQ5OmegaLock  = optionalBool(data,   "hpQ5OmegaLock",  false);
  const hpQ6OmegaOn    = optionalBool(data,   "hpQ6OmegaOn",    false);
  const hpQ6OmegaDeg   = optionalNumber(data, "hpQ6OmegaDeg",   0);
  const hpQ6OmegaLock  = optionalBool(data,   "hpQ6OmegaLock",  false);
  const hfQMax         = clampHurwitzFormulaQMax(optionalNumber(data, "hfQMax", 2));
  const hfSingle       = optionalBool(data,   "hfSingle",       true);
  const hfShowSpiral   = optionalBool(data,   "hfShowSpiral",   false);
  const hfShowReverse  = optionalBool(data,   "hfShowReverse",  false);
  const hfShowBLink    = optionalBool(data,   "hfShowBLink",    false);
  const hfShowBPoint   = optionalBool(data,   "hfShowBPoint",   false);
  const hfShowOZ       = optionalBool(data,   "hfShowOZ",       false);
  const hfShowPerp     = optionalBool(data,   "hfShowPerp",     false);
  const hfShowCircle   = optionalBool(data,   "hfShowCircle",   false);
  const hfShowOH       = optionalBool(data,   "hfShowOH",       false);

  return {
    sigma,
    index,
    usePolyImag,
    extendSpiralCount,
    drawMode,
    showOrigin,
    showZetaEndpoint,
    showBisectorPoint,
    showB1Star,
    showZetaPrimeToZeta,
    showRightAngle,
    showMStar,
    showRho,
    showOneMinusRho,
    showZetaLogDeriv,
    showChiLogDeriv,
    showHStar,
    showAkG0,
    showAkQ0,
    showAkQ1,
    showAkQ2,
    showAkQ3,
    showAkQ4,
    showAkSum,
    colorLinks,
    spiralVisible,
    spiralFirstHalf,
    fOfSVisible,
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
    allRemaindersVisible,
    etaVisible,
    zPrimeVisible,
    zPrimeReflect,
    importedPoints,
    rHalfPoint, rHalfR1, rHalfR2, rHalfLegsFwd, rHalfLegsInv,
    rHalfSym, rHalfPathSigma, rHalfPathIndex,
    rpsPoint, rpsR1, rpsR2, rpsLegsFwd, rpsLegsInv,
    rpsSym, rpsPathSigma, rpsPathIndex,
    rakPoint, rakR1, rakR2, rakLegsFwd, rakLegsInv,
    rakSym, rakPathSigma, rakPathIndex,
    remainderPathLength,
    lfL1Enabled, lfL2Enabled, lfFLEnabled, lfTLEnabled,
    lfL1Prime, lfL2Prime,
    lfL1SpiralMode, lfL2SpiralMode, lfFLSpiralMode, lfTLWhich, lfTLSpiralMode,
    lfL1Reflect, lfL2Reflect, lfFLReflect, lfTLReflect,
    lfL1Bisector, lfL2Bisector, lfFLBisector, lfTLBisector,
    lfPhantomMode, lfUsePrimeImag,
    hmEnabled, hmCoeffs, hmSpiralMode, hmPhantomMode, hmReflect, hmBisector, hmPerp,
    hpRows, hpCircle, hpShowSpiral, hpShowReverse, hpShowOH, hpShowPerp, hpShowBLink, hpShowBPoint, hpShowQ2Circle, hpShowQ3Circle, hpShowQ4Circle, hpShowQ5Circle, hpShowQ6Circle, hpShowH, hpShowB1Star, hpQ2OmegaOn, hpQ2OmegaDeg, hpQ2OmegaLock, hpOmegaOn, hpOmegaDeg, hpQ3OmegaLock, hpQ4OmegaOn, hpQ4OmegaDeg, hpQ4OmegaLock, hpQ5OmegaOn, hpQ5OmegaDeg, hpQ5OmegaLock, hpQ6OmegaOn, hpQ6OmegaDeg, hpQ6OmegaLock, hfQMax, hfSingle, hfShowSpiral, hfShowReverse, hfShowBLink, hfShowBPoint, hfShowOZ, hfShowPerp, hfShowCircle, hfShowOH,
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

import { clampSpectrumFeather, DEFAULT_SPECTRUM_FEATHER } from "@/features/zeros-of-f/fracToHue";
import { DEFAULT_STATE, type ZerosOfFSerializableState, type DisplayControlsState } from "@/features/zeros-of-f/types";
import {
  clampOrbitPitchDeg,
  parseZerosDisplayView,
  wrapOrbitYawDeg,
} from "@/shared/math/zerosOfF/displayView";
import { parseFracTJustOneDigits, parseFracTQuarterPreset } from "@/shared/math/zerosOfF/fracTDisplayFilter";
import type { ScanAlgorithm, ScanBackendChoice } from "@/shared/scan/scanBackend";
import { validate, ValidationError, type Validator } from "@/shared/validation/types";
import { boolean, number, object, optionalValue, string } from "@/shared/validation/validator";
import type { FVariant } from "@/shared/math/zerosOfF";
import { parseZerosHarvestFamily } from "@/shared/math/zerosOfF/harvestFamily";

const FVARIANTS = new Set<FVariant>([
  "R1ak", "R1ps", "R2ak", "R2ps", "R1nak",
  "legRatio_ak", "legRatio_ps",
  "legAngle_ak", "legAngle_ps",
  "legAngleOut_ak", "legAngleOut_ps",
  "sum1R1Angle_ak", "sum1R1Angle_ps",
]);

// Backward-compat: pre-rename strings map to their `_ps` (or just-renamed)
// equivalents. Old archive entries and persisted UI state load cleanly.
const LEGACY_VARIANT_MAP: Record<string, FVariant> = {
  R1: "R1ps",
  R2: "R2ps",
  legRatio: "legRatio_ps",
  legAngle: "legAngle_ps",
  legAngleOut: "legAngleOut_ps",
};

const validVariant: Validator<FVariant> = (data: unknown) => {
  const s = string(data);
  if (FVARIANTS.has(s as FVariant)) return s as FVariant;
  const mapped = LEGACY_VARIANT_MAP[s];
  if (mapped !== undefined) return mapped;
  throw new ValidationError(`Expected a valid f-variant, got '${s}'`);
};

const validAlgorithm: Validator<ScanAlgorithm> = (data: unknown) => {
  const s = string(data);
  if (s !== "sign-change" && s !== "minima") {
    throw new ValidationError(`Expected algorithm 'sign-change' or 'minima', got '${s}'`);
  }
  return s;
};

const validScan: Validator<ZerosOfFSerializableState["scan"]> = (data) => {
  const raw = object(data, () => ({
    variant: validVariant,
    branch: optionalValue(string),
    ridgeRange: optionalValue(boolean),
    tMin: number,
    tMax: number,
    sigmaMin: number,
    sigmaMax: number,
    linesPerSigma: number,
    linesPerSigmaAdaptive: optionalValue(boolean),
    samplesPerT: number,
    bisectionIters: number,
    algorithm: optionalValue(validAlgorithm),
    acceptDepth: optionalValue(number),
    seed: number,
  }));
  // Backfill defaults for fields added in v2 so older saved state still loads.
  // Clamp persisted acceptDepth to the current [0, 0.01] slider range.
  const ad = raw.acceptDepth ?? 0.0005;
  return {
    ...raw,
    algorithm: raw.algorithm ?? "sign-change",
    acceptDepth: Math.max(0, Math.min(0.01, ad)),
    linesPerSigmaAdaptive: raw.linesPerSigmaAdaptive ?? false,
    // Backfill the t-sign branch for older persisted state (added with the
    // negative-t feature). Anything other than "neg" defaults to "pos".
    branch: raw.branch === "neg" ? "neg" : "pos",
    // Ridge-range scan mode (negative-t); older state defaults to off.
    ridgeRange: raw.ridgeRange ?? false,
  };
};

const validYAxisMode: Validator<DisplayControlsState["yAxisMode"]> = (data: unknown) => {
  const s = string(data);
  if (s !== "T" && s !== "fracT") {
    throw new ValidationError(`Expected yAxisMode 'T' or 'fracT', got '${s}'`);
  }
  return s;
};

const validColorMode: Validator<"spectrum" | "grayscale" | "depth" | "spectrum-depth" | "phase-r" | "r1-mag" | "f-rform" | "by-family"> = (data: unknown) => {
  const s = string(data);
  if (s !== "spectrum" && s !== "grayscale" && s !== "depth" && s !== "spectrum-depth" && s !== "phase-r" && s !== "r1-mag" && s !== "f-rform" && s !== "by-family") {
    throw new ValidationError(`Expected colorMode value, got '${s}'`);
  }
  return s;
};

const validBackendChoice: Validator<ScanBackendChoice> = (data: unknown) => {
  const s = string(data);
  if (s === "local" || s === "cloud-64" || s === "cloud-96" || s === "cloud-192") {
    return s;
  }
  throw new ValidationError(`Expected scan backend choice, got '${s}'`);
};

function peekOptionalString(data: unknown, key: string): string | undefined {
  if (typeof data !== "object" || data === null) return undefined;
  const value = Reflect.get(data, key);
  return typeof value === "string" ? value : undefined;
}

function peekOptionalNumber(data: unknown, key: string): number | undefined {
  if (typeof data !== "object" || data === null) return undefined;
  const value = Reflect.get(data, key);
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function peekOptionalBoolean(data: unknown, key: string): boolean | undefined {
  if (typeof data !== "object" || data === null) return undefined;
  const value = Reflect.get(data, key);
  return typeof value === "boolean" ? value : undefined;
}

const validDisplay: Validator<ZerosOfFSerializableState["display"]> = (data) => {
  const raw = object(data, () => ({
    showCriticalStripGuides: boolean,
    colorMode: validColorMode,
    backgroundDefaultName: string,
    stripMode: boolean,
    planeMode: boolean,
    circlesMode: optionalValue(boolean),
    showZeroCountBoxes: optionalValue(boolean),
    zeroCountBackend: optionalValue(string),
    showZetaZeros: boolean,
    showZetaChampions: optionalValue(boolean),
    showAriasSolo: optionalValue(boolean),
    showIntegerTGrid: boolean,
    showPhaseHeatmap: boolean,
    heatmapFamily: string,
    heatmapRForm: string,
    heatmapDensitySigma: optionalValue(number),
    heatmapDensityT: optionalValue(number),
    heatmapTilesT: optionalValue(number),
    heatmapBrightness: optionalValue(number),
    showBgLegRatio: boolean,
    showBgLegFoldBack: boolean,
    showBgLegFoldOut: boolean,
    showBgSum1R1ak: optionalValue(boolean),
    showBgSum1R1akV1: optionalValue(boolean),
    showBgLegRakFolded: optionalValue(boolean),
    showBgLegRpsFolded: optionalValue(boolean),
    showBgSum1R1ps: optionalValue(boolean),
    backgroundOpacity: number,
    backgroundSizeMult: number,
    magThresh: number,
    magThreshMax: number,
    fracTRangeMin: optionalValue(number),
    fracTRangeMax: optionalValue(number),
    fracTRangeMode: optionalValue(string),
    fracTQuarterEnabled: optionalValue(boolean),
    fracTQuarterPreset: optionalValue(string),
    fracTTwinNudge: optionalValue(boolean),
    fracTFilterKind: optionalValue(string),
    fracTJustOne: optionalValue(number),
    showScanRect: boolean,
    showBoundary: boolean,
    showPaulsBoundary: optionalValue(boolean),
    showFracTSliceBoundary: optionalValue(boolean),
    showFracTClosedBoundary: optionalValue(boolean),
    showSigmaNeg500ToNeg400: optionalValue(boolean),
    showReflectedR2ps: optionalValue(boolean),
    showAriasBoundary: optionalValue(boolean),
    showTAverages: boolean,
    tAveragesThresh: number,
    showTRowHighlight: boolean,
    tRowIntT: number,
    tRowFracPos: number,
    showScanFloor: boolean,
    showNegTZerosRidge: optionalValue(boolean),
    showSegmentPostProc: boolean,
    segTTol: number,
    segSigmaGap: number,
    segMinPts: number,
    showSegmentRefine: boolean,
    refineNSamples: number,
    refineSigmaDelta: number,
    yAxisMode: validYAxisMode,
    depthLogScale: optionalValue(number),
  }));
  // Persisted values from the prior log-scale era (typically 5..15) are
  // squashed into the new gamma slider's [0.1..5] range — their old meaning
  // is gone but at least the slider doesn't break.
  const ds = raw.depthLogScale ?? 1;
  // Backfill fracT range filter for older persisted state. Clamp to [0,1]
  // and ensure min ≤ max so the filter is well-formed.
  let fLo = raw.fracTRangeMin ?? 0;
  let fHi = raw.fracTRangeMax ?? 1;
  fLo = Math.max(0, Math.min(1, fLo));
  fHi = Math.max(0, Math.min(1, fHi));
  if (fLo > fHi) [fLo, fHi] = [fHi, fLo];
  const rawMode = raw.fracTRangeMode;
  const fracTRangeMode: "between" | "outside" = rawMode === "outside" ? "outside" : "between";
  const fracTQuarterEnabled = peekOptionalBoolean(data, "fracTQuarterEnabled") ?? false;
  const fracTQuarterPreset = parseFracTQuarterPreset(peekOptionalString(data, "fracTQuarterPreset"));
  const fracTTwinNudge = peekOptionalBoolean(data, "fracTTwinNudge") ?? false;
  const fracTFilterKind: "range" | "justOne" =
    raw.fracTFilterKind === "justOne" ? "justOne" : "range";
  let justOne = raw.fracTJustOne ?? 0;
  justOne = Math.max(0, Math.min(1, justOne));
  const fracTJustOneDigits = parseFracTJustOneDigits(peekOptionalNumber(data, "fracTJustOneDigits"));
  const displayView = parseZerosDisplayView(peekOptionalString(data, "displayView"), fracTFilterKind);
  const syncedFilterKind = displayView === "exactFracT" ? "justOne" : "range";
  const fracT3dDepth = Math.max(0.05, Math.min(2, peekOptionalNumber(data, "fracT3dDepth") ?? 0.4));
  const orbitYawDeg = wrapOrbitYawDeg(peekOptionalNumber(data, "orbitYawDeg") ?? 35);
  const orbitPitchDeg = clampOrbitPitchDeg(peekOptionalNumber(data, "orbitPitchDeg") ?? 22);
  const heatmapFamily: "legAngle" | "legAngleOut" | "legRatio" | "sum1R1Angle" =
    raw.heatmapFamily === "legAngleOut" ? "legAngleOut"
      : raw.heatmapFamily === "legRatio" ? "legRatio"
      : raw.heatmapFamily === "sum1R1Angle" ? "sum1R1Angle"
      : "legAngle";
  const heatmapRForm: "ak" | "ps" = raw.heatmapRForm === "ps" ? "ps" : "ak";
  const heatmapDensitySigma = Math.max(1, Math.min(16384, Math.floor(raw.heatmapDensitySigma ?? 50)));
  const heatmapDensityT = Math.max(1, Math.min(16384, Math.floor(raw.heatmapDensityT ?? 50)));
  const heatmapTilesT = Math.max(1, Math.min(200, Math.floor(raw.heatmapTilesT ?? 1)));
  const heatmapBrightness = Math.max(0, Math.min(1, raw.heatmapBrightness ?? 0));
  return {
    ...raw,
    circlesMode: raw.circlesMode ?? false,
    showAriasSolo: raw.showAriasSolo ?? false,
    showAriasBoundary: raw.showAriasBoundary ?? false,
    showImagCubeRootBoundary: peekOptionalBoolean(data, "showImagCubeRootBoundary") ?? false,
    showImagCubeRootSeriesBoundary: peekOptionalBoolean(data, "showImagCubeRootSeriesBoundary") ?? false,
    showTheorem5Boundary: peekOptionalBoolean(data, "showTheorem5Boundary") ?? false,
    showTheorem5Points: peekOptionalBoolean(data, "showTheorem5Points") ?? false,
    showScorerExpansionPoints: peekOptionalBoolean(data, "showScorerExpansionPoints") ?? false,
    showScorerZeros: peekOptionalBoolean(data, "showScorerZeros") ?? false,
    showPaulsBoundary: raw.showPaulsBoundary ?? false,
    showFracTSliceBoundary: raw.showFracTSliceBoundary ?? false,
    showFracTClosedBoundary: raw.showFracTClosedBoundary ?? false,
    showFracTFourierBoundary: peekOptionalBoolean(data, "showFracTFourierBoundary") ?? false,
    showFracTSmoothApBoundary: peekOptionalBoolean(data, "showFracTSmoothApBoundary") ?? false,
    showAkZerosSigmaLtNeg50: peekOptionalBoolean(data, "showAkZerosSigmaLtNeg50") ?? false,
    showAkZerosSigmaGtNeg50: peekOptionalBoolean(data, "showAkZerosSigmaGtNeg50") ?? false,
    showAkFsZerosT20k: peekOptionalBoolean(data, "showAkFsZerosT20k") ?? false,
    showAkFsZerosT100k: peekOptionalBoolean(data, "showAkFsZerosT100k") ?? false,
    showAkFsZerosT300k: peekOptionalBoolean(data, "showAkFsZerosT300k") ?? false,
    showSigmaNeg500ToNeg400: raw.showSigmaNeg500ToNeg400 ?? false,
    showMainZeros: peekOptionalBoolean(data, "showMainZeros") ?? true,
    showAboveCurveZeros: peekOptionalBoolean(data, "showAboveCurveZeros") ?? true,
    // Older saves stored this under showZeroHoverInfo, defaulted on. Ignore that key.
    showHoverInfo: peekOptionalBoolean(data, "showHoverInfo") ?? false,
    showR1akNearStrip: peekOptionalBoolean(data, "showR1akNearStrip") ?? false,
    showR1akStripTo300: peekOptionalBoolean(data, "showR1akStripTo300") ?? false,
    showReflectedR2ps: raw.showReflectedR2ps ?? false,
    showZetaChampions: raw.showZetaChampions ?? false,
    showT3975To4000SigmaLt0: peekOptionalBoolean(data, "showT3975To4000SigmaLt0") ?? false,
    showT3975To4000Sigma0To1: peekOptionalBoolean(data, "showT3975To4000Sigma0To1") ?? false,
    showT3950To3975SigmaLt0: peekOptionalBoolean(data, "showT3950To3975SigmaLt0") ?? false,
    showT3950To3975Sigma0To1: peekOptionalBoolean(data, "showT3950To3975Sigma0To1") ?? false,
    showT3925To3950SigmaLt0: peekOptionalBoolean(data, "showT3925To3950SigmaLt0") ?? false,
    showT3925To3950Sigma0To1: peekOptionalBoolean(data, "showT3925To3950Sigma0To1") ?? false,
    showT3900To3925SigmaLt0: peekOptionalBoolean(data, "showT3900To3925SigmaLt0") ?? false,
    showT3900To3925Sigma0To1: peekOptionalBoolean(data, "showT3900To3925Sigma0To1") ?? false,
    showT398To3900SigmaNeg50ToNeg10:
      peekOptionalBoolean(data, "showT398To3900SigmaNeg50ToNeg10") ?? false,
    showT398To3900SigmaNeg20To0:
      peekOptionalBoolean(data, "showT398To3900SigmaNeg20To0") ?? false,
    showNegTZerosRidge: raw.showNegTZerosRidge ?? false,
    showZeroCountBoxes: raw.showZeroCountBoxes ?? false,
    zeroCountBackend: "local",
    showBgSum1R1ak: raw.showBgSum1R1ak ?? false,
    showBgSum1R1akV1: raw.showBgSum1R1akV1 ?? false,
    showBgLegRakFolded: raw.showBgLegRakFolded ?? false,
    showBgLegRpsFolded: raw.showBgLegRpsFolded ?? false,
    showBgSum1R1ps: raw.showBgSum1R1ps ?? false,
    depthLogScale: Math.max(0.1, Math.min(5, ds)),
    fracTRangeMin: fLo,
    fracTRangeMax: fHi,
    fracTRangeMode,
    fracTQuarterEnabled,
    fracTQuarterPreset,
    fracTTwinNudge,
    fracTFilterKind: syncedFilterKind,
    fracTJustOne: justOne,
    fracTJustOneDigits,
    displayView,
    fracT3dDepth,
    orbitYawDeg,
    orbitPitchDeg,
    heatmapFamily,
    heatmapRForm,
    heatmapDensitySigma,
    heatmapDensityT,
    heatmapTilesT,
    heatmapBrightness,
    colorMode: raw.colorMode === "grayscale" ? "grayscale" : "spectrum",
    spectrumFeather: clampSpectrumFeather(
      peekOptionalNumber(data, "spectrumFeather") ?? DEFAULT_SPECTRUM_FEATHER,
    ),
    magThresh: Number.MAX_VALUE,
    magThreshMax: Number.MAX_VALUE,
  };
};

const validView: Validator<ZerosOfFSerializableState["view"]> = (data) =>
  object(data, () => ({ panX: number, panY: number, zoom: number }));

const nullable = <T>(inner: Validator<T>): Validator<T | null> => (data) => {
  if (data === null) return null;
  return inner(data);
};

export const validZerosOfFState: Validator<ZerosOfFSerializableState> = (data) => {
  const raw = object(data, () => ({
    scan: validScan,
    display: validDisplay,
    backendId: validBackendChoice,
    workersHint: number,
    activeScanId: nullable(string),
    view: validView,
  }));
  return {
    ...raw,
    harvestFamily: parseZerosHarvestFamily(peekOptionalString(data, "harvestFamily")),
  };
};

/** Parse + validate a raw JSON payload. Falls back to defaults on parse error. */
export function parseZerosOfFStateJson(text: string): ZerosOfFSerializableState {
  try {
    const raw: unknown = JSON.parse(text);
    return validate(raw, validZerosOfFState);
  } catch {
    return { ...DEFAULT_STATE };
  }
}

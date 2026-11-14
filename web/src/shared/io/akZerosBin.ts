import {
  fracTInDisplayRange as fracTInSharedRange,
  fracTKeptByDisplay,
  fracTDisplayFilterIsInactive,
  type FracTFilterKind,
  type FracTJustOneDigits,
  type FracTQuarterPreset,
  type FracTRangeMode,
} from "@/shared/math/zerosOfF/fracTDisplayFilter";

/** Little-endian packed AK zeros: magic `AKZ1`, count, then σ / spiral index T. */

const MAGIC = 0x315a4b41;

export type AkZerosPoints = {
  sigma: Float64Array;
  t: Float64Array;
};

/**
 * Parse the combined Arias–Keating list. `t` is index T = I⁻¹(Im s), not Im(s).
 *
 * @throws if the buffer is truncated or the magic/count is invalid.
 */
export function parseAkZerosBin(buffer: ArrayBuffer): AkZerosPoints {
  if (buffer.byteLength < 8) {
    throw new Error("AK zeros bin is too short");
  }
  const header = new DataView(buffer);
  const magic = header.getUint32(0, true);
  if (magic !== MAGIC) {
    throw new Error(`AK zeros bin magic mismatch: ${magic.toString(16)}`);
  }
  const count = header.getUint32(4, true);
  const expected = 8 + count * 8 * 2;
  if (buffer.byteLength !== expected) {
    throw new Error(`AK zeros bin size ${String(buffer.byteLength)} != ${String(expected)}`);
  }
  const body = new Float64Array(buffer, 8, count * 2);
  return {
    sigma: body.subarray(0, count),
    t: body.subarray(count, count * 2),
  };
}

export type AkZerosFracTMode = FracTRangeMode;

/** Partition of the AK list. σ = −50 stays in `lteNeg50`. */
export type AkSigmaBand = "gtNeg50" | "lteNeg50" | "all";

export type AkZerosFilter = {
  sigmaGreaterThanNeg50: boolean;
  /** When set, this is the σ keep-rule (accordion rows). */
  sigmaBand?: AkSigmaBand;
  fracTRangeMin: number;
  fracTRangeMax: number;
  fracTRangeMode: AkZerosFracTMode;
  fracTFilterKind?: FracTFilterKind;
  fracTJustOne?: number;
  fracTJustOneDigits?: FracTJustOneDigits;
  fracTQuarterEnabled?: boolean;
  fracTQuarterPreset?: FracTQuarterPreset;
};

/**
 * Keep one AK σ-split. Exact −50 is in the “sigma<-50” accordion row.
 */
export function keepAkSigma(sigma: number, filter: AkZerosFilter): boolean {
  if (filter.sigmaBand === "lteNeg50") return sigma <= -50;
  if (filter.sigmaBand === "gtNeg50") return sigma > -50;
  if (filter.sigmaBand === "all") return true;
  if (filter.sigmaGreaterThanNeg50) return sigma > -50;
  return true;
}

/**
 * Same frac(T) keep/hide rule as the harvest scatter slider.
 */
export function fracTInDisplayRange(
  t: number,
  lo: number,
  hi: number,
  mode: AkZerosFracTMode,
): boolean {
  return fracTInSharedRange(t, lo, hi, mode);
}

/**
 * Keep every AK zero, or only those with σ > −50.
 */
export function filterAkZeros(points: AkZerosPoints, sigmaGreaterThanNeg50: boolean): AkZerosPoints {
  return selectAkZeros(points, {
    sigmaGreaterThanNeg50,
    fracTRangeMin: 0,
    fracTRangeMax: 1,
    fracTRangeMode: "between",
    fracTFilterKind: "range",
    fracTJustOne: 0,
  });
}

/**
 * Apply the σ > −50 toggle and the Display frac(T) slider together.
 */
export function selectAkZeros(points: AkZerosPoints, filter: AkZerosFilter): AkZerosPoints {
  const kind = filter.fracTFilterKind ?? "range";
  const justOne = filter.fracTJustOne ?? 0;
  const justOneDigits = filter.fracTJustOneDigits ?? 3;
  const displayFilter = {
    kind,
    rangeMin: filter.fracTRangeMin,
    rangeMax: filter.fracTRangeMax,
    rangeMode: filter.fracTRangeMode,
    justOne,
    justOneDigits,
    quarterEnabled: filter.fracTQuarterEnabled,
    quarterPreset: filter.fracTQuarterPreset,
  };
  const fracActive = !fracTDisplayFilterIsInactive(displayFilter);
  const sigmaActive = filter.sigmaBand !== undefined
    ? filter.sigmaBand !== "all"
    : filter.sigmaGreaterThanNeg50;
  if (!sigmaActive && !fracActive) return points;
  let kept = 0;
  for (let i = 0; i < points.sigma.length; i++) {
    if (!keepAkSigma(points.sigma[i]!, filter)) continue;
    if (fracActive && !fracTKeptByDisplay(points.t[i]!, displayFilter)) continue;
    kept += 1;
  }
  const sigma = new Float64Array(kept);
  const t = new Float64Array(kept);
  let w = 0;
  for (let i = 0; i < points.sigma.length; i++) {
    if (!keepAkSigma(points.sigma[i]!, filter)) continue;
    if (fracActive && !fracTKeptByDisplay(points.t[i]!, displayFilter)) continue;
    sigma[w] = points.sigma[i]!;
    t[w] = points.t[i]!;
    w += 1;
  }
  return { sigma, t };
}

/** Pack σ / T for tests. */
export function encodeAkZerosBin(points: AkZerosPoints): ArrayBuffer {
  const count = points.sigma.length;
  if (points.t.length !== count) {
    throw new Error("encodeAkZerosBin: sigma/t length mismatch");
  }
  const buffer = new ArrayBuffer(8 + count * 8 * 2);
  const header = new DataView(buffer);
  header.setUint32(0, MAGIC, true);
  header.setUint32(4, count, true);
  const body = new Float64Array(buffer, 8, count * 2);
  body.set(points.sigma, 0);
  body.set(points.t, count);
  return buffer;
}

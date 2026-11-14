import { fracTThousandthsBin } from "@/shared/math/zerosOfF/fracTDisplayFilter";
import rawJson from "@/shared/math/zerosOfF/fracTSmoothApBoundary.json";

export type FracTSmoothApBoundaryTable = {
  n: number;
  aHigh: readonly number[];
  pMid: readonly number[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPositiveList(value: unknown, n: number, label: string): number[] {
  if (!Array.isArray(value) || value.length !== n) {
    throw new Error(`smooth a,p table ${label} must have ${String(n)} entries`);
  }
  const out: number[] = [];
  for (const item of value) {
    if (typeof item !== "number" || !Number.isFinite(item) || item <= 0) {
      throw new Error(`smooth a,p table ${label} has a non-positive entry`);
    }
    out.push(item);
  }
  return out;
}

/**
 * Load Figure 2's navy a (high-cut of ln a) and gold p (mid-cut of p)
 * on the ten-thousandths circle. Used for T = ã(ϑ) |σ|^{p̃(ϑ)}.
 */
export function parseFracTSmoothApBoundaryTable(data: unknown): FracTSmoothApBoundaryTable {
  if (!isRecord(data) || typeof data.n !== "number" || !Number.isInteger(data.n) || data.n < 2) {
    throw new Error("smooth a,p table is missing n");
  }
  return {
    n: data.n,
    aHigh: readPositiveList(data.aHigh, data.n, "aHigh"),
    pMid: readPositiveList(data.pMid, data.n, "pMid"),
  };
}

export const FRAC_T_SMOOTH_AP_BOUNDARY = parseFracTSmoothApBoundaryTable(rawJson);

/**
 * Map {T} ∈ [0,1] onto the 10000-sample circle of Figure 2
 * (ϑ=1 identified with the last bin, not a wrap to 0).
 */
export function fracTTenThousandthsBin(value: number): number {
  const last = FRAC_T_SMOOTH_AP_BOUNDARY.n - 1;
  if (!Number.isFinite(value)) return 0;
  const clamped = Math.min(1, Math.max(0, value));
  if (clamped >= 1) return last;
  return Math.min(last, Math.floor(clamped * FRAC_T_SMOOTH_AP_BOUNDARY.n + 1e-9));
}

/** Navy ã and gold p̃ at the ten-thousandth containing `justOne`. */
export function fracTSmoothApCoeff(justOne: number): { a: number; p: number } {
  const bin = fracTTenThousandthsBin(justOne);
  return {
    a: FRAC_T_SMOOTH_AP_BOUNDARY.aHigh[bin] ?? Number.NaN,
    p: FRAC_T_SMOOTH_AP_BOUNDARY.pMid[bin] ?? Number.NaN,
  };
}

/**
 * Figure 2 mixed envelope: navy ã(ϑ) and gold p̃(ϑ).
 * Skips σ=0 so the polyline does not hit a log-style hole.
 */
export function fracTSmoothApBoundaryT(sigma: number, justOne: number): number {
  const absSigma = Math.abs(sigma);
  if (!(absSigma > 0)) return Number.NaN;
  const { a, p } = fracTSmoothApCoeff(justOne);
  return a * absSigma ** p;
}

/** On-state toggle text: thousandth plus the mixed power law. */
export function fracTSmoothApBoundaryLabel(justOne: number): string {
  const frac = (fracTThousandthsBin(justOne) / 1000).toFixed(3);
  const { a, p } = fracTSmoothApCoeff(justOne);
  return `${frac}: T = ${a.toPrecision(3)} · |σ|^{${p.toFixed(2)}}`;
}

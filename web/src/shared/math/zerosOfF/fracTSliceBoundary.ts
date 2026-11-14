import { fracTThousandthsBin } from "@/shared/math/zerosOfF/fracTDisplayFilter";
import tableJson from "@/shared/math/zerosOfF/fracTSliceBoundaries-000-to-999.json";
import { piBoundaryT } from "@/shared/math/zerosOfF/scanFloor";

export const FRAC_T_SLICE_BOUNDARY_BIN_MIN = 0;
export const FRAC_T_SLICE_BOUNDARY_BIN_MAX = 999;

export type FracTSliceBoundaryCoeff = {
  bin: number;
  a: number;
  p: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Harvest-fitted `T = a |σ|^p` lower envelopes for `{T}` thousandths
 * bins 0..999 (slider 0.000..0.999). `a` is just under `min T/|σ|^p`
 * so no fitted zero sits below its curve.
 */
export function parseFracTSliceBoundaryTable(data: unknown): readonly FracTSliceBoundaryCoeff[] {
  if (!isRecord(data) || !Array.isArray(data.curves)) {
    throw new Error("frac-T slice boundary table is missing curves");
  }
  const rows: FracTSliceBoundaryCoeff[] = [];
  for (const item of data.curves) {
    if (!isRecord(item)) {
      throw new Error("frac-T slice boundary row is not an object");
    }
    const bin = item.bin;
    const a = item.a;
    const p = item.p;
    if (typeof bin !== "number" || typeof a !== "number" || typeof p !== "number") {
      throw new Error("frac-T slice boundary row is missing bin/a/p");
    }
    if (!Number.isInteger(bin) || a <= 0 || p <= 0) {
      throw new Error("frac-T slice boundary row has invalid bin/a/p");
    }
    rows.push({ bin, a, p });
  }
  if (rows.length !== FRAC_T_SLICE_BOUNDARY_BIN_MAX - FRAC_T_SLICE_BOUNDARY_BIN_MIN + 1) {
    throw new Error("frac-T slice boundary table does not have 1000 rows");
  }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row === undefined || row.bin !== FRAC_T_SLICE_BOUNDARY_BIN_MIN + i) {
      throw new Error("frac-T slice boundary bins are not 0..999 in order");
    }
  }
  return rows;
}

export const FRAC_T_SLICE_BOUNDARIES = parseFracTSliceBoundaryTable(tableJson);

export type FracTSliceBoundaryPoint = {
  fracT: number;
  a: number;
  p: number;
};

/**
 * The 1000 table fits as `({T}, a, p)` with `{T}=bin/1000` in `[0, 0.999]`.
 * Used to plot coefficient and exponent against the fractional part.
 */
export function fracTSliceBoundarySeries(): readonly FracTSliceBoundaryPoint[] {
  return FRAC_T_SLICE_BOUNDARIES.map((row) => ({
    fracT: row.bin / 1000,
    a: row.a,
    p: row.p,
  }));
}

/**
 * Coefficient for the exact-{T} thousandths bin, or null if the slider
 * value is not a finite [0, 1] thousandth (should not happen in the UI).
 */
export function fracTSliceBoundaryForJustOne(justOne: number): FracTSliceBoundaryCoeff | null {
  const bin = fracTThousandthsBin(justOne);
  if (bin < FRAC_T_SLICE_BOUNDARY_BIN_MIN || bin > FRAC_T_SLICE_BOUNDARY_BIN_MAX) {
    return null;
  }
  return FRAC_T_SLICE_BOUNDARIES[bin] ?? null;
}

export function fracTSliceBoundaryT(sigma: number, coeff: FracTSliceBoundaryCoeff): number {
  return coeff.a * Math.abs(sigma) ** coeff.p;
}

/**
 * Boundaries-accordion label: the exact-{T} thousandth plus the fitted
 * power law.
 */
export function fracTSliceBoundaryLabel(justOne: number): string {
  const frac = (fracTThousandthsBin(justOne) / 1000).toFixed(3);
  const coeff = fracTSliceBoundaryForJustOne(justOne);
  if (coeff === null) return `${frac}: (no envelope)`;
  return `${frac}: T = ${formatCoeffA(coeff.a)} · |σ|^{${formatCoeffP(coeff.p)}}`;
}

/** Same exponent as the π-boundary: \(1/0.62\). */
export const FRAC_T_CLOSED_BOUNDARY_MU = 1 / 0.62;

/**
 * Joint-angle × RS-quarter factor in the {T} identity.
 * At ϑ=1/2 this is 1 (recovers the π-boundary). At ϑ=0 it is 4
 * (odd vs even multiple of π). It poles at ϑ=1/4 and 3/4, the
 * Riemann–Siegel phases {√(t/2π)} = {T+1/2} farthest from an integer.
 */
export function fracTClosedBoundaryFactor(justOne: number): number {
  const theta = fracTThousandthsBin(justOne) / 1000;
  const joint = (2 - Math.sin(Math.PI * theta)) ** 2;
  const quarter = Math.max(Math.abs(Math.cos(2 * Math.PI * theta)), 1e-6);
  return joint / quarter;
}

/**
 * Large-|σ| prefactor of the identity: π^{-1/0.62} times the trig factor.
 */
export function fracTClosedBoundaryA(justOne: number): number {
  return Math.PI ** -FRAC_T_CLOSED_BOUNDARY_MU * fracTClosedBoundaryFactor(justOne);
}

/**
 * The identity's exponent is 1/0.62 for every thousandth. Table p(ϑ)
 * wiggles because a log-log fit of T=a|σ|^p absorbs the +2π and the
 * holes; that is not a second independent function of ϑ.
 */
export function fracTClosedBoundaryP(_justOne: number): number {
  return FRAC_T_CLOSED_BOUNDARY_MU;
}

/**
 * \(T=\bigl((|\sigma|+2\pi)/\pi\bigr)^{1/0.62}(2-\sin(\pi\vartheta))^{2}/|\cos(2\pi\vartheta)|\).
 * At ϑ=1/2 this is exactly the π-boundary.
 */
export function fracTClosedBoundaryT(sigma: number, justOne: number): number {
  return piBoundaryT(sigma) * fracTClosedBoundaryFactor(justOne);
}

export function fracTClosedBoundaryLabel(justOne: number): string {
  const frac = (fracTThousandthsBin(justOne) / 1000).toFixed(3);
  return `${frac}: ((|σ|+2π)/π)^{1/0.62} (2−sin πθ)²/|cos 2πθ|`;
}

function formatCoeffA(a: number): string {
  return a.toPrecision(3);
}

function formatCoeffP(p: number): string {
  return (Math.round(p * 100) / 100).toFixed(2).replace(/0$/, "").replace(/\.$/, "");
}

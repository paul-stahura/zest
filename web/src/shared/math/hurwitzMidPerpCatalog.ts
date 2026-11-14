import { complex, type Complex } from "@/shared/math/complex";
import { formatHurwitzCoeffList, type HurwitzCoeff } from "@/shared/math/lFunctionCalculator";
import { midPerpProgressionCoeffs } from "@/shared/math/hurwitzMidPerpSearch";

export type HurwitzMidPerpCatalogRow = {
  id: string;
  q: number;
  omegaLabel: string;
  coeffs: HurwitzCoeff[];
  inAlpha: boolean;
};

const INV_SQRT2 = Math.SQRT1_2;

/**
 * True when every residue is in the machine alphabet {0, ±1, ±i}.
 */
export function hurwitzCoeffsInAlphabet(coeffs: readonly HurwitzCoeff[]): boolean {
  for (const c of coeffs) {
    const unit =
      (c.re === 0 && c.im === 0)
      || (c.re === 1 && c.im === 0)
      || (c.re === -1 && c.im === 0)
      || (c.re === 0 && c.im === 1)
      || (c.re === 0 && c.im === -1);
    if (!unit) return false;
  }
  return true;
}

function snapAlphabetLetter(c: HurwitzCoeff): HurwitzCoeff {
  const letters: readonly HurwitzCoeff[] = [
    { re: 0, im: 0 },
    { re: 1, im: 0 },
    { re: -1, im: 0 },
    { re: 0, im: 1 },
    { re: 0, im: -1 },
  ];
  for (const p of letters) {
    if (Math.hypot(c.re - p.re, c.im - p.im) < 1e-10) return { re: p.re, im: p.im };
  }
  return c;
}

function progression(
  id: string,
  q: number,
  omegaLabel: string,
  omegaRe: number,
  omegaIm: number,
): HurwitzMidPerpCatalogRow {
  const raw = midPerpProgressionCoeffs(q, complex(omegaRe, omegaIm));
  const coeffs = raw.map(snapAlphabetLetter);
  return { id, q, omegaLabel, coeffs, inAlpha: hurwitzCoeffsInAlphabet(coeffs) };
}

function lift(
  id: string,
  q: number,
  omegaLabel: string,
  period2: readonly [HurwitzCoeff, HurwitzCoeff],
): HurwitzMidPerpCatalogRow {
  const coeffs: HurwitzCoeff[] = [];
  for (let r = 0; r < q; r++) {
    const c = period2[r % 2];
    if (c === undefined) continue;
    coeffs.push({ re: c.re, im: c.im });
  }
  return { id, q, omegaLabel, coeffs, inAlpha: hurwitzCoeffsInAlphabet(coeffs) };
}

function coeffNear(a: HurwitzCoeff, b: HurwitzCoeff): boolean {
  return Math.hypot(a.re - b.re, a.im - b.im) < 1e-10;
}

function isPeriodRepeatOf(long: readonly HurwitzCoeff[], short: readonly HurwitzCoeff[]): boolean {
  if (short.length < 1 || long.length <= short.length) return false;
  if (long.length % short.length !== 0) return false;
  for (let i = 0; i < long.length; i++) {
    const a = long[i];
    const b = short[i % short.length];
    if (a === undefined || b === undefined || !coeffNear(a, b)) return false;
  }
  return true;
}

/**
 * Drop χ that is just a shorter table tiled to a larger q
 * (e.g. (−i,1,−i,1) is the same primitive as (−i,1)).
 */
function withoutPeriodRepeats(
  rows: readonly HurwitzMidPerpCatalogRow[],
): HurwitzMidPerpCatalogRow[] {
  const kept: HurwitzMidPerpCatalogRow[] = [];
  for (const row of rows) {
    const tilesShorter = kept.some(k => isPeriodRepeatOf(row.coeffs, k.coeffs));
    if (tilesShorter) continue;
    kept.push(row);
  }
  return kept;
}

/**
 * Tables found so far (q=2,3,4,5,6): alphabet hits and 1−ω√q progressions,
 * with period-lifts of a shorter χ removed. q=6 uses every distinct
 * catalog ω; alphabet lifts of q=2 are the same series and are dropped.
 */
export const HURWITZ_MID_PERP_CATALOG: readonly HurwitzMidPerpCatalogRow[] = withoutPeriodRepeats([
  progression("q2-neg-i", 2, "(1+i)/√2", INV_SQRT2, INV_SQRT2),
  progression("q2-pos-i", 2, "(1−i)/√2", INV_SQRT2, -INV_SQRT2),
  progression("q2-w1", 2, "1", 1, 0),
  progression("q2-wi", 2, "i", 0, 1),
  progression("q3-w1", 3, "1", 1, 0),
  progression("q3-wi", 3, "i", 0, 1),
  progression("q4-w1", 4, "1", 1, 0),
  progression("q4-wm1", 4, "−1", -1, 0),
  progression("q4-wi", 4, "i", 0, 1),
  progression("q4-wmi", 4, "−i", 0, -1),
  lift("q4-lift-neg-i", 4, "lift (−i,1)", [{ re: 0, im: -1 }, { re: 1, im: 0 }]),
  lift("q4-lift-pos-i", 4, "lift (i,1)", [{ re: 0, im: 1 }, { re: 1, im: 0 }]),
  progression("q5-w1", 5, "1", 1, 0),
  progression("q5-wi", 5, "i", 0, 1),
  progression("q5-wm1", 5, "−1", -1, 0),
  progression("q5-wmi", 5, "−i", 0, -1),
  progression("q5-wpi4", 5, "e^{iπ/4}", INV_SQRT2, INV_SQRT2),
  progression("q6-w1", 6, "1", 1, 0),
  progression("q6-wi", 6, "i", 0, 1),
  progression("q6-wm1", 6, "−1", -1, 0),
  progression("q6-wmi", 6, "−i", 0, -1),
  progression("q6-wpi4", 6, "(1+i)/√2", INV_SQRT2, INV_SQRT2),
  progression("q6-wmi4", 6, "(1−i)/√2", INV_SQRT2, -INV_SQRT2),
]);

export const HURWITZ_OMEGA_QS = [2, 3, 4, 5, 6] as const;
export type HurwitzOmegaQ = (typeof HURWITZ_OMEGA_QS)[number];

/**
 * True for the periods that have a toolbox slider + formula row.
 */
export function isHurwitzOmegaQ(q: number): q is HurwitzOmegaQ {
  return q === 2 || q === 3 || q === 4 || q === 5 || q === 6;
}

/**
 * Spectrum / persist id for the unit-circle ω slider at period q.
 */
export function hurwitzQSliderId(q: HurwitzOmegaQ): string {
  return `q${q}-omega`;
}

/**
 * Spectrum / persist id for the formula ω row at period q.
 */
export function hurwitzQFormulaId(q: HurwitzOmegaQ): string {
  return `q${q}-formula`;
}

export const HURWITZ_Q2_OMEGA_ID = hurwitzQSliderId(2);
export const HURWITZ_Q2_FORMULA_ID = hurwitzQFormulaId(2);
export const HURWITZ_Q3_OMEGA_ID = hurwitzQSliderId(3);
export const HURWITZ_Q3_FORMULA_ID = hurwitzQFormulaId(3);
export const HURWITZ_Q4_OMEGA_ID = hurwitzQSliderId(4);
export const HURWITZ_Q4_FORMULA_ID = hurwitzQFormulaId(4);
export const HURWITZ_Q5_OMEGA_ID = hurwitzQSliderId(5);
export const HURWITZ_Q5_FORMULA_ID = hurwitzQFormulaId(5);
export const HURWITZ_Q6_OMEGA_ID = hurwitzQSliderId(6);
export const HURWITZ_Q6_FORMULA_ID = hurwitzQFormulaId(6);

/**
 * Paste string for a catalog row's χ field.
 */
export function hurwitzMidPerpChiLabel(row: HurwitzMidPerpCatalogRow): string {
  return formatHurwitzCoeffList(row.coeffs);
}

/**
 * Slider angle into [0, 360). Non-finite → 0 so a bad persist cannot
 * produce a NaN ω on the unit circle.
 */
export function wrapOmegaDegrees(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  const w = deg % 360;
  return w < 0 ? w + 360 : w;
}

function omegaFromDegrees(deg: number): Complex {
  const a = wrapOmegaDegrees(deg) * Math.PI / 180;
  return complex(Math.cos(a), Math.sin(a));
}

/**
 * χ=(1−ω√q, 1, …, 1) for ω=e^{iθ} on the unit circle. Same family as
 * the catalog progression rows; θ is the toolbox slider in degrees.
 */
export function hurwitzQOmegaCoeffs(q: number, deg: number): HurwitzCoeff[] {
  if (!Number.isInteger(q) || q < 2) return [];
  return midPerpProgressionCoeffs(q, omegaFromDegrees(deg));
}

/**
 * χ=(1−ω√2,1) for ω=e^{iθ} on the unit circle. Same family as the
 * catalog q=2 rows; θ is the toolbox slider in degrees.
 */
export function hurwitzQ2OmegaCoeffs(deg: number): HurwitzCoeff[] {
  return hurwitzQOmegaCoeffs(2, deg);
}

/**
 * χ=(1−ω√3,1,1) for ω=e^{iθ} on the unit circle. Same family as the
 * catalog q=3 rows; θ is the toolbox slider in degrees.
 */
export function hurwitzQ3OmegaCoeffs(deg: number): HurwitzCoeff[] {
  return hurwitzQOmegaCoeffs(3, deg);
}

/**
 * 1-based spectrum slot: for each q in {2,3,4,5,6}, slider then
 * formula, then that period's catalog rows.
 */
export function hurwitzMidPerpSpectrumIndex(
  catalogIndex: number | string,
): { k: number; n: number } {
  const n = HURWITZ_MID_PERP_CATALOG.length + HURWITZ_OMEGA_QS.length * 2;
  let k = 1;
  let i = 0;
  for (const q of [2, 3, 4, 5, 6] as const) {
    if (isHurwitzOmegaQ(q)) {
      if (catalogIndex === hurwitzQSliderId(q)) return { k, n };
      k += 1;
      if (catalogIndex === hurwitzQFormulaId(q)) return { k, n };
      k += 1;
    }
    while (i < HURWITZ_MID_PERP_CATALOG.length && HURWITZ_MID_PERP_CATALOG[i]?.q === q) {
      if (catalogIndex === i) return { k, n };
      k += 1;
      i += 1;
    }
  }
  return { k: n, n };
}

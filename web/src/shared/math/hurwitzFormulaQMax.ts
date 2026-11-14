export const HURWITZ_FORMULA_Q_MIN = 2;
export const HURWITZ_FORMULA_Q_MAX = 50;

/**
 * Toolbox slider period: integer in [2, 50]. Non-finite → 2 so a bad
 * persist cannot ask the formula stack for q=NaN.
 */
export function clampHurwitzFormulaQMax(q: number): number {
  if (!Number.isFinite(q)) return HURWITZ_FORMULA_Q_MIN;
  return Math.min(HURWITZ_FORMULA_Q_MAX, Math.max(HURWITZ_FORMULA_Q_MIN, Math.round(q)));
}

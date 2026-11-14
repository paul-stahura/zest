/**
 * Kuznetsov's higher-order approximation to the zeros of f near y = ±1/2
 * (Siegel_function_2, eq. (37)), without its O(M^{−1/3}) error:
 *
 *   s_{N,±} = 2πiM(M ± 1/2) + A1 M^{2/3} ± A2 M^{1/3} + A3,   M = N + 1/2.
 *
 * Each simple zero z_n of Hi(e^{2πi/3} z) with Im z_n > 0 gives one pair.
 * A1 = i(2π)^{1/3} z_n and A2, A3 depend on Hi′(e^{2πi/3} z_n); the values
 * are the paper's Table 2, which matches those closed forms to its printed
 * digits. Row n = 1 is Theorem 5's ρ_N^{(ν)}: s_{N,−} = ρ_N^{(0)} and
 * s_{N,+} = ρ_N^{(1)}, up to the rounding of A3.
 */

type C = readonly [number, number];

type ExpansionCoefficients = { readonly a1: C; readonly a2: C; readonly a3: C };

/** Table 2 rows, in the order of the Scorer zeros z_1, z_2, z_3 of Table 1. */
export const SCORER_EXPANSION_ZEROS = [1, 2, 3] as const;
export type ScorerZeroNumber = (typeof SCORER_EXPANSION_ZEROS)[number];

const TABLE_2: Readonly<Record<ScorerZeroNumber, ExpansionCoefficients>> = {
  1: { a1: [-1.512641746, -7.492333849], a2: [1.7719679, -0.3049008], a3: [-0.57973, 1.09101] },
  2: { a1: [-1.428829484, -12.504825720], a2: [2.2376850, -0.2155706], a3: [-1.81416, 1.17473] },
  3: { a1: [-1.367632696, -16.639868217], a2: [2.5682356, -0.1738689], a3: [-3.04720, 1.21925] },
};

/** +1 is s_{N,+} (near y = +1/2), −1 is s_{N,−} (near y = −1/2). */
export type ScorerExpansionSign = 1 | -1;

/** Highest N plotted, the same as the Theorem 5 points. Covers the T ≤ 4000 harvest. */
export const SCORER_EXPANSION_N_MAX = 4000;

export type ScorerExpansionPoint = {
  sigma: number;
  t: number;
};

/**
 * Main terms of s_{N,±} = σ + it for the Scorer zero z_n. Null when N is
 * below 1 or Im s is not positive, which the index map cannot place. That
 * happens only at N = 1: for z_2 with the minus sign and for z_3 with
 * either sign.
 */
export function scorerZeroExpansion(
  scorerZero: ScorerZeroNumber,
  stripN: number,
  sign: ScorerExpansionSign,
): ScorerExpansionPoint | null {
  if (!(stripN >= 1)) return null;
  const { a1, a2, a3 } = TABLE_2[scorerZero];
  const bigM = stripN + 0.5;
  const m23 = bigM ** (2 / 3);
  const m13 = bigM ** (1 / 3);
  const sigma = a1[0] * m23 + sign * a2[0] * m13 + a3[0];
  const t = 2 * Math.PI * bigM * (bigM + sign / 2) + a1[1] * m23 + sign * a2[1] * m13 + a3[1];
  if (!(t > 0)) return null;
  return { sigma, t };
}

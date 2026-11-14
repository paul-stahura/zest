/**
 * Theorem 5 points ρ_N^{(ν)} of the leftmost Siegel zero, without the
 * O(M^{−1/3}) error. M = N + 1/2, ℓ = (M / 2π)^{1/3}, c_ν = ν − 1/2,
 * ε_ν = (−1)^ν. ζ* and d* = A'(ζ*) are the Scorer zero from Lemma 4.
 */

type C = readonly [number, number];

const ZETA_STAR: C = [-4.0602910388, 0.8197399968];
const D_STAR: C = [-0.4665866107777391, -0.08028509534667456];

/** Highest N the Boundaries slider will plot. Covers the T ≤ 4000 harvest. */
export const THEOREM5_POINT_N_MAX = 4000;

function add(a: C, b: C): C {
  return [a[0] + b[0], a[1] + b[1]];
}

function scale(a: C, factor: number): C {
  return [a[0] * factor, a[1] * factor];
}

function mul(a: C, b: C): C {
  return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
}

function div(a: C, b: C): C {
  const den = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / den, (a[1] * b[0] - a[0] * b[1]) / den];
}

/** Multiply by i. */
function timesI(a: C): C {
  return [-a[1], a[0]];
}

/** c_{2,*} = 1/16 − i/(4π) − i ζ* /(96 d*) − i/(32 d*^3). */
function secondOrderConstant(): C {
  const d3 = mul(mul(D_STAR, D_STAR), D_STAR);
  const one: C = [1, 0];
  return add(
    add([1 / 16, 0], scale(timesI(one), -1 / (4 * Math.PI))),
    add(
      scale(div(timesI(ZETA_STAR), D_STAR), -1 / 96),
      scale(div(timesI(one), d3), -1 / 32),
    ),
  );
}

const C2_STAR = secondOrderConstant();

export interface Theorem5Rho {
  sigma: number;
  t: number;
}

/**
 * Main terms of ρ_N^{(ν)} = σ + it. Null when N is below 1 or the height
 * is not positive, which the index map cannot place on the plot.
 */
export function theorem5Rho(n: number, nu: 0 | 1): Theorem5Rho | null {
  if (!(n >= 1)) return null;
  const bigM = n + 0.5;
  const ell = (bigM / (2 * Math.PI)) ** (1 / 3);
  const cNu = nu - 0.5;
  const eps = nu === 0 ? 1 : -1;
  const term1 = timesI([2 * Math.PI * bigM * (bigM + cNu), 0]);
  const term2 = scale(timesI(ZETA_STAR), bigM / ell);
  const term3 = scale(div([1, 0], D_STAR), (eps * bigM) / (4 * ell * ell));
  const term4 = scale(timesI(C2_STAR), 2 * Math.PI);
  const rho = add(add(term1, term2), add(term3, term4));
  if (!(rho[1] > 0)) return null;
  return { sigma: rho[0], t: rho[1] };
}

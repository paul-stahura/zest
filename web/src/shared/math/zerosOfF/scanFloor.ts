import { indexFromIofT } from "@/shared/math/zerosOfF/iOfT";

/**
 * Empirical π-boundary and scan-floor curves shared by the renderer (overlays)
 * and the scan algorithm (which skips T values below the floor).
 *
 *   π-boundary: T = ((|σ| + 2π) / π) ^ (1/b)
 *   scan floor: T_floor(σ) = max(1, piBoundaryT(σ) − 25)
 *
 * Below the floor at a given σ, the R₁ approximation is invalid and there are
 * no zeros of f, so scanning those T values is wasted work.
 */

const PI_BOUNDARY_B = 0.62;

export function piBoundaryT(sigma: number): number {
  return ((Math.abs(sigma) + 2 * Math.PI) / Math.PI) ** (1 / PI_BOUNDARY_B);
}

export function scanFloorT(sigma: number): number {
  return Math.max(1, piBoundaryT(sigma) - 25);
}

/**
 * Arias's left-edge boundary of the positive-t zeros of f(s), defined by
 * `−σ = 2.2 · T^(2/3)`  ⇔  `T(σ) = (−σ / 2.2)^(3/2)`.
 *
 * Only exists for σ ≤ 0 (the boundary sits in the left half-plane); returns
 * `NaN` for σ > 0 so the curve layer skips those samples. Matches the observed
 * left edge of Arias's list (σ ≈ −71.8 at T ≈ 185).
 */
const ARIAS_BOUNDARY_K = 2.2;

export function ariasBoundaryT(sigma: number): number {
  if (sigma > 0) return NaN;
  return (-sigma / ARIAS_BOUNDARY_K) ** 1.5;
}

/**
 * Tight lower envelope of harvest zeros with T ≥ 10:
 * `T = 0.173 · |σ|^{1.61}`  ⇔  `−σ = 2.97 · T^{0.621}`.
 * A single T^{2/3} bound that clears the mid-T bulge hangs far below the
 * lowest zeros at large |σ|; this exponent follows that floor instead.
 */
const PAULS_BOUNDARY_A = 0.173;
const PAULS_BOUNDARY_P = 1.61;

export function paulsBoundaryT(sigma: number): number {
  if (sigma > 0) return NaN;
  return PAULS_BOUNDARY_A * (-sigma) ** PAULS_BOUNDARY_P;
}

const IMAG_CUBE_ROOT_K = 0.81975;

/**
 * σ = −0.81975 · t^{1/3}, with t = I(T) the imaginary part. The zeros-of-f
 * plot's vertical axis is the index T, so invert to t = (|σ|/0.81975)^3
 * and return T such that I(T) = t. The formula only exists for σ < 0;
 * very small |σ| makes the index inverse non-finite, and those samples
 * are skipped by the curve layer.
 */
export function imagCubeRootBoundaryT(sigma: number): number {
  if (!(sigma < 0)) return Number.NaN;
  const tImag = (-sigma / IMAG_CUBE_ROOT_K) ** 3;
  if (!(tImag > 0)) return Number.NaN;
  const index = indexFromIofT(tImag);
  return Number.isFinite(index) ? index : Number.NaN;
}

const IMAG_SERIES_CUBE = 0.81975;
const IMAG_SERIES_SIXTH = 1.3;
const IMAG_SERIES_CONST = 0.57;

/**
 * σ = −0.81975·t^{1/3} − 1.3·t^{1/6} − 0.57, with t = I(T). Substitute
 * u = t^{1/6} and solve the quadratic for the positive root, then return
 * the index T. The right-hand side is at most −0.57, so σ ≥ −0.57 has no t.
 */
export function imagCubeRootSeriesBoundaryT(sigma: number): number {
  const constantTerm = sigma + IMAG_SERIES_CONST;
  if (!(constantTerm < 0)) return Number.NaN;
  const discriminant = IMAG_SERIES_SIXTH * IMAG_SERIES_SIXTH - 4 * IMAG_SERIES_CUBE * constantTerm;
  if (!(discriminant > 0)) return Number.NaN;
  const u = (-IMAG_SERIES_SIXTH + Math.sqrt(discriminant)) / (2 * IMAG_SERIES_CUBE);
  if (!(u > 0)) return Number.NaN;
  const index = indexFromIofT(u ** 6);
  return Number.isFinite(index) ? index : Number.NaN;
}

const THEOREM5_C = 0.81974;
const THEOREM5_D = 1.30445;
const THEOREM5_E = 0.57973;

/**
 * Theorem 5 of the leftmost-Siegel-zero note: the main terms of
 * −σ = C* t^{1/3} + D* t^{1/6} + E*, with the remark's values
 * C* = 0.81974, D* = 1.30445, E* = 0.57973. The O(t^{−1/6}) is the
 * error and is not drawn. t = I(T); invert through u = t^{1/6}.
 * The right-hand side is at least E*, so σ ≥ −E* has no t.
 */
export function theorem5LeftmostBoundaryT(sigma: number): number {
  const constantTerm = sigma + THEOREM5_E;
  if (!(constantTerm < 0)) return Number.NaN;
  const discriminant = THEOREM5_D * THEOREM5_D - 4 * THEOREM5_C * constantTerm;
  if (!(discriminant > 0)) return Number.NaN;
  const u = (-THEOREM5_D + Math.sqrt(discriminant)) / (2 * THEOREM5_C);
  if (!(u > 0)) return Number.NaN;
  const index = indexFromIofT(u ** 6);
  return Number.isFinite(index) ? index : Number.NaN;
}

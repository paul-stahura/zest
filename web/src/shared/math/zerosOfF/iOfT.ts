/**
 * Index function I(T) = π(2T + 1) / ln(1/T + 1).
 *
 * Maps the real-valued scan parameter T to the imaginary part of the complex
 * argument `s = σ + i·I(T)` used by Σ₁ and I₁. Monotonically increasing.
 *
 * @param t — strictly positive real.
 * @returns I(T).
 * @throws if `t <= 0` (ln(1/T + 1) is undefined for non-positive T).
 */
export function iOfT(t: number): number {
  if (!(t > 0)) {
    throw new Error("iOfT requires T > 0");
  }
  return (Math.PI * (2 * t + 1)) / Math.log(1 / t + 1);
}

/**
 * Inverse of {@link iOfT}: given an imaginary part `t = I(T)`, return the
 * scan-parameter value `T`.
 *
 * Asymptotic expansion of I(T) for large T:
 *   I(T)/π = 2T² + 2T + 1/3 − 1/(90 T²) + 1/(90 T³) − …
 *
 * Truncating to the leading three coefficients and solving the quadratic gives
 *   T₀ = (√(2t/π + 1/3) − 1) / 2.
 *
 * One Newton iteration on the residual `I(T) − t` gives ~5-decimal accuracy
 * even down to T ≈ 1 (where the asymptotic is at its weakest). For the first
 * ζ zero (t = 14.1347) this returns T ≈ 1.02814 vs. the true 1.02816.
 *
 * @param tImag — imaginary part of `s` (e.g. a Riemann ζ-zero ordinate).
 * @returns the scan-parameter T such that I(T) = tImag.
 * @throws if `tImag <= 0`.
 */
/** Derivative of the index function: I'(T) = π·[2·ln(1+1/T) + (2T+1)/(T(T+1))]/ln²(1+1/T).
 *  Used by the "Circles" view mode to lock the visual aspect ratio between σ
 *  and T so that natural features (which are circular in (σ, I(T)) space)
 *  render as circles on screen. */
export function iPrimeOfT(t: number): number {
  if (!(t > 0)) throw new Error("iPrimeOfT requires T > 0");
  const h = Math.log(1 + 1 / t);
  return (Math.PI * (2 * h + (2 * t + 1) / (t * (t + 1)))) / (h * h);
}

export function indexFromIofT(tImag: number): number {
  if (!(tImag > 0)) {
    throw new Error("indexFromIofT requires tImag > 0");
  }
  const t0 = (Math.sqrt(2 * tImag / Math.PI + 1 / 3) - 1) / 2;
  // Newton step: T₁ = T₀ - (I(T₀) - t) / I'(T₀)
  //   I'(T) = π · [2·ln(1+1/T) + (2T+1)/(T(T+1))] / ln²(1+1/T)
  const h = Math.log(1 + 1 / t0);
  const iT0 = (Math.PI * (2 * t0 + 1)) / h;
  const iPrime = (Math.PI * (2 * h + (2 * t0 + 1) / (t0 * (t0 + 1)))) / (h * h);
  return t0 - (iT0 - tImag) / iPrime;
}

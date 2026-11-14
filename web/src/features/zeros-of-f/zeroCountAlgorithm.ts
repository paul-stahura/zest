import { fScaledComponentsBatch, fVariantParts, type FVariant } from "@/shared/math/zerosOfF";

/**
 * Count zeros of the complex function f(s) inside the box
 * σ ∈ [sigmaMin, sigmaMax], T ∈ [tMin, tMax]  using the **argument principle**:
 *
 *   N  =  (1/2π) · Δ_C arg f(s)
 *
 * where C is the box boundary traversed counterclockwise.
 *
 * Supported only for `sum1R1` (f = Σ₁+R₁) and `sum2R2` (f = Σ₂+R₂) — other
 * families don't have isolated zeros.
 *
 * **Wrap-aliasing defense.** The naive algorithm walks the boundary at some
 * density K, sums up signed angle steps between samples (each capped at ±π
 * via wrap correction), and divides by 2π. If the function actually rotated
 * by ~2π·n+δ between two adjacent samples, the wrap correction silently
 * delivers δ — losing 2π·n of winding. That manifests as a wrong-but-integer
 * count (e.g. −1 instead of +21).
 *
 * To catch it we walk at TWO densities (K and 2K) and only trust the answer
 * when both round to the same integer AND both are within 0.15·2π of that
 * integer. Different aliasing behavior at different K values surfaces the
 * problem, and we double K and try again.
 *
 * Last-resort: 2×2 subdivision, where all sub-boxes use a shared density so
 * inner-edge contributions cancel cleanly.
 */
export interface CountZerosResult {
  count: number;
  rawWinding: number;
  samplesUsed: number;
  ok: boolean;
  /** Σ σⱼ across the count zeros in this box, from the first moment trick:
   *  (1/2πi) ∮ s · (f'/f) ds = Σⱼ zⱼ. Real part of that integral is Σ σⱼ,
   *  imaginary part is Σ tⱼ. For count = 1 these are exact zero coordinates.
   *  For count > 1 they're the centroid sums (divide by count for average).
   *  Defined only when ok = true (NaN otherwise). */
  sigmaSum: number;
  tSum: number;
}

export function countZerosInBox(
  sigmaMin: number,
  sigmaMax: number,
  tMin: number,
  tMax: number,
  variant: FVariant,
  opts?: { minPerSide?: number; maxPerSide?: number; maxDepth?: number },
): CountZerosResult {
  const fam = fVariantParts(variant).family;
  if (fam !== "sum1R1" && fam !== "sum2R2") {
    return { count: NaN, rawWinding: NaN, samplesUsed: 0, ok: false, sigmaSum: NaN, tSum: NaN };
  }
  // T-aware starting density. The function arg rotates at rate ~I'(T) ≈ 4π·T
  // per unit-T on the vertical edges (plus extra near σ=0.5). To stay below
  // Nyquist (step < π) on a 1-T-unit side we need K > I'(T)/π ≈ 4T. Multiply
  // by 4× as a safety margin → minPerSide ≥ 16·T. Floor at 128.
  const tMid = 0.5 * (Math.abs(tMin) + Math.abs(tMax));
  const tAware = Math.max(128, Math.ceil(16 * tMid));
  const minPerSide = opts?.minPerSide ?? tAware;
  const maxPerSide = opts?.maxPerSide ?? 524288;
  const maxDepth = opts?.maxDepth ?? 5;
  return tryBox(sigmaMin, sigmaMax, tMin, tMax, variant, minPerSide, maxPerSide, maxDepth);
}

function tryBox(
  sigmaMin: number, sigmaMax: number, tMin: number, tMax: number,
  variant: FVariant,
  minPerSide: number, maxPerSide: number, depth: number,
): CountZerosResult {
  // ---- Density-doubling cross-check ----
  // Walk at K, 2K, 4K, ... and only trust the answer when THREE consecutive
  // densities all agree on the same clean integer count. Two-in-a-row isn't
  // enough — if both K and 2K alias to the same wrong integer (which can
  // happen when the rotation rate is much faster than π·K), they'd agree
  // wrongly. Aliasing changes with K, so three-in-a-row matching is robust.
  const ACCEPT_TOL = 0.15;
  let K = minPerSide;
  let last: BoundaryWalk | null = null;       // result at previous K
  let lastLast: BoundaryWalk | null = null;   // result two K's back
  let samples = 0;
  let curr: BoundaryWalk = { winding: NaN, momentRe: NaN, momentIm: NaN };
  while (K <= maxPerSide) {
    curr = walkBoundary(sigmaMin, sigmaMax, tMin, tMax, variant, K);
    samples += K * 4;
    if (last !== null && lastLast !== null
        && Number.isFinite(curr.winding) && Number.isFinite(last.winding) && Number.isFinite(lastLast.winding)) {
      const Ncurr = Math.round(curr.winding / (2 * Math.PI));
      const Nlast = Math.round(last.winding / (2 * Math.PI));
      const NlastLast = Math.round(lastLast.winding / (2 * Math.PI));
      const cleanCurr = Math.abs(curr.winding / (2 * Math.PI) - Ncurr) < ACCEPT_TOL;
      const cleanLast = Math.abs(last.winding / (2 * Math.PI) - Nlast) < ACCEPT_TOL;
      const cleanLastLast = Math.abs(lastLast.winding / (2 * Math.PI) - NlastLast) < ACCEPT_TOL;
      if (Ncurr === Nlast && Nlast === NlastLast && cleanCurr && cleanLast && cleanLastLast) {
        // First moment: Σ zⱼ = M / (2πi) = (M_imag - i·M_real) / (2π)
        //   → Σ σⱼ =  M_imag / (2π),   Σ tⱼ = -M_real / (2π)
        return {
          count: Ncurr,
          rawWinding: curr.winding,
          samplesUsed: samples,
          ok: true,
          sigmaSum:  curr.momentIm / (2 * Math.PI),
          tSum:     -curr.momentRe / (2 * Math.PI),
        };
      }
    }
    lastLast = last;
    last = curr;
    K *= 2;
  }

  // ---- Subdivide as a fallback ----
  if (depth <= 0) {
    return { count: NaN, rawWinding: NaN, samplesUsed: samples, ok: false, sigmaSum: NaN, tSum: NaN };
  }
  const sm = 0.5 * (sigmaMin + sigmaMax);
  const tm = 0.5 * (tMin + tMax);
  const subs = [
    tryBox(sigmaMin, sm, tMin, tm, variant, minPerSide, maxPerSide, depth - 1),
    tryBox(sm, sigmaMax, tMin, tm, variant, minPerSide, maxPerSide, depth - 1),
    tryBox(sigmaMin, sm, tm, tMax, variant, minPerSide, maxPerSide, depth - 1),
    tryBox(sm, sigmaMax, tm, tMax, variant, minPerSide, maxPerSide, depth - 1),
  ];
  const allOk = subs.every((r) => r.ok);
  if (!allOk) {
    return {
      count: NaN, rawWinding: NaN,
      samplesUsed: samples + subs.reduce((s, r) => s + r.samplesUsed, 0),
      ok: false, sigmaSum: NaN, tSum: NaN,
    };
  }
  const totalCount = subs.reduce((s, r) => s + r.count, 0);
  const totalRaw = subs.reduce((s, r) => s + r.rawWinding, 0);
  const totalSamples = samples + subs.reduce((s, r) => s + r.samplesUsed, 0);
  // Moments add over decomposed regions (interior shared edges cancel by
  // opposite-direction traversal between adjacent sub-boxes).
  const totalSigmaSum = subs.reduce((s, r) => s + r.sigmaSum, 0);
  const totalTSum = subs.reduce((s, r) => s + r.tSum, 0);
  // Final consistency check at parent level — the summed sub-counts and the
  // summed raw windings must agree to within tolerance.
  if (Math.abs(totalRaw / (2 * Math.PI) - totalCount) < ACCEPT_TOL * 2) {
    return {
      count: totalCount, rawWinding: totalRaw, samplesUsed: totalSamples, ok: true,
      sigmaSum: totalSigmaSum, tSum: totalTSum,
    };
  }
  return { count: NaN, rawWinding: NaN, samplesUsed: totalSamples, ok: false, sigmaSum: NaN, tSum: NaN };
}

interface BoundaryWalk {
  winding: number;     // ∮ d(arg f) — should be 2π·N for an N-zero contour
  momentRe: number;    // Re ∮ s · d(log f)
  momentIm: number;    // Im ∮ s · d(log f)
}

/** Walk all 4 sides of the box counterclockwise at K samples per side. Returns:
 *  - winding: ∮ d(arg f), the total unwrapped change in arg(f).
 *  - moment{Re,Im}: real/imag parts of ∮ s · d(log f), the first moment of
 *    the logarithmic derivative. By the residue theorem this equals
 *    2πi · Σⱼ zⱼ for zeros zⱼ inside the box. Used by tryBox to compute the
 *    sum of zero locations (and thus the exact location when count = 1).
 */
function walkBoundary(
  sigmaMin: number, sigmaMax: number, tMin: number, tMax: number,
  variant: FVariant, K: number,
): BoundaryWalk {
  const a = walkHorizontal(sigmaMin, sigmaMax, tMin, variant, K);
  const b = walkVertical(sigmaMax, tMin, tMax, variant, K);
  const c = walkHorizontal(sigmaMax, sigmaMin, tMax, variant, K);
  const d = walkVertical(sigmaMin, tMax, tMin, variant, K);
  return {
    winding:  a.winding  + b.winding  + c.winding  + d.winding,
    momentRe: a.momentRe + b.momentRe + c.momentRe + d.momentRe,
    momentIm: a.momentIm + b.momentIm + c.momentIm + d.momentIm,
  };
}

function walkHorizontal(sFrom: number, sTo: number, t: number, variant: FVariant, K: number): BoundaryWalk {
  // Edge has σ varying, t fixed.
  const phases = new Float64Array(K);
  const logMag = new Float64Array(K);
  const sigmas = new Float64Array(K);
  const tArr = new Float64Array([t]);
  const lnT = Math.log(t);
  for (let i = 0; i < K; i++) {
    const sigma = sFrom + (i / (K - 1)) * (sTo - sFrom);
    sigmas[i] = sigma;
    const b = fScaledComponentsBatch(sigma, tArr, variant);
    const re = b.sigma1[0]! + b.r1[0]!;
    const im = b.sigma1[1]! + b.r1[1]!;
    phases[i] = Math.atan2(im, re);
    // f_scaled = t^σ · f, so log|f_scaled| = log|f| + σ·log(t). Strip the
    // scaling so the moment integrand uses the true log|f|.
    logMag[i] = 0.5 * Math.log(re * re + im * im) - sigma * lnT;
  }
  return accumulateEdge(phases, logMag, sigmas, t, /*horizontal=*/true);
}

function walkVertical(sigma: number, tFrom: number, tTo: number, variant: FVariant, K: number): BoundaryWalk {
  // Edge has σ fixed, t varying.
  const ts = new Float64Array(K);
  for (let i = 0; i < K; i++) ts[i] = tFrom + (i / (K - 1)) * (tTo - tFrom);
  const b = fScaledComponentsBatch(sigma, ts, variant);
  const phases = new Float64Array(K);
  const logMag = new Float64Array(K);
  for (let i = 0; i < K; i++) {
    const re = b.sigma1[i * 2]! + b.r1[i * 2]!;
    const im = b.sigma1[i * 2 + 1]! + b.r1[i * 2 + 1]!;
    phases[i] = Math.atan2(im, re);
    // f_scaled = t^σ · f, so log|f_scaled| = log|f| + σ·log(t). Strip the
    // scaling so the moment integrand uses the true log|f|.
    logMag[i] = 0.5 * Math.log(re * re + im * im) - sigma * Math.log(ts[i]!);
  }
  return accumulateEdge(phases, logMag, ts, sigma, /*horizontal=*/false);
}

/** Walk one edge: accumulate (a) unwrapped Δarg sum and (b) complex
 *  ∫ s · d(log f) using midpoint-rule on each segment.
 *
 *  For a segment from sample i to i+1:
 *    Δ(log f) = (logMag[i+1] − logMag[i]) + i · Δarg(f)   (complex)
 *    s_mid    = σ_mid + i · t_mid                         (complex)
 *    contribution = s_mid · Δ(log f)                      (complex multiply)
 *
 *  On a horizontal edge, the moving coord (`coords`) is σ and the fixed
 *  coord (`fixed`) is t; on a vertical edge it's the other way around.
 */
function accumulateEdge(
  phases: Float64Array,
  logMag: Float64Array,
  coords: Float64Array,
  fixed: number,
  horizontal: boolean,
): BoundaryWalk {
  let winding = 0, momentRe = 0, momentIm = 0;
  for (let i = 1; i < phases.length; i++) {
    let dArg = phases[i]! - phases[i - 1]!;
    if (!Number.isFinite(dArg)) return { winding: NaN, momentRe: NaN, momentIm: NaN };
    while (dArg >  Math.PI) dArg -= 2 * Math.PI;
    while (dArg < -Math.PI) dArg += 2 * Math.PI;
    const dLogMag = logMag[i]! - logMag[i - 1]!;
    if (!Number.isFinite(dLogMag)) return { winding: NaN, momentRe: NaN, momentIm: NaN };
    const cMid = 0.5 * (coords[i]! + coords[i - 1]!);
    const sigmaMid = horizontal ? cMid : fixed;
    const tMid     = horizontal ? fixed : cMid;
    // (σ + i·t) · (dLogMag + i·dArg) = (σ·dLogMag − t·dArg) + i·(σ·dArg + t·dLogMag)
    momentRe += sigmaMid * dLogMag - tMid * dArg;
    momentIm += sigmaMid * dArg    + tMid * dLogMag;
    winding  += dArg;
  }
  return { winding, momentRe, momentIm };
}

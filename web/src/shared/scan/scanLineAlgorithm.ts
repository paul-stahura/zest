import { fScaledComponentsBatch, fVariantParts, type FVariant } from "@/shared/math/zerosOfF";
import { scanFloorT } from "@/shared/math/zerosOfF/scanFloor";

/** Inputs for a single σ-row scan. */
export interface ScanLineInput {
  sigma: number;
  tMin: number;
  tMax: number;
  /** Initial uniform sampling density of `Z(t)` per integer-T period. */
  samplesPerT: number;
  /** Binary bisection iterations per sign-change bracket. */
  bisectionIters: number;
  variant: FVariant;
  /** Reserved (unused by the deterministic crossing algorithm). */
  seed: number;
  /** Threshold used by the `legRatio` variant to decide which sampled points
   *  to keep: a point passes iff `||leg1|/|leg2| − 1| < acceptDepth`.
   *  Ignored by `R1ak`, `R1`, and `R2`. */
  acceptDepth?: number;
  /** When `false`, the scan ignores the empirical scan floor (`scanFloorT`)
   *  and walks the full requested T range regardless of variant. Default
   *  `true` preserves the historical behavior where R1ak skipped sub-floor
   *  samples (the I₁-asymptotic blows up below the floor). Other variants
   *  never honored the floor in the first place. */
  useScanFloor?: boolean;
}

/** Recorded points for one σ-row. `phaseDev` is `|arg(−Σ₁/R₁)/π|` per zero;
 *  `phaseR` is the signed `arg(R)/π` in (-1, 1] per zero. */
export interface ScanLineOutput {
  sigma: number;
  t: Float64Array;
  yVal: Float64Array;
  sigma1Mag: Float64Array;
  r1Mag: Float64Array;
  phaseDev: Float64Array;
  /** Signed phase of R per point — `arg(R)/π` in (-1, 1]. */
  phaseR: Float64Array;
  /** Optional `||leg1|/|leg2| − 1|` per point — populated by the `legRatio`
   *  threshold scan so the depth color modes have something to plot. */
  depth?: Float64Array;
  pointsEvaluated: number;
}

/**
 * Sign-change scan for zeros of `f(s) = Σ₁(s) + R₁(s)` along one σ-row.
 *
 *   Z(t) = log|R₁(σ,t)| − log|Σ₁(σ,t)|
 *   φ(t) = arg(−Σ₁(σ,t) / R₁(σ,t)) / π        (signed, in (−1, 1])
 *
 * A real zero of `f` requires `|Σ₁| = |R₁|` AND `Σ₁ = −R₁` in phase, so it is
 * a *simultaneous* zero-crossing of `Z` and `φ`. We use Z to find candidate
 * brackets (sparse) and then accept iff `φ` also sign-changes across the
 * bisected bracket — a threshold-free filter.
 *
 * Recipe per integer-T period `[k, k+1]`:
 *   1. Sample Z at `samplesPerT` evenly-spaced t.
 *   2. For each adjacent pair where Z flips sign → bisect `bisectionIters`
 *      times, tracking φ at the bracket endpoints throughout.
 *   3. Accept iff φ also sign-changes across the final bracket AND the φ
 *      values aren't separated by a 2π-wrap (`|φ(tL) − φ(tR)| < 1`).
 *
 * Pure function; safe to call from a Web Worker.
 */
export function scanLine(input: ScanLineInput): ScanLineOutput {
  const fam = fVariantParts(input.variant).family;
  if (fam === "legRatio") return scanLineLegRatio(input);
  if (fam === "legAngle" || fam === "legAngleOut" || fam === "sum1R1Angle") return scanLineLegAngle(input);

  const tHits: number[] = [];
  const yHits: number[] = [];
  const s1Hits: number[] = [];
  const r1Hits: number[] = [];
  const phHits: number[] = [];
  const prHits: number[] = [];
  let pointsEvaluated = 0;

  // The empirical scan floor reflects where the R₁ak approximation breaks
  // down — below it there's no point scanning. The exact-but-overflow-prone
  // R1 and R2 variants have no such limitation, so when the user picks one
  // of them we honor the full requested T range (they're explicitly asking
  // to look below the floor, e.g. for diagnostic comparison or to probe
  // the boundary).
  const useFloor = input.useScanFloor !== false;
  const floor = (useFloor && input.variant === "R1ak") ? scanFloorT(input.sigma) : -Infinity;
  const effectiveTMin = Math.max(input.tMin, floor);

  const kStart = Math.floor(effectiveTMin);
  const kEnd = Math.floor(input.tMax);
  const N = Math.max(2, input.samplesPerT);
  const iters = Math.max(0, Math.floor(input.bisectionIters));

  for (let k = kStart; k <= kEnd; k++) {
    const lo = Math.max(effectiveTMin, k);
    const hi = Math.min(input.tMax, k + 1);
    if (lo >= hi) continue;

    // Phase 1: coarse Z sampling. Z = log r1 − log sigma1; magnitudes already
    // carry a t^σ scale that keeps both numerator and denominator in normal
    // floating-point range, so the subtraction is well-conditioned.
    //
    // Σ₁'s partial sum `Σ_{n≤⌊t⌋}` is discontinuous at integer t — it gains
    // a term every time t crosses an integer. Sampling at t = k+1 sits on
    // that discontinuity and produces spurious sign-changes for both Z and
    // φ that bisect into the jump itself, not a real zero. We keep all
    // samples strictly inside `[k, k+1)` by sampling at `lo + (i + 0.5) / N
    // · (hi − lo)` (mid-bin positions) so `⌊t⌋ = k` everywhere on the row.
    const tPts = new Float64Array(N);
    const span = hi - lo;
    for (let i = 0; i < N; i++) tPts[i] = lo + ((i + 0.5) / N) * span;
    const batch = fScaledComponentsBatch(input.sigma, tPts, input.variant);
    pointsEvaluated += N;
    const Zsamples = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      Zsamples[i] = safeLog(batch.r1Mag[i]!) - safeLog(batch.sigma1Mag[i]!);
    }
    // Pull signed phase φ at every coarse sample for the cheap φ-bracket-check
    // at the start of bisection (we re-evaluate it on midpoints inside).
    const phaseSignedSamples = batch.phaseSigned;

    // Phase 2: walk consecutive coarse samples. Accept brackets where BOTH
    // Z and φ sign-change (with wrap guard) — that's the necessary-and-
    // sufficient condition for a real f-zero inside the bracket. Then
    // bisect Z to refine t*. No post-bisection φ check needed: at the
    // coarse scale (~1/samplesPerT in t) the bracket reliably contains
    // both zeros if there is a real f-zero, but the post-bisection bracket
    // (~1e-7 in t) is too tight — sub-ULP differences between Z's zero and
    // φ's zero would cause false rejections.
    for (let i = 0; i < N - 1; i++) {
      const za = Zsamples[i]!;
      const zb = Zsamples[i + 1]!;
      if (!Number.isFinite(za) || !Number.isFinite(zb)) continue;
      if (za * zb >= 0) continue; // No Z sign change.

      const phiA = phaseSignedSamples[i]!;
      const phiB = phaseSignedSamples[i + 1]!;
      // φ sign-change at the coarse-sample scale, with 2π-wrap guard.
      // φ ∈ (−1, 1]; |Δφ| > 1 across one sample gap means a 2π wrap, not a
      // real zero crossing.
      const phiSignChange = phiA * phiB < 0 || phiA === 0 || phiB === 0;
      const phiWrap = Math.abs(phiA - phiB) > 1;
      if (!phiSignChange || phiWrap) continue;

      // Bisect Z to refine t*. φ is no longer checked inside the loop —
      // this is purely a precision step.
      let aT = tPts[i]!;
      let bT = tPts[i + 1]!;
      let aZ = za;
      let bZ = zb;
      let mResult: PointEval | null = null;
      for (let it = 0; it < iters; it++) {
        const mT = 0.5 * (aT + bT);
        mResult = evalAt(input.sigma, mT, input.variant);
        pointsEvaluated += 1;
        const mZ = mResult.Z;
        if (!Number.isFinite(mZ)) break; // Bisection wandered into bad math.
        if (mZ === 0) { aT = mT; bT = mT; aZ = 0; bZ = 0; break; }
        if (mZ * aZ < 0) { bT = mT; bZ = mZ; }
        else { aT = mT; aZ = mZ; }
      }

      // Linear interp gives one extra bit over the bracket midpoint.
      let tStar: number;
      if (bZ !== aZ) {
        tStar = aT - aZ * (bT - aT) / (bZ - aZ);
      } else {
        tStar = aT;
      }
      const res = evalAt(input.sigma, tStar, input.variant);
      pointsEvaluated += 1;
      tHits.push(tStar);
      yHits.push(res.yVal);
      s1Hits.push(res.sigma1Mag);
      r1Hits.push(res.r1Mag);
      phHits.push(Math.abs(res.phaseSigned));
      prHits.push(res.phaseR);
    }
  }

  return {
    sigma: input.sigma,
    t: Float64Array.from(tHits),
    yVal: Float64Array.from(yHits),
    sigma1Mag: Float64Array.from(s1Hits),
    r1Mag: Float64Array.from(r1Hits),
    phaseDev: Float64Array.from(phHits),
    phaseR: Float64Array.from(prHits),
    pointsEvaluated,
  };
}

/**
 * Sign-change + bisection scan for the `legRatio` variant.
 *
 *   f(σ, t) = |leg1| / |leg2| − 1     (real)
 *
 * with `leg1 = Σ₁(σ,t) + R₁(σ,t)` and `leg2 = Σ₂(σ,t) + R₂(σ,t)`. We sample
 * uniformly inside each integer-T period at `samplesPerT` mid-bin positions,
 * walk consecutive sample pairs, and bisect any pair where `f` flips sign —
 * that is the moment the legs cross from "leg1 longer" to "leg2 longer" (or
 * vice versa), i.e. the curve `|leg1| = |leg2|` is intersected at a real `t*`
 * inside the bracket. `bisectionIters` halvings refine `t*`; one linear-interp
 * step after that gives sub-bisection precision. `depth = |f(t*)|` is stored
 * so depth color modes can show how tight the converged crossing is. No
 * acceptance threshold is applied — every legitimate sign change is recorded.
 */
function scanLineLegRatio(input: ScanLineInput): ScanLineOutput {
  const tHits: number[] = [];
  const yHits: number[] = [];
  const s1Hits: number[] = [];
  const r1Hits: number[] = [];
  const phHits: number[] = [];
  const prHits: number[] = [];
  const dHits: number[] = [];
  let pointsEvaluated = 0;

  const kStart = Math.floor(input.tMin);
  const kEnd = Math.floor(input.tMax);
  const N = Math.max(2, input.samplesPerT);
  const iters = Math.max(0, Math.floor(input.bisectionIters));

  for (let k = kStart; k <= kEnd; k++) {
    const lo = Math.max(input.tMin, k);
    const hi = Math.min(input.tMax, k + 1);
    if (lo >= hi) continue;
    // Mid-bin sampling: t_i = lo + (i + 0.5)/N · span, strictly inside [k, k+1)
    // so ⌊t⌋ = k everywhere along the row (avoids Σ₁/Σ₂ partial-sum jumps at
    // integer t).
    const tPts = new Float64Array(N);
    const span = hi - lo;
    for (let i = 0; i < N; i++) tPts[i] = lo + ((i + 0.5) / N) * span;
    const batch = fScaledComponentsBatch(input.sigma, tPts, input.variant);
    pointsEvaluated += N;
    const fSamples = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const a = batch.sigma1Mag[i]!;
      const b = batch.r1Mag[i]!;
      fSamples[i] = (Number.isFinite(a) && Number.isFinite(b) && b > 0)
        ? a / b - 1
        : NaN;
    }

    for (let i = 0; i < N - 1; i++) {
      const fa = fSamples[i]!;
      const fb = fSamples[i + 1]!;
      if (!Number.isFinite(fa) || !Number.isFinite(fb)) continue;
      if (fa * fb >= 0) continue; // no sign change

      let aT = tPts[i]!;
      let bT = tPts[i + 1]!;
      let aF = fa;
      let bF = fb;
      for (let it = 0; it < iters; it++) {
        const mT = 0.5 * (aT + bT);
        const mb = fScaledComponentsBatch(input.sigma, new Float64Array([mT]), input.variant);
        pointsEvaluated += 1;
        const mLeg1 = mb.sigma1Mag[0]!;
        const mLeg2 = mb.r1Mag[0]!;
        const mF = (Number.isFinite(mLeg1) && Number.isFinite(mLeg2) && mLeg2 > 0)
          ? mLeg1 / mLeg2 - 1
          : NaN;
        if (!Number.isFinite(mF)) break;
        if (mF === 0) { aT = mT; bT = mT; aF = 0; bF = 0; break; }
        if (mF * aF < 0) { bT = mT; bF = mF; }
        else { aT = mT; aF = mF; }
      }
      // One-bit-better than mid: linear interp on f to land on the crossing.
      const tStar = (bF !== aF) ? aT - aF * (bT - aT) / (bF - aF) : aT;
      const finalB = fScaledComponentsBatch(input.sigma, new Float64Array([tStar]), input.variant);
      pointsEvaluated += 1;
      const leg1M = finalB.sigma1Mag[0]!;
      const leg2M = finalB.r1Mag[0]!;
      const fStar = (leg2M > 0) ? Math.abs(leg1M / leg2M - 1) : NaN;
      tHits.push(tStar);
      yHits.push(finalB.yVal[0]!);
      s1Hits.push(leg1M);
      r1Hits.push(leg2M);
      phHits.push(finalB.phaseDev[0]!);
      prHits.push(Math.atan2(finalB.r1[1]!, finalB.r1[0]!) / Math.PI);
      dHits.push(fStar);
    }
  }

  return {
    sigma: input.sigma,
    t: Float64Array.from(tHits),
    yVal: Float64Array.from(yHits),
    sigma1Mag: Float64Array.from(s1Hits),
    r1Mag: Float64Array.from(r1Hits),
    phaseDev: Float64Array.from(phHits),
    phaseR: Float64Array.from(prHits),
    depth: Float64Array.from(dHits),
    pointsEvaluated,
  };
}

/**
 * Sign-change + bisection scan for the `legAngle` variant.
 *
 *   f(σ, t) = arg(−leg1 · conj(leg2)) / π   ∈ (−1, 1]
 *
 * with `leg1 = Σ₁(σ,t) + R₁(σ,t)` and `leg2 = Σ₂(σ,t) + R₂(σ,t)`. f = 0 marks
 * the legs antialigned ("folded back onto themselves"). Each integer-T period
 * is sampled at `samplesPerT` mid-bin points; sign flips of `f` between
 * consecutive samples bracket a real fold-back, and we bisect the bracket.
 *
 * 2π-wrap guard: f is principal-valued, so a sample pair straddling the
 * (−1, 1] boundary shows a spurious sign-flip with `|fa − fb| > 1`. We skip
 * those just like the R1ak/R1/R2 sign-change scanner does. `depth = |f(t*)|`
 * is recorded as a converge-tightness diagnostic.
 */
function scanLineLegAngle(input: ScanLineInput): ScanLineOutput {
  const tHits: number[] = [];
  const yHits: number[] = [];
  const s1Hits: number[] = [];
  const r1Hits: number[] = [];
  const phHits: number[] = [];
  const prHits: number[] = [];
  const dHits: number[] = [];
  let pointsEvaluated = 0;

  const kStart = Math.floor(input.tMin);
  const kEnd = Math.floor(input.tMax);
  const N = Math.max(2, input.samplesPerT);
  const iters = Math.max(0, Math.floor(input.bisectionIters));

  for (let k = kStart; k <= kEnd; k++) {
    const lo = Math.max(input.tMin, k);
    const hi = Math.min(input.tMax, k + 1);
    if (lo >= hi) continue;
    const tPts = new Float64Array(N);
    const span = hi - lo;
    for (let i = 0; i < N; i++) tPts[i] = lo + ((i + 0.5) / N) * span;
    const batch = fScaledComponentsBatch(input.sigma, tPts, input.variant);
    pointsEvaluated += N;

    for (let i = 0; i < N - 1; i++) {
      const fa = batch.phaseSigned[i]!;
      const fb = batch.phaseSigned[i + 1]!;
      if (!Number.isFinite(fa) || !Number.isFinite(fb)) continue;
      if (fa * fb >= 0) continue;
      // Wrap guard: |Δf| > 1 across one bin means the principal angle wrapped
      // (e.g. +0.99 → −0.98), not a real crossing.
      if (Math.abs(fa - fb) > 1) continue;

      let aT = tPts[i]!;
      let bT = tPts[i + 1]!;
      let aF = fa;
      let bF = fb;
      for (let it = 0; it < iters; it++) {
        const mT = 0.5 * (aT + bT);
        const mb = fScaledComponentsBatch(input.sigma, new Float64Array([mT]), input.variant);
        pointsEvaluated += 1;
        const mF = mb.phaseSigned[0]!;
        if (!Number.isFinite(mF)) break;
        if (mF === 0) { aT = mT; bT = mT; aF = 0; bF = 0; break; }
        // Wrap guard mid-bisection too: if f jumps by > 1 vs both endpoints,
        // we walked into the wrap branch — abort this bracket.
        if (Math.abs(mF - aF) > 1 || Math.abs(mF - bF) > 1) break;
        if (mF * aF < 0) { bT = mT; bF = mF; }
        else { aT = mT; aF = mF; }
      }
      const tStar = (bF !== aF) ? aT - aF * (bT - aT) / (bF - aF) : aT;
      const finalB = fScaledComponentsBatch(input.sigma, new Float64Array([tStar]), input.variant);
      pointsEvaluated += 1;
      tHits.push(tStar);
      yHits.push(finalB.yVal[0]!);
      s1Hits.push(finalB.sigma1Mag[0]!);
      r1Hits.push(finalB.r1Mag[0]!);
      phHits.push(finalB.phaseDev[0]!);
      prHits.push(Math.atan2(finalB.r1[1]!, finalB.r1[0]!) / Math.PI);
      dHits.push(Math.abs(finalB.phaseSigned[0]!));
    }
  }

  return {
    sigma: input.sigma,
    t: Float64Array.from(tHits),
    yVal: Float64Array.from(yHits),
    sigma1Mag: Float64Array.from(s1Hits),
    r1Mag: Float64Array.from(r1Hits),
    phaseDev: Float64Array.from(phHits),
    phaseR: Float64Array.from(prHits),
    depth: Float64Array.from(dHits),
    pointsEvaluated,
  };
}

/** `log(x)` clamped: returns `-Infinity` for `x ≤ 0` rather than NaN. */
function safeLog(x: number): number {
  return x > 0 ? Math.log(x) : -Infinity;
}

interface PointEval {
  Z: number;
  phaseSigned: number;
  /** Signed `arg(R) / π` in (-1, 1]. Independent of Σ₁, useful for
   *  per-strand fingerprinting since arg(R) is approximately constant
   *  along a single strand even when frac(T) wraps. */
  phaseR: number;
  yVal: number;
  sigma1Mag: number;
  r1Mag: number;
}

/** Single-point evaluation of Z, signed φ, arg(R), |f|, |Σ₁|, |R₁| at a specific t. */
function evalAt(sigma: number, t: number, variant: FVariant): PointEval {
  const tArr = new Float64Array([t]);
  const b = fScaledComponentsBatch(sigma, tArr, variant);
  const r1Re = b.r1[0]!;
  const r1Im = b.r1[1]!;
  return {
    Z: safeLog(b.r1Mag[0]!) - safeLog(b.sigma1Mag[0]!),
    phaseSigned: b.phaseSigned[0]!,
    phaseR: Math.atan2(r1Im, r1Re) / Math.PI,
    yVal: b.yVal[0]!,
    sigma1Mag: b.sigma1Mag[0]!,
    r1Mag: b.r1Mag[0]!,
  };
}

import { fScaledComponentsBatch, fVariantParts, type FVariant } from "@/shared/math/zerosOfF";
import { scanFloorT } from "@/shared/math/zerosOfF/scanFloor";

/**
 * Alternative scan: detect zeros of `f = Σ₁ + R₁` as local minima of `|f|`,
 * not as conjunctions of two sign-changes (Z and φ). Sibling to `scanLine`;
 * neither replaces the other yet.
 *
 * Why a separate algorithm:
 *   |f|² = |Σ₁|² + |R₁|² + 2·Re(Σ₁·conj(R₁))
 * A real zero of f is a global zero of |f|; nearby it dominates |f| smoothly
 * with no wrap or branch issues. The "two sign-changes" formulation is exact
 * but coupled — Z and φ can land in adjacent coarse brackets near a zero
 * (false negative) or both pass for a phase wrap with a near-balance Z flip
 * (false positive). |f|-minima collapse both checks into one nonnegative
 * scalar with monotone meaning: deeper min ⇒ closer to a real zero.
 *
 * Resolution ceiling: a local-min detector resolves ≤ ⌊samplesPerT/3⌋ minima
 * per integer-T period (need a sample on each side of every minimum, plus
 * one between consecutive minima). The same density is required by the Z+φ
 * scan to see consecutive zeros as separate sign-flips, so this is not a
 * regression — it's the same Nyquist constraint, stated honestly.
 */

/** Inputs for a single σ-row minima scan. Same shape as `ScanLineInput` plus
 * an acceptance threshold on the dimensionless depth `|f| / (|Σ₁| + |R₁|)`. */
export interface ScanLineMinimaInput {
  sigma: number;
  tMin: number;
  tMax: number;
  /** Coarse sampling density per integer-T period. Caps detectable zeros at
   * roughly `samplesPerT / 3` per T — raise this in σ-regions known to have
   * many zeros per T (e.g. σ near 0 at low t). */
  samplesPerT: number;
  /** Golden-section refinement iterations per candidate minimum. ~20 gets
   * `|f|` to its local minimum within ~1e-6 of t-spacing. */
  refineIters: number;
  /** Accept candidate iff refined `depth = |f| / (|Σ₁| + |R₁|) < acceptDepth`.
   *
   * Depth interpretation:
   *   - depth = 0       perfect cancellation (true zero of f)
   *   - depth ∈ (0, 1)  partial cancellation
   *   - depth → 1       Σ₁ and R₁ aligned (no cancellation)
   *
   * Suggested starting values:
   *   - 0.05  strict — likely few false positives, may miss shallow zeros
   *   - 0.10  balanced default
   *   - 0.25  permissive — catches more, lets through phase-only near-balances
   *
   * Calibration recipe: pick a σ-row where ground truth is known (or where
   * the Z+φ scan agrees with itself across two `samplesPerT` settings),
   * compute depths at all candidates, and place the threshold above the
   * deepest known false positive (or below the shallowest known true
   * zero). Distribution is typically bimodal: real zeros cluster near 0,
   * spurious minima cluster near 0.5–1.0. */
  acceptDepth: number;
  variant: FVariant;
  /** Reserved (unused — algorithm is deterministic). */
  seed: number;
  /** When `false`, the scan ignores the empirical scan floor and walks the
   *  full requested T range (default `true`). See {@link ScanLineInput}. */
  useScanFloor?: boolean;
}

/** Output mirrors `ScanLineOutput` plus per-zero `depth` and `phaseR`. */
export interface ScanLineMinimaOutput {
  sigma: number;
  t: Float64Array;
  yVal: Float64Array;
  sigma1Mag: Float64Array;
  r1Mag: Float64Array;
  phaseDev: Float64Array;
  /** Signed `arg(R)/π` in (-1, 1] at each refined zero. */
  phaseR: Float64Array;
  /** `|f| / (|Σ₁| + |R₁|)` at the refined zero. Lower = cleaner cancellation. */
  depth: Float64Array;
  pointsEvaluated: number;
}

/**
 * Local-minima scan for zeros of `f`.
 *
 * For variants `R1ak`, `R1`, `R2`:
 *   - `f = Σ₁ + R₁` (or its variant). The minimization target is `|f|` and
 *     `depth = |f| / (|Σ₁| + |R₁|)` is the dimensionless cancellation ratio.
 *
 * For variant `legRatio`:
 *   - `f = |leg1|/|leg2| − 1` (real). The minimization target is `|f|` itself,
 *     and `depth = |f|` (no normalization). `acceptDepth` filters directly on
 *     how close the legs are to equal length at the recorded minimum. This
 *     captures *only* leg-balance points — it does **not** find ζ zeros.
 *
 * Per integer-T period `[k, k+1)`:
 *   1. Sample `g(t) = log|f(t)|` at `samplesPerT` mid-bin points (avoids the
 *      Σ₁ partial-sum discontinuity at integer t).
 *   2. Find indices `i` with `g[i-1] > g[i] < g[i+1]` (strict local minima).
 *   3. For each, refine with golden-section search on `g` over
 *      `[t[i-1], t[i+1]]` for `refineIters` iterations.
 *   4. Accept iff `depth(t*) < acceptDepth`.
 *
 * Pure function; safe to call from a Web Worker.
 */
export function scanLineMinima(input: ScanLineMinimaInput): ScanLineMinimaOutput {
  const tHits: number[] = [];
  const yHits: number[] = [];
  const s1Hits: number[] = [];
  const r1Hits: number[] = [];
  const phHits: number[] = [];
  const prHits: number[] = [];
  const depthHits: number[] = [];
  let pointsEvaluated = 0;

  // R1/R2 variants: bypass the empirical scan floor (which only constrains
  // the R₁ak approximation), so the user's full requested T range is scanned.
  const useFloor = input.useScanFloor !== false;
  const floor = (useFloor && input.variant === "R1ak") ? scanFloorT(input.sigma) : -Infinity;
  const effectiveTMin = Math.max(input.tMin, floor);
  const kStart = Math.floor(effectiveTMin);
  const kEnd = Math.floor(input.tMax);
  const N = Math.max(3, input.samplesPerT); // need ≥3 to detect a min
  const iters = Math.max(0, Math.floor(input.refineIters));

  for (let k = kStart; k <= kEnd; k++) {
    const lo = Math.max(effectiveTMin, k);
    const hi = Math.min(input.tMax, k + 1);
    if (lo >= hi) continue;

    const tPts = new Float64Array(N);
    const span = hi - lo;
    for (let i = 0; i < N; i++) tPts[i] = lo + ((i + 0.5) / N) * span;
    const batch = fScaledComponentsBatch(input.sigma, tPts, input.variant);
    pointsEvaluated += N;

    const variant = input.variant;
    const g = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      g[i] = safeLog(absFForVariant(
        variant,
        batch.yVal[i]!,
        batch.sigma1Mag[i]!,
        batch.r1Mag[i]!,
        batch.phaseDev[i]!,
      ));
    }

    // Pre-refinement gate. The coarse sample already gives us |f|, |Σ₁|, |R₁|,
    // so we can compute a coarse depth for free. Refinement can only *lower*
    // |f| (we minimize log|f|) — typically by a small factor for spurious mins
    // and by orders of magnitude for real zeros. We use a large multiplier so
    // we never skip a real zero: if even a 10000× refinement gain wouldn't
    // bring depth below acceptDepth, skip the refinement entirely.
    const COARSE_GATE_MULT = 10_000;
    const skipDepth = input.acceptDepth * COARSE_GATE_MULT;

    // Collect all candidate minima for this period (those passing local-min
    // check + the cheap pre-refinement gate). They'll be refined together so
    // each golden-section iteration is one batched f-eval covering all
    // candidates instead of one size-1 eval per candidate.
    const cand: number[] = [];
    for (let i = 1; i < N - 1; i++) {
      const gm = g[i]!;
      if (!Number.isFinite(gm)) continue;
      const gl = g[i - 1]!;
      const gr = g[i + 1]!;
      if (!(gm < gl && gm < gr)) continue;
      const coarseDepth = depthForVariant(
        variant,
        batch.yVal[i]!,
        batch.sigma1Mag[i]!,
        batch.r1Mag[i]!,
        batch.phaseDev[i]!,
      );
      if (coarseDepth > skipDepth) continue;
      cand.push(i);
    }
    const m = cand.length;
    if (m === 0) continue;

    // Per-candidate golden-section state. We carry both probe points (x1, x2)
    // and their full f-eval data (so we can return the best one without an
    // extra eval at the end).
    const cLo = new Float64Array(m), cHi = new Float64Array(m);
    const cX1 = new Float64Array(m), cX2 = new Float64Array(m);
    const cG1 = new Float64Array(m), cG2 = new Float64Array(m);
    const cF1y = new Float64Array(m), cF1s = new Float64Array(m), cF1r = new Float64Array(m), cF1p = new Float64Array(m), cF1pr = new Float64Array(m);
    const cF2y = new Float64Array(m), cF2s = new Float64Array(m), cF2r = new Float64Array(m), cF2p = new Float64Array(m), cF2pr = new Float64Array(m);
    for (let j = 0; j < m; j++) {
      const i = cand[j]!;
      const aT0 = tPts[i - 1]!;
      const cT0 = tPts[i + 1]!;
      cLo[j] = aT0;
      cHi[j] = cT0;
      cX1[j] = cT0 - PHI * (cT0 - aT0);
      cX2[j] = aT0 + PHI * (cT0 - aT0);
    }

    // Initial batched eval of all (x1, x2) probe pairs.
    const initT = new Float64Array(m * 2);
    for (let j = 0; j < m; j++) { initT[j * 2] = cX1[j]!; initT[j * 2 + 1] = cX2[j]!; }
    const initBatch = fScaledComponentsBatch(input.sigma, initT, input.variant);
    pointsEvaluated += m * 2;
    for (let j = 0; j < m; j++) {
      const a = j * 2, b = j * 2 + 1;
      cF1y[j] = initBatch.yVal[a]!; cF1s[j] = initBatch.sigma1Mag[a]!; cF1r[j] = initBatch.r1Mag[a]!; cF1p[j] = initBatch.phaseSigned[a]!;
      cF1pr[j] = Math.atan2(initBatch.r1[a * 2 + 1]!, initBatch.r1[a * 2]!) / Math.PI;
      cF2y[j] = initBatch.yVal[b]!; cF2s[j] = initBatch.sigma1Mag[b]!; cF2r[j] = initBatch.r1Mag[b]!; cF2p[j] = initBatch.phaseSigned[b]!;
      cF2pr[j] = Math.atan2(initBatch.r1[b * 2 + 1]!, initBatch.r1[b * 2]!) / Math.PI;
      cG1[j] = safeLog(absFForVariant(variant, cF1y[j]!, cF1s[j]!, cF1r[j]!, Math.abs(cF1p[j]!)));
      cG2[j] = safeLog(absFForVariant(variant, cF2y[j]!, cF2s[j]!, cF2r[j]!, Math.abs(cF2p[j]!)));
    }

    // Golden-section iterations, lock-stepped across all candidates. Each
    // iter is exactly one batched f-eval of m points.
    const updatedSide = new Uint8Array(m); // 1 = x1 was just updated, 0 = x2
    const probeT = new Float64Array(m);
    for (let it = 0; it < iters; it++) {
      for (let j = 0; j < m; j++) {
        if (cG1[j]! < cG2[j]!) {
          // Discard right side; new x1 needs evaluation.
          cHi[j] = cX2[j]!;
          cX2[j] = cX1[j]!;
          cF2y[j] = cF1y[j]!; cF2s[j] = cF1s[j]!; cF2r[j] = cF1r[j]!; cF2p[j] = cF1p[j]!; cF2pr[j] = cF1pr[j]!;
          cG2[j] = cG1[j]!;
          cX1[j] = cHi[j]! - PHI * (cHi[j]! - cLo[j]!);
          probeT[j] = cX1[j]!;
          updatedSide[j] = 1;
        } else {
          cLo[j] = cX1[j]!;
          cX1[j] = cX2[j]!;
          cF1y[j] = cF2y[j]!; cF1s[j] = cF2s[j]!; cF1r[j] = cF2r[j]!; cF1p[j] = cF2p[j]!; cF1pr[j] = cF2pr[j]!;
          cG1[j] = cG2[j]!;
          cX2[j] = cLo[j]! + PHI * (cHi[j]! - cLo[j]!);
          probeT[j] = cX2[j]!;
          updatedSide[j] = 0;
        }
      }
      const nb = fScaledComponentsBatch(input.sigma, probeT, input.variant);
      pointsEvaluated += m;
      for (let j = 0; j < m; j++) {
        if (updatedSide[j]! === 1) {
          cF1y[j] = nb.yVal[j]!; cF1s[j] = nb.sigma1Mag[j]!; cF1r[j] = nb.r1Mag[j]!; cF1p[j] = nb.phaseSigned[j]!;
          cF1pr[j] = Math.atan2(nb.r1[j * 2 + 1]!, nb.r1[j * 2]!) / Math.PI;
          cG1[j] = safeLog(absFForVariant(variant, cF1y[j]!, cF1s[j]!, cF1r[j]!, Math.abs(cF1p[j]!)));
        } else {
          cF2y[j] = nb.yVal[j]!; cF2s[j] = nb.sigma1Mag[j]!; cF2r[j] = nb.r1Mag[j]!; cF2p[j] = nb.phaseSigned[j]!;
          cF2pr[j] = Math.atan2(nb.r1[j * 2 + 1]!, nb.r1[j * 2]!) / Math.PI;
          cG2[j] = safeLog(absFForVariant(variant, cF2y[j]!, cF2s[j]!, cF2r[j]!, Math.abs(cF2p[j]!)));
        }
      }
    }

    // Pick the better of (x1, x2) per candidate, apply acceptDepth filter, record.
    for (let j = 0; j < m; j++) {
      const useOne = cG1[j]! < cG2[j]!;
      const tStar = useOne ? cX1[j]! : cX2[j]!;
      const yVal = useOne ? cF1y[j]! : cF2y[j]!;
      const s1 = useOne ? cF1s[j]! : cF2s[j]!;
      const r1 = useOne ? cF1r[j]! : cF2r[j]!;
      const ps = useOne ? cF1p[j]! : cF2p[j]!;
      const pr = useOne ? cF1pr[j]! : cF2pr[j]!;
      const depth = depthForVariant(variant, yVal, s1, r1, Math.abs(ps));
      if (!Number.isFinite(depth) || depth >= input.acceptDepth) continue;
      tHits.push(tStar);
      yHits.push(yVal);
      s1Hits.push(s1);
      r1Hits.push(r1);
      phHits.push(Math.abs(ps));
      prHits.push(pr);
      depthHits.push(depth);
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
    depth: Float64Array.from(depthHits),
    pointsEvaluated,
  };
}

const PHI = (Math.sqrt(5) - 1) / 2; // 0.618...

function safeLog(x: number): number {
  return x > 0 ? Math.log(x) : -Infinity;
}

/**
 * Per-variant `|f|`. Used as the golden-section minimization target *and* as
 * the post-refinement acceptance metric for variants whose `f` is naturally
 * scaled to [0, 1] (legRatio, legAngle).
 *
 *   legRatio  → ||leg1|/|leg2| − 1|         (sigma1Mag / r1Mag − 1)
 *   legAngle  → |arg(−leg1·conj(leg2)) / π| (== batch.phaseDev)
 *   else      → |f|                         (== batch.yVal)
 *
 * Returns +Infinity for the leg variants when inputs are non-finite or
 * leg2 collapses to zero — keeps such samples filtered above any reasonable
 * acceptDepth.
 */
function absFForVariant(
  variant: FVariant,
  yVal: number,
  leg1Mag: number,
  leg2Mag: number,
  phaseDev: number,
): number {
  const fam = fVariantParts(variant).family;
  if (fam === "legRatio") {
    if (!Number.isFinite(leg1Mag) || !Number.isFinite(leg2Mag) || leg2Mag <= 0) return Infinity;
    return Math.abs(leg1Mag / leg2Mag - 1);
  }
  if (fam === "legAngle" || fam === "legAngleOut") {
    if (!Number.isFinite(phaseDev)) return Infinity;
    return phaseDev;
  }
  return yVal;
}

/**
 * Per-variant acceptance depth. Same definition as `absFForVariant` for the
 * leg variants (so `acceptDepth` is the threshold on |f| directly). For the
 * standard f-zero variants (R1ak/R1/R2) the dimensionless cancellation ratio
 * `|f| / (|Σ₁| + |R₁|)` is used, matching the original minima semantics.
 */
function depthForVariant(
  variant: FVariant,
  yVal: number,
  leg1Mag: number,
  leg2Mag: number,
  phaseDev: number,
): number {
  const fam = fVariantParts(variant).family;
  if (fam === "legRatio" || fam === "legAngle" || fam === "legAngleOut") {
    return absFForVariant(variant, yVal, leg1Mag, leg2Mag, phaseDev);
  }
  const denom = leg1Mag + leg2Mag;
  return denom > 0 ? yVal / denom : NaN;
}

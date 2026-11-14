import { fScaledComponentsBatch, type FVariant } from "@/shared/math/zerosOfF";

/**
 * Two-track post-process to clean up a recorded scan:
 *
 *  • Multi-point clusters in (T-band × σ-segment) → keep the cluster's
 *    lowest-yVal point as-is.
 *  • Isolated points (singleton clusters) → assume they're a "near-miss" of a
 *    real zero (right T, slightly-off σ). Refine σ on a fine grid at the same
 *    T and replace the point with the refined one. Even if the refined yVal
 *    isn't tiny we still keep it — the user can drop low-quality points later
 *    via the Mag thresh slider.
 *
 * The algorithm is async-cooperative: yields to the event loop every few
 * hundred points so the UI can render incremental output.
 */

export interface CullParams {
  /** Max T-gap within a band (default 0.002). */
  tTol: number;
  /** Max σ-gap within a segment (default 0.10). */
  sigmaGap: number;
  /** σ-window half-width for isolated-point refinement (default 0.05). */
  refineDelta: number;
  /** Grid points across the refinement window (default 20). */
  refineSamples: number;
  variant: FVariant;
}

export interface CulledPoint {
  sigma: number;
  t: number;
  yVal: number;
  sigma1Mag: number;
  r1Mag: number;
  phaseDev: number;
}

export const DEFAULT_CULL_PARAMS: Omit<CullParams, "variant"> = {
  tTol: 0.002,
  sigmaGap: 0.10,
  refineDelta: 0.05,
  refineSamples: 20,
};

interface InputPoint {
  sigma: number;
  t: number;
  yVal: number;
  sigma1Mag: number;
  r1Mag: number;
  phaseDev: number;
}

const YIELD_EVERY = 256;

export async function cullAndRecover(
  points: readonly InputPoint[],
  params: CullParams,
  onPoint: (p: CulledPoint) => void,
  shouldCancel?: () => boolean,
): Promise<CulledPoint[]> {
  if (points.length === 0) return [];

  // Sort by T (then σ). Stable enough for grouping.
  const sorted = points.slice().sort((a, b) => a.t - b.t || a.sigma - b.sigma);

  const result: CulledPoint[] = [];
  let processed = 0;

  // Walk T-bands.
  let bandStart = 0;
  for (let i = 1; i <= sorted.length; i++) {
    const tBreak = i === sorted.length || sorted[i]!.t - sorted[i - 1]!.t > params.tTol;
    if (!tBreak) continue;

    // Band = sorted[bandStart .. i-1]. Sort by σ.
    const band = sorted.slice(bandStart, i).sort((a, b) => a.sigma - b.sigma);

    // Walk σ-segments inside the band.
    let segStart = 0;
    for (let j = 1; j <= band.length; j++) {
      const sBreak = j === band.length || band[j]!.sigma - band[j - 1]!.sigma > params.sigmaGap;
      if (!sBreak) continue;

      const segLen = j - segStart;
      let out: CulledPoint;
      if (segLen === 1) {
        out = refineIsolated(band[segStart]!, params);
      } else {
        let best = band[segStart]!;
        for (let k = segStart + 1; k < j; k++) {
          if (band[k]!.yVal < best.yVal) best = band[k]!;
        }
        out = { ...best };
      }
      result.push(out);
      onPoint(out);
      processed++;
      segStart = j;

      if (processed % YIELD_EVERY === 0) {
        if (shouldCancel?.()) return result;
        // eslint-disable-next-line no-await-in-loop -- intentional async yield
        await new Promise<void>((r) => setTimeout(r, 0));
      }
    }
    bandStart = i;
  }
  return result;
}

/** Hold T fixed, scan σ across `±refineDelta`, return the lowest-|f| point. */
function refineIsolated(p: InputPoint, params: CullParams): CulledPoint {
  const { refineDelta, refineSamples, variant } = params;
  const lo = p.sigma - refineDelta;
  const hi = p.sigma + refineDelta;
  // One vectorized batch over the σ window — but `fScaledComponentsBatch` is
  // per-σ, so loop. Each call is for a single t at a single σ; cheap.
  const tArr = Float64Array.of(p.t);
  let best: CulledPoint = { ...p };
  const N = Math.max(2, refineSamples);
  for (let i = 0; i < N; i++) {
    const sigma = lo + (i / (N - 1)) * (hi - lo);
    const b = fScaledComponentsBatch(sigma, tArr, variant);
    const y = b.yVal[0]!;
    if (y < best.yVal) {
      best = {
        sigma,
        t: p.t,
        yVal: y,
        sigma1Mag: b.sigma1Mag[0]!,
        r1Mag: b.r1Mag[0]!,
        phaseDev: b.phaseDev[0]!,
      };
    }
  }
  return best;
}

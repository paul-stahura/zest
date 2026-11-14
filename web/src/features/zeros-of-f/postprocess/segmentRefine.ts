import { fScaledAbs, type FVariant } from "@/shared/math/zerosOfF";
import type { SegmentPoint } from "./segmentPostProcess";

export interface SegmentRefineParams {
  nSamples: number;     // grid points around each candidate (default 10)
  sigmaDelta: number;   // half-width of sigma search window (default 0.1)
  variant: FVariant;
}

export interface RefinedPoint extends SegmentPoint {
  /** Original sigma before refinement. */
  origSigma: number;
}

/**
 * Refine a single segment point by evaluating `|f_scaled|` on a sigma grid
 * centered on `pt.sigma` at the same T, returning the sigma with the lowest value.
 */
export function refinePoint(
  pt: SegmentPoint,
  params: SegmentRefineParams,
): RefinedPoint {
  const { nSamples, sigmaDelta, variant } = params;
  const sigmaLo = pt.sigma - sigmaDelta;
  const sigmaHi = pt.sigma + sigmaDelta;

  let bestSigma = pt.sigma;
  let bestYVal = pt.yVal;

  // Evaluate at nSamples grid points across the sigma window
  const tArr = Float64Array.of(pt.t);
  for (let i = 0; i < nSamples; i++) {
    const frac = nSamples === 1 ? 0.5 : i / (nSamples - 1);
    const sigma = sigmaLo + frac * (sigmaHi - sigmaLo);
    const yVals = fScaledAbs(sigma, tArr, variant);
    if (yVals[0]! < bestYVal) {
      bestYVal = yVals[0]!;
      bestSigma = sigma;
    }
  }

  return {
    sigma: bestSigma,
    t: pt.t,
    yVal: bestYVal,
    origSigma: pt.sigma,
  };
}

/**
 * Refine a batch of segment points. Returns a promise so the caller can
 * yield to the event loop between chunks via `requestAnimationFrame`.
 *
 * @param points — segment representatives to refine.
 * @param params — refinement parameters.
 * @param onProgress — called after each point with `(done, total)`.
 * @param shouldCancel — checked before each point; return `true` to abort.
 * @returns the refined points (may be fewer than input if cancelled).
 */
export async function refineBatch(
  points: SegmentPoint[],
  params: SegmentRefineParams,
  onProgress?: (done: number, total: number) => void,
  shouldCancel?: () => boolean,
): Promise<RefinedPoint[]> {
  const results: RefinedPoint[] = [];
  const CHUNK_SIZE = 50;

  for (let i = 0; i < points.length; i++) {
    if (shouldCancel?.()) break;
    results.push(refinePoint(points[i]!, params));
    if ((i + 1) % CHUNK_SIZE === 0 || i === points.length - 1) {
      onProgress?.(i + 1, points.length);
      // Yield to event loop
      await new Promise<void>((resolve) => {
        if (typeof requestAnimationFrame !== "undefined") {
          requestAnimationFrame(() => resolve());
        } else {
          setTimeout(resolve, 0);
        }
      });
    }
  }
  return results;
}

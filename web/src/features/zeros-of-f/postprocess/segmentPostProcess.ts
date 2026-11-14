/**
 * Segment-based post-processing for recorded scan points. Replaces T-average
 * grouping with a more robust approach:
 *
 *  1. Sort points by (T, sigma).
 *  2. Find T-band breaks where consecutive T gap > `tTol`.
 *  3. Within each band, sort by sigma, split where sigma gap > `sigmaGap`.
 *  4. Each segment with >= `minPts` points contributes its lowest-yVal point.
 *
 * Returns the representative (lowest-yVal) point per qualifying segment.
 */

export interface SegmentPostProcessParams {
  tTol: number;      // max T-gap within a band (default 0.002)
  sigmaGap: number;  // max sigma-gap within a segment (default 0.10)
  minPts: number;    // minimum points per segment to contribute (default 1)
}

export interface SegmentPoint {
  sigma: number;
  t: number;
  yVal: number;
}

export const DEFAULT_SEGMENT_PARAMS: SegmentPostProcessParams = {
  tTol: 0.002,
  sigmaGap: 0.10,
  minPts: 1,
};

/**
 * Run segment post-processing on raw scatter data.
 *
 * @param iter — callback that yields `(sigma, t, yVal)` for each point in the scan.
 * @param params — segmentation parameters.
 * @returns representative points, one per qualifying segment.
 */
export function segmentPostProcess(
  iter: (cb: (sigma: number, t: number, yVal: number) => void) => void,
  params: SegmentPostProcessParams,
): SegmentPoint[] {
  // Collect all points
  const pts: SegmentPoint[] = [];
  iter((sigma, t, yVal) => {
    pts.push({ sigma, t, yVal });
  });
  if (pts.length === 0) return [];

  // Step 1: Sort by (T, sigma)
  pts.sort((a, b) => a.t - b.t || a.sigma - b.sigma);

  // Step 2: Split into T-bands
  const bands: SegmentPoint[][] = [];
  let currentBand: SegmentPoint[] = [pts[0]!];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i]!.t - pts[i - 1]!.t > params.tTol) {
      bands.push(currentBand);
      currentBand = [];
    }
    currentBand.push(pts[i]!);
  }
  bands.push(currentBand);

  // Step 3 + 4: Within each band, split by sigma gap, pick lowest-yVal per segment
  const result: SegmentPoint[] = [];
  for (const band of bands) {
    // Sort band by sigma
    band.sort((a, b) => a.sigma - b.sigma);

    let segStart = 0;
    for (let i = 1; i <= band.length; i++) {
      const isBreak = i === band.length || band[i]!.sigma - band[i - 1]!.sigma > params.sigmaGap;
      if (isBreak) {
        const segLen = i - segStart;
        if (segLen >= params.minPts) {
          // Find the point with lowest yVal in this segment
          let best = band[segStart]!;
          for (let j = segStart + 1; j < i; j++) {
            if (band[j]!.yVal < best.yVal) best = band[j]!;
          }
          result.push({ sigma: best.sigma, t: best.t, yVal: best.yVal });
        }
        segStart = i;
      }
    }
  }

  return result;
}

/** Axis-aligned extent of one harvest scatter (σ × spiral-index T). */
export type HarvestExtent = {
  sigmaMin: number;
  sigmaMax: number;
  tMin: number;
  tMax: number;
  count: number;
};

/**
 * Merge harvest strips so the camera can frame every loaded band. Empty
 * layers (count 0) are ignored so a missing overlay does not collapse the
 * window.
 */
export function unionHarvestExtents(
  extents: readonly HarvestExtent[],
): HarvestExtent | null {
  let sigmaMin = Infinity;
  let sigmaMax = -Infinity;
  let tMin = Infinity;
  let tMax = -Infinity;
  let count = 0;
  for (const extent of extents) {
    if (extent.count <= 0) continue;
    count += extent.count;
    if (extent.sigmaMin < sigmaMin) sigmaMin = extent.sigmaMin;
    if (extent.sigmaMax > sigmaMax) sigmaMax = extent.sigmaMax;
    if (extent.tMin < tMin) tMin = extent.tMin;
    if (extent.tMax > tMax) tMax = extent.tMax;
  }
  if (count <= 0) return null;
  return { sigmaMin, sigmaMax, tMin, tMax, count };
}

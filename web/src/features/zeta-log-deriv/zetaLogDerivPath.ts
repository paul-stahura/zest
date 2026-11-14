export type PlanePoint = {
  readonly x: number;
  readonly y: number;
};

/**
 * Segments per 0.01 of path length when ± is on. Plus-only uses half of
 * this, so the spacing along T is the same in both modes.
 */
const SEGMENTS_PER_HUNDREDTH_BOTH = 200;
/** A longer chord is a pole of ζ′/ζ, not a piece of the path. */
const PATH_MAX_JUMP = 4;

/** "plus" runs forward of T only. "both" runs the same length behind T as well. */
export type PathSide = "plus" | "both";

/**
 * How many straight pieces the path uses before pole breaks.
 * ± uses 200 segments per 0.01 of path length. Forward-only uses 100,
 * which keeps the same spacing along T.
 *
 * @param length - Path length in index units
 * @param side - Forward only, or both directions
 */
export function pathSegmentCount(length: number, side: PathSide): number {
  if (!(length > 0) || !Number.isFinite(length)) return 0;
  const perHundredth = side === "both" ? SEGMENTS_PER_HUNDREDTH_BOTH : SEGMENTS_PER_HUNDREDTH_BOTH / 2;
  return Math.max(1, Math.round(perHundredth * (length / 0.01)));
}

/**
 * Index samples of length `length` around T, clamped to [0, indexMax].
 * "both" is T − length through T + length. "plus" is T through T + length.
 *
 * @param center - Current index T
 * @param length - How far the path runs, in index units
 * @param indexMax - Workspace index clamp
 * @param side - Forward only, or both directions
 */
export function pathIndices(
  center: number,
  length: number,
  indexMax: number,
  side: PathSide,
): number[] {
  if (!(length > 0) || !Number.isFinite(center)) return [];
  const lo = side === "both" ? Math.max(0, center - length) : Math.max(0, center);
  const hi = Math.min(indexMax, center + length);
  if (!(hi > lo)) return [];
  const steps = pathSegmentCount(length, side);
  const out: number[] = [];
  for (let i = 0; i <= steps; i += 1) {
    out.push(lo + (hi - lo) * (i / steps));
  }
  return out;
}

/**
 * Break the path where a sample is missing or the step in the plane is a pole chord.
 *
 * @param samples - Plane points in index order; null is a gap
 * @param maxJump - Longest segment kept, in world units
 */
export function splitPath(
  samples: ReadonlyArray<PlanePoint | null>,
  maxJump: number = PATH_MAX_JUMP,
): PlanePoint[][] {
  const out: PlanePoint[][] = [];
  let run: PlanePoint[] = [];
  const flush = (): void => {
    if (run.length >= 2) out.push(run);
    run = [];
  };
  for (const sample of samples) {
    if (sample === null) {
      flush();
      continue;
    }
    const prev = run[run.length - 1];
    if (prev !== undefined && Math.hypot(sample.x - prev.x, sample.y - prev.y) > maxJump) {
      flush();
    }
    run.push(sample);
  }
  flush();
  return out;
}

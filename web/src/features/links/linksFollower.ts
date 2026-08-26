import type { Point2 } from "@/shared/io/types";

/**
 * Residual below this is treated as parallel: the product law is exact, and a closest-in-span
 * pick that lands on a few hundredths of a degree is still the copied chord to drawing precision.
 */
export const PARALLEL_EPS_DEG = 0.05;

/** Reverse link picked against the copied bisector chord, and whether the product law named it. */
export type FollowerPick = {
  link: number;
  angleDeg: number;
  exact: boolean;
};

/**
 * Reverse link j that is parallel to the copied bisector chord in frame k, or null.
 *
 * The copied-chord law is (k+1)(j+1) = ceil(T)^2. Forward link k carries summand k+1; the
 * reverse link carries j+1. That is the same pairing as the last-spiral follower on strip 0,
 * not a different construction per strip. A strip participates only when k+1 divides the square.
 *
 * `ceilT` is floor(T)+1, matching the rest of the Links tab (and the open unit of T). At an
 * integer T the frames have already handed off, so this is one more than mathematical ceil(T).
 *
 * @param k - Forward link whose frame the chord is copied into.
 * @param ceilT - floor(T)+1, the integer the product is taken against.
 * @returns Reverse link j, or null when k+1 does not divide ceil(T)^2.
 */
export function exactFollowerLink(k: number, ceilT: number): number | null {
  const n = k + 1;
  const square = ceilT * ceilT;
  if (n <= 0 || square % n !== 0) return null;
  return square / n - 1;
}

/**
 * Acute angle in degrees between two vectors. Parallel and anti-parallel both return 0, because
 * a reverse link of either orientation is the same slope as the copied chord.
 *
 * @returns NaN when either vector is degenerate.
 */
export function acuteAngleDeg(u: Point2, v: Point2): number {
  const un = Math.hypot(u.x, u.y);
  const vn = Math.hypot(v.x, v.y);
  if (un < 1e-15 || vn < 1e-15) return Number.NaN;
  const c = Math.abs((u.x * v.x + u.y * v.y) / (un * vn));
  return Math.acos(Math.min(1, c)) * (180 / Math.PI);
}

/**
 * Reverse link in this strip's span whose framed direction is closest to the copied chord.
 *
 * Used when k+1 does not divide ceil(T)^2: there is no exact follower in that frame, only a
 * nearest slope among the reverse links that already belong to the strip.
 *
 * @param framedDir - Link j to framed vector of joints j to j+1, or null if those joints are missing.
 */
export function closestSpanLink(
  spanFrom: number,
  spanTo: number,
  lastLink: number,
  framedDir: (link: number) => Point2 | null,
  chord: Point2,
): { link: number; angleDeg: number } | null {
  const lo = Math.max(0, spanFrom);
  const hi = Math.min(lastLink, spanTo);
  let bestLink: number | null = null;
  let bestAng = Number.POSITIVE_INFINITY;
  for (let j = lo; j <= hi; j++) {
    const vec = framedDir(j);
    if (vec === null) continue;
    const ang = acuteAngleDeg(vec, chord);
    if (Number.isNaN(ang) || ang >= bestAng) continue;
    bestAng = ang;
    bestLink = j;
  }
  if (bestLink === null) return null;
  return { link: bestLink, angleDeg: bestAng };
}

/**
 * Exact product-law follower when k+1 divides ceil(T)^2, otherwise the closest same-slope
 * reverse link in this strip's span. The exact pick may sit outside the span (strip 0's
 * follower is the last reverse link of the first turn).
 */
export function pickFollowerLink(
  k: number,
  ceilT: number,
  spanFrom: number,
  spanTo: number,
  lastLink: number,
  framedDir: (link: number) => Point2 | null,
  chord: Point2,
): FollowerPick | null {
  const exact = exactFollowerLink(k, ceilT);
  if (exact !== null) {
    const vec = framedDir(exact);
    const angleDeg = vec === null ? Number.NaN : acuteAngleDeg(vec, chord);
    return { link: exact, angleDeg, exact: true };
  }
  const closest = closestSpanLink(spanFrom, spanTo, lastLink, framedDir, chord);
  if (closest === null) return null;
  return { link: closest.link, angleDeg: closest.angleDeg, exact: false };
}

/**
 * Whether the residual angle should be drawn above the strip. Exact product-law followers are
 * parallel, so they stay unlabeled even when the numeric residual is a few ulps.
 */
export function followerAngleVisible(pick: FollowerPick): boolean {
  return !pick.exact && Number.isFinite(pick.angleDeg) && pick.angleDeg > PARALLEL_EPS_DEG;
}

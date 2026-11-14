import type { Point2 } from "@/shared/io/types";

const DEGENERATE_LINE = 1e-20;

/**
 * Foot of the perpendicular from `point` onto the line through the origin
 * and `linePoint`. Null when that line is degenerate (H ≈ 0).
 *
 * Used by the Hurwitz-machine “perp” overlay: segment (0,0)→H is the first
 * line; this foot is where the drop from ζ meets that line.
 */
export function footOnOriginLine(point: Point2, linePoint: Point2): Point2 | null {
  const denom = linePoint.x * linePoint.x + linePoint.y * linePoint.y;
  if (denom < DEGENERATE_LINE) return null;
  const scale = (point.x * linePoint.x + point.y * linePoint.y) / denom;
  return { x: scale * linePoint.x, y: scale * linePoint.y };
}

/**
 * Distance from `point` to the line through `linePoint/2` that is
 * perpendicular to `linePoint`. Null when `linePoint` is degenerate.
 *
 * Zero iff the drop from the point onto the origin–H line lands at H/2
 * (the q=2 χ=(−i,1) observation at σ=1/2).
 */
export function distanceToMidpointPerp(point: Point2, linePoint: Point2): number | null {
  const denom = linePoint.x * linePoint.x + linePoint.y * linePoint.y;
  if (denom < DEGENERATE_LINE) return null;
  const midX = linePoint.x / 2;
  const midY = linePoint.y / 2;
  return Math.abs((point.x - midX) * linePoint.x + (point.y - midY) * linePoint.y) / Math.sqrt(denom);
}

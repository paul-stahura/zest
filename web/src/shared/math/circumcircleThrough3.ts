import type { Point2 } from "@/shared/io/types";

export type Circumcircle = {
  center: Point2;
  r: number;
};

/**
 * Unique circle through three non-collinear points. Null when they are
 * collinear or a coordinate is non-finite — no unique finite circle.
 */
export function circumcircleThrough3(a: Point2, b: Point2, c: Point2): Circumcircle | null {
  if (
    !Number.isFinite(a.x) || !Number.isFinite(a.y)
    || !Number.isFinite(b.x) || !Number.isFinite(b.y)
    || !Number.isFinite(c.x) || !Number.isFinite(c.y)
  ) {
    return null;
  }
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-18) return null;
  const a2 = a.x * a.x + a.y * a.y;
  const b2 = b.x * b.x + b.y * b.y;
  const c2 = c.x * c.x + c.y * c.y;
  const cx = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
  const cy = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
  const r = Math.hypot(a.x - cx, a.y - cy);
  if (!(r > 1e-12) || !Number.isFinite(r)) return null;
  return { center: { x: cx, y: cy }, r };
}

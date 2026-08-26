import type { Point2 } from "@/shared/io/types";

/**
 * Maps a point into the frame of the link a→b: the similarity (p − a)/(b − a), which carries
 * a to 0, b to 1, and measures everything in units of that link's length. The real part runs
 * along the link and the imaginary part across it.
 *
 * Returns null for a degenerate link, which cannot define a frame.
 */
export function toLinkFrame(p: Point2, a: Point2, b: Point2): Point2 | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const den = dx * dx + dy * dy;
  if (den < 1e-300) return null;
  const rx = p.x - a.x;
  const ry = p.y - a.y;
  return { x: (rx * dx + ry * dy) / den, y: (ry * dx - rx * dy) / den };
}

/**
 * Evenly spaced indices covering [from, to], at most `budget` of them, always including both
 * ends and every index of `keep` that falls inside. Thinning keeps the drawing cost tied to
 * the pixels a slot occupies rather than to the length of the chain.
 */
export function thinRange(from: number, to: number, budget: number, keep: number[]): number[] {
  if (to < from) return [];
  const span = to - from;
  if (span + 1 <= budget) return Array.from({ length: span + 1 }, (_, i) => from + i);
  const wanted = new Set<number>([from, to]);
  for (const k of keep) {
    if (k >= from && k <= to) wanted.add(k);
  }
  const step = span / Math.max(1, budget - 1);
  for (let i = 0; i < budget; i++) {
    wanted.add(Math.min(to, from + Math.round(i * step)));
  }
  return [...wanted].sort((p, q) => p - q);
}

/** Polyline vertices a whole frame may draw, split evenly across its strips. */
const POINTS_PER_FRAME = 120_000;
/** Vertices a strip keeps however many strips share the frame. */
const MIN_CHAIN_POINTS = 128;

/**
 * Vertices one strip may spend on a chain. Drawing every joint costs ⌊T⌋ strips × 2T(T+1)
 * joints, so beyond T ≈ 38 something has to give; below that a strip draws its chains whole and
 * the links keep their true lengths.
 *
 * Like {@link sampledLinkNumbers} the budget must not follow the row zoom. Were it to, thinning
 * would keep a different set of joints at every zoom step, so the chains would visibly shift as
 * the row was magnified rather than simply growing.
 */
export function chainPointBudget(stripCount: number): number {
  return Math.max(MIN_CHAIN_POINTS, Math.floor(POINTS_PER_FRAME / Math.max(1, stripCount)));
}

/**
 * The links that get a strip, 0 … m, thinned to `maxSlots` when there are more links than the
 * canvas can show, always keeping link 0 on the left and the bisector link m on the right.
 *
 * The budget must come from the canvas rather than the zoomed row width: were it to grow with
 * the zoom, the sampled set would change under the cursor while the slots stayed pinned at
 * their minimum width, so zooming would swap links in and out instead of magnifying them.
 */
export function sampledLinkNumbers(m: number, maxSlots: number): number[] {
  const count = m + 1;
  const slots = Math.max(2, Math.floor(maxSlots));
  if (count <= slots) return Array.from({ length: count }, (_, i) => i);
  const out: number[] = [];
  for (let i = 0; i < slots; i++) {
    out.push(Math.round((i * m) / (slots - 1)));
  }
  return out;
}

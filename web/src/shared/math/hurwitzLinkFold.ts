/**
 * Geometry of a consecutive-link fold, used to decide whether a bisector
 * handoff is the fold-back / fold-out event rather than a wild jump.
 */

export const HURWITZ_NEAR_ORIGIN = 0.05;

const FOLD_COS = 0.97;
const OVERLAP_REL = 0.08;
const JOINT_ON_PERP = 0.04;
const INTERIOR_MARGIN = 0.02;

/** How far past a segment end a fold-adjacent link may still host b. */
export const FOLD_EXT_FRAC = 0.12;
/** Fold-back kiss: both line-hits sit this close to the shared joint. */
export const FOLD_KISS_FRAC = 0.02;

export type Xy = { x: number; y: number };

export type LinkFoldKind = "back" | "out" | "bent";

export type FoldHandoffKind = "fold-back" | "fold-out";

/**
 * |H| below this makes the H/2 perpendicular spin with tiny H motion.
 */
export function isHurwitzNearOrigin(h: Xy, minAbs: number = HURWITZ_NEAR_ORIGIN): boolean {
  return Math.hypot(h.x, h.y) < minAbs;
}

function signedSide(p: Xy, hx: number, hy: number): number {
  return (p.x - hx / 2) * hx + (p.y - hy / 2) * hy;
}

/**
 * Distance from p to the H/2 perpendicular line.
 */
export function midPerpDistance(p: Xy, h: Xy): number {
  const abs = Math.hypot(h.x, h.y);
  if (abs < 1e-18) return Number.POSITIVE_INFINITY;
  return Math.abs(signedSide(p, h.x, h.y)) / abs;
}

function distPointSeg(p: Xy, a: Xy, b: Xy): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy;
  if (len2 < 1e-24) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.min(1, Math.max(0, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2));
  return Math.hypot(p.x - a.x - t * vx, p.y - a.y - t * vy);
}

function segmentsOverlap(a: Xy, b: Xy, c: Xy): boolean {
  const lab = Math.hypot(b.x - a.x, b.y - a.y);
  const lbc = Math.hypot(c.x - b.x, c.y - b.y);
  const scale = Math.max(lab, lbc, 1e-12);
  const tol = OVERLAP_REL * scale;
  return distPointSeg(c, a, b) < tol || distPointSeg(a, b, c) < tol;
}

/**
 * Fold at the shared joint of two consecutive links.
 *
 * back: the two links are antiparallel and stacked.
 * out: they are collinear and continue the same way (no overlap).
 */
function pairCos(prev: Xy, joint: Xy, next: Xy): number | null {
  const vx = joint.x - prev.x;
  const vy = joint.y - prev.y;
  const wx = next.x - joint.x;
  const wy = next.y - joint.y;
  const lv = Math.hypot(vx, vy);
  const lw = Math.hypot(wx, wy);
  if (lv < 1e-14 || lw < 1e-14) return null;
  return (vx * wx + vy * wy) / (lv * lw);
}

export function classifyLinkFold(prev: Xy, joint: Xy, next: Xy): LinkFoldKind {
  const cos = pairCos(prev, joint, next);
  if (cos === null) return "bent";
  if (cos < -FOLD_COS && segmentsOverlap(prev, joint, next)) return "back";
  if (cos > FOLD_COS && !segmentsOverlap(prev, joint, next)) return "out";
  return "bent";
}

/**
 * Fold-back / fold-out, or the same geometry before the overlap test
 * locks. Used only to decide whether a mid-perp miss just past a joint
 * still counts as a host.
 */
export function pairAllowsFoldExtend(prev: Xy, joint: Xy, next: Xy): boolean {
  const kind = classifyLinkFold(prev, joint, next);
  return kind === "back" || kind === "out";
}

/**
 * Link k may claim a mid-perp hit slightly past either end when that
 * end is a fold (or nearly a fold) with its neighbor.
 */
export function linkAllowsFoldExtend(joints: readonly Xy[], k: number): boolean {
  const a = joints[k];
  const b = joints[k + 1];
  if (a === undefined || b === undefined) return false;
  const before = joints[k - 1];
  const after = joints[k + 2];
  if (before !== undefined && pairAllowsFoldExtend(before, a, b)) return true;
  if (after !== undefined && pairAllowsFoldExtend(a, b, after)) return true;
  return false;
}

function outsidePastJoint(frac: number): number {
  if (frac > 1) return frac - 1;
  if (frac < 0) return -frac;
  return 0;
}

/**
 * Among a folded pair {k, k+1}, step to k+1 at the fold event: the
 * new link has entered the segment, or both hits sit just past the
 * shared joint (the kiss at T=10.723955 on q=2, 15°).
 */
export function foldPairShouldStep(
  joints: readonly Xy[],
  fromLink: number,
  oldFrac: number,
  newFrac: number,
): boolean {
  const prev = joints[fromLink];
  const joint = joints[fromLink + 1];
  const next = joints[fromLink + 2];
  if (prev === undefined || joint === undefined || next === undefined) return false;
  if (!pairAllowsFoldExtend(prev, joint, next)) return false;
  const oldStrict = oldFrac >= 0 && oldFrac <= 1;
  const newStrict = newFrac >= 0 && newFrac <= 1;
  if (newStrict && !oldStrict) return true;
  if (oldStrict) return false;
  return Math.max(outsidePastJoint(oldFrac), outsidePastJoint(newFrac)) <= FOLD_KISS_FRAC;
}

/**
 * Mid-perp crosses the open segment, not a joint.
 */
export function midPerpHitsLinkInterior(a: Xy, b: Xy, h: Xy): boolean {
  const fa = signedSide(a, h.x, h.y);
  const fb = signedSide(b, h.x, h.y);
  if (fa * fb > 1e-9) return false;
  const denom = fa - fb;
  const frac = Math.abs(denom) < 1e-18 ? 0 : fa / denom;
  return frac > INTERIOR_MARGIN && frac < 1 - INTERIOR_MARGIN;
}

/**
 * Shared joint of links fromLink and toLink lies on the mid-perp.
 */
export function midPerpHitsJoint(joint: Xy, h: Xy): boolean {
  const scale = Math.max(Math.hypot(h.x, h.y), 1e-12);
  return midPerpDistance(joint, h) < JOINT_ON_PERP * scale;
}

/**
 * Whether a ±1 link change matches a fold-back (perp through the dying
 * link interior) or a fold-out (perp through the shared joint).
 */
export function foldHandoffKind(
  joints: readonly Xy[],
  h: Xy,
  fromLink: number,
  toLink: number,
): FoldHandoffKind | null {
  if (Math.abs(toLink - fromLink) !== 1) return null;
  const shared = Math.max(fromLink, toLink);
  const prev = joints[shared - 1];
  const joint = joints[shared];
  const next = joints[shared + 1];
  if (prev === undefined || joint === undefined || next === undefined) return null;
  const fold = classifyLinkFold(prev, joint, next);
  const dyingA = joints[fromLink];
  const dyingB = joints[fromLink + 1];
  if (dyingA === undefined || dyingB === undefined) return null;
  if (fold === "back" && midPerpHitsLinkInterior(dyingA, dyingB, h)) return "fold-back";
  if (fold === "out" && midPerpHitsJoint(joint, h)) return "fold-out";
  return null;
}

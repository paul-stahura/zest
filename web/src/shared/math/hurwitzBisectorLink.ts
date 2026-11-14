import {
  FOLD_EXT_FRAC,
  foldPairShouldStep,
  linkAllowsFoldExtend,
} from "@/shared/math/hurwitzLinkFold";

/**
 * Cold-start guess for the continuous bisector-link index.
 *
 * For zeta (q=1) this is T. For a period-q table it stretches by √q,
 * with the half-link shift that keeps q=1 exact:
 *   ν(T) = √q (T + 1/2) − 1/2.
 *
 * Harvest at q=2, χ=(−i,1), T∈[3,14]: the tracked triple never skips
 * (only k→k+1), handoffs every ≈1/√2 in T. floor(ν) is one ahead only
 * while the old link still hosts a triple (frac→1).
 */
export function hurwitzBisectorLinkIndex(index: number, period: number): number {
  const q = period > 0 ? period : 1;
  const root = Math.sqrt(q);
  return root * (index + 0.5) - 0.5;
}

/**
 * Integer seed {@link hurwitzBisectorLinkIndex} for a cold start.
 */
export function hurwitzBisectorLinkNumber(index: number, period: number): number {
  return Math.floor(hurwitzBisectorLinkIndex(index, period));
}

export type HurwitzBisectorCrossing = {
  link: number;
  frac: number;
  point: { x: number; y: number };
  /** True when the hit is past a fold-adjacent end, not inside the segment. */
  extended?: boolean;
};

export type HurwitzBisectorLocateOpts = {
  /** Link that held the point at a nearby T. Kept if it is still a triple. */
  preferLink?: number;
  /** Reverse chain (forward flipped). Required for a true triple. */
  reverseJoints?: readonly { x: number; y: number }[];
  /** Last-resort tie-break among leftover hits (usually ζ). */
  nearest?: { x: number; y: number };
  /**
   * T is increasing: never step to prefer−1. If the old link is gone
   * and prefer+1 is not a triple, return null (do not walk down).
   */
  onlyPlus?: boolean;
};

const CROSS_EPS = 1e-9;
const ON_SEG_EPS = 1e-7;

function signedSide(
  p: { x: number; y: number },
  hx: number,
  hy: number,
): number {
  return (p.x - hx / 2) * hx + (p.y - hy / 2) * hy;
}

function segmentCrossesMidPerp(
  a: { x: number; y: number },
  b: { x: number; y: number },
  hx: number,
  hy: number,
  fracLo = 0,
  fracHi = 1,
): { frac: number; point: { x: number; y: number } } | null {
  const fa = signedSide(a, hx, hy);
  const fb = signedSide(b, hx, hy);
  if (fa * fb > CROSS_EPS && (fracLo >= 0 && fracHi <= 1)) return null;
  const denom = fa - fb;
  const frac = Math.abs(denom) < 1e-18 ? 0 : fa / denom;
  if (frac < fracLo - CROSS_EPS || frac > fracHi + CROSS_EPS) return null;
  return {
    frac,
    point: { x: a.x + frac * (b.x - a.x), y: a.y + frac * (b.y - a.y) },
  };
}

function pointOnSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): boolean {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = p.x - a.x;
  const wy = p.y - a.y;
  const len2 = vx * vx + vy * vy;
  if (len2 < 1e-24) return Math.hypot(wx, wy) < ON_SEG_EPS;
  const t = (wx * vx + wy * vy) / len2;
  if (t < -ON_SEG_EPS || t > 1 + ON_SEG_EPS) return false;
  const px = a.x + t * vx;
  const py = a.y + t * vy;
  return Math.hypot(p.x - px, p.y - py) < ON_SEG_EPS * (1 + Math.sqrt(len2));
}

function distPointSeg(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy;
  if (len2 < 1e-24) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.min(1, Math.max(0, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2));
  return Math.hypot(p.x - a.x - t * vx, p.y - a.y - t * vy);
}

function reverseContains(
  point: { x: number; y: number },
  reverse: readonly { x: number; y: number }[],
  nearTol = 0,
): boolean {
  for (let k = 0; k < reverse.length - 1; k++) {
    const a = reverse[k];
    const b = reverse[k + 1];
    if (a === undefined || b === undefined) continue;
    if (pointOnSegment(point, a, b)) return true;
    if (nearTol > 0 && distPointSeg(point, a, b) < nearTol) return true;
  }
  return false;
}

/**
 * Every forward-link ∩ H/2-perp crossing. A fold-adjacent link may
 * host a hit a little past either end. When reverse joints are given,
 * keep only those that also lie on (or next to) a reverse link.
 */
export function listHurwitzTripleCrossings(
  joints: readonly { x: number; y: number }[],
  hurwitz: { x: number; y: number },
  reverseJoints?: readonly { x: number; y: number }[],
): HurwitzBisectorCrossing[] {
  const hx = hurwitz.x;
  const hy = hurwitz.y;
  if (!(hx * hx + hy * hy > 1e-20) || joints.length < 2) return [];
  const hits: HurwitzBisectorCrossing[] = [];
  const absH = Math.hypot(hx, hy);
  for (let k = 0; k < joints.length - 1; k++) {
    const a = joints[k];
    const b = joints[k + 1];
    if (a === undefined || b === undefined) continue;
    const foldExt = linkAllowsFoldExtend(joints, k);
    const lo = foldExt ? -FOLD_EXT_FRAC : 0;
    const hi = foldExt ? 1 + FOLD_EXT_FRAC : 1;
    const hit = segmentCrossesMidPerp(a, b, hx, hy, lo, hi);
    if (hit === null) continue;
    const extended = hit.frac < -CROSS_EPS || hit.frac > 1 + CROSS_EPS;
    const nearTol = extended ? Math.max(0.02, 0.02 * absH) : 0;
    if (reverseJoints !== undefined && !reverseContains(hit.point, reverseJoints, nearTol)) continue;
    hits.push({ link: k, frac: hit.frac, point: hit.point, extended });
  }
  return hits;
}

function closestToLink(
  hits: readonly HurwitzBisectorCrossing[],
  link: number,
): HurwitzBisectorCrossing | null {
  let best: HurwitzBisectorCrossing | null = null;
  let bestD = Infinity;
  for (const h of hits) {
    const d = Math.abs(h.link - link);
    if (d < bestD) {
      best = h;
      bestD = d;
    }
  }
  return best;
}

function closestToPoint(
  hits: readonly HurwitzBisectorCrossing[],
  p: { x: number; y: number },
): HurwitzBisectorCrossing | null {
  let best: HurwitzBisectorCrossing | null = null;
  let bestD = Infinity;
  for (const h of hits) {
    const d = Math.hypot(h.point.x - p.x, h.point.y - p.y);
    if (d < bestD) {
      best = h;
      bestD = d;
    }
  }
  return best;
}

/**
 * The bisector point: a triple intersection of a forward link, a
 * reverse link, and the H/2 perpendicular.
 *
 * Several links can host a triple at once. Keep the link that held
 * the point at a nearby T; if that link no longer hosts one, take
 * the neighbor +1 when T is rising ({@link HurwitzBisectorLocateOpts.onlyPlus}),
 * else ±1. A cold start uses the ν-seed {@link hurwitzBisectorLinkNumber}.
 */
export function locateHurwitzBisectorCrossing(
  joints: readonly { x: number; y: number }[],
  hurwitz: { x: number; y: number },
  guessedLink: number,
  opts?: HurwitzBisectorLocateOpts,
): HurwitzBisectorCrossing | null {
  const hits = listHurwitzTripleCrossings(joints, hurwitz, opts?.reverseJoints);
  if (hits.length === 0) return null;
  const prefer = opts?.preferLink;
  if (prefer !== undefined) {
    const kept = hits.find(h => h.link === prefer);
    const plus = hits.find(h => h.link === prefer + 1);
    if (
      kept !== undefined
      && plus !== undefined
      && foldPairShouldStep(joints, prefer, kept.frac, plus.frac)
    ) {
      return plus;
    }
    if (kept !== undefined) return kept;
    if (opts?.onlyPlus === true) {
      return plus ?? null;
    }
    const minus = hits.find(h => h.link === prefer - 1);
    if (plus !== undefined && minus === undefined) return plus;
    if (minus !== undefined && plus === undefined) return minus;
    if (plus !== undefined && minus !== undefined) {
      return guessedLink >= prefer ? plus : minus;
    }
    return closestToLink(hits, prefer);
  }
  const seeded = hits.find(h => h.link === guessedLink)
    ?? hits.find(h => h.link === guessedLink + 1)
    ?? hits.find(h => h.link === guessedLink - 1);
  if (seeded !== undefined) return seeded;
  const nearest = opts?.nearest;
  if (nearest !== undefined) return closestToPoint(hits, nearest);
  return closestToLink(hits, guessedLink);
}

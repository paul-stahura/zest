import type { Point2 } from "@/shared/io/types";
import { chiBrian } from "@/shared/math/zakCalculator";
import { indexToImag, spiralMiddleIndex } from "@/shared/math/zetaEms";

export type Chain = {
  /** Joints 0 … lastLink, so link j is the segment from joints[j−1] to joints[j]. */
  joints: Point2[];
  /** Last link walked, and the last one the first spiral turn holds; they differ when the cap bites. */
  lastLink: number;
  lastAvailableLink: number;
};

/** Last link of the first spiral turn, the same bound the main tab draws to. */
export function lastSpiralLink(index: number): number {
  return Math.max(1, Math.floor(spiralMiddleIndex(index, 0)) + 1);
}

/** The forward chain Σ n^(−s), joints 0 … min(cap, end of turn). */
export function forwardChain(sigma: number, index: number, usePolyImag: boolean, maxLinks: number): Chain {
  const t = indexToImag(index, usePolyImag);
  const lastAvailableLink = lastSpiralLink(index);
  const lastLink = Math.min(lastAvailableLink, Math.max(1, maxLinks));
  const joints: Point2[] = [{ x: 0, y: 0 }];
  let x = 0;
  let y = 0;
  for (let n = 1; n <= lastLink; n++) {
    const angle = t * Math.log(n);
    const r = Math.pow(n, -sigma);
    x += r * Math.cos(angle);
    y -= r * Math.sin(angle);
    joints.push({ x, y });
  }
  return { joints, lastLink, lastAvailableLink };
}

/**
 * The inverse spiral χ(s)·Σ n^(s−1), reflected through ζ/2 (p ↦ ζ − p, matching the Main tab's
 * Inverse+Reflect), joints 0 … min(cap, end of turn). Joint ⌊T⌋ of it is Σ₁+R.
 */
export function reflectedInverseChain(
  sigma: number,
  index: number,
  usePolyImag: boolean,
  zeta: Point2,
  maxLinks: number,
): Chain {
  const t = indexToImag(index, usePolyImag);
  const chi = chiBrian({ re: sigma, im: t });
  const lastAvailableLink = lastSpiralLink(index);
  const lastLink = Math.min(lastAvailableLink, Math.max(1, maxLinks));
  const joints: Point2[] = [{ x: zeta.x, y: zeta.y }];
  let re = 0;
  let im = 0;
  for (let n = 1; n <= lastLink; n++) {
    // n^(s−1) = n^(σ−1)·e^(i·t·ln n), the term computeInverseSpiralGeometry accumulates.
    const angle = t * Math.log(n);
    const r = Math.pow(n, sigma - 1);
    re += r * Math.cos(angle);
    im += r * Math.sin(angle);
    joints.push({
      x: zeta.x - (re * chi.re - im * chi.im),
      y: zeta.y - (re * chi.im + im * chi.re),
    });
  }
  return { joints, lastLink, lastAvailableLink };
}

/**
 * The inverse spiral χ(s)·Σ n^(s−1) from the origin, joints 0 … min(cap, end of turn).
 * Joint ⌊T⌋ is Σ₂; the next remainder R_{2ps} takes it to B₂.
 */
export function inverseChain(
  sigma: number,
  index: number,
  usePolyImag: boolean,
  maxLinks: number,
): Chain {
  const t = indexToImag(index, usePolyImag);
  const chi = chiBrian({ re: sigma, im: t });
  const lastAvailableLink = lastSpiralLink(index);
  const lastLink = Math.min(lastAvailableLink, Math.max(1, maxLinks));
  const joints: Point2[] = [{ x: 0, y: 0 }];
  let re = 0;
  let im = 0;
  for (let n = 1; n <= lastLink; n++) {
    const angle = t * Math.log(n);
    const r = Math.pow(n, sigma - 1);
    re += r * Math.cos(angle);
    im += r * Math.sin(angle);
    joints.push({
      x: re * chi.re - im * chi.im,
      y: re * chi.im + im * chi.re,
    });
  }
  return { joints, lastLink, lastAvailableLink };
}

/**
 * Where the forward chain meets the mirror line, as a chain parameter r* (link number plus the
 * crossing fraction along that link).
 *
 * Rotating the plane by ϑ, where χ = e^(−2iϑ), puts ζ on the real axis at Z, and on σ = ½ the
 * reflected inverse chain is then the forward chain mirrored in the vertical line X = Z/2. The
 * meeting falls inside the bisector link, and the crossing fraction along that link is the
 * normalized weight ⌈T⌉^σ d₁, so the point is the bisector point. Off the critical line the
 * reflection is no longer an isometry and r* is only an approximation of where the chains pair up.
 */
export function mirrorCutParameter(
  sigma: number,
  index: number,
  usePolyImag: boolean,
  zeta: Point2,
  joints: Point2[],
  m: number,
): number | null {
  const t = indexToImag(index, usePolyImag);
  const chi = chiBrian({ re: sigma, im: t });
  const theta = -Math.atan2(chi.im, chi.re) / 2;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  /** Abscissa in the rotated frame, the coordinate the mirror line is level in. */
  const axis = (p: Point2): number => cos * p.x - sin * p.y;
  const a = joints[m];
  const b = joints[m + 1];
  if (a === undefined || b === undefined) return null;
  const rise = axis(b) - axis(a);
  if (Math.abs(rise) < 1e-12) return null;
  return m + (axis(zeta) / 2 - axis(a)) / rise;
}

/** Where segments a→b and c→d cross, with the fraction along each, or null when they miss. */
export function segmentCrossing(
  a: Point2,
  b: Point2,
  c: Point2,
  d: Point2,
): { at: Point2; p: number; q: number } | null {
  const bx = b.x - a.x;
  const by = b.y - a.y;
  const dx = d.x - c.x;
  const dy = d.y - c.y;
  const den = bx * dy - by * dx;
  if (den === 0) return null;
  const cax = c.x - a.x;
  const cay = c.y - a.y;
  const p = (cax * dy - cay * dx) / den;
  const q = (cax * by - cay * bx) / den;
  if (p < 0 || p > 1 || q < 0 || q > 1) return null;
  return { at: { x: a.x + p * bx, y: a.y + p * by }, p, q };
}

/**
 * a² = I(T)/2π, the scale the crossing law pairs links about, exactly the Riemann–Siegel
 * cutoff squared. Its square root is the self-dual summand, the one the fold sits on, a real
 * height rather than a link number: a = T + ½ − 1/24T + O(T⁻²), so it lies half a link past
 * the bisector link ⌊T⌋ and slides on through the unit interval.
 */
export function crossingScale(index: number, usePolyImag: boolean): number {
  return indexToImag(index, usePolyImag) / (2 * Math.PI);
}

/**
 * The named integer of the product law: j₀ = [a²/(k+1)] − 1, counting links from zero so
 * that forward link k carries summand n = k+1. This is the real pairing n n′ = a² read out
 * to the nearest reverse-link index; the two half-integer families where that rounding
 * misses are what {@link crossingLink} then corrects.
 */
export function namedCrossingLink(scale: number, k: number): number {
  return Math.round(scale / (k + 1)) - 1;
}

/**
 * The one inverse link that crosses forward link k, with the crossing point.
 *
 * Counting links from 1 (link k carries the summand n = k+1), the crossing pairs are the ones
 * whose indices multiply to a²: n·n′ = I(T)/2π. The reason is that the chain runs fast where
 * its per-link turn angle I(T)/n′ is a multiple of 2π and folds where it is an odd multiple of
 * π, so the tail breaks into sweeps, one per turn, and the c-th sweep — sitting at n′ ≈ a²/c —
 * is the saddle point contribution carrying the length and the conjugate phase of the c-th
 * summand. Mirrored, it lands on the head's own link c, and crosses it near its midpoint.
 *
 * Nearest-integer of that product misses at two families of half-integers. Siegel's cutoff a
 * sits half a link past T, so a²/(m+1) is near a half-integer when T is near an integer and
 * the named link is m∓1 at the ends of the unit, while the mirror pins the two bisector links
 * to each other at every height. The other family is the joints of the hyperbola itself: when
 * {a²/n} ≈ ½ the geometric crossing has already moved to the lower neighbour. The rule that
 * names the reverse link integer is therefore the bisector link when k is the bisector, the named
 * link when that segment crosses, and the lower neighbour otherwise. When nothing in reach
 * crosses, the named link is returned without a point.
 *
 * @param bisector - ⌊T⌋, the self-paired strip. Omit to skip the pin and use only the product
 *   name, which is a second crossing of the bisector link near the ends of the unit.
 */
export function crossingLink(
  fwd: Chain,
  inv: Chain,
  k: number,
  scale: number,
  bisector: number | null = null,
): { link: number; at: Point2 | null } | null {
  const a = fwd.joints[k];
  const b = fwd.joints[k + 1];
  if (a === undefined || b === undefined) return null;

  const hitOn = (j: number): { link: number; at: Point2 } | null => {
    const c = inv.joints[j];
    const d = inv.joints[j + 1];
    if (c === undefined || d === undefined) return null;
    const hit = segmentCrossing(a, b, c, d);
    return hit === null ? null : { link: j, at: hit.at };
  };

  if (k === bisector) {
    const pinned = hitOn(k);
    if (pinned !== null) return pinned;
  }

  const named = namedCrossingLink(scale, k);
  return hitOn(named) ?? hitOn(named - 1) ?? (
    inv.joints[named] !== undefined && inv.joints[named + 1] !== undefined
      ? { link: named, at: null }
      : null
  );
}

/**
 * Band edge of the span ladder: the joint where the inverse chain's per-link turn angle is
 * a·π, i.e. L_N(T, S) = I(T)/(π(2S+1)) with the odd ladder 2S+1 replaced by a.
 */
function spanEdge(t: number, a: number): number {
  return a <= 0 ? Infinity : t / (Math.PI * a);
}

/**
 * Inclusive inverse-link numbers drawn in the strip of forward link k, one turn of the inverse
 * spiral. Link i is joints[i] → joints[i+1]; stroke through {@link jointsForLinkRange} or the
 * last named link is dropped. Turns are measured by a = (I(T)/π)/n, the per-link turn angle
 * in units of π.
 *
 * The plain fold ladder a = 1, 3, 5, … is a half turn out of phase with the links near the
 * bisector, where one link is already worth a full turn: at T = 6 the fold a = 13 falls inside
 * link 6, so that band holds no whole link and the bisector strip draws nothing. So the ladder
 * is anchored on the bisector joint instead, a₀ = (I(T)/π)/(⌊T⌋+1), and stretched by
 * Δ = (a₀−1)/⌊T⌋ so its outer end still lands on the fold a = 1. The bisector strip is then
 * exactly its own link and the leftmost strip still ends on the last link of the turn; Δ → 2 as
 * T grows, so at high T this is the fold ladder to within O(1/T).
 */
export function spanLinkRange(
  index: number,
  usePolyImag: boolean,
  k: number,
  m: number,
): { from: number; to: number } {
  const t = indexToImag(index, usePolyImag);
  const a0 = t / (Math.PI * (m + 1));
  const step = (a0 - 1) / Math.max(1, m);
  const j = m - k;
  const from = Math.round(spanEdge(t, a0 - (j - 1) * step));
  const to = Math.round(spanEdge(t, a0 - j * step));
  return { from, to };
}

/**
 * Inclusive link numbers → joint indices for a polyline. Link i is joints[i] → joints[i+1],
 * so the band from…to has to include joint to+1 or the last named link is never stroked.
 */
export function jointsForLinkRange(from: number, to: number): { from: number; to: number } {
  if (to < from) return { from, to };
  return { from, to: to + 1 };
}

import type { Point2 } from "@/shared/io/types";
import { indexToImag, spiralMiddleIndex } from "@/shared/math/zetaEms";
import { i1Scaled } from "@/shared/math/zerosOfF/i1Scaled";
import { r1Scaled } from "@/shared/math/zerosOfF/r1Scaled";

/**
 * Joints of Σ₁ = Σ_{n=1}^{⌊T⌋} n^{−s} from the origin. Same terms as
 * {@link calcForwardSum}; the last joint is that partial sum.
 */
export function computeForwardSumJoints(sigma: number, index: number): Point2[] {
  const t = indexToImag(index, false);
  const floorN = Math.floor(index);
  const joints: Point2[] = [{ x: 0, y: 0 }];
  let re = 0;
  let im = 0;
  for (let n = 1; n <= floorN; n++) {
    const angle = t * Math.log(n);
    const denom = Math.pow(n, sigma);
    re += Math.cos(angle) / denom;
    im -= Math.sin(angle) / denom;
    joints.push({ x: re, y: im });
  }
  return joints;
}

/**
 * One Dirichlet term in T^σ units: (n/T)^{-σ} e^{-i I(T) log n}.
 * Each magnitude is (n/T)^{|σ|} when σ<0 and n≤T, so the walk stays in float64.
 */
function scaledDirichletTerm(n: number, sigma: number, imag: number, logT: number): Point2 {
  const lnN = Math.log(n);
  const mag = Math.exp(-sigma * (lnN - logT));
  const phase = -imag * lnN;
  return { x: mag * Math.cos(phase), y: mag * Math.sin(phase) };
}

/**
 * Σ₁ joints in T^σ coordinates. Same shape as {@link computeForwardSumJoints},
 * times T^σ, so large negative σ does not overflow.
 */
export function computeScaledForwardSumJoints(sigma: number, index: number): Point2[] {
  const t = indexToImag(index, false);
  const floorN = Math.floor(index);
  const logT = Math.log(Math.max(index, 1e-15));
  const joints: Point2[] = [{ x: 0, y: 0 }];
  let re = 0;
  let im = 0;
  for (let n = 1; n <= floorN; n++) {
    const term = scaledDirichletTerm(n, sigma, t, logT);
    re += term.x;
    im += term.y;
    joints.push({ x: re, y: im });
  }
  return joints;
}

/**
 * EMS “all” Dirichlet joints in the same T^σ units as Σ₁ / R_{1ak}.
 */
export function computeScaledEntireJoints(sigma: number, index: number): Point2[] {
  const t = indexToImag(index, false);
  const logT = Math.log(Math.max(index, 1e-15));
  const numLinks = Math.floor(spiralMiddleIndex(index, 0)) + 2;
  const joints: Point2[] = [{ x: 0, y: 0 }];
  let re = 0;
  let im = 0;
  for (let n = 1; n < numLinks; n++) {
    const term = scaledDirichletTerm(n, sigma, t, logT);
    re += term.x;
    im += term.y;
    joints.push({ x: re, y: im });
  }
  return joints;
}

/**
 * T^σ · R_{1ak} = −½ (−1)^{⌊T⌋} (T^σ I₁), via {@link i1Scaled}.
 */
export function computeScaledRak1(sigma: number, index: number): Point2 {
  const T = Math.max(index, 1e-15);
  const i1 = i1Scaled(sigma, new Float64Array([T]));
  const sign = Math.floor(index) % 2 === 0 ? 1 : -1;
  return { x: -0.5 * sign * i1[0]!, y: -0.5 * sign * i1[1]! };
}

/**
 * T^σ · R_{1ps}, the trigonometric split of the full remainder.
 * Same units as {@link computeScaledRak1}, via {@link r1Scaled}.
 */
export function computeScaledRps1(sigma: number, index: number): Point2 {
  const T = Math.max(index, 1e-15);
  const r1 = r1Scaled(sigma, new Float64Array([T]));
  return { x: r1[0]!, y: r1[1]! };
}

export type BigSigmaChainExtent = "entire" | "floorT";

/** Which remainder the white link hangs off Σ₁. */
export type BigSigmaRemainder = "ak" | "ps";

export type BigSigmaGeometry = {
  /** Polyline to draw: EMS “all” links, or Σ₁ only. */
  joints: Point2[];
  /** Σ₁ tip (last joint of n=1..⌊T⌋, or origin if T < 1). */
  sum1: Point2;
  /** Σ₁ plus the selected remainder (R_{1ak} or R_{1ps}). */
  fApprox: Point2;
};

/** Last-links slider: integer 1…10. */
export function clampLastLinksCount(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(10, Math.round(n)));
}

/**
 * Last `count` Dirichlet segments of a joint walk (origin plus one
 * point per term). Fewer links than `count` returns the whole walk.
 */
export function lastLinkJoints(joints: readonly Point2[], count: number): Point2[] {
  const n = clampLastLinksCount(count);
  if (joints.length <= 1) return joints.length === 0 ? [{ x: 0, y: 0 }] : [joints[0]!];
  const take = Math.min(n, joints.length - 1);
  return joints.slice(joints.length - (take + 1));
}

/**
 * Move the first joint to the origin so a last-n tip is on-screen.
 * Scale is still about the origin; without this the unused early walk
 * would keep the last links at the far edge.
 */
export function recenterPointsToFirst(pts: readonly Point2[]): Point2[] {
  const origin = pts[0] ?? { x: 0, y: 0 };
  if (origin.x === 0 && origin.y === 0) return [...pts];
  return pts.map((p) => ({ x: p.x - origin.x, y: p.y - origin.y }));
}

/**
 * EMS Dirichlet joints (Main’s “entire” chain) or the Σ₁ prefix through ⌊T⌋.
 * The white remainder is measured from Σ₁, not from the extra EMS links.
 * `remainder` picks R_{1ak} (Siegel) or R_{1ps}. When `lastLinksCount` is
 * set, only that many Σ₁ links are kept (the walk that ends at the
 * remainder), recentered so the tip is on-screen.
 */
export function computeBigSigmaGeometry(
  sigma: number,
  index: number,
  chainExtent: BigSigmaChainExtent = "floorT",
  lastLinksCount: number | null = null,
  remainder: BigSigmaRemainder = "ak",
): BigSigmaGeometry {
  const floorJoints = computeScaledForwardSumJoints(sigma, index);
  const fullJoints = chainExtent === "entire"
    ? computeScaledEntireJoints(sigma, index)
    : floorJoints;
  const sum1 = floorJoints[floorJoints.length - 1] ?? { x: 0, y: 0 };
  const r1 = remainder === "ps"
    ? computeScaledRps1(sigma, index)
    : computeScaledRak1(sigma, index);
  const fApprox = { x: sum1.x + r1.x, y: sum1.y + r1.y };
  if (lastLinksCount === null) {
    return { joints: fullJoints, sum1, fApprox };
  }
  // Remainder hangs off Σ₁, so last-n is the tail of ⌊T⌋, not EMS extras.
  const clipped = lastLinkJoints(floorJoints, lastLinksCount);
  const origin = clipped[0] ?? { x: 0, y: 0 };
  const joints = recenterPointsToFirst(clipped);
  return {
    joints,
    sum1: { x: sum1.x - origin.x, y: sum1.y - origin.y },
    fApprox: { x: fApprox.x - origin.x, y: fApprox.y - origin.y },
  };
}

/** Default ortho half-height is 5; stay inside that so wheel zoom-out still works. */
export const BIG_SIGMA_VIEW_TARGET_RADIUS = 3;

/**
 * Largest finite |z| among the points. Overflowed joints are skipped so a
 * single Inf does not collapse the scale to 0.
 */
export function pointsMaxRadius(pts: readonly Point2[]): number {
  let r = 0;
  for (const p of pts) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    const d = Math.hypot(p.x, p.y);
    if (d > r) r = d;
  }
  return r;
}

/**
 * Shrink a huge chain into the default view when σ ≤ −1. For σ > −1 the
 * links stay 1:1 so the usual window is not auto-fitted.
 */
export function bigSigmaWorldScale(sigma: number, radius: number): number {
  if (sigma > -1) return 1;
  if (!Number.isFinite(radius) || radius <= BIG_SIGMA_VIEW_TARGET_RADIUS) return 1;
  return BIG_SIGMA_VIEW_TARGET_RADIUS / radius;
}

/**
 * Uniform scale about the origin. The last Σ₁ / R1ak joints stay aligned.
 */
export function scalePoints(pts: readonly Point2[], scale: number): Point2[] {
  if (scale === 1) return [...pts];
  return pts.map((p) => ({ x: p.x * scale, y: p.y * scale }));
}

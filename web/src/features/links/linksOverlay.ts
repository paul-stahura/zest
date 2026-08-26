import type { Point2 } from "@/shared/io/types";
import { crossingLink, type Chain } from "@/features/links/linksChains";
import { calcForwardSum, calcInverseSum, calcRps1, calcRps2 } from "@/shared/math/sumRemainders";

/** Overlay forward spiral: white, matching the frame link in each strip. */
export const MAIN_FORWARD_COLOR = "#ffffff";
/** Main-tab Inverse+Reflect spiral color (`0xff9580`). */
export const MAIN_INVERSE_REFLECT_COLOR = "#ff9580";
/** Crossing inverse links and Σ_{1x} on the overlay, the same yellow the strips use. */
export const OVERLAY_CROSSING_COLOR = "#ffd54a";
/** Σ_{2x} on the overlay, the green of the Σ₂ chain. */
export const OVERLAY_SUM2X_COLOR = "#69f0ae";

export type OverlayView = {
  originX: number;
  originY: number;
  scale: number;
};

/**
 * Half-height of the Main tab's default orthographic window (`baseHalfHeight`
 * on the pan/zoom controller). Origin at the centre, y-up, ten world units of
 * height on screen. The overlay zooms this by {@link OVERLAY_ZOOM}.
 */
export const MAIN_TAB_HALF_HEIGHT = 5;
/** Overlay scale relative to the Main tab's default window. */
export const OVERLAY_ZOOM = 2;
/** Screen position of world (0, 0), as a fraction of the overlay from the left. */
export const OVERLAY_ORIGIN_LEFT = 0.04;
/** Screen position of world (0, 0), as a fraction of the overlay from the top. */
export const OVERLAY_ORIGIN_TOP = 0.25;

/**
 * Overlay world view: the Main tab's default window, zoomed {@link OVERLAY_ZOOM}×,
 * with the origin near the left edge and a quarter of the way down so the spiral
 * sits in the open space to the right.
 */
export function overlayView(width: number, height: number): OverlayView | null {
  if (width <= 0 || height <= 0) return null;
  return {
    originX: width * OVERLAY_ORIGIN_LEFT,
    originY: height * OVERLAY_ORIGIN_TOP,
    scale: (OVERLAY_ZOOM * height) / (2 * MAIN_TAB_HALF_HEIGHT),
  };
}

/**
 * Fits world-space points into a rectangle, preserving aspect and leaving `padding` on every
 * side. Canvas y runs down, so the returned origin is the screen position of world (0, 0) after
 * the y-flip: screen = (originX + x·scale, originY − y·scale).
 *
 * Returns null when there is nothing to fit (no points, no area, or a collapsed box).
 */
export function fitPointsToRect(
  points: Point2[],
  width: number,
  height: number,
  padding: number,
): OverlayView | null {
  return fitPointSetsToRect([points], width, height, padding);
}

/**
 * Same as {@link fitPointsToRect}, walking several polylines without concatenating them.
 */
export function fitPointSetsToRect(
  sets: readonly Point2[][],
  width: number,
  height: number,
  padding: number,
): OverlayView | null {
  if (width <= 0 || height <= 0) return null;
  let found = false;
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;
  for (const points of sets) {
    for (const p of points) {
      if (!found) {
        minX = maxX = p.x;
        minY = maxY = p.y;
        found = true;
        continue;
      }
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (!found) return null;
  const worldW = maxX - minX;
  const worldH = maxY - minY;
  if (worldW < 1e-12 && worldH < 1e-12) return null;
  const pad = Math.max(0, padding);
  const availW = Math.max(1e-9, width - 2 * pad);
  const availH = Math.max(1e-9, height - 2 * pad);
  const spanW = Math.max(worldW, 1e-12);
  const spanH = Math.max(worldH, 1e-12);
  const scale = Math.min(availW / spanW, availH / spanH);
  return {
    originX: pad + (availW - worldW * scale) / 2 - minX * scale,
    originY: pad + (availH - worldH * scale) / 2 + maxY * scale,
    scale,
  };
}

/** Maps a world point through {@link OverlayView} into canvas pixels. */
export function overlayToScreen(p: Point2, view: OverlayView): Point2 {
  return { x: view.originX + p.x * view.scale, y: view.originY - p.y * view.scale };
}

/**
 * Joints of the overlay forward spiral: links 0 … ⌊T⌋, i.e. the origin through the far
 * end of the bisector link.
 */
export function overlayForwardJoints(m: number): { from: number; to: number } {
  return { from: 0, to: Math.max(1, m + 1) };
}

/**
 * Joints of the overlay inverse spiral: the bisector link through the end of the first turn.
 */
export function overlayInverseJoints(m: number, lastJoint: number): { from: number; to: number } {
  const last = Math.max(0, lastJoint);
  return { from: Math.min(Math.max(0, m), last), to: last };
}

/**
 * Inverse links that cross a forward link 0 … ⌊T⌋, the ones drawn yellow on the overlay.
 * The bisector is pinned to its own number, matching the strips.
 */
export function overlayCrossingInverseLinks(
  fwd: Chain,
  inv: Chain,
  m: number,
  scale: number,
): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (let k = 0; k <= m; k++) {
    const hit = crossingLink(fwd, inv, k, scale, m);
    if (hit === null || seen.has(hit.link)) continue;
    seen.add(hit.link);
    out.push(hit.link);
  }
  return out;
}

/**
 * The PS legs B₁=Σ₁+R_{1ps} and B₂=Σ₂+R_{2ps}. Their sum is ζ at every σ.
 */
export function psLegs(sigma: number, index: number): { b1: Point2; b2: Point2 } {
  const s1 = calcForwardSum(sigma, index);
  const r1 = calcRps1(sigma, index);
  const s2 = calcInverseSum(sigma, index);
  const r2 = calcRps2(sigma, index);
  return {
    b1: { x: s1.re + r1.re, y: s1.im + r1.im },
    b2: { x: s2.re + r2.re, y: s2.im + r2.im },
  };
}

/**
 * Crossing-joint walk along `chain` for links 0 … ⌊T⌋. A miss (partner past the
 * cap, or no geometric hit off σ=½) uses the midpoint of that link. `end` pins
 * the last joint so the walk is exactly B₁ or B₂.
 */
export function crossingWalkJoints(
  chain: Chain,
  partner: Chain,
  m: number,
  scale: number,
  end: Point2 | null = null,
): Point2[] {
  const origin = chain.joints[0];
  const out: Point2[] = origin !== undefined ? [{ x: origin.x, y: origin.y }] : [{ x: 0, y: 0 }];
  for (let k = 0; k <= m; k++) {
    if (k === m && end !== null) {
      out.push({ x: end.x, y: end.y });
      continue;
    }
    const hit = crossingLink(chain, partner, k, scale, m);
    if (hit?.at !== undefined && hit.at !== null) {
      out.push({ x: hit.at.x, y: hit.at.y });
      continue;
    }
    const a = chain.joints[k];
    const b = chain.joints[k + 1];
    if (a === undefined || b === undefined) continue;
    out.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  }
  return out;
}

/**
 * Joints of Σ_{1x}: the origin, then the crossing of each forward link 0 … ⌊T⌋,
 * ending at B₁. That is Σ₁+R_{1ps} re-jointed.
 */
export function sum1xJoints(
  fwd: Chain,
  inv: Chain,
  m: number,
  scale: number,
  end: Point2 | null = null,
): Point2[] {
  return crossingWalkJoints(fwd, inv, m, scale, end);
}

/**
 * Joints of Σ_{2x}: the origin along χ Σ n^{s−1}, ending at B₂. That is
 * Σ₂+R_{2ps} re-jointed, so Σ_{1x}+Σ_{2x}=ζ at every σ.
 */
export function sum2xJoints(
  invFrom0: Chain,
  fwd: Chain,
  m: number,
  scale: number,
  end: Point2 | null = null,
): Point2[] {
  return crossingWalkJoints(invFrom0, fwd, m, scale, end);
}

export type CrossingPartSums = {
  /** Sum of joint-to-crossing pieces, including the bisector stub Σ₁→B₁. */
  v1: Point2;
  /** Sum of crossing-to-next-joint pieces; the bisector has no second part. */
  v2: Point2;
};

/**
 * Splits each forward link 0 … ⌊T⌋−1 at its reverse crossing and sums the two
 * halves as free vectors. The bisector contributes only its first part, the
 * stub to B₁, so V₁+V₂=B₁ at every σ.
 */
export function crossingPartSums(
  fwd: Chain,
  inv: Chain,
  m: number,
  scale: number,
  b1: Point2,
): CrossingPartSums {
  let v1x = 0;
  let v1y = 0;
  let v2x = 0;
  let v2y = 0;
  for (let k = 0; k <= m; k++) {
    const a = fwd.joints[k];
    const b = fwd.joints[k + 1];
    if (a === undefined || b === undefined) continue;
    const at = k === m
      ? b1
      : crossingLink(fwd, inv, k, scale, m)?.at ?? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    v1x += at.x - a.x;
    v1y += at.y - a.y;
    if (k < m) {
      v2x += b.x - at.x;
      v2y += b.y - at.y;
    }
  }
  return { v1: { x: v1x, y: v1y }, v2: { x: v2x, y: v2y } };
}


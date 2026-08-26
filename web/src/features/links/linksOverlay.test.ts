import { describe, expect, it } from "vitest";

import type { Point2 } from "@/shared/io/types";
import {
  fitPointsToRect,
  fitPointSetsToRect,
  overlayView,
  MAIN_TAB_HALF_HEIGHT,
  OVERLAY_ORIGIN_LEFT,
  OVERLAY_ORIGIN_TOP,
  OVERLAY_ZOOM,
  overlayCrossingInverseLinks,
  overlayForwardJoints,
  overlayInverseJoints,
  overlayToScreen,
  crossingPartSums,
  psLegs,
  sum1xJoints,
  sum2xJoints,
} from "@/features/links/linksOverlay";
import {
  crossingLink,
  crossingScale,
  forwardChain,
  inverseChain,
  reflectedInverseChain,
} from "@/features/links/linksChains";
import { computeZakSpiralGeometry } from "@/shared/math/zakCalculator";

describe("fitPointsToRect", () => {
  it("returns null when there is nothing to fit", () => {
    expect(fitPointsToRect([], 100, 100, 8)).toBeNull();
    expect(fitPointsToRect([{ x: 0, y: 0 }], 100, 100, 8)).toBeNull();
    expect(fitPointsToRect([{ x: 1, y: 1 }, { x: 2, y: 2 }], 0, 100, 8)).toBeNull();
  });

  it("fits a box into the padded rectangle without stretching", () => {
    const view = fitPointsToRect(
      [{ x: 0, y: 0 }, { x: 2, y: 1 }],
      200,
      100,
      10,
    );
    expect(view).not.toBeNull();
    if (view === null) return;
    // Available 180×80; world 2×1, so scale is limited by height: 80/1 = 80.
    expect(view.scale).toBeCloseTo(80, 10);
    const lo = overlayToScreen({ x: 0, y: 0 }, view);
    const hi = overlayToScreen({ x: 2, y: 1 }, view);
    expect(hi.x - lo.x).toBeCloseTo(160, 8);
    expect(lo.y - hi.y).toBeCloseTo(80, 8);
    expect(lo.x).toBeGreaterThanOrEqual(10);
    expect(hi.y).toBeGreaterThanOrEqual(10);
  });

  it("fits several polylines to the same box as the concatenated points", () => {
    const a: Point2[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
    const b: Point2[] = [{ x: 0, y: 2 }, { x: 1, y: 2 }];
    const joined = fitPointsToRect([...a, ...b], 100, 100, 4);
    const sets = fitPointSetsToRect([a, b], 100, 100, 4);
    expect(joined).toEqual(sets);
  });

  it("places the origin left and up at twice the Main tab's default scale", () => {
    const view = overlayView(200, 100);
    expect(view).not.toBeNull();
    if (view === null) return;
    expect(overlayToScreen({ x: 0, y: 0 }, view)).toEqual({
      x: 200 * OVERLAY_ORIGIN_LEFT,
      y: 100 * OVERLAY_ORIGIN_TOP,
    });
    expect(view.scale).toBeCloseTo((OVERLAY_ZOOM * 100) / (2 * MAIN_TAB_HALF_HEIGHT), 10);
  });

  it("cuts the forward spiral at the bisector and the inverse spiral from there to the end", () => {
    expect(overlayForwardJoints(6)).toEqual({ from: 0, to: 7 });
    expect(overlayInverseJoints(6, 90)).toEqual({ from: 6, to: 90 });
    expect(overlayInverseJoints(6, 4)).toEqual({ from: 4, to: 4 });
  });

  it("names the inverse links that cross forward 0…⌊T⌋, pinning the bisector", () => {
    const sigma = 0.5;
    const index = 6.18;
    const m = 6;
    const zak = computeZakSpiralGeometry(sigma, index);
    const fwd = forwardChain(sigma, index, false, 100_000);
    const inv = reflectedInverseChain(sigma, index, false, zak.zeta, 100_000);
    const hits = overlayCrossingInverseLinks(fwd, inv, m, crossingScale(index, false));
    expect(hits).toEqual([44, 21, 14, 10, 8, 6]);
    const tail = overlayInverseJoints(m, inv.joints.length - 1);
    expect(hits.every(link => link >= tail.from && link + 1 <= tail.to)).toBe(true);
  });

  it("walks sum_x from the origin through the crossings to the bisector point", () => {
    const sigma = 0.5;
    const index = 6.18;
    const m = 6;
    const zak = computeZakSpiralGeometry(sigma, index);
    const fwd = forwardChain(sigma, index, false, 100_000);
    const inv = reflectedInverseChain(sigma, index, false, zak.zeta, 100_000);
    const scale = crossingScale(index, false);
    const joints = sum1xJoints(fwd, inv, m, scale);
    expect(joints).toHaveLength(m + 2);
    expect(joints[0]).toEqual({ x: 0, y: 0 });
    const bisector = crossingLink(fwd, inv, m, scale, m);
    expect(bisector?.at).not.toBeNull();
    expect(joints[joints.length - 1]).toEqual(bisector!.at);
    for (let k = 0; k <= m; k++) {
      const at = joints[k + 1]!;
      const a = fwd.joints[k]!;
      const b = fwd.joints[k + 1]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const along = (at.x - a.x) * dx + (at.y - a.y) * dy;
      const span = dx * dx + dy * dy;
      const off = (at.x - a.x) * dy - (at.y - a.y) * dx;
      expect(along).toBeGreaterThanOrEqual(-1e-12);
      expect(along).toBeLessThanOrEqual(span + 1e-12);
      expect(Math.abs(off)).toBeLessThan(1e-9);
    }
  });

  it("keeps the first sum_x step on link 0 when the inverse partner is past the cap", () => {
    const sigma = 0.5;
    const index = 683;
    const m = 683;
    const fwd = forwardChain(sigma, index, false, m + 2);
    const inv = reflectedInverseChain(sigma, index, false, { x: 0, y: 0 }, 1_000);
    const joints = sum1xJoints(fwd, inv, m, crossingScale(index, false));
    expect(joints).toHaveLength(m + 2);
    const a = fwd.joints[0]!;
    const b = fwd.joints[1]!;
    expect(joints[1]).toEqual({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  });

  it("adds Σ_1x and Σ_2x to ζ at any σ", () => {
    const index = 6.18;
    const m = 6;
    const scale = crossingScale(index, false);
    for (const sigma of [0.3, 0.5, 0.7]) {
      const zak = computeZakSpiralGeometry(sigma, index);
      const fwd = forwardChain(sigma, index, false, 100_000);
      const invR = reflectedInverseChain(sigma, index, false, zak.zeta, 100_000);
      const inv0 = inverseChain(sigma, index, false, 100_000);
      const { b1, b2 } = psLegs(sigma, index);
      const one = sum1xJoints(fwd, invR, m, scale, b1);
      const two = sum2xJoints(inv0, fwd, m, scale, b2);
      expect(one[one.length - 1]).toEqual(b1);
      expect(two[two.length - 1]).toEqual(b2);
      expect(b1.x + b2.x).toBeCloseTo(zak.zeta.x, 8);
      expect(b1.y + b2.y).toBeCloseTo(zak.zeta.y, 8);
    }
  });

  it("adds the two crossing-part sums to B1 at any σ", () => {
    const index = 6.18;
    const m = 6;
    const scale = crossingScale(index, false);
    for (const sigma of [0.3, 0.5, 0.7]) {
      const zak = computeZakSpiralGeometry(sigma, index);
      const fwd = forwardChain(sigma, index, false, 100_000);
      const inv = reflectedInverseChain(sigma, index, false, zak.zeta, 100_000);
      const { b1 } = psLegs(sigma, index);
      const { v1, v2 } = crossingPartSums(fwd, inv, m, scale, b1);
      expect(v1.x + v2.x).toBeCloseTo(b1.x, 8);
      expect(v1.y + v2.y).toBeCloseTo(b1.y, 8);
      expect(Math.hypot(v1.x, v1.y)).toBeGreaterThan(0.5);
      expect(Math.hypot(v2.x, v2.y)).toBeGreaterThan(0.5);
    }
  });

  it("gives the bisector stub alone when T is in (0, 1)", () => {
    const sigma = 0.5;
    const index = 0.4;
    const zak = computeZakSpiralGeometry(sigma, index);
    const fwd = forwardChain(sigma, index, false, 100_000);
    const inv = reflectedInverseChain(sigma, index, false, zak.zeta, 100_000);
    const { b1 } = psLegs(sigma, index);
    const { v1, v2 } = crossingPartSums(fwd, inv, 0, crossingScale(index, false), b1);
    expect(v1).toEqual(b1);
    expect(v2).toEqual({ x: 0, y: 0 });
  });

  it("flips y so world-up lands toward the top of the canvas", () => {
    const view = fitPointsToRect(
      [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      100,
      100,
      0,
    );
    expect(view).not.toBeNull();
    if (view === null) return;
    const origin = overlayToScreen({ x: 0, y: 0 }, view);
    const up = overlayToScreen({ x: 0, y: 1 }, view);
    expect(up.y).toBeLessThan(origin.y);
  });
});

import { describe, expect, it } from "vitest";

import {
  toLinkFrame,
  thinRange,
  sampledLinkNumbers,
  chainPointBudget,
} from "@/features/links/linksFrame";
import { computeZakSpiralGeometry } from "@/shared/math/zakCalculator";

describe("toLinkFrame", () => {
  it("puts the link on the unit segment of the x-axis", () => {
    const a = { x: 3, y: -1 };
    const b = { x: 5, y: 2 };
    const atA = toLinkFrame(a, a, b);
    const atB = toLinkFrame(b, a, b);
    expect(atA?.x).toBeCloseTo(0, 12);
    expect(atA?.y).toBeCloseTo(0, 12);
    expect(atB?.x).toBeCloseTo(1, 12);
    expect(atB?.y).toBeCloseTo(0, 12);
  });

  it("measures the cross direction in units of the link length", () => {
    // Link of length 2 along +x; a point one link-length above its start.
    const a = { x: 0, y: 0 };
    const b = { x: 2, y: 0 };
    const u = toLinkFrame({ x: 0, y: 2 }, a, b);
    expect(u?.x).toBeCloseTo(0, 12);
    expect(u?.y).toBeCloseTo(1, 12);
  });

  it("is a rotation, so it preserves ratios of distances", () => {
    const a = { x: -2, y: 7 };
    const b = { x: 1, y: 3 };            // length 5
    const p = { x: 8, y: -4 };
    const u = toLinkFrame(p, a, b);
    const dPA = Math.hypot(p.x - a.x, p.y - a.y);
    expect(Math.hypot(u?.x ?? 0, u?.y ?? 0)).toBeCloseTo(dPA / 5, 12);
  });

  it("rejects a degenerate link", () => {
    expect(toLinkFrame({ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 2 })).toBeNull();
  });

  it("frames a real spiral link so the chain's own link is 0→1", () => {
    const sigma = 0.5;
    const index = 6.18;
    const m = Math.floor(index);
    const geom = computeZakSpiralGeometry(sigma, index);
    for (let n = 1; n <= m; n++) {
      const a = geom.joints[n - 1]!;
      const b = geom.joints[n]!;
      const end = toLinkFrame(b, a, b);
      expect(end?.x).toBeCloseTo(1, 10);
      expect(end?.y).toBeCloseTo(0, 10);
      // Link n has length n^(-sigma), so the origin sits that many link-lengths away.
      const origin = toLinkFrame({ x: 0, y: 0 }, a, b);
      const expected = Math.hypot(a.x, a.y) / Math.pow(n, -sigma);
      expect(Math.hypot(origin?.x ?? 0, origin?.y ?? 0)).toBeCloseTo(expected, 10);
    }
  });
});

describe("thinRange", () => {
  it("returns every index when the range fits the budget", () => {
    expect(thinRange(0, 4, 10, [])).toEqual([0, 1, 2, 3, 4]);
  });

  it("covers a range that does not start at zero", () => {
    expect(thinRange(7, 10, 10, [])).toEqual([7, 8, 9, 10]);
  });

  it("keeps both ends and the requested indices when thinning", () => {
    const out = thinRange(0, 999, 10, [777]);
    expect(out[0]).toBe(0);
    expect(out[out.length - 1]).toBe(999);
    expect(out).toContain(777);
  });

  it("ignores keep indices outside the range", () => {
    const out = thinRange(100, 199, 5, [3, 150]);
    expect(out).toContain(150);
    expect(out).not.toContain(3);
    expect(out[0]).toBe(100);
    expect(out[out.length - 1]).toBe(199);
  });

  it("stays sorted, unique and near the budget", () => {
    const out = thinRange(0, 9_999, 25, [1, 2, 3]);
    expect(out.length).toBeLessThanOrEqual(25 + 5);
    expect([...out].sort((p, q) => p - q)).toEqual(out);
    expect(new Set(out).size).toBe(out.length);
  });

  it("returns nothing for an inverted range", () => {
    expect(thinRange(5, 4, 8, [])).toEqual([]);
  });
});

describe("sampledLinkNumbers", () => {
  it("gives every link when they all fit", () => {
    expect(sampledLinkNumbers(6, 600)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("keeps link 0 and the bisector link when sampling", () => {
    const out = sampledLinkNumbers(5000, 600);
    expect(out.length).toBe(600);
    expect(out[0]).toBe(0);
    expect(out[out.length - 1]).toBe(5000);
  });

  it("does not change with the row zoom, since the budget is the canvas", () => {
    // Same canvas, three row zooms: the strips magnify rather than swap.
    const budget = 1200 / 2;
    expect(sampledLinkNumbers(5000, budget)).toEqual(sampledLinkNumbers(5000, budget));
  });

  it("stays sorted and never repeats a link", () => {
    const out = sampledLinkNumbers(1999, 500);
    expect([...out].sort((p, q) => p - q)).toEqual(out);
    expect(new Set(out).size).toBe(out.length);
  });
});

describe("chainPointBudget", () => {
  it("draws the whole chain at moderate T, so links keep their true length", () => {
    // "bisector to end" at T=17 asks for joints ⌊T⌋ … 2T(T+1), the longest range a strip draws.
    for (const T of [6, 17, 30]) {
      const joints = 2 * T * (T + 1) - T + 1;
      expect(chainPointBudget(T + 1)).toBeGreaterThanOrEqual(joints);
    }
  });

  it("keeps a frame's total work bounded once the strips are sampled", () => {
    for (const strips of [1, 18, 200, 700]) {
      expect(chainPointBudget(strips) * strips).toBeLessThanOrEqual(200_000);
    }
  });

  it("leaves every strip something to draw", () => {
    expect(chainPointBudget(100_000)).toBeGreaterThanOrEqual(128);
  });
});

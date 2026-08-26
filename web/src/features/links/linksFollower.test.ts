import {
  acuteAngleDeg,
  closestSpanLink,
  exactFollowerLink,
  followerAngleVisible,
  pickFollowerLink,
} from "@/features/links/linksFollower";
import { forwardChain, reflectedInverseChain, spanLinkRange } from "@/features/links/linksChains";
import { toLinkFrame } from "@/features/links/linksFrame";
import { yinYangInBisectorFrame } from "@/features/links/linksYinYang";
import { computeZakSpiralGeometry } from "@/shared/math/zakCalculator";

describe("exactFollowerLink", () => {
  it("names the last-spiral reverse link on strip 0", () => {
    expect(exactFollowerLink(0, 7)).toBe(48);
    expect(exactFollowerLink(0, 12)).toBe(143);
  });

  it("names the reverse bisector on the bisector strip", () => {
    expect(exactFollowerLink(6, 7)).toBe(6);
    expect(exactFollowerLink(11, 12)).toBe(11);
  });

  it("returns the product-law followers in the 11 < T < 12 unit", () => {
    expect(exactFollowerLink(1, 12)).toBe(71);
    expect(exactFollowerLink(2, 12)).toBe(47);
    expect(exactFollowerLink(3, 12)).toBe(35);
    expect(exactFollowerLink(5, 12)).toBe(23);
    expect(exactFollowerLink(7, 12)).toBe(17);
    expect(exactFollowerLink(8, 12)).toBe(15);
  });

  it("returns null when k+1 does not divide the square", () => {
    expect(exactFollowerLink(1, 7)).toBeNull();
    expect(exactFollowerLink(4, 12)).toBeNull();
    expect(exactFollowerLink(9, 12)).toBeNull();
  });
});

describe("acuteAngleDeg", () => {
  it("is 0 for parallel and anti-parallel vectors", () => {
    expect(acuteAngleDeg({ x: 1, y: 0 }, { x: 2, y: 0 })).toBeCloseTo(0, 10);
    expect(acuteAngleDeg({ x: 1, y: 0 }, { x: -3, y: 0 })).toBeCloseTo(0, 10);
  });

  it("returns the acute angle, not the obtuse supplement", () => {
    expect(acuteAngleDeg({ x: 1, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90, 8);
    expect(acuteAngleDeg({ x: 1, y: 0 }, { x: -1, y: 1 })).toBeCloseTo(45, 8);
  });

  it("returns NaN for a degenerate vector", () => {
    expect(acuteAngleDeg({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeNaN();
  });
});

describe("closestSpanLink", () => {
  it("picks the span link whose framed direction is nearest the chord", () => {
    const dirs: Record<number, { x: number; y: number }> = {
      10: { x: 1, y: 0.4 },
      11: { x: 1, y: 0.02 },
      12: { x: 1, y: -0.3 },
    };
    const pick = closestSpanLink(10, 12, 20, (j) => dirs[j] ?? null, { x: 1, y: 0 });
    expect(pick).toEqual({ link: 11, angleDeg: expect.closeTo(Math.atan(0.02) * (180 / Math.PI), 8) });
  });

  it("skips missing joints and returns null when the span is empty", () => {
    expect(closestSpanLink(3, 5, 2, () => ({ x: 1, y: 0 }), { x: 1, y: 0 })).toBeNull();
    expect(closestSpanLink(0, 4, 10, () => null, { x: 1, y: 0 })).toBeNull();
  });
});

describe("pickFollowerLink", () => {
  it("prefers the product-law link even when it sits outside the span", () => {
    const pick = pickFollowerLink(0, 12, 0, 4, 200, (j) => (
      j === 143 ? { x: 1, y: 0 } : { x: 1, y: 1 }
    ), { x: 2, y: 0 });
    expect(pick).toEqual({ link: 143, angleDeg: expect.closeTo(0, 10), exact: true });
  });

  it("falls back to the closest span link when the product is not integer", () => {
    const dirs: Record<number, { x: number; y: number }> = {
      4: { x: 1, y: 0.5 },
      5: { x: 1, y: 0.01 },
    };
    const pick = pickFollowerLink(4, 12, 4, 5, 20, (j) => dirs[j] ?? null, { x: 1, y: 0 });
    expect(pick?.exact).toBe(false);
    expect(pick?.link).toBe(5);
  });
});

describe("pickFollowerLink against real chains", () => {
  it("matches the copied-chord product at T = 11.3, and is parallel when exact", () => {
    const sigma = 0.5;
    const index = 11.3;
    const usePolyImag = false;
    const m = Math.floor(index);
    const geom = computeZakSpiralGeometry(sigma, index);
    const fwd = forwardChain(sigma, index, usePolyImag, m + 2);
    const inv = reflectedInverseChain(sigma, index, usePolyImag, geom.zeta, 200);
    const now = yinYangInBisectorFrame(sigma, index, usePolyImag);
    const chord = { x: now.yang.x - now.yin.x, y: now.yang.y - now.yin.y };

    const framedDir = (k: number) => (j: number) => {
      const a = fwd.joints[k];
      const b = fwd.joints[k + 1];
      const p = inv.joints[j];
      const q = inv.joints[j + 1];
      if (a === undefined || b === undefined || p === undefined || q === undefined) return null;
      const fp = toLinkFrame(p, a, b);
      const fq = toLinkFrame(q, a, b);
      if (fp === null || fq === null) return null;
      return { x: fq.x - fp.x, y: fq.y - fp.y };
    };

    const strip0 = spanLinkRange(index, usePolyImag, 0, m);
    const pick0 = pickFollowerLink(0, m + 1, strip0.from, strip0.to, inv.lastLink, framedDir(0), chord);
    expect(pick0?.exact).toBe(true);
    expect(pick0?.link).toBe(143);
    expect(pick0?.angleDeg).toBeCloseTo(0, 5);

    const strip11 = spanLinkRange(index, usePolyImag, 11, m);
    const pick11 = pickFollowerLink(11, m + 1, strip11.from, strip11.to, inv.lastLink, framedDir(11), chord);
    expect(pick11?.exact).toBe(true);
    expect(pick11?.link).toBe(11);
    expect(pick11?.angleDeg).toBeCloseTo(0, 5);

    const strip4 = spanLinkRange(index, usePolyImag, 4, m);
    const pick4 = pickFollowerLink(4, m + 1, strip4.from, strip4.to, inv.lastLink, framedDir(4), chord);
    expect(pick4?.exact).toBe(false);
    expect(pick4?.link).toBeGreaterThanOrEqual(strip4.from);
    expect(pick4?.link).toBeLessThanOrEqual(strip4.to);
    expect(pick4 !== null && followerAngleVisible(pick4)).toBe(true);
  });
});

describe("followerAngleVisible", () => {
  it("hides the label on an exact product-law follower", () => {
    expect(followerAngleVisible({ link: 11, angleDeg: 0.2, exact: true })).toBe(false);
  });

  it("shows the label when a closest pick is not parallel", () => {
    expect(followerAngleVisible({ link: 9, angleDeg: 6.9, exact: false })).toBe(true);
    expect(followerAngleVisible({ link: 9, angleDeg: 0.01, exact: false })).toBe(false);
  });
});

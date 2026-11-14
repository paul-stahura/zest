import { describe, it, expect } from "vitest";

import { ridgeSigma, ridgeSigmaAtT, ridgeInvT, ridgeInvTs, ridgeBandHalfWidth } from "./negTRidge";
import { iOfT } from "./iOfT";

describe("negTRidge", () => {
  it("ridgeSigma matches π·I(T)/(2·ln(n+½))", () => {
    const t = 4.5;
    const n = 4;
    expect(ridgeSigma(t, n)).toBeCloseTo((Math.PI * iOfT(t)) / (2 * Math.log(n + 0.5)), 9);
  });

  it("some ridge band covers the true ridge T (the zero would be caught)", () => {
    // The feature's core invariant: for every T on the ridge, at least one
    // returned crossing lies within the scan band half-width of it, so the
    // banded scan actually straddles that zero (band-boundary T included).
    for (let t = 1.2; t <= 120; t += 0.37) {
      const sigma = ridgeSigmaAtT(t);
      const covered = ridgeInvTs(sigma).some((tb) => Math.abs(tb - t) <= ridgeBandHalfWidth(t));
      expect(covered).toBe(true);
    }
  });

  it("every returned crossing sits on the ridge (σ* reproduces the input σ)", () => {
    for (const t of [3.4, 5.5, 22.2, 60.6, 4.9, 99.8]) {
      const sigma = ridgeSigmaAtT(t);
      const crossings = ridgeInvTs(sigma);
      expect(crossings.length).toBeGreaterThan(0);
      for (const tb of crossings) {
        const sigmaBack = ridgeSigma(tb, Math.floor(tb));
        expect(Math.abs(sigmaBack - sigma) / sigma).toBeLessThan(1e-6);
        expect(Math.floor(tb)).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("returns NaN / empty for σ ≤ 0 (off the ridge domain)", () => {
    expect(Number.isNaN(ridgeInvT(0))).toBe(true);
    expect(Number.isNaN(ridgeInvT(-50))).toBe(true);
    expect(ridgeInvTs(-50)).toEqual([]);
  });

  it("band half-width scales with T with a small-T floor", () => {
    expect(ridgeBandHalfWidth(1)).toBe(0.08); // 0.025 < 0.08 → floor
    expect(ridgeBandHalfWidth(100)).toBeCloseTo(2.5, 9);
  });
});

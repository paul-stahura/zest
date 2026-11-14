import { describe, it, expect } from "vitest";
import { betaSymmetric } from "./betaSymmetric";
import { Xoshiro256ss, combineSeeds } from "./xoshiro256ss";

describe("Xoshiro256ss", () => {
  it("is deterministic for a given seed", () => {
    const a = new Xoshiro256ss(42);
    const b = new Xoshiro256ss(42);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it("produces uniforms in [0, 1)", () => {
    const rng = new Xoshiro256ss(1);
    for (let i = 0; i < 10_000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("different seeds give different streams", () => {
    const a = new Xoshiro256ss(1);
    const b = new Xoshiro256ss(2);
    expect(a.next()).not.toBe(b.next());
  });
});

describe("combineSeeds", () => {
  it("produces distinct subseeds for the same root", () => {
    const a = combineSeeds(42, 0);
    const b = combineSeeds(42, 1);
    expect(a).not.toBe(b);
  });
});

describe("betaSymmetric", () => {
  it("returns uniform when alpha = 1", () => {
    const rng = new Xoshiro256ss(7);
    let sum = 0;
    const N = 50_000;
    for (let i = 0; i < N; i++) sum += betaSymmetric(rng, 1);
    expect(sum / N).toBeGreaterThan(0.49);
    expect(sum / N).toBeLessThan(0.51);
  });

  it("concentrates near 0.5 for alpha = 25 (canonical bell-shape default)", () => {
    const rng = new Xoshiro256ss(9);
    let sum = 0;
    let nearMid = 0;
    const N = 20_000;
    for (let i = 0; i < N; i++) {
      const v = betaSymmetric(rng, 26); // 1 + bell_shape(25) per Python
      sum += v;
      if (v > 0.4 && v < 0.6) nearMid++;
    }
    expect(sum / N).toBeGreaterThan(0.49);
    expect(sum / N).toBeLessThan(0.51);
    expect(nearMid / N).toBeGreaterThan(0.6); // ~70% expected for α=26
  });

  it("rejects non-positive alpha", () => {
    const rng = new Xoshiro256ss(0);
    expect(() => betaSymmetric(rng, 0)).toThrow();
    expect(() => betaSymmetric(rng, -1)).toThrow();
  });
});

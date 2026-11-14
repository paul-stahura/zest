import { scorerZeroExpansion } from "@/shared/math/zerosOfF/scorerZeroExpansion";
import { theorem5Rho } from "@/shared/math/zerosOfF/theorem5Rho";

describe("scorerZeroExpansion", () => {
  it("matches eq. (37) with the Table 2 coefficients at N = 100", () => {
    const minus = scorerZeroExpansion(3, 100, -1);
    const plus = scorerZeroExpansion(3, 100, 1);
    if (minus === null || plus === null) throw new Error("expected both signs");
    expect(minus.sigma).toBeCloseTo(-44.5506158982632, 9);
    expect(minus.t).toBeCloseTo(62788.35087463706, 7);
    expect(plus.sigma).toBeCloseTo(-20.66955892928507, 9);
    expect(plus.t).toBeCloseTo(63418.19425649703, 7);
    const second = scorerZeroExpansion(2, 100, -1);
    if (second === null) throw new Error("expected z_2's minus point");
    expect(second.sigma).toBeCloseTo(-43.10357903288384, 9);
    expect(second.t).toBeCloseTo(62877.88373790412, 7);
  });

  it("reproduces the Theorem 5 points for z_1 up to the rounding of A3", () => {
    for (const n of [1, 100, 4000]) {
      const minus = scorerZeroExpansion(1, n, -1);
      const plus = scorerZeroExpansion(1, n, 1);
      const gold = theorem5Rho(n, 0);
      const blue = theorem5Rho(n, 1);
      if (minus === null || plus === null || gold === null || blue === null) {
        throw new Error(`expected all four points at N = ${String(n)}`);
      }
      expect(Math.hypot(minus.sigma - gold.sigma, minus.t - gold.t)).toBeLessThan(1e-5);
      expect(Math.hypot(plus.sigma - blue.sigma, plus.t - blue.t)).toBeLessThan(1e-5);
    }
  });

  it("returns null below N = 1 and where Im s is not positive", () => {
    expect(scorerZeroExpansion(1, 0, -1)).toBeNull();
    expect(scorerZeroExpansion(2, 1, -1)).toBeNull();
    expect(scorerZeroExpansion(3, 1, -1)).toBeNull();
    expect(scorerZeroExpansion(3, 1, 1)).toBeNull();
    expect(scorerZeroExpansion(2, 1, 1)?.t).toBeCloseTo(3.3915619895569593, 9);
  });
});

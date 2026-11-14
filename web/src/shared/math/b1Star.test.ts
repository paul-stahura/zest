import { complex, complexAbs, complexAdd, complexDiv, complexMul, complexSub, type Complex } from "@/shared/math/complex";
import { calcB1Star, calcHStar, calcMStar, calcRho, calcZetaLogDeriv, chiLogDeriv } from "@/shared/math/b1Star";
import { riemannSiegelTheta } from "@/shared/math/riemannSiegelTheta";
import { eulerMaclaurenZeta } from "@/shared/math/zetaEms";

describe("chiLogDeriv", () => {
  it("equals −2ϑ′(t) (real, ≈ −log(t/2π)) on the critical line", () => {
    const t = 30;
    const w: Complex = chiLogDeriv(complex(0.5, t));
    // −2ϑ′(t) = −log(t/2π) + 1/(24t²) + O(1/t⁴)
    const expected = -Math.log(t / (2 * Math.PI)) + 1 / (24 * t * t);
    expect(Math.abs(w.re - expected)).toBeLessThan(1e-6);
    expect(Math.abs(w.im)).toBeLessThan(1e-9);
  });

  it("uses the cotangent limit without overflow at large t", () => {
    const t = 5000;
    const w: Complex = chiLogDeriv(complex(0.5, t));
    const expected = -Math.log(t / (2 * Math.PI));
    expect(Number.isFinite(w.re)).toBe(true);
    expect(Math.abs(w.re - expected)).toBeLessThan(1e-6);
  });
});

describe("calcHStar", () => {
  it("draws the critical-line offset from ζ/2 with length |h*| = |Z′|/(2ϑ′)", () => {
    const t = 30;
    const { zeta } = calcB1Star(0.5, t);
    const segment = calcHStar(0.5, t);
    expect(segment.foot.re).toBeCloseTo(zeta.re / 2, 8);
    expect(segment.foot.im).toBeCloseTo(zeta.im / 2, 8);
    const length = Math.hypot(segment.tip.re - segment.foot.re, segment.tip.im - segment.foot.im);
    expect(length).toBeCloseTo(Math.abs(segment.h), 8);

    const step = 1e-3;
    const zAt = (height: number): number => {
      const theta = riemannSiegelTheta(height);
      const value = eulerMaclaurenZeta(complex(0.5, height));
      const turned = complexMul(value, complex(Math.cos(theta), Math.sin(theta)));
      return turned.re;
    };
    const zPrime = (zAt(t + step) - zAt(t - step)) / (2 * step);
    const thetaPrime = -chiLogDeriv(complex(0.5, t)).re / 2;
    expect(segment.h).toBeCloseTo(-zPrime / (2 * thetaPrime), 4);
  });
});

describe("calcB1Star", () => {
  it("produces equal legs |B₁*| = |ζ − B₁*| on the critical line", () => {
    const { zeta, b1Star } = calcB1Star(0.5, 30);
    const leg1 = complexAbs(b1Star);
    const leg2 = complexAbs(complexSub(zeta, b1Star));
    expect(Math.abs(leg1 - leg2)).toBeLessThan(1e-6 * Math.max(leg1, 1));
  });

  it("breaks the equal-leg property off the critical line", () => {
    const { zeta, b1Star } = calcB1Star(0.3, 30);
    const leg1 = complexAbs(b1Star);
    const leg2 = complexAbs(complexSub(zeta, b1Star));
    expect(Math.abs(leg1 - leg2)).toBeGreaterThan(1e-3);
  });

  it("returns ζ′ so that B₁* = ζ − ζ′/(χ′/χ)", () => {
    const sigma = 0.5;
    const t = 30;
    const { zeta, zetaPrime, b1Star } = calcB1Star(sigma, t);
    const weight = chiLogDeriv(complex(sigma, t));
    const rebuilt = complexSub(zeta, complexDiv(zetaPrime, weight));
    expect(Math.abs(rebuilt.re - b1Star.re)).toBeLessThan(1e-12);
    expect(Math.abs(rebuilt.im - b1Star.im)).toBeLessThan(1e-12);
  });
});

describe("calcRho", () => {
  it("has real part 1/2 on the critical line", () => {
    const rho = calcRho(0.5, 30);
    expect(Math.abs(rho.re - 0.5)).toBeLessThan(1e-6);
  });

  it("satisfies ρ(s) + ρ(1−s) = 1 off the line", () => {
    const sigma = 0.3;
    const t = 30;
    const sum = complexAdd(calcRho(sigma, t), calcRho(1 - sigma, -t));
    expect(Math.abs(sum.re - 1)).toBeLessThan(1e-5);
    expect(Math.abs(sum.im)).toBeLessThan(1e-5);
  });

  it("makes 1−ρ(s) equal ρ(1−s)", () => {
    const sigma = 0.3;
    const t = 30;
    const oneMinus = complexSub(complex(1, 0), calcRho(sigma, t));
    const atMirror = calcRho(1 - sigma, -t);
    expect(Math.abs(oneMinus.re - atMirror.re)).toBeLessThan(1e-5);
    expect(Math.abs(oneMinus.im - atMirror.im)).toBeLessThan(1e-5);
  });

  it("equals (χ′/χ) ρ", () => {
    const sigma = 0.4;
    const t = 30;
    const zlog = calcZetaLogDeriv(sigma, t);
    const product = complexMul(chiLogDeriv(complex(sigma, t)), calcRho(sigma, t));
    expect(Math.abs(zlog.re - product.re)).toBeLessThan(1e-9);
    expect(Math.abs(zlog.im - product.im)).toBeLessThan(1e-9);
  });

  it("rebuilds B₁* as ζ(1−ρ)", () => {
    const sigma = 0.4;
    const t = 30;
    const rho = calcRho(sigma, t);
    const { zeta, b1Star } = calcB1Star(sigma, t);
    const rebuilt = complexMul(zeta, complexSub(complex(1, 0), rho));
    expect(Math.abs(rebuilt.re - b1Star.re)).toBeLessThan(1e-9);
    expect(Math.abs(rebuilt.im - b1Star.im)).toBeLessThan(1e-9);
  });
});

describe("calcZetaLogDeriv", () => {
  it("has real part −ϑ′ on the critical line", () => {
    const t = 30;
    const zlog = calcZetaLogDeriv(0.5, t);
    const w = chiLogDeriv(complex(0.5, t));
    expect(Math.abs(zlog.re - w.re / 2)).toBeLessThan(1e-6);
  });
});

describe("calcMStar", () => {
  it("matches the on-line closed forms at t = 30", () => {
    const sigma = 0.5;
    const t = 30;
    const { zeta, zetaPrime, b1Star } = calcB1Star(sigma, t);
    const { m1Star, m2Star } = calcMStar(sigma, t);
    const w = chiLogDeriv(complex(sigma, t));
    const thp = -w.re / 2;
    const den = 2 * thp + 1;
    const m1Closed = complexDiv(
      complexAdd(complexMul(complex(2 * thp, 0), zeta), zetaPrime),
      complex(den, 0),
    );
    const m2Closed = complexAdd(zeta, complexDiv(zetaPrime, complex(den, 0)));
    expect(Math.abs(m1Star.re - m1Closed.re)).toBeLessThan(1e-9);
    expect(Math.abs(m1Star.im - m1Closed.im)).toBeLessThan(1e-9);
    expect(Math.abs(m2Star.re - m2Closed.re)).toBeLessThan(1e-9);
    expect(Math.abs(m2Star.im - m2Closed.im)).toBeLessThan(1e-9);
    const ratio = complexDiv(m1Star, b1Star);
    expect(Math.abs(ratio.im)).toBeLessThan(1e-9);
    expect(ratio.re).toBeGreaterThan(0.5);
    expect(ratio.re).toBeLessThan(1);
  });

  it("places M₂* on B₁* → ζ, nearer B₁* than ζ", () => {
    const { zeta, b1Star } = calcB1Star(0.5, 30);
    const { m1Star, m2Star } = calcMStar(0.5, 30);
    const b2Star = complexSub(zeta, b1Star);
    const frac = complexDiv(complexSub(m2Star, b1Star), b2Star);
    expect(Math.abs(frac.im)).toBeLessThan(1e-9);
    expect(frac.re).toBeGreaterThan(0);
    expect(frac.re).toBeLessThan(0.5);
    expect(complexAbs(complexSub(m2Star, b1Star)))
      .toBeLessThan(complexAbs(complexSub(zeta, m2Star)));
    expect(Math.abs(
      complexAbs(complexSub(m1Star, b1Star)) - complexAbs(complexSub(m2Star, b1Star)),
    )).toBeLessThan(1e-6);
  });
});

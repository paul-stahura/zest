import { complexAbs, complexAdd, complexSub } from "@/shared/math/complex";
import { calcRightAnglePoint } from "@/shared/math/rightAnglePoint";
import { calcForwardSum, calcInverseSum, calcRps1, calcRps2 } from "@/shared/math/sumRemainders";

describe("calcRightAnglePoint", () => {
  it("makes a right angle origin → T_right → ζ on the critical line", () => {
    const { point } = calcRightAnglePoint(0.5, 6.18);
    const sum1 = calcForwardSum(0.5, 6.18);
    const sum2 = calcInverseSum(0.5, 6.18);
    const r1 = calcRps1(0.5, 6.18);
    const r2 = calcRps2(0.5, 6.18);
    const zeta = complexAdd(complexAdd(sum1, sum2), complexAdd(r1, r2));
    const toZeta = complexSub(zeta, point);
    const dot = point.re * toZeta.re + point.im * toZeta.im;
    const scale = complexAbs(point) * complexAbs(toZeta);
    expect(Math.abs(dot)).toBeLessThan(1e-8 * Math.max(scale, 1));
  });

  it("lies on the first-leg ray through B₁ = Σ₁ + R₁", () => {
    const { point, b1 } = calcRightAnglePoint(0.5, 6.18);
    const cross = b1.re * point.im - b1.im * point.re;
    expect(Math.abs(cross)).toBeLessThan(1e-10 * (complexAbs(b1) + 1));
  });

  it("equals B₁ (1 + cos ϑ₂)", () => {
    const { point, b1, theta2 } = calcRightAnglePoint(0.3, 6.18);
    const scale = 1 + Math.cos(theta2);
    expect(Math.abs(point.re - b1.re * scale)).toBeLessThan(1e-12);
    expect(Math.abs(point.im - b1.im * scale)).toBeLessThan(1e-12);
  });
});

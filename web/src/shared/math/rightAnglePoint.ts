import {
  complex,
  complexAdd,
  complexArg,
  complexDiv,
  complexMul,
  type Complex,
} from "@/shared/math/complex";
import {
  calcForwardSum,
  calcInverseSum,
  calcRps1,
  calcRps2,
} from "@/shared/math/sumRemainders";

/** Right-angle vertex of the ps-split triangle, plus the pieces that built it. */
export type RightAngleSplit = {
  point: Complex;
  b1: Complex;
  theta2: number;
};

/**
 * Right-angle point T_right(σ, T) of the partial-summand split.
 *
 * The first-leg meeting point is B₁ = Σ₁ + R₁, the second leg is
 * B₂ = Σ₂ + R₂, and ϑ₂ = arg(B₂/B₁) is the fold at B₁. Scaling B₁ by
 * the real factor 1 + cos(ϑ₂) lands on the Thales circle through the
 * origin and ζ = B₁ + B₂ exactly when the legs are equal (σ = 1/2):
 * the angle origin → T_right → ζ is then a right angle. This is the
 * Unity `BisectorPoint.RightAngleVertex` formula, written at a general
 * σ. Off the line the same expression is still the point on the first-leg
 * ray at that scale; the angle is no longer exactly π/2.
 *
 * The user's (Σ₂ + R₁) form is the same first-leg point only if those
 * two vectors coincide; the geometric right-angle vertex is the multiple
 * of B₁, so that is what is returned.
 *
 * Execution flow:
 * 1. Build the ps split B₁ = Σ₁+R₁, B₂ = Σ₂+R₂ at (σ, T).
 * 2. Read ϑ₂ as the directed angle from B₁ to B₂.
 * 3. Return B₁ · (1 + cos ϑ₂).
 *
 * Edge cases:
 * - B₁ = 0 leaves ϑ₂ undefined; the point is returned as 0.
 *
 * @param sigma - Real part σ of s = σ + it
 * @param index - Spiral index T (t = I(T) is computed inside the sums)
 * @returns The right-angle point and the split it came from
 */
export function calcRightAnglePoint(sigma: number, index: number): RightAngleSplit {
  const sum1 = calcForwardSum(sigma, index);
  const sum2 = calcInverseSum(sigma, index);
  const r1 = calcRps1(sigma, index);
  const r2 = calcRps2(sigma, index);
  const b1 = complexAdd(sum1, r1);
  const b2 = complexAdd(sum2, r2);
  if (b1.re === 0 && b1.im === 0) {
    return { point: complex(0, 0), b1, theta2: 0 };
  }
  const theta2 = complexArg(complexDiv(b2, b1));
  const point = complexMul(b1, complex(1 + Math.cos(theta2), 0));
  return { point, b1, theta2 };
}

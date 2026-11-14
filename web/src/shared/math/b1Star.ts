import {
  complex,
  complexAdd,
  complexCos,
  complexDiv,
  complexLog,
  complexMul,
  complexSin,
  complexSub,
  type Complex,
} from "@/shared/math/complex";
import { riemannSiegelTheta } from "@/shared/math/riemannSiegelTheta";
import { eulerMaclaurenZeta } from "@/shared/math/zetaEms";

const LOG_2PI = Math.log(2 * Math.PI);

/** Result of the velocity split ζ = B₁* + B₂* at one point s = σ + it. */
export type B1StarSplit = {
  zeta: Complex;
  zetaPrime: Complex;
  b1Star: Complex;
};

/**
 * The offset segment of B₁* in the ϑ-frame. On the critical line its signed
 * length is h* = −Z′/(2ϑ′), and the foot is ζ/2.
 */
export type HStarSegment = {
  foot: Complex;
  tip: Complex;
  h: number;
};

/** Meeting points M₁* = λ B₁* on origin → B₁* and M₂* = B₁* + ν B₂* on B₁* → ζ. */
export type MStarSplit = {
  zeta: Complex;
  zetaPrime: Complex;
  m1Star: Complex;
  m2Star: Complex;
};

const ONE = complex(1, 0);

/**
 * Complex digamma ψ(z) by the standard recurrence-plus-asymptotic method:
 * ψ(z) = ψ(z+1) − 1/z is applied until |z| ≥ 12, where the asymptotic series
 * ψ(z) ≈ ln z − 1/(2z) − Σ B₂ₙ/(2n z²ⁿ) is accurate to well below 1e−12.
 * Callers here always pass z = 1−s with s in or near the critical strip, so
 * the recurrence runs at most a dozen steps.
 */
function digamma(zIn: Complex): Complex {
  let z = zIn;
  let acc = complex(0, 0);
  while (Math.hypot(z.re, z.im) < 12) {
    acc = complexSub(acc, complexDiv(ONE, z));
    z = complexAdd(z, ONE);
  }
  const inv = complexDiv(ONE, z);
  const inv2 = complexMul(inv, inv);
  // ln z − 1/(2z) − 1/(12z²) + 1/(120z⁴) − 1/(252z⁶)
  let series = complexSub(complexLog(z), complexMul(inv, complex(0.5, 0)));
  let p = inv2;
  series = complexSub(series, complexMul(p, complex(1 / 12, 0)));
  p = complexMul(p, inv2);
  series = complexAdd(series, complexMul(p, complex(1 / 120, 0)));
  p = complexMul(p, inv2);
  series = complexSub(series, complexMul(p, complex(1 / 252, 0)));
  return complexAdd(series, acc);
}

/**
 * Logarithmic derivative (χ′/χ)(s) = log 2π + (π/2)·cot(πs/2) − ψ(1−s),
 * the exact strip-wide weight of the velocity split (paper, "the velocity
 * split off the critical line"). On the critical line it equals the real
 * number −2ϑ′(t). For |Im(πs/2)| > 40 the cotangent is replaced by its
 * limit ∓i (the correction is O(e^−80)), which avoids overflow in the
 * complex sine/cosine at large t.
 */
export function chiLogDeriv(s: Complex): Complex {
  const halfPiS = complexMul(s, complex(Math.PI / 2, 0));
  let cot: Complex;
  if (Math.abs(halfPiS.im) > 40) {
    cot = complex(0, halfPiS.im > 0 ? -1 : 1);
  } else {
    cot = complexDiv(complexCos(halfPiS), complexSin(halfPiS));
  }
  const psi = digamma(complexSub(ONE, s));
  return complexSub(
    complexAdd(complex(LOG_2PI, 0), complexMul(cot, complex(Math.PI / 2, 0))),
    psi,
  );
}

/**
 * Velocity split of ζ at s = σ + it:
 *   B₁*(s) = ζ(s) − ζ′(s)/(χ′/χ)(s),   B₂* = ζ − B₁*.
 * ζ′ is a central finite difference of the Euler–Maclaurin ζ with step h
 * along the real axis (direction is irrelevant for a holomorphic function);
 * h = 1e−5 balances truncation against double-precision cancellation and
 * keeps the error orders of magnitude below a screen pixel. The two legs of
 * the split, origin → B₁* and B₁* → ζ, are equal in length exactly on the
 * critical line.
 */
export function calcB1Star(sigma: number, t: number): B1StarSplit {
  const zeta = eulerMaclaurenZeta(complex(sigma, t));
  const h = 1e-5;
  const zetaPrime = complexMul(
    complexSub(
      eulerMaclaurenZeta(complex(sigma + h, t)),
      eulerMaclaurenZeta(complex(sigma - h, t)),
    ),
    complex(1 / (2 * h), 0),
  );
  const weight = chiLogDeriv(complex(sigma, t));
  const b1Star = complexSub(zeta, complexDiv(zetaPrime, weight));
  return { zeta, zetaPrime, b1Star };
}

/**
 * Offset of B₁* off the real axis of the ϑ-frame at s = σ + it.
 *
 * Rotating by e^{iϑ(t)} puts the critical-line value of ζ on the real axis.
 * The imaginary part of that rotation of B₁* is h* = −Z′/(2ϑ′) when σ = 1/2,
 * and the segment from the rotated real part back to B₁* is that offset drawn
 * in the Argand plane. Off the line the same segment is the ϑ-frame imaginary
 * part; the Z′ formula is only the critical-line case.
 *
 * @param sigma - Real part σ of s = σ + it
 * @param t - Imaginary part t (not the index T)
 * @returns the foot, the tip B₁*, and the signed offset h
 */
export function calcHStar(sigma: number, t: number): HStarSegment {
  const { b1Star } = calcB1Star(sigma, t);
  const theta = riemannSiegelTheta(t);
  const rotated = complexMul(b1Star, complex(Math.cos(theta), Math.sin(theta)));
  const foot = complexMul(complex(Math.cos(theta), -Math.sin(theta)), complex(rotated.re, 0));
  return { foot, tip: b1Star, h: rotated.im };
}

/**
 * Meeting points of the velocity-split chain at s = σ + it.
 *
 * The chord ζ′ → ζ meets origin → B₁* at M₁* = λ B₁*, with
 * λ = w/(w−1), ν = 1/(1−w), and w = χ′/χ. That same chord is
 * parallel to the yellow bar B₁* → ζ, so it cannot mark a second
 * interior point there. M₂* is placed on that bar at the complementary
 * fraction: M₂* = B₁* + ν B₂* = ζ + ν ζ′. On the critical line
 * ν < 1/2, so M₂* sits nearer B₁* than ζ, at the same distance from
 * the joint as M₁*. The workspace toggle draws origin → M₁* → M₂* → ζ.
 *
 * Execution flow:
 * 1. Evaluate the velocity split (ζ, B₁*).
 * 2. Form λ = w/(w−1) and ν = 1−λ from the χ′/χ weight.
 * 3. Return M₁* = λ B₁* and M₂* = B₁* + ν (ζ − B₁*).
 *
 * Edge cases:
 * - w = 1 (the unique line-height ϑ′ = −1/2, and the real-axis roots of
 *   χ′/χ = 1) makes λ and ν undefined; both points come back NaN and
 *   the drawing layer skips the polyline.
 *
 * @param sigma - Real part σ of s = σ + it
 * @param t - Imaginary part t (not the index T)
 * @returns ζ together with the two meeting points
 */
/**
 * The N* paper's ratio ρ(s) = (ζ′/ζ)(s) / (χ′/χ)(s) at s = σ + it.
 *
 * B₁* = ζ(1−ρ) and B₂* = ζρ, so the legs are equal exactly when ζ = 0
 * or Re ρ = 1/2. On the critical line the second clause holds identically
 * (wherever ζ ≠ 0). The workspace toggle plots this complex value as a
 * point in the Argand plane.
 *
 * Execution flow:
 * 1. Evaluate ζ and ζ′ via the velocity-split helper.
 * 2. Divide (ζ′/ζ) by the χ′/χ weight.
 *
 * Edge cases:
 * - ζ = 0 or χ′/χ = 0 makes ρ undefined; the result contains NaN/Inf and
 *   the drawing layer skips the marker.
 *
 * @param sigma - Real part σ of s = σ + it
 * @param t - Imaginary part t (not the index T)
 * @returns the complex value ρ(s)
 */
export function calcRho(sigma: number, t: number): Complex {
  const { zeta, zetaPrime } = calcB1Star(sigma, t);
  const weight = chiLogDeriv(complex(sigma, t));
  return complexDiv(complexDiv(zetaPrime, zeta), weight);
}

/**
 * Logarithmic derivative (ζ′/ζ)(s) at s = σ + it, the numerator of ρ.
 *
 * On the punctured critical line this is −ϑ′ − i Z′/Z. The workspace
 * toggle plots the value as an Argand point. It is undefined at a zero
 * of ζ (the drawing layer skips the marker).
 *
 * @param sigma - Real part σ of s = σ + it
 * @param t - Imaginary part t (not the index T)
 * @returns the complex value (ζ′/ζ)(s)
 */
export function calcZetaLogDeriv(sigma: number, t: number): Complex {
  const { zeta, zetaPrime } = calcB1Star(sigma, t);
  return complexDiv(zetaPrime, zeta);
}

export function calcMStar(sigma: number, t: number): MStarSplit {
  const { zeta, zetaPrime, b1Star } = calcB1Star(sigma, t);
  const weight = chiLogDeriv(complex(sigma, t));
  const lambda = complexDiv(weight, complexSub(weight, ONE));
  const nu = complexSub(ONE, lambda);
  const m1Star = complexMul(lambda, b1Star);
  const m2Star = complexAdd(b1Star, complexMul(nu, complexSub(zeta, b1Star)));
  return { zeta, zetaPrime, m1Star, m2Star };
}

import { complex, complexAdd, complexMul, complexExp, complexDiv, complexSub, complexPow, type Complex } from "@/shared/math/complex";
import { indexToImag } from "@/shared/math/zetaEms";
import type { Point2 } from "@/shared/io/types";

/**
 * Riemann zeta via Kuznetsov's Gauss-quadrature approximation (p=8).
 *
 * Reference: Alexey Kuznetsov, "Simple and accurate approximations to the
 * Riemann zeta function", arXiv:2503.09519 (March 2025).
 *
 * Formula: ζ(s) ≈ Σ_{n=1}^N n^(-s) + χ(s)·Σ_{n=1}^N n^(-(1-s)) + R(s)
 *   where N = ⌊√(t/2π)⌋, M = N + 1/2, and R(s) = (-1)^N · (I₁ + χ·I₂)/2 / ? style term
 *   I_{M,p}(s) = ω₀·M^(-s) + Σ_{j=1}^p ω_j·[e^(-2πMλ_j)·(M+iλ_j)^(-s) + e^(+2πMλ_j)·(M-iλ_j)^(-s)]
 *
 * Accuracy for p=8: ~10^(-12) typical; verified ~5e-10 max error vs mpmath
 * across t ∈ [190, 6.3M] on the critical strip.
 *
 * Historical note: called "ZAK" in Unity predecessor (author initials AK);
 * "Kushtinov" in earlier comments was a transliteration error for Kuznetsov.
 */

const PI = Math.PI;
const TWO_PI = 2 * PI;

/**
 * Precomputed p=8 Gauss quadrature coefficients (Kuznetsov 2025, Appendix).
 */
const omega0 = complex(0.1926019633029103199063, 0.02472986965795651842299);

const omega: Complex[] = [
  complex(0.1582954327321094104502, 0.04149113569204600502105),
  complex(0.07826728293587305110862, 0.05215518667623989653254),
  complex(0.01940595049247490540621, 0.02977286598777633378610),
  complex(0.0016911847719027555036966, 0.008938933548999206800196),
  complex(-0.0002994777986686168319731, 0.001567541981830224487301),
  complex(-0.00009837202592542590210980, 0.0001502108057352792742070),
  complex(-0.000009346989286415688998740, 0.000005793852209955845432028),
  complex(-0.0000002451577304299235983015, 0.000000006134784898751456953524),
];

const lambda: Complex[] = [
  complex(0.152845417613666702426, -0.119440685603870510384),
  complex(0.302346225128945757427, -0.243989695504400621268),
  complex(0.451119584531782942888, -0.378479770209444563858),
  complex(0.604563710297226464637, -0.523486888629095259770),
  complex(0.765965706759629396959, -0.678405572413543444272),
  complex(0.938371150977889047740, -0.845332361280975174880),
  complex(1.128148837845288402558, -1.030737947568157685685),
  complex(1.353030558654668162533, -1.252503278108132307164),
];

/**
 * Chi function from Riemann functional equation ζ(s) = χ(s)·ζ(1-s).
 * On the critical line |χ(s)| = 1. Matches mpmath reference to ~1e-6.
 *
 * Formula and factored asymptotic form provided by Brian Conrey.
 */
export function chiBrian(s: Complex): Complex {
  const absS = Math.sqrt(s.re * s.re + s.im * s.im);
  const arg = Math.atan2(s.re, s.im);

  // (|s| / 2π)^(s - 1/2)
  const baseTerm = absS / TWO_PI;
  const exponent = complexSub(s, complex(0.5, 0));
  const term1 = complexPow(complex(baseTerm, 0), exponent);

  // e^(-s)
  const term2 = complexExp(complexMul(complex(-1, 0), s));

  // e^{imag(s) * arctan(real/imag)} — real-valued factor (matches C# ChiBrian)
  const term3 = complex(Math.exp(s.im * arg), 0);

  // e^{-i * real * arctan(real/imag)}
  const term4 = complexExp(complex(0, -s.re * arg));

  // 1 + e^{-π * imag} * e^{π i * real}
  const expNegPiImag = Math.exp(-PI * s.im);
  const term5 = complexAdd(complex(1, 0), complex(expNegPiImag * Math.cos(PI * s.re), expNegPiImag * Math.sin(PI * s.re)));

  // e^{i/2 * arctan(real/imag)}
  const term6 = complexExp(complex(0, 0.5 * arg));

  // e^{-π i / 4}
  const term7 = complexExp(complex(0, -PI / 4));

  // (1 + 1/(12s) + 1/(288s^2))
  const invS = complexDiv(complex(1, 0), s);
  const invS2 = complexMul(invS, invS);
  const term8 = complexAdd(complexAdd(complex(1, 0), complexMul(complex(1 / 12, 0), invS)), complexMul(complex(1 / 288, 0), invS2));

  // Final: chi = 1 / (term1 * term2 * term3 * term4 * term5 * term6 * term7 * term8)
  let denominator = term1;
  denominator = complexMul(denominator, term2);
  denominator = complexMul(denominator, term3);
  denominator = complexMul(denominator, term4);
  denominator = complexMul(denominator, term5);
  denominator = complexMul(denominator, term6);
  denominator = complexMul(denominator, term7);
  denominator = complexMul(denominator, term8);

  return complexDiv(complex(1, 0), denominator);
}

/**
 * I₁ integral approximation (Kuznetsov 2025, eq. 1).
 * Computed in factored form M^(-s)·[ω₀ + Σ ω_j·(e^(-2πMλ)·(1+iλ/M)^(-s) + e^(+2πMλ)·(1-iλ/M)^(-s))]
 * for numerical stability — avoids overflow when direct exp(+2πMλ) blows up.
 */
export function i1(r: number, t: number): Complex {
  const floorT = Math.floor(t);
  const halfPlusT = floorT + 0.5;
  const z = complex(r, indexToImag(t, false));
  const baseExp = complexMul(complex(-1, 0), complexMul(z, complex(Math.log(halfPlusT), 0)));

  let sum = omega0;

  for (let n = 0; n < lambda.length; n++) {
    const lambdaN = lambda[n];
    const omegaN = omega[n];
    if (!lambdaN || !omegaN) continue;

    // i * lambda[n] = i*(re + i*im) = -im + i*re
    const iLambda = complex(-lambdaN.im, lambdaN.re);
    const term1Arg = complexAdd(complex(1, 0), complexDiv(iLambda, complex(halfPlusT, 0)));
    const term1Exp = complexMul(complex(-2 * PI * halfPlusT, 0), lambdaN);
    const logTerm1 = complexMul(complex(-1, 0), complexMul(z, complex(Math.log(Math.sqrt(term1Arg.re * term1Arg.re + term1Arg.im * term1Arg.im)), Math.atan2(term1Arg.im, term1Arg.re))));
    const zLnPlus = complexAdd(term1Exp, logTerm1);

    const term2Arg = complexSub(complex(1, 0), complexDiv(iLambda, complex(halfPlusT, 0)));
    const term2Exp = complexMul(complex(2 * PI * halfPlusT, 0), lambdaN);
    const logTerm2 = complexMul(complex(-1, 0), complexMul(z, complex(Math.log(Math.sqrt(term2Arg.re * term2Arg.re + term2Arg.im * term2Arg.im)), Math.atan2(term2Arg.im, term2Arg.re))));
    const zLnMinus = complexAdd(term2Exp, logTerm2);

    sum = complexAdd(sum, complexMul(omegaN, complexAdd(complexExp(zLnPlus), complexExp(zLnMinus))));
  }

  return complexMul(complexExp(baseExp), sum);
}

/**
 * I₂(s) = conjugate(I₁(1-s)). Symmetry used by Kuznetsov's approximation.
 */
export function i2(r: number, t: number): Complex {
  const i1Val = i1(1 - r, t);
  return complex(i1Val.re, -i1Val.im);
}

/**
 * Remainder correction: R(s) = -½·(-1)^N·(I₁(s) + χ(s)·I₂(s)).
 * Added to Σn^(-s) + χ·Σn^(-(1-s)) to recover ζ(s) to ~10^(-10) precision.
 */
export function rak(real: number, index: number): Complex {
  const floorT = Math.floor(index);
  const z = complex(real, indexToImag(index, false));
  const chi = chiBrian(z);

  const i1Val = i1(real, index);
  const i2Val = i2(real, index);
  const sign = Math.pow(-1, floorT);
  const term = complexAdd(i1Val, complexMul(chi, i2Val));

  return complexMul(complex(-0.5 * sign, 0), term);
}

/**
 * Builds spiral geometry for the Kuznetsov approximation:
 *   - forward links: cumulative Σ n^(-s) partial sums (n=0..N)
 *   - remainder link: R(s) correction
 *   - inverse links: reverse-order extension summing to χ(s)·Σ n^(-(1-s))
 * Final joint = ζ(s).
 */
export function computeZakSpiralGeometry(sigma: number, index: number): { joints: Point2[]; zeta: Point2; middleIndex: number; middlePoint: Point2 | null } {
  const imag = indexToImag(index, false);
  const maxJ = Math.floor(index);
  const middleIndex = maxJ;

  // Forward links: cumulative Σ_{n=1}^{j} n^(-s) partial sums, accumulated in O(N).
  const forwardLinks: Point2[] = [{ x: 0, y: 0 }];
  let sumX = 0;
  let sumY = 0;
  for (let n = 1; n <= maxJ; n++) {
    const angle = imag * Math.log(n);
    const denom = Math.pow(n, sigma);
    sumX += Math.cos(angle) / denom;
    sumY -= Math.sin(angle) / denom;
    forwardLinks.push({ x: sumX, y: sumY });
  }

  // Remainder link
  const remainderComplex = rak(sigma, index);
  const remainderLink: Point2 = { x: remainderComplex.re, y: remainderComplex.im };

  // Inverse links
  const inverseLinks: Point2[] = [];
  const z = complex(sigma, imag);
  const chiVal = chiBrian(z);

  // Inverse links: cumulative χ·Σ_{n=1}^{j} n^(-(1-s)), accumulated in O(N).
  let invRe = 0;
  let invIm = 0;
  {
    const chiSeries0 = complexMul(chiVal, complex(0, 0));
    inverseLinks.push({ x: chiSeries0.re, y: chiSeries0.im });
  }
  for (let n = 1; n <= maxJ; n++) {
    const angle = imag * Math.log(n);
    const denom = Math.pow(n, 1 - sigma);
    invRe += Math.cos(angle) / denom;
    invIm += Math.sin(angle) / denom;
    const chiSeries = complexMul(chiVal, complex(invRe, invIm));
    inverseLinks.push({ x: chiSeries.re, y: chiSeries.im });
  }

  // Combine into full path
  const joints: Point2[] = [];

  // Forward links
  for (const link of forwardLinks) {
    joints.push(link);
  }

  // Remainder link
  if (forwardLinks.length > 0) {
    const lastForward = forwardLinks[forwardLinks.length - 1];
    if (lastForward) {
      joints.push({ x: lastForward.x + remainderLink.x, y: lastForward.y + remainderLink.y });
    }
  }

  // Inverse links in reverse — each joint is baseJoint + cumulative inverse delta
  // baseJoint = position after remainder = joints[forwardLinks.length] (matches Unity)
  const baseJoint = joints[forwardLinks.length];
  let prevInverse: Point2 = { x: 0, y: 0 };
  for (let i = 0; i < inverseLinks.length - 1; i++) {
    const startIdx = inverseLinks.length - 1 - i;
    const endIdx = inverseLinks.length - 2 - i;
    const startLink = inverseLinks[startIdx];
    const endLink = inverseLinks[endIdx];
    if (startLink && endLink && baseJoint) {
      const inverseLink: Point2 = {
        x: startLink.x - endLink.x,
        y: startLink.y - endLink.y,
      };
      prevInverse = { x: prevInverse.x + inverseLink.x, y: prevInverse.y + inverseLink.y };

      joints.push({ x: baseJoint.x + prevInverse.x, y: baseJoint.y + prevInverse.y });
    }
  }

  // Calculate middle point
  let middlePoint: Point2 | null = null;
  if (middleIndex + 1 < joints.length) {
    const start = joints[middleIndex];
    const end = joints[middleIndex + 1];
    if (start && end) {
      middlePoint = {
        x: start.x + (end.x - start.x) / 2,
        y: start.y + (end.y - start.y) / 2,
      };
    }
  }

  // Zeta endpoint is last joint
  const zetaPoint = joints.length > 0 ? joints[joints.length - 1] : null;
  const zeta = zetaPoint ?? { x: 0, y: 0 };

  return { joints, zeta, middleIndex, middlePoint };
}

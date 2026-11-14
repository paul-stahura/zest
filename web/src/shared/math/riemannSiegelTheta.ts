import {
  complex,
  complexAdd,
  complexDiv,
  complexLog,
  complexMul,
  complexSub,
  type Complex,
} from "@/shared/math/complex";

const LOG_2PI = Math.log(2 * Math.PI);
const LOG_PI = Math.log(Math.PI);

// Lanczos coefficients for g = 7 (Numerical Recipes / Wikipedia). Accurate to
// about 1e−15 on Re z > 0, which is the half-plane the reflection below lands in.
const LANCZOS_G = 7;
const LANCZOS_P = [
  0.99999999999980993,
  676.5203681218851,
  -1259.1392167224028,
  771.32342877765313,
  -176.61502916214059,
  12.507343278686905,
  -0.13857109526572012,
  9.9843695780195716e-6,
  1.5056327351493116e-7,
] as const;

/**
 * log Γ(z) for Re z ≥ 1/2. The argument is shifted by −1 to match the g=7
 * series, which approximates Γ(z) after that shift.
 */
function logGammaRightHalf(zIn: Complex): Complex {
  const z = complexSub(zIn, complex(1, 0));
  let acc = complex(LANCZOS_P[0], 0);
  for (let i = 1; i < LANCZOS_P.length; i += 1) {
    acc = complexAdd(acc, complexDiv(complex(LANCZOS_P[i] ?? 0, 0), complexAdd(z, complex(i, 0))));
  }
  const t = complexAdd(z, complex(LANCZOS_G + 0.5, 0));
  const zPlusHalf = complexAdd(z, complex(0.5, 0));
  return complexAdd(
    complexSub(complexAdd(complex(0.5 * LOG_2PI, 0), complexLog(acc)), t),
    complexMul(zPlusHalf, complexLog(t)),
  );
}

/**
 * Imaginary part of log sin(π(1/4 + i t/2)) for t ≥ 0.
 * sin(π/4 + i y) = e^y · (√2/4) · ((1+e^{−2y}) + i(1−e^{−2y})), y = π t/2,
 * and the real prefactor does not contribute to the argument.
 */
function imagLogSinQuarter(t: number): number {
  const y = (Math.PI * t) / 2;
  const e2 = Math.exp(-2 * y);
  return Math.atan2(1 - e2, 1 + e2);
}

/**
 * Riemann–Siegel theta ϑ(t) = Im log Γ(1/4 + i t/2) − (t/2) log π.
 *
 * Multiplication by e^{iϑ(t)} is the rotation that puts ζ(1/2+it) on the real
 * axis, because Z(t) = e^{iϑ(t)} ζ(1/2+it) is real. Γ(1/4+it/2) has real part
 * 1/4, so the reflection Γ(z)Γ(1−z) = π/sin(πz) moves the log-gamma evaluation
 * into Re w = 3/4, where the Lanczos series applies directly. ϑ is an odd
 * function, so t < 0 is reduced to the positive side.
 */
export function riemannSiegelTheta(t: number): number {
  if (!Number.isFinite(t) || t === 0) return 0;
  if (t < 0) return -riemannSiegelTheta(-t);
  const logGammaOneMinus = logGammaRightHalf(complex(0.75, -t / 2));
  const imagLogGamma = -imagLogSinQuarter(t) - logGammaOneMinus.im;
  return imagLogGamma - (t / 2) * LOG_PI;
}

import {
  complex,
  complexMul,
  complexAbs,
  complexArg,
  complexDiv,
  complexExp,
  type Complex,
} from "@/shared/math/complex";
import { indexToImag } from "@/shared/math/zetaEms";
import { i1, i2, rak, chiBrian } from "@/shared/math/zakCalculator";

/**
 * Forward partial sum Σ_{n=1}^{floor(index)} n^(-s).
 * Matches Unity SumRemainders.CalcForwardSumUpToBisector.
 */
export function calcForwardSum(real: number, index: number): Complex {
  const t = indexToImag(index, false);
  const floorN = Math.floor(index);
  let re = 0, im = 0;
  for (let n = 1; n <= floorN; n++) {
    const angle = t * Math.log(n);
    const denom = Math.pow(n, real);
    re += Math.cos(angle) / denom;
    im -= Math.sin(angle) / denom;
  }
  return complex(re, im);
}

/**
 * Inverse partial sum χ(s)·Σ_{n=1}^{floor(index)} n^(s-1).
 * Matches Unity SumRemainders.CalcInverseSumUpToBisector.
 */
export function calcInverseSum(real: number, index: number): Complex {
  const t = indexToImag(index, false);
  const s = complex(real, t);
  const chi = chiBrian(s);
  const floorN = Math.floor(index);
  let re = 0, im = 0;
  for (let n = 1; n <= floorN; n++) {
    const angle = t * Math.log(n);
    const r = Math.pow(n, real - 1);
    re += r * Math.cos(angle);
    im += r * Math.sin(angle);
  }
  return complexMul(chi, complex(re, im));
}

/** omega = t·ln(⌈index⌉), used in Rps formulas. */
function omega(index: number): number {
  return indexToImag(index, false) * Math.log(Math.ceil(index));
}

/**
 * Rps remainder R1: trigonometric split of Rak.
 * Matches Unity SumRemainders.CalcRps1.
 */
export function calcRps1(real: number, index: number): Complex {
  const t = indexToImag(index, false);
  const R = rak(real, index);
  const w = omega(index);
  const chi = chiBrian(complex(real, t));
  const argChi = complexArg(chi);
  const argR = complexArg(R);
  const magR = complexAbs(R);

  const den = Math.sin(2 * w + argChi);
  if (Math.abs(den) < 1e-12) return complex(0, 0);

  const num = Math.sin(w - argR + argChi);
  const N = Math.floor(index + 1);
  const scalar = complexExp(complex(0, -t * Math.log(N)));

  return complexMul(complex(magR * num / den, 0), scalar);
}

/**
 * Rps remainder R2.
 * Matches Unity SumRemainders.CalcRps2.
 */
export function calcRps2(real: number, index: number): Complex {
  const t = indexToImag(index, false);
  const R = rak(real, index);
  const w = omega(index);
  const chi = chiBrian(complex(real, t));
  const argChi = complexArg(chi);
  const argR = complexArg(R);
  const magR = complexAbs(R);
  const magChi = complexAbs(chi);

  const den = Math.sin(2 * w + argChi);
  if (Math.abs(den) < 1e-12) return complex(0, 0);

  const num = Math.sin(w + argR);
  const N = Math.floor(index + 1);
  const scalarPhase = complexExp(complex(0, t * Math.log(N)));
  const chiUnit = magChi > 1e-15 ? complexDiv(chi, complex(magChi, 0)) : complex(1, 0);
  const scalar = complexMul(scalarPhase, chiUnit);

  return complexMul(complex(magR * num / den, 0), scalar);
}

/**
 * Rak remainder R1 = -0.5·(-1)^floor(index)·I1(real, index).
 * Matches Unity SumRemainders.CalcRak1.
 */
export function calcRak1(real: number, index: number): Complex {
  const sign = Math.pow(-1, Math.floor(index));
  const i1Val = i1(real, index);
  return complexMul(complex(-0.5 * sign, 0), i1Val);
}

/**
 * Rak remainder R2 = -0.5·(-1)^floor(index)·I2(real, index)·chi(s).
 * Matches Unity SumRemainders.CalcRak2.
 */
export function calcRak2(real: number, index: number): Complex {
  const t = indexToImag(index, false);
  const sign = Math.pow(-1, Math.floor(index));
  const i2Val = i2(real, index);
  const chi = chiBrian(complex(real, t));
  return complexMul(complex(-0.5 * sign, 0), complexMul(i2Val, chi));
}

/**
 * R/2 remainder = rak(real, index) / 2.
 * Matches Unity SumRemainderRenderer.UpdateR (when Rak is not active).
 */
export function calcRHalf(real: number, index: number): Complex {
  const R = rak(real, index);
  return complex(R.re / 2, R.im / 2);
}

/** Path range values for index sweeps indexed by pathIndex option (0–3). */
export const PATH_RANGES = [0, 0.01, 0.1, 0.5] as const;

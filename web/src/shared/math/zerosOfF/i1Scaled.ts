import {
  KUZNETSOV_TERM_COUNT,
  LAMBDA_IM,
  LAMBDA_RE,
  OMEGA0,
  OMEGA1_IM,
  OMEGA1_RE,
} from "./coefficients";
import { iOfT } from "./iOfT";

/**
 * Vectorized scaled I₁ — returns `t^σ · I₁(σ, t)` for each `t` in the input
 * array. Output is interleaved `[re, im, re, im, ...]` Float64Array.
 *
 * Direct port of the Numba kernel `_i1_kernel` in `formulas_v3speed.py`.
 * Includes the same overflow guard: clips the exponent of each of the eight
 * series terms so that `pref_mag · exp(e)` stays within `float64` range.
 *
 * @param sigma — real part of `s`. Negative for canonical scans.
 * @param tArr — t values, each must satisfy `t > 0`.
 */
export function i1Scaled(sigma: number, tArr: Float64Array): Float64Array {
  const nT = tArr.length;
  const out = new Float64Array(nT * 2);
  const omega0Re = OMEGA0[0];
  const omega0Im = OMEGA0[1];

  for (let j = 0; j < nT; j++) {
    const tJ = tArr[j]!;
    const itJ = iOfT(tJ);
    const mJ = Math.floor(tJ) + 0.5;
    const prefArgRe = sigma * Math.log(tJ / mJ);
    const prefArgIm = -itJ * Math.log(mJ);
    const prefMag = Math.exp(prefArgRe);
    const prefRe = prefMag * Math.cos(prefArgIm);
    const prefIm = prefMag * Math.sin(prefArgIm);

    const sRe = sigma;
    const sIm = itJ;
    let aRe = omega0Re;
    let aIm = omega0Im;

    for (let k = 0; k < KUZNETSOV_TERM_COUNT; k++) {
      const lr = LAMBDA_RE[k]!;
      const li = LAMBDA_IM[k]!;
      const wr = OMEGA1_RE[k]!;
      const wi = OMEGA1_IM[k]!;

      const lmRe = lr / mJ;
      const lmIm = li / mJ;
      const q1r = 1 - lmIm;
      const q1i = lmRe;
      const q2r = 1 + lmIm;
      const q2i = -lmRe;

      const logQ1Re = 0.5 * Math.log(q1r * q1r + q1i * q1i);
      const logQ1Im = Math.atan2(q1i, q1r);
      const logQ2Re = 0.5 * Math.log(q2r * q2r + q2i * q2i);
      const logQ2Im = Math.atan2(q2i, q2r);

      const tpm = 2 * Math.PI * mJ;
      const baseRe = tpm * lr;
      const baseIm = tpm * li;

      const sl1Re = sRe * logQ1Re - sIm * logQ1Im;
      const sl1Im = sRe * logQ1Im + sIm * logQ1Re;
      const sl2Re = sRe * logQ2Re - sIm * logQ2Im;
      const sl2Im = sRe * logQ2Im + sIm * logQ2Re;

      let e1r = -baseRe - sl1Re;
      const e1i = -baseIm - sl1Im;
      let e2r = baseRe - sl2Re;
      const e2i = baseIm - sl2Im;

      const cap = 700 - prefArgRe;
      if (e1r > cap) e1r = cap;
      if (e2r > cap) e2r = cap;

      const ex1 = Math.exp(e1r);
      const ex2 = Math.exp(e2r);
      const sumRe = ex1 * Math.cos(e1i) + ex2 * Math.cos(e2i);
      const sumIm = ex1 * Math.sin(e1i) + ex2 * Math.sin(e2i);

      aRe += wr * sumRe - wi * sumIm;
      aIm += wr * sumIm + wi * sumRe;
    }

    out[j * 2] = prefRe * aRe - prefIm * aIm;
    out[j * 2 + 1] = prefRe * aIm + prefIm * aRe;
  }
  return out;
}

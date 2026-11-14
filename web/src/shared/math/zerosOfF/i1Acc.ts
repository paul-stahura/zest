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
 * Bounded accumulator factor used by the R₁ overflow-safe path.
 *
 * Equivalent to `OMEGA0 + Σ ω_k·(exp(e1) + exp(e2))` where
 *   `e1 = -2π·m·λ − s·log(1 + iλ/m)`,
 *   `e2 =  2π·m·λ − s·log(1 − iλ/m)`,
 * matching `_I1_acc_vec` in `formulas_v3speed.py`. Magnitude stays around
 * `|OMEGA0|` regardless of σ or t — that's the invariant we rely on for the
 * `log_A` recombination in `r1Scaled` to stay finite.
 *
 * Output: interleaved Float64Array `[re, im, ...]` of length `2 * t.length`.
 */
export function i1AccVec(sigma: number, tArr: Float64Array): Float64Array {
  const nT = tArr.length;
  const out = new Float64Array(nT * 2);

  for (let j = 0; j < nT; j++) {
    const tJ = tArr[j]!;
    const itJ = iOfT(tJ);
    const mJ = Math.floor(tJ) + 0.5;
    const sRe = sigma;
    const sIm = itJ;
    let aRe = OMEGA0[0];
    let aIm = OMEGA0[1];

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

      // Cap to keep exp finite; same semantic as i1Scaled but no pref factor.
      if (e1r > 700) e1r = 700;
      if (e2r > 700) e2r = 700;

      const ex1 = Math.exp(e1r);
      const ex2 = Math.exp(e2r);
      const sumRe = ex1 * Math.cos(e1i) + ex2 * Math.cos(e2i);
      const sumIm = ex1 * Math.sin(e1i) + ex2 * Math.sin(e2i);

      aRe += wr * sumRe - wi * sumIm;
      aIm += wr * sumIm + wi * sumRe;
    }

    out[j * 2] = aRe;
    out[j * 2 + 1] = aIm;
  }
  return out;
}

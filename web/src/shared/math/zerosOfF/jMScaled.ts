import { iOfT } from "./iOfT";
import {
  R1NAK_C_IM,
  R1NAK_C_RE,
  R1NAK_LAMBDA_IM,
  R1NAK_LAMBDA_RE,
  R1NAK_TERM_COUNT,
} from "./r1nakCoefficients";

const TWO_PI = 2 * Math.PI;

/**
 * Vectorized negative-t remainder term (R1nak). Returns, for each scan
 * parameter `T` in `tArr`, the interleaved `[re, im, ...]` value of
 *
 *     t^σ · e^{−π·I(T)/2} · (−i)^{−s}/2 · J_M(s),
 *
 * with `s = σ − i·I(T)`, `N = ⌊T⌋`, `M = N + ½`, and
 *     J_M(s) = Σ_j C_j · e^{2πM(λ_j − ½)} · (M + i·λ_j)^{−s}.
 *
 * This is the second term of the negative-t `f(s) = Σ_{n≤N} n^{−s} + R1nak`.
 * The leading `(−i)^{−s}` factor has magnitude `e^{π·I(T)/2}` (astronomically
 * large — Brian's regime), which the paired `e^{−π·I(T)/2}` scalar cancels
 * exactly, so the returned value stays O(1) (Brian's "z" scale) and never
 * overflows. Every term is accumulated through its logarithm (paper Appendix
 * B) so the huge intermediate never forms in memory. Mirrors `i1Scaled.ts` in
 * structure and overflow handling; consumes `r1nakCoefficients.ts` the way
 * `i1Scaled.ts` consumes `coefficients.ts`.
 *
 * The `t^σ · e^{−π·I(T)/2}` scaling is a nonzero real scalar, so the zeros of
 * the scaled `f` coincide exactly with the zeros of `f` itself.
 *
 * @param sigma — real part of `s` (≤ 0 for the canonical scans).
 * @param tArr — scan-parameter `T` values, each must satisfy `T > 0`.
 */
export function jMScaled(sigma: number, tArr: Float64Array): Float64Array {
  const nT = tArr.length;
  const out = new Float64Array(nT * 2);
  const ln2 = Math.LN2;

  for (let j = 0; j < nT; j++) {
    const tJ = tArr[j]!;
    const itJ = iOfT(tJ);
    const sRe = sigma;
    const sIm = -itJ; // s = σ − i·I(T)
    // Cutoff N = ⌊T⌋, matching the positive-t branch (sigma1Scaled/i1Scaled).
    // The exact remainder identity is N-independent, so this gives the same f
    // as the saddle-optimal ⌊√(I(T)/2π)⌋; ⌊T⌋ keeps both toggle branches on one
    // convention (verified: reconstructs the exact value to ~1e-11 off-saddle).
    const N = Math.floor(tJ);
    const M = N + 0.5;

    // Common prefactor  t^σ · e^{−πI(T)/2} · (−i)^{−s}/2  in log form.
    //   log((−i)^{−s}) = iπs/2  ⇒  Re = −π·sIm/2 = +π·I(T)/2,  Im = π·sRe/2.
    // The e^{−πI(T)/2} scalar cancels that Re part exactly (→ 0), leaving a
    // pure phase; then ·t^σ adds σ·ln(t) and /2 subtracts ln2.
    const preLogRe = sRe * Math.log(tJ) - ln2;
    const preLogIm = (Math.PI * sRe) / 2;

    let accRe = 0;
    let accIm = 0;
    for (let k = 0; k < R1NAK_TERM_COUNT; k++) {
      const lamRe = R1NAK_LAMBDA_RE[k]!;
      const lamIm = R1NAK_LAMBDA_IM[k]!;
      const cRe = R1NAK_C_RE[k]!;
      const cIm = R1NAK_C_IM[k]!;

      // w = M + i·λ = (M − λIm) + i·λRe
      const wRe = M - lamIm;
      const wIm = lamRe;
      const logWre = 0.5 * Math.log(wRe * wRe + wIm * wIm);
      const logWim = Math.atan2(wIm, wRe);

      // (−s)·log(w)
      const negSLogRe = -(sRe * logWre - sIm * logWim);
      const negSLogIm = -(sRe * logWim + sIm * logWre);

      // log(C_k)
      const logCre = 0.5 * Math.log(cRe * cRe + cIm * cIm);
      const logCim = Math.atan2(cIm, cRe);

      // log(term) = prefactor + log C + 2πM(λ−½) + (−s)·log w
      let logRe = preLogRe + logCre + TWO_PI * M * (lamRe - 0.5) + negSLogRe;
      const logIm = preLogIm + logCim + TWO_PI * M * lamIm + negSLogIm;

      if (logRe > 700) logRe = 700; // overflow guard, matches i1Scaled

      const mag = Math.exp(logRe);
      accRe += mag * Math.cos(logIm);
      accIm += mag * Math.sin(logIm);
    }

    out[j * 2] = accRe;
    out[j * 2 + 1] = accIm;
  }
  return out;
}

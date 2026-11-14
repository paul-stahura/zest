import { iOfT } from "./iOfT";

/**
 * Vectorized scaled Σ₁ — returns `t^σ · Σ_{n=1..⌊t⌋} n^{-(σ + i·I(t))}` for
 * each `t` in the input array.
 *
 * Output is an interleaved `Float64Array` of length `2 * tArr.length`; for
 * index `k`, `out[2k]` is the real part and `out[2k+1]` is the imaginary part.
 *
 * The factor `t^σ` is folded inside each term so each contribution is
 * computed as `(n / t)^|σ| ≤ 1`, which never overflows even at very large
 * `|σ|`. Direct port of the Numba kernel `_sigma1_kernel` in
 * `formulas_v3speed.py`. Precomputes a `log(n)` table so the inner loop is
 * a tight scalar SIMD-friendly sequence.
 *
 * @param tArr — t values, each must satisfy `t > 0`.
 * @param sigma — real part of `s`. Negative for the canonical scans.
 */
export function sigma1Scaled(
  tArr: Float64Array,
  sigma: number,
): Float64Array {
  const nT = tArr.length;
  const out = new Float64Array(nT * 2);
  if (nT === 0) return out;

  let nGlobal = 0;
  for (let j = 0; j < nT; j++) {
    const f = Math.floor(tArr[j]!);
    if (f > nGlobal) nGlobal = f;
  }
  if (nGlobal < 1) return out;

  const logN = new Float64Array(nGlobal);
  for (let n = 1; n <= nGlobal; n++) {
    logN[n - 1] = Math.log(n);
  }

  for (let j = 0; j < nT; j++) {
    const tJ = tArr[j]!;
    const itJ = iOfT(tJ);
    const nMax = Math.floor(tJ);
    const logTj = Math.log(tJ);
    let re = 0;
    let im = 0;
    for (let n = 1; n <= nMax; n++) {
      const lnN = logN[n - 1]!;
      const logRatio = lnN - logTj;
      const mag = Math.exp(-sigma * logRatio);
      const phase = -itJ * lnN;
      re += mag * Math.cos(phase);
      im += mag * Math.sin(phase);
    }
    out[j * 2] = re;
    out[j * 2 + 1] = im;
  }
  return out;
}

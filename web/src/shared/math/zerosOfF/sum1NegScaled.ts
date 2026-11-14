import { iOfT } from "./iOfT";

/**
 * Vectorized negative-t main sum. Returns, for each scan parameter `T`,
 * the interleaved `[re, im, ...]` value of
 *
 *     t^σ · e^{−π·I(T)/2} · Σ_{n=1..N} n^{−s},   s = σ − i·I(T),
 *
 * with the upper limit `N = ⌊T⌋`, matching the positive-t `sigma1Scaled`
 * cutoff (the exact identity is N-independent). This is the "sum1" leg of the
 * negative-t
 * `f = Σ_{n≤N} n^{−s} + R1nak`, carrying the same `t^σ · e^{−π·I(T)/2}` scale
 * as {@link jMScaled} so the two combine by a plain complex add.
 *
 * Two differences from `sigma1Scaled.ts`: (1) the phase is `+I(T)·ln n`
 * (because `n^{−s} = n^{−σ}·e^{+i·I(T)·ln n}` for `s = σ − i·I(T)`), and (2)
 * each term carries the `e^{−π·I(T)/2}` scalar folded into its magnitude.
 * For large `T` this scalar underflows the whole sum toward 0 — expected
 * (Brian's "z1 is tiny"); the `J_M` term then dominates. The `t^σ` fold keeps
 * each contribution `(n/t)^{−σ} ≤ 1`, so nothing overflows.
 *
 * @param tArr — scan-parameter `T` values, each must satisfy `T > 0`.
 * @param sigma — real part of `s` (≤ 0 for the canonical scans).
 */
export function sum1NegScaled(
  tArr: Float64Array,
  sigma: number,
): Float64Array {
  const nT = tArr.length;
  const out = new Float64Array(nT * 2);
  if (nT === 0) return out;

  const itArr = new Float64Array(nT);
  let nGlobal = 0;
  for (let j = 0; j < nT; j++) {
    itArr[j] = iOfT(tArr[j]!);
    const nMax = Math.floor(tArr[j]!); // N = ⌊T⌋
    if (nMax > nGlobal) nGlobal = nMax;
  }
  if (nGlobal < 1) return out; // every N = 0 → empty sum

  const logN = new Float64Array(nGlobal);
  for (let n = 1; n <= nGlobal; n++) {
    logN[n - 1] = Math.log(n);
  }

  for (let j = 0; j < nT; j++) {
    const tJ = tArr[j]!;
    const itJ = itArr[j]!;
    const nMax = Math.floor(tJ); // N = ⌊T⌋
    const logTj = Math.log(tJ);
    const scale = (-Math.PI * itJ) / 2; // e^{−π·I(T)/2}
    let re = 0;
    let im = 0;
    for (let n = 1; n <= nMax; n++) {
      const lnN = logN[n - 1]!;
      const logRatio = lnN - logTj;
      const mag = Math.exp(-sigma * logRatio + scale);
      const phase = itJ * lnN; // +I(T)·ln n
      re += mag * Math.cos(phase);
      im += mag * Math.sin(phase);
    }
    out[j * 2] = re;
    out[j * 2 + 1] = im;
  }
  return out;
}

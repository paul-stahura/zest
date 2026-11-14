import { iOfT } from "./iOfT";
import { logChiVec } from "./logChi";

/**
 * Vectorized scaled Σ₂ —
 *   `t^scaleSigma · Σ₂(formulaSigma, t)` where
 *   `Σ₂(σ, t) = χ(σ + i·I(t)) · Σ_{n=1..⌊t⌋} 1 / n^(1 − σ − i·I(t))`.
 *
 * `formulaSigma` controls the σ inside the Σ₂ formula. `scaleSigma` controls
 * the outer `t^σ` magnitude scaling. They are usually equal, but the R₂
 * variant of the f scan reflects the formula (`formulaSigma = 1 − σ_user`)
 * while keeping the display scaling at the user's σ — passing them
 * separately lets the result stay in a sane magnitude range even at extreme
 * σ_user values.
 *
 * Output is an interleaved `Float64Array` of length `2 * tArr.length`.
 *
 * Computed in log-space so the χ factor (which can be very large) never
 * overflows an intermediate:
 *   log(t^scaleSigma · Σ₂) = scaleSigma·log(t) + log χ(s) + log S
 *   where S = Σ_{n=1..⌊t⌋} n^(formulaSigma−1) · exp(i·I(t)·log n).
 *
 * Each term `n^(formulaSigma−1)` ≤ 1 for formulaSigma ≤ 1; for larger
 * formulaSigma the per-term magnitude grows but is folded back through the
 * log-space combination so no intermediate overflows the double range.
 */
export function sigma2Scaled(
  tArr: Float64Array,
  formulaSigma: number,
  scaleSigma: number = formulaSigma,
): Float64Array {
  const nT = tArr.length;
  const out = new Float64Array(nT * 2);
  if (nT === 0) return out;

  let nGlobal = 0;
  for (let j = 0; j < nT; j++) {
    const f = Math.floor(tArr[j]!);
    if (f > nGlobal) nGlobal = f;
  }

  const logN = new Float64Array(Math.max(nGlobal, 1));
  for (let n = 1; n <= nGlobal; n++) {
    logN[n - 1] = Math.log(n);
  }

  // Build s = formulaSigma + i·I(t) interleaved for the vectorized log χ call.
  const sInterleaved = new Float64Array(nT * 2);
  for (let j = 0; j < nT; j++) {
    sInterleaved[j * 2] = formulaSigma;
    sInterleaved[j * 2 + 1] = iOfT(tArr[j]!);
  }
  const logChi = logChiVec(sInterleaved);

  // Compute log S in log-space so that even when formulaSigma is large the
  // partial-sum exponent doesn't have to materialize as a finite double.
  // For a single dominant term n* ≈ ⌊t⌋, log|S| ≈ (formulaSigma−1)·log(n*).
  // We accumulate via the standard "log-sum-exp" trick keyed off the max log
  // magnitude in the partial sum.
  const expS = formulaSigma - 1;
  for (let j = 0; j < nT; j++) {
    const tJ = tArr[j]!;
    const itJ = iOfT(tJ);
    const nMax = Math.floor(tJ);
    if (nMax === 0) {
      out[j * 2] = 0;
      out[j * 2 + 1] = 0;
      continue;
    }
    // Find max term log magnitude to anchor the log-sum-exp.
    // logMag[n] = (formulaSigma − 1) · log(n).
    let logMaxMag = expS * logN[nMax - 1]!;
    if (expS < 0) logMaxMag = expS * logN[0]!; // n=1 dominates when expS<0
    // Sum scaled by exp(-logMaxMag) so each contribution ≤ 1.
    let sumRe = 0;
    let sumIm = 0;
    for (let n = 1; n <= nMax; n++) {
      const lnN = logN[n - 1]!;
      const logMag = expS * lnN;
      const scaled = Math.exp(logMag - logMaxMag); // ≤ 1
      const phase = itJ * lnN;
      sumRe += scaled * Math.cos(phase);
      sumIm += scaled * Math.sin(phase);
    }
    if (sumRe === 0 && sumIm === 0) {
      out[j * 2] = 0;
      out[j * 2 + 1] = 0;
      continue;
    }
    // log S = logMaxMag + log(sumRe + i·sumIm)
    const logSumScaledRe = 0.5 * Math.log(sumRe * sumRe + sumIm * sumIm);
    const logSumScaledIm = Math.atan2(sumIm, sumRe);
    const logSumRe = logMaxMag + logSumScaledRe;
    const logSumIm = logSumScaledIm;

    const scaleLogT = scaleSigma * Math.log(Math.max(tJ, 1e-300));
    const logChiRe = logChi[j * 2]!;
    const logChiIm = logChi[j * 2 + 1]!;

    let logRe = scaleLogT + logChiRe + logSumRe;
    const logIm = logChiIm + logSumIm;

    if (logRe < -745) {
      out[j * 2] = 0;
      out[j * 2 + 1] = 0;
    } else {
      if (logRe > 709) logRe = 709;
      const mag = Math.exp(logRe);
      out[j * 2] = mag * Math.cos(logIm);
      out[j * 2 + 1] = mag * Math.sin(logIm);
    }
  }
  return out;
}

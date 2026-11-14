import { i1AccVec } from "./i1Acc";
import { i1Scaled } from "./i1Scaled";
import { iOfT } from "./iOfT";
import { logChiVec } from "./logChi";

/**
 * Compute `t^σ · R₁(σ, t)` overflow-safely, matching `R_1_scaled_vec` in
 * `formulas_v3speed.py`. Output is interleaved Float64Array `[re, im, ...]`.
 *
 * Pipeline:
 *  1. `R_full` (scaled) via the log-space χ trick: `t^σ·R = -½·sign·(I₁_scaled + A)`
 *     where `A = exp(σ·log(t) + log_chi + conj(log(I₁(1−σ, t))))`.
 *  2. `arg_R = arg(R_full_scaled)` and `|R| = |R_full_scaled|`.
 *  3. `arg_chi = Im(log_chi)` (no exp of χ ever).
 *  4. Sin-ratio: `d_j1 = |R| · sin(ω − arg R + arg χ) / sin(arg χ + 2ω)` where
 *     `ω = I(t) · ln(⌈t⌉)`.
 *  5. `R₁ = d_j1 · exp(-i·I(t)·ln(⌈t⌉))`.
 *
 * Includes the same numerical guards as the Python source: floor on
 * `denom` magnitude and a secondary cap so `numer/denom` cannot overflow
 * `1e150`.
 */
export function r1Scaled(sigma: number, tArr: Float64Array): Float64Array {
  const n = tArr.length;
  const sInterleaved = new Float64Array(n * 2);
  const ceilT = new Float64Array(n);
  const itArr = new Float64Array(n);

  for (let j = 0; j < n; j++) {
    const tJ = tArr[j]!;
    const itJ = iOfT(tJ);
    sInterleaved[j * 2] = sigma;
    sInterleaved[j * 2 + 1] = itJ;
    ceilT[j] = Math.ceil(tJ);
    itArr[j] = itJ;
  }

  const i1Sc = i1Scaled(sigma, tArr); // t^σ · I₁(σ,t)
  const logChi = logChiVec(sInterleaved); // log χ(s)

  // Build s_{1−σ} = (1 − σ) + i·I(t)
  const sOneMinusSigma = new Float64Array(n * 2);
  for (let j = 0; j < n; j++) {
    sOneMinusSigma[j * 2] = 1 - sigma;
    sOneMinusSigma[j * 2 + 1] = itArr[j]!;
  }
  const acc1ms = i1AccVec(1 - sigma, tArr);

  // log(I₁(1−σ, t)) = -s_{1−σ}·log(m) + log(acc(1−σ, t))
  // Then log_A = σ·log(t) + log_chi + conj(log_I1_1ms).
  const out = new Float64Array(n * 2);
  for (let j = 0; j < n; j++) {
    const tJ = tArr[j]!;
    const itJ = itArr[j]!;
    const mJ = Math.floor(tJ) + 0.5;
    const ceilTj = ceilT[j]!;
    const ft = Math.floor(tJ);
    const sign = ft % 2 === 0 ? 1 : -1;

    const lnM = Math.log(mJ);
    const sOmsRe = sOneMinusSigma[j * 2]!;
    const sOmsIm = sOneMinusSigma[j * 2 + 1]!;
    // -s_{1−σ} · ln(m)
    const logPrefRe = -sOmsRe * lnM;
    const logPrefIm = -sOmsIm * lnM;
    // log(acc)
    const accRe = acc1ms[j * 2]!;
    const accIm = acc1ms[j * 2 + 1]!;
    const logAccRe = 0.5 * Math.log(accRe * accRe + accIm * accIm);
    const logAccIm = Math.atan2(accIm, accRe);
    // log(I₁(1−σ, t))
    const logI1Re = logPrefRe + logAccRe;
    const logI1Im = logPrefIm + logAccIm;
    // conj(log I₁(1−σ, t))
    const conjLogI1Re = logI1Re;
    const conjLogI1Im = -logI1Im;
    // log_A = σ·log(t) + log_chi + conj(log_I1_1ms)
    const sigmaLogT = sigma * Math.log(Math.max(tJ, 1e-300));
    const logChiRe = logChi[j * 2]!;
    const logChiIm = logChi[j * 2 + 1]!;
    let logARe = sigmaLogT + logChiRe + conjLogI1Re;
    const logAIm = logChiIm + conjLogI1Im;
    // Clip Re(log_A) before exp; underflow → 0.
    let A_Re: number;
    let A_Im: number;
    if (logARe < -745) {
      A_Re = 0;
      A_Im = 0;
    } else {
      if (logARe > 709) logARe = 709;
      const mag = Math.exp(logARe);
      A_Re = mag * Math.cos(logAIm);
      A_Im = mag * Math.sin(logAIm);
    }

    // R_full_scaled = -½ · sign · (I₁_scaled + A)
    const sumRe = i1Sc[j * 2]! + A_Re;
    const sumIm = i1Sc[j * 2 + 1]! + A_Im;
    const rFullRe = -0.5 * sign * sumRe;
    const rFullIm = -0.5 * sign * sumIm;

    // Sin-ratio for R₁
    const omega = itJ * Math.log(Math.max(ceilTj, 1e-300));
    const argChi = logChiIm;
    const absR = Math.hypot(rFullRe, rFullIm);
    const argR = Math.atan2(rFullIm, rFullRe);

    const numer = absR * Math.sin(omega - argR + argChi);
    let denom = Math.sin(argChi + 2 * omega);
    if (Math.abs(denom) <= 1e-300) {
      denom = (denom < 0 ? -1 : 1) * 1e-300;
    }
    if (denom === 0) denom = 1e-300;
    const ABS_CAP = 1e150;
    const minSafe = Math.abs(numer) / ABS_CAP;
    if (Math.abs(denom) < minSafe) {
      const s = denom < 0 ? -1 : 1;
      denom = s * Math.max(minSafe, 1e-300);
    }
    const dJ1Sc = numer / denom;

    // d_j1_sc · exp(-i·I(t)·ln(⌈t⌉))
    const phase = -itJ * Math.log(Math.max(ceilTj, 1e-300));
    out[j * 2] = dJ1Sc * Math.cos(phase);
    out[j * 2 + 1] = dJ1Sc * Math.sin(phase);
  }
  return out;
}

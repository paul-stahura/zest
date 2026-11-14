import { i1AccVec } from "./i1Acc";
import { i1Scaled } from "./i1Scaled";
import { iOfT } from "./iOfT";
import { logChiVec } from "./logChi";

/**
 * Compute `t^scaleSigma · R₂(formulaSigma, t)` overflow-safely. Output is
 * interleaved Float64Array `[re, im, ...]`.
 *
 * `formulaSigma` controls the σ inside the R₂ definition. `scaleSigma` is
 * the outer `t^σ` magnitude scaling (defaults to `formulaSigma`). The R₂
 * variant of the f scan calls this with `formulaSigma = 1 − σ_user` and
 * `scaleSigma = σ_user` so the output magnitude stays in the same range as
 * R₁ at the user's σ, even when the formula's σ is far from it.
 *
 * Pipeline (parallels `r1Scaled`, but with the d_{j2} sin-ratio and the R₂
 * phase recombination):
 *   1. `R_full_scaled = -½ · sign · (I₁_scaled + A)`         (same as R₁)
 *      with `A = exp(formulaSigma·log t + log χ + conj(log I₁(1−formulaSigma, t)))`.
 *   2. `ω = I(t) · ln(⌈t⌉)`, `arg χ = Im(log χ)`.
 *   3. `d_{j2} = |R_full_scaled| · sin(ω + arg R) / sin(arg χ + 2ω)`.
 *   4. `R₂_scaled_formulaSigma = d_{j2} · exp(i·(ω + arg χ))`.
 *   5. Rescale to `t^scaleSigma`: multiply by `t^(scaleSigma − formulaSigma)`
 *      in log-space (the only path that survives extreme σ_user values).
 *
 * Numerical guards mirror `r1Scaled`: floor `|denom|` and cap `|numer/denom|`
 * to avoid producing infinities that poison the downstream `|f|` magnitude.
 */
export function r2Scaled(
  formulaSigma: number,
  tArr: Float64Array,
  scaleSigma: number = formulaSigma,
): Float64Array {
  const sigma = formulaSigma;
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

  const i1Sc = i1Scaled(sigma, tArr);
  const logChi = logChiVec(sInterleaved);

  const sOneMinusSigma = new Float64Array(n * 2);
  for (let j = 0; j < n; j++) {
    sOneMinusSigma[j * 2] = 1 - sigma;
    sOneMinusSigma[j * 2 + 1] = itArr[j]!;
  }
  const acc1ms = i1AccVec(1 - sigma, tArr);

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
    const logPrefRe = -sOmsRe * lnM;
    const logPrefIm = -sOmsIm * lnM;
    const accRe = acc1ms[j * 2]!;
    const accIm = acc1ms[j * 2 + 1]!;
    const logAccRe = 0.5 * Math.log(accRe * accRe + accIm * accIm);
    const logAccIm = Math.atan2(accIm, accRe);
    const logI1Re = logPrefRe + logAccRe;
    const logI1Im = logPrefIm + logAccIm;
    const conjLogI1Re = logI1Re;
    const conjLogI1Im = -logI1Im;
    const sigmaLogT = sigma * Math.log(Math.max(tJ, 1e-300));
    const logChiRe = logChi[j * 2]!;
    const logChiIm = logChi[j * 2 + 1]!;
    let logARe = sigmaLogT + logChiRe + conjLogI1Re;
    const logAIm = logChiIm + conjLogI1Im;
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

    const sumRe = i1Sc[j * 2]! + A_Re;
    const sumIm = i1Sc[j * 2 + 1]! + A_Im;
    const rFullRe = -0.5 * sign * sumRe;
    const rFullIm = -0.5 * sign * sumIm;

    const omega = itJ * Math.log(Math.max(ceilTj, 1e-300));
    const argChi = logChiIm;
    const absR = Math.hypot(rFullRe, rFullIm);
    const argR = Math.atan2(rFullIm, rFullRe);

    // d_{j2} = |R| · sin(ω + arg R) / sin(arg χ + 2ω)
    const numer = absR * Math.sin(omega + argR);
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
    const dJ2Sc = numer / denom;

    // R₂_scaled at formulaSigma = d_{j2} · exp(i·(ω + arg χ)). Rescale to
    // t^scaleSigma in log-space to survive extreme σ values without losing
    // sign or going through Infinity (would NaN under hypot downstream).
    const phase = omega + argChi;
    const phaseRe = Math.cos(phase);
    const phaseIm = Math.sin(phase);
    if (scaleSigma === formulaSigma || dJ2Sc === 0) {
      out[j * 2] = dJ2Sc * phaseRe;
      out[j * 2 + 1] = dJ2Sc * phaseIm;
    } else {
      const sign = dJ2Sc < 0 ? -1 : 1;
      const logAbs = Math.log(Math.abs(dJ2Sc)) + (scaleSigma - formulaSigma) * Math.log(Math.max(tJ, 1e-300));
      if (logAbs < -745) {
        out[j * 2] = 0;
        out[j * 2 + 1] = 0;
      } else {
        const cappedLog = logAbs > 709 ? 709 : logAbs;
        const mag = sign * Math.exp(cappedLog);
        out[j * 2] = mag * phaseRe;
        out[j * 2 + 1] = mag * phaseIm;
      }
    }
  }
  return out;
}

import { i1Scaled } from "./i1Scaled";
import { iOfT } from "./iOfT";
import { logChiVec } from "./logChi";

/**
 * Compute `t^scaleSigma · R_{2ak}(σ, t)` overflow-safely. Output is interleaved
 * Float64Array `[re, im, ...]`.
 *
 * Formula (per spec):
 *   R_{2ak}(σ, t) = -½ · (-1)^⌊t⌋ · I₂(σ, t) · χ(σ + i·I(t))
 *   where I₂(σ, t) = conj(I₁(1 − σ, t))
 *
 * Implementation walks log-space for the χ multiplication so extreme σ values
 * (where |χ| is enormous or tiny) don't overflow doubles. The `i1Scaled`
 * helper returns `t^σ' · I₁(σ', t)`; we call it with `σ' = 1 − σ`, take
 * complex conjugate, and bring the magnitude back to `t^scaleSigma` in
 * log-space.
 *
 * @param formulaSigma — σ inside the R_{2ak} definition (user's σ).
 * @param tArr        — strictly positive t values.
 * @param scaleSigma  — outer `t^σ` magnitude scaling. Defaults to formulaSigma.
 */
export function r2akScaled(
  formulaSigma: number,
  tArr: Float64Array,
  scaleSigma: number = formulaSigma,
): Float64Array {
  const sigma = formulaSigma;
  const n = tArr.length;
  const out = new Float64Array(n * 2);
  if (n === 0) return out;

  // I₂(σ, t) = conj(I₁(1 − σ, t)). Note i1Scaled returns t^(1-σ) · I₁(1-σ, t).
  const refSigma = 1 - sigma;
  const i1Ref = i1Scaled(refSigma, tArr);

  // log χ(σ + i·I(t)) per t, interleaved [re, im, ...].
  const sInterleaved = new Float64Array(n * 2);
  for (let j = 0; j < n; j++) {
    sInterleaved[j * 2] = sigma;
    sInterleaved[j * 2 + 1] = iOfT(tArr[j]!);
  }
  const logChi = logChiVec(sInterleaved);

  for (let j = 0; j < n; j++) {
    const tJ = tArr[j]!;
    if (!(tJ > 0)) {
      out[j * 2] = 0;
      out[j * 2 + 1] = 0;
      continue;
    }
    // I₁_scaled(1−σ, t) is t^(1-σ) · I₁(1-σ, t). Conjugate gives t^(1-σ) · conj(I₁(1-σ, t)) = t^(1-σ) · I₂(σ, t).
    const i1ReRef = i1Ref[j * 2]!;
    const i1ImRef = -i1Ref[j * 2 + 1]!; // conjugate

    // Sign factor −½·(−1)^⌊t⌋, applied to I₂ part.
    const sign = Math.floor(tJ) % 2 === 0 ? -0.5 : 0.5;
    const sIRe = sign * i1ReRef;
    const sIIm = sign * i1ImRef;

    // Multiply by χ in log-space:
    //   log(R_{2ak}) = log(t^scaleSigma · sign · I₂(σ,t) · χ)
    //               = (scaleSigma − (1 − σ)) · log t + log(sign·I₂_scaled) + log χ
    // We pull magnitude to log; phase composes additively.
    const sIMag = Math.hypot(sIRe, sIIm);
    if (sIMag === 0) {
      out[j * 2] = 0;
      out[j * 2 + 1] = 0;
      continue;
    }
    const sIArg = Math.atan2(sIIm, sIRe);
    const logChiRe = logChi[j * 2]!;
    const logChiIm = logChi[j * 2 + 1]!;
    const rescaleLog = (scaleSigma - refSigma) * Math.log(Math.max(tJ, 1e-300));
    let logMag = Math.log(sIMag) + logChiRe + rescaleLog;
    const phase = sIArg + logChiIm;
    if (logMag < -745) {
      out[j * 2] = 0;
      out[j * 2 + 1] = 0;
    } else {
      if (logMag > 709) logMag = 709; // cap to avoid Infinity
      const mag = Math.exp(logMag);
      out[j * 2] = mag * Math.cos(phase);
      out[j * 2 + 1] = mag * Math.sin(phase);
    }
  }

  return out;
}

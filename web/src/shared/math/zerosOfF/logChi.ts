/**
 * Computes `log(χ(s))` for each `s` in the input array, where
 *   `χ(s) = (½−s)·ln(s/2π) + s·(iπ/2 + 1) − Stirling-correction`.
 *
 * We never exponentiate `χ` itself — `Re(log χ)` can be huge for large
 * `|σ|`, so callers combine `log_chi` with `log(I₁(1−σ, t))` and only
 * exponentiate the bounded sum. Direct port of `log_chi_vec` in
 * `formulas_v3speed.py`.
 *
 * Input arrays are interleaved `[reS, imS, reS, imS, ...]`. Output is
 * the same shape: `[reLog, imLog, ...]`.
 */
export function logChiVec(sInterleaved: Float64Array): Float64Array {
  const n = sInterleaved.length / 2;
  const out = new Float64Array(sInterleaved.length);
  const TWO_PI = 2 * Math.PI;

  for (let j = 0; j < n; j++) {
    const sRe = sInterleaved[j * 2]!;
    const sIm = sInterleaved[j * 2 + 1]!;

    // s / (2π)
    const aRe = sRe / TWO_PI;
    const aIm = sIm / TWO_PI;
    // log(s/2π) = log|.| + i·arg(.)
    const lnARe = 0.5 * Math.log(aRe * aRe + aIm * aIm);
    const lnAIm = Math.atan2(aIm, aRe);

    // (½ − s) · log(s/2π)
    const halfMinusReS = 0.5 - sRe;
    const halfMinusImS = -sIm;
    const term1Re = halfMinusReS * lnARe - halfMinusImS * lnAIm;
    const term1Im = halfMinusReS * lnAIm + halfMinusImS * lnARe;

    // s · (iπ/2 + 1)
    const term2Re = sRe - sIm * (Math.PI / 2);
    const term2Im = sIm + sRe * (Math.PI / 2);

    // Stirling: (1/12 − 1/(360s²) + 1/(1260s⁴) − 1/(1680s⁶)) / s
    // Compute s², s⁴, s⁶ via successive multiply.
    const s2Re = sRe * sRe - sIm * sIm;
    const s2Im = 2 * sRe * sIm;
    const s4Re = s2Re * s2Re - s2Im * s2Im;
    const s4Im = 2 * s2Re * s2Im;
    const s6Re = s4Re * s2Re - s4Im * s2Im;
    const s6Im = s4Re * s2Im + s4Im * s2Re;

    // Reciprocals: 1/s² etc. via cdiv
    const inv = (re: number, im: number): [number, number] => {
      const d = re * re + im * im;
      return [re / d, -im / d];
    };
    const [inv2Re, inv2Im] = inv(s2Re, s2Im);
    const [inv4Re, inv4Im] = inv(s4Re, s4Im);
    const [inv6Re, inv6Im] = inv(s6Re, s6Im);

    // (1/12) − (1/360) · 1/s² + (1/1260) · 1/s⁴ − (1/1680) · 1/s⁶
    const innerRe =
      1 / 12 -
      inv2Re / 360 +
      inv4Re / 1260 -
      inv6Re / 1680;
    const innerIm =
      0 -
      inv2Im / 360 +
      inv4Im / 1260 -
      inv6Im / 1680;

    // Stirling = inner / s
    const [invSRe, invSIm] = inv(sRe, sIm);
    const stirlingRe = innerRe * invSRe - innerIm * invSIm;
    const stirlingIm = innerRe * invSIm + innerIm * invSRe;

    out[j * 2] = term1Re + term2Re - stirlingRe;
    out[j * 2 + 1] = term1Im + term2Im - stirlingIm;
  }
  return out;
}

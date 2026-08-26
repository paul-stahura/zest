// Closed-form Chebyshev polynomial fit of the piecewise-linear polyline
// through a set of anchor points, parameterized by arc-length scaled to [-1, 1].
//
// Each linear segment contributes analytically to every coefficient via
//   a_k = (2/π) Σ ∫_{t_n}^{t_{n+1}} (α + β t) T_k(t) / √(1-t²) dt
// with closed-form sin(kθ)/k expressions (θ = arccos t). One pass over the
// anchors gives all (K+1) coefficients per axis; no LS, no design matrix.

import type { Point2 } from "@/shared/io/types";

function chebCoeffsFromAnchorValues(values: number[], tAnch: number[], thAnch: number[], K: number): number[] {
  const a = new Array<number>(K + 1).fill(0);
  for (let n = 0; n < tAnch.length - 1; n += 1) {
    const ta = tAnch[n]!;
    const tb = tAnch[n + 1]!;
    const tha = thAnch[n]!;
    const thb = thAnch[n + 1]!;
    const ya = values[n]!;
    const yb = values[n + 1]!;
    const dt = tb - ta;
    if (Math.abs(dt) < 1e-15) continue;
    const beta = (yb - ya) / dt;
    const alpha = ya - beta * ta;
    // k = 0
    a[0] = (a[0] ?? 0) + alpha * (tha - thb) + beta * (Math.sin(tha) - Math.sin(thb));
    if (K >= 1) {
      const sin1a = Math.sin(tha);
      const sin1b = Math.sin(thb);
      const sin2a = Math.sin(2 * tha);
      const sin2b = Math.sin(2 * thb);
      a[1] = (a[1] ?? 0) + alpha * (sin1a - sin1b) + beta * ((tha - thb) / 2 + (sin2a - sin2b) / 4);
    }
    for (let k = 2; k <= K; k += 1) {
      const Ik = (Math.sin(k * tha) - Math.sin(k * thb)) / k;
      const Jk = 0.5 * (
        (Math.sin((k - 1) * tha) - Math.sin((k - 1) * thb)) / (k - 1) +
        (Math.sin((k + 1) * tha) - Math.sin((k + 1) * thb)) / (k + 1)
      );
      a[k] = (a[k] ?? 0) + alpha * Ik + beta * Jk;
    }
  }
  // Normalisation: a_0 = (1/π) ∫…,  a_k = (2/π) ∫… for k ≥ 1
  a[0] = (a[0] ?? 0) / Math.PI;
  for (let k = 1; k <= K; k += 1) a[k] = (a[k] ?? 0) * 2 / Math.PI;
  return a;
}

/** Evaluate Σ c_k T_k(t) via Clenshaw recurrence. */
function chebEval(coeffs: number[], t: number): number {
  let b1 = 0;
  let b2 = 0;
  const twoT = 2 * t;
  for (let k = coeffs.length - 1; k >= 1; k -= 1) {
    const b = (coeffs[k] ?? 0) + twoT * b1 - b2;
    b2 = b1;
    b1 = b;
  }
  return (coeffs[0] ?? 0) + t * b1 - b2;
}

/**
 * Compute the smooth Chebyshev curve approximating the polyline through the
 * given anchors. Returns numEval points along the curve.
 *
 * - K = max polynomial degree (clamped to a safe range)
 * - numEval = number of points produced along [-1, 1] in t
 */
export function computeChebyshevCurve(
  anchors: Point2[],
  K: number,
  numEval = 1024,
): Point2[] {
  if (anchors.length < 2 || numEval < 2) return [];

  // Per-segment arc lengths and cumulative arc length
  const N = anchors.length - 1;
  const seg = new Array<number>(N);
  for (let i = 0; i < N; i += 1) {
    const a = anchors[i]!;
    const b = anchors[i + 1]!;
    seg[i] = Math.hypot(b.x - a.x, b.y - a.y);
  }
  const cumS = new Array<number>(anchors.length);
  cumS[0] = 0;
  for (let i = 1; i < anchors.length; i += 1) cumS[i] = (cumS[i - 1] ?? 0) + (seg[i - 1] ?? 0);
  const L = cumS[anchors.length - 1] ?? 0;
  if (L < 1e-12) return [];

  // Map arc length to t ∈ [-1, 1]; clamp for arccos stability at endpoints
  const tAnch = cumS.map(s => 2 * s / L - 1);
  const thAnch = tAnch.map(t => Math.acos(Math.min(1, Math.max(-1, t))));

  const xVals = anchors.map(p => p.x);
  const yVals = anchors.map(p => p.y);
  const safeK = Math.max(0, Math.min(K, anchors.length - 1));
  const cx = chebCoeffsFromAnchorValues(xVals, tAnch, thAnch, safeK);
  const cy = chebCoeffsFromAnchorValues(yVals, tAnch, thAnch, safeK);

  const out: Point2[] = new Array(numEval);
  const stepDen = numEval - 1;
  for (let i = 0; i < numEval; i += 1) {
    const t = -1 + (2 * i) / stepDen;
    out[i] = { x: chebEval(cx, t), y: chebEval(cy, t) };
  }
  return out;
}

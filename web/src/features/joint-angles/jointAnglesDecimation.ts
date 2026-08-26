export interface JointAngleSamplePlan {
  /** Sorted joint indices in [nLo, nHi] — always every visible joint. */
  joints: number[];
}

/**
 * Visible joints to evaluate and draw. WebGL renders the full set; do not decimate
 * display density (sub-pixel joints overlap and form a continuous curve).
 */
export function planJointAngleSamples(nLo: number, nHi: number): JointAngleSamplePlan {
  const lo = Math.max(2, Math.min(nLo, nHi));
  const hi = Math.max(lo, nHi);
  const joints: number[] = [];
  for (let n = lo; n <= hi; n += 1) joints.push(n);
  return { joints };
}

/** Dot radius (CSS px) from rendered count and plot width — matches pre-WebGL fillRect sizing. */
export function jointAngleDotRadiusCss(
  plotWidthPx: number,
  dotCount: number,
  dim: number,
): number {
  const plotW = Math.max(1, plotWidthPx);
  const spacing = plotW / Math.max(1, dotCount);
  const rBase = spacing < 3 ? Math.max(1, spacing * 0.55) : 1.6;
  return Math.max(0.5, rBase * (1 - 0.8 * Math.min(1, dim / 0.5)));
}

const PI = Math.PI;
const TWO_PI = 2 * PI;

export interface JointAnglePlotPoint {
  x: number;
  y: number;
}

/** Map signed angle ρ ∈ [−π, π] to CSS y within the plot band. */
export function jointAngleYOf(angle: number, plotTop: number, plotHeight: number): number {
  return plotTop + ((PI - angle) / TWO_PI) * plotHeight;
}

/**
 * Build CSS-pixel plot coordinates for joint dots (for WebGL or Canvas2D).
 * Skips points outside [plotLeft, plotRight] ± margin.
 */
export function buildJointAnglePlotPoints(input: {
  joints: readonly number[];
  signed: ArrayLike<number>;
  uOf: (n: number) => number;
  xOfU: (u: number) => number;
  plotTop: number;
  plotHeight: number;
  plotLeft: number;
  plotRight: number;
  margin?: number;
}): JointAnglePlotPoint[] {
  const margin = input.margin ?? 2;
  const out: JointAnglePlotPoint[] = [];
  for (const n of input.joints) {
    if (n < 2 || n >= input.signed.length) continue;
    const x = input.xOfU(input.uOf(n));
    if (x < input.plotLeft - margin || x > input.plotRight + margin) continue;
    const y = jointAngleYOf(input.signed[n]!, input.plotTop, input.plotHeight);
    out.push({ x, y });
  }
  return out;
}

/** Interleaved [x,y,...] in CSS pixels for WebGL (caller applies dpr if needed). */
export function plotPointsToInterleavedCss(points: readonly JointAnglePlotPoint[]): Float32Array {
  const buf = new Float32Array(points.length * 2);
  for (let i = 0; i < points.length; i += 1) {
    buf[i * 2] = points[i]!.x;
    buf[i * 2 + 1] = points[i]!.y;
  }
  return buf;
}

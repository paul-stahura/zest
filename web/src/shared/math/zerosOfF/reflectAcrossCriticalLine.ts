/**
 * Reflect a real part across the critical line \(\sigma = 1/2\).
 * The line is vertical, so the imaginary part and the spiral index \(T\)
 * stay put; only \(\sigma\) moves, to \(1 - \sigma\).
 */
export function reflectAcrossCriticalLine(sigma: number): number {
  return 1 - sigma;
}

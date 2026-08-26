import { describe, it, expect } from "vitest";
import { computeZakSpiralGeometry } from "@/shared/math/zakCalculator";
import { indexToImag } from "@/shared/math/zetaEms";

/**
 * Reference values for ζ(0.5 + it) from mpmath (30-digit precision), evaluated at
 * t = indexToImag(index) using the numerically stable log1p form (regenerated after the
 * ln(n+1)−ln(n) cancellation fix; the old t values drifted ~1e-8 at index 200).
 * Indices chosen so N = ⌊√(t/2π)⌋ matches floor(index), per Kuznetsov 2025.
 */
const REFERENCE_VALUES: Array<{ index: number; t: number; re: number; im: number }> = [
  { index: 10, t: 692.19726435131543, re: -0.60342801508556696, im: -0.77214720627867291 },
  { index: 25, t: 4085.1175935253223, re: 0.45193595002718857, im: 0.019180332376293185 },
  { index: 50, t: 16023.169717170924, re: 0.94680510453429092, im: 0.010934162367901628 },
  { index: 100, t: 63461.218796608962, re: 1.1451328118324186, im: -2.2097343326060039 },
  { index: 200, t: 252585.09654530222, re: 0.47254061885869219, im: 0.22713888212472595 },
];

function relErrComplex(refRe: number, refIm: number, re: number, im: number): number {
  const refMag = Math.sqrt(refRe * refRe + refIm * refIm);
  const diffMag = Math.sqrt((re - refRe) ** 2 + (im - refIm) ** 2);
  return refMag === 0 ? diffMag : diffMag / refMag;
}

describe("computeZakSpiralGeometry", () => {
  it.each(REFERENCE_VALUES)("matches mpmath ζ(0.5 + $t·i) at index $index", ({ index, re, im }) => {
    const geom = computeZakSpiralGeometry(0.5, index);
    const err = relErrComplex(re, im, geom.zeta.x, geom.zeta.y);
    // Kuznetsov p=8 on critical line: ~10^(-10) measured, 10^(-9) tolerance for safety margin
    expect(err).toBeLessThan(1e-9);
  });

  it("builds forward + remainder + inverse path with correct length", () => {
    const geom = computeZakSpiralGeometry(0.5, 10);
    const maxJ = Math.floor(10);
    // forward[0..maxJ] (length maxJ+1) + remainder (1) + inverse extensions (maxJ)
    expect(geom.joints.length).toBe(2 * (maxJ + 1));
    expect(geom.middleIndex).toBe(maxJ);
  });

  it("computes indexToImag consistent with reference", () => {
    const t = indexToImag(100, false);
    expect(t).toBeCloseTo(63461.21879661028, 3);
  });

  it("first joint is origin", () => {
    const geom = computeZakSpiralGeometry(0.5, 10);
    expect(geom.joints[0]).toEqual({ x: 0, y: 0 });
  });
});

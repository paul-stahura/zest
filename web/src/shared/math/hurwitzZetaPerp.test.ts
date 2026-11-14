import { distanceToMidpointPerp, footOnOriginLine } from "@/shared/math/hurwitzZetaPerp";
import type { Point2 } from "@/shared/io/types";
import { calculateHurwitzCharacterTarget } from "@/shared/math/lFunctionCalculator";
import { complex } from "@/shared/math/complex";
import { eulerMaclaurenZeta, indexToImag } from "@/shared/math/zetaEms";

/** q=2, residue 0 = −i (even n), residue 1 = 1 (odd n). */
const CHI_NEG_I_THEN_1 = [
  { re: 0, im: -1 },
  { re: 1, im: 0 },
] as const;

describe("footOnOriginLine", () => {
  it("projects onto the real axis", () => {
    const foot = footOnOriginLine({ x: 3, y: 4 }, { x: 2, y: 0 });
    expect(foot).toEqual({ x: 3, y: 0 });
  });

  it("projects onto the imaginary axis", () => {
    const foot = footOnOriginLine({ x: 1, y: 5 }, { x: 0, y: 2 });
    expect(foot).toEqual({ x: 0, y: 5 });
  });

  it("returns the point itself when it already lies on the line", () => {
    const foot = footOnOriginLine({ x: 2, y: 2 }, { x: 1, y: 1 });
    if (foot === null) throw new Error("expected a foot on a non-zero line");
    expect(foot.x).toBeCloseTo(2, 12);
    expect(foot.y).toBeCloseTo(2, 12);
  });

  it("makes the drop orthogonal to the origin line", () => {
    const zeta: Point2 = { x: 1.2, y: 3.4 };
    const hurwitz: Point2 = { x: -0.7, y: 2.1 };
    const foot = footOnOriginLine(zeta, hurwitz);
    if (foot === null) throw new Error("expected a foot on a non-zero line");
    const dropX = zeta.x - foot.x;
    const dropY = zeta.y - foot.y;
    expect(dropX * hurwitz.x + dropY * hurwitz.y).toBeCloseTo(0, 12);
  });

  it("returns null when the origin line is degenerate", () => {
    expect(footOnOriginLine({ x: 1, y: 1 }, { x: 0, y: 0 })).toBeNull();
  });
});

describe("distanceToMidpointPerp", () => {
  it("is zero when the point is the midpoint", () => {
    expect(distanceToMidpointPerp({ x: 1, y: 2 }, { x: 2, y: 4 })).toBeCloseTo(0, 12);
  });

  it("returns null when the origin line is degenerate", () => {
    expect(distanceToMidpointPerp({ x: 1, y: 1 }, { x: 0, y: 0 })).toBeNull();
  });
});

describe("q=2 χ=(−i,1): midpoint perp through ζ at σ=1/2", () => {
  it("puts ζ on the line through H/2 perpendicular to H at three T", () => {
    const indexes: readonly number[] = [3, 6, 10];
    for (const T of indexes) {
      const t = indexToImag(T, false);
      const s = complex(0.5, t);
      const H = calculateHurwitzCharacterTarget(CHI_NEG_I_THEN_1, s);
      const zeta = eulerMaclaurenZeta(s);
      const distToMidPerp = distanceToMidpointPerp(
        { x: zeta.re, y: zeta.im },
        { x: H.re, y: H.im },
      );
      if (distToMidPerp === null) throw new Error(`degenerate H at T=${T}`);
      expect(distToMidPerp, `T=${T} t=${t}`).toBeLessThan(5e-5);
    }
  });
});

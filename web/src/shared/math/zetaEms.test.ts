import { computeEmsSpiralGeometry, indexToImag, spiralMiddleIndex } from "@/shared/math/zetaEms";

describe("indexToImag", () => {
  it("uses the logarithmic branch when usePolyImag is false", () => {
    const t = indexToImag(5, false);
    const expected = ((5 * 2 + 1) * Math.PI) / (Math.log(6) - Math.log(5));
    expect(t).toBeCloseTo(expected, 10);
  });

  it("uses the polynomial branch when usePolyImag is true", () => {
    const t = indexToImag(3, true);
    expect(t).toBeCloseTo(2 * Math.PI * (9 + 3 + 1 / 6), 10);
  });
});

describe("spiralMiddleIndex", () => {
  it("matches the Unity formula for spiral=0", () => {
    const index = 10;
    const v = spiralMiddleIndex(index, 0);
    const expected = (2 * index * (index + 1)) / 1 + 1 / 3 - 1;
    expect(v).toBeCloseTo(expected, 10);
  });
});

describe("computeEmsSpiralGeometry", () => {
  it("returns joints starting at the origin with length numLinks", () => {
    const g = computeEmsSpiralGeometry({
      sigma: 0.5,
      index: 8,
      usePolyImag: false,
      extendSpiralCount: 0,
    });
    expect(g.joints.length).toBe(g.numLinks);
    expect(g.joints[0]?.x).toBe(0);
    expect(g.joints[0]?.y).toBe(0);
    expect(Number.isFinite(g.zeta.x)).toBe(true);
    expect(Number.isFinite(g.zeta.y)).toBe(true);
  });
});

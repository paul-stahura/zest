import {
  calcNLinks,
  calculateHurwitzCharacterInverseVectors,
  calculateHurwitzCharacterTarget,
  calculateHurwitzCharacterVectors,
  calculateTitchmarshLTarget,
  calculateTitchmarshLVectors,
  clampHurwitzModulus,
  cycleHurwitzPreset,
  defaultHurwitzCoeffs,
  formatHurwitzCoeffList,
  hurwitzCharCoeff,
  parseHurwitzCoeffList,
  parseHurwitzCoeffToken,
  resizeHurwitzCoeffs,
} from "@/shared/math/lFunctionCalculator";
import { complex } from "@/shared/math/complex";

describe("Hurwitz machine character table", () => {
  it("defaults q=5 to Titchmarsh L1", () => {
    expect(formatHurwitzCoeffList(defaultHurwitzCoeffs(5))).toBe("0, 1, i, -i, -1");
  });

  it("clamps modulus and resizes with zero padding", () => {
    expect(clampHurwitzModulus(99)).toBe(24);
    expect(clampHurwitzModulus(0)).toBe(1);
    const grown = resizeHurwitzCoeffs([{ re: 1, im: 0 }], 3);
    expect(grown).toEqual([
      { re: 1, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
    ]);
  });

  it("reads χ(n) by residue and cycles 0,1,−1,i,−i", () => {
    const chi = defaultHurwitzCoeffs(5);
    expect(hurwitzCharCoeff(chi, 7)).toEqual({ re: 0, im: 1 });
    expect(hurwitzCharCoeff(chi, 10)).toEqual({ re: 0, im: 0 });
    expect(cycleHurwitzPreset({ re: 0, im: 0 })).toEqual({ re: 1, im: 0 });
    expect(cycleHurwitzPreset({ re: 0, im: -1 })).toEqual({ re: 0, im: 0 });
    expect(cycleHurwitzPreset({ re: 0.3, im: 0.2 })).toEqual({ re: 0, im: 0 });
  });

  it("parses paste tokens including a±bi", () => {
    expect(parseHurwitzCoeffToken("i")).toEqual({ re: 0, im: 1 });
    expect(parseHurwitzCoeffToken("-2i")).toEqual({ re: 0, im: -2 });
    expect(parseHurwitzCoeffToken("0.5-i")).toEqual({ re: 0.5, im: -1 });
    expect(parseHurwitzCoeffList("0, 1, i, -i, -1")).toEqual(defaultHurwitzCoeffs(5));
    expect(parseHurwitzCoeffList("1, junk")).toBeNull();
  });
});

describe("Hurwitz machine walk", () => {
  it("matches Titchmarsh L1 when χ is 0,1,i,−i,−1", () => {
    const s = complex(2, 0);
    const chi = defaultHurwitzCoeffs(5);
    const walked = calculateHurwitzCharacterVectors(chi, 10, s);
    const l1 = calculateTitchmarshLVectors(1, 10, s);
    expect(walked.vectors).toHaveLength(l1.vectors.length);
    expect(walked.phantomVectors).toHaveLength(2);
    const head = walked.vectors.at(-1)!;
    const headL1 = l1.vectors.at(-1)!;
    expect(head.x).toBeCloseTo(headL1.x, 12);
    expect(head.y).toBeCloseTo(headL1.y, 12);
  });

  it("places the analytic cross near the spiral head", () => {
    const s = complex(0.5, 14.134725);
    const chi = defaultHurwitzCoeffs(5);
    const n = calcNLinks(3, 5);
    const head = calculateHurwitzCharacterVectors(chi, n, s).vectors.at(-1)!;
    const target = calculateHurwitzCharacterTarget(chi, s);
    expect(Math.hypot(head.x - target.re, head.y - target.im)).toBeLessThan(0.08);
    expect(target.re).toBeCloseTo(calculateTitchmarshLTarget(1, s).re, 8);
    expect(target.im).toBeCloseTo(calculateTitchmarshLTarget(1, s).im, 8);
    const inv = calculateHurwitzCharacterInverseVectors(chi, n, s, { x: target.re, y: target.im });
    expect(inv.vectors[0]!.x).toBeCloseTo(target.re, 10);
    expect(inv.vectors[0]!.y).toBeCloseTo(target.im, 10);
  });

  it("recovers ζ(2) when q=1 and χ(0)=1", () => {
    const s = complex(2, 0);
    const target = calculateHurwitzCharacterTarget([{ re: 1, im: 0 }], s);
    expect(target.re).toBeCloseTo(Math.PI * Math.PI / 6, 3);
    expect(target.im).toBeCloseTo(0, 5);
  });
});

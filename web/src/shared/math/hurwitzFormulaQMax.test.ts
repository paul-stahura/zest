import { clampHurwitzFormulaQMax, HURWITZ_FORMULA_Q_MAX, HURWITZ_FORMULA_Q_MIN } from "@/shared/math/hurwitzFormulaQMax";

describe("clampHurwitzFormulaQMax", () => {
  it("clamps to [2, 50] and maps non-finite to 2", () => {
    expect(clampHurwitzFormulaQMax(2)).toBe(HURWITZ_FORMULA_Q_MIN);
    expect(clampHurwitzFormulaQMax(50)).toBe(HURWITZ_FORMULA_Q_MAX);
    expect(clampHurwitzFormulaQMax(3.6)).toBe(4);
    expect(clampHurwitzFormulaQMax(1)).toBe(2);
    expect(clampHurwitzFormulaQMax(99)).toBe(50);
    expect(clampHurwitzFormulaQMax(Number.NaN)).toBe(2);
  });
});

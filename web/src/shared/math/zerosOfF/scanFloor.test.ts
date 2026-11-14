import { iOfT } from "@/shared/math/zerosOfF/iOfT";
import { ariasBoundaryT, imagCubeRootBoundaryT, imagCubeRootSeriesBoundaryT, paulsBoundaryT, piBoundaryT, theorem5LeftmostBoundaryT } from "@/shared/math/zerosOfF/scanFloor";

describe("boundary T(σ) formulas", () => {
  it("returns NaN for Paul's and Arias curves when σ > 0", () => {
    expect(Number.isNaN(paulsBoundaryT(1))).toBe(true);
    expect(Number.isNaN(ariasBoundaryT(1))).toBe(true);
    expect(Number.isNaN(imagCubeRootBoundaryT(1))).toBe(true);
    expect(Number.isNaN(imagCubeRootSeriesBoundaryT(0))).toBe(true);
    expect(Number.isNaN(imagCubeRootSeriesBoundaryT(-0.57))).toBe(true);
    expect(Number.isNaN(theorem5LeftmostBoundaryT(-0.57973))).toBe(true);
  });

  it("draws σ = −0.81975 t^(1/3) on the index axis", () => {
    const sigma = -100;
    const index = imagCubeRootBoundaryT(sigma);
    const t = iOfT(index);
    expect(-0.81975 * Math.cbrt(t)).toBeCloseTo(sigma, 6);
  });

  it("draws the two-term correction on the index axis", () => {
    const sigma = -100;
    const index = imagCubeRootSeriesBoundaryT(sigma);
    const t = iOfT(index);
    const sixth = Math.pow(t, 1 / 6);
    const rebuilt = -0.81975 * sixth * sixth - 1.3 * sixth - 0.57;
    expect(rebuilt).toBeCloseTo(sigma, 6);
  });

  it("draws Theorem 5 on the index axis", () => {
    const sigma = -100;
    const index = theorem5LeftmostBoundaryT(sigma);
    const t = iOfT(index);
    const sixth = Math.pow(t, 1 / 6);
    const rebuilt = -(0.81974 * sixth * sixth + 1.30445 * sixth + 0.57973);
    expect(rebuilt).toBeCloseTo(sigma, 6);
  });

  it("uses T = 0.173 |σ|^{1.61} for Paul's boundary", () => {
    const T = paulsBoundaryT(-1);
    expect(T).toBeCloseTo(0.173, 10);
  });

  it("keeps the π-boundary finite for negative σ", () => {
    expect(piBoundaryT(-50)).toBeGreaterThan(1);
  });
});

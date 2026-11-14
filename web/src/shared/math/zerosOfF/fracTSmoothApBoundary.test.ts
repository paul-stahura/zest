import {
  FRAC_T_SMOOTH_AP_BOUNDARY,
  fracTSmoothApBoundaryLabel,
  fracTSmoothApBoundaryT,
  fracTSmoothApCoeff,
  fracTTenThousandthsBin,
  parseFracTSmoothApBoundaryTable,
} from "@/shared/math/zerosOfF/fracTSmoothApBoundary";

describe("frac-T smooth a,p envelope from Figure 2", () => {
  it("loads 10000 navy-a / gold-p samples", () => {
    expect(FRAC_T_SMOOTH_AP_BOUNDARY.n).toBe(10000);
    expect(FRAC_T_SMOOTH_AP_BOUNDARY.aHigh).toHaveLength(10000);
    expect(FRAC_T_SMOOTH_AP_BOUNDARY.pMid).toHaveLength(10000);
  });

  it("rejects a payload that is not two equal-length series", () => {
    expect(() => parseFracTSmoothApBoundaryTable({})).toThrow();
  });

  it("looks up ten-thousandths and evaluates T = a |σ|^p", () => {
    expect(fracTTenThousandthsBin(0.146)).toBe(1460);
    const coeff = fracTSmoothApCoeff(0.146);
    expect(coeff.a).toBeCloseTo(0.44941138916220374, 8);
    expect(coeff.p).toBeCloseTo(1.5908516606520453, 8);
    expect(fracTSmoothApBoundaryT(-50, 0.146)).toBeCloseTo(226.7009432256046, 6);
    expect(Number.isNaN(fracTSmoothApBoundaryT(0, 0.146))).toBe(true);
  });

  it("labels the toggle with the mixed power law", () => {
    expect(fracTSmoothApBoundaryLabel(0.146)).toMatch(/^0\.146: T = /);
  });
});

import {
  DEFAULT_SPECTRUM_FEATHER,
  fracTSpectrumCss,
  fracTSpectrumHex,
  quarterSpectrumCss,
  quarterSpectrumHex,
  SPECTRUM_SECONDARY_HALF_WIDTH,
} from "@/features/zeros-of-f/fracToHue";
import {
  FRAC_T_SLICE_BOUNDARIES,
  fracTClosedBoundaryFactor,
  fracTClosedBoundaryLabel,
  fracTClosedBoundaryP,
  fracTClosedBoundaryT,
  fracTSliceBoundaryForJustOne,
  fracTSliceBoundaryLabel,
  fracTSliceBoundarySeries,
  fracTSliceBoundaryT,
  parseFracTSliceBoundaryTable,
} from "@/shared/math/zerosOfF/fracTSliceBoundary";
import { piBoundaryT } from "@/shared/math/zerosOfF/scanFloor";

describe("frac-T slice boundaries 0.000..0.999", () => {
  it("loads 1000 coefficients for thousandths bins 0 through 999", () => {
    expect(FRAC_T_SLICE_BOUNDARIES).toHaveLength(1000);
    expect(FRAC_T_SLICE_BOUNDARIES[0]?.bin).toBe(0);
    expect(FRAC_T_SLICE_BOUNDARIES[400]?.bin).toBe(400);
    expect(FRAC_T_SLICE_BOUNDARIES[999]?.bin).toBe(999);
  });

  it("plots coefficient and exponent against {T} for every thousandth", () => {
    const series = fracTSliceBoundarySeries();
    expect(series).toHaveLength(1000);
    expect(series[0]).toEqual({
      fracT: 0,
      a: FRAC_T_SLICE_BOUNDARIES[0]?.a,
      p: FRAC_T_SLICE_BOUNDARIES[0]?.p,
    });
    expect(series[999]?.fracT).toBeCloseTo(0.999, 12);
  });

  it("looks up every exact-{T} slider thousandth", () => {
    expect(fracTSliceBoundaryForJustOne(0.047)?.bin).toBe(47);
    expect(fracTSliceBoundaryForJustOne(0.400)?.bin).toBe(400);
    expect(fracTSliceBoundaryForJustOne(0.999)?.bin).toBe(999);
  });

  it("is a lower envelope T = a |σ|^p", () => {
    const row = fracTSliceBoundaryForJustOne(0);
    if (row === null) throw new Error("missing bin 0");
    expect(fracTSliceBoundaryT(1, row)).toBeCloseTo(row.a, 10);
    expect(fracTSliceBoundaryT(-1, row)).toBeCloseTo(row.a, 10);
  });

  it("colors {T}=0 as spectrum red on the classic ramp and dark grey on the quarter-band ramp", () => {
    expect(fracTSpectrumHex(0)).toBe(0xff0000);
    expect(fracTSpectrumCss(0)).toBe("#ff0000");
    expect(SPECTRUM_SECONDARY_HALF_WIDTH).toBe(0.0001);
    expect(DEFAULT_SPECTRUM_FEATHER).toBe(0.015);
    expect(quarterSpectrumCss(0)).toBe("#555555");
    expect(quarterSpectrumCss(1)).toBe("#555555");
    expect(quarterSpectrumCss(0.25)).toBe("#ff8c00");
    expect(quarterSpectrumCss(0.5)).toBe("#00ffff");
    expect(quarterSpectrumCss(0.75)).toBe("#ff00ff");
    expect(quarterSpectrumHex(0.125)).toBe(0xff0000);
    expect(quarterSpectrumHex(0.375)).toBe(0xffff00);
    expect(quarterSpectrumHex(0.625)).toBe(0x0080ff);
    expect(quarterSpectrumHex(0.875)).toBe(0x00ff33);
  });

  it("rejects a table that is not 1000 ordered bins", () => {
    expect(() => parseFracTSliceBoundaryTable({ curves: [] })).toThrow();
  });

  it("is the π-boundary times the joint-angle × RS-quarter factor", () => {
    expect(fracTClosedBoundaryP(0.146)).toBeCloseTo(1 / 0.62, 12);
    expect(fracTClosedBoundaryP(0.5)).toBeCloseTo(1 / 0.62, 12);
    expect(fracTClosedBoundaryFactor(0.5)).toBeCloseTo(1, 12);
    expect(fracTClosedBoundaryFactor(0)).toBeCloseTo(4, 12);
    expect(fracTClosedBoundaryT(-50, 0.5)).toBeCloseTo(piBoundaryT(-50), 12);
    expect(fracTClosedBoundaryT(-50, 0)).toBeCloseTo(4 * piBoundaryT(-50), 12);
    expect(fracTClosedBoundaryT(-50, 0.25)).toBeGreaterThan(fracTClosedBoundaryT(-50, 0.5) * 100);
    expect(fracTClosedBoundaryLabel(0.146)).toBe(
      "0.146: ((|σ|+2π)/π)^{1/0.62} (2−sin πθ)²/|cos 2πθ|",
    );
  });

  it("labels the toggle with the thousandth and T = a |σ|^p", () => {
    expect(fracTSliceBoundaryLabel(0)).toMatch(/^0\.000: T = /);
    expect(fracTSliceBoundaryLabel(0.400)).toMatch(/^0\.400: T = /);
    expect(fracTSliceBoundaryLabel(0.999)).toMatch(/^0\.999: T = /);
  });
});

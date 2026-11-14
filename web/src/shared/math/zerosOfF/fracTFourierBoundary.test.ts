import {
  FRAC_T_FOURIER_BOUNDARY,
  fracTFourierBoundaryLP,
  fracTFourierBoundaryLabel,
  fracTFourierBoundaryT,
  parseFracTFourierBoundaryFit,
} from "@/shared/math/zerosOfF/fracTFourierBoundary";

describe("frac-T Fourier envelope", () => {
  it("loads 10 harmonics and eight spike terms", () => {
    expect(FRAC_T_FOURIER_BOUNDARY.harmonics).toBe(10);
    expect(FRAC_T_FOURIER_BOUNDARY.L.cos).toHaveLength(10);
    expect(FRAC_T_FOURIER_BOUNDARY.P.sin).toHaveLength(10);
    expect(FRAC_T_FOURIER_BOUNDARY.spikes).toHaveLength(8);
  });

  it("rejects a payload that is not a Fourier+spike fit", () => {
    expect(() => parseFracTFourierBoundaryFit({})).toThrow();
  });

  it("matches the Python log-log evaluation at a few thousandths", () => {
    expect(fracTFourierBoundaryT(-50, 0.146)).toBeCloseTo(232.41841419321284, 8);
    expect(fracTFourierBoundaryT(-50, 0.5)).toBeCloseTo(88.4624522251594, 8);
    const atQuarter = fracTFourierBoundaryLP(0.213);
    expect(atQuarter.L).toBeGreaterThan(2);
    expect(atQuarter.P).toBeLessThan(1.4);
  });

  it("skips σ=0 and labels the toggle with the thousandth", () => {
    expect(Number.isNaN(fracTFourierBoundaryT(0, 0.146))).toBe(true);
    expect(fracTFourierBoundaryLabel(0.146)).toBe("0.146: Fourier (10 harm.) T=e^{L} |σ|^{P}");
  });
});

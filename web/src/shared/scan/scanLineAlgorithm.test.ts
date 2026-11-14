import { scanLine, type ScanLineInput } from "@/shared/scan/scanLineAlgorithm";

function baseInput(overrides: Partial<ScanLineInput> = {}): ScanLineInput {
  return {
    sigma: -30,
    tMin: 1,
    tMax: 100,
    samplesPerT: 300,
    bisectionIters: 15,
    variant: "R1ak",
    seed: 42,
    ...overrides,
  };
}

describe("scanLine (sign-change algorithm)", () => {
  it("records candidates that satisfy both Z=0 and φ=0 (sign-change)", () => {
    const out = scanLine(baseInput());

    // Coarse Z sampling cost ~ samplesPerT * periods. Scan floor at σ=-30 is
    // ~26.7 (piBoundaryT(−30) − 25), so ~73 periods get scanned out of 99.
    expect(out.pointsEvaluated).toBeGreaterThan(70 * 300);
    expect(out.t.length).toBe(out.yVal.length);
    expect(out.t.length).toBe(out.sigma1Mag.length);
    expect(out.t.length).toBe(out.r1Mag.length);
    expect(out.t.length).toBe(out.phaseDev.length);
    // Magnitudes balanced (within bisection tolerance) — Z ≈ 0 at every t*.
    for (let i = 0; i < out.t.length; i++) {
      const ratio = out.r1Mag[i]! / out.sigma1Mag[i]!;
      expect(Math.abs(Math.log(ratio))).toBeLessThan(0.01);
    }
    // Phase residual is small at every recorded point — the φ-sign-change
    // filter only accepts brackets where φ crosses zero, so |φ| at the
    // bracket midpoint is bounded by the bracket width's worth of slope.
    expect(out.phaseDev.every((p) => p < 0.05)).toBe(true);
  });

  it("is deterministic across runs", () => {
    const a = scanLine(baseInput());
    const b = scanLine(baseInput());
    expect(Array.from(a.t)).toEqual(Array.from(b.t));
    expect(Array.from(a.yVal)).toEqual(Array.from(b.yVal));
  });

  it("returns empty result if tMin >= tMax", () => {
    const out = scanLine(baseInput({ tMin: 50, tMax: 50 }));
    expect(out.t.length).toBe(0);
  });
});

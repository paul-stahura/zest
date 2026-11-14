import {
  r1psHuntCoarseSamples,
  r1psHuntScanRequest,
  uniformSigmaLineCount,
} from "@/shared/scan/r1psHuntEstimate";

describe("r1psHuntEstimate", () => {
  it("uses 2250 σ-rows on the −100…−25, 30-per-unit grid", () => {
    expect(uniformSigmaLineCount(-100, -25, 30)).toBe(2250);
  });

  it("counts 1.125e9 coarse samples at 1000 per integer-T period", () => {
    expect(r1psHuntScanRequest().variant).toBe("R1ps");
    expect(r1psHuntCoarseSamples()).toBe(1_125_000_000);
  });
});

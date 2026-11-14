import {
  HUNT4_SLICE,
  HUNT5_SLICE,
  harvestSigmaSplitKeeps,
  harvestSliceId,
  harvestTBandId,
} from "@/shared/math/zerosOfF/harvestTBands";

describe("harvestTBandId", () => {
  it("puts the four edges in the bands the overlay table names", () => {
    expect(harvestTBandId(3900)).toBe("t3900To3925");
    expect(harvestTBandId(3924.9)).toBe("t3900To3925");
    expect(harvestTBandId(3925)).toBe("t3925To3950");
    expect(harvestTBandId(3950)).toBe("t3950To3975");
    expect(harvestTBandId(3975)).toBe("t3975To4000");
    expect(harvestTBandId(4000)).toBe("t3975To4000");
  });

  it("rejects T outside the Hunt-3 accordion window", () => {
    expect(harvestTBandId(3899.9)).toBeNull();
    expect(harvestTBandId(4000.1)).toBeNull();
  });
});

describe("harvestSigmaSplitKeeps", () => {
  it("keeps σ < 0 in the left column and [0, 1] in the right", () => {
    expect(harvestSigmaSplitKeeps(-3, "sigmaLt0")).toBe(true);
    expect(harvestSigmaSplitKeeps(0.4, "sigmaLt0")).toBe(false);
    expect(harvestSigmaSplitKeeps(0, "sigmaLt0")).toBe(false);
    expect(harvestSigmaSplitKeeps(-0.1, "sigma0To1")).toBe(false);
    expect(harvestSigmaSplitKeeps(0, "sigma0To1")).toBe(true);
    expect(harvestSigmaSplitKeeps(1, "sigma0To1")).toBe(true);
  });
});

describe("harvestSliceId", () => {
  it("names the T=3975 σ < 0 cell", () => {
    expect(harvestSliceId("t3975To4000", "sigmaLt0")).toBe("t3975To4000_sigmaLt0");
  });
});

describe("HUNT4_SLICE", () => {
  it("points at the single Hunt-4 window bin", () => {
    expect(HUNT4_SLICE.url).toBe(`${import.meta.env.BASE_URL}zeros-of-f/t-398-to-3900-sigma-neg50-to-neg10.bin`);
  });
});

describe("HUNT5_SLICE", () => {
  it("points at the Hunt-5 window bin", () => {
    expect(HUNT5_SLICE.url).toBe(`${import.meta.env.BASE_URL}zeros-of-f/t-398-to-3900-sigma-neg20-to-0.bin`);
  });
});

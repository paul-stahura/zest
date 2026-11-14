import { unionHarvestExtents } from "@/shared/math/zerosOfF/harvestExtent";

describe("unionHarvestExtents", () => {
  it("returns null when every layer is empty", () => {
    expect(unionHarvestExtents([{
      sigmaMin: 0, sigmaMax: 1, tMin: 0, tMax: 1, count: 0,
    }])).toBeNull();
  });

  it("keeps a single non-empty strip", () => {
    const only = {
      sigmaMin: -400, sigmaMax: -50, tMin: 2, tMax: 4000, count: 10,
    };
    expect(unionHarvestExtents([only])).toEqual(only);
  });

  it("spans both harvest bands on σ and T", () => {
    expect(unionHarvestExtents([
      { sigmaMin: -400, sigmaMax: -50, tMin: 2.5, tMax: 3999, count: 100 },
      { sigmaMin: -499, sigmaMax: -400.1, tMin: 8, tMax: 3900, count: 5 },
    ])).toEqual({
      sigmaMin: -499,
      sigmaMax: -50,
      tMin: 2.5,
      tMax: 3999,
      count: 105,
    });
  });
});

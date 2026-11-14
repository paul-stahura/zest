import {
  isSiegelZerosHarvest,
  parseZerosHarvestFamily,
} from "@/shared/math/zerosOfF/harvestFamily";

describe("parseZerosHarvestFamily", () => {
  it("keeps Siegel as the default and accepts the hunt families", () => {
    expect(parseZerosHarvestFamily(undefined)).toBe("siegel");
    expect(parseZerosHarvestFamily("siegel")).toBe("siegel");
    expect(parseZerosHarvestFamily("r1ps")).toBe("r1ps");
    expect(parseZerosHarvestFamily("r2ps")).toBe("r2ps");
    expect(parseZerosHarvestFamily("other")).toBe("siegel");
    expect(isSiegelZerosHarvest("siegel")).toBe(true);
    expect(isSiegelZerosHarvest("r1ps")).toBe(false);
    expect(isSiegelZerosHarvest("r2ps")).toBe(false);
  });
});

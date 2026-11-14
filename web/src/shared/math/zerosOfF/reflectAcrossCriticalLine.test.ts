import { reflectAcrossCriticalLine } from "@/shared/math/zerosOfF/reflectAcrossCriticalLine";

describe("reflectAcrossCriticalLine", () => {
  it("sends σ to 1 − σ and fixes the critical line", () => {
    expect(reflectAcrossCriticalLine(0.5)).toBe(0.5);
    expect(reflectAcrossCriticalLine(10)).toBe(-9);
    expect(reflectAcrossCriticalLine(-25)).toBe(26);
    expect(reflectAcrossCriticalLine(reflectAcrossCriticalLine(7.25))).toBe(7.25);
  });
});

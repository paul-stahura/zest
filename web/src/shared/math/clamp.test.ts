import { clamp } from "@/shared/math/clamp";

describe("clamp", () => {
  it("clamps values below the minimum", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("clamps values above the maximum", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("returns the value when already inside the range", () => {
    expect(clamp(3, 0, 10)).toBe(3);
  });
});

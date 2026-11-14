import { valueAtSliderFraction } from "@/shared/toolbox/RangeSlider";

describe("valueAtSliderFraction", () => {
  it("maps the left end to the low bound and the right end to the high bound", () => {
    expect(valueAtSliderFraction(0, -5, 1, 0.001)).toBe(-5);
    expect(valueAtSliderFraction(1, -5, 1, 0.001)).toBe(1);
  });

  it("places the midpoint of a 0 to 1 range at one half", () => {
    expect(valueAtSliderFraction(0.5, 0, 1, 0.001)).toBeCloseTo(0.5, 6);
  });

  it("keeps a drag past either end inside the range", () => {
    expect(valueAtSliderFraction(-0.2, -5, 1, 0.001)).toBe(-5);
    expect(valueAtSliderFraction(1.4, -5, 1, 0.001)).toBe(1);
  });
});

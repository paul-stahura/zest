import { spectrumColor } from "@/shared/math/spectrumColor";

describe("spectrumColor", () => {
  it("puts row 3 of 14 at hue 3/14 of the circle", () => {
    const c = spectrumColor(3, 14);
    expect(c.hue).toBeCloseTo((3 / 14) * 360, 10);
  });

  it("does not depend on which rows are enabled", () => {
    expect(spectrumColor(1, 17).hue).toBeCloseTo(360 / 17, 10);
    expect(spectrumColor(17, 17).hue).toBeCloseTo(360, 10);
  });
});

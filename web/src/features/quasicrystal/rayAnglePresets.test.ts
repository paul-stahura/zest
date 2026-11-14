import { FIRST_ZETA_ZEROS_T } from "@/features/quasicrystal/zetaZerosT";
import { rayAnglePresets } from "@/features/quasicrystal/rayAnglePresets";
import { indexToImag } from "@/shared/math/zetaEms";

describe("rayAnglePresets", () => {
  it("evaluates each dropdown entry in radians", () => {
    const byLabel = new Map(rayAnglePresets().map((preset) => [preset.label, preset.radians]));
    const firstT = FIRST_ZETA_ZEROS_T[0] ?? 1;
    expect(byLabel.get("sqrt(t)")).toBeCloseTo(Math.sqrt(indexToImag(firstT, false)), 12);
    expect(byLabel.get("1/sqrt(2)")).toBeCloseTo(1 / Math.sqrt(2), 12);
    expect(byLabel.get("sqrt(3)")).toBeCloseTo(Math.sqrt(3), 12);
    expect(byLabel.get("1/sqrt(3)")).toBeCloseTo(1 / Math.sqrt(3), 12);
    expect(byLabel.get("pi")).toBeCloseTo(Math.PI, 12);
    expect(byLabel.get("2pi")).toBeCloseTo(2 * Math.PI, 12);
    expect(byLabel.get("pi/4")).toBeCloseTo(Math.PI / 4, 12);
    expect(byLabel.get("pi/sqrt(2)")).toBeCloseTo(Math.PI / Math.sqrt(2), 12);
    expect(byLabel.get("sqrt(2*pi)")).toBeCloseTo(Math.sqrt(2 * Math.PI), 12);
  });
});

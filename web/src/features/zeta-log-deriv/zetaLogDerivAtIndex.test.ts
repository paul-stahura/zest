import { calcZetaLogDeriv, chiLogDeriv } from "@/shared/math/b1Star";
import { complex } from "@/shared/math/complex";
import { indexToImag } from "@/shared/math/zetaEms";

import { formatZetaLogDeriv, zetaLogDerivAtIndex } from "@/features/zeta-log-deriv/zetaLogDerivAtIndex";

describe("zetaLogDerivAtIndex", () => {
  it("evaluates ζ′/ζ at s = σ + i I(T)", () => {
    const indexT = 4.5;
    const sigma = 0.75;
    const sample = zetaLogDerivAtIndex(sigma, indexT);
    const t = indexToImag(indexT, false);
    const z = calcZetaLogDeriv(sigma, t);
    expect(sample.kind).toBe("value");
    if (sample.kind !== "value") return;
    expect(sample.t).toBeCloseTo(t, 8);
    expect(sample.re).toBeCloseTo(z.re, 8);
    expect(sample.im).toBeCloseTo(z.im, 8);
  });

  it("has real part equal to w/2 on the critical line", () => {
    const sample = zetaLogDerivAtIndex(0.5, 4);
    const t = indexToImag(4, false);
    const w = chiLogDeriv(complex(0.5, t));
    expect(sample.kind).toBe("value");
    if (sample.kind !== "value") return;
    expect(sample.re).toBeCloseTo(w.re / 2, 6);
  });
});

describe("formatZetaLogDeriv", () => {
  it("prints a real and imaginary part", () => {
    expect(formatZetaLogDeriv({ kind: "value", t: 1, re: -1.5, im: 0.25 })).toBe(
      "-1.500000 + 0.250000 i",
    );
  });

  it("names a pole neighborhood instead of a number", () => {
    expect(formatZetaLogDeriv({ kind: "undefined", t: 1 })).toBe("undefined (near a zero of ζ)");
  });
});

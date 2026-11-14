import { calcAkSaddleTerms, calcG0, chirpSumSpiral, saddleRadius, stripIndex } from "@/shared/math/akSaddleTargets";
import { complex } from "@/shared/math/complex";
import { indexToImag } from "@/shared/math/zetaEms";

describe("stripIndex", () => {
  it("puts spiral index T on the integer strip N, with M = N + 1/2", () => {
    const t = indexToImag(100, false);
    expect(stripIndex(t)).toBe(100);
    expect(calcAkSaddleTerms(0.5, t).m).toBe(100.5);
  });

  it("keeps T = 99.6 in strip 100, above floor(T)", () => {
    const t = indexToImag(99.6, false);
    expect(stripIndex(t)).toBe(100);
  });

  it("opens the next strip at t = 2π(N+1)²", () => {
    expect(stripIndex(2 * Math.PI * 100 * 100)).toBe(100);
    expect(stripIndex(2 * Math.PI * 101 * 101)).toBe(101);
  });
});

describe("calcG0", () => {
  it("has linear coefficient π e^{-5πi/8} / (2√2) at y = −1", () => {
    const z = 1e-6;
    const g = calcG0(complex(-1 + z, 0));
    const coeff = { re: g.re / z, im: g.im / z };
    const scale = Math.PI / (2 * Math.SQRT2);
    const angle = -5 * Math.PI / 8;
    expect(coeff.re).toBeCloseTo(scale * Math.cos(angle), 5);
    expect(coeff.im).toBeCloseTo(scale * Math.sin(angle), 5);
  });
});

describe("saddleRadius", () => {
  it("puts the m = 0 saddle on the positive axis at y = −1", () => {
    const height = 100.5;
    const radius = saddleRadius(complex(-1, 0), 0, height);
    const expected = Math.sqrt(height * 0.5) + 0.25;
    expect(radius.im).toBeCloseTo(0, 8);
    expect(radius.re).toBeCloseTo(expected, 1);
    expect(radius.re).toBeGreaterThan(0);
  });
});

describe("chirpSumSpiral", () => {
  it("runs from the origin to the saddle value", () => {
    const tip = complex(-0.4, 1.2);
    const spiral = chirpSumSpiral(tip);
    const first = spiral[0]!;
    const last = spiral[spiral.length - 1]!;
    expect(first.re).toBeCloseTo(0, 12);
    expect(first.im).toBeCloseTo(0, 12);
    expect(last.re).toBeCloseTo(tip.re, 8);
    expect(last.im).toBeCloseTo(tip.im, 8);
  });

  it("curls off the chord from the origin to the tip", () => {
    const spiral = chirpSumSpiral(complex(1, 0));
    let maxAbsIm = 0;
    for (const p of spiral) {
      if (Math.abs(p.im) > maxAbsIm) maxAbsIm = Math.abs(p.im);
    }
    expect(maxAbsIm).toBeGreaterThan(0.05);
  });
});

describe("calcAkSaddleTerms", () => {
  it("maps the lower edge of S_100 to u = −1 + 1/(4M)", () => {
    const n = 100;
    const height = n + 0.5;
    const t = 2 * Math.PI * n * n;
    const terms = calcAkSaddleTerms(-40, t);
    expect(terms.n).toBe(n);
    expect(terms.y.re).toBeCloseTo(-1 + 1 / (4 * height), 12);
    expect(terms.y.im).toBeCloseTo(40 / (2 * Math.PI * height), 12);
  });

  it("returns a finite four-term sum inside the strip", () => {
    const t = indexToImag(20, false);
    const terms = calcAkSaddleTerms(0.5, t);
    expect(terms.n).toBe(20);
    for (const value of [terms.g0, terms.q0, terms.q1, terms.q2, terms.q3, terms.q4, terms.sum]) {
      expect(Number.isFinite(value.re)).toBe(true);
      expect(Number.isFinite(value.im)).toBe(true);
    }
    expect(terms.sum.re).toBeCloseTo(
      terms.g0.re + terms.q0.re + terms.q1.re + terms.q2.re,
      12,
    );
  });
});

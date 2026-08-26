import {
  calcNLinks,
  calculateInverseVectors,
  calculateVectors,
  calculateZetaTarget,
  getPrimeImaginaryPart,
  reflectLFunctionVectors,
} from "@/shared/math/lFunctionCalculator";
import { complex } from "@/shared/math/complex";

describe("getPrimeImaginaryPart I3", () => {
  it("hits fold events exactly at even T", () => {
    // Even T: gate=0 → exact form; scanner treats folds as algebraically exact.
    expect(getPrimeImaginaryPart(3, 2, true, false)).toBeCloseTo(18.12944057, 5);
    expect(getPrimeImaginaryPart(3, 4, true, false)).toBeCloseTo(74.69484401, 5);
    expect(getPrimeImaginaryPart(3, 10, true, false)).toBeCloseTo(470.539937, 4);
  });

  it("lands near scanned bisector events at odd T", () => {
    // Geom + (0.390914 + 0.01712/T²); scanned events from assess_I3_T1_100.csv.
    expect(getPrimeImaginaryPart(3, 1, true, false)).toBeCloseTo(4.9404, 4);
    expect(getPrimeImaginaryPart(3, 3, true, false)).toBeCloseTo(42.62919, 4);
    expect(getPrimeImaginaryPart(3, 5, true, false)).toBeCloseTo(118.026584, 4);
    expect(getPrimeImaginaryPart(3, 19, true, false)).toBeCloseTo(1701.388835, 4);
  });

  it("does not use the old growing power correction at odd T", () => {
    // Old shipped formula gave ~1936 at T=19; correct value is ~1701.
    const t19 = getPrimeImaginaryPart(3, 19, true, false);
    expect(t19).toBeLessThan(1710);
    expect(t19).toBeGreaterThan(1700);
  });

  it("improves T=1 over the constant-0.391 offset", () => {
    // Constant 0.391 undershoots T=1 by ~0.017; a+c/T² recovers the event.
    const t1 = getPrimeImaginaryPart(3, 1, true, false);
    expect(t1).toBeGreaterThan(4.94);
    expect(t1).toBeLessThan(4.941);
  });
});

describe("getPrimeImaginaryPart I5", () => {
  it("tracks scanned events for p=5", () => {
    // Bisector residues (non-multiples of 4): shipped offset matches scans.
    expect(getPrimeImaginaryPart(5, 1, true, false)).toBeCloseTo(2.18244, 3);
    expect(getPrimeImaginaryPart(5, 6, true, false)).toBeCloseTo(71.581951, 2);
    expect(getPrimeImaginaryPart(5, 10, true, false)).toBeCloseTo(197.245465, 2);
  });
});

describe("calculateZetaTarget", () => {
  it("places the L3 cross near the spiral head at large t", () => {
    // Regression: fixed N=200 Hurwitz EMS put the cross ~1 unit off the head
    // at T≈19.24, σ=0.5, usePrimeImag off (mpmath L ≈ 2.693+5.223i).
    const T = 19.239217;
    const prime = 3;
    const t = getPrimeImaginaryPart(prime, T, false, false);
    const s = complex(0.5, t);
    const head = calculateVectors(calcNLinks(T, prime), prime, s).vectors.at(-1)!;
    const target = calculateZetaTarget(prime, s);

    expect(target.re).toBeCloseTo(2.693487, 2);
    expect(target.im).toBeCloseTo(5.222537, 2);
    expect(Math.hypot(head.x - target.re, head.y - target.im)).toBeLessThan(0.05);
  });
});

describe("L1 inv/refl tails", () => {
  it("anchors inv and refl tails on analytic L across a calcNLinks tick", () => {
    // These two T values straddle an nLinks increment (273→274). Partial-sum
    // heads jump; inv/refl tails must stay on the continuous analytic L.
    const prime = 3;
    const samples = [6.276116, 6.276196].map(T => {
      const t = getPrimeImaginaryPart(prime, T, false, false);
      const s = complex(0.5, t);
      const target = calculateZetaTarget(prime, s);
      const targetPt = { x: target.re, y: target.im };
      const n = calcNLinks(T, prime);
      const fwd = calculateVectors(n, prime, s);
      const inv = calculateInverseVectors(n, prime, s, targetPt);
      const refl = reflectLFunctionVectors(fwd, targetPt);
      return { T, n, targetPt, invTail: inv.vectors[0]!, reflTail: refl.vectors[0]! };
    });

    expect(samples[0]!.n).toBe(273);
    expect(samples[1]!.n).toBe(274);

    for (const s of samples) {
      expect(s.invTail.x).toBeCloseTo(s.targetPt.x, 10);
      expect(s.invTail.y).toBeCloseTo(s.targetPt.y, 10);
      expect(s.reflTail.x).toBeCloseTo(s.targetPt.x, 10);
      expect(s.reflTail.y).toBeCloseTo(s.targetPt.y, 10);
    }

    // Analytic L itself moves only a little across the tick (smooth in T).
    const dTarget = Math.hypot(
      samples[1]!.targetPt.x - samples[0]!.targetPt.x,
      samples[1]!.targetPt.y - samples[0]!.targetPt.y,
    );
    expect(dTarget).toBeLessThan(0.05);
  });
});

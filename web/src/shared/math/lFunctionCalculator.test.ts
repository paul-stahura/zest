import {
  calcNLinks,
  calculateFLInverseVectors,
  calculateFLTarget,
  calculateFLVectors,
  calculateInverseVectors,
  calculateVectors,
  calculateZetaTarget,
  getPrimeImaginaryPart,
  reflectLFunctionVectors,
  flipLFunctionVectorsOriginToTarget,
  TITCHMARSH_FL_TAN_THETA,
  TITCHMARSH_FL_THETA,
  titchmarshFLCoeff,
  titchmarshLCoeff,
  calculateTitchmarshLTarget,
  calculateTitchmarshLVectors,
  calculateTitchmarshLInverseVectors,
  calculateHurwitzCharacterInverseSumVectors,
  calculateHurwitzCharacterTarget,
  combineHurwitzCharacterBasis,
  hurwitzCharacterBasis,
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

describe("flipLFunctionVectorsOriginToTarget", () => {
  it("starts at the origin and ends on the analytic target", () => {
    const prime = 3;
    const T = 6.276116;
    const t = getPrimeImaginaryPart(prime, T, false, false);
    const s = complex(0.5, t);
    const target = calculateZetaTarget(prime, s);
    const targetPt = { x: target.re, y: target.im };
    const fwd = calculateVectors(calcNLinks(T, prime), prime, s);
    const flipped = flipLFunctionVectorsOriginToTarget(fwd, targetPt);
    const head = flipped[0];
    const tail = flipped[flipped.length - 1];
    expect(head).toBeDefined();
    expect(tail).toBeDefined();
    if (head === undefined || tail === undefined) return;
    expect(Math.hypot(head.x, head.y)).toBeLessThan(0.05);
    expect(Math.hypot(tail.x - targetPt.x, tail.y - targetPt.y)).toBeLessThan(1e-10);
  });
});

describe("Titchmarsh f_L", () => {
  it("stores tan θ from (10.25.1) and θ = arctan of that", () => {
    expect(TITCHMARSH_FL_TAN_THETA).toBeCloseTo(0.284079043840412, 15);
    expect(TITCHMARSH_FL_THETA).toBeCloseTo(Math.atan(TITCHMARSH_FL_TAN_THETA), 15);
    expect(TITCHMARSH_FL_THETA).toBeCloseTo(0.276787179448523, 12);
  });

  it("repeats four links then a phantom every five n", () => {
    const tan = TITCHMARSH_FL_TAN_THETA;
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(titchmarshFLCoeff)).toEqual([
      1, tan, -tan, -1, 0, 1, tan, -tan, -1, 0,
    ]);
  });

  it("puts a phantom on every multiple of 5 and keeps the partial sum", () => {
    const s = complex(2, 0);
    const walked = calculateFLVectors(10, s);
    expect(walked.phantomVectors).toHaveLength(2);
    expect(walked.vectors).toHaveLength(9);
    const head = walked.vectors.at(-1)!;
    const tan = TITCHMARSH_FL_TAN_THETA;
    const expected =
      1 + tan / 4 - tan / 9 - 1 / 16 + 1 / 36 + tan / 49 - tan / 64 - 1 / 81;
    expect(head.x).toBeCloseTo(expected, 12);
    expect(head.y).toBeCloseTo(0, 12);
  });

  it("places the analytic cross near the spiral head", () => {
    const s = complex(0.5, 14.134725);
    const n = calcNLinks(3, 5);
    const head = calculateFLVectors(n, s).vectors.at(-1)!;
    const target = calculateFLTarget(s);
    expect(Math.hypot(head.x - target.re, head.y - target.im)).toBeLessThan(0.08);
    const inv = calculateFLInverseVectors(n, s, { x: target.re, y: target.im });
    expect(inv.vectors[0]!.x).toBeCloseTo(target.re, 10);
    expect(inv.vectors[0]!.y).toBeCloseTo(target.im, 10);
  });
});

describe("Titchmarsh L1 L2", () => {
  it("repeats 1, ±i, ∓i, −1, then a phantom every five n", () => {
    const l1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => titchmarshLCoeff(1, n));
    const l2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => titchmarshLCoeff(2, n));
    expect(l1.map(c => [c.re, c.im])).toEqual([
      [1, 0], [0, 1], [0, -1], [-1, 0], [0, 0],
      [1, 0], [0, 1], [0, -1], [-1, 0], [0, 0],
    ]);
    expect(l2.map(c => [c.re, c.im])).toEqual([
      [1, 0], [0, -1], [0, 1], [-1, 0], [0, 0],
      [1, 0], [0, -1], [0, 1], [-1, 0], [0, 0],
    ]);
  });

  it("puts a phantom on every multiple of 5 and walks the complex series", () => {
    const s = complex(2, 0);
    const walked = calculateTitchmarshLVectors(1, 10, s);
    expect(walked.phantomVectors).toHaveLength(2);
    expect(walked.vectors).toHaveLength(9);
    const head = walked.vectors.at(-1)!;
    const expectedRe = 1 - 1 / 16 + 1 / 36 - 1 / 81;
    const expectedIm = 1 / 4 - 1 / 9 + 1 / 49 - 1 / 64;
    expect(head.x).toBeCloseTo(expectedRe, 12);
    expect(head.y).toBeCloseTo(expectedIm, 12);
    const head2 = calculateTitchmarshLVectors(2, 10, s).vectors.at(-1)!;
    expect(head2.x).toBeCloseTo(expectedRe, 12);
    expect(head2.y).toBeCloseTo(-expectedIm, 12);
  });

  it("places the analytic cross near the spiral head", () => {
    const s = complex(0.5, 14.134725);
    const n = calcNLinks(3, 5);
    const head = calculateTitchmarshLVectors(1, n, s).vectors.at(-1)!;
    const target = calculateTitchmarshLTarget(1, s);
    expect(Math.hypot(head.x - target.re, head.y - target.im)).toBeLessThan(0.08);
    const inv = calculateTitchmarshLInverseVectors(1, n, s, { x: target.re, y: target.im });
    expect(inv.vectors[0]!.x).toBeCloseTo(target.re, 10);
    expect(inv.vectors[0]!.y).toBeCloseTo(target.im, 10);
  });
});

describe("calculateHurwitzCharacterInverseSumVectors", () => {
  it("pins the last joint to analytic H and keeps n-order χ, not reversed residues", () => {
    const s = complex(2, 0);
    const chi = [{ re: -1, im: 0 }, { re: 1, im: 0 }];
    const walked = calculateHurwitzCharacterInverseSumVectors(chi, 2, s);
    const h = calculateHurwitzCharacterTarget(chi, s);
    const last = walked.vectors.at(-1)!;
    expect(last.x).toBeCloseTo(h.re, 10);
    expect(last.y).toBeCloseTo(h.im, 10);
    // Unscaled joints: n=1 → (1,0), n=2 → (−1,0). Scale H/(−1) = −H.
    expect(walked.vectors[1]!.x).toBeCloseTo(-h.re, 10);
    expect(walked.vectors[1]!.y).toBeCloseTo(-h.im, 10);
  });
});

describe("hurwitzCharacterBasis", () => {
  it("recombines to the same L as calculateHurwitzCharacterTarget", () => {
    const s = complex(0.5, 76.44254084972411);
    const coeffs = [{ re: 0, im: -1 }, { re: 1, im: 0 }];
    const direct = calculateHurwitzCharacterTarget(coeffs, s);
    const combined = combineHurwitzCharacterBasis(coeffs, hurwitzCharacterBasis(s, 2));
    expect(combined.re).toBeCloseTo(direct.re, 12);
    expect(combined.im).toBeCloseTo(direct.im, 12);
  });
});

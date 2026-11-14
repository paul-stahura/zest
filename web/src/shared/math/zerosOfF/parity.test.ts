import { describe, it, expect } from "vitest";
import goldenJson from "@/shared/math/zerosOfF/__fixtures__/python-golden.json";
import { fScaledAbs } from "@/shared/math/zerosOfF/fScaled";
import { sigma1Scaled } from "@/shared/math/zerosOfF/sigma1Scaled";
import { i1Scaled } from "@/shared/math/zerosOfF/i1Scaled";
import { validate, type Validator } from "@/shared/validation/types";
import { array, number, object } from "@/shared/validation/validator";

type GoldenRow = {
  sigma: number;
  t: number;
  fAbs: number;
  s1Re: number;
  s1Im: number;
  i1Re: number;
  i1Im: number;
};

const validGoldenRow: Validator<GoldenRow> = (data: unknown): GoldenRow =>
  object(data, () => ({
    sigma: number,
    t: number,
    fAbs: number,
    s1Re: number,
    s1Im: number,
    i1Re: number,
    i1Im: number,
  }));

const golden: GoldenRow[] = validate(goldenJson, array(validGoldenRow));

function group<T, K>(rows: T[], keyOf: (row: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const row of rows) {
    const k = keyOf(row);
    let bucket = m.get(k);
    if (!bucket) {
      bucket = [];
      m.set(k, bucket);
    }
    bucket.push(row);
  }
  return m;
}

describe("zerosOfF parity vs Python (formulas_v3speed)", () => {
  const bySigma = group(golden, (r) => r.sigma);

  for (const [sigma, rows] of bySigma) {
    const tArr = Float64Array.from(rows.map((r) => r.t));

    it(`fScaledAbs(R1ak) at σ=${sigma} matches Python within 1e-10 relative`, () => {
      const ts = fScaledAbs(sigma, tArr, "R1ak");
      let maxRel = 0;
      for (let i = 0; i < rows.length; i++) {
        const ref = rows[i]!.fAbs;
        const got = ts[i]!;
        const rel = Math.abs(got - ref) / Math.max(Math.abs(ref), 1e-300);
        if (rel > maxRel) maxRel = rel;
      }
      expect(maxRel).toBeLessThan(1e-10);
    });

    it(`sigma1Scaled at σ=${sigma} matches Python within 1e-10 relative`, () => {
      const out = sigma1Scaled(tArr, sigma);
      let maxRel = 0;
      for (let i = 0; i < rows.length; i++) {
        const refRe = rows[i]!.s1Re;
        const refIm = rows[i]!.s1Im;
        const re = out[i * 2]!;
        const im = out[i * 2 + 1]!;
        const refMag = Math.hypot(refRe, refIm);
        const diff = Math.hypot(re - refRe, im - refIm);
        const rel = diff / Math.max(refMag, 1e-300);
        if (rel > maxRel) maxRel = rel;
      }
      expect(maxRel).toBeLessThan(1e-10);
    });

    it(`i1Scaled at σ=${sigma} matches Python within 1e-10 relative`, () => {
      const out = i1Scaled(sigma, tArr);
      let maxRel = 0;
      for (let i = 0; i < rows.length; i++) {
        const refRe = rows[i]!.i1Re;
        const refIm = rows[i]!.i1Im;
        const re = out[i * 2]!;
        const im = out[i * 2 + 1]!;
        const refMag = Math.hypot(refRe, refIm);
        const diff = Math.hypot(re - refRe, im - refIm);
        const rel = diff / Math.max(refMag, 1e-300);
        if (rel > maxRel) maxRel = rel;
      }
      expect(maxRel).toBeLessThan(1e-10);
    });
  }
});

import { describe, it, expect } from "vitest";
import goldenJson from "@/shared/math/zerosOfF/__fixtures__/python-r1-golden.json";
import { fScaledAbs } from "@/shared/math/zerosOfF/fScaled";
import { r1Scaled } from "@/shared/math/zerosOfF/r1Scaled";
import { validate, type Validator } from "@/shared/validation/types";
import { array, number, object } from "@/shared/validation/validator";

type Row = { sigma: number; t: number; fAbs: number; r1Re: number; r1Im: number };

const validRow: Validator<Row> = (data) =>
  object(data, () => ({
    sigma: number,
    t: number,
    fAbs: number,
    r1Re: number,
    r1Im: number,
  }));

const golden: Row[] = validate(goldenJson, array(validRow));

function group(rows: Row[]): Map<number, Row[]> {
  const m = new Map<number, Row[]>();
  for (const r of rows) {
    let bucket = m.get(r.sigma);
    if (!bucket) {
      bucket = [];
      m.set(r.sigma, bucket);
    }
    bucket.push(r);
  }
  return m;
}

describe("R1 variant parity vs Python (formulas_v3speed)", () => {
  for (const [sigma, rows] of group(golden)) {
    const tArr = Float64Array.from(rows.map((r) => r.t));

    it(`fScaledAbs(R1) at σ=${sigma} matches Python within 1e-8 relative`, () => {
      const ts = fScaledAbs(sigma, tArr, "R1ps");
      let maxRel = 0;
      for (let i = 0; i < rows.length; i++) {
        const ref = rows[i]!.fAbs;
        const got = ts[i]!;
        const rel = Math.abs(got - ref) / Math.max(Math.abs(ref), 1e-300);
        if (rel > maxRel) maxRel = rel;
      }
      expect(maxRel).toBeLessThan(1e-8);
    });

    it(`r1Scaled at σ=${sigma} matches Python within 1e-8 relative`, () => {
      const out = r1Scaled(sigma, tArr);
      let maxRel = 0;
      for (let i = 0; i < rows.length; i++) {
        const refRe = rows[i]!.r1Re;
        const refIm = rows[i]!.r1Im;
        const re = out[i * 2]!;
        const im = out[i * 2 + 1]!;
        const refMag = Math.hypot(refRe, refIm);
        const diff = Math.hypot(re - refRe, im - refIm);
        const rel = diff / Math.max(refMag, 1e-300);
        if (rel > maxRel) maxRel = rel;
      }
      expect(maxRel).toBeLessThan(1e-8);
    });
  }
});

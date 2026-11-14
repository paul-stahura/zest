import { describe, it, expect } from "vitest";
import goldenJson from "@/shared/math/zerosOfF/__fixtures__/python-r1nak-golden.json";
import { fScaledAbs } from "@/shared/math/zerosOfF/fScaled";
import { jMScaled } from "@/shared/math/zerosOfF/jMScaled";
import { validate, type Validator } from "@/shared/validation/types";
import { array, number, object } from "@/shared/validation/validator";

type Row = { sigma: number; t: number; fAbs: number; jmRe: number; jmIm: number };

const validRow: Validator<Row> = (data) =>
  object(data, () => ({
    sigma: number,
    t: number,
    fAbs: number,
    jmRe: number,
    jmIm: number,
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

// Negative-t "R1nak" parity: the mpmath reference (python-r1nak-golden.json) is
// computed from the SAME scaled formula the kernels implement — this checks the
// TS log-space port, not the R1nak approximation accuracy (that is validated
// separately against the exact integral in papers/f-negative-t/validate_r1nak.py).
describe("R1nak variant parity vs mpmath reference", () => {
  for (const [sigma, rows] of group(golden)) {
    const tArr = Float64Array.from(rows.map((r) => r.t));

    it(`fScaledAbs(R1nak) at σ=${sigma} matches reference within 1e-8 relative`, () => {
      const ts = fScaledAbs(sigma, tArr, "R1nak");
      let maxRel = 0;
      for (let i = 0; i < rows.length; i++) {
        const got = ts[i]!;
        expect(Number.isFinite(got)).toBe(true); // locks the overflow fix
        const ref = rows[i]!.fAbs;
        const rel = Math.abs(got - ref) / Math.max(Math.abs(ref), 1e-300);
        if (rel > maxRel) maxRel = rel;
      }
      expect(maxRel).toBeLessThan(1e-8);
    });

    it(`jMScaled at σ=${sigma} matches reference within 1e-8 relative`, () => {
      const out = jMScaled(sigma, tArr);
      let maxRel = 0;
      for (let i = 0; i < rows.length; i++) {
        const refRe = rows[i]!.jmRe;
        const refIm = rows[i]!.jmIm;
        const re = out[i * 2]!;
        const im = out[i * 2 + 1]!;
        expect(Number.isFinite(re) && Number.isFinite(im)).toBe(true);
        const refMag = Math.hypot(refRe, refIm);
        const diff = Math.hypot(re - refRe, im - refIm);
        const rel = diff / Math.max(refMag, 1e-300);
        if (rel > maxRel) maxRel = rel;
      }
      expect(maxRel).toBeLessThan(1e-8);
    });
  }
});

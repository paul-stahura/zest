import {
  HURWITZ_MID_PERP_CATALOG,
  HURWITZ_Q2_FORMULA_ID,
  HURWITZ_Q2_OMEGA_ID,
  HURWITZ_Q3_FORMULA_ID,
  HURWITZ_Q3_OMEGA_ID,
  HURWITZ_Q4_FORMULA_ID,
  HURWITZ_Q4_OMEGA_ID,
  HURWITZ_Q5_FORMULA_ID,
  HURWITZ_Q5_OMEGA_ID,
  HURWITZ_Q6_FORMULA_ID,
  HURWITZ_Q6_OMEGA_ID,
  hurwitzCoeffsInAlphabet,
  hurwitzMidPerpChiLabel,
  hurwitzMidPerpSpectrumIndex,
  hurwitzQ2OmegaCoeffs,
  hurwitzQ3OmegaCoeffs,
  hurwitzQOmegaCoeffs,
  wrapOmegaDegrees,
} from "@/shared/math/hurwitzMidPerpCatalog";
import { midPerpProgressionCoeffs } from "@/shared/math/hurwitzMidPerpSearch";
import { complex } from "@/shared/math/complex";

describe("hurwitzCoeffsInAlphabet", () => {
  it("accepts the five machine letters and rejects 1−√2", () => {
    expect(hurwitzCoeffsInAlphabet([{ re: 0, im: -1 }, { re: 1, im: 0 }])).toBe(true);
    expect(hurwitzCoeffsInAlphabet([{ re: 1 - Math.SQRT2, im: 0 }, { re: 1, im: 0 }])).toBe(false);
  });
});

describe("HURWITZ_MID_PERP_CATALOG", () => {
  it("has unique ids and q in {2,3,4,5,6}", () => {
    const ids = HURWITZ_MID_PERP_CATALOG.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const row of HURWITZ_MID_PERP_CATALOG) {
      expect([2, 3, 4, 5, 6].includes(row.q)).toBe(true);
      expect(row.coeffs).toHaveLength(row.q);
      expect(row.inAlpha).toBe(hurwitzCoeffsInAlphabet(row.coeffs));
    }
  });

  it("recovers the alphabet q=2 and q=4 progression tables", () => {
    const q2 = HURWITZ_MID_PERP_CATALOG.find(r => r.id === "q2-neg-i");
    const q4 = HURWITZ_MID_PERP_CATALOG.find(r => r.id === "q4-w1");
    if (q2 === undefined || q4 === undefined) throw new Error("missing catalog rows");
    const first = q2.coeffs[0];
    const second = q2.coeffs[1];
    if (first === undefined || second === undefined) throw new Error("short χ");
    expect(first.re).toBeCloseTo(0, 12);
    expect(first.im).toBeCloseTo(-1, 12);
    expect(second.re).toBeCloseTo(1, 12);
    expect(second.im).toBeCloseTo(0, 12);
    expect(q2.inAlpha).toBe(true);
    expect(q4.coeffs).toEqual(midPerpProgressionCoeffs(4, complex(1, 0)));
    expect(q4.inAlpha).toBe(true);
    expect(q2.inAlpha).toBe(true);
    expect(hurwitzMidPerpChiLabel(q2)).toBe("-i, 1");
  });

  it("lists every distinct catalog ω at q=6 as 1−ω√6, 1, 1, 1, 1, 1", () => {
    const q6 = HURWITZ_MID_PERP_CATALOG.filter(r => r.q === 6);
    expect(q6.map(r => r.id)).toEqual([
      "q6-w1", "q6-wi", "q6-wm1", "q6-wmi", "q6-wpi4", "q6-wmi4",
    ]);
    const omegas = [
      complex(1, 0),
      complex(0, 1),
      complex(-1, 0),
      complex(0, -1),
      complex(Math.SQRT1_2, Math.SQRT1_2),
      complex(Math.SQRT1_2, -Math.SQRT1_2),
    ];
    expect(q6).toHaveLength(omegas.length);
    for (let i = 0; i < q6.length; i++) {
      const row = q6[i];
      const omega = omegas[i];
      if (row === undefined || omega === undefined) throw new Error("short q=6 row");
      expect(row.coeffs).toEqual(midPerpProgressionCoeffs(6, omega));
      expect(row.inAlpha).toBe(false);
    }
  });

  it("has two q=3 rows so a circle needs a third family ω", () => {
    expect(HURWITZ_MID_PERP_CATALOG.filter(r => r.q === 3)).toHaveLength(2);
  });
});

describe("wrapOmegaDegrees", () => {
  it("wraps into [0, 360) and maps non-finite to 0", () => {
    expect(wrapOmegaDegrees(0)).toBe(0);
    expect(wrapOmegaDegrees(360)).toBe(0);
    expect(wrapOmegaDegrees(-90)).toBe(270);
    expect(wrapOmegaDegrees(Number.NaN)).toBe(0);
  });
});

describe("hurwitzQ2OmegaCoeffs", () => {
  it("builds χ=(1−ω√2,1) at ω=1", () => {
    expect(hurwitzQ2OmegaCoeffs(0)).toEqual(midPerpProgressionCoeffs(2, complex(1, 0)));
    expect(hurwitzQ2OmegaCoeffs(0)[0]).toEqual({ re: 1 - Math.SQRT2, im: 0 });
  });
});

describe("hurwitzQ3OmegaCoeffs", () => {
  it("builds χ=(1−ω√3,1,1) at ω=1 and ω=i", () => {
    expect(hurwitzQ3OmegaCoeffs(0)).toEqual(midPerpProgressionCoeffs(3, complex(1, 0)));
    const atI = hurwitzQ3OmegaCoeffs(90)[0];
    if (atI === undefined) throw new Error("short χ");
    expect(atI.re).toBeCloseTo(1, 12);
    expect(atI.im).toBeCloseTo(-Math.sqrt(3), 12);
    expect(hurwitzQ3OmegaCoeffs(0)[0]).toEqual({ re: 1 - Math.sqrt(3), im: 0 });
  });
});

describe("hurwitzQOmegaCoeffs", () => {
  it("builds the q=4, q=5, and q=6 progression χ at ω=1", () => {
    expect(hurwitzQOmegaCoeffs(4, 0)).toEqual(midPerpProgressionCoeffs(4, complex(1, 0)));
    expect(hurwitzQOmegaCoeffs(5, 0)).toEqual(midPerpProgressionCoeffs(5, complex(1, 0)));
    expect(hurwitzQOmegaCoeffs(6, 0)).toEqual(midPerpProgressionCoeffs(6, complex(1, 0)));
    expect(hurwitzQOmegaCoeffs(1, 0)).toEqual([]);
  });
});

describe("hurwitzMidPerpSpectrumIndex", () => {
  it("inserts slider then formula before each catalog period q=2..6", () => {
    const n = HURWITZ_MID_PERP_CATALOG.length + 10;
    expect(hurwitzMidPerpSpectrumIndex(HURWITZ_Q2_OMEGA_ID)).toEqual({ k: 1, n });
    expect(hurwitzMidPerpSpectrumIndex(HURWITZ_Q2_FORMULA_ID)).toEqual({ k: 2, n });
    expect(hurwitzMidPerpSpectrumIndex(0)).toEqual({ k: 3, n });
    expect(hurwitzMidPerpSpectrumIndex(HURWITZ_Q3_OMEGA_ID)).toEqual({ k: 7, n });
    expect(hurwitzMidPerpSpectrumIndex(HURWITZ_Q3_FORMULA_ID)).toEqual({ k: 8, n });
    expect(hurwitzMidPerpSpectrumIndex(4)).toEqual({ k: 9, n });
    expect(hurwitzMidPerpSpectrumIndex(HURWITZ_Q4_OMEGA_ID)).toEqual({ k: 11, n });
    expect(hurwitzMidPerpSpectrumIndex(HURWITZ_Q4_FORMULA_ID)).toEqual({ k: 12, n });
    expect(hurwitzMidPerpSpectrumIndex(HURWITZ_Q5_OMEGA_ID)).toEqual({ k: 17, n });
    expect(hurwitzMidPerpSpectrumIndex(HURWITZ_Q5_FORMULA_ID)).toEqual({ k: 18, n });
    expect(hurwitzMidPerpSpectrumIndex(HURWITZ_Q6_OMEGA_ID)).toEqual({ k: 24, n });
    expect(hurwitzMidPerpSpectrumIndex(HURWITZ_Q6_FORMULA_ID)).toEqual({ k: 25, n });
  });
});

describe("HURWITZ_MID_PERP_CATALOG period-lifts", () => {
  it("drops period-lifts of a shorter χ such as (−i,1,−i,1) and (i,1,i,1)", () => {
    const labels = HURWITZ_MID_PERP_CATALOG.map(hurwitzMidPerpChiLabel);
    expect(labels).not.toContain("-i, 1, -i, 1");
    expect(labels).not.toContain("i, 1, i, 1");
    expect(labels).toContain("-i, 1");
    expect(labels).toContain("i, 1");
    for (let i = 0; i < HURWITZ_MID_PERP_CATALOG.length; i++) {
      const a = HURWITZ_MID_PERP_CATALOG[i];
      if (a === undefined) continue;
      for (let j = 0; j < i; j++) {
        const b = HURWITZ_MID_PERP_CATALOG[j];
        if (b === undefined) continue;
        const tiled =
          a.coeffs.length > b.coeffs.length
            && a.coeffs.length % b.coeffs.length === 0
            && a.coeffs.every((c, k) => {
              const d = b.coeffs[k % b.coeffs.length];
              return d !== undefined && Math.hypot(c.re - d.re, c.im - d.im) < 1e-10;
            });
        expect(tiled).toBe(false);
      }
    }
  });
});

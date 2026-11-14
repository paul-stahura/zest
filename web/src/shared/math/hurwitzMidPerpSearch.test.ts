import { complex } from "@/shared/math/complex";
import { calculateHurwitzCharacterTarget } from "@/shared/math/lFunctionCalculator";
import { distanceToMidpointPerp } from "@/shared/math/hurwitzZetaPerp";
import { eulerMaclaurenZeta, indexToImag } from "@/shared/math/zetaEms";
import {
  eachHurwitzAlphabetTable,
  hurwitzTableMinimalPeriod,
  midPerpProgressionCoeffs,
  reverseHurwitzCoeffs,
  searchHurwitzMidPerpIdentity,
  searchHurwitzMidPerpNearFills,
} from "@/shared/math/hurwitzMidPerpSearch";

describe("reverseHurwitzCoeffs", () => {
  it("puts the special residue last so the walk is 1,…,1,x", () => {
    expect(reverseHurwitzCoeffs(midPerpProgressionCoeffs(4, complex(1, 0)))).toEqual([
      { re: 1, im: 0 },
      { re: 1, im: 0 },
      { re: 1, im: 0 },
      { re: -1, im: 0 },
    ]);
  });
});

describe("midPerpProgressionCoeffs", () => {
  it("recovers the alphabet q=4 table when ω=1 and m=4", () => {
    expect(midPerpProgressionCoeffs(4, complex(1, 0))).toEqual([
      { re: -1, im: 0 },
      { re: 1, im: 0 },
      { re: 1, im: 0 },
      { re: 1, im: 0 },
    ]);
  });

  it("puts ζ on the midpoint perp for m=3 with real and imaginary ω", () => {
    const tables = [
      midPerpProgressionCoeffs(3, complex(1, 0)),
      midPerpProgressionCoeffs(3, complex(0, 1)),
    ];
    for (const coeffs of tables) {
      for (const T of [3, 6, 10]) {
        const s = complex(0.5, indexToImag(T, false));
        const H = calculateHurwitzCharacterTarget(coeffs, s);
        const zeta = eulerMaclaurenZeta(s);
        const dist = distanceToMidpointPerp(
          { x: zeta.re, y: zeta.im },
          { x: H.re, y: H.im },
        );
        if (dist === null) throw new Error(`degenerate H at T=${T}`);
        expect(dist, `T=${T}`).toBeLessThan(2e-4);
      }
    }
  });
});

describe("eachHurwitzAlphabetTable", () => {
  it("lists 5^q tables", () => {
    expect(eachHurwitzAlphabetTable(2)).toHaveLength(25);
    expect(eachHurwitzAlphabetTable(3)).toHaveLength(125);
  });
});

describe("hurwitzTableMinimalPeriod", () => {
  it("detects a period-2 table written at q=4", () => {
    const period = hurwitzTableMinimalPeriod([
      { re: 0, im: -1 },
      { re: 1, im: 0 },
      { re: 0, im: -1 },
      { re: 1, im: 0 },
    ]);
    expect(period).toBe(2);
  });

  it("keeps (−1,1,1,1) as period 4", () => {
    const period = hurwitzTableMinimalPeriod([
      { re: -1, im: 0 },
      { re: 1, im: 0 },
      { re: 1, im: 0 },
      { re: 1, im: 0 },
    ]);
    expect(period).toBe(4);
  });
});

describe("searchHurwitzMidPerpIdentity", () => {
  it("recovers the q=2 tables and the new q=4 table, and none at q=3", () => {
    const hits = searchHurwitzMidPerpIdentity({
      moduli: [2, 3, 4],
      indexes: [3, 6, 10],
      maxDist: 5e-5,
    });
    const labels = hits.map(h => `${h.q}: ${h.label}`).sort();
    expect(labels).toEqual([
      "2: -i, 1",
      "2: i, 1",
      "4: -1, 1, 1, 1",
      "4: -i, 1, -i, 1",
    ]);
  });

  it("drops period-lifts when asking for new tables only", () => {
    const hits = searchHurwitzMidPerpIdentity({
      moduli: [2, 3, 4],
      indexes: [3, 6, 10],
      maxDist: 5e-5,
      primitiveOnly: true,
    });
    const labels = hits.map(h => `${h.q}: ${h.label}`).sort();
    expect(labels).toEqual([
      "2: -i, 1",
      "2: i, 1",
      "4: -1, 1, 1, 1",
    ]);
  });

  it("recovers χ=(−1,1,1,1) from a one-deviation fill search at q=4", () => {
    const hits = searchHurwitzMidPerpNearFills({
      moduli: [4],
      indexes: [3, 6, 10],
      maxDist: 5e-5,
      maxDeviations: 1,
      primitiveOnly: true,
    });
    expect(hits.map(h => h.label)).toEqual(["-1, 1, 1, 1"]);
  });

  it("finds only χ=(−1,1,1,1) as a new table among q=3..6", () => {
    const hits = searchHurwitzMidPerpIdentity({
      moduli: [3, 4, 5, 6],
      indexes: [3, 6, 10],
      maxDist: 5e-5,
      primitiveOnly: true,
    });
    expect(hits.map(h => `${h.q}: ${h.label}`)).toEqual(["4: -1, 1, 1, 1"]);
  });
});

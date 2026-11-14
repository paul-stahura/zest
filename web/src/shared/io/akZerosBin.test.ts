import { encodeAkZerosBin, filterAkZeros, fracTInDisplayRange, parseAkZerosBin, selectAkZeros } from "@/shared/io/akZerosBin";

describe("parseAkZerosBin", () => {
  it("round-trips packed σ and index T", () => {
    const points = {
      sigma: new Float64Array([-80, -10]),
      t: new Float64Array([12, 300]),
    };
    const parsed = parseAkZerosBin(encodeAkZerosBin(points));
    expect(Array.from(parsed.sigma)).toEqual([-80, -10]);
    expect(Array.from(parsed.t)).toEqual([12, 300]);
  });
});

describe("filterAkZeros", () => {
  const points = {
    sigma: new Float64Array([-80, -50, -49.9, 0.2]),
    t: new Float64Array([10, 20, 30, 40]),
  };

  it("keeps only σ > −50 when the filter is on", () => {
    const filtered = filterAkZeros(points, true);
    expect(Array.from(filtered.sigma)).toEqual([-49.9, 0.2]);
    expect(Array.from(filtered.t)).toEqual([30, 40]);
  });

  it("keeps every point when the filter is off", () => {
    const filtered = filterAkZeros(points, false);
    expect(filtered).toBe(points);
  });

  it("puts σ = −50 in the lteNeg50 accordion band", () => {
    const left = selectAkZeros(points, {
      sigmaGreaterThanNeg50: false,
      sigmaBand: "lteNeg50",
      fracTRangeMin: 0,
      fracTRangeMax: 1,
      fracTRangeMode: "between",
    });
    expect(Array.from(left.sigma)).toEqual([-80, -50]);
  });
});

describe("fracTInDisplayRange", () => {
  it("keeps frac(T) inside the band in between-mode", () => {
    expect(fracTInDisplayRange(12.25, 0.2, 0.4, "between")).toBe(true);
    expect(fracTInDisplayRange(12.5, 0.2, 0.4, "between")).toBe(false);
  });

  it("keeps frac(T) outside the band in outside-mode", () => {
    expect(fracTInDisplayRange(12.5, 0.2, 0.4, "outside")).toBe(true);
    expect(fracTInDisplayRange(12.25, 0.2, 0.4, "outside")).toBe(false);
  });
});

describe("selectAkZeros", () => {
  const points = {
    sigma: new Float64Array([-10, -10, 0.2]),
    t: new Float64Array([12.1, 12.8, 12.1]),
  };

  it("applies the frac(T) slider on top of the σ filter", () => {
    const filtered = selectAkZeros(points, {
      sigmaGreaterThanNeg50: true,
      fracTRangeMin: 0,
      fracTRangeMax: 0.5,
      fracTRangeMode: "between",
    });
    expect(Array.from(filtered.t)).toEqual([12.1, 12.1]);
    expect(Array.from(filtered.sigma)).toEqual([-10, 0.2]);
  });

  it("widens just-one to two digits when asked", () => {
    const mixed = {
      sigma: new Float64Array([-12, -11]),
      t: new Float64Array([4.101, 4.109]),
    };
    const filtered = selectAkZeros(mixed, {
      sigmaGreaterThanNeg50: false,
      fracTRangeMin: 0,
      fracTRangeMax: 1,
      fracTRangeMode: "between",
      fracTFilterKind: "justOne",
      fracTJustOne: 0.10,
      fracTJustOneDigits: 2,
    });
    expect(Array.from(filtered.t)).toEqual([4.101, 4.109]);
  });

  it("keeps only the just-one thousandths bin when that filter is on", () => {
    const filtered = selectAkZeros(points, {
      sigmaGreaterThanNeg50: false,
      fracTRangeMin: 0,
      fracTRangeMax: 1,
      fracTRangeMode: "between",
      fracTFilterKind: "justOne",
      fracTJustOne: 0.1,
    });
    expect(Array.from(filtered.t)).toEqual([12.1, 12.1]);
    expect(Array.from(filtered.sigma)).toEqual([-10, 0.2]);
  });
});

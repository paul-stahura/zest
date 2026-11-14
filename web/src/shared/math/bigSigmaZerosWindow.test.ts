import {
  BIG_SIGMA_ZEROS_VIEW,
  concatSigmaTPoints,
  filterBigSigmaHarvest,
  filterBigSigmaZeros,
  filterSigmaTByFracT,
  formatBigSigmaZeroHover,
  inBigSigmaZerosView,
  keepBigSigmaZero,
  showSigmaTCrosshair,
  nearestZeroIndex,
  zerosOverlayOpacity,
  zerosViewToCss,
} from "@/shared/math/bigSigmaZerosWindow";

describe("keepBigSigmaZero", () => {
  it("keeps the Siegel harvest through the critical strip", () => {
    expect(keepBigSigmaZero(-500, 0)).toBe(true);
    expect(keepBigSigmaZero(-50, 4000)).toBe(true);
    expect(keepBigSigmaZero(0.5, 40)).toBe(true);
    expect(keepBigSigmaZero(1, 40)).toBe(true);
  });

  it("drops points just outside the harvest window", () => {
    expect(keepBigSigmaZero(-500.001, 2000)).toBe(false);
    expect(keepBigSigmaZero(1.001, 40)).toBe(false);
    expect(keepBigSigmaZero(-200, -0.001)).toBe(false);
    expect(keepBigSigmaZero(-200, 4000.001)).toBe(false);
  });
});

describe("filterBigSigmaHarvest", () => {
  it("keeps critical-strip zeros for Siegel and R1ps, and drops σ past 1", () => {
    const points = {
      sigma: new Float64Array([-30, -200, -8, 1.2]),
      t: new Float64Array([1600, 1600, 400, 40]),
    };
    const siegel = filterBigSigmaHarvest(points, "siegel");
    const r1ps = filterBigSigmaHarvest(points, "r1ps");
    expect(Array.from(siegel.sigma)).toEqual([-30, -200, -8]);
    expect(Array.from(r1ps.sigma)).toEqual([-30, -200, -8]);
  });
});

describe("inBigSigmaZerosView", () => {
  it("includes the empty strip from σ = −50 to 1", () => {
    expect(inBigSigmaZerosView(0.5, 6.18)).toBe(true);
    expect(inBigSigmaZerosView(-20, 100)).toBe(true);
    expect(inBigSigmaZerosView(1.001, 100)).toBe(false);
    expect(inBigSigmaZerosView(-500.001, 100)).toBe(false);
  });
});

describe("showSigmaTCrosshair", () => {
  it("is on when enabled and inside the overlay camera", () => {
    expect(showSigmaTCrosshair(true, -80, 400)).toBe(true);
    expect(showSigmaTCrosshair(true, 0.5, 6.18)).toBe(true);
    expect(showSigmaTCrosshair(false, -80, 400)).toBe(false);
    expect(showSigmaTCrosshair(true, 2, 6.18)).toBe(false);
  });
});

describe("concatSigmaTPoints", () => {
  it("joins two clouds in order", () => {
    const joined = concatSigmaTPoints(
      { sigma: new Float64Array([-80]), t: new Float64Array([200]) },
      { sigma: new Float64Array([-450, -420]), t: new Float64Array([10, 20]) },
    );
    expect(Array.from(joined.sigma)).toEqual([-80, -450, -420]);
    expect(Array.from(joined.t)).toEqual([200, 10, 20]);
  });
});

describe("filterBigSigmaZeros", () => {
  it("copies only harvest-window pairs", () => {
    const points = {
      sigma: new Float64Array([-10, -80, -510, -120]),
      t: new Float64Array([200, 200, 200, -1]),
    };
    const filtered = filterBigSigmaZeros(points);
    expect(Array.from(filtered.sigma)).toEqual([-10, -80]);
    expect(Array.from(filtered.t)).toEqual([200, 200]);
  });
});

describe("nearestZeroIndex", () => {
  it("returns the point under the cursor in pixel space", () => {
    const points = {
      sigma: new Float64Array([-200, -50]),
      t: new Float64Array([100, 1000]),
    };
    const bounds = { left: -200, right: -50, top: 1000, bottom: 100 };
    const canvas = { width: 150, height: 900 };
    expect(nearestZeroIndex(points, 0, 900, bounds, canvas, 12)).toBe(0);
    expect(nearestZeroIndex(points, 150, 0, bounds, canvas, 12)).toBe(1);
    expect(nearestZeroIndex(points, 75, 450, bounds, canvas, 12)).toBe(-1);
  });
});

describe("zerosOverlayOpacity", () => {
  it("is off at 0 and linear through the old alphaTest cliff", () => {
    expect(zerosOverlayOpacity(0)).toBe(0);
    expect(zerosOverlayOpacity(0.48)).toBe(0.48);
    expect(zerosOverlayOpacity(1)).toBe(1);
  });
});

describe("zerosViewToCss", () => {
  it("places the axis ticks on the bottom and left of the overlay camera", () => {
    const canvas = { width: 501, height: 4000 };
    const s500 = zerosViewToCss(-500, 0, BIG_SIGMA_ZEROS_VIEW, canvas);
    const s50 = zerosViewToCss(-50, 0, BIG_SIGMA_ZEROS_VIEW, canvas);
    const s0 = zerosViewToCss(0, 0, BIG_SIGMA_ZEROS_VIEW, canvas);
    const t4000 = zerosViewToCss(-500, 4000, BIG_SIGMA_ZEROS_VIEW, canvas);
    expect(s500.x).toBeCloseTo(0, 8);
    expect(s500.y).toBeCloseTo(4000, 8);
    expect(s50.x).toBeCloseTo(450, 8);
    expect(s0.x).toBeCloseTo(500, 8);
    expect(s0.y).toBeCloseTo(4000, 8);
    expect(t4000.x).toBeCloseTo(0, 8);
    expect(t4000.y).toBeCloseTo(0, 8);
  });

  it("maps the overlay corners to the canvas corners", () => {
    const canvas = { width: 150, height: 900 };
    const lo = zerosViewToCss(-500, 0, BIG_SIGMA_ZEROS_VIEW, canvas);
    const hi = zerosViewToCss(1, 4000, BIG_SIGMA_ZEROS_VIEW, canvas);
    expect(lo.x).toBeCloseTo(0, 8);
    expect(lo.y).toBeCloseTo(900, 8);
    expect(hi.x).toBeCloseTo(150, 8);
    expect(hi.y).toBeCloseTo(0, 8);
  });
});

describe("formatBigSigmaZeroHover", () => {
  it("prints σ and T on two lines", () => {
    expect(formatBigSigmaZeroHover(-86.419489, 896.028102)).toBe(
      "σ = -86.419489\nT = 896.028102",
    );
  });
});

describe("filterSigmaTByFracT", () => {
  it("keeps every point when the range band is inactive", () => {
    const points = {
      sigma: new Float64Array([-80, -90]),
      t: new Float64Array([10.1, 10.9]),
    };
    const next = filterSigmaTByFracT(points, {
      kind: "range",
      rangeMin: 0,
      rangeMax: 1,
      rangeMode: "between",
      justOne: 0,
    });
    expect(next).toBe(points);
  });

  it("keeps only the exact-{T} thousandth", () => {
    const points = {
      sigma: new Float64Array([-80, -90, -100]),
      t: new Float64Array([10.047, 10.148, 11.047]),
    };
    const next = filterSigmaTByFracT(points, {
      kind: "justOne",
      rangeMin: 0,
      rangeMax: 1,
      rangeMode: "between",
      justOne: 0.047,
      justOneDigits: 3,
    });
    expect(Array.from(next.t)).toEqual([10.047, 11.047]);
    expect(Array.from(next.sigma)).toEqual([-80, -100]);
  });
});

import {
  fracTInDisplayRange,
  fracTJustOneBin,
  fracTJustOneSnapped,
  fracTDisplayFilterIsInactive,
  fracTKeptByDisplay,
  fracTMatchesJustOne,
  fracTRangeIsInactive,
  fracTThousandthsBin,
  parseFracTJustOneDigits,
  parseFracTQuarterPreset,
  scatterFracSlot,
  twinDragDataDelta,
} from "@/shared/math/zerosOfF/fracTDisplayFilter";

describe("fracTThousandthsBin", () => {
  it("maps 0, mid, and 1 onto 0..999", () => {
    expect(fracTThousandthsBin(0)).toBe(0);
    expect(fracTThousandthsBin(0.247)).toBe(247);
    expect(fracTThousandthsBin(1)).toBe(999);
  });
});

describe("parseFracTJustOneDigits", () => {
  it("keeps 1..4 and falls back to 3", () => {
    expect(parseFracTJustOneDigits(2)).toBe(2);
    expect(parseFracTJustOneDigits(4)).toBe(4);
    expect(parseFracTJustOneDigits(0)).toBe(3);
    expect(parseFracTJustOneDigits(undefined)).toBe(3);
  });
});

describe("fracTJustOneBin", () => {
  it("uses 10^N bins and snaps 1 to the last bin", () => {
    expect(fracTJustOneBin(0.14, 2)).toBe(14);
    expect(fracTJustOneBin(1, 1)).toBe(9);
    expect(fracTJustOneBin(1, 4)).toBe(9999);
    expect(fracTJustOneSnapped(0.1467, 2)).toBeCloseTo(0.14, 10);
    expect(fracTJustOneSnapped(0.146, 3)).toBeCloseTo(0.146, 10);
  });
});

describe("fracTMatchesJustOne", () => {
  it("keeps zeros whose frac(T) starts with the slider's three digits", () => {
    expect(fracTMatchesJustOne(12.2471, 0.247)).toBe(true);
    expect(fracTMatchesJustOne(12.2469, 0.247)).toBe(false);
    expect(fracTMatchesJustOne(12.248, 0.247)).toBe(false);
  });

  it("widens to two digits and tightens to four", () => {
    expect(fracTMatchesJustOne(12.1401, 0.14, 2)).toBe(true);
    expect(fracTMatchesJustOne(12.1499, 0.14, 2)).toBe(true);
    expect(fracTMatchesJustOne(12.1500, 0.14, 2)).toBe(false);
    expect(fracTMatchesJustOne(12.14671, 0.1467, 4)).toBe(true);
    expect(fracTMatchesJustOne(12.14680, 0.1467, 4)).toBe(false);
    expect(fracTMatchesJustOne(12.199, 0.1, 1)).toBe(true);
    expect(fracTMatchesJustOne(12.200, 0.1, 1)).toBe(false);
  });

  it("treats slider 1 as the 0.999 bin", () => {
    expect(fracTMatchesJustOne(5.9994, 1)).toBe(true);
    expect(fracTMatchesJustOne(5.9984, 1)).toBe(false);
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

describe("fracTKeptByDisplay", () => {
  it("uses the thousandths bin when kind is justOne", () => {
    expect(fracTKeptByDisplay(3.1102, {
      kind: "justOne",
      rangeMin: 0,
      rangeMax: 1,
      rangeMode: "between",
      justOne: 0.11,
    })).toBe(true);
    expect(fracTKeptByDisplay(3.1202, {
      kind: "justOne",
      rangeMin: 0,
      rangeMax: 1,
      rangeMode: "between",
      justOne: 0.11,
    })).toBe(false);
    expect(fracTKeptByDisplay(3.119, {
      kind: "justOne",
      rangeMin: 0,
      rangeMax: 1,
      rangeMode: "between",
      justOne: 0.11,
      justOneDigits: 2,
    })).toBe(true);
  });

  it("uses the band when kind is range", () => {
    expect(fracTKeptByDisplay(3.25, {
      kind: "range",
      rangeMin: 0.2,
      rangeMax: 0.4,
      rangeMode: "between",
      justOne: 0.11,
    })).toBe(true);
  });

  it("uses the quarter radios only while the checkbox is on", () => {
    const base = {
      kind: "range" as const,
      rangeMin: 0,
      rangeMax: 1,
      rangeMode: "between" as const,
      justOne: 0,
    };
    expect(fracTKeptByDisplay(4.1, { ...base, quarterEnabled: false, quarterPreset: "q75" })).toBe(true);
    expect(fracTKeptByDisplay(4.1, { ...base, quarterEnabled: true, quarterPreset: "q75" })).toBe(false);
    expect(fracTKeptByDisplay(4.8, { ...base, quarterEnabled: true, quarterPreset: "q75" })).toBe(true);
    expect(fracTKeptByDisplay(4.1, { ...base, quarterEnabled: true, quarterPreset: "ends" })).toBe(true);
    expect(fracTKeptByDisplay(4.5, { ...base, quarterEnabled: true, quarterPreset: "ends" })).toBe(false);
    expect(fracTKeptByDisplay(4.5, { ...base, quarterEnabled: true, quarterPreset: "middle" })).toBe(true);
    expect(fracTKeptByDisplay(4.0, { ...base, quarterEnabled: true, quarterPreset: "q0" })).toBe(true);
    expect(fracTKeptByDisplay(4.25, { ...base, quarterEnabled: true, quarterPreset: "q0" })).toBe(true);
    expect(fracTKeptByDisplay(4.25, { ...base, quarterEnabled: true, quarterPreset: "q25" })).toBe(true);
    expect(fracTKeptByDisplay(4.5, { ...base, quarterEnabled: true, quarterPreset: "q25" })).toBe(true);
    expect(fracTKeptByDisplay(4.6, { ...base, quarterEnabled: true, quarterPreset: "q25" })).toBe(false);
    expect(fracTKeptByDisplay(4.5, { ...base, quarterEnabled: true, quarterPreset: "q50" })).toBe(true);
    expect(fracTKeptByDisplay(4.75, { ...base, quarterEnabled: true, quarterPreset: "q50" })).toBe(true);
    expect(fracTKeptByDisplay(4.9, { ...base, quarterEnabled: true, quarterPreset: "q50" })).toBe(false);
    expect(fracTKeptByDisplay(4.3, { ...base, quarterEnabled: true, quarterPreset: "q25q75" })).toBe(true);
    expect(fracTKeptByDisplay(4.9, { ...base, quarterEnabled: true, quarterPreset: "q25q75" })).toBe(true);
    expect(fracTKeptByDisplay(4.1, { ...base, quarterEnabled: true, quarterPreset: "q25q75" })).toBe(false);
    expect(fracTKeptByDisplay(4.6, { ...base, quarterEnabled: true, quarterPreset: "q25q75" })).toBe(false);
    expect(fracTKeptByDisplay(4.1, { ...base, quarterEnabled: true, quarterPreset: "q0q50" })).toBe(true);
    expect(fracTKeptByDisplay(4.6, { ...base, quarterEnabled: true, quarterPreset: "q0q50" })).toBe(true);
    expect(fracTKeptByDisplay(4.3, { ...base, quarterEnabled: true, quarterPreset: "q0q50" })).toBe(false);
    expect(fracTKeptByDisplay(4.9, { ...base, quarterEnabled: true, quarterPreset: "q0q50" })).toBe(false);
    expect(fracTKeptByDisplay(4.25, { ...base, quarterEnabled: true, quarterPreset: "q25q75" })).toBe(true);
    expect(fracTKeptByDisplay(4.25, { ...base, quarterEnabled: true, quarterPreset: "q0q50" })).toBe(true);
    expect(fracTKeptByDisplay(4.5, { ...base, quarterEnabled: true, quarterPreset: "thirdsBetween" })).toBe(true);
    expect(fracTKeptByDisplay(4.2, { ...base, quarterEnabled: true, quarterPreset: "thirdsBetween" })).toBe(false);
    expect(fracTKeptByDisplay(4.8, { ...base, quarterEnabled: true, quarterPreset: "thirdsBetween" })).toBe(false);
    expect(fracTKeptByDisplay(4.2, { ...base, quarterEnabled: true, quarterPreset: "thirdsOutside" })).toBe(true);
    expect(fracTKeptByDisplay(4.8, { ...base, quarterEnabled: true, quarterPreset: "thirdsOutside" })).toBe(true);
    expect(fracTKeptByDisplay(4.5, { ...base, quarterEnabled: true, quarterPreset: "thirdsOutside" })).toBe(false);
    expect(parseFracTQuarterPreset("thirdsBetween")).toBe("thirdsBetween");
    expect(parseFracTQuarterPreset("thirdsOutside")).toBe("thirdsOutside");
  });
});

describe("fracTRangeIsInactive", () => {
  it("treats a full between-band as inactive", () => {
    expect(fracTRangeIsInactive(0, 1, "between")).toBe(true);
    expect(fracTRangeIsInactive(0.1, 1, "between")).toBe(false);
  });
});

describe("fracTDisplayFilterIsInactive", () => {
  it("stays active when the quarter checkbox is on even if the slider shows everything", () => {
    expect(fracTDisplayFilterIsInactive({
      kind: "range",
      rangeMin: 0,
      rangeMax: 1,
      rangeMode: "between",
      justOne: 0,
      quarterEnabled: true,
      quarterPreset: "q0",
    })).toBe(false);
    expect(fracTDisplayFilterIsInactive({
      kind: "range",
      rangeMin: 0,
      rangeMax: 1,
      rangeMode: "between",
      justOne: 0,
      quarterEnabled: false,
    })).toBe(true);
  });
});

describe("scatterFracSlot", () => {
  const q25 = {
    kind: "range" as const,
    rangeMin: 0,
    rangeMax: 1,
    rangeMode: "between" as const,
    justOne: 0,
    quarterEnabled: true,
    quarterPreset: "q25" as const,
  };

  it("keeps .25–.50 still and marks .75–1 as the dragged twin", () => {
    expect(scatterFracSlot(4.3, q25, true)).toEqual({ keep: true, nudge: false });
    expect(scatterFracSlot(4.5, q25, true)).toEqual({ keep: true, nudge: false });
    expect(scatterFracSlot(4.8, q25, true)).toEqual({ keep: true, nudge: true });
    expect(scatterFracSlot(4.1, q25, true)).toEqual({ keep: false, nudge: false });
    expect(scatterFracSlot(4.6, q25, true)).toEqual({ keep: false, nudge: false });
  });

  it("ignores the toggle unless the .25–.50 radio is the live band", () => {
    expect(scatterFracSlot(4.8, q25, false)).toEqual({ keep: false, nudge: false });
    expect(scatterFracSlot(4.8, { ...q25, quarterPreset: "q75" }, true)).toEqual({
      keep: true,
      nudge: false,
    });
    expect(scatterFracSlot(4.3, { ...q25, quarterEnabled: false }, true)).toEqual({
      keep: true,
      nudge: false,
    });
  });

  it("turns a camera step into data units with the fit scale", () => {
    expect(twinDragDataDelta(2, -4, 0.5, 2)).toEqual({ dx: 4, dy: -2 });
    expect(twinDragDataDelta(1, 1, 0, 1)).toEqual({ dx: 0, dy: 0 });
  });
});

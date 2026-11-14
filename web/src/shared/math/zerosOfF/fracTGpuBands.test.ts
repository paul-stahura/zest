import {
  scatterFracSlot,
  type FracTDisplayFilter,
} from "@/shared/math/zerosOfF/fracTDisplayFilter";
import {
  fracT32,
  fracTGpuBands,
  fracTGpuBandsEqual,
  fracTInBand,
  fracTKeptByBands,
} from "@/shared/math/zerosOfF/fracTGpuBands";

const BASE: FracTDisplayFilter = {
  kind: "range",
  rangeMin: 0,
  rangeMax: 1,
  rangeMode: "between",
  justOne: 0,
  justOneDigits: 3,
  quarterEnabled: false,
  quarterPreset: "ends",
};

const FILTERS: FracTDisplayFilter[] = [
  BASE,
  { ...BASE, rangeMin: 0.2, rangeMax: 0.6 },
  { ...BASE, rangeMin: 0.2, rangeMax: 0.6, rangeMode: "outside" },
  { ...BASE, rangeMin: 0.7, rangeMax: 0.3 },
  { ...BASE, quarterEnabled: true, quarterPreset: "ends" },
  { ...BASE, quarterEnabled: true, quarterPreset: "middle" },
  { ...BASE, quarterEnabled: true, quarterPreset: "q0" },
  { ...BASE, quarterEnabled: true, quarterPreset: "q25" },
  { ...BASE, quarterEnabled: true, quarterPreset: "q50" },
  { ...BASE, quarterEnabled: true, quarterPreset: "q75" },
  { ...BASE, quarterEnabled: true, quarterPreset: "q25q75" },
  { ...BASE, quarterEnabled: true, quarterPreset: "q0q50" },
  { ...BASE, quarterEnabled: true, quarterPreset: "thirdsBetween" },
  { ...BASE, quarterEnabled: true, quarterPreset: "thirdsOutside" },
  { ...BASE, kind: "justOne", justOne: 0, justOneDigits: 1 },
  { ...BASE, kind: "justOne", justOne: 0.37, justOneDigits: 2 },
  { ...BASE, kind: "justOne", justOne: 0.146, justOneDigits: 3 },
  { ...BASE, kind: "justOne", justOne: 0.9999, justOneDigits: 4 },
  { ...BASE, kind: "justOne", justOne: 1, justOneDigits: 3 },
];

/** Integer part plus frac(T) values spread across [0, 1), offset off every band edge. */
function sampleTs(): number[] {
  const out: number[] = [];
  for (let k = 0; k < 20000; k++) out.push(37 + (k + 0.37) / 20000);
  return out;
}

describe("fracTGpuBands", () => {
  it("keeps the same zeros as the CPU rule for every filter", () => {
    for (const filter of FILTERS) {
      const bands = fracTGpuBands(filter, false);
      for (const t of sampleTs()) {
        expect(fracTKeptByBands(fracT32(t), bands)).toBe(scatterFracSlot(t, filter, false).keep);
      }
    }
  });

  it("keeps and nudges the same zeros as the CPU rule while dragging .75–1", () => {
    const filter: FracTDisplayFilter = { ...BASE, quarterEnabled: true, quarterPreset: "q25" };
    const bands = fracTGpuBands(filter, true);
    for (const t of sampleTs()) {
      const slot = scatterFracSlot(t, filter, true);
      expect(fracTKeptByBands(fracT32(t), bands)).toBe(slot.keep);
      expect(fracTInBand(fracT32(t), bands.nudge)).toBe(slot.nudge);
    }
  });

  it("keeps shared quarter endpoints in both neighboring bands", () => {
    const q0 = fracTGpuBands({ ...BASE, quarterEnabled: true, quarterPreset: "q0" }, false);
    const q25 = fracTGpuBands({ ...BASE, quarterEnabled: true, quarterPreset: "q25" }, false);
    expect(fracTKeptByBands(fracT32(4.25), q0)).toBe(true);
    expect(fracTKeptByBands(fracT32(4.25), q25)).toBe(true);
  });

  it("drops the slider endpoints in outside mode", () => {
    const bands = fracTGpuBands({ ...BASE, rangeMin: 0.25, rangeMax: 0.5, rangeMode: "outside" }, false);
    expect(fracTKeptByBands(fracT32(3.25), bands)).toBe(false);
    expect(fracTKeptByBands(fracT32(3.5), bands)).toBe(false);
    expect(fracTKeptByBands(fracT32(3.1), bands)).toBe(true);
    expect(fracTKeptByBands(fracT32(3.9), bands)).toBe(true);
  });

  it("matches exact-{T} for a T whose double frac sits just under the bin", () => {
    const bands = fracTGpuBands({ ...BASE, kind: "justOne", justOne: 0.1, justOneDigits: 1 }, false);
    expect(fracTKeptByBands(fracT32(4.1), bands)).toBe(true);
    expect(fracTKeptByBands(fracT32(5.8), bands)).toBe(false);
  });

  it("ignores the drag toggle unless the .25–.50 band is selected", () => {
    const q75 = { ...BASE, quarterEnabled: true, quarterPreset: "q75" as const };
    expect(fracTGpuBandsEqual(fracTGpuBands(q75, true), fracTGpuBands(q75, false))).toBe(true);
  });

  it("is inactive for the full slider and active for any quarter radio", () => {
    expect(fracTGpuBands(BASE, false).active).toBe(false);
    expect(fracTGpuBands({ ...BASE, quarterEnabled: true }, false).active).toBe(true);
  });
});

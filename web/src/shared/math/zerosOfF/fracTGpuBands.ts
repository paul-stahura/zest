import {
  fracTDisplayFilterIsInactive,
  fracTJustOneBin,
  twinDragEngaged,
  type FracTDisplayFilter,
  type FracTQuarterPreset,
} from "@/shared/math/zerosOfF/fracTDisplayFilter";

/**
 * One frac(T) interval. An open end excludes its endpoint. Bounds are
 * float32 so the shader and the CPU (hover, counts) compare identical
 * numbers and always agree on which dots are drawn.
 */
export type FracTBand = {
  lo: number;
  hi: number;
  loOpen: boolean;
  hiOpen: boolean;
};

/**
 * The Display frac(T) filter as at most two kept bands plus the twin-drag
 * band. Every filter the toolbox can produce is a union of two intervals.
 */
export type FracTGpuBands = {
  /** False when the filter hides nothing. */
  active: boolean;
  first: FracTBand;
  second: FracTBand;
  /** Dots in this band take the twin-drag offset. Empty when not dragging. */
  nudge: FracTBand;
};

/** frac(T) lies in [0, 1), so these bounds act as "no limit". */
const BELOW = -1;
const ABOVE = 2;
/** Same slack as `fracTJustOneBin` and `fracTMatchesJustOne`. */
const JUST_ONE_SLACK = 1e-9;

function band(lo: number, hi: number, loOpen = false, hiOpen = false): FracTBand {
  return { lo: Math.fround(lo), hi: Math.fround(hi), loOpen, hiOpen };
}

/** Matches nothing: no frac is both ≥ 1 and ≤ 0. */
export const EMPTY_FRAC_T_BAND: FracTBand = band(1, 0);

/** Keeps everything and moves nothing. */
export const INACTIVE_FRAC_T_BANDS: FracTGpuBands = {
  active: false,
  first: EMPTY_FRAC_T_BAND,
  second: EMPTY_FRAC_T_BAND,
  nudge: EMPTY_FRAC_T_BAND,
};

function quarterBands(preset: FracTQuarterPreset): [FracTBand, FracTBand] {
  switch (preset) {
    case "ends":
      return [band(BELOW, 0.25), band(0.75, ABOVE)];
    case "middle":
      return [band(0.25, 0.75), EMPTY_FRAC_T_BAND];
    case "q0":
      return [band(BELOW, 0.25), EMPTY_FRAC_T_BAND];
    case "q25":
      return [band(0.25, 0.5), EMPTY_FRAC_T_BAND];
    case "q50":
      return [band(0.5, 0.75), EMPTY_FRAC_T_BAND];
    case "q75":
      return [band(0.75, ABOVE), EMPTY_FRAC_T_BAND];
    case "q25q75":
      return [band(0.25, 0.5), band(0.75, ABOVE)];
    case "q0q50":
      return [band(BELOW, 0.25), band(0.5, 0.75)];
    case "thirdsBetween":
      return [band(0.333, 0.666), EMPTY_FRAC_T_BAND];
    case "thirdsOutside":
      return [band(BELOW, 0.333, false, true), band(0.666, ABOVE, true, false)];
    default: {
      const unreachable: never = preset;
      return unreachable;
    }
  }
}

function justOneBand(justOne: number, digits: 1 | 2 | 3 | 4): FracTBand {
  const scale = 10 ** digits;
  const bin = fracTJustOneBin(justOne, digits);
  const lo = bin === 0 ? BELOW : (bin - JUST_ONE_SLACK) / scale;
  const hi = bin === scale - 1 ? ABOVE : (bin + 1 - JUST_ONE_SLACK) / scale;
  return band(lo, hi, false, true);
}

/**
 * Bands that reproduce `scatterFracSlot` for every frac(T) away from a
 * band edge. At an edge the float32 bounds decide, on the GPU and the CPU
 * alike, so the drawn dots and the hoverable dots never disagree.
 */
export function fracTGpuBands(filter: FracTDisplayFilter, twinDrag: boolean): FracTGpuBands {
  if (twinDragEngaged(filter, twinDrag)) {
    const twin = band(0.75, ABOVE);
    return { active: true, first: band(0.25, 0.5), second: twin, nudge: twin };
  }
  if (fracTDisplayFilterIsInactive(filter)) return INACTIVE_FRAC_T_BANDS;
  if (filter.kind === "justOne") {
    return {
      active: true,
      first: justOneBand(filter.justOne, filter.justOneDigits ?? 3),
      second: EMPTY_FRAC_T_BAND,
      nudge: EMPTY_FRAC_T_BAND,
    };
  }
  if (filter.quarterEnabled === true) {
    const [first, second] = quarterBands(filter.quarterPreset ?? "ends");
    return { active: true, first, second, nudge: EMPTY_FRAC_T_BAND };
  }
  if (filter.rangeMode === "outside") {
    return {
      active: true,
      first: band(BELOW, filter.rangeMin, false, true),
      second: band(filter.rangeMax, ABOVE, true, false),
      nudge: EMPTY_FRAC_T_BAND,
    };
  }
  return {
    active: true,
    first: band(filter.rangeMin, filter.rangeMax),
    second: EMPTY_FRAC_T_BAND,
    nudge: EMPTY_FRAC_T_BAND,
  };
}

/** frac(T) rounded to float32, the value stored in the GPU attribute. */
export function fracT32(t: number): number {
  return Math.fround(t - Math.floor(t));
}

/** Same test as the vertex shader's band check. */
export function fracTInBand(frac: number, b: FracTBand): boolean {
  const aboveLo = b.loOpen ? frac > b.lo : frac >= b.lo;
  const belowHi = b.hiOpen ? frac < b.hi : frac <= b.hi;
  return aboveLo && belowHi;
}

/** Same keep test as the vertex shader. `frac` must come from {@link fracT32}. */
export function fracTKeptByBands(frac: number, bands: FracTGpuBands): boolean {
  return !bands.active || fracTInBand(frac, bands.first) || fracTInBand(frac, bands.second);
}

/** True when two band sets draw the same dots in the same places. */
export function fracTGpuBandsEqual(a: FracTGpuBands, b: FracTGpuBands): boolean {
  return a.active === b.active
    && bandEqual(a.first, b.first)
    && bandEqual(a.second, b.second)
    && bandEqual(a.nudge, b.nudge);
}

function bandEqual(a: FracTBand, b: FracTBand): boolean {
  return a.lo === b.lo && a.hi === b.hi && a.loOpen === b.loOpen && a.hiOpen === b.hiOpen;
}

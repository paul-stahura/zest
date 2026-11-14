/**
 * Display-side keep/hide for zeros by frac(T).
 *
 * The range slider uses a closed band. "just one" keeps zeros whose
 * frac(T) shares the slider's first N decimal digits (N = 1..4).
 * Boundaries stay on the thousandths table (N = 3) regardless of N.
 */

export type FracTRangeMode = "between" | "outside";
export type FracTFilterKind = "range" | "justOne";
export type FracTJustOneDigits = 1 | 2 | 3 | 4;

/**
 * Closed frac(T) bands for the Display radios. "ends" is the two outer
 * quarters together. The pair radios are the two twin-quarter unions.
 * Endpoints belong to every band that names them, so 0.25 is in both
 * 0–.25 and .25–.50.
 */
export type FracTQuarterPreset =
  | "ends"
  | "middle"
  | "q0"
  | "q25"
  | "q50"
  | "q75"
  | "q25q75"
  | "q0q50"
  | "thirdsBetween"
  | "thirdsOutside";

export const FRAC_T_QUARTER_PRESETS: readonly FracTQuarterPreset[] = [
  "ends",
  "middle",
  "q0",
  "q25",
  "q50",
  "q75",
];

/** Second row: the two unions of opposite quarters. */
export const FRAC_T_QUARTER_PAIR_PRESETS: readonly FracTQuarterPreset[] = [
  "q25q75",
  "q0q50",
];

/** Third row: .333 to .666 between and outside. */
export const FRAC_T_THIRDS_PRESETS: readonly FracTQuarterPreset[] = [
  "thirdsBetween",
  "thirdsOutside",
];

export const FRAC_T_JUST_ONE_DIGITS: readonly FracTJustOneDigits[] = [1, 2, 3, 4];

export type FracTDisplayFilter = {
  kind: FracTFilterKind;
  rangeMin: number;
  rangeMax: number;
  rangeMode: FracTRangeMode;
  justOne: number;
  /** Prefix length for exact-{T}. Missing means 3 (legacy / range modes). */
  justOneDigits?: FracTJustOneDigits;
  /**
   * When true and kind is "range", the quarter radios replace the slider.
   * Unset or false leaves the slider and between/outside toggle in charge.
   */
  quarterEnabled?: boolean;
  quarterPreset?: FracTQuarterPreset;
};

/**
 * Accept 1..4 from persisted UI; anything else is the historical 3-digit bin.
 */
export function parseFracTJustOneDigits(raw: unknown): FracTJustOneDigits {
  if (raw === 1 || raw === 2 || raw === 3 || raw === 4) return raw;
  return 3;
}

/**
 * Map a value in [0, 1] onto bin 0..10^N−1. Slider = 1 snaps to the last
 * bin because frac(T) never equals 1.
 */
export function fracTJustOneBin(value: number, digits: FracTJustOneDigits): number {
  const scale = 10 ** digits;
  const last = scale - 1;
  if (!Number.isFinite(value)) return 0;
  const clamped = Math.min(1, Math.max(0, value));
  if (clamped >= 1) return last;
  return Math.min(last, Math.floor(clamped * scale + 1e-9));
}

/**
 * Slider readout / step target for the chosen digit count.
 */
export function fracTJustOneSnapped(value: number, digits: FracTJustOneDigits): number {
  return fracTJustOneBin(value, digits) / 10 ** digits;
}

/**
 * Map a value in [0, 1] to the thousandths bin 0..999.
 * Slider = 1 snaps to the last bin (0.999) because frac(T) never equals 1.
 */
export function fracTThousandthsBin(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const snapped = Math.round(Math.min(1, Math.max(0, value)) * 1000);
  return Math.min(999, snapped);
}

/**
 * True when frac(T) begins with the same N digits as `justOne`.
 * `digits` defaults to 3 so callers that predate the radio still match
 * thousandths.
 */
export function fracTMatchesJustOne(
  t: number,
  justOne: number,
  digits: FracTJustOneDigits = 3,
): boolean {
  const scale = 10 ** digits;
  const last = scale - 1;
  const frac = t - Math.floor(t);
  const fracBin = Math.min(last, Math.max(0, Math.floor(frac * scale + 1e-9)));
  return fracBin === fracTJustOneBin(justOne, digits);
}

/**
 * Accept a saved preset id. Unknown values stay on the first radio.
 */
export function parseFracTQuarterPreset(raw: unknown): FracTQuarterPreset {
  if (
    raw === "ends"
    || raw === "middle"
    || raw === "q0"
    || raw === "q25"
    || raw === "q50"
    || raw === "q75"
    || raw === "q25q75"
    || raw === "q0q50"
    || raw === "thirdsBetween"
    || raw === "thirdsOutside"
  ) {
    return raw;
  }
  return "ends";
}

/**
 * True when frac(T) lies in the selected quarter band. Bands are closed,
 * so a shared endpoint such as 0.25 matches both neighboring radios.
 */
export function fracTMatchesQuarter(t: number, preset: FracTQuarterPreset): boolean {
  const frac = t - Math.floor(t);
  switch (preset) {
    case "ends":
      return frac <= 0.25 || frac >= 0.75;
    case "middle":
      return frac >= 0.25 && frac <= 0.75;
    case "q0":
      return frac <= 0.25;
    case "q25":
      return frac >= 0.25 && frac <= 0.5;
    case "q50":
      return frac >= 0.5 && frac <= 0.75;
    case "q75":
      return frac >= 0.75;
    case "q25q75":
      return (frac >= 0.25 && frac <= 0.5) || frac >= 0.75;
    case "q0q50":
      return frac <= 0.25 || (frac >= 0.5 && frac <= 0.75);
    case "thirdsBetween":
      return frac >= 0.333 && frac <= 0.666;
    case "thirdsOutside":
      return frac < 0.333 || frac > 0.666;
    default: {
      const unreachable: never = preset;
      return unreachable;
    }
  }
}

/**
 * Same closed-band rule as the harvest scatter's range slider.
 */
export function fracTInDisplayRange(
  t: number,
  lo: number,
  hi: number,
  mode: FracTRangeMode,
): boolean {
  const frac = t - Math.floor(t);
  const inside = frac >= lo && frac <= hi;
  return mode === "outside" ? !inside : inside;
}

/**
 * Keep/hide a zero under the active Display frac(T) control.
 */
export function fracTKeptByDisplay(t: number, filter: FracTDisplayFilter): boolean {
  if (filter.kind === "justOne") {
    return fracTMatchesJustOne(t, filter.justOne, filter.justOneDigits ?? 3);
  }
  if (filter.quarterEnabled === true) {
    return fracTMatchesQuarter(t, filter.quarterPreset ?? "ends");
  }
  return fracTInDisplayRange(t, filter.rangeMin, filter.rangeMax, filter.rangeMode);
}

/**
 * True when the range slider is a no-op (show everything).
 */
export function fracTRangeIsInactive(
  lo: number,
  hi: number,
  mode: FracTRangeMode,
): boolean {
  if (mode === "outside") return lo >= hi;
  return lo <= 0 && hi >= 1;
}

/**
 * True when this filter hides nothing. A checked quarter band is active
 * even if the slider is still sitting on [0, 1].
 */
export function fracTDisplayFilterIsInactive(filter: FracTDisplayFilter): boolean {
  if (filter.kind !== "range") return false;
  if (filter.quarterEnabled === true) return false;
  return fracTRangeIsInactive(filter.rangeMin, filter.rangeMax, filter.rangeMode);
}

/** One drawn slot under the live frac(T) filter, plus the twin-drag mark. */
export type ScatterFracSlot = {
  keep: boolean;
  /** The .75–1 cloud. It alone takes the mouse translation. */
  nudge: boolean;
};

/**
 * Draw-list slot while "drag .75–1" may be on.
 *
 * The toggle only changes the .25–.50 radio: that band stays put, and its
 * twin band .75–1 is drawn as well so a drag can slide it. Every other
 * display setup ignores the toggle and uses {@link fracTKeptByDisplay}.
 */
export function scatterFracSlot(
  t: number,
  filter: FracTDisplayFilter,
  twinDrag: boolean,
): ScatterFracSlot {
  if (!twinDragEngaged(filter, twinDrag)) {
    return { keep: fracTKeptByDisplay(t, filter), nudge: false };
  }
  const stationary = fracTMatchesQuarter(t, "q25");
  const twin = fracTMatchesQuarter(t, "q75");
  return { keep: stationary || twin, nudge: twin && !stationary };
}

/**
 * True when the twin-drag toggle should show and move the .75–1 band.
 * Requires the range display, "only this band", and the .25–.50 radio.
 */
export function twinDragEngaged(filter: FracTDisplayFilter, twinDrag: boolean): boolean {
  return twinDrag
    && filter.kind === "range"
    && filter.quarterEnabled === true
    && (filter.quarterPreset ?? "ends") === "q25";
}

/**
 * Data-space step that makes a dragged dot follow the cursor.
 *
 * `worldDx` / `worldDy` are the camera pan step (positive moves the dot
 * right and up). Divide by the fit-group scale so the step is in σ and in
 * the plotted Y (raw T, or frac(T) when that axis is on).
 */
export function twinDragDataDelta(
  worldDx: number,
  worldDy: number,
  scaleX: number,
  scaleY: number,
): { dx: number; dy: number } {
  if (!(scaleX !== 0) || !(scaleY !== 0)) return { dx: 0, dy: 0 };
  return { dx: worldDx / scaleX, dy: worldDy / scaleY };
}

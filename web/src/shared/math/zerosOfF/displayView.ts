import type { DisplayControlsState, ZerosDisplayView } from "@/features/zeros-of-f/types";

/**
 * Maps the Display dropdown onto the existing frac(T) filter so exact-{T}
 * uses the digit-prefix bin and the other two modes use the range band.
 */
export function displayViewToFracTFilterKind(
  view: ZerosDisplayView,
): "range" | "justOne" {
  return view === "exactFracT" ? "justOne" : "range";
}

/**
 * Accepts a saved or form string. Missing values follow the old
 * `fracTFilterKind` so existing prefs keep the same filter.
 */
export function parseZerosDisplayView(
  raw: string | undefined,
  filterKind: "range" | "justOne",
): ZerosDisplayView {
  if (raw === "exactFracT" || raw === "rangeFracT" || raw === "fracT3d") {
    return raw;
  }
  return filterKind === "justOne" ? "exactFracT" : "rangeFracT";
}

/** Exact {T} or a {T} band — Big Sigma has no 3D harvest view. */
export type PlanarZerosDisplayView = "exactFracT" | "rangeFracT";

/**
 * Same as {@link parseZerosDisplayView}, but 3D (or junk) becomes the
 * range band so a shared accordion can omit that option.
 */
export function parsePlanarZerosDisplayView(
  raw: string | undefined,
  filterKind: "range" | "justOne",
): PlanarZerosDisplayView {
  return parseZerosDisplayView(raw, filterKind) === "exactFracT"
    ? "exactFracT"
    : "rangeFracT";
}

/**
 * Apply only the fields a control changed. Toolbox closures can be stale;
 * a full-state spread would rewind displayView / axis / depth and wreck
 * the current 2D or 3D framing.
 */
export function mergeDisplayPatch(
  live: DisplayControlsState,
  patch: Partial<DisplayControlsState>,
): DisplayControlsState {
  return { ...live, ...patch };
}

/**
 * Display-mode fields that belong with a dropdown choice. Does not copy
 * the rest of a stale toolbox snapshot.
 */
export function zerosDisplayViewPatch(view: ZerosDisplayView): Partial<DisplayControlsState> {
  return {
    displayView: view,
    fracTFilterKind: displayViewToFracTFilterKind(view),
  };
}

/**
 * Data-space coordinates. In 3D, Y stays raw T and Z is centered
 * \(\{T\}-1/2\) so the depth axis is independent of integer T.
 */
export function harvestPointXyz(
  sigma: number,
  T: number,
  view: ZerosDisplayView,
  yAxisMode: "T" | "fracT",
): { x: number; y: number; z: number } {
  const frac = T - Math.floor(T);
  if (view === "fracT3d") {
    return { x: sigma, y: T, z: frac - 0.5 };
  }
  return {
    x: sigma,
    y: yAxisMode === "fracT" ? frac : T,
    z: 0,
  };
}

/**
 * Writes one harvest point into a packed xyz buffer at `dest` (already ×3).
 */
export function writeHarvestPoint(
  positions: { [index: number]: number },
  dest: number,
  sigma: number,
  T: number,
  view: ZerosDisplayView,
  yAxisMode: "T" | "fracT",
): void {
  const p = harvestPointXyz(sigma, T, view, yAxisMode);
  positions[dest] = p.x;
  positions[dest + 1] = p.y;
  positions[dest + 2] = p.z;
}

/** World-space length of the \(\{T\}\) axis; T's fitted axis is 8 units. */
export function fracT3dScaleZ(depth: number): number {
  return 8 * Math.max(0.05, Math.min(2, depth));
}

export function wrapOrbitYawDeg(deg: number): number {
  const wrapped = deg % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

export function clampOrbitPitchDeg(deg: number): number {
  return Math.max(-85, Math.min(85, deg));
}

/**
 * Whether a display edit must rewrite GPU positions or colors, or only
 * retune the frac(T) filter uniforms. Orbit and depth only change the
 * fit/orbit groups, not the point buffers.
 */
export function displayChangeNeedsScatterRebuild(
  prev: DisplayControlsState,
  next: DisplayControlsState,
): { layout: boolean; appearance: boolean; filter: boolean } {
  const layout =
    prev.yAxisMode !== next.yAxisMode
    || prev.displayView !== next.displayView;
  const appearance =
    layout
    || prev.colorMode !== next.colorMode
    || prev.spectrumFeather !== next.spectrumFeather
    || prev.magThresh !== next.magThresh
    || prev.depthLogScale !== next.depthLogScale;
  const filter =
    prev.fracTRangeMin !== next.fracTRangeMin
    || prev.fracTRangeMax !== next.fracTRangeMax
    || prev.fracTRangeMode !== next.fracTRangeMode
    || prev.fracTFilterKind !== next.fracTFilterKind
    || prev.fracTJustOne !== next.fracTJustOne
    || prev.fracTJustOneDigits !== next.fracTJustOneDigits
    || prev.fracTQuarterEnabled !== next.fracTQuarterEnabled
    || prev.fracTQuarterPreset !== next.fracTQuarterPreset
    || prev.fracTTwinNudge !== next.fracTTwinNudge;
  return { layout, appearance, filter };
}

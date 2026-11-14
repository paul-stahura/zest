import {
  fracTKeptByDisplay,
  fracTDisplayFilterIsInactive,
  type FracTDisplayFilter,
} from "@/shared/math/zerosOfF/fracTDisplayFilter";
import type { ZerosHarvestFamily } from "@/shared/math/zerosOfF/harvestFamily";

/** Overlay camera: σ on X, T on Y, through the critical strip. */
export const BIG_SIGMA_ZEROS_VIEW_SIGMA_MIN = -500;
export const BIG_SIGMA_ZEROS_VIEW_SIGMA_MAX = 1;
export const BIG_SIGMA_ZEROS_VIEW_T_MIN = 0;
export const BIG_SIGMA_ZEROS_VIEW_T_MAX = 4000;

/**
 * Siegel harvest drawn on the overlay. The right edge matches the camera so
 * the σ ∈ [−1, 2] R1ak hunt (zeros with σ ≤ 0.967) stays on screen.
 */
export const BIG_SIGMA_ZEROS_KEEP_SIGMA_MIN = -500;
export const BIG_SIGMA_ZEROS_KEEP_SIGMA_MAX = 1;
export const BIG_SIGMA_ZEROS_KEEP_T_MIN = 0;
export const BIG_SIGMA_ZEROS_KEEP_T_MAX = 4000;

export type SigmaTPoints = {
  sigma: Float64Array;
  t: Float64Array;
};

/**
 * Keep a Siegel harvest point: σ ∈ [−500, 1], T ∈ [0, 4000].
 * Bounds are inclusive so the published edges stay visible.
 */
export function keepBigSigmaZero(sigma: number, T: number): boolean {
  return (
    sigma >= BIG_SIGMA_ZEROS_KEEP_SIGMA_MIN
    && sigma <= BIG_SIGMA_ZEROS_KEEP_SIGMA_MAX
    && T >= BIG_SIGMA_ZEROS_KEEP_T_MIN
    && T <= BIG_SIGMA_ZEROS_KEEP_T_MAX
  );
}

/**
 * Input (σ, T) sits on the overlay camera, including the empty strip σ ∈ (−50, 1].
 */
export function inBigSigmaZerosView(sigma: number, T: number): boolean {
  return (
    sigma >= BIG_SIGMA_ZEROS_VIEW_SIGMA_MIN
    && sigma <= BIG_SIGMA_ZEROS_VIEW_SIGMA_MAX
    && T >= BIG_SIGMA_ZEROS_VIEW_T_MIN
    && T <= BIG_SIGMA_ZEROS_VIEW_T_MAX
  );
}

/**
 * Crosshair at the input (σ, T) when the toggle is on and that point sits
 * inside the overlay camera. Brightness is not tied to the dimmer.
 */
export function showSigmaTCrosshair(
  enabled: boolean,
  sigma: number,
  T: number,
): boolean {
  return enabled && inBigSigmaZerosView(sigma, T);
}

/**
 * Append two harvest clouds. The σ < −400 zeros now live in the committed
 * scan, so the old σ ∈ [−500, −400] file adds nothing.
 */
export function concatSigmaTPoints(a: SigmaTPoints, b: SigmaTPoints): SigmaTPoints {
  const n = a.sigma.length + b.sigma.length;
  const sigma = new Float64Array(n);
  const t = new Float64Array(n);
  sigma.set(a.sigma, 0);
  t.set(a.t, 0);
  sigma.set(b.sigma, a.sigma.length);
  t.set(b.t, a.t.length);
  return { sigma, t };
}

/**
 * Copy the (σ, T) pairs that sit in {@link keepBigSigmaZero}.
 */
export function filterBigSigmaZeros(points: SigmaTPoints): SigmaTPoints {
  return filterSigmaTWhere(points, keepBigSigmaZero);
}

/**
 * Window a packed harvest onto the Big Sigma overlay.
 *
 * Both families keep the camera box, σ ∈ [−500, 1] and T ∈ [0, 4000], so the
 * critical-strip R1ak zeros and the R1ps zeros with σ ≤ 1 stay clickable.
 * The Display {T} filter is applied later, on whichever cloud this returns.
 */
export function filterBigSigmaHarvest(
  points: SigmaTPoints,
  family: ZerosHarvestFamily,
): SigmaTPoints {
  const keep = family === "r1ps" ? inBigSigmaZerosView : keepBigSigmaZero;
  return filterSigmaTWhere(points, keep);
}

function filterSigmaTWhere(
  points: SigmaTPoints,
  keep: (sigma: number, T: number) => boolean,
): SigmaTPoints {
  let kept = 0;
  for (let i = 0; i < points.sigma.length; i++) {
    if (keep(points.sigma[i]!, points.t[i]!)) kept += 1;
  }
  const sigma = new Float64Array(kept);
  const t = new Float64Array(kept);
  let w = 0;
  for (let i = 0; i < points.sigma.length; i++) {
    const s = points.sigma[i]!;
    const T = points.t[i]!;
    if (!keep(s, T)) continue;
    sigma[w] = s;
    t[w] = T;
    w += 1;
  }
  return { sigma, t };
}

/**
 * Apply the zeros-of-f Display {T} keep/hide. Inactive range bands
 * return the same arrays so the overlay does not copy millions of points.
 */
export function filterSigmaTByFracT(
  points: SigmaTPoints,
  filter: FracTDisplayFilter,
): SigmaTPoints {
  if (fracTDisplayFilterIsInactive(filter)) {
    return points;
  }
  let kept = 0;
  for (let i = 0; i < points.t.length; i++) {
    if (fracTKeptByDisplay(points.t[i]!, filter)) kept += 1;
  }
  if (kept === points.t.length) return points;
  const sigma = new Float64Array(kept);
  const t = new Float64Array(kept);
  let w = 0;
  for (let i = 0; i < points.t.length; i++) {
    if (!fracTKeptByDisplay(points.t[i]!, filter)) continue;
    sigma[w] = points.sigma[i]!;
    t[w] = points.t[i]!;
    w += 1;
  }
  return { sigma, t };
}

export type CameraBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/** Fixed screen mapping of the overlay: σ on X, T on Y, full canvas. */
export const BIG_SIGMA_ZEROS_VIEW: CameraBounds = {
  left: BIG_SIGMA_ZEROS_VIEW_SIGMA_MIN,
  right: BIG_SIGMA_ZEROS_VIEW_SIGMA_MAX,
  top: BIG_SIGMA_ZEROS_VIEW_T_MAX,
  bottom: BIG_SIGMA_ZEROS_VIEW_T_MIN,
};

/** Bottom-axis σ ticks. */
export const BIG_SIGMA_OVERLAY_X_TICKS = [-500, -50, 0];

/** Left-axis T ticks. */
export const BIG_SIGMA_OVERLAY_Y_TICKS = [0, 4000];

/**
 * Overlay opacity. 0 hides the layer entirely; (0, 1] is a linear fade.
 * Used instead of alphaTest, which snapped off near 0.5.
 */
export function zerosOverlayOpacity(dimmer: number): number {
  if (dimmer <= 0) return 0;
  if (dimmer >= 1) return 1;
  return dimmer;
}

/**
 * Index of the nearest (σ, T) point in CSS pixels, or −1 if outside `radiusPx`.
 * Picking in pixels keeps the hit radius stable when σ and T use different zooms.
 */
export function nearestZeroIndex(
  points: SigmaTPoints,
  cssX: number,
  cssY: number,
  bounds: CameraBounds,
  canvas: { width: number; height: number },
  radiusPx: number,
): number {
  const spanX = bounds.right - bounds.left;
  const spanY = bounds.top - bounds.bottom;
  if (spanX === 0 || spanY === 0) return -1;
  let best = -1;
  let bestD2 = radiusPx * radiusPx;
  for (let i = 0; i < points.sigma.length; i++) {
    const sx = ((points.sigma[i]! - bounds.left) / spanX) * canvas.width;
    const sy = ((bounds.top - points.t[i]!) / spanY) * canvas.height;
    const dx = sx - cssX;
    const dy = sy - cssY;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = i;
    }
  }
  return best;
}

/**
 * Overlay-camera (σ, T) → CSS pixels (origin top-left of the canvas).
 */
export function zerosViewToCss(
  sigma: number,
  T: number,
  bounds: CameraBounds,
  canvas: { width: number; height: number },
): { x: number; y: number } {
  const spanX = bounds.right - bounds.left;
  const spanY = bounds.top - bounds.bottom;
  return {
    x: ((sigma - bounds.left) / spanX) * canvas.width,
    y: ((bounds.top - T) / spanY) * canvas.height,
  };
}

/**
 * Hover readout to the left of the ring. Six decimals match the σ / {T} boxes.
 */
export function formatBigSigmaZeroHover(sigma: number, T: number): string {
  return `σ = ${sigma.toFixed(6)}\nT = ${T.toFixed(6)}`;
}

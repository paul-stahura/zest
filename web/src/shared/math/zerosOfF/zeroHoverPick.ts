/**
 * Pixel hit-testing for zeros-of-f hover.
 *
 * The canvas is an orthographic pan/zoom of a fitted (σ, T) plane, so a
 * fixed world radius would grow and shrink as the user zooms and would be
 * a different number of pixels in σ than in T. Big Sigma picks in CSS
 * pixels for that reason. The same radius is used here.
 *
 * Frac(T) filters hide dots in the vertex shader. Hover must replay that
 * keep test, or a filtered-out zero still under the cursor would win.
 */

/** Same catch radius as Big Sigma's zero hover, in CSS pixels. */
export const ZERO_HOVER_RADIUS_PX = 12;

/** Gap between the open ring and the coordinate label, in CSS pixels. */
export const ZERO_HOVER_LABEL_GAP_PX = 10;

export type ZeroHoverSample = {
  sigma: number;
  t: number;
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
  /** Index in the layer that owns this zero, or −1 when that layer has no twin table. */
  pointId: number;
};

/** Called once per drawn zero. Components `r,g,b` are 0..1. */
export type HoverPointFn = (
  sigma: number,
  t: number,
  x: number,
  y: number,
  z: number,
  r: number,
  g: number,
  b: number,
  pointId: number,
) => void;

/**
 * Fit-group local XY plus the orthographic camera, in the same numbers
 * the pan/zoom controller uses. Z is ignored: without an orbit the
 * camera looks straight down, so depth does not move the dot on screen.
 */
export type FitLocalCssMap = {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
};

/**
 * CSS pixel of a fit-local point when the orbit group is the identity.
 * Matches the controller's css-to-world inverse, including the Y flip.
 */
export function cssFromFitLocal(
  localX: number,
  localY: number,
  map: FitLocalCssMap,
): { x: number; y: number } {
  const spanX = map.right - map.left;
  const spanY = map.top - map.bottom;
  const width = Math.max(1, map.width);
  const height = Math.max(1, map.height);
  if (spanX === 0 || spanY === 0) {
    return { x: Number.NaN, y: Number.NaN };
  }
  const worldX = map.offsetX + map.scaleX * localX;
  const worldY = map.offsetY + map.scaleY * localY;
  return {
    x: ((worldX - map.left) / spanX) * width,
    y: ((map.top - worldY) / spanY) * height,
  };
}

/**
 * Axis-aligned fit-local box that contains every point within `radiusPx`
 * of the cursor. A point outside the box cannot be the hit, so large
 * clouds can skip the pixel distance. Corners of the box are farther
 * than the radius, so the caller still measures the true pixel distance.
 */
export function hoverSearchBox(
  cursorX: number,
  cursorY: number,
  radiusPx: number,
  map: FitLocalCssMap,
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const spanX = map.right - map.left;
  const spanY = map.top - map.bottom;
  const width = Math.max(1, map.width);
  const height = Math.max(1, map.height);
  if (spanX === 0 || spanY === 0 || map.scaleX === 0 || map.scaleY === 0) {
    return null;
  }
  const worldX = map.left + (cursorX / width) * spanX;
  const worldY = map.top - (cursorY / height) * spanY;
  const localX = (worldX - map.offsetX) / map.scaleX;
  const localY = (worldY - map.offsetY) / map.scaleY;
  const rx = Math.abs((radiusPx * (spanX / width)) / map.scaleX);
  const ry = Math.abs((radiusPx * (spanY / height)) / map.scaleY);
  return {
    minX: localX - rx,
    maxX: localX + rx,
    minY: localY - ry,
    maxY: localY + ry,
  };
}

/**
 * Nearest sample whose CSS center is strictly inside `radiusPx`.
 *
 * `visit` is expected to apply `keepLocal` before calling the point
 * callback. The pixel test is still exact: the box is only a reject.
 * Ties keep the earlier point, matching Big Sigma's nearest-index scan.
 */
export function pickNearestZeroHover(
  visit: (onPoint: HoverPointFn, keepLocal: ((x: number, y: number) => boolean) | null) => void,
  cursorX: number,
  cursorY: number,
  radiusPx: number,
  toCss: (x: number, y: number, z: number) => { x: number; y: number },
  keepLocal: ((x: number, y: number) => boolean) | null,
): ZeroHoverSample | null {
  if (!(radiusPx > 0)) return null;
  let best: ZeroHoverSample | null = null;
  let bestD2 = radiusPx * radiusPx;
  visit((sigma, t, x, y, z, r, g, b, pointId) => {
    const css = toCss(x, y, z);
    const dx = css.x - cursorX;
    const dy = css.y - cursorY;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = { sigma, t, x, y, z, r, g, b, pointId };
    }
  }, keepLocal);
  return best;
}

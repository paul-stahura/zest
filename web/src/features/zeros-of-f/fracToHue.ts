/**
 * Non-linear no-wrap mapping of `frac(T) ∈ [0, 1]` to HSV hue, ported from the
 * Python reference (`_frac_to_hue` in `~/Documents/Zeros_of_f_of_s/zeros_of_f_v3speed.py`).
 *
 * Uses smoothstep × 0.84 so the spectrum stops at violet (hue ≈ 0.84) instead
 * of wrapping back to red — that's what makes the colour bar visually
 * non-cyclic. Saturation and value are both 1.0 to match matplotlib's `hsv`
 * colormap, which the Python preview bar samples.
 */
export function fracToHue(frac: number): number {
  const f = frac < 0 ? 0 : frac > 1 ? 1 : frac;
  const smooth = f * f * (3 - 2 * f);
  return 0.84 * smooth;
}

/** Packed 0xRRGGBB for a `{T}` so curves match the scatter spectrum. */
export function fracTSpectrumHex(frac: number): number {
  const [r, g, b] = hsvToRgb(fracToHue(frac), 1, 1);
  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}

/** CSS `#rrggbb` for toolbox labels that should match the spectrum curve. */
export function fracTSpectrumCss(frac: number): string {
  return `#${fracTSpectrumHex(frac).toString(16).padStart(6, "0")}`;
}

/** Standard HSV → RGB. h, s, v in [0, 1]. Returns RGB in [0, 1]. */
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: return [v, t, p];
    case 1: return [q, v, p];
    case 2: return [p, v, t];
    case 3: return [p, q, v];
    case 4: return [t, p, v];
    default: return [v, p, q];
  }
}

/** Fixed secondary-band half-width around {0, 0.25, 0.5, 0.75} in zeros-of-f. */
export const SPECTRUM_SECONDARY_HALF_WIDTH = 0.0001;

/** Default transition feather around the quarter-mark secondary colors. */
export const DEFAULT_SPECTRUM_FEATHER = 0.015;

/** Slider upper bound for the quarter-band spectrum feather. */
export const MAX_SPECTRUM_FEATHER = 0.2;

/** Four wide primary quarter colors: (0, 0.25), (0.25, 0.5), (0.5, 0.75), (0.75, 1). */
const QUARTER_PRIMARIES: readonly [number, number, number][] = [
  [1, 0, 0],            // Pure vivid red    (#FF0000)
  [1, 1, 0],            // Pure vivid yellow (#FFFF00)
  [0, 128 / 255, 1],    // Electric blue     (#0080FF)
  [0, 1, 51 / 255],     // Neon green        (#00FF33)
];

/** Four narrow secondary colors at 0/1 (dark grey), 0.25, 0.50, and 0.75. */
const QUARTER_SECONDARIES: readonly [number, number, number][] = [
  [85 / 255, 85 / 255, 85 / 255],   // Dark grey     (#555555) at 0 / 1
  [1, 140 / 255, 0],                // Vivid orange  (#FF8C00) at 0.25
  [0, 1, 1],                        // Pure cyan     (#00FFFF) at 0.50
  [1, 0, 1],                        // Pure magenta  (#FF00FF) at 0.75
];

function smoothstep01(t: number): number {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  return u * u * (3 - 2 * u);
}

function quarterEdgeWeight(dist: number, halfWidth: number, feather: number): number {
  if (dist <= halfWidth) return 1;
  if (feather <= 0 || dist >= halfWidth + feather) return 0;
  return 1 - smoothstep01((dist - halfWidth) / feather);
}

/**
 * Clamp persisted or user-supplied feather into `[0, MAX_SPECTRUM_FEATHER]`.
 */
export function clampSpectrumFeather(feather: number): number {
  if (!Number.isFinite(feather)) return DEFAULT_SPECTRUM_FEATHER;
  return Math.max(0, Math.min(MAX_SPECTRUM_FEATHER, feather));
}

/**
 * Quarter-band spectrum RGB in `[0, 1]` for `frac ∈ [0, 1]`: four primary colors
 * across the four quarters and four narrow secondary colors at `0/1` (dark grey),
 * `0.25`, `0.50`, and `0.75`, blended with normalized smoothstep weights.
 */
export function quarterSpectrumRgb(
  frac: number,
  feather: number = DEFAULT_SPECTRUM_FEATHER,
  halfWidth: number = SPECTRUM_SECONDARY_HALF_WIDTH,
): [number, number, number] {
  const x = Number.isFinite(frac) ? (((frac % 1) + 1) % 1) : 0;
  const f = clampSpectrumFeather(feather);
  const q = Math.min(3, Math.floor(x * 4));
  const local = x - q * 0.25;
  const wL = quarterEdgeWeight(local, halfWidth, f);
  const wR = quarterEdgeWeight(0.25 - local, halfWidth, f);

  const aP = (1 - wL) * (1 - wR);
  const aL = wL * (1 - 0.5 * wR);
  const aR = wR * (1 - 0.5 * wL);

  const pCol = QUARTER_PRIMARIES[q]!;
  const lCol = QUARTER_SECONDARIES[q]!;
  const rCol = QUARTER_SECONDARIES[(q + 1) % 4]!;

  return [
    aP * pCol[0] + aL * lCol[0] + aR * rCol[0],
    aP * pCol[1] + aL * lCol[1] + aR * rCol[1],
    aP * pCol[2] + aL * lCol[2] + aR * rCol[2],
  ];
}

/** Packed `0xRRGGBB` from {@link quarterSpectrumRgb} for `{T}` curves. */
export function quarterSpectrumHex(
  frac: number,
  feather: number = DEFAULT_SPECTRUM_FEATHER,
): number {
  const [r, g, b] = quarterSpectrumRgb(frac, feather);
  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}

/** CSS `#rrggbb` from {@link quarterSpectrumRgb} for toolbox labels. */
export function quarterSpectrumCss(
  frac: number,
  feather: number = DEFAULT_SPECTRUM_FEATHER,
): string {
  return `#${quarterSpectrumHex(frac, feather).toString(16).padStart(6, "0")}`;
}

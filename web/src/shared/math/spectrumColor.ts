export type SpectrumColor = {
  hue: number;
  hex: number;
  css: string;
};

function hueToRgbChannel(p: number, q: number, t: number): number {
  let u = t;
  if (u < 0) u += 1;
  if (u > 1) u -= 1;
  if (u < 1 / 6) return p + (q - p) * 6 * u;
  if (u < 1 / 2) return q;
  if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
  return p;
}

function hslToHex(h: number, s: number, l: number): number {
  const sat = Math.min(1, Math.max(0, s));
  const lit = Math.min(1, Math.max(0, l));
  if (sat === 0) {
    const g = Math.round(lit * 255);
    return (g << 16) + (g << 8) + g;
  }
  const q = lit < 0.5 ? lit * (1 + sat) : lit + sat - lit * sat;
  const p = 2 * lit - q;
  const hk = ((h % 360) + 360) % 360 / 360;
  const r = Math.round(hueToRgbChannel(p, q, hk + 1 / 3) * 255);
  const g = Math.round(hueToRgbChannel(p, q, hk) * 255);
  const b = Math.round(hueToRgbChannel(p, q, hk - 1 / 3) * 255);
  return (r << 16) + (g << 8) + b;
}

/**
 * 1-based spectrum slot: row k of n is hue (k/n)·360°.
 * Lightness is high so the same color stays readable as table text.
 */
export function spectrumColor(oneBasedIndex: number, count: number): SpectrumColor {
  const n = Math.max(1, count);
  const k = Math.min(n, Math.max(1, oneBasedIndex));
  const hue = (k / n) * 360;
  const hex = hslToHex(hue, 0.78, 0.62);
  return { hue, hex, css: `hsl(${hue}, 78%, 62%)` };
}

import { fracTSpectrumHex } from "@/features/zeros-of-f/fracToHue";

/** Cyan used when σ, T come from sliders, radios, or animate. */
export const BIG_SIGMA_LINK_CONTROL_COLOR = 0x66d9ff;

/**
 * Dirichlet links match the picked zero’s `{T}` hue. Control-driven (σ, T)
 * keeps the usual cyan so a slider edit is visually distinct from a harvest pick.
 */
export function bigSigmaLinkColor(fromZero: boolean, T: number): number {
  if (!fromZero) return BIG_SIGMA_LINK_CONTROL_COLOR;
  return fracTSpectrumHex(T - Math.floor(T));
}

import { FIRST_ZETA_ZEROS_T } from "@/features/quasicrystal/zetaZerosT";
import { indexToImag } from "@/shared/math/zetaEms";

export type RayAnglePreset = {
  id: string;
  label: string;
  /** Ray direction in radians, mathematical angle, y up. */
  radians: number;
};

/**
 * Named ray directions. `sqrt(t)` is the square root of \(t = I(T)\) for the
 * first zeta zero on the ray; the others are the constants themselves, in radians.
 */
export function rayAnglePresets(): RayAnglePreset[] {
  const firstT = FIRST_ZETA_ZEROS_T[0] ?? 1;
  const t = indexToImag(firstT, false);
  return [
    { id: "sqrt-t", label: "sqrt(t)", radians: Math.sqrt(t) },
    { id: "inv-sqrt-2", label: "1/sqrt(2)", radians: 1 / Math.sqrt(2) },
    { id: "sqrt-3", label: "sqrt(3)", radians: Math.sqrt(3) },
    { id: "inv-sqrt-3", label: "1/sqrt(3)", radians: 1 / Math.sqrt(3) },
    { id: "pi", label: "pi", radians: Math.PI },
    { id: "2pi", label: "2pi", radians: 2 * Math.PI },
    { id: "pi-over-4", label: "pi/4", radians: Math.PI / 4 },
    { id: "pi-over-sqrt-2", label: "pi/sqrt(2)", radians: Math.PI / Math.sqrt(2) },
    { id: "sqrt-2pi", label: "sqrt(2*pi)", radians: Math.sqrt(2 * Math.PI) },
  ];
}

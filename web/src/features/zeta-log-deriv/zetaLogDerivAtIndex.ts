import { calcB1Star } from "@/shared/math/b1Star";
import { complexAbs, complexDiv } from "@/shared/math/complex";
import { indexToImag } from "@/shared/math/zetaEms";

/** Below this |ζ| the quotient is a pole neighborhood, not a finite point. */
const ABS_ZETA_MIN = 1e-8;

export type ZetaLogDerivSample =
  | { kind: "value"; t: number; re: number; im: number }
  | { kind: "undefined"; t: number };

/**
 * (ζ′/ζ) at s = σ + i I(T).
 *
 * T is the spiral index. t = I(T) is the imaginary part. The quotient is
 * undefined at a zero of ζ; a sample with |ζ| below the cutoff is reported
 * as undefined so a pole is not drawn as a finite point.
 *
 * @param sigma - Real part σ
 * @param indexT - Spiral index T
 */
export function zetaLogDerivAtIndex(sigma: number, indexT: number): ZetaLogDerivSample {
  const t = indexToImag(indexT, false);
  if (!Number.isFinite(sigma) || !Number.isFinite(t)) {
    return { kind: "undefined", t: Number.isFinite(t) ? t : 0 };
  }
  const { zeta, zetaPrime } = calcB1Star(sigma, t);
  const absZeta = complexAbs(zeta);
  if (!Number.isFinite(absZeta) || absZeta < ABS_ZETA_MIN) {
    return { kind: "undefined", t };
  }
  const z = complexDiv(zetaPrime, zeta);
  if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) {
    return { kind: "undefined", t };
  }
  return { kind: "value", t, re: z.re, im: z.im };
}

function fmtPart(v: number): string {
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e6)) return v.toExponential(6);
  return v.toFixed(6);
}

/**
 * One-line readout of a ζ′/ζ sample. The undefined case is a pole of the
 * quotient, not a computed zero of the derivative.
 */
export function formatZetaLogDeriv(sample: ZetaLogDerivSample): string {
  if (sample.kind === "undefined") return "undefined (near a zero of ζ)";
  const sign = sample.im < 0 ? "−" : "+";
  return `${fmtPart(sample.re)} ${sign} ${fmtPart(Math.abs(sample.im))} i`;
}

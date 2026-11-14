import { i1Scaled } from "./i1Scaled";
import { jMScaled } from "./jMScaled";
import { r1Scaled } from "./r1Scaled";
import { r2Scaled } from "./r2Scaled";
import { r2akScaled } from "./r2akScaled";
import { sigma1Scaled } from "./sigma1Scaled";
import { sigma2Scaled } from "./sigma2Scaled";
import { sum1NegScaled } from "./sum1NegScaled";

/** Supported `f`-formula variants. The user-facing concept is:
 *
 *    family   ∈ {Σ₁+R₁, Σ₂+R₂, |leg₁|=|leg₂|, leg-angle fold-back / fold-out}
 *    R-form   ∈ {ak, ps}
 *
 *  The variant string encodes both. ak uses I₁/I₂ asymptotic forms
 *  (`R_{1ak}=−½(−1)^⌊t⌋ I₁`, `R_{2ak}=−½(−1)^⌊t⌋ I₂ χ`); ps uses the
 *  d_{j1}/d_{j2} sin-ratio + ⌈t⌉^(±iI(t)) forms. All four leg-pair variants
 *  use leg₁ = Σ₁ + R₁_<form> and leg₂ = Σ₂ + R₂_<form> at the same σ. */
export type FVariant =
  | "R1ak" | "R1ps"
  | "R2ak" | "R2ps"
  | "R1nak"
  | "legRatio_ak" | "legRatio_ps"
  | "legAngle_ak" | "legAngle_ps"
  | "legAngleOut_ak" | "legAngleOut_ps"
  | "sum1R1Angle_ak" | "sum1R1Angle_ps";

export type FFamily = "sum1R1" | "sum2R2" | "sum1R1nak" | "legRatio" | "legAngle" | "legAngleOut" | "sum1R1Angle";
export type RForm = "ak" | "ps";

export function fVariantParts(v: FVariant): { family: FFamily; rForm: RForm } {
  switch (v) {
    case "R1ak":            return { family: "sum1R1",      rForm: "ak" };
    case "R1ps":            return { family: "sum1R1",      rForm: "ps" };
    case "R2ak":            return { family: "sum2R2",      rForm: "ak" };
    case "R2ps":            return { family: "sum2R2",      rForm: "ps" };
    case "R1nak":           return { family: "sum1R1nak",   rForm: "ak" };
    case "legRatio_ak":     return { family: "legRatio",    rForm: "ak" };
    case "legRatio_ps":     return { family: "legRatio",    rForm: "ps" };
    case "legAngle_ak":     return { family: "legAngle",    rForm: "ak" };
    case "legAngle_ps":     return { family: "legAngle",    rForm: "ps" };
    case "legAngleOut_ak":  return { family: "legAngleOut", rForm: "ak" };
    case "legAngleOut_ps":  return { family: "legAngleOut", rForm: "ps" };
    case "sum1R1Angle_ak":  return { family: "sum1R1Angle", rForm: "ak" };
    case "sum1R1Angle_ps":  return { family: "sum1R1Angle", rForm: "ps" };
  }
}

export function makeFVariant(family: FFamily, rForm: RForm): FVariant {
  if (family === "sum1R1") return rForm === "ak" ? "R1ak" : "R1ps";
  if (family === "sum2R2") return rForm === "ak" ? "R2ak" : "R2ps";
  if (family === "sum1R1nak") return "R1nak";
  if (family === "legRatio") return rForm === "ak" ? "legRatio_ak" : "legRatio_ps";
  if (family === "legAngle") return rForm === "ak" ? "legAngle_ak" : "legAngle_ps";
  if (family === "legAngleOut") return rForm === "ak" ? "legAngleOut_ak" : "legAngleOut_ps";
  return rForm === "ak" ? "sum1R1Angle_ak" : "sum1R1Angle_ps";
}

/**
 * Result of one batched `f` evaluation along a `t` array. Stored as separate
 * Float64Arrays so the caller can decide which to retain — for scans we keep
 * `yVal` (and optionally the magnitudes used for orange/green classification),
 * but discard the raw complex Σ₁ / R₁ buffers.
 */
export interface FScaledBatch {
  /** `|t^σ · f|` per t — what scans record as `y_val`. */
  yVal: Float64Array;
  /** `|t^σ · Σ₁|` per t. Used by orange (magnitude-ratio) classification. */
  sigma1Mag: Float64Array;
  /** `|t^σ · R₁|` (for the chosen variant). Used by orange classification. */
  r1Mag: Float64Array;
  /** `|arg(−Σ₁ · conj(R₁)) / π|`. Used by green (phase-deviation) classification. */
  phaseDev: Float64Array;
}

/**
 * Full batched `f` evaluation retaining the complex component buffers. Crossing
 * scans need these buffers to interpolate cancellation quality between coarse
 * samples rather than thresholding only the sampled `|f|` values.
 */
export interface FScaledComponentsBatch extends FScaledBatch {
  /** Interleaved `t^σ · Σ₁` values as `[re0, im0, re1, im1, ...]`. */
  sigma1: Float64Array;
  /** Interleaved `t^σ · R₁` values for the selected variant. */
  r1: Float64Array;
  /** Signed `arg(−Σ₁ · conj(R₁)) / π` in `(-1, 1]`. */
  phaseSigned: Float64Array;
}

/**
 * Compute `t^σ · f(σ, t)` magnitudes plus the auxiliary classification
 * inputs for each `t`. Supports both `R1ak` (default) and `R1` (overflow-safe
 * via log-space χ).
 */
export function fScaledBatch(
  sigma: number,
  tArr: Float64Array,
  variant: FVariant,
): FScaledBatch {
  return fScaledComponentsBatch(sigma, tArr, variant);
}

/**
 * Compute `t^σ · f(σ, t)` and retain the complex Σ₁/R₁ buffers. This is used
 * by the crossing scanner so it can interpolate the cancellation residual at
 * a bracketed magnitude-balance crossing.
 */
export function fScaledComponentsBatch(
  sigma: number,
  tArr: Float64Array,
  variant: FVariant,
): FScaledComponentsBatch {
  const { family, rForm } = fVariantParts(variant);
  // Leg-pair variants share leg geometry; phase convention differs.
  if (family === "legRatio" || family === "legAngle" || family === "legAngleOut") {
    return computeLegBatch(sigma, tArr, family, rForm);
  }
  // Σ₁+R₁, Σ₂+R₂, or negative-t Σ₁+R1nak standalone. All evaluated at σ.
  // The negative-t path uses the −I(T) sign and the overflow-safe scaling
  // baked into sum1NegScaled / jMScaled; the combine loop below is shared.
  const sigma1 = family === "sum2R2"
    ? sigma2Scaled(tArr, sigma, sigma)
    : family === "sum1R1nak"
      ? sum1NegScaled(tArr, sigma)
      : sigma1Scaled(tArr, sigma);
  const r1Buf = family === "sum2R2"
    ? (rForm === "ak" ? r2akScaled(sigma, tArr, sigma) : r2Scaled(sigma, tArr, sigma))
    : family === "sum1R1nak"
      ? jMScaled(sigma, tArr)
      : computeR1Family(sigma, tArr, rForm);
  const n = tArr.length;
  const yVal = new Float64Array(n);
  const sigma1Mag = new Float64Array(n);
  const r1Mag = new Float64Array(n);
  const phaseDev = new Float64Array(n);
  const phaseSigned = new Float64Array(n);

  for (let j = 0; j < n; j++) {
    const s1Re = sigma1[j * 2]!;
    const s1Im = sigma1[j * 2 + 1]!;
    const r1Re = r1Buf[j * 2]!;
    const r1Im = r1Buf[j * 2 + 1]!;

    const fRe = s1Re + r1Re;
    const fIm = s1Im + r1Im;

    yVal[j] = Math.hypot(fRe, fIm);
    sigma1Mag[j] = Math.hypot(s1Re, s1Im);
    r1Mag[j] = Math.hypot(r1Re, r1Im);

    // arg(−Σ₁ · conj(R₁)) / π
    const prodRe = -s1Re * r1Re - s1Im * r1Im;
    const prodIm = s1Re * r1Im - s1Im * r1Re;
    const phase = Math.atan2(prodIm, prodRe) / Math.PI;
    phaseSigned[j] = phase;
    phaseDev[j] = Math.abs(phase);
  }

  return { yVal, sigma1Mag, r1Mag, phaseDev, sigma1, r1: r1Buf, phaseSigned };
}

/** Returns `t^σ · R₁(σ, t)` per the requested R-form. */
function computeR1Family(
  sigma: number,
  tArr: Float64Array,
  rForm: RForm,
): Float64Array {
  if (rForm === "ak") {
    const i1 = i1Scaled(sigma, tArr);
    const out = new Float64Array(i1.length);
    for (let j = 0; j < tArr.length; j++) {
      const ft = Math.floor(tArr[j]!);
      const sign = ft % 2 === 0 ? 1 : -1;
      out[j * 2] = -0.5 * sign * i1[j * 2]!;
      out[j * 2 + 1] = -0.5 * sign * i1[j * 2 + 1]!;
    }
    return out;
  }
  // ps form — overflow-safe log-space χ.
  return r1Scaled(sigma, tArr);
}

/** Returns `t^σ · R₂(σ, t)` per the requested R-form. */
function computeR2Family(
  sigma: number,
  tArr: Float64Array,
  rForm: RForm,
): Float64Array {
  if (rForm === "ak") return r2akScaled(sigma, tArr, sigma);
  return r2Scaled(sigma, tArr, sigma);
}

/**
 * Shared evaluator for the three leg-pair variants. Computes
 *   leg1 = Σ₁(σ,t) + R₁(σ,t)        (R1 form — overflow-safe log-space χ)
 *   leg2 = Σ₂(σ,t) + R₂(σ,t)        (no functional reflection)
 * both with `t^σ` scaling so |leg1|/|leg2| is preserved. The `phaseSigned`
 * field is computed with one of two sign conventions, selected by `variant`:
 *   legRatio / legAngle  → arg(−leg1·conj(leg2))/π  (zero at antialignment)
 *   legAngleOut          → arg( leg1·conj(leg2))/π  (zero at alignment)
 * `phaseDev = |phaseSigned|` in either case. Returns {@link FScaledComponentsBatch}
 * with the field-reuse described in `fScaledComponentsBatch`.
 */
function computeLegBatch(sigma: number, tArr: Float64Array, family: FFamily, rForm: RForm): FScaledComponentsBatch {
  const n = tArr.length;
  // leg1 = Σ₁(σ,t) + R₁_<rForm>(σ,t)
  const sig1 = sigma1Scaled(tArr, sigma);
  const r1 = computeR1Family(sigma, tArr, rForm);
  const leg1 = new Float64Array(n * 2);
  for (let j = 0; j < n; j++) {
    leg1[j * 2] = sig1[j * 2]! + r1[j * 2]!;
    leg1[j * 2 + 1] = sig1[j * 2 + 1]! + r1[j * 2 + 1]!;
  }
  // leg2 = Σ₂(σ,t) + R₂_<rForm>(σ,t) — all at σ, no functional reflection.
  const sig2 = sigma2Scaled(tArr, sigma, sigma);
  const r2 = computeR2Family(sigma, tArr, rForm);
  const leg2 = new Float64Array(n * 2);
  for (let j = 0; j < n; j++) {
    leg2[j * 2] = sig2[j * 2]! + r2[j * 2]!;
    leg2[j * 2 + 1] = sig2[j * 2 + 1]! + r2[j * 2 + 1]!;
  }
  const yVal = new Float64Array(n);
  const sigma1Mag = new Float64Array(n);
  const r1Mag = new Float64Array(n);
  const phaseDev = new Float64Array(n);
  const phaseSigned = new Float64Array(n);
  // legAngleOut: f = arg(leg1·conj(leg2))/π → zero at alignment (parallel).
  // others (legRatio, legAngle): f = arg(−leg1·conj(leg2))/π → zero at
  // antialignment (the ζ-zero phase condition).
  const foldOut = family === "legAngleOut";
  for (let j = 0; j < n; j++) {
    const a = leg1[j * 2]!;
    const b = leg1[j * 2 + 1]!;
    const c = leg2[j * 2]!;
    const d = leg2[j * 2 + 1]!;
    sigma1Mag[j] = Math.hypot(a, b);
    r1Mag[j] = Math.hypot(c, d);
    yVal[j] = Math.hypot(a + c, b + d); // |leg1 + leg2| ≈ |ζ|
    const dot = a * c + b * d;          // Re(leg1·conj(leg2))
    const cross = a * d - b * c;        // Im(leg1·conj(leg2))
    const prodRe = foldOut ? dot : -dot;
    const prodIm = cross;
    const phase = Math.atan2(prodIm, prodRe) / Math.PI;
    phaseSigned[j] = phase;
    phaseDev[j] = Math.abs(phase);
  }
  return { yVal, sigma1Mag, r1Mag, phaseDev, sigma1: leg1, r1: leg2, phaseSigned };
}

/**
 * Convenience wrapper that returns only `|t^σ · f(σ, t)|` per `t`. Useful
 * for the scan inner loop where we discard everything except `yVal`.
 */
export function fScaledAbs(
  sigma: number,
  tArr: Float64Array,
  variant: FVariant,
): Float64Array {
  return fScaledBatch(sigma, tArr, variant).yVal;
}

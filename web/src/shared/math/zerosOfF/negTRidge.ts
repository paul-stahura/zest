import { iOfT, indexFromIofT } from "./iOfT";

/**
 * σ on the negative-t (R1nak) zeros ridge, within the integer-T band ⌊T⌋ = n:
 *
 *   σ*(T) = π · I(T) / (2 · ln(n + ½)).
 *
 * This is the `|Σ₁| = |R1nak|` magnitude-balance locus that holds *every* t<0
 * zero. It fits the measured ridge to <1% for T ≳ 2. Shared by the ridge
 * overlay, the scan-queue band builder, and the scan-rectangle overlay so all
 * three agree on one formula.
 */
export function ridgeSigma(t: number, n: number): number {
  return (Math.PI * iOfT(t)) / (2 * Math.log(n + 0.5));
}

/** σ*(T) using the natural band n = ⌊T⌋. */
export function ridgeSigmaAtT(t: number): number {
  return ridgeSigma(t, Math.floor(t));
}

/**
 * Inverse ridge: given a σ that sits on the ridge, return **every** T with
 * σ*(T) = σ. Within a fixed band n the ridge is σ = π·I(T)/(2·ln(n+½)), so
 *   I(T) = 2σ·ln(n+½)/π
 * and T = {@link indexFromIofT}(…) is the analytic inverse of I. A given σ can
 * land on the ridge in more than one band: bands overlap in σ (each drops ~3%
 * at its top integer, small against its ~40% rise), and at low T a tall band can
 * even overlap several higher bands non-contiguously (e.g. σ≈143 sits on bands
 * 1, 3, 4 but not 2). So we test every band n from 1 up to a smooth upper bound
 * (nc+2, from σ ≈ π²T²/ln T), keeping each whose analytic T actually lands
 * inside band n = ⌊T⌋. Results are sorted by band (ascending T). Empty for
 * σ ≤ 0 (off the ridge domain). Cost is O(nc) cheap analytic solves per call.
 */
export function ridgeInvTs(sigma: number): number[] {
  if (!(sigma > 0)) return [];
  // Smooth seed for the top band to test: σ ≈ π²T²/ln T ⇒ T ≈ √(σ ln T / π²).
  let seed = Math.sqrt(sigma) / Math.PI;
  for (let i = 0; i < 3; i++) {
    seed = Math.sqrt((sigma * Math.log(Math.max(seed, 1.5))) / (Math.PI * Math.PI));
  }
  const nMax = Math.max(1, Math.floor(seed)) + 2;
  const out: number[] = [];
  for (let n = 1; n <= nMax; n++) {
    const t = indexFromIofT((2 * sigma * Math.log(n + 0.5)) / Math.PI);
    if (Number.isFinite(t) && Math.floor(t) === n) out.push(t);
  }
  return out;
}

/**
 * Principal inverse ridge: the lowest-band T with σ*(T) = σ (the first band the
 * ridge enters that σ), or `NaN` if σ is off the ridge. Used where a single
 * representative T is wanted (e.g. the overlay outline). The scan itself uses
 * {@link ridgeInvTs} so it covers both crossings in overlap zones.
 */
export function ridgeInvT(sigma: number): number {
  const ts = ridgeInvTs(sigma);
  return ts.length > 0 ? ts[0]! : NaN;
}

/**
 * Half-width (in T) of the ridge-range scan band at index T. The zeros lie
 * exactly on the ridge; the formula ridge is accurate to <1% in σ, i.e. <0.5%
 * in T (since dσ/σ = 2·dT/T along σ ∝ T²/ln T). A half-width of 2.5% of T keeps
 * the true ridge well inside the band (≈5× the formula error) while staying
 * thin enough that each σ column brackets a single ridge crossing. The 0.08
 * floor covers small T, where the fit is looser.
 */
export function ridgeBandHalfWidth(t: number): number {
  return Math.max(0.08, 0.025 * t);
}

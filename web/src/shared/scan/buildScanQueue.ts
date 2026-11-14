import { combineSeeds } from "@/shared/math/sampling";
import { ridgeInvTs, ridgeBandHalfWidth } from "@/shared/math/zerosOfF";
import type { ScanRequest } from "@/shared/scan/scanBackend";
import type { ScanLineInput } from "@/shared/scan/scanLineAlgorithm";

/** Smallest T a scan line may start at (`iOfT` needs T > 0). */
const MIN_BAND_T = 0.1;

/**
 * Expand a `ScanRequest` into the per-σ-row input objects each worker will
 * consume. This preserves legacy spacing and seed derivation semantics: seeds
 * derive from the running output index, which equals the σ index in the normal
 * (one-line-per-σ) path, so non-ridge queues are byte-identical to before.
 *
 * In "ridge range" mode (`req.ridgeBand`, negative-t branch) each σ line's
 * `tRange` is replaced by a thin band `[T*(σ)−Δ, T*(σ)+Δ]` centred on the R1nak
 * zeros ridge, so the scan hugs the ridge instead of sweeping a full rectangle.
 * A σ that lands on two adjacent bands' ridges (the ~3% overlap zones) emits one
 * banded line per crossing; σ off the ridge domain (σ ≤ 0) emits nothing.
 */
export function buildScanQueue(req: ScanRequest): ScanLineInput[] {
  const sigmas = req.sigmaRange.adaptive === true
    ? buildAdaptiveSigmas(req.sigmaRange.min, req.sigmaRange.max, req.sigmaRange.linesPerSigma)
    : buildUniformSigmas(req.sigmaRange.min, req.sigmaRange.max, req.sigmaRange.linesPerSigma);
  const out: ScanLineInput[] = [];
  const pushLine = (sigma: number, tMin: number, tMax: number): void => {
    out.push({
      sigma,
      tMin,
      tMax,
      samplesPerT: req.samplesPerT,
      bisectionIters: req.bisectionIters,
      variant: req.variant,
      seed: combineSeeds(req.seed, out.length),
    });
  };
  for (let i = 0; i < sigmas.length; i++) {
    const sigma = sigmas[i]!;
    if (req.ridgeBand === true) {
      for (const tRidge of ridgeInvTs(sigma)) {
        const dt = ridgeBandHalfWidth(tRidge);
        pushLine(sigma, Math.max(MIN_BAND_T, tRidge - dt), tRidge + dt);
      }
    } else {
      pushLine(sigma, req.tRange.min, req.tRange.max);
    }
  }
  return out;
}

function buildUniformSigmas(min: number, max: number, L: number): number[] {
  const span = Math.abs(max - min);
  const total = Math.max(1, Math.round(span * L));
  const out: number[] = [];
  for (let i = 0; i < total; i++) {
    const frac = total === 1 ? 0 : i / (total - 1);
    out.push(min + frac * (max - min));
  }
  return out;
}

/**
 * Place σ positions with per-line density that depends on σ:
 *   - σ ≥ −1: density = `L` (uniform, same as the non-adaptive case)
 *   - σ < −1: density = `L / |σ|`
 * Walks from the larger σ end toward the smaller in 1/density steps, so deep
 * negative σ gets exponentially fewer lines. Always emits both endpoints.
 */
function buildAdaptiveSigmas(min: number, max: number, L: number): number[] {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  if (lo === hi) return [lo];
  const out: number[] = [];
  let sigma = hi;
  // Bound the walk so a pathological density (e.g., very small L) can't loop
  // forever. Caps at the largest count uniform sampling would produce.
  const cap = Math.max(2, Math.ceil((hi - lo) * L) + 4);
  for (let i = 0; i < cap; i++) {
    out.push(sigma);
    const scale = sigma < -1 ? 1 / Math.abs(sigma) : 1;
    const localDensity = Math.max(1e-9, L * scale);
    sigma -= 1 / localDensity;
    if (sigma <= lo) break;
  }
  if (Math.abs(out[out.length - 1]! - lo) > 1e-9) out.push(lo);
  return out.slice().sort((a, b) => a - b);
}

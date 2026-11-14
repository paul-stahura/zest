import { coarseSamplesPerLine } from "@/shared/scan/tChunking";
import type { ScanRequest } from "@/shared/scan/scanBackend";

/** Default grid for the isolated \(f_{R_{1ps}}\) hunt (σ −100…−25, T 0…500). */
export function r1psHuntScanRequest(): ScanRequest {
  return {
    variant: "R1ps",
    algorithm: "sign-change",
    acceptDepth: 0.0005,
    bisectionIters: 8,
    samplesPerT: 1000,
    seed: 42,
    useScanFloor: false,
    sigmaRange: { min: -100, max: -25, linesPerSigma: 30, adaptive: false },
    tRange: { min: 0.1, max: 500 },
    workers: 0,
  };
}

/**
 * σ-row count for a uniform `linesPerSigma` grid (same as `buildUniformSigmas`).
 */
export function uniformSigmaLineCount(min: number, max: number, linesPerSigma: number): number {
  return Math.max(1, Math.round(Math.abs(max - min) * linesPerSigma));
}

/**
 * Coarse samples for the full \(f_{R_{1ps}}\) box at default density.
 */
export function r1psHuntCoarseSamples(req: ScanRequest = r1psHuntScanRequest()): number {
  const rows = uniformSigmaLineCount(req.sigmaRange.min, req.sigmaRange.max, req.sigmaRange.linesPerSigma);
  return rows * coarseSamplesPerLine(req);
}

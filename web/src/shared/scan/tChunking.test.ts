import type { ScanRequest } from "@/shared/scan/scanBackend";
import {
  coarseSamplesPerLine,
  effectiveChunksPerRow,
  estimateBatchCoarseRamGiB,
  estimateClusterNodePeakRamGiB,
  recommendedTChunksPerRow,
  shouldAutoEnableTChunking,
  shouldAutoEnableTChunkingForCluster,
  tChunksPerRow,
} from "@/shared/scan/tChunking";

const baseRequest: ScanRequest = {
  variant: "R1ak",
  sigmaRange: { min: -100, max: -20, linesPerSigma: 30 },
  tRange: { min: 0, max: 5000 },
  samplesPerT: 1000,
  bisectionIters: 8,
  algorithm: "sign-change",
  acceptDepth: 0.0005,
  seed: 42,
  workers: 0,
};

describe("tChunksPerRow", () => {
  it("returns 1 for small T grids", () => {
    const small: ScanRequest = {
      ...baseRequest,
      tRange: { min: 1, max: 300 },
      samplesPerT: 100,
    };
    expect(coarseSamplesPerLine(small)).toBe(29_900);
    expect(tChunksPerRow(small)).toBe(1);
    expect(shouldAutoEnableTChunking(small)).toBe(false);
  });

  it("splits large T grids that exceed the coarse sample target", () => {
    expect(coarseSamplesPerLine(baseRequest)).toBe(5_000_000);
    expect(tChunksPerRow(baseRequest)).toBe(20);
    expect(shouldAutoEnableTChunking(baseRequest)).toBe(true);
  });
});

describe("effectiveChunksPerRow", () => {
  it("honors the launch toggle", () => {
    expect(effectiveChunksPerRow(baseRequest, false)).toBe(1);
    expect(effectiveChunksPerRow(baseRequest, true)).toBe(20);
  });

  it("raises chunk count for fleet parallelism on smaller scans", () => {
    const req: ScanRequest = {
      ...baseRequest,
      tRange: { min: 0, max: 300 },
      samplesPerT: 100,
    };
    expect(recommendedTChunksPerRow(req, 500, 8)).toBe(24);
    expect(shouldAutoEnableTChunkingForCluster(req, 500, 8)).toBe(true);
    expect(effectiveChunksPerRow(req, true, { linesTotal: 500, gpuCount: 8 })).toBe(24);
  });
});

describe("estimateBatchCoarseRamGiB", () => {
  it("drops peak RAM when T chunking is enabled", () => {
    const batchSigma = 96;
    const full = estimateBatchCoarseRamGiB(baseRequest, batchSigma, false);
    const chunked = estimateBatchCoarseRamGiB(baseRequest, batchSigma, true);
    expect(full).toBeCloseTo(14.3, 0);
    expect(chunked).toBeLessThan(full / 10);
  });
});

describe("estimateClusterNodePeakRamGiB", () => {
  it("includes pipeline overlap and worker baseline above batch RAM", () => {
    const batchSigma = 96;
    const batch = estimateBatchCoarseRamGiB(baseRequest, batchSigma, true);
    const node = estimateClusterNodePeakRamGiB(baseRequest, batchSigma, true);
    expect(node).toBeGreaterThan(batch);
    expect(node).toBeCloseTo(batch * 2 + 4, 0);
  });
});

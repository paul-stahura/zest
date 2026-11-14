import type { ScanRequest } from "@/shared/scan/scanBackend";

/** Target coarse samples per T chunk (matches cloud-scan-control-plane.mjs). */
export const T_CHUNK_TARGET_COARSE_SAMPLES = 250_000;
export const T_CHUNK_MAX_CHUNKS_PER_ROW = 24;

/** Minimum work units per GPU for healthy dynamic load balance at tail. */
export const T_CHUNK_MIN_WORK_UNITS_PER_GPU = 2_000;

/** Coarse samples for one σ-row over the full requested T range. */
export function coarseSamplesPerLine(req: ScanRequest): number {
  const tSpan = Math.max(0, req.tRange.max - req.tRange.min);
  return Math.max(0, Math.ceil(tSpan) * req.samplesPerT);
}

/** T sub-ranges per σ-row when T chunking is enabled. */
export function tChunksPerRow(req: ScanRequest): number {
  const integerPeriods = Math.max(1, Math.ceil(req.tRange.max) - Math.floor(req.tRange.min));
  const estimated = coarseSamplesPerLine(req);
  if (estimated <= T_CHUNK_TARGET_COARSE_SAMPLES) return 1;
  return Math.max(
    1,
    Math.min(
      integerPeriods,
      T_CHUNK_MAX_CHUNKS_PER_ROW,
      Math.ceil(estimated / T_CHUNK_TARGET_COARSE_SAMPLES),
    ),
  );
}

/** Default UI checkbox: on when a single-row coarse grid would exceed the chunk target. */
export function shouldAutoEnableTChunking(req: ScanRequest): boolean {
  return tChunksPerRow(req) > 1;
}

/**
 * Cluster: prefer enough T chunks that dynamic LB has fine-grained work units
 * without changing coarse sample density (same samplesPerT over full T range).
 */
export function recommendedTChunksPerRow(req: ScanRequest, linesTotal: number, gpuCount: number): number {
  const base = tChunksPerRow(req);
  const rows = Math.max(1, Math.round(linesTotal));
  const gpus = Math.max(1, Math.round(gpuCount));
  const minWorkUnits = gpus * T_CHUNK_MIN_WORK_UNITS_PER_GPU;
  const chunksForParallelism = Math.ceil(minWorkUnits / rows);
  return Math.min(T_CHUNK_MAX_CHUNKS_PER_ROW, Math.max(base, chunksForParallelism));
}

export function shouldAutoEnableTChunkingForCluster(
  req: ScanRequest,
  linesTotal: number,
  gpuCount: number,
): boolean {
  if (shouldAutoEnableTChunking(req)) return true;
  return recommendedTChunksPerRow(req, linesTotal, gpuCount) > 1;
}

export function effectiveChunksPerRow(
  req: ScanRequest,
  tChunkingEnabled: boolean,
  options?: { linesTotal?: number; gpuCount?: number },
): number {
  if (!tChunkingEnabled) return 1;
  if (options?.linesTotal !== undefined && options.gpuCount !== undefined) {
    return recommendedTChunksPerRow(req, options.linesTotal, options.gpuCount);
  }
  return tChunksPerRow(req);
}

export function coarseSamplesPerTChunk(req: ScanRequest): number {
  const chunks = tChunksPerRow(req);
  if (chunks <= 1) return coarseSamplesPerLine(req);
  return Math.ceil(coarseSamplesPerLine(req) / chunks);
}

/** Rough batched coarse RAM (GiB); uses same 32 B/sample heuristic as cluster batch cap. */
export function estimateBatchCoarseRamGiB(
  req: ScanRequest,
  batchSigma: number,
  tChunkingEnabled: boolean,
): number {
  const perLine = tChunkingEnabled ? coarseSamplesPerTChunk(req) : coarseSamplesPerLine(req);
  return (batchSigma * perLine * 32) / (1024 ** 3);
}

/** K8s memory limit per hordling GPU worker (matches k8s-provider). */
export const CLUSTER_NODE_MEMORY_LIMIT_GIB = 96;

/** Steady-state pipeline overlap: bisecting one batch while finishing the next. */
export const CLUSTER_NODE_PIPELINE_OVERLAP = 2;

/** Python, Numba JIT, CUDA context, and upload buffers (order-of-magnitude). */
export const CLUSTER_NODE_WORKER_BASELINE_GIB = 4;

/** Rough peak unified-memory use per GPU node before launch. */
export function estimateClusterNodePeakRamGiB(
  req: ScanRequest,
  batchSigma: number,
  tChunkingEnabled: boolean,
): number {
  const batchGiB = estimateBatchCoarseRamGiB(req, batchSigma, tChunkingEnabled);
  return batchGiB * CLUSTER_NODE_PIPELINE_OVERLAP + CLUSTER_NODE_WORKER_BASELINE_GIB;
}

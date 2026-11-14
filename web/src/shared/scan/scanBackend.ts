import type { FVariant } from "@/shared/math/zerosOfF";

/**
 * Lifecycle status of a single scan handle.
 *  - `running`: workers are dispatching/executing tasks.
 *  - `paused`: backend is no longer dispatching new tasks; workers idle.
 *               Pure suspension — no resources released.
 *  - `done` / `cancelled` / `error`: terminal states.
 */
/** Canonical schema version for archive entries stored by this UI. */
export const CURRENT_SCAN_RESULT_SCHEMA_VERSION = 1;

/** Backend profile IDs exposed to the workspace controls and persisted state. */
export type ScanBackendChoice = "local" | "cloud-64" | "cloud-96" | "cloud-192";
export type CloudProfileId = "cloud-64" | "cloud-96" | "cloud-192";

/** Provenance metadata saved with each archived scan. */
export interface ScanProvenance {
  resultSchemaVersion: number;
  scannerSourceHash: string;
  bundleArtifactHash?: string;
  scannerFiles: string[];
  bundledAt: string;

  gitCommit?: string;
  gitBranch?: string;
  gitDirty?: boolean;
  hostedResultArtifacts?: {
    /** New hosted browsers can load completed scans from shard-local aggregate pages. */
    workerResultPages?: boolean;
    /** New hosted browsers can load completed result-page bytes from presigned S3 URLs. */
    directResultPageUrls?: boolean;
  };

  backend: "local-worker" | "cloud";
  cloudProfileId?: "cloud-64" | "cloud-96" | "cloud-192";

  partial: boolean;
  terminalStatus: "done" | "cancelled" | "error";
}

export type ScanStatus = "running" | "paused" | "done" | "cancelled" | "error";

/** Detection algorithm — kept as a literal union so backends can switch on it. */
export type ScanAlgorithm = "sign-change" | "minima";

/** Knobs that drive a single scan, identical across all backends. */
export interface ScanRequest {
  variant: FVariant;
  sigmaRange: {
    min: number;
    max: number;
    linesPerSigma: number;
    /** When true, scale the per-σ line density by `1/|σ|` for σ < −1 so the
     *  scanner places fewer lines at deep negative σ (where features are
     *  larger and rare). σ ≥ −1 still uses `linesPerSigma` exactly. */
    adaptive?: boolean;
  };
  tRange: { min: number; max: number };
  /** Negative-t "ridge range" mode. When true, `tRange` is ignored: each σ line
   *  instead scans a thin T band `[T*(σ)−Δ, T*(σ)+Δ]` straddling the R1nak zeros
   *  ridge σ*(T) (via `ridgeInvT`/`ridgeBandHalfWidth`). Set only on the t<0
   *  branch. Absent/false = normal rectangular `tRange`. */
  ridgeBand?: boolean;
  /** Initial uniform sampling density per integer-T period. Used by both
   * algorithms; for `minima` it caps detectable zeros at ~`samplesPerT/3` per T. */
  samplesPerT: number;
  /** Binary bisection iterations per Z sign-change bracket. Only used when
   * `algorithm === "sign-change"`. */
  bisectionIters: number;
  /** Detection algorithm. `sign-change` = legacy Z+φ conjunction.
   * `minima` = local-min hunt on `|f|` with golden-section refinement. */
  algorithm: ScanAlgorithm;
  /** Acceptance threshold for `minima`: keep candidate iff
   * `|f| / (|Σ₁| + |R₁|) < acceptDepth` after refinement. Ignored by
   * `sign-change`. Sensible range 0.05 (strict) to 0.25 (permissive). */
  acceptDepth: number;
  /** When `false`, the scan ignores the empirical scan-floor curve and walks
   *  the full requested T range (only the `R1ak` variant ever honored the
   *  floor in the first place; this lets the user override even there).
   *  Default `true` for backward-compat with persisted requests that omit it. */
  useScanFloor?: boolean;
  /** Top-level seed; per-σ seeds are derived deterministically from this. */
  seed: number;
  /** Hint only — local backend honors directly, cloud backend may ignore. */
  workers: number;
  /**
   * Hosted-cloud launch hint for multi-EC2 sharding. Local scans ignore this;
   * current single-worker cloud modes may log/persist it before H10 honors it.
   */
  cloudMachineCount?: number;
  /**
   * Cluster-only: σ-rows batched per GPU CUDA launch. Ignored by local/AWS
   * backends; worker reads `request.clusterBatchSigma` then `ZEST_SCAN_BATCH_SIGMA`.
   */
  clusterBatchSigma?: number;
  /** Cloud worker-only row shard. UI/local archives should generally omit it. */
  scanShard?: {
    shardCount: number;
    shardId: string;
    shardIndex: number;
    rowStart: number;
    rowEndExclusive: number;
    totalRows: number;
    /** Cluster global-queue mode: worker claims batches across the full scan. */
    dynamicLoadBalance?: boolean;
  };
  /**
   * Cluster launch hint: split each σ-row into multiple T windows so GPU workers
   * hold ~250k coarse samples per chunk instead of the full T grid. When false,
   * workers scan the full tRange per row (faster for small scans).
   */
  tChunkingEnabled?: boolean;
  /**
   * Cluster launch hint: pull coarse batches from a global work queue so GPUs
   * that finish early help stragglers. When false, each GPU keeps a static σ slice.
   */
  dynamicLoadBalanceEnabled?: boolean;
  /**
   * Cloud worker-only T-axis subdivision. Hosted control plane sets chunksPerRow
   * from {@link tChunkingEnabled} and scan geometry. Local scans ignore it.
   */
  cloudTChunking?: {
    chunksPerRow: number;
  };
}

/**
 * One sigma row of recorded points. Backend emits raw `yVal` and the auxiliary
 * magnitudes / phase deviation needed for orange/green classification, so the
 * renderer can re-classify on the fly when thresholds change without rescan.
 *
 * `level` is optional and only carried when reading legacy CSVs that pre-baked
 * the level column.
 */
export interface ScanLine {
  /** Canonical one-based row index for cloud transport/recovery. */
  lineIndex?: number;
  sigma: number;
  t: Float64Array;
  yVal: Float64Array;
  /** `|t^σ · Σ₁|` per point. */
  sigma1Mag: Float64Array;
  /** `|t^σ · R₁|` per point (matches selected variant). */
  r1Mag: Float64Array;
  /** `|arg(−Σ₁ · conj(R₁)) / π|` per point. */
  phaseDev: Float64Array;
  /** Signed phase of R per point: `arg(R) / π` in `(-1, 1]`. Optional —
   * only the local scanner emits it; cloud-streamed scans omit it. */
  phaseR?: Float64Array;
  /** `|f| / (|Σ₁| + |R₁|)` per point. Only populated by the `minima`
   * algorithm; absent for `sign-change` scans and for legacy archives. */
  depth?: Float64Array;
  /** Wall-clock ms the worker spent computing this row. Backend-attached;
   * not persisted in the archive. */
  durationMs?: number;
  /** Legacy CSV-loaded only; 0=null, 1=red, 2=black, 3=mag, 4=phase. */
  level?: Uint8Array;
}

export interface ScanProgress {
  linesDone: number;
  linesTotal: number;
  pointsRecorded: number;
}

export type ScanActivityKind = "health" | "data" | "retry" | "shutdown" | "verified" | "disconnected";

export interface ScanActivity {
  kind: ScanActivityKind;
  message: string;
  at: number;
}

export interface ScanSummary {
  linesScanned: number;
  pointsRecorded: number;
  durationMs: number;
}

export interface Unsubscribe {
  (): void;
}

/** Handle returned by `ScanBackend.start()`. Drives observation + cancellation. */
export interface ScanHandle {
  readonly id: string;
  readonly status: ScanStatus;
  /** Total σ-rows scheduled for this scan. Known synchronously at start. */
  readonly linesTotal: number;
  onLine(cb: (line: ScanLine) => void): Unsubscribe;
  onProgress(cb: (p: ScanProgress) => void): Unsubscribe;
  onActivity?(cb: (activity: ScanActivity) => void): Unsubscribe;
  onHostedScanId?(cb: (scanId: string) => void): Unsubscribe;
  onDone(cb: (summary: ScanSummary) => void): Unsubscribe;
  onCancelled(cb: () => void): Unsubscribe;
  onError(cb: (err: Error) => void): Unsubscribe;
  /** Resolves only after backend has fully released its resources for this scan. */
  cancel(): Promise<void>;
  /** Detach local listeners/resources without necessarily cancelling remote work. */
  detach?(): Promise<void> | void;
  /** Stop dispatching new tasks; in-flight tasks finish and workers idle. */
  pause(): void;
  /** Re-dispatch from any idle workers; only valid after `pause()`. */
  resume(): void;
  /** Optional scan provenance metadata for archive persistence. */
  getProvenance?(): Promise<Omit<ScanProvenance, "partial" | "terminalStatus"> | null>;
}

/** Pluggable scan engine. Local-worker, Go-local, or cloud all implement this. */
export interface ScanBackend {
  readonly id: string;
  readonly displayName: string;
  start(req: ScanRequest): ScanHandle;
  /** Best-effort verification that resources for `handleId` are gone. */
  verifyShutdown?(handleId: string): Promise<boolean>;
  /** Called when the workspace unmounts; backend must release pooled workers / sockets. */
  dispose(): void;
}

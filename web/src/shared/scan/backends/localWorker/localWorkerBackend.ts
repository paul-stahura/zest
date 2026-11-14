import ScanWorker from "./scanWorker?worker";
import type {
  ScanBackend,
  ScanHandle,
  ScanLine,
  ScanProgress,
  ScanRequest,
  ScanStatus,
  ScanSummary,
  Unsubscribe,
  ScanProvenance,
} from "@/shared/scan/scanBackend";
import type { WorkerResultLine, WorkerResultError, WorkerTask } from "./scanWorker";
import { buildScanQueue } from "@/shared/scan/buildScanQueue";
import type { ScanLineInput } from "@/shared/scan/scanLineAlgorithm";
import type { ScanAlgorithm } from "@/shared/scan/scanBackend";
import { makeCurrentLocalScanProvenanceBase } from "@/shared/scan/scannerSourceHash";

/** ID counter for handles. Module-scope is fine — single backend per workspace. */
let nextHandleId = 1;

function asWorkerResult(data: unknown): WorkerResultLine | WorkerResultError {
  if (typeof data !== "object" || data === null) {
    throw new Error("worker sent non-object message");
  }
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- the worker is owned by this module; only it sends messages here.
  return data as WorkerResultLine | WorkerResultError;
}

/**
 * Pluggable backend that runs the scan in a pool of in-page Web Workers.
 *
 * Each σ-row in the request becomes one worker task. Workers run the same
 * `scanLine` algorithm as the cloud backend will. Results are streamed back
 * to the caller via `onLine` as they arrive; cancellation tears down all
 * workers immediately.
 */
export class LocalWorkerBackend implements ScanBackend {
  public readonly id = "local-worker";
  public readonly displayName = "Local (Web Workers)";

  /**
   * Pool size cap. Honors the `workers` hint in `ScanRequest` clamped to
   * `[1, hardwareCap]`. We default `hardwareCap` to `min(navigator.hardwareConcurrency, 16)`
   * per the project plan.
   */
  public readonly hardwareCap: number;

  /** Resolve the effective worker pool size for a given hint, without starting a scan. */
  public effectivePoolSize(workersHint: number): number {
    const auto = Math.max(1, this.hardwareCap - 1);
    return workersHint <= 0
      ? auto
      : Math.max(1, Math.min(this.hardwareCap, workersHint));
  }

  public constructor() {
    const hc = typeof navigator !== "undefined" && typeof navigator.hardwareConcurrency === "number"
      ? navigator.hardwareConcurrency
      : 4;
    this.hardwareCap = Math.max(1, Math.min(16, hc));
  }

  public start(req: ScanRequest): ScanHandle {
    const id = `local-${nextHandleId++}`;
    // workers = 0 (auto): leave one logical core free for the UI thread by
    // using hardwareCap − 1. Otherwise honour the hint clamped to [1, cap].
    const auto = Math.max(1, this.hardwareCap - 1);
    const poolSize =
      req.workers <= 0
        ? auto
        : Math.max(1, Math.min(this.hardwareCap, req.workers));
    return new LocalWorkerScanHandle(id, req, poolSize);
  }

  public dispose(): void {
    // Per-handle workers are owned by the handle; nothing to release here.
  }
}

interface ListenerSet {
  line: Set<(l: ScanLine) => void>;
  progress: Set<(p: ScanProgress) => void>;
  done: Set<(s: ScanSummary) => void>;
  cancelled: Set<() => void>;
  error: Set<(e: Error) => void>;
}

class LocalWorkerScanHandle implements ScanHandle {
  public readonly id: string;
  public status: ScanStatus = "running";

  private readonly listeners: ListenerSet = {
    line: new Set(),
    progress: new Set(),
    done: new Set(),
    cancelled: new Set(),
    error: new Set(),
  };
  private readonly workers: Worker[] = [];
  private readonly queue: ScanLineInput[];
  private readonly algorithm: ScanAlgorithm;
  private readonly acceptDepth: number;
  private readonly refineIters: number;
  private readonly useScanFloor: boolean;
  private nextTaskId = 1;
  private linesDone = 0;
  private pointsRecorded = 0;
  public readonly linesTotal: number;
  private readonly startedAt = performance.now();
  private readonly provenancePromise: Promise<Omit<ScanProvenance, "partial" | "terminalStatus">>;
  private cancelResolve: (() => void) | null = null;
  /** Workers parked by `pause()` waiting for `resume()` to re-dispatch. */
  private readonly idleWorkers: Worker[] = [];

  public constructor(id: string, req: ScanRequest, poolSize: number) {
    this.id = id;
    this.queue = buildScanQueue(req);
    this.algorithm = req.algorithm;
    this.acceptDepth = req.acceptDepth;
    // Reuse `bisectionIters` as the golden-section iteration count for minima —
    // same precision contract (more iters → tighter t*), and the UI already
    // exposes it. ~15 puts t* within ~1e-6 of t-spacing.
    this.refineIters = req.bisectionIters;
    this.useScanFloor = req.useScanFloor !== false;
    this.provenancePromise = makeCurrentLocalScanProvenanceBase();
    this.linesTotal = this.queue.length;
    for (let w = 0; w < Math.min(poolSize, this.linesTotal); w++) {
      const worker = new ScanWorker();
      worker.addEventListener("message", (e: MessageEvent) => this.onWorkerMessage(worker, e));
      worker.addEventListener("error", (e: ErrorEvent) => {
        const detail = [e.message, e.filename, String(e.lineno), String(e.colno)].filter((s) => s && s !== "undefined").join(" @ ");
        this.handleError(new Error(`worker error: ${detail || "unknown"}`));
      });
      worker.addEventListener("messageerror", () => {
        this.handleError(new Error("worker messageerror: failed to deserialize message"));
      });
      this.workers.push(worker);
      this.dispatchNext(worker);
    }
    if (this.linesTotal === 0) {
      // Nothing to do — fire done immediately on next tick so listeners can attach.
      queueMicrotask(() => this.finishDone());
    }
  }

  public onLine(cb: (line: ScanLine) => void): Unsubscribe {
    this.listeners.line.add(cb);
    return () => this.listeners.line.delete(cb);
  }
  public onProgress(cb: (p: ScanProgress) => void): Unsubscribe {
    this.listeners.progress.add(cb);
    return () => this.listeners.progress.delete(cb);
  }
  public onDone(cb: (s: ScanSummary) => void): Unsubscribe {
    this.listeners.done.add(cb);
    return () => this.listeners.done.delete(cb);
  }
  public onCancelled(cb: () => void): Unsubscribe {
    this.listeners.cancelled.add(cb);
    return () => this.listeners.cancelled.delete(cb);
  }
  public onError(cb: (e: Error) => void): Unsubscribe {
    this.listeners.error.add(cb);
    return () => this.listeners.error.delete(cb);
  }

  public getProvenance(): Promise<Omit<ScanProvenance, "partial" | "terminalStatus"> | null> {
    return this.provenancePromise.catch(() => null);
  }

  public async cancel(): Promise<void> {
    if (this.status !== "running" && this.status !== "paused") return;
    this.status = "cancelled";
    this.queue.length = 0;
    for (const w of this.workers) w.terminate();
    this.workers.length = 0;
    this.idleWorkers.length = 0;
    for (const cb of this.listeners.cancelled) cb();
    return new Promise<void>((resolve) => {
      this.cancelResolve = resolve;
      // Workers terminated synchronously; resolve next tick so callers always await one.
      queueMicrotask(() => {
        this.cancelResolve?.();
        this.cancelResolve = null;
      });
    });
  }

  public pause(): void {
    if (this.status !== "running") return;
    this.status = "paused";
    // Workers in flight will become idle naturally — `dispatchNext` skips
    // dispatching while paused and parks the worker in `idleWorkers`.
  }

  public resume(): void {
    if (this.status !== "paused") return;
    this.status = "running";
    const parked = this.idleWorkers.splice(0, this.idleWorkers.length);
    for (const w of parked) {
      this.dispatchNext(w);
    }
  }

  private onWorkerMessage(worker: Worker, e: MessageEvent): void {
    // Allow result delivery while paused — that final in-flight task we
    // didn't intercept needs to land its line and progress event before its
    // worker parks. After processing the result, dispatchNext will park the
    // worker because `paused` gates redispatch.
    if (this.status !== "running" && this.status !== "paused") return;
    const data = asWorkerResult(e.data);
    if (data.type === "error") {
      this.handleError(new Error(data.message));
      return;
    }
    const o = data.output;
    const line: ScanLine = {
      sigma: o.sigma,
      t: new Float64Array(o.t),
      yVal: new Float64Array(o.yVal),
      sigma1Mag: new Float64Array(o.sigma1Mag),
      r1Mag: new Float64Array(o.r1Mag),
      phaseDev: new Float64Array(o.phaseDev),
      phaseR: new Float64Array(o.phaseR),
      ...(o.depth !== undefined ? { depth: new Float64Array(o.depth) } : {}),
      durationMs: data.durationMs,
    };
    for (const cb of this.listeners.line) cb(line);
    this.linesDone++;
    this.pointsRecorded += line.t.length;
    const progress: ScanProgress = {
      linesDone: this.linesDone,
      linesTotal: this.linesTotal,
      pointsRecorded: this.pointsRecorded,
    };
    for (const cb of this.listeners.progress) cb(progress);
    if (this.linesDone === this.linesTotal) {
      this.finishDone();
      return;
    }
    this.dispatchNext(worker);
  }

  private dispatchNext(worker: Worker): void {
    if (this.status === "paused") {
      // Park; `resume()` will re-dispatch.
      this.idleWorkers.push(worker);
      return;
    }
    const next = this.queue.shift();
    if (next === undefined) return;
    const task: WorkerTask =
      this.algorithm === "minima"
        ? {
            taskId: this.nextTaskId++,
            algorithm: "minima",
            minimaInput: {
              sigma: next.sigma,
              tMin: next.tMin,
              tMax: next.tMax,
              samplesPerT: next.samplesPerT,
              refineIters: this.refineIters,
              acceptDepth: this.acceptDepth,
              variant: next.variant,
              seed: next.seed,
              useScanFloor: this.useScanFloor,
            },
          }
        : {
            taskId: this.nextTaskId++,
            algorithm: "sign-change",
            signChangeInput: { ...next, acceptDepth: this.acceptDepth, useScanFloor: this.useScanFloor },
          };
    worker.postMessage(task);
  }

  private finishDone(): void {
    if (this.status !== "running") return;
    this.status = "done";
    for (const w of this.workers) w.terminate();
    this.workers.length = 0;
    const summary: ScanSummary = {
      linesScanned: this.linesDone,
      pointsRecorded: this.pointsRecorded,
      durationMs: performance.now() - this.startedAt,
    };
    for (const cb of this.listeners.done) cb(summary);
  }

  private handleError(err: Error): void {
    if (this.status !== "running") return;
    this.status = "error";
    for (const w of this.workers) w.terminate();
    this.workers.length = 0;
    for (const cb of this.listeners.error) cb(err);
  }
}

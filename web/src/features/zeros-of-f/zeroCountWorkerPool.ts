import type { FVariant } from "@/shared/math/zerosOfF";
import type { JobMessage, ResultMessage } from "@/features/zeros-of-f/zeroCountWorker";

interface PendingJob {
  resolve: (r: ResultMessage) => void;
}

interface BoxParams {
  sigmaMin: number;
  sigmaMax: number;
  tMin: number;
  tMax: number;
  variant: FVariant;
}

/**
 * Round-robin Web Worker pool for parallel zero-count box computations.
 * Each worker computes one box at a time; the pool queues additional jobs
 * and dispatches as workers become idle.
 *
 * The work is embarrassingly parallel — boxes are fully independent. With
 * N cores the wall-clock time is roughly `(total_serial_time + max_box_time)
 * / N + overhead`. The max-box-time term matters because long-tail boxes
 * (high T) keep their worker busy while the others finish quickly.
 */
export class ZeroCountWorkerPool {
  private readonly workers: Worker[] = [];
  private readonly idle: Worker[] = [];
  private readonly pending: Map<number, PendingJob> = new Map();
  private readonly queue: { job: JobMessage; resolve: (r: ResultMessage) => void }[] = [];
  private nextJobId = 1;
  private disposed = false;

  public constructor(size: number) {
    const n = Math.max(1, Math.min(32, Math.floor(size)));
    for (let i = 0; i < n; i++) {
      const w = new Worker(new URL("./zeroCountWorker.ts", import.meta.url), { type: "module" });
      w.onmessage = (e: MessageEvent<ResultMessage>) => this.handleResult(w, e.data);
      this.workers.push(w);
      this.idle.push(w);
    }
  }

  public get size(): number { return this.workers.length; }

  public submit(box: BoxParams): Promise<ResultMessage> {
    return new Promise((resolve) => {
      if (this.disposed) {
        resolve({ jobId: -1, count: NaN, rawWinding: NaN, samplesUsed: 0, ok: false });
        return;
      }
      const job: JobMessage = {
        jobId: this.nextJobId++,
        sigmaMin: box.sigmaMin,
        sigmaMax: box.sigmaMax,
        tMin: box.tMin,
        tMax: box.tMax,
        variant: box.variant,
      };
      const w = this.idle.pop();
      if (w !== undefined) {
        this.dispatch(w, job, resolve);
      } else {
        this.queue.push({ job, resolve });
      }
    });
  }

  private dispatch(w: Worker, job: JobMessage, resolve: (r: ResultMessage) => void): void {
    this.pending.set(job.jobId, { resolve });
    w.postMessage(job);
  }

  private handleResult(w: Worker, msg: ResultMessage): void {
    const p = this.pending.get(msg.jobId);
    if (p !== undefined) {
      this.pending.delete(msg.jobId);
      p.resolve(msg);
    }
    if (this.disposed) {
      w.terminate();
      return;
    }
    const next = this.queue.shift();
    if (next !== undefined) {
      this.dispatch(w, next.job, next.resolve);
    } else {
      this.idle.push(w);
    }
  }

  public dispose(): void {
    this.disposed = true;
    for (const w of this.workers) w.terminate();
    this.workers.length = 0;
    this.idle.length = 0;
    // Resolve queued jobs as cancelled so awaiters can unblock.
    for (const q of this.queue) {
      q.resolve({ jobId: -1, count: NaN, rawWinding: NaN, samplesUsed: 0, ok: false });
    }
    this.queue.length = 0;
    for (const p of this.pending.values()) {
      p.resolve({ jobId: -1, count: NaN, rawWinding: NaN, samplesUsed: 0, ok: false });
    }
    this.pending.clear();
  }
}

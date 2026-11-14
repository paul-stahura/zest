import { scanLine, type ScanLineInput } from "@/shared/scan/scanLineAlgorithm";
import {
  scanLineMinima,
  type ScanLineMinimaInput,
} from "@/shared/scan/scanLineMinimaAlgorithm";
import type { ScanAlgorithm } from "@/shared/scan/scanBackend";

/** Message envelope for worker tasks. Kept as `unknown`-typed at the boundary. */
export interface WorkerTask {
  taskId: number;
  algorithm: ScanAlgorithm;
  /** Used when `algorithm === "sign-change"`. */
  signChangeInput?: ScanLineInput;
  /** Used when `algorithm === "minima"`. */
  minimaInput?: ScanLineMinimaInput;
}

export interface WorkerResultLine {
  type: "line";
  taskId: number;
  /** Wall-clock ms the worker spent computing this σ-row (compute only;
   * excludes message round-trip). Used by the model for per-row timing logs. */
  durationMs: number;
  output: {
    sigma: number;
    t: ArrayBufferLike;
    yVal: ArrayBufferLike;
    sigma1Mag: ArrayBufferLike;
    r1Mag: ArrayBufferLike;
    phaseDev: ArrayBufferLike;
    /** Signed `arg(R)/π` per point. Local-only field. */
    phaseR: ArrayBufferLike;
    /** Present only when the task ran the `minima` algorithm. */
    depth?: ArrayBufferLike;
    pointsEvaluated: number;
  };
}

export interface WorkerResultError {
  type: "error";
  taskId: number;
  message: string;
}

function selfWorker(): Worker {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- this module is loaded as a Worker; self is the worker scope which has Worker's postMessage signature.
  return self as unknown as Worker;
}

function asWorkerTask(data: unknown): WorkerTask {
  if (typeof data !== "object" || data === null) {
    throw new Error("worker received non-object message");
  }
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- single trusted boundary; main thread is the sole sender.
  return data as WorkerTask;
}

self.addEventListener("message", (event: MessageEvent) => {
  const task = asWorkerTask(event.data);
  const t0 = performance.now();
  try {
    if (task.algorithm === "minima") {
      const input = task.minimaInput;
      if (input === undefined) throw new Error("minima task missing minimaInput");
      const out = scanLineMinima(input);
      const result: WorkerResultLine = {
        type: "line",
        taskId: task.taskId,
        durationMs: performance.now() - t0,
        output: {
          sigma: out.sigma,
          t: out.t.buffer,
          yVal: out.yVal.buffer,
          sigma1Mag: out.sigma1Mag.buffer,
          r1Mag: out.r1Mag.buffer,
          phaseDev: out.phaseDev.buffer,
          phaseR: out.phaseR.buffer,
          depth: out.depth.buffer,
          pointsEvaluated: out.pointsEvaluated,
        },
      };
      selfWorker().postMessage(result, [
        out.t.buffer,
        out.yVal.buffer,
        out.sigma1Mag.buffer,
        out.r1Mag.buffer,
        out.phaseDev.buffer,
        out.phaseR.buffer,
        out.depth.buffer,
      ]);
      return;
    }

    const input = task.signChangeInput;
    if (input === undefined) throw new Error("sign-change task missing signChangeInput");
    const out = scanLine(input);
    const transfer: ArrayBufferLike[] = [
      out.t.buffer,
      out.yVal.buffer,
      out.sigma1Mag.buffer,
      out.r1Mag.buffer,
      out.phaseDev.buffer,
      out.phaseR.buffer,
    ];
    const result: WorkerResultLine = {
      type: "line",
      taskId: task.taskId,
      durationMs: performance.now() - t0,
      output: {
        sigma: out.sigma,
        t: out.t.buffer,
        yVal: out.yVal.buffer,
        sigma1Mag: out.sigma1Mag.buffer,
        r1Mag: out.r1Mag.buffer,
        phaseDev: out.phaseDev.buffer,
        phaseR: out.phaseR.buffer,
        ...(out.depth !== undefined ? { depth: out.depth.buffer } : {}),
        pointsEvaluated: out.pointsEvaluated,
      },
    };
    if (out.depth !== undefined) transfer.push(out.depth.buffer);
    selfWorker().postMessage(result, transfer);
  } catch (err) {
    const errMsg: WorkerResultError = {
      type: "error",
      taskId: task.taskId,
      message: err instanceof Error ? err.message : String(err),
    };
    selfWorker().postMessage(errMsg);
  }
});

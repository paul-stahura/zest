/**
 * Web Worker entrypoint for argument-principle zero counting. Each worker
 * handles one box at a time; the model parallelizes by maintaining a pool of
 * workers (size = navigator.hardwareConcurrency, clamped) and dispatching
 * boxes round-robin.
 *
 * Wire protocol:
 *   in : { jobId, sigmaMin, sigmaMax, tMin, tMax, variant }
 *   out: { jobId, count, rawWinding, samplesUsed, ok }
 *
 * The math/dependency graph (fScaledComponentsBatch, countZerosInBox) gets
 * tree-shaken+bundled by Vite per-worker, so workers are self-contained.
 */
import { countZerosInBox } from "@/features/zeros-of-f/zeroCountAlgorithm";
import type { FVariant } from "@/shared/math/zerosOfF";

interface JobMessage {
  jobId: number;
  sigmaMin: number;
  sigmaMax: number;
  tMin: number;
  tMax: number;
  variant: FVariant;
}

interface ResultMessage {
  jobId: number;
  count: number;
  rawWinding: number;
  samplesUsed: number;
  ok: boolean;
}

self.onmessage = (e: MessageEvent<JobMessage>) => {
  const { jobId, sigmaMin, sigmaMax, tMin, tMax, variant } = e.data;
  const r = countZerosInBox(sigmaMin, sigmaMax, tMin, tMax, variant);
  const out: ResultMessage = {
    jobId,
    count: r.count,
    rawWinding: r.rawWinding,
    samplesUsed: r.samplesUsed,
    ok: r.ok,
  };
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  (self as unknown as { postMessage: (m: ResultMessage) => void }).postMessage(out);
};

export type { JobMessage, ResultMessage };

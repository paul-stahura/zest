/** Joint-angle cluster job types. */

export type JointAnglesMode = "near_zero" | "caustic_map" | "streaming_sweep" | "full_vector";

export interface JointAngleHit {
  T: number;
  n: number;
  rho: number;
  f: number;
  p?: number;
  q?: number;
}

export interface JointAnglesJobRequest {
  tMin: number;
  tMax: number;
  tStep: number;
  mode: JointAnglesMode;
  nearZeroBand: number;
  fareyMaxDenom?: number;
  batchT?: number;
  shardCount?: number;
  usePolyImag?: boolean;
}

export interface JointAnglesJobCreateResponse {
  jobId: string;
  shardCount: number;
  status: string;
}

export interface JointAnglesJobStatusResponse {
  jobId: string;
  status: string;
  request: JointAnglesJobRequest;
  shards: Array<{
    shardId: string;
    tLo: number;
    tHi: number;
    status: string;
    k8sJobName?: string | null;
  }>;
  summary?: {
    jointsEvaluated?: number;
    hitsFound?: number;
    durationMs?: number;
  } | null;
  error?: string | null;
  createdAt: string;
}

export interface JointAnglesProgressEvent {
  type: "progress";
  progress: {
    jointsEvaluated: number;
    hitsFound: number;
    fraction: number;
  };
}

export interface JointAnglesChunkEvent {
  type: "chunk";
  shardId?: string;
  chunkName?: string;
  body?: string;
  hitCount?: number;
}

export interface JointAnglesDoneEvent {
  type: "done";
  summary?: {
    jointsEvaluated: number;
    hitsFound: number;
    durationMs: number;
  };
}

export interface JointAnglesCancelledEvent {
  type: "cancelled";
  summary?: Record<string, unknown>;
  reason?: string;
}

export interface JointAnglesErrorEvent {
  type: "error";
  message?: string;
}

export type JointAnglesSseEvent =
  | JointAnglesProgressEvent
  | JointAnglesChunkEvent
  | JointAnglesDoneEvent
  | JointAnglesCancelledEvent
  | JointAnglesErrorEvent
  | { type: string; [key: string]: unknown };

export function validateJobRequest(req: unknown): req is JointAnglesJobRequest {
  if (typeof req !== "object" || req === null) return false;
  const o = req as Record<string, unknown>;
  if (typeof o.tMin !== "number" || typeof o.tMax !== "number" || typeof o.tStep !== "number") return false;
  if (o.tMax <= o.tMin || o.tStep <= 0) return false;
  const mode = o.mode;
  if (mode !== "near_zero" && mode !== "caustic_map" && mode !== "streaming_sweep" && mode !== "full_vector") {
    return false;
  }
  return true;
}

export function estimateJointEvals(req: JointAnglesJobRequest): number {
  const tCount = Math.max(1, Math.floor((req.tMax - req.tMin) / req.tStep) + 1);
  const nMax = Math.max(2, Math.floor(req.tMax));
  return tCount * nMax;
}

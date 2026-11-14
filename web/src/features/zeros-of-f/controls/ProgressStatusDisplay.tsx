import type { ScanActivity } from "@/shared/scan/scanBackend";

export interface ProgressStatusDisplayProps {
  activity: ScanActivity | null;
  cloudSelected: boolean;
  /** On-prem cluster GPU scans: one chunk per σ-row (not hosted T-chunk fanout). */
  clusterScan?: boolean;
  /** Cluster scan with T chunking: progress counts σ-row × T-window work units. */
  clusterTChunking?: boolean;
  err: string | null;
  paused: boolean;
  progress: { linesDone: number; linesTotal: number; pointsRecorded: number };
  progressRowsPerMinute: number | null;
  running: boolean;
  /** True when streaming a completed hosted scan's result-pages, not running a fresh scan. */
  loading?: boolean;
  scanStartedAt: number | null;
}

type ProgressDisplayText = {
  main: string;
  meta: string;
};

type ProgressLightKind = ScanActivity["kind"] | "idle";

/**
 * Builds the compact progress copy used by the scan toolbox status strip.
 */
export function buildProgressDisplayText(args: ProgressStatusDisplayProps): ProgressDisplayText {
  const { activity, cloudSelected, clusterScan = false, clusterTChunking = false, err, paused, progress: p, progressRowsPerMinute, running, loading, scanStartedAt } = args;
  if (err !== null) {
    const activityMessage = activity?.kind === "shutdown" || activity?.kind === "verified"
      ? ` - ${activity.message}`
      : "";
    return { main: "Scan failed", meta: `${err}${activityMessage}` };
  }
  if (p.linesTotal === 0 && !running && !paused) {
    return { main: "No scan", meta: "idle" };
  }

  const pct = p.linesTotal === 0 ? 0 : Math.floor((100 * p.linesDone) / p.linesTotal);
  // Loading a finished scan reports rows, not chunks — distinguish so the
  // unit label and meta text don't claim a scan is in progress.
  const unitLabel = loading === true
    ? "rows"
    : clusterScan && clusterTChunking
      ? "work units"
      : clusterScan
        ? "sigma rows"
        : cloudSelected
          ? "chunks"
          : "sigma rows";
  const rateLabel = clusterScan && clusterTChunking
    ? "work units/min"
    : clusterScan
      ? "sigma rows/min"
      : cloudSelected
        ? "chunks/min"
        : "sigma/min";
  const pointsLabel = loading === true
    ? null
    : p.pointsRecorded === 0 ? "no points" : `${String(p.pointsRecorded)} pts`;
  const main = `${String(p.linesDone)}/${String(p.linesTotal)} ${unitLabel} - ${String(pct)}%`;
  if (!running && !paused && (activity?.kind === "shutdown" || activity?.kind === "verified")) {
    return { main, meta: `${pointsLabel ?? ""} - ${activity.message}` };
  }
  const status = paused ? "paused" : loading === true ? "loading" : running ? "scanning" : "complete";

  if (scanStartedAt !== null && running && p.linesDone === 0 && activity !== null && activity.message.toLowerCase().includes("queued")) {
    const elapsedSeconds = Math.max(0, Math.floor((performance.now() - scanStartedAt) / 1000));
    const elapsedLabel = elapsedSeconds >= 60
      ? `${String(Math.floor(elapsedSeconds / 60))}m ${String(elapsedSeconds % 60).padStart(2, "0")}s`
      : `${String(elapsedSeconds)}s`;
    return { main: "Waiting for GPUs", meta: `${activity.message} - ${elapsedLabel}` };
  }

  if (scanStartedAt !== null && running && p.linesDone === 0) {
    const elapsedSeconds = Math.max(0, Math.floor((performance.now() - scanStartedAt) / 1000));
    const elapsedLabel = elapsedSeconds >= 60
      ? `${String(Math.floor(elapsedSeconds / 60))}m ${String(elapsedSeconds % 60).padStart(2, "0")}s`
      : `${String(elapsedSeconds)}s`;
    const startingPrefix = pointsLabel !== null ? `${pointsLabel} - ` : "";
    return { main, meta: `${startingPrefix}starting - ${elapsedLabel}` };
  }

  if (scanStartedAt !== null && p.linesDone > 0) {
    const elapsedMin = (performance.now() - scanStartedAt) / 60_000;
    if (elapsedMin > 0 || progressRowsPerMinute !== null) {
      const ratePerMin = progressRowsPerMinute ?? p.linesDone / elapsedMin;
      const remaining = Math.max(0, p.linesTotal - p.linesDone);
      const etaMin = ratePerMin > 0 ? remaining / ratePerMin : Infinity;
      const etaStr = !Number.isFinite(etaMin)
        ? "--"
        : etaMin >= 60
          ? `${(etaMin / 60).toFixed(1)}h`
          : `${etaMin.toFixed(0)}m`;
      const ratePrefix = pointsLabel !== null ? `${pointsLabel} - ` : "";
      return { main, meta: `${ratePrefix}${ratePerMin.toFixed(1)} ${rateLabel} - ETA ${etaStr} - ${status}` };
    }
  }

  return { main, meta: pointsLabel !== null ? `${pointsLabel} - ${status}` : status };
}

function lightKind(args: ProgressStatusDisplayProps): ProgressLightKind {
  if (args.activity?.kind === "shutdown" || args.activity?.kind === "verified") return args.activity.kind;
  if (args.err !== null) return "disconnected";
  if (args.activity !== null) return args.activity.kind;
  if (args.running || args.paused) return "health";
  return "idle";
}

function lightTitle(kind: ProgressLightKind, activity: ScanActivity | null, err: string | null): string {
  if (err !== null) return `Disconnected: ${err}`;
  if (activity !== null) return activity.message;
  if (kind === "idle") return "Idle";
  if (kind === "retry") return "Reconnecting";
  if (kind === "shutdown") return "Shutting down workers";
  if (kind === "verified") return "Shutdown verified";
  if (kind === "data") return "Result data received";
  if (kind === "disconnected") return "Disconnected";
  return "Health check";
}

export function ProgressStatusDisplay(props: ProgressStatusDisplayProps) {
  const text = buildProgressDisplayText(props);
  const kind = lightKind(props);
  const title = lightTitle(kind, props.activity, props.err);
  const pulseKey = props.activity === null ? kind : `${props.activity.kind}-${String(props.activity.at)}`;
  return (
    <div className="zof-progress-status" title={title}>
      <span
        key={pulseKey}
        aria-label={title}
        className={`zof-progress-light zof-progress-light--${kind}${props.running ? " is-running" : ""}`}
      />
      <span className="zof-progress-copy">
        <span className="zof-progress-main">{text.main}</span>
        <span className="zof-progress-meta">{text.meta}</span>
      </span>
    </div>
  );
}

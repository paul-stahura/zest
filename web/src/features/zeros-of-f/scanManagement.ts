import { quarterSpectrumRgb } from "@/features/zeros-of-f/fracToHue";
import type { DisplayControlsState } from "@/features/zeros-of-f/types";
import type { ArchivedLine, ArchiveListing, ArchiveThumbnail } from "@/shared/persistence/scanArchive";
import type { ScanRequest, ScanSummary } from "@/shared/scan/scanBackend";

export type ManagedScanSource = "local" | "remote" | "combined";

export interface ManagedScanRecord {
  approxBytes: number;
  componentScanIds: string[];
  createdAt: number;
  displayName: string;
  hiddenAt?: number;
  isBackground: boolean;
  isLoaded: boolean;
  isRemoteOnly: boolean;
  label?: string;
  localScanId?: string;
  remoteScanId?: string;
  request: ScanRequest;
  scanId: string;
  source: ManagedScanSource;
  status: string;
  summary: ScanSummary;
  thumbnail?: ArchiveThumbnail;
  thumbnailFingerprint: string;
}

export interface CombineCompatibilityResult {
  compatible: boolean;
  reason: string | null;
}

function fallbackName(entry: Pick<ArchiveListing, "label" | "scanId" | "request">): string {
  if (entry.label !== undefined && entry.label.trim() !== "") return entry.label.replace(/\.csv$/i, "");
  const r = entry.request;
  return `${r.variant} sigma[${String(r.sigmaRange.min)},${String(r.sigmaRange.max)}] T[${r.tRange.min.toFixed(0)},${r.tRange.max.toFixed(0)}]`;
}

function rootId(entry: ArchiveListing): string {
  return entry.rootScanId ?? entry.parentScanId ?? entry.scanId;
}

function mergeSummary(entries: readonly ArchiveListing[]): ScanSummary {
  return entries.reduce<ScanSummary>(
    (summary, entry) => ({
      durationMs: summary.durationMs + entry.summary.durationMs,
      linesScanned: summary.linesScanned + entry.summary.linesScanned,
      pointsRecorded: summary.pointsRecorded + entry.summary.pointsRecorded,
    }),
    { durationMs: 0, linesScanned: 0, pointsRecorded: 0 },
  );
}

/** Bumped whenever {@link renderScanThumbnail} changes its rendering in a way
 *  that should invalidate every cached thumbnail. Increment for any visual
 *  change to the thumbnail (axes, layout, color treatment, etc.). */
const THUMBNAIL_RENDERER_VERSION = "v3-axes-refbox";

function listingFingerprint(entry: Pick<ArchiveListing, "scanId" | "summary" | "thumbnailFingerprint">, display: DisplayControlsState): string {
  return [
    THUMBNAIL_RENDERER_VERSION,
    entry.scanId,
    entry.summary.pointsRecorded,
    entry.summary.linesScanned,
    display.colorMode,
    display.yAxisMode,
    display.magThresh,
    display.depthLogScale,
    entry.thumbnailFingerprint ?? "",
  ].join("|");
}

/**
 * Combine local and hosted scan sources into the row model used by the scan manager.
 */
export function buildManagedScanRecords(input: {
  backgroundIds: ReadonlySet<string>;
  display: DisplayControlsState;
  loadedIds: ReadonlySet<string>;
  localEntries: readonly ArchiveListing[];
}): ManagedScanRecord[] {
  const localGroups = new Map<string, ArchiveListing[]>();
  const hiddenRemoteIds = new Set<string>();
  for (const entry of input.localEntries) {
    if (entry.hiddenAt !== undefined) {
      hiddenRemoteIds.add(entry.scanId);
      if (entry.remoteScanId !== undefined) hiddenRemoteIds.add(entry.remoteScanId);
      for (const componentId of entry.componentScanIds ?? []) hiddenRemoteIds.add(componentId);
      continue;
    }
    const groupId = entry.componentScanIds !== undefined ? entry.scanId : rootId(entry);
    const group = localGroups.get(groupId);
    if (group === undefined) localGroups.set(groupId, [entry]);
    else group.push(entry);
  }

  const records: ManagedScanRecord[] = [];
  const coveredHostedIds = new Set<string>();
  for (const entries of localGroups.values()) {
    entries.sort((a, b) => a.createdAt - b.createdAt);
    const primary = entries[0]!;
    const scanId = primary.componentScanIds !== undefined ? primary.scanId : rootId(primary);
    const components = primary.componentScanIds ?? entries.map((entry) => entry.scanId);
    for (const componentId of components) coveredHostedIds.add(componentId);
    const summary = primary.componentScanIds !== undefined ? primary.summary : mergeSummary(entries);
    records.push({
      approxBytes: primary.componentScanIds !== undefined ? primary.approxBytes : entries.reduce((total, entry) => total + entry.approxBytes, 0),
      componentScanIds: components,
      createdAt: Math.max(...entries.map((entry) => entry.createdAt)),
      displayName: primary.displayName ?? fallbackName(primary),
      hiddenAt: primary.hiddenAt,
      isBackground: components.some((id) => input.backgroundIds.has(id)),
      isLoaded: components.some((id) => input.loadedIds.has(id)),
      isRemoteOnly: false,
      label: primary.label,
      localScanId: primary.scanId,
      remoteScanId: primary.remoteScanId,
      request: primary.request,
      scanId,
      source: primary.componentScanIds !== undefined ? "combined" : "local",
      status: "Local",
      summary,
      thumbnail: primary.thumbnail,
      thumbnailFingerprint: listingFingerprint(primary, input.display),
    });
  }

  records.sort((a, b) => b.createdAt - a.createdAt);
  return records;
}

function rangesTouchOrOverlap(a: { min: number; max: number }, b: { min: number; max: number }, tolerance: number): boolean {
  return a.min <= b.max + tolerance && b.min <= a.max + tolerance;
}

function sigmaStep(request: ScanRequest): number {
  return 1 / request.sigmaRange.linesPerSigma;
}

function samePointShape(a: ManagedScanRecord, b: ManagedScanRecord): boolean {
  return (a.request.algorithm === "minima") === (b.request.algorithm === "minima");
}

/**
 * Check whether rows can be represented by one metadata-only combined scan.
 */
export function compatibleForCombine(records: readonly ManagedScanRecord[]): CombineCompatibilityResult {
  if (records.length < 2) return { compatible: false, reason: "Select at least two scans" };
  if (records.some((record) => record.isRemoteOnly)) return { compatible: false, reason: "Download remote scans before combining" };
  const first = records[0]!;
  for (const record of records.slice(1)) {
    if (record.request.variant !== first.request.variant) return { compatible: false, reason: "Variants differ" };
    if (record.request.algorithm !== first.request.algorithm) return { compatible: false, reason: "Algorithms differ" };
    if (record.request.samplesPerT !== first.request.samplesPerT) return { compatible: false, reason: "Samples per T differ" };
    if (record.request.bisectionIters !== first.request.bisectionIters) return { compatible: false, reason: "Refinement settings differ" };
    if (record.request.acceptDepth !== first.request.acceptDepth) return { compatible: false, reason: "Accept-depth settings differ" };
    if (record.request.seed !== first.request.seed) return { compatible: false, reason: "Seeds differ" };
    if (!samePointShape(first, record)) return { compatible: false, reason: "Point fields differ" };
    const stepTolerance = Math.max(sigmaStep(first.request), sigmaStep(record.request)) + 1e-9;
    if (Math.abs(sigmaStep(first.request) - sigmaStep(record.request)) > 1e-9) return { compatible: false, reason: "Sigma spacing differs" };
    if (!rangesTouchOrOverlap(first.request.sigmaRange, record.request.sigmaRange, stepTolerance)) return { compatible: false, reason: "Sigma ranges do not touch" };
    if (!rangesTouchOrOverlap(first.request.tRange, record.request.tRange, 1)) return { compatible: false, reason: "T ranges do not touch" };
  }
  return { compatible: true, reason: null };
}

function normalizeDepth(value: number, min: number, max: number, gamma: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0.65;
  const log = Math.log10(Math.max(value, 1e-15));
  const range = max - min;
  if (!Number.isFinite(range) || range <= 0) return 0.8;
  const goodness = Math.max(0, Math.min(1, (max - log) / range));
  return Math.pow(goodness, Math.max(0.1, gamma));
}

function pointColor(line: ArchivedLine, index: number, display: DisplayControlsState, depthMin: number, depthMax: number): string {
  const t = line.t[index] ?? 0;
  const yVal = line.yVal[index] ?? Infinity;
  const frac = t - Math.floor(t);
  const depth = line.depth?.[index];
  const depthGoodness = depth === undefined ? 1 : normalizeDepth(depth, depthMin, depthMax, display.depthLogScale);
  if (display.colorMode === "grayscale") {
    const v = yVal < display.magThresh ? 210 : 85;
    return `rgb(${String(v)},${String(v)},${String(v)})`;
  }
  if (display.colorMode === "depth") {
    const v = Math.round(35 + depthGoodness * 220);
    return `rgb(${String(v)},${String(v)},${String(v)})`;
  }
  const [r, g, b] = quarterSpectrumRgb(frac, display.spectrumFeather);
  const v = display.colorMode === "spectrum-depth" ? Math.max(0.25, depthGoodness) : 1;
  return `rgb(${String(Math.round(r * v * 255))},${String(Math.round(g * v * 255))},${String(Math.round(b * v * 255))})`;
}

/** Pick ~`target` evenly-spaced "nice" tick values inside `[min, max]`. The
 *  step is rounded to one of {1, 2, 5} × 10^k so labels read as round numbers
 *  instead of arbitrary fractions. Always returns at least the endpoints. */
function niceTicks(min: number, max: number, target: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min];
  const range = max - min;
  const rough = range / Math.max(1, target - 1);
  const pow10 = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / pow10;
  const niceNorm = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  const step = niceNorm * pow10;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 1e-9; v += step) {
    ticks.push(v);
  }
  if (ticks.length === 0) ticks.push((min + max) / 2);
  return ticks;
}

/** Format a tick value compactly. Integers stay integer; fractions get just
 *  enough decimals to distinguish them from neighbors. */
function formatTick(value: number, step: number): string {
  if (Math.abs(value) < 1e-9 && step >= 1) return "0";
  if (step >= 1) return String(Math.round(value));
  const decimals = Math.max(0, Math.min(4, Math.ceil(-Math.log10(step))));
  return value.toFixed(decimals);
}

/**
 * Render a compact canvas preview from archived scan lines using the same scan
 * axes and color controls as the main display, plus σ (x) and T (y) axis ticks
 * around the data area so the user can read the scan's location and extent
 * without consulting the meta panel.
 */
export function renderScanThumbnail(input: {
  display: DisplayControlsState;
  fingerprint: string;
  height: number;
  lines: readonly ArchivedLine[];
  width: number;
}): ArchiveThumbnail | null {
  if (typeof document === "undefined" || input.lines.length === 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = input.width;
  canvas.height = input.height;
  const ctx = canvas.getContext("2d");
  if (ctx === null) return null;
  ctx.fillStyle = "#070910";
  ctx.fillRect(0, 0, input.width, input.height);

  let sigmaMin = Infinity;
  let sigmaMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  let depthMin = Infinity;
  let depthMax = -Infinity;
  for (const line of input.lines) {
    sigmaMin = Math.min(sigmaMin, line.sigma);
    sigmaMax = Math.max(sigmaMax, line.sigma);
    for (let i = 0; i < line.t.length; i++) {
      const t = line.t[i]!;
      const y = input.display.yAxisMode === "fracT" ? t - Math.floor(t) : t;
      yMin = Math.min(yMin, y);
      yMax = Math.max(yMax, y);
      const depth = line.depth?.[i];
      if (depth !== undefined && Number.isFinite(depth) && depth > 0) {
        const log = Math.log10(Math.max(depth, 1e-15));
        depthMin = Math.min(depthMin, log);
        depthMax = Math.max(depthMax, log);
      }
    }
  }
  if (!Number.isFinite(sigmaMin) || !Number.isFinite(yMin)) return null;
  const sigmaRange = Math.max(1e-9, sigmaMax - sigmaMin);
  const yRange = Math.max(1e-9, yMax - yMin);

  // Axis margins. Left: room for σ tick labels. Bottom: room for T tick labels
  // + axis title. Top/right: small breathing room. Sized so 4-char numbers
  // fit comfortably in the 10px axis font.
  const padLeft = 38;
  const padBottom = 22;
  const padTop = 8;
  const padRight = 10;
  const plotWidth = Math.max(1, input.width - padLeft - padRight);
  const plotHeight = Math.max(1, input.height - padTop - padBottom);
  const plotRight = padLeft + plotWidth;
  const plotBottom = padTop + plotHeight;

  const sigmaToPx = (sigma: number): number => padLeft + ((sigma - sigmaMin) / sigmaRange) * plotWidth;
  const yToPx = (y: number): number => plotBottom - ((y - yMin) / yRange) * plotHeight;

  // Plot area background — slightly lighter than the surrounding margin so
  // the data region is visually distinguished from axis labels.
  ctx.fillStyle = "#0c0f17";
  ctx.fillRect(padLeft, padTop, plotWidth, plotHeight);

  const maxPoints = 18_000;
  const pointCount = input.lines.reduce((total, line) => total + line.t.length, 0);
  const stride = Math.max(1, Math.ceil(pointCount / maxPoints));
  let seen = 0;
  ctx.globalAlpha = 0.88;
  for (const line of input.lines) {
    for (let i = 0; i < line.t.length; i++) {
      seen += 1;
      if (seen % stride !== 0) continue;
      const t = line.t[i]!;
      const y = input.display.yAxisMode === "fracT" ? t - Math.floor(t) : t;
      const xPx = sigmaToPx(line.sigma);
      const yPx = yToPx(y);
      ctx.fillStyle = pointColor(line, i, input.display, depthMin, depthMax);
      ctx.fillRect(xPx, yPx, 1.6, 1.6);
    }
  }

  // ── Axes ─────────────────────────────────────────────────────────────
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#5a6580";
  ctx.fillStyle = "#9aa4be";
  ctx.lineWidth = 1;
  ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";

  // Axis lines along left and bottom edges of the plot area.
  ctx.beginPath();
  ctx.moveTo(padLeft + 0.5, padTop);
  ctx.lineTo(padLeft + 0.5, plotBottom + 0.5);
  ctx.lineTo(plotRight, plotBottom + 0.5);
  ctx.stroke();

  // σ-axis (bottom) ticks. Target ~5 ticks for medium widths, 3 for small.
  const sigmaTickCount = input.width >= 360 ? 5 : 3;
  const sigmaTicks = niceTicks(sigmaMin, sigmaMax, sigmaTickCount);
  const sigmaStep = sigmaTicks.length > 1 ? sigmaTicks[1]! - sigmaTicks[0]! : sigmaRange;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const tick of sigmaTicks) {
    if (tick < sigmaMin - 1e-9 || tick > sigmaMax + 1e-9) continue;
    const x = sigmaToPx(tick);
    ctx.beginPath();
    ctx.moveTo(x + 0.5, plotBottom);
    ctx.lineTo(x + 0.5, plotBottom + 4);
    ctx.stroke();
    ctx.fillText(formatTick(tick, sigmaStep), x, plotBottom + 6);
  }

  // T-axis (left) ticks.
  const yTickCount = input.height >= 280 ? 5 : 3;
  const yTicks = niceTicks(yMin, yMax, yTickCount);
  const yStep = yTicks.length > 1 ? yTicks[1]! - yTicks[0]! : yRange;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const tick of yTicks) {
    if (tick < yMin - 1e-9 || tick > yMax + 1e-9) continue;
    const y = yToPx(tick);
    ctx.beginPath();
    ctx.moveTo(padLeft - 4, y + 0.5);
    ctx.lineTo(padLeft, y + 0.5);
    ctx.stroke();
    ctx.fillText(formatTick(tick, yStep), padLeft - 6, y);
  }

  // ── Reference box ───────────────────────────────────────────────────
  // Fixed-size white outline at σ ∈ [-50, 0], T ∈ [0, 500] so the user
  // can compare any scan's footprint to a known scale at a glance. Clipped
  // to the data extent so a scan that doesn't cover this region still gets
  // whatever portion intersects (or nothing if disjoint). Skipped in
  // fracT mode since the "0 to 500 T" reference doesn't apply when y is
  // a fractional value.
  if (input.display.yAxisMode === "T") {
    const refSigmaMin = -50;
    const refSigmaMax = 0;
    const refTMin = 0;
    const refTMax = 500;
    const clipSigmaMin = Math.max(refSigmaMin, sigmaMin);
    const clipSigmaMax = Math.min(refSigmaMax, sigmaMax);
    const clipTMin = Math.max(refTMin, yMin);
    const clipTMax = Math.min(refTMax, yMax);
    if (clipSigmaMin < clipSigmaMax && clipTMin < clipTMax) {
      const xL = sigmaToPx(clipSigmaMin);
      const xR = sigmaToPx(clipSigmaMax);
      const yT = yToPx(clipTMax);
      const yB = yToPx(clipTMin);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      // Only draw edges that survived the clip — i.e. an edge is omitted
      // when the reference box extends past the data on that side, so the
      // outline reads as "this is where the box meets the data" rather
      // than "the data is the box".
      if (clipSigmaMin === refSigmaMin) {
        ctx.moveTo(xL + 0.5, yT + 0.5);
        ctx.lineTo(xL + 0.5, yB + 0.5);
      }
      if (clipSigmaMax === refSigmaMax) {
        ctx.moveTo(xR + 0.5, yT + 0.5);
        ctx.lineTo(xR + 0.5, yB + 0.5);
      }
      if (clipTMin === refTMin) {
        ctx.moveTo(xL + 0.5, yB + 0.5);
        ctx.lineTo(xR + 0.5, yB + 0.5);
      }
      if (clipTMax === refTMax) {
        ctx.moveTo(xL + 0.5, yT + 0.5);
        ctx.lineTo(xR + 0.5, yT + 0.5);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // Axis titles. Tiny — placed in the corners so they don't crowd the plot.
  ctx.fillStyle = "#7d8aa6";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(input.display.yAxisMode === "fracT" ? "frac(T)" : "T", 4, padTop - 2);
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("σ", input.width - 4, input.height - 2);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    fingerprint: input.fingerprint,
    generatedAt: Date.now(),
    height: input.height,
    width: input.width,
  };
}

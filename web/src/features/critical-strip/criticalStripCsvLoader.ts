import type { CriticalPoint, CriticalPointSet } from "@/features/critical-strip/criticalStripTypes";

const SKIP_CRITICAL_LINE_TOLERANCE = 0.001;

type RawMeta = {
  name: string;
  color: string;
  pointSize: number;
  skipCriticalLine: boolean;
  samplingInterval: number;
  connectLines: boolean;
  hLine: boolean;
};

function parseMeta(lines: string[]): RawMeta {
  let name = "Unknown";
  let color = "#ffffff";
  let pointSize = 4;
  let skipCriticalLine = false;
  let samplingInterval = 1;
  let connectLines = false;
  let hLine = false;

  for (const line of lines) {
    if (!line.startsWith("#@")) continue;
    const body = line.slice(2).trim();
    const colonIdx = body.indexOf(":");
    if (colonIdx === -1) continue;
    const key = body.slice(0, colonIdx).trim().toLowerCase();
    const val = body.slice(colonIdx + 1).trim();
    if (key === "name") name = val;
    else if (key === "color") color = val;
    else if (key === "pointsize") pointSize = parseFloat(val) || 4;
    else if (key === "skipcriticalline") skipCriticalLine = val.toLowerCase() === "true";
    else if (key === "samplinginterval") samplingInterval = parseInt(val, 10) || 1;
    else if (key === "connectlines") connectLines = val.toLowerCase() === "true";
    else if (key === "hline") hLine = val.toLowerCase() === "true";
  }

  return { name, color, pointSize, skipCriticalLine, samplingInterval, connectLines, hLine };
}

/**
 * Parses a CriticalStrip CSV file with `#@` metadata headers into a CriticalPointSet.
 * Data rows are always `real,index` — both "real,index" and "real,imaginary" format labels
 * in the file header are purely documentary; Unity always stores the Y coordinate as an
 * index value regardless of which label is used.
 */
export function parseCriticalStripCsv(id: string, text: string): CriticalPointSet {
  const lines = text.split(/\r?\n/);
  const meta = parseMeta(lines);

  const points: CriticalPoint[] = [];
  let rowIndex = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (line.length === 0 || line.startsWith("#")) continue;

    const parts = line.split(",");
    if (parts.length < 2) continue;

    // eslint-disable-next-line no-restricted-syntax
    const real = Number(parts[0]);
    // eslint-disable-next-line no-restricted-syntax
    const index = Number(parts[1]);

    if (!Number.isFinite(real) || !Number.isFinite(index)) continue;

    rowIndex += 1;
    if ((rowIndex - 1) % meta.samplingInterval !== 0) continue;
    if (meta.skipCriticalLine && Math.abs(real - 0.5) < SKIP_CRITICAL_LINE_TOLERANCE) continue;

    points.push({ real, index });
  }

  return {
    id,
    name: meta.name,
    color: meta.color,
    pointSize: meta.pointSize,
    skipCriticalLine: meta.skipCriticalLine,
    samplingInterval: meta.samplingInterval,
    connectLines: meta.connectLines,
    hLine: meta.hLine,
    points,
  };
}

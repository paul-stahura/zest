import { IoError } from "@/shared/io/errors";
import type { ImportedZerosOfFScan } from "@/shared/io/types";

/** Encoded level integers for the optional `level` column. */
const LEVEL_CODE: Record<string, number> = {
  red: 1,
  black: 2,
  magnitude: 3,
  phase: 4,
};

const LEVEL_NAME = ["", "red", "black", "magnitude", "phase"];

/**
 * Parse a Python zeros-of-f scan CSV. Format:
 *   `# key=value  key=value  ...` zero or more comment lines.
 *   `sigma,T,y_val[,level]` exactly one column header line.
 *   Body rows of three or four columns.
 *
 * Returns an `ImportedZerosOfFScan` ready to feed into a workspace.
 *
 * Throws {@link IoError} for malformed input.
 */
export function parseZerosOfFCsv(
  correlationId: string,
  text: string,
  label: string,
): ImportedZerosOfFScan {
  const lines = text.split(/\r?\n/);
  const meta: Record<string, string> = {};
  const sigma: number[] = [];
  const t: number[] = [];
  const yVal: number[] = [];
  let level: number[] | null = null;
  let headerSeen = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === undefined) continue;
    const line = raw.trim();
    if (line.length === 0) continue;
    if (line.startsWith("#")) {
      const body = line.slice(1).trim();
      for (const pair of body.split(/\s+/)) {
        const eq = pair.indexOf("=");
        if (eq > 0) {
          const k = pair.slice(0, eq).trim();
          const v = pair.slice(eq + 1).trim();
          if (k.length > 0) meta[k] = v;
        }
      }
      continue;
    }
    if (!headerSeen) {
      const cols = line.split(",").map((s) => s.trim().toLowerCase());
      // Accept either the legacy `sigma,t,y_val[,level]` Python scanner format
      // OR the located-zeros format `sigma,t,abs_f[,T_band]` from the grid-
      // locator script — third column is the per-point |f| in both cases.
      const okPrefix = cols[0] === "sigma" && cols[1] === "t"
        && (cols[2] === "y_val" || cols[2] === "abs_f");
      if (!okPrefix) {
        throw new IoError(
          `zeros-of-f CSV header must start with 'sigma,T,y_val' or 'sigma,t,abs_f', got '${line}'`,
          correlationId,
        );
      }
      if (cols.length >= 4 && cols[3] === "level") {
        level = [];
      }
      headerSeen = true;
      continue;
    }
    const parts = line.split(",").map((s) => s.trim());
    if (parts.length < 3) {
      throw new IoError(`row ${String(i + 1)} has fewer than 3 columns`, correlationId);
    }
    const sNum = Number.parseFloat(parts[0]!);
    const tNum = Number.parseFloat(parts[1]!);
    const yNum = Number.parseFloat(parts[2]!);
    if (!Number.isFinite(sNum) || !Number.isFinite(tNum) || !Number.isFinite(yNum)) {
      throw new IoError(`row ${String(i + 1)} has non-numeric values`, correlationId);
    }
    sigma.push(sNum);
    t.push(tNum);
    yVal.push(yNum);
    if (level !== null) {
      const lvlStr = (parts[3] ?? "").toLowerCase();
      const code = LEVEL_CODE[lvlStr];
      level.push(code ?? 0);
    }
  }

  if (!headerSeen) {
    throw new IoError("zeros-of-f CSV had no header row", correlationId);
  }

  return { kind: "zerosOfFScan", label, meta, sigma, t, yVal, level };
}

/** Serialize a zeros-of-f scan to CSV text. Output columns:
 *   - `sigma, T, y_val, depth`  when `depth` is provided (minima-algorithm scans)
 *   - `sigma, T, y_val, level`  when only `level` is provided (legacy round-trip)
 *   - `sigma, T, y_val`         otherwise (sign-change scans)
 *
 * `depth` and `level` are mutually exclusive — depth wins if both somehow arrive. */
export function exportZerosOfFCsv(input: {
  meta: Record<string, string | number>;
  sigma: ReadonlyArray<number> | Float64Array;
  t: ReadonlyArray<number> | Float64Array;
  yVal: ReadonlyArray<number> | Float64Array;
  depth?: ReadonlyArray<number> | Float64Array | null;
  level?: ReadonlyArray<number> | Uint8Array | null;
}): string {
  const n = input.sigma.length;
  if (input.t.length !== n || input.yVal.length !== n) {
    throw new Error("exportZerosOfFCsv: sigma/t/yVal length mismatch");
  }
  const writeDepth = input.depth != null && input.depth.length === n;
  const writeLevel = !writeDepth && input.level != null && input.level.length === n;
  const lines: string[] = [];
  const headerEntries = Object.entries(input.meta).map(([k, v]) => `${k}=${String(v)}`);
  if (headerEntries.length > 0) {
    lines.push(`# ${headerEntries.join("  ")}`);
  }
  lines.push(writeDepth ? "sigma,T,y_val,depth" : writeLevel ? "sigma,T,y_val,level" : "sigma,T,y_val");
  for (let i = 0; i < n; i++) {
    const sigma = input.sigma[i]!;
    const t = input.t[i]!;
    const y = input.yVal[i]!;
    if (writeDepth) {
      const d = input.depth![i] ?? NaN;
      lines.push(`${String(sigma)},${String(t)},${String(y)},${Number.isFinite(d) ? d.toExponential(10) : "NaN"}`);
    } else if (writeLevel) {
      const code = input.level![i] ?? 0;
      lines.push(`${String(sigma)},${String(t)},${String(y)},${LEVEL_NAME[code] ?? ""}`);
    } else {
      lines.push(`${String(sigma)},${String(t)},${String(y)}`);
    }
  }
  return lines.join("\n") + "\n";
}

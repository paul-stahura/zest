import { IoError } from "@/shared/io/errors";
import type { ImportedPointSet, Point2 } from "@/shared/io/types";

function splitCsvLine(line: string): string[] {
  return line.split(",").map((part) => part.trim());
}

/**
 * Parses a minimal two-column CSV (`x,y`) into a point set suitable for visualization import.
 */
export function parsePointSetCsv(correlationId: string, text: string, label: string): ImportedPointSet {
  const lines = text.split(/\r?\n/);
  const points: Point2[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    if (raw === undefined) {
      continue;
    }
    const line = raw.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }

    const parts = splitCsvLine(line);
    if (parts.length < 2) {
      throw new IoError(`CSV row ${String(i + 1)} must contain at least two columns`, correlationId);
    }

    const xs = parts[0] ?? "";
    const ys = parts[1] ?? "";
    // eslint-disable-next-line no-restricted-syntax -- xs/ys are strings; validated via Number.isFinite below
    const x = Number(xs);
    // eslint-disable-next-line no-restricted-syntax -- xs/ys are strings; validated via Number.isFinite below
    const y = Number(ys);
    const xOk = Number.isFinite(x);
    const yOk = Number.isFinite(y);
    if (!xOk && !yOk) {
      continue;
    }
    if (!xOk || !yOk) {
      throw new IoError(`CSV row ${String(i + 1)} contains non-numeric coordinates`, correlationId);
    }

    points.push({ x, y });
  }

  if (points.length === 0) {
    throw new IoError("CSV contained no point rows", correlationId);
  }

  return { kind: "pointSet", label, points };
}

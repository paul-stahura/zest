import type { Point2 } from "@/shared/io/types";

/**
 * Serializes a point list as a minimal two-column CSV suitable for round-tripping through {@link parsePointSetCsv}.
 */
export function exportPointsToCsv(points: Point2[]): string {
  const lines: string[] = ["# Zest point export", "x,y"];
  for (const p of points) {
    lines.push(`${String(p.x)},${String(p.y)}`);
  }
  return `${lines.join("\n")}\n`;
}

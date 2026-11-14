import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCriticalStripCsv } from "@/features/critical-strip/criticalStripCsvLoader";
import { CRITICAL_STRIP_MANIFEST } from "@/features/critical-strip/criticalStripPointSetManifest";
import { imagToIndex } from "@/shared/math/zetaEms";

const SOURCE_SIGMA_T: ReadonlyArray<{ sigma: number; t: number }> = [
  { sigma: 0.808517182456637386, t: 85.699348485377592172 },
  { sigma: 0.650830080609737082, t: 114.1633427307569809 },
  { sigma: 0.869530579640643073, t: 240.40467235144069378 },
  { sigma: 0.819549592098810835, t: 320.8764896687748696 },
  { sigma: 0.768223123615721532, t: 331.05025940794964765 },
  { sigma: 0.815873677845720813, t: 411.79673754901283333 },
];

describe("zeros of f_L(s) point set", () => {
  it("is in the select-point-sets manifest", () => {
    const entry = CRITICAL_STRIP_MANIFEST.find(m => m.id === "96-fl-zeros");
    expect(entry?.label).toBe("zeros of f_L(s)");
  });

  it("stores σ and T = imagToIndex(t), ignoring |f|", () => {
    const filename = CRITICAL_STRIP_MANIFEST.find(m => m.id === "96-fl-zeros")?.filename;
    expect(filename).toBeDefined();
    const text = readFileSync(
      resolve(import.meta.dirname, "../../../public/critical-strip-points", filename ?? ""),
      "utf8",
    );
    const set = parseCriticalStripCsv("96-fl-zeros", text);
    expect(set.points).toHaveLength(SOURCE_SIGMA_T.length);
    for (let i = 0; i < SOURCE_SIGMA_T.length; i++) {
      const src = SOURCE_SIGMA_T[i]!;
      const pt = set.points[i]!;
      expect(pt.real).toBeCloseTo(src.sigma, 12);
      expect(pt.index).toBeCloseTo(imagToIndex(src.t, false), 12);
    }
  });
});

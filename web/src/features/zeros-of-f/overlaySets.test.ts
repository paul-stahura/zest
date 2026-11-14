import fs from "node:fs";
import path from "node:path";

import { DEFAULT_STATE } from "@/features/zeros-of-f/types";
import { parseAkZerosBin } from "@/shared/io/akZerosBin";
import { parseCommittedScanBin } from "@/shared/io/committedScanBin";
import { imagToIndex, indexToImag } from "@/shared/math/zetaEms";
import {
  ABOVE_CURVE_COUNT,
  AK_FS_ZERO_ROWS,
  MAIN_ZEROS_COUNT,
  PACKED_OVERLAY_ROW_COUNTS,
  R1AK_NEAR_STRIP_COUNT,
  R1AK_STRIP_TO_300_COUNT,
  akFsZeroPatch,
  mainZerosLayerVisible,
  overlayRowChecked,
  overlayRowPatch,
  parseOverlayRowCounts,
} from "@/features/zeros-of-f/overlaySets";

describe("overlayRowPatch", () => {
  it("turns on one T×σ cell without enabling the others", () => {
    const next = { ...DEFAULT_STATE.display, ...overlayRowPatch("t3900To3925_sigmaLt0", true) };
    expect(overlayRowChecked(next, "t3900To3925_sigmaLt0")).toBe(true);
    expect(overlayRowChecked(next, "t3900To3925_sigma0To1")).toBe(false);
    expect(overlayRowChecked(next, "t3975To4000_sigmaLt0")).toBe(false);
    expect(overlayRowChecked(next, "akSigmaGtNeg50")).toBe(false);
    expect(overlayRowChecked(next, "t398To3900_sigmaNeg50ToNeg10")).toBe(false);
  });
});

describe("PACKED_OVERLAY_ROW_COUNTS", () => {
  it("has the last harvest counts, not zeros", () => {
    expect(PACKED_OVERLAY_ROW_COUNTS.t3975To4000_sigmaLt0).toBeGreaterThan(0);
    expect(PACKED_OVERLAY_ROW_COUNTS.akSigmaGtNeg50).toBeGreaterThan(0);
    expect(PACKED_OVERLAY_ROW_COUNTS.t398To3900_sigmaNeg50ToNeg10).toBe(501251);
    expect(PACKED_OVERLAY_ROW_COUNTS.t398To3900_sigmaNeg20To0).toBe(1170554);
  });
});

function binHeaderCount(name: string): number {
  const file = path.resolve(process.cwd(), "public/zeros-of-f", name);
  return fs.readFileSync(file).readUInt32LE(4);
}

describe("mainZerosLayerVisible", () => {
  it("hides the catalog only while the checkbox is off", () => {
    expect(mainZerosLayerVisible(true, true, true)).toBe(true);
    expect(mainZerosLayerVisible(true, true, false)).toBe(false);
    expect(mainZerosLayerVisible(false, true, false)).toBe(true);
    expect(mainZerosLayerVisible(true, false, false)).toBe(true);
  });
});

describe("committed catalog", () => {
  it("keeps the certified zeros and drops T below 8.2", () => {
    const file = path.resolve(process.cwd(), "public/zeros-of-f/committed-scan.bin");
    const bytes = fs.readFileSync(file);
    const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const points = parseCommittedScanBin(copy);
    expect(points.t.length).toBe(MAIN_ZEROS_COUNT);
    let below = 0;
    let leftOf500 = 0;
    for (let i = 0; i < points.t.length; i += 1) {
      if (points.t[i]! < 8) below += 1;
      if (points.sigma[i]! < -500) leftOf500 += 1;
    }
    expect(below).toBe(0);
    expect(leftOf500).toBe(128);
    const leftFile = path.resolve(process.cwd(), "public/zeros-of-f/sigma-neg500-to-neg400.bin");
    expect(fs.readFileSync(leftFile).readUInt32LE(4)).toBe(0);
  });
});

describe("AK f(s) catalogs", () => {
  it("flips one T-window checkbox", () => {
    const next = { ...DEFAULT_STATE.display, ...akFsZeroPatch("showAkFsZerosT20k", true) };
    expect(next.showAkFsZerosT20k).toBe(true);
    expect(next.showAkFsZerosT100k).toBe(false);
    expect(next.showAkFsZerosT300k).toBe(false);
    expect(next.showAkZerosSigmaGtNeg50).toBe(false);
  });

  it("packs σ with index T = imagToIndex(t), inside the labeled window", () => {
    const sourceT = 2513274901.041123;
    const row = AK_FS_ZERO_ROWS.find((item) => item.flag === "showAkFsZerosT20k");
    if (row === undefined) throw new Error("missing T=20000 row");
    const name = row.url.split("/").at(-1)!;
    const bytes = fs.readFileSync(path.resolve(process.cwd(), "public/zeros-of-f", name));
    const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const points = parseAkZerosBin(copy);
    expect(points.sigma.length).toBe(row.count);
    expect(points.sigma[0]).toBeCloseTo(-1329.2396, 4);
    const storedT = points.t[0]!;
    // imagToIndex subtracts two large logs, so it misses the log1p inverse by ~1e-7.
    expect(storedT).toBeCloseTo(imagToIndex(sourceT, false), 5);
    expect(Math.abs(indexToImag(storedT, false) - sourceT) / sourceT).toBeLessThan(1e-15);
    let tMin = Infinity;
    let tMax = -Infinity;
    for (let i = 0; i < points.t.length; i += 1) {
      const t = points.t[i]!;
      if (t < tMin) tMin = t;
      if (t > tMax) tMax = t;
    }
    expect(tMin).toBeGreaterThan(row.tMin - 0.01);
    expect(tMin).toBeLessThan(row.tMin + 0.01);
    expect(tMax).toBeGreaterThan(row.tMax - 0.01);
    expect(tMax).toBeLessThan(row.tMax + 0.01);
  });

  it("matches each packed bin header", () => {
    for (const row of AK_FS_ZERO_ROWS) {
      const name = row.url.split("/").at(-1)!;
      expect(binHeaderCount(name)).toBe(row.count);
    }
  });
});

describe("above-curve locator", () => {
  it("matches the packed bin header", () => {
    expect(ABOVE_CURVE_COUNT).toBe(binHeaderCount("ak-above-curve-t4000-13000.bin"));
  });
});

describe("R1ak strip counts", () => {
  it("match the packed bin headers", () => {
    expect(R1AK_NEAR_STRIP_COUNT).toBe(binHeaderCount("r1ak-s1t55.bin"));
    expect(R1AK_STRIP_TO_300_COUNT).toBe(
      binHeaderCount("r1ak-strip-t55-100.bin") + binHeaderCount("r1ak-strip-t100-300.bin"),
    );
  });
});

describe("parseOverlayRowCounts", () => {
  it("keeps finite counts and zeros the rest", () => {
    expect(parseOverlayRowCounts({
      akSigmaGtNeg50: 12.7,
      t3900To3925_sigmaLt0: -3,
      extra: 9,
    })).toEqual({
      akSigmaLtNeg50: 0,
      akSigmaGtNeg50: 12,
      t3975To4000_sigmaLt0: 0,
      t3975To4000_sigma0To1: 0,
      t3950To3975_sigmaLt0: 0,
      t3950To3975_sigma0To1: 0,
      t3925To3950_sigmaLt0: 0,
      t3925To3950_sigma0To1: 0,
      t3900To3925_sigmaLt0: 0,
      t3900To3925_sigma0To1: 0,
      t398To3900_sigmaNeg50ToNeg10: 0,
      t398To3900_sigmaNeg20To0: 0,
    });
  });
});

import {
  computeScannerSourceHashFromSources,
  type ScannerSourceInput,
} from "@/shared/scan/scannerSourceHash";

const scannerSources: ScannerSourceInput[] = [
  { path: "src/shared/scan/scanLineAlgorithm.ts", source: "export const scanner = 1;\n" },
  { path: "src/shared/scan/buildScanQueue.ts", source: "export const queue = 1;\n" },
];

describe("computeScannerSourceHashFromSources", () => {
  it("changes when scanner-relevant source changes", async () => {
    const baseline = await computeScannerSourceHashFromSources(scannerSources);
    const changed = await computeScannerSourceHashFromSources([
      scannerSources[0]!,
      { path: scannerSources[1]!.path, source: "export const queue = 2;\n" },
    ]);

    expect(changed.scannerSourceHash).not.toBe(baseline.scannerSourceHash);
  });

  it("normalizes line endings before hashing each file", async () => {
    const lf = await computeScannerSourceHashFromSources([
      { path: "src/shared/scan/scanLineAlgorithm.ts", source: "a\nb\n" },
    ]);
    const crlf = await computeScannerSourceHashFromSources([
      { path: "src/shared/scan/scanLineAlgorithm.ts", source: "a\r\nb\r\n" },
    ]);

    expect(crlf.scannerSourceHash).toBe(lf.scannerSourceHash);
  });

  it("sorts files by normalized path before hashing the manifest", async () => {
    const sorted = await computeScannerSourceHashFromSources(scannerSources);
    const reversed = await computeScannerSourceHashFromSources([...scannerSources].reverse());

    expect(reversed.scannerSourceHash).toBe(sorted.scannerSourceHash);
    expect(reversed.scannerFiles).toEqual([
      "src/shared/scan/buildScanQueue.ts",
      "src/shared/scan/scanLineAlgorithm.ts",
    ]);
  });

  it("ignores presentation-only files when they are not included in the scanner input set", async () => {
    const baseline = await computeScannerSourceHashFromSources(scannerSources);
    const presentationOnlyChange = await computeScannerSourceHashFromSources(scannerSources);

    expect(presentationOnlyChange.scannerSourceHash).toBe(baseline.scannerSourceHash);
  });
});

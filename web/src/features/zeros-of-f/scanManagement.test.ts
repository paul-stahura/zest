import { buildManagedScanRecords, compatibleForCombine } from "@/features/zeros-of-f/scanManagement";
import { DEFAULT_STATE } from "@/features/zeros-of-f/types";
import type { ArchiveListing } from "@/shared/persistence/scanArchive";
import type { ScanRequest } from "@/shared/scan/scanBackend";

function request(overrides: Partial<ScanRequest> = {}): ScanRequest {
  return {
    variant: "R1ak",
    sigmaRange: { min: -10, max: -8, linesPerSigma: 2 },
    tRange: { min: 10, max: 20 },
    samplesPerT: 100,
    bisectionIters: 8,
    algorithm: "sign-change",
    acceptDepth: 0.0005,
    seed: 42,
    workers: 0,
    ...overrides,
  };
}

function listing(scanId: string, overrides: Partial<ArchiveListing> = {}): ArchiveListing {
  return {
    workspaceId: "zeros-of-f",
    scanId,
    createdAt: 1_778_000_000_000,
    request: request(),
    summary: { durationMs: 10, linesScanned: 2, pointsRecorded: 5 },
    approxBytes: 400,
    ...overrides,
  };
}

describe("scanManagement", () => {
  it("filters hidden local and remote-placeholder records", () => {
    const rows = buildManagedScanRecords({
      backgroundIds: new Set(),
      display: DEFAULT_STATE.display,
      loadedIds: new Set(),
      localEntries: [
        listing("local-hidden", { hiddenAt: 1_778_000_000_100 }),
        listing("remote-hidden", { hiddenAt: 1_778_000_000_100, remoteScanId: "remote-hidden" }),
      ],
    });

    expect(rows).toHaveLength(0);
  });

  it("groups parent and child local scans as one managed row", () => {
    const rows = buildManagedScanRecords({
      backgroundIds: new Set(),
      display: DEFAULT_STATE.display,
      loadedIds: new Set(["child"]),
      localEntries: [
        listing("parent", { rootScanId: "parent", summary: { durationMs: 1, linesScanned: 1, pointsRecorded: 2 } }),
        listing("child", { parentScanId: "parent", rootScanId: "parent", summary: { durationMs: 2, linesScanned: 3, pointsRecorded: 4 } }),
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.componentScanIds).toEqual(["parent", "child"]);
    expect(rows[0]?.summary.pointsRecorded).toBe(6);
    expect(rows[0]?.isLoaded).toBe(true);
  });

  it("allows compatible scans with touching sigma and T ranges", () => {
    const rows = buildManagedScanRecords({
      backgroundIds: new Set(),
      display: DEFAULT_STATE.display,
      loadedIds: new Set(),
      localEntries: [
        listing("a"),
        listing("b", { request: request({ sigmaRange: { min: -8.5, max: -6, linesPerSigma: 2 }, tRange: { min: 20, max: 30 } }) }),
      ],
    });

    expect(compatibleForCombine(rows)).toEqual({ compatible: true, reason: null });
  });

  it("rejects incompatible combine selections", () => {
    const rows = buildManagedScanRecords({
      backgroundIds: new Set(),
      display: DEFAULT_STATE.display,
      loadedIds: new Set(),
      localEntries: [
        listing("a"),
        listing("b", { request: request({ algorithm: "minima" }) }),
      ],
    });

    expect(compatibleForCombine(rows)).toEqual({ compatible: false, reason: "Algorithms differ" });
  });
});

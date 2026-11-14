import { describe, expect, it } from "vitest";

import type { ArchiveListing } from "@/shared/persistence/scanArchive";
import { deriveScanArchiveBadges } from "@/shared/persistence/scanArchiveBadges";

const base: ArchiveListing = {
  workspaceId: "zeros-of-f",
  scanId: "scan",
  createdAt: 1,
  request: {
    variant: "R1ak",
    sigmaRange: { min: -1, max: 0, linesPerSigma: 1 },
    tRange: { min: 1, max: 2 },
    samplesPerT: 2,
    bisectionIters: 0,
    algorithm: "sign-change",
    acceptDepth: 0.0005,
    seed: 42,
    workers: 0,
  },
  summary: { linesScanned: 1, pointsRecorded: 0, durationMs: 1 },
  approxBytes: 0,
};

describe("deriveScanArchiveBadges", () => {
  it("does not infer current scanner for legacy entries without provenance", () => {
    expect(deriveScanArchiveBadges(base, "sha256:current")).toEqual([
      "Complete",
      "Scanner unknown",
    ]);
  });

  it("marks complete current-scanner entries", () => {
    expect(deriveScanArchiveBadges({
      ...base,
      provenance: {
        resultSchemaVersion: 1,
        scannerSourceHash: "sha256:current",
        scannerFiles: [],
        bundledAt: "2026-04-28T00:00:00.000Z",
        backend: "local-worker",
        partial: false,
        terminalStatus: "done",
      },
    }, "sha256:current")).toEqual(["Complete", "Current scanner"]);
  });

  it("marks partial errored different-scanner entries", () => {
    expect(deriveScanArchiveBadges({
      ...base,
      provenance: {
        resultSchemaVersion: 1,
        scannerSourceHash: "sha256:old",
        scannerFiles: [],
        bundledAt: "2026-04-28T00:00:00.000Z",
        backend: "cloud",
        cloudProfileId: "cloud-96",
        partial: true,
        terminalStatus: "error",
      },
    }, "sha256:current")).toEqual(["Error", "Partial", "Different scanner"]);
  });

  it("marks incompatible schema before scanner compatibility", () => {
    expect(deriveScanArchiveBadges({
      ...base,
      provenance: {
        resultSchemaVersion: 999,
        scannerSourceHash: "sha256:current",
        scannerFiles: [],
        bundledAt: "2026-04-28T00:00:00.000Z",
        backend: "local-worker",
        partial: false,
        terminalStatus: "done",
      },
    }, "sha256:current")).toEqual(["Complete", "Incompatible schema"]);
  });
});

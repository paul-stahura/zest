import { buildArchiveWriteDecision } from "@/features/zeros-of-f/archiveScanPolicy";
import {
  CURRENT_SCAN_RESULT_SCHEMA_VERSION,
  type ScanProvenance,
} from "@/shared/scan/scanBackend";

const provenanceBase: Omit<ScanProvenance, "partial" | "terminalStatus"> = {
  resultSchemaVersion: CURRENT_SCAN_RESULT_SCHEMA_VERSION,
  scannerSourceHash: "sha256:scanner",
  bundleArtifactHash: "sha256:bundle",
  scannerFiles: ["src/shared/scan/scanLineAlgorithm.ts"],
  bundledAt: "2026-04-30T12:00:00.000Z",
  backend: "cloud",
  cloudProfileId: "cloud-64",
};

describe("buildArchiveWriteDecision", () => {
  it("archives completed scans even when they contain zero rows", () => {
    const decision = buildArchiveWriteDecision({
      receivedRowCount: 0,
      terminalStatus: "done",
      provenanceBase,
    });

    expect(decision.shouldArchive).toBe(true);
    expect(decision.provenance?.partial).toBe(false);
    expect(decision.provenance?.terminalStatus).toBe("done");
  });

  it("skips cancelled scans when no rows arrived", () => {
    const decision = buildArchiveWriteDecision({
      receivedRowCount: 0,
      terminalStatus: "cancelled",
      provenanceBase,
    });

    expect(decision.shouldArchive).toBe(false);
    expect(decision.provenance).toBeUndefined();
  });

  it("skips errored scans when no rows arrived", () => {
    const decision = buildArchiveWriteDecision({
      receivedRowCount: 0,
      terminalStatus: "error",
      provenanceBase,
    });

    expect(decision.shouldArchive).toBe(false);
    expect(decision.provenance).toBeUndefined();
  });

  it("archives errored scans with rows as partial error results", () => {
    const decision = buildArchiveWriteDecision({
      receivedRowCount: 2,
      terminalStatus: "error",
      provenanceBase,
    });

    expect(decision.shouldArchive).toBe(true);
    expect(decision.provenance?.partial).toBe(true);
    expect(decision.provenance?.terminalStatus).toBe("error");
  });

  it("marks in-flight incremental writes as partial until a terminal status arrives", () => {
    const decision = buildArchiveWriteDecision({
      receivedRowCount: 1,
      terminalStatus: null,
      provenanceBase,
    });

    expect(decision.shouldArchive).toBe(true);
    expect(decision.provenance?.partial).toBe(true);
    expect(decision.provenance?.terminalStatus).toBe("cancelled");
  });
});

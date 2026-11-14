import type { ScanProvenance } from "@/shared/scan/scanBackend";

export type ArchiveTerminalStatus = ScanProvenance["terminalStatus"] | null;

interface ArchiveWriteDecisionInput {
  receivedRowCount: number;
  terminalStatus: ArchiveTerminalStatus;
  provenanceBase: Omit<ScanProvenance, "partial" | "terminalStatus"> | null;
}

interface ArchiveWriteDecision {
  shouldArchive: boolean;
  provenance?: ScanProvenance;
}

/**
 * Applies the cloud/local archive terminal policy from the cloud scan plan.
 * Completed zero-row scans are real results; cancelled/error zero-row scans
 * are just failed attempts and should stay out of the archive.
 */
export function buildArchiveWriteDecision(input: ArchiveWriteDecisionInput): ArchiveWriteDecision {
  const shouldArchive = input.receivedRowCount > 0 || input.terminalStatus === "done";
  if (!shouldArchive) {
    return { shouldArchive: false };
  }
  if (input.provenanceBase === null) {
    return { shouldArchive: true };
  }
  return {
    shouldArchive: true,
    provenance: {
      ...input.provenanceBase,
      partial: input.terminalStatus === null ? true : input.terminalStatus !== "done",
      terminalStatus: input.terminalStatus ?? "cancelled",
    },
  };
}

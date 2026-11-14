import type { ArchiveListing } from "@/shared/persistence/scanArchive";
import { CURRENT_SCAN_RESULT_SCHEMA_VERSION } from "@/shared/scan/scanBackend";

export type ScanArchiveBadge =
  | "Complete"
  | "Partial"
  | "Error"
  | "Current scanner"
  | "Different scanner"
  | "Scanner unknown"
  | "Incompatible schema";

export function deriveScanArchiveBadges(
  entry: ArchiveListing,
  currentScannerSourceHash: string | null,
): ScanArchiveBadge[] {
  const badges: ScanArchiveBadge[] = [];
  const provenance = entry.provenance;
  if (provenance?.terminalStatus === "error") {
    badges.push("Error");
  }
  if (provenance?.partial === true) {
    badges.push("Partial");
  } else if (provenance?.terminalStatus === "done" || provenance === undefined) {
    badges.push("Complete");
  }

  if (
    provenance !== undefined &&
    provenance.resultSchemaVersion !== CURRENT_SCAN_RESULT_SCHEMA_VERSION
  ) {
    badges.push("Incompatible schema");
    return badges;
  }

  if (provenance === undefined) {
    badges.push("Scanner unknown");
    return badges;
  }

  if (currentScannerSourceHash !== null && provenance.scannerSourceHash === currentScannerSourceHash) {
    badges.push("Current scanner");
  } else {
    badges.push("Different scanner");
  }

  return badges;
}

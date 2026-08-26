import { createCorrelationId } from "@/shared/io/correlationId";
import { parseSessionEnvelopeJson } from "@/shared/io/jsonSession";
import type { ImportedDataset } from "@/shared/io/types";
import type { DataImporter } from "@/shared/visualization/contracts";

/**
 * Imports versioned JSON session envelopes produced by the web exporters.
 */
export const sessionEnvelopeImporter: DataImporter = {
  id: "session-envelope-json",
  label: "Workspace JSON",
  canImport(file: File): boolean {
    return file.name.toLowerCase().endsWith(".json") || file.type === "application/json";
  },
  async import(file: File): Promise<ImportedDataset> {
    const correlationId = createCorrelationId();
    const text = await file.text();
    const payload = parseSessionEnvelopeJson(correlationId, text);
    return { kind: "jsonSession", label: file.name, payload };
  },
};

import { createCorrelationId } from "@/shared/io/correlationId";
import { parsePointSetCsv } from "@/shared/io/csvPointSet";
import type { ImportedDataset } from "@/shared/io/types";
import type { DataImporter } from "@/shared/visualization/contracts";

/**
 * CSV importer that produces a validated point set dataset for visualization modules.
 */
export const pointSetCsvImporter: DataImporter = {
  id: "point-set-csv",
  label: "Point set CSV",
  canImport(file: File): boolean {
    const name = file.name.toLowerCase();
    return name.endsWith(".csv") || file.type === "text/csv" || file.type === "application/vnd.ms-excel";
  },
  async import(file: File): Promise<ImportedDataset> {
    const correlationId = createCorrelationId();
    const text = await file.text();
    return parsePointSetCsv(correlationId, text, file.name);
  },
};

import { createCorrelationId } from "@/shared/io/correlationId";
import type { ImportedDataset } from "@/shared/io/types";
import type { DataImporter } from "@/shared/visualization/contracts";
import { parseZerosOfFCsv } from "@/shared/io/zerosOfFCsv";

/**
 * Importer for zeros-of-f scan CSVs (Python `zeros_of_f_v3speed.py` format).
 * Activated by file extension or by detecting the canonical header line.
 */
export const zerosOfFCsvImporter: DataImporter = {
  id: "zeros-of-f-csv",
  label: "Zeros of f scan CSV",
  canImport(file: File): boolean {
    const name = file.name.toLowerCase();
    return name.endsWith(".csv") || file.type === "text/csv";
  },
  async import(file: File): Promise<ImportedDataset> {
    const correlationId = createCorrelationId();
    const text = await file.text();
    return parseZerosOfFCsv(correlationId, text, file.name);
  },
};

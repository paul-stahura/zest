export type Point2 = {
  x: number;
  y: number;
};

export type ZestSessionEnvelopeV1 = {
  version: 1;
  visualizationId: string;
  state: unknown;
};

export type ImportedPointSet = {
  kind: "pointSet";
  label: string;
  points: Point2[];
};

export type ImportedJsonSession = {
  kind: "jsonSession";
  label: string;
  payload: ZestSessionEnvelopeV1;
};

/** Imported zeros-of-f scan CSV. Stored as plain arrays so callers can re-pack. */
export type ImportedZerosOfFScan = {
  kind: "zerosOfFScan";
  label: string;
  /** Optional scan parameters parsed from the `#`-comment header. */
  meta: Record<string, string>;
  /** Per-point sigma. Length = N. */
  sigma: number[];
  /** Per-point T. Length = N. */
  t: number[];
  /** Per-point `|f|`. Length = N. */
  yVal: number[];
  /** Optional pre-baked classification levels (legacy CSVs). Length = N when present. */
  level: number[] | null;
};

export type ImportedDataset = ImportedPointSet | ImportedJsonSession | ImportedZerosOfFScan;

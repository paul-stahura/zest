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

export type ImportedDataset = ImportedPointSet | ImportedJsonSession;

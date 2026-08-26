import type { ComponentType, ReactNode } from "react";

import type { ImportedDataset } from "@/shared/io/types";

export type VisualizationRouteModule = {
  id: string;
  title: string;
  routePath: string;
  createModel(): VisualizationModel;
  ViewportView: ComponentType;
  getToolSections(ctx: ToolboxContext): ToolboxSection[];
  importers?: DataImporter[];
  exporters?: DataExporter[];
};

export type VisualizationModel = {
  initialize(): Promise<void> | void;
  dispose(): void;
  getSceneController(): SceneController;
  getSelectionState(): SelectionState;
  getSerializableState?(): unknown;
  restoreSerializableState?(value: unknown): void;
  /**
   * Optional dynamic toolbox sections (used by composed workspaces and future modules).
   */
  getToolboxContributions?(ctx: ToolboxContext): ToolboxSection[];
  /**
   * Optional hook used by the shell to route imported datasets to the active module.
   */
  applyImportedDataset?(dataset: ImportedDataset): void;
  /**
   * Optional bridge for the critical strip panel to read and set spiral position.
   * Only the main workspace implements this; others may omit it.
   */
  getCriticalStripPosition?(): { index: number; sigma: number };
  setCriticalStripPosition?(index: number, sigma: number): void;
};

export type ToolboxSection = {
  id: string;
  /**
   * Namespaces this section when multiple sub-visualizations contribute toolbox rows (stable UI keys).
   */
  contributorId?: string;
  title: string;
  defaultCollapsed?: boolean;
  order?: number;
  controls?: ToolboxControl[];
  CustomPanel?: ComponentType<{ ctx: ToolboxContext }>;
  /**
   * When true, the section renders its body without an accordion header
   * (no chevron, not collapsible). Useful for "always visible" top-of-dock controls.
   */
  bare?: boolean;
};

export type ToolboxControl =
  | { kind: "toggle"; id: string; label: string; value: boolean; onChange(v: boolean): void }
  | { kind: "number"; id: string; label: string; value: number; min?: number; max?: number; step?: number; onChange(v: number): void }
  | { kind: "range-slider"; id: string; label: string; value: number; defaultValue?: number; min: number; max: number; step: number; onChange(v: number): void; onStepChange?(step: number): void; onRangeChange?(min: number, max: number): void }
  | { kind: "select"; id: string; label: string; value: string; options: { label: string; value: string }[]; onChange(v: string): void }
  | { kind: "color"; id: string; label: string; value: string; onChange(v: string): void }
  | { kind: "action"; id: string; label: string; run(): void }
  | { kind: "display"; id: string; label: string; value: string }
  | { kind: "option-toggle"; id: string; label?: string; value: number; options: { label: string; color?: string }[]; charWidth?: number; onChange(v: number): void }
  | { kind: "custom"; id: string; render(): ReactNode };

export type ToolboxContext = {
  correlationId: string;
  visualizationId: string;
  visualizationModel: VisualizationModel;
  exportContext: ExportContext;
  selectionState: SelectionState;
  /**
   * Lets declarative toolbox controls request a React rerender after mutating model state.
   */
  requestToolboxRefresh(): void;
};

export type ExportContext = {
  correlationId: string;
  visualizationId: string;
  visualizationModel: VisualizationModel;
  getSerializableState(): unknown;
};

export type SelectionState = {
  activePoint: { x: number; y: number } | null;
};

export type SceneController = {
  mount(canvas: HTMLCanvasElement): void;
  resize(width: number, height: number, dpr: number): void;
  frame(time: number): void;
  dispose(): void;
};

export type DataImporter = {
  id: string;
  label: string;
  canImport(file: File): boolean;
  import(file: File): Promise<ImportedDataset>;
};

export type DataExporter = {
  id: string;
  label: string;
  export(ctx: ExportContext): Promise<Blob>;
};

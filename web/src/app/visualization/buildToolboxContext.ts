import type { ToolboxContext, VisualizationModel } from "@/shared/visualization/contracts";

/**
 * Builds a toolbox context snapshot for declarative controls and custom panels.
 */
export function buildToolboxContext(input: {
  correlationId: string;
  visualizationId: string;
  visualizationModel: VisualizationModel;
  requestToolboxRefresh: () => void;
}): ToolboxContext {
  return {
    correlationId: input.correlationId,
    visualizationId: input.visualizationId,
    visualizationModel: input.visualizationModel,
    selectionState: input.visualizationModel.getSelectionState(),
    exportContext: {
      correlationId: input.correlationId,
      visualizationId: input.visualizationId,
      visualizationModel: input.visualizationModel,
      getSerializableState: () => input.visualizationModel.getSerializableState?.() ?? null,
    },
    requestToolboxRefresh: input.requestToolboxRefresh,
  };
}

import { createContext, useContext } from "react";

import type { VisualizationModel, VisualizationRouteModule } from "@/shared/visualization/contracts";

export type VisualizationRuntimeValue = {
  model: VisualizationModel;
  module: VisualizationRouteModule;
};

export const VisualizationRuntimeContext = createContext<VisualizationRuntimeValue | null>(null);

/**
 * Accesses the active route module and its model from nested viewport components.
 */
export function useVisualizationRuntime(): VisualizationRuntimeValue {
  const ctx = useContext(VisualizationRuntimeContext);
  if (ctx === null) {
    throw new Error("useVisualizationRuntime must be used within a visualization host");
  }
  return ctx;
}

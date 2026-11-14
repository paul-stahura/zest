import { ViewportCanvas } from "@/shared/rendering/ViewportCanvas";
import { useVisualizationRuntime } from "@/app/visualization/VisualizationRuntimeContext";

export function QuasicrystalViewport() {
  const { model } = useVisualizationRuntime();
  return <ViewportCanvas controller={model.getSceneController()} />;
}

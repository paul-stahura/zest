import { ViewportCanvas } from "@/shared/rendering/ViewportCanvas";
import { useVisualizationRuntime } from "@/app/visualization/VisualizationRuntimeContext";

export function LinksViewport() {
  const { model } = useVisualizationRuntime();
  return <ViewportCanvas controller={model.getSceneController()} />;
}

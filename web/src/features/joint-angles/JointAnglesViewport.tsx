import { useVisualizationRuntime } from "@/app/visualization/VisualizationRuntimeContext";
import { JointAnglesViewportCanvas } from "@/features/joint-angles/JointAnglesViewportCanvas";

export function JointAnglesViewport() {
  const { model } = useVisualizationRuntime();
  return <JointAnglesViewportCanvas controller={model.getSceneController()} />;
}

import { useVisualizationRuntime } from "@/app/visualization/VisualizationRuntimeContext";
import { BigSigmaAxisOverlay } from "@/features/big-sigma/BigSigmaAxisOverlay";
import { ViewportCanvas } from "@/shared/rendering/ViewportCanvas";

/** Pan/zoom canvas for the Big Sigma tab. */
export function BigSigmaViewport() {
  const { model } = useVisualizationRuntime();
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 0 }}>
      <ViewportCanvas controller={model.getSceneController()} />
      <BigSigmaAxisOverlay />
    </div>
  );
}

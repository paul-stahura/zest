import { useVisualizationRuntime } from "@/app/visualization/VisualizationRuntimeContext";
import { AxesOverlay } from "@/features/zeros-of-f/AxesOverlay";
import { FracT3dOrbitBars } from "@/features/zeros-of-f/controls/FracT3dOrbitBars";
import { ZerosOfFModel } from "@/features/zeros-of-f/zerosOfFModel";
import { ViewportCanvas } from "@/shared/rendering/ViewportCanvas";

/** Orthographic canvas plus labeled axes. Pan/zoom stays on the controller. */
export function ZerosOfFViewport() {
  const { model } = useVisualizationRuntime();
  const controller = model.getSceneController();
  const zerosModel = model instanceof ZerosOfFModel ? model : null;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 0 }}>
      <ViewportCanvas controller={controller} />
      {zerosModel !== null ? (
        <AxesOverlay
          controller={zerosModel.getSceneController()}
          getTransform={() => zerosModel.getDataFitTransform()}
          getYAxisMode={() => zerosModel.getYAxisMode()}
          getDisplayView={() => zerosModel.getDisplayView()}
          getDisplayedZeroCount={() => zerosModel.getDisplayedZeroCount()}
          getTabViewMode={() => zerosModel.getTabViewMode()}
        />
      ) : null}
      {zerosModel !== null ? <FracT3dOrbitBars model={zerosModel} /> : null}
    </div>
  );
}

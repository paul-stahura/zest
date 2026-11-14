import type { SelectionState, ToolboxContext, ToolboxSection } from "@/shared/visualization/contracts";
import type { VisualizationModel } from "@/shared/visualization/contracts";

import { rayAnglePresets } from "@/features/quasicrystal/rayAnglePresets";
import { QuasicrystalSceneController } from "@/features/quasicrystal/quasicrystalSceneController";

/** Hosts the quasicrystal canvas. Interaction lives in the scene controller. */
export class QuasicrystalModel implements VisualizationModel {
  private readonly controller = new QuasicrystalSceneController();
  private toleranceMin = 0;
  private toleranceMax = 0.01;
  private toleranceStep = 0.0001;
  private reachMin = 0;
  private reachMax = 800;
  private reachStep = 5;

  public initialize(): void {
    // The ray and lattice are drawn every frame from fixed zeros.
  }

  public dispose(): void {
    this.controller.dispose();
  }

  public getSceneController(): QuasicrystalSceneController {
    return this.controller;
  }

  public getSelectionState(): SelectionState {
    return { activePoint: null };
  }

  public getToolboxContributions(ctx: ToolboxContext): ToolboxSection[] {
    const refresh = (): void => { ctx.requestToolboxRefresh(); };
    this.controller.watchAngle(refresh);
    const presetId = this.controller.anglePreset();
    const angleOptions = rayAnglePresets().map((preset) => ({ label: preset.label, value: preset.id }));
    return [
      {
        id: "quasicrystal",
        title: "quasicrystal",
        bare: true,
        controls: [
          {
            kind: "display",
            id: "angle",
            label: "angle",
            value: this.controller.angleReadout(),
          },
          {
            kind: "select",
            id: "angle-preset",
            label: "set angle",
            value: presetId,
            options: presetId === ""
              ? [{ label: this.controller.angleReadout(), value: "" }, ...angleOptions]
              : angleOptions,
            onChange: (id: string) => {
              this.controller.setAnglePreset(id);
              refresh();
            },
          },
          {
            kind: "range-slider",
            id: "tolerance",
            label: "tolerance",
            value: this.controller.tolerance(),
            defaultValue: 0.01,
            min: this.toleranceMin,
            max: this.toleranceMax,
            step: this.toleranceStep,
            onChange: (gridUnits: number) => {
              this.controller.setTolerance(gridUnits);
              refresh();
            },
            onStepChange: (step: number) => {
              this.toleranceStep = step;
              refresh();
            },
            onRangeChange: (min: number, max: number) => {
              this.toleranceMin = min;
              this.toleranceMax = max;
              refresh();
            },
          },
          {
            kind: "range-slider",
            id: "line-reach",
            label: "line reach",
            value: this.controller.maxDistance(),
            defaultValue: 300,
            min: this.reachMin,
            max: this.reachMax,
            step: this.reachStep,
            onChange: (px: number) => {
              this.controller.setMaxDistance(px);
              refresh();
            },
            onStepChange: (step: number) => {
              this.reachStep = step;
              refresh();
            },
            onRangeChange: (min: number, max: number) => {
              this.reachMin = min;
              this.reachMax = max;
              refresh();
            },
          },
          {
            kind: "action",
            id: "grid-one-t",
            label: "grid = 1 T",
            run: () => { this.controller.setGridToOneT(); },
          },
        ],
      },
    ];
  }
}

import { QuasicrystalModel } from "@/features/quasicrystal/quasicrystalModel";
import { QuasicrystalViewport } from "@/features/quasicrystal/QuasicrystalViewport";
import type { VisualizationRouteModule } from "@/shared/visualization/contracts";

export const visualizationRouteModule: VisualizationRouteModule = {
  id: "quasicrystal",
  title: "quasicrystal",
  routePath: "/quasicrystal",
  createModel: () => new QuasicrystalModel(),
  ViewportView: QuasicrystalViewport,
  getToolSections: (ctx) => ctx.visualizationModel.getToolboxContributions?.(ctx) ?? [],
};

import { BigSigmaModel } from "@/features/big-sigma/bigSigmaModel";
import { BigSigmaViewport } from "@/features/big-sigma/BigSigmaViewport";
import type { VisualizationRouteModule } from "@/shared/visualization/contracts";

export const visualizationRouteModule: VisualizationRouteModule = {
  id: "big-sigma",
  title: "big sigma",
  routePath: "/big-sigma",
  createModel: () => new BigSigmaModel(),
  ViewportView: BigSigmaViewport,
  getToolSections: (ctx) => ctx.visualizationModel.getToolboxContributions?.(ctx) ?? [],
};

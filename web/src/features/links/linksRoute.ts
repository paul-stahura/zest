import { LinksModel } from "@/features/links/linksModel";
import { LinksViewport } from "@/features/links/LinksViewport";
import type { VisualizationRouteModule } from "@/shared/visualization/contracts";

export const visualizationRouteModule: VisualizationRouteModule = {
  id: "links",
  title: "Links",
  routePath: "/links",
  createModel: () => new LinksModel(),
  ViewportView: LinksViewport,
  getToolSections: (ctx) => ctx.visualizationModel.getToolboxContributions?.(ctx) ?? [],
};

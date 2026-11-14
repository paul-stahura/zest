import { ZetaLogDerivModel } from "@/features/zeta-log-deriv/zetaLogDerivModel";
import { ZetaLogDerivViewport } from "@/features/zeta-log-deriv/ZetaLogDerivViewport";
import type { VisualizationRouteModule } from "@/shared/visualization/contracts";

export const visualizationRouteModule: VisualizationRouteModule = {
  id: "zeta-log-deriv",
  title: "ζ′/ζ",
  routePath: "/zeta-log-deriv",
  createModel: () => new ZetaLogDerivModel(),
  ViewportView: ZetaLogDerivViewport,
  getToolSections: (ctx) => ctx.visualizationModel.getToolboxContributions?.(ctx) ?? [],
};

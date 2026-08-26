import { JointAnglesModel } from "@/features/joint-angles/jointAnglesModel";
import { JointAnglesViewport } from "@/features/joint-angles/JointAnglesViewport";
import type { VisualizationRouteModule } from "@/shared/visualization/contracts";

export const visualizationRouteModule: VisualizationRouteModule = {
  id: "joint-angles",
  title: "Joint Angles",
  routePath: "/joint-angles",
  createModel: () => new JointAnglesModel(),
  ViewportView: JointAnglesViewport,
  getToolSections: (ctx) => ctx.visualizationModel.getToolboxContributions?.(ctx) ?? [],
};

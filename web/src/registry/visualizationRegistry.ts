import type { VisualizationRouteModule } from "@/shared/visualization/contracts";

export type VisualizationDefinition = {
  id: string;
  title: string;
  routePath: string;
  load: () => Promise<{ visualizationRouteModule: VisualizationRouteModule }>;
};

/**
 * Top-level visualization registry: add a feature folder + lazy loader entry to expose a new tab.
 */
export const visualizationDefinitions: VisualizationDefinition[] = [
  {
    id: "main-workspace",
    title: "Main",
    routePath: "/",
    load: async () => import("@/features/main-workspace/mainWorkspaceRoute"),
  },
  {
    id: "links",
    title: "Links",
    routePath: "/links",
    load: async () => import("@/features/links/linksRoute"),
  },
  {
    id: "joint-angles",
    title: "Joint Angles",
    routePath: "/joint-angles",
    load: async () => import("@/features/joint-angles/jointAnglesRoute"),
  },
];

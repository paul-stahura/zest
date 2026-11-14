import { ZerosOfFModel } from "@/features/zeros-of-f/zerosOfFModel";
import { ZerosOfFViewport } from "@/features/zeros-of-f/ZerosOfFViewport";
import { serializeSessionEnvelope } from "@/shared/io/jsonSession";
import { sessionEnvelopeImporter } from "@/shared/io/sessionEnvelopeImporter";
import type { ZestSessionEnvelopeV1 } from "@/shared/io/types";
import type {
  DataExporter,
  VisualizationRouteModule,
} from "@/shared/visualization/contracts";

const sessionExporter: DataExporter = {
  id: "zeros-of-f-json",
  label: "Workspace JSON",
  export: async (ctx) => {
    const envelope: ZestSessionEnvelopeV1 = {
      version: 1,
      visualizationId: ctx.visualizationId,
      state: ctx.getSerializableState(),
    };
    return new Blob([serializeSessionEnvelope(envelope)], { type: "application/json;charset=utf-8" });
  },
};

export const visualizationRouteModule: VisualizationRouteModule = {
  id: "zeros-of-f",
  title: "Zeros of f",
  routePath: "/zeros-of-f",
  createModel: () => new ZerosOfFModel(),
  ViewportView: ZerosOfFViewport,
  getToolSections: (ctx) => ctx.visualizationModel.getToolboxContributions?.(ctx) ?? [],
  importers: [sessionEnvelopeImporter],
  exporters: [sessionExporter],
};

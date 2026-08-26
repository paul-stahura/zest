import { MainWorkspaceModel } from "@/features/main-workspace/mainWorkspaceModel";
import { MainWorkspaceViewport } from "@/features/main-workspace/MainWorkspaceViewport";
import { exportPointsToCsv } from "@/shared/io/csvExport";
import { IoError } from "@/shared/io/errors";
import { serializeSessionEnvelope } from "@/shared/io/jsonSession";
import { pointSetCsvImporter } from "@/shared/io/pointSetCsvImporter";
import { sessionEnvelopeImporter } from "@/shared/io/sessionEnvelopeImporter";
import type {
  DataExporter,
  VisualizationRouteModule,
} from "@/shared/visualization/contracts";
import type { ZestSessionEnvelopeV1 } from "@/shared/io/types";

const mainWorkspaceSessionExporter: DataExporter = {
  id: "main-workspace-json",
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

const mainWorkspaceScatterExporter: DataExporter = {
  id: "main-scatter-csv",
  label: "Scatter points CSV",
  export: async (ctx) => {
    const candidate = ctx.visualizationModel;
    if (!(candidate instanceof MainWorkspaceModel)) {
      throw new IoError("Scatter CSV export is only available on the main workspace model", ctx.correlationId);
    }
    const points = candidate.getScatterPointsForExport();
    if (points.length === 0) {
      throw new IoError("No imported scatter points to export yet", ctx.correlationId);
    }
    return new Blob([exportPointsToCsv(points)], { type: "text/csv;charset=utf-8" });
  },
};

export const visualizationRouteModule: VisualizationRouteModule = {
  id: "main-workspace",
  title: "Main",
  routePath: "/",
  createModel: () => new MainWorkspaceModel(),
  ViewportView: MainWorkspaceViewport,
  getToolSections: (ctx) => ctx.visualizationModel.getToolboxContributions?.(ctx) ?? [],
  importers: [sessionEnvelopeImporter, pointSetCsvImporter],
  exporters: [mainWorkspaceSessionExporter, mainWorkspaceScatterExporter],
};

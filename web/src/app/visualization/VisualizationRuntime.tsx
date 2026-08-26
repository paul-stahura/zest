import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { buildToolboxContext } from "@/app/visualization/buildToolboxContext";
import { VisualizationRuntimeContext } from "@/app/visualization/VisualizationRuntimeContext";
import { createCorrelationId } from "@/shared/io/correlationId";
import { attachDropFileHandler } from "@/shared/io/dragDrop";
import { aggregateToolboxSections } from "@/shared/toolbox/aggregateToolboxSections";
import { ToolboxDock } from "@/shared/toolbox/ToolboxDock";
import { CriticalStripPanel } from "@/features/critical-strip/CriticalStripPanel";
import type { ImportedDataset } from "@/shared/io/types";
import type { VisualizationModel, VisualizationRouteModule } from "@/shared/visualization/contracts";

type VisualizationRuntimeProps = {
  module: VisualizationRouteModule;
};

/**
 * Hosts a single visualization route: model lifecycle, toolbox aggregation, and import/export surfaces.
 */
export function VisualizationRuntime({ module }: VisualizationRuntimeProps) {
  const [model, setModel] = useState<VisualizationModel | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [initRetry, bumpInitRetry] = useReducer((count: number) => count + 1, 0);
  const [revision, bumpRevision] = useReducer((count: number) => count + 1, 0);
  const correlationId = useMemo(() => createCorrelationId(), []);
  const dropTargetRef = useRef<HTMLDivElement | null>(null);
  const initFailureDisposeRef = useRef(false);

  const requestToolboxRefresh = useCallback(() => {
    bumpRevision();
  }, []);

  useEffect(() => {
    initFailureDisposeRef.current = false;
    setInitError(null);
    const created = module.createModel();
    let cancelled = false;

    void Promise.resolve(created.initialize())
      .then(() => {
        if (!cancelled) {
          setModel(created);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          initFailureDisposeRef.current = true;
          const message = error instanceof Error ? error.message : "Initialization failed";
          setInitError(message);
          try {
            created.dispose();
          } catch {
            // Initialization may have partially wired resources; disposal is best-effort.
          }
        }
      });

    return () => {
      cancelled = true;
      setModel(null);
      if (!initFailureDisposeRef.current) {
        try {
          created.dispose();
        } catch {
          // ignore
        }
      }
    };
  }, [module, initRetry]);

  const ctx = useMemo(() => {
    if (model === null) {
      return null;
    }
    return buildToolboxContext({
      correlationId,
      visualizationId: module.id,
      visualizationModel: model,
      requestToolboxRefresh,
    });
  }, [correlationId, module.id, model, requestToolboxRefresh, revision]);

  const sections = useMemo(() => {
    if (ctx === null) {
      return [];
    }
    return aggregateToolboxSections(module.getToolSections(ctx));
  }, [ctx, module, revision]);

  const handleImportedDataset = useCallback(
    (dataset: ImportedDataset) => {
      if (model === null) {
        return;
      }

      if (dataset.kind === "jsonSession") {
        if (dataset.payload.visualizationId !== module.id) {
          window.alert(
            `That session belongs to "${dataset.payload.visualizationId}", but this tab is "${module.id}".`,
          );
          return;
        }
        model.restoreSerializableState?.(dataset.payload.state);
        requestToolboxRefresh();
        return;
      }

      model.applyImportedDataset?.(dataset);
      requestToolboxRefresh();
    },
    [model, module.id, requestToolboxRefresh],
  );

  useEffect(() => {
    const element = dropTargetRef.current;
    if (element === null) {
      return;
    }
    return attachDropFileHandler(element, (file) => {
      void (async () => {
        const importers = module.importers ?? [];
        const importer = importers.find((candidate) => candidate.canImport(file));
        if (importer === undefined) {
          window.alert("No importer matched that file for this tab.");
          return;
        }
        try {
          const dataset = await importer.import(file);
          handleImportedDataset(dataset);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Import failed";
          window.alert(message);
        }
      })();
    });
  }, [handleImportedDataset, module]);

  if (initError !== null) {
    return (
      <div style={{ padding: "16px", color: "#e6e8ef", fontSize: "13px", display: "grid", gap: "10px" }}>
        <div>Could not initialize this visualization.</div>
        <div style={{ opacity: 0.85 }}>{initError}</div>
        <div>
          <button type="button" className="zest-button" onClick={() => bumpInitRetry()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (model === null || ctx === null) {
    return (
      <div style={{ padding: "16px", color: "#e6e8ef", fontSize: "13px" }}>
        Loading visualization…
      </div>
    );
  }

  return (
    <VisualizationRuntimeContext.Provider value={{ model, module }}>
      <div
        ref={dropTargetRef}
        style={{
          height: "100%",
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          color: "#e6e8ef",
        }}
      >
        <div style={{ minHeight: 0, position: "relative" }}>
          <module.ViewportView />
          {model.getCriticalStripPosition !== undefined && (
            <CriticalStripPanel
              getPosition={() => model.getCriticalStripPosition!()}
              onNavigate={(index, sigma) => model.setCriticalStripPosition?.(index, sigma)}
            />
          )}
        </div>
        <ToolboxDock sections={sections} ctx={ctx} />
      </div>
    </VisualizationRuntimeContext.Provider>
  );
}


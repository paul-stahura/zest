import { useEffect, useState } from "react";

import { VisualizationRuntime } from "@/app/visualization/VisualizationRuntime";
import type { VisualizationDefinition } from "@/registry/visualizationRegistry";
import type { VisualizationRouteModule } from "@/shared/visualization/contracts";

type VisualizationPageProps = {
  definition: VisualizationDefinition;
};

/**
 * Lazy-loads a visualization module and mounts its runtime host when ready.
 */
export function VisualizationPage({ definition }: VisualizationPageProps) {
  const [module, setModule] = useState<VisualizationRouteModule | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setModule(null);
    setLoadError(null);
    void definition
      .load()
      .then((loaded) => {
        if (!cancelled) {
          setModule(loaded.visualizationRouteModule);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Failed to load module";
          setLoadError(message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [definition, retryToken]);

  if (loadError !== null) {
    return (
      <div style={{ padding: "16px", color: "#e6e8ef", fontSize: "13px", display: "grid", gap: "10px" }}>
        <div>Could not load this visualization module.</div>
        <div style={{ opacity: 0.85 }}>{loadError}</div>
        <div>
          <button
            type="button"
            className="zest-button"
            onClick={() => {
              setRetryToken((n) => n + 1);
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (module === null) {
    return (
      <div style={{ padding: "16px", color: "#e6e8ef", fontSize: "13px" }}>
        Loading module…
      </div>
    );
  }

  return <VisualizationRuntime module={module} />;
}

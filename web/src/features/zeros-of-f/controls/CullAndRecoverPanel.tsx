import { useCallback, useEffect, useState } from "react";

import type { ToolboxContext, VisualizationModel } from "@/shared/visualization/contracts";

interface CullAndRecoverPanelProps {
  ctx: ToolboxContext;
}

interface CullCapableModel {
  runCullAndRecover: (opts: {
    tTol: number;
    sigmaGap: number;
    refineDelta: number;
    refineSamples: number;
  }) => Promise<void>;
  cancelCullAndRecover: () => void;
  isCullRunning: () => boolean;
  getCullProgress: () => { done: number };
}

function asCullCapable(m: VisualizationModel): CullCapableModel | null {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- methods checked below.
  const c = m as unknown as Partial<CullCapableModel>;
  if (
    typeof c.runCullAndRecover === "function" &&
    typeof c.cancelCullAndRecover === "function" &&
    typeof c.isCullRunning === "function" &&
    typeof c.getCullProgress === "function"
  ) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- methods just verified above.
    return c as CullCapableModel;
  }
  return null;
}

const DEFAULTS = { tTol: 0.002, sigmaGap: 0.10, refineDelta: 0.05, refineSamples: 20 };

/**
 * UI for the cull-and-recover post-process. Click Run to clean up the
 * currently-loaded scan: multi-point clusters in (T-band × σ-segment) keep
 * their lowest-yVal member; isolated singletons are σ-refined at fixed T to
 * find the nearest local |f| minimum, then kept. Output streams into a
 * temporary 1.5×-size scatter layer; on completion an archive entry named
 * `culled · …` appears in the Archived scans list.
 */
export function CullAndRecoverPanel({ ctx }: CullAndRecoverPanelProps) {
  const model = asCullCapable(ctx.visualizationModel);
  const [tTol, setTTol] = useState<string>(String(DEFAULTS.tTol));
  const [sigmaGap, setSigmaGap] = useState<string>(String(DEFAULTS.sigmaGap));
  const [refineDelta, setRefineDelta] = useState<string>(String(DEFAULTS.refineDelta));
  const [refineSamples, setRefineSamples] = useState<string>(String(DEFAULTS.refineSamples));
  const [, forceTick] = useState(0);

  // Poll progress while running so the count updates without depending on
  // toolbox refresh cadence.
  useEffect(() => {
    if (model === null) return;
    let raf = 0;
    const loop = (): void => {
      if (model.isCullRunning()) {
        forceTick((n) => n + 1);
        raf = window.requestAnimationFrame(loop);
      }
    };
    raf = window.requestAnimationFrame(loop);
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [model]);

  const onRun = useCallback(() => {
    if (model === null) return;
    void model.runCullAndRecover({
      tTol: Math.max(0, parseFloat(tTol) || DEFAULTS.tTol),
      sigmaGap: Math.max(0, parseFloat(sigmaGap) || DEFAULTS.sigmaGap),
      refineDelta: Math.max(0, parseFloat(refineDelta) || DEFAULTS.refineDelta),
      refineSamples: Math.max(2, Math.round(parseFloat(refineSamples) || DEFAULTS.refineSamples)),
    });
  }, [model, tTol, sigmaGap, refineDelta, refineSamples]);

  const onCancel = useCallback(() => {
    model?.cancelCullAndRecover();
  }, [model]);

  if (model === null) return <div style={{ fontSize: 11, color: "#888" }}>Cull unavailable</div>;

  const running = model.isCullRunning();
  const progress = model.getCullProgress();

  const labeledInput = (
    label: string,
    value: string,
    setter: (v: string) => void,
    placeholder?: string,
  ) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
      <span style={{ color: "#bbb", width: 110 }}>{label}</span>
      <input
        className="zest-value-input"
        type="number"
        value={value}
        onChange={(e) => setter(e.target.value)}
        style={{ flex: 1 }}
        placeholder={placeholder}
        disabled={running}
      />
    </div>
  );

  return (
    <div style={{ padding: "4px 0", fontSize: 11 }}>
      {labeledInput("T tolerance", tTol, setTTol)}
      {labeledInput("σ gap", sigmaGap, setSigmaGap)}
      {labeledInput("Refine δ", refineDelta, setRefineDelta)}
      {labeledInput("Refine samples", refineSamples, setRefineSamples)}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
        {running ? (
          <button type="button" onClick={onCancel} style={{ fontSize: 11, padding: "3px 8px" }}>
            Cancel
          </button>
        ) : (
          <button type="button" onClick={onRun} style={{ fontSize: 11, padding: "3px 8px" }}>
            Run cull + recover
          </button>
        )}
        <span style={{ fontSize: 10, color: "#888" }}>
          {running ? `${String(progress.done)} points kept` : "Idle"}
        </span>
      </div>
    </div>
  );
}

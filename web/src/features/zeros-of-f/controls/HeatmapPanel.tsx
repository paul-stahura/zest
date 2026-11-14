import { useEffect, useState } from "react";

import type { DisplayControlsState } from "@/features/zeros-of-f/types";
import type { ToolboxContext, VisualizationModel } from "@/shared/visualization/contracts";

interface HeatmapCapableModel {
  getDisplayState: () => DisplayControlsState;
  setShowPhaseHeatmap: (show: boolean) => void;
  setHeatmapFamily: (family: "legAngle" | "legAngleOut" | "legRatio" | "sum1R1Angle") => void;
  setHeatmapRForm: (rForm: "ak" | "ps") => void;
  setHeatmapDensitySigma: (density: number) => void;
  setHeatmapDensityT: (density: number) => void;
  setHeatmapTilesT: (tiles: number) => void;
  getHeatmapBounds: () => { sigmaMin: number; sigmaMax: number; tMin: number; tMax: number };
  setHeatmapBrightness: (b: number) => void;
  rebuildPhaseHeatmap: () => void;
  getHeatmapProgress: () => number;
  isHeatmapBuilding: () => boolean;
  saveCurrentHeatmap: () => Promise<boolean>;
  loadSavedHeatmap: () => Promise<boolean>;
  clearSavedHeatmap: () => Promise<void>;
}

function asHeatmapModel(m: VisualizationModel): HeatmapCapableModel | null {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- methods checked below.
  const c = m as unknown as Partial<HeatmapCapableModel>;
  if (
    typeof c.getDisplayState === "function" &&
    typeof c.setShowPhaseHeatmap === "function" &&
    typeof c.setHeatmapFamily === "function" &&
    typeof c.setHeatmapRForm === "function" &&
    typeof c.setHeatmapDensitySigma === "function" &&
    typeof c.setHeatmapDensityT === "function" &&
    typeof c.setHeatmapTilesT === "function" &&
    typeof c.getHeatmapBounds === "function" &&
    typeof c.setHeatmapBrightness === "function" &&
    typeof c.rebuildPhaseHeatmap === "function" &&
    typeof c.getHeatmapProgress === "function" &&
    typeof c.isHeatmapBuilding === "function" &&
    typeof c.saveCurrentHeatmap === "function" &&
    typeof c.loadSavedHeatmap === "function" &&
    typeof c.clearSavedHeatmap === "function"
  ) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- methods just verified above.
    return c as HeatmapCapableModel;
  }
  return null;
}

const DENSITY_OPTIONS_SIGMA: Array<{ label: string; value: number }> = [
  { label: "coarse (10 px/unit)", value: 10 },
  { label: "medium (25 px/unit)", value: 25 },
  { label: "fine (50 px/unit)", value: 50 },
  { label: "very fine (100 px/unit)", value: 100 },
  { label: "ultra fine (200 px/unit)", value: 200 },
  // "max" requests far more px/unit than will fit; the model's per-tile clamp
  // (16384) ends up being the binding constraint, so each tile fills exactly
  // to the GPU's per-texture cap regardless of bounds.
  { label: "max (per-tile cap)", value: 16384 },
];

const DENSITY_OPTIONS_T: Array<{ label: string; value: number }> = [
  { label: "coarse (10 px/unit)", value: 10 },
  { label: "medium (25 px/unit)", value: 25 },
  { label: "fine (50 px/unit)", value: 50 },
  { label: "very fine (100 px/unit)", value: 100 },
  { label: "ultra fine (200 px/unit)", value: 200 },
  { label: "extreme (500 px/unit)", value: 500 },
  { label: "very extreme (1000 px/unit)", value: 1000 },
  { label: "max (per-tile cap)", value: 16384 },
];

const TILES_T_OPTIONS: Array<{ label: string; value: number }> = [
  { label: "1 (single image)", value: 1 },
  { label: "5", value: 5 },
  { label: "10", value: 10 },
  { label: "20", value: 20 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
];

// Labels match the SCAN dropdown — the heatmap calls the same
// `fScaledComponentsBatch` so the f-formulas are identical. Internal variant
// keys ("legAngle" / "legAngleOut" / "legRatio") are unchanged.
const FAMILY_OPTIONS: Array<{ label: string; value: "legAngle" | "legAngleOut" | "legRatio" | "sum1R1Angle" }> = [
  { label: "∠(Σ₁+R₁, Σ₂+R₂) = π  (antialigned)", value: "legAngle" },
  { label: "∠(Σ₁+R₁, Σ₂+R₂) = 0  (aligned)", value: "legAngleOut" },
  { label: "|Σ₁+R₁| = |Σ₂+R₂|", value: "legRatio" },
  { label: "∠(Σ₁, R₁) = π  (antialigned)", value: "sum1R1Angle" },
];

/**
 * Heatmap accordion panel. Renders a textured plane behind the scan scatter
 * showing the φ field (or |f|) of the selected leg-pair variant. Recompute
 * is user-triggered via Refresh — recomputing every frame would be too
 * expensive for a 400×400+ grid.
 */
export function HeatmapPanel({ ctx }: { ctx: ToolboxContext }) {
  const model = asHeatmapModel(ctx.visualizationModel);
  // Per-frame progress poll. Only runs while a build is in flight so it
  // doesn't churn the React tree when idle.
  const [progress, setProgress] = useState<number>(model?.getHeatmapProgress() ?? 1);
  const [building, setBuilding] = useState<boolean>(model?.isHeatmapBuilding() ?? false);
  useEffect(() => {
    if (model === null) return;
    let raf = 0;
    const tick = (): void => {
      const p = model.getHeatmapProgress();
      const b = model.isHeatmapBuilding();
      setProgress((prev) => (prev === p ? prev : p));
      setBuilding((prev) => (prev === b ? prev : b));
      raf = window.requestAnimationFrame(tick);
    };
    tick();
    return () => window.cancelAnimationFrame(raf);
  }, [model]);
  if (model === null) return <div style={{ fontSize: 11, color: "#888" }}>Heatmap unavailable</div>;
  const display = model.getDisplayState();

  const rowStyle = { display: "flex", alignItems: "center", gap: 6, padding: "2px 0" } as const;
  const labelStyle = { fontSize: 11, color: "#bbb", width: 80 } as const;
  const selectStyle = { fontSize: 11, padding: "2px 4px", flex: 1 } as const;

  return (
    <div style={{ padding: "4px 0", fontSize: 11 }}>
      <label className="zest-toggle-label">
        <span className="zest-label">Show heatmap</span>
        <span className="zest-toggle-track">
          <input
            type="checkbox"
            className="zest-toggle-input"
            checked={display.showPhaseHeatmap}
            onChange={(e) => model.setShowPhaseHeatmap(e.target.checked)}
          />
          <span className="zest-toggle-track-bg" />
          <span className="zest-toggle-thumb-dot" />
        </span>
      </label>

      <div style={rowStyle}>
        <span style={labelStyle}>f family</span>
        <select
          value={display.heatmapFamily}
          onChange={(e) => model.setHeatmapFamily(e.target.value as "legAngle" | "legAngleOut" | "legRatio")}
          style={selectStyle}
        >
          {FAMILY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>R form</span>
        <select
          value={display.heatmapRForm}
          onChange={(e) => model.setHeatmapRForm(e.target.value as "ak" | "ps")}
          style={selectStyle}
        >
          <option value="ak">Rak</option>
          <option value="ps">Rps</option>
        </select>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>σ density</span>
        <select
          value={display.heatmapDensitySigma}
          onChange={(e) => model.setHeatmapDensitySigma(Number(e.target.value))}
          style={selectStyle}
        >
          {DENSITY_OPTIONS_SIGMA.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>T density</span>
        <select
          value={display.heatmapDensityT}
          onChange={(e) => model.setHeatmapDensityT(Number(e.target.value))}
          style={selectStyle}
        >
          {DENSITY_OPTIONS_T.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>T tiles</span>
        <select
          value={display.heatmapTilesT}
          onChange={(e) => model.setHeatmapTilesT(Number(e.target.value))}
          style={selectStyle}
        >
          {TILES_T_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>brightness</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={display.heatmapBrightness}
          onChange={(e) => model.setHeatmapBrightness(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: 10, color: "#888", fontFamily: "monospace", width: 30, textAlign: "right" }}>
          {display.heatmapBrightness.toFixed(2)}
        </span>
      </div>

      {/* Bounds come from the scan controls — show them read-only here so
          the user can confirm the heatmap will paint over the same region. */}
      {(() => {
        const b = model.getHeatmapBounds();
        const fmt = (n: number): string => Number.isFinite(n) ? n.toFixed(2) : "—";
        const valStyle = { fontSize: 11, color: "#ddd", fontFamily: "monospace", flex: 1 } as const;
        return (
          <>
            <div style={rowStyle}>
              <span style={labelStyle}>σ bounds</span>
              <span style={valStyle}>{`[${fmt(b.sigmaMin)}, ${fmt(b.sigmaMax)}]`}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>T bounds</span>
              <span style={valStyle}>{`[${fmt(b.tMin)}, ${fmt(b.tMax)}]`}</span>
            </div>
          </>
        );
      })()}

      <div style={{ ...rowStyle, justifyContent: "flex-end", paddingTop: 6, gap: 4 }}>
        <button
          type="button"
          className="zest-button"
          onClick={() => void model.loadSavedHeatmap()}
          disabled={building}
          title="Restore the saved heatmap from this browser's IndexedDB"
        >
          Load
        </button>
        <button
          type="button"
          className="zest-button"
          onClick={() => void model.saveCurrentHeatmap()}
          disabled={building}
          title="Save the current heatmap to IndexedDB (single slot — overwrites)"
        >
          Save
        </button>
        <button
          type="button"
          className="zest-button"
          onClick={() => void model.clearSavedHeatmap()}
          disabled={building}
          title="Forget the saved heatmap (the on-screen one is kept)"
        >
          Clear
        </button>
        <button
          type="button"
          className="zest-button"
          onClick={() => model.rebuildPhaseHeatmap()}
          disabled={building}
        >
          {building ? "Building…" : "Refresh"}
        </button>
      </div>

      {/* Progress bar — only meaningful while a build is in flight, but the
          track stays visible (full + green) when idle so the user knows it's
          there. */}
      <div style={{ paddingTop: 6 }}>
        <div
          style={{
            position: "relative",
            height: 8,
            background: "#1c2230",
            border: "1px solid #2c3340",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: `${(progress * 100).toFixed(1)}%`,
              background: building ? "#3aa0ff" : "#3a8a3a",
              transition: building ? "none" : "width 200ms ease",
            }}
          />
        </div>
        <div style={{ fontSize: 10, color: "#888", paddingTop: 2, textAlign: "right", fontFamily: "monospace" }}>
          {building ? `${(progress * 100).toFixed(0)}%` : "ready"}
        </div>
      </div>

      <div style={{ fontSize: 10, color: "#666", paddingTop: 4 }}>
        Recomputes the texture for the current viewport. Heavy at high
        resolution (~1–4 s for 800×800).
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";

import type { DataFitTransform } from "@/features/zeros-of-f/layers/dataFitGroup";
import type { DisplayControlsState } from "@/features/zeros-of-f/types";
import { fracTKeptByDisplay } from "@/shared/math/zerosOfF/fracTDisplayFilter";
import type { OrthographicPanZoomSceneController } from "@/shared/rendering/orthographicPanZoomSceneController";
import type { SceneController, ToolboxContext, VisualizationModel } from "@/shared/visualization/contracts";

interface FracTHistogramPanelProps {
  ctx: ToolboxContext;
}

interface HistogramCapableModel {
  forEachVisibleScatterPoint: (cb: (sigma: number, t: number, yVal: number) => void) => void;
  getDisplayState: () => DisplayControlsState;
  getDataFitTransform: () => DataFitTransform;
  getSceneController: () => SceneController;
}

function asHistogramCapable(m: VisualizationModel): HistogramCapableModel | null {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- duck-typing avoids HMR class-identity drift; methods checked below.
  const c = m as unknown as Partial<HistogramCapableModel>;
  if (
    typeof c.forEachVisibleScatterPoint === "function" &&
    typeof c.getDisplayState === "function" &&
    typeof c.getDataFitTransform === "function" &&
    typeof c.getSceneController === "function"
  ) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- methods just verified above.
    return c as HistogramCapableModel;
  }
  return null;
}

function asPanZoomController(c: SceneController): OrthographicPanZoomSceneController | null {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- duck-typing for HMR safety; methods checked below.
  const cand = c as unknown as Partial<OrthographicPanZoomSceneController>;
  if (typeof cand.getCameraBounds === "function" && typeof cand.getCanvasSize === "function") {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- methods just verified above.
    return cand as OrthographicPanZoomSceneController;
  }
  return null;
}

const BINS = 100;
/** Polling cadence for view-bound histogram refresh. Matches Python's 2 s tick. */
const REFRESH_INTERVAL_MS = 500;

interface HistogramResult {
  counts: Uint32Array;
  total: number;
  /** Visible σ window used for filtering. */
  sigmaRange: [number, number];
  /** Visible T window used for filtering. */
  tRange: [number, number];
}

/**
 * Bins `frac(T) = T - floor(T)` into 100 buckets [0.00, 0.01, …, 0.99] for
 * every recorded point that falls inside the current camera viewport.
 *
 * Now that the scan algorithm only records actual zeros (after the Φ filter),
 * there is no per-point classification to apply — every point is counted.
 */
function readZerosBounds(ctrl: OrthographicPanZoomSceneController): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  if ("getZerosCameraBounds" in ctrl && typeof ctrl.getZerosCameraBounds === "function") {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- verified method above.
    return (ctrl as { getZerosCameraBounds: () => { left: number; right: number; top: number; bottom: number } }).getZerosCameraBounds();
  }
  return ctrl.getCameraBounds();
}

function computeHistogram(
  model: HistogramCapableModel,
  ctrl: OrthographicPanZoomSceneController,
): HistogramResult {
  const display = model.getDisplayState();
  const fit = model.getDataFitTransform();
  const cam = readZerosBounds(ctrl);
  const safeSx = fit.scaleX !== 0 ? fit.scaleX : 1;
  const safeSy = fit.scaleY !== 0 ? fit.scaleY : 1;

  // Map camera (world-space) bounds back to data-space (σ, T). When yAxisMode
  // is "fracT" the scatter stores y = t%1 in data space, but the histogram
  // works on raw T regardless — fracT mode just affects rendering. We still
  // use the y-axis viewport to filter, treating it as a fractional window.
  const sigmaLo = (cam.left - fit.offsetX) / safeSx;
  const sigmaHi = (cam.right - fit.offsetX) / safeSx;
  const yLo = (cam.bottom - fit.offsetY) / safeSy;
  const yHi = (cam.top - fit.offsetY) / safeSy;
  const sLo = Math.min(sigmaLo, sigmaHi);
  const sHi = Math.max(sigmaLo, sigmaHi);
  const tLo = Math.min(yLo, yHi);
  const tHi = Math.max(yLo, yHi);
  const fracMode = display.yAxisMode === "fracT";

  // Match the scatter renderer's fracT-range filter so the histogram only
  // counts points that are actually drawn. Without this, dragging the
  // fracT-range slider hides points on the canvas but the histogram keeps
  // counting them — a confusing mismatch.
  const fracFilter = {
    kind: display.fracTFilterKind,
    rangeMin: display.fracTRangeMin,
    rangeMax: display.fracTRangeMax,
    rangeMode: display.fracTRangeMode,
    justOne: display.fracTJustOne,
    justOneDigits: display.fracTJustOneDigits,
    quarterEnabled: display.fracTQuarterEnabled,
    quarterPreset: display.fracTQuarterPreset,
  };

  const counts = new Uint32Array(BINS);
  let total = 0;
  model.forEachVisibleScatterPoint((sigma, t, _yVal) => {
    if (sigma < sLo || sigma > sHi) return;
    const yForCheck = fracMode ? t - Math.floor(t) : t;
    if (yForCheck < tLo || yForCheck > tHi) return;
    const frac = t - Math.floor(t);
    if (!fracTKeptByDisplay(t, fracFilter)) return;
    let idx = Math.floor(frac * BINS);
    if (idx < 0) idx = 0;
    else if (idx >= BINS) idx = BINS - 1;
    counts[idx]!++;
    total++;
  });
  return {
    counts,
    total,
    sigmaRange: [sLo, sHi],
    tRange: [tLo, tHi],
  };
}

export function FracTHistogramPanel({ ctx }: FracTHistogramPanelProps) {
  const model = useMemo(() => asHistogramCapable(ctx.visualizationModel), [ctx.visualizationModel]);
  const ctrl = useMemo(
    () => (model !== null ? asPanZoomController(model.getSceneController()) : null),
    [model],
  );
  const [result, setResult] = useState<HistogramResult | null>(null);
  const lastKeyRef = useRef<string>("");

  useEffect(() => {
    if (model === null || ctrl === null) {
      setResult(null);
      return;
    }
    let cancelled = false;
    const tick = (): void => {
      if (cancelled) return;
      const cam = readZerosBounds(ctrl);
      const fit = model.getDataFitTransform();
      const display = model.getDisplayState();
      // Cheap change-key: only recompute when something visible has changed.
      const key = `${cam.left.toFixed(4)},${cam.right.toFixed(4)},${cam.bottom.toFixed(4)},${cam.top.toFixed(4)}|${String(fit.scaleX)},${String(fit.scaleY)},${String(fit.offsetX)},${String(fit.offsetY)}|${display.yAxisMode}`;
      if (key !== lastKeyRef.current) {
        lastKeyRef.current = key;
        setResult(computeHistogram(model, ctrl));
      }
    };
    tick();
    const handle = window.setInterval(tick, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [model, ctrl]);

  if (model === null || ctrl === null) {
    return <div className="toolbox-storage-empty">Histogram unavailable</div>;
  }

  const width = 300;
  const height = 110;
  const plotTop = 6;
  const plotBottom = height - 16;
  const plotH = plotBottom - plotTop;
  const counts = result?.counts ?? new Uint32Array(BINS);
  let yMax = 1;
  for (let i = 0; i < BINS; i++) if (counts[i]! > yMax) yMax = counts[i]!;

  const tickLabels: Array<{ x: number; label: string }> = [
    { x: 0, label: ".00" },
    { x: 25, label: ".25" },
    { x: 50, label: ".50" },
    { x: 75, label: ".75" },
    { x: 99, label: ".99" },
  ];

  return (
    <div style={{ padding: "4px 0" }}>
      <div style={{ fontSize: 11, color: "#bbb", paddingBottom: 4 }}>
        {result === null
          ? "—"
          : `${String(result.total)} pts in view · σ∈[${result.sigmaRange[0].toFixed(1)}, ${result.sigmaRange[1].toFixed(1)}]`}
      </div>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${String(BINS)} ${String(height)}`}
        preserveAspectRatio="none"
        style={{ display: "block", border: "1px solid #444", background: "#0d0f14" }}
      >
        {Array.from({ length: BINS }, (_, i) => {
          const h = (counts[i]! / yMax) * plotH;
          return (
            <rect
              key={i}
              x={i + 0.05}
              y={plotBottom - h}
              width={0.9}
              height={h}
              fill="#cfd6e0"
            />
          );
        })}
        <line
          x1={0}
          x2={BINS}
          y1={plotBottom}
          y2={plotBottom}
          stroke="rgba(255,255,255,0.4)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {tickLabels.map((t) => (
          <line
            key={t.label}
            x1={t.x}
            x2={t.x}
            y1={plotBottom}
            y2={plotBottom + 3}
            stroke="rgba(255,255,255,0.6)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div style={{ position: "relative", height: 12, fontSize: 9, color: "#888" }}>
        {tickLabels.map((t) => (
          <span
            key={t.label}
            style={{
              position: "absolute",
              left: `${String((t.x / BINS) * 100)}%`,
              transform: "translateX(-50%)",
            }}
          >
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}

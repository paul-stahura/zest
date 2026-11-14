import { useEffect, useRef, useState } from "react";

import type { ZerosOfFSceneController } from "@/features/zeros-of-f/zerosOfFSceneController";
import type { DataFitTransform } from "@/features/zeros-of-f/layers/dataFitGroup";
import type { ZerosDisplayView, ZerosTabViewMode } from "@/features/zeros-of-f/types";

interface AxesOverlayProps {
  controller: ZerosOfFSceneController;
  getTransform: () => DataFitTransform;
  getYAxisMode: () => "T" | "fracT";
  getDisplayView: () => ZerosDisplayView;
  getDisplayedZeroCount: () => number;
  getTabViewMode: () => ZerosTabViewMode;
}

interface Tick {
  /** Pixel position along the relevant axis. */
  px: number;
  /** Label text. */
  label: string;
}

interface Snapshot {
  width: number;
  height: number;
  xTicks: Tick[];
  yTicks: Tick[];
  yLabel: string;
  displayView: ZerosDisplayView;
  displayedZeroCount: number;
  tabViewMode: ZerosTabViewMode;
}

/** Approximate target tick spacing in pixels. Used to pick the "nice" step. */
const TARGET_TICK_PX = 80;

/**
 * Returns a "nice" tick step ≈ targetSpan/desiredCount, snapped to 1/2/5×10ⁿ.
 * Standard d3-style algorithm.
 */
function niceStep(span: number, desiredCount: number): number {
  if (!Number.isFinite(span) || span <= 0 || desiredCount <= 0) return 1;
  const rough = span / desiredCount;
  const pow10 = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / pow10;
  const snap = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return snap * pow10;
}

function formatTick(value: number, step: number): string {
  if (step >= 1) return String(Math.round(value));
  const decimals = Math.min(6, Math.max(0, -Math.floor(Math.log10(step))));
  return value.toFixed(decimals);
}

function buildTicks(
  dataMin: number,
  dataMax: number,
  axisLengthPx: number,
  pxPerData: number,
  pxOrigin: number,
  flipY: boolean,
): Tick[] {
  const span = Math.abs(dataMax - dataMin);
  const desired = Math.max(2, Math.round(axisLengthPx / TARGET_TICK_PX));
  const step = niceStep(span, desired);
  const start = Math.ceil(dataMin / step) * step;
  const ticks: Tick[] = [];
  for (let v = start; v <= dataMax + 1e-9; v += step) {
    const offset = (v - dataMin) * pxPerData;
    const px = flipY ? pxOrigin - offset : pxOrigin + offset;
    ticks.push({ px, label: formatTick(v, step) });
  }
  return ticks;
}

/**
 * SVG overlay drawing labeled axes that **share the WebGL canvas's pixel
 * coordinate system**. The previous implementation reserved a 56-px left and
 * 32-px bottom margin for tick labels and used the inset rectangle to compute
 * tick positions — but the WebGL canvas filled the entire wrapper, rendering
 * data using the full pixel range. The mismatch caused tick labels to drift
 * relative to data as the user zoomed (linear drift between +56 px on the
 * left and −12 px on the right, varying with zoom).
 *
 * This version drops the inset entirely. Tick lines and labels both live in
 * full-canvas pixel space, exactly where WebGL renders the corresponding data
 * value. Labels sit near the canvas edges (x ≈ 0 for Y, y ≈ height for X);
 * they will overlap data near the corners but stay perfectly aligned with
 * the rendering. SVG `overflow: visible` keeps any text that hangs slightly
 * outside the SVG box still visible.
 */
export function AxesOverlay({
  controller,
  getTransform,
  getYAxisMode,
  getDisplayView,
  getDisplayedZeroCount,
  getTabViewMode,
}: AxesOverlayProps) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const lastKeyRef = useRef<string>("");

  useEffect(() => {
    let raf = 0;
    const tick = (): void => {
      const { width, height } = controller.getCanvasSize();
      const cam = controller.getZerosCameraBounds();
      const fit = getTransform();
      const mode = getYAxisMode();
      const tabViewMode = getTabViewMode();

      // Use full canvas dims — exactly the pixel range WebGL renders into.
      const plotW = Math.max(1, width);
      const plotH = Math.max(1, height);

      // World → CSS pixel mapping over the full canvas (WebGL math).
      const worldSpanX = cam.right - cam.left;
      const worldSpanY = cam.top - cam.bottom;
      const pxPerWorldX = plotW / worldSpanX;
      const pxPerWorldY = plotH / worldSpanY;

      // Visible data range = inverse of (data → world) over camera bounds.
      const safeScaleX = fit.scaleX !== 0 ? fit.scaleX : 1;
      const safeScaleY = fit.scaleY !== 0 ? fit.scaleY : 1;
      const dataXMin = (cam.left - fit.offsetX) / safeScaleX;
      const dataXMax = (cam.right - fit.offsetX) / safeScaleX;
      const dataYMin = (cam.bottom - fit.offsetY) / safeScaleY;
      const dataYMax = (cam.top - fit.offsetY) / safeScaleY;

      const pxPerDataX = pxPerWorldX * Math.abs(safeScaleX);
      const pxPerDataY = pxPerWorldY * Math.abs(safeScaleY);

      // X ticks origin at canvas pixel 0 (cam.left maps here in WebGL).
      const xTicks = buildTicks(dataXMin, dataXMax, plotW, pxPerDataX, 0, false);
      // Y ticks origin at canvas bottom (cam.bottom maps here; y-flip).
      const yTicks = buildTicks(dataYMin, dataYMax, plotH, pxPerDataY, plotH, true);

      const displayedZeroCount = getDisplayedZeroCount();
      const displayView = getDisplayView();
      const key = `${String(width)}x${String(height)}|${cam.left.toFixed(4)},${cam.right.toFixed(4)},${cam.bottom.toFixed(4)},${cam.top.toFixed(4)}|${String(fit.scaleX)},${String(fit.scaleY)},${String(fit.offsetX)},${String(fit.offsetY)}|${mode}|${displayView}|${tabViewMode}|${String(displayedZeroCount)}`;
      if (key !== lastKeyRef.current) {
        lastKeyRef.current = key;
        setSnap({
          width,
          height,
          xTicks,
          yTicks,
          yLabel: mode === "fracT" ? "frac T" : "T",
          displayView,
          displayedZeroCount,
          tabViewMode,
        });
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [controller, getTransform, getYAxisMode, getDisplayView, getDisplayedZeroCount, getTabViewMode]);

  if (snap === null) return null;

  return (
    <svg
      width={snap.width}
      height={snap.height}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 11,
        overflow: "visible",
      }}
    >
      {/* 2D ticks are wrong once the cloud is orbited; 3D uses the orbit bars. */}
      {snap.displayView !== "fracT3d" ? snap.xTicks.map((t, i) => (
        <g key={`x${String(i)}`}>
          <line
            x1={t.px}
            x2={t.px}
            y1={snap.height - 8}
            y2={snap.height}
            stroke="rgba(255,255,255,0.6)"
            strokeWidth={1}
          />
          <text
            x={t.px}
            y={snap.height - 12}
            textAnchor="middle"
            fill="rgba(255,255,255,0.85)"
          >
            {t.label}
          </text>
        </g>
      )) : null}

      {/* Y ticks: tick line + label at the WebGL pixel for this T/frac value. */}
      {snap.displayView !== "fracT3d" ? snap.yTicks.map((t, i) => (
        <g key={`y${String(i)}`}>
          <line
            x1={0}
            x2={6}
            y1={t.px}
            y2={t.px}
            stroke="rgba(255,255,255,0.6)"
            strokeWidth={1}
          />
          <text
            x={8}
            y={t.px - 2}
            textAnchor="start"
            fill="rgba(255,255,255,0.85)"
          >
            {t.label}
          </text>
        </g>
      )) : null}

      {snap.displayView !== "fracT3d" ? (
        <>
      {/* Axis legend — just labels for the axes themselves, not tied to data. */}
      <text
        x={snap.width / 2}
        y={snap.height - 28}
        textAnchor="middle"
        fill="rgba(255,255,255,0.95)"
        fontSize={12}
      >
        σ
      </text>
      <text
        x={4}
        y={snap.height / 2}
        textAnchor="middle"
        fill="rgba(255,255,255,0.95)"
        fontSize={12}
        transform={`rotate(-90, 4, ${String(snap.height / 2)})`}
      >
        {snap.yLabel}
      </text>
        </>
      ) : null}

      {/* Per-axis zoom hint. Top-right corner, low contrast. */}
      <text
        x={snap.width - 4}
        y={14}
        textAnchor="end"
        fill="rgba(255,255,255,0.45)"
        fontSize={10}
      >
        {snap.tabViewMode === "sum"
          ? "sum view · drag/wheel: spiral · click/⇧-drag: zero"
          : "wheel: T · ⇧+wheel: σ"}
      </text>
      <text
        x={snap.width - 4}
        y={28}
        textAnchor="end"
        fill="rgba(255,255,255,0.7)"
        fontSize={11}
      >
        {`${snap.displayedZeroCount.toLocaleString()} zeros`}
      </text>
    </svg>
  );
}

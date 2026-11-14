import type { ReactElement } from "react";

import { FRAC_T_SLICE_BOUNDARIES } from "@/shared/math/zerosOfF/fracTSliceBoundary";
import { fracTThousandthsBin } from "@/shared/math/zerosOfF/fracTDisplayFilter";

interface FracTSliceCoeffPanelProps {
  justOne: number;
}

const WIDTH = 300;
const PANEL_H = 92;
const LEFT = 36;
const RIGHT = 8;
const TOP = 8;
const BOTTOM = 16;
const PLOT_W = WIDTH - LEFT - RIGHT;
const PLOT_H = PANEL_H - TOP - BOTTOM;

const A_LOG_MIN = -2;
const A_LOG_MAX = 2;
const P_MIN = 1.15;
const P_MAX = 2.25;

function xOfFrac(fracT: number): number {
  return LEFT + (fracT / 0.999) * PLOT_W;
}

function yOfLogA(a: number): number {
  const t = (Math.log10(a) - A_LOG_MIN) / (A_LOG_MAX - A_LOG_MIN);
  return TOP + PLOT_H * (1 - Math.min(1, Math.max(0, t)));
}

function yOfP(p: number): number {
  const t = (p - P_MIN) / (P_MAX - P_MIN);
  return TOP + PLOT_H * (1 - Math.min(1, Math.max(0, t)));
}

function polyline(xs: number[], ys: number[]): string {
  return xs.map((x, i) => `${i === 0 ? "M" : "L"}${String(x)} ${String(ys[i]!)}`).join(" ");
}

const TICKS = [0, 0.25, 0.5, 0.75, 0.999];

function PlotFrame({
  yTicks,
}: {
  yTicks: Array<{ y: number; label: string }>;
}): ReactElement {
  return (
    <>
      <rect
        x={LEFT}
        y={TOP}
        width={PLOT_W}
        height={PLOT_H}
        fill="#0d0f14"
        stroke="#444"
      />
      {yTicks.map((tick) => (
        <text
          key={tick.label}
          x={LEFT - 4}
          y={tick.y + 3}
          textAnchor="end"
          fill="#888"
          fontSize={9}
        >
          {tick.label}
        </text>
      ))}
      {TICKS.map((frac) => (
        <line
          key={frac}
          x1={xOfFrac(frac)}
          x2={xOfFrac(frac)}
          y1={TOP + PLOT_H}
          y2={TOP + PLOT_H + 3}
          stroke="rgba(255,255,255,0.6)"
          strokeWidth={1}
        />
      ))}
    </>
  );
}

export function FracTSliceCoeffPanel({ justOne }: FracTSliceCoeffPanelProps): ReactElement {
  const xs = FRAC_T_SLICE_BOUNDARIES.map((row) => xOfFrac(row.bin / 1000));
  const aPath = polyline(xs, FRAC_T_SLICE_BOUNDARIES.map((row) => yOfLogA(row.a)));
  const pPath = polyline(xs, FRAC_T_SLICE_BOUNDARIES.map((row) => yOfP(row.p)));
  const markerX = xOfFrac(fracTThousandthsBin(justOne) / 1000);
  const row = FRAC_T_SLICE_BOUNDARIES[fracTThousandthsBin(justOne)];

  return (
    <div style={{ padding: "4px 0" }}>
      <div style={{ fontSize: 11, color: "#bbb", paddingBottom: 4 }}>
        {row === undefined
          ? "—"
          : `{T}=${(fracTThousandthsBin(justOne) / 1000).toFixed(3)} · a=${row.a.toPrecision(3)} · p=${row.p.toFixed(2)}`}
      </div>
      <div style={{ fontSize: 10, color: "#9ec1e6", paddingBottom: 2 }}>a (log)</div>
      <svg width={WIDTH} height={PANEL_H} style={{ display: "block" }}>
        <PlotFrame
          yTicks={[
            { y: yOfLogA(0.01), label: "0.01" },
            { y: yOfLogA(1), label: "1" },
            { y: yOfLogA(100), label: "100" },
          ]}
        />
        <path d={aPath} fill="none" stroke="#7eb8ff" strokeWidth={1.1} />
        <line x1={markerX} x2={markerX} y1={TOP} y2={TOP + PLOT_H} stroke="#f0c14b" strokeWidth={1} />
      </svg>
      <div style={{ fontSize: 10, color: "#e09aa8", padding: "8px 0 2px" }}>p</div>
      <svg width={WIDTH} height={PANEL_H} style={{ display: "block" }}>
        <PlotFrame
          yTicks={[
            { y: yOfP(1.2), label: "1.2" },
            { y: yOfP(1.61), label: "1.61" },
            { y: yOfP(2.2), label: "2.2" },
          ]}
        />
        <path d={pPath} fill="none" stroke="#e09aa8" strokeWidth={1.1} />
        <line x1={markerX} x2={markerX} y1={TOP} y2={TOP + PLOT_H} stroke="#f0c14b" strokeWidth={1} />
      </svg>
      <div style={{ position: "relative", height: 14, fontSize: 9, color: "#888" }}>
        {TICKS.map((frac) => (
          <span
            key={frac}
            style={{
              position: "absolute",
              left: `${String(((xOfFrac(frac) / WIDTH) * 100))}%`,
              transform: "translateX(-50%)",
            }}
          >
            {frac === 0.999 ? "1" : frac.toFixed(2)}
          </span>
        ))}
      </div>
    </div>
  );
}

import React from "react";

import { fracToHue, hsvToRgb, quarterSpectrumRgb } from "@/features/zeros-of-f/fracToHue";

export interface SpectrumBarProps {
  /**
   * When provided (zeros-of-f), renders the 4-primary / 4-secondary quarter-band
   * spectrum with this transition feather. When omitted (Big Sigma), keeps the
   * classic HSV smoothstep bar.
   */
  feather?: number;
}

/**
 * Renders the `[0, 1]` spectrum bar matching the scatter renderer.
 */
export function SpectrumBar(props: SpectrumBarProps): React.ReactElement {
  const height = 16;
  const useQuarterBands = props.feather !== undefined;
  const buckets = useQuarterBands ? 1001 : 500;

  const rects = [];
  for (let i = 0; i < buckets; i++) {
    const frac = useQuarterBands ? i / (buckets - 1) : i / buckets;
    const [r, g, b] = useQuarterBands
      ? quarterSpectrumRgb(frac, props.feather)
      : hsvToRgb(fracToHue(frac), 1, 1);
    const color = `rgb(${String(Math.round(r * 255))},${String(Math.round(g * 255))},${String(Math.round(b * 255))})`;
    rects.push(<rect key={i} x={i} y={0} width={1} height={height} fill={color} />);
  }

  const tickY1 = Math.round(height * 0.55);
  const tickPositions = useQuarterBands ? [] : [0.25, 0.5, 0.75];

  return (
    <div style={{ marginTop: "4px", marginBottom: "4px" }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${String(buckets)} ${String(height)}`}
        preserveAspectRatio="none"
        style={{ display: "block", border: "1px solid #444" }}
      >
        {rects}
        {tickPositions.map((v) => {
          const x = v * buckets;
          return (
            <line
              key={v}
              x1={x}
              x2={x}
              y1={tickY1}
              y2={height}
              stroke="rgba(255,255,255,0.85)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <div style={{ fontSize: "9px", color: "#666", display: "flex", justifyContent: "space-between", paddingTop: "2px" }}>
        <span>0.0</span>
        {useQuarterBands ? <span>0.25</span> : null}
        <span>0.5</span>
        {useQuarterBands ? <span>0.75</span> : null}
        <span>1.0</span>
      </div>
    </div>
  );
}

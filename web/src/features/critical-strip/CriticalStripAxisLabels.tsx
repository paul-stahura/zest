import type { ViewRange } from "@/features/critical-strip/criticalStripTypes";
import { SIGMA_AXIS_HEIGHT } from "@/features/critical-strip/criticalStripSceneController";

type Props = {
  viewRange: ViewRange;
  height: number;
};

const LABEL_COUNT = 8;

/**
 * Absolutely-positioned HTML Y-axis labels overlaid on the left edge of the canvas.
 */
export function CriticalStripAxisLabels({ viewRange, height }: Props) {
  const labels: Array<{ y: number; value: number }> = [];
  const { minY, maxY } = viewRange;
  const range = maxY - minY;
  if (range <= 0) return null;

  // Strip area starts at SIGMA_AXIS_HEIGHT (reserved for sigma ruler at top)
  const stripTop = SIGMA_AXIS_HEIGHT;
  const stripHeight = height - SIGMA_AXIS_HEIGHT;

  for (let i = 0; i <= LABEL_COUNT; i++) {
    const frac = i / LABEL_COUNT;
    const value = minY + frac * range;
    // Y-down: frac=0 (minValue) → bottom of strip, frac=1 (maxValue) → top of strip
    const y = stripTop + (1 - frac) * stripHeight;
    labels.push({ y, value });
  }

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "50px",
        height: `${String(height)}px`,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {labels.map(({ y, value }) => (
        <div
          key={value}
          style={{
            position: "absolute",
            left: 2,
            top: y - 6,
            fontSize: 9,
            fontFamily: "var(--font-mono)",
            color: "rgba(184,196,216,0.45)",
            whiteSpace: "nowrap",
            lineHeight: 1,
          }}
        >
          {value.toFixed(2)}
        </div>
      ))}
    </div>
  );
}

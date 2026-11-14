import type { ToolboxContext } from "@/shared/visualization/contracts";
import { SpectrumBar } from "@/features/zeros-of-f/controls/SpectrumBar";

interface SpectrumBarPanelProps {
  ctx: ToolboxContext;
}

/**
 * Shows the HSV spectrum gradient representing the frac(T) → hue mapping.
 */
export function SpectrumBarPanel(_props: SpectrumBarPanelProps) {
  return (
    <div style={{ padding: "0" }}>
      <SpectrumBar />
    </div>
  );
}

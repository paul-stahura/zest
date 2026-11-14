import { useEffect, useState } from "react";

import { useVisualizationRuntime } from "@/app/visualization/VisualizationRuntimeContext";
import { ZetaLogDerivModel } from "@/features/zeta-log-deriv/zetaLogDerivModel";
import type { RhoHalfLabel } from "@/features/zeta-log-deriv/rhoHalfDiagram";
import { ViewportCanvas } from "@/shared/rendering/ViewportCanvas";

/**
 * Argand plane of ζ′/ζ, with the complex value written in the corner.
 * The plane follows σ and T from the right-hand controls.
 */
export function ZetaLogDerivViewport() {
  const { model } = useVisualizationRuntime();
  if (!(model instanceof ZetaLogDerivModel)) return null;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 0, overflow: "hidden" }}>
      <ViewportCanvas controller={model.getSceneController()} />
      <ZetaLogDerivReadout model={model} />
      <RhoHalfLabels model={model} />
    </div>
  );
}

function ZetaLogDerivReadout(props: { model: ZetaLogDerivModel }) {
  const [text, setText] = useState(props.model.getReadout());
  const [meta, setMeta] = useState("");
  useEffect(() => {
    const pull = (): void => {
      const sample = props.model.getSample();
      setText(props.model.getReadout());
      const t = sample.t;
      setMeta(`σ = ${props.model.getSigma().toFixed(6)}    T = ${props.model.getIndex().toFixed(6)}    t = ${formatT(t)}`);
    };
    pull();
    const id = window.setInterval(pull, 100);
    return () => { window.clearInterval(id); };
  }, [props.model]);
  return (
    <div
      style={{
        position: "absolute",
        left: 12,
        top: 12,
        pointerEvents: "none",
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        lineHeight: 1.45,
        color: "var(--text, #d5d8e0)",
        fontVariantNumeric: "tabular-nums",
        textShadow: "0 1px 2px rgba(0,0,0,0.65)",
      }}
    >
      <div>ζ′/ζ = {text}</div>
      <div style={{ color: "var(--text-dim, #8a92ab)", fontSize: 11 }}>{meta}</div>
    </div>
  );
}

function RhoHalfLabels(props: { model: ZetaLogDerivModel }) {
  const [items, setItems] = useState<Array<RhoHalfLabel & { left: number; top: number }>>([]);
  useEffect(() => {
    const pull = (): void => {
      const size = props.model.getSceneController().getCanvasSize();
      const bounds = props.model.getSceneController().getCameraBounds();
      const width = Math.max(1e-9, bounds.right - bounds.left);
      const height = Math.max(1e-9, bounds.top - bounds.bottom);
      const next: Array<RhoHalfLabel & { left: number; top: number }> = [];
      for (const marker of props.model.getRhoHalfMarkers()) {
        const left = ((marker.x - bounds.left) / width) * size.width + marker.dx;
        const top = ((bounds.top - marker.y) / height) * size.height + marker.dy;
        if (left < -80 || top < -40 || left > size.width + 80 || top > size.height + 40) continue;
        next.push({ ...marker, left, top });
      }
      setItems(next);
    };
    pull();
    const id = window.setInterval(pull, 100);
    return () => { window.clearInterval(id); };
  }, [props.model]);
  return (
    <>
      {items.map((item) => (
        <div
          key={item.text}
          style={{
            position: "absolute",
            left: item.left,
            top: item.top,
            pointerEvents: "none",
            color: item.color,
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: "italic",
            fontSize: 14,
            lineHeight: 1,
            textShadow: "0 1px 2px rgba(0,0,0,0.8)",
            whiteSpace: "nowrap",
          }}
        >
          {item.text}
        </div>
      ))}
    </>
  );
}

function formatT(t: number): string {
  if (!Number.isFinite(t)) return "—";
  return t.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

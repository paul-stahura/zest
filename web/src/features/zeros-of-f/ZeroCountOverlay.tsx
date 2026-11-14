import { useEffect, useRef, useState } from "react";

import type { OrthographicPanZoomSceneController } from "@/shared/rendering/orthographicPanZoomSceneController";
import type { DataFitTransform } from "@/features/zeros-of-f/layers/dataFitGroup";
import type { ZeroCountBox } from "@/features/zeros-of-f/layers/zeroCountBoxesLayer";

interface Props {
  controller: OrthographicPanZoomSceneController;
  getTransform: () => DataFitTransform;
  getSnapshot: () => { boxes: ZeroCountBox[]; sigmaMin: number; sigmaMax: number; visible: boolean; maxCount: number };
}

interface Label {
  /** Screen-pixel x (CSS pixels). */
  px: number;
  /** Screen-pixel y (CSS pixels). */
  py: number;
  /** Display text. */
  text: string;
  /** Box index (used as React key). */
  index: number;
}

/**
 * Per-box count text label, anchored to the right edge of each yellow zero-
 * count box. The THREE.js layer owns the box outlines + inline graph; this
 * React overlay only paints the numeric labels because THREE has no native
 * text support.
 */
export function ZeroCountOverlay({ controller, getTransform, getSnapshot }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf = 0;
    const tick = (): void => {
      const snap = getSnapshot();
      if (!snap.visible || snap.boxes.length === 0) {
        if (visible) setVisible(false);
        if (labels.length > 0) setLabels([]);
        raf = window.requestAnimationFrame(tick);
        return;
      }
      const fit = getTransform();
      const { width: canvasW, height: canvasH } = controller.getCanvasSize();
      const cam = controller.getCameraBounds();
      const next: Label[] = [];
      for (const b of snap.boxes) {
        if (b.count === undefined) continue;
        const text = b.count === null ? "?" : `#${String(b.index)}: ${String(b.count)}`;
        // Right edge of box (data σ_max) → local σ via fit, → screen via cam.
        const dataX = snap.sigmaMax;
        const dataY = b.t + 0.5;
        const localX = dataX * fit.scaleX + fit.offsetX;
        const localY = dataY * fit.scaleY + fit.offsetY;
        // Local → NDC → CSS px. Y is flipped (camera top is +, screen y is -).
        const ndcX = (localX - cam.left) / (cam.right - cam.left);
        const ndcY = (cam.top - localY) / (cam.top - cam.bottom);
        const px = ndcX * canvasW;
        const py = ndcY * canvasH;
        if (px < -100 || px > canvasW + 100 || py < -50 || py > canvasH + 50) continue;
        next.push({ px, py, text, index: b.index });
      }
      // Cheap equality check: lengths + first/last text — avoids re-rendering
      // every frame when nothing visible changed.
      const same = next.length === labels.length
        && next.every((l, i) => labels[i]?.text === l.text && Math.abs((labels[i]?.px ?? 0) - l.px) < 0.5);
      if (!same) setLabels(next);
      if (!visible) setVisible(true);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [controller, getTransform, getSnapshot, labels, visible]);

  if (!visible) return null;
  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }}
    >
      {labels.map((l) => (
        <div
          key={l.index}
          style={{
            position: "absolute",
            left: `${String(l.px - 60)}px`,
            top: `${String(l.py - 6)}px`,
            width: 56,
            textAlign: "right",
            color: "#ffd700",
            fontSize: 9,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            textShadow: "0 0 3px rgba(0,0,0,0.9)",
            whiteSpace: "nowrap",
          }}
        >
          {l.text}
        </div>
      ))}
    </div>
  );
}

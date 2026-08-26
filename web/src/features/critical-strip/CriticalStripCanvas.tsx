import { useEffect, useRef } from "react";

import type { CriticalStripSceneController } from "@/features/critical-strip/criticalStripSceneController";

type Props = {
  controller: CriticalStripSceneController;
};

/**
 * Mounts the CriticalStripSceneController onto a canvas element and drives the render loop.
 */
export function CriticalStripCanvas({ controller }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (canvas === null || wrapper === null) return;

    controller.mount(canvas);

    let frameHandle = 0;
    const loop = (): void => {
      controller.frame(performance.now());
      frameHandle = window.requestAnimationFrame(loop);
    };
    frameHandle = window.requestAnimationFrame(loop);

    const updateSize = (): void => {
      const rect = wrapper.getBoundingClientRect();
      const dpr = window.devicePixelRatio ?? 1;
      controller.resize(rect.width, rect.height, dpr);
    };
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(wrapper);

    return () => {
      window.cancelAnimationFrame(frameHandle);
      observer.disconnect();
    };
  }, [controller]);

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", width: "100%", flex: "1 1 0", minHeight: 0 }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
      />
    </div>
  );
}

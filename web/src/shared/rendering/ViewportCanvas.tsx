import { useEffect, useRef } from "react";

import type { SceneController } from "@/shared/visualization/contracts";

type ViewportCanvasProps = {
  controller: SceneController;
};

/**
 * Owns the animation loop and resize wiring for a {@link SceneController} without disposing it (model owns lifecycle).
 */
export function ViewportCanvas({ controller }: ViewportCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (canvas === null || wrapper === null) {
      return;
    }

    controller.mount(canvas);

    let frameHandle = 0;
    const loop = (): void => {
      controller.frame(performance.now());
      frameHandle = window.requestAnimationFrame(loop);
    };
    frameHandle = window.requestAnimationFrame(loop);

    const resizeToWrapper = (): void => {
      const rect = wrapper.getBoundingClientRect();
      const dpr = window.devicePixelRatio ?? 1;
      controller.resize(rect.width, rect.height, dpr);
    };

    resizeToWrapper();

    const observer = new ResizeObserver(() => {
      resizeToWrapper();
    });
    observer.observe(wrapper);

    const onWindowResize = (): void => {
      resizeToWrapper();
    };
    window.addEventListener("resize", onWindowResize);

    return () => {
      window.cancelAnimationFrame(frameHandle);
      window.removeEventListener("resize", onWindowResize);
      observer.disconnect();
    };
  }, [controller]);

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%", height: "100%", minHeight: 0 }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
      />
    </div>
  );
}

import { useEffect, useRef } from "react";

import { JointAnglesSceneController } from "@/features/joint-angles/jointAnglesSceneController";
import type { SceneController } from "@/shared/visualization/contracts";

type JointAnglesViewportCanvasProps = {
  controller: SceneController;
};

function isJointAnglesController(c: SceneController): c is JointAnglesSceneController {
  return c instanceof JointAnglesSceneController;
}

/**
 * Dual-canvas viewport: WebGL layer for joint dots, transparent Canvas2D overlay for chrome.
 */
export function JointAnglesViewportCanvas({ controller }: JointAnglesViewportCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const glRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const glCanvas = glRef.current;
    const overlayCanvas = overlayRef.current;
    if (wrapper === null || glCanvas === null || overlayCanvas === null) return;

    if (isJointAnglesController(controller)) {
      controller.mountDual(glCanvas, overlayCanvas);
    } else {
      controller.mount(overlayCanvas);
    }

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
    const observer = new ResizeObserver(resizeToWrapper);
    observer.observe(wrapper);
    window.addEventListener("resize", resizeToWrapper);

    return () => {
      window.cancelAnimationFrame(frameHandle);
      window.removeEventListener("resize", resizeToWrapper);
      observer.disconnect();
    };
  }, [controller]);

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", width: "100%", height: "100%", minHeight: 0 }}
    >
      <canvas
        ref={glRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", zIndex: 0 }}
      />
      <canvas
        ref={overlayRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          zIndex: 1,
          touchAction: "none",
          background: "transparent",
        }}
      />
    </div>
  );
}

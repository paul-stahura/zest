import { useEffect, useRef, useState } from "react";

import type { ZerosOfFModel } from "@/features/zeros-of-f/zerosOfFModel";

import "./FracT3dOrbitBars.css";

interface FracT3dOrbitBarsProps {
  model: ZerosOfFModel;
}

/**
 * Horizontal yaw and vertical pitch strips for the 3D harvest. Pitch is a
 * rotated horizontal range so browsers cannot draw the native wide slider
 * across the top of the canvas.
 */
export function FracT3dOrbitBars({ model }: FracT3dOrbitBarsProps) {
  const [orbit, setOrbit] = useState(() => model.getOrbit());
  const [active, setActive] = useState(
    () => model.getDisplayView() === "fracT3d" && model.getTabViewMode() === "zeros",
  );
  const pitchWrapRef = useRef<HTMLDivElement>(null);
  const [pitchLen, setPitchLen] = useState(0);

  useEffect(() => {
    let raf = 0;
    const tick = (): void => {
      const next = model.getOrbit();
      // Keep the old object when nothing moved so React skips the re-render.
      setOrbit((prev) => (
        prev.yawDeg === next.yawDeg && prev.pitchDeg === next.pitchDeg ? prev : next
      ));
      setActive(model.getDisplayView() === "fracT3d" && model.getTabViewMode() === "zeros");
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [model]);

  useEffect(() => {
    const el = pitchWrapRef.current;
    if (el === null) return;
    const update = (): void => {
      setPitchLen(el.getBoundingClientRect().height);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="zest-orbit-bars">
      <div className="zest-orbit-hint">
        {"σ · T · {T} · drag to orbit · ⇧-drag to pan"}
      </div>
      <div className="zest-orbit-yaw-wrap">
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={orbit.yawDeg}
          aria-label="rotate around T"
          onChange={(e) => {
            model.setOrbit(Number(e.target.value), orbit.pitchDeg);
          }}
        />
      </div>
      <div className="zest-orbit-pitch-wrap" ref={pitchWrapRef}>
        <input
          type="range"
          min={-85}
          max={85}
          step={1}
          value={orbit.pitchDeg}
          aria-label="tilt around sigma"
          style={{ width: `${String(Math.max(0, pitchLen))}px` }}
          onChange={(e) => {
            model.setOrbit(orbit.yawDeg, Number(e.target.value));
          }}
        />
      </div>
    </div>
  );
}

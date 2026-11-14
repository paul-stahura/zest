import { useEffect, useRef, useState } from "react";

import {
  BIG_SIGMA_OVERLAY_X_TICKS,
  BIG_SIGMA_OVERLAY_Y_TICKS,
  BIG_SIGMA_ZEROS_VIEW,
  zerosViewToCss,
} from "@/shared/math/bigSigmaZerosWindow";

/**
 * Fixed σ / T ticks on the zeros overlay camera (not the spiral pan/zoom).
 */
export function BigSigmaAxisOverlay() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const apply = (): void => {
      const rect = el.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  const canvas = { width: size.width, height: size.height };
  const ready = size.width > 0 && size.height > 0;

  return (
    <div ref={ref} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {ready ? (
        <svg
          width={size.width}
          height={size.height}
          style={{
            position: "absolute",
            inset: 0,
            overflow: "visible",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 11,
          }}
        >
          {BIG_SIGMA_OVERLAY_X_TICKS.map((sigma) => {
            const css = zerosViewToCss(sigma, 0, BIG_SIGMA_ZEROS_VIEW, canvas);
            return (
              <g key={`x${String(sigma)}`}>
                <line
                  x1={css.x}
                  x2={css.x}
                  y1={size.height - 8}
                  y2={size.height}
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth={1}
                />
                <text
                  x={sigma === -500 ? css.x + 4 : css.x}
                  y={size.height - 12}
                  textAnchor={sigma === -500 ? "start" : "middle"}
                  fill="rgba(255,255,255,0.9)"
                >
                  {String(sigma)}
                </text>
              </g>
            );
          })}
          {BIG_SIGMA_OVERLAY_Y_TICKS.map((T) => {
            const css = zerosViewToCss(-500, T, BIG_SIGMA_ZEROS_VIEW, canvas);
            return (
              <g key={`y${String(T)}`}>
                <line
                  x1={0}
                  x2={8}
                  y1={css.y}
                  y2={css.y}
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth={1}
                />
                <text
                  x={10}
                  y={css.y + (T === 4000 ? 12 : -4)}
                  textAnchor="start"
                  fill="rgba(255,255,255,0.9)"
                >
                  {String(T)}
                </text>
              </g>
            );
          })}
        </svg>
      ) : null}
    </div>
  );
}

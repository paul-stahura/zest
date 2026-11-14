import { useEffect, useRef } from "react";

import "./FracTRangeSlider.css";

interface FracTRangeSliderProps {
  /** Lower handle value, 0..1. */
  min: number;
  /** Upper handle value, 0..1. */
  max: number;
  /** Highlight mode. "between" colors the bar segment between the handles;
   *  "outside" colors the two end-segments (0..min and max..1). Matches the
   *  fracT filter's behavior so the slider visually shows what's kept. */
  mode?: "between" | "outside";
  /** Called whenever either handle changes. The callback should clamp/order
   *  values; this component only enforces 0..1 bounds and lo ≤ hi locally. */
  onChange(min: number, max: number): void;
}

/**
 * Two `<input type="range">` elements overlaid on a shared track. The upper
 * input's pointer events flow through everywhere except its thumb, letting
 * the user grab whichever handle is closer to the click. A coloured "fill"
 * span between the handles shows the active range; a numeric readout sits
 * to the right.
 *
 * Used by the zeros-of-f Display accordion to filter the scatter to points
 * whose frac(T) lies inside the selected band.
 */
export function FracTRangeSlider({ min, max, mode = "between", onChange }: FracTRangeSliderProps) {
  const loRef = useRef<HTMLInputElement | null>(null);
  const hiRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (loRef.current !== null) loRef.current.value = String(min);
    if (hiRef.current !== null) hiRef.current.value = String(max);
  }, [min, max]);

  const handleLo = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const v = Math.max(0, Math.min(1, Number(e.target.value)));
    const newLo = Math.min(v, max);
    // Force the DOM value back to the clamped position so the visible
    // thumb can't run past the upper handle. Without this, the slider's
    // internal value tracks the user's drag while onChange reports the
    // clamped state, so the thumb appears to "stick" past the cap.
    if (loRef.current !== null && newLo !== v) loRef.current.value = String(newLo);
    onChange(newLo, max);
  };
  const handleHi = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const v = Math.max(0, Math.min(1, Number(e.target.value)));
    const newHi = Math.max(v, min);
    if (hiRef.current !== null && newHi !== v) hiRef.current.value = String(newHi);
    onChange(min, newHi);
  };

  const minPct = `${(min * 100).toFixed(2)}%`;
  const maxPct = `${(max * 100).toFixed(2)}%`;

  return (
    <div className="zest-control">
      <div className="zest-control-row">
        <span className="zest-label">fracT range</span>
        <span className="zest-frac-range-readout">
          [{min.toFixed(3)}, {max.toFixed(3)}]
        </span>
      </div>
      <div className="zest-frac-range">
        <span className="zest-frac-range-track" />
        {mode === "between" ? (
          <span
            className="zest-frac-range-fill"
            style={{ left: minPct, right: `${((1 - max) * 100).toFixed(2)}%` }}
          />
        ) : (
          <>
            <span
              className="zest-frac-range-fill"
              style={{ left: 0, right: `${((1 - min) * 100).toFixed(2)}%` }}
            />
            <span
              className="zest-frac-range-fill"
              style={{ left: maxPct, right: 0 }}
            />
          </>
        )}
        <input
          ref={loRef}
          type="range"
          min={0}
          max={1}
          step={0.001}
          defaultValue={min}
          onChange={handleLo}
          aria-label="fracT min"
        />
        <input
          ref={hiRef}
          type="range"
          min={0}
          max={1}
          step={0.001}
          defaultValue={max}
          onChange={handleHi}
          aria-label="fracT max"
        />
      </div>
    </div>
  );
}

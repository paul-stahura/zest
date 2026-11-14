import {
  fracTJustOneSnapped,
  type FracTJustOneDigits,
} from "@/shared/math/zerosOfF/fracTDisplayFilter";

import "./FracTRangeSlider.css";

interface FracTJustOneSliderProps {
  value: number;
  digits: FracTJustOneDigits;
  onValueChange(next: number): void;
}

/**
 * Single 0..1 slider whose first `digits` decimals pick a frac(T) bin.
 * Shown only in the "exact {T}" display mode.
 */
export function FracTJustOneSlider({
  value,
  digits,
  onValueChange,
}: FracTJustOneSliderProps) {
  const snapped = fracTJustOneSnapped(value, digits);
  const step = 10 ** -digits;
  return (
    <div className="zest-control">
      <div className="zest-control-row zest-frac-just-one-row">
        <span className="zest-label">{"exact {T}"}</span>
        <span className="zest-frac-range-readout">{snapped.toFixed(digits)}</span>
      </div>
      <div className="zest-frac-range zest-frac-just-one">
        <span className="zest-frac-range-track" />
        <span
          className="zest-frac-range-fill"
          style={{ left: 0, width: `${(snapped * 100).toFixed(2)}%` }}
        />
        <input
          type="range"
          min={0}
          max={1}
          step={step}
          value={snapped}
          onChange={(e) => {
            onValueChange(fracTJustOneSnapped(Number(e.target.value), digits));
          }}
          aria-label="exact fracT"
        />
      </div>
    </div>
  );
}

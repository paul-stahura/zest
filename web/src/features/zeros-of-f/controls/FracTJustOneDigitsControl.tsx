import type { ReactElement } from "react";

import {
  FRAC_T_JUST_ONE_DIGITS,
  type FracTJustOneDigits,
} from "@/shared/math/zerosOfF/fracTDisplayFilter";

import "./FracTRangeSlider.css";

interface FracTJustOneDigitsControlProps {
  value: FracTJustOneDigits;
  onChange(next: FracTJustOneDigits): void;
}

/**
 * Horizontal 1..4 radios for how many {T} decimals the exact slider matches.
 * Shown only in "all zeros with an exact {T}". Boundaries ignore this and
 * stay on the thousandths table.
 */
export function FracTJustOneDigitsControl({
  value,
  onChange,
}: FracTJustOneDigitsControlProps): ReactElement {
  return (
    <div className="zest-control">
      <div className="zest-control-row zest-frac-just-one-digits-row">
        <span className="zest-label">digits</span>
        <div className="zest-frac-digits-radios" role="radiogroup" aria-label="digits">
          {FRAC_T_JUST_ONE_DIGITS.map((digits) => (
            <label key={digits} className="zest-frac-digits-radio">
              <input
                type="radio"
                name="frac-t-just-one-digits"
                checked={value === digits}
                onChange={() => {
                  onChange(digits);
                }}
              />
              {digits}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

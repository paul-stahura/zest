import type { ReactElement } from "react";

import {
  FRAC_T_QUARTER_PAIR_PRESETS,
  FRAC_T_QUARTER_PRESETS,
  FRAC_T_THIRDS_PRESETS,
  type FracTQuarterPreset,
} from "@/shared/math/zerosOfF/fracTDisplayFilter";

import "./FracTRangeSlider.css";

const LABELS: Record<FracTQuarterPreset, string> = {
  ends: "0–.25 & .75–1",
  middle: ".25–.75",
  q0: "0–.25",
  q25: ".25–.50",
  q50: ".50–.75",
  q75: ".75–1",
  q25q75: ".25–.50 & .75–1",
  q0q50: "0–.25 & .50–.75",
  thirdsBetween: ".333 to .666 between",
  thirdsOutside: ".333 to .666 outside",
};

interface FracTQuarterRadiosProps {
  enabled: boolean;
  preset: FracTQuarterPreset;
  onEnabledChange(enabled: boolean): void;
  onPresetChange(preset: FracTQuarterPreset): void;
}

/**
 * Frac(T) band radios plus a checkbox. The first row is six single bands.
 * The row under it is the two opposite-quarter unions. The radios remember
 * a choice while the box is off; only a checked box replaces the slider.
 */
export function FracTQuarterRadios({
  enabled,
  preset,
  onEnabledChange,
  onPresetChange,
}: FracTQuarterRadiosProps): ReactElement {
  return (
    <div className="zest-control">
      <label className="zest-frac-quarter-enable">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            onEnabledChange(event.target.checked);
          }}
        />
        <span className="zest-label">only this band</span>
      </label>
      <div role="radiogroup" aria-label="frac T band">
        <div className="zest-frac-quarter-radios">
          {FRAC_T_QUARTER_PRESETS.map((id) => (
            <QuarterRadio
              key={id}
              id={id}
              preset={preset}
              onPresetChange={onPresetChange}
            />
          ))}
        </div>
        <div className="zest-frac-quarter-pair-row">
          {FRAC_T_QUARTER_PAIR_PRESETS.map((id) => (
            <QuarterRadio
              key={id}
              id={id}
              preset={preset}
              onPresetChange={onPresetChange}
            />
          ))}
        </div>
        <div className="zest-frac-quarter-pair-row">
          {FRAC_T_THIRDS_PRESETS.map((id) => (
            <QuarterRadio
              key={id}
              id={id}
              preset={preset}
              onPresetChange={onPresetChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function QuarterRadio({
  id,
  preset,
  onPresetChange,
}: {
  id: FracTQuarterPreset;
  preset: FracTQuarterPreset;
  onPresetChange(preset: FracTQuarterPreset): void;
}): ReactElement {
  return (
    <label className="zest-frac-quarter-radio">
      <input
        type="radio"
        name="frac-t-quarter"
        checked={preset === id}
        onChange={() => {
          onPresetChange(id);
        }}
      />
      <span>{LABELS[id]}</span>
    </label>
  );
}

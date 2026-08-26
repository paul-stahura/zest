import type { ToolboxControl } from "@/shared/visualization/contracts";
import { OptionToggle } from "@/shared/toolbox/OptionToggle";
import { RangeSlider } from "@/shared/toolbox/RangeSlider";

type RenderToolboxControlProps = {
  control: ToolboxControl;
};

export function RenderToolboxControl({ control }: RenderToolboxControlProps) {
  if (control.kind === "toggle") {
    return (
      <label className="zest-toggle-label">
        <span className="zest-label">{control.label}</span>
        <span className="zest-toggle-track">
          <input
            type="checkbox"
            className="zest-toggle-input"
            checked={control.value}
            onChange={(e) => control.onChange(e.target.checked)}
          />
          <span className="zest-toggle-track-bg" />
          <span className="zest-toggle-thumb-dot" />
        </span>
      </label>
    );
  }

  if (control.kind === "range-slider") {
    return (
      <RangeSlider
        label={control.label}
        value={control.value}
        defaultValue={control.defaultValue}
        min={control.min}
        max={control.max}
        step={control.step}
        onValueChange={control.onChange}
        onStepChange={control.onStepChange}
        onRangeChange={control.onRangeChange}
      />
    );
  }

  if (control.kind === "number") {
    const hasRange = control.min !== undefined && control.max !== undefined;
    return (
      <div className="zest-control">
        <div className="zest-control-row">
          <span className="zest-label">{control.label}</span>
          <input
            type="number"
            className="zest-value-input"
            value={control.value}
            min={control.min}
            max={control.max}
            step={control.step}
            // eslint-disable-next-line no-restricted-syntax -- input.value is always a string
            onChange={(e) => control.onChange(Number(e.target.value))}
          />
        </div>
        {hasRange ? (
          <input
            type="range"
            value={control.value}
            min={control.min}
            max={control.max}
            step={control.step}
            // eslint-disable-next-line no-restricted-syntax -- input.value is always a string
            onChange={(e) => control.onChange(Number(e.target.value))}
          />
        ) : null}
      </div>
    );
  }

  if (control.kind === "select") {
    return (
      <div className="zest-control">
        <span className="zest-label">{control.label}</span>
        <select
          className="zest-select"
          value={control.value}
          onChange={(e) => control.onChange(e.target.value)}
        >
          {control.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (control.kind === "color") {
    return (
      <div className="zest-color-wrap">
        <span className="zest-label">{control.label}</span>
        <input
          type="color"
          value={control.value}
          onChange={(e) => control.onChange(e.target.value)}
        />
      </div>
    );
  }

  if (control.kind === "action") {
    return (
      <button type="button" className="zest-button" onClick={() => control.run()}>
        {control.label}
      </button>
    );
  }

  if (control.kind === "display") {
    return (
      <div className="zest-display">
        <span className="zest-label">{control.label}</span>
        <span className="zest-display-value">{control.value}</span>
      </div>
    );
  }

  if (control.kind === "option-toggle") {
    return (
      <OptionToggle
        label={control.label}
        value={control.value}
        options={control.options}
        charWidth={control.charWidth}
        onChange={control.onChange}
      />
    );
  }

  if (control.kind === "custom") {
    return <>{control.render()}</>;
  }

  return null;
}

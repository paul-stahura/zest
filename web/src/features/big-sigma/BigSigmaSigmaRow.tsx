import { useEffect, useState } from "react";

type Props = {
  sigma: number;
  min: number;
  max: number;
  onSigmaChange: (v: number) => void;
  onRangeChange: (min: number, max: number) => void;
};

/**
 * Green σ slider above the σ range. Clicking either label sets σ = 1/2.
 */
export function BigSigmaSigmaRow({
  sigma,
  min,
  max,
  onSigmaChange,
  onRangeChange,
}: Props) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const [minText, setMinText] = useState(String(min));
  const [maxText, setMaxText] = useState(String(max));
  const [sigmaText, setSigmaText] = useState(sigma.toFixed(6));

  useEffect(() => { setMinText(String(min)); }, [min]);
  useEffect(() => { setMaxText(String(max)); }, [max]);
  useEffect(() => { setSigmaText(sigma.toFixed(6)); }, [sigma]);

  const commitRange = (): void => {
    const a = Number(minText);
    const b = Number(maxText);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) {
      setMinText(String(min));
      setMaxText(String(max));
      return;
    }
    onRangeChange(a, b);
  };

  const commitSigma = (): void => {
    const n = Number(sigmaText);
    if (!Number.isFinite(n)) {
      setSigmaText(sigma.toFixed(6));
      return;
    }
    onSigmaChange(n);
  };

  const setHalf = (): void => { onSigmaChange(0.5); };

  return (
    <div className="zest-control">
      <div className="zest-control-row" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          type="button"
          className="zest-label"
          title="Set σ = 1/2"
          onClick={setHalf}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          σ
        </button>
        <input
          type="range"
          className="zest-big-sigma-green"
          min={lo}
          max={hi}
          step={0.001}
          value={Math.min(hi, Math.max(lo, sigma))}
          onChange={(e) => onSigmaChange(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <input
          type="number"
          className={sigma > -1 ? "zest-value-input zest-big-sigma-sigma-above-minus-one" : "zest-value-input"}
          value={sigmaText}
          step={0.001}
          title="current σ"
          style={{ width: 88 }}
          onChange={(e) => setSigmaText(e.target.value)}
          onBlur={commitSigma}
          onKeyDown={(e) => { if (e.key === "Enter") commitSigma(); }}
        />
      </div>
      <div className="zest-control-row" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          type="button"
          className="zest-label"
          title="Set σ = 1/2"
          onClick={setHalf}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          σ range
        </button>
        <input
          type="number"
          className="zest-value-input"
          value={minText}
          step="any"
          title="σ min"
          style={{ width: 64 }}
          onChange={(e) => setMinText(e.target.value)}
          onBlur={commitRange}
          onKeyDown={(e) => { if (e.key === "Enter") commitRange(); }}
        />
        <input
          type="number"
          className="zest-value-input"
          value={maxText}
          step="any"
          title="σ max"
          style={{ width: 64 }}
          onChange={(e) => setMaxText(e.target.value)}
          onBlur={commitRange}
          onKeyDown={(e) => { if (e.key === "Enter") commitRange(); }}
        />
      </div>
    </div>
  );
}

type FracProps = {
  value: number;
  onChange: (v: number) => void;
};

/** Same numeric + slider row as the integer-T control (default accent). */
export function BigSigmaFracTRow({ value, onChange }: FracProps) {
  return (
    <div className="zest-control">
      <div className="zest-control-row">
        <span className="zest-label">Fractional part of T</span>
        <input
          type="number"
          className="zest-value-input"
          value={value}
          min={0}
          max={0.999999}
          step={0.000001}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
      <input
        type="range"
        value={value}
        min={0}
        max={0.999999}
        step={0.000001}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export const BIG_SIGMA_ANIM_SPEEDS = [1, 2, 3, 4, 5] as const;
export type BigSigmaAnimSpeed = (typeof BIG_SIGMA_ANIM_SPEEDS)[number];

type SpeedProps = {
  value: BigSigmaAnimSpeed;
  onChange: (v: BigSigmaAnimSpeed) => void;
};

/**
 * One row of ±max radios for the annimate slider (default 3).
 */
export function BigSigmaAnimSpeedRadios({ value, onChange }: SpeedProps) {
  return (
    <div className="zest-control">
      <div
        className="zest-control-row"
        style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "nowrap" }}
      >
        {BIG_SIGMA_ANIM_SPEEDS.map((speed) => (
          <label
            key={speed}
            className="zest-label"
            style={{ display: "flex", alignItems: "center", gap: 4, margin: 0, whiteSpace: "nowrap" }}
          >
            <input
              type="radio"
              name="big-sigma-anim-speed"
              checked={value === speed}
              onChange={() => onChange(speed)}
            />
            {speed}
          </label>
        ))}
      </div>
    </div>
  );
}

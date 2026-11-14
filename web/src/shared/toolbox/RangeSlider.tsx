import { useCallback, useEffect, useRef, useState } from "react";

export type RangeSliderProps = {
  label: string;
  value: number;
  defaultValue?: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
  onStepChange?: (step: number) => void;
  onRangeChange?: (min: number, max: number) => void;
};

type EditingField = "value" | "range" | null;

type DragState = {
  startX: number;
  hasMoved: boolean;
};

/**
 * Maps a horizontal fraction of the slider track onto [min, max].
 * Fraction 0 is the left end, fraction 1 is the right end, snapped to step.
 */
export function valueAtSliderFraction(
  fraction: number,
  min: number,
  max: number,
  step: number,
): number {
  const clamped = Math.min(1, Math.max(0, fraction));
  const raw = min + clamped * (max - min);
  if (!(step > 0) || !Number.isFinite(step)) {
    return Math.min(max, Math.max(min, raw));
  }
  const snapped = min + Math.round((raw - min) / step) * step;
  return Math.min(max, Math.max(min, snapped));
}

type StepDragState = {
  accDx: number;
  startStep: number;
};

function formatStep(s: number): string {
  if (s >= 1) return "1";
  const exp = Math.round(Math.log10(s));
  if (exp >= -3) return s.toFixed(-exp); // "0.1", "0.01", "0.001"
  return `1e${exp}`; // "1e-4" … "1e-8"
}

function formatBound(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toPrecision(3);
}

// Snap to nearest power of 10 within [1e-8, 1].
function snapStep(raw: number): number {
  raw = Math.min(1, Math.max(1e-8, raw));
  const exp = Math.min(0, Math.max(-8, Math.round(Math.log10(raw))));
  return Math.pow(10, exp);
}

/**
 * Inline slider with a range row under the track.
 *
 * - Drag across the value section to travel from the low end of the range to the high end.
 *   Click without moving to type a value.
 * - Drag left/right on the step section to adjust sensitivity (snaps to powers of 10, clamped 1e-8–1).
 * - The range row shows the low end, the word Range, and the high end. Click either end to edit them.
 * - Tab cycles focus between min and max inputs in range-edit mode.
 */
export function RangeSlider({
  label,
  value,
  defaultValue,
  min,
  max,
  step,
  onValueChange,
  onStepChange,
  onRangeChange,
}: RangeSliderProps) {
  const [editing, setEditing] = useState<EditingField>(null);
  const [inputText, setInputText] = useState("");
  const [rangeMinText, setRangeMinText] = useState("");
  const [rangeMaxText, setRangeMaxText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const valueSectionRef = useRef<HTMLDivElement>(null);
  const minRangeRef = useRef<HTMLInputElement>(null);
  const maxRangeRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const stepDragRef = useRef<StepDragState | null>(null);

  useEffect(() => {
    if (editing === "value") {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (editing === "range") {
      minRangeRef.current?.focus();
      minRangeRef.current?.select();
    }
  }, [editing]);

  const valueFromClientX = useCallback(
    (clientX: number): number => {
      const section = valueSectionRef.current;
      if (section === null) return value;
      const rect = section.getBoundingClientRect();
      if (!(rect.width > 0)) return value;
      return valueAtSliderFraction((clientX - rect.left) / rect.width, min, max, step);
    },
    [max, min, step, value],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (editing !== null) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = { startX: e.clientX, hasMoved: false };
    },
    [editing],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (!drag.hasMoved && Math.abs(e.clientX - drag.startX) > 2) drag.hasMoved = true;
      if (drag.hasMoved) onValueChange(valueFromClientX(e.clientX));
    },
    [onValueChange, valueFromClientX],
  );

  const handlePointerUp = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && !drag.hasMoved) {
      setInputText(value.toFixed(8));
      setEditing("value");
    }
  }, [value]);

  const commitValue = useCallback(() => {
    const n = parseFloat(inputText);
    if (!isNaN(n)) onValueChange(Math.min(max, Math.max(min, n)));
    setEditing(null);
  }, [inputText, onValueChange, min, max]);

  const commitRange = useCallback(() => {
    const newMin = parseFloat(rangeMinText);
    const newMax = parseFloat(rangeMaxText);
    if (!isNaN(newMin) && !isNaN(newMax) && newMin < newMax) {
      onRangeChange?.(newMin, newMax);
      if (value < newMin || value > newMax) {
        onValueChange(Math.min(newMax, Math.max(newMin, value)));
      }
    }
    setEditing(null);
  }, [rangeMinText, rangeMaxText, onRangeChange, onValueChange, value]);

  // Only commit when focus leaves the range editor entirely.
  const handleRangeBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const rel = e.relatedTarget as Element | null;
      if (rel === minRangeRef.current || rel === maxRangeRef.current) return;
      commitRange();
    },
    [commitRange],
  );

  const startRangeEdit = useCallback(() => {
    if (!onRangeChange) return;
    setRangeMinText(String(min));
    setRangeMaxText(String(max));
    setEditing("range");
  }, [onRangeChange, min, max]);

  const handleStepPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!onStepChange) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.requestPointerLock?.();
      stepDragRef.current = { accDx: 0, startStep: step };
    },
    [step, onStepChange],
  );

  const handleStepPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = stepDragRef.current;
      if (!drag || !onStepChange) return;
      drag.accDx += e.movementX;
      // 100px = 1 order of magnitude
      const logDelta = drag.accDx / 100;
      onStepChange(snapStep(drag.startStep * Math.pow(10, logDelta)));
    },
    [onStepChange],
  );

  const handleStepPointerUp = useCallback(() => {
    stepDragRef.current = null;
    document.exitPointerLock?.();
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(`${label}=${value}`);
  }, [label, value]);

  const rangeEditable = onRangeChange !== undefined;

  return (
    <div className="rs-outer">
      <div className="rs-root">
        {/* Section 1: value — range-edit mode replaces entire content */}
        <div className="rs-value-wrap">
        <div
          ref={valueSectionRef}
          className={`rs-value-section${editing !== null ? " rs-value-section--editing" : ""}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div
            className="rs-progress"
            style={{ width: `${Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))}%` }}
          />

          {editing === "range" ? (
            <div className="rs-range-editor">
              <span className="rs-range-paren">(</span>
              <input
                ref={minRangeRef}
                className="rs-inline-input rs-inline-input--bound"
                value={rangeMinText}
                onChange={(e) => setRangeMinText(e.target.value)}
                onBlur={handleRangeBlur}
                onKeyDown={(e) => {
                  if (e.key === "Tab") { e.preventDefault(); maxRangeRef.current?.focus(); maxRangeRef.current?.select(); }
                  else if (e.key === "Enter") commitRange();
                  else if (e.key === "Escape") setEditing(null);
                }}
              />
              <span className="rs-range-sep">,</span>
              <input
                ref={maxRangeRef}
                className="rs-inline-input rs-inline-input--bound"
                value={rangeMaxText}
                onChange={(e) => setRangeMaxText(e.target.value)}
                onBlur={handleRangeBlur}
                onKeyDown={(e) => {
                  if (e.key === "Tab") { e.preventDefault(); minRangeRef.current?.focus(); minRangeRef.current?.select(); }
                  else if (e.key === "Enter") commitRange();
                  else if (e.key === "Escape") setEditing(null);
                }}
              />
              <span className="rs-range-paren">)</span>
            </div>
          ) : (
            <>
              {defaultValue !== undefined ? (
                <button
                  type="button"
                  className="rs-label rs-label--btn"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onValueChange(defaultValue)}
                >
                  {label}
                </button>
              ) : (
                <span className="rs-label">{label}</span>
              )}
              {editing === "value" ? (
                <input
                  ref={inputRef}
                  className="rs-inline-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onBlur={commitValue}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitValue();
                    else if (e.key === "Escape") setEditing(null);
                  }}
                />
              ) : (
                <span className="rs-value">{value.toFixed(8)}</span>
              )}
            </>
          )}

        </div>

          <button
            type="button"
            className="rs-copy-btn"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleCopy}
            title={`Copy ${label}=${value}`}
          >
            <svg width="7" height="8" viewBox="0 0 7 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0.5" y="1.5" width="5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1"/>
              <path d="M2 1.5V1a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v.5" stroke="currentColor" strokeWidth="1"/>
            </svg>
          </button>
        </div>

        {/* Section 2: step sensitivity — drag left/right to adjust, snaps to powers of 10 */}
        <div
          className={`rs-step-section${onStepChange ? " rs-step-section--draggable" : ""}`}
          onPointerDown={handleStepPointerDown}
          onPointerMove={handleStepPointerMove}
          onPointerUp={handleStepPointerUp}
        >
          <span className="rs-step-val">{formatStep(step)}</span>
        </div>
      </div>

      <div className="rs-range-row">
        <span
          className={`rs-bound-outer${rangeEditable ? " rs-bound-outer--editable" : ""}`}
          onClick={startRangeEdit}
        >
          {formatBound(min)}
        </span>
        <span
          className={`rs-range-caption${rangeEditable ? " rs-range-caption--editable" : ""}`}
          onClick={startRangeEdit}
        >
          Range (click to set)
        </span>
        <span
          className={`rs-bound-outer${rangeEditable ? " rs-bound-outer--editable" : ""}`}
          onClick={startRangeEdit}
        >
          {formatBound(max)}
        </span>
      </div>

    </div>
  );
}

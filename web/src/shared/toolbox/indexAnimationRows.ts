import { createElement, useEffect, useRef, useState } from "react";
import type React from "react";

/**
 * Integer part of T with a slider that ramps all the way to T=50000: the first ¾ of the
 * slider is identical to the main tab (0→100 over the first half, 100→500 over the next
 * quarter, for fine low-T control), then the last quarter ramps quadratically 500→50000.
 * Arrows still step past 50000.
 */
export function IntegerPartTHighRow(props: { intValue: number; onChange: (v: number) => void }) {
  const sliderToT = (s: number): number => {
    if (s <= 0.5) return 200 * s;
    if (s <= 0.75) return 100 + 1600 * (s - 0.5);
    const u = (s - 0.75) / 0.25;
    return 500 + 49500 * u * u;
  };
  const TToSlider = (T: number): number => {
    if (T <= 0) return 0;
    if (T <= 100) return T / 200;
    if (T <= 500) return 0.5 + (T - 100) / 1600;
    if (T <= 50000) return 0.75 + 0.25 * Math.sqrt((T - 500) / 49500);
    return 1;
  };
  const [text, setText] = useState(String(props.intValue));
  useEffect(() => { setText(String(props.intValue)); }, [props.intValue]);
  const commit = (): void => {
    const n = Number.parseFloat(text);
    if (Number.isFinite(n)) props.onChange(Math.max(0, Math.trunc(n)));
    else setText(String(props.intValue));
  };
  const arrowStyle = {
    width: 16, height: 16, padding: 0, lineHeight: "14px", fontSize: 10,
    border: "1px solid var(--border, #444)", borderRadius: 3,
    background: "transparent", color: "var(--text, #ccc)", cursor: "pointer",
  };
  const step = (d: number): void => { props.onChange(Math.max(0, props.intValue + d)); };
  return createElement(
    "div",
    { className: "zest-control" },
    createElement(
      "div",
      { className: "zest-control-row", style: { display: "flex", alignItems: "center", gap: 4 } },
      createElement("span", { className: "zest-label" }, "Integer part of T"),
      createElement("button", { style: arrowStyle, title: "−1", onClick: () => { step(-1); } }, "◀"),
      createElement("button", { style: arrowStyle, title: "+1", onClick: () => { step(1); } }, "▶"),
      createElement("input", {
        type: "number",
        className: "zest-value-input",
        style: { marginLeft: "auto" },
        value: text,
        min: 0,
        step: 1,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value),
        onBlur: commit,
        onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") commit(); },
      }),
    ),
    createElement("input", {
      type: "range",
      value: TToSlider(props.intValue),
      min: 0,
      max: 1,
      step: 0.001,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => { props.onChange(Math.round(sliderToT(Number.parseFloat(e.target.value)))); },
    }),
  );
}

/** Animation speed slider (red `zest-animate-slider`) that snaps back to 0 on release unless `hold`. */
export function AnimationSpeedRow(props: { value: number; range: number; hold: boolean; onChange: (v: number) => void }) {
  const [v, setV] = useState(props.value);
  const draggingRef = useRef(false);
  useEffect(() => { setV(props.value); }, [props.value]);
  const commit = (val: number): void => { if (!Number.isNaN(val)) { setV(val); props.onChange(val); } };
  const snapIfNoHold = (): void => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (!props.hold) commit(0);
  };
  return createElement(
    "div",
    { className: "zest-control" },
    createElement(
      "div",
      { className: "zest-control-row" },
      createElement("span", { className: "zest-label" }, "annimate"),
      createElement("input", {
        type: "number",
        className: "zest-value-input",
        value: v,
        min: -props.range, max: props.range, step: props.range / 100,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => commit(Number.parseFloat(e.target.value)),
      }),
    ),
    createElement("input", {
      type: "range",
      className: "zest-animate-slider",
      value: v,
      min: -props.range, max: props.range, step: props.range / 100,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => commit(Number.parseFloat(e.target.value)),
      onPointerDown: () => { draggingRef.current = true; },
      onPointerUp: snapIfNoHold,
      onPointerCancel: snapIfNoHold,
    }),
  );
}

/** Animation-mode dropdown (Coarse/Fine/Fast) on the left and a "hold" checkbox on the right. */
export function AnimationModeAndHoldRow(props: {
  mode: "coarse" | "fine" | "fast";
  hold: boolean;
  onModeChange: (m: "coarse" | "fine" | "fast") => void;
  onHoldChange: (h: boolean) => void;
}) {
  return createElement(
    "div",
    { className: "zest-control" },
    createElement(
      "div",
      { className: "zest-control-row", style: { display: "flex", gap: 8, alignItems: "center" } },
      createElement(
        "select",
        {
          className: "zest-select",
          value: props.mode,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
            const v = e.target.value;
            if (v === "coarse" || v === "fine" || v === "fast") props.onModeChange(v);
          },
          style: { flex: 1 },
        },
        createElement("option", { value: "coarse" }, "Coarse  (±3)"),
        createElement("option", { value: "fine" }, "Fine  (±0.1)"),
        createElement("option", { value: "fast" }, "Fast  (±8)"),
      ),
      createElement(
        "label",
        { style: { display: "flex", alignItems: "center", gap: 4, fontSize: "0.9em" } },
        createElement("input", {
          type: "checkbox",
          checked: props.hold,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => props.onHoldChange(e.target.checked),
        }),
        "hold",
      ),
    ),
  );
}

/** Animation speed slider range for each mode, shared by the tabs that animate T. */
export function animSpeedRangeFor(mode: "coarse" | "fine" | "fast"): number {
  return mode === "fine" ? 0.1 : mode === "fast" ? 8 : 3;
}

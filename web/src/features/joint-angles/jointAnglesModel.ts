import { createElement } from "react";
import type React from "react";

import { IndexTRow, ChampionsSlider, ZerosSlider, causticJoint, CHAMPIONS_T } from "@/features/main-workspace/spiralWorkspaceLayer";
import { indexToImag, imagToIndex } from "@/shared/math/zetaEms";
import {
  IntegerPartTHighRow,
  AnimationSpeedRow,
  AnimationModeAndHoldRow,
  animSpeedRangeFor,
} from "@/shared/toolbox/indexAnimationRows";
import type {
  SelectionState,
  ToolboxContext,
  ToolboxSection,
  VisualizationModel,
} from "@/shared/visualization/contracts";

import { JointAnglesSceneController, closestFareyFraction, type JointAnglesViewSource } from "@/features/joint-angles/jointAnglesSceneController";

const TWO_PI = 2 * Math.PI;

/** Signed turning angle ρ_n = fold(−I(T)·ln(n/(n−1))) ∈ (−π, π] for a single joint. */
function jointSignedAngle(n: number, T: number, usePolyImag: boolean): number {
  if (n <= 1) return 0;
  let w = (-indexToImag(T, usePolyImag) * Math.log(n / (n - 1))) % TWO_PI;
  if (w < 0) w += TWO_PI;
  return w > Math.PI ? w - TWO_PI : w;
}

/** Farey fraction represented by joint n: f = 2π·n(n−1)/I(T) (→ (n/T)² as T→∞). */
function jointFraction(n: number, T: number, usePolyImag: boolean): number {
  if (n <= 1) return 0;
  return (TWO_PI * n * (n - 1)) / indexToImag(T, usePolyImag);
}

/**
 * Joint picker slider (slider 1). Its range is the visible window's joints; the extreme
 * left is "off". Shows "joint n at angle ρ ≈ p/q".
 */
function JointPickRow(props: { value: number; min: number; max: number; label: string; onChange: (n: number) => void }) {
  return createElement(
    "div",
    { className: "zest-control" },
    createElement("div", { className: "zest-control-row" }, createElement("span", { className: "zest-label", style: { color: "#ffb020" } }, props.label)),
    createElement("input", {
      type: "range",
      value: props.value,
      min: props.min, max: Math.max(props.min + 1, props.max), step: 1,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => props.onChange(Number.parseInt(e.target.value, 10) || props.min),
    }),
  );
}

/**
 * Fraction picker slider (slider 2). Its range is the visible window's fractions; the
 * extreme left is "off". Shows "f ≈ p/q → joint n".
 */
function FractionPickRow(props: { value: number; min: number; max: number; step: number; label: string; onChange: (v: number) => void }) {
  return createElement(
    "div",
    { className: "zest-control" },
    createElement("div", { className: "zest-control-row" }, createElement("span", { className: "zest-label", style: { color: "#6ea8ff" } }, props.label)),
    createElement("input", {
      type: "range",
      value: props.value,
      min: props.min, max: Math.max(props.min + props.step, props.max), step: props.step,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => props.onChange(Number.parseFloat(e.target.value)),
    }),
  );
}

/**
 * Near-zero band slider (0…π); rings visible joints with |ρ| ≤ value. Styled like the
 * pickers, with an accelerating ramp: slider $[0,0.5]$ covers band $0\to0.02$ (fine
 * control), then $[0.5,1]$ ramps quadratically $0.02\to\pi$ (faster and faster).
 */
function NearZeroBandRow(props: { value: number; label: string; onChange: (v: number) => void }) {
  const HI = Math.PI;
  const MID = 0.02;
  const sliderToBand = (s: number): number => {
    if (s <= 0.5) return 2 * MID * s;             // 0 … MID
    const u = (s - 0.5) / 0.5;
    return MID + (HI - MID) * u * u;              // MID … π, accelerating
  };
  const bandToSlider = (b: number): number => {
    if (b <= 0) return 0;
    if (b <= MID) return b / (2 * MID);
    if (b >= HI) return 1;
    return 0.5 + 0.5 * Math.sqrt((b - MID) / (HI - MID));
  };
  return createElement(
    "div",
    { className: "zest-control" },
    createElement("div", { className: "zest-control-row" }, createElement("span", { className: "zest-label", style: { color: "#ffe000" } }, props.label)),
    createElement("input", {
      type: "range",
      value: bandToSlider(props.value),
      min: 0, max: 1, step: 0.001,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => props.onChange(sliderToBand(Number.parseFloat(e.target.value))),
    }),
  );
}

/** Dim-points slider (0…1): 0 = normal dots; 0→0.5 shrinks, 0.5→1 darkens to near-black. */
function DimPointsRow(props: { value: number; label: string; onChange: (v: number) => void }) {
  return createElement(
    "div",
    { className: "zest-control" },
    createElement("div", { className: "zest-control-row" }, createElement("span", { className: "zest-label" }, props.label)),
    createElement("input", {
      type: "range",
      value: props.value,
      min: 0, max: 1, step: 0.001,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => props.onChange(Number.parseFloat(e.target.value)),
    }),
  );
}

/**
 * One row for the fitted-curve overlay: label, the strand dropdown, then the p/q text
 * box (dropdown sits to the left of the box). "" = off.
 */
function OverlayPQRow(props: {
  label: string;
  labelColor: string;
  value: string;
  onChange: (s: string) => void;
  strandValue: string;
  strandOptions: { label: string; value: string }[];
  onStrandChange: (v: string) => void;
}) {
  return createElement(
    "div",
    { className: "zest-control" },
    createElement(
      "div",
      { className: "zest-control-row", style: { display: "flex", alignItems: "center", gap: 6 } },
      createElement("span", { className: "zest-label", style: { color: props.labelColor } }, props.label),
      createElement("input", {
        type: "text",
        className: "zest-value-input",
        value: props.value,
        placeholder: "2/3",
        style: { marginLeft: "auto", width: 60 },
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => props.onChange(e.target.value),
      }),
      createElement(
        "select",
        {
          className: "zest-select",
          title: "which strand to draw",
          value: props.strandValue,
          style: { width: 48 },
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => props.onStrandChange(e.target.value),
        },
        props.strandOptions.map((o) => createElement("option", { key: o.value, value: o.value }, o.label)),
      ),
    ),
  );
}

/**
 * Slimmed-down model for the standalone "Joint Angles" tab. Owns ONLY the state the
 * joint-angle viewer needs (T, imag mode, fast-angle path, animation, Farey overlay) and
 * never computes spiral geometry, joint positions, link lengths, ζ, or links past the
 * bisector. σ is intentionally omitted — joint ANGLES don't depend on it.
 */
export class JointAnglesModel implements VisualizationModel, JointAnglesViewSource {
  private index = CHAMPIONS_T[59] ?? 589.3967070983604;   // start at zeta champion #60
  private usePolyImag = false;  // log variant, matching computeZakSpiralGeometry
  private fast = true;
  private absolute = false;
  private animSpeed = 0;
  private animSpeedMode: "coarse" | "fine" | "fast" = "coarse";
  private animHold = false;
  private fareyMaxDenom = 5;    // 0 = no Farey overlay; m ≥ 2 shows F_m
  private pickJoint = 0;        // slider 1: 0 = off (absolute joint number)
  private pickFraction = 0;     // slider 2: 0 = off (absolute fraction)
  private overlayText = "2/3";  // fitted-curve overlay 1 (green) p/q (blank = off)
  private overlayStrand = 0;    // overlay 1 strand: 0 = none, -1 = all, 1..p = that strand
  private overlayText2 = "";    // fitted-curve overlay 2 (red) p/q (blank = off)
  private overlayStrand2 = 0;   // overlay 2 strand: 0 = none, -1 = all, 1..p = that strand
  private showFittedIntersections = false;  // white circles at overlay-1 × overlay-2 crossings
  private carriedMouseover = false;  // hover tooltip showing a joint's carried fraction
  private nearZeroBand = 0;          // highlight joints with |ρ| ≤ this (radians); 0 = off
  private showCyclesOverlay = false; // red cycles-per-joint overlay curve + axis
  private showCyclesPerT = false;    // blue cycles-per-T overlay curve + axis
  private showSmoothJoints = false;  // ring the smooth (small-prime) joints
  private dimPoints = 0;             // 0 = normal dots; higher shrinks then darkens them

  private readonly controller: JointAnglesSceneController;
  private toolboxRefresh: (() => void) | null = null;
  private toolboxRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private lastAnimToolboxRefresh = 0;

  constructor() {
    this.controller = new JointAnglesSceneController(this);
    // Retrack the pick sliders to the viewing window whenever it zooms/pans.
    this.controller.onViewChange = () => {
      this.controller.invalidate();
      this.toolboxRefresh?.();
    };
    // Keep T readout in sync while animating (matches main tab).
    this.controller.onAnimatingFrame = () => {
      const now = performance.now();
      if (now - this.lastAnimToolboxRefresh >= 250) {
        this.lastAnimToolboxRefresh = now;
        this.toolboxRefresh?.();
      }
    };
  }

  private get animSpeedRange(): number {
    return animSpeedRangeFor(this.animSpeedMode);
  }

  public initialize(): void { /* nothing to load */ }
  public dispose(): void {
    if (this.toolboxRefreshTimer !== null) {
      clearTimeout(this.toolboxRefreshTimer);
      this.toolboxRefreshTimer = null;
    }
    this.controller.dispose();
  }
  public getSceneController(): JointAnglesSceneController { return this.controller; }
  public getSelectionState(): SelectionState { return { activePoint: null }; }

  // ─── JointAnglesViewSource ──────────────────────────────────────────────────
  public getIndex(): number { return this.index; }
  public setIndex(v: number): void { this.index = Math.max(1, v); }
  public getUsePolyImag(): boolean { return this.usePolyImag; }
  public getFastJointAngles(): boolean { return this.fast; }
  public getAbsoluteJointAngles(): boolean { return this.absolute; }
  public getAnimSpeed(): number { return this.animSpeed; }
  public getFareyMaxDenom(): number { return this.fareyMaxDenom; }
  public getPickJoint(): number { return this.pickJoint; }
  public getPickFraction(): number { return this.pickFraction; }
  private parsePQ(text: string): { p: number; q: number } | null {
    const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(text);
    if (m === null) return null;
    let p = Number.parseInt(m[1]!, 10), q = Number.parseInt(m[2]!, 10);
    if (!(q > 0) || !(p >= 1)) return null;
    let a = p, b = q;
    while (b !== 0) { const r = a % b; a = b; b = r; }
    const g = a || 1;
    p /= g; q /= g;
    return p < q ? { p, q } : null;   // proper reduced fraction 0 < p/q < 1
  }
  public getOverlayPQ(): { p: number; q: number } | null { return this.parsePQ(this.overlayText); }
  public getOverlayPQ2(): { p: number; q: number } | null { return this.parsePQ(this.overlayText2); }
  public getOverlayStrand(): number { return this.overlayStrand; }
  public getOverlayStrand2(): number { return this.overlayStrand2; }
  public getShowFittedIntersections(): boolean { return this.showFittedIntersections; }
  public getShowCarriedMouseover(): boolean { return this.carriedMouseover; }
  public getNearZeroBand(): number { return this.nearZeroBand; }
  public getShowCyclesOverlay(): boolean { return this.showCyclesOverlay; }
  public getShowCyclesPerTOverlay(): boolean { return this.showCyclesPerT; }
  public getShowSmoothJoints(): boolean { return this.showSmoothJoints; }
  public getDimPoints(): number { return this.dimPoints; }

  public onJumpToHitT(T: number): void {
    this.setIndex(T);
    this.controller.invalidate();
    this.toolboxRefresh?.();
  }

  // ─── serialization (optional) ───────────────────────────────────────────────
  public getSerializableState(): unknown {
    return {
      index: this.index, usePolyImag: this.usePolyImag, fast: this.fast, absolute: this.absolute,
      animSpeedMode: this.animSpeedMode, animHold: this.animHold, fareyMaxDenom: this.fareyMaxDenom,
    };
  }

  public restoreSerializableState(value: unknown): void {
    if (typeof value !== "object" || value === null) return;
    if ("index" in value && typeof value.index === "number") this.index = Math.max(1, value.index);
    if ("usePolyImag" in value && typeof value.usePolyImag === "boolean") this.usePolyImag = value.usePolyImag;
    if ("fast" in value && typeof value.fast === "boolean") this.fast = value.fast;
    if ("absolute" in value && typeof value.absolute === "boolean") this.absolute = value.absolute;
    if ("animSpeedMode" in value && (value.animSpeedMode === "coarse" || value.animSpeedMode === "fine" || value.animSpeedMode === "fast")) this.animSpeedMode = value.animSpeedMode;
    if ("animHold" in value && typeof value.animHold === "boolean") this.animHold = value.animHold;
    if ("fareyMaxDenom" in value && typeof value.fareyMaxDenom === "number") this.fareyMaxDenom = Math.max(0, Math.min(64, Math.round(value.fareyMaxDenom)));
  }

  // ─── toolbox: the top controls, up to (not including) camera coordinate frame ──
  public getToolboxContributions(ctx: ToolboxContext): ToolboxSection[] {
    this.toolboxRefresh = ctx.requestToolboxRefresh;
    const refresh = (): void => { ctx.requestToolboxRefresh(); };
    const tValue = indexToImag(this.index, this.usePolyImag);
    const N = Math.floor(this.index);

    // Pick-slider ranges track the horizontal viewing window [u0,u1]: the joint slider
    // spans the visible joints, the fraction slider the visible fractions. Extreme left
    // = off (pickJoint/pickFraction = 0).
    const win = this.controller.getViewWindow();
    const span = Math.max(1, N - 1);
    const nL = win.u0 * span + 1;                 // continuous joint at the window's left
    const nR = win.u1 * span + 1;                 // …and right edge
    const jMin = Math.max(1, Math.min(N, Math.round(nL)));
    const jMax = Math.max(jMin + 1, Math.min(N, Math.round(nR)));
    const jVal = this.pickJoint > 0 ? Math.min(jMax, Math.max(jMin, Math.round(this.pickJoint))) : jMin;
    const fMin = jointFraction(nL, this.index, this.usePolyImag);
    const fMax = Math.max(fMin + 1e-9, jointFraction(nR, this.index, this.usePolyImag));
    const fStep = Math.max(1e-9, (fMax - fMin) / 1000);
    const fVal = this.pickFraction > 0 ? Math.min(fMax, Math.max(fMin, this.pickFraction)) : fMin;

    // Slider 1 (joint picker) live readout: "joint n at angle ρ ≈ p/q".
    const pj = Math.min(Math.max(1, N), Math.max(1, Math.round(this.pickJoint)));
    const pjFrac = closestFareyFraction(jointFraction(pj, this.index, this.usePolyImag), 24);
    const pjLabel = this.pickJoint <= 0
      ? "joint —  (drag to pick)"
      : `joint ${pj} at angle ${jointSignedAngle(pj, this.index, this.usePolyImag).toFixed(4)}  ≈ ${pjFrac.p}/${pjFrac.q}`;

    // Slider 2 (fraction picker) live readout: "f ≈ p/q → joint n".
    const pf = this.pickFraction;
    const pfN = Math.min(Math.max(1, N), Math.max(1, Math.round(causticJoint(pf, this.index))));
    const pfFrac = closestFareyFraction(pf, 24);
    const pfLabel = pf <= 0
      ? "fraction —  (drag to pick)"
      : `f=${pf.toFixed(4)}  ≈ ${pfFrac.p}/${pfFrac.q}  → joint ${pfN}`;

    // Fitted-curve strand dropdown. 0 = none (off), all = −1, 1..p = that strand
    // (number of strands = numerator p). p = 1 has a single strand, so "0" and "1" only.
    const strandCtl = (p: number, strand: number): { options: { label: string; value: string }[]; value: string } => {
      const options = p >= 2
        ? [{ label: "0", value: "0" }, { label: "all", value: "-1" }, ...Array.from({ length: p }, (_, i) => ({ label: String(i + 1), value: String(i + 1) }))]
        : p === 1 ? [{ label: "0", value: "0" }, { label: "1", value: "1" }] : [{ label: "0", value: "0" }];
      const valid = new Set(options.map((o) => o.value));
      return { options, value: valid.has(String(strand)) ? String(strand) : "0" };
    };
    const s1 = strandCtl(this.getOverlayPQ()?.p ?? 0, this.overlayStrand);
    const s2 = strandCtl(this.getOverlayPQ2()?.p ?? 0, this.overlayStrand2);

    return [
      {
        id: "top-controls",
        contributorId: "joint-angles:top",
        title: "",
        bare: true,
        order: 1,
        controls: [
          {
            kind: "custom",
            id: "index-T-and-t",
            render: () => createElement(IndexTRow, {
              indexValue: this.index,
              tValue,
              onTChange: (v: number) => { this.setIndex(v); refresh(); },
              onTFromtChange: (t: number) => { this.setIndex(imagToIndex(t, this.usePolyImag)); refresh(); },
            }),
          },
          {
            kind: "custom",
            id: "index-int",
            render: () => createElement(IntegerPartTHighRow, {
              intValue: Math.trunc(this.index),
              onChange: (v: number) => { this.setIndex(v + (this.index - Math.trunc(this.index))); refresh(); },
            }),
          },
          {
            kind: "number",
            id: "index-frac",
            label: "Fractional part of T",
            value: this.index - Math.trunc(this.index),
            min: 0,
            max: 0.999999,
            step: 1e-6,
            onChange: (v: number) => { this.setIndex(Math.trunc(this.index) + Math.max(0, Math.min(0.999999, v))); refresh(); },
          },
          {
            kind: "custom",
            id: "anim-speed",
            render: () => createElement(AnimationSpeedRow, {
              value: this.animSpeed,
              range: this.animSpeedRange,
              hold: this.animHold,
              onChange: (v: number) => { this.animSpeed = v; refresh(); },
            }),
          },
          {
            kind: "custom",
            id: "anim-mode-and-hold",
            render: () => createElement(AnimationModeAndHoldRow, {
              mode: this.animSpeedMode,
              hold: this.animHold,
              onModeChange: (m: "coarse" | "fine" | "fast") => { this.animSpeedMode = m; this.animSpeed = 0; refresh(); },
              onHoldChange: (h: boolean) => { this.animHold = h; if (!h) this.animSpeed = 0; refresh(); },
            }),
          },
          {
            kind: "toggle",
            id: "fast-joint-angles",
            label: "fast joint angles (calibrate once / perturb · T>1000)",
            value: this.fast,
            onChange: (v: boolean) => { this.fast = v; refresh(); },
          },
          {
            kind: "toggle",
            id: "absolute-joint-angles",
            label: "absolute angle to real axis (link n vs +x, not prior link)",
            value: this.absolute,
            onChange: (v: boolean) => { this.absolute = v; refresh(); },
          },
          {
            kind: "custom",
            id: "champions-slider",
            render: () => createElement(ChampionsSlider, {
              currentT: this.index,
              // No 10,000 cap here (unlike the main tab) — this tab is for high-T study.
              onPick: (T: number) => { this.setIndex(T); refresh(); },
            }),
          },
          {
            kind: "custom",
            id: "zeros-slider",
            render: () => createElement(ZerosSlider, {
              currentT: this.index,
              onPick: (T: number) => { this.setIndex(Math.max(0, T)); refresh(); },
            }),
          },
          {
            kind: "custom",
            id: "picker-spacer",
            render: () => createElement("div", { style: { borderTop: "1px solid rgba(255,255,255,0.15)", marginTop: 12, paddingTop: 2 } }),
          },
          {
            kind: "select",
            id: "farey-max-denom",
            label: "show Farey fractions (≤ denominator)",
            value: String(this.fareyMaxDenom),
            options: [
              ...Array.from({ length: 25 }, (_, i) => ({ label: i === 0 ? "0 (none)" : String(i), value: String(i) })),
              { label: "32", value: "32" },
              { label: "64", value: "64" },
            ],
            onChange: (v: string) => { this.fareyMaxDenom = Math.max(0, Math.min(64, Number.parseInt(v, 10) || 0)); refresh(); },
          },
          {
            kind: "custom",
            id: "joint-pick",
            render: () => createElement(JointPickRow, {
              value: jVal,
              min: jMin,
              max: jMax,
              label: pjLabel,
              onChange: (n: number) => { this.pickJoint = n <= jMin ? 0 : Math.min(jMax, n); refresh(); },
            }),
          },
          {
            kind: "custom",
            id: "fraction-pick",
            render: () => createElement(FractionPickRow, {
              value: fVal,
              min: fMin,
              max: fMax,
              step: fStep,
              label: pfLabel,
              onChange: (v: number) => { this.pickFraction = v <= fMin + fStep * 0.5 ? 0 : Math.min(fMax, v); refresh(); },
            }),
          },
          {
            kind: "custom",
            id: "overlay-pq",
            render: () => createElement(OverlayPQRow, {
              label: "1 fitted curve p/q",
              labelColor: "#33e08a",
              value: this.overlayText,
              onChange: (s: string) => { this.overlayText = s; refresh(); },
              strandValue: s1.value,
              strandOptions: s1.options,
              onStrandChange: (v: string) => { this.overlayStrand = Number.parseInt(v, 10) || 0; refresh(); },
            }),
          },
          {
            kind: "custom",
            id: "overlay-pq-2",
            render: () => createElement(OverlayPQRow, {
              label: "2 fitted curve p/q",
              labelColor: "#ff5555",
              value: this.overlayText2,
              onChange: (s: string) => { this.overlayText2 = s; refresh(); },
              strandValue: s2.value,
              strandOptions: s2.options,
              onStrandChange: (v: string) => { this.overlayStrand2 = Number.parseInt(v, 10) || 0; refresh(); },
            }),
          },
          {
            kind: "toggle",
            id: "fitted-intersections",
            label: "mark fitted-curve 1×2 intersections (blue circles)",
            value: this.showFittedIntersections,
            onChange: (v: boolean) => { this.showFittedIntersections = v; refresh(); },
          },
          {
            kind: "toggle",
            id: "carried-mouseover",
            label: "fraction carried by joint (mouseover)",
            value: this.carriedMouseover,
            onChange: (v: boolean) => { this.carriedMouseover = v; refresh(); },
          },
          {
            kind: "toggle",
            id: "cycles-overlay",
            label: "cycles-per-joint overlay ν=I/2π·n(n−1) (red)",
            value: this.showCyclesOverlay,
            onChange: (v: boolean) => { this.showCyclesOverlay = v; refresh(); },
          },
          {
            kind: "toggle",
            id: "cycles-per-t-overlay",
            label: "cycles-per-T overlay μ=I′(T)·ln(n/(n−1))/2π (blue)",
            value: this.showCyclesPerT,
            onChange: (v: boolean) => { this.showCyclesPerT = v; refresh(); },
          },
          {
            kind: "toggle",
            id: "smooth-joints",
            label: "highlight smooth joints (lpf of n(n−1) ≤ 31, coloured by prime)",
            value: this.showSmoothJoints,
            onChange: (v: boolean) => { this.showSmoothJoints = v; refresh(); },
          },
          {
            kind: "custom",
            id: "dim-points",
            render: () => createElement(DimPointsRow, {
              value: this.dimPoints,
              label: `dim joint points ${this.dimPoints.toFixed(2)} (shrink → darken)`,
              onChange: (v: number) => { this.dimPoints = Math.max(0, Math.min(1, v)); refresh(); },
            }),
          },
          {
            kind: "custom",
            id: "near-zero-band",
            render: () => createElement(NearZeroBandRow, {
              value: this.nearZeroBand,
              label: `highlight joints with |angle| ≤ ${this.nearZeroBand.toFixed(3)} (0 = off)`,
              onChange: (v: number) => { this.nearZeroBand = Math.max(0, Math.min(Math.PI, v)); refresh(); },
            }),
          },
        ],
      },
    ];
  }
}

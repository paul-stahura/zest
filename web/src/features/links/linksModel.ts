import { createElement } from "react";

import { IndexTRow, ChampionsSlider, ZerosSlider } from "@/features/main-workspace/spiralWorkspaceLayer";
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

import {
  LinksSceneController,
  type LinksViewSource,
  type ForwardLinksMode,
  type InverseLinksMode,
  yinYangFlagsFromLegacy,
} from "@/features/links/linksSceneController";
import { createLinksMatrixPanel, type LinksMatrixLayer } from "@/features/links/LinksMatrixPanel";

/**
 * Model for the standalone "Links" tab. Owns σ and T (the joint-angles top block plus the
 * main tab's σ, since link frames — unlike joint angles — depend on σ) and the display
 * toggles. All geometry lives in the scene controller, which reads this through
 * {@link LinksViewSource}.
 */
export class LinksModel implements VisualizationModel, LinksViewSource, LinksMatrixLayer {
  private readonly controller: LinksSceneController;
  private readonly matrixPanel: ReturnType<typeof createLinksMatrixPanel>;

  private sigma = 0.5;
  private sigmaMin = 0;
  private sigmaMax = 1;
  private sigmaStep = 0.001;
  private index = 6.18;
  private usePolyImag = false;

  private animSpeed = 0;
  private animSpeedMode: "coarse" | "fine" | "fast" = "coarse";
  private animHold = false;

  /** Inverse row, Reflect column: Σ₂ reflected through ζ/2, drawn in every link frame. */
  private inverseReflect = true;
  /** Copied bisector yin-yang, yellow chord, and orange follower on every shown frame. */
  private showBisectorFollower = false;
  /** Main-tab Forward + Inverse-reflect spirals, 2× zoom, origin near the left edge. */
  private showMainSpiral = false;
  /** Crossing-joint walk of Σ₁+R_{1ps}, from the origin through the crossings to B₁. */
  private showSumX = false;
  /** Crossing-joint walk of Σ₂+R_{2ps}, from the origin to B₂. */
  private showSum2x = false;
  private forwardLinks: ForwardLinksMode = "none";
  private inverseLinks: InverseLinksMode = "oneCrossing";
  private yinYangOnBisector = true;
  private yinYangOffBisector = false;
  private yinExtend = false;
  private yangExtend = false;

  private toolboxRefresh: (() => void) | null = null;
  private lastAnimToolboxRefresh = 0;

  public constructor() {
    this.controller = new LinksSceneController(this);
    this.matrixPanel = createLinksMatrixPanel(this);
    this.controller.onAnimatingFrame = () => {
      const now = performance.now();
      if (now - this.lastAnimToolboxRefresh >= 250) {
        this.lastAnimToolboxRefresh = now;
        this.toolboxRefresh?.();
      }
    };
  }

  public initialize(): void {
    // Geometry is rebuilt every frame from σ and T; nothing to prepare here.
  }

  public dispose(): void {
    this.controller.dispose();
  }

  public getSceneController(): LinksSceneController { return this.controller; }
  public getSelectionState(): SelectionState { return { activePoint: null }; }

  // ─── LinksViewSource ──────────────────────────────────────────────────────────

  public getSigma(): number { return this.sigma; }
  public getIndex(): number { return this.index; }
  public setIndex(v: number): void { this.index = Math.max(0, v); }
  public getUsePolyImag(): boolean { return this.usePolyImag; }
  public getAnimSpeed(): number { return this.animSpeed; }

  // ─── LinksMatrixLayer ─────────────────────────────────────────────────────────

  public getInverseReflect(): boolean { return this.inverseReflect; }
  public setInverseReflect(v: boolean): void { this.inverseReflect = v; this.controller.invalidate(); }
  public getShowBisectorFollower(): boolean { return this.showBisectorFollower; }
  public setShowBisectorFollower(v: boolean): void { this.showBisectorFollower = v; this.controller.invalidate(); }
  public getShowMainSpiral(): boolean { return this.showMainSpiral; }
  public setShowMainSpiral(v: boolean): void { this.showMainSpiral = v; this.controller.invalidate(); }
  public getShowSumX(): boolean { return this.showSumX; }
  public setShowSumX(v: boolean): void { this.showSumX = v; this.controller.invalidate(); }
  public getShowSum2x(): boolean { return this.showSum2x; }
  public setShowSum2x(v: boolean): void { this.showSum2x = v; this.controller.invalidate(); }
  public getForwardLinks(): ForwardLinksMode { return this.forwardLinks; }
  public getInverseLinks(): InverseLinksMode { return this.inverseLinks; }
  public getYinYangOnBisector(): boolean { return this.yinYangOnBisector; }
  public getYinYangOffBisector(): boolean { return this.yinYangOffBisector; }
  public getYinExtend(): boolean { return this.yinExtend; }
  public getYangExtend(): boolean { return this.yangExtend; }

  // ─── serialization ────────────────────────────────────────────────────────────

  public getSerializableState(): unknown {
    return {
      sigma: this.sigma,
      index: this.index,
      usePolyImag: this.usePolyImag,
      animSpeedMode: this.animSpeedMode,
      animHold: this.animHold,
      inverseReflect: this.inverseReflect,
      showBisectorFollower: this.showBisectorFollower,
      showMainSpiral: this.showMainSpiral,
      showSumX: this.showSumX,
      showSum2x: this.showSum2x,
      forwardLinks: this.forwardLinks,
      inverseLinks: this.inverseLinks,
      yinYangOnBisector: this.yinYangOnBisector,
      yinYangOffBisector: this.yinYangOffBisector,
      yinExtend: this.yinExtend,
      yangExtend: this.yangExtend,
    };
  }

  public restoreSerializableState(value: unknown): void {
    if (typeof value !== "object" || value === null) return;
    if ("sigma" in value && typeof value.sigma === "number") this.sigma = value.sigma;
    if ("index" in value && typeof value.index === "number") this.index = Math.max(0, value.index);
    if ("usePolyImag" in value && typeof value.usePolyImag === "boolean") this.usePolyImag = value.usePolyImag;
    if ("animSpeedMode" in value && (value.animSpeedMode === "coarse" || value.animSpeedMode === "fine" || value.animSpeedMode === "fast")) {
      this.animSpeedMode = value.animSpeedMode;
    }
    if ("animHold" in value && typeof value.animHold === "boolean") this.animHold = value.animHold;
    if ("inverseReflect" in value && typeof value.inverseReflect === "boolean") this.inverseReflect = value.inverseReflect;
    if ("showBisectorFollower" in value && typeof value.showBisectorFollower === "boolean") {
      this.showBisectorFollower = value.showBisectorFollower;
    }
    if ("showMainSpiral" in value && typeof value.showMainSpiral === "boolean") this.showMainSpiral = value.showMainSpiral;
    if ("showSumX" in value && typeof value.showSumX === "boolean") this.showSumX = value.showSumX;
    if ("showSum2x" in value && typeof value.showSum2x === "boolean") this.showSum2x = value.showSum2x;
    if ("forwardLinks" in value && isForwardLinksMode(value.forwardLinks)) this.forwardLinks = value.forwardLinks;
    if ("inverseLinks" in value && isInverseLinksMode(value.inverseLinks)) this.inverseLinks = value.inverseLinks;
    if ("yinYangOnBisector" in value || "yinYangOffBisector" in value
      || "yinExtend" in value || "yangExtend" in value || "yinYangExtension" in value) {
      if ("yinYangOnBisector" in value && typeof value.yinYangOnBisector === "boolean") {
        this.yinYangOnBisector = value.yinYangOnBisector;
      }
      if ("yinYangOffBisector" in value && typeof value.yinYangOffBisector === "boolean") {
        this.yinYangOffBisector = value.yinYangOffBisector;
      }
      if ("yinExtend" in value && typeof value.yinExtend === "boolean") {
        this.yinExtend = value.yinExtend;
      }
      if ("yangExtend" in value && typeof value.yangExtend === "boolean") {
        this.yangExtend = value.yangExtend;
      }
      if (!("yinExtend" in value) && !("yangExtend" in value)
        && "yinYangExtension" in value && typeof value.yinYangExtension === "boolean") {
        this.yinExtend = value.yinYangExtension;
        this.yangExtend = value.yinYangExtension;
      }
    } else if ("yinYang" in value && typeof value.yinYang === "string") {
      const flags = yinYangFlagsFromLegacy(value.yinYang);
      this.yinYangOnBisector = flags.onBisector;
      this.yinYangOffBisector = flags.offBisector;
      this.yinExtend = flags.yinExtend;
      this.yangExtend = flags.yangExtend;
    }
    this.controller.invalidate();
  }

  // ─── toolbox ──────────────────────────────────────────────────────────────────

  public getToolboxContributions(ctx: ToolboxContext): ToolboxSection[] {
    this.toolboxRefresh = ctx.requestToolboxRefresh;
    const refresh = (): void => { ctx.requestToolboxRefresh(); };
    const tValue = indexToImag(this.index, this.usePolyImag);

    return [
      {
        id: "top-controls",
        contributorId: "links:top",
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
            kind: "range-slider",
            id: "sigma",
            label: "σ",
            value: this.sigma,
            defaultValue: 0.5,
            min: this.sigmaMin,
            max: this.sigmaMax,
            step: this.sigmaStep,
            onChange: (value: number) => { this.sigma = value; this.controller.invalidate(); refresh(); },
            onStepChange: (step: number) => { this.sigmaStep = step; refresh(); },
            onRangeChange: (newMin: number, newMax: number) => { this.sigmaMin = newMin; this.sigmaMax = newMax; refresh(); },
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
              range: animSpeedRangeFor(this.animSpeedMode),
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
            kind: "custom",
            id: "champions-slider",
            render: () => createElement(ChampionsSlider, {
              currentT: this.index,
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
        ],
      },
      {
        id: "links-display",
        contributorId: "links:display",
        title: "Spiral display",
        order: 2,
        CustomPanel: this.matrixPanel,
        controls: [
          {
            kind: "toggle",
            id: "show-bisector-follower",
            label: "bisector yin-yang + follower on every frame",
            value: this.showBisectorFollower,
            onChange: (v: boolean) => { this.showBisectorFollower = v; this.controller.invalidate(); refresh(); },
          },
          {
            kind: "toggle",
            id: "show-main-spiral",
            label: "overlay main-tab spirals (forward + inverse reflect)",
            value: this.showMainSpiral,
            onChange: (v: boolean) => { this.showMainSpiral = v; this.controller.invalidate(); refresh(); },
          },
          {
            kind: "toggle",
            id: "show-sum-x",
            label: "Σ_1x",
            value: this.showSumX,
            onChange: (v: boolean) => { this.showSumX = v; this.controller.invalidate(); refresh(); },
          },
          {
            kind: "toggle",
            id: "show-sum-2x",
            label: "Σ_2x",
            value: this.showSum2x,
            onChange: (v: boolean) => { this.showSum2x = v; this.controller.invalidate(); refresh(); },
          },
          {
            kind: "select",
            id: "forward-links",
            label: "forward links in each strip",
            value: this.forwardLinks,
            options: [
              { label: "all links", value: "all" },
              { label: "up to bisector", value: "toBisector" },
              { label: "either side of link N", value: "eitherSide" },
              { label: "no links", value: "none" },
            ],
            onChange: (v: string) => {
              if (isForwardLinksMode(v)) this.forwardLinks = v;
              this.controller.invalidate();
              refresh();
            },
          },
          {
            kind: "select",
            id: "inverse-links",
            label: "inverse links in each strip",
            value: this.inverseLinks,
            options: [
              { label: "all links", value: "all" },
              { label: "bisector to end", value: "bisectorToEnd" },
              { label: "span links", value: "span" },
              { label: "one crossing link", value: "oneCrossing" },
            ],
            onChange: (v: string) => {
              if (isInverseLinksMode(v)) this.inverseLinks = v;
              this.controller.invalidate();
              refresh();
            },
          },
          {
            kind: "toggle",
            id: "yin-yang-on-bisector",
            label: "yin yang on bisector",
            value: this.yinYangOnBisector,
            onChange: (v: boolean) => { this.yinYangOnBisector = v; this.controller.invalidate(); refresh(); },
          },
          {
            kind: "toggle",
            id: "yin-yang-off-bisector",
            label: "yin yang links not bisector",
            value: this.yinYangOffBisector,
            onChange: (v: boolean) => { this.yinYangOffBisector = v; this.controller.invalidate(); refresh(); },
          },
          {
            kind: "toggle",
            id: "yin-extend",
            label: "yin extend on all links",
            value: this.yinExtend,
            onChange: (v: boolean) => { this.yinExtend = v; this.controller.invalidate(); refresh(); },
          },
          {
            kind: "toggle",
            id: "yang-extend",
            label: "yang extend on all links",
            value: this.yangExtend,
            onChange: (v: boolean) => { this.yangExtend = v; this.controller.invalidate(); refresh(); },
          },
          {
            kind: "action",
            id: "reset-zoom",
            label: "reset zoom (strips and contents)",
            run: () => { this.controller.resetView(); },
          },
        ],
      },
    ];
  }
}

function isForwardLinksMode(v: unknown): v is ForwardLinksMode {
  return v === "none" || v === "all" || v === "toBisector" || v === "eitherSide";
}

function isInverseLinksMode(v: unknown): v is InverseLinksMode {
  return v === "all" || v === "bisectorToEnd" || v === "span" || v === "oneCrossing";
}

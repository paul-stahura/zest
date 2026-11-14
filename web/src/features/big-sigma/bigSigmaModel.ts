import { createElement } from "react";

import {
  BigSigmaAnimSpeedRadios,
  BigSigmaFracTRow,
  BigSigmaSigmaRow,
  type BigSigmaAnimSpeed,
} from "@/features/big-sigma/BigSigmaSigmaRow";
import { BigSigmaSceneController } from "@/features/big-sigma/bigSigmaSceneController";
import { IndexTRow, IntegerPartTRow } from "@/features/main-workspace/spiralWorkspaceLayer";
import {
  BIG_SIGMA_DISPLAY_ACCORDION_OPTIONS,
  buildDisplayAccordionControls,
} from "@/features/zeros-of-f/controls/toolboxSections";
import {
  DEFAULT_STATE,
  type DisplayControlsState,
} from "@/features/zeros-of-f/types";
import { clampLastLinksCount, type BigSigmaChainExtent } from "@/shared/math/bigSigmaSpiral";
import { clamp } from "@/shared/math/clamp";
import {
  parsePlanarZerosDisplayView,
  zerosDisplayViewPatch,
} from "@/shared/math/zerosOfF/displayView";
import { parseFracTJustOneDigits } from "@/shared/math/zerosOfF/fracTDisplayFilter";
import {
  parseZerosHarvestFamily,
  type ZerosHarvestFamily,
} from "@/shared/math/zerosOfF/harvestFamily";
import { AnimationSpeedRow } from "@/shared/toolbox/indexAnimationRows";
import { imagToIndex, indexToImag } from "@/shared/math/zetaEms";
import type {
  SelectionState,
  ToolboxContext,
  ToolboxSection,
  VisualizationModel,
} from "@/shared/visualization/contracts";

const INTEGER_T_MAX = 4000;
const INDEX_MAX = INTEGER_T_MAX + 1 - 1e-9;
const ANIM_DEADZONE = 0.0001;

function isAnimSpeed(value: unknown): value is BigSigmaAnimSpeed {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

/**
 * Isolated playground for the Σ₁ + R_{1ak} chain at large |σ|.
 * Own σ range and T; does not share state with the Main tab.
 */
export class BigSigmaModel implements VisualizationModel {
  private readonly controller = new BigSigmaSceneController();
  private readonly selection: SelectionState = { activePoint: null };
  private sigma = 0.5;
  private sigmaMin = -10;
  private sigmaMax = 1;
  private index = 6.18;
  private showR1ak = true;
  private chainExtent: BigSigmaChainExtent = "floorT";
  private lastLinksOnly = false;
  private lastLinksCount = 2;
  private zerosDimmer = 0.05;
  private showCrosshair = true;
  private chainFromZero = false;
  private display: DisplayControlsState = {
    ...DEFAULT_STATE.display,
    ...zerosDisplayViewPatch(parsePlanarZerosDisplayView(
      DEFAULT_STATE.display.displayView,
      DEFAULT_STATE.display.fracTFilterKind,
    )),
  };
  private harvestFamily: ZerosHarvestFamily = "siegel";
  private animSpeed = 0;
  private animSpeedMax: BigSigmaAnimSpeed = 3;
  private toolboxRefresh: (() => void) | null = null;
  private unsubscribeFrame: (() => void) | null = null;

  public initialize(): void {
    this.controller.setOnZeroPick((sigma, index) => {
      this.applyZero(sigma, index);
      this.toolboxRefresh?.();
    });
    this.unsubscribeFrame = this.controller.addFrameListener((_time, deltaMs) => {
      if (Math.abs(this.animSpeed) <= ANIM_DEADZONE) return;
      const speedPerFrame = (this.animSpeed * this.animSpeed) * 0.001 / (this.index + 1);
      this.setIndexFromControl(this.index + speedPerFrame * Math.sign(this.animSpeed) * (deltaMs / 16.667));
      this.syncScene();
      this.toolboxRefresh?.();
    });
    this.syncScene();
    void this.controller.loadZeros(this.harvestFamily);
  }

  public dispose(): void {
    this.unsubscribeFrame?.();
    this.unsubscribeFrame = null;
    this.controller.dispose();
  }

  public getSceneController(): BigSigmaSceneController {
    return this.controller;
  }

  public getSelectionState(): SelectionState {
    return this.selection;
  }

  public getSerializableState(): unknown {
    return {
      sigma: this.sigma,
      sigmaMin: this.sigmaMin,
      sigmaMax: this.sigmaMax,
      index: this.index,
      showR1ak: this.showR1ak,
      chainExtent: this.chainExtent,
      lastLinksOnly: this.lastLinksOnly,
      lastLinksCount: this.lastLinksCount,
      zerosDimmer: this.zerosDimmer,
      showCrosshair: this.showCrosshair,
      chainFromZero: this.chainFromZero,
      animSpeedMax: this.animSpeedMax,
      harvestFamily: this.harvestFamily,
      display: {
        displayView: this.display.displayView,
        colorMode: this.display.colorMode === "grayscale" ? "grayscale" : "spectrum",
        fracTFilterKind: this.display.fracTFilterKind,
        fracTJustOne: this.display.fracTJustOne,
        fracTJustOneDigits: this.display.fracTJustOneDigits,
        fracTRangeMin: this.display.fracTRangeMin,
        fracTRangeMax: this.display.fracTRangeMax,
        fracTRangeMode: this.display.fracTRangeMode,
      },
    };
  }

  public restoreSerializableState(value: unknown): void {
    if (typeof value !== "object" || value === null) return;
    if ("sigmaMin" in value && typeof value.sigmaMin === "number") this.sigmaMin = value.sigmaMin;
    if ("sigmaMax" in value && typeof value.sigmaMax === "number") this.sigmaMax = value.sigmaMax;
    if ("sigma" in value && typeof value.sigma === "number") this.sigma = value.sigma;
    if ("index" in value && typeof value.index === "number") this.index = clamp(value.index, 0, INDEX_MAX);
    if ("showR1ak" in value && typeof value.showR1ak === "boolean") this.showR1ak = value.showR1ak;
    if ("chainExtent" in value && (value.chainExtent === "entire" || value.chainExtent === "floorT")) {
      this.chainExtent = value.chainExtent;
    }
    if ("lastLinksOnly" in value && typeof value.lastLinksOnly === "boolean") {
      this.lastLinksOnly = value.lastLinksOnly;
    }
    if ("lastLinksCount" in value && typeof value.lastLinksCount === "number") {
      this.lastLinksCount = clampLastLinksCount(value.lastLinksCount);
    }
    if ("zerosDimmer" in value && typeof value.zerosDimmer === "number") {
      this.zerosDimmer = clamp(value.zerosDimmer, 0, 1);
    }
    if ("showCrosshair" in value && typeof value.showCrosshair === "boolean") {
      this.showCrosshair = value.showCrosshair;
    }
    if ("chainFromZero" in value && typeof value.chainFromZero === "boolean") {
      this.chainFromZero = value.chainFromZero;
    }
    if ("animSpeedMax" in value && isAnimSpeed(value.animSpeedMax)) {
      this.animSpeedMax = value.animSpeedMax;
      this.animSpeed = clamp(this.animSpeed, -this.animSpeedMax, this.animSpeedMax);
    }
    if ("display" in value && typeof value.display === "object" && value.display !== null) {
      this.display = restoreBigSigmaDisplay(this.display, value.display);
    }
    if ("harvestFamily" in value) {
      const next = parseZerosHarvestFamily(value.harvestFamily);
      const changed = next !== this.harvestFamily;
      this.harvestFamily = next;
      if (changed) void this.controller.loadZeros(next);
    }
    this.clampSigmaToRange();
    this.syncScene();
  }

  public getToolboxContributions(ctx: ToolboxContext): ToolboxSection[] {
    const refresh = (): void => { ctx.requestToolboxRefresh(); };
    this.toolboxRefresh = refresh;
    return [
      {
        id: "harvest-family",
        contributorId: "big-sigma:harvest-family",
        title: "",
        bare: true,
        order: 0,
        controls: [
          {
            kind: "select",
            id: "harvest-family",
            label: "f(s)",
            value: this.harvestFamily,
            options: [
              { label: "Siegel's f(s)", value: "siegel" },
              { label: "R1ps f(s)", value: "r1ps" },
            ],
            onChange: (v) => { this.setHarvestFamily(parseZerosHarvestFamily(v)); },
          },
        ],
      },
      {
        id: "top-controls",
        contributorId: "big-sigma:top",
        title: "",
        bare: true,
        order: 1,
        controls: [
          {
            kind: "custom",
            id: "index-T-and-t",
            render: () => createElement(IndexTRow, {
              indexValue: this.index,
              tValue: indexToImag(this.index, false),
              onTChange: (v: number) => {
                this.setIndexFromControl(v);
                this.syncScene();
                refresh();
              },
              onTFromtChange: (tIn: number) => {
                this.setIndexFromControl(imagToIndex(Math.max(0, tIn), false));
                this.syncScene();
                refresh();
              },
            }),
          },
          {
            kind: "custom",
            id: "sigma-plain",
            render: () => createElement(BigSigmaSigmaRow, {
              sigma: this.sigma,
              min: this.sigmaMin,
              max: this.sigmaMax,
              onSigmaChange: (v: number) => {
                this.setSigmaFromControl(v);
                this.syncScene();
                refresh();
              },
              onRangeChange: (min: number, max: number) => {
                this.sigmaMin = min;
                this.sigmaMax = max;
                const before = this.sigma;
                this.clampSigmaToRange();
                if (this.sigma !== before) this.chainFromZero = false;
                this.syncScene();
                refresh();
              },
            }),
          },
          {
            kind: "custom",
            id: "index-int",
            render: () => createElement(IntegerPartTRow, {
              intValue: Math.trunc(this.index),
              maxInt: INTEGER_T_MAX,
              onChange: (value: number) => {
                const frac = this.index - Math.trunc(this.index);
                this.setIndexFromControl(Math.max(0, Math.min(INTEGER_T_MAX, value)) + frac);
                this.syncScene();
                refresh();
              },
            }),
          },
          {
            kind: "custom",
            id: "index-frac",
            render: () => createElement(BigSigmaFracTRow, {
              value: parseFloat((this.index - Math.trunc(this.index)).toFixed(6)),
              onChange: (value: number) => {
                this.setIndexFromControl(Math.trunc(this.index) + Math.max(0, Math.min(0.999999, value)));
                this.syncScene();
                refresh();
              },
            }),
          },
          {
            kind: "custom",
            id: "annimate",
            render: () => createElement(AnimationSpeedRow, {
              value: this.animSpeed,
              range: this.animSpeedMax,
              hold: false,
              onChange: (v: number) => {
                this.animSpeed = clamp(v, -this.animSpeedMax, this.animSpeedMax);
                refresh();
              },
            }),
          },
          {
            kind: "custom",
            id: "annimate-speed",
            render: () => createElement(BigSigmaAnimSpeedRadios, {
              value: this.animSpeedMax,
              onChange: (speed: BigSigmaAnimSpeed) => {
                this.animSpeedMax = speed;
                this.animSpeed = clamp(this.animSpeed, -speed, speed);
                refresh();
              },
            }),
          },
          {
            kind: "option-toggle",
            id: "chain-extent",
            label: "links",
            value: this.chainExtent === "entire" ? 0 : 1,
            options: [{ label: "entire" }, { label: "⌊T⌋" }],
            onChange: (v: number) => {
              this.chainExtent = v === 0 ? "entire" : "floorT";
              this.syncScene();
              refresh();
            },
          },
          {
            kind: "toggle",
            id: "last-links-only",
            label: "last links",
            value: this.lastLinksOnly,
            onChange: (v: boolean) => {
              this.lastLinksOnly = v;
              this.syncScene();
              refresh();
            },
          },
          {
            kind: "number",
            id: "last-links-count",
            label: "n",
            value: this.lastLinksCount,
            min: 1,
            max: 10,
            step: 1,
            onChange: (v: number) => {
              this.lastLinksCount = clampLastLinksCount(v);
              this.syncScene();
              refresh();
            },
          },
          {
            kind: "toggle",
            id: "show-r1ak",
            label: this.harvestFamily === "r1ps" ? "R1ps" : "R1ak",
            labelColor: "#ffffff",
            value: this.showR1ak,
            onChange: (v: boolean) => {
              this.showR1ak = v;
              this.syncScene();
              refresh();
            },
          },
          {
            kind: "toggle",
            id: "show-crosshair",
            label: "σ, T crosshair",
            value: this.showCrosshair,
            onChange: (v: boolean) => {
              this.showCrosshair = v;
              this.syncScene();
              refresh();
            },
          },
          {
            kind: "number",
            id: "zeros-dimmer",
            label: "zeros dimmer",
            value: this.zerosDimmer,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: (v: number) => {
              this.zerosDimmer = clamp(v, 0, 1);
              this.syncScene();
              refresh();
            },
          },
        ],
      },
      {
        id: "display",
        contributorId: "big-sigma:display",
        title: "Display",
        order: 2,
        controls: buildDisplayAccordionControls(
          this.display,
          (patch) => {
            this.display = applyBigSigmaDisplayPatch(this.display, patch);
            this.syncScene();
            refresh();
          },
          BIG_SIGMA_DISPLAY_ACCORDION_OPTIONS,
        ),
      },
    ];
  }

  /**
   * Swap the packed zeros under the chain. Display filters, hover, and
   * click keep operating on whichever catalog is selected.
   */
  private setHarvestFamily(family: ZerosHarvestFamily): void {
    const next = parseZerosHarvestFamily(family);
    if (next === this.harvestFamily) return;
    this.harvestFamily = next;
    this.syncScene();
    this.toolboxRefresh?.();
    void this.controller.loadZeros(next);
  }

  private clampSigmaToRange(): void {
    const lo = Math.min(this.sigmaMin, this.sigmaMax);
    const hi = Math.max(this.sigmaMin, this.sigmaMax);
    this.sigma = clamp(this.sigma, lo, hi);
  }

  private setIndexFromControl(index: number): void {
    this.chainFromZero = false;
    this.index = clamp(index, 0, INDEX_MAX);
  }

  private setSigmaFromControl(sigma: number): void {
    this.chainFromZero = false;
    this.sigma = sigma;
    this.clampSigmaToRange();
  }

  /**
   * Jump sliders to a clicked zero. Widen the σ range so the green slider
   * can actually reach harvest σ (defaults are −10…1).
   */
  private applyZero(sigma: number, index: number): void {
    this.chainFromZero = true;
    this.index = clamp(index, 0, INDEX_MAX);
    this.sigmaMin = Math.min(this.sigmaMin, sigma);
    this.sigmaMax = Math.max(this.sigmaMax, sigma);
    this.sigma = sigma;
    this.clampSigmaToRange();
    this.syncScene();
  }

  private syncScene(): void {
    this.controller.setParams(
      this.sigma,
      this.index,
      this.showR1ak,
      this.zerosDimmer,
      this.chainExtent,
      this.showCrosshair,
      this.chainFromZero,
      this.lastLinksOnly,
      this.lastLinksCount,
      this.harvestFamily === "r1ps" ? "ps" : "ak",
    );
    this.controller.setZerosDisplay(
      this.display.colorMode === "grayscale" ? "grayscale" : "spectrum",
      {
        kind: this.display.fracTFilterKind,
        rangeMin: this.display.fracTRangeMin,
        rangeMax: this.display.fracTRangeMax,
        rangeMode: this.display.fracTRangeMode,
        justOne: this.display.fracTJustOne,
        justOneDigits: this.display.fracTJustOneDigits,
        quarterEnabled: this.display.fracTQuarterEnabled,
        quarterPreset: this.display.fracTQuarterPreset,
      },
    );
  }
}

/**
 * Keep only the planar Display accordion fields. 3D / Y-axis / left-500
 * stay at defaults so this tab cannot pick them up from a stale patch.
 */
export function applyBigSigmaDisplayPatch(
  live: DisplayControlsState,
  patch: Partial<DisplayControlsState>,
): DisplayControlsState {
  const next = { ...live, ...patch };
  const view = parsePlanarZerosDisplayView(next.displayView, next.fracTFilterKind);
  return {
    ...next,
    ...zerosDisplayViewPatch(view),
    colorMode: next.colorMode === "grayscale" ? "grayscale" : "spectrum",
    fracTJustOneDigits: parseFracTJustOneDigits(next.fracTJustOneDigits),
    yAxisMode: "T",
    showSigmaNeg500ToNeg400: true,
  };
}

/**
 * Restore persisted accordion fields. Unknown shapes leave the live state.
 */
export function restoreBigSigmaDisplay(
  live: DisplayControlsState,
  raw: object,
): DisplayControlsState {
  const patch: Partial<DisplayControlsState> = {};
  if ("displayView" in raw && typeof raw.displayView === "string") {
    patch.displayView = parsePlanarZerosDisplayView(raw.displayView, live.fracTFilterKind);
  } else if ("fracTFilterKind" in raw && raw.fracTFilterKind === "justOne") {
    patch.displayView = "exactFracT";
  }
  if ("colorMode" in raw && raw.colorMode === "grayscale") patch.colorMode = "grayscale";
  if ("colorMode" in raw && raw.colorMode === "spectrum") patch.colorMode = "spectrum";
  if ("fracTFilterKind" in raw && (raw.fracTFilterKind === "range" || raw.fracTFilterKind === "justOne")) {
    patch.fracTFilterKind = raw.fracTFilterKind;
  }
  if ("fracTJustOne" in raw && typeof raw.fracTJustOne === "number") patch.fracTJustOne = raw.fracTJustOne;
  if ("fracTJustOneDigits" in raw) patch.fracTJustOneDigits = parseFracTJustOneDigits(raw.fracTJustOneDigits);
  if ("fracTRangeMin" in raw && typeof raw.fracTRangeMin === "number") patch.fracTRangeMin = raw.fracTRangeMin;
  if ("fracTRangeMax" in raw && typeof raw.fracTRangeMax === "number") patch.fracTRangeMax = raw.fracTRangeMax;
  if ("fracTRangeMode" in raw && (raw.fracTRangeMode === "between" || raw.fracTRangeMode === "outside")) {
    patch.fracTRangeMode = raw.fracTRangeMode;
  }
  return applyBigSigmaDisplayPatch(live, patch);
}

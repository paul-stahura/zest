import { createElement } from "react";

import {
  BigSigmaAnimSpeedRadios,
  BigSigmaFracTRow,
  BigSigmaSigmaRow,
  type BigSigmaAnimSpeed,
} from "@/features/big-sigma/BigSigmaSigmaRow";
import { IndexTRow, IntegerPartTRow } from "@/features/main-workspace/spiralWorkspaceLayer";
import { FracTHistogramPanel } from "@/features/zeros-of-f/controls/FracTHistogramPanel";
import { FracTSliceCoeffPanel } from "@/features/zeros-of-f/controls/FracTSliceCoeffPanel";
import { OverlaySetsPanel } from "@/features/zeros-of-f/controls/OverlaySetsPanel";
import { PACKED_OVERLAY_ROW_COUNTS, type OverlayRowCounts } from "@/features/zeros-of-f/overlaySets";
import { FracTJustOneDigitsControl } from "@/features/zeros-of-f/controls/FracTJustOneDigitsControl";
import { FracTJustOneSlider } from "@/features/zeros-of-f/controls/FracTJustOneSlider";
import { FracTQuarterRadios } from "@/features/zeros-of-f/controls/FracTQuarterRadios";
import { FracTRangeSlider } from "@/features/zeros-of-f/controls/FracTRangeSlider";
import { SpectrumBar } from "@/features/zeros-of-f/controls/SpectrumBar";
import { TwoSideToggle } from "@/features/zeros-of-f/controls/TwoSideToggle";
import {
  DEFAULT_SUM_VIEW_CONTROLS,
  type ScanControlsState,
  type DisplayControlsState,
  type SumViewControlsState,
  type ZerosTabViewMode,
} from "@/features/zeros-of-f/types";
import { clampLastLinksCount } from "@/shared/math/bigSigmaSpiral";
import { clamp } from "@/shared/math/clamp";
import {
  isSiegelZerosHarvest,
  parseZerosHarvestFamily,
  type ZerosHarvestFamily,
} from "@/shared/math/zerosOfF/harvestFamily";
import {
  parsePlanarZerosDisplayView,
  parseZerosDisplayView,
  zerosDisplayViewPatch,
} from "@/shared/math/zerosOfF/displayView";
import {
  clampSpectrumFeather,
  MAX_SPECTRUM_FEATHER,
  quarterSpectrumCss,
} from "@/features/zeros-of-f/fracToHue";
import { fracTThousandthsBin } from "@/shared/math/zerosOfF/fracTDisplayFilter";
import { fracTFourierBoundaryLabel } from "@/shared/math/zerosOfF/fracTFourierBoundary";
import { fracTSmoothApBoundaryLabel } from "@/shared/math/zerosOfF/fracTSmoothApBoundary";
import { fracTClosedBoundaryLabel, fracTSliceBoundaryLabel } from "@/shared/math/zerosOfF/fracTSliceBoundary";
import { imagToIndex, indexToImag } from "@/shared/math/zetaEms";
import type { ScorerZeroCounts } from "@/shared/io/scorerZerosCsv";
import type { ScanActivity, ScanBackendChoice } from "@/shared/scan/scanBackend";
import { AnimationSpeedRow } from "@/shared/toolbox/indexAnimationRows";
import type { ToolboxControl, ToolboxSection } from "@/shared/visualization/contracts";

const SUM_VIEW_INTEGER_T_MAX = 350_000;
const SUM_VIEW_INDEX_MAX = SUM_VIEW_INTEGER_T_MAX + 1 - 1e-9;

/**
 * Arguments kept compatible with {@link ZerosOfFModel.getToolboxContributions}.
 * Scan-engine fields are unused now that the tab is display-only.
 */
export interface ToolboxBuildArgs {
  tabViewMode?: ZerosTabViewMode;
  onTabViewModeChange?: (mode: ZerosTabViewMode) => void;
  sumControls?: SumViewControlsState;
  onSumControlsChange?: (patch: Partial<SumViewControlsState>) => void;
  onSumIndexFromControl?: (index: number) => void;
  onSumSigmaFromControl?: (sigma: number) => void;
  onSumSigmaRangeChange?: (min: number, max: number) => void;
  harvestFamily: ZerosHarvestFamily;
  onHarvestFamilyChange(next: ZerosHarvestFamily): void;
  backendId: ScanBackendChoice;
  workersHint: number;
  backendDisplayName: string;
  workersActive: number | null;
  workersCap: number | null;
  scan: ScanControlsState;
  display: DisplayControlsState;
  overlayRowCounts?: OverlayRowCounts;
  /** Zeros per resonance in the loaded Scorer CSV; null until it loads. */
  scorerZeroCounts?: ScorerZeroCounts | null;
  progress: { linesDone: number; linesTotal: number; pointsRecorded: number };
  scanActivity: ScanActivity | null;
  progressRowsPerMinute: number | null;
  scanStartedAt: number | null;
  isRunning: boolean;
  isPaused: boolean;
  lastError: string | null;
  activeScanId?: string | null;
  onScanChange(next: ScanControlsState): void;
  onDisplayChange(patch: Partial<DisplayControlsState>): void;
  onBackendChange(next: ScanBackendChoice): void;
  onWorkersHintChange(next: number): void;
  onPause(): void;
  onResume(): void;
  onStop(): void;
  onComputeTAverages(): void;
  onComputeSegmentPostProc(): void;
  onForceRunZeroCount(): void;
  onStopZeroCount(): void;
  onExportZeroCountCsv(): void;
  isZeroCountRunning: boolean;
  onStartRefine(): void;
  onCancelRefine(): void;
  refineProgress: { done: number; total: number };
  isRefining: boolean;
  onComputeTRowHighlight(): void;
  onClearDisplay(): void;
}

/** Which extras sit under Color / {T} on the Display accordion. */
export type DisplayAccordionOptions = {
  include3d: boolean;
  includeYAxis: boolean;
  /** Zeros-of-f only. Big Sigma has its own hover label. */
  includeZeroHover?: boolean;
  /** Zeros-of-f only: feather slider above the quarter-band spectrum bar. */
  includeSpectrumFeather?: boolean;
};

/** Big Sigma: planar {T} filter only. */
export const BIG_SIGMA_DISPLAY_ACCORDION_OPTIONS: DisplayAccordionOptions = {
  include3d: false,
  includeYAxis: false,
};

/**
 * Display accordion body shared by zeros-of-f and Big Sigma.
 * Big Sigma drops Y-axis and 3D.
 */
export function buildDisplayAccordionControls(
  display: DisplayControlsState,
  onDisplayChange: (patch: Partial<DisplayControlsState>) => void,
  options: DisplayAccordionOptions,
): ToolboxControl[] {
  const viewOptions = options.include3d
    ? [
      { label: "all zeros with an exact {T}", value: "exactFracT" },
      { label: "all zeros within a range of {T}", value: "rangeFracT" },
      { label: "3D representation", value: "fracT3d" },
    ]
    : [
      { label: "all zeros with an exact {T}", value: "exactFracT" },
      { label: "all zeros within a range of {T}", value: "rangeFracT" },
    ];
  const viewExtras: ToolboxControl[] = [];
  if (options.include3d && display.displayView === "fracT3d") {
    viewExtras.push({
      kind: "range-slider",
      id: "frac-t-3d-depth",
      label: "depth",
      value: display.fracT3dDepth,
      min: 0.05,
      max: 2,
      step: 0.05,
      onChange: (depth: number) => onDisplayChange({ fracT3dDepth: depth }),
    });
  } else if (options.includeYAxis && display.displayView !== "fracT3d") {
    viewExtras.push({
      kind: "select",
      id: "y-axis-mode",
      label: "Y-axis",
      value: display.yAxisMode,
      options: [
        { label: "T (raw)", value: "T" },
        { label: "frac(T)", value: "fracT" },
      ],
      onChange: (v: string) => {
        const mode: "T" | "fracT" = v === "fracT" ? "fracT" : "T";
        onDisplayChange({ yAxisMode: mode });
      },
    });
  }
  const controls: ToolboxControl[] = [
    {
      kind: "select",
      id: "display-view",
      label: "Display",
      value: display.displayView === "fracT3d" && !options.include3d
        ? "rangeFracT"
        : display.displayView,
      options: viewOptions,
      onChange: (v) => {
        const view = options.include3d
          ? parseZerosDisplayView(v, display.fracTFilterKind)
          : parsePlanarZerosDisplayView(v, display.fracTFilterKind);
        onDisplayChange(zerosDisplayViewPatch(view));
      },
    },
    {
      kind: "select",
      id: "color-mode",
      label: "Color by",
      value: display.colorMode === "grayscale" ? "grayscale" : "spectrum",
      options: [
        { label: "Spectrum (frac T)", value: "spectrum" },
        { label: "Grayscale", value: "grayscale" },
      ],
      onChange: (v) => {
        const mode: DisplayControlsState["colorMode"] =
          v === "grayscale" ? "grayscale" : "spectrum";
        onDisplayChange({ colorMode: mode });
      },
    },
    ...(options.includeSpectrumFeather === true && display.colorMode === "spectrum"
      ? [{
        kind: "number" as const,
        id: "spectrum-feather",
        label: "Feather the spectrum colors",
        value: parseFloat(clampSpectrumFeather(display.spectrumFeather).toFixed(4)),
        min: 0,
        max: MAX_SPECTRUM_FEATHER,
        step: 0.001,
        onChange: (spectrumFeather: number) =>
          onDisplayChange({ spectrumFeather: clampSpectrumFeather(spectrumFeather) }),
      }]
      : []),
    {
      kind: "custom",
      id: "spectrum-bar-inline",
      render: () =>
        display.colorMode === "spectrum"
          ? createElement(
            SpectrumBar,
            options.includeSpectrumFeather === true
              ? { feather: display.spectrumFeather }
              : {},
          )
          : null,
    },
    {
      kind: "custom",
      id: "frac-t-just-one-digits",
      render: () => display.displayView === "exactFracT"
        ? createElement(FracTJustOneDigitsControl, {
          value: display.fracTJustOneDigits,
          onChange: (digits) =>
            onDisplayChange({ fracTJustOneDigits: digits }),
        })
        : null,
    },
    {
      kind: "custom",
      id: "frac-t-just-one",
      render: () => display.displayView === "exactFracT"
        ? createElement(FracTJustOneSlider, {
          value: display.fracTJustOne,
          digits: display.fracTJustOneDigits,
          onValueChange: (justOne: number) =>
            onDisplayChange({ fracTJustOne: justOne }),
        })
        : null,
    },
    {
      kind: "custom",
      id: "frac-t-range",
      render: () => display.displayView === "exactFracT"
        ? null
        : createElement(FracTRangeSlider, {
          min: display.fracTRangeMin,
          max: display.fracTRangeMax,
          mode: display.fracTRangeMode,
          onChange: (lo: number, hi: number) =>
            onDisplayChange({ fracTRangeMin: lo, fracTRangeMax: hi }),
        }),
    },
    {
      kind: "custom",
      id: "frac-t-range-mode",
      render: () => display.displayView === "exactFracT"
        ? null
        : createElement(TwoSideToggle, {
          label: "fracT toggle",
          leftValue: "between",
          rightValue: "outside",
          leftLabel: "between",
          rightLabel: "outside",
          value: display.fracTRangeMode,
          onChange: (mode: "between" | "outside") =>
            onDisplayChange({ fracTRangeMode: mode }),
        }),
    },
    {
      kind: "custom",
      id: "frac-t-quarter",
      render: () => display.displayView === "exactFracT"
        ? null
        : createElement(FracTQuarterRadios, {
          enabled: display.fracTQuarterEnabled,
          preset: display.fracTQuarterPreset,
          onEnabledChange: (enabled: boolean) =>
            onDisplayChange({ fracTQuarterEnabled: enabled }),
          onPresetChange: (preset) =>
            onDisplayChange({ fracTQuarterPreset: preset }),
        }),
    },
    ...viewExtras,
  ];
  if (options.includeZeroHover === true) {
    controls.push({
      kind: "toggle",
      id: "show-zero-hover-info",
      label: "hover info (σ, T, twin)",
      value: display.showHoverInfo,
      onChange: (v) => onDisplayChange({ showHoverInfo: v }),
    });
  }
  return controls;
}

/** Counts come from the loaded CSV, so the label shows what is drawn after each regeneration. */
function scorerZerosLabel(counts: ScorerZeroCounts | null): string {
  const name = "Left-most Scorer zeros (computed), both resonances, T up to 13000";
  if (counts === null) return name;
  return `${name}: ${counts.nu0.toLocaleString()} gold, ${counts.nu1.toLocaleString()} blue`;
}

function buildSumControlsSection(args: ToolboxBuildArgs): ToolboxSection {
  const sum = args.sumControls ?? DEFAULT_SUM_VIEW_CONTROLS;
  const setSum = (patch: Partial<SumViewControlsState>): void => {
    args.onSumControlsChange?.(patch);
  };
  const setIndex = (rawIndex: number): void => {
    const clamped = clamp(rawIndex, 0, SUM_VIEW_INDEX_MAX);
    if (args.onSumIndexFromControl !== undefined) {
      args.onSumIndexFromControl(clamped);
    } else {
      setSum({ index: clamped, chainFromZero: false });
    }
  };
  const setSigma = (rawSigma: number): void => {
    if (args.onSumSigmaFromControl !== undefined) {
      args.onSumSigmaFromControl(rawSigma);
    } else {
      const lo = Math.min(sum.sigmaMin, sum.sigmaMax);
      const hi = Math.max(sum.sigmaMin, sum.sigmaMax);
      setSum({ sigma: clamp(rawSigma, lo, hi), chainFromZero: false });
    }
  };

  return {
    id: "sum-controls",
    contributorId: "zeros-of-f:sum-controls",
    title: "",
    bare: true,
    order: 1.5,
    controls: [
      {
        kind: "custom",
        id: "sum-index-T-and-t",
        render: () => createElement(IndexTRow, {
          indexValue: sum.index,
          tValue: indexToImag(sum.index, false),
          onTChange: (v: number) => setIndex(v),
          onTFromtChange: (tIn: number) => setIndex(imagToIndex(Math.max(0, tIn), false)),
        }),
      },
      {
        kind: "custom",
        id: "sum-sigma-plain",
        render: () => createElement(BigSigmaSigmaRow, {
          sigma: sum.sigma,
          min: sum.sigmaMin,
          max: sum.sigmaMax,
          onSigmaChange: (v: number) => setSigma(v),
          onRangeChange: (min: number, max: number) => {
            if (args.onSumSigmaRangeChange !== undefined) {
              args.onSumSigmaRangeChange(min, max);
            } else {
              const lo = Math.min(min, max);
              const hi = Math.max(min, max);
              const nextSigma = clamp(sum.sigma, lo, hi);
              setSum({
                sigmaMin: min,
                sigmaMax: max,
                sigma: nextSigma,
                ...(nextSigma !== sum.sigma ? { chainFromZero: false } : {}),
              });
            }
          },
        }),
      },
      {
        kind: "custom",
        id: "sum-index-int",
        render: () => createElement(IntegerPartTRow, {
          intValue: Math.trunc(sum.index),
          maxInt: SUM_VIEW_INTEGER_T_MAX,
          onChange: (value: number) => {
            const frac = sum.index - Math.trunc(sum.index);
            setIndex(Math.max(0, Math.min(SUM_VIEW_INTEGER_T_MAX, value)) + frac);
          },
        }),
      },
      {
        kind: "custom",
        id: "sum-index-frac",
        render: () => createElement(BigSigmaFracTRow, {
          value: parseFloat((sum.index - Math.trunc(sum.index)).toFixed(6)),
          onChange: (value: number) => {
            setIndex(Math.trunc(sum.index) + Math.max(0, Math.min(0.999999, value)));
          },
        }),
      },
      {
        kind: "custom",
        id: "sum-animate",
        render: () => createElement(AnimationSpeedRow, {
          value: sum.animSpeed,
          range: sum.animSpeedMax,
          hold: false,
          onChange: (v: number) => {
            setSum({ animSpeed: clamp(v, -sum.animSpeedMax, sum.animSpeedMax) });
          },
        }),
      },
      {
        kind: "custom",
        id: "sum-animate-speed",
        render: () => createElement(BigSigmaAnimSpeedRadios, {
          value: sum.animSpeedMax,
          onChange: (speed: BigSigmaAnimSpeed) => {
            setSum({
              animSpeedMax: speed,
              animSpeed: clamp(sum.animSpeed, -speed, speed),
            });
          },
        }),
      },
      {
        kind: "option-toggle",
        id: "sum-chain-extent",
        label: "links",
        value: sum.chainExtent === "entire" ? 0 : 1,
        options: [{ label: "entire" }, { label: "⌊T⌋" }],
        onChange: (v: number) => {
          setSum({ chainExtent: v === 0 ? "entire" : "floorT" });
        },
      },
      {
        kind: "toggle",
        id: "sum-last-links-only",
        label: "last links",
        value: sum.lastLinksOnly,
        onChange: (v: boolean) => setSum({ lastLinksOnly: v }),
      },
      {
        kind: "number",
        id: "sum-last-links-count",
        label: "n",
        value: sum.lastLinksCount,
        min: 1,
        max: 10,
        step: 1,
        onChange: (v: number) => setSum({ lastLinksCount: clampLastLinksCount(v) }),
      },
      {
        kind: "toggle",
        id: "sum-show-r1ak",
        label: args.harvestFamily === "siegel" ? "R1ak" : "R1ps",
        labelColor: "#ffffff",
        value: sum.showR1ak,
        onChange: (v: boolean) => setSum({ showR1ak: v }),
      },
      {
        kind: "toggle",
        id: "sum-show-crosshair",
        label: "σ, T crosshair",
        value: sum.showCrosshair,
        onChange: (v: boolean) => setSum({ showCrosshair: v }),
      },
      {
        kind: "number",
        id: "sum-zeros-dimmer",
        label: "zeros dimmer",
        value: parseFloat(sum.zerosDimmer.toFixed(2)),
        min: 0,
        max: 1,
        step: 0.01,
        onChange: (v: number) => setSum({ zerosDimmer: clamp(v, 0, 1) }),
      },
    ],
  };
}

/**
 * Display and frac(T) histogram only. Scan / engine / overlay toolbox
 * sections were removed so this tab is a viewer for a committed scan.
 */
export function buildToolboxSections(args: ToolboxBuildArgs): ToolboxSection[] {
  const tabViewMode: ZerosTabViewMode = args.tabViewMode ?? "zeros";
  const huntCloud = !isSiegelZerosHarvest(args.harvestFamily);
  const sections: ToolboxSection[] = [
    {
      id: "view-mode",
      contributorId: "zeros-of-f:view-mode",
      title: "",
      bare: true,
      order: 0,
      controls: [
        {
          kind: "custom",
          id: "zeros-sum-view-toggle",
          render: () => createElement(TwoSideToggle<ZerosTabViewMode>, {
            label: "",
            leftValue: "zeros",
            rightValue: "sum",
            leftLabel: "zeros view",
            rightLabel: "sum view",
            value: tabViewMode,
            onChange: (mode: ZerosTabViewMode) => {
              args.onTabViewModeChange?.(mode);
            },
          }),
        },
      ],
    },
    {
      id: "harvest-family",
      contributorId: "zeros-of-f:harvest-family",
      title: "",
      bare: true,
      order: 1,
      controls: [
        {
          kind: "select",
          id: "harvest-family",
          label: "f(s)",
          value: args.harvestFamily,
          options: [
            { label: "Siegel's f(s)", value: "siegel" },
            { label: "R1ps f(s)", value: "r1ps" },
            { label: "R2ps f(s)", value: "r2ps" },
          ],
          onChange: (v) => args.onHarvestFamilyChange(parseZerosHarvestFamily(v)),
        },
      ],
    },
  ];
  if (tabViewMode === "sum") {
    sections.push(buildSumControlsSection(args));
  }
  sections.push({
    id: "display",
    contributorId: "zeros-of-f:display",
    title: "Display",
    order: 2,
    controls: buildDisplayAccordionControls(args.display, args.onDisplayChange, {
      include3d: true,
      includeYAxis: true,
      includeZeroHover: true,
      includeSpectrumFeather: true,
    }),
  });
  const toggles = buildTogglesSection(args);
  if (huntCloud) {
    sections.push({
      id: "frac-t-histogram",
      contributorId: "zeros-of-f:frac-t-histogram",
      title: "Frac(T) histogram",
      order: 2.05,
      defaultCollapsed: true,
      CustomPanel: FracTHistogramPanel,
    });
    sections.push(toggles);
    return sections;
  }
  return [
    ...sections,
    {
      id: "boundaries",
      contributorId: "zeros-of-f:boundaries",
      title: "Boundaries",
      order: 2.01,
      defaultCollapsed: false,
      controls: [
        {
          kind: "toggle",
          id: "show-pauls-boundary",
          label: "T = 0.173 · |σ|^{1.61}",
          value: args.display.showPaulsBoundary,
          onChange: (v) => args.onDisplayChange({ showPaulsBoundary: v }),
        },
        {
          kind: "toggle",
          id: "show-frac-t-slice-boundary",
          label: args.display.showFracTSliceBoundary
            ? fracTSliceBoundaryLabel(args.display.fracTJustOne)
            : "{T} boundary",
          ...(args.display.showFracTSliceBoundary
            ? {
              labelColor: quarterSpectrumCss(
                fracTThousandthsBin(args.display.fracTJustOne) / 1000,
                args.display.spectrumFeather,
              ),
            }
            : {}),
          value: args.display.showFracTSliceBoundary,
          onChange: (v) => args.onDisplayChange({ showFracTSliceBoundary: v }),
        },
        {
          kind: "toggle",
          id: "show-frac-t-closed-boundary",
          label: args.display.showFracTClosedBoundary
            ? fracTClosedBoundaryLabel(args.display.fracTJustOne)
            : "{T} formula",
          ...(args.display.showFracTClosedBoundary
            ? {
              labelColor: quarterSpectrumCss(
                fracTThousandthsBin(args.display.fracTJustOne) / 1000,
                args.display.spectrumFeather,
              ),
            }
            : {}),
          value: args.display.showFracTClosedBoundary,
          onChange: (v) => args.onDisplayChange({ showFracTClosedBoundary: v }),
        },
        {
          kind: "toggle",
          id: "show-frac-t-fourier-boundary",
          label: args.display.showFracTFourierBoundary
            ? fracTFourierBoundaryLabel(args.display.fracTJustOne)
            : "{T} Fourier",
          ...(args.display.showFracTFourierBoundary
            ? {
              labelColor: quarterSpectrumCss(
                fracTThousandthsBin(args.display.fracTJustOne) / 1000,
                args.display.spectrumFeather,
              ),
            }
            : {}),
          value: args.display.showFracTFourierBoundary,
          onChange: (v) => args.onDisplayChange({ showFracTFourierBoundary: v }),
        },
        {
          kind: "toggle",
          id: "show-frac-t-smooth-ap-boundary",
          label: args.display.showFracTSmoothApBoundary
            ? fracTSmoothApBoundaryLabel(args.display.fracTJustOne)
            : "T = a(ϑ) · |σ|^{p(ϑ)}",
          ...(args.display.showFracTSmoothApBoundary
            ? {
              labelColor: quarterSpectrumCss(
                fracTThousandthsBin(args.display.fracTJustOne) / 1000,
                args.display.spectrumFeather,
              ),
            }
            : {}),
          value: args.display.showFracTSmoothApBoundary,
          onChange: (v) => args.onDisplayChange({ showFracTSmoothApBoundary: v }),
        },
        {
          kind: "toggle",
          id: "show-boundary",
          label: "π-boundary: T = ((|σ| + 2π)/π)^(1/0.62)",
          value: args.display.showBoundary,
          onChange: (v) => args.onDisplayChange({ showBoundary: v }),
        },
        {
          kind: "toggle",
          id: "show-arias-boundary",
          label: "Arias: −σ = 2.2 · T^(2/3)",
          value: args.display.showAriasBoundary,
          onChange: (v) => args.onDisplayChange({ showAriasBoundary: v }),
        },
        {
          kind: "toggle",
          id: "show-imag-cube-root-boundary",
          label: "σ = −0.81975 · t^(1/3)",
          value: args.display.showImagCubeRootBoundary,
          onChange: (v) => args.onDisplayChange({ showImagCubeRootBoundary: v }),
        },
        {
          kind: "toggle",
          id: "show-imag-cube-root-series-boundary",
          label: "σ = −0.81975 · t^(1/3) − 1.3 · t^(1/6) − 0.57",
          value: args.display.showImagCubeRootSeriesBoundary,
          onChange: (v) => args.onDisplayChange({ showImagCubeRootSeriesBoundary: v }),
        },
        {
          kind: "toggle",
          id: "show-theorem5-boundary",
          label: "Thm 5: −σ = 0.81974·t^(1/3) + 1.30445·t^(1/6) + 0.57973",
          value: args.display.showTheorem5Boundary,
          onChange: (v) => args.onDisplayChange({ showTheorem5Boundary: v }),
        },
        {
          kind: "toggle",
          id: "show-theorem5-points",
          label: "ρ_N^(ν), both resonances, N = 1…4000",
          value: args.display.showTheorem5Points,
          onChange: (v) => args.onDisplayChange({ showTheorem5Points: v }),
        },
        {
          kind: "toggle",
          id: "show-scorer-expansion-points",
          label: "s_N,± (eq. 37), n = 1, 2, 3, N = 1…4000",
          value: args.display.showScorerExpansionPoints,
          onChange: (v) => args.onDisplayChange({ showScorerExpansionPoints: v }),
        },
        {
          kind: "toggle",
          id: "show-scorer-zeros",
          label: scorerZerosLabel(args.scorerZeroCounts ?? null),
          value: args.display.showScorerZeros,
          onChange: (v) => args.onDisplayChange({ showScorerZeros: v }),
        },
      ],
    },
    {
      id: "overlay-sets",
      contributorId: "zeros-of-f:overlay-sets",
      title: "Zero sets",
      order: 2.02,
      defaultCollapsed: false,
      CustomPanel: () =>
        createElement(OverlaySetsPanel, {
          display: args.display,
          counts: args.overlayRowCounts ?? PACKED_OVERLAY_ROW_COUNTS,
          onDisplayChange: args.onDisplayChange,
        }),
    },
    {
      id: "frac-t-slice-coeff",
      contributorId: "zeros-of-f:frac-t-slice-coeff",
      title: "{T} fit a, p",
      order: 2.04,
      defaultCollapsed: false,
      CustomPanel: () =>
        createElement(FracTSliceCoeffPanel, {
          justOne: args.display.fracTJustOne,
        }),
    },
    {
      id: "frac-t-histogram",
      contributorId: "zeros-of-f:frac-t-histogram",
      title: "Frac(T) histogram",
      order: 2.05,
      defaultCollapsed: true,
      CustomPanel: FracTHistogramPanel,
    },
    toggles,
  ];
}

/** Bottom accordion. Reflected R2ps is an R1ps-only overlay. */
function buildTogglesSection(args: ToolboxBuildArgs): ToolboxSection {
  const controls: ToolboxControl[] = [];
  if (args.harvestFamily === "r1ps") {
    controls.push({
      kind: "toggle",
      id: "show-reflected-r2ps",
      label: "reflected R2ps",
      labelColor: "#5aa0ff",
      value: args.display.showReflectedR2ps,
      onChange: (v) => args.onDisplayChange({ showReflectedR2ps: v }),
    });
  }
  controls.push(
    {
      kind: "toggle",
      id: "show-zeta-zeros",
      label: "zeros of zeta",
      labelColor: "#FF00FF",
      value: args.display.showZetaZeros,
      onChange: (v) => args.onDisplayChange({ showZetaZeros: v }),
    },
    {
      kind: "toggle",
      id: "show-zeta-champions",
      label: "champions of zeta",
      labelColor: "#ff5252",
      value: args.display.showZetaChampions,
      onChange: (v) => args.onDisplayChange({ showZetaChampions: v }),
    },
  );
  return {
    id: "toggles",
    contributorId: "zeros-of-f:toggles",
    title: "Toggles",
    order: 3,
    controls,
  };
}

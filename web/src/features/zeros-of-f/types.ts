import type { FVariant } from "@/shared/math/zerosOfF";
import type { FracTQuarterPreset } from "@/shared/math/zerosOfF/fracTDisplayFilter";
import type { ZerosHarvestFamily } from "@/shared/math/zerosOfF/harvestFamily";
import type { ScanAlgorithm, ScanBackendChoice } from "@/shared/scan/scanBackend";

/** Persistent state envelope for the zeros-of-f workspace. */
export type ZerosOfFSerializableState = {
  scan: ScanControlsState;
  display: DisplayControlsState;
  /** Packed harvest: Siegel Σ₁+R1ak or the AWS R1ps hunt. */
  harvestFamily: ZerosHarvestFamily;
  backendId: ScanBackendChoice;
  workersHint: number;
  /** Most recently archived scan; loaded back from IndexedDB on resume. */
  activeScanId: string | null;
  /** Camera pan / zoom snapshot (units = data space). */
  view: { panX: number; panY: number; zoom: number };
};

export type ScanControlsState = {
  variant: FVariant;
  /** Which sign of the imaginary part to investigate.
   *  - `pos`: t > 0, imaginary part +I(T), remainder R1ak/R1ps (the `variant`).
   *  - `neg`: t < 0, imaginary part −I(T), remainder R1nak (negative-t formulas).
   *  The effective scan variant is `"R1nak"` when `branch === "neg"`, otherwise
   *  `variant`. Stored separately so flipping back to `pos` restores the exact
   *  prior positive-t variant. */
  branch: "pos" | "neg";
  /** Negative-t branch only: when on, ignore the `tMin`/`tMax` boxes and scan a
   *  thin T band straddling the R1nak zeros ridge σ*(T) (each σ line scans
   *  `T*(σ) ± Δ`). The T boxes grey out. Ignored when `branch === "pos"`. */
  ridgeRange: boolean;
  tMin: number;
  tMax: number;
  sigmaMin: number;
  sigmaMax: number;
  linesPerSigma: number;
  /** When on, scale `linesPerSigma` by `1/|σ|` for σ < −1 so deep negative σ
   *  uses fewer scan lines. σ ≥ −1 keeps the unscaled value. */
  linesPerSigmaAdaptive: boolean;
  /** Initial uniform sampling density of `Z(t) = log|R₁| − log|Σ₁|` per integer-T period. */
  samplesPerT: number;
  /** Binary bisection iterations applied to each Z sign-change bracket
   * (sign-change algorithm) OR golden-section iterations (minima algorithm). */
  bisectionIters: number;
  /** Detection algorithm. Defaults to legacy `sign-change`. */
  algorithm: ScanAlgorithm;
  /** Acceptance threshold for `minima` algorithm. Range 0..1. */
  acceptDepth: number;
  seed: number;
};

/**
 * Color mode for the live scatter.
 *  - `spectrum`: HSV by `frac(T)` via the no-wrap `fracToHue` mapping.
 *  - `grayscale`: every point neutral white; only positional info matters.
 *  - `depth`: white modulated by goodness from `−log10(depth)`, auto-fit
 *    to the data's range. Deeper |f|-minimum → brighter.
 *  - `spectrum-depth`: spectrum hue (frac T) modulated by depth goodness.
 *    Combines both signals: hue tells you `frac(T)`, brightness tells you
 *    how close to a true zero the point is.
 *
 * `depth` and `spectrum-depth` only carry their depth signal for points
 * produced by the `minima` scan algorithm — points without depth fall back
 * to magnitude-thresholded grayscale (depth) or full-brightness spectrum
 * (spectrum-depth).
 */
export type ColorMode = "spectrum" | "grayscale" | "depth" | "spectrum-depth" | "phase-r" | "r1-mag" | "f-rform" | "by-family";

/** Top-of-tab mode switch: normal zeros explorer vs frozen-zeros + spiral sum view. */
export type ZerosTabViewMode = "zeros" | "sum";

export type SumViewAnimSpeed = 1 | 2 | 3 | 4 | 5;

export type SumViewControlsState = {
  sigma: number;
  sigmaMin: number;
  sigmaMax: number;
  index: number;
  showR1ak: boolean;
  chainExtent: "entire" | "floorT";
  lastLinksOnly: boolean;
  lastLinksCount: number;
  zerosDimmer: number;
  showCrosshair: boolean;
  chainFromZero: boolean;
  animSpeed: number;
  animSpeedMax: SumViewAnimSpeed;
};

export const DEFAULT_SUM_VIEW_CONTROLS: SumViewControlsState = {
  sigma: 0.5,
  sigmaMin: -500,
  sigmaMax: 1,
  index: 6.18,
  showR1ak: true,
  chainExtent: "floorT",
  lastLinksOnly: false,
  lastLinksCount: 2,
  zerosDimmer: 0.25,
  showCrosshair: true,
  chainFromZero: false,
  animSpeed: 0,
  animSpeedMax: 3,
};

/** How the harvest is shown: one {T} bin, a {T} band, or σ–T–{T} 3D. */
export type ZerosDisplayView = "exactFracT" | "rangeFracT" | "fracT3d";

export type DisplayControlsState = {
  /** Critical-strip guides: solid green at σ=0 and σ=1, dashed green at
   *  σ=1/2. When ON, also clamps the viewport to σ ∈ [-8, 8] and T ∈ [0, 10]
   *  so the guides occupy a useful fraction of the screen. */
  showCriticalStripGuides: boolean;
  colorMode: ColorMode;
  /** Transition feather around the quarter-mark secondary colors in zeros-of-f. */
  spectrumFeather: number;
  /** Default-on-startup background scan filename (matches an archive label). */
  backgroundDefaultName: string;
  /** "Strip mode": σ axis locked to [-1, 2], wheel/drag zoom and pan only
   *  affect T. Toggled on by the Strip canvas button; toggled off by Plane. */
  stripMode: boolean;
  /** "Plane mode": σ ∈ [-350, 10], T ∈ [-30, 3000], generous zoom-out so the
   *  full data range is reachable. Mutually exclusive with stripMode — the
   *  active mode's button greys out. */
  planeMode: boolean;
  /** Which backend handles zero-count computation. `local` = Web Workers in
   *  the browser (default, free, slower for high T). `lambda` = AWS Lambda
   *  via the Fly hosted control plane (faster, $0.50–1 per T=0..300 sweep). */
  zeroCountBackend: "local" | "lambda";
  /** "Zero count boxes": draw a stack of unit-T-tall yellow boxes spanning the
   *  σ range, run the argument-principle to count zeros of the selected f in
   *  each box, and overlay an inline count-vs-box graph. Only meaningful for
   *  f-families that have isolated zeros (sum1R1, sum2R2). */
  showZeroCountBoxes: boolean;
  /** "Circles mode": every frame, lock pixel_per_T = pixel_per_σ · I'(T_center)
   *  so leg-ratio (and similar) ovals always render as circles regardless of
   *  zoom level. Mutually exclusive with stripMode / planeMode. */
  circlesMode: boolean;
  /** Show the first 10 000 nontrivial ζ zeros at σ = 1/2, in critical-strip magenta. */
  showZetaZeros: boolean;
  /** |Z| peaks of zeta at σ = 1/2, in the critical-strip champion red. */
  showZetaChampions: boolean;
  /** "Solo" overlay: when true, show ONLY Arias de Reyna's positive-t zeros of
   *  f(s) (162k, at their σ and T) and hide ALL other scene content — every
   *  scan, background, and overlay — regardless of their own toggles. */
  showAriasSolo: boolean;
  /** Horizontal grid lines at every integer T value (visualises Σ₁/Σ₂'s
   *  partial-sum jumps + the missing-point bands the scan algorithm skips). */
  showIntegerTGrid: boolean;
  /** Phase-field heatmap controls. The heatmap renders a textured plane
   *  behind the scan scatter; user clicks Refresh to recompute. */
  showPhaseHeatmap: boolean;
  heatmapFamily: "legAngle" | "legAngleOut" | "legRatio" | "sum1R1Angle";
  heatmapRForm: "ak" | "ps";
  /** Pixels per σ-unit and T-unit (independent). Texture width = densitySigma
   *  × σ-span; height = densityT × T-span. Per-axis density keeps detail
   *  consistent regardless of how wide a bounds rectangle is selected. */
  heatmapDensitySigma: number;
  heatmapDensityT: number;
  /** Partition the T axis into this many tiles, each a separate texture, so
   *  the total T-pixel count can exceed the 16384 GPU-per-texture cap. */
  heatmapTilesT: number;
  /** 0..1 — fades color by near-zero-ness. 0 = uniform brightness;
   *  1 = only the zero/green band stays bright. Live (no rebuild). */
  heatmapBrightness: number;
  /** Three "canned" leg-feature backgrounds, each loading a pre-saved scan
   *  and rendering it with phase-R color at full brightness. */
  showBgLegRatio: boolean;
  showBgLegFoldBack: boolean;
  showBgLegFoldOut: boolean;
  /** Background overlay for the "sum1+R1ak points" archived scan. Renders at
   *  1.5× normal point size to make the (typically sparse) zeros stand out. */
  showBgSum1R1ak: boolean;
  showBgSum1R1akV1: boolean;
  showBgLegRakFolded: boolean;
  showBgLegRpsFolded: boolean;
  showBgSum1R1ps: boolean;
  /** Background layer brightness multiplier (0..1). */
  backgroundOpacity: number;
  /** Background point-size multiplier relative to the live scatter's 2 px. */
  backgroundSizeMult: number;
  /**
   * Magnitude threshold: points with `yVal < magThresh` render at 100%
   * brightness; others dim to 10%. Slider goes 0…`magThreshMax`.
   */
  magThresh: number;
  magThreshMax: number;
  /** Show only points whose fractional T is in the (closed) interval
   * [fracTRangeMin, fracTRangeMax]. Defaults to [0, 1] = no filter.
   * Outside-range points are hidden (rendered transparent), not dimmed. */
  fracTRangeMin: number;
  fracTRangeMax: number;
  /** Selector for which side of the [min, max] band the visible points fall
   *  on. "between" = inside the band (default, original behavior). "outside"
   *  = inverse (hide inside, show points whose frac(T) is outside the band). */
  fracTRangeMode: "between" | "outside";
  /**
   * When true, the frac(T) radios replace the slider. When false the
   * slider and between/outside toggle behave as before.
   */
  fracTQuarterEnabled: boolean;
  /** Which radio is selected. Ignored until {@link fracTQuarterEnabled}. */
  fracTQuarterPreset: FracTQuarterPreset;
  /**
   * Kept so an older save still loads. The "drag .75–1" toggle is gone,
   * and nothing reads this to move a cloud.
   */
  fracTTwinNudge: boolean;
  /**
   * Which frac(T) control is live. `range` is the two-handle band;
   * `justOne` keeps zeros whose frac(T) starts with the slider's 3 digits.
   * Driven by {@link DisplayControlsState.displayView}.
   */
  fracTFilterKind: "range" | "justOne";
  /** Slider in [0, 1]; first `fracTJustOneDigits` decimals pick the match bin. */
  fracTJustOne: number;
  /**
   * How many leading {T} decimals the exact-{T} slider matches.
   * Boundaries always use 3 (the thousandths table).
   */
  fracTJustOneDigits: 1 | 2 | 3 | 4;
  /**
   * Top-of-Display dropdown. Exact {T} shows the just-one slider; range and
   * 3D show the band + between/outside; 3D also lifts {T} onto Z.
   */
  displayView: ZerosDisplayView;
  /**
   * Visual length of the {T} axis as a fraction of the fitted T axis
   * (depth = 1 → same world length as T). Used only in 3D.
   */
  fracT3dDepth: number;
  /** Orbit around Y (σ stays "horizontal-ish"), degrees 0..360. */
  orbitYawDeg: number;
  /** Orbit around X, degrees −85..85. */
  orbitPitchDeg: number;
  /** Beige outline of the configured scan rectangle. */
  showScanRect: boolean;
  showBoundary: boolean;
  /** Harvest lower edge for T ≥ 10: T = 0.173·|σ|^{1.61}. */
  showPaulsBoundary: boolean;
  /**
   * Exact-{T} slice envelope for thousandths 0.000..0.999.
   * Label and color follow the exact-{T} slider.
   */
  showFracTSliceBoundary: boolean;
  /** Slice identity: π-boundary × (2−sin πθ)² / |cos 2πθ|. */
  showFracTClosedBoundary: boolean;
  /** Pre-identity 10-harmonic Fourier+spike fit of L(θ)+P(θ) ln|σ|. */
  showFracTFourierBoundary: boolean;
  /**
   * Figure 2 mixed envelope: navy ã(ϑ) (high-cut of ln a) times
   * gold p̃(ϑ) (mid-cut of p). Color follows the exact-{T} slider.
   */
  showFracTSmoothApBoundary: boolean;
  /** AK list through Im(s)=10⁶ with σ ≤ −50. Default off. */
  showAkZerosSigmaLtNeg50: boolean;
  /** AK list through Im(s)=10⁶ with σ > −50. Default off. */
  showAkZerosSigmaGtNeg50: boolean;
  /** AK f-zeros with index T from 19999.5 to 25000.5. Default off. */
  showAkFsZerosT20k: boolean;
  /** AK f-zeros with index T from 99999.5 to 110000.5. Default off. */
  showAkFsZerosT100k: boolean;
  /** AK f-zeros with index T from 299999.5 to 319998.5. Default off. */
  showAkFsZerosT300k: boolean;
  /**
   * Separate σ ∈ [−500, −400] layer. Those zeros now live in the main
   * catalog, so this stays off and the bin is empty.
   */
  showSigmaNeg500ToNeg400: boolean;
  /**
   * Catalog in committed-scan.bin: T up to 4000, σ < −50, including the
   * zeros left of σ = −400. Default on.
   */
  showMainZeros: boolean;
  /**
   * f_N zeros for T from 4000 to 13000 above T = 0.173·|σ|^1.61 − 100.
   * Default on.
   */
  showAboveCurveZeros: boolean;
  /**
   * Text beside a hovered zero: its σ and T, and the same for its twin.
   * The ring on the zero under the cursor stays either way. Default off.
   */
  showHoverInfo: boolean;
  /**
   * R1ak zeros with σ near −1 to 1 and T up to 55 (`r1ak-s1t55.bin`).
   * Kept off: the cloud is dense enough to lag the tab on entry.
   */
  showR1akNearStrip: boolean;
  /**
   * R1ak critical-strip zeros, σ ∈ [0, 1], T from 55 to 300
   * (`r1ak-strip-t55-100.bin` and `r1ak-strip-t100-300.bin`). Default off.
   */
  showR1akStripTo300: boolean;
  /** R1ps view only: draw the packed R2ps zeros at σ ↦ 1 − σ. */
  showReflectedR2ps: boolean;
  /** Hunt-3 T ∈ [3975, 4000], σ < 0. Default off. */
  showT3975To4000SigmaLt0: boolean;
  /** Hunt-3 T ∈ [3975, 4000], σ ∈ [0, 1]. Default off. */
  showT3975To4000Sigma0To1: boolean;
  /** Hunt-3 T ∈ [3950, 3975), σ < 0. Default off. */
  showT3950To3975SigmaLt0: boolean;
  /** Hunt-3 T ∈ [3950, 3975), σ ∈ [0, 1]. Default off. */
  showT3950To3975Sigma0To1: boolean;
  /** Hunt-3 T ∈ [3925, 3950), σ < 0. Default off. */
  showT3925To3950SigmaLt0: boolean;
  /** Hunt-3 T ∈ [3925, 3950), σ ∈ [0, 1]. Default off. */
  showT3925To3950Sigma0To1: boolean;
  /** Hunt-3 T ∈ [3900, 3925), σ < 0. Default off. */
  showT3900To3925SigmaLt0: boolean;
  /** Hunt-3 T ∈ [3900, 3925), σ ∈ [0, 1]. Default off. */
  showT3900To3925Sigma0To1: boolean;
  /** Hunt-4 T ∈ [398.44, 3900], σ ∈ [−50, −10]. Default off. */
  showT398To3900SigmaNeg50ToNeg10: boolean;
  /** Hunt-5 T ∈ [398.44, 3900], σ ∈ [−20, 0]. Default off. */
  showT398To3900SigmaNeg20To0: boolean;
  /** Arias's left-edge boundary of the positive-t zeros: −σ = 2.2·T^(2/3). */
  showAriasBoundary: boolean;
  /** σ = −0.81975 · t^{1/3}, drawn against the index T via t = I(T). */
  showImagCubeRootBoundary: boolean;
  /** σ = −0.81975·t^{1/3} − 1.3·t^{1/6} − 0.57, drawn against the index T. */
  showImagCubeRootSeriesBoundary: boolean;
  /**
   * Theorem 5 main terms −σ = C* t^{1/3} + D* t^{1/6} + E*,
   * C* = 0.81974, D* = 1.30445, E* = 0.57973, drawn against the index T.
   */
  showTheorem5Boundary: boolean;
  /** ρ_N^{(ν)} for both resonances, N = 1, …, 4000. */
  showTheorem5Points: boolean;
  /**
   * Kuznetsov's eq. (37) points s_{N,±} for the Scorer zeros z_1, z_2, z_3
   * (Table 2 of Siegel_function_2), N = 1, …, 4000.
   */
  showScorerExpansionPoints: boolean;
  /** Computed left-most Scorer zeros (the z₁ family), both resonances. */
  showScorerZeros: boolean;
  /** T-average post-process visibility + filter threshold on |f|. */
  showTAverages: boolean;
  tAveragesThresh: number;
  /** Highlight row: int(T) + frac slider (0–9999 = 0.0000–0.9999). */
  showTRowHighlight: boolean;
  tRowIntT: number;
  tRowFracPos: number;
  /** Scan floor overlay: max(1, piBoundaryT(σ) − 50). */
  showScanFloor: boolean;
  /** Negative-t (R1nak) zeros ridge overlay: cyan curve σ*(T)=π·I(T)/(2·ln(⌊T⌋+½)),
   *  the locus that holds all the t<0 zeros. */
  showNegTZerosRidge: boolean;
  /** Segment post-process overlay. */
  showSegmentPostProc: boolean;
  segTTol: number;
  segSigmaGap: number;
  segMinPts: number;
  /** Segment refinement overlay. */
  showSegmentRefine: boolean;
  refineNSamples: number;
  refineSigmaDelta: number;
  /** Y-axis display mode: T (raw) or fracT (fractional part only). */
  yAxisMode: "T" | "fracT";
  /** Depth-mode contrast curve (gamma). Brightness range is auto-fit to the
   * data's log10(depth) span; this is the gamma exponent on top:
   *   goodness = ((logMax − log10(d)) / (logMax − logMin))^depthLogScale
   * γ=1 linear; γ<1 stretches the bright end; γ>1 stretches the dark end.
   * Range 0.1..5; default 1. (Field kept named `depthLogScale` for backward
   * compatibility with persisted state from the prior log-scale semantics.) */
  depthLogScale: number;
};

/** Single-slot dataset model. The legacy slot-B path is gone. */
export type ScanSlot = "A";

/** Default state used when nothing is restored. v1 small demo range. */
export const DEFAULT_STATE: ZerosOfFSerializableState = {
  harvestFamily: "siegel",
  scan: {
    variant: "R1ak",
    branch: "pos",
    ridgeRange: false,
    tMin: 1,
    tMax: 300,
    sigmaMin: -100,
    sigmaMax: -20,
    linesPerSigma: 30,
    linesPerSigmaAdaptive: false,
    samplesPerT: 1000,
    bisectionIters: 8,
    algorithm: "sign-change",
    acceptDepth: 0.0005,
    seed: 42,
  },
  display: {
    showCriticalStripGuides: false,
    colorMode: "spectrum",
    spectrumFeather: 0.015,
    backgroundDefaultName: "scan_default3-post-proc.csv",
    stripMode: false,
    planeMode: false,
    showZeroCountBoxes: false,
    zeroCountBackend: "local",
    circlesMode: false,
    showZetaZeros: false,
    showZetaChampions: false,
    showAriasSolo: false,
    showIntegerTGrid: false,
    showPhaseHeatmap: false,
    heatmapFamily: "legAngle",
    heatmapRForm: "ak",
    heatmapDensitySigma: 50,
    heatmapDensityT: 50,
    heatmapTilesT: 1,
    heatmapBrightness: 0,
    showBgLegRatio: false,
    showBgLegFoldBack: false,
    showBgLegFoldOut: false,
    showBgSum1R1ak: false,
    showBgSum1R1akV1: false,
    showBgLegRakFolded: false,
    showBgLegRpsFolded: false,
    showBgSum1R1ps: false,
    backgroundOpacity: 0.05,
    backgroundSizeMult: 1.0,
    magThresh: Number.MAX_VALUE,
    magThreshMax: Number.MAX_VALUE,
    fracTRangeMin: 0,
    fracTRangeMax: 1,
    fracTRangeMode: "between",
    fracTQuarterEnabled: false,
    fracTQuarterPreset: "ends",
    fracTTwinNudge: false,
    fracTFilterKind: "range",
    fracTJustOne: 0,
    fracTJustOneDigits: 3,
    displayView: "rangeFracT",
    fracT3dDepth: 0.4,
    orbitYawDeg: 35,
    orbitPitchDeg: 22,
    showScanRect: false,
    showBoundary: false,
    showPaulsBoundary: false,
    showFracTSliceBoundary: false,
    showFracTClosedBoundary: false,
    showFracTFourierBoundary: false,
    showFracTSmoothApBoundary: false,
    showAkZerosSigmaLtNeg50: false,
    showAkZerosSigmaGtNeg50: false,
    showAkFsZerosT20k: false,
    showAkFsZerosT100k: false,
    showAkFsZerosT300k: false,
    showSigmaNeg500ToNeg400: false,
    showMainZeros: true,
    showAboveCurveZeros: true,
    showHoverInfo: false,
    showR1akNearStrip: false,
    showR1akStripTo300: false,
    showReflectedR2ps: false,
    showT3975To4000SigmaLt0: false,
    showT3975To4000Sigma0To1: false,
    showT3950To3975SigmaLt0: false,
    showT3950To3975Sigma0To1: false,
    showT3925To3950SigmaLt0: false,
    showT3925To3950Sigma0To1: false,
    showT3900To3925SigmaLt0: false,
    showT3900To3925Sigma0To1: false,
    showT398To3900SigmaNeg50ToNeg10: false,
    showT398To3900SigmaNeg20To0: false,
    showAriasBoundary: false,
    showImagCubeRootBoundary: false,
    showImagCubeRootSeriesBoundary: false,
    showTheorem5Boundary: false,
    showTheorem5Points: false,
    showScorerExpansionPoints: false,
    showScorerZeros: false,
    showTAverages: false,
    tAveragesThresh: 0.003,
    showTRowHighlight: false,
    tRowIntT: 100,
    tRowFracPos: 0,
    showScanFloor: false,
    showNegTZerosRidge: false,
    showSegmentPostProc: false,
    segTTol: 0.002,
    segSigmaGap: 0.10,
    segMinPts: 1,
    showSegmentRefine: false,
    refineNSamples: 10,
    refineSigmaDelta: 0.1,
    yAxisMode: "T",
    depthLogScale: 1,
  },
  backendId: "local",
  workersHint: 0, // 0 = auto (use hardwareConcurrency cap)
  activeScanId: null,
  view: { panX: 0, panY: 0, zoom: 1 },
};

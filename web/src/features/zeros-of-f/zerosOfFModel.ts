import * as THREE from "three";

import { ZerosOfFSceneController } from "@/features/zeros-of-f/zerosOfFSceneController";
import { clamp } from "@/shared/math/clamp";
import { LocalWorkerBackend } from "@/shared/scan/backends/localWorker/localWorkerBackend";
import type {
  ScanActivity,
  ScanBackend,
  ScanBackendChoice,
  ScanHandle,
  ScanRequest,
} from "@/shared/scan/scanBackend";
import {
  ScanArchive,
  makeScanId,
  type ArchivedLine,
  type ArchiveEntry,
  type ArchiveListing,
  type ArchiveThumbnail,
} from "@/shared/persistence/scanArchive";
import { validate } from "@/shared/validation/types";
import type { ImportedDataset } from "@/shared/io/types";
import type {
  SelectionState,
  ToolboxContext,
  ToolboxSection,
  VisualizationModel,
} from "@/shared/visualization/contracts";
import { BoundaryCurveLayer } from "@/features/zeros-of-f/layers/boundaryCurveLayer";
import { Theorem5PointsLayer } from "@/features/zeros-of-f/layers/theorem5PointsLayer";
import { ScorerZerosLayer } from "@/features/zeros-of-f/layers/scorerZerosLayer";
import { ScorerExpansionLayer } from "@/features/zeros-of-f/layers/scorerExpansionLayer";
import { ariasBoundaryT, imagCubeRootBoundaryT, imagCubeRootSeriesBoundaryT, paulsBoundaryT, theorem5LeftmostBoundaryT } from "@/shared/math/zerosOfF/scanFloor";
import { THEOREM5_POINT_N_MAX } from "@/shared/math/zerosOfF/theorem5Rho";
import { fracTThousandthsBin } from "@/shared/math/zerosOfF/fracTDisplayFilter";
import {
  cssFromFitLocal,
  hoverSearchBox,
  pickNearestZeroHover,
  ZERO_HOVER_RADIUS_PX,
  type FitLocalCssMap,
  type HoverPointFn,
  type ZeroHoverSample,
} from "@/shared/math/zerosOfF/zeroHoverPick";
import {
  fracTClosedBoundaryT,
  fracTSliceBoundaryForJustOne,
  fracTSliceBoundaryT,
} from "@/shared/math/zerosOfF/fracTSliceBoundary";
import { fracTFourierBoundaryT } from "@/shared/math/zerosOfF/fracTFourierBoundary";
import { fracTSmoothApBoundaryT } from "@/shared/math/zerosOfF/fracTSmoothApBoundary";
import { quarterSpectrumHex } from "@/features/zeros-of-f/fracToHue";
import { DataFitGroup } from "@/features/zeros-of-f/layers/dataFitGroup";
import { ScanScatterLayer } from "@/features/zeros-of-f/layers/scanScatterLayer";
import { WhiteOpenRings, ZeroHoverMarker } from "@/features/zeros-of-f/layers/zeroHoverMarker";
import { TAveragesLayer, computeTAverages } from "@/features/zeros-of-f/layers/tAveragesLayer";
import { SegmentPostProcLayer } from "@/features/zeros-of-f/layers/segmentPostProcLayer";
import { segmentPostProcess, type SegmentPoint } from "@/features/zeros-of-f/postprocess/segmentPostProcess";
import { SegmentRefineLayer } from "@/features/zeros-of-f/layers/segmentRefineLayer";
import { refineBatch, type RefinedPoint } from "@/features/zeros-of-f/postprocess/segmentRefine";
import { cullAndRecover, type CullParams, type CulledPoint } from "@/features/zeros-of-f/postprocess/cullAndRecover";
import { ScanFloorLayer } from "@/features/zeros-of-f/layers/scanFloorLayer";
import { NegTZerosRidgeLayer } from "@/features/zeros-of-f/layers/negTZerosRidgeLayer";
import { CriticalStripGuidesLayer } from "@/features/zeros-of-f/layers/criticalStripGuidesLayer";
import { IntegerTGridLayer } from "@/features/zeros-of-f/layers/integerTGridLayer";
import { PhaseHeatmapLayer } from "@/features/zeros-of-f/layers/phaseHeatmapLayer";
import { ZeroCountBoxesLayer, type ZeroCountBox } from "@/features/zeros-of-f/layers/zeroCountBoxesLayer";
import { loadZeroCounts, makeZeroCountKey, saveZeroCounts } from "@/features/zeros-of-f/layers/zeroCountCache";
import { ZeroCountWorkerPool } from "@/features/zeros-of-f/zeroCountWorkerPool";
import { saveHeatmap as saveHeatmapToIdb, loadHeatmap as loadHeatmapFromIdb, clearHeatmap as clearHeatmapInIdb } from "@/features/zeros-of-f/layers/heatmapCache";
import { ZetaChampionsLayer, ZetaZerosLayer } from "@/features/zeros-of-f/layers/zetaZerosLayer";
import { AriasPositiveZerosLayer } from "@/features/zeros-of-f/layers/ariasPositiveZerosLayer";
import { AkZerosLayer } from "@/features/zeros-of-f/layers/akZerosLayer";
import { ScanProgressLayer } from "@/features/zeros-of-f/layers/scanProgressLayer";
import { TRowHighlightLayer, computeTRowHighlight } from "@/features/zeros-of-f/layers/tRowHighlightLayer";
import {
  DEFAULT_STATE,
  DEFAULT_SUM_VIEW_CONTROLS,
  type DisplayControlsState,
  type ScanControlsState,
  type SumViewControlsState,
  type ZerosOfFSerializableState,
  type ZerosTabViewMode,
} from "@/features/zeros-of-f/types";
import { validZerosOfFState } from "@/features/zeros-of-f/validation/validZerosOfFState";
import { buildToolboxSections } from "@/features/zeros-of-f/controls/toolboxSections";
import {
  buildManagedScanRecords,
  compatibleForCombine,
  renderScanThumbnail,
  type ManagedScanRecord,
} from "@/features/zeros-of-f/scanManagement";
import {
  decodeBin,
  hydrateImportedScanByLabel,
} from "@/features/zeros-of-f/importedScansHydration";
import { exportZerosOfFCsv } from "@/shared/io/zerosOfFCsv";
import { parseCommittedScanBin } from "@/shared/io/committedScanBin";
import {
  clampOrbitPitchDeg,
  fracT3dScaleZ,
  harvestPointXyz,
  mergeDisplayPatch,
  wrapOrbitYawDeg,
} from "@/shared/math/zerosOfF/displayView";
import { unionHarvestExtents } from "@/shared/math/zerosOfF/harvestExtent";
import {
  isSiegelZerosHarvest,
  parseZerosHarvestFamily,
  type ZerosHarvestFamily,
} from "@/shared/math/zerosOfF/harvestFamily";
import {
  OVERLAY_HARVEST_SLICES,
  type OverlayHarvestSliceId,
} from "@/shared/math/zerosOfF/harvestTBands";
import {
  AK_FS_ZERO_ROWS,
  PACKED_OVERLAY_ROW_COUNTS,
  harvestSliceShown,
  mainZerosLayerVisible,
  type OverlayRowCounts,
} from "@/features/zeros-of-f/overlaySets";
import { fScaledComponentsBatch, fVariantParts, iPrimeOfT, type FVariant } from "@/shared/math/zerosOfF";
import { reflectAcrossCriticalLine } from "@/shared/math/zerosOfF/reflectAcrossCriticalLine";

const WORKSPACE_ID = "zeros-of-f";
/** Packed harvest. Arrays store spiral index T, not Im(s). */
const COMMITTED_SCAN_URL = `${import.meta.env.BASE_URL}zeros-of-f/committed-scan.bin`;
/** Packed AWS R1ps hunts (σ ∈ [−300, 1], T up to 2000). */
const R1PS_HUNT_URL = `${import.meta.env.BASE_URL}zeros-of-f/r1ps-hunt.bin`;
/** Packed AWS R2ps hunts (σ ∈ [0, 100], T ∈ [0, 500]). */
const R2PS_HUNT_URL = `${import.meta.env.BASE_URL}zeros-of-f/r2ps-hunt.bin`;
/** Light blue, the Σ₂ family color, so reflected R2ps dots stay distinct. */
const R2PS_REFLECT_RGB: [number, number, number] = [90 / 255, 160 / 255, 1];
/** Packed AWS strip σ ∈ [−500, −400]. Arrays store spiral index T. */
const SIGMA_NEG500_TO_NEG400_URL = `${import.meta.env.BASE_URL}zeros-of-f/sigma-neg500-to-neg400.bin`;
/**
 * Packed AWS R1ak hunt, σ ∈ [−1, 2], T ∈ [0, 55]. The zeros found sit in
 * σ ∈ [−0.996, 0.967]. Fetched only when the Zero-sets box is on.
 */
const R1AK_STRIP_URL = `${import.meta.env.BASE_URL}zeros-of-f/r1ak-s1t55.bin`;
/** R1ak critical strip, σ ∈ [0, 1], T ∈ [55, 100]. Same lazy Zero-sets load. */
const R1AK_T55_URL = `${import.meta.env.BASE_URL}zeros-of-f/r1ak-strip-t55-100.bin`;
/** R1ak critical strip, σ ∈ [0, 1], T ∈ [100, 300]. Paired with the T = 55–100 bin. */
const R1AK_T100_URL = `${import.meta.env.BASE_URL}zeros-of-f/r1ak-strip-t100-300.bin`;
/** f_N locator, T ∈ [4000, 13000), above T = 0.173·|σ|^1.61 − 100. */
const ABOVE_CURVE_URL = `${import.meta.env.BASE_URL}zeros-of-f/ak-above-curve-t4000-13000.bin`;
const UI_PREF_STORAGE_KEY = "zerosOfFUiState";



function activeHostedScanStorage(): Storage | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

function sanitizeUiPrefsState(state: ZerosOfFSerializableState): ZerosOfFSerializableState {
  return {
    scan: structuredClone(state.scan),
    display: structuredClone(state.display),
    harvestFamily: state.harvestFamily,
    backendId: state.backendId,
    workersHint: state.workersHint,
    activeScanId: null,
    view: structuredClone(state.view),
  };
}

function readUiPrefs(): ZerosOfFSerializableState | null {
  const storage = activeHostedScanStorage();
  if (storage === null) return null;
  try {
    const raw = storage.getItem(UI_PREF_STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return sanitizeUiPrefsState(validate(parsed, validZerosOfFState));
  } catch {
    storage.removeItem(UI_PREF_STORAGE_KEY);
    return null;
  }
}

function writeUiPrefs(state: ZerosOfFSerializableState): void {
  const storage = activeHostedScanStorage();
  if (storage === null) return;
  try {
    const prefs = sanitizeUiPrefsState(state);
    storage.setItem(UI_PREF_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Best-effort UI preference; controls still apply for this session.
  }
}

interface ZerosOfFModelDeps {
  archive?: ScanArchive;
  createBackend?: (choice: ScanBackendChoice) => ScanBackend;
}

/**
 * Fixed viewport (σ, T) ranges. The data-fit transform is configured ONCE
 * with these values at construction; every loaded/scanned dataset is rendered
 * inside this same coordinate frame so the axis scale never jumps when the
 * user toggles scans on or off.
 *
 * Pan/zoom (handled by the camera, not the fit) still works.
 */
// Default startup viewport. Pan/zoom out from here is allowed via the
// controller's per-mode zoom-out floor; explicit "Plane" / "Strip" buttons
// re-fit to alternative windows.
/** Default data-fit window for the committed harvest: σ × spiral index T
 *  (not Im(s)). Wider than the old scan-demo box so T=4000 stays on-scale. */
const VIEWPORT_SIGMA_MIN = -500;
const VIEWPORT_SIGMA_MAX = -50;
const VIEWPORT_T_MIN = 0;
const VIEWPORT_T_MAX = 4000;
const ARCHIVE_LOAD_BATCH_LINES = 512;
const BACKGROUND_PREF_COOKIE = "zerosOfFBackgroundPrefs";
const BACKGROUND_PREF_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

type BackgroundPrefsCookie = Pick<
  DisplayControlsState,
  "backgroundDefaultName" | "backgroundOpacity" | "backgroundSizeMult"
>;

function readBackgroundPrefsCookie(): Partial<BackgroundPrefsCookie> | null {
  if (typeof document === "undefined") return null;
  const prefix = `${BACKGROUND_PREF_COOKIE}=`;
  const rawCookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (rawCookie === undefined) return null;
  try {
    const decoded: unknown = JSON.parse(decodeURIComponent(rawCookie.slice(prefix.length)));
    if (decoded === null || typeof decoded !== "object") return null;
    const prefs: Partial<BackgroundPrefsCookie> = {};
    if ("backgroundDefaultName" in decoded && typeof decoded.backgroundDefaultName === "string") {
      prefs.backgroundDefaultName = decoded.backgroundDefaultName;
    }
    if ("backgroundOpacity" in decoded && typeof decoded.backgroundOpacity === "number" && Number.isFinite(decoded.backgroundOpacity)) {
      prefs.backgroundOpacity = Math.max(0, Math.min(1, decoded.backgroundOpacity));
    }
    if ("backgroundSizeMult" in decoded && typeof decoded.backgroundSizeMult === "number" && Number.isFinite(decoded.backgroundSizeMult)) {
      prefs.backgroundSizeMult = Math.max(0.1, decoded.backgroundSizeMult);
    }
    return prefs;
  } catch {
    return null;
  }
}

function writeBackgroundPrefsCookie(display: DisplayControlsState): void {
  if (typeof document === "undefined") return;
  const payload: BackgroundPrefsCookie = {
    backgroundDefaultName: display.backgroundDefaultName,
    backgroundOpacity: display.backgroundOpacity,
    backgroundSizeMult: display.backgroundSizeMult,
  };
  document.cookie = [
    `${BACKGROUND_PREF_COOKIE}=${encodeURIComponent(JSON.stringify(payload))}`,
    `Max-Age=${String(BACKGROUND_PREF_COOKIE_MAX_AGE_SECONDS)}`,
    "Path=/",
    "SameSite=Lax",
  ].join("; ");
}

function applyBackgroundPrefsCookie(state: ZerosOfFSerializableState): ZerosOfFSerializableState {
  const prefs = readBackgroundPrefsCookie();
  if (prefs === null) return state;
  return {
    ...state,
    display: {
      ...state.display,
      ...prefs,
    },
  };
}

function yieldToFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "undefined") {
      setTimeout(resolve, 0);
      return;
    }
    requestAnimationFrame(() => resolve());
  });
}

/** Pointer state captured during the event; the canvas is gone from the event afterward. */
type PendingHover = {
  canvas: HTMLCanvasElement | null;
  clientX: number;
  clientY: number;
  overCanvas: boolean;
};

/**
 * Top-level workspace model for the zeros-of-f port. Owns:
 *  - the orthographic scene controller
 *  - the ScanScatterLayer (point cloud)
 *  - the active backend (default local worker)
 *  - the IndexedDB scan archive used for resume
 *  - declarative state (scan params, display thresholds, view)
 *
 * The model deliberately stays UI-agnostic: it exposes setters that the
 * declarative toolbox sections call, plus high-level commands like
 * `startScan` and `cancelScan`.
 */
export class ZerosOfFModel implements VisualizationModel {
  private readonly controller: ZerosOfFSceneController;
  private tabViewMode: ZerosTabViewMode = "zeros";
  private sumControls: SumViewControlsState = { ...DEFAULT_SUM_VIEW_CONTROLS };
  private sumInitialized = false;
  private readonly orbitGroup: THREE.Group;
  private readonly fitGroup: DataFitGroup;
  private readonly hoverMarker: ZeroHoverMarker;
  private readonly twinMarker: ZeroHoverMarker;
  private readonly strandRings: WhiteOpenRings;
  private hoverSample: ZeroHoverSample | null = null;
  private readonly hoverWorld = new THREE.Vector3();
  private hoverFrameCleanup: (() => void) | null = null;
  /** Latest pointer position, picked on the next frame instead of per event. */
  private pendingHover: PendingHover | null = null;
  /**
   * Live scatter layer — receives the in-flight scan's points. Mutable so
   * that on scan start we can demote the previous instance to a dimmed
   * background layer and put a fresh one here.
   */
  private scatter: ScanScatterLayer;
  /**
   * True only after the Siegel catalog load. Scans and the other harvests
   * reuse this layer, and the Zero-sets checkbox must not hide those.
   */
  private scatterHoldsMainZeros = false;
  /** Separate harvest for σ ∈ [−500, −400]; visibility is the Display toggle. */
  private left500Scatter: ScanScatterLayer;
  /** f_N zeros above the curve for T ∈ [4000, 13000). Loaded when its box is on. */
  private aboveCurveScatter: ScanScatterLayer;
  private aboveCurveLoadStarted = false;
  /** R1ak σ near −1 to 1, T to 55. Off until its Zero-sets checkbox is on. */
  private nearStripScatter: ScanScatterLayer;
  private nearStripLoadStarted = false;
  /** R1ak σ ∈ [0, 1], T from 55 to 300. Same lazy load. */
  private stripTo300Scatter: ScanScatterLayer;
  private stripTo300LoadStarted = false;
  /** R2ps zeros at σ ↦ 1 − σ, shown from the R1ps harvest toggle. */
  private r2psReflect: ScanScatterLayer;
  private r2psReflectLoaded = false;
  private r2psReflectLoading: Promise<void> | null = null;
  /** Overlay harvest bins; each loads only when its accordion checkbox is on. */
  private readonly tBandScatters: Record<OverlayHarvestSliceId, ScanScatterLayer>;
  private readonly tBandLoadStarted: Record<OverlayHarvestSliceId, boolean> = {
    t3975To4000_sigmaLt0: false,
    t3975To4000_sigma0To1: false,
    t3950To3975_sigmaLt0: false,
    t3950To3975_sigma0To1: false,
    t3925To3950_sigmaLt0: false,
    t3925To3950_sigma0To1: false,
    t3900To3925_sigmaLt0: false,
    t3900To3925_sigma0To1: false,
    t398To3900_sigmaNeg50ToNeg10: false,
    t398To3900_sigmaNeg20To0: false,
  };
  private overlayRowCounts: OverlayRowCounts = { ...PACKED_OVERLAY_ROW_COUNTS };
  private overlayCountsReady = true;
  /**
   * Background layer holding the previous scan's points at reduced opacity
   * during a new scan, so the user can compare. Cleared and replaced on
   * each fresh scan; null when no prior scan has been retained.
   */
  private backgroundScatter: ScanScatterLayer | null = null;
  /**
   * Archive scan IDs that ended up in the background layer (i.e., were
   * loaded into the live scatter when the next scan started). Used by the
   * Storage panel to indicate "in background" state separately from
   * "currently loaded".
   */
  private readonly backgroundScanIds = new Set<string>();
  /**
   * Temporary layer used by the cull-and-recover pipeline to render its
   * output incrementally at 1.5× normal size while the algorithm runs. Once
   * the run completes we save an archive entry and dispose this layer.
   */
  private culledScatter: ScanScatterLayer | null = null;
  /** Set when a cull-and-recover run is in flight (for UI Run/Cancel toggle). */
  private cullRunning = false;
  /** Cooperative cancel signal for the currently-running cull. */
  private cullCancelled = false;
  /** How many points the current cull run has emitted so far. */
  private cullProgress: { done: number } = { done: 0 };
  private readonly boundary: BoundaryCurveLayer;
  /** Arias's left-edge boundary of the positive-t zeros: −σ = 2.2·T^(2/3). */
  private readonly ariasBoundary: BoundaryCurveLayer;
  /** σ = −0.81975 · t^{1/3}, with t = I(T) converted onto the index axis. */
  private readonly imagCubeRootBoundary: BoundaryCurveLayer;
  /** σ = −0.81975·t^{1/3} − 1.3·t^{1/6} − 0.57, drawn 4px thick. */
  private readonly imagCubeRootSeriesBoundary: BoundaryCurveLayer;
  /** Theorem 5: −σ = C* t^{1/3} + D* t^{1/6} + E*, on the index axis. */
  private readonly theorem5Boundary: BoundaryCurveLayer;
  /** Theorem 5 points ρ_N^{(ν)} for both resonances, N = 1, …, 4000. */
  private readonly theorem5Points: Theorem5PointsLayer;
  /** Kuznetsov's eq. (37) points s_{N,±} for the Scorer zeros z_1, z_2, z_3. */
  private readonly scorerExpansion: ScorerExpansionLayer;
  /** Computed left-most Scorer zeros, the true zeros near the Theorem 5 points. */
  private readonly scorerZeros: ScorerZerosLayer;
  /** Harvest lower edge for T ≥ 10: T = 0.173·|σ|^{1.61}. */
  private readonly paulsBoundary: BoundaryCurveLayer;
  /** Exact-{T} slice envelope for thousandths 0.000..0.999. */
  private readonly fracTSliceBoundary: BoundaryCurveLayer;
  /** Identity: π-boundary × (2−sin πθ)² / |cos 2πθ|. */
  private readonly fracTClosedBoundary: BoundaryCurveLayer;
  private readonly fracTFourierBoundary: BoundaryCurveLayer;
  /** Figure 2 mixed envelope: navy ã(ϑ) |σ|^{gold p̃(ϑ)}. */
  private readonly fracTSmoothApBoundary: BoundaryCurveLayer;
  private readonly tAverages: TAveragesLayer;
  private readonly scanFloor: ScanFloorLayer;
  private readonly negTZerosRidge: NegTZerosRidgeLayer;
  private readonly criticalStripGuides: CriticalStripGuidesLayer;
  /** Current viewport bounds, refreshed any time {@link applyExplicitViewport}
   *  is called (default fit, Strip, or Plane). Strip reads back tMin/tMax
   *  from this so it can leave the T axis alone. */
  private currentViewport: { sigmaMin: number; sigmaMax: number; tMin: number; tMax: number } = {
    sigmaMin: VIEWPORT_SIGMA_MIN,
    sigmaMax: VIEWPORT_SIGMA_MAX,
    tMin: VIEWPORT_T_MIN,
    tMax: VIEWPORT_T_MAX,
  };
  private readonly zetaZeros: ZetaZerosLayer;
  private readonly zetaChampions: ZetaChampionsLayer;
  /** Arias positive-t f-zeros, a "solo" overlay shown alone (sibling of
   *  contentGroup so it is unaffected when contentGroup is hidden). */
  private readonly ariasZeros: AriasPositiveZerosLayer;
  /** Combined AK zeros through t=10⁶, plotted at index T, split at σ = −50. */
  private readonly akZerosLt: AkZerosLayer;
  private readonly akZerosGt: AkZerosLayer;
  /** Later AK catalogs, one layer per T window. Positions are index T. */
  private readonly akFsZeros: readonly AkZerosLayer[];
  /** Holds every normal scene layer. Hidden wholesale (visible=false) while
   *  the Arias solo overlay is active; children keep their own visibility. */
  private readonly contentGroup: THREE.Group;
  private readonly integerTGrid: IntegerTGridLayer;
  private readonly phaseHeatmap: PhaseHeatmapLayer;
  private readonly zeroCountBoxes: ZeroCountBoxesLayer;
  /** Token bumped on every new zero-count run so an in-flight loop can bail. */
  private zeroCountToken = 0;
  /** Active pool for the current zero-count run. Null when idle. Can be
   *  either a local Web Worker pool or a Lambda HTTP pool — both expose the
   *  same submit/dispose surface. */
  private zeroCountPool: { submit: ZeroCountWorkerPool["submit"]; dispose: () => void } | null = null;
  /** True while a run is in progress (for the toolbox to label the button). */
  private zeroCountRunning = false;
  /** Three "canned" leg-feature background overlays, each loading a pre-saved
   *  scan and rendering it with phase-R color at full brightness. Keyed by
   *  toggle id; absent = not currently loaded. */
  private readonly bgOverlayLayers: Map<BgOverlayId, ScanScatterLayer> = new Map();
  /** Names of scans used as canned backgrounds (matched against displayName
   *  or label). Surfaced to the scan manager so utilized rows can be marked. */
  public static readonly BG_OVERLAY_NAMES: Record<BgOverlayId, string> = {
    ratio: "R1 Leg Lengths Same Length Cloud",
    foldBack: "leg angle fold in 2",
    foldOut: "leg angle fold out",
    sum1R1ak: "sum1+R1ak points",
    sum1R1akV1: "sum1+R1ak v1",
    legRakFolded: "leg1 leg2 Rak folded-in v1",
    legRpsFolded: "leg1 leg2 Rps folded-in pair",
    sum1R1ps: "sum1+R1ps pair",
  };
  /** Per-overlay base point size. Most overlays use 2 (matches the live
   *  scatter); sum1R1ak uses 3 = 1.5× normal so its sparse zeros stand out. */
  /** BG dropdown ("Variant" row in the Background panel) maps each filename
   *  to the FVariant that should drive the layer's rForm + family. The
   *  dropdown choice IS the user's display intent — it overrides the file's
   *  recorded variant when that recorded variant is a legacy bare tag (e.g.
   *  "R1") that doesn't carry rForm information. Must stay in sync with
   *  VARIANT_CHOICES in `controls/BackgroundPanel.tsx`. */
  private static readonly BG_DROPDOWN_NAME_TO_VARIANT: Record<string, FVariant> = {
    "scan_default3-post-proc.csv": "R1ak",
    "scan_R1-background.csv":      "R1ps",
  };
  private static readonly BG_OVERLAY_POINT_SIZE: Record<BgOverlayId, number> = {
    ratio: 2,
    foldBack: 2,
    foldOut: 2,
    sum1R1ak: 3,
    sum1R1akV1: 2,
    legRakFolded: 2,
    legRpsFolded: 2,
    sum1R1ps: 2,
  };
  private readonly scanProgress: ScanProgressLayer;
  private readonly segmentPostProc: SegmentPostProcLayer;
  private readonly segmentRefine: SegmentRefineLayer;
  private readonly tRowHighlight: TRowHighlightLayer;
  private lastSegmentPoints: SegmentPoint[] = [];
  private lastRefinedPoints: RefinedPoint[] = [];
  private refineGeneration = 0;
  private refineProgress: { done: number; total: number } = { done: 0, total: 0 };
  private isRefining = false;
  private backend: ScanBackend;
  private readonly archive: ScanArchive;
  private readonly backendFactory: (choice: ScanBackendChoice) => ScanBackend;

  private state: ZerosOfFSerializableState = { ...DEFAULT_STATE };
  private currentHandle: ScanHandle | null = null;
  private scanStartPending = false;
  private inFlightArchiveLines: ArchivedLine[] = [];
  /** Archived scans currently overlaid in slot A. Multiple loads stack additively. */
  private readonly loadedScans = new Map<string, { sigmaMin: number; sigmaMax: number; tMin: number; tMax: number }>();
  /** Friendly name (displayName ?? label ?? scanId) per loaded scan. Surfaced
   *  by `getDisplayedScanNames()` so the canvas can title itself with the
   *  currently-displayed scans. */
  private readonly loadedScanNames = new Map<string, string>();
  /** One scatter layer per loaded archive scan, so unloading one doesn't
   * disturb the others (which would happen if we shared one layer and had
   * to clear+repopulate on each unload). Keyed by scanId. */
  private readonly loadedScanLayers = new Map<string, ScanScatterLayer>();
  /** Transient layer holding the symmetric-difference of two scans (points
   * that appear in exactly one of the two). Replaced each time the user hits
   * the Difference button. */
  private differenceLayer: ScanScatterLayer | null = null;
  private scanStartedAt: number | null = null;
  /** Monotonic counter bumped whenever the archive content changes — drives
   * StoragePanel auto-reload via React useEffect dep. */
  private archiveEpoch = 0;
  private lastProgress: { linesDone: number; linesTotal: number; pointsRecorded: number } = {
    linesDone: 0,
    linesTotal: 0,
    pointsRecorded: 0,
  };
  private progressRowsPerMinute: number | null = null;
  private scanActivity: ScanActivity | null = null;
  private lastError: string | null = null;
  private toolboxRefresh: (() => void) | null = null;

  public constructor(deps: ZerosOfFModelDeps = {}) {
    this.backendFactory = deps.createBackend ?? (() => {
      return new LocalWorkerBackend();
    });
    const uiPrefs = readUiPrefs();
    const initialState = applyBackgroundPrefsCookie(uiPrefs ?? this.state);
    this.state = {
      ...initialState,
      activeScanId: null,
      backendId: this.normalizeBackendChoice(initialState.backendId),
    };
    this.controller = new ZerosOfFSceneController();
    this.controller.setOnSumPointerPick((cssX, cssY) => {
      this.pickZeroInSumView(cssX, cssY);
    });
    this.orbitGroup = new THREE.Group();
    this.fitGroup = new DataFitGroup();
    this.controller.getFeatureRoot().add(this.orbitGroup);
    this.orbitGroup.add(this.fitGroup.group);
    this.hoverMarker = new ZeroHoverMarker(this.fitGroup.group);
    this.twinMarker = new ZeroHoverMarker(this.fitGroup.group);
    this.strandRings = new WhiteOpenRings(this.fitGroup.group);
    this.controller.setOrbitDragListener((dx, dy) => {
      this.applyOrbitDelta(dx, dy);
    });
    this.controller.setOrbitDragEndListener(() => {
      this.persistUiPrefs();
    });
    // All normal layers live under contentGroup; the Arias solo overlay is a
    // sibling under fitGroup. Hiding contentGroup hides every scan/overlay at
    // once (children keep their own .visible), so solo mode is a single flag.
    this.contentGroup = new THREE.Group();
    this.contentGroup.visible = !this.state.display.showAriasSolo;
    this.fitGroup.group.add(this.contentGroup);
    this.scatter = new ScanScatterLayer(this.contentGroup, this.state.display);
    this.syncMainZerosVisibility();
    this.left500Scatter = new ScanScatterLayer(this.contentGroup, this.state.display);
    this.left500Scatter.setVisible(this.state.display.showSigmaNeg500ToNeg400);
    this.aboveCurveScatter = new ScanScatterLayer(this.contentGroup, this.state.display);
    this.aboveCurveScatter.setVisible(false);
    this.nearStripScatter = new ScanScatterLayer(this.contentGroup, this.state.display);
    this.nearStripScatter.setVisible(false);
    this.stripTo300Scatter = new ScanScatterLayer(this.contentGroup, this.state.display);
    this.stripTo300Scatter.setVisible(false);
    this.r2psReflect = new ScanScatterLayer(this.contentGroup, {
      ...this.state.display,
      colorMode: "grayscale",
    });
    this.r2psReflect.setForceColor(R2PS_REFLECT_RGB);
    this.r2psReflect.setVisible(false);
    this.tBandScatters = {
      t3975To4000_sigmaLt0: new ScanScatterLayer(this.contentGroup, this.state.display),
      t3975To4000_sigma0To1: new ScanScatterLayer(this.contentGroup, this.state.display),
      t3950To3975_sigmaLt0: new ScanScatterLayer(this.contentGroup, this.state.display),
      t3950To3975_sigma0To1: new ScanScatterLayer(this.contentGroup, this.state.display),
      t3925To3950_sigmaLt0: new ScanScatterLayer(this.contentGroup, this.state.display),
      t3925To3950_sigma0To1: new ScanScatterLayer(this.contentGroup, this.state.display),
      t3900To3925_sigmaLt0: new ScanScatterLayer(this.contentGroup, this.state.display),
      t3900To3925_sigma0To1: new ScanScatterLayer(this.contentGroup, this.state.display),
      t398To3900_sigmaNeg50ToNeg10: new ScanScatterLayer(this.contentGroup, this.state.display),
      t398To3900_sigmaNeg20To0: new ScanScatterLayer(this.contentGroup, this.state.display),
    };
    this.syncHarvestBandOverlays(this.state.display);
    this.boundary = new BoundaryCurveLayer(this.contentGroup);
    this.boundary.setVisible(this.state.display.showBoundary);
    // Arias's boundary (−σ = 2.2·T^(2/3)) in a distinct cyan.
    this.ariasBoundary = new BoundaryCurveLayer(this.contentGroup, ariasBoundaryT, 0x33d6ff);
    this.ariasBoundary.setVisible(this.state.display.showAriasBoundary);
    this.imagCubeRootBoundary = new BoundaryCurveLayer(this.contentGroup, imagCubeRootBoundaryT, 0xccff66);
    this.imagCubeRootBoundary.setVisible(this.state.display.showImagCubeRootBoundary);
    // Line2, because WebGL draws a THREE.Line at 1px regardless of linewidth.
    this.imagCubeRootSeriesBoundary = new BoundaryCurveLayer(
      this.contentGroup,
      imagCubeRootSeriesBoundaryT,
      0xffffff,
      4,
    );
    this.imagCubeRootSeriesBoundary.setVisible(this.state.display.showImagCubeRootSeriesBoundary);
    this.theorem5Boundary = new BoundaryCurveLayer(this.contentGroup, theorem5LeftmostBoundaryT, 0xff44dd);
    this.theorem5Boundary.setVisible(this.state.display.showTheorem5Boundary);
    this.theorem5Points = new Theorem5PointsLayer(this.contentGroup);
    this.theorem5Points.setMaxN(
      this.state.display.showTheorem5Points ? THEOREM5_POINT_N_MAX : 0,
      this.state.display.yAxisMode,
    );
    this.scorerExpansion = new ScorerExpansionLayer(this.contentGroup);
    this.scorerExpansion.setYAxisMode(this.state.display.yAxisMode);
    this.scorerExpansion.setDisplayView(this.state.display.displayView);
    this.scorerExpansion.setVisible(this.state.display.showScorerExpansionPoints);
    this.scorerZeros = new ScorerZerosLayer(this.contentGroup, {
      onLoaded: () => { this.toolboxRefresh?.(); },
    });
    this.scorerZeros.setYAxisMode(this.state.display.yAxisMode);
    this.scorerZeros.setDisplayView(this.state.display.displayView);
    this.scorerZeros.setVisible(this.state.display.showScorerZeros);
    this.paulsBoundary = new BoundaryCurveLayer(this.contentGroup, paulsBoundaryT, 0xffb347);
    this.paulsBoundary.setVisible(this.state.display.showPaulsBoundary);
    this.fracTSliceBoundary = new BoundaryCurveLayer(this.contentGroup, () => Number.NaN, 0xff0000);
    this.fracTClosedBoundary = new BoundaryCurveLayer(this.contentGroup, () => Number.NaN, 0xff0000);
    this.fracTFourierBoundary = new BoundaryCurveLayer(this.contentGroup, () => Number.NaN, 0xff0000);
    this.fracTSmoothApBoundary = new BoundaryCurveLayer(this.contentGroup, () => Number.NaN, 0xff0000);
    this.syncFracTSliceBoundary(this.state.display);
    this.syncFracTClosedBoundary(this.state.display);
    this.syncFracTFourierBoundary(this.state.display);
    this.syncFracTSmoothApBoundary(this.state.display);
    this.tAverages = new TAveragesLayer(this.contentGroup);
    this.tAverages.setVisible(this.state.display.showTAverages);
    this.scanFloor = new ScanFloorLayer(this.contentGroup);
    this.scanFloor.setVisible(this.state.display.showScanFloor);
    this.negTZerosRidge = new NegTZerosRidgeLayer(this.contentGroup);
    this.negTZerosRidge.setVisible(this.state.display.showNegTZerosRidge);
    this.criticalStripGuides = new CriticalStripGuidesLayer(this.contentGroup);
    this.criticalStripGuides.setVisible(this.state.display.showCriticalStripGuides);
    this.zetaZeros = new ZetaZerosLayer(this.contentGroup);
    this.zetaZeros.setYAxisMode(this.state.display.yAxisMode);
    this.zetaZeros.setVisible(this.state.display.showZetaZeros);
    this.zetaChampions = new ZetaChampionsLayer(this.contentGroup);
    this.zetaChampions.setYAxisMode(this.state.display.yAxisMode);
    this.zetaChampions.setVisible(this.state.display.showZetaChampions);
    // Arias solo overlay — sibling of contentGroup so it stays visible when
    // contentGroup is hidden.
    this.ariasZeros = new AriasPositiveZerosLayer(this.fitGroup.group);
    this.ariasZeros.setYAxisMode(this.state.display.yAxisMode);
    this.ariasZeros.setColorMode(this.state.display.colorMode);
    this.ariasZeros.setSpectrumFeather(this.state.display.spectrumFeather);
    this.ariasZeros.setVisible(this.state.display.showAriasSolo);
    this.akZerosLt = new AkZerosLayer(this.contentGroup, "lteNeg50");
    this.akZerosGt = new AkZerosLayer(this.contentGroup, "gtNeg50");
    this.akFsZeros = AK_FS_ZERO_ROWS.map(
      (row) => new AkZerosLayer(this.contentGroup, "all", row.url),
    );
    this.syncAkOverlays(this.state.display);
    this.integerTGrid = new IntegerTGridLayer(this.contentGroup);
    this.integerTGrid.setVisible(this.state.display.showIntegerTGrid);
    this.phaseHeatmap = new PhaseHeatmapLayer(this.contentGroup);
    this.phaseHeatmap.setBrightness(this.state.display.heatmapBrightness);
    this.applyHeatmapBoundsOutline();
    this.phaseHeatmap.setVisible(this.state.display.showPhaseHeatmap);
    this.zeroCountBoxes = new ZeroCountBoxesLayer(this.contentGroup);
    this.zeroCountBoxes.setVisible(this.state.display.showZeroCountBoxes);
    if (this.state.display.showZeroCountBoxes) {
      // Try restoring from cache on init so a reload doesn't lose hard work.
      void this.restoreZeroCountsFromCache().catch(() => { /* ignore */ });
    }
    // Best-effort restore of the cached heatmap from IndexedDB so the user
    // doesn't have to recompute on every page reload. Fires after the
    // constructor returns; toolboxRefresh re-renders the panel when done.
    if (this.state.display.showPhaseHeatmap) {
      void loadHeatmapFromIdb().then((saved) => {
        if (saved !== null) this.phaseHeatmap.restore(saved);
        this.toolboxRefresh?.();
      }).catch(() => { /* ignore */ });
    }
    // Hunt-mode viewport buttons are gone. Ignore persisted Strip / Plane /
    // Circles locks — they pin T to a 20-unit window or slave zoomY to I'(T).
    if (this.state.display.stripMode || this.state.display.planeMode || this.state.display.circlesMode) {
      this.state.display = {
        ...this.state.display,
        stripMode: false,
        planeMode: false,
        circlesMode: false,
      };
    }
    this.controller.setAxisLock(null);
    this.controller.setZoomOutFloor(0.01);
    this.controller.setZoomInCeiling(20000, 20000);
    this.controller.setWheelZoomMode("y");
    this.scanProgress = new ScanProgressLayer(this.contentGroup);
    // Show the scan rectangle from the start; it reflects the current scan
    // params and updates whenever they change.
    this.scanProgress.setScanRect({
      sigmaMin: this.state.scan.sigmaMin,
      sigmaMax: this.state.scan.sigmaMax,
      tMin: this.state.scan.tMin,
      tMax: this.state.scan.tMax,
      ridgeBand: this.state.scan.branch === "neg" && this.state.scan.ridgeRange,
    });
    this.scanProgress.setRectVisible(this.state.display.showScanRect);
    this.segmentPostProc = new SegmentPostProcLayer(this.contentGroup);
    this.segmentPostProc.setVisible(this.state.display.showSegmentPostProc);
    this.segmentRefine = new SegmentRefineLayer(this.contentGroup);
    this.segmentRefine.setVisible(this.state.display.showSegmentRefine);
    this.tRowHighlight = new TRowHighlightLayer(this.contentGroup);
    this.tRowHighlight.setVisible(this.state.display.showTRowHighlight);
    this.backend = this.createBackend(this.state.backendId);
    this.archive = deps.archive ?? new ScanArchive();
    this.applyHarvestFamilyVisibility();
    this.applyViewportFit();
    this.applyView();
    this.syncScenePresentation();
    this.controller.setPointerHoverListener((event, overCanvas) => {
      const canvas = event.currentTarget;
      this.pendingHover = {
        canvas: canvas instanceof HTMLCanvasElement ? canvas : null,
        clientX: event.clientX,
        clientY: event.clientY,
        overCanvas,
      };
    });
    this.hoverFrameCleanup = this.controller.addFrameListener((_time, deltaMs) => {
      if (this.tabViewMode === "sum" && Math.abs(this.sumControls.animSpeed) > 0.0001) {
        const speed = this.sumControls.animSpeed;
        const step = ((speed * speed) * 0.001 / (this.sumControls.index + 1))
          * Math.sign(speed)
          * (deltaMs / 16.667);
        this.setSumIndexFromControl(this.sumControls.index + step);
        this.toolboxRefresh?.();
      }
      const pending = this.pendingHover;
      this.pendingHover = null;
      if (pending !== null) this.onCanvasHover(pending);
      this.repositionHoverLabel();
    });
  }

  /**
   * Configure the data-fit transform plus curve layers based on the active
   * yAxisMode and currently-loaded scans:
   *  - `T` and 3D: σ ∈ [-500, -50], spiral index T ∈ [0, 4000].
   *  - 2D `fracT`: σ from the most-negative loaded σ (or -350 if nothing loaded)
   *    to 0, T compressed to [0, 1] since each point folds via `t % 1`.
   */
  private applyViewportFit(): void {
    const mode = this.state.display.yAxisMode;
    // Strip mode owns the viewport entirely — loading scans, toggling
    // fracT, etc. must not reset σ ∈ [-1, 2] and T ∈ [0, 20] back to the
    // wide defaults. Re-apply Strip's own bounds and bail out.
    if (this.state.display.stripMode) {
      this.applyExplicitViewport(-1, 2, 0, 20, mode);
      return;
    }
    let sigmaMin = VIEWPORT_SIGMA_MIN;
    let sigmaMax = VIEWPORT_SIGMA_MAX;
    let tMin = VIEWPORT_T_MIN;
    let tMax = VIEWPORT_T_MAX;
    if (this.state.harvestFamily === "r1ps") {
      sigmaMin = -100;
      sigmaMax = -25;
      tMin = 0;
      tMax = 500;
    } else if (this.state.harvestFamily === "r2ps") {
      sigmaMin = 0;
      sigmaMax = 100;
      tMin = 0;
      tMax = 500;
    }
    if (mode === "fracT" && this.state.display.displayView !== "fracT3d") {
      tMin = 0;
      tMax = 1;
      let dataMostNeg = Infinity;
      for (const b of this.loadedScans.values()) {
        if (b.sigmaMin < dataMostNeg) dataMostNeg = b.sigmaMin;
      }
      sigmaMin = Number.isFinite(dataMostNeg) ? dataMostNeg : VIEWPORT_SIGMA_MIN;
      sigmaMax = 0;
    }
    this.applyExplicitViewport(sigmaMin, sigmaMax, tMin, tMax, mode);
  }

  public initialize(): void {
    const schedule = typeof requestAnimationFrame === "undefined"
      ? (job: () => void) => setTimeout(job, 0)
      : (job: () => void) => requestAnimationFrame(() => job());
    schedule(() => {
      void this.loadHarvestForFamily();
    });
  }

  /**
   * Force index-T display and drop hunt-mode camera locks before the harvest
   * is appended. Positions use the live yAxisMode at append time.
   */
  private prepareHarvestDisplay(): void {
    const wasSum = this.tabViewMode === "sum";
    if (wasSum) this.controller.setViewMode("zeros");
    this.detachCirclesLoop();
    this.controller.setAxisLock(null);
    this.controller.setZoomOutFloor(0.01);
    this.controller.setZoomInCeiling(20000, 20000);
    this.controller.setWheelZoomMode("y");
    this.state.display = {
      ...this.state.display,
      stripMode: false,
      planeMode: false,
      circlesMode: false,
      yAxisMode: "T",
    };
    this.scatter.setDisplay(this.state.display);
    this.left500Scatter.setDisplay(this.state.display);
    this.syncHarvestBandOverlays(this.state.display);
    this.zetaZeros.setYAxisMode("T");
    this.zetaChampions.setYAxisMode("T");
    this.ariasZeros.setYAxisMode("T");
    this.akZerosLt.setYAxisMode("T");
    this.akZerosGt.setYAxisMode("T");
    for (const layer of this.akFsZeros) layer.setYAxisMode("T");
    this.scorerZeros.setYAxisMode("T");
    this.scorerExpansion.setYAxisMode("T");
    if (wasSum) {
      this.controller.setViewMode("sum");
      this.syncSumScene();
    }
  }

  /**
   * Fit σ × spiral-index T to the loaded harvest (with a small pad). Data
   * y is index T, not Im(s); the AWS CSV column named `t` is Im(s) and was
   * already inverted when the bin was written.
   */
  private frameCommittedHarvest(): void {
    const extent = unionHarvestExtents(this.visibleHarvestExtents());
    if (extent === null) return;
    const wasSum = this.tabViewMode === "sum";
    if (wasSum) this.controller.setViewMode("zeros");
    const sigmaSpan = Math.max(1, extent.sigmaMax - extent.sigmaMin);
    const tSpan = Math.max(1, extent.tMax - extent.tMin);
    const padS = 0.02 * sigmaSpan;
    const padT = 0.02 * tSpan;
    this.applyExplicitViewport(
      extent.sigmaMin - padS,
      extent.sigmaMax + padS,
      Math.min(0, extent.tMin) - padT,
      extent.tMax + padT,
      "T",
    );
    this.controller.resetView();
    this.zoomToFitLoaded();
    if (wasSum) {
      this.controller.setViewMode("sum");
      this.ensureSumCursorVisible();
      this.syncSumScene();
    }
  }

  /** Extents used to frame the canvas. T-band overlays join only when shown. */
  private showingSiegelHarvest(): boolean {
    return isSiegelZerosHarvest(this.state.harvestFamily);
  }

  /**
   * The certified catalog shares the live scatter. Hide it only while that
   * catalog is what the layer holds and its Zero-sets box is off.
   */
  private syncMainZerosVisibility(): void {
    this.scatter.setVisible(mainZerosLayerVisible(
      this.scatterHoldsMainZeros,
      this.showingSiegelHarvest(),
      this.state.display.showMainZeros,
    ));
  }

  /** The reflected cloud is an R1ps-view overlay, not its own harvest. */
  private r2psReflectVisible(): boolean {
    return this.state.harvestFamily === "r1ps" && this.state.display.showReflectedR2ps;
  }

  /**
   * Keep the overlay light blue and on the same frac(T) filter as the
   * harvest. Grayscale is what honors the fixed color.
   */
  private paintReflectedR2ps(): void {
    this.r2psReflect.setDisplay({ ...this.state.display, colorMode: "grayscale" });
    this.r2psReflect.setForceColor(R2PS_REFLECT_RGB);
    this.r2psReflect.setVisible(this.r2psReflectVisible());
  }

  /** Fetch the R2ps bin once and store each zero at σ ↦ 1 − σ. */
  private async ensureReflectedR2psLoaded(): Promise<void> {
    if (this.r2psReflectLoaded) return;
    if (this.r2psReflectLoading !== null) return this.r2psReflectLoading;
    const job = this.fetchReflectedR2ps();
    this.r2psReflectLoading = job;
    try {
      await job;
    } finally {
      if (this.r2psReflectLoading === job) this.r2psReflectLoading = null;
    }
  }

  private async fetchReflectedR2ps(): Promise<void> {
    try {
      const response = await fetch(R2PS_HUNT_URL);
      if (!response.ok) {
        throw new Error(`reflected r2ps HTTP ${String(response.status)}`);
      }
      const points = parseCommittedScanBin(await response.arrayBuffer());
      const reflected = new Float64Array(points.sigma.length);
      for (let i = 0; i < points.sigma.length; i += 1) {
        const sigma = points.sigma[i];
        if (sigma === undefined) continue;
        reflected[i] = reflectAcrossCriticalLine(sigma);
      }
      this.r2psReflect.clear();
      this.r2psReflect.appendPoints(reflected, points.t, points.yVal);
      this.r2psReflectLoaded = true;
      this.paintReflectedR2ps();
    } catch {
      this.lastError = "Could not load the reflected R2ps zeros";
      this.toolboxRefresh?.();
      throw new Error("reflected r2ps load failed");
    }
  }

  /**
   * R1ps mode hides Siegel-only overlays. Display flags stay so switching
   * back restores the same Boundaries / Zero-sets state.
   */
  private applyHarvestFamilyVisibility(): void {
    this.paintReflectedR2ps();
    this.syncNearStripOverlays(this.state.display);
    if (this.showingSiegelHarvest()) return;
    this.left500Scatter.setVisible(false);
    for (const slice of OVERLAY_HARVEST_SLICES) {
      this.tBandScatters[slice.id].setVisible(false);
    }
    this.akZerosLt.setVisible(false);
    this.akZerosGt.setVisible(false);
    for (const layer of this.akFsZeros) layer.setVisible(false);
    this.ariasZeros.setVisible(false);
    this.boundary.setVisible(false);
    this.ariasBoundary.setVisible(false);
    this.imagCubeRootBoundary.setVisible(false);
    this.imagCubeRootSeriesBoundary.setVisible(false);
    this.theorem5Boundary.setVisible(false);
    this.theorem5Points.setVisible(false);
    this.scorerExpansion.setVisible(false);
    this.scorerZeros.setVisible(false);
    this.paulsBoundary.setVisible(false);
    this.fracTSliceBoundary.setVisible(false);
    this.fracTClosedBoundary.setVisible(false);
    this.fracTFourierBoundary.setVisible(false);
    this.fracTSmoothApBoundary.setVisible(false);
  }

  private visibleHarvestExtents(): Array<ReturnType<ScanScatterLayer["getDataExtent"]>> {
    if (!this.showingSiegelHarvest()) {
      const extents = [this.scatter.getDataExtent()];
      if (this.r2psReflectVisible()) extents.push(this.r2psReflect.getDataExtent());
      return extents;
    }
    const extents = [this.scatter.getDataExtent(), this.left500Scatter.getDataExtent()];
    for (const slice of OVERLAY_HARVEST_SLICES) {
      if (harvestSliceShown(this.state.display, slice.id)) {
        extents.push(this.tBandScatters[slice.id].getDataExtent());
      }
    }
    return extents;
  }

  private syncHarvestBandOverlays(display: DisplayControlsState): void {
    for (const slice of OVERLAY_HARVEST_SLICES) {
      const layer = this.tBandScatters[slice.id];
      layer.setDisplay(display);
      layer.setVisible(harvestSliceShown(display, slice.id));
      if (harvestSliceShown(display, slice.id)) this.startTBandLoad(slice.id);
    }
  }

  private syncAkOverlays(display: DisplayControlsState): void {
    for (const layer of [this.akZerosLt, this.akZerosGt, ...this.akFsZeros]) {
      layer.setYAxisMode(display.yAxisMode);
      layer.setDisplayView(display.displayView);
      layer.setColorMode(display.colorMode);
      layer.setSpectrumFeather(display.spectrumFeather);
      layer.setFracTRange(
        display.fracTRangeMin,
        display.fracTRangeMax,
        display.fracTRangeMode,
        display.fracTFilterKind,
        display.fracTJustOne,
        display.fracTJustOneDigits,
        display.fracTQuarterEnabled,
        display.fracTQuarterPreset,
      );
    }
    this.akZerosLt.setVisible(display.showAkZerosSigmaLtNeg50);
    this.akZerosGt.setVisible(display.showAkZerosSigmaGtNeg50);
    for (let i = 0; i < AK_FS_ZERO_ROWS.length; i += 1) {
      const row = AK_FS_ZERO_ROWS[i];
      const layer = this.akFsZeros[i];
      if (row === undefined || layer === undefined) continue;
      layer.setVisible(display[row.flag]);
    }
  }

  /**
   * The two dense R1ak strip clouds stay off the main scatter. They paint
   * only on Siegel's f(s) while the matching Zero-sets box is on, and the
   * bins are fetched the first time a box turns on.
   */
  private syncNearStripOverlays(display: DisplayControlsState): void {
    const siegel = this.showingSiegelHarvest();
    this.aboveCurveScatter.setDisplay(display);
    this.nearStripScatter.setDisplay(display);
    this.stripTo300Scatter.setDisplay(display);
    const showAbove = siegel && display.showAboveCurveZeros;
    const showNear = siegel && display.showR1akNearStrip;
    const showHigh = siegel && display.showR1akStripTo300;
    this.aboveCurveScatter.setVisible(showAbove);
    this.nearStripScatter.setVisible(showNear);
    this.stripTo300Scatter.setVisible(showHigh);
    if (showAbove) this.startAboveCurveLoad();
    if (showNear) this.startNearStripLoad();
    if (showHigh) this.startStripTo300Load();
  }

  private startAboveCurveLoad(): void {
    if (this.aboveCurveLoadStarted) return;
    this.aboveCurveLoadStarted = true;
    void this.fetchStripBins(
      this.aboveCurveScatter,
      [ABOVE_CURVE_URL],
      "AK locator T 4000 to 13000",
    ).then(() => {
      this.syncNearStripOverlays(this.state.display);
    }).catch(() => {
      this.aboveCurveLoadStarted = false;
    });
  }

  private startNearStripLoad(): void {
    if (this.nearStripLoadStarted) return;
    this.nearStripLoadStarted = true;
    void this.fetchStripBins(
      this.nearStripScatter,
      [R1AK_STRIP_URL],
      "σ −1 to 1, T to 55",
    ).catch(() => {
      this.nearStripLoadStarted = false;
    });
  }

  private startStripTo300Load(): void {
    if (this.stripTo300LoadStarted) return;
    this.stripTo300LoadStarted = true;
    void this.fetchStripBins(
      this.stripTo300Scatter,
      [R1AK_T55_URL, R1AK_T100_URL],
      "σ 0 to 1, T = 55 to 300",
    ).catch(() => {
      this.stripTo300LoadStarted = false;
    });
  }

  private async fetchStripBins(
    layer: ScanScatterLayer,
    urls: readonly string[],
    label: string,
  ): Promise<void> {
    try {
      layer.clear();
      for (const url of urls) {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`${label} HTTP ${String(response.status)}`);
        }
        const points = parseCommittedScanBin(await response.arrayBuffer());
        layer.appendPoints(points.sigma, points.t, points.yVal);
      }
      layer.setDisplay(this.state.display);
      this.syncNearStripOverlays(this.state.display);
      this.toolboxRefresh?.();
    } catch {
      this.lastError = `Could not load ${label}`;
      this.toolboxRefresh?.();
      throw new Error(`strip load failed: ${label}`);
    }
  }

  private startTBandLoad(id: OverlayHarvestSliceId): void {
    if (this.tBandLoadStarted[id]) return;
    if (this.overlayCountsReady && this.overlayRowCounts[id] === 0) return;
    this.tBandLoadStarted[id] = true;
    void this.fetchTBandHarvest(id);
  }

  private async fetchTBandHarvest(id: OverlayHarvestSliceId): Promise<void> {
    const slice = OVERLAY_HARVEST_SLICES.find((row) => row.id === id);
    if (slice === undefined) return;
    try {
      const response = await fetch(slice.url);
      if (!response.ok) {
        throw new Error(`${slice.id} harvest HTTP ${String(response.status)}`);
      }
      const points = parseCommittedScanBin(await response.arrayBuffer());
      const layer = this.tBandScatters[id];
      layer.clear();
      layer.appendPoints(points.sigma, points.t, points.yVal);
      layer.setDisplay(this.state.display);
      layer.setVisible(harvestSliceShown(this.state.display, id));
      this.toolboxRefresh?.();
    } catch {
      this.lastError = `Could not load ${slice.id}`;
      this.tBandLoadStarted[id] = false;
      this.toolboxRefresh?.();
    }
  }

  /**
   * Load the harvested scan into the live scatter. Does not start a hunt
   * and does not attach leftover hosted/cloud jobs.
   */
  private async loadCommittedDisplayScan(): Promise<void> {
    try {
      const [mainResponse, left500Response] = await Promise.all([
        fetch(COMMITTED_SCAN_URL),
        fetch(SIGMA_NEG500_TO_NEG400_URL),
      ]);
      if (!mainResponse.ok) {
        throw new Error(`committed scan HTTP ${String(mainResponse.status)}`);
      }
      const points = parseCommittedScanBin(await mainResponse.arrayBuffer());
      this.prepareHarvestDisplay();
      this.scatter.clear();
      this.scatter.appendPoints(points.sigma, points.t, points.yVal);
      this.scatterHoldsMainZeros = true;
      this.syncMainZerosVisibility();
      if (left500Response.ok) {
        const left500 = parseCommittedScanBin(await left500Response.arrayBuffer());
        this.left500Scatter.clear();
        this.left500Scatter.appendPoints(left500.sigma, left500.t, left500.yVal);
        this.left500Scatter.setVisible(this.state.display.showSigmaNeg500ToNeg400);
      }
      this.frameCommittedHarvest();
      this.syncHarvestBandOverlays(this.state.display);
      this.applyHarvestFamilyVisibility();
    } catch {
      this.lastError = "Could not load the committed zeros scan";
      this.toolboxRefresh?.();
    }
  }

  /**
   * Load one packed hunt into the live scatter. Siegel overlays stay
   * hidden even if their Display flags are still on.
   */
  private async loadPackedHunt(url: string, failure: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`hunt HTTP ${String(response.status)}`);
      }
      const points = parseCommittedScanBin(await response.arrayBuffer());
      this.prepareHarvestDisplay();
      this.scatter.clear();
      this.scatter.appendPoints(points.sigma, points.t, points.yVal);
      this.scatterHoldsMainZeros = false;
      this.syncMainZerosVisibility();
      this.left500Scatter.clear();
      this.frameCommittedHarvest();
      this.applyHarvestFamilyVisibility();
    } catch {
      this.lastError = failure;
      this.toolboxRefresh?.();
    }
  }

  private async loadHarvestForFamily(): Promise<void> {
    if (this.state.harvestFamily === "r1ps") {
      await this.loadPackedHunt(R1PS_HUNT_URL, "Could not load the R1ps zeros hunt");
      if (this.state.display.showReflectedR2ps) {
        try {
          await this.ensureReflectedR2psLoaded();
        } catch {
          /* fetchReflectedR2ps already recorded the error */
        }
      }
      return;
    }
    if (this.state.harvestFamily === "r2ps") {
      await this.loadPackedHunt(R2PS_HUNT_URL, "Could not load the R2ps zeros hunt");
      return;
    }
    await this.loadCommittedDisplayScan();
  }

  /**
   * Switch the packed harvest. Siegel keeps Boundaries / Zero sets. A hunt
   * family is only that cloud plus the Display accordion.
   */
  public setHarvestFamily(family: ZerosHarvestFamily): void {
    const next = parseZerosHarvestFamily(family);
    if (next === this.state.harvestFamily) return;
    this.state.harvestFamily = next;
    if (this.tabViewMode === "sum") this.syncSumScene();
    this.persistUiPrefs();
    this.toolboxRefresh?.();
    void this.loadHarvestForFamily();
  }

  /**
   * Load an archive entry directly into the dimmed background layer (instead
   * of the live scatter). Used by the startup default-background flow.
   */
  private async loadArchiveAsBackground(scanId: string): Promise<void> {
    const entry = await this.archive.get({ workspaceId: WORKSPACE_ID, scanId });
    if (!entry) return;
    if (this.backgroundScatter !== null) {
      this.backgroundScatter.dispose();
      this.backgroundScatter = null;
      this.backgroundScanIds.clear();
    }
    const layer = new ScanScatterLayer(this.contentGroup, this.state.display);
    // Variant resolution: prefer the file's recorded variant when it's a
    // fully-qualified FVariant (R1ak / R1ps / R2ak / R2ps / …). For legacy
    // imports tagged with a bare "R1" or "R2" (which aren't real variants —
    // every variant must carry its rForm), fall back to the BG dropdown's
    // mapping below, which encodes the user's display intent (Rak vs Rps).
    const fileVariantParts = fVariantParts(entry.request.variant);
    const intendedVariant: FVariant | undefined = fileVariantParts !== undefined
      ? entry.request.variant
      : ZerosOfFModel.BG_DROPDOWN_NAME_TO_VARIANT[this.state.display.backgroundDefaultName.trim()];
    if (intendedVariant !== undefined) {
      const parts = fVariantParts(intendedVariant);
      layer.setRForm(parts.rForm);
      layer.setFamily(parts.family);
    }
    // Else: leave layer at defaults — data still renders, just without the
    // variant-specific color tint.
    layer.setVisible(true);
    await this.appendArchiveLinesToLayer(entry.lines, layer);
    this.applyBackgroundStyle(layer);
    this.backgroundScatter = layer;
    this.backgroundScanIds.add(scanId);
    // BG variant dropdown is an explicit "show me this scan" action — refit so
    // the points are actually on screen even if the user was in Circles / Zoom
    // High Square / a deep zoom-in. (The scan-manager loadScan path elsewhere
    // intentionally does NOT refit; only this variant-dropdown path does.)
    this.applyViewportFit();
  }

  public dispose(): void {
    this.stopZeroCount();  // cancel any in-flight zero-count loop + terminate workers
    this.detachCirclesLoop();
    this.detachScanFireAndForget();
    this.scatter.dispose();
    this.left500Scatter.dispose();
    this.aboveCurveScatter.dispose();
    this.nearStripScatter.dispose();
    this.stripTo300Scatter.dispose();
    this.r2psReflect.dispose();
    for (const slice of OVERLAY_HARVEST_SLICES) this.tBandScatters[slice.id].dispose();
    for (const layer of this.loadedScanLayers.values()) layer.dispose();
    this.loadedScanLayers.clear();
    if (this.differenceLayer !== null) {
      this.differenceLayer.dispose();
      this.differenceLayer = null;
    }
    if (this.backgroundScatter !== null) this.backgroundScatter.dispose();
    if (this.culledScatter !== null) this.culledScatter.dispose();
    this.boundary.dispose();
    this.ariasBoundary.dispose();
    this.imagCubeRootBoundary.dispose();
    this.imagCubeRootSeriesBoundary.dispose();
    this.theorem5Boundary.dispose();
    this.theorem5Points.dispose();
    this.scorerExpansion.dispose();
    this.scorerZeros.dispose();
    this.paulsBoundary.dispose();
    this.fracTSliceBoundary.dispose();
    this.fracTClosedBoundary.dispose();
    this.fracTFourierBoundary.dispose();
    this.fracTSmoothApBoundary.dispose();
    this.tAverages.dispose();
    this.scanFloor.dispose();
    this.negTZerosRidge.dispose();
    this.criticalStripGuides.dispose();
    this.zetaZeros.dispose();
    this.zetaChampions.dispose();
    this.ariasZeros.dispose();
    this.akZerosLt.dispose();
    this.akZerosGt.dispose();
    for (const layer of this.akFsZeros) layer.dispose();
    this.integerTGrid.dispose();
    this.phaseHeatmap.dispose();
    this.zeroCountBoxes.dispose();
    for (const layer of this.bgOverlayLayers.values()) layer.dispose();
    this.bgOverlayLayers.clear();
    this.hoverFrameCleanup?.();
    this.hoverFrameCleanup = null;
    this.pendingHover = null;
    this.controller.setPointerHoverListener(null);
    this.hoverMarker.dispose();
    this.twinMarker.dispose();
    this.strandRings.dispose();
    this.scanProgress.dispose();
    this.segmentPostProc.dispose();
    this.segmentRefine.dispose();
    this.tRowHighlight.dispose();
    this.controller.getFeatureRoot().remove(this.orbitGroup);
    this.backend.dispose();
    this.controller.dispose();
  }

  private createBackend(choice: ScanBackendChoice): ScanBackend {
    return this.backendFactory(this.normalizeBackendChoice(choice));
  }

  private normalizeBackendChoice(_choice: ScanBackendChoice): ScanBackendChoice {
    return "local";
  }

  private setBackendChoice(choice: ScanBackendChoice): void {
    if (this.currentHandle !== null) return;
    const normalized = this.normalizeBackendChoice(choice);
    if (this.state.backendId === normalized) return;
    this.backend.dispose();
    this.state.backendId = normalized;
    this.persistUiPrefs();
    this.backend = this.createBackend(normalized);
    this.toolboxRefresh?.();
  }

  private persistUiPrefs(): void {
    writeUiPrefs(this.state);
  }

  public getSceneController() {
    return this.controller;
  }

  /** Current `(σ,T) → world` linear transform applied by the data-fit group. */
  public getDataFitTransform() {
    return this.fitGroup.getTransform();
  }

  /** Whether the Y axis is showing raw T or fractional T. */
  public getYAxisMode(): "T" | "fracT" {
    return this.state.display.yAxisMode;
  }

  /** Current top-level view mode (`"zeros"` or `"sum"`). */
  public getTabViewMode(): ZerosTabViewMode {
    return this.tabViewMode;
  }

  /** Current `"sum view"` spiral controls snapshot. */
  public getSumViewControls(): SumViewControlsState {
    return { ...this.sumControls };
  }

  /**
   * Flip between `"zeros view"` (normal zeros explorer) and `"sum view"`
   * (zeros pan/tilt/zoom frozen in place; spiral + crosshair plane active).
   */
  public setTabViewMode(mode: ZerosTabViewMode): void {
    if (this.tabViewMode === mode) return;
    this.tabViewMode = mode;
    this.clearZeroHover();
    this.controller.setViewMode(mode);
    if (mode === "sum") {
      this.ensureSumCursorVisible();
      this.syncSumScene();
    } else {
      this.sumControls = { ...this.sumControls, animSpeed: 0 };
    }
    this.toolboxRefresh?.();
  }

  public updateSumControls(patch: Partial<SumViewControlsState>): void {
    this.sumControls = { ...this.sumControls, ...patch };
    this.syncSumScene();
    this.toolboxRefresh?.();
  }

  public setSumIndexFromControl(rawIndex: number): void {
    const clamped = clamp(rawIndex, 0, 350_000 + 1 - 1e-9);
    this.sumControls = {
      ...this.sumControls,
      index: clamped,
      chainFromZero: false,
    };
    this.syncSumScene();
  }

  public setSumSigmaFromControl(rawSigma: number): void {
    const lo = Math.min(this.sumControls.sigmaMin, this.sumControls.sigmaMax);
    const hi = Math.max(this.sumControls.sigmaMin, this.sumControls.sigmaMax);
    this.sumControls = {
      ...this.sumControls,
      sigma: clamp(rawSigma, lo, hi),
      chainFromZero: false,
    };
    this.syncSumScene();
  }

  public setSumSigmaRange(min: number, max: number): void {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    const nextSigma = clamp(this.sumControls.sigma, lo, hi);
    this.sumControls = {
      ...this.sumControls,
      sigmaMin: min,
      sigmaMax: max,
      sigma: nextSigma,
      chainFromZero: nextSigma !== this.sumControls.sigma ? false : this.sumControls.chainFromZero,
    };
    this.syncSumScene();
  }

  /**
   * Jump the `"sum view"` spiral and white crosshair onto a picked zero,
   * widening the σ slider range if needed (matching Big Sigma).
   */
  public applySumZero(sigma: number, index: number): void {
    const clampedIndex = clamp(index, 0, 350_000 + 1 - 1e-9);
    this.sumInitialized = true;
    this.sumControls = {
      ...this.sumControls,
      sigma,
      sigmaMin: Math.min(this.sumControls.sigmaMin, sigma),
      sigmaMax: Math.max(this.sumControls.sigmaMax, sigma),
      index: clampedIndex,
      chainFromZero: true,
    };
    this.syncSumScene();
  }

  private pickZeroInSumView(cssX: number, cssY: number): void {
    if (this.sumControls.zerosDimmer <= 0) return;
    const hit = this.pickZeroHover(cssX, cssY);
    if (hit === null) return;
    this.applySumZero(hit.sigma, hit.t);
    this.toolboxRefresh?.();
  }

  private sumPointToZerosNdc(sigma: number, index: number): { x: number; y: number } {
    const p = harvestPointXyz(
      sigma,
      index,
      this.state.display.displayView,
      this.state.display.yAxisMode,
    );
    this.fitGroup.group.updateWorldMatrix(true, false);
    this.hoverWorld.set(p.x, p.y, p.z);
    this.fitGroup.group.localToWorld(this.hoverWorld);
    return this.controller.projectZerosWorldToNdc(
      this.hoverWorld.x,
      this.hoverWorld.y,
      this.hoverWorld.z,
    );
  }

  /**
   * Ensure `(sigma, T)` sits inside the frozen zeros view when entering `"sum view"`
   * so the white crosshair and spiral are immediately visible on screen.
   */
  private ensureSumCursorVisible(): void {
    if (this.sumInitialized) {
      const ndc = this.sumPointToZerosNdc(this.sumControls.sigma, this.sumControls.index);
      if (ndc.x >= -1 && ndc.x <= 1 && ndc.y >= -1 && ndc.y <= 1) {
        return;
      }
    }
    const { width, height } = this.controller.getCanvasSize();
    const cx = width * 0.5;
    const cy = height * 0.5;
    for (const radius of [80, 300]) {
      const hit = this.pickZeroHoverWithRadius(cx, cy, radius);
      if (hit !== null) {
        this.applySumZero(hit.sigma, hit.t);
        return;
      }
    }
    const fit = this.fitGroup.getTransform();
    const cam = this.controller.getZerosCameraBounds();
    const safeScaleX = fit.scaleX !== 0 ? fit.scaleX : 1;
    const safeScaleY = fit.scaleY !== 0 ? fit.scaleY : 1;
    const midSigma = (0.5 * (cam.left + cam.right) - fit.offsetX) / safeScaleX;
    const midY = (0.5 * (cam.bottom + cam.top) - fit.offsetY) / safeScaleY;
    const midT = this.state.display.yAxisMode === "fracT" && this.state.display.displayView !== "fracT3d"
      ? Math.max(0.1, Math.floor(this.sumControls.index) + clamp(midY, 0, 0.999999))
      : clamp(midY, 0.1, 350_000);
    this.sumInitialized = true;
    this.sumControls = {
      ...this.sumControls,
      sigma: midSigma,
      sigmaMin: Math.min(this.sumControls.sigmaMin, midSigma),
      sigmaMax: Math.max(this.sumControls.sigmaMax, midSigma),
      index: midT,
      chainFromZero: false,
    };
  }

  private syncSumScene(): void {
    const ndc = this.sumPointToZerosNdc(this.sumControls.sigma, this.sumControls.index);
    this.controller.setSumParams({
      sigma: this.sumControls.sigma,
      index: this.sumControls.index,
      showR1ak: this.sumControls.showR1ak,
      zerosDimmer: this.sumControls.zerosDimmer,
      chainExtent: this.sumControls.chainExtent,
      showCrosshair: this.sumControls.showCrosshair,
      chainFromZero: this.sumControls.chainFromZero,
      lastLinksOnly: this.sumControls.lastLinksOnly,
      lastLinksCount: this.sumControls.lastLinksCount,
      remainder: this.state.harvestFamily === "siegel" ? "ak" : "ps",
      spectrumFeather: this.state.display.spectrumFeather,
      crosshairNdcX: ndc.x,
      crosshairNdcY: ndc.y,
    });
  }

  /** Current Display dropdown mode. */
  public getDisplayView(): DisplayControlsState["displayView"] {
    return this.state.display.displayView;
  }

  /** Yaw/pitch used by the 3D orbit bars and drag. */
  public getOrbit(): { yawDeg: number; pitchDeg: number } {
    return {
      yawDeg: this.state.display.orbitYawDeg,
      pitchDeg: this.state.display.orbitPitchDeg,
    };
  }

  /** Set orbit from the canvas scrollbar-like sliders. */
  public setOrbit(yawDeg: number, pitchDeg: number): void {
    this.state.display = {
      ...this.state.display,
      orbitYawDeg: wrapOrbitYawDeg(yawDeg),
      orbitPitchDeg: clampOrbitPitchDeg(pitchDeg),
    };
    this.applyOrbitRotation();
    this.persistUiPrefs();
  }

  /**
   * Pointer-drag orbit. Horizontal drag is yaw; vertical drag is pitch.
   * Prefs persist on pointer-up so a drag does not spam localStorage.
   */
  public applyOrbitDelta(dxPx: number, dyPx: number): void {
    this.state.display = {
      ...this.state.display,
      orbitYawDeg: wrapOrbitYawDeg(this.state.display.orbitYawDeg + dxPx * 0.35),
      orbitPitchDeg: clampOrbitPitchDeg(this.state.display.orbitPitchDeg + dyPx * 0.35),
    };
    this.applyOrbitRotation();
  }

  private applyOrbitRotation(): void {
    if (this.state.display.displayView !== "fracT3d") {
      this.orbitGroup.rotation.set(0, 0, 0);
      return;
    }
    const pitch = (this.state.display.orbitPitchDeg * Math.PI) / 180;
    const yaw = (this.state.display.orbitYawDeg * Math.PI) / 180;
    this.orbitGroup.rotation.set(pitch, yaw, 0, "YXZ");
  }

  private syncScenePresentation(): void {
    const is3d = this.state.display.displayView === "fracT3d";
    this.controller.setDragMode(is3d ? "orbit" : "pan");
    this.controller.setCameraFar(is3d ? 400 : 200);
    this.applyOrbitRotation();
  }

  /**
   * Zero-dots currently painted (frac(T) / AK filters applied). Arias-solo
   * hides the harvest group, so that overlay is counted instead.
   */
  public getDisplayedZeroCount(): number {
    if (this.state.display.showAriasSolo) {
      return this.ariasZeros.getDisplayedCount();
    }
    let total = this.scatter.getDrawnCount();
    if (this.r2psReflectVisible()) total += this.r2psReflect.getDrawnCount();
    total += this.zetaZeros.getDisplayedCount();
    total += this.zetaChampions.getDisplayedCount();
    if (!this.showingSiegelHarvest()) {
      return total;
    }
    if (this.state.display.showSigmaNeg500ToNeg400) {
      total += this.left500Scatter.getDrawnCount();
    }
    if (this.state.display.showAboveCurveZeros) {
      total += this.aboveCurveScatter.getDrawnCount();
    }
    if (this.state.display.showR1akNearStrip) {
      total += this.nearStripScatter.getDrawnCount();
    }
    if (this.state.display.showR1akStripTo300) {
      total += this.stripTo300Scatter.getDrawnCount();
    }
    for (const slice of OVERLAY_HARVEST_SLICES) {
      if (harvestSliceShown(this.state.display, slice.id)) {
        total += this.tBandScatters[slice.id].getDrawnCount();
      }
    }
    for (const layer of this.loadedScanLayers.values()) {
      total += layer.getDrawnCount();
    }
    if (
      this.backgroundScatter !== null
      && this.state.display.backgroundOpacity > 0
    ) {
      total += this.backgroundScatter.getDrawnCount();
    }
    total += this.akZerosLt.getDisplayedCount();
    total += this.akZerosGt.getDisplayedCount();
    for (const layer of this.akFsZeros) total += layer.getDisplayedCount();
    return total;
  }

  /** Iterate every recorded `(σ, T, yVal)` triple in the live scatter +
   *  every loaded archive scan's own scatter layer + the diff overlay. */
  public forEachScatterPoint(cb: (sigma: number, t: number, yVal: number) => void): void {
    this.scatter.forEachPoint(cb);
    this.left500Scatter.forEachPoint(cb);
    this.aboveCurveScatter.forEachPoint(cb);
    this.nearStripScatter.forEachPoint(cb);
    this.stripTo300Scatter.forEachPoint(cb);
    for (const slice of OVERLAY_HARVEST_SLICES) this.tBandScatters[slice.id].forEachPoint(cb);
    for (const layer of this.loadedScanLayers.values()) layer.forEachPoint(cb);
    if (this.differenceLayer !== null) this.differenceLayer.forEachPoint(cb);
  }

  /**
   * Iterate every `(σ, T, yVal)` triple visible on screen — the live scatter,
   * every loaded archive scan, the diff overlay, and the dimmed background
   * layer. Used by the histogram so all comparison data is counted alongside
   * the new scan's.
   */
  public forEachVisibleScatterPoint(cb: (sigma: number, t: number, yVal: number) => void): void {
    this.scatter.forEachPoint(cb);
    if (!this.showingSiegelHarvest()) return;
    if (this.state.display.showSigmaNeg500ToNeg400) {
      this.left500Scatter.forEachPoint(cb);
    }
    if (this.state.display.showAboveCurveZeros) {
      this.aboveCurveScatter.forEachPoint(cb);
    }
    if (this.state.display.showR1akNearStrip) {
      this.nearStripScatter.forEachPoint(cb);
    }
    if (this.state.display.showR1akStripTo300) {
      this.stripTo300Scatter.forEachPoint(cb);
    }
    for (const slice of OVERLAY_HARVEST_SLICES) {
      if (harvestSliceShown(this.state.display, slice.id)) {
        this.tBandScatters[slice.id].forEachPoint(cb);
      }
    }
    for (const layer of this.loadedScanLayers.values()) layer.forEachPoint(cb);
    if (this.differenceLayer !== null) this.differenceLayer.forEachPoint(cb);
    if (this.backgroundScatter !== null) {
      this.backgroundScatter.forEachPoint(cb);
    }
  }

  /**
   * Open-ring hover for every zero cloud that is actually painted.
   * Hit testing is in CSS pixels so the catch radius stays constant
   * while σ and T are zoomed independently. Runs at most once per frame
   * with the newest pointer position; older moves in the same frame are
   * dropped because their ring would never be seen.
   */
  private onCanvasHover(pending: PendingHover): void {
    const { canvas, overCanvas } = pending;
    if (canvas === null) {
      this.clearZeroHover();
      return;
    }
    if (!overCanvas || (this.tabViewMode === "sum" && this.sumControls.zerosDimmer <= 0)) {
      canvas.style.cursor = "";
      this.clearZeroHover();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const hit = this.pickZeroHover(pending.clientX - rect.left, pending.clientY - rect.top);
    if (hit === null) {
      canvas.style.cursor = "";
      this.clearZeroHover();
      return;
    }
    const css = this.cssOfHover(hit.x, hit.y, hit.z);
    if (!Number.isFinite(css.x) || !Number.isFinite(css.y)) {
      canvas.style.cursor = "";
      this.clearZeroHover();
      return;
    }
    canvas.style.cursor = "pointer";
    this.hoverSample = hit;
    if (this.tabViewMode === "sum") {
      this.hoverMarker.hide();
      this.twinMarker.hide();
      this.strandRings.hide();
      this.controller.showSumHoverRing(css.x, css.y, hit.r, hit.g, hit.b);
      const twin = this.state.display.showHoverInfo && hit.pointId >= 0
        ? this.scatter.twinOf(hit.pointId)
        : null;
      this.hoverMarker.showLabel(canvas, hit, css, twin);
      return;
    }
    this.controller.hideSumHoverRing();
    this.hoverMarker.showRing(hit);
    if (!this.state.display.showHoverInfo) {
      this.hoverMarker.hideLabel();
      this.twinMarker.hide();
      this.strandRings.hide();
      return;
    }
    const twin = hit.pointId >= 0 ? this.scatter.twinOf(hit.pointId) : null;
    this.hoverMarker.showLabel(canvas, hit, css, twin);
    if (twin === null) this.twinMarker.hide();
    else this.twinMarker.showRing(twin);
    const neighbors =
      hit.pointId >= 0 ? this.scatter.strandNeighbors(hit.pointId) : [];
    if (twin !== null) neighbors.push(...this.scatter.strandNeighbors(twin.pointId));
    this.strandRings.show(neighbors);
  }

  private clearZeroHover(): void {
    this.hoverSample = null;
    this.hoverMarker.hide();
    this.twinMarker.hide();
    this.strandRings.hide();
    this.controller.hideSumHoverRing();
  }

  /** Keep the label glued to the ring while the camera pans or zooms. */
  private repositionHoverLabel(): void {
    const hit = this.hoverSample;
    if (hit === null) return;
    const css = this.cssOfHover(hit.x, hit.y, hit.z);
    if (!Number.isFinite(css.x) || !Number.isFinite(css.y)) return;
    this.hoverMarker.moveLabel(css);
  }

  private hoverUsesProjection(): boolean {
    const rotation = this.orbitGroup.rotation;
    return rotation.x !== 0 || rotation.y !== 0 || rotation.z !== 0;
  }

  private hoverCssMap(): FitLocalCssMap {
    const fit = this.fitGroup.getTransform();
    const cam = this.controller.getZerosCameraBounds();
    const size = this.controller.getCanvasSize();
    return {
      scaleX: fit.scaleX,
      scaleY: fit.scaleY,
      offsetX: fit.offsetX,
      offsetY: fit.offsetY,
      left: cam.left,
      right: cam.right,
      top: cam.top,
      bottom: cam.bottom,
      width: size.width,
      height: size.height,
    };
  }

  private cssOfHover(x: number, y: number, z: number): { x: number; y: number } {
    if (this.hoverUsesProjection()) {
      this.fitGroup.group.updateWorldMatrix(true, false);
      this.hoverWorld.set(x, y, z);
      this.fitGroup.group.localToWorld(this.hoverWorld);
      return this.controller.projectZerosWorldToCss(
        this.hoverWorld.x,
        this.hoverWorld.y,
        this.hoverWorld.z,
      );
    }
    return cssFromFitLocal(x, y, this.hoverCssMap());
  }

  private pickZeroHover(cssX: number, cssY: number): ZeroHoverSample | null {
    return this.pickZeroHoverWithRadius(cssX, cssY, ZERO_HOVER_RADIUS_PX);
  }

  private pickZeroHoverWithRadius(
    cssX: number,
    cssY: number,
    radiusPx: number,
  ): ZeroHoverSample | null {
    const orbiting = this.hoverUsesProjection();
    const map = this.hoverCssMap();
    let keepLocal: ((x: number, y: number) => boolean) | null = null;
    if (!orbiting) {
      const box = hoverSearchBox(cssX, cssY, radiusPx, map);
      if (box === null) return null;
      keepLocal = (x, y) => x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY;
    } else {
      this.fitGroup.group.updateWorldMatrix(true, false);
    }
    const toCss = orbiting
      ? (x: number, y: number, z: number) => {
          this.hoverWorld.set(x, y, z);
          this.fitGroup.group.localToWorld(this.hoverWorld);
          return this.controller.projectZerosWorldToCss(
            this.hoverWorld.x,
            this.hoverWorld.y,
            this.hoverWorld.z,
          );
        }
      : (x: number, y: number) => cssFromFitLocal(x, y, map);
    return pickNearestZeroHover(
      (onPoint, keep) => {
        this.visitAllHoverPoints(onPoint, keep);
      },
      cssX,
      cssY,
      radiusPx,
      toCss,
      keepLocal,
    );
  }

  private visitAllHoverPoints(
    onPoint: HoverPointFn,
    keepLocal: ((x: number, y: number) => boolean) | null,
  ): void {
    const scatters: ScanScatterLayer[] = [
      this.scatter,
      this.left500Scatter,
      this.aboveCurveScatter,
      this.nearStripScatter,
      this.stripTo300Scatter,
      this.r2psReflect,
    ];
    for (const slice of OVERLAY_HARVEST_SLICES) scatters.push(this.tBandScatters[slice.id]);
    for (const layer of this.loadedScanLayers.values()) scatters.push(layer);
    for (const layer of this.bgOverlayLayers.values()) scatters.push(layer);
    if (this.differenceLayer !== null) scatters.push(this.differenceLayer);
    if (this.backgroundScatter !== null) scatters.push(this.backgroundScatter);
    if (this.culledScatter !== null) scatters.push(this.culledScatter);
    for (const layer of scatters) {
      if (!layer.acceptsHover()) continue;
      if (layer === this.scatter) {
        layer.visitHoverPoints(onPoint, keepLocal);
      } else {
        layer.visitHoverPoints((sigma, t, x, y, z, r, g, b) => {
          onPoint(sigma, t, x, y, z, r, g, b, -1);
        }, keepLocal);
      }
    }
    if (this.akZerosLt.acceptsHover()) this.akZerosLt.visitHoverPoints(onPoint, keepLocal);
    if (this.akZerosGt.acceptsHover()) this.akZerosGt.visitHoverPoints(onPoint, keepLocal);
    for (const layer of this.akFsZeros) {
      if (layer.acceptsHover()) layer.visitHoverPoints(onPoint, keepLocal);
    }
    if (this.ariasZeros.acceptsHover()) this.ariasZeros.visitHoverPoints(onPoint, keepLocal);
    if (this.scorerZeros.acceptsHover()) this.scorerZeros.visitHoverPoints(onPoint, keepLocal);
    if (this.scorerExpansion.acceptsHover()) this.scorerExpansion.visitHoverPoints(onPoint, keepLocal);
    if (this.zetaZeros.acceptsHover()) this.zetaZeros.visitHoverPoints(onPoint, keepLocal);
    if (this.zetaChampions.acceptsHover()) this.zetaChampions.visitHoverPoints(onPoint, keepLocal);
  }

  /** Current display thresholds (used by panels that need e.g. `zeroThreshBlack`). */
  public getDisplayState(): DisplayControlsState {
    return structuredClone(this.state.display);
  }

  /** Generic patch on scan controls. Used by CustomPanels that render multi-field layouts. */
  public updateScanControls(patch: Partial<ScanControlsState>): void {
    this.state.scan = { ...this.state.scan, ...patch };
    this.scanProgress.setScanRect({
      sigmaMin: this.state.scan.sigmaMin,
      sigmaMax: this.state.scan.sigmaMax,
      tMin: this.state.scan.tMin,
      tMax: this.state.scan.tMax,
      ridgeBand: this.state.scan.branch === "neg" && this.state.scan.ridgeRange,
    });
    // Heatmap bounds now mirror the scan rectangle — keep the white outline
    // in sync so the user sees where the next Refresh will paint.
    this.applyHeatmapBoundsOutline();
    this.persistUiPrefs();
    this.toolboxRefresh?.();
  }

  public getScanControls(): ScanControlsState {
    return structuredClone(this.state.scan);
  }

  public getSelectionState(): SelectionState {
    return { activePoint: null };
  }

  public getSerializableState(): ZerosOfFSerializableState {
    return structuredClone(this.state);
  }

  public restoreSerializableState(value: unknown): void {
    let parsed: ZerosOfFSerializableState;
    if (typeof value === "string") {
      try {
        const raw: unknown = JSON.parse(value);
        parsed = validate(raw, validZerosOfFState);
      } catch {
        return;
      }
    } else {
      try {
        parsed = validate(value, validZerosOfFState);
      } catch {
        return;
      }
    }
    this.state = {
      ...parsed,
      backendId: this.normalizeBackendChoice(parsed.backendId),
    };
    this.persistUiPrefs();
    this.backend.dispose();
    this.backend = this.createBackend(this.state.backendId);
    this.scatter.setDisplay(this.state.display);
    this.left500Scatter.setDisplay(this.state.display);
    this.left500Scatter.setVisible(this.state.display.showSigmaNeg500ToNeg400);
    this.syncHarvestBandOverlays(this.state.display);
    for (const layer of this.loadedScanLayers.values()) layer.setDisplay(this.state.display);
    if (this.differenceLayer !== null) this.differenceLayer.setDisplay(this.state.display);
    if (this.culledScatter !== null) this.culledScatter.setDisplay(this.state.display);
    this.ariasZeros.setColorMode(this.state.display.colorMode);
    this.ariasZeros.setSpectrumFeather(this.state.display.spectrumFeather);
    this.syncAkOverlays(this.state.display);
    this.applyHarvestFamilyVisibility();
    this.applyViewportFit();
    this.syncScenePresentation();
    this.applyView();
    void this.loadHarvestForFamily();
    if (this.state.activeScanId !== null) {
      this.loadArchivedScan(this.state.activeScanId).catch(() => {
        /* missing archive entry is non-fatal; user can rescan */
      });
    }
  }

  public getToolboxContributions(ctx: ToolboxContext): ToolboxSection[] {
    this.toolboxRefresh = ctx.requestToolboxRefresh;
    // Resolve the effective pool size (= what the next/current scan would
    // actually use) so the toolbox can show "Workers: N (cap M)".
    let workersActive: number | null = null;
    let workersCap: number | null = null;
    if (this.backend instanceof LocalWorkerBackend) {
      workersActive = this.backend.effectivePoolSize(this.state.workersHint);
      workersCap = this.backend.hardwareCap;
    }

    return buildToolboxSections({
      tabViewMode: this.tabViewMode,
      onTabViewModeChange: (mode) => { this.setTabViewMode(mode); },
      sumControls: this.sumControls,
      onSumControlsChange: (patch) => { this.updateSumControls(patch); },
      onSumIndexFromControl: (index) => {
        this.setSumIndexFromControl(index);
        ctx.requestToolboxRefresh();
      },
      onSumSigmaFromControl: (sigma) => {
        this.setSumSigmaFromControl(sigma);
        ctx.requestToolboxRefresh();
      },
      onSumSigmaRangeChange: (min, max) => {
        this.setSumSigmaRange(min, max);
        ctx.requestToolboxRefresh();
      },
      harvestFamily: this.state.harvestFamily,
      onHarvestFamilyChange: (family) => { this.setHarvestFamily(family); },
      backendId: this.state.backendId,
      workersHint: this.state.workersHint,
      backendDisplayName: this.backend.displayName,
      workersActive,
      workersCap,
      scan: this.state.scan,
      display: this.state.display,
      overlayRowCounts: this.overlayRowCounts,
      scorerZeroCounts: this.scorerZeros.getLoadedCounts(),
      progress: this.lastProgress,
      scanActivity: this.scanActivity,
      progressRowsPerMinute: this.progressRowsPerMinute,
      scanStartedAt: this.scanStartedAt,
      isRunning: this.scanStartPending || this.currentHandle?.status === "running",
      isPaused: this.currentHandle?.status === "paused",
      lastError: this.lastError,
      activeScanId: this.currentHandle?.status === "running" ? this.state.activeScanId : null,
      onScanChange: (next: ScanControlsState) => {
        this.state.scan = next;
        this.scanProgress.setScanRect({
          sigmaMin: next.sigmaMin,
          sigmaMax: next.sigmaMax,
          tMin: next.tMin,
          tMax: next.tMax,
          ridgeBand: next.branch === "neg" && next.ridgeRange,
        });
        this.persistUiPrefs();
        ctx.requestToolboxRefresh();
      },
      onDisplayChange: (patch: Partial<DisplayControlsState>) => {
        const prev = this.state.display;
        const next = mergeDisplayPatch(prev, patch);
        // Route the zero-count-boxes toggle through the dedicated setter so
        // turning it on auto-starts the compute (and turning it off cancels).
        if (prev.showZeroCountBoxes !== next.showZeroCountBoxes) {
          this.setShowZeroCountBoxes(next.showZeroCountBoxes);
          // setShowZeroCountBoxes already wrote state.display.showZeroCountBoxes;
          // continue with the rest of the diff below.
        }
        this.state.display = next;
        if (prev.showHoverInfo && !next.showHoverInfo) {
          this.hoverMarker.hideLabel();
          this.twinMarker.hide();
          this.strandRings.hide();
        }
        this.scatter.setDisplay(next);
        this.left500Scatter.setDisplay(next);
        this.left500Scatter.setVisible(next.showSigmaNeg500ToNeg400 && this.showingSiegelHarvest());
        this.syncHarvestBandOverlays(next);
        for (const layer of this.loadedScanLayers.values()) layer.setDisplay(next);
        if (this.differenceLayer !== null) this.differenceLayer.setDisplay(next);
        if (this.culledScatter !== null) this.culledScatter.setDisplay(next);
        // Background layer follows display tweaks too (yAxisMode, color mode);
        // visibility is driven by the configured backgroundOpacity (0 = hide).
        if (this.backgroundScatter !== null) {
          this.backgroundScatter.setDisplay(next);
          if (next.backgroundOpacity > 0) {
            this.backgroundScatter.setVisible(true);
            this.applyBackgroundStyle(this.backgroundScatter);
          } else {
            this.backgroundScatter.setVisible(false);
          }
        }
        // Bg-overlay layers (legRatio / foldBack / foldOut) carry their own
        // override display state (phase-R coloring, no mag-threshold dim, no
        // fracT band filter). Propagate the user's yAxisMode change while
        // preserving those overrides — without this, the overlays freeze
        // their positions at whatever yAxisMode they were created with and
        // appear at wrong y-coords (often off-screen) after a fracT toggle.
        for (const layer of this.bgOverlayLayers.values()) {
          layer.setDisplay({
            ...next,
            colorMode: "phase-r",
            magThresh: Number.MAX_VALUE,
            magThreshMax: Number.MAX_VALUE,
            fracTRangeMin: 0,
            fracTRangeMax: 1,
            fracTFilterKind: "range",
            fracTQuarterEnabled: false,
          });
        }
        this.boundary.setVisible(next.showBoundary);
        this.ariasBoundary.setVisible(next.showAriasBoundary);
        this.imagCubeRootBoundary.setVisible(next.showImagCubeRootBoundary);
        this.imagCubeRootSeriesBoundary.setVisible(next.showImagCubeRootSeriesBoundary);
        this.theorem5Boundary.setVisible(next.showTheorem5Boundary);
        this.theorem5Points.setMaxN(
          next.showTheorem5Points ? THEOREM5_POINT_N_MAX : 0,
          next.yAxisMode,
        );
        this.scorerExpansion.setYAxisMode(next.yAxisMode);
        this.scorerExpansion.setDisplayView(next.displayView);
        this.scorerExpansion.setVisible(next.showScorerExpansionPoints);
        this.scorerZeros.setYAxisMode(next.yAxisMode);
        this.scorerZeros.setDisplayView(next.displayView);
        if (next.showScorerZeros && !prev.showScorerZeros) this.scorerZeros.reload();
        this.scorerZeros.setVisible(next.showScorerZeros);
        this.paulsBoundary.setVisible(next.showPaulsBoundary);
        this.syncFracTSliceBoundary(next);
        this.syncFracTClosedBoundary(next);
        this.syncFracTFourierBoundary(next);
        this.syncFracTSmoothApBoundary(next);
        this.tAverages.setVisible(next.showTAverages);
        this.scanFloor.setVisible(next.showScanFloor);
        this.negTZerosRidge.setVisible(next.showNegTZerosRidge);
        this.criticalStripGuides.setVisible(next.showCriticalStripGuides);
        this.zetaZeros.setVisible(next.showZetaZeros);
        this.zetaChampions.setVisible(next.showZetaChampions);
        this.integerTGrid.setVisible(next.showIntegerTGrid);
        if (prev.yAxisMode !== next.yAxisMode) {
          this.zetaZeros.setYAxisMode(next.yAxisMode);
          this.zetaChampions.setYAxisMode(next.yAxisMode);
        }
        // Keep the Arias solo overlay + content visibility in sync with state.
        this.contentGroup.visible = !next.showAriasSolo;
        if (prev.yAxisMode !== next.yAxisMode) this.ariasZeros.setYAxisMode(next.yAxisMode);
        this.ariasZeros.setColorMode(next.colorMode);
        this.ariasZeros.setSpectrumFeather(next.spectrumFeather);
        this.ariasZeros.setVisible(next.showAriasSolo);
        this.syncAkOverlays(next);
        this.applyHarvestFamilyVisibility();
        this.syncMainZerosVisibility();
        if (
          prev.showReflectedR2ps !== next.showReflectedR2ps
          && next.showReflectedR2ps
          && this.state.harvestFamily === "r1ps"
        ) {
          void this.ensureReflectedR2psLoaded().catch(() => {
            /* fetchReflectedR2ps already recorded the error */
          });
        }
        // Re-fit the viewport whenever the critical-strip toggle flips so the
        // σ ∈ [-8, 8], T ∈ [0, 10] window kicks in (and reverts on flip-off).
        if (
          this.tabViewMode !== "sum"
          && (
            prev.showCriticalStripGuides !== next.showCriticalStripGuides
            || prev.displayView !== next.displayView
            || prev.fracT3dDepth !== next.fracT3dDepth
          )
        ) {
          this.applyViewportFit();
        }
        this.syncScenePresentation();
        if (this.tabViewMode === "sum") this.syncSumScene();
        this.scanProgress.setRectVisible(next.showScanRect);
        this.segmentPostProc.setVisible(next.showSegmentPostProc);
        this.segmentRefine.setVisible(next.showSegmentRefine);
        this.tRowHighlight.setVisible(next.showTRowHighlight);
        if (next.showTRowHighlight) this.recomputeTRowHighlight();
        // On yAxisMode change, rebuild curve layers and overlay geometry
        if (prev.yAxisMode !== next.yAxisMode || prev.displayView !== next.displayView) {
          this.rebuildCurveLayers();
          if (this.lastSegmentPoints.length > 0) {
            this.segmentPostProc.setPoints(this.lastSegmentPoints, next.yAxisMode);
          }
          if (this.lastRefinedPoints.length > 0) {
            this.segmentRefine.setPoints(this.lastRefinedPoints, next.yAxisMode);
          }
        }
        this.persistUiPrefs();
        ctx.requestToolboxRefresh();
      },
      onComputeTAverages: () => {
        this.recomputeTAverages();
        ctx.requestToolboxRefresh();
      },
      onComputeSegmentPostProc: () => {
        this.recomputeSegmentPostProc();
        ctx.requestToolboxRefresh();
      },
      onForceRunZeroCount: () => {
        void this.forceRunZeroCount();
        ctx.requestToolboxRefresh();
      },
      onStopZeroCount: () => {
        this.stopZeroCount();
        ctx.requestToolboxRefresh();
      },
      onExportZeroCountCsv: () => {
        const csv = this.buildZeroCountCsv();
        if (csv === null) {
          // eslint-disable-next-line no-alert
          window.alert("No zero-count data to export. Run the count first.");
          return;
        }
        // Default filename: variant + bounds, e.g. "zerocount_R1ak_s0.5-1_t0-300.csv"
        const s = this.state.scan;
        const r = this.zeroCountBoxes.getSigmaRange();
        const defaultName = `zerocount_${s.variant}_s${String(r.min)}-${String(r.max)}_t${String(s.tMin)}-${String(s.tMax)}.csv`;
        // eslint-disable-next-line no-alert
        const name = window.prompt("Save CSV as:", defaultName);
        if (name === null || name.trim() === "") return;  // user cancelled
        const filename = name.endsWith(".csv") ? name : `${name}.csv`;
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      },
      isZeroCountRunning: this.isZeroCountRunning(),
      onStartRefine: () => {
        this.startSegmentRefine();
      },
      onCancelRefine: () => {
        this.cancelSegmentRefine();
      },
      refineProgress: this.refineProgress,
      isRefining: this.isRefining,
      onComputeTRowHighlight: () => {
        this.recomputeTRowHighlight();
        ctx.requestToolboxRefresh();
      },
      onClearDisplay: () => {
        this.clearLiveScatter();
        ctx.requestToolboxRefresh();
      },
      onWorkersHintChange: (next: number) => {
        this.state.workersHint = next;
        this.persistUiPrefs();
        ctx.requestToolboxRefresh();
      },
      onBackendChange: (next: ScanBackendChoice) => {
        this.setBackendChoice(next);
        ctx.requestToolboxRefresh();
      },
      onPause: () => this.pauseScan(),
      onResume: () => this.resumeScan(),
      onStop: () => this.cancelScanFireAndForget(),
    });
  }

  public applyImportedDataset(dataset: ImportedDataset): void {
    if (dataset.kind !== "zerosOfFScan") return;
    this.scatter.clear();
    this.scatter.appendPoints(dataset.sigma, dataset.t, dataset.yVal);
    this.scatterHoldsMainZeros = false;
    this.syncMainZerosVisibility();
    this.toolboxRefresh?.();
  }

  // ── Scan orchestration ────────────────────────────────────────────────────

  private buildRequest(): ScanRequest {
    const s = this.state.scan;
    const hint = this.state.workersHint;
    // Negative-t branch resolves to the R1nak variant; positive keeps the
    // user-chosen variant. The whole scanner/worker/layer pipeline is
    // variant-agnostic, so this single substitution drives the −I(T)/R1nak math.
    const isNeg = s.branch === "neg";
    const variant = isNeg ? "R1nak" : s.variant;
    return {
      variant,
      sigmaRange: { min: s.sigmaMin, max: s.sigmaMax, linesPerSigma: s.linesPerSigma, adaptive: s.linesPerSigmaAdaptive },
      tRange: { min: s.tMin, max: s.tMax },
      // "Ridge range" (negative-t only): each σ line scans a thin band around
      // the R1nak ridge instead of the rectangular tRange (which is greyed out).
      ridgeBand: isNeg && s.ridgeRange,
      samplesPerT: s.samplesPerT,
      bisectionIters: s.bisectionIters,
      algorithm: s.algorithm,
      acceptDepth: s.acceptDepth,
      // Scan-floor toggle in the Background panel gates the empirical floor
      // (R1ak only): when off, scan the full requested T range regardless. The
      // floor curve was tuned for R1ak, so force it off for the negative-t branch.
      useScanFloor: isNeg ? false : this.state.display.showScanFloor,
      // Seed is fixed at 42 — the UI control was removed; any value persisted
      // in older session state is ignored so every scan is reproducible.
      seed: 42,
      // 0 = auto: backend uses hardwareConcurrency − 1.
      workers: hint > 0 ? hint : 0,
    };
  }

  /** Local scan rows for the scan-management modal. */
  public async listManagedScans(): Promise<ManagedScanRecord[]> {
    const localEntries = await this.archive.list(WORKSPACE_ID);
    return buildManagedScanRecords({
      backgroundIds: this.getBackgroundScanIds(),
      display: this.state.display,
      loadedIds: this.getLoadedScanIds(),
      localEntries,
    });
  }

  private cancelScanFireAndForget(): void {
    const h = this.currentHandle;
    if (h && (h.status === "running" || h.status === "paused")) {
      h.cancel().catch(() => {
        /* swallow; UI already shows cancelled state via the listener */
      });
    }
  }

  private detachScanFireAndForget(): void {
    const h = this.currentHandle;
    if (!h || (h.status !== "running" && h.status !== "paused")) return;
    if (typeof h.detach === "function") {
      void Promise.resolve(h.detach()).catch(() => {
        /* best effort during workspace teardown */
      });
      return;
    }
    this.cancelScanFireAndForget();
  }

  /** Pause the in-flight scan. Workers complete current task and idle. */
  public pauseScan(): void {
    const h = this.currentHandle;
    if (h && h.status === "running") {
      h.pause();
      this.toolboxRefresh?.();
    }
  }

  /** Resume a paused scan. */
  public resumeScan(): void {
    const h = this.currentHandle;
    if (h && h.status === "paused") {
      h.resume();
      this.toolboxRefresh?.();
    }
  }

  /** Delete an archived scan from IndexedDB. Also unloads if currently displayed. */
  public async deleteArchive(scanId: string): Promise<void> {
    await this.hideManagedScan(scanId);
  }

  /** Permanently delete a managed scan and every component archive entry
   *  backing it. Unloads the scan first so disposed buffers don't linger
   *  in any scatter layer. Hidden-and-deleted siblings are caught too,
   *  since the row is keyed by the merged record's componentScanIds. */
  public async removeManagedScan(scanId: string): Promise<void> {
    const records = await this.listManagedScans();
    const record = records.find((candidate) => candidate.scanId === scanId);
    if (record === undefined) return;
    for (const componentId of record.componentScanIds) {
      if (this.loadedScans.has(componentId)) {
        await this.unloadArchive(componentId);
      }
      try {
        await this.archive.delete({ workspaceId: WORKSPACE_ID, scanId: componentId });
      } catch {
        // Best-effort per-entry; continue removing siblings even if one fails.
      }
    }
    if (record.localScanId !== undefined && !record.componentScanIds.includes(record.localScanId)) {
      try {
        await this.archive.delete({ workspaceId: WORKSPACE_ID, scanId: record.localScanId });
      } catch { /* best-effort */ }
    }
    if (!record.componentScanIds.includes(record.scanId)) {
      try {
        await this.archive.delete({ workspaceId: WORKSPACE_ID, scanId: record.scanId });
      } catch { /* best-effort */ }
    }
    this.archiveEpoch += 1;
    this.toolboxRefresh?.();
  }

  /**
   * Re-evaluate every recorded `(σ, T)` of an existing archived scan through
   * `fScaledComponentsBatch` and write the result as a brand-new archive entry
   * with full per-point columns: `yVal`, `sigma1Mag`, `r1Mag`, `phaseDev`,
   * `phaseR`, and `depth = |f| / (|Σ₁| + |R₁|)`.
   *
   * Useful for CSV-imported scans (which only carry `sigma, T, y_val[, depth]`)
   * — bringing them up to the current scanner's data shape without re-running
   * the bracket search across the entire (σ, T) rectangle. Each input point
   * costs one `fScaledComponentsBatch` row evaluation.
   *
   * The variant used for re-evaluation comes from the source archive's
   * `request.variant`. The new entry's label is `rebuilt · <orig label>`.
   */
  public async rebuildScanWithFullData(scanId: string): Promise<string> {
    const entry = await this.archive.get({ workspaceId: WORKSPACE_ID, scanId });
    if (entry === null) throw new Error(`scan ${scanId} not found`);
    const variant = entry.request.variant;
    const newLines: ArchivedLine[] = [];
    for (const line of entry.lines) {
      const n = line.t.length;
      if (n === 0) continue;
      const tArr = line.t instanceof Float64Array ? line.t : new Float64Array(line.t);
      const b = fScaledComponentsBatch(line.sigma, tArr, variant);
      const phaseR = new Float64Array(n);
      const depth = new Float64Array(n);
      for (let j = 0; j < n; j++) {
        const r1Re = b.r1[j * 2]!;
        const r1Im = b.r1[j * 2 + 1]!;
        phaseR[j] = Math.atan2(r1Im, r1Re) / Math.PI;
        const denom = b.sigma1Mag[j]! + b.r1Mag[j]!;
        depth[j] = denom > 0 ? b.yVal[j]! / denom : NaN;
      }
      newLines.push({
        sigma: line.sigma,
        t: tArr,
        yVal: new Float64Array(b.yVal),
        sigma1Mag: new Float64Array(b.sigma1Mag),
        r1Mag: new Float64Array(b.r1Mag),
        phaseDev: new Float64Array(b.phaseDev),
        phaseR,
        depth,
      });
    }
    // Update IN PLACE — keep the original scanId, label, createdAt, and
    // request unchanged so any background dropdown / displayName lookup that
    // matched the original keeps matching. The only thing changing is the
    // per-point columns now have full data (sigma1Mag, r1Mag, phaseDev,
    // phaseR, depth), so e.g. "Color by → Phase of R" lights up where it was
    // mid-gray before. Caller passes the same scanId back, which the
    // Storage-panel Rebuild button then re-loads.
    const totalPoints = newLines.reduce((acc, line) => acc + line.t.length, 0);
    await this.archive.put({
      workspaceId: WORKSPACE_ID,
      scanId: entry.scanId,
      createdAt: entry.createdAt,
      request: entry.request,
      summary: {
        linesScanned: newLines.length,
        pointsRecorded: totalPoints,
        durationMs: entry.summary.durationMs,
      },
      lines: newLines,
      ...(entry.provenance !== undefined ? { provenance: entry.provenance } : {}),
      ...(entry.label !== undefined ? { label: entry.label } : {}),
    });
    this.archiveEpoch += 1;
    this.toolboxRefresh?.();
    return entry.scanId;
  }

  /** Hide a managed scan row without deleting its archived buffers. */
  public async hideManagedScan(scanId: string): Promise<void> {
    const records = await this.listManagedScans();
    const record = records.find((candidate) => candidate.scanId === scanId);
    if (record === undefined) return;
    for (const componentId of record.componentScanIds) {
      if (this.loadedScans.has(componentId)) {
        await this.unloadArchive(componentId);
      }
    }
    const now = Date.now();
    if (record.localScanId !== undefined) {
      await this.archive.updateMetadata({ workspaceId: WORKSPACE_ID, scanId: record.localScanId }, { hiddenAt: now });
    } else {
      await this.archive.putMetadata({
        workspaceId: WORKSPACE_ID,
        scanId: record.scanId,
        createdAt: record.createdAt,
        request: record.request,
        summary: record.summary,
        approxBytes: record.approxBytes,
        displayName: record.displayName,
        hiddenAt: now,
        remoteScanId: record.remoteScanId,
      });
    }
    this.archiveEpoch += 1;
    this.toolboxRefresh?.();
  }

  /** Rename a scan-management row. Blank names fall back to generated labels. */
  public async renameManagedScan(scanId: string, displayName: string): Promise<void> {
    const records = await this.listManagedScans();
    const record = records.find((candidate) => candidate.scanId === scanId);
    if (record === undefined) return;
    const targetId = record.localScanId ?? record.scanId;
    if (record.localScanId === undefined) {
      await this.archive.putMetadata({
        workspaceId: WORKSPACE_ID,
        scanId: targetId,
        createdAt: record.createdAt,
        request: record.request,
        summary: record.summary,
        approxBytes: record.approxBytes,
        displayName,
        remoteScanId: record.remoteScanId,
      });
    } else {
      await this.archive.updateMetadata({ workspaceId: WORKSPACE_ID, scanId: targetId }, { displayName });
    }
    this.archiveEpoch += 1;
    this.toolboxRefresh?.();
  }

  /** Load all local component scans represented by a managed row. */
  public async loadManagedScan(scanId: string): Promise<void> {
    const record = (await this.listManagedScans()).find((candidate) => candidate.scanId === scanId);
    if (record === undefined) return;
    for (const componentId of record.componentScanIds) {
      await this.loadArchive(componentId);
    }
    // Auto-fit camera to the just-loaded points so the user sees them
    // immediately without hunting. Strip mode keeps σ pinned (only T fits).
    this.zoomToFitLoaded();
  }

  /** Unload all local component scans represented by a managed row. */
  public async unloadManagedScan(scanId: string): Promise<void> {
    const record = (await this.listManagedScans()).find((candidate) => candidate.scanId === scanId);
    if (record === undefined) return;
    for (const componentId of record.componentScanIds) {
      await this.unloadArchive(componentId);
    }
  }

  /** Export every local component represented by a managed row. */
  public async exportManagedScan(scanId: string): Promise<void> {
    const record = (await this.listManagedScans()).find((candidate) => candidate.scanId === scanId);
    if (record === undefined || record.isRemoteOnly) return;
    for (const componentId of record.componentScanIds) {
      await this.exportArchiveCsv(componentId);
    }
  }

  /** Create a metadata-only combined scan row from compatible managed rows. */
  public async combineManagedScans(scanIds: string[]): Promise<void> {
    const records = (await this.listManagedScans()).filter((record) => scanIds.includes(record.scanId));
    const compatibility = compatibleForCombine(records);
    if (!compatibility.compatible) {
      throw new Error(compatibility.reason ?? "Selected scans are not compatible");
    }
    const first = records[0]!;
    const componentScanIds = [...new Set(records.flatMap((record) => record.componentScanIds))];
    const request: ScanRequest = {
      ...first.request,
      sigmaRange: {
        ...first.request.sigmaRange,
        min: Math.min(...records.map((record) => record.request.sigmaRange.min)),
        max: Math.max(...records.map((record) => record.request.sigmaRange.max)),
      },
      tRange: {
        min: Math.min(...records.map((record) => record.request.tRange.min)),
        max: Math.max(...records.map((record) => record.request.tRange.max)),
      },
    };
    const createdAt = Date.now();
    await this.archive.putCombined({
      workspaceId: WORKSPACE_ID,
      scanId: `combined@${String(createdAt)}`,
      createdAt,
      request,
      summary: {
        durationMs: records.reduce((total, record) => total + record.summary.durationMs, 0),
        linesScanned: records.reduce((total, record) => total + record.summary.linesScanned, 0),
        pointsRecorded: records.reduce((total, record) => total + record.summary.pointsRecorded, 0),
      },
      approxBytes: records.reduce((total, record) => total + record.approxBytes, 0),
      componentScanIds,
      displayName: `Combined ${String(records.length)} scans`,
      label: scanLabel(request),
    });
    this.archiveEpoch += 1;
    this.toolboxRefresh?.();
  }

  /** Lazily generate or fetch a cached thumbnail for a managed row. */
  public async getManagedScanThumbnail(scanId: string, width = 480, height = 360): Promise<ArchiveThumbnail | null> {
    const record = (await this.listManagedScans()).find((candidate) => candidate.scanId === scanId);
    if (record === undefined || record.isRemoteOnly) return null;
    const targetId = record.localScanId ?? record.scanId;
    if (record.thumbnail !== undefined && record.thumbnail.fingerprint === record.thumbnailFingerprint) {
      return record.thumbnail;
    }
    const entries = await Promise.all(record.componentScanIds.map((componentId) =>
      this.archive.get({ workspaceId: WORKSPACE_ID, scanId: componentId }),
    ));
    const lines = entries.flatMap((entry) => entry?.lines ?? []);
    const thumbnail = renderScanThumbnail({
      display: this.state.display,
      fingerprint: record.thumbnailFingerprint,
      height,
      lines,
      width,
    });
    if (thumbnail !== null) {
      await this.archive.updateMetadata(
        { workspaceId: WORKSPACE_ID, scanId: targetId },
        { thumbnail, thumbnailFingerprint: record.thumbnailFingerprint },
      );
      this.archiveEpoch += 1;
    }
    return thumbnail;
  }

  /** Delete an archived scan from IndexedDB. Also unloads if currently displayed. */
  public async hardDeleteArchive(scanId: string): Promise<void> {
    if (this.loadedScans.has(scanId)) {
      await this.unloadArchive(scanId);
    }
    await this.archive.delete({ workspaceId: WORKSPACE_ID, scanId });
    this.archiveEpoch += 1;
    this.toolboxRefresh?.();
  }

  /** Currently-in-background scan ids (for UI indication). */
  public getBackgroundScanIds(): Set<string> {
    return new Set(this.backgroundScanIds);
  }

  /** Whether any background layer is currently rendered. */
  public hasBackgroundScatter(): boolean {
    return this.backgroundScatter !== null;
  }

  /**
   * Apply opacity + point-size to a background layer. The size multiplier
   * lets the user pick "100% 1x" vs "100% 1.5x" in the Background panel
   * dropdown — useful when the background is being used as a primary
   * comparison and they want the points more visible.
   *
   * Live scatter base size is 2 px; multiplier scales that.
   */
  private applyBackgroundStyle(layer: ScanScatterLayer): void {
    const d = this.state.display;
    layer.setBaseOpacity(d.backgroundOpacity);
    layer.setPointSize(2 * Math.max(0.1, d.backgroundSizeMult));
  }

  /** Drop the dimmed "previous scan" background layer. */
  public clearBackgroundScatter(): void {
    if (this.backgroundScatter !== null) {
      this.backgroundScatter.dispose();
      this.backgroundScatter = null;
    }
    this.backgroundScanIds.clear();
    this.toolboxRefresh?.();
  }

  /** Persist the filename to load as background on next startup. */
  public setShowCriticalStripGuides(show: boolean): void {
    if (this.state.display.showCriticalStripGuides === show) return;
    this.state.display = { ...this.state.display, showCriticalStripGuides: show };
    this.criticalStripGuides.setVisible(show);
    this.persistUiPrefs();
    this.toolboxRefresh?.();
  }

  public async setBgOverlay(id: BgOverlayId, show: boolean): Promise<void> {
    const flagKey = bgOverlayFlagKey(id);
    if (this.state.display[flagKey] === show) return;
    this.state.display = { ...this.state.display, [flagKey]: show };
    this.persistUiPrefs();
    if (show) {
      await this.loadBgOverlay(id);
    } else {
      this.disposeBgOverlay(id);
    }
    this.toolboxRefresh?.();
  }

  /** Load (or re-show) a canned background overlay scan. Hydrates from public
   *  imports when not already in IndexedDB; matches by displayName or label. */
  private async loadBgOverlay(id: BgOverlayId): Promise<void> {
    const wanted = ZerosOfFModel.BG_OVERLAY_NAMES[id];
    // If layer already exists, just show it.
    const existing = this.bgOverlayLayers.get(id);
    if (existing !== undefined) {
      existing.setVisible(true);
      return;
    }
    try {
      await hydrateImportedScanByLabel(this.archive, WORKSPACE_ID, wanted);
    } catch {
      // best-effort hydrate
    }
    let target: ArchiveListing | undefined;
    try {
      const list = await this.archive.list(WORKSPACE_ID);
      target = list.find((e) => (e.displayName ?? "") === wanted)
        ?? list.find((e) => (e.label ?? "") === wanted);
    } catch {
      // empty archive or read failure — leave target undefined
    }
    if (target === undefined) {
      // eslint-disable-next-line no-console
      console.warn(`[bg-overlay] no scan named "${wanted}" found in archive`);
      return;
    }
    // Dedicated display: phase-R color at full brightness. magThresh is
    // pushed huge so every recorded point renders bright (the regular
    // magnitude-threshold dim doesn't apply to canned displays).
    const overlayDisplay: DisplayControlsState = {
      ...this.state.display,
      colorMode: "phase-r",
      magThresh: Number.MAX_VALUE,
      magThreshMax: Number.MAX_VALUE,
      fracTRangeMin: 0,
      fracTRangeMax: 1,
      fracTFilterKind: "range",
      fracTQuarterEnabled: false,
    };
    const pointSize = ZerosOfFModel.BG_OVERLAY_POINT_SIZE[id];
    const layer = new ScanScatterLayer(this.contentGroup, overlayDisplay, { pointSize });
    layer.setVisible(this.state.display.backgroundOpacity > 0);
    this.applyBackgroundStyle(layer);
    this.bgOverlayLayers.set(id, layer);
    const entry = await this.archive.get({ workspaceId: WORKSPACE_ID, scanId: target.scanId });
    if (entry === null) return;
    layer.setRForm(fVariantParts(entry.request.variant).rForm);
    layer.setFamily(fVariantParts(entry.request.variant).family);
    await this.appendArchiveLinesToLayer(entry.lines, layer);
  }

  private disposeBgOverlay(id: BgOverlayId): void {
    const layer = this.bgOverlayLayers.get(id);
    if (layer === undefined) return;
    layer.dispose();
    this.bgOverlayLayers.delete(id);
  }

  /** Returns the set of scan-manager displayNames currently wired to a
   *  background-overlay toggle, plus the legacy backgroundDefaultName. The
   *  scan-manager UI uses this to mark utilized rows. */
  public getBackgroundUtilizedNames(): Set<string> {
    return new Set([
      this.state.display.backgroundDefaultName,
      ZerosOfFModel.BG_OVERLAY_NAMES.ratio,
      ZerosOfFModel.BG_OVERLAY_NAMES.foldBack,
      ZerosOfFModel.BG_OVERLAY_NAMES.foldOut,
    ]);
  }

  /** Resolve `pointsRecorded` for each Background-panel feature so the panel
   *  can show "this many points will appear if you turn this on". Returns
   *  `null` for features that haven't been hydrated/found in the archive yet,
   *  and `0` for features that don't render points (critical-strip guides). */
  public async getBackgroundFeaturePointCounts(): Promise<{
    criticalStripGuides: number;
    zetaZeros: number;
    legRatio: number | null;
    legFoldBack: number | null;
    legFoldOut: number | null;
    sum1R1ak: number | null;
    sum1R1akV1: number | null;
    legRakFolded: number | null;
    legRpsFolded: number | null;
    sum1R1ps: number | null;
    variantBackground: number | null;
  }> {
    let listing: ArchiveListing[] = [];
    try {
      listing = await this.archive.list(WORKSPACE_ID);
    } catch {
      // best-effort
    }
    const lookupByName = (name: string): number | null => {
      if (name.length === 0) return null;
      const target = listing.find((e) => (e.displayName ?? "") === name)
        ?? listing.find((e) => (e.label ?? "") === name);
      return target === undefined ? null : target.summary.pointsRecorded;
    };
    return {
      criticalStripGuides: 0,
      zetaZeros: 10000,
      legRatio: lookupByName(ZerosOfFModel.BG_OVERLAY_NAMES.ratio),
      legFoldBack: lookupByName(ZerosOfFModel.BG_OVERLAY_NAMES.foldBack),
      legFoldOut: lookupByName(ZerosOfFModel.BG_OVERLAY_NAMES.foldOut),
      sum1R1ak: lookupByName(ZerosOfFModel.BG_OVERLAY_NAMES.sum1R1ak),
      sum1R1akV1: lookupByName(ZerosOfFModel.BG_OVERLAY_NAMES.sum1R1akV1),
      legRakFolded: lookupByName(ZerosOfFModel.BG_OVERLAY_NAMES.legRakFolded),
      legRpsFolded: lookupByName(ZerosOfFModel.BG_OVERLAY_NAMES.legRpsFolded),
      sum1R1ps: lookupByName(ZerosOfFModel.BG_OVERLAY_NAMES.sum1R1ps),
      variantBackground: lookupByName(this.state.display.backgroundDefaultName),
    };
  }

  /** "Strip" canvas button — enter Strip mode: σ axis locked to [-2.5, 3],
   *  wheel/drag only affect T, scrollbar appears on the left. T axis bounds
   *  are preserved from {@link currentViewport}. */
  public isStripMode(): boolean { return this.state.display.stripMode; }

  /** Names (or scan ids) of scans currently being displayed in the canvas:
   *  every loaded archive scan, plus the current background scan if it's
   *  visible. Surfaced to the canvas overlay so the user can see what they're
   *  looking at without opening the Manage-scans dialog. */
  public getDisplayedScanNames(): string[] {
    const names: string[] = [];
    for (const scanId of this.loadedScans.keys()) {
      names.push(this.loadedScanNames.get(scanId) ?? scanId);
    }
    if (
      this.backgroundScatter !== null
      && this.state.display.backgroundOpacity > 0
      && this.state.display.backgroundDefaultName.trim() !== ""
    ) {
      names.push(`bg: ${this.state.display.backgroundDefaultName}`);
    }
    return names;
  }
  public isPlaneMode(): boolean { return this.state.display.planeMode; }
  public isCirclesMode(): boolean { return this.state.display.circlesMode; }

  /** Active frame-listener unsubscribe for Circles mode. Held so Strip/Plane
   *  can detach the listener cleanly when switching out of Circles. */
  private circlesUnsub: (() => void) | null = null;

  /** Compute the zoomY that makes pixel_per_T = pixel_per_σ · I'(T_center).
   *  Returns NaN when T_center isn't valid (e.g. camera above zero). */
  private circlesTargetZoomY(): number {
    const fit = this.fitGroup.getTransform();
    const safeSy = fit.scaleY !== 0 ? fit.scaleY : 1;
    const T_center = (this.controller.getPanY() - fit.offsetY) / safeSy;
    if (!Number.isFinite(T_center) || T_center <= 1e-3) return NaN;
    const ip = iPrimeOfT(Math.max(1e-3, T_center));
    return this.controller.getZoomX() * (fit.scaleX / safeSy) * ip;
  }

  /** Engage the aspect lock + a per-frame catch-up loop for pan-driven
   *  T_center changes. The wheel-handler hook owns the cursor-anchored
   *  override on zoom; the frame loop just handles pan-only updates. */
  private attachCirclesLoop(): void {
    if (this.circlesUnsub !== null) return;
    // Wheel-side anchor: controller re-anchors on the cursor after applying
    // our zoomY override, so wheel-zoom in Circles mode no longer scrolls.
    this.controller.setAspectLockTargetZoomY(() => this.circlesTargetZoomY());
    // Pan-side catch-up: when user drags vertically, T_center changes and
    // zoomY must follow. The frame loop catches this; only updates if the
    // delta is large enough to avoid sub-percent jitter.
    this.circlesUnsub = this.controller.addFrameListener(() => {
      const target = this.circlesTargetZoomY();
      if (!Number.isFinite(target)) return;
      const cur = this.controller.getZoomY();
      if (Math.abs(target - cur) / Math.max(1e-9, cur) > 0.001) {
        this.controller.setZoomY(target);
      }
    });
  }

  private detachCirclesLoop(): void {
    this.controller.setAspectLockTargetZoomY(null);
    if (this.circlesUnsub !== null) {
      this.circlesUnsub();
      this.circlesUnsub = null;
    }
  }

  /** "Circles" canvas button — enter Circles mode WITHOUT re-fitting the
   *  data window or resetting pan/zoom. Preserves whatever viewport the user
   *  was in so every currently-loaded scan stays visible (any scan whose σ
   *  range falls outside [-2, 2] would disappear under an explicit re-fit).
   *  Every frame, zoomY is locked to zoomX · (fit.scaleX/fit.scaleY) · I'(T_center)
   *  so leg-ratio ovals render as circles regardless of zoom. */
  public scaleViewportToCircles(): void {
    this.controller.setAxisLock(null);
    // Generous zoom envelope; same as Plane so ALL loaded scans remain
    // reachable by panning/zooming.
    this.controller.setZoomOutFloor(0.01);
    this.controller.setZoomInCeiling(20000, 20000);
    this.state.display = {
      ...this.state.display,
      stripMode: false,
      planeMode: false,
      circlesMode: true,
    };
    this.attachCirclesLoop();
    this.persistUiPrefs();
    this.toolboxRefresh?.();
  }

  /** Current data-T bounds used by the Strip-mode scrollbar to map scroll
   *  position to data T. */
  public getCurrentTBounds(): { tMin: number; tMax: number } {
    return { tMin: this.currentViewport.tMin, tMax: this.currentViewport.tMax };
  }

  /** "Zoom to" canvas button — pan/zoom so all currently displayed scatter
   *  points (live + every loaded archive) fit inside the viewport with a
   *  small margin. No-op when nothing is loaded. Respects Strip mode by
   *  leaving the σ axis pinned. */
  public zoomToFitLoaded(): void {
    let sigmaMin = Infinity;
    let sigmaMax = -Infinity;
    let tMin = Infinity;
    let tMax = -Infinity;
    let total = 0;
    const consume = (e: { sigmaMin: number; sigmaMax: number; tMin: number; tMax: number; count: number }): void => {
      if (e.count <= 0) return;
      total += e.count;
      if (e.sigmaMin < sigmaMin) sigmaMin = e.sigmaMin;
      if (e.sigmaMax > sigmaMax) sigmaMax = e.sigmaMax;
      if (e.tMin < tMin) tMin = e.tMin;
      if (e.tMax > tMax) tMax = e.tMax;
    };
    consume(this.scatter.getDataExtent());
    for (const layer of this.loadedScanLayers.values()) consume(layer.getDataExtent());
    if (total === 0 || !Number.isFinite(sigmaMin) || !Number.isFinite(tMin)) return;
    // Map the data bbox to local space via the current fit transform.
    const fit = this.fitGroup.getTransform();
    const lxMin = sigmaMin * fit.scaleX + fit.offsetX;
    const lxMax = sigmaMax * fit.scaleX + fit.offsetX;
    const lyMin = tMin * fit.scaleY + fit.offsetY;
    const lyMax = tMax * fit.scaleY + fit.offsetY;
    this.controller.zoomToLocalBox(lxMin, lxMax, lyMin, lyMax);
    // Sync persisted view so a reload reproduces this framing.
    this.state.view = {
      panX: 0.5 * (lxMin + lxMax),
      panY: 0.5 * (lyMin + lyMax),
      zoom: 1,
    };
    this.persistUiPrefs();
  }

  public scaleSigmaToCriticalStrip(): void {
    const mode = this.state.display.yAxisMode;
    this.applyExplicitViewport(-1, 2, 0, 20, mode);
    this.controller.resetView();
    this.controller.setAxisLock("x");
    // Strip mode: deep microscope (1× to 20000×) so high-precision zoom-in
    // on the critical strip works.
    this.controller.setZoomOutFloor(1);
    this.controller.setZoomInCeiling(20000, 20000);
    this.state.view = { panX: 0, panY: 0, zoom: 1 };
    this.state.display = { ...this.state.display, stripMode: true, planeMode: false, circlesMode: false };
    this.detachCirclesLoop();
    this.persistUiPrefs();
    this.toolboxRefresh?.();
  }

  /** "Zoom high square" canvas button — viewport shows σ ∈ [0, 1] × T ∈ [400, 401]
   *  exactly. Zoom-out floor is pinned at 1× (no zooming out further); ceiling
   *  is 1e6 so the user can dive deep into that square. */
  public scaleViewportToZoomHighSquare(): void {
    const mode = this.state.display.yAxisMode;
    this.detachCirclesLoop();
    this.controller.setAxisLock(null);
    this.applyExplicitViewport(0, 1, 400, 401, mode);
    this.controller.resetView();
    // Pinned at the square — only zoom IN from here.
    this.controller.setZoomOutFloor(1);
    this.controller.setZoomInCeiling(1e6, 1e6);
    this.state.view = { panX: 0, panY: 0, zoom: 1 };
    this.state.display = {
      ...this.state.display,
      stripMode: false,
      planeMode: false,
      circlesMode: false,
    };
    this.persistUiPrefs();
    this.toolboxRefresh?.();
  }

  /** "Plane" canvas button — exit Strip mode (releases X-axis lock) and
   *  re-fit to σ ∈ [-350, 10], T ∈ [-30, 3000]. Both pan/zoom axes reset.
   *  EXCEPTION: when coming from Circles mode, preserve the current pan/zoom
   *  so the user's framing isn't disturbed — just decouple the axes. */
  public scaleViewportToPlane(): void {
    const fromCircles = this.state.display.circlesMode;
    const mode = this.state.display.yAxisMode;
    this.controller.setAxisLock(null);
    this.controller.setZoomOutFloor(0.01);
    this.controller.setZoomInCeiling(20000, 20000);
    if (!fromCircles) {
      this.applyExplicitViewport(-350, 10, -30, 3000, mode);
      this.controller.resetView();
      this.state.view = { panX: 0, panY: 0, zoom: 1 };
    }
    // else: leave fitGroup transform, camera pan, and zoom exactly as Circles
    // left them. The axes are now free (no per-frame lock) so the user can
    // adjust σ and T independently from here.
    this.state.display = { ...this.state.display, stripMode: false, planeMode: true, circlesMode: false };
    this.detachCirclesLoop();
    this.persistUiPrefs();
    this.toolboxRefresh?.();
  }

  /** Common viewport-fit application path used by Strip, Plane, and
   *  {@link applyViewportFit}. Updates fitGroup, the curve layers that sample
   *  geometry within `[tMin, tMax]`, and the per-instance bookkeeping. */
  private applyExplicitViewport(
    sigmaMin: number,
    sigmaMax: number,
    tMin: number,
    tMax: number,
    mode: "T" | "fracT",
  ): void {
    const scaleZ = this.state.display.displayView === "fracT3d"
      ? fracT3dScaleZ(this.state.display.fracT3dDepth)
      : 1;
    this.fitGroup.configureFit(sigmaMin, sigmaMax, tMin, tMax, scaleZ);
    this.boundary.configureRange(sigmaMin, sigmaMax, tMin, tMax, mode);
    this.ariasBoundary.configureRange(sigmaMin, sigmaMax, tMin, tMax, mode);
    this.imagCubeRootBoundary.configureRange(sigmaMin, sigmaMax, tMin, tMax, mode);
    this.imagCubeRootSeriesBoundary.configureRange(sigmaMin, sigmaMax, tMin, tMax, mode);
    this.theorem5Boundary.configureRange(sigmaMin, sigmaMax, tMin, tMax, mode);
    this.paulsBoundary.configureRange(sigmaMin, sigmaMax, tMin, tMax, mode);
    this.scanFloor.configureRange(sigmaMin, sigmaMax, tMin, tMax, mode);
    this.negTZerosRidge.configureRange(sigmaMin, sigmaMax, tMin, tMax, mode);
    this.criticalStripGuides.configureRange(sigmaMin, sigmaMax, tMin, tMax, mode);
    this.integerTGrid.configureRange(sigmaMin, sigmaMax, tMin, tMax, mode);
    this.currentViewport = { sigmaMin, sigmaMax, tMin, tMax };
    this.syncFracTSliceBoundary(this.state.display);
    this.syncFracTClosedBoundary(this.state.display);
    this.syncFracTFourierBoundary(this.state.display);
    this.syncFracTSmoothApBoundary(this.state.display);
  }

  /**
   * When the Boundaries slice toggle is on, draw the envelope for the
   * exact-{T} thousandth (0.000..0.999) in that {T}'s spectrum color.
   * Slider changes must not reframe the viewport.
   */
  private syncFracTSliceBoundary(display: DisplayControlsState): void {
    const coeff = display.showFracTSliceBoundary
      ? fracTSliceBoundaryForJustOne(display.fracTJustOne)
      : null;
    if (coeff === null) {
      this.fracTSliceBoundary.setVisible(false);
      return;
    }
    this.fracTSliceBoundary.setTOfSigma((sigma) => fracTSliceBoundaryT(sigma, coeff));
    this.fracTSliceBoundary.setColor(
      quarterSpectrumHex(coeff.bin / 1000, display.spectrumFeather),
    );
    const { sigmaMin, sigmaMax, tMin, tMax } = this.currentViewport;
    this.fracTSliceBoundary.configureRange(sigmaMin, sigmaMax, tMin, tMax, display.yAxisMode);
    this.fracTSliceBoundary.setVisible(true);
  }

  /**
   * Closed-form envelope for the exact-{T} thousandth. Same color/slider
   * rules as the table curve; does not reframe.
   */
  private syncFracTClosedBoundary(display: DisplayControlsState): void {
    if (!display.showFracTClosedBoundary) {
      this.fracTClosedBoundary.setVisible(false);
      return;
    }
    const justOne = display.fracTJustOne;
    this.fracTClosedBoundary.setTOfSigma((sigma) => fracTClosedBoundaryT(sigma, justOne));
    this.fracTClosedBoundary.setColor(
      quarterSpectrumHex(fracTThousandthsBin(justOne) / 1000, display.spectrumFeather),
    );
    const { sigmaMin, sigmaMax, tMin, tMax } = this.currentViewport;
    this.fracTClosedBoundary.configureRange(sigmaMin, sigmaMax, tMin, tMax, display.yAxisMode);
    this.fracTClosedBoundary.setVisible(true);
  }

  /**
   * Pre-identity Fourier+spike envelope for the exact-{T} thousandth.
   * Independent of the closed-form toggle; does not reframe.
   */
  private syncFracTFourierBoundary(display: DisplayControlsState): void {
    if (!display.showFracTFourierBoundary) {
      this.fracTFourierBoundary.setVisible(false);
      return;
    }
    const justOne = display.fracTJustOne;
    this.fracTFourierBoundary.setTOfSigma((sigma) => fracTFourierBoundaryT(sigma, justOne));
    this.fracTFourierBoundary.setColor(
      quarterSpectrumHex(fracTThousandthsBin(justOne) / 1000, display.spectrumFeather),
    );
    const { sigmaMin, sigmaMax, tMin, tMax } = this.currentViewport;
    this.fracTFourierBoundary.configureRange(sigmaMin, sigmaMax, tMin, tMax, display.yAxisMode);
    this.fracTFourierBoundary.setVisible(true);
  }

  /**
   * Figure 2 mixed envelope (navy ã, gold p̃) for the exact-{T} slider.
   * Independent of the other {T} curves; does not reframe.
   */
  private syncFracTSmoothApBoundary(display: DisplayControlsState): void {
    if (!display.showFracTSmoothApBoundary) {
      this.fracTSmoothApBoundary.setVisible(false);
      return;
    }
    const justOne = display.fracTJustOne;
    this.fracTSmoothApBoundary.setTOfSigma((sigma) => fracTSmoothApBoundaryT(sigma, justOne));
    this.fracTSmoothApBoundary.setColor(
      quarterSpectrumHex(fracTThousandthsBin(justOne) / 1000, display.spectrumFeather),
    );
    const { sigmaMin, sigmaMax, tMin, tMax } = this.currentViewport;
    this.fracTSmoothApBoundary.configureRange(sigmaMin, sigmaMax, tMin, tMax, display.yAxisMode);
    this.fracTSmoothApBoundary.setVisible(true);
  }

  public setShowBoundary(show: boolean): void {
    if (this.state.display.showBoundary === show) return;
    this.state.display = { ...this.state.display, showBoundary: show };
    this.boundary.setVisible(show);
    this.persistUiPrefs();
    this.toolboxRefresh?.();
  }

  /** Toggle Arias's boundary curve (−σ = 2.2·T^(2/3)). */
  public setShowAriasBoundary(show: boolean): void {
    if (this.state.display.showAriasBoundary === show) return;
    this.state.display = { ...this.state.display, showAriasBoundary: show };
    this.ariasBoundary.setVisible(show);
    this.persistUiPrefs();
    this.toolboxRefresh?.();
  }

  public setShowScanFloor(show: boolean): void {
    if (this.state.display.showScanFloor === show) return;
    this.state.display = { ...this.state.display, showScanFloor: show };
    this.scanFloor.setVisible(show);
    this.persistUiPrefs();
    this.toolboxRefresh?.();
  }

  public setShowNegTZerosRidge(show: boolean): void {
    if (this.state.display.showNegTZerosRidge === show) return;
    this.state.display = { ...this.state.display, showNegTZerosRidge: show };
    this.negTZerosRidge.setVisible(show);
    this.persistUiPrefs();
    this.toolboxRefresh?.();
  }

  /** Whether the current f-family supports argument-principle zero counting.
   *  Only families with isolated complex zeros qualify (sum1R1, sum2R2). */
  public canCountZerosForCurrentVariant(): boolean {
    const fam = fVariantParts(this.state.scan.variant).family;
    return fam === "sum1R1" || fam === "sum2R2";
  }

  /** Toggle the zero-count-boxes overlay. Turning ON also kicks off the
   *  counting loop (and tries the cache first). Turning OFF cancels any
   *  in-flight loop and hides the boxes. */
  public setShowZeroCountBoxes(show: boolean): void {
    if (this.state.display.showZeroCountBoxes === show) return;
    this.state.display = { ...this.state.display, showZeroCountBoxes: show };
    this.zeroCountBoxes.setVisible(show);
    this.persistUiPrefs();
    if (show && this.canCountZerosForCurrentVariant()) {
      // Try cache; if miss, compute fresh.
      void (async () => {
        const restored = await this.restoreZeroCountsFromCache();
        if (!restored) await this.runZeroCount();
      })();
    } else if (!show) {
      this.zeroCountToken++;  // cancel
    }
    this.toolboxRefresh?.();
  }

  /** Build the box list for the current scan rectangle (integer-T boxes only,
   *  skipping fractional slivers at top and bottom). */
  private buildZeroCountBoxes(): { boxes: ZeroCountBox[]; sigmaMin: number; sigmaMax: number; tMin: number; tMax: number } {
    const s = this.state.scan;
    const sigmaMin = Math.min(s.sigmaMin, s.sigmaMax);
    const sigmaMax = Math.max(s.sigmaMin, s.sigmaMax);
    const tLo = Math.min(s.tMin, s.tMax);
    const tHi = Math.max(s.tMin, s.tMax);
    const startT = Math.ceil(tLo);
    const endT = Math.floor(tHi);  // last box is [endT-1, endT]
    const boxes: ZeroCountBox[] = [];
    let idx = 1;
    for (let t = startT; t < endT; t++) {
      boxes.push({ t, index: idx, count: undefined });
      idx++;
    }
    return { boxes, sigmaMin, sigmaMax, tMin: startT, tMax: endT };
  }

  /** Run the argument-principle counting across all sub-boxes. Updates the
   *  layer per-box as each finishes so the user sees progress. Saves to IDB
   *  when done. */
  public async runZeroCount(): Promise<void> {
    if (!this.canCountZerosForCurrentVariant()) return;
    const myToken = ++this.zeroCountToken;
    const { boxes, sigmaMin, sigmaMax, tMin, tMax } = this.buildZeroCountBoxes();
    this.zeroCountBoxes.setBoxes(boxes, sigmaMin, sigmaMax);
    if (boxes.length === 0) return;
    const variant = this.state.scan.variant;
    const EPS_T = 1e-5;
    const EPS_S = sigmaMin === 0.5 ? 1e-6 : 0;

    if (this.zeroCountPool !== null) this.zeroCountPool.dispose();
    this.zeroCountPool = new ZeroCountWorkerPool(Math.max(1, Math.min(8, navigator.hardwareConcurrency ?? 4)));
    const pool = this.zeroCountPool;
    this.zeroCountRunning = true;
    this.toolboxRefresh?.();

    // Per-box save: each box's completion updates the layer + writes IDB so
    // a refresh / crash mid-run never loses more than the in-flight boxes.
    const persist = async (): Promise<void> => {
      try {
        await saveZeroCounts({
          savedAt: Date.now(),
          variant, sigmaMin, sigmaMax, tMin, tMax,
          boxes: this.zeroCountBoxes.getBoxes(),
        });
      } catch { /* best-effort */ }
    };

    const jobs = boxes.map((b) => {
      const startedAt = performance.now();
      return pool.submit({
        sigmaMin: sigmaMin + EPS_S,
        sigmaMax,
        tMin: b.t + EPS_T,
        tMax: b.t + 1 - EPS_T,
        variant,
      }).then(async (r) => {
        if (myToken !== this.zeroCountToken) return;
        const elapsedMs = Math.round(performance.now() - startedAt);
        this.zeroCountBoxes.updateBoxCount(b.index, r.ok ? r.count : null, elapsedMs);
        this.toolboxRefresh?.();
        await persist();
      });
    });
    try {
      await Promise.all(jobs);
    } finally {
      if (myToken === this.zeroCountToken) {
        pool.dispose();
        this.zeroCountPool = null;
        this.zeroCountRunning = false;
        this.toolboxRefresh?.();
      }
    }
  }

  /** Whether a zero-count run is currently in progress. */
  public isZeroCountRunning(): boolean { return this.zeroCountRunning; }

  /** Build a CSV string from the current on-screen zero-count boxes. Single
   *  header row + one row per box (number, T-band, count, "?" if missing).
   *  Returns null when nothing's loaded. */
  public buildZeroCountCsv(): string | null {
    const boxes = this.zeroCountBoxes.getBoxes();
    if (boxes.length === 0) return null;
    const { sMin, sMax } = this.resolveZeroCountBoundsForExport();
    // Lambda 1769 MB tier, arm64 us-west-2 ($0.0000166667/GB-s + $0.20/M invocations).
    // Cost is meaningful only for the Lambda backend; we report it for all boxes
    // since the elapsed time is wall-clock either way and the formula is harmless.
    const GB_SEC_RATE = 0.0000166667;
    const INVOKE_RATE = 0.20 / 1_000_000;
    const MB = 1769;
    const costForMs = (ms: number): number => (ms / 1000) * (MB / 1024) * GB_SEC_RATE + INVOKE_RATE;
    const lines: string[] = [];
    lines.push(`# variant=${this.state.scan.variant} sigmaMin=${String(sMin)} sigmaMax=${String(sMax)} savedAt=${new Date().toISOString()}`);
    lines.push("box,T_lo,T_hi,count,elapsed_ms,cost_usd");
    for (const b of boxes) {
      const c = typeof b.count === "number" ? String(b.count) : "?";
      const ems = typeof b.elapsedMs === "number" ? String(b.elapsedMs) : "";
      const cost = typeof b.elapsedMs === "number" ? costForMs(b.elapsedMs).toFixed(6) : "";
      lines.push(`${String(b.index)},${String(b.t)},${String(b.t + 1)},${c},${ems},${cost}`);
    }
    return lines.join("\n") + "\n";
  }

  private resolveZeroCountBoundsForExport(): { sMin: number; sMax: number } {
    const r = this.zeroCountBoxes.getSigmaRange();
    return { sMin: r.min, sMax: r.max };
  }

  /** Stop any in-flight zero-count run. Already-completed boxes remain in
   *  the layer + IDB; pending boxes are abandoned. */
  public stopZeroCount(): void {
    this.zeroCountToken++;
    if (this.zeroCountPool !== null) {
      this.zeroCountPool.dispose();
      this.zeroCountPool = null;
    }
    this.zeroCountRunning = false;
    this.toolboxRefresh?.();
  }

  /** Public "Re-run" entry point — bypasses the cache and recomputes from
   *  scratch. Use after a code change that should invalidate previous answers. */
  public async forceRunZeroCount(): Promise<void> {
    if (!this.canCountZerosForCurrentVariant()) return;
    if (!this.state.display.showZeroCountBoxes) {
      this.state.display = { ...this.state.display, showZeroCountBoxes: true };
      this.zeroCountBoxes.setVisible(true);
    }
    await this.runZeroCount();
  }

  /** Look up cached counts for the current scan rectangle + variant. Returns
   *  true ONLY if the cache covers the exact box stack AND every box has a
   *  resolved (numeric, non-null) count. Stale partial results don't count —
   *  they would prevent the algorithm-improvement recomputes from running. */
  private async restoreZeroCountsFromCache(): Promise<boolean> {
    const { boxes, sigmaMin, sigmaMax, tMin, tMax } = this.buildZeroCountBoxes();
    const key = makeZeroCountKey(this.state.scan.variant, sigmaMin, sigmaMax, tMin, tMax);
    try {
      const saved = await loadZeroCounts(key);
      if (saved === null) {
        this.zeroCountBoxes.setBoxes(boxes, sigmaMin, sigmaMax);
        return false;
      }
      const fullyResolved = saved.boxes.length === boxes.length
        && saved.boxes.every((b) => typeof b.count === "number");
      if (!fullyResolved) {
        // Treat as cache-miss so the new algorithm gets to retry the failures.
        return false;
      }
      this.zeroCountBoxes.setBoxes(saved.boxes, sigmaMin, sigmaMax);
      this.toolboxRefresh?.();
      return true;
    } catch {
      this.zeroCountBoxes.setBoxes(boxes, sigmaMin, sigmaMax);
      return false;
    }
  }

  /** Snapshot for the React overlay that draws count labels. Returns the
   *  current boxes + σ range; overlay component computes screen positions
   *  via the camera projection. */
  public getZeroCountBoxesSnapshot(): { boxes: ZeroCountBox[]; sigmaMin: number; sigmaMax: number; visible: boolean; maxCount: number } {
    return {
      boxes: this.zeroCountBoxes.getBoxes(),
      sigmaMin: this.zeroCountBoxes.getSigmaRange().min,
      sigmaMax: this.zeroCountBoxes.getSigmaRange().max,
      maxCount: this.zeroCountBoxes.getMaxCount(),
      visible: this.zeroCountBoxes.isVisible(),
    };
  }

  public setShowPhaseHeatmap(show: boolean): void {
    if (this.state.display.showPhaseHeatmap === show) return;
    this.state.display = { ...this.state.display, showPhaseHeatmap: show };
    this.phaseHeatmap.setVisible(show);
    // Auto-restore from IndexedDB if a saved heatmap exists; otherwise build
    // fresh. Either way the user sees content without pressing Refresh.
    if (show && !this.phaseHeatmap.hasContent()) {
      void loadHeatmapFromIdb().then((saved) => {
        if (saved !== null) {
          this.phaseHeatmap.restore(saved);
          this.toolboxRefresh?.();
        } else {
          this.rebuildPhaseHeatmap();
        }
      }).catch(() => this.rebuildPhaseHeatmap());
    }
    this.persistUiPrefs();
    this.toolboxRefresh?.();
  }

  public setHeatmapFamily(family: "legAngle" | "legAngleOut" | "legRatio" | "sum1R1Angle"): void {
    if (this.state.display.heatmapFamily === family) return;
    this.state.display = { ...this.state.display, heatmapFamily: family };
    this.persistUiPrefs();
    this.toolboxRefresh?.();
  }

  public setHeatmapRForm(rForm: "ak" | "ps"): void {
    if (this.state.display.heatmapRForm === rForm) return;
    this.state.display = { ...this.state.display, heatmapRForm: rForm };
    this.persistUiPrefs();
    this.toolboxRefresh?.();
  }

  public setHeatmapDensitySigma(density: number): void {
    const clamped = Math.max(1, Math.min(16384, Math.floor(density)));
    if (this.state.display.heatmapDensitySigma === clamped) return;
    this.state.display = { ...this.state.display, heatmapDensitySigma: clamped };
    this.persistUiPrefs();
    this.toolboxRefresh?.();
  }

  public setHeatmapDensityT(density: number): void {
    const clamped = Math.max(1, Math.min(16384, Math.floor(density)));
    if (this.state.display.heatmapDensityT === clamped) return;
    this.state.display = { ...this.state.display, heatmapDensityT: clamped };
    this.persistUiPrefs();
    this.toolboxRefresh?.();
  }

  /** Persist the current heatmap tiles + parameters to IndexedDB. Survives
   *  page reloads. Single-slot: each save overwrites the previous. */
  public async saveCurrentHeatmap(): Promise<boolean> {
    const snapshot = this.phaseHeatmap.serialize();
    if (snapshot === null) return false;
    try {
      await saveHeatmapToIdb(snapshot);
      this.toolboxRefresh?.();
      return true;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[heatmap] save failed:", e);
      return false;
    }
  }

  /** Restore the saved heatmap from IndexedDB. Returns true if a saved entry
   *  was found and applied. */
  public async loadSavedHeatmap(): Promise<boolean> {
    try {
      const saved = await loadHeatmapFromIdb();
      if (saved === null) return false;
      this.phaseHeatmap.restore(saved);
      // Sync the display state to match the restored heatmap so the panel
      // doesn't lie about what's on screen.
      const family: "legAngle" | "legAngleOut" | "legRatio" | "sum1R1Angle" =
        saved.family === "legAngleOut" ? "legAngleOut"
          : saved.family === "legRatio" ? "legRatio"
          : saved.family === "sum1R1Angle" ? "sum1R1Angle" : "legAngle";
      const rForm = saved.rForm === "ps" ? "ps" : "ak";
      this.state.display = {
        ...this.state.display,
        heatmapFamily: family,
        heatmapRForm: rForm,
        showPhaseHeatmap: true,
      };
      this.phaseHeatmap.setVisible(true);
      this.persistUiPrefs();
      this.toolboxRefresh?.();
      return true;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[heatmap] load failed:", e);
      return false;
    }
  }

  /** Forget the saved heatmap. The on-screen heatmap stays — only the
   *  IndexedDB copy is dropped. */
  public async clearSavedHeatmap(): Promise<void> {
    try {
      await clearHeatmapInIdb();
      this.toolboxRefresh?.();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[heatmap] clear failed:", e);
    }
  }

  public setHeatmapTilesT(tiles: number): void {
    const clamped = Math.max(1, Math.min(200, Math.floor(tiles)));
    if (this.state.display.heatmapTilesT === clamped) return;
    this.state.display = { ...this.state.display, heatmapTilesT: clamped };
    this.persistUiPrefs();
    this.toolboxRefresh?.();
  }

/** Heatmap bounds = the current scan's σ/T rectangle. One source of truth
   *  for both the white outline and the rebuild. Reads from scan state so
   *  changing the scan range automatically retargets the heatmap. */
  private resolveHeatmapBounds(): { sMin: number; sMax: number; tMn: number; tMx: number } {
    const s = this.state.scan;
    return {
      sMin: Math.min(s.sigmaMin, s.sigmaMax),
      sMax: Math.max(s.sigmaMin, s.sigmaMax),
      tMn: Math.min(s.tMin, s.tMax),
      tMx: Math.max(s.tMin, s.tMax),
    };
  }

  /** Public read-only accessor for the heatmap's current bounds — used by the
   *  Heatmap panel to display them so the user can confirm. */
  public getHeatmapBounds(): { sigmaMin: number; sigmaMax: number; tMin: number; tMax: number } {
    const { sMin, sMax, tMn, tMx } = this.resolveHeatmapBounds();
    return { sigmaMin: sMin, sigmaMax: sMax, tMin: tMn, tMax: tMx };
  }

  private applyHeatmapBoundsOutline(): void {
    const { sMin, sMax, tMn, tMx } = this.resolveHeatmapBounds();
    this.phaseHeatmap.setBounds(sMin, sMax, tMn, tMx);
  }

  public setHeatmapBrightness(b: number): void {
    const clamped = Math.max(0, Math.min(1, b));
    if (this.state.display.heatmapBrightness === clamped) return;
    this.state.display = { ...this.state.display, heatmapBrightness: clamped };
    this.phaseHeatmap.setBrightness(clamped);
    this.persistUiPrefs();
    this.toolboxRefresh?.();
  }

  /** Current heatmap rebuild progress in [0, 1]. 1 when idle/done. */
  public getHeatmapProgress(): number { return this.phaseHeatmap.getProgress(); }
  public isHeatmapBuilding(): boolean { return this.phaseHeatmap.isBuilding(); }

  /** Recompute the heatmap texture. **Currently HARD-CODED** to σ ∈ [-5, 1],
   *  T ∈ [1, 5] for diagnostic testing — the camera-bounds path was returning
   *  unusable values. Once we confirm the rendering itself works, swap back
   *  to the camera-derived bounds in the commented block below. */
  public rebuildPhaseHeatmap(): void {
    const d = this.state.display;
    const { sMin, sMax, tMn, tMx } = this.resolveHeatmapBounds();
    // ----------------------------------
    // (camera-derived bounds, kept for reference)
    // const fit = this.fitGroup.getTransform();
    // const cam = this.controller.getCameraBounds();
    // const safeSx = fit.scaleX !== 0 ? fit.scaleX : 1;
    // const safeSy = fit.scaleY !== 0 ? fit.scaleY : 1;
    // const sigmaMin = (cam.left - fit.offsetX) / safeSx;
    // const sigmaMax = (cam.right - fit.offsetX) / safeSx;
    // const tMin = (cam.bottom - fit.offsetY) / safeSy;
    // const tMax = (cam.top - fit.offsetY) / safeSy;
    // const sMin = Math.min(sigmaMin, sigmaMax);
    // const sMax = Math.max(sigmaMin, sigmaMax);
    // const tMn  = Math.min(tMin, tMax);
    // const tMx  = Math.max(tMin, tMax);
    const tilesT = Math.max(1, Math.floor(d.heatmapTilesT));
    const wPx = Math.max(16, Math.round((sMax - sMin) * d.heatmapDensitySigma));
    const hPx = Math.max(16, Math.round((tMx - tMn) * d.heatmapDensityT));
    // eslint-disable-next-line no-console
    console.log("[heatmap rebuild]", {
      family: d.heatmapFamily, rForm: d.heatmapRForm,
      densitySigma: d.heatmapDensitySigma, densityT: d.heatmapDensityT,
      tilesT,
      sigmaRange: [sMin, sMax], tRange: [tMn, tMx],
      totalTexture: [wPx, hPx], perTile: [wPx, Math.floor(hPx / tilesT)],
    });
    void this.phaseHeatmap.rebuild({
      family: d.heatmapFamily,
      rForm: d.heatmapRForm,
      wPx, hPx, tilesT,
      sigmaMin: sMin,
      sigmaMax: sMax,
      tMin: tMn,
      tMax: tMx,
    }).then(() => this.toolboxRefresh?.());
    this.toolboxRefresh?.();
  }

  public setShowIntegerTGrid(show: boolean): void {
    if (this.state.display.showIntegerTGrid === show) return;
    this.state.display = { ...this.state.display, showIntegerTGrid: show };
    this.integerTGrid.setVisible(show);
    this.persistUiPrefs();
    this.toolboxRefresh?.();
  }

  public setShowZetaZeros(show: boolean): void {
    if (this.state.display.showZetaZeros === show) return;
    this.state.display = { ...this.state.display, showZetaZeros: show };
    this.zetaZeros.setVisible(show);
    this.persistUiPrefs();
    this.toolboxRefresh?.();
  }

  /** Solo overlay: show ONLY Arias's positive-t f-zeros, hiding every other
   *  scene layer (contentGroup) regardless of their own toggles. Turning it
   *  off restores contentGroup — each child keeps whatever visibility it had. */
  public setShowAriasSolo(show: boolean): void {
    if (this.state.display.showAriasSolo === show) return;
    this.state.display = { ...this.state.display, showAriasSolo: show };
    this.contentGroup.visible = !show;
    this.ariasZeros.setYAxisMode(this.state.display.yAxisMode);
    this.ariasZeros.setVisible(show);
    this.persistUiPrefs();
    this.toolboxRefresh?.();
  }

  /** Force-retry hydration of the currently-selected variant file. Used by
   *  the click-to-retry on the red File row in the Background panel when the
   *  auto-hydration didn't end up with the file in IndexedDB (Chrome quota
   *  weirdness, browser update mid-session, etc.). Streams the bin to avoid
   *  blob-backing-store failures on over-quota origins. */
  public async forceRetryBackgroundHydrate(): Promise<{ ok: boolean; message: string }> {
    const wanted = this.state.display.backgroundDefaultName.trim();
    if (wanted === "") return { ok: false, message: "No variant selected." };

    interface ManifestEntry {
      scanId: string; filename: string; bin: string;
      createdAt: number; request: ScanRequest;
      summary: { linesScanned: number; pointsRecorded: number; durationMs: number };
    }
    interface Manifest { entries: ManifestEntry[] }

    let manifest: Manifest;
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}zeros-of-f-imports/manifest.json`);
      if (!res.ok) return { ok: false, message: `manifest.json HTTP ${String(res.status)} — /zeros-of-f-imports/ not being served.` };
      manifest = await res.json() as Manifest;
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      return { ok: false, message: `Cannot fetch manifest.json (${m}). Is the dev server running?` };
    }
    const entry = manifest.entries.find((c) => c.filename === wanted);
    if (entry === undefined) {
      return { ok: false, message: `"${wanted}" not found in manifest.json (${String(manifest.entries.length)} entries).` };
    }

    // Stream the bin so we don't hit blob backing-store failures or
    // single-allocation issues when the origin's storage is near quota.
    let buf: ArrayBuffer;
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}zeros-of-f-imports/${entry.bin}`);
      if (!res.ok) return { ok: false, message: `${entry.bin} HTTP ${String(res.status)}` };
      const reader = res.body?.getReader();
      if (reader === undefined) return { ok: false, message: `${entry.bin}: no response body stream` };
      const chunks: Uint8Array[] = [];
      let total = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        // eslint-disable-next-line no-await-in-loop
        const { done, value } = await reader.read();
        if (done) break;
        if (value !== undefined) { chunks.push(value); total += value.byteLength; }
      }
      const out = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) { out.set(c, off); off += c.byteLength; }
      buf = out.buffer;
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      return { ok: false, message: `Failed to stream ${entry.bin}: ${m}. Try restarting Chrome — sometimes the storage layer wedges and only a browser restart clears it.` };
    }

    try {
      const lines = await decodeBin(buf);
      await this.archive.put({
        workspaceId: WORKSPACE_ID,
        scanId: entry.scanId,
        createdAt: Date.now(),  // "now" so LRU eviction won't immediately drop it
        request: entry.request,
        summary: entry.summary,
        lines,
        label: entry.filename,
      });
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      return { ok: false, message: `Decode/put failed: ${m}` };
    }

    let list: Awaited<ReturnType<typeof this.archive.list>>;
    try { list = await this.archive.list(WORKSPACE_ID); }
    catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      return { ok: false, message: `archive.list failed: ${m}` };
    }
    const target = list.find((e) => (e.displayName ?? "") === wanted)
      ?? list.find((e) => (e.label ?? "") === wanted)
      ?? list.find((e) => e.scanId === entry.scanId);
    if (target === undefined) {
      return { ok: false, message: `Downloaded ${entry.bin} but it didn't land in IndexedDB. Likely a storage-quota or IDB write failure.` };
    }

    try {
      await this.loadArchiveAsBackground(target.scanId);
      this.toolboxRefresh?.();
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      return { ok: false, message: `Load failed: ${m}` };
    }
    return { ok: true, message: `Loaded ${wanted} as background.` };
  }

  public setBackgroundDefaultName(name: string): void {
    // Don't early-return when name matches the persisted value: the dropdown
    // can display "Rak" as a fallback when the persisted name is something
    // unrecognised, and the live scatter may also be bound to a file that
    // doesn't match the persisted name (e.g. loaded from a saved scanId at
    // startup). A user click on the dropdown is always intent — re-hydrate.
    if (this.state.display.backgroundDefaultName !== name) {
      this.state.display = { ...this.state.display, backgroundDefaultName: name };
      writeBackgroundPrefsCookie(this.state.display);
      this.persistUiPrefs();
    }
    void this.reloadBackgroundFromDefaultName();
    this.toolboxRefresh?.();
  }

  /** Drop the current background scatter and reload the archive entry whose
   *  label matches the current `backgroundDefaultName`. No-op when opacity is
   *  zero (the user has the background hidden) or when the name is empty. */
  private async reloadBackgroundFromDefaultName(): Promise<void> {
    const wanted = this.state.display.backgroundDefaultName.trim();
    if (this.backgroundScatter !== null) {
      this.backgroundScatter.dispose();
      this.backgroundScatter = null;
      this.backgroundScanIds.clear();
      this.toolboxRefresh?.();
    }
    if (wanted === "" || this.state.display.backgroundOpacity <= 0) return;
    try {
      // Make sure the wanted entry has actually been hydrated into IDB before
      // we look it up — at app start the full hydration runs in the
      // background, so a recently-pushed import bin may not be in IDB yet.
      await hydrateImportedScanByLabel(this.archive, WORKSPACE_ID, wanted);
      const list = await this.archive.list(WORKSPACE_ID);
      const target = list.find((e) => (e.displayName ?? "") === wanted)
        ?? list.find((e) => (e.label ?? "") === wanted);
      if (target) await this.loadArchiveAsBackground(target.scanId);
    } catch {
      // Non-fatal — UI still shows the persisted name; user can retry.
    }
    this.toolboxRefresh?.();
  }

  /**
   * Update background brightness AND size multiplier in one shot. Lets the
   * dropdown options like "100% 1x" and "100% 1.5x" set both at once.
   * `opacity = 0` is treated as "hide" — the layer's geometry is preserved
   * so selecting a non-zero value later restores the points.
   */
  public setBackgroundDisplay(opacity: number, sizeMult: number): void {
    if (!Number.isFinite(opacity) || !Number.isFinite(sizeMult)) return;
    const o = Math.max(0, Math.min(1, opacity));
    const s = Math.max(0.1, sizeMult);
    if (
      this.state.display.backgroundOpacity === o &&
      this.state.display.backgroundSizeMult === s
    ) return;
    this.state.display = {
      ...this.state.display,
      backgroundOpacity: o,
      backgroundSizeMult: s,
    };
    writeBackgroundPrefsCookie(this.state.display);
    this.persistUiPrefs();
    // Brightness/size also applies to the three "canned" bg-overlay layers
    // (|leg1|=|leg2|, leg-angle fold-back/out) so the dropdown affects every
    // background-class layer uniformly.
    for (const layer of this.bgOverlayLayers.values()) {
      this.applyBackgroundStyle(layer);
      layer.setVisible(o > 0);
    }
    if (this.backgroundScatter !== null) {
      if (o > 0) {
        this.backgroundScatter.setVisible(true);
        this.applyBackgroundStyle(this.backgroundScatter);
      } else {
        // Keep geometry around so re-selecting 10/50/100% can show it again.
        this.backgroundScatter.setVisible(false);
      }
    } else if (o > 0 && this.state.display.backgroundDefaultName.trim() !== "") {
      // No live layer to flip back on — happens when the user previously had
      // brightness at None (which disposes the layer) and is now bumping it
      // up, OR when they switched variant while hidden (the variant change
      // disposes too). Hydrate + load the configured background fresh.
      void this.reloadBackgroundFromDefaultName();
    }
    this.toolboxRefresh?.();
  }

  /** List archived scans for this workspace. */
  public listArchive(): Promise<ArchiveListing[]> {
    return this.archive.list(WORKSPACE_ID);
  }

  /** Show only the points that appear in exactly one of two archived scans
   * (symmetric difference). The result lands in a dedicated transient
   * layer that's replaced each time this is called and disposed by
   * {@link clearLiveScatter}. Tolerance: σ matches exactly (rounded to 9
   * decimals to absorb FP drift), T matches within 1e-6. */
  public async showScansDifference(scanIdA: string, scanIdB: string): Promise<void> {
    const [entryA, entryB] = await Promise.all([
      this.archive.get({ workspaceId: WORKSPACE_ID, scanId: scanIdA }),
      this.archive.get({ workspaceId: WORKSPACE_ID, scanId: scanIdB }),
    ]);
    if (entryA === null || entryB === null) return;
    const T_TOL = 1e-6;
    // Bucket entryB's points by sigma so per-point lookup is O(1) sigma →
    // O(log n) T (sorted) for cheap presence checks.
    const bSigmaToTs = new Map<number, number[]>();
    for (const ln of entryB.lines) {
      const tArr = ln.t;
      const existing = bSigmaToTs.get(ln.sigma);
      if (existing === undefined) bSigmaToTs.set(ln.sigma, Array.from(tArr));
      else for (let i = 0; i < tArr.length; i++) existing.push(tArr[i]!);
    }
    for (const ts of bSigmaToTs.values()) ts.sort((x, y) => x - y);
    const aSigmaToTs = new Map<number, number[]>();
    for (const ln of entryA.lines) {
      const tArr = ln.t;
      const existing = aSigmaToTs.get(ln.sigma);
      if (existing === undefined) aSigmaToTs.set(ln.sigma, Array.from(tArr));
      else for (let i = 0; i < tArr.length; i++) existing.push(tArr[i]!);
    }
    for (const ts of aSigmaToTs.values()) ts.sort((x, y) => x - y);
    const hasMatch = (haystack: number[] | undefined, needle: number): boolean => {
      if (haystack === undefined) return false;
      // Binary search for the first t ≥ needle - tol.
      let lo = 0;
      let hi = haystack.length;
      const target = needle - T_TOL;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (haystack[mid]! < target) lo = mid + 1;
        else hi = mid;
      }
      const cand = haystack[lo];
      return cand !== undefined && Math.abs(cand - needle) <= T_TOL;
    };

    // Compute the symmetric difference, grouped back into per-σ-row arrays
    // so we can hand them to the existing ScanScatterLayer.appendLine API.
    const diffBySigma = new Map<number, {
      t: number[]; yVal: number[]; sigma1Mag: number[]; r1Mag: number[]; phaseDev: number[];
      depth: number[]; haveDepth: boolean;
    }>();
    const pushPoint = (
      sigma: number, t: number, y: number, s1: number, r1: number, ph: number,
      d: number | undefined,
    ): void => {
      let row = diffBySigma.get(sigma);
      if (row === undefined) {
        row = { t: [], yVal: [], sigma1Mag: [], r1Mag: [], phaseDev: [], depth: [], haveDepth: d !== undefined };
        diffBySigma.set(sigma, row);
      }
      row.t.push(t);
      row.yVal.push(y);
      row.sigma1Mag.push(s1);
      row.r1Mag.push(r1);
      row.phaseDev.push(ph);
      if (d !== undefined) row.depth.push(d);
      else if (row.haveDepth) row.depth.push(NaN);
    };
    for (const ln of entryA.lines) {
      const bTs = bSigmaToTs.get(ln.sigma);
      for (let i = 0; i < ln.t.length; i++) {
        const t = ln.t[i]!;
        if (!hasMatch(bTs, t)) {
          pushPoint(
            ln.sigma, t, ln.yVal[i]!, ln.sigma1Mag[i]!, ln.r1Mag[i]!, ln.phaseDev[i]!,
            ln.depth?.[i],
          );
        }
      }
    }
    for (const ln of entryB.lines) {
      const aTs = aSigmaToTs.get(ln.sigma);
      for (let i = 0; i < ln.t.length; i++) {
        const t = ln.t[i]!;
        if (!hasMatch(aTs, t)) {
          pushPoint(
            ln.sigma, t, ln.yVal[i]!, ln.sigma1Mag[i]!, ln.r1Mag[i]!, ln.phaseDev[i]!,
            ln.depth?.[i],
          );
        }
      }
    }

    // Replace any prior diff layer.
    if (this.differenceLayer !== null) {
      this.differenceLayer.dispose();
      this.differenceLayer = null;
    }
    const layer = new ScanScatterLayer(this.contentGroup, this.state.display);
    layer.setVisible(true);
    for (const [sigma, row] of diffBySigma) {
      layer.appendLine({
        sigma,
        t: new Float64Array(row.t),
        yVal: new Float64Array(row.yVal),
        sigma1Mag: new Float64Array(row.sigma1Mag),
        r1Mag: new Float64Array(row.r1Mag),
        phaseDev: new Float64Array(row.phaseDev),
        ...(row.haveDepth ? { depth: new Float64Array(row.depth) } : {}),
      });
    }
    this.differenceLayer = layer;
    this.toolboxRefresh?.();
  }

  /** Trigger a browser download of the named scan as a CSV file. The CSV
   * matches the format produced by `exportZerosOfFCsv` (header + per-row).
   * Resolves once the download has been initiated. */
  public async exportArchiveCsv(scanId: string): Promise<void> {
    const entry = await this.archive.get({ workspaceId: WORKSPACE_ID, scanId });
    if (entry === null) return;
    // Concatenate the row-major buffers across σ-rows so the CSV has one
    // contiguous body. Pre-size to avoid Float64Array reallocation churn.
    let total = 0;
    for (const ln of entry.lines) total += ln.t.length;
    const sigma = new Float64Array(total);
    const t = new Float64Array(total);
    const yVal = new Float64Array(total);
    // Include the depth column whenever ANY row carries depth. Rows without
    // depth get NaN so we don't drop diagnostic data from the rest of the
    // scan just because a few early rows pre-date the field. (Previously the
    // export used `every`, which silently dropped depth for any partially-
    // depth-populated archive — e.g., a scan that resumed across a code
    // change.)
    const anyHasDepth = entry.lines.some((ln) => ln.depth !== undefined);
    const depth: Float64Array | null = anyHasDepth ? new Float64Array(total) : null;
    if (depth !== null) depth.fill(NaN);
    let off = 0;
    for (const ln of entry.lines) {
      const n = ln.t.length;
      sigma.fill(ln.sigma, off, off + n);
      t.set(ln.t, off);
      yVal.set(ln.yVal, off);
      if (depth !== null && ln.depth !== undefined) depth.set(ln.depth, off);
      off += n;
    }
    const meta: Record<string, string | number> = {
      scanId: entry.scanId,
      createdAt: new Date(entry.createdAt).toISOString(),
      variant: entry.request.variant,
      sigmaMin: entry.request.sigmaRange.min,
      sigmaMax: entry.request.sigmaRange.max,
      tMin: entry.request.tRange.min,
      tMax: entry.request.tRange.max,
    };
    const csv = exportZerosOfFCsv({ meta, sigma, t, yVal, depth });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const fname = `${entry.label && entry.label.length > 0 ? entry.label.replace(/\.csv$/i, "") : entry.scanId}.csv`;
    const a = document.createElement("a");
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Monotonic archive-change counter — read by StoragePanel to know when
   * to reload its cached listing. */
  public getArchiveEpoch(): number {
    return this.archiveEpoch;
  }

  /** Load an archived scan, appending its points to the slot-A scatter. No-op if already loaded. */
  public async loadArchive(scanId: string): Promise<void> {
    if (this.loadedScans.has(scanId)) return;
    await this.loadArchivedScan(scanId);
    this.archiveEpoch += 1;
    this.toolboxRefresh?.();
  }

  /** Currently-loaded archive scan ids (for UI state). */
  public getLoadedScanIds(): Set<string> {
    return new Set(this.loadedScans.keys());
  }

  /**
   * Remove one scan from the slot-A overlay. Implementation: drop it from the
   * tracking map, wipe the scatter, then re-append each remaining scan. Simple
   * and correct; cost is proportional to total loaded points (acceptable for
   * a handful of scans).
   */
  /** Whether a cull-and-recover run is currently in flight. */
  public isCullRunning(): boolean {
    return this.cullRunning;
  }

  /** Number of culled points emitted so far for the in-flight run. */
  public getCullProgress(): { done: number } {
    return { ...this.cullProgress };
  }

  /** Cooperatively cancel the current cull-and-recover run, if any. */
  public cancelCullAndRecover(): void {
    this.cullCancelled = true;
  }

  /**
   * Post-process the live scatter into a "culled" archive entry. Runs the
   * `cullAndRecover` pipeline (see that file's docstring), streaming each
   * output point into a temporary 1.5×-size scatter layer for visualization.
   * On completion we save an archive entry labeled `"culled · <…>"` and
   * dispose the temporary layer (the user can load the new entry from the
   * Storage panel like any other scan).
   */
  public async runCullAndRecover(opts: {
    tTol: number;
    sigmaGap: number;
    refineDelta: number;
    refineSamples: number;
  }): Promise<void> {
    if (this.cullRunning) return;
    this.cullRunning = true;
    this.cullCancelled = false;
    this.cullProgress = { done: 0 };

    // Snapshot the on-screen points (with full diagnostics) — live scatter +
    // every loaded archive scan + the diff overlay. After the per-scan-layer
    // refactor, archived scans no longer live in `this.scatter`, so iterating
    // only that produced an empty input list and the run silently no-op'd.
    const inputs: { sigma: number; t: number; yVal: number; sigma1Mag: number; r1Mag: number; phaseDev: number }[] = [];
    const collectFromLayer = (layer: ScanScatterLayer): void => {
      layer.forEachPointFull((sigma, t, yVal, sigma1Mag, r1Mag, phaseDev) => {
        inputs.push({ sigma, t, yVal, sigma1Mag, r1Mag, phaseDev });
      });
    };
    collectFromLayer(this.scatter);
    for (const layer of this.loadedScanLayers.values()) collectFromLayer(layer);
    if (this.differenceLayer !== null) collectFromLayer(this.differenceLayer);
    if (inputs.length === 0) {
      this.cullRunning = false;
      this.lastError = "No points to process. Load a scan first or run a new one.";
      this.toolboxRefresh?.();
      return;
    }

    // Fresh 1.5×-size temp layer for live preview of the cull output.
    if (this.culledScatter !== null) this.culledScatter.dispose();
    this.culledScatter = new ScanScatterLayer(this.contentGroup, this.state.display, { pointSize: 3 });
    this.culledScatter.setVisible(true);

    const params: CullParams = {
      tTol: opts.tTol,
      sigmaGap: opts.sigmaGap,
      refineDelta: opts.refineDelta,
      refineSamples: opts.refineSamples,
      variant: this.state.scan.variant,
    };

    const culled: CulledPoint[] = await cullAndRecover(
      inputs,
      params,
      (p) => {
        // Stream each point into the temp layer one at a time. Single-point
        // ScanLine — chunk system absorbs it.
        this.culledScatter?.appendLine({
          sigma: p.sigma,
          t: Float64Array.of(p.t),
          yVal: Float64Array.of(p.yVal),
          sigma1Mag: Float64Array.of(p.sigma1Mag),
          r1Mag: Float64Array.of(p.r1Mag),
          phaseDev: Float64Array.of(p.phaseDev),
        });
        this.cullProgress = { done: this.cullProgress.done + 1 };
        // Cheap throttle — refresh toolbox every 100 points, not per point.
        if (this.cullProgress.done % 100 === 0) this.toolboxRefresh?.();
      },
      () => this.cullCancelled,
    );

    // Build archive lines grouped by σ (rounded to 1e-6 for stability).
    const bySigma = new Map<string, { sigma: number; pts: CulledPoint[] }>();
    for (const p of culled) {
      const key = p.sigma.toFixed(6);
      let bucket = bySigma.get(key);
      if (!bucket) {
        bucket = { sigma: p.sigma, pts: [] };
        bySigma.set(key, bucket);
      }
      bucket.pts.push(p);
    }
    const archiveLines: ArchivedLine[] = [];
    for (const { sigma, pts } of bySigma.values()) {
      const n = pts.length;
      const tArr = new Float64Array(n);
      const yArr = new Float64Array(n);
      const s1Arr = new Float64Array(n);
      const r1Arr = new Float64Array(n);
      const phArr = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        tArr[i] = pts[i]!.t;
        yArr[i] = pts[i]!.yVal;
        s1Arr[i] = pts[i]!.sigma1Mag;
        r1Arr[i] = pts[i]!.r1Mag;
        phArr[i] = pts[i]!.phaseDev;
      }
      archiveLines.push({ sigma, t: tArr, yVal: yArr, sigma1Mag: s1Arr, r1Mag: r1Arr, phaseDev: phArr });
    }

    // Persist as a new archive entry. Label inherits the current scan's
    // rectangle and is prefixed with "culled · ".
    if (archiveLines.length > 0) {
      const createdAt = Date.now();
      const baseLabel = scanLabel(this.buildRequest());
      const scanId = makeScanId(this.buildRequest(), createdAt);
      try {
        await this.archive.put({
          workspaceId: WORKSPACE_ID,
          scanId,
          createdAt,
          request: this.buildRequest(),
          summary: { linesScanned: archiveLines.length, pointsRecorded: culled.length, durationMs: 0 },
          lines: archiveLines,
          label: `culled · ${baseLabel}`,
        });
        // Bump the epoch so StoragePanel re-fetches its listing and the new
        // "culled · …" row appears immediately instead of waiting for the
        // next user-triggered toolbox refresh.
        this.archiveEpoch += 1;
      } catch {
        // Non-fatal — temp layer still shows the result.
      }
    }

    // Dispose the temp preview layer; user can load the archive entry to see
    // the result rendered at standard size.
    if (this.culledScatter !== null) {
      this.culledScatter.dispose();
      this.culledScatter = null;
    }
    this.cullRunning = false;
    this.toolboxRefresh?.();
  }

  public async unloadArchive(scanId: string): Promise<void> {
    if (!this.loadedScans.has(scanId)) return;
    const layer = this.loadedScanLayers.get(scanId);
    if (layer !== undefined) {
      layer.dispose();
      this.loadedScanLayers.delete(scanId);
    }
    this.loadedScans.delete(scanId);
    this.loadedScanNames.delete(scanId);
    // Re-fit in case the unloaded scan was the σ-window driver in frac mode.
    this.applyViewportFit();
    this.archiveEpoch += 1;
    this.toolboxRefresh?.();
  }

  /** Clear the live scatter, dispose every loaded archive scan's layer, and
   * remove the difference overlay if any. */
  public clearLiveScatter(): void {
    this.scatter.clear();
    this.scatterHoldsMainZeros = false;
    this.syncMainZerosVisibility();
    for (const layer of this.loadedScanLayers.values()) layer.dispose();
    this.loadedScanLayers.clear();
    this.loadedScans.clear();
    this.loadedScanNames.clear();
    if (this.differenceLayer !== null) {
      this.differenceLayer.dispose();
      this.differenceLayer = null;
    }
    this.toolboxRefresh?.();
  }

  private recomputeTAverages(): void {
    const points = computeTAverages(
      (cb) => this.scatter.forEachPoint(cb),
      this.state.display.tAveragesThresh,
    );
    this.tAverages.setAverages(points, this.state.display.yAxisMode);
  }

  /** Re-fit + rebuild boundary/floor with the current yAxisMode + loaded scans. */
  private rebuildCurveLayers(): void {
    this.applyViewportFit();
  }

  private recomputeSegmentPostProc(): void {
    const d = this.state.display;
    this.lastSegmentPoints = segmentPostProcess(
      (cb) => this.scatter.forEachPoint(cb),
      { tTol: d.segTTol, sigmaGap: d.segSigmaGap, minPts: d.segMinPts },
    );
    this.segmentPostProc.setPoints(this.lastSegmentPoints, d.yAxisMode);
  }

  /** Public accessor for segment post-proc results (used by refinement & CSV export). */
  public getLastSegmentPoints(): SegmentPoint[] {
    return this.lastSegmentPoints;
  }

  private startSegmentRefine(): void {
    if (this.isRefining) return;
    if (this.lastSegmentPoints.length === 0) return;
    this.isRefining = true;
    this.refineGeneration++;
    const gen = this.refineGeneration;
    const d = this.state.display;
    void refineBatch(
      this.lastSegmentPoints,
      {
        nSamples: d.refineNSamples,
        sigmaDelta: d.refineSigmaDelta,
        variant: this.state.scan.variant,
      },
      (done, total) => {
        if (gen !== this.refineGeneration) return;
        this.refineProgress = { done, total };
        this.toolboxRefresh?.();
      },
      () => gen !== this.refineGeneration,
    ).then((results) => {
      if (gen !== this.refineGeneration) return;
      this.lastRefinedPoints = results;
      this.segmentRefine.setPoints(results, d.yAxisMode);
      this.isRefining = false;
      this.toolboxRefresh?.();
    });
  }

  private cancelSegmentRefine(): void {
    this.refineGeneration++;
    this.isRefining = false;
    this.toolboxRefresh?.();
  }

  /** Public accessor for refined results (CSV export). */
  public getLastRefinedPoints(): RefinedPoint[] {
    return this.lastRefinedPoints;
  }

  private recomputeTRowHighlight(): void {
    const { raw, average } = computeTRowHighlight(
      (cb) => this.scatter.forEachPoint((sigma, t) => cb(sigma, t)),
      this.state.display.tRowIntT,
      this.state.display.tRowFracPos,
    );
    this.tRowHighlight.setHighlight(raw, average, this.state.display.yAxisMode);
  }

  /** Public entry for the toolbox: recompute and show highlight. */
  public refreshTRowHighlight(): void {
    this.recomputeTRowHighlight();
  }

  private async loadArchivedScan(scanId: string): Promise<void> {
    const entry = await this.archive.get({ workspaceId: WORKSPACE_ID, scanId });
    if (!entry) return;
    await this.loadArchiveEntry(entry);
  }

  private async loadArchiveEntry(entry: ArchiveEntry): Promise<void> {
    const scanId = entry.scanId;
    // Track loaded scans for panel state + frac-mode σ window sizing.
    this.loadedScans.set(scanId, {
      sigmaMin: entry.request.sigmaRange.min,
      sigmaMax: entry.request.sigmaRange.max,
      tMin: entry.request.tRange.min,
      tMax: entry.request.tRange.max,
    });
    // Cache a friendly display name so the canvas overlay can title itself.
    // Prefer the user-set displayName (from the scan-manager Rename), fall
    // back to the auto-generated label, then the scan id.
    let friendly = entry.label ?? scanId;
    try {
      const listing = await this.archive.list(WORKSPACE_ID);
      const meta = listing.find((e) => e.scanId === scanId);
      if (meta?.displayName !== undefined && meta.displayName.trim() !== "") {
        friendly = meta.displayName;
      }
    } catch {
      // best-effort; keep label fallback
    }
    this.loadedScanNames.set(scanId, friendly);
    // Dedicated per-scan layer — disposing it on unload leaves all other
    // loaded scans untouched (no clear-and-repopulate flicker).
    let layer = this.loadedScanLayers.get(scanId);
    if (layer === undefined) {
      const forceColor = forcedColorForVariant(entry.request.variant);
      layer = new ScanScatterLayer(this.contentGroup, this.state.display, { forceColor });
      layer.setRForm(fVariantParts(entry.request.variant).rForm);
      layer.setFamily(fVariantParts(entry.request.variant).family);
      layer.setVisible(true);
      this.loadedScanLayers.set(scanId, layer);
    }
    // Intentionally NOT calling applyViewportFit() — loading a scan should
    // not jump the pan/zoom. User keeps the current view.
    await this.appendArchiveLinesToLayer(entry.lines, layer);
    this.toolboxRefresh?.();
  }

  private async appendArchiveLinesToLayer(
    lines: ArchivedLine[],
    layer: ScanScatterLayer,
  ): Promise<void> {
    const startedAt = performance.now();
    for (let i = 0; i < lines.length; i += ARCHIVE_LOAD_BATCH_LINES) {
      const batch = lines.slice(i, i + ARCHIVE_LOAD_BATCH_LINES).map((line) => ({
        sigma: line.sigma,
        t: line.t,
        yVal: line.yVal,
        sigma1Mag: line.sigma1Mag,
        r1Mag: line.r1Mag,
        phaseDev: line.phaseDev,
        ...(line.phaseR !== undefined ? { phaseR: line.phaseR } : {}),
        ...(line.depth !== undefined ? { depth: line.depth } : {}),
      }));
      layer.appendLines(batch);
      const loaded = Math.min(lines.length, i + ARCHIVE_LOAD_BATCH_LINES);
      if (loaded === lines.length || loaded % (ARCHIVE_LOAD_BATCH_LINES * 4) === 0) {
        // eslint-disable-next-line no-console
        console.log("[archive-load] render progress", {
          elapsedMs: Math.round(performance.now() - startedAt),
          loadedRows: loaded,
          totalRows: lines.length,
        });
      }
      // eslint-disable-next-line no-await-in-loop -- deliberate scheduling to keep UI responsive for large archives.
      await yieldToFrame();
    }
  }

  // ── View ──────────────────────────────────────────────────────────────────

  private applyView(): void {
    this.controller.setPan(this.state.view.panX, this.state.view.panY);
  }

  // ── Exporters helper ──────────────────────────────────────────────────────

  /** Returns the live archive lines (for CSV export). Empty if no scan ran yet. */
  public getActiveScanLinesForExport(): ArchivedLine[] {
    return this.inFlightArchiveLines;
  }

  public getActiveRequest(): ScanRequest | null {
    return this.currentHandle ? this.buildRequest() : this.inFlightArchiveLines.length > 0 ? this.buildRequest() : null;
  }
}

/** Background-overlay toggle id. Each value picks a pre-saved scan to load
 *  as a phase-R-colored persistent overlay. */
export type BgOverlayId =
  | "ratio" | "foldBack" | "foldOut"
  | "sum1R1ak" | "sum1R1akV1"
  | "legRakFolded" | "legRpsFolded" | "sum1R1ps";

/** Override scatter color for variants whose scan target isn't a standard
 *  f-zero curve. legRatio (magnitude balance) → yellow; legAngle (fold-back
 *  angle) → magenta. Other variants render with the user's color mode. */
type BgOverlayFlagKey =
  | "showBgLegRatio" | "showBgLegFoldBack" | "showBgLegFoldOut"
  | "showBgSum1R1ak" | "showBgSum1R1akV1"
  | "showBgLegRakFolded" | "showBgLegRpsFolded" | "showBgSum1R1ps";

function bgOverlayFlagKey(id: BgOverlayId): BgOverlayFlagKey {
  switch (id) {
    case "ratio": return "showBgLegRatio";
    case "foldBack": return "showBgLegFoldBack";
    case "foldOut": return "showBgLegFoldOut";
    case "sum1R1ak": return "showBgSum1R1ak";
    case "sum1R1akV1": return "showBgSum1R1akV1";
    case "legRakFolded": return "showBgLegRakFolded";
    case "legRpsFolded": return "showBgLegRpsFolded";
    case "sum1R1ps": return "showBgSum1R1ps";
  }
}

function forcedColorForVariant(variant: FVariant): [number, number, number] | null {
  const fam = fVariantParts(variant).family;
  if (fam === "legRatio") return [1, 1, 0];        // yellow
  if (fam === "legAngle") return [1, 0, 1];        // magenta
  if (fam === "legAngleOut") return [0, 1, 1];     // cyan
  if (fam === "sum1R1Angle") return [1, 0.55, 0];  // orange
  return null;
}

function scanLabel(request: ScanRequest): string {
  const t0 = Math.round(request.tRange.min);
  const t1 = Math.round(request.tRange.max);
  const s0 = Math.round(request.sigmaRange.min);
  const s1 = Math.round(request.sigmaRange.max);
  return `T${String(t0)}-${String(t1)}_S${String(s0)}-${String(s1)}`;
}

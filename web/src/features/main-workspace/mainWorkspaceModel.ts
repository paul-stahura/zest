import { OrthographicPanZoomSceneController } from "@/shared/rendering/orthographicPanZoomSceneController";
import type { ImportedDataset, Point2 } from "@/shared/io/types";
import { validate } from "@/shared/validation/types";
import type {
  SelectionState,
  ToolboxContext,
  ToolboxControl,
  ToolboxSection,
  VisualizationModel,
} from "@/shared/visualization/contracts";
import { aggregateToolboxSections } from "@/shared/toolbox/aggregateToolboxSections";
import type { MainWorkspaceSerializableState } from "@/features/main-workspace/types";
import {
  parseMainWorkspaceSerializedState,
  validMainWorkspaceSerializedState,
} from "@/features/main-workspace/validation/validMainWorkspaceSerializedState";
import { SpiralWorkspaceLayer, IndexTRow, IntegerPartTRow, ChampionsSlider, ZerosSlider } from "@/features/main-workspace/spiralWorkspaceLayer";
import { createElement, useState, useEffect } from "react";
import { indexToImag, imagToIndex } from "@/shared/math/zetaEms";
import { rak } from "@/shared/math/zakCalculator";
import { calcInverseSum } from "@/shared/math/sumRemainders";


/**
 * Animation speed slider that snaps back to 0 on release unless `hold` is true.
 */
function AnimationSpeedRow(props: {
  value: number;
  range: number;
  hold: boolean;
  onChange: (v: number) => void;
}) {
  // Local value mirrors prop; needed so we can show drags before the controller
  // sees them, in case the model is throttling.
  const [v, setV] = useState(props.value);
  useEffect(() => { setV(props.value); }, [props.value]);
  const commit = (val: number) => { setV(val); props.onChange(val); };
  const snapIfNoHold = () => {
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
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => commit(Number(e.target.value)),
      }),
    ),
    createElement("input", {
      type: "range",
      className: "zest-animate-slider",
      value: v,
      min: -props.range, max: props.range, step: props.range / 100,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => commit(Number(e.target.value)),
      onMouseUp: snapIfNoHold,
      onTouchEnd: snapIfNoHold,
      onPointerUp: snapIfNoHold,
    }),
  );
}

/**
 * One row containing the animation-mode dropdown on the left and a "hold" checkbox on the right.
 */
function AnimationModeAndHoldRow(props: {
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

/**
 * Live |ζ(s)| readout. Polls the spiral's current geometry each animation frame.
 * Text turns green when the value increases from one tick to the next, red when
 * it decreases; stays at the last color when unchanged.
 */
function AbsZetaRow(props: { getAbs: () => number }) {
  const [value, setValue] = useState<number>(props.getAbs());
  const [color, setColor] = useState<string>("var(--text)");
  useEffect(() => {
    let raf = 0;
    let prev = value;
    const tick = (): void => {
      const v = props.getAbs();
      if (v !== prev) {
        if (v > prev) setColor("#50fa7b");
        else if (v < prev) setColor("#ff5555");
        prev = v;
        setValue(v);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return createElement(
    "div",
    { className: "zest-row", style: { display: "flex", alignItems: "center", gap: 6 } },
    createElement("span", { className: "zest-label" }, "|ζ(s)|"),
    createElement(
      "span",
      {
        style: {
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color,
          marginLeft: "auto",
          fontVariantNumeric: "tabular-nums",
        },
      },
      value.toFixed(6),
    ),
  );
}

import { RemainderWorkspaceLayer } from "@/features/main-workspace/remainderWorkspaceLayer";
import { LFunctionWorkspaceLayer } from "@/features/main-workspace/lFunctionWorkspaceLayer";

/**
 * Coordinates the main workspace scene graph, imported datasets, and toolbox contributions.
 */
export class MainWorkspaceModel implements VisualizationModel {
  private readonly controller: OrthographicPanZoomSceneController;
  private readonly spiral: SpiralWorkspaceLayer;
  private readonly remainder: RemainderWorkspaceLayer;
  private readonly lFunction: LFunctionWorkspaceLayer;
  private selection: SelectionState = { activePoint: null };
  private animSpeed = 0;
  private animSpeedMode: "coarse" | "fine" | "fast" = "coarse";
  private animHold = false;
  // Camera coordinate frame: "origin" leaves the camera in world space (user
  // pans/zooms freely); the others track a moving point/orientation each frame.
  // Extensible — new frames can be added to the dropdown + computeFrameSpec.
  private cameraFrame: "origin" | "bisector" | "sum1-half-r" | "r-half-rs" | "zeta-mid" | "last-link" = "origin";
  // User drag offset while a tracking frame is active (view-space units), and
  // the pan we set last frame — any difference at the next frame is the
  // user's drag, which we fold into the offset instead of stomping it.
  private followOffsetX = 0;
  private followOffsetY = 0;
  private lastFollowPan: { x: number; y: number } | null = null;
  // Previous-frame view basis for the zeta/2 frame, used to pick the
  // orientation by continuity so the view never suddenly flips.
  private zetaFrameBasis: { ux: number; uy: number; vx: number; vy: number } | null = null;
  private unsubscribeFrame: (() => void) | null = null;
  private toolboxRefresh: (() => void) | null = null;
  private performanceMetrics: { method: string; times: number[] } = { method: "", times: [] };
  // Rolling samples for the calc/draw readout. Timestamped so percentages are
  // computed over a shared wall-clock window (calc events and draw frames
  // happen at different rates — only window totals are comparable).
  private perfCalcSamples: { t: number; ms: number }[] = [];
  private perfDrawSamples: { t: number; ms: number }[] = [];
  private lastSeenRebuildSeq = 0;

  private get animSpeedRange(): number {
    return this.animSpeedMode === "fine" ? 0.1 : this.animSpeedMode === "fast" ? 8 : 3;
  }

  public constructor() {
    this.controller = new OrthographicPanZoomSceneController();
    this.spiral = new SpiralWorkspaceLayer(this.controller.getFeatureRoot());
    this.remainder = new RemainderWorkspaceLayer(this.controller.getFeatureRoot());
    this.lFunction = new LFunctionWorkspaceLayer(this.controller.getFeatureRoot());
  }

  /**
   * {@inheritDoc VisualizationModel.initialize}
   */
  public initialize(): void {
    this.spiral.initialize();
    // Remainder defaults used to disagree with the spiral (index 10 vs 6.18);
    // sync so first remainder draw uses the same T/σ as the spiral.
    this.remainder.syncParams(this.spiral.getSigma(), this.spiral.getIndex());
    this.lFunction.update(this.spiral.getIndex(), this.spiral.getSigma(), this.spiral.getUsePolyImag());
    this.lFunction.initialize();
    this.unsubscribeFrame = this.controller.addFrameListener((_time, deltaMs) => {
      // --- calc/draw timing samples (pruned to a 2s rolling window) ---
      {
        const now = performance.now();
        const seq = this.spiral.getRebuildSeq();
        if (seq !== this.lastSeenRebuildSeq) {
          this.lastSeenRebuildSeq = seq;
          this.perfCalcSamples.push({ t: now, ms: this.spiral.getLastRebuildTimeMs() });
        }
        // frame() runs listeners before render, so this is the previous
        // frame's draw cost — fine for a rolling window.
        this.perfDrawSamples.push({ t: now, ms: this.controller.getLastRenderTimeMs() });
        const cutoff = now - 2000;
        while (this.perfCalcSamples.length > 0 && this.perfCalcSamples[0]!.t < cutoff) this.perfCalcSamples.shift();
        while (this.perfDrawSamples.length > 0 && this.perfDrawSamples[0]!.t < cutoff) this.perfDrawSamples.shift();
      }

      // Keep the emphasised Rps ribbon a constant on-screen thickness through zoom by
      // feeding it the current world-units-per-pixel (averaged over both axes).
      {
        const b = this.controller.getCameraBounds();
        const size = this.controller.getCanvasSize();
        const wppX = (b.right - b.left) / Math.max(1, size.width);
        const wppY = (b.top - b.bottom) / Math.max(1, size.height);
        this.remainder.setWorldPerPixel((wppX + wppY) / 2);
      }

      const deadzone = 0.0001;
      const animating = Math.abs(this.animSpeed) > deadzone;

      if (animating) {
        const index = this.spiral.getIndex();
        // Inverse-square scaling: faster at low index, slower at high index (mirrors Unity App.cs)
        const speedPerFrame = (this.animSpeed * this.animSpeed) * 0.001 / (index + 1);
        const newIndex = Math.max(0, index + speedPerFrame * Math.sign(this.animSpeed) * (deltaMs / 16.667));
        this.spiral.setIndex(newIndex);
        this.remainder.setIndex(newIndex);
        this.lFunction.update(newIndex, this.spiral.getSigma(), this.spiral.getUsePolyImag());

        // Track performance metrics
        const computeTime = this.spiral.getLastComputeTimeMs();
        this.performanceMetrics.times.push(computeTime);
      }

      const frame = this.computeFrameSpec();
      if (frame !== null) {
        // Fold any user drag since last frame into the persistent offset (drag
        // handlers mutate the controller's pan; we'd otherwise overwrite it
        // below). Wheel zoom also nudges pan to anchor the cursor — those
        // nudges fold in the same way, keeping zoom intact.
        if (this.lastFollowPan !== null) {
          this.followOffsetX += this.controller.getPanX() - this.lastFollowPan.x;
          this.followOffsetY += this.controller.getPanY() - this.lastFollowPan.y;
        }
        // The view basis maps world directions to view axes: x̂=(ux,uy)→+x,
        // ŷ=(vx,vy)→+y. The view linear map is M=[[ux,uy],[vx,vy]], so
        // pan = M·center and (rotation, flipY) decompose M.
        const { ux, uy, vx, vy } = frame;
        const panX = ux * frame.cx + uy * frame.cy + this.followOffsetX;
        const panY = vx * frame.cx + vy * frame.cy + this.followOffsetY;
        this.controller.setPan(panX, panY);
        this.lastFollowPan = { x: panX, y: panY };
        const flip = (ux * vy - uy * vx) < 0;   // det < 0 ⇒ reflection
        // featureRoot = Rz(rot)·Sy(flip) must equal M.
        const rot = flip ? Math.atan2(uy, ux) : Math.atan2(-uy, ux);
        this.controller.setViewRotation(rot);
        this.controller.setViewFlipY(flip);
      } else {
        this.controller.setViewRotation(0);
        this.controller.setViewFlipY(false);
        this.lastFollowPan = null;
      }

      if (animating) {
        this.toolboxRefresh?.();
      }
    });
  }

  /**
   * {@inheritDoc VisualizationModel.dispose}
   */
  public dispose(): void {
    this.unsubscribeFrame?.();
    this.spiral.dispose();
    this.remainder.dispose();
    this.lFunction.dispose();
    this.controller.dispose();
  }

  /**
   * Camera tracking spec for the current frame: world center (cx, cy) plus a
   * view basis — x̂=(ux,uy) maps to view +x, ŷ=(vx,vy) maps to view +y. The
   * basis may be a rotation (det +1) or a reflection (det −1). Returns null for
   * the free "origin" frame.
   *   • bisector    — center = bisector-link midpoint, link laid horizontal.
   *   • sum1-half-r — center = sum1 + R/2, R laid horizontal (AK approximation rak() of R).
   *   • r-half-rs   — center = B1rs = sum1 + R1rs with R1rs = R/2 the exact rs
   *                   half-split (R = ζ − Σ1 − Σ2, Siegel's exact remainder);
   *                   Rrs = R laid horizontal.
   *   • zeta-mid    — center = ζ/2, origin→ζ line horizontal; orientation
   *                   carried frame-to-frame by continuity so the view never
   *                   suddenly flips (crossing a zero or the bisector moving
   *                   across the axis no longer rotates/mirrors the scene).
   */
  private computeFrameSpec(): { cx: number; cy: number; ux: number; uy: number; vx: number; vy: number } | null {
    const geometry = this.spiral.getCurrentGeometry();
    if (geometry === null) return null;

    // Build a pure-rotation basis from a horizontal-target angle.
    const rotBasis = (cx: number, cy: number, angle: number) => ({
      cx, cy,
      ux: Math.cos(angle), uy: Math.sin(angle),
      vx: -Math.sin(angle), vy: Math.cos(angle),
    });

    if (this.cameraFrame === "bisector") {
      if (geometry.middlePoint === null || geometry.middleIndex + 1 >= geometry.joints.length) return null;
      const start = geometry.joints[geometry.middleIndex];
      const end = geometry.joints[geometry.middleIndex + 1];
      if (start === undefined || end === undefined) return null;
      return rotBasis(geometry.middlePoint.x, geometry.middlePoint.y, Math.atan2(end.y - start.y, end.x - start.x));
    }

    if (this.cameraFrame === "sum1-half-r") {
      const sum1 = geometry.joints[geometry.middleIndex];
      if (sum1 === undefined) return null;
      const R = rak(this.spiral.getSigma(), this.spiral.getIndex());
      return rotBasis(sum1.x + R.re / 2, sum1.y + R.im / 2, Math.atan2(R.im, R.re));
    }

    if (this.cameraFrame === "r-half-rs") {
      // Exact rs half-split (paper §5: R1rs = R2rs = R/2, "rs" for
      // Riemann–Siegel): R = ζ − Σ1 − Σ2 is Siegel's exact remainder, the
      // center is the rs bisector point B1rs = Σ1 + R/2, and Rrs = R runs
      // along +x. Same construction as "sum1-half-r" above but with the
      // exact R instead of the AK approximation rak().
      const sum1 = geometry.joints[geometry.middleIndex];
      if (sum1 === undefined) return null;
      const sum2 = calcInverseSum(this.spiral.getSigma(), this.spiral.getIndex());
      const rx = geometry.zeta.x - sum1.x - sum2.re;
      const ry = geometry.zeta.y - sum1.y - sum2.im;
      return rotBasis(sum1.x + rx / 2, sum1.y + ry / 2, Math.atan2(ry, rx));
    }

    if (this.cameraFrame === "zeta-mid") {
      const cx = geometry.zeta.x / 2;
      const cy = geometry.zeta.y / 2;
      const a = Math.atan2(geometry.zeta.y, geometry.zeta.x);
      // The origin→ζ line is horizontal for x̂ = ±(cos a, sin a); ŷ = ±perp.
      // Four candidate orthonormal bases keep the line horizontal:
      const dux = Math.cos(a), duy = Math.sin(a);
      const px = -Math.sin(a), py = Math.cos(a);
      const cands = [
        { ux: dux, uy: duy, vx: px, vy: py },
        { ux: dux, uy: duy, vx: -px, vy: -py },
        { ux: -dux, uy: -duy, vx: px, vy: py },
        { ux: -dux, uy: -duy, vx: -px, vy: -py },
      ];
      let chosen;
      const prev = this.zetaFrameBasis;
      if (prev !== null) {
        // Continuity: pick the basis closest to last frame's (max alignment).
        let best = cands[0]!, bestScore = -Infinity;
        for (const c of cands) {
          const score = c.ux * prev.ux + c.uy * prev.uy + c.vx * prev.vx + c.vy * prev.vy;
          if (score > bestScore) { bestScore = score; best = c; }
        }
        chosen = best;
      } else {
        // First frame: ζ to the right, bisector on top (if available).
        chosen = cands[0]!;
        const bis = geometry.middlePoint;
        if (bis !== null) {
          const perp = (bis.x - cx) * chosen.vx + (bis.y - cy) * chosen.vy;
          if (perp < 0) chosen = cands[1]!;
        }
      }
      this.zetaFrameBasis = { ...chosen };
      return { cx, cy, ...chosen };
    }

    if (this.cameraFrame === "last-link") {
      // The final link of the whole chain: from the second-to-last joint to the
      // last joint. Camera centered on the link's midpoint, link laid horizontal.
      const j = geometry.joints;
      const start = j[j.length - 2];
      const end = j[j.length - 1];
      if (start === undefined || end === undefined) return null;
      const cx = (start.x + end.x) / 2;
      const cy = (start.y + end.y) / 2;
      return rotBasis(cx, cy, Math.atan2(end.y - start.y, end.x - start.x));
    }

    return null;
  }

  /**
   * Calc-vs-draw split over the 2s rolling window, or null when nothing has
   * been sampled yet. Percentages compare total CPU ms spent in spiral
   * rebuilds vs renderer.render submissions within the same wall-clock span.
   * Consumed by the viewport perf overlay.
   */
  public getCalcDrawStats(): {
    calcPct: number; drawPct: number;
    calcAvgMs: number; drawAvgMs: number;
    calcCount: number; fps: number;
  } | null {
    const draws = this.perfDrawSamples;
    if (draws.length < 2) return null;
    const calcs = this.perfCalcSamples;
    const calcSum = calcs.reduce((a, s) => a + s.ms, 0);
    const drawSum = draws.reduce((a, s) => a + s.ms, 0);
    const total = calcSum + drawSum;
    const calcPct = total > 0 ? (calcSum / total) * 100 : 0;
    const windowSec = Math.max(0.001, (draws[draws.length - 1]!.t - draws[0]!.t) / 1000);
    return {
      calcPct,
      drawPct: 100 - calcPct,
      calcAvgMs: calcs.length > 0 ? calcSum / calcs.length : 0,
      drawAvgMs: drawSum / draws.length,
      calcCount: calcs.length,
      fps: (draws.length - 1) / windowSec,
    };
  }

  /**
   * Returns performance metrics (compute times for spiral geometry).
   */
  public getPerformanceMetrics(): { method: string; times: number[]; avgTime?: number } {
    return {
      ...this.performanceMetrics,
      avgTime: this.performanceMetrics.times.length > 0
        ? this.performanceMetrics.times.reduce((a, b) => a + b, 0) / this.performanceMetrics.times.length
        : undefined,
    };
  }

  /**
   * Clears performance metrics.
   */
  public clearPerformanceMetrics(): void {
    this.performanceMetrics = { method: "", times: [] };
  }

  /**
   * {@inheritDoc VisualizationModel.getSceneController}
   */
  public getSceneController() {
    return this.controller;
  }

  /**
   * {@inheritDoc VisualizationModel.getSelectionState}
   */
  public getSelectionState(): SelectionState {
    return this.selection;
  }

  /**
   * {@inheritDoc VisualizationModel.getSerializableState}
   */
  public getSerializableState(): MainWorkspaceSerializableState {
    return {
      sigma: this.spiral.getSigma(),
      index: this.spiral.getIndex(),
      usePolyImag: this.spiral.getUsePolyImag(),
      extendSpiralCount: this.spiral.getExtendSpiralCount(),
      drawMode: this.spiral.getDrawMode(),
      showZetaEndpoint: this.spiral.getShowZetaEndpoint(),
      showBisectorPoint: this.spiral.getShowBisectorPoint(),
      colorLinks: this.spiral.getColorLinks(),
      spiralVisible: this.spiral.getSpiralVisible(),
      spiralFirstHalf: this.spiral.getSpiralFirstHalf(),
      spiralReflect: this.spiral.getSpiralReflect(),
      spiralHalfSigma: this.spiral.getSpiralHalfSigma(),
      spiralReverse: this.spiral.getSpiralReverse(),
      inverseVisible: this.spiral.getInverseVisible(),
      inverseFirstHalf: this.spiral.getInverseFirstHalf(),
      inverseReflect: this.spiral.getInverseReflect(),
      sumXVisible: this.spiral.getSumXVisible(),
      sumXReflect: this.spiral.getSumXReflect(),
      sum2xVisible: this.spiral.getSum2xVisible(),
      sum2xReflect: this.spiral.getSum2xReflect(),
      zakVisible: this.spiral.getZakVisible(),
      zakReflect: this.spiral.getZakReflect(),
      crossingSumVisible: this.spiral.getCrossingSumVisible(),
      etaVisible: this.spiral.getEtaVisible(),
      zPrimeVisible: this.spiral.getZPrimeVisible(),
      importedPoints: this.snapshotImportedPoints(),
      ...this.remainderSerializableState(),
      ...this.lFunctionSerializableState(),
    };
  }

  /**
   * {@inheritDoc VisualizationModel.restoreSerializableState}
   */
  public restoreSerializableState(value: unknown): void {
    if (typeof value === "string") {
      const parsed = parseMainWorkspaceSerializedState("restore-local", value);
      this.applySerializedState(parsed);
      return;
    }

    const parsed = validate(value, validMainWorkspaceSerializedState);
    this.applySerializedState(parsed);
  }

  /**
   * Applies an imported dataset to workspace-owned layers (CSV point sets only in this slice).
   */
  public applyImportedDataset(dataset: ImportedDataset): void {
    if (dataset.kind === "pointSet") {
      this.spiral.setImportedPoints(dataset.points);
      this.selection = { activePoint: dataset.points[0] ?? null };
    }
  }

  public getCriticalStripPosition(): { index: number; sigma: number } {
    return { index: this.spiral.getIndex(), sigma: this.spiral.getSigma() };
  }

  /** State for the joint-angle overlay graph (drawn in the viewport).
   *  `selectionEnabled` is the "click dots to highlight joints" mode. */
  public getJointAngleGraphState(): {
    enabled: boolean; index: number; usePolyImag: boolean;
    selectionEnabled: boolean; selectedJoints: number[]; showGapJoints: boolean;
    showFlankingJoints: boolean; showIndexDivJoints: boolean; fastJointAngles: boolean;
    showFareyJoints: boolean; showRecipSqrtJoints: boolean; showGapEdges: boolean;
    showMediants: boolean; fareyMaxDenom: number; showNearZeroP: boolean;
    showPrimeCommon: boolean; showConnectDots: boolean; showFlipJoints: boolean;
    showWidthGaps: boolean; showWidthGaps2: boolean;
  } {
    return {
      enabled: this.spiral.getShowJointAngleGraph(),
      index: this.spiral.getIndex(),
      usePolyImag: this.spiral.getUsePolyImag(),
      selectionEnabled: this.spiral.getSelectJointsFromGraph(),
      selectedJoints: this.spiral.getSelectedJointIndices(),
      showGapJoints: this.spiral.getShowGapJoints(),
      showFlankingJoints: this.spiral.getShowFlankingJoints(),
      showIndexDivJoints: this.spiral.getShowIndexDivJoints(),
      fastJointAngles: this.spiral.getFastJointAngles(),
      showFareyJoints: this.spiral.getShowFareyJoints(),
      showRecipSqrtJoints: this.spiral.getShowRecipSqrtJoints(),
      showGapEdges: this.spiral.getShowGapEdges(),
      showMediants: this.spiral.getShowMediants(),
      fareyMaxDenom: this.spiral.getFareyMaxDenom(),
      showNearZeroP: this.spiral.getShowNearZeroP(),
      showPrimeCommon: this.spiral.getShowPrimeCommon(),
      showConnectDots: this.spiral.getShowConnectDots(),
      showFlipJoints: this.spiral.getShowFlipJoints(),
      showWidthGaps: this.spiral.getShowWidthGaps(),
      showWidthGaps2: this.spiral.getShowWidthGaps2(),
    };
  }

  /** A joint-angle-graph dot was clicked: dot n (1-based) is the bend θ_n at
   *  spiral vertex joints[n-1]. Toggle that joint's red highlight. */
  public toggleJointSelectionFromGraph(n: number): void {
    this.spiral.toggleSelectedJoint(n - 1);
  }

  /** State for the folded-out-percent over-T-interval overlay graph. */
  public getFoldedPercentGraphState(): { enabled: boolean; index: number; usePolyImag: boolean } {
    return {
      enabled: this.spiral.getShowFoldedPercentGraph(),
      index: this.spiral.getIndex(),
      usePolyImag: this.spiral.getUsePolyImag(),
    };
  }

  public setCriticalStripPosition(index: number, sigma: number): void {
    this.spiral.setIndex(index);
    this.spiral.setSigma(sigma);
    this.remainder.setIndex(index);
    this.remainder.setSigma(sigma);
    this.lFunction.update(index, sigma, this.spiral.getUsePolyImag());
    this.toolboxRefresh?.();
  }

  /**
   * Returns scatter points suitable for CSV export (empty when none were imported in this session).
   */
  public getScatterPointsForExport(): Point2[] {
    return this.spiral.getImportedPoints();
  }

  /**
   * {@inheritDoc VisualizationModel.getToolboxContributions}
   */
  public getToolboxContributions(ctx: ToolboxContext): ToolboxSection[] {
    this.toolboxRefresh = () => ctx.requestToolboxRefresh();
    // Animation controls are no longer in their own accordion — they're appended
    // to the spiral layer's bare top section below.
    const animationControls: ToolboxControl[] = [
      {
        kind: "custom",
        id: "anim-speed",
        render: () => createElement(AnimationSpeedRow, {
          value: this.animSpeed,
          range: this.animSpeedRange,
          hold: this.animHold,
          onChange: (v: number) => {
            this.animSpeed = v;
            ctx.requestToolboxRefresh();
          },
        }),
      },
      {
        kind: "custom",
        id: "anim-mode-and-hold",
        render: () => createElement(AnimationModeAndHoldRow, {
          mode: this.animSpeedMode,
          hold: this.animHold,
          onModeChange: (m) => {
            this.animSpeedMode = m;
            this.animSpeed = 0;
            ctx.requestToolboxRefresh();
          },
          onHoldChange: (h) => {
            this.animHold = h;
            // Unchecking hold snaps the animation speed slider back to zero.
            if (!h) this.animSpeed = 0;
            ctx.requestToolboxRefresh();
          },
        }),
      },
      {
        kind: "toggle",
        id: "fast-joint-angles",
        label: "fast joint angles (calibrate once / perturb · T>1000)",
        value: this.spiral.getFastJointAngles(),
        onChange: (value: boolean) => {
          this.spiral.setFastJointAngles(value);
          ctx.requestToolboxRefresh();
        },
      },
      {
        kind: "custom",
        id: "champions-slider",
        render: () => createElement(ChampionsSlider, {
          currentT: this.spiral.getIndex(),
          onPick: (T: number) => {
            const v = Math.max(0, Math.min(10000 - 1e-9, T));
            this.spiral.setIndex(v);
            this.remainder.setIndex(this.spiral.getIndex());
            this.lFunction.update(this.spiral.getIndex(), this.spiral.getSigma(), this.spiral.getUsePolyImag());
            ctx.requestToolboxRefresh();
          },
        }),
      },
      {
        kind: "custom",
        id: "abs-zeta-readout",
        render: () => createElement(AbsZetaRow, {
          getAbs: () => {
            const g = this.spiral.getCurrentGeometry();
            if (g === null) return 0;
            return Math.hypot(g.zeta.x, g.zeta.y);
          },
        }),
      },
      {
        kind: "custom",
        id: "zeros-slider",
        render: () => createElement(ZerosSlider, {
          currentT: this.spiral.getIndex(),
          onPick: (T: number) => {
            const v = Math.max(0, Math.min(10000 - 1e-9, T));
            this.spiral.setIndex(v);
            this.remainder.setIndex(this.spiral.getIndex());
            this.lFunction.update(this.spiral.getIndex(), this.spiral.getSigma(), this.spiral.getUsePolyImag());
            ctx.requestToolboxRefresh();
          },
        }),
      },
      {
        kind: "select",
        id: "camera-frame",
        label: "camera coordinate frame",
        value: this.cameraFrame,
        options: [
          { label: "world origin", value: "origin" },
          { label: "bisector", value: "bisector" },
          { label: "sum1 + R/2", value: "sum1-half-r" },
          { label: "R/2", value: "r-half-rs" },
          { label: "zeta/2", value: "zeta-mid" },
          { label: "last link", value: "last-link" },
        ],
        onChange: (value: string) => {
          if (value === "origin" || value === "bisector" || value === "sum1-half-r" || value === "r-half-rs" || value === "zeta-mid" || value === "last-link") {
            this.cameraFrame = value;
            // Reset drag offset and the continuity basis when switching frames
            // so each frame starts from its natural center/orientation.
            this.followOffsetX = 0;
            this.followOffsetY = 0;
            this.lastFollowPan = null;
            this.zetaFrameBasis = null;
          }
          ctx.requestToolboxRefresh();
        },
      },
    ];
    // Patch spiral sections: intercept sigma + index control onChange to keep remainder in sync.
    const spiralSections = this.spiral.getToolSections(ctx).map(section => ({
      ...section,
      controls: (section.controls ?? []).map(ctrl => {
        if (ctrl.kind === "range-slider" && ctrl.id === "sigma") {
          const orig = ctrl.onChange;
          return { ...ctrl, onChange: (v: number) => {
            orig(v);
            this.remainder.setSigma(v);
            this.lFunction.update(this.spiral.getIndex(), v, this.spiral.getUsePolyImag());
          } };
        }
        if (ctrl.kind === "number" && ctrl.id === "index-frac") {
          const orig = ctrl.onChange;
          return { ...ctrl, onChange: (v: number) => {
            orig(v);
            this.remainder.setIndex(this.spiral.getIndex());
            this.lFunction.update(this.spiral.getIndex(), this.spiral.getSigma(), this.spiral.getUsePolyImag());
          } };
        }
        if (ctrl.kind === "custom" && ctrl.id === "index-int") {
          return { ...ctrl, render: () => createElement(IntegerPartTRow, {
            intValue: Math.trunc(this.spiral.getIndex()),
            onChange: (v: number) => {
              const clampedInt = Math.max(0, Math.min(9999, v));
              const frac = this.spiral.getIndex() - Math.trunc(this.spiral.getIndex());
              const newIndex = clampedInt + frac;
              this.spiral.setIndex(newIndex);
              this.remainder.setIndex(newIndex);
              this.lFunction.update(newIndex, this.spiral.getSigma(), this.spiral.getUsePolyImag());
              ctx.requestToolboxRefresh();
            },
          }) };
        }
        if (ctrl.kind === "custom" && ctrl.id === "index-T-and-t") {
          return { ...ctrl, render: () => createElement(IndexTRow, {
            indexValue: this.spiral.getIndex(),
            tValue: indexToImag(this.spiral.getIndex(), this.spiral.getUsePolyImag()),
            onTChange: (v: number) => {
              const clamped = Math.max(0, Math.min(10000 - 1e-9, v));
              this.spiral.setIndex(clamped);
              this.remainder.setIndex(clamped);
              this.lFunction.update(clamped, this.spiral.getSigma(), this.spiral.getUsePolyImag());
              ctx.requestToolboxRefresh();
            },
            onTFromtChange: (tIn: number) => {
              const newT = imagToIndex(Math.max(0, tIn), this.spiral.getUsePolyImag());
              const clamped = Math.max(0, Math.min(10000 - 1e-9, newT));
              this.spiral.setIndex(clamped);
              this.remainder.setIndex(clamped);
              this.lFunction.update(clamped, this.spiral.getSigma(), this.spiral.getUsePolyImag());
              ctx.requestToolboxRefresh();
            },
          }) };
        }
        if (ctrl.kind === "toggle" && ctrl.id === "poly-imag") {
          const orig = ctrl.onChange;
          return { ...ctrl, onChange: (v: boolean) => {
            orig(v);
            this.lFunction.update(this.spiral.getIndex(), this.spiral.getSigma(), v);
          } };
        }
        return ctrl;
      }),
    }));

    // Append animation controls to the spiral layer's bare top section so they
    // appear flush below the index controls (no accordion).
    const sectionsWithAnim = spiralSections.map(section => {
      if (section.id === "top-controls" && section.bare === true) {
        return { ...section, controls: [...(section.controls ?? []), ...animationControls] };
      }
      return section;
    });

    return aggregateToolboxSections([
      ...sectionsWithAnim,
      ...this.lFunction.getToolSections(ctx),
      ...this.remainder.getToolSections(ctx),
    ]);
  }

  private lFunctionSerializableState(): Partial<MainWorkspaceSerializableState> {
    const snap = this.lFunction.getStateSnapshot();
    return {
      lfL1Enabled: snap.l1Enabled, lfL2Enabled: snap.l2Enabled,
      lfL1Prime: snap.l1Prime, lfL2Prime: snap.l2Prime,
      lfL1SpiralMode: snap.l1SpiralMode, lfL2SpiralMode: snap.l2SpiralMode,
      lfL1Reflect: snap.l1Reflect, lfL2Reflect: snap.l2Reflect,
      lfL1Bisector: snap.l1Bisector, lfL2Bisector: snap.l2Bisector,
      lfPhantomMode: snap.phantomMode, lfUsePrimeImag: snap.usePrimeImag,
    };
  }

  private remainderSerializableState(): Partial<MainWorkspaceSerializableState> {
    const snap = this.remainder.getStateSnapshot();
    return {
      rHalfPoint:     snap.rHalf.point,    rHalfR1:        snap.rHalf.r1,
      rHalfR2:        snap.rHalf.r2,       rHalfLegsFwd:   snap.rHalf.legsFwd,
      rHalfLegsInv:   snap.rHalf.legsInv,  rHalfSym:       snap.rHalf.sym,
      rHalfPathSigma: snap.rHalf.pathSigma, rHalfPathIndex: snap.rHalf.pathIndex,
      rpsPoint:       snap.rps.point,      rpsR1:          snap.rps.r1,
      rpsR2:          snap.rps.r2,         rpsLegsFwd:     snap.rps.legsFwd,
      rpsLegsInv:     snap.rps.legsInv,    rpsSym:         snap.rps.sym,
      rpsPathSigma:   snap.rps.pathSigma,  rpsPathIndex:   snap.rps.pathIndex,
      rakPoint:       snap.rak.point,      rakR1:          snap.rak.r1,
      rakR2:          snap.rak.r2,         rakLegsFwd:     snap.rak.legsFwd,
      rakLegsInv:     snap.rak.legsInv,    rakSym:         snap.rak.sym,
      rakPathSigma:   snap.rak.pathSigma,  rakPathIndex:   snap.rak.pathIndex,
      remainderPathLength: snap.pathLength,
    };
  }

  private snapshotImportedPoints(): Point2[] | undefined {
    const pts = this.spiral.getImportedPoints();
    return pts.length > 0 ? pts : undefined;
  }

  private applySerializedState(state: MainWorkspaceSerializableState): void {
    this.spiral.setSigma(state.sigma);
    this.spiral.setIndex(state.index);
    this.spiral.setUsePolyImag(state.usePolyImag);
    this.spiral.setExtendSpiralCount(state.extendSpiralCount);
    this.spiral.setDrawMode(state.drawMode);
    this.spiral.setShowZetaEndpoint(state.showZetaEndpoint);
    this.spiral.setShowBisectorPoint(state.showBisectorPoint);
    this.spiral.setColorLinks(state.colorLinks);
    this.spiral.setSpiralVisible(state.spiralVisible);
    this.spiral.setSpiralFirstHalf(state.spiralFirstHalf ?? false);
    this.spiral.setSpiralReflect(state.spiralReflect);
    this.spiral.setSpiralHalfSigma(state.spiralHalfSigma);
    this.spiral.setSpiralReverse(state.spiralReverse);
    this.spiral.setInverseVisible(state.inverseVisible);
    this.spiral.setInverseFirstHalf(state.inverseFirstHalf ?? false);
    this.spiral.setInverseReflect(state.inverseReflect);
    this.spiral.setSumXVisible(state.sumXVisible ?? false);
    this.spiral.setSumXReflect(state.sumXReflect ?? false);
    this.spiral.setSum2xVisible(state.sum2xVisible ?? false);
    this.spiral.setSum2xReflect(state.sum2xReflect ?? false);
    this.spiral.setZakVisible(state.zakVisible);
    this.spiral.setZakReflect(state.zakReflect);
    this.spiral.setCrossingSumVisible(state.crossingSumVisible ?? false);
    this.spiral.setEtaVisible(state.etaVisible);
    this.spiral.setZPrimeVisible(state.zPrimeVisible);
    const points = state.importedPoints ?? [];
    this.spiral.setImportedPoints(points);
    this.selection = { activePoint: points[0] ?? null };

    this.lFunction.batchRestore({
      l1Enabled:    state.lfL1Enabled    ?? false,
      l2Enabled:    state.lfL2Enabled    ?? false,
      l1Prime:      state.lfL1Prime      ?? 3,
      l2Prime:      state.lfL2Prime      ?? 5,
      l1SpiralMode: state.lfL1SpiralMode ?? 0,
      l2SpiralMode: state.lfL2SpiralMode ?? 0,
      l1Reflect:    state.lfL1Reflect    ?? false,
      l2Reflect:    state.lfL2Reflect    ?? false,
      l1Bisector:   state.lfL1Bisector   ?? false,
      l2Bisector:   state.lfL2Bisector   ?? false,
      phantomMode:  state.lfPhantomMode  ?? 2,
      usePrimeImag: state.lfUsePrimeImag ?? true,
    });

    this.remainder.batchRestore(
      state.sigma,
      state.index,
      {
        point: state.rHalfPoint ?? 0,    r1: state.rHalfR1 ?? 0,
        r2: state.rHalfR2 ?? 0,          legsFwd: state.rHalfLegsFwd ?? 0,
        legsInv: state.rHalfLegsInv ?? 0, sym: state.rHalfSym ?? 0,
        pathSigma: state.rHalfPathSigma ?? 0, pathIndex: state.rHalfPathIndex ?? 0,
      },
      {
        point: state.rpsPoint ?? 0,      r1: state.rpsR1 ?? 0,
        r2: state.rpsR2 ?? 0,            legsFwd: state.rpsLegsFwd ?? 0,
        legsInv: state.rpsLegsInv ?? 0,  sym: state.rpsSym ?? 0,
        pathSigma: state.rpsPathSigma ?? 0, pathIndex: state.rpsPathIndex ?? 0,
      },
      {
        point: state.rakPoint ?? 0,      r1: state.rakR1 ?? 0,
        r2: state.rakR2 ?? 0,            legsFwd: state.rakLegsFwd ?? 0,
        legsInv: state.rakLegsInv ?? 0,  sym: state.rakSym ?? 0,
        pathSigma: state.rakPathSigma ?? 0, pathIndex: state.rakPathIndex ?? 0,
      },
      state.remainderPathLength ?? 0,
    );
  }
}

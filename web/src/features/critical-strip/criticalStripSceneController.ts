import type { SceneController } from "@/shared/visualization/contracts";
import { indexToImag } from "@/shared/math/zetaEms";
import type { CriticalPointSet, SpaceMode, ViewRange } from "@/features/critical-strip/criticalStripTypes";
import { CriticalStripTransform, imagToIndex } from "@/features/critical-strip/criticalStripTransform";

const MIN_INDEX_VALUE = -1;
const MIN_IMAG_VALUE = 10;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 500;
// Scroll wheel: fraction-of-range per 100px of wheel delta
const ZOOM_WHEEL_RATE = 0.12;
const SCROLL_CLICK_GUARD_MS = 120;
const DRAG_CLICK_GUARD_PX = 4;
// Nearest-point hover/click detection radius in CSS pixels
const HOVER_THRESHOLD_PX = 12;
// Blink rate for current position indicator
const BLINK_HALF_PERIOD_MS = 600;
// Height in CSS pixels reserved at the top for the sigma axis ruler
export const SIGMA_AXIS_HEIGHT = 16;

export type PointClickEvent = { index: number; sigma: number };

// Cache of visible points projected to viewport space.
// pi[i] is the index into the original CriticalPointSet.points array.
type VisibleCache = {
  vx: Float32Array;
  vy: Float32Array;
  pi: Int32Array;
  count: number;
};

/**
 * Canvas 2D scene controller for the critical strip panel.
 * Coordinate convention: Y-down (y=0=top of canvas = maxValue, y=height=bottom = minValue).
 */
export class CriticalStripSceneController implements SceneController {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  // CSS pixel dimensions of the canvas (excluding the sigma axis row)
  private width = 1;
  private height = 1;
  private dpr = 1;
  private disposed = false;
  private animFrameHandle = 0;

  private readonly transform: CriticalStripTransform;
  private currentZoom = 1;
  private sigmaRange: number;

  private pointSets: CriticalPointSet[] = [];
  private visibleCache: Map<string, VisibleCache> = new Map();

  private currentIndex = 0;
  private currentSigma = 0.5;
  private bandsVisible = false;

  private isDragging = false;
  private lastDragY = 0;
  private dragTotalY = 0;
  private lastScrollTime = 0;

  private blinkOn = true;

  // Hover state — tracks which cache entry the pointer is nearest to
  private hoveredSetId: string | null = null;
  private hoveredCacheIdx = -1;
  private hoveredReal = 0;
  private hoveredIndex = 0;

  public onViewportChange: (() => void) | null = null;
  public onPointClick: ((e: PointClickEvent) => void) | null = null;

  private cleanupListeners: (() => void) | null = null;

  public constructor(
    initialRange: ViewRange = { minY: 0, maxY: 7 },
    spaceMode: SpaceMode = "index",
    sigmaRange: number = 1,
  ) {
    this.sigmaRange = sigmaRange;
    this.transform = new CriticalStripTransform(initialRange, spaceMode, sigmaRange);
  }

  // ── SceneController interface ──────────────────────────────────────────────

  public mount(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.attachInputListeners(canvas);
  }

  public resize(cssWidth: number, cssHeight: number, dpr: number): void {
    // Reserve the top SIGMA_AXIS_HEIGHT px for the sigma ruler; the rest is the strip canvas
    const stripHeight = Math.max(1, cssHeight - SIGMA_AXIS_HEIGHT);
    this.width = Math.max(1, cssWidth);
    this.height = stripHeight;
    this.dpr = dpr;
    if (this.canvas !== null) {
      this.canvas.width = Math.round(cssWidth * dpr);
      this.canvas.height = Math.round(cssHeight * dpr);
    }
    this.transform.invalidate(this.width, stripHeight);
    this.rebuildVisibleCaches();
  }

  public frame(time: number): void {
    if (this.ctx === null || this.disposed) return;
    this.blinkOn = Math.floor(time / BLINK_HALF_PERIOD_MS) % 2 === 0;
    this.render();
  }

  public dispose(): void {
    this.disposed = true;
    this.cleanupListeners?.();
    this.cleanupListeners = null;
    cancelAnimationFrame(this.animFrameHandle);
  }

  // ── Public state setters ───────────────────────────────────────────────────

  public setPointSets(sets: CriticalPointSet[]): void {
    this.pointSets = sets;
    this.rebuildVisibleCaches();
  }

  public setCurrentPosition(index: number, sigma: number): void {
    this.currentIndex = index;
    this.currentSigma = sigma;
  }

  public setBandsVisible(visible: boolean): void {
    this.bandsVisible = visible;
  }

  public setSigmaRange(range: number): void {
    this.sigmaRange = range;
    this.transform.setSigmaRange(range);
    this.rebuildVisibleCaches();
  }

  public setSpaceMode(mode: SpaceMode): void {
    const current = this.transform.getSpaceMode();
    if (current === mode) return;
    const minVal = this.transform.getMinValue();
    const maxVal = this.transform.getMaxValue();
    this.transform.setSpaceMode(mode);
    if (mode === "imaginary") {
      this.transform.setRange(indexToImag(minVal, false), indexToImag(maxVal, false));
    } else {
      this.transform.setRange(imagToIndex(minVal), imagToIndex(maxVal));
    }
    this.rebuildVisibleCaches();
    this.onViewportChange?.();
  }

  public centerOn(index: number, durationMs: number): void {
    const halfRange = (this.transform.getMaxValue() - this.transform.getMinValue()) / 2;
    const targetY = this.transform.getSpaceMode() === "imaginary"
      ? indexToImag(index, false)
      : index;
    const newMin = targetY - halfRange;
    const newMax = targetY + halfRange;
    if (durationMs <= 0) {
      this.applyRange(newMin, newMax);
      this.onViewportChange?.();
      return;
    }
    this.animateTo(newMin, newMax, durationMs);
  }

  public getTransform(): CriticalStripTransform {
    return this.transform;
  }

  public getViewRange(): ViewRange {
    return { minY: this.transform.getMinValue(), maxY: this.transform.getMaxValue() };
  }

  // Scale point size with zoom: linear falloff so points shrink proportionally when zoomed out.
  // Reference range = 7 (default initial view). At 7 units visible, scale = 1.0.
  // At 14 units, scale = 0.5. At 70 units, scale = 0.1 (clamped to 1px minimum in caller).
  private computePointScale(): number {
    const referenceRange = 7;
    const visibleRange = this.transform.getMaxValue() - this.transform.getMinValue();
    return Math.min(1, referenceRange / Math.max(visibleRange, referenceRange));
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  private render(): void {
    const ctx = this.ctx;
    if (ctx === null) return;

    const dpr = this.dpr;
    const W = this.width;   // CSS pixels
    const H = this.height;  // CSS strip pixels (below the sigma ruler)
    const axisH = SIGMA_AXIS_HEIGHT;

    ctx.save();
    ctx.scale(dpr, dpr);

    // ── Background ── (transparent so the main viewport shows through)
    ctx.clearRect(0, 0, W, axisH + H);

    // ── Sigma axis ruler (top strip) ──
    this.renderSigmaAxis(ctx, W, axisH);

    // Clip all further drawing to the strip area below the ruler
    ctx.save();
    ctx.translate(0, axisH);

    // Bands
    if (this.bandsVisible) this.renderBands(ctx, W, H);

    // Critical line
    this.renderCriticalLine(ctx, H);

    // Points (draw hovered last so it appears on top)
    const pointScale = this.computePointScale();
    for (const set of this.pointSets) {
      const cache = this.visibleCache.get(set.id);
      if (cache !== undefined) {
        const hoverIdx = set.id === this.hoveredSetId ? this.hoveredCacheIdx : -1;
        if (set.connectLines) {
          this.renderLines(ctx, cache, set.color, W);
        } else {
          if (set.hLine) this.renderHLines(ctx, cache, set.color, W);
          this.renderPoints(ctx, cache, set.color, Math.max(1, set.pointSize * pointScale), hoverIdx);
        }
      }
    }

    // Current position indicator
    this.renderIndicator(ctx, W, H);

    ctx.restore();
    ctx.restore();
  }

  private renderSigmaAxis(ctx: CanvasRenderingContext2D, W: number, axisH: number): void {
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, axisH - 0.5);
    ctx.lineTo(W, axisH - 0.5);
    ctx.stroke();

    // Tick labels: 0, 0.5, 1 — and extended marks if sigmaRange > 1
    const ticks = this.getSigmaTicks();
    ctx.font = "8px var(--font-mono, monospace)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    for (const { sigma, label } of ticks) {
      const vp = this.transform.stripToViewport({ x: sigma, y: 0 });
      const x = vp.x;
      if (x < 0 || x > W) continue;

      // Tick mark
      ctx.strokeStyle = sigma === 0.5 ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.18)";
      ctx.lineWidth = sigma === 0.5 ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, axisH - 5);
      ctx.lineTo(x, axisH);
      ctx.stroke();

      // Label
      ctx.fillStyle = sigma === 0.5 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)";
      ctx.fillText(label, x, 2);
    }
  }

  private getSigmaTicks(): Array<{ sigma: number; label: string }> {
    if (this.sigmaRange === 1) {
      return [{ sigma: 0, label: "0" }, { sigma: 0.5, label: "0.5" }, { sigma: 1, label: "1" }];
    }
    const ticks: Array<{ sigma: number; label: string }> = [{ sigma: 0.5, label: "0.5" }];
    for (let s = 0; s <= this.sigmaRange; s++) {
      ticks.push({ sigma: s, label: String(s) });
    }
    for (let s = -1; s >= -(this.sigmaRange - 1); s--) {
      ticks.push({ sigma: s, label: String(s) });
    }
    return ticks;
  }

  private renderCriticalLine(ctx: CanvasRenderingContext2D, H: number): void {
    const vp = this.transform.stripToViewport({ x: 0.5, y: 0 });
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(vp.x, 0);
    ctx.lineTo(vp.x, H);
    ctx.stroke();
  }

  private renderBands(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    // Draw thin white horizontal lines at T = floor(T)+0.25 and floor(T)+0.75
    // for every integer T-step in the visible range.
    const minVal = this.transform.getMinValue();
    const maxVal = this.transform.getMaxValue();
    const spaceMode = this.transform.getSpaceMode();

    // Convert visible Y-range to T-range.
    let minT: number;
    let maxT: number;
    if (spaceMode === "index") {
      minT = minVal;
      maxT = maxVal;
    } else {
      minT = imagToIndex(minVal);
      maxT = imagToIndex(maxVal);
    }

    const firstFloor = Math.floor(Math.max(0, minT));
    const lastFloor = Math.floor(maxT);
    const offsets: number[] = [0.25, 0.75];

    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let f = firstFloor; f <= lastFloor; f += 1) {
      for (const off of offsets) {
        const T = f + off;
        if (T < minT || T > maxT) continue;
        const stripY = spaceMode === "index" ? T : indexToImag(T, false);
        const vp = this.transform.stripToViewport({ x: 0, y: stripY });
        if (vp.y < 0 || vp.y > H) continue;
        const y = Math.round(vp.y) + 0.5;
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
      }
    }
    ctx.stroke();
  }

  private renderPoints(
    ctx: CanvasRenderingContext2D,
    cache: VisibleCache,
    color: string,
    pointSize: number,
    hoveredCacheIdx: number,
  ): void {
    const half = Math.max(0.5, pointSize * 0.5);
    ctx.fillStyle = color;

    // Draw all non-hovered points first
    for (let i = 0; i < cache.count; i++) {
      if (i === hoveredCacheIdx) continue;
      ctx.fillRect((cache.vx[i] ?? 0) - half, (cache.vy[i] ?? 0) - half, pointSize, pointSize);
    }

    // Draw hovered point on top at 2× size
    if (hoveredCacheIdx >= 0 && hoveredCacheIdx < cache.count) {
      const hx = cache.vx[hoveredCacheIdx] ?? 0;
      const hy = cache.vy[hoveredCacheIdx] ?? 0;
      const hSize = pointSize * 2.5;
      const hHalf = hSize * 0.5;
      ctx.fillRect(hx - hHalf, hy - hHalf, hSize, hSize);
    }
  }

  /**
   * Render the visible points of a set as a connected polyline (one stroke
   * call). Breaks the path at any segment where the horizontal jump exceeds
   * half the strip width — those are sigma-axis wraparounds and a connecting
   * line across the strip would be misleading.
   */
  private renderLines(
    ctx: CanvasRenderingContext2D,
    cache: VisibleCache,
    color: string,
    width: number,
  ): void {
    if (cache.count < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const breakThreshold = width * 0.5;
    let pathOpen = false;
    let prevX = 0, prevPi = -2;
    for (let i = 0; i < cache.count; i++) {
      const x = cache.vx[i] ?? 0;
      const y = cache.vy[i] ?? 0;
      const pi = cache.pi[i] ?? 0;
      const adjacent = pi === prevPi + 1;
      if (!pathOpen || !adjacent || Math.abs(x - prevX) > breakThreshold) {
        // Either first point, or a Y-range filter skip (visible cache dropped
        // some original points), or a wraparound across the strip. Move (no
        // line) so the polyline doesn't bridge a gap.
        ctx.moveTo(x, y);
        pathOpen = true;
      } else {
        ctx.lineTo(x, y);
      }
      prevX = x; prevPi = pi;
    }
    ctx.stroke();
  }

  /**
   * Thin translucent horizontal line across the full strip width at each
   * visible point's y. Used by sets flagged `#@hLine: true` so they stay
   * discernible when another set's dots overlap theirs.
   */
  private renderHLines(
    ctx: CanvasRenderingContext2D,
    cache: VisibleCache,
    color: string,
    width: number,
  ): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    for (let i = 0; i < cache.count; i++) {
      const y = cache.vy[i] ?? 0;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  private renderIndicator(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const stripY = this.transform.getSpaceMode() === "imaginary"
      ? indexToImag(this.currentIndex, false)
      : this.currentIndex;
    const vp = this.transform.stripToViewport({ x: this.currentSigma, y: stripY });
    if (vp.x < 0 || vp.x > W || vp.y < 0 || vp.y > H) return;

    // Always draw the gray square
    const size = 6;
    ctx.fillStyle = "rgba(200,200,200,0.75)";
    ctx.fillRect(vp.x - size / 2, vp.y - size / 2, size, size);

    // Blink: draw a bright white outline when on
    if (this.blinkOn) {
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1;
      ctx.strokeRect(vp.x - size / 2 - 1, vp.y - size / 2 - 1, size + 2, size + 2);
    }
  }

  // ── Visible cache ──────────────────────────────────────────────────────────

  private rebuildVisibleCaches(): void {
    this.visibleCache.clear();
    // Clear stale hover state — the point may no longer be visible
    this.hoveredSetId = null;
    this.hoveredCacheIdx = -1;
    for (const set of this.pointSets) {
      this.visibleCache.set(set.id, this.buildCache(set));
    }
  }

  private buildCache(set: CriticalPointSet): VisibleCache {
    const minY = this.transform.getMinValue();
    const maxY = this.transform.getMaxValue();
    const margin = (maxY - minY) * 0.05;

    const vx = new Float32Array(set.points.length);
    const vy = new Float32Array(set.points.length);
    const pi = new Int32Array(set.points.length);
    let count = 0;

    for (let ptIdx = 0; ptIdx < set.points.length; ptIdx++) {
      const pt = set.points[ptIdx];
      if (pt === undefined) continue;

      const stripY = this.transform.getSpaceMode() === "imaginary"
        ? indexToImag(pt.index, false)
        : pt.index;

      if (stripY < minY - margin || stripY > maxY + margin) continue;

      const vp = this.transform.stripToViewport({ x: pt.real, y: stripY });
      if (vp.x < -10 || vp.x > this.width + 10) continue;

      vx[count] = vp.x;
      vy[count] = vp.y;
      pi[count] = ptIdx;
      count += 1;
    }

    return { vx, vy, pi, count };
  }

  // ── Input handling ─────────────────────────────────────────────────────────

  private attachInputListeners(canvas: HTMLCanvasElement): void {
    const onWheel = (e: WheelEvent): void => { e.preventDefault(); this.handleWheel(e); };
    const onPointerDown = (e: PointerEvent): void => { this.handlePointerDown(e); };
    const onPointerMove = (e: PointerEvent): void => { this.handlePointerMove(e); };
    const onPointerUp = (e: PointerEvent): void => { this.handlePointerUp(e); };
    const onClick = (e: MouseEvent): void => { this.handleClick(e); };
    const onPointerLeave = (): void => { this.clearHover(); };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("pointerleave", onPointerLeave);

    this.cleanupListeners = () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }

  /** Convert clientX/Y → CSS pixel coords within the strip area (below sigma ruler). */
  private canvasPos(clientX: number, clientY: number): { x: number; y: number } {
    if (this.canvas === null) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top - SIGMA_AXIS_HEIGHT,
    };
  }

  private handleWheel(e: WheelEvent): void {
    this.lastScrollTime = performance.now();
    const mouseVp = this.canvasPos(e.clientX, e.clientY);
    const mouseStrip = this.transform.viewportToStrip(mouseVp);

    // Normalise wheel delta to fraction-of-range, then scale by rate.
    // Negate so two-finger scroll UP zooms IN (matches the main canvas).
    const rawDelta = -e.deltaY;
    const fraction = rawDelta / (this.height || 1);
    const rangeFactor = 1 + fraction * ZOOM_WHEEL_RATE * 10;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.currentZoom * rangeFactor));
    if (newZoom === this.currentZoom) return;

    const currentRange = this.transform.getMaxValue() - this.transform.getMinValue();
    const newRange = currentRange * (this.currentZoom / newZoom);
    const mouseOffset = (mouseStrip.y - (this.transform.getMinValue() + currentRange / 2)) / currentRange;
    const newCenter = mouseStrip.y - mouseOffset * newRange;

    this.currentZoom = newZoom;
    this.applyRange(newCenter - newRange / 2, newCenter + newRange / 2);
    this.onViewportChange?.();
  }

  private handlePointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.lastDragY = e.clientY;
    this.dragTotalY = 0;
    if (this.canvas !== null) this.canvas.setPointerCapture(e.pointerId);
  }

  private handlePointerMove(e: PointerEvent): void {
    const vp = this.canvasPos(e.clientX, e.clientY);

    if (this.isDragging) {
      const deltaClientY = e.clientY - this.lastDragY;
      this.lastDragY = e.clientY;
      this.dragTotalY += Math.abs(deltaClientY);

      const range = this.transform.getMaxValue() - this.transform.getMinValue();
      // Y-down canvas: drag DOWN (deltaClientY>0) → strip moves down → see lower values
      const stripDelta = (deltaClientY / this.height) * range;
      this.applyRange(
        this.transform.getMinValue() + stripDelta,
        this.transform.getMaxValue() + stripDelta,
      );
      this.onViewportChange?.();
    } else {
      this.updateHover(vp);
    }
  }

  private handlePointerUp(e: PointerEvent): void {
    this.isDragging = false;
    if (this.canvas !== null) this.canvas.releasePointerCapture(e.pointerId);
  }

  private handleClick(_e: MouseEvent): void {
    const timeSinceScroll = performance.now() - this.lastScrollTime;
    if (timeSinceScroll < SCROLL_CLICK_GUARD_MS) return;
    if (this.dragTotalY > DRAG_CLICK_GUARD_PX) {
      this.dragTotalY = 0;
      return;
    }

    // Only navigate if the pointer was hovering over a point
    if (this.hoveredSetId !== null) {
      this.onPointClick?.({ index: this.hoveredIndex, sigma: this.hoveredReal });
    }
  }

  // ── Hover ──────────────────────────────────────────────────────────────────

  private updateHover(vp: { x: number; y: number }): void {
    let minDist = HOVER_THRESHOLD_PX;
    let foundSetId: string | null = null;
    let foundCacheIdx = -1;
    let foundReal = 0;
    let foundIndex = 0;

    for (const set of this.pointSets) {
      const cache = this.visibleCache.get(set.id);
      if (cache === undefined) continue;
      for (let i = 0; i < cache.count; i++) {
        const dx = (cache.vx[i] ?? 0) - vp.x;
        const dy = (cache.vy[i] ?? 0) - vp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          foundSetId = set.id;
          foundCacheIdx = i;
          const ptIdx = cache.pi[i] ?? i;
          const pt = set.points[ptIdx];
          if (pt !== undefined) {
            foundReal = pt.real;
            foundIndex = pt.index;
          }
        }
      }
    }

    const changed = foundSetId !== this.hoveredSetId || foundCacheIdx !== this.hoveredCacheIdx;
    if (!changed) return;

    this.hoveredSetId = foundSetId;
    this.hoveredCacheIdx = foundCacheIdx;
    this.hoveredReal = foundReal;
    this.hoveredIndex = foundIndex;

    if (this.canvas !== null) {
      this.canvas.style.cursor = foundSetId !== null ? "pointer" : "crosshair";
    }
  }

  private clearHover(): void {
    if (this.hoveredSetId === null) return;
    this.hoveredSetId = null;
    this.hoveredCacheIdx = -1;
    if (this.canvas !== null) this.canvas.style.cursor = "crosshair";
  }

  // ── Range helpers ──────────────────────────────────────────────────────────

  private applyRange(minY: number, maxY: number): void {
    const floor = this.transform.getSpaceMode() === "imaginary" ? MIN_IMAG_VALUE : MIN_INDEX_VALUE;
    let lo = minY;
    let hi = maxY;
    if (lo < floor) {
      hi += floor - lo;
      lo = floor;
    }
    this.transform.setRange(lo, hi);
    this.rebuildVisibleCaches();
  }

  private animateTo(targetMin: number, targetMax: number, durationMs: number): void {
    const startMin = this.transform.getMinValue();
    const startMax = this.transform.getMaxValue();
    const startTime = performance.now();

    const step = (): void => {
      const t = Math.min(1, (performance.now() - startTime) / durationMs);
      const ease = t * t * (3 - 2 * t); // smoothstep
      this.applyRange(
        startMin + (targetMin - startMin) * ease,
        startMax + (targetMax - startMax) * ease,
      );
      this.onViewportChange?.();
      if (t < 1) this.animFrameHandle = requestAnimationFrame(step);
    };
    this.animFrameHandle = requestAnimationFrame(step);
  }
}

import * as THREE from "three";

import { clamp } from "@/shared/math/clamp";
import { RenderSignature } from "@/shared/rendering/renderSignature";
import type { SceneController } from "@/shared/visualization/contracts";

type ListenerCleanup = () => void;

/**
 * Idle canvases still redraw this often, so a change the signature cannot
 * see (or a GPU context restore) shows up within half a second.
 */
const SAFETY_REDRAW_MS = 500;
/** A rAF gap this long means the tab was hidden; redraw on return. */
const RESUME_GAP_MS = 250;

/** Which axes a modifier-free wheel gesture zooms. Shift still forces σ (X);
 *  Alt still forces T (Y). */
export type WheelZoomMode = "both" | "y" | "x";

/**
 * Decide which camera axes a wheel event should zoom.
 *
 * @returns `xOnly` / `yOnly` before the Strip-mode X lock is applied.
 */
export function resolveWheelZoomAxes(
  mode: WheelZoomMode,
  shiftKey: boolean,
  altKey: boolean,
): { xOnly: boolean; yOnly: boolean } {
  return {
    xOnly: shiftKey || (mode === "x" && !altKey),
    yOnly: altKey || (mode === "y" && !shiftKey),
  };
}

/**
 * Orthographic 2D scene controller with pan/zoom, resize/DPR handling, and a dedicated feature group.
 */
export class OrthographicPanZoomSceneController implements SceneController {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private disposed = false;
  private renderer: THREE.WebGLRenderer | null = null;
  // CPU wall time of the most recent renderer.render() call (draw submission;
  // GPU execution is asynchronous and not included).
  private lastRenderTimeMs = 0;
  private lastSizeCss: { width: number; height: number } = { width: 1, height: 1 };
  private baseHalfHeight = 5;
  /** Per-axis zoom factors. Plain wheel follows {@link wheelZoomMode}. */
  private zoomX = 1;
  private zoomY = 1;
  private wheelZoomMode: WheelZoomMode = "both";
  /** When set to "x", wheel zoom and drag pan ignore the X axis entirely.
   *  Used by Strip mode (σ axis fixed at [-1, 2]). */
  private axisLock: "x" | null = null;
  /** Per-axis zoom-out floor. Default 0.01 = generous zoom-out (~100× past
   *  the configured viewport) so the user is never stuck. Strip mode pins
   *  this at 1.0 to enforce its locked σ window. */
  private zoomOutFloor = 0.01;
  /** Per-axis zoom-in ceilings. Default 20000 each (deep microscope). Plane
   *  mode sets the X ceiling lower (overview-only on σ) but keeps Y high so
   *  the user can drill into individual T features. */
  private zoomInCeilingX = 20000;
  private zoomInCeilingY = 20000;
  /** Optional aspect lock — when set, the wheel handler overrides zoomY to
   *  whatever this function returns AFTER the cursor-anchored zoom, then
   *  re-anchors so the cursor pixel still maps to the same world point.
   *  Used by Circles mode to keep pixel_per_T = pixel_per_σ · I'(T_center). */
  private aspectLockTargetZoomY: (() => number) | null = null;
  private panX = 0;
  private panY = 0;
  /** `"orbit"` turns unmodified drag into yaw/pitch; Shift-drag still pans. */
  private dragMode: "pan" | "orbit" = "pan";
  private orbitDragListener: ((dx: number, dy: number) => void) | null = null;
  private orbitDragEndListener: (() => void) | null = null;
  /**
   * When set, a pan drag reports a world step (positive = right and up)
   * instead of moving the camera. Orbit drags do not call it.
   */
  private contentDragListener: ((worldDx: number, worldDy: number) => void) | null = null;
  private inputCleanup: ListenerCleanup | null = null;
  private frameListeners: Array<(time: number, deltaMs: number) => void> = [];
  private lastFrameTime: number | null = null;
  private readonly signature = new RenderSignature();
  private renderRequested = true;
  private lastDrawTime = Number.NEGATIVE_INFINITY;
  private drawCount = 0;
  /** When this returns false, pointer-drag does not pan (Big Sigma Shift-scrub). */
  private allowPan: (event: PointerEvent) => boolean = () => true;
  /** When this returns false, wheel/trackpad does not zoom or re-anchor pan. */
  private allowWheel: (event: WheelEvent) => boolean = () => true;
  /** Fired on every canvas pointer move and when the pointer leaves. */
  private pointerHoverListener: ((event: PointerEvent, overCanvas: boolean) => void) | null = null;
  private readonly cssProject = new THREE.Vector3();

  public readonly featureRoot: THREE.Group;

  public constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0d12);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.camera.position.set(0, 0, 20);
    this.camera.lookAt(0, 0, 0);

    this.featureRoot = new THREE.Group();
    this.scene.add(this.featureRoot);
  }

  /**
   * Gate pointer-drag panning. Shift-scrub on Big Sigma uses this so the
   * spiral stays put while σ and T follow the hovered zero.
   */
  public setAllowPan(fn: (event: PointerEvent) => boolean): void {
    this.allowPan = fn;
  }

  /**
   * Gate wheel / two-finger trackpad zoom. Big Sigma Shift-scrub uses this so
   * Shift+scroll does not change the spiral camera.
   */
  public setAllowWheel(fn: (event: WheelEvent) => boolean): void {
    this.allowWheel = fn;
  }

  /**
   * Pointer move over the canvas, including while a pan or orbit drag is
   * in progress. `overCanvas` is false on leave so a hover can clear.
   */
  public setPointerHoverListener(
    fn: ((event: PointerEvent, overCanvas: boolean) => void) | null,
  ): void {
    this.pointerHoverListener = fn;
  }

  /**
   * World point to CSS pixels for the current orthographic camera.
   * Used when an orbit has mixed Z into X/Y and the flat fit map no
   * longer matches the screen.
   */
  public projectWorldToCss(worldX: number, worldY: number, worldZ: number): { x: number; y: number } {
    this.camera.updateMatrixWorld();
    this.cssProject.set(worldX, worldY, worldZ);
    this.cssProject.project(this.camera);
    const { width, height } = this.lastSizeCss;
    return {
      x: (this.cssProject.x * 0.5 + 0.5) * width,
      y: (-this.cssProject.y * 0.5 + 0.5) * height,
    };
  }

  /**
   * Returns the group that feature modules should parent their objects under.
   */
  public getFeatureRoot(): THREE.Group {
    return this.featureRoot;
  }

  /**
   * {@inheritDoc SceneController.mount}
   */
  public mount(canvas: HTMLCanvasElement): void {
    if (this.disposed) {
      throw new Error("OrthographicPanZoomSceneController cannot be mounted after dispose");
    }
    if (this.renderer !== null) {
      throw new Error("OrthographicPanZoomSceneController is already mounted");
    }

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(1);

    const cleanups: ListenerCleanup[] = [];

    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      if (!this.allowWheel(event)) return;
      const rawFactor = Math.exp(-event.deltaY * 0.0015);
      const { xOnly, yOnly } = resolveWheelZoomAxes(
        this.wheelZoomMode,
        event.shiftKey,
        event.altKey,
      );
      const xLocked = this.axisLock === "x";
      const zoomXAxis = !xLocked && (xOnly || (!xOnly && !yOnly));
      const zoomYAxis = yOnly || (!xOnly && !yOnly) || xLocked;

      // Cursor anchor: world coordinates under the cursor *before* the zoom.
      // After we update the projection, the same cursor pixel is at a different
      // world point unless we shift pan by the delta — that's the anchor effect.
      const rect = canvas.getBoundingClientRect();
      const cssX = event.clientX - rect.left;
      const cssY = event.clientY - rect.top;
      const worldBeforeX = this.cssToWorldX(cssX);
      const worldBeforeY = this.cssToWorldY(cssY);

      // Effective zoom factor per axis. Clamp returns the *actual* applied
      // factor — important when we hit the zoom range limits, otherwise the
      // anchor drifts.
      const oldZoomX = this.zoomX;
      const oldZoomY = this.zoomY;
      // Mode-dependent zoom limits (see setZoomLimits):
      //   Strip mode → floor 1× / ceiling 20000× (deep zoom-in).
      //   Plane mode → floor 0.01× (can see way past viewport) / ceiling 200×.
      const floor = this.zoomOutFloor;
      if (zoomXAxis) this.zoomX = clamp(this.zoomX * rawFactor, floor, this.zoomInCeilingX);
      if (zoomYAxis) this.zoomY = clamp(this.zoomY * rawFactor, floor, this.zoomInCeilingY);

      // Apply the zoom change to the camera bounds *first* so cssToWorld
      // reads the new viewport. Without this step, worldAfter would equal
      // worldBefore and the anchor never shifts.
      this.updateProjection();

      // Now re-anchor: shift pan so the same cursor pixel maps back to the
      // pre-zoom world point. Only adjust an axis whose zoom actually changed
      // (clamping at the limits → no change → no anchor drift).
      if (zoomXAxis && this.zoomX !== oldZoomX) {
        const worldAfterX = this.cssToWorldX(cssX);
        this.panX += worldBeforeX - worldAfterX;
      }
      if (zoomYAxis && this.zoomY !== oldZoomY) {
        const worldAfterY = this.cssToWorldY(cssY);
        this.panY += worldBeforeY - worldAfterY;
      }
      this.updateProjection();

      // Aspect lock: override zoomY (after the cursor-anchored zoom is settled)
      // to the value demanded by the lock, then re-anchor Y so the cursor pixel
      // still maps to the same world point. This keeps Circles-mode zooming
      // from drifting the cursor anchor as the lock readjusts zoomY.
      if (this.aspectLockTargetZoomY !== null) {
        const target = this.aspectLockTargetZoomY();
        if (Number.isFinite(target) && target > 0) {
          const lockedY = clamp(target, floor, this.zoomInCeilingY);
          if (lockedY !== this.zoomY) {
            const worldBeforeLockY = this.cssToWorldY(cssY);
            this.zoomY = lockedY;
            this.updateProjection();
            const worldAfterLockY = this.cssToWorldY(cssY);
            this.panY += worldBeforeLockY - worldAfterLockY;
            this.updateProjection();
          }
        }
      }
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    cleanups.push(() => {
      canvas.removeEventListener("wheel", onWheel);
    });

    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (event: PointerEvent): void => {
      if (!this.allowPan(event)) return;
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent): void => {
      if (!dragging || !this.allowPan(event)) {
        this.pointerHoverListener?.(event, true);
        return;
      }
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;

      const { width, height } = this.lastSizeCss;
      const worldPerPixelX = (this.camera.right - this.camera.left) / Math.max(1, width);
      const worldPerPixelY = (this.camera.top - this.camera.bottom) / Math.max(1, height);

      if (this.dragMode === "orbit" && !event.shiftKey) {
        this.orbitDragListener?.(dx, dy);
        this.pointerHoverListener?.(event, true);
        return;
      }

      if (this.contentDragListener !== null) {
        this.contentDragListener(dx * worldPerPixelX, -dy * worldPerPixelY);
        this.pointerHoverListener?.(event, true);
        return;
      }

      if (this.axisLock !== "x") this.panX -= dx * worldPerPixelX;
      this.panY += dy * worldPerPixelY;
      this.updateProjection();
      this.pointerHoverListener?.(event, true);
    };

    const endDrag = (event: PointerEvent): void => {
      const wasDragging = dragging;
      dragging = false;
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer may already be released; ignore.
      }
      if (wasDragging && this.dragMode === "orbit") {
        this.orbitDragEndListener?.();
      }
    };

    const onPointerLeave = (event: PointerEvent): void => {
      this.pointerHoverListener?.(event, false);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("pointerleave", onPointerLeave);

    cleanups.push(() => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    });

    this.inputCleanup = (): void => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }

  /**
   * {@inheritDoc SceneController.resize}
   */
  public resize(width: number, height: number, dpr: number): void {
    if (this.renderer === null) {
      return;
    }

    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    this.lastSizeCss = { width: safeWidth, height: safeHeight };

    const clampedDpr = clamp(dpr, 0.5, 3);
    this.renderer.setPixelRatio(clampedDpr);
    this.renderer.setSize(safeWidth, safeHeight, false);
    this.updateProjection();
    this.renderRequested = true;
  }

  /** Returns the current orthographic camera bounds in world coordinates. */
  public getCameraBounds(): { left: number; right: number; top: number; bottom: number } {
    return {
      left: this.camera.left,
      right: this.camera.right,
      top: this.camera.top,
      bottom: this.camera.bottom,
    };
  }

  /** Returns the current canvas size in CSS pixels. */
  public getCanvasSize(): { width: number; height: number } {
    return { ...this.lastSizeCss };
  }

  /**
   * Sets the pan position (world coordinates center).
   */
  public setPan(x: number, y: number): void {
    this.panX = x;
    this.panY = y;
    this.updateProjection();
  }

  /** Reset both pan and zoom to defaults (origin, 1×). */
  public resetView(): void {
    this.panX = 0;
    this.panY = 0;
    this.zoomX = 1;
    this.zoomY = 1;
    this.updateProjection();
  }

  /** Reset only the σ-axis (X) pan and zoom to defaults; leave T unchanged. */
  public resetXAxis(): void {
    this.panX = 0;
    this.zoomX = 1;
    this.updateProjection();
  }

  /** Engage or release the σ-axis lock. When `"x"`, wheel and drag pan
   *  ignore the X axis entirely (Strip mode). */
  public setAxisLock(lock: "x" | null): void {
    this.axisLock = lock;
  }

  /** Current σ-axis lock. */
  public getAxisLock(): "x" | null {
    return this.axisLock;
  }

  /**
   * Plain-wheel zoom axes. `"both"` is the historical default; `"y"` is
   * T-only so a tall harvest can be inspected without also collapsing σ.
   */
  public setWheelZoomMode(mode: WheelZoomMode): void {
    this.wheelZoomMode = mode;
  }

  /**
   * 2D pan vs 3D orbit. Orbit uses {@link setOrbitDragListener}; Shift-drag
   * still pans so the harvest can be recentered without leaving 3D.
   */
  public setDragMode(mode: "pan" | "orbit"): void {
    this.dragMode = mode;
  }

  /** Pixel deltas from an unmodified 3D drag (positive X = yaw right). */
  public setOrbitDragListener(cb: ((dx: number, dy: number) => void) | null): void {
    this.orbitDragListener = cb;
  }

  /** Persist hook after an orbit drag ends. */
  public setOrbitDragEndListener(cb: (() => void) | null): void {
    this.orbitDragEndListener = cb;
  }

  /**
   * Replace camera pan with a content translation. `null` restores pan.
   * The callback receives the world step a pan would have used, with
   * positive Y up so the caller can add it to data coordinates.
   */
  public setContentDragListener(
    cb: ((worldDx: number, worldDy: number) => void) | null,
  ): void {
    this.contentDragListener = cb;
  }

  /** Widen the far plane so a rotated 3D cloud is not clipped. */
  public setCameraFar(far: number): void {
    this.camera.far = Math.max(this.camera.near + 1, far);
    this.camera.updateProjectionMatrix();
  }

  /** Current plain-wheel zoom mode. */
  public getWheelZoomMode(): WheelZoomMode {
    return this.wheelZoomMode;
  }

  /** Current zoom-out floor (both axes). */
  public getZoomOutFloor(): number {
    return this.zoomOutFloor;
  }

  /** Set the zoom-out floor (minimum allowed zoom factor). 1.0 = pinned to
   *  the configured viewport; <1 = can zoom out past it. Applies to both
   *  axes simultaneously since the per-mode use cases (Strip / Plane) want
   *  symmetric behavior. */
  public setZoomOutFloor(floor: number): void {
    this.zoomOutFloor = Math.max(1e-6, floor);
  }

  /** Set per-axis zoom-in ceilings. Plane mode sets a lower X ceiling
   *  (σ-axis overview only) and a high Y ceiling (deep T-axis inspection). */
  public setZoomInCeiling(ceilingX: number, ceilingY: number = ceilingX): void {
    this.zoomInCeilingX = Math.max(1, ceilingX);
    this.zoomInCeilingY = Math.max(1, ceilingY);
  }

  /** Pan/zoom so the given local-space rectangle fills the screen with a
   *  margin. Used by the "Zoom to" button to fit all loaded points. Respects
   *  the active X-axis lock (Strip mode) by leaving X pan/zoom untouched. */
  public zoomToLocalBox(
    localXMin: number,
    localXMax: number,
    localYMin: number,
    localYMax: number,
    margin: number = 1.1,
  ): void {
    const { width, height } = this.lastSizeCss;
    const aspect = width / Math.max(1, height);
    const xSpan = Math.max(1e-9, Math.abs(localXMax - localXMin));
    const ySpan = Math.max(1e-9, Math.abs(localYMax - localYMin));
    const cx = 0.5 * (localXMin + localXMax);
    const cy = 0.5 * (localYMin + localYMax);
    // Visible local span at zoom Z: X = 2 * baseHalfHeight * aspect / zoomX,
    // Y = 2 * baseHalfHeight / zoomY. Solve for zoom that fits with margin.
    const zoomXFit = (2 * this.baseHalfHeight * aspect) / (xSpan * margin);
    const zoomYFit = (2 * this.baseHalfHeight) / (ySpan * margin);
    if (this.axisLock !== "x") {
      this.zoomX = clamp(zoomXFit, this.zoomOutFloor, this.zoomInCeilingX);
      this.panX = cx;
    }
    this.zoomY = clamp(zoomYFit, this.zoomOutFloor, this.zoomInCeilingY);
    this.panY = cy;
    this.updateProjection();
  }

  /** Programmatically set just the Y pan (Strip-mode scrollbar uses this). */
  public setPanY(y: number): void {
    this.panY = y;
    this.updateProjection();
  }

  /** Current Y zoom factor — used by Strip-mode scrollbar to size its knob. */
  public getZoomY(): number {
    return this.zoomY;
  }

  /** Current X zoom factor — used by Circles-mode frame loop to lock the Y
   *  zoom relative to the X zoom each frame. */
  public getZoomX(): number {
    return this.zoomX;
  }

  /** Programmatically override the Y zoom factor. Used by Circles-mode to
   *  keep visual_pixel_per_T = visual_pixel_per_σ · I'(T_center). */
  public setZoomY(z: number): void {
    this.zoomY = Math.max(1e-6, z);
    this.updateProjection();
  }

  /** Programmatically set both X and Y zoom factors. */
  public setZoom(zoomX: number, zoomY: number): void {
    this.zoomX = Math.max(1e-6, zoomX);
    this.zoomY = Math.max(1e-6, zoomY);
    this.updateProjection();
  }

  /** Current drag mode ("pan" or "orbit"). */
  public getDragMode(): "pan" | "orbit" {
    return this.dragMode;
  }

  /** Current per-axis zoom-in ceilings. */
  public getZoomInCeiling(): { x: number; y: number } {
    return { x: this.zoomInCeilingX, y: this.zoomInCeilingY };
  }

  /** Current orthographic far plane distance. */
  public getCameraFar(): number {
    return this.camera.far;
  }

  /** Engage an aspect lock — every wheel zoom calls `fn()` after applying the
   *  cursor-anchored zoom, then sets zoomY to the returned value and re-anchors
   *  so the cursor pixel still maps to its original world point. Pass `null`
   *  to release the lock. */
  public setAspectLockTargetZoomY(fn: (() => number) | null): void {
    this.aspectLockTargetZoomY = fn;
  }

  /** Current local-X pan position. */
  public getPanX(): number {
    return this.panX;
  }

  /** Current local-Y pan position. */
  public getPanY(): number {
    return this.panY;
  }

  /**
   * Sets the view rotation in radians (rotation around z-axis for 2D view).
   */
  public setViewRotation(angleRadians: number): void {
    this.featureRoot.rotation.z = angleRadians;
  }

  /** Mirror the whole scene vertically (scale.y = −1). Used by camera frames
   *  that need a reflection rather than a rotation to avoid a flip. */
  public setViewFlipY(flip: boolean): void {
    this.featureRoot.scale.y = flip ? -1 : 1;
  }

  /**
   * Registers a per-frame callback that receives (time, deltaMs). Returns an unsubscribe function.
   */
  public addFrameListener(cb: (time: number, deltaMs: number) => void): () => void {
    this.frameListeners.push(cb);
    return () => {
      this.frameListeners = this.frameListeners.filter((l) => l !== cb);
    };
  }

  /**
   * {@inheritDoc SceneController.frame}
   */
  public frame(time: number): void {
    if (this.renderer === null) {
      return;
    }
    const gapMs = this.lastFrameTime !== null ? time - this.lastFrameTime : 0;
    const deltaMs = this.lastFrameTime !== null ? Math.min(gapMs, 100) : 16.667;
    this.lastFrameTime = time;
    if (gapMs > RESUME_GAP_MS) this.renderRequested = true;
    for (const cb of this.frameListeners) {
      cb(time, deltaMs);
    }
    const sceneChanged = this.sceneChangedSinceLastCheck();
    const stale = time - this.lastDrawTime >= SAFETY_REDRAW_MS;
    if (!sceneChanged && !this.renderRequested && !stale) return;
    const renderStart = performance.now();
    this.drawFrame(this.renderer, this.scene, this.camera);
    this.lastRenderTimeMs = performance.now() - renderStart;
    this.renderRequested = false;
    this.lastDrawTime = time;
    this.drawCount += 1;
    // onBeforeRender hooks (screen-fixed labels) may rescale objects during
    // the draw; absorb those edits so they do not trigger another frame.
    this.sceneChangedSinceLastCheck();
  }

  /** Draw on the next animation frame even if the scene looks unchanged. */
  public requestRender(): void {
    this.renderRequested = true;
  }

  /** Frames actually drawn. Idle frames that skip the draw do not count. */
  public getDrawCount(): number {
    return this.drawCount;
  }

  /**
   * Capture the camera and scene and compare with the previous capture.
   * True when anything that affects the picture has changed.
   */
  public sceneChangedSinceLastCheck(): boolean {
    const signature = this.signature;
    signature.begin();
    signature.addCamera(this.camera);
    signature.addObject(this.scene);
    this.addToSignature(signature);
    return signature.end();
  }

  /**
   * Subclasses that draw more than the main scene (a second scene, a
   * backdrop camera, flags that change the pass order) add that state here.
   */
  protected addToSignature(_signature: RenderSignature): void {
    // Base controller draws only `scene` with `camera`.
  }

  /**
   * Single color pass. Subclasses can draw a camera-locked backdrop first,
   * then the pan/zoom scene without clearing color.
   */
  protected drawFrame(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ): void {
    renderer.render(scene, camera);
  }

  /**
   * CPU time of the most recent draw submission (renderer.render), in ms.
   */
  public getLastRenderTimeMs(): number {
    return this.lastRenderTimeMs;
  }

  /**
   * {@inheritDoc SceneController.dispose}
   */
  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (this.inputCleanup !== null) {
      this.inputCleanup();
      this.inputCleanup = null;
    }

    if (this.renderer !== null) {
      this.renderer.dispose();
      this.renderer = null;
    }

    this.disposeObject3D(this.featureRoot);
    this.scene.clear();
  }

  /**
   * Canvas CSS pixels (origin top-left) to world XY. Used for hover/click
   * picking so pixel radius stays stable when σ and T are scaled differently.
   */
  public worldFromCss(cssX: number, cssY: number): { x: number; y: number } {
    return { x: this.cssToWorldX(cssX), y: this.cssToWorldY(cssY) };
  }

  /** Convert a CSS-pixel X coord (relative to canvas) to world X. */
  private cssToWorldX(cssX: number): number {
    const { width } = this.lastSizeCss;
    const fx = cssX / Math.max(1, width); // [0..1]
    return this.camera.left + fx * (this.camera.right - this.camera.left);
  }

  /** Convert a CSS-pixel Y coord (relative to canvas) to world Y (Y-flip applied). */
  private cssToWorldY(cssY: number): number {
    const { height } = this.lastSizeCss;
    const fy = cssY / Math.max(1, height);
    return this.camera.top - fy * (this.camera.top - this.camera.bottom);
  }

  private updateProjection(): void {
    const { width, height } = this.lastSizeCss;
    const aspect = width / height;
    const halfH = this.baseHalfHeight / this.zoomY;
    const halfW = (this.baseHalfHeight * aspect) / this.zoomX;

    this.camera.left = this.panX - halfW;
    this.camera.right = this.panX + halfW;
    this.camera.top = this.panY + halfH;
    this.camera.bottom = this.panY - halfH;
    this.camera.updateProjectionMatrix();
  }

  private disposeObject3D(root: THREE.Object3D): void {
    root.traverse((object: THREE.Object3D) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const material = object.material;
        if (Array.isArray(material)) {
          for (const m of material) {
            m.dispose();
          }
        } else {
          material.dispose();
        }
      } else if (object instanceof THREE.Line) {
        object.geometry.dispose();
        const material = object.material;
        if (Array.isArray(material)) {
          for (const m of material) {
            m.dispose();
          }
        } else {
          material.dispose();
        }
      } else if (object instanceof THREE.Points) {
        object.geometry.dispose();
        const material = object.material;
        if (!Array.isArray(material)) {
          material.dispose();
        }
      }
    });
  }
}

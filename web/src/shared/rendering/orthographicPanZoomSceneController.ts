import * as THREE from "three";

import { clamp } from "@/shared/math/clamp";
import type { SceneController } from "@/shared/visualization/contracts";

type ListenerCleanup = () => void;

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
  /** Per-axis zoom factors. Plain wheel scales both; modifier-keyed wheels each. */
  private zoomX = 1;
  private zoomY = 1;
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
  private inputCleanup: ListenerCleanup | null = null;
  private frameListeners: Array<(time: number, deltaMs: number) => void> = [];
  private lastFrameTime: number | null = null;

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
      const rawFactor = Math.exp(-event.deltaY * 0.0015);
      // Modifier-keyed per-axis zoom: Shift → σ (X) only; Alt → T (Y) only.
      // Plain wheel still zooms both for backwards-compatible UX.
      const xOnly = event.shiftKey;
      const yOnly = event.altKey;
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
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent): void => {
      if (!dragging) {
        return;
      }
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;

      const { width, height } = this.lastSizeCss;
      const worldPerPixelX = (this.camera.right - this.camera.left) / Math.max(1, width);
      const worldPerPixelY = (this.camera.top - this.camera.bottom) / Math.max(1, height);

      if (this.axisLock !== "x") this.panX -= dx * worldPerPixelX;
      this.panY += dy * worldPerPixelY;
      this.updateProjection();
    };

    const endDrag = (event: PointerEvent): void => {
      dragging = false;
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer may already be released; ignore.
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    cleanups.push(() => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
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
    const deltaMs = this.lastFrameTime !== null ? Math.min(time - this.lastFrameTime, 100) : 16.667;
    this.lastFrameTime = time;
    for (const cb of this.frameListeners) {
      cb(time, deltaMs);
    }
    const renderStart = performance.now();
    this.renderer.render(this.scene, this.camera);
    this.lastRenderTimeMs = performance.now() - renderStart;
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

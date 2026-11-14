import * as THREE from "three";

import { BIG_SIGMA_LINK_CONTROL_COLOR } from "@/features/big-sigma/bigSigmaLinkColor";
import { DEFAULT_SPECTRUM_FEATHER, quarterSpectrumHex } from "@/features/zeros-of-f/fracToHue";
import type { ZerosTabViewMode } from "@/features/zeros-of-f/types";
import type { Point2 } from "@/shared/io/types";
import {
  bigSigmaWorldScale,
  computeBigSigmaGeometry,
  pointsMaxRadius,
  scalePoints,
  type BigSigmaChainExtent,
  type BigSigmaRemainder,
} from "@/shared/math/bigSigmaSpiral";
import { zerosOverlayOpacity } from "@/shared/math/bigSigmaZerosWindow";
import { spiralMiddleIndex } from "@/shared/math/zetaEms";
import {
  OrthographicPanZoomSceneController,
  type WheelZoomMode,
} from "@/shared/rendering/orthographicPanZoomSceneController";
import type { RenderSignature } from "@/shared/rendering/renderSignature";

const R1AK_COLOR = 0xffffff;
const BACKDROP_BG_HEX = 0x0b0d12;
const BASE_HALF_HEIGHT = 5;
const HOVER_RING_SIZE_PX = 7;
const CLICK_GUARD_PX = 6;
/** Cap on EMS "entire" link count so high-T AK zeros (T ~ 320,000) never stall. */
const ENTIRE_LINKS_SAFE_CAP = 250_000;

type SavedCameraState = {
  panX: number;
  panY: number;
  zoomX: number;
  zoomY: number;
  axisLock: "x" | null;
  wheelZoomMode: WheelZoomMode;
  zoomOutFloor: number;
  zoomInCeilingX: number;
  zoomInCeilingY: number;
  dragMode: "pan" | "orbit";
  cameraFar: number;
};

let SUM_RING_SPRITE: THREE.CanvasTexture | null = null;

function getSumRingSprite(): THREE.CanvasTexture {
  if (SUM_RING_SPRITE !== null) return SUM_RING_SPRITE;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = import.meta.env.MODE === "test" ? null : canvas.getContext("2d");
  if (ctx !== null) {
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  SUM_RING_SPRITE = tex;
  return tex;
}

function clearLineGroup(group: THREE.Group): void {
  while (group.children.length > 0) {
    const child = group.children[0]!;
    group.remove(child);
    if (child instanceof THREE.Line) {
      child.geometry.dispose();
      const mat = child.material;
      if (!Array.isArray(mat)) mat.dispose();
    }
  }
}

function addPolyline(pts: Point2[], color: number, group: THREE.Group): void {
  if (pts.length < 2) return;
  const positions = new Float32Array(pts.length * 3);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = 0;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  group.add(new THREE.Line(geom, new THREE.LineBasicMaterial({ color })));
}

export type SumSpiralRenderParams = {
  sigma: number;
  index: number;
  showR1ak: boolean;
  zerosDimmer: number;
  chainExtent: BigSigmaChainExtent;
  showCrosshair: boolean;
  chainFromZero: boolean;
  lastLinksOnly: boolean;
  lastLinksCount: number;
  remainder: BigSigmaRemainder;
  spectrumFeather: number;
  crosshairNdcX: number;
  crosshairNdcY: number;
};

/**
 * Dual-plane scene controller for the zeros-of-f workspace:
 *  - In `"zeros"` view, behaves identically to {@link OrthographicPanZoomSceneController}.
 *  - In `"sum"` view, locks the zeros scene onto a frozen orthographic camera,
 *    overlays the dimmer, full-bleed white (σ, T) crosshair, and bright hover ring,
 *    and routes interactive pan/zoom onto a separate spiral plane (matching Big Sigma).
 */
export class ZerosOfFSceneController extends OrthographicPanZoomSceneController {
  private viewMode: ZerosTabViewMode = "zeros";
  private readonly frozenZerosCamera: THREE.OrthographicCamera;
  private readonly overlayScene = new THREE.Scene();
  private readonly ndcCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
  private readonly dimmerMesh: THREE.Mesh;
  private readonly dimmerMat: THREE.MeshBasicMaterial;
  private readonly vCrosshairLine: THREE.Line;
  private readonly hCrosshairLine: THREE.Line;
  private readonly crosshairMat: THREE.LineBasicMaterial;
  private readonly sumHoverPoints: THREE.Points;
  private readonly sumHoverPosAttr: THREE.BufferAttribute;
  private readonly sumHoverColorAttr: THREE.BufferAttribute;
  private readonly sumScene = new THREE.Scene();
  private readonly sumSpiralGroup = new THREE.Group();

  private savedZerosState: SavedCameraState = {
    panX: 0,
    panY: 0,
    zoomX: 1,
    zoomY: 1,
    axisLock: null,
    wheelZoomMode: "y",
    zoomOutFloor: 0.01,
    zoomInCeilingX: 20000,
    zoomInCeilingY: 20000,
    dragMode: "pan",
    cameraFar: 200,
  };

  private savedSumState = {
    panX: 0,
    panY: 0,
    zoomX: 1,
    zoomY: 1,
  };

  private sumParams: SumSpiralRenderParams = {
    sigma: 0.5,
    index: 6.18,
    showR1ak: true,
    zerosDimmer: 0.25,
    chainExtent: "floorT",
    showCrosshair: true,
    chainFromZero: false,
    lastLinksOnly: false,
    lastLinksCount: 2,
    remainder: "ak",
    spectrumFeather: DEFAULT_SPECTRUM_FEATHER,
    crosshairNdcX: 0,
    crosshairNdcY: 0,
  };

  private sumDirty = true;
  private readonly ndcScratch = new THREE.Vector3();
  private pointerDownX = 0;
  private pointerDownY = 0;
  private sumPickCleanup: (() => void) | null = null;
  private onSumPointerPick: ((cssX: number, cssY: number) => void) | null = null;

  public constructor() {
    super();
    this.frozenZerosCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.frozenZerosCamera.position.set(0, 0, 20);
    this.frozenZerosCamera.lookAt(0, 0, 0);

    const quadGeom = new THREE.PlaneGeometry(2, 2);
    this.dimmerMat = new THREE.MeshBasicMaterial({
      color: BACKDROP_BG_HEX,
      transparent: true,
      opacity: 0.75,
      depthTest: false,
      depthWrite: false,
    });
    this.dimmerMesh = new THREE.Mesh(quadGeom, this.dimmerMat);
    this.dimmerMesh.position.set(0, 0, -0.5);
    this.dimmerMesh.frustumCulled = false;
    this.overlayScene.add(this.dimmerMesh);

    this.crosshairMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
    });
    this.vCrosshairLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(0, 1, 0),
      ]),
      this.crosshairMat,
    );
    this.hCrosshairLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(1, 0, 0),
      ]),
      this.crosshairMat,
    );
    this.vCrosshairLine.frustumCulled = false;
    this.hCrosshairLine.frustumCulled = false;
    this.overlayScene.add(this.vCrosshairLine);
    this.overlayScene.add(this.hCrosshairLine);

    const hoverGeom = new THREE.BufferGeometry();
    this.sumHoverPosAttr = new THREE.BufferAttribute(new Float32Array(3), 3);
    this.sumHoverColorAttr = new THREE.BufferAttribute(new Float32Array([1, 1, 1]), 3);
    hoverGeom.setAttribute("position", this.sumHoverPosAttr);
    hoverGeom.setAttribute("color", this.sumHoverColorAttr);
    const hoverMat = new THREE.PointsMaterial({
      vertexColors: true,
      size: HOVER_RING_SIZE_PX,
      sizeAttenuation: false,
      map: getSumRingSprite(),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: 1,
    });
    this.sumHoverPoints = new THREE.Points(hoverGeom, hoverMat);
    this.sumHoverPoints.visible = false;
    this.sumHoverPoints.frustumCulled = false;
    this.overlayScene.add(this.sumHoverPoints);

    this.sumScene.add(this.sumSpiralGroup);
  }

  public getViewMode(): ZerosTabViewMode {
    return this.viewMode;
  }

  /**
   * Switch between `"zeros"` view (pan/tilt/zoom acts on zeros) and `"sum"`
   * view (zeros camera frozen in place; pan/zoom acts on the spiral plane).
   */
  public setViewMode(mode: ZerosTabViewMode): void {
    if (this.viewMode === mode) return;
    if (mode === "sum") {
      const ceilings = this.getZoomInCeiling();
      this.savedZerosState = {
        panX: this.getPanX(),
        panY: this.getPanY(),
        zoomX: this.getZoomX(),
        zoomY: this.getZoomY(),
        axisLock: this.getAxisLock(),
        wheelZoomMode: this.getWheelZoomMode(),
        zoomOutFloor: this.getZoomOutFloor(),
        zoomInCeilingX: ceilings.x,
        zoomInCeilingY: ceilings.y,
        dragMode: this.getDragMode(),
        cameraFar: this.getCameraFar(),
      };
      this.syncFrozenZerosCamera();

      this.viewMode = "sum";
      super.setAxisLock(null);
      super.setZoomOutFloor(0.01);
      super.setZoomInCeiling(20000, 20000);
      super.setWheelZoomMode("both");
      super.setDragMode("pan");
      super.setCameraFar(200);
      super.setPan(this.savedSumState.panX, this.savedSumState.panY);
      super.setZoom(this.savedSumState.zoomX, this.savedSumState.zoomY);
      this.setAllowPan((event) => !event.shiftKey);
      this.setAllowWheel((event) => !event.shiftKey);
      this.sumDirty = true;
      this.requestRender();
      return;
    }

    // Returning from "sum" back to "zeros": save spiral pan/zoom, restore zeros camera.
    this.savedSumState = {
      panX: this.getPanX(),
      panY: this.getPanY(),
      zoomX: this.getZoomX(),
      zoomY: this.getZoomY(),
    };
    this.viewMode = "zeros";
    this.hideSumHoverRing();
    this.setAllowPan(() => true);
    this.setAllowWheel(() => true);
    super.setAxisLock(this.savedZerosState.axisLock);
    super.setZoomOutFloor(this.savedZerosState.zoomOutFloor);
    super.setZoomInCeiling(
      this.savedZerosState.zoomInCeilingX,
      this.savedZerosState.zoomInCeilingY,
    );
    super.setWheelZoomMode(this.savedZerosState.wheelZoomMode);
    super.setDragMode(this.savedZerosState.dragMode);
    super.setCameraFar(this.savedZerosState.cameraFar);
    super.setPan(this.savedZerosState.panX, this.savedZerosState.panY);
    super.setZoom(this.savedZerosState.zoomX, this.savedZerosState.zoomY);
    this.requestRender();
  }

  public override setDragMode(mode: "pan" | "orbit"): void {
    if (this.viewMode === "sum") {
      this.savedZerosState.dragMode = mode;
      return;
    }
    super.setDragMode(mode);
  }

  public override setCameraFar(far: number): void {
    if (this.viewMode === "sum") {
      this.savedZerosState.cameraFar = Math.max(this.frozenZerosCamera.near + 1, far);
      this.frozenZerosCamera.far = this.savedZerosState.cameraFar;
      this.frozenZerosCamera.updateProjectionMatrix();
      this.requestRender();
      return;
    }
    super.setCameraFar(far);
  }

  public override resize(width: number, height: number, dpr: number): void {
    super.resize(width, height, dpr);
    if (this.viewMode === "sum") {
      this.syncFrozenZerosCamera();
    }
  }

  /**
   * Orthographic bounds of the zeros plane (frozen while in `"sum"` view).
   */
  public getZerosCameraBounds(): { left: number; right: number; top: number; bottom: number } {
    if (this.viewMode === "sum") {
      return {
        left: this.frozenZerosCamera.left,
        right: this.frozenZerosCamera.right,
        top: this.frozenZerosCamera.top,
        bottom: this.frozenZerosCamera.bottom,
      };
    }
    return this.getCameraBounds();
  }

  /**
   * Project a world-space point on the zeros plane into NDC `[-1, 1]²`.
   */
  public projectZerosWorldToNdc(worldX: number, worldY: number, worldZ: number): { x: number; y: number } {
    if (this.viewMode === "sum") {
      this.frozenZerosCamera.updateMatrixWorld();
      this.ndcScratch.set(worldX, worldY, worldZ);
      this.ndcScratch.project(this.frozenZerosCamera);
      return { x: this.ndcScratch.x, y: this.ndcScratch.y };
    }
    const { width, height } = this.getCanvasSize();
    const css = this.projectWorldToCss(worldX, worldY, worldZ);
    return {
      x: (css.x / Math.max(1, width)) * 2 - 1,
      y: 1 - (css.y / Math.max(1, height)) * 2,
    };
  }

  /**
   * Project a world-space point on the zeros plane into canvas CSS pixels.
   */
  public projectZerosWorldToCss(worldX: number, worldY: number, worldZ: number): { x: number; y: number } {
    if (this.viewMode === "sum") {
      const ndc = this.projectZerosWorldToNdc(worldX, worldY, worldZ);
      const { width, height } = this.getCanvasSize();
      return {
        x: (ndc.x * 0.5 + 0.5) * width,
        y: (-ndc.y * 0.5 + 0.5) * height,
      };
    }
    return this.projectWorldToCss(worldX, worldY, worldZ);
  }

  public setOnSumPointerPick(cb: ((cssX: number, cssY: number) => void) | null): void {
    this.onSumPointerPick = cb;
  }

  /**
   * Update spiral parameters and the projected crosshair position for `"sum"` view.
   */
  public setSumParams(next: SumSpiralRenderParams): void {
    const prev = this.sumParams;
    const geomChanged =
      prev.sigma !== next.sigma
      || prev.index !== next.index
      || prev.showR1ak !== next.showR1ak
      || prev.chainExtent !== next.chainExtent
      || prev.chainFromZero !== next.chainFromZero
      || prev.lastLinksOnly !== next.lastLinksOnly
      || prev.lastLinksCount !== next.lastLinksCount
      || prev.remainder !== next.remainder
      || prev.spectrumFeather !== next.spectrumFeather;
    this.sumParams = next;
    if (geomChanged) this.sumDirty = true;
    this.updateCrosshairLines();
    if (this.viewMode === "sum") this.requestRender();
  }

  public showSumHoverRing(cssX: number, cssY: number, r: number, g: number, b: number): void {
    const { width, height } = this.getCanvasSize();
    const ndcX = (cssX / Math.max(1, width)) * 2 - 1;
    const ndcY = 1 - (cssY / Math.max(1, height)) * 2;
    const pos = this.sumHoverPosAttr.array;
    pos[0] = ndcX;
    pos[1] = ndcY;
    pos[2] = 0.1;
    this.sumHoverPosAttr.needsUpdate = true;
    const col = this.sumHoverColorAttr.array;
    col[0] = r;
    col[1] = g;
    col[2] = b;
    this.sumHoverColorAttr.needsUpdate = true;
    this.sumHoverPoints.visible = true;
    if (this.viewMode === "sum") this.requestRender();
  }

  public hideSumHoverRing(): void {
    if (!this.sumHoverPoints.visible) return;
    this.sumHoverPoints.visible = false;
    if (this.viewMode === "sum") this.requestRender();
  }

  public override mount(canvas: HTMLCanvasElement): void {
    super.mount(canvas);
    const cssCoords = (event: PointerEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const onDown = (event: PointerEvent): void => {
      this.pointerDownX = event.clientX;
      this.pointerDownY = event.clientY;
      if (this.viewMode === "sum" && event.shiftKey) {
        canvas.setPointerCapture(event.pointerId);
        const { x, y } = cssCoords(event);
        this.onSumPointerPick?.(x, y);
      }
    };
    const onMove = (event: PointerEvent): void => {
      if (this.viewMode === "sum" && event.shiftKey && (event.buttons & 1) !== 0) {
        const { x, y } = cssCoords(event);
        this.onSumPointerPick?.(x, y);
      }
    };
    const onUp = (event: PointerEvent): void => {
      if (this.viewMode !== "sum" || event.shiftKey) return;
      const dx = event.clientX - this.pointerDownX;
      const dy = event.clientY - this.pointerDownY;
      if (dx * dx + dy * dy > CLICK_GUARD_PX * CLICK_GUARD_PX) return;
      const { x, y } = cssCoords(event);
      this.onSumPointerPick?.(x, y);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    this.sumPickCleanup = (): void => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
    };
  }

  public override dispose(): void {
    this.sumPickCleanup?.();
    this.sumPickCleanup = null;
    clearLineGroup(this.sumSpiralGroup);
    this.dimmerMesh.geometry.dispose();
    this.dimmerMat.dispose();
    this.vCrosshairLine.geometry.dispose();
    this.hCrosshairLine.geometry.dispose();
    this.crosshairMat.dispose();
    this.sumHoverPoints.geometry.dispose();
    const hoverMat = this.sumHoverPoints.material;
    if (!Array.isArray(hoverMat)) hoverMat.dispose();
    this.overlayScene.clear();
    this.sumScene.clear();
    super.dispose();
  }

  public override frame(time: number): void {
    if (this.viewMode === "sum" && this.sumDirty) {
      this.rebuildSumSpiral();
      this.sumDirty = false;
    }
    super.frame(time);
  }

  protected override addToSignature(signature: RenderSignature): void {
    signature.push(this.viewMode === "sum" ? 1 : 0);
    if (this.viewMode !== "sum") return;
    signature.addCamera(this.frozenZerosCamera);
    signature.addObject(this.overlayScene);
    signature.addObject(this.sumScene);
    signature.push(this.sumParams.zerosDimmer);
    signature.push(this.sumParams.showCrosshair ? 1 : 0);
    signature.push(this.sumParams.crosshairNdcX);
    signature.push(this.sumParams.crosshairNdcY);
    signature.push(this.sumParams.sigma);
    signature.push(this.sumParams.index);
  }

  protected override drawFrame(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ): void {
    if (this.viewMode !== "sum") {
      super.drawFrame(renderer, scene, camera);
      return;
    }

    const dimOpacity = zerosOverlayOpacity(this.sumParams.zerosDimmer);
    if (dimOpacity > 0) {
      renderer.autoClear = true;
      renderer.render(scene, this.frozenZerosCamera);
      this.dimmerMesh.visible = dimOpacity < 1;
      this.dimmerMat.opacity = 1 - dimOpacity;
    } else {
      renderer.setClearColor(BACKDROP_BG_HEX, 1);
      renderer.clear(true, true, false);
      this.dimmerMesh.visible = false;
    }

    const previousBackground = scene.background;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.overlayScene, this.ndcCamera);
    renderer.clearDepth();
    renderer.render(this.sumScene, camera);
    scene.background = previousBackground;
    renderer.autoClear = true;
  }

  private syncFrozenZerosCamera(): void {
    const { width, height } = this.getCanvasSize();
    const aspect = width / Math.max(1, height);
    const halfH = BASE_HALF_HEIGHT / Math.max(1e-6, this.savedZerosState.zoomY);
    const halfW = (BASE_HALF_HEIGHT * aspect) / Math.max(1e-6, this.savedZerosState.zoomX);
    this.frozenZerosCamera.left = this.savedZerosState.panX - halfW;
    this.frozenZerosCamera.right = this.savedZerosState.panX + halfW;
    this.frozenZerosCamera.top = this.savedZerosState.panY + halfH;
    this.frozenZerosCamera.bottom = this.savedZerosState.panY - halfH;
    this.frozenZerosCamera.far = this.savedZerosState.cameraFar;
    this.frozenZerosCamera.position.set(0, 0, 20);
    this.frozenZerosCamera.lookAt(0, 0, 0);
    this.frozenZerosCamera.updateProjectionMatrix();
    this.frozenZerosCamera.updateMatrixWorld();
  }

  private updateCrosshairLines(): void {
    const { showCrosshair, crosshairNdcX, crosshairNdcY } = this.sumParams;
    const xVisible =
      showCrosshair
      && Number.isFinite(crosshairNdcX)
      && crosshairNdcX >= -1
      && crosshairNdcX <= 1;
    const yVisible =
      showCrosshair
      && Number.isFinite(crosshairNdcY)
      && crosshairNdcY >= -1
      && crosshairNdcY <= 1;
    this.vCrosshairLine.visible = xVisible;
    this.hCrosshairLine.visible = yVisible;
    if (xVisible) {
      this.vCrosshairLine.geometry.setFromPoints([
        new THREE.Vector3(crosshairNdcX, -1, 0),
        new THREE.Vector3(crosshairNdcX, 1, 0),
      ]);
    }
    if (yVisible) {
      this.hCrosshairLine.geometry.setFromPoints([
        new THREE.Vector3(-1, crosshairNdcY, 0),
        new THREE.Vector3(1, crosshairNdcY, 0),
      ]);
    }
  }

  private rebuildSumSpiral(): void {
    clearLineGroup(this.sumSpiralGroup);
    const {
      sigma,
      index,
      showR1ak,
      chainExtent,
      lastLinksOnly,
      lastLinksCount,
      remainder,
      chainFromZero,
      spectrumFeather,
    } = this.sumParams;
    const safeExtent: BigSigmaChainExtent =
      chainExtent === "entire" && spiralMiddleIndex(index, 0) > ENTIRE_LINKS_SAFE_CAP
        ? "floorT"
        : chainExtent;
    const geom = computeBigSigmaGeometry(
      sigma,
      index,
      safeExtent,
      lastLinksOnly ? lastLinksCount : null,
      remainder,
    );
    const fitPts = showR1ak ? [...geom.joints, geom.fApprox] : geom.joints;
    const scale = bigSigmaWorldScale(sigma, pointsMaxRadius(fitPts));
    const linkColor = chainFromZero
      ? quarterSpectrumHex(index - Math.floor(index), spectrumFeather)
      : BIG_SIGMA_LINK_CONTROL_COLOR;
    addPolyline(scalePoints(geom.joints, scale), linkColor, this.sumSpiralGroup);
    if (showR1ak) {
      addPolyline(scalePoints([geom.sum1, geom.fApprox], scale), R1AK_COLOR, this.sumSpiralGroup);
    }
  }
}

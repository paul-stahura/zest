import * as THREE from "three";

import { bigSigmaLinkColor } from "@/features/big-sigma/bigSigmaLinkColor";
import { BigSigmaZerosLayer, type BigSigmaZerosColorMode } from "@/features/big-sigma/bigSigmaZerosLayer";
import { parseCommittedScanBin } from "@/shared/io/committedScanBin";
import type { Point2 } from "@/shared/io/types";
import {
  bigSigmaWorldScale,
  computeBigSigmaGeometry,
  pointsMaxRadius,
  scalePoints,
  type BigSigmaChainExtent,
  type BigSigmaRemainder,
} from "@/shared/math/bigSigmaSpiral";
import {
  BIG_SIGMA_ZEROS_VIEW,
  concatSigmaTPoints,
  filterBigSigmaHarvest,
  formatBigSigmaZeroHover,
  showSigmaTCrosshair,
  zerosOverlayOpacity,
  zerosViewToCss,
} from "@/shared/math/bigSigmaZerosWindow";
import type { FracTDisplayFilter } from "@/shared/math/zerosOfF/fracTDisplayFilter";
import {
  parseZerosHarvestFamily,
  type ZerosHarvestFamily,
} from "@/shared/math/zerosOfF/harvestFamily";
import { OrthographicPanZoomSceneController } from "@/shared/rendering/orthographicPanZoomSceneController";
import type { RenderSignature } from "@/shared/rendering/renderSignature";
import { fracTSpectrumCss } from "@/features/zeros-of-f/fracToHue";

const R1AK_COLOR = 0xffffff;
const ZEROS_URL = `${import.meta.env.BASE_URL}zeros-of-f/committed-scan.bin`;
const LEFT500_URL = `${import.meta.env.BASE_URL}zeros-of-f/sigma-neg500-to-neg400.bin`;
/** R1ak hunt σ ∈ [−1, 2], T ∈ [0, 55]. Zeros found have σ ≤ 0.967. */
const R1AK_STRIP_URL = `${import.meta.env.BASE_URL}zeros-of-f/r1ak-s1t55.bin`;
/** R1ak critical strip, σ ∈ [0, 1], T ∈ [55, 100]. */
const R1AK_T55_URL = `${import.meta.env.BASE_URL}zeros-of-f/r1ak-strip-t55-100.bin`;
/** R1ak critical strip, σ ∈ [0, 1], T ∈ [100, 300]. */
const R1AK_T100_URL = `${import.meta.env.BASE_URL}zeros-of-f/r1ak-strip-t100-300.bin`;
const R1PS_URL = `${import.meta.env.BASE_URL}zeros-of-f/r1ps-hunt.bin`;
const HOVER_RADIUS_PX = 12;
const CLICK_GUARD_PX = 6;
/** Half the open-circle sprite plus a short gap so the text sits to its left. */
const HOVER_LABEL_GAP_PX = 10;

function clearGroup(group: THREE.Group): void {
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

function makeZerosCamera(): THREE.OrthographicCamera {
  const cam = new THREE.OrthographicCamera(
    BIG_SIGMA_ZEROS_VIEW.left,
    BIG_SIGMA_ZEROS_VIEW.right,
    BIG_SIGMA_ZEROS_VIEW.top,
    BIG_SIGMA_ZEROS_VIEW.bottom,
    0.1,
    200,
  );
  cam.position.set(0, 0, 20);
  cam.lookAt(0, 0, 0);
  return cam;
}

/**
 * Spiral uses the shared pan/zoom camera. Zeros sit in a second scene whose
 * camera is locked to the (σ, T) window so they stay put behind the chain.
 */
export class BigSigmaSceneController extends OrthographicPanZoomSceneController {
  private readonly layer = new THREE.Group();
  private readonly zerosScene = new THREE.Scene();
  private readonly zerosCamera = makeZerosCamera();
  private readonly zerosLayer: BigSigmaZerosLayer;
  private dirty = true;
  private sigma = 0.5;
  private index = 6.18;
  private showR1ak = true;
  private chainExtent: BigSigmaChainExtent = "floorT";
  private lastLinksOnly = false;
  private lastLinksCount = 2;
  private remainder: BigSigmaRemainder = "ak";
  private zerosDimmer = 0.05;
  private showCrosshair = true;
  private chainFromZero = false;
  private readonly crosshair = new THREE.Group();
  private readonly crosshairMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });
  private canvas: HTMLCanvasElement | null = null;
  private pointerDownX = 0;
  private pointerDownY = 0;
  private onZeroPick: ((sigma: number, index: number) => void) | null = null;
  private pickCleanup: (() => void) | null = null;
  private hoverLabel: HTMLDivElement | null = null;
  /** Drops a harvest fetch that lost the race to a newer f(s) choice. */
  private loadGeneration = 0;

  public constructor() {
    super();
    this.getFeatureRoot().add(this.layer);
    this.zerosScene.background = new THREE.Color(0x0b0d12);
    this.zerosLayer = new BigSigmaZerosLayer(this.zerosScene);
    this.zerosLayer.setDimmer(this.zerosDimmer);
    this.zerosScene.add(this.crosshair);
    this.crosshair.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      this.crosshairMat,
    ));
    this.crosshair.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      this.crosshairMat,
    ));
    this.setAllowPan((event) => !event.shiftKey);
    this.setAllowWheel((event) => !event.shiftKey);
  }

  public override mount(canvas: HTMLCanvasElement): void {
    super.mount(canvas);
    this.canvas = canvas;
    this.ensureHoverLabel(canvas);
    const onMove = (event: PointerEvent): void => {
      this.updateHover(event);
      if (event.shiftKey && (event.buttons & 1) !== 0) this.pickHoveredZero();
    };
    const onDown = (event: PointerEvent): void => {
      this.pointerDownX = event.clientX;
      this.pointerDownY = event.clientY;
      if (event.shiftKey) {
        canvas.setPointerCapture(event.pointerId);
        this.updateHover(event);
        this.pickHoveredZero();
      }
    };
    const onUp = (event: PointerEvent): void => {
      if (event.shiftKey) return;
      const dx = event.clientX - this.pointerDownX;
      const dy = event.clientY - this.pointerDownY;
      if (dx * dx + dy * dy > CLICK_GUARD_PX * CLICK_GUARD_PX) return;
      this.updateHover(event);
      this.pickHoveredZero();
    };
    const onLeave = (): void => {
      this.zerosLayer.setHoverIndex(-1);
      this.hideHoverLabel();
      canvas.style.cursor = "";
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onLeave);
    this.pickCleanup = (): void => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }

  public override dispose(): void {
    this.pickCleanup?.();
    this.pickCleanup = null;
    this.hoverLabel?.remove();
    this.hoverLabel = null;
    this.zerosLayer.dispose();
    this.crosshair.traverse((obj) => {
      if (obj instanceof THREE.Line) obj.geometry.dispose();
    });
    this.crosshairMat.dispose();
    this.zerosScene.clear();
    super.dispose();
  }

  public setOnZeroPick(cb: ((sigma: number, index: number) => void) | null): void {
    this.onZeroPick = cb;
  }

  public setParams(
    sigma: number,
    index: number,
    showR1ak: boolean,
    zerosDimmer: number,
    chainExtent: BigSigmaChainExtent,
    showCrosshair: boolean,
    chainFromZero: boolean,
    lastLinksOnly: boolean,
    lastLinksCount: number,
    remainder: BigSigmaRemainder,
  ): void {
    this.sigma = sigma;
    this.index = index;
    this.showR1ak = showR1ak;
    this.zerosDimmer = zerosDimmer;
    this.chainExtent = chainExtent;
    this.showCrosshair = showCrosshair;
    this.chainFromZero = chainFromZero;
    this.lastLinksOnly = lastLinksOnly;
    this.lastLinksCount = lastLinksCount;
    this.remainder = remainder;
    this.zerosLayer.setDimmer(zerosDimmer);
    this.updateCrosshair();
    if (zerosOverlayOpacity(zerosDimmer) <= 0) {
      this.zerosLayer.setHoverIndex(-1);
      this.hideHoverLabel();
    }
    this.dirty = true;
  }

  /**
   * Color and {T} filter from the Display accordion. Does not refetch bins.
   */
  public setZerosDisplay(colorMode: BigSigmaZerosColorMode, filter: FracTDisplayFilter): void {
    this.zerosLayer.setDisplay(colorMode, filter);
  }

  /**
   * Packed zeros for the selected f(s). Siegel is the committed scan plus
   * the σ ∈ [−500, −400] slice. R1ps is the hunt bin. A newer call wins.
   */
  public async loadZeros(family: ZerosHarvestFamily = "siegel"): Promise<void> {
    const parsed = parseZerosHarvestFamily(family);
    const token = ++this.loadGeneration;
    try {
      const points = parsed === "r1ps"
        ? await this.fetchPacked(R1PS_URL, "r1ps hunt")
        : await this.fetchSiegelHarvest();
      if (token !== this.loadGeneration) return;
      this.zerosLayer.setPoints(filterBigSigmaHarvest(points, parsed));
      this.zerosLayer.setDimmer(this.zerosDimmer);
      this.zerosLayer.setHoverIndex(-1);
      this.hideHoverLabel();
    } catch (error) {
      if (token !== this.loadGeneration) return;
      // eslint-disable-next-line no-console
      console.error("[big-sigma] failed to load zeros:", error);
    }
  }

  /** Siegel catalog: committed scan, the left strip, and the critical-strip hunts. */
  private async fetchSiegelHarvest(): Promise<{ sigma: Float64Array; t: Float64Array }> {
    const [mainResponse, left500Response, stripResponse, highResponse, higherResponse] =
      await Promise.all([
        fetch(ZEROS_URL),
        fetch(LEFT500_URL),
        fetch(R1AK_STRIP_URL),
        fetch(R1AK_T55_URL),
        fetch(R1AK_T100_URL),
      ]);
    if (!mainResponse.ok) {
      throw new Error(`big-sigma zeros HTTP ${String(mainResponse.status)}`);
    }
    const packed = parseCommittedScanBin(await mainResponse.arrayBuffer());
    let points = { sigma: packed.sigma, t: packed.t };
    if (left500Response.ok) {
      const left500 = parseCommittedScanBin(await left500Response.arrayBuffer());
      points = concatSigmaTPoints(points, { sigma: left500.sigma, t: left500.t });
    }
    if (stripResponse.ok) {
      const strip = parseCommittedScanBin(await stripResponse.arrayBuffer());
      points = concatSigmaTPoints(points, { sigma: strip.sigma, t: strip.t });
    }
    if (highResponse.ok) {
      const high = parseCommittedScanBin(await highResponse.arrayBuffer());
      points = concatSigmaTPoints(points, { sigma: high.sigma, t: high.t });
    }
    if (higherResponse.ok) {
      const higher = parseCommittedScanBin(await higherResponse.arrayBuffer());
      points = concatSigmaTPoints(points, { sigma: higher.sigma, t: higher.t });
    }
    return points;
  }

  private async fetchPacked(
    url: string,
    label: string,
  ): Promise<{ sigma: Float64Array; t: Float64Array }> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`big-sigma ${label} HTTP ${String(response.status)}`);
    }
    const packed = parseCommittedScanBin(await response.arrayBuffer());
    return { sigma: packed.sigma, t: packed.t };
  }

  public override frame(time: number): void {
    if (this.dirty) {
      this.rebuild();
      this.dirty = false;
    }
    super.frame(time);
  }

  protected override addToSignature(signature: RenderSignature): void {
    signature.addCamera(this.zerosCamera);
    signature.addObject(this.zerosScene);
    signature.push(this.zerosDimmer);
    signature.push(this.showCrosshair ? 1 : 0);
    signature.push(this.sigma);
    signature.push(this.index);
    signature.push(this.zerosLayer.getCount());
  }

  protected override drawFrame(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ): void {
    const dimOn = zerosOverlayOpacity(this.zerosDimmer) > 0;
    const crossOn = showSigmaTCrosshair(this.showCrosshair, this.sigma, this.index);
    const showOverlay = (dimOn && this.zerosLayer.getCount() > 0) || crossOn;
    if (!showOverlay) {
      renderer.render(scene, camera);
      return;
    }
    renderer.autoClear = true;
    renderer.render(this.zerosScene, this.zerosCamera);
    const previousBackground = scene.background;
    scene.background = null;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(scene, camera);
    scene.background = previousBackground;
    renderer.autoClear = true;
  }

  private updateHover(event: PointerEvent): void {
    const canvas = this.canvas;
    if (canvas === null || this.zerosLayer.getCount() === 0 || zerosOverlayOpacity(this.zerosDimmer) <= 0) {
      this.zerosLayer.setHoverIndex(-1);
      this.hideHoverLabel();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const cssX = event.clientX - rect.left;
    const cssY = event.clientY - rect.top;
    const hit = this.zerosLayer.nearestIndex(
      cssX,
      cssY,
      BIG_SIGMA_ZEROS_VIEW,
      this.getCanvasSize(),
      HOVER_RADIUS_PX,
    );
    this.zerosLayer.setHoverIndex(hit);
    canvas.style.cursor = hit >= 0 ? "pointer" : "";
    const zero = this.zerosLayer.getZero(hit);
    if (zero === null) {
      this.hideHoverLabel();
      return;
    }
    this.showHoverLabel(zero.sigma, zero.t);
  }

  private ensureHoverLabel(canvas: HTMLCanvasElement): void {
    if (this.hoverLabel !== null) return;
    const parent = canvas.parentElement;
    if (parent === null) return;
    if (getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }
    const label = document.createElement("div");
    label.style.position = "absolute";
    label.style.pointerEvents = "none";
    label.style.whiteSpace = "pre";
    label.style.font = "12px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace";
    label.style.textShadow = "0 0 4px #000, 0 1px 2px #000";
    label.style.transform = "translate(-100%, -50%)";
    label.style.display = "none";
    label.style.zIndex = "2";
    parent.appendChild(label);
    this.hoverLabel = label;
  }

  private showHoverLabel(sigma: number, T: number): void {
    const label = this.hoverLabel;
    const canvas = this.canvas;
    if (label === null || canvas === null) return;
    const css = zerosViewToCss(sigma, T, BIG_SIGMA_ZEROS_VIEW, this.getCanvasSize());
    label.textContent = formatBigSigmaZeroHover(sigma, T);
    label.style.color = fracTSpectrumCss(T - Math.floor(T));
    label.style.left = `${css.x - HOVER_LABEL_GAP_PX}px`;
    label.style.top = `${css.y}px`;
    label.style.display = "block";
  }

  private hideHoverLabel(): void {
    if (this.hoverLabel === null) return;
    this.hoverLabel.style.display = "none";
  }

  private pickHoveredZero(): void {
    const zero = this.zerosLayer.getZero(this.zerosLayer.getHoverIndex());
    if (zero === null) return;
    this.onZeroPick?.(zero.sigma, zero.t);
  }

  private updateCrosshair(): void {
    const on = showSigmaTCrosshair(this.showCrosshair, this.sigma, this.index);
    this.crosshair.visible = on;
    this.crosshairMat.opacity = 1;
    if (!on) return;
    const vLine = this.crosshair.children[0];
    const hLine = this.crosshair.children[1];
    if (!(vLine instanceof THREE.Line) || !(hLine instanceof THREE.Line)) return;
    vLine.geometry.setFromPoints([
      new THREE.Vector3(this.sigma, BIG_SIGMA_ZEROS_VIEW.bottom, 0),
      new THREE.Vector3(this.sigma, BIG_SIGMA_ZEROS_VIEW.top, 0),
    ]);
    hLine.geometry.setFromPoints([
      new THREE.Vector3(BIG_SIGMA_ZEROS_VIEW.left, this.index, 0),
      new THREE.Vector3(BIG_SIGMA_ZEROS_VIEW.right, this.index, 0),
    ]);
  }

  private rebuild(): void {
    clearGroup(this.layer);
    const geom = computeBigSigmaGeometry(
      this.sigma,
      this.index,
      this.chainExtent,
      this.lastLinksOnly ? this.lastLinksCount : null,
      this.remainder,
    );
    const fitPts = this.showR1ak ? [...geom.joints, geom.fApprox] : geom.joints;
    const scale = bigSigmaWorldScale(this.sigma, pointsMaxRadius(fitPts));
    addPolyline(scalePoints(geom.joints, scale), bigSigmaLinkColor(this.chainFromZero, this.index), this.layer);
    if (this.showR1ak) {
      addPolyline(scalePoints([geom.sum1, geom.fApprox], scale), R1AK_COLOR, this.layer);
    }
  }
}

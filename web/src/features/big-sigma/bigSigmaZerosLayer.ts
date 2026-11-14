import * as THREE from "three";

import { fracToHue, hsvToRgb } from "@/features/zeros-of-f/fracToHue";
import { getCircleSprite } from "@/features/zeros-of-f/layers/scanScatterLayer";
import {
  filterSigmaTByFracT,
  nearestZeroIndex,
  zerosOverlayOpacity,
  type CameraBounds,
  type SigmaTPoints,
} from "@/shared/math/bigSigmaZerosWindow";
import type { FracTDisplayFilter } from "@/shared/math/zerosOfF/fracTDisplayFilter";

export type BigSigmaZerosColorMode = "spectrum" | "grayscale";

const INACTIVE_FRAC_T_FILTER: FracTDisplayFilter = {
  kind: "range",
  rangeMin: 0,
  rangeMax: 1,
  rangeMode: "between",
  justOne: 0,
  justOneDigits: 3,
};

/** Same CSS-pixel size as zeros-of-f ScanScatterLayer (default 2). */
const POINT_SIZE = 2;
const HOVER_SIZE = 7;

let RING_SPRITE: THREE.CanvasTexture | null = null;

function getRingSprite(): THREE.CanvasTexture {
  if (RING_SPRITE !== null) return RING_SPRITE;
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
  RING_SPRITE = tex;
  return tex;
}

/**
 * Spectrum-colored (σ, T) scatter for the Big Sigma canvas.
 */
export class BigSigmaZerosLayer {
  private readonly group: THREE.Group;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.PointsMaterial;
  private readonly points: THREE.Points;
  private readonly hoverGeom: THREE.BufferGeometry;
  private readonly hoverMat: THREE.PointsMaterial;
  private readonly hoverPoints: THREE.Points;
  private all: SigmaTPoints = { sigma: new Float64Array(0), t: new Float64Array(0) };
  private sigma: Float64Array = new Float64Array(0);
  private t: Float64Array = new Float64Array(0);
  private hoverIndex = -1;
  private colorMode: BigSigmaZerosColorMode = "spectrum";
  private fracTFilter: FracTDisplayFilter = INACTIVE_FRAC_T_FILTER;

  public constructor(parent: THREE.Object3D) {
    this.group = new THREE.Group();
    parent.add(this.group);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(0), 3));
    this.material = new THREE.PointsMaterial({
      vertexColors: true,
      size: POINT_SIZE,
      sizeAttenuation: false,
      map: getCircleSprite(),
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.group.add(this.points);

    this.hoverGeom = new THREE.BufferGeometry();
    this.hoverGeom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3), 3));
    this.hoverGeom.setAttribute("color", new THREE.BufferAttribute(new Float32Array([1, 1, 1]), 3));
    this.hoverMat = new THREE.PointsMaterial({
      vertexColors: true,
      size: HOVER_SIZE,
      sizeAttenuation: false,
      map: getRingSprite(),
      transparent: true,
      depthWrite: false,
      depthTest: false,
      opacity: 1,
    });
    this.hoverPoints = new THREE.Points(this.hoverGeom, this.hoverMat);
    this.hoverPoints.visible = false;
    this.hoverPoints.frustumCulled = false;
    this.group.add(this.hoverPoints);
  }

  public dispose(): void {
    this.group.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
    this.hoverGeom.dispose();
    this.hoverMat.dispose();
  }

  public getCount(): number {
    return this.sigma.length;
  }

  public getZero(index: number): { sigma: number; t: number } | null {
    if (index < 0 || index >= this.sigma.length) return null;
    return { sigma: this.sigma[index]!, t: this.t[index]! };
  }

  /**
   * Positions stay in (σ, T). A locked overlay camera maps that box to the
   * full canvas so pan/zoom of the spiral never moves them.
   */
  public setPoints(points: SigmaTPoints): void {
    this.all = points;
    this.rebuildGpu();
  }

  /**
   * Spectrum vs white, plus the Display {T} keep/hide. Source arrays stay
   * complete so opening the range again does not refetch the harvest.
   */
  public setDisplay(colorMode: BigSigmaZerosColorMode, filter: FracTDisplayFilter): void {
    this.colorMode = colorMode;
    this.fracTFilter = filter;
    this.rebuildGpu();
  }

  private rebuildGpu(): void {
    const points = filterSigmaTByFracT(this.all, this.fracTFilter);
    this.sigma = points.sigma;
    this.t = points.t;
    const n = points.sigma.length;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const gray = this.colorMode === "grayscale";
    for (let i = 0; i < n; i++) {
      const T = points.t[i]!;
      positions[i * 3] = points.sigma[i]!;
      positions[i * 3 + 1] = T;
      positions[i * 3 + 2] = 0;
      if (gray) {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
        continue;
      }
      const [r, g, b] = hsvToRgb(fracToHue(T - Math.floor(T)), 1, 1);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.geometry.setDrawRange(0, n);
    this.setHoverIndex(-1);
  }

  public setDimmer(dimmer: number): void {
    const opacity = zerosOverlayOpacity(dimmer);
    this.material.opacity = opacity;
    this.hoverMat.opacity = 1;
    this.group.visible = opacity > 0;
  }

  public setHoverIndex(index: number): void {
    this.hoverIndex = index;
    if (index < 0 || index >= this.sigma.length) {
      this.hoverPoints.visible = false;
      return;
    }
    const pos = this.hoverGeom.getAttribute("position");
    const col = this.hoverGeom.getAttribute("color");
    const srcCol = this.geometry.getAttribute("color");
    pos.setXYZ(0, this.sigma[index]!, this.t[index]!, 0);
    col.setXYZ(0, srcCol.getX(index), srcCol.getY(index), srcCol.getZ(index));
    pos.needsUpdate = true;
    col.needsUpdate = true;
    this.hoverPoints.visible = true;
  }

  public getHoverIndex(): number {
    return this.hoverIndex;
  }

  /**
   * Nearest zero in CSS pixels, or −1 if none is inside `radiusPx`.
   */
  public nearestIndex(
    cssX: number,
    cssY: number,
    bounds: CameraBounds,
    canvas: { width: number; height: number },
    radiusPx: number,
  ): number {
    return nearestZeroIndex({ sigma: this.sigma, t: this.t }, cssX, cssY, bounds, canvas, radiusPx);
  }
}

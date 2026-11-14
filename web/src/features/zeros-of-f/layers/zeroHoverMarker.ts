import * as THREE from "three";

import { formatBigSigmaZeroHover } from "@/shared/math/bigSigmaZerosWindow";
import {
  ZERO_HOVER_LABEL_GAP_PX,
  type ZeroHoverSample,
} from "@/shared/math/zerosOfF/zeroHoverPick";

/** CSS-pixel diameter of the open ring. Matches Big Sigma. */
const HOVER_SIZE = 7;

function rgbCss(r: number, g: number, b: number): string {
  const channel = (value: number): number => {
    const clamped = value < 0 ? 0 : value > 1 ? 1 : value;
    return Math.round(clamped * 255);
  };
  return `rgb(${String(channel(r))}, ${String(channel(g))}, ${String(channel(b))})`;
}

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
 * Open ring on the hovered zero, plus the σ / T label to its left.
 *
 * The ring is parented in fit-local space so pan, zoom, and orbit move
 * it with the dot. The label is a DOM node in CSS pixels because the
 * text has to stay a constant size and sit to the left of the ring the
 * way Big Sigma's label does.
 */
export class ZeroHoverMarker {
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.PointsMaterial;
  private readonly points: THREE.Points;
  private readonly positionAttr: THREE.BufferAttribute;
  private readonly colorAttr: THREE.BufferAttribute;
  private label: HTMLDivElement | null = null;

  public constructor(parent: THREE.Object3D) {
    this.geometry = new THREE.BufferGeometry();
    this.positionAttr = new THREE.BufferAttribute(new Float32Array(3), 3);
    this.colorAttr = new THREE.BufferAttribute(new Float32Array([1, 1, 1]), 3);
    this.geometry.setAttribute("position", this.positionAttr);
    this.geometry.setAttribute("color", this.colorAttr);
    this.material = new THREE.PointsMaterial({
      vertexColors: true,
      size: HOVER_SIZE,
      sizeAttenuation: false,
      map: getRingSprite(),
      transparent: true,
      depthWrite: false,
      depthTest: false,
      opacity: 1,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.visible = false;
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    parent.add(this.points);
  }

  public showRing(sample: ZeroHoverSample): void {
    const pos = this.positionAttr.array;
    pos[0] = sample.x;
    pos[1] = sample.y;
    pos[2] = sample.z;
    this.positionAttr.needsUpdate = true;
    const col = this.colorAttr.array;
    col[0] = sample.r;
    col[1] = sample.g;
    col[2] = sample.b;
    this.colorAttr.needsUpdate = true;
    this.points.visible = true;
  }

  public showLabel(
    canvas: HTMLCanvasElement,
    sample: ZeroHoverSample,
    css: { x: number; y: number },
    twin: ZeroHoverSample | null,
  ): void {
    const label = this.ensureLabel(canvas);
    if (label === null) return;
    label.replaceChildren();
    label.append(this.coordBlock(sample));
    if (twin !== null) {
      const block = this.coordBlock(twin);
      block.style.display = "block";
      block.prepend(document.createTextNode("twin\n"));
      label.append(block);
    }
    this.placeLabel(label, css);
    label.style.display = "block";
  }

  public moveLabel(css: { x: number; y: number }): void {
    const label = this.label;
    if (label === null || label.style.display === "none") return;
    this.placeLabel(label, css);
  }

  public hide(): void {
    this.points.visible = false;
    this.hideLabel();
  }

  /** Drop the σ / T / twin text and leave the ring alone. */
  public hideLabel(): void {
    if (this.label !== null) this.label.style.display = "none";
  }

  public dispose(): void {
    this.points.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
    this.label?.remove();
    this.label = null;
  }

  private coordBlock(sample: ZeroHoverSample): HTMLSpanElement {
    const block = document.createElement("span");
    block.textContent = formatBigSigmaZeroHover(sample.sigma, sample.t);
    block.style.color = rgbCss(sample.r, sample.g, sample.b);
    return block;
  }

  private ensureLabel(canvas: HTMLCanvasElement): HTMLDivElement | null {
    if (this.label !== null) return this.label;
    const parent = canvas.parentElement;
    if (parent === null) return null;
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
    this.label = label;
    return label;
  }

  private placeLabel(label: HTMLDivElement, css: { x: number; y: number }): void {
    label.style.left = `${css.x - ZERO_HOVER_LABEL_GAP_PX}px`;
    label.style.top = `${css.y}px`;
  }
}

/** Before and after on the hovered strand, plus the same two on the twin. */
const STRAND_RING_CAP = 4;

/**
 * White open circles on strand neighbors.
 *
 * The hovered zero and its twin keep their own colored rings. These stay
 * white so the previous and next step on each strand read as the chain,
 * not as another selected zero.
 */
export class WhiteOpenRings {
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.PointsMaterial;
  private readonly points: THREE.Points;
  private readonly positions: Float32Array;
  private readonly positionAttr: THREE.BufferAttribute;

  public constructor(parent: THREE.Object3D) {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(STRAND_RING_CAP * 3);
    const colors = new Float32Array(STRAND_RING_CAP * 3);
    colors.fill(1);
    this.positionAttr = new THREE.BufferAttribute(this.positions, 3);
    this.geometry.setAttribute("position", this.positionAttr);
    this.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.PointsMaterial({
      vertexColors: true,
      size: HOVER_SIZE,
      sizeAttenuation: false,
      map: getRingSprite(),
      transparent: true,
      depthWrite: false,
      depthTest: false,
      opacity: 1,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.visible = false;
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    parent.add(this.points);
  }

  public show(samples: readonly ZeroHoverSample[]): void {
    const count = samples.length < STRAND_RING_CAP ? samples.length : STRAND_RING_CAP;
    for (let i = 0; i < count; i++) {
      const sample = samples[i]!;
      this.positions[i * 3] = sample.x;
      this.positions[i * 3 + 1] = sample.y;
      this.positions[i * 3 + 2] = sample.z;
    }
    this.positionAttr.needsUpdate = true;
    this.geometry.setDrawRange(0, count);
    this.points.visible = count > 0;
  }

  public hide(): void {
    this.points.visible = false;
    this.geometry.setDrawRange(0, 0);
  }

  public dispose(): void {
    this.points.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}

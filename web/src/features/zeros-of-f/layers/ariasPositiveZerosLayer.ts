import * as THREE from "three";

import { getCircleSprite } from "@/features/zeros-of-f/layers/scanScatterLayer";
import {
  DEFAULT_SPECTRUM_FEATHER,
  quarterSpectrumRgb,
} from "@/features/zeros-of-f/fracToHue";
import type { DisplayControlsState } from "@/features/zeros-of-f/types";
import type { HoverPointFn } from "@/shared/math/zerosOfF/zeroHoverPick";
import { ancestorChainVisible } from "@/shared/rendering/ancestorChainVisible";

type ColorMode = DisplayControlsState["colorMode"];

/**
 * Overlay layer for Juan Arias de Reyna's positive-t zeros of Siegel's f(s)
 * (25-digit list, 162k zeros). Each zero is drawn at (σ, T) where σ is the
 * real part and T is the scan-parameter index — T = indexToImag⁻¹(t), already
 * baked into the asset so no per-zero Newton step is needed at load time.
 *
 * Source: `public/arias-positive-f-zeros.csv` (rows `sigma,T`, one `#` comment
 * header), fetched on first toggle-on; reused thereafter. Rendered as small
 * distinct dots. Used as a "solo" overlay — the model hides all other content
 * while this is shown (see zerosOfFModel `setShowAriasSolo`).
 */
export class AriasPositiveZerosLayer {
  private readonly parent: THREE.Group;
  private readonly group: THREE.Group;
  private readonly material: THREE.PointsMaterial;
  private readonly geometry: THREE.BufferGeometry;
  private readonly points: THREE.Points;
  private colorAttr: THREE.BufferAttribute | null = null;
  private loadStarted = false;
  private loadedSigma: Float64Array | null = null;
  private loadedT: Float64Array | null = null;
  private yAxisMode: "T" | "fracT" = "T";
  private colorMode: ColorMode = "spectrum";
  private spectrumFeather = DEFAULT_SPECTRUM_FEATHER;

  public constructor(parent: THREE.Group) {
    this.parent = parent;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.parent.add(this.group);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(0), 3));
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.PointsMaterial({
      // Per-vertex colors driven by the Display accordion's "Color by" mode
      // (same fracToHue spectrum the scatter/background overlays use).
      vertexColors: true,
      size: 3,
      sizeAttenuation: false,
      map: getCircleSprite(),
      alphaTest: 0.5,
      transparent: true,
      opacity: 1.0,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    // Skip frustum culling (see ZetaZerosLayer): aggressive ortho zoom can
    // mis-cull a tight point cloud by its bounding sphere and flicker it out.
    this.points.frustumCulled = false;
    this.group.add(this.points);
  }

  public dispose(): void {
    this.parent.remove(this.group);
    this.geometry.dispose();
    this.material.dispose();
  }

  /** GPU draw count when this overlay is on; 0 when hidden. */
  public getDisplayedCount(): number {
    if (!this.group.visible) return 0;
    return this.geometry.drawRange.count;
  }

  /** True when this solo overlay is painted. */
  public acceptsHover(): boolean {
    return ancestorChainVisible(this.group)
      && this.loadedSigma !== null
      && this.geometry.drawRange.count > 0;
  }

  /** Drawn Arias zeros. σ and T are the stored coordinates, not display y. */
  public visitHoverPoints(
    onPoint: HoverPointFn,
    keepLocal: ((x: number, y: number) => boolean) | null,
  ): void {
    const sigma = this.loadedSigma;
    const tvals = this.loadedT;
    if (sigma === null || tvals === null) return;
    const posAttr = this.geometry.getAttribute("position");
    if (!(posAttr instanceof THREE.BufferAttribute)) return;
    const positions = posAttr.array;
    const colors = this.colorAttr === null ? null : this.colorAttr.array;
    const n = Math.min(sigma.length, tvals.length, this.geometry.drawRange.count);
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      const x = positions[o]!;
      const y = positions[o + 1]!;
      if (keepLocal !== null && !keepLocal(x, y)) continue;
      onPoint(
        sigma[i]!,
        tvals[i]!,
        x,
        y,
        positions[o + 2]!,
        colors === null ? 1 : colors[o]!,
        colors === null ? 1 : colors[o + 1]!,
        colors === null ? 1 : colors[o + 2]!,
        -1,
      );
    }
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
    if (visible && !this.loadStarted) {
      this.loadStarted = true;
      void this.loadZeros();
    }
  }

  /** Reposition when the y-axis mode flips between raw T and fracT. */
  public setYAxisMode(mode: "T" | "fracT"): void {
    if (this.yAxisMode === mode) return;
    this.yAxisMode = mode;
    if (this.loadedSigma !== null && this.loadedT !== null) {
      this.applyZeros(this.loadedSigma, this.loadedT);
    }
  }

  /** Recolor to match the Display accordion's "Color by" setting. Zero
   *  locations carry no magnitude/phase data, so magnitude-driven modes
   *  (depth, r1-mag, phase-r, …) fall back to the frac(T) spectrum; only
   *  "grayscale" is distinct (white). */
  public setColorMode(mode: ColorMode): void {
    if (this.colorMode === mode) return;
    this.colorMode = mode;
    if (this.loadedT !== null) this.recolor(this.loadedT);
  }

  public setSpectrumFeather(feather: number): void {
    if (this.spectrumFeather === feather) return;
    this.spectrumFeather = feather;
    if (this.loadedT !== null && this.colorMode !== "grayscale") {
      this.recolor(this.loadedT);
    }
  }

  private recolor(tvals: Float64Array): void {
    const n = tvals.length;
    const colorAttr = this.colorAttr;
    if (colorAttr === null) return;
    const colors = colorAttr.array;
    if (colors.length < n * 3) return;
    const gray = this.colorMode === "grayscale";
    for (let i = 0; i < n; i++) {
      if (gray) {
        colors[i * 3 + 0] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
      } else {
        const T = tvals[i]!;
        const frac = T - Math.floor(T);
        const [r, g, b] = quarterSpectrumRgb(frac, this.spectrumFeather);
        colors[i * 3 + 0] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      }
    }
    colorAttr.needsUpdate = true;
  }

  private async loadZeros(): Promise<void> {
    try {
      const resp = await fetch(`${import.meta.env.BASE_URL}arias-positive-f-zeros.csv`);
      if (!resp.ok) throw new Error(`HTTP ${String(resp.status)}`);
      const text = await resp.text();
      const lines = text.split(/\r?\n/);
      const sigma = new Float64Array(lines.length);
      const tval = new Float64Array(lines.length);
      let n = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
        const comma = trimmed.indexOf(",");
        if (comma === -1) continue;
        const s = Number.parseFloat(trimmed.slice(0, comma));
        const T = Number.parseFloat(trimmed.slice(comma + 1));
        if (!Number.isFinite(s) || !Number.isFinite(T) || T <= 0) continue;
        sigma[n] = s;
        tval[n] = T;
        n += 1;
      }
      const finalSigma = sigma.subarray(0, n);
      const finalT = tval.subarray(0, n);
      this.loadedSigma = finalSigma;
      this.loadedT = finalT;
      this.applyZeros(finalSigma, finalT);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[arias-pos-f-zeros] failed to load:", err);
    }
  }

  private applyZeros(sigma: Float64Array, tvals: Float64Array): void {
    const n = sigma.length;
    const positions = new Float32Array(n * 3);
    const fracT = this.yAxisMode === "fracT";
    for (let i = 0; i < n; i++) {
      const T = tvals[i]!;
      positions[i * 3 + 0] = sigma[i]!;
      positions[i * 3 + 1] = fracT ? T - Math.floor(T) : T;
      positions[i * 3 + 2] = 0;
    }
    const attr = new THREE.BufferAttribute(positions, 3);
    this.geometry.setAttribute("position", attr);
    const colorAttr = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
    this.colorAttr = colorAttr;
    this.geometry.setAttribute("color", colorAttr);
    this.geometry.setDrawRange(0, n);
    attr.needsUpdate = true;
    this.recolor(tvals);
  }
}

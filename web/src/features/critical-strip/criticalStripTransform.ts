import { indexToImag } from "@/shared/math/zetaEms";
import type { SpaceMode, ViewRange } from "@/features/critical-strip/criticalStripTypes";

// 3 canvas-pixel snap zone for the critical line at σ=0.5
const CRITICAL_LINE_PIXELS = 3;

// Approximate inverse of indexToImag (from Zeta.cs ImagToIndex, Zzrob formula)
// eslint-disable-next-line no-loss-of-precision -- constant from mathematical reference, extra digits document the true value
const EULER_GAMMA = 0.5772156649015328606;
const E = Math.E;
const GAMMA_TO_E = Math.pow(EULER_GAMMA, E);       // ≈ 0.22451725198323
const TWO_ROOT_3_PI = 2 * Math.sqrt(3 * Math.PI);

export function imagToIndex(imag: number): number {
  return Math.sqrt(6 * GAMMA_TO_E / imag + 6 * imag + Math.PI) / TWO_ROOT_3_PI - 0.5;
}

export type CanvasRect = {
  width: number;
  height: number;
};

export type StripPos = { x: number; y: number };
export type ViewportPos = { x: number; y: number };

/**
 * Port of Unity CriticalStripTransform.cs.
 * Converts between strip space (σ, index/imag), viewport space (canvas px), and screen space.
 *
 * Strip X axis: σ mapped over sigmaRange (e.g. sigmaRange=1 → [0,1]; sigmaRange=5 → [-4,5])
 * Strip Y axis: index or imaginary t depending on spaceMode
 */
export class CriticalStripTransform {
  private minIndex: number;
  private maxIndex: number;
  private minImag: number;
  private maxImag: number;
  private spaceMode: SpaceMode;
  private sigmaRange: number;

  // Cached canvas dimensions — call invalidate() on resize
  private width = 1;
  private height = 1;

  public constructor(
    initialRange: ViewRange = { minY: 0, maxY: 7 },
    spaceMode: SpaceMode = "index",
    sigmaRange: number = 1,
  ) {
    this.spaceMode = spaceMode;
    this.sigmaRange = sigmaRange;

    this.minIndex = initialRange.minY;
    this.maxIndex = initialRange.maxY;
    this.minImag = indexToImag(this.minIndex, false);
    this.maxImag = indexToImag(this.maxIndex, false);
  }

  public invalidate(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public setSigmaRange(range: number): void {
    this.sigmaRange = range;
  }

  public setSpaceMode(mode: SpaceMode): void {
    this.spaceMode = mode;
  }

  public getSpaceMode(): SpaceMode {
    return this.spaceMode;
  }

  public setRange(minY: number, maxY: number): void {
    if (this.spaceMode === "imaginary") {
      this.minImag = minY;
      this.maxImag = maxY;
      this.minIndex = imagToIndex(minY);
      this.maxIndex = imagToIndex(maxY);
    } else {
      this.minIndex = minY;
      this.maxIndex = maxY;
      this.minImag = indexToImag(minY, false);
      this.maxImag = indexToImag(maxY, false);
    }
  }

  public getMinValue(): number {
    return this.spaceMode === "imaginary" ? this.minImag : this.minIndex;
  }

  public getMaxValue(): number {
    return this.spaceMode === "imaginary" ? this.maxImag : this.maxIndex;
  }

  public getMinIndex(): number { return this.minIndex; }
  public getMaxIndex(): number { return this.maxIndex; }
  public getMinImag(): number  { return this.minImag; }
  public getMaxImag(): number  { return this.maxImag; }

  // Critical-line snap threshold in strip-space units
  public get criticalValueThreshold(): number {
    return CRITICAL_LINE_PIXELS / this.width;
  }

  /**
   * Strip → canvas-pixel viewport coordinates.
   * Y convention: maxValue renders at y=0 (top), minValue at y=height (bottom).
   * Higher index values appear at the top of the canvas, matching Unity behavior.
   */
  public stripToViewport(strip: StripPos): ViewportPos {
    let x: number;
    if (this.sigmaRange === 1) {
      x = strip.x * this.width;
    } else {
      // maps [-(sigmaRange-1), sigmaRange] to [0, width]
      x = ((strip.x + (this.sigmaRange - 1)) / (2 * this.sigmaRange - 1)) * this.width;
    }

    const minY = this.spaceMode === "imaginary" ? this.minImag : this.minIndex;
    const maxY = this.spaceMode === "imaginary" ? this.maxImag : this.maxIndex;
    // normalizedY=0 → minValue (bottom), normalizedY=1 → maxValue (top)
    const normalizedY = (strip.y - minY) / (maxY - minY);
    // Y-down canvas: top=0, bottom=height → high values at y=0
    const y = (1 - normalizedY) * this.height;

    return { x, y };
  }

  /**
   * Canvas-pixel viewport coordinates → strip coordinates.
   * Inverse of stripToViewport.
   */
  public viewportToStrip(viewport: ViewportPos): StripPos {
    const normalizedX = viewport.x / this.width;

    let real: number;
    const distFromHalf = Math.abs(normalizedX - 0.5);
    if (this.sigmaRange === 1 && distFromHalf <= this.criticalValueThreshold) {
      real = 0.5;
    } else if (this.sigmaRange === 1) {
      real = normalizedX;
    } else {
      const realMin = -(this.sigmaRange - 1);
      const realMax = this.sigmaRange;
      real = realMin + normalizedX * (realMax - realMin);
      real = Math.max(realMin, Math.min(realMax, real));
      // snap near critical line in pixel space
      if (Math.abs(real - 0.5) < CRITICAL_LINE_PIXELS / this.width * (2 * this.sigmaRange - 1)) {
        real = 0.5;
      }
    }

    // Y-down: viewport.y=0 → maxValue (top), viewport.y=height → minValue (bottom)
    const minY = this.spaceMode === "imaginary" ? this.minImag : this.minIndex;
    const maxY = this.spaceMode === "imaginary" ? this.maxImag : this.maxIndex;
    const normalizedY = 1 - viewport.y / this.height;
    const value = minY + normalizedY * (maxY - minY);

    return { x: real, y: value };
  }

  /**
   * Convert a point stored as (real, index) in strip space to viewport coords.
   * Handles space-mode conversion automatically.
   */
  public pointToViewport(real: number, index: number): ViewportPos {
    const y = this.spaceMode === "imaginary" ? indexToImag(index, false) : index;
    return this.stripToViewport({ x: real, y });
  }

  /**
   * Convert imaginary-space viewport Y back to index.
   */
  public viewportYToIndex(viewportY: number): number {
    const minY = this.spaceMode === "imaginary" ? this.minImag : this.minIndex;
    const maxY = this.spaceMode === "imaginary" ? this.maxImag : this.maxIndex;
    // Y-down: y=0 → maxY, y=height → minY
    const normalizedY = 1 - viewportY / this.height;
    const value = minY + normalizedY * (maxY - minY);
    return this.spaceMode === "imaginary" ? imagToIndex(value) : value;
  }
}

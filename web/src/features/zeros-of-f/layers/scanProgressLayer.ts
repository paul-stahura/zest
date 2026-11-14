import * as THREE from "three";

import { scanFloorT } from "@/shared/math/zerosOfF/scanFloor";
import { ridgeInvTs, ridgeBandHalfWidth } from "@/shared/math/zerosOfF";

/** σ samples across the range when outlining the (curved) ridge-range band. */
const RIDGE_BAND_SAMPLES = 96;
/** Vertices the rectangle/band geometry buffer is sized for: the band is a
 *  closed loop of 2·samples + 1 points; the plain rect needs only 5. */
const MAX_RECT_VERTS = RIDGE_BAND_SAMPLES * 2 + 2;

/**
 * Live-scan visual indicators rendered into the data-fit group:
 *
 *  1. **Scan rectangle** — outline of `[sigmaMin, sigmaMax] × [tMin, tMax]`,
 *     drawn whenever scan params are valid. Shows the user-requested area.
 *  2. **Current-σ bar** — vertical line at the σ of the most-recently-completed
 *     scan row. Two colours: dim "below scan floor" segment + bright "above
 *     scan floor" segment so the user can see at a glance how much of the row
 *     is actually being scanned vs skipped.
 *
 * Lifetime: created once per workspace; visibility toggled on/off as scans
 * start and stop. Geometry is reconfigured imperatively by the workspace
 * model when params or current-σ change.
 */
export class ScanProgressLayer {
  private readonly parent: THREE.Group;

  // Scan rectangle (5-point closed loop).
  private readonly rectGeometry: THREE.BufferGeometry;
  private readonly rectMaterial: THREE.LineBasicMaterial;
  private readonly rectLine: THREE.Line;

  // Current-σ bar split into two segments.
  private readonly barBelowGeometry: THREE.BufferGeometry;
  private readonly barAboveGeometry: THREE.BufferGeometry;
  private readonly barBelowMaterial: THREE.LineBasicMaterial;
  private readonly barAboveMaterial: THREE.LineBasicMaterial;
  private readonly barBelow: THREE.Line;
  private readonly barAbove: THREE.Line;

  public constructor(parent: THREE.Group) {
    this.parent = parent;

    // Rectangle (or, in ridge-range mode, a curved band outline — sized for the
    // larger of the two).
    this.rectGeometry = new THREE.BufferGeometry();
    this.rectGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_RECT_VERTS * 3), 3));
    this.rectGeometry.setDrawRange(0, 0);
    // Beige rectangle outline.
    this.rectMaterial = new THREE.LineBasicMaterial({ color: 0xf5f5dc, linewidth: 1 });
    this.rectLine = new THREE.Line(this.rectGeometry, this.rectMaterial);
    this.rectLine.visible = true;
    this.parent.add(this.rectLine);

    // Current-σ bar — two lines, two colours. "below" is dim grey (skipped
    // because it's under the scan floor); "above" is bright cyan (in scan).
    this.barBelowGeometry = new THREE.BufferGeometry();
    this.barBelowGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(2 * 3), 3));
    this.barBelowGeometry.setDrawRange(0, 0);
    this.barBelowMaterial = new THREE.LineBasicMaterial({ color: 0x444444, linewidth: 1 });
    this.barBelow = new THREE.Line(this.barBelowGeometry, this.barBelowMaterial);
    this.barBelow.visible = false;
    this.parent.add(this.barBelow);

    this.barAboveGeometry = new THREE.BufferGeometry();
    this.barAboveGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(2 * 3), 3));
    this.barAboveGeometry.setDrawRange(0, 0);
    this.barAboveMaterial = new THREE.LineBasicMaterial({ color: 0x33ccff, linewidth: 2 });
    this.barAbove = new THREE.Line(this.barAboveGeometry, this.barAboveMaterial);
    this.barAbove.visible = false;
    this.parent.add(this.barAbove);
  }

  public dispose(): void {
    this.parent.remove(this.rectLine);
    this.parent.remove(this.barBelow);
    this.parent.remove(this.barAbove);
    this.rectGeometry.dispose();
    this.barBelowGeometry.dispose();
    this.barAboveGeometry.dispose();
    this.rectMaterial.dispose();
    this.barBelowMaterial.dispose();
    this.barAboveMaterial.dispose();
  }

  /** Toggle visibility of the rectangle without dropping its geometry. */
  public setRectVisible(visible: boolean): void {
    this.rectLine.visible = visible;
  }

  /** Outline `[sigmaMin, sigmaMax] × [tMin, tMax]`. Pass `null` to clear the
   *  geometry. When `ridgeBand` is true the `tMin`/`tMax` are ignored and the
   *  outline instead traces the curved ridge-range band the scanner actually
   *  covers: `T*(σ) ± Δ` sampled across `[sigmaMin, sigmaMax]` (the "show scan
   *  rectangle" toggle still drives it, even though it's no longer a rectangle).
   *  Visibility is owned by {@link setRectVisible} — this method only updates
   *  the geometry, never overrides the visible flag. */
  public setScanRect(
    rect: { sigmaMin: number; sigmaMax: number; tMin: number; tMax: number; ridgeBand?: boolean } | null,
  ): void {
    if (rect === null) {
      this.rectGeometry.setDrawRange(0, 0);
      return;
    }
    const pts: Array<[number, number]> = rect.ridgeBand === true
      ? ridgeBandOutline(rect.sigmaMin, rect.sigmaMax)
      : [
        // Closed loop: BL → BR → TR → TL → BL
        [rect.sigmaMin, rect.tMin],
        [rect.sigmaMax, rect.tMin],
        [rect.sigmaMax, rect.tMax],
        [rect.sigmaMin, rect.tMax],
        [rect.sigmaMin, rect.tMin],
      ];
    const arr = this.rectGeometry.getAttribute("position").array;
    const n = Math.min(pts.length, MAX_RECT_VERTS);
    for (let i = 0; i < n; i++) {
      arr[i * 3 + 0] = pts[i]![0];
      arr[i * 3 + 1] = pts[i]![1];
      arr[i * 3 + 2] = 0;
    }
    this.rectGeometry.getAttribute("position").needsUpdate = true;
    this.rectGeometry.setDrawRange(0, n);
  }

  /**
   * Position the current-σ vertical bar. Pass `null` to hide. When the active
   * variant uses the empirical scan floor (R1ak), the bar is split at
   * `scanFloorT(sigma)`: below = dim grey (skipped), above = bright cyan
   * (active scan window). For variants that bypass the floor (R1, R2), the
   * whole bar is drawn as one bright segment.
   */
  public setCurrentSigma(
    sigma: number | null,
    tMin: number,
    tMax: number,
    useFloor: boolean = true,
  ): void {
    if (sigma === null) {
      this.barBelow.visible = false;
      this.barAbove.visible = false;
      this.barBelowGeometry.setDrawRange(0, 0);
      this.barAboveGeometry.setDrawRange(0, 0);
      return;
    }
    const floor = useFloor ? scanFloorT(sigma) : -Infinity;
    const splitT = Math.min(Math.max(floor, tMin), tMax);

    const belowArr = this.barBelowGeometry.getAttribute("position").array;
    const aboveArr = this.barAboveGeometry.getAttribute("position").array;

    // Below-floor segment: tMin → splitT
    belowArr[0] = sigma; belowArr[1] = tMin; belowArr[2] = 0;
    belowArr[3] = sigma; belowArr[4] = splitT; belowArr[5] = 0;
    this.barBelowGeometry.getAttribute("position").needsUpdate = true;
    const belowVisible = splitT > tMin;
    this.barBelowGeometry.setDrawRange(0, belowVisible ? 2 : 0);
    this.barBelow.visible = belowVisible;

    // Above-floor segment: splitT → tMax
    aboveArr[0] = sigma; aboveArr[1] = splitT; aboveArr[2] = 0;
    aboveArr[3] = sigma; aboveArr[4] = tMax; aboveArr[5] = 0;
    this.barAboveGeometry.getAttribute("position").needsUpdate = true;
    const aboveVisible = tMax > splitT;
    this.barAboveGeometry.setDrawRange(0, aboveVisible ? 2 : 0);
    this.barAbove.visible = aboveVisible;
  }
}

/**
 * Closed-loop outline (in data space `(σ, T)`) of the ridge-range scan band:
 * the upper edge `T*(σ)+Δ` swept left→right, then the lower edge `T*(σ)−Δ`
 * swept right→left. σ values off the ridge domain (σ ≤ 0, `ridgeInvT` → NaN)
 * are skipped, so a σ range that dips below 0 just yields the on-ridge portion.
 */
function ridgeBandOutline(sigmaMin: number, sigmaMax: number): Array<[number, number]> {
  const lo = Math.min(sigmaMin, sigmaMax);
  const hi = Math.max(sigmaMin, sigmaMax);
  const upper: Array<[number, number]> = [];
  const lower: Array<[number, number]> = [];
  for (let i = 0; i <= RIDGE_BAND_SAMPLES; i++) {
    const sigma = lo + ((hi - lo) * i) / RIDGE_BAND_SAMPLES;
    // Outline the primary (highest-T) crossing — the band the user is exploring
    // at this σ. The scan itself still covers every crossing; this is a guide.
    const crossings = ridgeInvTs(sigma);
    if (crossings.length === 0) continue;
    const tRidge = crossings[crossings.length - 1]!;
    const dt = ridgeBandHalfWidth(tRidge);
    upper.push([sigma, tRidge + dt]);
    lower.push([sigma, Math.max(0.1, tRidge - dt)]);
  }
  if (upper.length === 0) return [];
  // upper (L→R) + lower reversed (R→L) + close back to the first upper point.
  const loop = upper.concat(lower.reverse());
  loop.push(upper[0]!);
  return loop;
}

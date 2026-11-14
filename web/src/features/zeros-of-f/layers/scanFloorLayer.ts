import * as THREE from "three";

import { scanFloorT } from "@/shared/math/zerosOfF/scanFloor";

const SAMPLE_COUNT = 256;

/** Always extend the curve out to at least this σ regardless of the requested range. */
const FLOOR_MIN_SIGMA = -500;

/**
 * Dashed orange line showing `T_floor(σ) = max(1, piBoundaryT(σ) − 50)`.
 * This is the lowest T the scan algorithm will use for a given σ — points
 * below this line are outside the scan window. Cloned from BoundaryCurveLayer.
 */
export class ScanFloorLayer {
  private readonly parent: THREE.Group;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.LineDashedMaterial;
  private readonly line: THREE.Line;

  public constructor(parent: THREE.Group) {
    this.parent = parent;
    const positions = new Float32Array(SAMPLE_COUNT * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.LineDashedMaterial({
      color: 0xff6f00,
      linewidth: 1,
      dashSize: 6,
      gapSize: 4,
    });
    this.line = new THREE.Line(this.geometry, this.material);
    this.line.visible = false;
    this.parent.add(this.line);
  }

  public dispose(): void {
    this.parent.remove(this.line);
    this.geometry.dispose();
    this.material.dispose();
  }

  public setVisible(visible: boolean): void {
    this.line.visible = visible;
  }

  public configureRange(sigmaMin: number, sigmaMax: number, tMin: number, tMax: number, yAxisMode: "T" | "fracT" = "T"): void {
    const positions = this.geometry.getAttribute("position");
    const arr = positions.array;
    const sLo = Math.min(sigmaMin, FLOOR_MIN_SIGMA);
    const sHi = sigmaMax;
    let drawn = 0;
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const f = i / (SAMPLE_COUNT - 1);
      const sigma = sLo + f * (sHi - sLo);
      const t = scanFloorT(sigma);
      if (t < tMin || t > tMax) continue;
      arr[drawn * 3 + 0] = sigma;
      arr[drawn * 3 + 1] = yAxisMode === "fracT" ? t % 1 : t;
      arr[drawn * 3 + 2] = 0;
      drawn++;
    }
    this.geometry.setDrawRange(0, drawn);
    positions.needsUpdate = true;
    this.line.computeLineDistances();
  }
}

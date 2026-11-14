import * as THREE from "three";

import { getCircleSprite } from "@/features/zeros-of-f/layers/scanScatterLayer";
import { imagToIndex } from "@/shared/math/zetaEms";
import { THEOREM5_POINT_N_MAX, theorem5Rho } from "@/shared/math/zerosOfF/theorem5Rho";

/**
 * ρ_N^{(0)} is the leftmost resonance (gold). ρ_N^{(1)} is the other one (blue).
 * Screen-pixel dots, same reason the zeta-zero markers ignore zoom.
 */
const LOWER_COLOR = 0xffd24a;
const UPPER_COLOR = 0x4dc3ff;

/**
 * Plots ρ_N^{(ν)} for ν = 0, 1 and N = 1, …, N_max. N_max comes from the
 * Boundaries slider; 0 draws nothing.
 */
export class Theorem5PointsLayer {
  private readonly parent: THREE.Group;
  private readonly group: THREE.Group;
  private readonly lower: THREE.Points;
  private readonly upper: THREE.Points;
  private maxN = 0;

  public constructor(parent: THREE.Group) {
    this.parent = parent;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.lower = this.makeCloud(LOWER_COLOR);
    this.upper = this.makeCloud(UPPER_COLOR);
    this.group.add(this.lower);
    this.group.add(this.upper);
    this.parent.add(this.group);
  }

  public dispose(): void {
    this.parent.remove(this.group);
    this.lower.geometry.dispose();
    this.upper.geometry.dispose();
    const lowerMaterial = this.lower.material;
    const upperMaterial = this.upper.material;
    if (lowerMaterial instanceof THREE.Material) lowerMaterial.dispose();
    if (upperMaterial instanceof THREE.Material) upperMaterial.dispose();
  }

  /** Hide without forgetting N, so a non-Siegel harvest can restore later. */
  public setVisible(visible: boolean): void {
    this.group.visible = visible && this.maxN >= 1;
  }

  public setMaxN(maxN: number, yAxisMode: "T" | "fracT"): void {
    const capped = Math.max(0, Math.min(THEOREM5_POINT_N_MAX, Math.floor(maxN)));
    this.maxN = capped;
    this.fill(this.lower, 0, capped, yAxisMode);
    this.fill(this.upper, 1, capped, yAxisMode);
    this.group.visible = capped >= 1;
  }

  private makeCloud(color: number): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(THEOREM5_POINT_N_MAX * 3), 3),
    );
    geometry.setDrawRange(0, 0);
    const material = new THREE.PointsMaterial({
      color,
      size: 6,
      sizeAttenuation: false,
      map: getCircleSprite(),
      alphaTest: 0.5,
      transparent: true,
      opacity: 1,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return points;
  }

  private fill(cloud: THREE.Points, nu: 0 | 1, nMax: number, yAxisMode: "T" | "fracT"): void {
    const positions = cloud.geometry.getAttribute("position");
    const arr = positions.array;
    let drawn = 0;
    for (let n = 1; n <= nMax; n++) {
      const rho = theorem5Rho(n, nu);
      if (rho === null) continue;
      // indexFromIofT drops the N = 1 height (t ≈ 1). The Newton inverse
      // still places it, and it agrees with indexFromIofT once T is above 1.
      const index = imagToIndex(rho.t, false);
      if (!Number.isFinite(index)) continue;
      arr[drawn * 3] = rho.sigma;
      arr[drawn * 3 + 1] = yAxisMode === "fracT" ? index % 1 : index;
      arr[drawn * 3 + 2] = 0;
      drawn++;
    }
    cloud.geometry.setDrawRange(0, drawn);
    positions.needsUpdate = true;
    cloud.geometry.computeBoundingSphere();
  }
}

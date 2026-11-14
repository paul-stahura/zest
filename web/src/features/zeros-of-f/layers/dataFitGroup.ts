import * as THREE from "three";

/**
 * Shared THREE.Group whose transform maps `(σ, T)` data space onto the
 * default scene viewport. Layers add objects in raw `(σ, T)` coordinates;
 * the group's position + scale handles the fit.
 *
 * Centralises the fit so the scatter layer and the boundary curve layer
 * stay aligned.
 */
export interface DataFitTransform {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  offsetX: number;
  offsetY: number;
}

export class DataFitGroup {
  public readonly group: THREE.Group;
  private transform: DataFitTransform = { scaleX: 1, scaleY: 1, scaleZ: 1, offsetX: 0, offsetY: 0 };

  public constructor() {
    this.group = new THREE.Group();
  }

  public configureFit(
    sigmaMin: number,
    sigmaMax: number,
    tMin: number,
    tMax: number,
    scaleZ: number = 1,
  ): void {
    const sigmaSpan = Math.max(1e-6, Math.abs(sigmaMax - sigmaMin));
    const tSpan = Math.max(1e-6, Math.abs(tMax - tMin));
    const scaleX = 8 / sigmaSpan;
    const scaleY = 8 / tSpan;
    const offsetX = -((sigmaMin + sigmaMax) / 2) * scaleX;
    const offsetY = -((tMin + tMax) / 2) * scaleY;
    const z = Number.isFinite(scaleZ) && scaleZ > 0 ? scaleZ : 1;
    this.transform = { scaleX, scaleY, scaleZ: z, offsetX, offsetY };
    this.group.position.set(offsetX, offsetY, 0);
    this.group.scale.set(scaleX, scaleY, z);
  }

  public getTransform(): DataFitTransform {
    return { ...this.transform };
  }
}

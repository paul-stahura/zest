import * as THREE from "three";

import { ridgeSigma } from "@/shared/math/zerosOfF";

/** Points sampled within each integer-T band (a smooth arc). */
const PTS_PER_BAND = 20;
/** Cap on how many bands to draw from the low end of the fit range. Covers
 *  T up to ~this value; the ridge beyond it is at σ in the hundred-thousands. */
const MAX_BANDS = 320;
const MAX_VERTS = MAX_BANDS * PTS_PER_BAND * 2;

/**
 * Cyan curve tracing the negative-t zeros ridge σ*(T). Drawn as broken segments
 * (`LineSegments`) sampled **per integer-T band**, so (a) the staircase jump at
 * each integer T is not connected across bands, and (b) the curve stays smooth
 * no matter how wide the fit viewport is (the fit range is T∈[0,3000], so a
 * uniform sampling would step by ~6 in T and draw nothing).
 */
export class NegTZerosRidgeLayer {
  private readonly parent: THREE.Group;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.LineBasicMaterial;
  private readonly line: THREE.LineSegments;

  public constructor(parent: THREE.Group) {
    this.parent = parent;
    const positions = new Float32Array(MAX_VERTS * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.LineBasicMaterial({ color: 0x00e5ff });
    this.line = new THREE.LineSegments(this.geometry, this.material);
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

  public configureRange(
    _sigmaMin: number,
    _sigmaMax: number,
    tMin: number,
    tMax: number,
    yAxisMode: "T" | "fracT" = "T",
  ): void {
    const positions = this.geometry.getAttribute("position");
    const arr = positions.array;
    let v = 0;
    const nStart = Math.max(1, Math.floor(tMin));
    const nEnd = Math.floor(tMax);
    for (let n = nStart; n <= nEnd && n < nStart + MAX_BANDS; n++) {
      let prevSigma = NaN;
      let prevY = NaN;
      for (let i = 0; i <= PTS_PER_BAND; i++) {
        // Sample strictly inside [n, n+1) so ⌊T⌋ stays n across the band.
        const t = n + (i / PTS_PER_BAND) * 0.999999;
        const sigma = ridgeSigma(t, n);
        const y = yAxisMode === "fracT" ? t % 1 : t;
        if (Number.isFinite(sigma) && Number.isFinite(prevSigma) && v + 2 <= MAX_VERTS) {
          arr[v * 3 + 0] = prevSigma;
          arr[v * 3 + 1] = prevY;
          arr[v * 3 + 2] = 0;
          v++;
          arr[v * 3 + 0] = sigma;
          arr[v * 3 + 1] = y;
          arr[v * 3 + 2] = 0;
          v++;
        }
        prevSigma = sigma;
        prevY = y;
      }
    }
    this.geometry.setDrawRange(0, v);
    positions.needsUpdate = true;
  }
}

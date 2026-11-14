import * as THREE from "three";

/**
 * Faint horizontal grid lines at every integer T value within the configured
 * range. Visualises the Σ₁/Σ₂ partial-sum jumps at integer t and the
 * mid-bin sampling gaps the scan algorithm leaves there. fracT mode collapses
 * to a single line at y = 0 (the integer-T positions all map to the same
 * fractional value).
 */
export class IntegerTGridLayer {
  private readonly parent: THREE.Group;
  private readonly group: THREE.Group;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.LineBasicMaterial;
  private readonly lines: THREE.LineSegments;
  /** Cap on number of integer ticks to draw — keeps the GPU buffer bounded
   *  even if someone configures an enormous T window. */
  private static readonly MAX_LINES = 4096;

  public constructor(parent: THREE.Group) {
    this.parent = parent;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.parent.add(this.group);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(IntegerTGridLayer.MAX_LINES * 2 * 3), 3),
    );
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.LineBasicMaterial({
      color: 0x6c7c8c,
      transparent: true,
      opacity: 0.35,
    });
    this.lines = new THREE.LineSegments(this.geometry, this.material);
    this.parent.add(this.lines);
  }

  public dispose(): void {
    this.parent.remove(this.lines);
    this.geometry.dispose();
    this.material.dispose();
  }

  public setVisible(visible: boolean): void {
    this.lines.visible = visible;
  }

  public configureRange(
    sigmaMin: number,
    sigmaMax: number,
    tMin: number,
    tMax: number,
    yAxisMode: "T" | "fracT" = "T",
  ): void {
    const positions = this.geometry.getAttribute("position");
    const arr = positions.array;
    let drawn = 0;

    if (yAxisMode === "fracT") {
      // Every integer T folds to fracT = 0. Draw a single horizontal line
      // there as a visual anchor.
      arr[0] = sigmaMin; arr[1] = 0; arr[2] = 0;
      arr[3] = sigmaMax; arr[4] = 0; arr[5] = 0;
      drawn = 1;
    } else {
      const kStart = Math.ceil(Math.max(tMin, -1e9));
      const kEnd = Math.floor(Math.min(tMax, 1e9));
      const total = Math.max(0, kEnd - kStart + 1);
      const cap = Math.min(total, IntegerTGridLayer.MAX_LINES);
      // If too many to draw individually, sub-sample uniformly.
      const stride = Math.max(1, Math.ceil(total / cap));
      for (let k = kStart; k <= kEnd; k += stride) {
        if (drawn >= IntegerTGridLayer.MAX_LINES) break;
        const idx = drawn * 6;
        arr[idx + 0] = sigmaMin; arr[idx + 1] = k; arr[idx + 2] = 0;
        arr[idx + 3] = sigmaMax; arr[idx + 4] = k; arr[idx + 5] = 0;
        drawn++;
      }
    }

    this.geometry.setDrawRange(0, drawn * 2);
    positions.needsUpdate = true;
  }
}

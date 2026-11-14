import * as THREE from "three";

const POINT_COLOR_MAGENTA: [number, number, number] = [1, 0, 1];

/**
 * Magenta-dot overlay for T-average post-processing — port of the Python
 * "Show averaged pts" panel. The model computes per-bucket averages and
 * pushes them in via `setAverages`.
 */
export class TAveragesLayer {
  private readonly parent: THREE.Group;
  private readonly group: THREE.Group;
  private readonly material: THREE.PointsMaterial;
  private points: THREE.Points | null = null;

  public constructor(parent: THREE.Group) {
    this.parent = parent;
    this.group = new THREE.Group();
    this.parent.add(this.group);
    this.material = new THREE.PointsMaterial({
      vertexColors: true,
      size: 5,
      sizeAttenuation: false,
    });
  }

  public dispose(): void {
    this.removePoints();
    this.parent.remove(this.group);
    this.material.dispose();
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  /**
   * Replace the displayed averages. Each entry is `(avgSigma, avgT)`.
   */
  public setAverages(points: Array<{ sigma: number; t: number }>, yAxisMode: "T" | "fracT" = "T"): void {
    this.removePoints();
    if (points.length === 0) return;
    const positions = new Float32Array(points.length * 3);
    const colors = new Uint8Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      positions[i * 3 + 0] = points[i]!.sigma;
      positions[i * 3 + 1] = yAxisMode === "fracT" ? points[i]!.t % 1 : points[i]!.t;
      positions[i * 3 + 2] = 0;
      colors[i * 3 + 0] = Math.round(POINT_COLOR_MAGENTA[0] * 255);
      colors[i * 3 + 1] = Math.round(POINT_COLOR_MAGENTA[1] * 255);
      colors[i * 3 + 2] = Math.round(POINT_COLOR_MAGENTA[2] * 255);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const colorAttr = new THREE.BufferAttribute(colors, 3, true);
    geometry.setAttribute("color", colorAttr);
    this.points = new THREE.Points(geometry, this.material);
    this.group.add(this.points);
  }

  private removePoints(): void {
    if (this.points !== null) {
      this.group.remove(this.points);
      this.points.geometry.dispose();
      this.points = null;
    }
  }
}

/**
 * Compute T-average post-process: bucket each `(σ, T, yVal)` triple by
 * `round(T * 10000)`, take the mean σ + mean T per bucket. Only points with
 * `yVal < threshold` are included.
 *
 * Pure function so it can also run inside a future worker.
 */
export function computeTAverages(
  iter: (cb: (sigma: number, t: number, yVal: number) => void) => void,
  threshold: number,
): Array<{ sigma: number; t: number }> {
  const sumSigma = new Map<number, number>();
  const sumT = new Map<number, number>();
  const count = new Map<number, number>();
  iter((sigma, t, y) => {
    if (y >= threshold) return;
    const key = Math.round(t * 10000);
    sumSigma.set(key, (sumSigma.get(key) ?? 0) + sigma);
    sumT.set(key, (sumT.get(key) ?? 0) + t);
    count.set(key, (count.get(key) ?? 0) + 1);
  });
  const out: Array<{ sigma: number; t: number }> = [];
  for (const [key, n] of count) {
    out.push({
      sigma: sumSigma.get(key)! / n,
      t: sumT.get(key)! / n,
    });
  }
  return out;
}

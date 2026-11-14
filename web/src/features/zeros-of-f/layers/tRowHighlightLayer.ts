import * as THREE from "three";

const CYAN: [number, number, number] = [0, 0.8, 1];
const ORANGE: [number, number, number] = [1, 0.55, 0];

/**
 * Cyan-circles + orange-star overlay for the "Highlight row" feature — port
 * of Python's int(T)+frac slider lookup. Caller computes the matching points
 * and the bucket mean and pushes them in via `setHighlight`.
 */
export class TRowHighlightLayer {
  private readonly parent: THREE.Group;
  private readonly group: THREE.Group;
  private readonly cyanMaterial: THREE.PointsMaterial;
  private readonly orangeMaterial: THREE.PointsMaterial;
  private cyanPoints: THREE.Points | null = null;
  private orangePoint: THREE.Points | null = null;

  public constructor(parent: THREE.Group) {
    this.parent = parent;
    this.group = new THREE.Group();
    this.parent.add(this.group);
    this.cyanMaterial = new THREE.PointsMaterial({
      vertexColors: true,
      size: 10,
      sizeAttenuation: false,
    });
    this.orangeMaterial = new THREE.PointsMaterial({
      vertexColors: true,
      size: 18,
      sizeAttenuation: false,
    });
  }

  public dispose(): void {
    this.removeAll();
    this.parent.remove(this.group);
    this.cyanMaterial.dispose();
    this.orangeMaterial.dispose();
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public setHighlight(
    raw: Array<{ sigma: number; t: number }>,
    average: { sigma: number; t: number } | null,
    yAxisMode: "T" | "fracT" = "T",
  ): void {
    this.removeAll();
    if (raw.length > 0) {
      const positions = new Float32Array(raw.length * 3);
      const colors = new Uint8Array(raw.length * 3);
      for (let i = 0; i < raw.length; i++) {
        positions[i * 3 + 0] = raw[i]!.sigma;
        positions[i * 3 + 1] = yAxisMode === "fracT" ? raw[i]!.t % 1 : raw[i]!.t;
        positions[i * 3 + 2] = 0;
        colors[i * 3 + 0] = Math.round(CYAN[0] * 255);
        colors[i * 3 + 1] = Math.round(CYAN[1] * 255);
        colors[i * 3 + 2] = Math.round(CYAN[2] * 255);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3, true));
      this.cyanPoints = new THREE.Points(g, this.cyanMaterial);
      this.group.add(this.cyanPoints);
    }
    if (average !== null) {
      const avgT = yAxisMode === "fracT" ? average.t % 1 : average.t;
      const positions = new Float32Array([average.sigma, avgT, 0]);
      const colors = new Uint8Array([
        Math.round(ORANGE[0] * 255),
        Math.round(ORANGE[1] * 255),
        Math.round(ORANGE[2] * 255),
      ]);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3, true));
      this.orangePoint = new THREE.Points(g, this.orangeMaterial);
      this.group.add(this.orangePoint);
    }
  }

  private removeAll(): void {
    if (this.cyanPoints !== null) {
      this.group.remove(this.cyanPoints);
      this.cyanPoints.geometry.dispose();
      this.cyanPoints = null;
    }
    if (this.orangePoint !== null) {
      this.group.remove(this.orangePoint);
      this.orangePoint.geometry.dispose();
      this.orangePoint = null;
    }
  }
}

/**
 * Compute matching raw points + bucket average for an exact T value
 * `intT + frac` (rounded to 4 decimal places, matching Python semantics).
 */
export function computeTRowHighlight(
  iter: (cb: (sigma: number, t: number) => void) => void,
  intT: number,
  fracPos: number,
): { raw: Array<{ sigma: number; t: number }>; average: { sigma: number; t: number } | null } {
  const targetKey = Math.round((intT + fracPos / 10000) * 10000);
  const raw: Array<{ sigma: number; t: number }> = [];
  let sumSigma = 0;
  let sumT = 0;
  iter((sigma, t) => {
    if (Math.round(t * 10000) !== targetKey) return;
    raw.push({ sigma, t });
    sumSigma += sigma;
    sumT += t;
  });
  const average =
    raw.length > 0 ? { sigma: sumSigma / raw.length, t: sumT / raw.length } : null;
  return { raw, average };
}

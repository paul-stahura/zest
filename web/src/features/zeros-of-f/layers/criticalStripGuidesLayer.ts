import * as THREE from "three";

/**
 * Three vertical reference lines spanning the full T range:
 *   - solid pale green at σ = 0
 *   - solid pale green at σ = 1
 *   - solid 50% grey at σ = 1/2  (the critical line)
 *
 * Toggled as a single unit by `setVisible`. The lines re-extend through
 * `configureRange` whenever the viewport changes so they always run from
 * `tMin` to `tMax` (and respect `fracT` mode by clamping to [0, 1]).
 */
export class CriticalStripGuidesLayer {
  private readonly parent: THREE.Group;
  private readonly group: THREE.Group;
  private readonly solidGeometry: THREE.BufferGeometry;
  private readonly solidMaterial: THREE.LineBasicMaterial;
  private readonly solid: THREE.LineSegments;
  private readonly midGeometry: THREE.BufferGeometry;
  private readonly midMaterial: THREE.LineBasicMaterial;
  private readonly mid: THREE.LineSegments;

  public constructor(parent: THREE.Group) {
    this.parent = parent;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.parent.add(this.group);

    // Two segments for σ=0 and σ=1.
    const solidPos = new Float32Array(4 * 3);
    this.solidGeometry = new THREE.BufferGeometry();
    this.solidGeometry.setAttribute("position", new THREE.BufferAttribute(solidPos, 3));
    this.solidMaterial = new THREE.LineBasicMaterial({
      color: 0xd6f5d6,
      transparent: true,
      opacity: 0.5,
    });
    this.solid = new THREE.LineSegments(this.solidGeometry, this.solidMaterial);
    this.group.add(this.solid);

    // Solid 50%-grey segment for σ = 1/2 (the critical line).
    const midPos = new Float32Array(2 * 3);
    this.midGeometry = new THREE.BufferGeometry();
    this.midGeometry.setAttribute("position", new THREE.BufferAttribute(midPos, 3));
    this.midMaterial = new THREE.LineBasicMaterial({
      color: 0x333333,
    });
    this.mid = new THREE.LineSegments(this.midGeometry, this.midMaterial);
    this.group.add(this.mid);
  }

  public dispose(): void {
    this.parent.remove(this.group);
    this.solidGeometry.dispose();
    this.solidMaterial.dispose();
    this.midGeometry.dispose();
    this.midMaterial.dispose();
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public configureRange(
    _sigmaMin: number,
    _sigmaMax: number,
    _tMin: number,
    _tMax: number,
    yAxisMode: "T" | "fracT" = "T",
  ): void {
    // Lines span the full archive T range so they stay visible while the
    // user pans/zooms — the viewport clamp (in the workspace model) controls
    // what initially shows on screen.
    const yLo = yAxisMode === "fracT" ? 0 : 0;
    const yHi = yAxisMode === "fracT" ? 1 : 3000;
    const solidPos = this.solidGeometry.getAttribute("position");
    const sa = solidPos.array;
    // σ = 0
    sa[0] = 0; sa[1] = yLo; sa[2] = 0;
    sa[3] = 0; sa[4] = yHi; sa[5] = 0;
    // σ = 1
    sa[6] = 1; sa[7] = yLo; sa[8] = 0;
    sa[9] = 1; sa[10] = yHi; sa[11] = 0;
    solidPos.needsUpdate = true;

    const midPos = this.midGeometry.getAttribute("position");
    const da = midPos.array;
    da[0] = 0.5; da[1] = yLo; da[2] = 0;
    da[3] = 0.5; da[4] = yHi; da[5] = 0;
    midPos.needsUpdate = true;
  }
}

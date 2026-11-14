import * as THREE from "three";

import type { SegmentPoint } from "@/features/zeros-of-f/postprocess/segmentPostProcess";

const POINT_COLOR_GREEN: [number, number, number] = [0.2, 0.9, 0.2];

/**
 * Green-dot overlay for segment post-processing representatives.
 * Replaces the old TAveragesLayer (magenta dots).
 */
export class SegmentPostProcLayer {
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
      size: 6,
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

  public setPoints(pts: SegmentPoint[], yAxisMode: "T" | "fracT" = "T"): void {
    this.removePoints();
    if (pts.length === 0) return;
    const positions = new Float32Array(pts.length * 3);
    const colors = new Uint8Array(pts.length * 3);
    for (let i = 0; i < pts.length; i++) {
      positions[i * 3 + 0] = pts[i]!.sigma;
      positions[i * 3 + 1] = yAxisMode === "fracT" ? pts[i]!.t % 1 : pts[i]!.t;
      positions[i * 3 + 2] = 0;
      colors[i * 3 + 0] = Math.round(POINT_COLOR_GREEN[0] * 255);
      colors[i * 3 + 1] = Math.round(POINT_COLOR_GREEN[1] * 255);
      colors[i * 3 + 2] = Math.round(POINT_COLOR_GREEN[2] * 255);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3, true));
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

import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

// Re-exported so existing call sites that import from this layer keep working.
export { piBoundaryT } from "@/shared/math/zerosOfF/scanFloor";
import { piBoundaryT } from "@/shared/math/zerosOfF/scanFloor";

const SAMPLE_COUNT = 256;

/** Fixed σ span for every envelope polyline, independent of the current zoom. */
const BOUNDARY_SIGMA_MIN = -1500;
const BOUNDARY_SIGMA_MAX = 1;

/**
 * Renders the π-boundary curve as a single THREE.Line in the data-fit group.
 * Toggle via the workspace `display.showBoundary` flag. Re-sample on
 * `configureRange` when the scan range changes.
 */
type ThinStroke = {
  kind: "thin";
  geometry: THREE.BufferGeometry;
  material: THREE.LineBasicMaterial;
  line: THREE.Line;
};

type ThickStroke = {
  kind: "thick";
  geometry: LineGeometry;
  material: LineMaterial;
  line: Line2;
};

export class BoundaryCurveLayer {
  private readonly parent: THREE.Group;
  private readonly stroke: ThinStroke | ThickStroke;
  private tOfSigma: (sigma: number) => number;
  private wantVisible = false;
  private pointCount = 0;

  /**
   * @param tOfSigma maps σ → boundary T (defaults to the π-boundary). A sample
   *   whose T is non-finite (e.g. the Arias boundary at σ > 0) is skipped, so a
   *   formula can be domain-restricted.
   * @param color line color (default the π-boundary pink-red).
   * @param pixelWidth screen-pixel thickness. WebGL ignores `linewidth` on
   *   THREE.Line, so a width above 1 is drawn as a Line2.
   */
  public constructor(
    parent: THREE.Group,
    tOfSigma: (sigma: number) => number = piBoundaryT,
    color = 0xff5577,
    pixelWidth = 1,
  ) {
    this.parent = parent;
    this.tOfSigma = tOfSigma;
    if (pixelWidth > 1) {
      const geometry = new LineGeometry();
      const material = new LineMaterial({ color });
      // The linewidth getter exists at runtime but is missing from the type
      // declaration, so write the uniform the shader actually reads.
      const widthUniform = material.uniforms.linewidth;
      if (widthUniform === undefined) {
        throw new Error("LineMaterial is missing its linewidth uniform");
      }
      widthUniform.value = pixelWidth;
      const line = new Line2(geometry, material);
      line.visible = false;
      this.stroke = { kind: "thick", geometry, material, line };
    } else {
      const positions = new Float32Array(SAMPLE_COUNT * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setDrawRange(0, 0);
      const material = new THREE.LineBasicMaterial({ color, linewidth: 1 });
      const line = new THREE.Line(geometry, material);
      line.visible = false;
      this.stroke = { kind: "thin", geometry, material, line };
    }
    this.parent.add(this.stroke.line);
  }

  public dispose(): void {
    this.parent.remove(this.stroke.line);
    this.stroke.geometry.dispose();
    this.stroke.material.dispose();
  }

  public setVisible(visible: boolean): void {
    this.wantVisible = visible;
    this.applyVisibility();
  }

  /** Swap the σ → T formula (used when the exact-{T} slider picks a new slice). */
  public setTOfSigma(tOfSigma: (sigma: number) => number): void {
    this.tOfSigma = tOfSigma;
  }

  public setColor(color: number): void {
    this.stroke.material.color.setHex(color);
  }

  private applyVisibility(): void {
    const hasStroke = this.stroke.kind === "thin" || this.pointCount >= 2;
    this.stroke.line.visible = this.wantVisible && hasStroke;
  }

  /**
   * Re-sample the curve on σ ∈ [−1500, 1]. Viewport arguments are ignored so
   * zoom/fit cannot shorten the polyline.
   */
  public configureRange(
    _sigmaMin: number,
    _sigmaMax: number,
    _tMin: number,
    _tMax: number,
    yAxisMode: "T" | "fracT" = "T",
  ): void {
    const sLo = BOUNDARY_SIGMA_MIN;
    const sHi = BOUNDARY_SIGMA_MAX;
    const sampled = new Float32Array(SAMPLE_COUNT * 3);
    let drawn = 0;
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const f = i / (SAMPLE_COUNT - 1);
      const sigma = sLo + f * (sHi - sLo);
      const t = this.tOfSigma(sigma);
      if (!Number.isFinite(t)) continue;
      sampled[drawn * 3 + 0] = sigma;
      sampled[drawn * 3 + 1] = yAxisMode === "fracT" ? t % 1 : t;
      sampled[drawn * 3 + 2] = 0;
      drawn++;
    }
    this.pointCount = drawn;
    if (this.stroke.kind === "thin") {
      const positions = this.stroke.geometry.getAttribute("position");
      const arr = positions.array;
      for (let i = 0; i < drawn * 3; i++) arr[i] = sampled[i] ?? 0;
      this.stroke.geometry.setDrawRange(0, drawn);
      positions.needsUpdate = true;
      // First paint can run while the line is still empty (toggle off). Three.js
      // then caches a zero-radius sphere at the origin and frustum-culls later
      // updates unless we recompute after filling positions.
      this.stroke.geometry.computeBoundingSphere();
      this.stroke.geometry.computeBoundingBox();
    } else if (drawn >= 2) {
      this.stroke.geometry.setPositions(sampled.subarray(0, drawn * 3));
      this.stroke.geometry.computeBoundingSphere();
      this.stroke.geometry.computeBoundingBox();
    }
    this.applyVisibility();
  }
}

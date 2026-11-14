import * as THREE from "three";

/** One per-T-band box and its computed zero count. */
export interface ZeroCountBox {
  /** Integer T at the bottom edge of this box (box covers [t, t+1]). */
  t: number;
  /** 1-based box number for display, with 1 at the lowest T. */
  index: number;
  /** Argument-principle count; undefined while pending, null if failed. */
  count: number | null | undefined;
  /** Wall-clock ms taken by the compute backend (Worker or Lambda) for this box.
   *  undefined while pending; set on completion (success OR failure). */
  elapsedMs?: number;
}

/**
 * Yellow box outlines for the "zero count boxes" stack plus an inline graph
 * superimposed over the boxes (x = count, y = box center). Box numbers and
 * counts are rendered by a sibling React overlay that subscribes to the data
 * (because THREE has no built-in text); this layer owns only the boxes + graph.
 */
export class ZeroCountBoxesLayer {
  private readonly parent: THREE.Group;
  private readonly group: THREE.Group;
  private readonly boxesLines: THREE.LineSegments;
  private readonly graphLine: THREE.Line;
  private readonly graphDots: THREE.Points;
  /** Currently rendered state — kept so React overlay can read counts. */
  private boxes: ZeroCountBox[] = [];
  private sigmaMin = 0;
  private sigmaMax = 1;
  private maxCount = 1;
  private wantVisible = false;

  public constructor(parent: THREE.Group) {
    this.parent = parent;
    this.group = new THREE.Group();
    this.group.position.z = -0.45;  // in front of heatmap (-0.5), behind scatter (0)
    this.parent.add(this.group);

    const boxGeom = new THREE.BufferGeometry();
    boxGeom.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(0), 3));
    this.boxesLines = new THREE.LineSegments(
      boxGeom,
      new THREE.LineBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.85, depthTest: false }),
    );
    this.boxesLines.frustumCulled = false;
    this.group.add(this.boxesLines);

    const graphGeom = new THREE.BufferGeometry();
    graphGeom.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(0), 3));
    this.graphLine = new THREE.Line(
      graphGeom,
      new THREE.LineBasicMaterial({ color: 0x66ddff, transparent: true, opacity: 0.9, depthTest: false }),
    );
    this.graphLine.frustumCulled = false;
    this.group.add(this.graphLine);

    const dotsGeom = new THREE.BufferGeometry();
    dotsGeom.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(0), 3));
    this.graphDots = new THREE.Points(
      dotsGeom,
      new THREE.PointsMaterial({ color: 0xffffff, size: 6, sizeAttenuation: false, depthTest: false }),
    );
    this.graphDots.frustumCulled = false;
    this.group.add(this.graphDots);

    this.group.visible = false;
  }

  public dispose(): void {
    this.parent.remove(this.group);
    this.boxesLines.geometry.dispose();
    (this.boxesLines.material as THREE.Material).dispose();
    this.graphLine.geometry.dispose();
    (this.graphLine.material as THREE.Material).dispose();
    this.graphDots.geometry.dispose();
    (this.graphDots.material as THREE.Material).dispose();
  }

  public setVisible(visible: boolean): void {
    this.wantVisible = visible;
    this.group.visible = visible;
  }

  public isVisible(): boolean { return this.wantVisible; }

  public getBoxes(): ZeroCountBox[] { return this.boxes; }
  public getSigmaRange(): { min: number; max: number } { return { min: this.sigmaMin, max: this.sigmaMax }; }
  public getMaxCount(): number { return this.maxCount; }

  /** Set the boxes + their σ extent. Recomputes maxCount from whatever counts
   *  are already on the boxes (so cache-restored runs get correct graph
   *  scaling immediately, not 0..1 from the field's initial value). */
  public setBoxes(boxes: ZeroCountBox[], sigmaMin: number, sigmaMax: number): void {
    this.boxes = boxes;
    this.sigmaMin = sigmaMin;
    this.sigmaMax = sigmaMax;
    let m = 1;
    for (const b of boxes) if (typeof b.count === "number" && b.count > m) m = b.count;
    this.maxCount = m;
    this.rebuildGeometry();
  }

  /** Update a single box's count (called as each box finishes). */
  public updateBoxCount(index: number, count: number | null, elapsedMs?: number): void {
    const box = this.boxes.find((b) => b.index === index);
    if (box === undefined) return;
    box.count = count;
    if (elapsedMs !== undefined) box.elapsedMs = elapsedMs;
    if (typeof count === "number" && count > this.maxCount) this.maxCount = count;
    this.rebuildGeometry();
  }

  private rebuildGeometry(): void {
    // Yellow boxes: 4 sides each = 8 vertices in LineSegments.
    const n = this.boxes.length;
    if (n === 0) {
      (this.boxesLines.geometry.getAttribute("position") as THREE.BufferAttribute).copyArray(new Float32Array(0));
      (this.boxesLines.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      return;
    }
    const boxPositions = new Float32Array(n * 8 * 3);
    for (let i = 0; i < n; i++) {
      const b = this.boxes[i]!;
      const y0 = b.t;
      const y1 = b.t + 1;
      const x0 = this.sigmaMin;
      const x1 = this.sigmaMax;
      const o = i * 8 * 3;
      // bottom: (x0,y0) → (x1,y0)
      boxPositions[o + 0] = x0;  boxPositions[o + 1] = y0;  boxPositions[o + 2] = 0;
      boxPositions[o + 3] = x1;  boxPositions[o + 4] = y0;  boxPositions[o + 5] = 0;
      // right: (x1,y0) → (x1,y1)
      boxPositions[o + 6] = x1;  boxPositions[o + 7] = y0;  boxPositions[o + 8] = 0;
      boxPositions[o + 9] = x1;  boxPositions[o + 10] = y1; boxPositions[o + 11] = 0;
      // top: (x1,y1) → (x0,y1)
      boxPositions[o + 12] = x1; boxPositions[o + 13] = y1; boxPositions[o + 14] = 0;
      boxPositions[o + 15] = x0; boxPositions[o + 16] = y1; boxPositions[o + 17] = 0;
      // left: (x0,y1) → (x0,y0)
      boxPositions[o + 18] = x0; boxPositions[o + 19] = y1; boxPositions[o + 20] = 0;
      boxPositions[o + 21] = x0; boxPositions[o + 22] = y0; boxPositions[o + 23] = 0;
    }
    this.boxesLines.geometry.setAttribute("position", new THREE.Float32BufferAttribute(boxPositions, 3));
    (this.boxesLines.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    this.boxesLines.geometry.computeBoundingSphere();

    // Inline graph: dots at each box-center y for each known count. x is
    // mapped from count (0..maxCount) to a linear sub-range of σ-axis. We
    // leave a 5% gap on the right for the count text label.
    const done = this.boxes.filter((b): b is ZeroCountBox & { count: number } => typeof b.count === "number");
    if (done.length === 0) {
      (this.graphLine.geometry.getAttribute("position") as THREE.BufferAttribute).copyArray(new Float32Array(0));
      (this.graphLine.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      (this.graphDots.geometry.getAttribute("position") as THREE.BufferAttribute).copyArray(new Float32Array(0));
      (this.graphDots.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      return;
    }
    const span = this.sigmaMax - this.sigmaMin;
    const x0 = this.sigmaMin + 0.02 * span;
    const x1 = this.sigmaMin + 0.80 * span;  // leave right 20% for the count text label
    const denom = Math.max(1, this.maxCount);
    const linePos = new Float32Array(done.length * 3);
    const dotPos = new Float32Array(done.length * 3);
    for (let i = 0; i < done.length; i++) {
      const b = done[i]!;
      const cx = x0 + (b.count / denom) * (x1 - x0);
      const cy = b.t + 0.5;
      linePos[i * 3 + 0] = cx; linePos[i * 3 + 1] = cy; linePos[i * 3 + 2] = 0;
      dotPos[i * 3 + 0]  = cx; dotPos[i * 3 + 1]  = cy; dotPos[i * 3 + 2]  = 0;
    }
    this.graphLine.geometry.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
    (this.graphLine.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    this.graphLine.geometry.computeBoundingSphere();
    this.graphDots.geometry.setAttribute("position", new THREE.Float32BufferAttribute(dotPos, 3));
    (this.graphDots.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    this.graphDots.geometry.computeBoundingSphere();
  }
}

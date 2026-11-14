import { createElement } from "react";
import * as THREE from "three";

import {
  formatZetaLogDeriv,
  zetaLogDerivAtIndex,
  type ZetaLogDerivSample,
} from "@/features/zeta-log-deriv/zetaLogDerivAtIndex";
import {
  bisectorFoot,
  rhoHalfDiagram,
  rhoHalfLabels,
  type PlanePoint,
  type RhoHalfLabel,
} from "@/features/zeta-log-deriv/rhoHalfDiagram";
import { pathIndices, splitPath, type PathSide } from "@/features/zeta-log-deriv/zetaLogDerivPath";
import { IndexTRow, IntegerPartTRow } from "@/features/main-workspace/spiralWorkspaceLayer";
import { chiLogDeriv } from "@/shared/math/b1Star";
import { complex } from "@/shared/math/complex";
import { imagToIndex, indexToImag } from "@/shared/math/zetaEms";
import { OrthographicPanZoomSceneController } from "@/shared/rendering/orthographicPanZoomSceneController";
import type {
  SelectionState,
  ToolboxContext,
  ToolboxSection,
  VisualizationModel,
} from "@/shared/visualization/contracts";

const INDEX_MAX = 10000 - 1e-9;
/** Same green as the main-tab ζ′/ζ marker. */
const POINT_COLOR = 0x2ecc71;
const PATH_COLOR = 0xb6f5c8;
const AXIS_COLOR = 0x3a4158;
const BISECTOR_COLOR = 0x5aa7e6;
const SEGMENT_COLOR = 0xb0b4c0;
const ANGLE_COLOR = 0xd5d8e2;
const DIAGRAM_DOT = 0xf2f4f8;
/** On-screen radius of the value marker, in CSS pixels. */
const DOT_CSS_RADIUS = 4;
const DIAGRAM_DOT_RADIUS = 3.5;

function makeAxis(): THREE.LineSegments {
  const positions = new Float32Array([
    -1e4, 0, 0, 1e4, 0, 0,
    0, -1e4, 0, 0, 1e4, 0,
  ]);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({ color: AXIS_COLOR, depthTest: false, depthWrite: false });
  const line = new THREE.LineSegments(geom, mat);
  line.renderOrder = 0;
  return line;
}

function makeDot(color: number, renderOrder: number): THREE.Mesh {
  const geom = new THREE.CircleGeometry(1, 24);
  const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({
    color,
    depthTest: false,
    depthWrite: false,
  }));
  mesh.scale.set(0, 0, 1);
  mesh.renderOrder = renderOrder;
  return mesh;
}

function makeLine(vertexCount: number, material: THREE.Material, renderOrder: number): THREE.Line {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
  const line = new THREE.Line(geom, material);
  line.renderOrder = renderOrder;
  return line;
}

function writeLine(line: THREE.Line, pts: readonly PlanePoint[]): void {
  const attr = line.geometry.getAttribute("position");
  if (!(attr instanceof THREE.BufferAttribute)) return;
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    if (p === undefined) continue;
    attr.setXYZ(i, p.x, p.y, 0);
  }
  attr.needsUpdate = true;
}

/**
 * ζ′/ζ at the current σ and index T. The right-hand controls are the main
 * tab's σ and T rows. The left pane is the Argand point of the quotient,
 * with the Figure-4 bisector of w when that toggle is on.
 */
export class ZetaLogDerivModel implements VisualizationModel {
  private readonly controller = new OrthographicPanZoomSceneController();
  private readonly selection: SelectionState = { activePoint: null };
  private readonly axis = makeAxis();
  private readonly dot = makeDot(POINT_COLOR, 6);
  private readonly diagram = new THREE.Group();
  private readonly segmentMat = new THREE.LineDashedMaterial({
    color: SEGMENT_COLOR,
    dashSize: 0.06,
    gapSize: 0.04,
    depthTest: false,
    depthWrite: false,
  });
  private readonly segmentLine: THREE.Line;
  private readonly bisectorLine: THREE.Line;
  private readonly angleLine: THREE.Line;
  private readonly originDot = makeDot(DIAGRAM_DOT, 5);
  private readonly wDot = makeDot(DIAGRAM_DOT, 5);
  private readonly midDot = makeDot(DIAGRAM_DOT, 5);
  private readonly bisectorDot = makeDot(BISECTOR_COLOR, 5);
  private readonly interceptDot = makeDot(BISECTOR_COLOR, 5);
  private readonly pathGroup = new THREE.Group();
  private readonly pathMat = new THREE.LineBasicMaterial({
    color: PATH_COLOR,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
    depthWrite: false,
  });
  private sigma = 0.5;
  private sigmaMin = 0;
  private sigmaMax = 1;
  private sigmaStep = 0.001;
  private index = 6.18;
  private pathLength = 0;
  private pathLimit = 0.1;
  private pathSide: PathSide = "both";
  private showRhoHalf = true;
  private markers: readonly RhoHalfLabel[] = [];
  private sample: ZetaLogDerivSample = zetaLogDerivAtIndex(0.5, 6.18);
  private unsubscribeFrame: (() => void) | null = null;

  public constructor() {
    const solid = (color: number): THREE.LineBasicMaterial => new THREE.LineBasicMaterial({
      color,
      depthTest: false,
      depthWrite: false,
    });
    this.bisectorLine = makeLine(2, solid(BISECTOR_COLOR), 1);
    this.segmentLine = makeLine(2, this.segmentMat, 2);
    this.angleLine = makeLine(4, solid(ANGLE_COLOR), 3);
    this.diagram.add(this.bisectorLine);
    this.diagram.add(this.segmentLine);
    this.diagram.add(this.angleLine);
    this.diagram.add(this.originDot);
    this.diagram.add(this.wDot);
    this.diagram.add(this.midDot);
    this.diagram.add(this.bisectorDot);
    this.diagram.add(this.interceptDot);
    this.pathGroup.renderOrder = 4;
    this.controller.featureRoot.add(this.axis);
    this.controller.featureRoot.add(this.diagram);
    this.controller.featureRoot.add(this.pathGroup);
    this.controller.featureRoot.add(this.dot);
    this.controller.setAspectLockTargetZoomY(() => this.controller.getZoomX());
    this.sync();
    this.unsubscribeFrame = this.controller.addFrameListener(() => {
      this.scaleMarker(this.dot, DOT_CSS_RADIUS);
      this.scaleMarker(this.originDot, DIAGRAM_DOT_RADIUS);
      this.scaleMarker(this.wDot, DIAGRAM_DOT_RADIUS);
      this.scaleMarker(this.midDot, DIAGRAM_DOT_RADIUS);
      this.scaleMarker(this.bisectorDot, 6.5);
      this.scaleMarker(this.interceptDot, DIAGRAM_DOT_RADIUS);
      this.updateDash();
    });
  }

  public initialize(): void {
    this.sync();
  }

  public dispose(): void {
    this.unsubscribeFrame?.();
    this.unsubscribeFrame = null;
    this.clearPath();
    this.pathMat.dispose();
    this.axis.geometry.dispose();
    const axisMat = this.axis.material;
    if (!Array.isArray(axisMat)) axisMat.dispose();
    this.disposeLine(this.bisectorLine);
    this.disposeLine(this.segmentLine);
    this.disposeLine(this.angleLine);
    this.disposeDot(this.dot);
    this.disposeDot(this.originDot);
    this.disposeDot(this.wDot);
    this.disposeDot(this.midDot);
    this.disposeDot(this.bisectorDot);
    this.disposeDot(this.interceptDot);
    this.controller.dispose();
  }

  public getSceneController(): OrthographicPanZoomSceneController {
    return this.controller;
  }

  public getSelectionState(): SelectionState {
    return this.selection;
  }

  /** Latest sample, so the overlay can show the number without recomputing ζ. */
  public getSample(): ZetaLogDerivSample {
    return this.sample;
  }

  public getSigma(): number {
    return this.sigma;
  }

  public getIndex(): number {
    return this.index;
  }

  public getReadout(): string {
    return formatZetaLogDeriv(this.sample);
  }

  /** Captions for the Figure-4 diagram. Empty when the toggle is off. */
  public getRhoHalfMarkers(): readonly RhoHalfLabel[] {
    return this.markers;
  }

  public getToolboxContributions(ctx: ToolboxContext): ToolboxSection[] {
    const refresh = (): void => {
      ctx.requestToolboxRefresh();
    };
    return [
      {
        id: "top-controls",
        contributorId: "zeta-log-deriv:top",
        title: "",
        bare: true,
        order: 1,
        controls: [
          {
            kind: "custom",
            id: "index-T-and-t",
            render: () => createElement(IndexTRow, {
              indexValue: this.index,
              tValue: indexToImag(this.index, false),
              onTChange: (v: number) => {
                this.setIndex(v);
                refresh();
              },
              onTFromtChange: (tIn: number) => {
                this.setIndex(imagToIndex(Math.max(0, tIn), false));
                refresh();
              },
            }),
          },
          {
            kind: "range-slider",
            id: "sigma",
            label: "σ",
            value: this.sigma,
            defaultValue: 0.5,
            min: this.sigmaMin,
            max: this.sigmaMax,
            step: this.sigmaStep,
            onChange: (value: number) => {
              this.sigma = value;
              this.sync();
              refresh();
            },
            onStepChange: (step: number) => {
              this.sigmaStep = step;
              refresh();
            },
            onRangeChange: (newMin: number, newMax: number) => {
              this.sigmaMin = newMin;
              this.sigmaMax = newMax;
              refresh();
            },
          },
          {
            kind: "custom",
            id: "index-int",
            render: () => createElement(IntegerPartTRow, {
              intValue: Math.trunc(this.index),
              onChange: (value: number) => {
                const clampedInt = Math.max(0, Math.min(9999, value));
                const frac = this.index - Math.trunc(this.index);
                this.setIndex(clampedInt + frac);
                refresh();
              },
            }),
          },
          {
            kind: "number",
            id: "index-frac",
            label: "Fractional part of T",
            value: parseFloat((this.index - Math.trunc(this.index)).toFixed(6)),
            min: 0,
            max: 0.999999,
            step: 0.000001,
            onChange: (value: number) => {
              const frac = Math.max(0, Math.min(0.999999, value));
              this.setIndex(Math.trunc(this.index) + frac);
              refresh();
            },
          },
          {
            kind: "number",
            id: "path-length",
            label: "path length",
            value: this.pathLength,
            min: 0,
            max: this.pathLimit,
            step: 0.000001,
            onChange: (value: number) => {
              if (!Number.isFinite(value)) return;
              this.pathLength = Math.min(this.pathLimit, Math.max(0, value));
              this.syncPath();
              refresh();
            },
          },
          {
            kind: "number",
            id: "path-limit",
            label: "path limit",
            value: this.pathLimit,
            step: 0.0001,
            onChange: (value: number) => {
              if (!Number.isFinite(value)) return;
              this.pathLimit = Math.min(1, Math.max(0.0001, value));
              if (this.pathLength > this.pathLimit) this.pathLength = this.pathLimit;
              this.syncPath();
              refresh();
            },
          },
          {
            kind: "toggle",
            id: "path-both-sides",
            label: "+ and −",
            value: this.pathSide === "both",
            onChange: (value: boolean) => {
              this.pathSide = value ? "both" : "plus";
              this.syncPath();
              refresh();
            },
          },
          {
            kind: "toggle",
            id: "re-rho-half",
            label: "Re ρ = ½",
            value: this.showRhoHalf,
            onChange: (value: boolean) => {
              this.showRhoHalf = value;
              this.syncDiagram();
              refresh();
            },
          },
        ],
      },
    ];
  }

  private setIndex(index: number): void {
    this.index = Math.max(0, Math.min(INDEX_MAX, index));
    this.sync();
  }

  private sync(): void {
    this.sample = zetaLogDerivAtIndex(this.sigma, this.index);
    this.placeDot();
    this.syncDiagram();
    this.syncPath();
  }

  private placeDot(): void {
    const s = this.sample;
    if (s.kind !== "value") {
      this.dot.visible = false;
      return;
    }
    this.dot.visible = true;
    this.dot.position.set(s.re, s.im, 0);
  }

  private syncDiagram(): void {
    if (!this.showRhoHalf) {
      this.diagram.visible = false;
      this.markers = [];
      return;
    }
    const t = indexToImag(this.index, false);
    const w = chiLogDeriv(complex(this.sigma, t));
    const diagram = rhoHalfDiagram(w.re, w.im);
    if (diagram === null) {
      this.diagram.visible = false;
      this.markers = [];
      return;
    }
    this.diagram.visible = true;
    writeLine(this.bisectorLine, diagram.bisector);
    writeLine(this.segmentLine, diagram.segment);
    this.segmentLine.computeLineDistances();
    writeLine(this.angleLine, diagram.rightAngle);
    this.placeDiagramDot(this.originDot, { x: 0, y: 0 });
    this.placeDiagramDot(this.wDot, diagram.w);
    this.placeDiagramDot(this.midDot, diagram.midpoint);
    this.placeBisectorDot(diagram.w.x, diagram.w.y);
    if (diagram.imagIntercept === null) {
      this.interceptDot.visible = false;
    } else {
      this.placeDiagramDot(this.interceptDot, diagram.imagIntercept);
    }
    this.markers = rhoHalfLabels(diagram);
  }

  private placeBisectorDot(u: number, v: number): void {
    const sample = this.sample;
    if (sample.kind !== "value") {
      this.bisectorDot.visible = false;
      return;
    }
    const foot = bisectorFoot(u, v, sample.re, sample.im);
    if (foot === null) {
      this.bisectorDot.visible = false;
      return;
    }
    this.placeDiagramDot(this.bisectorDot, foot);
  }

  private placeDiagramDot(dot: THREE.Mesh, p: PlanePoint): void {
    dot.visible = true;
    dot.position.set(p.x, p.y, 0);
  }

  private syncPath(): void {
    this.clearPath();
    const indices = pathIndices(this.index, this.pathLength, INDEX_MAX, this.pathSide);
    if (indices.length < 2) return;
    const samples = indices.map((indexT) => {
      const sample = zetaLogDerivAtIndex(this.sigma, indexT);
      if (sample.kind !== "value") return null;
      return { x: sample.re, y: sample.im };
    });
    for (const piece of splitPath(samples)) {
      const positions = new Float32Array(piece.length * 3);
      for (let i = 0; i < piece.length; i += 1) {
        const p = piece[i];
        if (p === undefined) continue;
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const line = new THREE.Line(geom, this.pathMat);
      line.renderOrder = 4;
      this.pathGroup.add(line);
    }
  }

  private clearPath(): void {
    while (this.pathGroup.children.length > 0) {
      const child = this.pathGroup.children[0];
      if (child === undefined) break;
      this.pathGroup.remove(child);
      if (child instanceof THREE.Line) child.geometry.dispose();
    }
  }

  /**
   * A unit disc scaled by the same world length on both axes is an oval
   * whenever the camera's x and y zooms differ. Scale each axis by its own
   * world-per-pixel so the marker stays a circle.
   */
  private scaleMarker(marker: THREE.Mesh, cssRadius: number): void {
    const size = this.controller.getCanvasSize();
    const bounds = this.controller.getCameraBounds();
    const worldPerPixelX = (bounds.right - bounds.left) / Math.max(1, size.width);
    const worldPerPixelY = (bounds.top - bounds.bottom) / Math.max(1, size.height);
    marker.scale.set(cssRadius * worldPerPixelX, cssRadius * worldPerPixelY, 1);
  }

  private updateDash(): void {
    const size = this.controller.getCanvasSize();
    const bounds = this.controller.getCameraBounds();
    const worldPerPixel = (bounds.top - bounds.bottom) / Math.max(1, size.height);
    this.segmentMat.dashSize = 7 * worldPerPixel;
    this.segmentMat.gapSize = 4.5 * worldPerPixel;
  }

  private disposeLine(line: THREE.Line): void {
    line.geometry.dispose();
    const mat = line.material;
    if (!Array.isArray(mat)) mat.dispose();
  }

  private disposeDot(dot: THREE.Mesh): void {
    dot.geometry.dispose();
    const mat = dot.material;
    if (!Array.isArray(mat)) mat.dispose();
  }
}

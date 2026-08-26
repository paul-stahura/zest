import type { ComponentType } from "react";
import * as THREE from "three";
import type { ToolboxContext, ToolboxSection } from "@/shared/visualization/contracts";
import type { Point2 } from "@/shared/io/types";
import { complex, type Complex } from "@/shared/math/complex";
import {
  calcForwardSum,
  calcInverseSum,
  calcRps1,
  calcRps2,
  calcRak1,
  calcRak2,
  calcRHalf,
  PATH_RANGES,
} from "@/shared/math/sumRemainders";
import type { RemainderMatrixLayer, RemainderRow } from "@/features/main-workspace/RemainderMatrixPanel";
import { createRemainderMatrixPanel } from "@/features/main-workspace/RemainderMatrixPanel";
import { eulerMaclaurenZeta, indexToImag } from "@/shared/math/zetaEms";

const ALL_ROWS: RemainderRow[] = ["rHalf", "rps", "rak"];

/** Neon red / neon blue — distinct from the forward spiral cyan link color. */
export const RPS1_COLOR = 0xff073a;
export const RPS2_COLOR = 0x1f51ff;

/**
 * Legs read as equal within this relative slack. It has to sit between the
 * ~1e-11 that EMS leaves at σ = ½ and the ~1e-3 that one 0.001 slider step off
 * the line already produces, so the ring means "on the critical line" rather
 * than "near it".
 */
const EQUAL_LEGS_REL_TOL = 1e-6;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RemainderState = {
  point: number;
  r1: number;
  r2: number;
  legsFwd: number;
  legsInv: number;
  sym: number;
  pathSigma: number;
  pathIndex: number;
};

function defaultState(): RemainderState {
  return { point: 0, r1: 0, r2: 0, legsFwd: 0, legsInv: 0, sym: 0, pathSigma: 0, pathIndex: 0 };
}

type RowObjects = {
  pointMarkers: THREE.Line[];
  headDots: THREE.Points[];
  r1Lines: (THREE.Line | THREE.Mesh)[];
  r2Lines: (THREE.Line | THREE.Mesh)[];
  legLines: THREE.Line[];
  symLines: THREE.Line[];
  pathSigmaLine: THREE.Line | null;
  pathSigmaInvLine: THREE.Line | null;
  pathIndexLine: THREE.Line | null;
  pathIndexInvLine: THREE.Line | null;
};

function emptyRowObjects(): RowObjects {
  return {
    pointMarkers: [],
    headDots: [],
    r1Lines: [],
    r2Lines: [],
    legLines: [],
    symLines: [],
    pathSigmaLine: null,
    pathSigmaInvLine: null,
    pathIndexLine: null,
    pathIndexInvLine: null,
  };
}

// ---------------------------------------------------------------------------
// THREE.js primitive helpers
// ---------------------------------------------------------------------------

/**
 * Same 1px LineBasicMaterial stroke as spiral links — screen thickness stays
 * matched under zoom (WebGL linewidth is ignored; world-space fat strips are not).
 */
function buildLine(pts: Point2[], color: number, group: THREE.Group, z = 0.01): THREE.Line | null {
  if (pts.length < 2) return null;
  const positions = new Float32Array(pts.length * 3);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = z;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color }));
  group.add(line);
  return line;
}

/**
 * A polyline drawn as a thin filled ribbon (per-segment quads) so it reads as a
 * slightly thicker line. THREE.Line/WebGL ignores `linewidth`, so real width needs
 * geometry. `halfWidth` is in world units. Used to lift the Rps remainder links off
 * the identically-coloured spiral.
 */
function buildThickLine(
  pts: Point2[], color: number, group: THREE.Group, halfWidth: number, z = 0.02,
): THREE.Mesh | null {
  if (pts.length < 2) return null;
  const positions: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!, b = pts[i + 1]!;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-12) continue;
    const nx = (-dy / len) * halfWidth, ny = (dx / len) * halfWidth;
    // Two triangles forming the quad between the offset endpoints.
    positions.push(
      a.x + nx, a.y + ny, z,  a.x - nx, a.y - ny, z,  b.x + nx, b.y + ny, z,
      a.x - nx, a.y - ny, z,  b.x - nx, b.y - ny, z,  b.x + nx, b.y + ny, z,
    );
  }
  if (positions.length === 0) return null;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  group.add(mesh);
  return mesh;
}

function buildDashedLine(pts: Point2[], color: number, group: THREE.Group): THREE.Line | null {
  if (pts.length < 2) return null;
  const positions = new Float32Array(pts.length * 3);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = 0.01;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineDashedMaterial({ color, dashSize: 0.04, gapSize: 0.025 });
  const line = new THREE.Line(geom, mat);
  line.computeLineDistances();
  group.add(line);
  return line;
}

function buildRing(center: Point2, radius: number, color: number, group: THREE.Group): THREE.Line {
  const r = Math.max(1e-9, radius);
  const curve = new THREE.EllipseCurve(center.x, center.y, r, r, 0, Math.PI * 2, false, 0);
  const pts = curve.getPoints(64);
  const positions = new Float32Array(pts.length * 3);
  for (let i = 0; i < pts.length; i++) {
    positions[i * 3] = pts[i]!.x;
    positions[i * 3 + 1] = pts[i]!.y;
    positions[i * 3 + 2] = 0.01;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color }));
  group.add(line);
  return line;
}

function buildCross(center: Point2, half: number, color: number, group: THREE.Group): THREE.Line[] {
  const h = buildLine(
    [{ x: center.x - half, y: center.y }, { x: center.x + half, y: center.y }],
    color, group, 0.02,
  );
  const v = buildLine(
    [{ x: center.x, y: center.y - half }, { x: center.x, y: center.y + half }],
    color, group, 0.02,
  );
  return [h, v].filter((x): x is THREE.Line => x !== null);
}

/** Soft round sprite for PointsMaterial (shared; material multiplies by color). */
let roundDotMap: THREE.CanvasTexture | null = null;
function getRoundDotMap(): THREE.CanvasTexture {
  if (roundDotMap) return roundDotMap;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
  roundDotMap = new THREE.CanvasTexture(canvas);
  roundDotMap.needsUpdate = true;
  return roundDotMap;
}

/**
 * Round screen-fixed endpoint marker. Size tracks LineBasicMaterial stroke
 * (~1 device px): a few pixels across so it reads as a bead on the line,
 * not a large square point sprite.
 */
function buildDot(center: Point2, color: number, group: THREE.Group, pixelSize = 3): THREE.Points {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array([center.x, center.y, 0.03]), 3));
  const mat = new THREE.PointsMaterial({
    color,
    size: pixelSize,
    sizeAttenuation: false,
    map: getRoundDotMap(),
    transparent: true,
    alphaTest: 0.5,
    depthTest: false,
  });
  const pts = new THREE.Points(geom, mat);
  group.add(pts);
  return pts;
}

function disposeLine(line: THREE.Line | THREE.Mesh, group: THREE.Group): void {
  group.remove(line);
  line.geometry.dispose();
  const mat = line.material;
  if (!Array.isArray(mat)) mat.dispose();
}

function disposePoints(pts: THREE.Points, group: THREE.Group): void {
  group.remove(pts);
  pts.geometry.dispose();
  const mat = pts.material;
  if (!Array.isArray(mat)) mat.dispose();
}

// ---------------------------------------------------------------------------
// RemainderWorkspaceLayer
// ---------------------------------------------------------------------------

/**
 * Renders R/2, Rps, and Rak remainder vectors as interactive 2D geometry.
 * Ports Unity SumRemainderRenderer.cs and SumRemainders.cs to Three.js.
 */
export class RemainderWorkspaceLayer implements RemainderMatrixLayer {
  private readonly group: THREE.Group;
  private readonly matrixPanel: ComponentType<{ ctx: ToolboxContext }>;

  private sigma = 0.5;
  /** Must match SpiralWorkspaceLayer default — otherwise remainders draw at the wrong T until the first index change. */
  private index = 6.18;
  // World units per screen pixel, fed from the camera each frame so the emphasised
  // Rps ribbon holds a constant on-screen thickness (2× the 1px spiral) at any zoom.
  private worldPerPixel = 0.01;

  private readonly states: Record<RemainderRow, RemainderState> = {
    rHalf: defaultState(),
    rps:   defaultState(),
    rak:   defaultState(),
  };

  private pathLength = 0;

  /** "B₁ legs" toggle: the two legs of the R/2 split, ringed when they are equal. */
  private b1Legs = false;
  private b1LegsLines: THREE.Line[] = [];
  private b1LegsDots: THREE.Points[] = [];

  private readonly objects: Record<RemainderRow, RowObjects> = {
    rHalf: emptyRowObjects(),
    rps:   emptyRowObjects(),
    rak:   emptyRowObjects(),
  };

  public constructor(parent: THREE.Group) {
    this.group = new THREE.Group();
    parent.add(this.group);
    this.matrixPanel = createRemainderMatrixPanel(this);
  }

  public initialize(): void {
    this.rebuild();
  }

  public dispose(): void {
    this.clearAll3DObjects();
    this.group.removeFromParent();
  }

  // -------------------------------------------------------------------------
  // Sigma/index propagation from workspace model
  // -------------------------------------------------------------------------

  public setSigma(sigma: number): void {
    this.sigma = sigma;
    this.rebuild();
  }

  public setIndex(index: number): void {
    this.index = index;
    this.rebuild();
  }

  /**
   * Update the world-units-per-pixel scale (from the camera). Rebuilds only when it
   * changes meaningfully and the emphasised Rps ribbon is actually showing, so the
   * ribbon stays a constant on-screen width through zoom without per-frame churn.
   */
  public setWorldPerPixel(wpp: number): void {
    if (!Number.isFinite(wpp) || wpp <= 0) return;
    if (Math.abs(wpp - this.worldPerPixel) < this.worldPerPixel * 0.02) return;
    this.worldPerPixel = wpp;
    if (this.isRowActive(this.states.rps)) this.rebuild();
  }

  /** Align σ/T with the spiral in one rebuild (startup / restore). */
  public syncParams(sigma: number, index: number): void {
    this.sigma = sigma;
    this.index = index;
    this.rebuild();
  }

  // -------------------------------------------------------------------------
  // RemainderMatrixLayer interface
  // -------------------------------------------------------------------------

  public getPoint(row: RemainderRow): number    { return this.states[row].point; }
  public getR1(row: RemainderRow): number        { return this.states[row].r1; }
  public getR2(row: RemainderRow): number        { return this.states[row].r2; }
  public getLegsFwd(row: RemainderRow): number   { return this.states[row].legsFwd; }
  public getLegsInv(row: RemainderRow): number   { return this.states[row].legsInv; }
  public getSym(row: RemainderRow): number       { return this.states[row].sym; }
  public getPathSigma(row: RemainderRow): number { return this.states[row].pathSigma; }
  public getPathIndex(row: RemainderRow): number { return this.states[row].pathIndex; }
  public getPathLength(): number                   { return this.pathLength; }

  public setPoint(row: RemainderRow, v: number): void    { this.states[row].point = v; this.rebuild(); }
  public setR1(row: RemainderRow, v: number): void        { this.states[row].r1 = v; this.rebuild(); }
  public setR2(row: RemainderRow, v: number): void        { this.states[row].r2 = v; this.rebuild(); }
  public setLegsFwd(row: RemainderRow, v: number): void   { this.states[row].legsFwd = v; this.rebuild(); }
  public setLegsInv(row: RemainderRow, v: number): void   { this.states[row].legsInv = v; this.rebuild(); }
  public setSym(row: RemainderRow, v: number): void       { this.states[row].sym = v; this.rebuild(); }
  public setPathSigma(row: RemainderRow, v: number): void { this.states[row].pathSigma = v; this.rebuild(); }
  public setPathIndex(row: RemainderRow, v: number): void { this.states[row].pathIndex = v; this.rebuild(); }
  public setPathLength(v: number): void { this.pathLength = v; this.rebuild(); }

  public setB1Legs(v: boolean): void { this.b1Legs = v; this.rebuild(); }
  public getB1Legs(): boolean { return this.b1Legs; }

  public clearAll(): void {
    for (const row of ALL_ROWS) {
      this.states[row] = defaultState();
    }
    this.pathLength = 0;
    this.rebuild();
  }

  // -------------------------------------------------------------------------
  // Toolbox section
  // -------------------------------------------------------------------------

  public getToolSections(ctx: ToolboxContext): ToolboxSection[] {
    return [
      {
        id: "remainder-layer",
        contributorId: "workspace:remainder",
        title: "Remainders",
        order: 15,
        defaultCollapsed: true,
        CustomPanel: this.matrixPanel,
        controls: [
          {
            kind: "toggle",
            id: "b1-legs",
            label: "B₁ legs (ringed when equal)",
            value: this.b1Legs,
            onChange: (value: boolean) => {
              this.setB1Legs(value);
              ctx.requestToolboxRefresh();
            },
          },
        ],
      },
    ];
  }

  // -------------------------------------------------------------------------
  // State batch-restore (called from applySerializedState without triggering
  // redundant rebuilds — rebuilds once at the end)
  // -------------------------------------------------------------------------

  public batchRestore(
    sigma: number,
    index: number,
    rHalf: RemainderState,
    rps: RemainderState,
    rakState: RemainderState,
    pathLength: number,
  ): void {
    this.sigma = sigma;
    this.index = index;
    this.states.rHalf = rHalf;
    this.states.rps = rps;
    this.states.rak = rakState;
    this.pathLength = pathLength;
    this.rebuild();
  }

  // -------------------------------------------------------------------------
  // State getters for serialization
  // -------------------------------------------------------------------------

  public getStateSnapshot(): {
    rHalf: RemainderState; rps: RemainderState; rak: RemainderState;
    pathLength: number;
  } {
    return {
      rHalf: { ...this.states.rHalf },
      rps:   { ...this.states.rps },
      rak:   { ...this.states.rak },
      pathLength: this.pathLength,
    };
  }

  // -------------------------------------------------------------------------
  // Rebuild
  // -------------------------------------------------------------------------

  private isRowActive(s: RemainderState): boolean {
    return s.point > 0 || s.r1 > 0 || s.r2 > 0 || s.legsFwd > 0 ||
           s.legsInv > 0 || s.sym > 0 || s.pathSigma > 0 || s.pathIndex > 0;
  }

  private rebuild(): void {
    this.clearAll3DObjects();

    if (this.b1Legs) this.drawB1Legs();

    const rakActive = this.isRowActive(this.states.rak);
    const rpsActive = this.isRowActive(this.states.rps);
    const rHalfActive = this.isRowActive(this.states.rHalf);
    if (!rakActive && !rpsActive && !rHalfActive) return;

    const sigma = this.sigma;
    const index = this.index;

    const sum1 = calcForwardSum(sigma, index);
    const sum2 = calcInverseSum(sigma, index);

    if (rakActive) {
      const r1 = calcRak1(sigma, index);
      const r2 = calcRak2(sigma, index);
      this.drawRow("rak", sum1, sum2, r1, r2, 0x44ff44, 0xff4444);
    }

    if (rpsActive) {
      const r1 = calcRps1(sigma, index);
      const r2 = calcRps2(sigma, index);
      // Slightly thicker so Rps links stand out from the cyan spiral.
      this.drawRow("rps", sum1, sum2, r1, r2, RPS1_COLOR, RPS2_COLOR, true);
    }

    if (rHalfActive) {
      let r1: Complex, r2: Complex;
      if (rakActive) {
        const rak1 = calcRak1(sigma, index);
        const rak2 = calcRak2(sigma, index);
        const half = { re: (rak1.re + rak2.re) / 2, im: (rak1.im + rak2.im) / 2 };
        r1 = half; r2 = half;
      } else {
        const rh = calcRHalf(sigma, index);
        r1 = rh; r2 = rh;
      }
      this.drawRow("rHalf", sum1, sum2, r1, r2, 0xffff44, 0xffff44);
    }
  }

  // -------------------------------------------------------------------------
  // "B₁ legs"
  // -------------------------------------------------------------------------

  /**
   * The two legs of the R/2 split: origin→B₁rs in green and ζ→B₁rs in red,
   * where B₁rs = Σ₁ + R/2 and R = ζ − Σ₁ − Σ₂ is Siegel's exact remainder.
   * Dashed gray is the split line through B₁rs and ζ/2, and a white dot marks
   * B₁rs.
   *
   * The legs come out equal only on the critical line (paper §9.4). Equality
   * says B₁rs is on the perpendicular bisector of origin→ζ, so the split line
   * then coincides with that bisector; a gold ring centered on B₁rs and
   * through both endpoints marks the moment.
   */
  private drawB1Legs(): void {
    const sigma = this.sigma;
    const index = this.index;

    const t = indexToImag(index, false);
    const zC = eulerMaclaurenZeta(complex(sigma, t));
    const z: Point2 = { x: zC.re, y: zC.im };
    const zLen = Math.hypot(z.x, z.y);
    if (zLen < 1e-9) return;

    const sum1 = calcForwardSum(sigma, index);
    const sum2 = calcInverseSum(sigma, index);
    const rx = z.x - sum1.re - sum2.re;
    const ry = z.y - sum1.im - sum2.im;
    const B: Point2 = { x: sum1.re + rx / 2, y: sum1.im + ry / 2 }; // Σ₁ + R/2
    const M: Point2 = { x: z.x / 2, y: z.y / 2 };                   // ζ/2

    const leg1 = Math.hypot(B.x, B.y);
    const leg2 = Math.hypot(z.x - B.x, z.y - B.y);
    const equal = Math.abs(leg1 - leg2) <= EQUAL_LEGS_REL_TOL * (leg1 + leg2);

    // Split line through B₁rs and ζ/2, extended past both points.
    const dx = M.x - B.x, dy = M.y - B.y;
    const dLen = Math.hypot(dx, dy);
    if (dLen > 1e-12) {
      const pad = 0.35 * zLen + 0.5;
      const nx = dx / dLen, ny = dy / dLen;
      const line = buildDashedLine(
        [{ x: B.x - pad * nx, y: B.y - pad * ny }, { x: M.x + pad * nx, y: M.y + pad * ny }],
        0x888888, this.group,
      );
      if (line) this.b1LegsLines.push(line);
    }

    const green = buildLine([{ x: 0, y: 0 }, B], 0x00ff00, this.group, 0.02);
    if (green) this.b1LegsLines.push(green);
    const red = buildLine([z, B], 0xff0000, this.group, 0.02);
    if (red) this.b1LegsLines.push(red);
    if (equal) {
      this.b1LegsLines.push(buildRing(B, (leg1 + leg2) / 2, 0xffd700, this.group));
    }
    this.b1LegsDots.push(buildDot(B, 0xffffff, this.group, 5));
  }

  // -------------------------------------------------------------------------
  // drawRow
  // -------------------------------------------------------------------------

  private drawRow(
    row: RemainderRow,
    sum1: Complex, sum2: Complex,
    r1: Complex, r2: Complex,
    color1: number, color2: number,
    thick = false,
  ): void {
    const s = this.states[row];
    const objs = this.objects[row];
    // Emphasised R1/R2 links are drawn 2 px wide (2× the 1 px spiral). The spiral is
    // 1 px, so half-width = 1 px worth of world units keeps the ribbon 2 px on screen.
    const halfWidth = Math.max(this.worldPerPixel, 1e-6);
    const buildRemainderLine = (pts: Point2[], color: number): THREE.Line | THREE.Mesh | null =>
      thick
        ? buildThickLine(pts, color, this.group, halfWidth)
        : buildLine(pts, color, this.group);

    const l1: Point2 = { x: sum1.re + r1.re, y: sum1.im + r1.im };
    const l2: Point2 = { x: sum1.re + sum2.re + r1.re + r2.re, y: sum1.im + sum2.im + r1.im + r2.im };
    const s2r2: Point2 = { x: sum2.re + r2.re, y: sum2.im + r2.im };
    const origin: Point2 = { x: 0, y: 0 };
    const sum1p: Point2 = { x: sum1.re, y: sum1.im };
    const sum2p: Point2 = { x: sum2.re, y: sum2.im };

    // Point markers
    if (s.point === 1 || s.point === 3) {
      objs.pointMarkers.push(...buildCross(l1, 0.05, color1, this.group));
    }
    if (s.point === 2 || s.point === 3) {
      objs.pointMarkers.push(...buildCross(s2r2, 0.05, color2, this.group));
    }

    // R1 lines — 1=fwd, 2=inv, 3=both
    if (s.r1 === 1 || s.r1 === 3) {
      const line = buildRemainderLine([sum1p, l1], color1);
      if (line) objs.r1Lines.push(line);
    }
    if (s.r1 === 2 || s.r1 === 3) {
      const end: Point2 = { x: s2r2.x + r1.re, y: s2r2.y + r1.im };
      const line = buildRemainderLine([s2r2, end], color1);
      if (line) objs.r1Lines.push(line);
    }

    // R2 lines — 1=fwd, 2=inv, 3=both
    if (s.r2 === 1 || s.r2 === 3) {
      const end: Point2 = { x: l1.x + r2.re, y: l1.y + r2.im };
      const line = buildRemainderLine([l1, end], color2);
      if (line) objs.r2Lines.push(line);
    }
    if (s.r2 === 2 || s.r2 === 3) {
      const line = buildRemainderLine([sum2p, s2r2], color2);
      if (line) objs.r2Lines.push(line);
    }

    // R row: yellow head marker at Σ₁+R/2 whenever R1 or R2 is on.
    if (row === "rHalf" && (s.r1 > 0 || s.r2 > 0)) {
      objs.headDots.push(buildDot(l1, 0xffff00, this.group));
    }

    // Legs forward
    if (s.legsFwd >= 1) {
      const line = buildLine([origin, l1], 0x44ff44, this.group);
      if (line) objs.legLines.push(line);
    }
    if (s.legsFwd >= 2) {
      const line = buildLine([l1, l2], 0xff4444, this.group);
      if (line) objs.legLines.push(line);
    }

    // Legs inverse
    if (s.legsInv >= 1) {
      const line = buildLine([origin, s2r2], 0xff4444, this.group);
      if (line) objs.legLines.push(line);
    }
    if (s.legsInv >= 2) {
      const line = buildLine([s2r2, l2], 0x44ff44, this.group);
      if (line) objs.legLines.push(line);
    }

    // Sym
    this.drawSym(s.sym, objs, r1, r2, l1, l2, s2r2);

    // Paths
    this.drawPathSigma(row, objs, s, color1, color2);
    this.drawPathIndex(row, objs, s, color1, color2);
  }

  // -------------------------------------------------------------------------
  // Sym rendering
  // -------------------------------------------------------------------------

  private drawSym(
    symOpt: number,
    objs: RowObjects,
    r1: Complex, r2: Complex,
    l1: Point2, l2: Point2, s2r2: Point2,
  ): void {
    if (symOpt === 0) return;

    if (symOpt === 1) {
      // cut: dashed line along direction r2−r1, centered at l1, ±2 units
      let dirX = r2.re - r1.re;
      let dirY = r2.im - r1.im;
      const len = Math.hypot(dirX, dirY);
      if (len < 1e-9) {
        dirX = -r1.im; dirY = r1.re; // fallback: perpendicular to r1
      }
      const dLen = Math.hypot(dirX, dirY) || 1;
      const nx = dirX / dLen * 2, ny = dirY / dLen * 2;
      const line = buildDashedLine(
        [{ x: l1.x - nx, y: l1.y - ny }, { x: l1.x + nx, y: l1.y + ny }],
        0x888888, this.group,
      );
      if (line) objs.symLines.push(line);

    } else if (symOpt === 2) {
      // bisect: perpendicular to (r1+r2) at l1
      const bx = r1.re + r2.re, by = r1.im + r2.im;
      const bLen = Math.hypot(bx, by) || 1;
      const dist = Math.max(0.01, Math.hypot(l1.x - s2r2.x, l1.y - s2r2.y));
      const px = -by / bLen * dist, py = bx / bLen * dist;
      const line = buildDashedLine(
        [{ x: l1.x - px, y: l1.y - py }, { x: l1.x + px, y: l1.y + py }],
        0x888888, this.group,
      );
      if (line) objs.symLines.push(line);

    } else if (symOpt === 3) {
      // ζ/2: dashed line from l1 to s2r2, extended ±2 units in direction
      const dx = s2r2.x - l1.x, dy = s2r2.y - l1.y;
      const dLen = Math.hypot(dx, dy) || 1;
      const nx = dx / dLen * 2, ny = dy / dLen * 2;
      const line = buildDashedLine(
        [{ x: l1.x - nx, y: l1.y - ny }, { x: s2r2.x + nx, y: s2r2.y + ny }],
        0x888888, this.group,
      );
      if (line) objs.symLines.push(line);

    } else if (symOpt === 4) {
      // equal: two rings at l1 — radii |l1| and |l2−l1|
      const ring1 = buildRing(l1, Math.hypot(l1.x, l1.y), 0x44ff44, this.group);
      const ring2 = buildRing(l1, Math.hypot(l2.x - l1.x, l2.y - l1.y), 0xff4444, this.group);
      objs.symLines.push(ring1, ring2);
    }
  }

  // -------------------------------------------------------------------------
  // Path sweeps
  // -------------------------------------------------------------------------

  private getCalcFuncs(row: RemainderRow): {
    calcR1: (sigma: number, idx: number) => Complex;
    calcR2: (sigma: number, idx: number) => Complex;
  } {
    switch (row) {
      case "rHalf": return { calcR1: calcRHalf, calcR2: calcRHalf };
      case "rps":   return { calcR1: calcRps1,  calcR2: calcRps2 };
      case "rak":   return { calcR1: calcRak1,  calcR2: calcRak2 };
    }
  }

  private drawPathSigma(
    row: RemainderRow,
    objs: RowObjects,
    s: RemainderState,
    color1: number,
    color2: number,
  ): void {
    if (s.pathSigma === 0) return;

    const drawFwd = s.pathSigma === 1 || s.pathSigma === 3;
    const drawInv = s.pathSigma === 2 || s.pathSigma === 3;
    const minSigma = this.pathLength === 0 ? 0 : -5;
    const { calcR1, calcR2 } = this.getCalcFuncs(row);
    const index = this.index;
    const fwdPts: Point2[] = [];
    const invPts: Point2[] = [];

    for (let i = minSigma; i <= 10; i++) {
      const scaler = Math.max(i, 0);
      const ptCount = Math.max(1, Math.floor(100 / (scaler + 1)));
      for (let j = 0; j <= ptCount; j++) {
        const sigma = i + j / ptCount;
        if (drawFwd) {
          const r1c = calcR1(sigma, index);
          const fwdSum = calcForwardSum(sigma, index);
          fwdPts.push({ x: r1c.re + fwdSum.re, y: r1c.im + fwdSum.im });
        }
        if (drawInv) {
          const r2c = calcR2(sigma, index);
          const invSum = calcInverseSum(sigma, index);
          invPts.push({ x: r2c.re + invSum.re, y: r2c.im + invSum.im });
        }
      }
    }

    if (fwdPts.length > 1) objs.pathSigmaLine = buildLine(fwdPts, color1, this.group);
    if (invPts.length > 1) objs.pathSigmaInvLine = buildLine(invPts, color2, this.group);
  }

  private drawPathIndex(
    row: RemainderRow,
    objs: RowObjects,
    s: RemainderState,
    color1: number,
    color2: number,
  ): void {
    if (s.pathIndex === 0) return;

    const drawFwd = s.pathIndex === 1 || s.pathIndex === 3;
    const drawInv = s.pathIndex === 2 || s.pathIndex === 3;
    const lengthSlot = this.pathLength + 1;
    const rawRange = PATH_RANGES[lengthSlot] ?? 0;
    if (rawRange === 0) return;
    const pathRange = rawRange / (this.index * 2);
    const steps = Math.max(2, 50 * lengthSlot * Math.round(this.index));

    const { calcR1, calcR2 } = this.getCalcFuncs(row);
    const sigma = this.sigma;
    const fwdPts: Point2[] = [];
    const invPts: Point2[] = [];

    for (let i = 0; i <= steps; i++) {
      const idx = this.index - pathRange + 2 * pathRange * i / steps;
      if (drawFwd) {
        const r1c = calcR1(sigma, idx);
        const fwdSum = calcForwardSum(sigma, idx);
        fwdPts.push({ x: r1c.re + fwdSum.re, y: r1c.im + fwdSum.im });
      }
      if (drawInv) {
        const r2c = calcR2(sigma, idx);
        const invSum = calcInverseSum(sigma, idx);
        invPts.push({ x: r2c.re + invSum.re, y: r2c.im + invSum.im });
      }
    }

    if (fwdPts.length > 1) objs.pathIndexLine = buildLine(fwdPts, color1, this.group);
    if (invPts.length > 1) objs.pathIndexInvLine = buildLine(invPts, color2, this.group);
  }

  // -------------------------------------------------------------------------
  // Dispose helpers
  // -------------------------------------------------------------------------

  private clearRowObjects(row: RemainderRow): void {
    const objs = this.objects[row];
    for (const line of [
      ...objs.pointMarkers, ...objs.r1Lines, ...objs.r2Lines,
      ...objs.legLines, ...objs.symLines,
    ]) {
      disposeLine(line, this.group);
    }
    for (const dot of objs.headDots) {
      disposePoints(dot, this.group);
    }
    if (objs.pathSigmaLine) disposeLine(objs.pathSigmaLine, this.group);
    if (objs.pathSigmaInvLine) disposeLine(objs.pathSigmaInvLine, this.group);
    if (objs.pathIndexLine) disposeLine(objs.pathIndexLine, this.group);
    if (objs.pathIndexInvLine) disposeLine(objs.pathIndexInvLine, this.group);
    this.objects[row] = emptyRowObjects();
  }

  private clearAll3DObjects(): void {
    for (const row of ALL_ROWS) {
      this.clearRowObjects(row);
    }
    for (const line of this.b1LegsLines) disposeLine(line, this.group);
    for (const dot of this.b1LegsDots) disposePoints(dot, this.group);
    this.b1LegsLines = [];
    this.b1LegsDots = [];
  }
}

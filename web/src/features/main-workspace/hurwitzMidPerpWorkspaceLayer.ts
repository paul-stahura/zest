import * as THREE from "three";
import type { ComponentType } from "react";
import type { Point2 } from "@/shared/io/types";
import type { ToolboxContext, ToolboxSection } from "@/shared/visualization/contracts";
import {
  calcNLinks,
  calculateHurwitzCharacterInverseSumVectors,
  calculateHurwitzCharacterTarget,
  calculateHurwitzCharacterVectors,
  flipLFunctionVectorsOriginToTarget,
  formatHurwitzCoeffList,
  type HurwitzCoeff,
} from "@/shared/math/lFunctionCalculator";
import { complex, type Complex } from "@/shared/math/complex";
import { calcB1Star } from "@/shared/math/b1Star";
import { eulerMaclaurenZeta, indexToImag } from "@/shared/math/zetaEms";
import {
  HURWITZ_MID_PERP_CATALOG,
  HURWITZ_OMEGA_QS,
  hurwitzMidPerpSpectrumIndex,
  hurwitzQFormulaId,
  hurwitzQOmegaCoeffs,
  hurwitzQSliderId,
  wrapOmegaDegrees,
  type HurwitzOmegaQ,
} from "@/shared/math/hurwitzMidPerpCatalog";
import { midPerpProgressionCoeffs } from "@/shared/math/hurwitzMidPerpSearch";
import { formatOmegaLiveReadout, omegaForZetaBPoint, type OmegaZetaBPointHint } from "@/shared/math/q2OmegaZetaBPoint";
import {
  hurwitzBisectorLinkNumber,
  locateHurwitzBisectorCrossing,
} from "@/shared/math/hurwitzBisectorLink";
import { circumcircleThrough3 } from "@/shared/math/circumcircleThrough3";
import { spectrumColor } from "@/shared/math/spectrumColor";
import type { HurwitzMidPerpPanelLayer } from "@/features/main-workspace/HurwitzMidPerpPanel";
import { createHurwitzMidPerpPanel } from "@/features/main-workspace/HurwitzMidPerpPanel";

const CIRCLE_COLOR = 0xe9ecef;
/** Same teal as the main-tab B₁* marker. */
const B1_STAR_COLOR = 0x0aa6a6;
/** Same red as the zeta-tab inverse spiral. */
const INVERSE_SPIRAL_COLOR = 0xff5555;
const CIRCLE_SEGMENTS = 960;

/** Spectrum of the first catalog row with this q — same hue as that table line. */
function catalogSpectrumHex(q: number): number {
  const n = HURWITZ_MID_PERP_CATALOG.length;
  for (let i = 0; i < n; i++) {
    if (HURWITZ_MID_PERP_CATALOG[i]?.q === q) return spectrumColor(i + 1, n).hex;
  }
  return CIRCLE_COLOR;
}

export type HurwitzMidPerpRowSnap = {
  id: string;
  on: boolean;
};

function buildLine(pts: Point2[], color: number, group: THREE.Group, opacity = 1): void {
  if (pts.length < 2) return;
  const positions = new Float32Array(pts.length * 3);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (p === undefined) continue;
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = 0;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  group.add(new THREE.Line(geom, new THREE.LineBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
  })));
}

function buildZetaCircle(center: Point2, radius: number, color: number, group: THREE.Group): void {
  if (!(radius > 1e-12) || !Number.isFinite(center.x) || !Number.isFinite(center.y)) return;
  const positions = new Float32Array((CIRCLE_SEGMENTS + 1) * 3);
  for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
    const a = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
    positions[i * 3] = center.x + radius * Math.cos(a);
    positions[i * 3 + 1] = center.y + radius * Math.sin(a);
    positions[i * 3 + 2] = 0;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  group.add(new THREE.Line(geom, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 })));
}

function buildOriginToH(target: Point2, color: number, group: THREE.Group): void {
  buildLine([{ x: 0, y: 0 }, target], color, group);
}

const H_MARKER_PIXEL_RADIUS = 6;
const B_POINT_PIXEL_RADIUS = 4;
const H_MARKER_SEGMENTS = 32;

function buildOpenHCircle(
  center: Point2,
  color: number,
  group: THREE.Group,
  worldPerPixel: number,
): void {
  if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) return;
  const r = H_MARKER_PIXEL_RADIUS * Math.max(worldPerPixel, 1e-6);
  const positions = new Float32Array((H_MARKER_SEGMENTS + 1) * 3);
  for (let i = 0; i <= H_MARKER_SEGMENTS; i++) {
    const a = (i / H_MARKER_SEGMENTS) * Math.PI * 2;
    positions[i * 3] = center.x + r * Math.cos(a);
    positions[i * 3 + 1] = center.y + r * Math.sin(a);
    positions[i * 3 + 2] = 0.02;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  group.add(new THREE.Line(geom, new THREE.LineBasicMaterial({ color })));
}

function buildClosedBPoint(
  center: Point2,
  color: number,
  group: THREE.Group,
  worldPerPixel: number,
): void {
  if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) return;
  const r = B_POINT_PIXEL_RADIUS * Math.max(worldPerPixel, 1e-6);
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(r, 16),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
  );
  mesh.position.set(center.x, center.y, 0.04);
  group.add(mesh);
}

/** Ribbon 2 px on screen: twice the 1 px LineBasicMaterial chain. */
function buildDoubleWidthSegment(
  start: Point2,
  end: Point2,
  color: number,
  group: THREE.Group,
  worldPerPixel: number,
): void {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return;
  const half = Math.max(worldPerPixel, 1e-6);
  const nx = (-dy / len) * half;
  const ny = (dx / len) * half;
  const positions = new Float32Array([
    start.x + nx, start.y + ny, 0.03,
    start.x - nx, start.y - ny, 0.03,
    end.x + nx, end.y + ny, 0.03,
    start.x - nx, start.y - ny, 0.03,
    end.x - nx, end.y - ny, 0.03,
    end.x + nx, end.y + ny, 0.03,
  ]);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  group.add(new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })));
}

function buildPerpBisector(target: Point2, color: number, group: THREE.Group): void {
  const tLen = Math.hypot(target.x, target.y);
  if (tLen < 1e-10) return;
  const perpX = -target.y / tLen;
  const perpY = target.x / tLen;
  const midX = target.x / 2;
  const midY = target.y / 2;
  const ext = 30;
  buildLine(
    [
      { x: midX - perpX * ext, y: midY - perpY * ext },
      { x: midX + perpX * ext, y: midY + perpY * ext },
    ],
    color,
    group,
  );
}

function clearGroup(g: THREE.Group): void {
  for (let i = g.children.length - 1; i >= 0; i--) {
    const child = g.children[i];
    if (child instanceof THREE.Line || child instanceof THREE.LineSegments || child instanceof THREE.Mesh) {
      g.remove(child);
      child.geometry.dispose();
      const mat = child.material;
      if (!Array.isArray(mat)) mat.dispose();
    }
  }
}

function catalogCoeffs(id: string): HurwitzCoeff[] {
  const row = HURWITZ_MID_PERP_CATALOG.find(r => r.id === id);
  if (row === undefined) return [];
  return row.coeffs.map(c => ({ re: c.re, im: c.im }));
}

/**
 * Catalog of H=ζ(1−u) tables. Header flags choose what a row checkbox draws.
 */
export class HurwitzMidPerpWorkspaceLayer implements HurwitzMidPerpPanelLayer {
  private readonly group: THREE.Group;
  private readonly slot: THREE.Group;
  private readonly panel: ComponentType<{ ctx: ToolboxContext }>;

  private index = 1;
  private sigma = 0.5;
  private usePolyImag = false;

  private showCircle = false;
  private showSpiral = false;
  private showInverse = false;
  private showReverse = false;
  private liveQ: HurwitzOmegaQ = 2;
  private showOH = false;
  private showPerp = false;
  private showBLink = true;
  private showBPoint = true;
  private showQ2Circle = false;
  private showQ3Circle = false;
  private showQ4Circle = false;
  private showQ5Circle = false;
  private showQ6Circle = false;
  private showH = false;
  private showB1Star = false;
  private readonly sliderOn: Record<HurwitzOmegaQ, boolean> = { 2: false, 3: false, 4: false, 5: false, 6: false };
  private readonly sliderDeg: Record<HurwitzOmegaQ, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  private readonly formulaOn: Record<HurwitzOmegaQ, boolean> = { 2: false, 3: false, 4: false, 5: false, 6: false };
  private readonly formulaHint: Partial<Record<HurwitzOmegaQ, OmegaZetaBPointHint>> = {};
  private worldPerPixel = 0.01;
  private bPointLinks: number[] = [];
  private readonly onIds = new Set<string>();
  private readonly chiById = new Map<string, HurwitzCoeff[]>();

  constructor(parentGroup: THREE.Group) {
    this.group = new THREE.Group();
    this.slot = new THREE.Group();
    this.group.add(this.slot);
    parentGroup.add(this.group);
    this.panel = createHurwitzMidPerpPanel(this);
  }

  /** Same origin fit as the spiral. */
  public setDisplayScale(scale: number): void {
    this.group.scale.setScalar(scale);
  }

  public getCircle(): boolean { return this.showCircle; }
  public setCircle(v: boolean): void { this.showCircle = v; this._rebuild(); }
  public getShowSpiral(): boolean { return this.showSpiral; }
  public setShowSpiral(v: boolean): void { this.showSpiral = v; this._rebuild(); }
  public getShowInverse(): boolean { return this.showInverse; }
  public setShowInverse(v: boolean): void { this.showInverse = v; this._rebuild(); }
  public getShowReverse(): boolean { return this.showReverse; }
  public setShowReverse(v: boolean): void { this.showReverse = v; this._rebuild(); }
  public getLiveQ(): HurwitzOmegaQ { return this.liveQ; }
  public setLiveQ(q: HurwitzOmegaQ): void { this.liveQ = q; }
  public getLiveOmegaReadout(): string {
    const hit = omegaForZetaBPoint(this.index, this.liveQ, this.formulaHint[this.liveQ]);
    if (hit === null) return "ω=—";
    this.formulaHint[this.liveQ] = { deg: hit.deg, index: this.index, link: hit.link };
    return formatOmegaLiveReadout(hit.omega.re, hit.omega.im, hit.deg);
  }
  public getShowOH(): boolean { return this.showOH; }
  public setShowOH(v: boolean): void { this.showOH = v; this._rebuild(); }
  public getShowPerp(): boolean { return this.showPerp; }
  public setShowPerp(v: boolean): void { this.showPerp = v; this._rebuild(); }
  public getShowBLink(): boolean { return this.showBLink; }
  public setShowBLink(v: boolean): void { this.showBLink = v; this._rebuild(); }
  public getShowBPoint(): boolean { return this.showBPoint; }
  public setShowBPoint(v: boolean): void { this.showBPoint = v; this._rebuild(); }
  public getBPointLinkReadout(): string {
    if (this.bPointLinks.length === 0) return "—";
    const uniq = [...new Set(this.bPointLinks)].sort((a, b) => a - b);
    return uniq.join(",");
  }
  public getShowQ2Circle(): boolean { return this.showQ2Circle; }
  public setShowQ2Circle(v: boolean): void { this.showQ2Circle = v; this._rebuild(); }
  public getShowQ3Circle(): boolean { return this.showQ3Circle; }
  public setShowQ3Circle(v: boolean): void { this.showQ3Circle = v; this._rebuild(); }
  public getShowQ4Circle(): boolean { return this.showQ4Circle; }
  public setShowQ4Circle(v: boolean): void { this.showQ4Circle = v; this._rebuild(); }
  public getShowQ5Circle(): boolean { return this.showQ5Circle; }
  public setShowQ5Circle(v: boolean): void { this.showQ5Circle = v; this._rebuild(); }
  public getShowQ6Circle(): boolean { return this.showQ6Circle; }
  public setShowQ6Circle(v: boolean): void { this.showQ6Circle = v; this._rebuild(); }
  public getShowH(): boolean { return this.showH; }
  public setShowH(v: boolean): void { this.showH = v; this._rebuild(); }
  public getShowB1Star(): boolean { return this.showB1Star; }
  public setShowB1Star(v: boolean): void { this.showB1Star = v; this._rebuild(); }
  public getSliderOn(q: HurwitzOmegaQ): boolean { return this.sliderOn[q]; }
  public setSliderOn(q: HurwitzOmegaQ, v: boolean): void { this.sliderOn[q] = v; this._rebuild(); }
  public getSliderDeg(q: HurwitzOmegaQ): number { return this.sliderDeg[q]; }
  public setSliderDeg(q: HurwitzOmegaQ, v: number): void {
    this.sliderDeg[q] = wrapOmegaDegrees(v);
    this._rebuild();
  }
  public getFormulaOn(q: HurwitzOmegaQ): boolean { return this.formulaOn[q]; }
  public setFormulaOn(q: HurwitzOmegaQ, v: boolean): void { this.formulaOn[q] = v; this._rebuild(); }
  public getSliderChiText(q: HurwitzOmegaQ): string {
    return formatHurwitzCoeffList(hurwitzQOmegaCoeffs(q, this.sliderDeg[q]));
  }
  public getFormulaChiText(q: HurwitzOmegaQ): string {
    const coeffs = this._formulaCoeffs(q);
    return coeffs === null ? "" : formatHurwitzCoeffList(coeffs);
  }

  private _anyExtraOn(): boolean {
    return HURWITZ_OMEGA_QS.some(q => this.sliderOn[q] || this.formulaOn[q]);
  }

  public setWorldPerPixel(wpp: number): void {
    if (!Number.isFinite(wpp) || wpp <= 0) return;
    if (Math.abs(wpp - this.worldPerPixel) < this.worldPerPixel * 0.02) return;
    this.worldPerPixel = wpp;
    if (this.showB1Star || ((this.showBLink || this.showBPoint || this.showH || this.showReverse) && (this.onIds.size > 0 || this._anyExtraOn()))) this._rebuild();
  }

  public getOn(id: string): boolean { return this.onIds.has(id); }
  public setOn(id: string, v: boolean): void {
    if (v) this.onIds.add(id);
    else this.onIds.delete(id);
    this._rebuild();
  }

  public getAllOn(): boolean {
    return this._anyExtraOn()
      && HURWITZ_OMEGA_QS.every(q => this.sliderOn[q] && this.formulaOn[q])
      && HURWITZ_MID_PERP_CATALOG.every(row => this.onIds.has(row.id));
  }

  public setAllOn(v: boolean): void {
    this.onIds.clear();
    for (const q of HURWITZ_OMEGA_QS) {
      this.sliderOn[q] = v;
      this.formulaOn[q] = v;
    }
    if (v) {
      for (const row of HURWITZ_MID_PERP_CATALOG) this.onIds.add(row.id);
    }
    this._rebuild();
  }

  public getChi(id: string): HurwitzCoeff[] {
    const custom = this.chiById.get(id);
    if (custom !== undefined) return custom.map(c => ({ re: c.re, im: c.im }));
    return catalogCoeffs(id);
  }

  public setChi(id: string, coeffs: HurwitzCoeff[]): void {
    if (coeffs.length < 1) return;
    this.chiById.set(id, coeffs.map(c => ({ re: c.re, im: c.im })));
    this._rebuild();
  }

  public initialize(): void { this._rebuild(); }

  public dispose(): void {
    clearGroup(this.slot);
    this.group.parent?.remove(this.group);
  }

  public update(index: number, sigma: number, usePolyImag: boolean): void {
    this.index = index;
    this.sigma = sigma;
    this.usePolyImag = usePolyImag;
    this._rebuild();
  }

  public getStateSnapshot(): {
    circle: boolean;
    showSpiral: boolean;
    showInverse: boolean;
    liveQ: HurwitzOmegaQ;
    showReverse: boolean;
    showOH: boolean;
    showPerp: boolean;
    showBLink: boolean;
    showBPoint: boolean;
    showQ2Circle: boolean;
    showQ3Circle: boolean;
    showQ4Circle: boolean;
    showQ5Circle: boolean;
    showQ6Circle: boolean;
    showH: boolean;
    showB1Star: boolean;
    q2OmegaOn: boolean;
    q2OmegaDeg: number;
    q2OmegaLock: boolean;
    omegaOn: boolean;
    omegaDeg: number;
    q3OmegaLock: boolean;
    q4OmegaOn: boolean;
    q4OmegaDeg: number;
    q4OmegaLock: boolean;
    q5OmegaOn: boolean;
    q5OmegaDeg: number;
    q5OmegaLock: boolean;
    q6OmegaOn: boolean;
    q6OmegaDeg: number;
    q6OmegaLock: boolean;
    rows: HurwitzMidPerpRowSnap[];
  } {
    const rows: HurwitzMidPerpRowSnap[] = [];
    for (const row of HURWITZ_MID_PERP_CATALOG) {
      rows.push({ id: row.id, on: this.onIds.has(row.id) });
    }
    return {
      circle: this.showCircle,
      showSpiral: this.showSpiral,
      showInverse: this.showInverse,
      liveQ: this.liveQ,
      showReverse: this.showReverse,
      showOH: this.showOH,
      showPerp: this.showPerp,
      showBLink: this.showBLink,
      showBPoint: this.showBPoint,
      showQ2Circle: this.showQ2Circle,
      showQ3Circle: this.showQ3Circle,
      showQ4Circle: this.showQ4Circle,
      showQ5Circle: this.showQ5Circle,
      showQ6Circle: this.showQ6Circle,
      showH: this.showH,
      showB1Star: this.showB1Star,
      q2OmegaOn: this.sliderOn[2],
      q2OmegaDeg: this.sliderDeg[2],
      q2OmegaLock: this.formulaOn[2],
      omegaOn: this.sliderOn[3],
      omegaDeg: this.sliderDeg[3],
      q3OmegaLock: this.formulaOn[3],
      q4OmegaOn: this.sliderOn[4],
      q4OmegaDeg: this.sliderDeg[4],
      q4OmegaLock: this.formulaOn[4],
      q5OmegaOn: this.sliderOn[5],
      q5OmegaDeg: this.sliderDeg[5],
      q5OmegaLock: this.formulaOn[5],
      q6OmegaOn: this.sliderOn[6],
      q6OmegaDeg: this.sliderDeg[6],
      q6OmegaLock: this.formulaOn[6],
      rows,
    };
  }

  public batchRestore(snap: {
    circle?: boolean;
    showSpiral?: boolean;
    showInverse?: boolean;
    liveQ?: HurwitzOmegaQ;
    showReverse?: boolean;
    showOH?: boolean;
    showPerp?: boolean;
    showBLink?: boolean;
    showBPoint?: boolean;
    showQ2Circle?: boolean;
    showQ3Circle?: boolean;
    showQ4Circle?: boolean;
    showQ5Circle?: boolean;
    showQ6Circle?: boolean;
    showH?: boolean;
    showB1Star?: boolean;
    q2OmegaOn?: boolean;
    q2OmegaDeg?: number;
    q2OmegaLock?: boolean;
    omegaOn?: boolean;
    omegaDeg?: number;
    q3OmegaLock?: boolean;
    q4OmegaOn?: boolean;
    q4OmegaDeg?: number;
    q4OmegaLock?: boolean;
    q5OmegaOn?: boolean;
    q5OmegaDeg?: number;
    q5OmegaLock?: boolean;
    q6OmegaOn?: boolean;
    q6OmegaDeg?: number;
    q6OmegaLock?: boolean;
    rows: HurwitzMidPerpRowSnap[];
  }): void {
    this.showCircle = snap.circle === true;
    this.showSpiral = snap.showSpiral === true;
    this.showInverse = snap.showInverse === true;
    this.liveQ = snap.liveQ === 3 || snap.liveQ === 4 || snap.liveQ === 5 || snap.liveQ === 6 ? snap.liveQ : 2;
    this.showReverse = snap.showReverse === true;
    this.showOH = snap.showOH === true;
    this.showPerp = snap.showPerp === true;
    this.showBLink = snap.showBLink !== false;
    this.showBPoint = snap.showBPoint !== false;
    this.showQ2Circle = snap.showQ2Circle === true;
    this.showQ3Circle = snap.showQ3Circle === true;
    this.showQ4Circle = snap.showQ4Circle === true;
    this.showQ5Circle = snap.showQ5Circle === true;
    this.showQ6Circle = snap.showQ6Circle === true;
    this.showH = snap.showH === true;
    this.showB1Star = snap.showB1Star === true;
    this.sliderOn[2] = snap.q2OmegaOn === true;
    this.sliderDeg[2] = wrapOmegaDegrees(snap.q2OmegaDeg ?? 0);
    this.formulaOn[2] = snap.q2OmegaLock === true;
    this.sliderOn[3] = snap.omegaOn === true;
    this.sliderDeg[3] = wrapOmegaDegrees(snap.omegaDeg ?? 0);
    this.formulaOn[3] = snap.q3OmegaLock === true;
    this.sliderOn[4] = snap.q4OmegaOn === true;
    this.sliderDeg[4] = wrapOmegaDegrees(snap.q4OmegaDeg ?? 0);
    this.formulaOn[4] = snap.q4OmegaLock === true;
    this.sliderOn[5] = snap.q5OmegaOn === true;
    this.sliderDeg[5] = wrapOmegaDegrees(snap.q5OmegaDeg ?? 0);
    this.formulaOn[5] = snap.q5OmegaLock === true;
    this.sliderOn[6] = snap.q6OmegaOn === true;
    this.sliderDeg[6] = wrapOmegaDegrees(snap.q6OmegaDeg ?? 0);
    this.formulaOn[6] = snap.q6OmegaLock === true;
    this.onIds.clear();
    for (const row of snap.rows) {
      if (row.on) this.onIds.add(row.id);
    }
    this._rebuild();
  }

  public getToolSections(_ctx: ToolboxContext): ToolboxSection[] {
    return [{
      id: "hurwitz-mid-perp",
      contributorId: "layer:hurwitzMidPerp",
      title: "perp through H/2",
      order: 14,
      defaultCollapsed: true,
      CustomPanel: this.panel,
    }];
  }

  /**
   * Unique circle through three period-q b-points. Uses catalog rows
   * first; if fewer than three exist (q=3 has two), fills with equally
   * spaced ω on the 1−ω√q family.
   */
  private _drawQBisectorCircle(s: Complex, q: number, color: number): void {
    const pts: Point2[] = [];
    const pushCrossing = (coeffs: HurwitzCoeff[]): void => {
      if (pts.length >= 3 || coeffs.length < 1) return;
      const nLinks = calcNLinks(this.index, coeffs.length);
      if (nLinks < 1) return;
      const target = calculateHurwitzCharacterTarget(coeffs, s);
      const fwd = calculateHurwitzCharacterVectors(coeffs, nLinks, s);
      const guess = hurwitzBisectorLinkNumber(this.index, coeffs.length);
      const H = { x: target.re, y: target.im };
      const reverse = flipLFunctionVectorsOriginToTarget(fwd, H);
      const cross = locateHurwitzBisectorCrossing(fwd.vectors, H, guess, { reverseJoints: reverse });
      if (cross === null) return;
      const p = cross.point;
      if (pts.some(q => Math.hypot(p.x - q.x, p.y - q.y) < 1e-8)) return;
      pts.push(p);
    };
    for (const row of HURWITZ_MID_PERP_CATALOG) {
      if (row.q !== q) continue;
      pushCrossing(this.getChi(row.id));
      if (pts.length === 3) break;
    }
    for (let k = 0; pts.length < 3 && k < 6; k++) {
      const ang = (2 * Math.PI * k) / 6;
      pushCrossing(midPerpProgressionCoeffs(q, complex(Math.cos(ang), Math.sin(ang))));
    }
    const a = pts[0];
    const b = pts[1];
    const c = pts[2];
    if (a === undefined || b === undefined || c === undefined) return;
    const circ = circumcircleThrough3(a, b, c);
    if (circ === null) return;
    buildZetaCircle(circ.center, circ.r, color, this.slot);
  }

  private _rebuild(): void {
    clearGroup(this.slot);
    this.bPointLinks = [];
    const anyOn = this.onIds.size > 0 || this._anyExtraOn();
    const rowDraw = this.showSpiral || this.showReverse || this.showInverse || this.showOH || this.showPerp || this.showBLink || this.showBPoint || this.showH;
    if (!this.showCircle && !this.showQ2Circle && !this.showQ3Circle && !this.showQ4Circle && !this.showQ5Circle && !this.showQ6Circle && !this.showB1Star && !(anyOn && rowDraw)) return;
    const t = indexToImag(this.index, this.usePolyImag);
    const s = complex(this.sigma, t);
    const zetaPt: Point2 = (() => {
      const z = eulerMaclaurenZeta(s);
      return { x: z.re, y: z.im };
    })();
    if (this.showCircle) {
      const radius = Math.hypot(zetaPt.x, zetaPt.y);
      buildZetaCircle(zetaPt, radius, CIRCLE_COLOR, this.slot);
    }
    if (this.showB1Star) {
      const { b1Star } = calcB1Star(this.sigma, t);
      buildOpenHCircle({ x: b1Star.re, y: b1Star.im }, B1_STAR_COLOR, this.slot, this.worldPerPixel);
    }
    if (this.showQ2Circle) this._drawQBisectorCircle(s, 2, catalogSpectrumHex(2));
    if (this.showQ3Circle) this._drawQBisectorCircle(s, 3, catalogSpectrumHex(3));
    if (this.showQ4Circle) this._drawQBisectorCircle(s, 4, catalogSpectrumHex(4));
    if (this.showQ5Circle) this._drawQBisectorCircle(s, 5, catalogSpectrumHex(5));
    if (this.showQ6Circle) this._drawQBisectorCircle(s, 6, catalogSpectrumHex(6));
    for (const q of HURWITZ_OMEGA_QS) {
      if (this.sliderOn[q] && rowDraw) {
        const spec = hurwitzMidPerpSpectrumIndex(hurwitzQSliderId(q));
        this._drawRow(s, hurwitzQOmegaCoeffs(q, this.sliderDeg[q]), spectrumColor(spec.k, spec.n).hex, {
          nearest: zetaPt,
        });
      }
      if (this.formulaOn[q] && rowDraw) {
        const formula = this._formulaCoeffs(q);
        if (formula !== null) {
          const spec = hurwitzMidPerpSpectrumIndex(hurwitzQFormulaId(q));
          const hint = this.formulaHint[q];
          this._drawRow(s, formula, spectrumColor(spec.k, spec.n).hex, {
            preferLink: hint?.link,
            nearest: zetaPt,
          });
        }
      }
    }
    for (let i = 0; i < HURWITZ_MID_PERP_CATALOG.length; i++) {
      const row = HURWITZ_MID_PERP_CATALOG[i];
      if (row === undefined || !this.onIds.has(row.id) || !rowDraw) continue;
      const spec = hurwitzMidPerpSpectrumIndex(i);
      this._drawRow(s, this.getChi(row.id), spectrumColor(spec.k, spec.n).hex, { nearest: zetaPt });
    }
  }

  private _formulaCoeffs(q: HurwitzOmegaQ): HurwitzCoeff[] | null {
    const hit = omegaForZetaBPoint(this.index, q, this.formulaHint[q]);
    if (hit === null) return null;
    this.formulaHint[q] = { deg: hit.deg, index: this.index, link: hit.link };
    return midPerpProgressionCoeffs(q, hit.omega);
  }

  private _drawRow(
    s: Complex,
    coeffs: HurwitzCoeff[],
    color: number,
    crossOpts?: { preferLink?: number; nearest?: Point2 },
  ): void {
    if (coeffs.length < 1) return;
    const target = calculateHurwitzCharacterTarget(coeffs, s);
    const targetPt: Point2 = { x: target.re, y: target.im };
    if (this.showOH && Number.isFinite(targetPt.x) && Number.isFinite(targetPt.y)) {
      buildOriginToH(targetPt, color, this.slot);
    }
    if (this.showPerp && Number.isFinite(targetPt.x) && Number.isFinite(targetPt.y)) {
      buildPerpBisector(targetPt, color, this.slot);
    }
    if (this.showH) {
      buildOpenHCircle(targetPt, color, this.slot, this.worldPerPixel);
    }
    const nLinks = calcNLinks(this.index, coeffs.length);
    if (nLinks < 1) return;
    const fwd = calculateHurwitzCharacterVectors(coeffs, nLinks, s);
    if (this.showSpiral) buildLine(fwd.vectors, color, this.slot);
    if (this.showInverse) {
      const inv = calculateHurwitzCharacterInverseSumVectors(coeffs, nLinks, s);
      buildLine(inv.vectors, INVERSE_SPIRAL_COLOR, this.slot);
    }
    if (this.showReverse) {
      buildLine(flipLFunctionVectorsOriginToTarget(fwd, targetPt), color, this.slot, 0.65);
    }
    const guess = hurwitzBisectorLinkNumber(this.index, coeffs.length);
    const reverse = flipLFunctionVectorsOriginToTarget(fwd, targetPt);
    const cross = locateHurwitzBisectorCrossing(fwd.vectors, targetPt, guess, {
      ...crossOpts,
      reverseJoints: reverse,
    });
    if (cross !== null) this.bPointLinks.push(cross.link);
    if (cross === null) return;
    if (this.showBLink) {
      const a = fwd.vectors[cross.link];
      const b = fwd.vectors[cross.link + 1];
      if (a !== undefined && b !== undefined) {
        buildDoubleWidthSegment(a, b, color, this.slot, this.worldPerPixel);
      }
    }
    if (this.showBPoint) {
      buildClosedBPoint(cross.point, color, this.slot, this.worldPerPixel);
    }
  }
}

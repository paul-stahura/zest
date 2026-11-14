import * as THREE from "three";
import type { ComponentType } from "react";
import type { Point2 } from "@/shared/io/types";
import type { ToolboxContext, ToolboxSection } from "@/shared/visualization/contracts";
import {
  calcNLinks,
  calculateHurwitzCharacterTarget,
  calculateHurwitzCharacterVectors,
  flipLFunctionVectorsOriginToTarget,
  type HurwitzCoeff,
} from "@/shared/math/lFunctionCalculator";
import { complex, type Complex } from "@/shared/math/complex";
import { eulerMaclaurenZeta, indexToImag } from "@/shared/math/zetaEms";
import { midPerpProgressionCoeffs } from "@/shared/math/hurwitzMidPerpSearch";
import {
  hurwitzBisectorLinkNumber,
  locateHurwitzBisectorCrossing,
} from "@/shared/math/hurwitzBisectorLink";
import { omegaForZetaBPoint, type OmegaZetaBPointHint, type Q2OmegaZetaBPoint } from "@/shared/math/q2OmegaZetaBPoint";
import { clampHurwitzFormulaQMax, HURWITZ_FORMULA_Q_MAX, HURWITZ_FORMULA_Q_MIN } from "@/shared/math/hurwitzFormulaQMax";
import { spectrumColor } from "@/shared/math/spectrumColor";
import type { HurwitzFormulaPanelLayer } from "@/features/main-workspace/HurwitzFormulaPanel";
import { createHurwitzFormulaPanel } from "@/features/main-workspace/HurwitzFormulaPanel";

const B_POINT_PIXEL_RADIUS = 4;
const FORMULA_Q_COUNT = HURWITZ_FORMULA_Q_MAX - HURWITZ_FORMULA_Q_MIN + 1;

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

const OZ_COLOR = 0xe9ecef;
const CIRCLE_SEGMENTS = 960;

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

function formatLiveOmega(re: number, im: number): string {
  const r = re.toFixed(3);
  const a = Math.abs(im).toFixed(3);
  if (Math.abs(im) < 5e-4) return r;
  return im < 0 ? `${r}-${a}i` : `${r}+${a}i`;
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

export type HurwitzFormulaSnap = {
  qMax: number;
  single: boolean;
  showSpiral: boolean;
  showReverse: boolean;
  showBLink: boolean;
  showBPoint: boolean;
  showOZ: boolean;
  showPerp: boolean;
  showCircle: boolean;
  showOH: boolean;
};

/**
 * Formula tables at slider Q: every period 2..Q, or only Q when
 * {@link HurwitzFormulaSnap.single} is on. Draw flags start off.
 */
export class HurwitzFormulaWorkspaceLayer implements HurwitzFormulaPanelLayer {
  private readonly group: THREE.Group;
  private readonly slot: THREE.Group;
  private readonly panel: ComponentType<{ ctx: ToolboxContext }>;

  private index = 1;
  private sigma = 0.5;
  private usePolyImag = false;
  private worldPerPixel = 0.01;

  private qMax = HURWITZ_FORMULA_Q_MIN;
  private single = true;
  private showSpiral = false;
  private showReverse = false;
  private showBLink = false;
  private showBPoint = false;
  private showOZ = false;
  private showPerp = false;
  private showCircle = false;
  private showOH = false;
  private readonly formulaHint = new Map<number, OmegaZetaBPointHint>();
  private liveOmega: { index: number; q: number; re: number; im: number; deg: number } | null = null;

  constructor(parentGroup: THREE.Group) {
    this.group = new THREE.Group();
    this.slot = new THREE.Group();
    this.group.add(this.slot);
    parentGroup.add(this.group);
    this.panel = createHurwitzFormulaPanel(this);
  }

  /** Same origin fit as the spiral. */
  public setDisplayScale(scale: number): void {
    this.group.scale.setScalar(scale);
  }

  public getQMax(): number { return this.qMax; }
  public setQMax(v: number): void {
    this.qMax = clampHurwitzFormulaQMax(v);
    this._rebuild();
  }
  public getSingle(): boolean { return this.single; }
  public setSingle(v: boolean): void { this.single = v; this._rebuild(); }
  public getShowSpiral(): boolean { return this.showSpiral; }
  public setShowSpiral(v: boolean): void { this.showSpiral = v; this._rebuild(); }
  public getShowReverse(): boolean { return this.showReverse; }
  public setShowReverse(v: boolean): void { this.showReverse = v; this._rebuild(); }
  public getShowBLink(): boolean { return this.showBLink; }
  public setShowBLink(v: boolean): void { this.showBLink = v; this._rebuild(); }
  public getShowBPoint(): boolean { return this.showBPoint; }
  public setShowBPoint(v: boolean): void { this.showBPoint = v; this._rebuild(); }
  public getShowOZ(): boolean { return this.showOZ; }
  public setShowOZ(v: boolean): void { this.showOZ = v; this._rebuild(); }
  public getShowPerp(): boolean { return this.showPerp; }
  public setShowPerp(v: boolean): void { this.showPerp = v; this._rebuild(); }
  public getShowCircle(): boolean { return this.showCircle; }
  public setShowCircle(v: boolean): void { this.showCircle = v; this._rebuild(); }
  public getShowOH(): boolean { return this.showOH; }
  public setShowOH(v: boolean): void { this.showOH = v; this._rebuild(); }

  /**
   * Current slider q and ω_* at the workspace T, for the accordion header line.
   */
  public getLiveReadout(): string {
    this._ensureLiveOmega();
    const qBit = this.single
      ? `q=${this.qMax}`
      : `q=${HURWITZ_FORMULA_Q_MIN}…${this.qMax}`;
    if (this.liveOmega === null) return `${qBit}  ω=—`;
    const omega = formatLiveOmega(this.liveOmega.re, this.liveOmega.im);
    const deg = Math.round(this.liveOmega.deg);
    const omegaBit = this.single ? `ω=${omega}` : `ω(${this.qMax})=${omega}`;
    return `${qBit}  ${omegaBit}  ${deg}°`;
  }

  public setWorldPerPixel(wpp: number): void {
    if (!Number.isFinite(wpp) || wpp <= 0) return;
    if (Math.abs(wpp - this.worldPerPixel) < this.worldPerPixel * 0.02) return;
    this.worldPerPixel = wpp;
    if (this.showBLink || this.showBPoint) this._rebuild();
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

  public getStateSnapshot(): HurwitzFormulaSnap {
    return {
      qMax: this.qMax,
      single: this.single,
      showSpiral: this.showSpiral,
      showReverse: this.showReverse,
      showBLink: this.showBLink,
      showBPoint: this.showBPoint,
      showOZ: this.showOZ,
      showPerp: this.showPerp,
      showCircle: this.showCircle,
      showOH: this.showOH,
    };
  }

  public batchRestore(snap: Partial<HurwitzFormulaSnap>): void {
    this.qMax = clampHurwitzFormulaQMax(snap.qMax ?? HURWITZ_FORMULA_Q_MIN);
    this.single = snap.single !== false;
    this.showSpiral = snap.showSpiral === true;
    this.showReverse = snap.showReverse === true;
    this.showBLink = snap.showBLink === true;
    this.showBPoint = snap.showBPoint === true;
    this.showOZ = snap.showOZ === true;
    this.showPerp = snap.showPerp === true;
    this.showCircle = snap.showCircle === true;
    this.showOH = snap.showOH === true;
    this._rebuild();
  }

  public getToolSections(_ctx: ToolboxContext): ToolboxSection[] {
    return [{
      id: "hurwitz-formula",
      contributorId: "layer:hurwitzFormula",
      title: "hurwitz formula",
      order: 15,
      defaultCollapsed: true,
      CustomPanel: this.panel,
    }];
  }

  private _rebuild(): void {
    clearGroup(this.slot);
    const rowDraw = this.showSpiral || this.showReverse || this.showBLink || this.showBPoint || this.showPerp || this.showOH;
    if (!rowDraw && !this.showOZ && !this.showCircle) return;
    const t = indexToImag(this.index, this.usePolyImag);
    const s = complex(this.sigma, t);
    const z = eulerMaclaurenZeta(s);
    const zetaPt: Point2 = { x: z.re, y: z.im };
    if (this.showOZ) {
      buildLine([{ x: 0, y: 0 }, zetaPt], OZ_COLOR, this.slot);
    }
    if (this.showCircle) {
      const radius = Math.hypot(zetaPt.x, zetaPt.y);
      buildZetaCircle(zetaPt, radius, OZ_COLOR, this.slot);
    }
    if (!rowDraw) return;
    const qLo = this.single ? this.qMax : HURWITZ_FORMULA_Q_MIN;
    for (let q = qLo; q <= this.qMax; q++) {
      const color = spectrumColor(q - 1, FORMULA_Q_COUNT).hex;
      const hit = omegaForZetaBPoint(this.index, q, this.formulaHint.get(q));
      if (hit === null) continue;
      this.formulaHint.set(q, { deg: hit.deg, index: this.index, link: hit.link });
      this._rememberLive(q, hit);
      const coeffs = midPerpProgressionCoeffs(q, hit.omega);
      this._drawRow(s, coeffs, color, zetaPt, hit.link);
    }
  }

  private _rememberLive(q: number, hit: Q2OmegaZetaBPoint): void {
    if (q !== this.qMax) return;
    this.liveOmega = {
      index: this.index,
      q,
      re: hit.omega.re,
      im: hit.omega.im,
      deg: hit.deg,
    };
  }

  private _ensureLiveOmega(): void {
    if (this.liveOmega !== null && this.liveOmega.index === this.index && this.liveOmega.q === this.qMax) {
      return;
    }
    const hit = omegaForZetaBPoint(this.index, this.qMax, this.formulaHint.get(this.qMax));
    if (hit === null) {
      this.liveOmega = null;
      return;
    }
    this.formulaHint.set(this.qMax, { deg: hit.deg, index: this.index, link: hit.link });
    this._rememberLive(this.qMax, hit);
  }

  private _drawRow(
    s: Complex,
    coeffs: HurwitzCoeff[],
    color: number,
    zetaPt: Point2,
    preferLink: number,
  ): void {
    if (coeffs.length < 1) return;
    const target = calculateHurwitzCharacterTarget(coeffs, s);
    const targetPt: Point2 = { x: target.re, y: target.im };
    if (this.showOH && Number.isFinite(targetPt.x) && Number.isFinite(targetPt.y)) {
      buildLine([{ x: 0, y: 0 }, targetPt], color, this.slot);
    }
    if (this.showPerp && Number.isFinite(targetPt.x) && Number.isFinite(targetPt.y)) {
      buildPerpBisector(targetPt, color, this.slot);
    }
    if (!this.showSpiral && !this.showReverse && !this.showBLink && !this.showBPoint) return;
    const nLinks = calcNLinks(this.index, coeffs.length);
    if (nLinks < 1) return;
    const fwd = calculateHurwitzCharacterVectors(coeffs, nLinks, s);
    if (this.showSpiral) buildLine(fwd.vectors, color, this.slot);
    if (this.showReverse) {
      buildLine(flipLFunctionVectorsOriginToTarget(fwd, targetPt), color, this.slot, 0.65);
    }
    if (!this.showBLink && !this.showBPoint) return;
    const guess = hurwitzBisectorLinkNumber(this.index, coeffs.length);
    const reverse = flipLFunctionVectorsOriginToTarget(fwd, targetPt);
    const cross = locateHurwitzBisectorCrossing(fwd.vectors, targetPt, guess, {
      preferLink,
      reverseJoints: reverse,
      nearest: zetaPt,
    });
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

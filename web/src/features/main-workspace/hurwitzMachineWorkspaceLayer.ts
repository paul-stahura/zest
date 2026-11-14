import * as THREE from "three";
import type { ComponentType } from "react";
import type { Point2 } from "@/shared/io/types";
import type { ToolboxContext, ToolboxSection } from "@/shared/visualization/contracts";
import {
  calcNLinks,
  calculateHurwitzCharacterInverseVectors,
  calculateHurwitzCharacterTarget,
  calculateHurwitzCharacterVectors,
  defaultHurwitzCoeffs,
  reflectLFunctionVectors,
  resizeHurwitzCoeffs,
  type HurwitzCoeff,
} from "@/shared/math/lFunctionCalculator";
import { complex } from "@/shared/math/complex";
import { eulerMaclaurenZeta, indexToImag } from "@/shared/math/zetaEms";
import { footOnOriginLine } from "@/shared/math/hurwitzZetaPerp";
import type { HurwitzMachinePanelLayer } from "@/features/main-workspace/HurwitzMachinePanel";
import { createHurwitzMachinePanel } from "@/features/main-workspace/HurwitzMachinePanel";

const COLOR_FWD = 0x20c997;
const COLOR_REFLECT = 0xf06595;
const COLOR_PHANTOM = 0xffffff;
const COLOR_ORIGIN_H = 0xffd43b;
const COLOR_ZETA_DROP = 0x74c0fc;

function buildLine(pts: Point2[], color: number, opacity: number, group: THREE.Group): void {
  if (pts.length < 2) return;
  const positions = new Float32Array(pts.length * 3);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = 0;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = opacity < 1
    ? new THREE.LineBasicMaterial({ color, transparent: true, opacity })
    : new THREE.LineBasicMaterial({ color });
  group.add(new THREE.Line(geom, mat));
}

function buildSegments(pairs: [Point2, Point2][], color: number, opacity: number, group: THREE.Group): void {
  if (pairs.length === 0) return;
  const positions = new Float32Array(pairs.length * 6);
  for (let i = 0; i < pairs.length; i++) {
    const [a, b] = pairs[i]!;
    positions[i * 6] = a.x;
    positions[i * 6 + 1] = a.y;
    positions[i * 6 + 2] = 0;
    positions[i * 6 + 3] = b.x;
    positions[i * 6 + 4] = b.y;
    positions[i * 6 + 5] = 0;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  group.add(new THREE.LineSegments(geom, new THREE.LineBasicMaterial({ color, transparent: true, opacity })));
}

function buildCross(target: Point2, size: number, color: number, group: THREE.Group): void {
  const h = size / 2;
  const positions = new Float32Array([
    target.x - h, target.y, 0, target.x + h, target.y, 0,
    target.x, target.y - h, 0, target.x, target.y + h, 0,
  ]);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  group.add(new THREE.LineSegments(geom, new THREE.LineBasicMaterial({ color })));
}

function buildBisector(target: Point2, color: number, group: THREE.Group): void {
  const tLen = Math.hypot(target.x, target.y);
  if (tLen < 1e-10) return;
  const perpX = -target.y / tLen;
  const perpY = target.x / tLen;
  const midX = target.x / 2;
  const midY = target.y / 2;
  const ext = 30;
  const positions = new Float32Array([
    0, 0, 0, target.x, target.y, 0,
    midX - perpX * ext, midY - perpY * ext, 0,
    midX + perpX * ext, midY + perpY * ext, 0,
  ]);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  group.add(new THREE.LineSegments(geom, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 })));
}

function clearGroup(g: THREE.Group): void {
  for (let i = g.children.length - 1; i >= 0; i--) {
    const child = g.children[i];
    if (child instanceof THREE.Line || child instanceof THREE.LineSegments) {
      g.remove(child);
      child.geometry.dispose();
      const mat = child.material;
      if (!Array.isArray(mat)) mat.dispose();
    }
  }
}

/**
 * Toolbox + draw layer for an arbitrary periodic χ via Hurwitz zeta.
 * Uses the same t = I(T) as the zeta spiral.
 */
export class HurwitzMachineWorkspaceLayer implements HurwitzMachinePanelLayer {
  private readonly group: THREE.Group;
  private readonly slot: THREE.Group;
  private readonly panel: ComponentType<{ ctx: ToolboxContext }>;

  private index = 1;
  private sigma = 0.5;
  private usePolyImag = false;

  private enabled = false;
  private coeffs: HurwitzCoeff[] = defaultHurwitzCoeffs(5);
  private spiralMode = 0;
  private phantomMode = 2;
  private reflect = false;
  private bisector = false;
  private perp = false;

  constructor(parentGroup: THREE.Group) {
    this.group = new THREE.Group();
    this.slot = new THREE.Group();
    this.group.add(this.slot);
    parentGroup.add(this.group);
    this.panel = createHurwitzMachinePanel(this);
  }

  /** Same origin fit as the spiral. */
  public setDisplayScale(scale: number): void {
    this.group.scale.setScalar(scale);
  }

  public getIndex(): number { return this.index; }
  public getUsePolyImag(): boolean { return this.usePolyImag; }

  public getEnabled(): boolean { return this.enabled; }
  public setEnabled(v: boolean): void { this.enabled = v; this._rebuild(); }

  public getModulus(): number { return this.coeffs.length; }
  public setModulus(q: number): void {
    this.coeffs = resizeHurwitzCoeffs(this.coeffs, q);
    this._rebuild();
  }

  public getCoeffs(): HurwitzCoeff[] {
    return this.coeffs.map(c => ({ re: c.re, im: c.im }));
  }

  public setCoeffs(coeffs: HurwitzCoeff[]): void {
    if (coeffs.length < 1) return;
    this.coeffs = resizeHurwitzCoeffs(coeffs, coeffs.length);
    this._rebuild();
  }

  public setCoeffAt(residue: number, coeff: HurwitzCoeff): void {
    if (residue < 0 || residue >= this.coeffs.length) return;
    this.coeffs[residue] = { re: coeff.re, im: coeff.im };
    this._rebuild();
  }

  public getSpiralMode(): number { return this.spiralMode; }
  public setSpiralMode(v: number): void { this.spiralMode = v; this._rebuild(); }
  public getPhantomMode(): number { return this.phantomMode; }
  public setPhantomMode(v: number): void { this.phantomMode = v; this._rebuild(); }
  public getReflect(): boolean { return this.reflect; }
  public setReflect(v: boolean): void { this.reflect = v; this._rebuild(); }
  public getBisector(): boolean { return this.bisector; }
  public setBisector(v: boolean): void { this.bisector = v; this._rebuild(); }
  public getPerp(): boolean { return this.perp; }
  public setPerp(v: boolean): void { this.perp = v; this._rebuild(); }

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

  public getStateSnapshot() {
    return {
      enabled: this.enabled,
      coeffs: this.getCoeffs(),
      spiralMode: this.spiralMode,
      phantomMode: this.phantomMode,
      reflect: this.reflect,
      bisector: this.bisector,
      perp: this.perp,
    };
  }

  public batchRestore(snap: ReturnType<typeof this.getStateSnapshot>): void {
    this.enabled = snap.enabled;
    this.coeffs = resizeHurwitzCoeffs(snap.coeffs, snap.coeffs.length);
    this.spiralMode = snap.spiralMode;
    this.phantomMode = snap.phantomMode;
    this.reflect = snap.reflect;
    this.bisector = snap.bisector;
    this.perp = snap.perp;
    this._rebuild();
  }

  public getToolSections(_ctx: ToolboxContext): ToolboxSection[] {
    return [{
      id: "hurwitz-machine",
      contributorId: "layer:hurwitzMachine",
      title: "General Hurwitz machine",
      order: 13,
      defaultCollapsed: true,
      CustomPanel: this.panel,
    }];
  }

  private _rebuild(): void {
    clearGroup(this.slot);
    if (!this.enabled && !this.perp) return;
    const q = this.coeffs.length;
    const t = indexToImag(this.index, this.usePolyImag);
    const s = complex(this.sigma, t);

    const target = calculateHurwitzCharacterTarget(this.coeffs, s);
    const targetPt: Point2 = { x: target.re, y: target.im };

    if (this.perp) {
      const zeta = eulerMaclaurenZeta(s);
      if (
        Number.isFinite(targetPt.x) && Number.isFinite(targetPt.y)
        && Number.isFinite(zeta.re) && Number.isFinite(zeta.im)
      ) {
        const origin: Point2 = { x: 0, y: 0 };
        const zetaPt: Point2 = { x: zeta.re, y: zeta.im };
        buildLine([origin, targetPt], COLOR_ORIGIN_H, 1, this.slot);
        const foot = footOnOriginLine(zetaPt, targetPt);
        if (foot !== null) buildLine([zetaPt, foot], COLOR_ZETA_DROP, 1, this.slot);
      }
    }

    if (!this.enabled) return;
    const nLinks = calcNLinks(this.index, q);
    if (nLinks < 1) return;
    const fwd = calculateHurwitzCharacterVectors(this.coeffs, nLinks, s);
    const inv = calculateHurwitzCharacterInverseVectors(this.coeffs, nLinks, s, targetPt);

    const showFwd = this.spiralMode === 0 || this.spiralMode === 2;
    const showInv = this.spiralMode === 1 || this.spiralMode === 2;
    const showSpiral = this.phantomMode === 0 || this.phantomMode === 2;
    const showPhantom = this.phantomMode === 1 || this.phantomMode === 2;

    if (showSpiral) {
      if (showFwd) buildLine(fwd.vectors, COLOR_FWD, 1, this.slot);
      if (showInv) buildLine(inv.vectors, COLOR_FWD, 0.6, this.slot);
      buildCross(targetPt, 0.04, COLOR_FWD, this.slot);
    }
    if (showPhantom) {
      if (showFwd) buildSegments(fwd.phantomVectors, COLOR_PHANTOM, 0.4, this.slot);
      if (showInv) buildSegments(inv.phantomVectors, COLOR_PHANTOM, 0.25, this.slot);
    }
    if (this.reflect) {
      const reflFwd = reflectLFunctionVectors(fwd, targetPt);
      const reflInv = reflectLFunctionVectors(inv, targetPt);
      if (showSpiral) {
        if (showFwd) buildLine(reflFwd.vectors, COLOR_REFLECT, 0.45, this.slot);
        if (showInv) buildLine(reflInv.vectors, COLOR_REFLECT, 0.3, this.slot);
      }
      if (showPhantom) {
        if (showFwd) buildSegments(reflFwd.phantomVectors, COLOR_PHANTOM, 0.25, this.slot);
        if (showInv) buildSegments(reflInv.phantomVectors, COLOR_PHANTOM, 0.15, this.slot);
      }
    }
    if (this.bisector) buildBisector(targetPt, COLOR_FWD, this.slot);
  }
}

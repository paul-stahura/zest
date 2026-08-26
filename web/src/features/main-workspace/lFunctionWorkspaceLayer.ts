import * as THREE from "three";
import type { ComponentType } from "react";
import type { Point2 } from "@/shared/io/types";
import type { ToolboxContext, ToolboxSection } from "@/shared/visualization/contracts";
import {
  calcNLinks,
  calculateInverseVectors,
  calculateVectors,
  calculateZetaTarget,
  getPrimeImaginaryPart,
  reflectLFunctionVectors,
} from "@/shared/math/lFunctionCalculator";
import { complex } from "@/shared/math/complex";
import type { LFunctionPanelLayer } from "@/features/main-workspace/LFunctionPanel";
import { createLFunctionPanel } from "@/features/main-workspace/LFunctionPanel";

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const COLOR_L1         = 0xcc3333;
const COLOR_L1_REFLECT = 0x33cc66; // green — distinct from red forward L1
const COLOR_L2         = 0x9933cc;
const COLOR_PHANTOM    = 0xffffff;
const COLOR_BISECTOR_1 = 0x33cccc;
const COLOR_BISECTOR_2 = 0x66cc33;

// ---------------------------------------------------------------------------
// Scene-object helpers — add to the given group, no return tracking needed
// ---------------------------------------------------------------------------

function buildLine(pts: Point2[], color: number, opacity: number, group: THREE.Group): void {
  if (pts.length < 2) return;
  const positions = new Float32Array(pts.length * 3);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    positions[i * 3]     = p.x;
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
    positions[i * 6]     = a.x; positions[i * 6 + 1] = a.y; positions[i * 6 + 2] = 0;
    positions[i * 6 + 3] = b.x; positions[i * 6 + 4] = b.y; positions[i * 6 + 5] = 0;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  group.add(new THREE.LineSegments(geom, new THREE.LineBasicMaterial({ color, transparent: true, opacity })));
}

function buildCross(target: Point2, size: number, color: number, group: THREE.Group): void {
  const h = size / 2;
  const positions = new Float32Array([
    target.x - h, target.y, 0,  target.x + h, target.y, 0,
    target.x, target.y - h, 0,  target.x, target.y + h, 0,
  ]);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  group.add(new THREE.LineSegments(geom, new THREE.LineBasicMaterial({ color })));
}

function buildBisector(target: Point2, color: number, group: THREE.Group): void {
  const tLen = Math.hypot(target.x, target.y);
  if (tLen < 1e-10) return;
  const perpX = -target.y / tLen;
  const perpY =  target.x / tLen;
  const midX = target.x / 2;
  const midY = target.y / 2;
  const ext = 30; // 10× prior length so the bisector stays visible when zoomed out
  const positions = new Float32Array([
    0, 0, 0,  target.x, target.y, 0,
    midX - perpX * ext, midY - perpY * ext, 0,
    midX + perpX * ext, midY + perpY * ext, 0,
  ]);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  group.add(new THREE.LineSegments(geom, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 })));
}

// Disposes and removes every direct child of a group.
function clearGroup(g: THREE.Group): void {
  for (let i = g.children.length - 1; i >= 0; i--) {
    const child = g.children[i] as THREE.Line | THREE.LineSegments;
    g.remove(child);
    child.geometry.dispose();
    const mat = child.material;
    if (!Array.isArray(mat)) mat.dispose();
  }
}

// ---------------------------------------------------------------------------
// LFunctionWorkspaceLayer
// ---------------------------------------------------------------------------

export class LFunctionWorkspaceLayer implements LFunctionPanelLayer {
  private readonly group: THREE.Group;
  private readonly slotGroup1: THREE.Group;
  private readonly slotGroup2: THREE.Group;
  private readonly panel: ComponentType<{ ctx: ToolboxContext }>;

  // Spiral-owned params (kept in sync by mainWorkspaceModel)
  private index       = 1;
  private sigma       = 0.5;
  private usePolyImag = false;

  // Own state
  private l1Enabled    = false;
  private l2Enabled    = false;
  private l1Prime      = 3;
  private l2Prime      = 5;
  private l1SpiralMode = 0;
  private l2SpiralMode = 0;
  private l1Reflect    = false;
  private l2Reflect    = false;
  private l1Bisector   = false;
  private l2Bisector   = false;
  private phantomMode  = 2;   // 0=joints (spiral), 1=phantom links, 2=both (default)
  private usePrimeImag = true;

  constructor(parentGroup: THREE.Group) {
    this.group = new THREE.Group();
    this.slotGroup1 = new THREE.Group();
    this.slotGroup2 = new THREE.Group();
    this.group.add(this.slotGroup1, this.slotGroup2);
    parentGroup.add(this.group);
    this.panel = createLFunctionPanel(this);
  }

  // ---------------------------------------------------------------------------
  // LFunctionPanelLayer interface
  // ---------------------------------------------------------------------------

  public getIndex(): number       { return this.index; }
  public getSigma(): number       { return this.sigma; }
  public getUsePolyImag(): boolean { return this.usePolyImag; }

  public getL1Enabled(): boolean { return this.l1Enabled; }
  public setL1Enabled(v: boolean): void { this.l1Enabled = v; this._rebuild(); }
  public getL2Enabled(): boolean { return this.l2Enabled; }
  public setL2Enabled(v: boolean): void { this.l2Enabled = v; this._rebuild(); }

  public getL1Prime(): number { return this.l1Prime; }
  public setL1Prime(v: number): void { this.l1Prime = v; this._rebuild(); }
  public getL2Prime(): number { return this.l2Prime; }
  public setL2Prime(v: number): void { this.l2Prime = v; this._rebuild(); }

  public getL1SpiralMode(): number { return this.l1SpiralMode; }
  public setL1SpiralMode(v: number): void { this.l1SpiralMode = v; this._rebuild(); }
  public getL2SpiralMode(): number { return this.l2SpiralMode; }
  public setL2SpiralMode(v: number): void { this.l2SpiralMode = v; this._rebuild(); }

  public getL1Reflect(): boolean { return this.l1Reflect; }
  public setL1Reflect(v: boolean): void { this.l1Reflect = v; this._rebuild(); }
  public getL2Reflect(): boolean { return this.l2Reflect; }
  public setL2Reflect(v: boolean): void { this.l2Reflect = v; this._rebuild(); }

  public getL1Bisector(): boolean { return this.l1Bisector; }
  public setL1Bisector(v: boolean): void { this.l1Bisector = v; this._rebuild(); }
  public getL2Bisector(): boolean { return this.l2Bisector; }
  public setL2Bisector(v: boolean): void { this.l2Bisector = v; this._rebuild(); }

  public getPhantomMode(): number { return this.phantomMode; }
  public setPhantomMode(v: number): void { this.phantomMode = v; this._rebuild(); }

  public getUsePrimeImag(): boolean { return this.usePrimeImag; }
  public setUsePrimeImag(v: boolean): void { this.usePrimeImag = v; this._rebuild(); }

  // ---------------------------------------------------------------------------
  // Called by mainWorkspaceModel
  // ---------------------------------------------------------------------------

  public initialize(): void { this._rebuild(); }

  public dispose(): void {
    clearGroup(this.slotGroup1);
    clearGroup(this.slotGroup2);
    this.group.parent?.remove(this.group);
  }

  public update(index: number, sigma: number, usePolyImag: boolean): void {
    this.index       = index;
    this.sigma       = sigma;
    this.usePolyImag = usePolyImag;
    this._rebuild();
  }

  public getStateSnapshot() {
    return {
      l1Enabled: this.l1Enabled, l2Enabled: this.l2Enabled,
      l1Prime: this.l1Prime,     l2Prime: this.l2Prime,
      l1SpiralMode: this.l1SpiralMode, l2SpiralMode: this.l2SpiralMode,
      l1Reflect: this.l1Reflect, l2Reflect: this.l2Reflect,
      l1Bisector: this.l1Bisector, l2Bisector: this.l2Bisector,
      phantomMode: this.phantomMode, usePrimeImag: this.usePrimeImag,
    };
  }

  public batchRestore(snap: ReturnType<typeof this.getStateSnapshot>): void {
    this.l1Enabled    = snap.l1Enabled;    this.l2Enabled    = snap.l2Enabled;
    this.l1Prime      = snap.l1Prime;      this.l2Prime      = snap.l2Prime;
    this.l1SpiralMode = snap.l1SpiralMode; this.l2SpiralMode = snap.l2SpiralMode;
    this.l1Reflect    = snap.l1Reflect;    this.l2Reflect    = snap.l2Reflect;
    this.l1Bisector   = snap.l1Bisector;   this.l2Bisector   = snap.l2Bisector;
    this.phantomMode  = snap.phantomMode;  this.usePrimeImag = snap.usePrimeImag;
    this._rebuild();
  }

  // ---------------------------------------------------------------------------
  // Toolbox
  // ---------------------------------------------------------------------------

  public getToolSections(_ctx: ToolboxContext): ToolboxSection[] {
    return [{
      id: "l-functions",
      contributorId: "layer:lFunction",
      title: "L Functions",
      order: 12,
      defaultCollapsed: true,
      CustomPanel: this.panel,
    }];
  }

  // ---------------------------------------------------------------------------
  // Rebuild
  // ---------------------------------------------------------------------------

  private _rebuild(): void {
    clearGroup(this.slotGroup1);
    clearGroup(this.slotGroup2);
    if (this.l1Enabled) {
      this._buildSlot(
        this.slotGroup1, this.l1Prime, this.l1SpiralMode, this.l1Reflect, this.l1Bisector,
        COLOR_L1, COLOR_L1_REFLECT, COLOR_BISECTOR_1,
      );
    }
    if (this.l2Enabled) {
      this._buildSlot(
        this.slotGroup2, this.l2Prime, this.l2SpiralMode, this.l2Reflect, this.l2Bisector,
        COLOR_L2, COLOR_L2, COLOR_BISECTOR_2,
      );
    }
  }

  private _buildSlot(
    g: THREE.Group,
    prime: number,
    spiralMode: number,
    reflect: boolean,
    bisector: boolean,
    color: number,
    reflectColor: number,
    bisectorColor: number,
  ): void {
    const t      = getPrimeImaginaryPart(prime, this.index, this.usePrimeImag, this.usePolyImag);
    const s      = complex(this.sigma, t);
    const nLinks = calcNLinks(this.index, prime);
    if (nLinks < 1) return;

    const target   = calculateZetaTarget(prime, s);
    const targetPt: Point2 = { x: target.re, y: target.im };

    const fwd = calculateVectors(nLinks, prime, s);
    // Inv/refl tails must sit on the analytic L cross (continuous in T), not the
    // partial-sum head — that jumps whenever calcNLinks gains a term.
    const inv = calculateInverseVectors(nLinks, prime, s, targetPt);

    const showFwd     = spiralMode === 0 || spiralMode === 2;
    const showInv     = spiralMode === 1 || spiralMode === 2;
    const showSpiral  = this.phantomMode === 0 || this.phantomMode === 2;
    const showPhantom = this.phantomMode === 1 || this.phantomMode === 2;

    if (showSpiral) {
      if (showFwd) buildLine(fwd.vectors, color, 1,   g);
      if (showInv) buildLine(inv.vectors, color, 0.6, g);
      buildCross(targetPt, 0.04, color, g);
    }

    if (showPhantom) {
      if (showFwd) buildSegments(fwd.phantomVectors, COLOR_PHANTOM, 0.4,  g);
      if (showInv) buildSegments(inv.phantomVectors, COLOR_PHANTOM, 0.25, g);
    }

    if (reflect) {
      const reflFwd = reflectLFunctionVectors(fwd, targetPt);
      const reflInv = reflectLFunctionVectors(inv, targetPt);
      if (showSpiral) {
        if (showFwd) buildLine(reflFwd.vectors, reflectColor, 0.45, g);
        if (showInv) buildLine(reflInv.vectors, reflectColor, 0.3,  g);
      }
      if (showPhantom) {
        if (showFwd) buildSegments(reflFwd.phantomVectors, COLOR_PHANTOM, 0.25, g);
        if (showInv) buildSegments(reflInv.phantomVectors, COLOR_PHANTOM, 0.15, g);
      }
    }

    if (bisector) buildBisector(targetPt, bisectorColor, g);
  }
}

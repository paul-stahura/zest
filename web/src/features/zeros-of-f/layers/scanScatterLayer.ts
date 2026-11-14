import * as THREE from "three";

import { quarterSpectrumRgb } from "@/features/zeros-of-f/fracToHue";
import { type DisplayControlsState } from "@/features/zeros-of-f/types";
import {
  displayChangeNeedsScatterRebuild,
  harvestPointXyz,
  writeHarvestPoint,
} from "@/shared/math/zerosOfF/displayView";
import { type FracTDisplayFilter } from "@/shared/math/zerosOfF/fracTDisplayFilter";
import { fracT32, fracTGpuBands } from "@/shared/math/zerosOfF/fracTGpuBands";
import type { ScanLine } from "@/shared/scan/scanBackend";
import type { FFamily } from "@/shared/math/zerosOfF";
import { ancestorChainVisible } from "@/shared/rendering/ancestorChainVisible";
import { FRAC_T_ATTRIBUTE, FracTPointsFilter } from "@/shared/rendering/fracTPointsFilter";
import { type HoverPointFn, type ZeroHoverSample } from "@/shared/math/zerosOfF/zeroHoverPick";
import { indexStrands, type StrandIndex } from "@/shared/math/zerosOfF/zeroTwins";

/**
 * One geometry chunk holding a fixed-length slab of scatter points. Points
 * are stored as (x, y, z=0) Float32 positions and a per-point Uint8 RGB
 * color attribute, derived from the live `DisplayControlsState` thresholds.
 * Every point stays in the buffer in source order; the frac(T) filter
 * hides dots in the vertex shader.
 *
 * Splitting the cloud into chunks lets us re-color a few thousand points at
 * a time when thresholds change, and lets future view-culling skip whole
 * chunks whose AABB is offscreen.
 */
interface Chunk {
  group: THREE.Points;
  geometry: THREE.BufferGeometry;
  positionAttr: THREE.BufferAttribute;
  colorAttr: THREE.BufferAttribute;
  /** frac(T) as float32, read by the shader filter and by hover. */
  fracAttr: THREE.BufferAttribute;
  /** Per-point raw values used to re-classify on threshold edits. */
  yVal: Float64Array;
  sigma1Mag: Float64Array;
  r1Mag: Float64Array;
  phaseDev: Float64Array;
  /** Signed `arg(R)/π` per point in `(-1, 1]`. NaN for points whose source
   * line had no phaseR (cloud scans, legacy archives). Local-only signal. */
  phaseR: Float64Array;
  /** `|f| / (|Σ₁| + |R₁|)` per point. NaN for points whose source line had
   * no depth (sign-change scans, legacy archives). */
  depth: Float64Array;
  /** Per-point recorded sigma — for hover/inspection in future. */
  sigma: Float64Array;
  /** Per-point T value. */
  t: Float64Array;
  /** Number of points actually populated (≤ capacity). */
  count: number;
  capacity: number;
}

/** Floor under `depth` to avoid log10(0). */
const DEPTH_EPS = 1e-15;
/** When the data's depth values are all numerically identical (or only one
 * point has a finite depth), the auto-fit log-range collapses to zero. We
 * fall back to this fixed half-decade so every point still gets goodness=0.5
 * instead of NaN. */
const DEPTH_RANGE_FLOOR = 0.5;

const CHUNK_CAPACITY = 64 * 1024;

/**
 * Lazily-built circular alpha texture. Used as the `map` on PointsMaterial to
 * turn the default square sprite into a round dot. One module-level texture is
 * shared across all layers — it's never modified after creation.
 */
let CIRCLE_SPRITE: THREE.CanvasTexture | null = null;

export function getCircleSprite(): THREE.CanvasTexture {
  if (CIRCLE_SPRITE !== null) return CIRCLE_SPRITE;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = import.meta.env.MODE === "test" ? null : canvas.getContext("2d");
  if (ctx !== null) {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  CIRCLE_SPRITE = tex;
  return tex;
}

/**
 * GPU-friendly scatter layer for the zeros-of-f workspace. Holds points as a
 * series of fixed-size chunks. Threshold-only edits trigger an O(N) color
 * recomputation; new scan lines append to the trailing chunk and grow as
 * needed.
 */
export class ScanScatterLayer {
  private readonly parent: THREE.Group;
  private readonly group: THREE.Group;
  private readonly material: THREE.PointsMaterial;
  private readonly chunks: Chunk[] = [];
  private display: DisplayControlsState;
  /** Running auto-fit range over `log10(depth)` across all chunks. Updated
   * incrementally in appendLine; full rescan is rarely needed. */
  private depthLogMin = Infinity;
  private depthLogMax = -Infinity;
  /** Running auto-fit range over `log10(r1Mag)`. Updated as points stream in;
   *  used by the `r1-mag` color mode the same way as depth's range. */
  private r1MagLogMin = Infinity;
  private r1MagLogMax = -Infinity;
  /** When set, the **grayscale** color mode tints points with this RGB triple
   *  (each component 0..1) instead of neutral white. All other color modes
   *  ignore this and behave normally. Used to make leg-ratio scans render
   *  yellow under "Grayscale" while still responding to every other mode. */
  private forceColor: [number, number, number] | null;
  /** R-form used when the scan that produced these points was computed.
   *  `"ak"` = R₁ak / R₂ak; `"ps"` = R₁ps / R₂ps; `null` = unknown (legacy
   *  imports). Drives the `f-rform` color mode (ak → green, ps → red). */
  private rForm: "ak" | "ps" | null = null;
  /** Family of the variant that produced these points. Drives the new
   *  `by-family` color mode (sum1R1→white, legRatio→yellow, legAngle→red,
   *  sum2R2→light blue, legAngleOut→cyan). `null` for legacy imports → gray. */
  private family: FFamily | null = null;
  /** Twin index and strand steps. Dropped whenever points are added or cleared. */
  private strand: StrandIndex | null = null;
  /**
   * Only the live harvest cloud opts in. Overlay scatters share the display
   * flag but stay on the ordinary band filter.
   */
  private twinDragTarget = false;
  private readonly fracFilter: FracTPointsFilter;
  /** Bumped on every append or clear; keys the kept-dot cache. */
  private pointsVersion = 0;
  private keptCache = { filterVersion: -1, pointsVersion: -1, kept: 0 };

  public constructor(
    parent: THREE.Group,
    display: DisplayControlsState,
    opts?: { forceColor?: [number, number, number] | null; pointSize?: number },
  ) {
    this.parent = parent;
    this.group = new THREE.Group();
    this.parent.add(this.group);
    this.material = new THREE.PointsMaterial({
      vertexColors: true,
      size: opts?.pointSize ?? 2,
      sizeAttenuation: false,
      map: getCircleSprite(),
      // alphaTest discards the square corners so dots don't occlude each other
      // through transparent fragments — keeps depth behaviour clean.
      alphaTest: 0.5,
      transparent: true,
    });
    this.display = display;
    this.forceColor = opts?.forceColor ?? null;
    this.fracFilter = new FracTPointsFilter(this.material);
    this.syncFracFilter();
  }

  public dispose(): void {
    for (const c of this.chunks) {
      this.group.remove(c.group);
      c.geometry.dispose();
    }
    this.chunks.length = 0;
    this.parent.remove(this.group);
    this.material.dispose();
  }

  /**
   * Iterate raw recorded `(σ, T, |f|)` triples for analyses (T-average,
   * T-row highlight, exporters). Avoids exposing internal chunks.
   */
  public forEachPoint(cb: (sigma: number, t: number, yVal: number) => void): void {
    for (const chunk of this.chunks) {
      for (let i = 0; i < chunk.count; i++) {
        cb(chunk.sigma[i]!, chunk.t[i]!, chunk.yVal[i]!);
      }
    }
  }

  /**
   * Iterate every recorded point with its full diagnostic tuple. Used by the
   * cull-and-recover pipeline which needs the magnitudes/phase to rebuild
   * complete archive lines.
   */
  public forEachPointFull(
    cb: (sigma: number, t: number, yVal: number, sigma1Mag: number, r1Mag: number, phaseDev: number) => void,
  ): void {
    for (const chunk of this.chunks) {
      for (let i = 0; i < chunk.count; i++) {
        cb(
          chunk.sigma[i]!,
          chunk.t[i]!,
          chunk.yVal[i]!,
          chunk.sigma1Mag[i]!,
          chunk.r1Mag[i]!,
          chunk.phaseDev[i]!,
        );
      }
    }
  }

  /**
   * Frac(T) edits only retune shader uniforms; positions and colors are
   * rewritten only when the layout or the coloring rule changes.
   */
  public setDisplay(display: DisplayControlsState): void {
    const { layout, appearance, filter } = displayChangeNeedsScatterRebuild(this.display, display);
    this.display = display;
    if (filter) this.syncFracFilter();
    if (!layout && !appearance) return;
    for (const chunk of this.chunks) {
      if (layout) this.recomputePositions(chunk);
      if (appearance) this.recomputeColors(chunk);
    }
  }

  /**
   * Mark this cloud as the one a "drag .75–1" toggle translates.
   * Other scatters keep the radio's band even when the flag is on.
   */
  public setTwinDragTarget(on: boolean): void {
    this.twinDragTarget = on;
    this.syncFracFilter();
  }

  /**
   * Move the .75–1 cloud. Only the nudge band moves, and that band is
   * empty unless this layer is the drag target with the toggle on, so a
   * stale drag cannot shift a hidden band.
   */
  public setTwinOffset(x: number, y: number): void {
    this.fracFilter.setNudgeOffset(x, y);
  }

  private syncFracFilter(): void {
    this.fracFilter.setBands(fracTGpuBands(
      this.fracDisplayFilter(),
      this.twinDragTarget && this.display.fracTTwinNudge,
    ));
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  /** True when this cloud is painted. Hidden parents and zero opacity are off. */
  public acceptsHover(): boolean {
    return this.material.opacity > 0
      && ancestorChainVisible(this.group)
      && this.chunks.some((chunk) => chunk.count > 0);
  }

  /**
   * Drawn zeros only. `keepLocal` drops points that cannot fall inside
   * the pixel radius so a large cloud is not projected one by one.
   * The shader's frac(T) keep test and twin nudge are replayed on the same
   * float32 values, so the coordinate matches the dot.
   */
  public visitHoverPoints(
    onPoint: HoverPointFn,
    keepLocal: ((x: number, y: number) => boolean) | null,
  ): void {
    const filter = this.fracFilter;
    const inactive = filter.isInactive();
    const dx = filter.getNudgeOffsetX();
    const dy = filter.getNudgeOffsetY();
    let base = 0;
    for (const chunk of this.chunks) {
      const positions = chunk.positionAttr.array;
      const colors = chunk.colorAttr.array;
      const fracs = chunk.fracAttr.array;
      for (let i = 0; i < chunk.count; i++) {
        const o = i * 3;
        let x = positions[o]!;
        let y = positions[o + 1]!;
        if (!inactive) {
          const frac = fracs[i]!;
          if (!filter.keeps(frac)) continue;
          if (filter.nudges(frac)) {
            x += dx;
            y += dy;
          }
        }
        if (keepLocal !== null && !keepLocal(x, y)) continue;
        onPoint(
          chunk.sigma[i]!,
          chunk.t[i]!,
          x,
          y,
          positions[o + 2]!,
          colors[o]! / 255,
          colors[o + 1]! / 255,
          colors[o + 2]! / 255,
          base + i,
        );
      }
      base += chunk.count;
    }
  }

  /**
   * The twin zero, in the same display coordinates as the scatter.
   * The first hover builds the pairing; later hovers reuse it until
   * the point list changes.
   */
  public twinOf(index: number): ZeroHoverSample | null {
    const strand = this.ensureStrand();
    if (index < 0 || index >= strand.twin.length) return null;
    const twin = strand.twin[index]!;
    if (twin < 0) return null;
    return this.sampleAt(twin);
  }

  /**
   * Previous and next zero on this point's strand.
   * A strand step is the mutual neighbor about ΔT = 1 that stays close
   * in σ and in {T}. Missing ends are omitted.
   */
  public strandNeighbors(index: number): ZeroHoverSample[] {
    const strand = this.ensureStrand();
    if (index < 0 || index >= strand.before.length) return [];
    const out: ZeroHoverSample[] = [];
    const before = strand.before[index]!;
    const after = strand.after[index]!;
    if (before >= 0) {
      const sample = this.sampleAt(before);
      if (sample !== null) out.push(sample);
    }
    if (after >= 0) {
      const sample = this.sampleAt(after);
      if (sample !== null) out.push(sample);
    }
    return out;
  }

  private sampleAt(index: number): ZeroHoverSample | null {
    let base = 0;
    for (const chunk of this.chunks) {
      if (index < base + chunk.count) {
        const local = index - base;
        const sigma = chunk.sigma[local]!;
        const t = chunk.t[local]!;
        const placed = harvestPointXyz(
          sigma,
          t,
          this.display.displayView,
          this.display.yAxisMode,
        );
        const rgb = this.sourceRgb(chunk, local);
        return {
          sigma,
          t,
          x: placed.x,
          y: placed.y,
          z: placed.z,
          r: rgb[0],
          g: rgb[1],
          b: rgb[2],
          pointId: index,
        };
      }
      base += chunk.count;
    }
    return null;
  }

  private ensureStrand(): StrandIndex {
    if (this.strand !== null) return this.strand;
    let count = 0;
    for (const chunk of this.chunks) count += chunk.count;
    const sigma = new Float64Array(count);
    const t = new Float64Array(count);
    let write = 0;
    for (const chunk of this.chunks) {
      sigma.set(chunk.sigma.subarray(0, chunk.count), write);
      t.set(chunk.t.subarray(0, chunk.count), write);
      write += chunk.count;
    }
    this.strand = indexStrands(sigma, t);
    return this.strand;
  }

  private sourceRgb(chunk: Chunk, index: number): [number, number, number] {
    const o = index * 3;
    const stored = chunk.colorAttr.array;
    return [stored[o]! / 255, stored[o + 1]! / 255, stored[o + 2]! / 255];
  }

  private fracDisplayFilter(): FracTDisplayFilter {
    return {
      kind: this.display.fracTFilterKind,
      rangeMin: this.display.fracTRangeMin,
      rangeMax: this.display.fracTRangeMax,
      rangeMode: this.display.fracTRangeMode,
      justOne: this.display.fracTJustOne,
      justOneDigits: this.display.fracTJustOneDigits,
      quarterEnabled: this.display.fracTQuarterEnabled,
      quarterPreset: this.display.fracTQuarterPreset,
    };
  }

  /** Override every point's color with a fixed RGB triple (each component
   * 0..1). Pass `null` to release and fall back to the configured color mode.
   * Triggers a full recolor of all chunks so the change is visible immediately.
   */
  public setForceColor(rgb: [number, number, number] | null): void {
    this.forceColor = rgb;
    for (const chunk of this.chunks) this.recomputeColors(chunk);
  }

  /** Tag this layer with the R-form its points were computed under. The
   *  `f-rform` color mode reads it: `"ak"` → green, `"ps"` → red,
   *  `null` → mid-gray. */
  public setFamily(family: FFamily | null): void {
    this.family = family;
    if (this.display.colorMode === "by-family") {
      // Tell every chunk to recolor — the family changes the per-point RGB.
      for (const ch of this.chunks) this.recomputeColors(ch);
    }
  }

  public setRForm(form: "ak" | "ps" | null): void {
    this.rForm = form;
    for (const chunk of this.chunks) this.recomputeColors(chunk);
  }

  /** Update the point sprite size in CSS pixels. */
  public setPointSize(size: number): void {
    this.material.size = Math.max(0.1, size);
    this.material.needsUpdate = true;
  }

  /**
   * Set a base opacity multiplier on the material. Used to dim a previous-scan
   * layer that's been demoted to "background" while a new scan runs.
   */
  public setBaseOpacity(opacity: number): void {
    const o = Math.max(0, Math.min(1, opacity));
    this.material.opacity = o;
    this.material.transparent = true;
    // alphaTest must be relaxed enough that a translucent fill still draws —
    // otherwise dimming below the alphaTest cutoff would hide every point.
    this.material.alphaTest = Math.min(0.5, o * 0.4);
    this.material.needsUpdate = true;
  }

  /**
   * Points the canvas actually paints after the frac(T) filter. Cached
   * per filter version and point total, so repeated reads are free.
   */
  public getDrawnCount(): number {
    if (this.fracFilter.isInactive()) {
      let total = 0;
      for (const chunk of this.chunks) total += chunk.count;
      return total;
    }
    const filterVersion = this.fracFilter.getVersion();
    const cache = this.keptCache;
    if (cache.filterVersion === filterVersion && cache.pointsVersion === this.pointsVersion) {
      return cache.kept;
    }
    let kept = 0;
    for (const chunk of this.chunks) {
      const fracs = chunk.fracAttr.array;
      for (let i = 0; i < chunk.count; i++) {
        if (this.fracFilter.keeps(fracs[i]!)) kept += 1;
      }
    }
    this.keptCache = { filterVersion, pointsVersion: this.pointsVersion, kept };
    return kept;
  }

  /** Returns scene group transform info — used by the workspace to fit camera. */
  public getDataExtent(): { sigmaMin: number; sigmaMax: number; tMin: number; tMax: number; count: number } {
    let sigmaMin = Infinity;
    let sigmaMax = -Infinity;
    let tMin = Infinity;
    let tMax = -Infinity;
    let total = 0;
    for (const chunk of this.chunks) {
      total += chunk.count;
      for (let i = 0; i < chunk.count; i++) {
        const s = chunk.sigma[i]!;
        const t = chunk.t[i]!;
        if (s < sigmaMin) sigmaMin = s;
        if (s > sigmaMax) sigmaMax = s;
        if (t < tMin) tMin = t;
        if (t > tMax) tMax = t;
      }
    }
    if (!Number.isFinite(sigmaMin)) {
      sigmaMin = -1;
      sigmaMax = 1;
      tMin = -1;
      tMax = 1;
    }
    return { sigmaMin, sigmaMax, tMin, tMax, count: total };
  }

  /** Append one σ-row to the layer. Allocates a new chunk if the trailing chunk is full. */
  public appendLine(line: ScanLine): void {
    this.appendLines([line]);
  }

  /**
   * Append multiple σ-rows and update touched GPU chunks once. Cloud scans can
   * deliver rows in bursts; batching avoids recoloring the same active chunk
   * for every row while preserving the same point data and display mapping.
   */
  public appendLines(lines: readonly ScanLine[]): void {
    this.strand = null;
    this.pointsVersion += 1;
    const touchedChunks: Chunk[] = [];
    let rangeExpanded = false;
    for (const line of lines) {
      const n = line.t.length;
      let written = 0;
      while (written < n) {
        const tail = this.tailChunk();
        if (!touchedChunks.includes(tail)) touchedChunks.push(tail);
        const free = tail.capacity - tail.count;
        const take = Math.min(free, n - written);
        const startWrite = tail.count;
        const lineDepth = line.depth ?? null;
        for (let i = 0; i < take; i++) {
          const src = written + i;
          const sigma = line.sigma;
          const tVal = line.t[src]!;
          tail.sigma[startWrite + i] = sigma;
          tail.t[startWrite + i] = tVal;
          tail.yVal[startWrite + i] = line.yVal[src]!;
          tail.sigma1Mag[startWrite + i] = line.sigma1Mag[src]!;
          const r1m = line.r1Mag[src]!;
          tail.r1Mag[startWrite + i] = r1m;
          if (Number.isFinite(r1m) && r1m > 0) {
            const lr = Math.log10(r1m);
            if (lr < this.r1MagLogMin) { this.r1MagLogMin = lr; rangeExpanded = true; }
            if (lr > this.r1MagLogMax) { this.r1MagLogMax = lr; rangeExpanded = true; }
          }
          tail.phaseDev[startWrite + i] = line.phaseDev[src]!;
          tail.phaseR[startWrite + i] = line.phaseR !== undefined ? line.phaseR[src]! : NaN;
          const dRaw = lineDepth !== null ? lineDepth[src]! : NaN;
          tail.depth[startWrite + i] = dRaw;
          if (Number.isFinite(dRaw) && dRaw > 0) {
            const ld = Math.log10(dRaw);
            if (ld < this.depthLogMin) { this.depthLogMin = ld; rangeExpanded = true; }
            if (ld > this.depthLogMax) { this.depthLogMax = ld; rangeExpanded = true; }
          }
          const positions = tail.positionAttr.array;
          const idx3 = (startWrite + i) * 3;
          writeHarvestPoint(
            positions,
            idx3,
            sigma,
            tVal,
            this.display.displayView,
            this.display.yAxisMode,
          );
          tail.fracAttr.array[startWrite + i] = fracT32(tVal);
        }
        tail.count += take;
        tail.geometry.setDrawRange(0, tail.count);
        tail.positionAttr.needsUpdate = true;
        tail.fracAttr.needsUpdate = true;
        written += take;
      }
    }
    // If the new points expanded the auto-fit log range, prior chunks were
    // colored against a stale range and need recompute. Otherwise only chunks
    // touched by this batch need coloring.
    if (rangeExpanded && (this.display.colorMode === "depth" || this.display.colorMode === "spectrum-depth" || this.display.colorMode === "r1-mag")) {
      for (const chunk of this.chunks) this.recomputeColors(chunk);
      return;
    }
    for (const chunk of touchedChunks) this.recomputeColors(chunk);
  }

  /**
   * Append independent (σ, T, |f|) points in one GPU update. Used for
   * harvested scans where each zero has its own σ.
   */
  public appendPoints(
    sigma: ArrayLike<number>,
    t: ArrayLike<number>,
    yVal: ArrayLike<number>,
  ): void {
    this.strand = null;
    const n = sigma.length;
    if (n === 0) return;
    this.pointsVersion += 1;
    if (t.length !== n || yVal.length !== n) {
      throw new Error("appendPoints: sigma/t/yVal length mismatch");
    }
    const touchedChunks: Chunk[] = [];
    let written = 0;
    while (written < n) {
      const tail = this.tailChunk();
      if (!touchedChunks.includes(tail)) touchedChunks.push(tail);
      const take = Math.min(tail.capacity - tail.count, n - written);
      const startWrite = tail.count;
      const positions = tail.positionAttr.array;
      const fracs = tail.fracAttr.array;
      for (let i = 0; i < take; i++) {
        const src = written + i;
        const dest = startWrite + i;
        const s = sigma[src]!;
        const tVal = t[src]!;
        tail.sigma[dest] = s;
        tail.t[dest] = tVal;
        tail.yVal[dest] = yVal[src]!;
        tail.sigma1Mag[dest] = 0;
        tail.r1Mag[dest] = 0;
        tail.phaseDev[dest] = 0;
        tail.phaseR[dest] = Number.NaN;
        tail.depth[dest] = Number.NaN;
        writeHarvestPoint(
          positions,
          dest * 3,
          s,
          tVal,
          this.display.displayView,
          this.display.yAxisMode,
        );
        fracs[dest] = fracT32(tVal);
      }
      tail.count += take;
      tail.geometry.setDrawRange(0, tail.count);
      tail.positionAttr.needsUpdate = true;
      tail.fracAttr.needsUpdate = true;
      written += take;
    }
    for (const chunk of touchedChunks) this.recomputeColors(chunk);
  }

  /** Drop all chunks. Called when starting a fresh scan. */
  public clear(): void {
    this.strand = null;
    this.pointsVersion += 1;
    for (const c of this.chunks) {
      this.group.remove(c.group);
      c.geometry.dispose();
    }
    this.chunks.length = 0;
    this.depthLogMin = Infinity;
    this.depthLogMax = -Infinity;
    this.r1MagLogMin = Infinity;
    this.r1MagLogMax = -Infinity;
  }

  private tailChunk(): Chunk {
    const last = this.chunks[this.chunks.length - 1];
    if (last !== undefined && last.count < last.capacity) return last;
    const next = this.allocateChunk(CHUNK_CAPACITY);
    this.chunks.push(next);
    this.group.add(next.group);
    return next;
  }

  private allocateChunk(capacity: number): Chunk {
    const positions = new Float32Array(capacity * 3);
    const colors = new Uint8Array(capacity * 3);
    const positionAttr = new THREE.BufferAttribute(positions, 3);
    positionAttr.setUsage(THREE.DynamicDrawUsage);
    const colorAttr = new THREE.BufferAttribute(colors, 3, true);
    colorAttr.setUsage(THREE.DynamicDrawUsage);
    const fracAttr = new THREE.BufferAttribute(new Float32Array(capacity), 1);
    fracAttr.setUsage(THREE.DynamicDrawUsage);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", positionAttr);
    geometry.setAttribute("color", colorAttr);
    geometry.setAttribute(FRAC_T_ATTRIBUTE, fracAttr);
    geometry.setDrawRange(0, 0);
    const points = new THREE.Points(geometry, this.material);
    points.frustumCulled = false;
    const depthArr = new Float64Array(capacity);
    depthArr.fill(NaN);
    const phaseRArr = new Float64Array(capacity);
    phaseRArr.fill(NaN);
    return {
      group: points,
      geometry,
      positionAttr,
      colorAttr,
      fracAttr,
      sigma: new Float64Array(capacity),
      t: new Float64Array(capacity),
      yVal: new Float64Array(capacity),
      sigma1Mag: new Float64Array(capacity),
      r1Mag: new Float64Array(capacity),
      phaseDev: new Float64Array(capacity),
      phaseR: phaseRArr,
      depth: depthArr,
      count: 0,
      capacity,
    };
  }

  private recomputePositions(chunk: Chunk): void {
    const positions = chunk.positionAttr.array;
    for (let i = 0; i < chunk.count; i++) {
      writeHarvestPoint(
        positions,
        i * 3,
        chunk.sigma[i]!,
        chunk.t[i]!,
        this.display.displayView,
        this.display.yAxisMode,
      );
    }
    chunk.positionAttr.needsUpdate = true;
  }

  private recomputeColors(chunk: Chunk): void {
    if (this.display.colorMode === "depth") {
      this.recomputeColorsDepth(chunk);
    } else if (this.display.colorMode === "spectrum-depth") {
      this.recomputeColorsSpectrumDepth(chunk);
    } else if (this.display.colorMode === "phase-r") {
      this.recomputeColorsPhaseR(chunk);
    } else if (this.display.colorMode === "r1-mag") {
      this.recomputeColorsR1Mag(chunk);
    } else if (this.display.colorMode === "f-rform") {
      this.recomputeColorsFRForm(chunk);
    } else if (this.display.colorMode === "by-family") {
      this.recomputeColorsByFamily(chunk);
    } else if (this.display.colorMode === "grayscale") {
      this.recomputeColorsGrayscale(chunk);
    } else {
      this.recomputeColorsFracT(chunk);
    }
  }

  /**
   * Color + size by `depth = |f| / (|Σ₁| + |R₁|)`. Depth ∈ [0, 1]; lower
   * = closer to a true zero.
   *
   * Mapping is **auto-fit**: we use the actual log10(depth) range across all
   * recorded points (`depthLogMin`..`depthLogMax`) so the deepest point in
   * view always saturates to white and the shallowest renders black,
   * regardless of where the cluster actually lives. This guarantees full
   * visible contrast on every dataset without per-dataset tuning.
   *
   *   t = (logMax − log10(depth)) / (logMax − logMin)        ∈ [0, 1]
   *   goodness = t ^ gamma                                    (gamma slider)
   *
   * `gamma < 1` stretches the bright end (more contrast among deep points,
   * shallow points crushed dark); `gamma > 1` stretches the dark end (more
   * contrast among shallow points, deep points crushed bright). `gamma = 1`
   * is linear.
   *
   * Brightness = goodness; size multiplier = 1 + goodness × DEPTH_SIZE_GAIN.
   * Magnitude threshold still dims `yVal ≥ magThresh` to 10%.
   *
   * Points without depth (NaN) render mid-gray at base size.
   */
  private recomputeColorsDepth(chunk: Chunk): void {
    const colors = chunk.colorAttr.array;
    const thr = this.display.magThresh;
    const gamma = Math.max(0.05, this.display.depthLogScale);
    let logMin = this.depthLogMin;
    let logMax = this.depthLogMax;
    let range = logMax - logMin;
    if (!Number.isFinite(range) || range < DEPTH_RANGE_FLOOR) {
      // Single point or pathological data — center the range so goodness=0.5.
      const mid = Number.isFinite(logMax) ? logMax : -3;
      logMin = mid - DEPTH_RANGE_FLOOR / 2;
      logMax = mid + DEPTH_RANGE_FLOOR / 2;
      range = DEPTH_RANGE_FLOOR;
    }
    for (let i = 0; i < chunk.count; i++) {
      const idx3 = i * 3;
      const d = chunk.depth[i]!;
      if (!Number.isFinite(d)) {
        // No depth data — fall back to grayscale-equivalent so the points
        // remain visible (matters especially for background scans which are
        // already dimmed via setBaseOpacity).
        const yVal = chunk.yVal[i]!;
        const m = yVal < thr ? 255 : 26;
        colors[idx3 + 0] = m;
        colors[idx3 + 1] = m;
        colors[idx3 + 2] = m;
        continue;
      }
      const dSafe = d > DEPTH_EPS ? d : DEPTH_EPS;
      const tRaw = (logMax - Math.log10(dSafe)) / range;
      const tClamped = tRaw < 0 ? 0 : tRaw > 1 ? 1 : tRaw;
      const goodness = Math.pow(tClamped, gamma);
      const dim = chunk.yVal[i]! < thr ? 1 : 0.1;
      const v = Math.round(goodness * dim * 255);
      colors[idx3 + 0] = v;
      colors[idx3 + 1] = v;
      colors[idx3 + 2] = v;
    }
    chunk.colorAttr.needsUpdate = true;
  }

  /**
   * Combined spectrum + depth: hue from `frac(T)` (same mapping as the
   * spectrum mode and the inline spectrum bar), brightness/value from depth
   * (same auto-fit log mapping as the depth mode). This way you can read
   * `frac(T)` from hue *and* zero-quality from brightness in one pass.
   *
   * Points without depth fall back to full-brightness spectrum so legacy
   * scans / sign-change scans still render normally instead of vanishing.
   */
  private recomputeColorsSpectrumDepth(chunk: Chunk): void {
    const colors = chunk.colorAttr.array;
    const thr = this.display.magThresh;
    const gamma = Math.max(0.05, this.display.depthLogScale);
    let logMin = this.depthLogMin;
    let logMax = this.depthLogMax;
    let range = logMax - logMin;
    if (!Number.isFinite(range) || range < DEPTH_RANGE_FLOOR) {
      const mid = Number.isFinite(logMax) ? logMax : -3;
      logMin = mid - DEPTH_RANGE_FLOOR / 2;
      logMax = mid + DEPTH_RANGE_FLOOR / 2;
      range = DEPTH_RANGE_FLOOR;
    }
    const feather = this.display.spectrumFeather;
    for (let i = 0; i < chunk.count; i++) {
      const idx3 = i * 3;
      const tVal = chunk.t[i]!;
      const yVal = chunk.yVal[i]!;
      const frac = tVal - Math.floor(tVal);
      const [r, g, b] = quarterSpectrumRgb(frac, feather);
      // Goodness from depth (or 1.0 fallback for points with no depth data).
      const d = chunk.depth[i]!;
      let goodness: number;
      if (!Number.isFinite(d)) {
        goodness = 1;
      } else {
        const dSafe = d > DEPTH_EPS ? d : DEPTH_EPS;
        const tRaw = (logMax - Math.log10(dSafe)) / range;
        const tClamped = tRaw < 0 ? 0 : tRaw > 1 ? 1 : tRaw;
        goodness = Math.pow(tClamped, gamma);
      }
      const dim = yVal < thr ? 1 : 0.1;
      const v = goodness * dim;
      colors[idx3 + 0] = Math.round(r * v * 255);
      colors[idx3 + 1] = Math.round(g * v * 255);
      colors[idx3 + 2] = Math.round(b * v * 255);
    }
    chunk.colorAttr.needsUpdate = true;
  }

  /**
   * Color each point by its signed `arg(R)/π ∈ (-1, 1]` value via `fracToHue`
   * over the full circle: `(phaseR + 1) / 2 ∈ [0, 1] → hue`. Points without
   * phaseR (cloud / legacy archives) render mid-gray. Magnitude threshold
   * dims `yVal ≥ magThresh` to 10% as in the other modes.
   */
  private recomputeColorsPhaseR(chunk: Chunk): void {
    const colors = chunk.colorAttr.array;
    const thr = this.display.magThresh;
    const feather = this.display.spectrumFeather;
    for (let i = 0; i < chunk.count; i++) {
      const idx3 = i * 3;
      const ph = chunk.phaseR[i]!;
      const yVal = chunk.yVal[i]!;
      if (!Number.isFinite(ph)) {
        const m = 64;
        colors[idx3 + 0] = m;
        colors[idx3 + 1] = m;
        colors[idx3 + 2] = m;
        continue;
      }
      const u = (ph + 1) * 0.5;
      const [r, g, b] = quarterSpectrumRgb(u, feather);
      const m = yVal < thr ? 1 : 0.1;
      colors[idx3 + 0] = Math.round(r * m * 255);
      colors[idx3 + 1] = Math.round(g * m * 255);
      colors[idx3 + 2] = Math.round(b * m * 255);
    }
    chunk.colorAttr.needsUpdate = true;
  }

  /**
   * Color by `log10(r1Mag)` with auto-fit min/max across all points (same
   * pattern as depth mode but inverted — we DON'T invert here: larger |R₁|
   * → brighter). |R₁| has no fixed range; it varies with σ and t, so the
   * scan-wide log span is the only useful normalization.
   *
   *   t = (log10(r1Mag) − logMin) / (logMax − logMin)
   *   v = t ^ gamma                                        (`depthLogScale` slider)
   *
   * Magnitude threshold still dims `yVal ≥ magThresh` to 10%. Points with
   * non-finite r1Mag render mid-gray.
   */
  private recomputeColorsR1Mag(chunk: Chunk): void {
    const colors = chunk.colorAttr.array;
    const thr = this.display.magThresh;
    const gamma = Math.max(0.05, this.display.depthLogScale);
    let logMin = this.r1MagLogMin;
    let logMax = this.r1MagLogMax;
    let range = logMax - logMin;
    if (!Number.isFinite(range) || range < DEPTH_RANGE_FLOOR) {
      const mid = Number.isFinite(logMax) ? logMax : 0;
      logMin = mid - DEPTH_RANGE_FLOOR / 2;
      logMax = mid + DEPTH_RANGE_FLOOR / 2;
      range = DEPTH_RANGE_FLOOR;
    }
    for (let i = 0; i < chunk.count; i++) {
      const idx3 = i * 3;
      const r = chunk.r1Mag[i]!;
      if (!Number.isFinite(r) || r <= 0) {
        const m = 64;
        colors[idx3 + 0] = m;
        colors[idx3 + 1] = m;
        colors[idx3 + 2] = m;
        continue;
      }
      const tRaw = (Math.log10(r) - logMin) / range;
      const tClamped = tRaw < 0 ? 0 : tRaw > 1 ? 1 : tRaw;
      const v = Math.pow(tClamped, gamma);
      const dim = chunk.yVal[i]! < thr ? 1 : 0.1;
      const c = Math.round(v * dim * 255);
      colors[idx3 + 0] = c;
      colors[idx3 + 1] = c;
      colors[idx3 + 2] = c;
    }
    chunk.colorAttr.needsUpdate = true;
  }

  /** Color all points by the layer's source-scan family condition:
   *  Σ₁+R₁=0 → white, |Σ₁+R₁|=|Σ₂+R₂| → yellow, ∠(…)=π → red,
   *  Σ₂+R₂=0 → light blue, ∠(…)=0 → cyan, unknown → mid-gray.
   *  Magnitude-threshold dim applies as in other modes. */
  private recomputeColorsByFamily(chunk: Chunk): void {
    const colors = chunk.colorAttr.array;
    const thr = this.display.magThresh;
    let r = 128, g = 128, b = 128;
    switch (this.family) {
      case "sum1R1":      r = 255; g = 255; b = 255; break; // white
      case "sum1R1nak":   r = 80;  g = 230; b = 120; break; // green (negative-t)
      case "legRatio":    r = 255; g = 230; b = 0;   break; // yellow
      case "legAngle":    r = 230; g = 30;  b = 30;  break; // red
      case "sum2R2":      r = 90;  g = 160; b = 255; break; // light blue
      case "legAngleOut": r = 0;   g = 220; b = 220; break; // cyan
      case "sum1R1Angle": r = 255; g = 140; b = 0;   break; // orange
      default: /* gray fallback for legacy imports without family info */ break;
    }
    for (let i = 0; i < chunk.count; i++) {
      const yVal = chunk.yVal[i]!;
      const m = yVal < thr ? 1 : 0.1;
      const idx3 = i * 3;
      colors[idx3 + 0] = Math.round(r * m);
      colors[idx3 + 1] = Math.round(g * m);
      colors[idx3 + 2] = Math.round(b * m);
    }
    chunk.colorAttr.needsUpdate = true;
  }

  /** Color all points by the layer's source-scan R-form: `ak` → green,
   *  `ps` → red, unknown (legacy imports) → mid-gray. Magnitude-threshold dim
   *  applies as in the other modes. */
  private recomputeColorsFRForm(chunk: Chunk): void {
    const colors = chunk.colorAttr.array;
    const thr = this.display.magThresh;
    let r = 128, g = 128, b = 128;
    if (this.rForm === "ak") { r = 0; g = 220; b = 80; }
    else if (this.rForm === "ps") { r = 230; g = 60; b = 60; }
    for (let i = 0; i < chunk.count; i++) {
      const yVal = chunk.yVal[i]!;
      const m = yVal < thr ? 1 : 0.1;
      const idx3 = i * 3;
      colors[idx3 + 0] = Math.round(r * m);
      colors[idx3 + 1] = Math.round(g * m);
      colors[idx3 + 2] = Math.round(b * m);
    }
    chunk.colorAttr.needsUpdate = true;
  }

  /** Single-color fill — every point neutral white (or `forceColor` if set,
   * e.g. yellow for leg-ratio scans), dimmed by the magnitude threshold
   * (yVal < magThresh → full bright, else 10%). */
  private recomputeColorsGrayscale(chunk: Chunk): void {
    const colors = chunk.colorAttr.array;
    const thr = this.display.magThresh;
    const tint = this.forceColor;
    const baseR = tint !== null ? tint[0] : 1;
    const baseG = tint !== null ? tint[1] : 1;
    const baseB = tint !== null ? tint[2] : 1;
    for (let i = 0; i < chunk.count; i++) {
      const yVal = chunk.yVal[i]!;
      const dim = yVal < thr ? 1 : 0.1;
      const idx3 = i * 3;
      colors[idx3 + 0] = Math.round(baseR * dim * 255);
      colors[idx3 + 1] = Math.round(baseG * dim * 255);
      colors[idx3 + 2] = Math.round(baseB * dim * 255);
    }
    chunk.colorAttr.needsUpdate = true;
  }

  /**
   * Color each point by its fractional-T value via the no-wrap `fracToHue`
   * mapping (smoothstep × 0.84) — matches the Python `_frac_to_hue` reference
   * so the spectrum bar in the toolbox stays in sync with on-screen scatter.
   * Magnitude threshold dims any point with `yVal ≥ magThresh` to 10%.
   */
  private recomputeColorsFracT(chunk: Chunk): void {
    const colors = chunk.colorAttr.array;
    const thr = this.display.magThresh;
    const feather = this.display.spectrumFeather;
    for (let i = 0; i < chunk.count; i++) {
      const t = chunk.t[i]!;
      const yVal = chunk.yVal[i]!;
      const idx3 = i * 3;
      const frac = t - Math.floor(t);
      const [r, g, b] = quarterSpectrumRgb(frac, feather);
      const m = yVal < thr ? 1 : 0.1;
      colors[idx3 + 0] = Math.round(r * m * 255);
      colors[idx3 + 1] = Math.round(g * m * 255);
      colors[idx3 + 2] = Math.round(b * m * 255);
    }
    chunk.colorAttr.needsUpdate = true;
  }
}

import {
  nearestPerpendicularHits,
  visibleLatticeBounds,
  type PerpendicularHit,
} from "@/features/quasicrystal/perpendicularHits";
import { rayAnglePresets } from "@/features/quasicrystal/rayAnglePresets";
import { FIRST_ZETA_ZEROS_T } from "@/features/quasicrystal/zetaZerosT";
import type { SceneController } from "@/shared/visualization/contracts";

/** Starting along-ray miss, as a fraction of one lattice step. */
const DEFAULT_TOLERANCE_GRID = 0.01;
const HIT_RADIUS = 8;
const DOT_RADIUS = 2;
const GRID_SCALE_MIN = 8;
const GRID_SCALE_MAX = 800;
const UNMATCHED_DOT_RADIUS = DOT_RADIUS * 2;

/**
 * Ray of zeta-zero dots, rotated by dragging a dot, over a lattice whose
 * spacing is the only thing the wheel changes.
 */
export class QuasicrystalSceneController implements SceneController {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private cssW = 0;
  private cssH = 0;
  private dpr = 1;

  private angle = 0.35;
  private anglePresetId: string | null = null;
  private gridScale = 56;
  private toleranceGrid = DEFAULT_TOLERANCE_GRID;
  private maxDistancePx = 300;
  private dragging = false;
  private angleChanged: (() => void) | null = null;
  /** Inputs of the last drawn frame; an unchanged key skips the redraw. */
  private lastKey = "";

  public mount(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.style.touchAction = "none";
  }

  public resize(width: number, height: number, dpr: number): void {
    this.cssW = width;
    this.cssH = height;
    this.dpr = dpr;
    if (this.canvas !== null) {
      this.canvas.width = Math.max(1, Math.round(width * dpr));
      this.canvas.height = Math.max(1, Math.round(height * dpr));
    }
    // Assigning canvas.width clears the bitmap even when the size is unchanged.
    this.lastKey = "";
  }

  public frame(_time: number): void {
    const ctx = this.ctx;
    if (ctx === null || this.cssW <= 0 || this.cssH <= 0) return;
    const key = `${String(this.angle)}|${String(this.gridScale)}|${String(this.toleranceGrid)}|${String(this.maxDistancePx)}|${String(this.cssW)}x${String(this.cssH)}@${String(this.dpr)}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    ctx.fillStyle = "#070910";
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    const origin = this.origin();
    const bounds = visibleLatticeBounds(this.cssW, this.cssH, this.gridScale, origin.x, origin.y);
    const hits = nearestPerpendicularHits({
      zeros: FIRST_ZETA_ZEROS_T,
      angle: this.angle,
      gridScale: this.gridScale,
      zeroScale: this.zeroScale(),
      tolerancePx: this.toleranceGrid * this.gridScale,
      maxDistancePx: this.maxDistancePx,
      ...bounds,
    });
    this.drawGrid(ctx, bounds);
    this.drawLitPerpendiculars(ctx, hits);
    this.drawRay(ctx);
    this.drawLitLatticeDots(ctx, hits);
    this.drawZeroDots(ctx, hits);
    this.drawOrigin(ctx);
  }

  public dispose(): void {
    const canvas = this.canvas;
    if (canvas !== null) {
      canvas.removeEventListener("wheel", this.onWheel);
      canvas.removeEventListener("pointerdown", this.onPointerDown);
      canvas.removeEventListener("pointermove", this.onPointerMove);
      canvas.removeEventListener("pointerup", this.onPointerUp);
      canvas.removeEventListener("pointercancel", this.onPointerUp);
    }
    this.canvas = null;
    this.ctx = null;
  }

  /** One lattice step spans the same pixels as one unit of T along the ray. */
  public setGridToOneT(): void {
    this.gridScale = Math.min(GRID_SCALE_MAX, Math.max(GRID_SCALE_MIN, this.zeroScale()));
  }

  /** Along-ray miss allowed, in lattice steps. One means a full grid cell. */
  public tolerance(): number {
    return this.toleranceGrid;
  }

  public setTolerance(gridUnits: number): void {
    this.toleranceGrid = Math.max(0, gridUnits);
  }

  /** Longest segment from the ray to a lattice point that still draws a line. */
  public maxDistance(): number {
    return this.maxDistancePx;
  }

  public setMaxDistance(px: number): void {
    this.maxDistancePx = Math.max(0, px);
  }

  /** Toolbox refresh while the ray is dragged, so the angle readout tracks it. */
  public watchAngle(listener: () => void): void {
    this.angleChanged = listener;
  }

  public anglePreset(): string {
    return this.anglePresetId ?? "";
  }

  /** Current direction: the preset name when one is selected, otherwise radians. */
  public angleReadout(): string {
    const preset = rayAnglePresets().find((entry) => entry.id === this.anglePresetId);
    if (preset !== undefined) return `${preset.label} = ${preset.radians.toFixed(6)}`;
    return this.angle.toFixed(6);
  }

  public setAnglePreset(id: string): void {
    const preset = rayAnglePresets().find((entry) => entry.id === id);
    if (preset === undefined) return;
    this.anglePresetId = preset.id;
    this.angle = preset.radians;
  }

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const factor = Math.exp(-event.deltaY * 0.0015);
    const next = this.gridScale * factor;
    this.gridScale = Math.min(GRID_SCALE_MAX, Math.max(GRID_SCALE_MIN, next));
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    const at = this.pointer(event);
    if (at === null || this.hitDot(at.x, at.y) < 0) return;
    this.dragging = true;
    this.anglePresetId = null;
    this.canvas?.setPointerCapture(event.pointerId);
    this.angle = Math.atan2(at.y, at.x);
    this.angleChanged?.();
    if (this.canvas !== null) this.canvas.style.cursor = "grabbing";
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const at = this.pointer(event);
    if (at === null) return;
    if (this.dragging) {
      if (at.x * at.x + at.y * at.y > 1) {
        this.anglePresetId = null;
        this.angle = Math.atan2(at.y, at.x);
        this.angleChanged?.();
      }
      return;
    }
    const canvas = this.canvas;
    if (canvas !== null) canvas.style.cursor = this.hitDot(at.x, at.y) >= 0 ? "grab" : "default";
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.dragging) return;
    this.dragging = false;
    this.canvas?.releasePointerCapture(event.pointerId);
    const at = this.pointer(event);
    if (this.canvas !== null) {
      this.canvas.style.cursor = at !== null && this.hitDot(at.x, at.y) >= 0 ? "grab" : "default";
    }
  };

  /**
   * Screen position of the ray origin: one lattice step in from the left
   * and bottom edges, so the corner cell stays empty. y is down.
   */
  private origin(): { x: number; y: number } {
    return { x: this.gridScale, y: Math.max(this.gridScale, this.cssH - this.gridScale) };
  }

  /** Pointer position in y-up pixels relative to the origin. */
  private pointer(event: PointerEvent): { x: number; y: number } | null {
    const canvas = this.canvas;
    if (canvas === null || this.cssW <= 0 || this.cssH <= 0) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const sx = ((event.clientX - rect.left) / rect.width) * this.cssW;
    const sy = ((event.clientY - rect.top) / rect.height) * this.cssH;
    const origin = this.origin();
    return { x: sx - origin.x, y: origin.y - sy };
  }

  /**
   * Pixels per unit of T, so the 50th zero fits in the view from the corner.
   * Wheel zoom does not use this, so the ray length stays put.
   */
  private zeroScale(): number {
    const last = FIRST_ZETA_ZEROS_T[FIRST_ZETA_ZEROS_T.length - 1] ?? 1;
    const reach = Math.max(1, Math.min(this.cssW, this.cssH) - 36);
    return reach / last;
  }

  private hitDot(x: number, y: number): number {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const scale = this.zeroScale();
    let best = -1;
    let bestD = HIT_RADIUS * HIT_RADIUS;
    for (let k = 0; k < FIRST_ZETA_ZEROS_T.length; k += 1) {
      const radius = FIRST_ZETA_ZEROS_T[k]! * scale;
      const dx = x - radius * cos;
      const dy = y - radius * sin;
      const d = dx * dx + dy * dy;
      if (d <= bestD) {
        best = k;
        bestD = d;
      }
    }
    return best;
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    bounds: { iMin: number; iMax: number; jMin: number; jMax: number },
  ): void {
    const ox = this.origin().x;
    const oy = this.origin().y;
    ctx.strokeStyle = "rgba(184, 196, 216, 0.14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = bounds.iMin; i <= bounds.iMax; i += 1) {
      const x = ox + i * this.gridScale;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.cssH);
    }
    for (let j = bounds.jMin; j <= bounds.jMax; j += 1) {
      const y = oy - j * this.gridScale;
      ctx.moveTo(0, y);
      ctx.lineTo(this.cssW, y);
    }
    ctx.stroke();

    ctx.fillStyle = "rgba(184, 196, 216, 0.55)";
    for (let i = bounds.iMin; i <= bounds.iMax; i += 1) {
      for (let j = bounds.jMin; j <= bounds.jMax; j += 1) {
        ctx.beginPath();
        ctx.arc(ox + i * this.gridScale, oy - j * this.gridScale, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawLitPerpendiculars(ctx: CanvasRenderingContext2D, hits: PerpendicularHit[]): void {
    if (hits.length === 0) return;
    const ox = this.origin().x;
    const oy = this.origin().y;
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    ctx.strokeStyle = "#f2c14e";
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    for (const hit of hits) {
      const radius = FIRST_ZETA_ZEROS_T[hit.zeroIndex]! * this.zeroScale();
      const zx = radius * cos;
      const zy = radius * sin;
      const lx = hit.lattice.i * this.gridScale;
      const ly = hit.lattice.j * this.gridScale;
      ctx.moveTo(ox + zx, oy - zy);
      ctx.lineTo(ox + lx, oy - ly);
    }
    ctx.stroke();
  }

  private drawLitLatticeDots(ctx: CanvasRenderingContext2D, hits: PerpendicularHit[]): void {
    if (hits.length === 0) return;
    const ox = this.origin().x;
    const oy = this.origin().y;
    ctx.fillStyle = "#f2c14e";
    const seen = new Set<string>();
    for (const hit of hits) {
      const key = `${String(hit.lattice.i)}:${String(hit.lattice.j)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      ctx.beginPath();
      ctx.arc(
        ox + hit.lattice.i * this.gridScale,
        oy - hit.lattice.j * this.gridScale,
        3.5,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  private drawRay(ctx: CanvasRenderingContext2D): void {
    const last = FIRST_ZETA_ZEROS_T[FIRST_ZETA_ZEROS_T.length - 1] ?? 0;
    const length = last * this.zeroScale() + 6;
    const ox = this.origin().x;
    const oy = this.origin().y;
    ctx.strokeStyle = "rgba(184, 196, 216, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + length * Math.cos(this.angle), oy - length * Math.sin(this.angle));
    ctx.stroke();
  }

  private drawZeroDots(ctx: CanvasRenderingContext2D, hits: PerpendicularHit[]): void {
    const matched = new Set(hits.map((hit) => hit.zeroIndex));
    const ox = this.origin().x;
    const oy = this.origin().y;
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const scale = this.zeroScale();
    for (let k = 0; k < FIRST_ZETA_ZEROS_T.length; k += 1) {
      const radius = FIRST_ZETA_ZEROS_T[k]! * scale;
      const lit = matched.has(k);
      ctx.beginPath();
      ctx.arc(ox + radius * cos, oy - radius * sin, lit ? DOT_RADIUS : UNMATCHED_DOT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = lit ? "#66d9ff" : "#e23b3b";
      ctx.fill();
    }
  }

  private drawOrigin(ctx: CanvasRenderingContext2D): void {
    const ox = this.origin().x;
    const oy = this.origin().y;
    ctx.strokeStyle = "rgba(184, 196, 216, 0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ox, oy, 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

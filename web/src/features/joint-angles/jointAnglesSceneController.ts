import { causticJoint, fareyScaledJoints } from "@/features/main-workspace/spiralWorkspaceLayer";
import { planJointAngleSamples, jointAngleDotRadiusCss } from "@/features/joint-angles/jointAnglesDecimation";
import { buildJointAnglePlotPoints, plotPointsToInterleavedCss } from "@/features/joint-angles/jointAnglesRenderPoints";
import { JointAnglesWebGlPoints, tryCreateJointAnglesWebGlPoints } from "@/features/joint-angles/jointAnglesWebGlPoints";
import { indexToImag } from "@/shared/math/zetaEms";
import {
  jaSignedPerturbWindow, jaSignedScratchWindow,
  jaAbsolutePerturbWindow, jaAbsoluteScratchWindow,
} from "@/shared/math/jointAngleVector";
import type { SceneController } from "@/shared/visualization/contracts";

const PI = Math.PI;
const TWO_PI = 2 * PI;

/** Wrap an angle into (−π, π]. */
function fold(x: number): number {
  const w = ((x % TWO_PI) + TWO_PI) % TWO_PI;
  return w > PI ? w - TWO_PI : w;
}

const SMOOTH_PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31];
const SMOOTH_COLORS: Record<number, string> = {
  2: "#ff3b3b", 3: "#ff9f1c", 5: "#ffd21c", 7: "#3bd44a", 11: "#3bb0ff", 13: "#b06bff",
  17: "#ff5fd2", 19: "#00c2c2", 23: "#c8ff3b", 29: "#ff7a5c", 31: "#8aa0c0",
};

// Smooth joints (n with both n and n−1 being 13-smooth) are SPARSE, so we generate them
// once by expanding the 13-smooth numbers up to a cap, rather than trial-dividing every
// visible joint — that keeps the highlight fast (and present) at any T.
let smoothJointsCache: { n: number; lpf: number }[] | null = null;

function getSmoothJoints(): { n: number; lpf: number }[] {
  if (smoothJointsCache !== null) return smoothJointsCache;
  const CAP = 2_000_000;
  let list = [1];
  for (const p of SMOOTH_PRIMES) {
    const ext: number[] = [];
    for (const v of list) { let x = v; while (x <= CAP) { ext.push(x); x *= p; } }
    list = ext;
  }
  const set = new Set(list);
  const lpfOf = (n: number): number => { let b = 1; for (const p of SMOOTH_PRIMES) if (n % p === 0) b = p; return b; };
  const joints: { n: number; lpf: number }[] = [];
  for (const n of list) { if (n >= 2 && set.has(n - 1)) joints.push({ n, lpf: Math.max(lpfOf(n), lpfOf(n - 1)) }); }
  joints.sort((a, b) => a.n - b.n);
  smoothJointsCache = joints;
  return joints;
}

// Vertical squish (Shift+wheel): fraction of the screen height the plot occupies.
// 0.80 = default (10% label band top+bottom); can't expand past that; squish down to 0.05.
const PLOT_FRACTION_MAX = 0.80;
const PLOT_FRACTION_MIN = 0.05;

/**
 * State the controller reads from the model each frame. Kept as a narrow interface so
 * the controller has no dependency on the concrete model (avoids an import cycle).
 */
export interface JointAnglesViewSource {
  getIndex(): number;
  setIndex(v: number): void;
  getUsePolyImag(): boolean;
  getFastJointAngles(): boolean;
  getAbsoluteJointAngles(): boolean;
  /** Animation speed in [−range, range] (0 = paused); inverse-square index scaling. */
  getAnimSpeed(): number;
  /** Farey fractions to overlay: 0 = none, m ≥ 2 shows F_m (all reduced p/q ≤ (m−1)/m). */
  getFareyMaxDenom(): number;
  /** Joint picker (slider 1): joint number 1…⌊T⌋; 1 = off (leftmost). */
  getPickJoint(): number;
  /** Fraction picker (slider 2): value 0…1; 0 = off (leftmost). */
  getPickFraction(): number;
  /** Fitted-curve overlay 1 (green): the p/q to draw the parabola+cubic arcs for, or null. */
  getOverlayPQ(): { p: number; q: number } | null;
  /** Overlay 1 strand: 0 = none, −1 = all, else the 1-based strand index. */
  getOverlayStrand(): number;
  /** Fitted-curve overlay 2 (red): the p/q to draw, or null = off. */
  getOverlayPQ2(): { p: number; q: number } | null;
  /** Overlay 2 strand: 0 = none, −1 = all, else the 1-based strand index. */
  getOverlayStrand2(): number;
  /** When true, ring the crossings of the two fitted-curve overlays with blue circles. */
  getShowFittedIntersections(): boolean;
  /** When true, hovering a joint shows a tooltip with its carried fraction. */
  getShowCarriedMouseover(): boolean;
  /** Highlight visible joints with |ρ_n| ≤ this band (radians); 0 = off. */
  getNearZeroBand(): number;
  /** When true, overlay the cycles-per-joint curve ν(n)=I(T)/(2π·n(n−1)) in red. */
  getShowCyclesOverlay(): boolean;
  /** When true, overlay the cycles-per-T curve μ(n)=I'(T)·ln(n/(n−1))/(2π) in blue. */
  getShowCyclesPerTOverlay(): boolean;
  /** When true, ring the "smooth" joints (lpf of n(n−1) ≤ 31), coloured by that prime. */
  getShowSmoothJoints(): boolean;
  /** Dim the joint dots: 0 = normal; 0→0.5 shrinks them, 0.5→1 darkens toward black. */
  getDimPoints(): number;
}

/** Closest reduced Farey fraction p/q (q ≤ maxDenom, p/q ∈ [0,1]) to `value`. */
export function closestFareyFraction(value: number, maxDenom: number): { p: number; q: number } {
  let bp = 0, bq = 1, bestD = Infinity;
  for (let q = 1; q <= maxDenom; q += 1) {
    const p = Math.max(0, Math.min(q, Math.round(value * q)));
    const d = Math.abs(p / q - value);
    if (d < bestD) { bestD = d; bp = p; bq = q; }
  }
  let a = bp, b = bq;
  while (b !== 0) { const r = a % b; a = b; b = r; }
  const g = a || 1;
  return { p: bp / g, q: bq / g };
}

/**
 * A pure Canvas2D SceneController that draws the joint-angle graph filling the whole
 * view area. Reserves 10% of the height at the top and 10% at the bottom for labels
 * (Farey fractions etc. — reserved for now). Computes ONLY the signed joint-angle
 * vector θ_n = fold(−t·ln(n/(n−1))); it never builds spiral geometry, joint positions,
 * link lengths, or links past the bisector. Horizontal pan/zoom + optional animation.
 */
export class JointAnglesSceneController implements SceneController {
  private readonly source: JointAnglesViewSource;
  private canvas: HTMLCanvasElement | null = null;
  private glCanvas: HTMLCanvasElement | null = null;
  private webGl: JointAnglesWebGlPoints | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private cssW = 0;
  private cssH = 0;
  private dpr = 1;

  // Horizontal zoom window over the normalized joint fraction u = (n−1)/(N−1) ∈ [0,1].
  private u0 = 0;
  private u1 = 1;

  // Vertical squish: fraction of screen height used by the plot (centered). Shift+wheel.
  private plotFraction = PLOT_FRACTION_MAX;

  // Notified (once per frame) when the horizontal window [u0,u1] changes, so the toolbox
  // sliders can retrack it. Set by the model.
  public onViewChange: (() => void) | null = null;
  /** Throttled toolbox refresh while T is animating. Set by the model. */
  public onAnimatingFrame: (() => void) | null = null;
  private lastNotifiedU0 = 0;
  private lastNotifiedU1 = 1;

  private lastTime = 0;
  private smoothedAnimSpeed = 0;
  private lastKey = "";
  private hoverX: number | null = null;   // cursor position (CSS px) for the carried-fraction tooltip
  private hoverY: number | null = null;
  private dragging = false;
  private dragX = 0;
  private dragU0 = 0;
  private dragU1 = 0;

  constructor(source: JointAnglesViewSource) {
    this.source = source;
  }

  public mount(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.glCanvas = null;
    this.webGl?.dispose();
    this.webGl = null;
    this.ctx = canvas.getContext("2d");
    this.attachInputListeners(canvas);
  }

  /** WebGL dots on `glCanvas`, transparent Canvas2D overlay for chrome and annotations. */
  public mountDual(glCanvas: HTMLCanvasElement, overlayCanvas: HTMLCanvasElement): void {
    this.glCanvas = glCanvas;
    this.canvas = overlayCanvas;
    this.ctx = overlayCanvas.getContext("2d");
    this.webGl?.dispose();
    this.webGl = tryCreateJointAnglesWebGlPoints(glCanvas);
    this.attachInputListeners(overlayCanvas);
    overlayCanvas.style.cursor = "grab";
    overlayCanvas.style.touchAction = "none";
  }

  private attachInputListeners(canvas: HTMLCanvasElement): void {
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerLeave);
    canvas.addEventListener("dblclick", this.onDoubleClick);
  }

  public resize(width: number, height: number, dpr: number): void {
    this.cssW = width;
    this.cssH = height;
    this.dpr = dpr;
    const bw = Math.max(1, Math.round(width * dpr));
    const bh = Math.max(1, Math.round(height * dpr));
    if (this.glCanvas !== null) {
      this.glCanvas.width = bw;
      this.glCanvas.height = bh;
      this.webGl?.resize(width, height, dpr);
    }
    if (this.canvas !== null) {
      this.canvas.width = bw;
      this.canvas.height = bh;
    }
    this.lastKey = ""; // force redraw at new size
  }

  public frame(time: number): void {
    // Animation: same inverse-square scaling as the main tab — faster at low T, slower
    // at high T. speedPerFrame = animSpeed²·0.001/(T+1), advanced by deltaMs/16.667.
    const deltaMs = this.lastTime > 0 ? Math.min(50, time - this.lastTime) : 0;
    this.lastTime = time;
    // Low-pass the speed so per-frame input jitter (hand tremor near zero, the slider's
    // pixel→value steps) can't reach the animation. Without this, a momentary sign flip or
    // magnitude wobble twitches the spiral — hugely amplified at large T, where t=I(T) is so
    // steep that a micro-reversal is a big visible jump. ~120ms constant, frame-rate independent.
    const targetSpeed = this.source.getAnimSpeed();
    if (deltaMs > 0) {
      const k = 1 - Math.exp(-deltaMs / 120);
      this.smoothedAnimSpeed += (targetSpeed - this.smoothedAnimSpeed) * k;
      if (targetSpeed === 0 && Math.abs(this.smoothedAnimSpeed) < 1e-4) this.smoothedAnimSpeed = 0;
    }
    const animSpeed = this.smoothedAnimSpeed;
    const animating = Math.abs(animSpeed) > 0.0001;
    if (animating && deltaMs > 0) {
      const index = this.source.getIndex();
      const speedPerFrame = (animSpeed * animSpeed) * 0.001 / (index + 1);
      this.source.setIndex(index + speedPerFrame * Math.sign(animSpeed) * (deltaMs / 16.667));
      // Index steps can be smaller than draw-cache epsilon at high T — always redraw while animating.
      this.lastKey = "";
      this.onAnimatingFrame?.();
    }

    // Notify the toolbox once per frame if the horizontal window changed (zoom/pan).
    if (this.u0 !== this.lastNotifiedU0 || this.u1 !== this.lastNotifiedU1) {
      this.lastNotifiedU0 = this.u0;
      this.lastNotifiedU1 = this.u1;
      this.onViewChange?.();
    }

    this.draw();
  }

  /** Current horizontal window over the normalized joint fraction u ∈ [0,1]. */
  public getViewWindow(): { u0: number; u1: number } { return { u0: this.u0, u1: this.u1 }; }

  /** Force redraw on next frame. */
  public invalidate(): void { this.lastKey = ""; }

  public dispose(): void {
    const c = this.canvas;
    if (c !== null) {
      c.removeEventListener("wheel", this.onWheel);
      c.removeEventListener("pointerdown", this.onPointerDown);
      c.removeEventListener("pointermove", this.onPointerMove);
      c.removeEventListener("pointerup", this.onPointerUp);
      c.removeEventListener("pointerleave", this.onPointerLeave);
      c.removeEventListener("dblclick", this.onDoubleClick);
    }
    this.webGl?.dispose();
    this.webGl = null;
    this.canvas = null;
    this.glCanvas = null;
    this.ctx = null;
  }

  // ─── plot geometry ────────────────────────────────────────────────────────────
  // The plot band occupies `plotFraction` of the height, centered; the remaining
  // (1−plotFraction) is split evenly into the top and bottom label bands.
  private plotRect(): { L: number; R: number; T: number; B: number } {
    const half = ((1 - this.plotFraction) / 2) * this.cssH;
    // Wider left gutter for each cycle-rate axis showing (angle axis + red + blue).
    const extra = (this.source.getShowCyclesOverlay() ? 46 : 0) + (this.source.getShowCyclesPerTOverlay() ? 46 : 0);
    const padL = 40 + extra;
    const padR = 12;
    return { L: padL, R: this.cssW - padR, T: half, B: this.cssH - half };
  }

  private draw(): void {
    const ctx = this.ctx;
    if (ctx === null || this.cssW <= 0 || this.cssH <= 0) return;

    const index = this.source.getIndex();
    const usePolyImag = this.source.getUsePolyImag();
    const fast = this.source.getFastJointAngles();
    const absolute = this.source.getAbsoluteJointAngles();
    const fareyMaxDenom = this.source.getFareyMaxDenom();
    const pickJoint = this.source.getPickJoint();
    const pickFraction = this.source.getPickFraction();
    const overlay = this.source.getOverlayPQ();
    const overlayStrand = this.source.getOverlayStrand();
    const overlay2 = this.source.getOverlayPQ2();
    const overlayStrand2 = this.source.getOverlayStrand2();
    const showIntersections = this.source.getShowFittedIntersections();
    const carriedMouseover = this.source.getShowCarriedMouseover();
    const nearZeroBand = this.source.getNearZeroBand();
    const showCycles = this.source.getShowCyclesOverlay();
    const showCyclesT = this.source.getShowCyclesPerTOverlay();
    const showSmooth = this.source.getShowSmoothJoints();
    const dim = this.source.getDimPoints();
    const N = Math.floor(index);

    const hoverKey = carriedMouseover ? `${Math.round(this.hoverX ?? -1)},${Math.round(this.hoverY ?? -1)}` : "";
    const animating = Math.abs(this.source.getAnimSpeed()) > 0.0001;
    const indexKey = animating ? String(index) : index.toFixed(6);
    const webGlKey = this.webGl !== null ? "|webgl" : "";
    const key = `${indexKey}|${String(usePolyImag)}|${String(fast)}|${String(absolute)}|${this.cssW}x${this.cssH}|${this.u0.toFixed(6)}|${this.u1.toFixed(6)}|${this.plotFraction.toFixed(4)}|${fareyMaxDenom}|${pickJoint}|${pickFraction.toFixed(4)}|${overlay ? `${overlay.p}/${overlay.q}` : ""}|${overlayStrand}|${overlay2 ? `${overlay2.p}/${overlay2.q}` : ""}|${overlayStrand2}|${String(showIntersections)}|${hoverKey}|${nearZeroBand.toFixed(4)}|${String(showCycles)}|${String(showCyclesT)}|${String(showSmooth)}|${dim.toFixed(3)}${webGlKey}`;
    if (key === this.lastKey) return;
    this.lastKey = key;

    if (this.webGl !== null) {
      this.webGl.clear();
    }

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssW, this.cssH);

    const { L, R, T, B } = this.plotRect();
    const plotW = R - L;
    const plotH = B - T;
    const t = indexToImag(index, usePolyImag);

    // Reserved label bands (faint fill + separators).
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(0, 0, this.cssW, T);
    ctx.fillRect(0, B, this.cssW, this.cssH - B);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, T + 0.5); ctx.lineTo(this.cssW, T + 0.5);
    ctx.moveTo(0, B + 0.5); ctx.lineTo(this.cssW, B + 0.5);
    ctx.stroke();

    // Angle-axis gridlines and labels (+π top, 0 middle, −π bottom).
    const yOf = (a: number): number => T + ((PI - a) / TWO_PI) * plotH;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = "11px monospace";
    const gridRows: [number, string][] = [[PI, "π"], [PI / 2, "π/2"], [0, "0"], [-PI / 2, "−π/2"], [-PI, "−π"]];
    for (const [a, lbl] of gridRows) {
      const y = yOf(a);
      ctx.strokeStyle = a === 0 ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)";
      ctx.beginPath(); ctx.moveTo(L, y + 0.5); ctx.lineTo(R, y + 0.5); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText(lbl, L - 6, y);
    }

    // x mapping through the horizontal zoom window [u0,u1].
    const span = this.u1 - this.u0;
    // Continuous horizontal scale: use the fractional index (equals N−1 at whole-number T)
    // so the dots glide as T animates, instead of snapping sideways every time T crosses an
    // integer and N=⌊T⌋ steps up. The fraction slider held N fixed, which is why it was smooth.
    const denom = index > 1 ? index - 1 : 1;
    const uOf = (n: number): number => (index > 1 ? (n - 1) / denom : 0.5);
    const xOfU = (u: number): number => L + ((u - this.u0) / span) * plotW;

    if (N >= 2) {
      const nLo = Math.max(2, Math.floor(this.u0 * denom + 1) - 1);
      const nHi = Math.min(N, Math.ceil(this.u1 * denom + 1) + 1);
      const useFast = fast && N > 1000;
      const samplePlan = planJointAngleSamples(nLo, nHi);
      const dotJoints = samplePlan.joints;
      const signedScratchBuf = new Float64Array(nHi + 1);
      const signed = absolute
        ? (useFast
          ? jaAbsolutePerturbWindow(index, nLo, nHi, usePolyImag, signedScratchBuf)
          : jaAbsoluteScratchWindow(N, t, nLo, nHi, signedScratchBuf))
        : (useFast
          ? jaSignedPerturbWindow(index, nLo, nHi, usePolyImag, signedScratchBuf)
          : jaSignedScratchWindow(N, t, nLo, nHi, signedScratchBuf));
      const r = jointAngleDotRadiusCss(plotW, dotJoints.length, dim);
      const bright = 1 - 0.88 * Math.max(0, (dim - 0.5) / 0.5);
      const dotRgb: [number, number, number] = [
        Math.round(143 * bright),
        Math.round(208 * bright),
        Math.round(255 * bright),
      ];

      if (this.webGl !== null) {
        const plotPoints = buildJointAnglePlotPoints({
          joints: dotJoints,
          signed,
          uOf,
          xOfU,
          plotTop: T,
          plotHeight: plotH,
          plotLeft: L,
          plotRight: R,
        });
        const interleaved = plotPointsToInterleavedCss(plotPoints);
        this.webGl.setPositionsCss(interleaved);
        this.webGl.draw(dotRgb, r);
      } else {
        ctx.fillStyle = `rgb(${dotRgb[0]}, ${dotRgb[1]}, ${dotRgb[2]})`;
        for (const n of dotJoints) {
          const x = xOfU(uOf(n));
          if (x < L - 2 || x > R + 2) continue;
          const y = yOf(signed[n]!);
          ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
        }
      }

      // Near-zero highlight: ring the visible joints with |ρ_n| ≤ band (yellow).
      if (nearZeroBand > 0) {
        ctx.strokeStyle = "#ffe000"; ctx.lineWidth = 1.2;
        for (const n of dotJoints) {
          if (Math.abs(signed[n]!) > nearZeroBand) continue;
          const x = xOfU(uOf(n));
          if (x < L - 2 || x > R + 2) continue;
          ctx.beginPath(); ctx.arc(x, yOf(signed[n]!), 4, 0, TWO_PI); ctx.stroke();
        }
        ctx.lineWidth = 1;
      }

      // Smooth joints: ring joints whose n(n−1) is 13-smooth, coloured by that prime.
      // These are exactly the joints a champion drives to zero (small-prime resonance).
      if (showSmooth) {
        ctx.lineWidth = 1.4;
        for (const { n, lpf } of getSmoothJoints()) {
          if (n < nLo || n > nHi) continue;
          const x = xOfU(uOf(n));
          if (x < L - 2 || x > R + 2) continue;
          ctx.strokeStyle = SMOOTH_COLORS[lpf] ?? "#888888";
          ctx.beginPath(); ctx.arc(x, yOf(signed[n]!), 5, 0, TWO_PI); ctx.stroke();
        }
        ctx.lineWidth = 1;
        // Legend in the top band: "smooth n(n−1): 2 3 5 7 11 13" in the strand colours.
        ctx.font = "10px monospace"; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        let lx = L + 4;
        ctx.fillText("smooth n(n−1):", lx, T - 2); lx += 84;
        for (const p of SMOOTH_PRIMES) { ctx.fillStyle = SMOOTH_COLORS[p]!; ctx.fillText(String(p), lx, T - 2); lx += p >= 10 ? 18 : 12; }
      }

      // Farey fractions overlay: F_m excluding 1/1. Vertical line at each caustic
      // position n_c = causticJoint(p/q, T), labeled p/q in the top band.
      if (fareyMaxDenom >= 2) {
        // Half-size labels for the dense high-denominator sets (32, 64).
        ctx.font = `${fareyMaxDenom > 24 ? 5 : 10}px monospace`; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        for (const m of fareyScaledJoints(index, fareyMaxDenom)) {
          if (m.p >= m.q) continue; // drop 1/1
          const u = (causticJoint(m.p / m.q, index) - 1) / (N - 1);
          if (u < this.u0 - 1e-9 || u > this.u1 + 1e-9) continue;
          const x = xOfU(u);
          ctx.strokeStyle = "rgba(120,180,255,0.30)";
          ctx.beginPath(); ctx.moveTo(x + 0.5, T); ctx.lineTo(x + 0.5, B); ctx.stroke();
          ctx.fillStyle = "rgba(160,205,255,0.95)";
          ctx.fillText(`${m.p}/${m.q}`, x, T - 2);
        }
      }

      // Slider 1 (joint picker, orange): a line at the picked joint's position.
      const pj = Math.min(N, Math.max(1, Math.round(pickJoint)));
      if (pj > 1) {
        const u = (pj - 1) / (N - 1);
        if (u >= this.u0 - 1e-9 && u <= this.u1 + 1e-9) {
          const x = xOfU(u);
          ctx.strokeStyle = "#ffb020"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x + 0.5, T); ctx.lineTo(x + 0.5, B); ctx.stroke();
        }
      }

      // Slider 2 (fraction picker, blue): three lines — the fraction's caustic, the
      // nearest joint, and the nearest Farey fraction — each labeled at the top.
      if (pickFraction > 0) {
        const f = Math.min(1, Math.max(0, pickFraction));
        const ncF = causticJoint(f, index);
        const nJoint = Math.min(N, Math.max(1, Math.round(ncF)));
        const pq = closestFareyFraction(f, 24);
        const drawBlue = (nc: number, label: string, labelY: number): void => {
          const u = (nc - 1) / (N - 1);
          if (u < this.u0 - 1e-9 || u > this.u1 + 1e-9) return;
          const x = xOfU(u);
          ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x + 0.5, T); ctx.lineTo(x + 0.5, B); ctx.stroke();
          ctx.fillStyle = "#9dc0ff"; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.font = "10px monospace";
          ctx.fillText(label, x, labelY);
        };
        drawBlue(ncF, `f=${f.toFixed(3)}`, T - 2);
        drawBlue(nJoint, `n=${nJoint}`, T - 14);
        drawBlue(causticJoint(pq.p / pq.q, index), `${pq.p}/${pq.q}`, T - 26);
      }

      // Fitted parabola+cubic caustic arcs at a chosen p/q. Each strand is a folded curve
      // ρ = fold(C_j + ½φ''δ² + ⅙φ'''δ³), δ = n − n_c. Two overlays (1 green, 2 red), plus
      // optional blue circles where the two overlays cross.
      type CausticP = { nc: number; p: number; d2: number; d3: number; carrier: number; base: number };
      const causticParams = (pq: { p: number; q: number } | null): CausticP | null => {
        if (pq === null || pq.q <= 0 || pq.p >= pq.q) return null;
        const nc = causticJoint(pq.p / pq.q, index);
        if (nc <= 1) return null;
        const w2 = nc * (nc - 1);
        const carrier = (TWO_PI * pq.q) / pq.p;
        return {
          nc, p: pq.p,
          d2: (-t * (2 * nc - 1)) / (w2 * w2),
          d3: (2 * t * (3 * nc * nc - 3 * nc + 1)) / (w2 * w2 * w2),
          carrier,
          base: (-t * Math.log1p(1 / (nc - 1))) + carrier * (Math.round(nc) - nc),
        };
      };
      const rawOf = (P: CausticP, j: number, n: number): number => {
        const d = n - P.nc;
        return P.base + P.carrier * j + 0.5 * P.d2 * d * d + (P.d3 / 6) * d * d * d;
      };
      const strandsOf = (P: CausticP | null, rawSel: number): number[] => {
        if (P === null) return [];
        if (rawSel === -1) return Array.from({ length: P.p }, (_, j) => j);
        if (rawSel >= 1 && rawSel <= P.p) return [rawSel - 1];
        return [];
      };
      const drawArcs = (P: CausticP | null, strands: number[], color: string): void => {
        if (P === null || strands.length === 0) return;
        const SAMPLES = 480;
        ctx.strokeStyle = color; ctx.lineWidth = 0.7;
        for (const j of strands) {
          let drawing = false, prevY = 0;
          ctx.beginPath();
          for (let s = 0; s <= SAMPLES; s += 1) {
            const n = this.u0 * (N - 1) + 1 + (this.u1 - this.u0) * (N - 1) * (s / SAMPLES);
            const y = fold(rawOf(P, j, n));
            const py = yOf(y);
            const x = xOfU((n - 1) / (N - 1));
            if (drawing && Math.abs(y - prevY) > PI) { ctx.stroke(); ctx.beginPath(); drawing = false; }
            if (drawing) ctx.lineTo(x, py); else { ctx.moveTo(x, py); drawing = true; }
            prevY = y;
          }
          ctx.stroke();
        }
        ctx.lineWidth = 1;
      };
      const pA = causticParams(overlay);
      const pB = causticParams(overlay2);
      const sA = strandsOf(pA, overlayStrand);
      const sB = strandsOf(pB, overlayStrand2);
      drawArcs(pA, sA, "#33e08a");
      drawArcs(pB, sB, "#ff5555");

      // Intersection circles: where a green strand crosses a red strand (same x, folded
      // angles equal ⇔ raw difference ≡ 0 mod 2π). Scan the visible window per strand pair.
      if (showIntersections && pA !== null && pB !== null && sA.length > 0 && sB.length > 0) {
        const nLoW = this.u0 * (N - 1) + 1;
        const nHiW = this.u1 * (N - 1) + 1;
        const S = 3000;
        ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 1.2;
        for (const j1 of sA) {
          for (const j2 of sB) {
            let prevN = nLoW;
            let prevW = fold(rawOf(pA, j1, nLoW) - rawOf(pB, j2, nLoW));
            for (let s = 1; s <= S; s += 1) {
              const n = nLoW + (nHiW - nLoW) * (s / S);
              const w = fold(rawOf(pA, j1, n) - rawOf(pB, j2, n));
              if (w !== 0 && prevW !== 0 && (w > 0) !== (prevW > 0) && Math.abs(w - prevW) < PI) {
                const nx = n - (n - prevN) * w / (w - prevW);
                const x = xOfU((nx - 1) / (N - 1));
                ctx.beginPath(); ctx.arc(x, yOf(fold(rawOf(pA, j1, nx))), 5, 0, TWO_PI); ctx.stroke();
              }
              prevW = w; prevN = n;
            }
          }
        }
        ctx.lineWidth = 1;
      }
    }

    // Cycle-rate overlays, each auto-scaled to the visible window with its own left axis:
    //   red  ν(n)=I(T)/(2π·n(n−1))          = cycles per joint  (∂ρ/∂n; = 1/f(n))
    //   blue μ(n)=I'(T)·ln(n/(n−1))/(2π)     = cycles per T-unit (∂ρ/∂T; ≈ 2/u)
    if ((showCycles || showCyclesT) && N >= 2) {
      const D = Math.log(index + 1) - Math.log(index);
      const Dp = 1 / (index + 1) - 1 / index;
      const iPrime = (PI * (2 * D - (2 * index + 1) * Dp)) / (D * D);   // I'(T)
      const drawRate = (color: string, title: string, slot: number, valFn: (n: number) => number): void => {
        const nEdgeL = Math.max(2, this.u0 * (N - 1) + 1);
        const nEdgeR = Math.max(2, this.u1 * (N - 1) + 1);
        let vMax = valFn(nEdgeL);
        let vMin = valFn(nEdgeR);
        if (vMax < vMin) { const s = vMax; vMax = vMin; vMin = s; }
        const rng = Math.max(1e-12, vMax - vMin);
        const yv = (v: number): number => B - ((v - vMin) / rng) * plotH;
        ctx.strokeStyle = color; ctx.lineWidth = 1.6;
        ctx.beginPath();
        const SAMP = 320;
        for (let s = 0; s <= SAMP; s += 1) {
          const u = this.u0 + (this.u1 - this.u0) * (s / SAMP);
          const nn = Math.max(2, u * (N - 1) + 1);
          const x = L + (s / SAMP) * plotW;
          const y = yv(valFn(nn));
          if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.lineWidth = 1;
        // Axis in the left gutter; slot 0 nearest the plot, higher slots further left.
        const labelX = L - 48 - slot * 46;
        ctx.fillStyle = color; ctx.strokeStyle = color;
        ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.font = "10px monospace";
        for (let i = 0; i <= 4; i += 1) {
          const v = vMin + (vMax - vMin) * (i / 4);
          const y = yv(v);
          ctx.beginPath(); ctx.moveTo(labelX + 2, y + 0.5); ctx.lineTo(labelX + 6, y + 0.5); ctx.stroke();
          ctx.fillText(v >= 100 ? v.toFixed(0) : v.toFixed(2), labelX, y);
        }
        ctx.textAlign = "left"; ctx.textBaseline = "bottom";
        ctx.fillText(title, Math.max(2, labelX - 30), T - 2);
      };
      let slot = 0;
      if (showCycles) { drawRate("#ff4d4d", "cyc/j", slot, (n) => t / (TWO_PI * n * (n - 1))); slot += 1; }
      if (showCyclesT) { drawRate("#4d9dff", "cyc/T", slot, (n) => (iPrime * Math.log(n / (n - 1))) / TWO_PI); }
    }

    // Bottom axis: 5 tics showing the joint-fraction u at left, ¼, mid, ¾, right of
    // the current view window (0.000 … 1.000 at full zoom), 3 decimals.
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "11px monospace"; ctx.textBaseline = "top";
    for (let i = 0; i <= 4; i += 1) {
      const frac = i / 4;
      const x = L + frac * plotW;
      const u = this.u0 + frac * span;
      ctx.beginPath(); ctx.moveTo(x + 0.5, B); ctx.lineTo(x + 0.5, B + 6); ctx.stroke();
      ctx.textAlign = i === 0 ? "left" : i === 4 ? "right" : "center";
      ctx.fillText(u.toFixed(3), x, B + 8);
    }

    // Carried-fraction tooltip: hover a joint to see f(n) = 2π·n(n−1)/I(T).
    if (carriedMouseover && this.hoverX !== null && this.hoverY !== null && N >= 2 &&
        this.hoverX >= L && this.hoverX <= R && this.hoverY >= T && this.hoverY <= B) {
      const uHover = this.u0 + ((this.hoverX - L) / plotW) * (this.u1 - this.u0);
      const n = Math.min(N, Math.max(1, Math.round(uHover * (N - 1) + 1)));
      const fn = (TWO_PI * n * (n - 1)) / t;
      const pq = closestFareyFraction(fn, 24);
      const rho = n >= 2 ? fold(-t * Math.log1p(1 / (n - 1))) : 0;
      // Ring the joint's dot.
      const xd = xOfU((n - 1) / (N - 1));
      const yd = yOf(rho);
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(xd, yd, 5, 0, TWO_PI); ctx.stroke();
      ctx.lineWidth = 1;
      // Tooltip box near the cursor.
      const label = `joint ${n} · f = ${fn.toFixed(4)}  ≈ ${pq.p}/${pq.q}`;
      ctx.font = "12px monospace";
      const tw = ctx.measureText(label).width;
      let tx = this.hoverX + 12;
      let ty = this.hoverY - 24;
      if (tx + tw + 8 > this.cssW) tx = this.hoverX - tw - 12;
      if (ty < 2) ty = this.hoverY + 14;
      ctx.fillStyle = "rgba(0,0,0,0.78)";
      ctx.fillRect(tx - 4, ty - 2, tw + 8, 18);
      ctx.fillStyle = "#e8f0ff"; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(label, tx, ty);
    }

    this.drawInfo(ctx, index, N, t);
  }

  private drawInfo(
    ctx: CanvasRenderingContext2D,
    index: number,
    N: number,
    t: number,
  ): void {
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "11px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    const renderTag = this.webGl !== null ? " · WebGL" : "";
    ctx.fillText(
      `T = ${index.toFixed(6)}   ⌊T⌋ = ${N}   t = ${t.toLocaleString("en-US", { minimumFractionDigits: 5, maximumFractionDigits: 5 })}${renderTag}`,
      6,
      4,
    );
  }

  // ─── interaction: horizontal pan/zoom over [u0,u1] ─────────────────────────────
  private uAtClientX(clientX: number): number {
    const c = this.canvas;
    if (c === null) return 0.5;
    const rect = c.getBoundingClientRect();
    const { L, R } = this.plotRect();
    const plotW = R - L;
    const px = clientX - rect.left - L;
    const frac = plotW > 0 ? px / plotW : 0.5;
    return this.u0 + frac * (this.u1 - this.u0);
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (e.shiftKey) {
      // Vertical squish (centered): scroll toward you squishes the plot toward a line,
      // away expands it back — never beyond the default 80% of the height. macOS often
      // remaps Shift+scroll to the horizontal axis, so take whichever delta dominates.
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const factor = Math.exp(delta * 0.0015);
      const pf = Math.max(PLOT_FRACTION_MIN, Math.min(PLOT_FRACTION_MAX, this.plotFraction / factor));
      if (pf !== this.plotFraction) { this.plotFraction = pf; this.lastKey = ""; }
      return;
    }
    const pivot = Math.max(0, Math.min(1, this.uAtClientX(e.clientX)));
    const factor = Math.exp(e.deltaY * 0.0015); // >1 zoom out, <1 zoom in
    let a = pivot + (this.u0 - pivot) * factor;
    let b = pivot + (this.u1 - pivot) * factor;
    a = Math.max(0, a); b = Math.min(1, b);
    if (b - a > 1e-4) { this.u0 = a; this.u1 = b; this.lastKey = ""; }
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.dragging = true;
    this.dragX = e.clientX;
    this.dragU0 = this.u0;
    this.dragU1 = this.u1;
    this.canvas?.setPointerCapture(e.pointerId);
    if (this.canvas !== null) this.canvas.style.cursor = "grabbing";
  };

  private onPointerLeave = (): void => { this.hoverX = null; this.hoverY = null; };

  private onPointerMove = (e: PointerEvent): void => {
    const c = this.canvas;
    if (c === null) return;
    const rect = c.getBoundingClientRect();
    this.hoverX = e.clientX - rect.left;
    this.hoverY = e.clientY - rect.top;
    if (!this.dragging) return;
    const { L, R } = this.plotRect();
    const plotW = R - L;
    const du = ((e.clientX - this.dragX) / Math.max(1, plotW)) * (this.dragU1 - this.dragU0);
    let a = this.dragU0 - du;
    let b = this.dragU1 - du;
    const span = b - a;
    if (a < 0) { a = 0; b = span; }
    if (b > 1) { b = 1; a = 1 - span; }
    this.u0 = a; this.u1 = b; this.lastKey = "";
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.dragging = false;
    this.canvas?.releasePointerCapture(e.pointerId);
    if (this.canvas !== null) this.canvas.style.cursor = "grab";
  };

  private onDoubleClick = (): void => {
    this.u0 = 0; this.u1 = 1; this.lastKey = "";
  };

}

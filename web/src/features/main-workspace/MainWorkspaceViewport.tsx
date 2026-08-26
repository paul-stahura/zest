import { useEffect, useRef, useState } from "react";

import { useVisualizationRuntime } from "@/app/visualization/VisualizationRuntimeContext";
import { ViewportCanvas } from "@/shared/rendering/ViewportCanvas";
import { MainWorkspaceModel } from "@/features/main-workspace/mainWorkspaceModel";
import { fareyScaledJoints, recipSqrtJointNumbers, flankingNearZeroJointNumbers, gapEdgeJointNumbers, mediantJoints, nearZeroByNumerator, primeFactorCommonJoints, widthGapJoints, widthGapJoints2, causticJoint } from "@/features/main-workspace/spiralWorkspaceLayer";
import { indexToImag } from "@/shared/math/zetaEms";

/**
 * Calc-vs-draw timing overlay, top-right of the display area. Headline is the
 * percentage split of CPU time over the 2s sampling window (calc = full spiral
 * rebuild: math + scene construction; draw = renderer.render submission).
 * Detail line shows per-event averages in ms. Updates twice a second —
 * per-frame updates are unreadable flicker. GPU execution is asynchronous and
 * not measurable here; draw is the CPU submit cost, the actionable signal.
 */
function PerfOverlay({ model }: { model: MainWorkspaceModel }) {
  const [stats, setStats] = useState(model.getCalcDrawStats());
  // Fast joint-angle diagnostic: shown only while the toggle is on and the graph
  // is active (so the benchmark is actually running). Populated by jaBenchmark.
  const [fast, setFast] = useState<JaFastStats | null>(null);
  const [fastOn, setFastOn] = useState(false);
  // Index last benchmarked. We only re-time when T changes — when T is static
  // nothing is recomputed, so the readout holds steady instead of flickering.
  const lastBenchIndex = useRef<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => {
      setStats(model.getCalcDrawStats());
      const ja = model.getJointAngleGraphState();
      const N = Math.floor(ja.index);
      // Readout is independent of whether the joint-angle graph is shown: when the
      // toggle is on and T>1000, benchmark both paths — but only when T changed.
      if (ja.fastJointAngles && N > 1000) {
        setFastOn(true);
        if (lastBenchIndex.current !== ja.index) {
          lastBenchIndex.current = ja.index;
          jaBenchmark(N, ja.index, ja.usePolyImag, indexToImag(ja.index, ja.usePolyImag));
          setFast(getJaFastStats());
        }
      } else {
        setFastOn(false);
        setFast(null);
        lastBenchIndex.current = null;
      }
    }, 500);
    return () => { clearInterval(id); };
  }, [model]);

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        padding: "4px 8px",
        borderRadius: 4,
        background: "rgba(10, 12, 20, 0.65)",
        pointerEvents: "none",
        userSelect: "none",
        textAlign: "right",
        fontFamily: "var(--font-mono)",
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1.5,
      }}
    >
      <div style={{ fontSize: 12, color: "#c8d0e8" }}>
        {stats === null
          ? "calc — / draw —"
          : `calc ${stats.calcPct.toFixed(0)}% / draw ${stats.drawPct.toFixed(0)}%`}
      </div>
      {stats !== null && (
        <div style={{ fontSize: 10, color: "#8a92ab" }}>
          {`${stats.calcAvgMs.toFixed(2)}ms/change · ${stats.drawAvgMs.toFixed(2)}ms/frame · ${stats.fps.toFixed(0)}fps`}
        </div>
      )}
      {fastOn && fast !== null && (
        <>
          <div style={{ fontSize: 11, color: "#7fd0a0", marginTop: 3 }}>
            {`fast θ: ${fast.perturbMs.toFixed(3)} vs ${fast.scratchMs.toFixed(3)} ms · ${fast.speedup.toFixed(1)}×`}
          </div>
          <div style={{ fontSize: 10, color: "#5fae84" }}>
            {`N=${fast.n} · log/frame ${fast.n}→0 · recal ${fast.recalibrations}`}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Joint-angle graph overlay — a band across the bottom of the viewport. For
 * each joint n = 1..⌊T⌋ it plots the joint angle θ_n folded to [0,π]:
 *   θ_1 = 0,  θ_n = −t·ln(n/(n−1))  with t = I(T),
 *   folded = w>π ? 2π−w : w,  w = θ mod 2π   (so 0 = folded out, π = folded back).
 * Dots are spread evenly across the full visible width and colored green→red by
 * how folded they are. Polled each frame so it tracks T live (slider/animation).
 */
const GRAPH_H = 96;            // folded-out-% graph band height
const JA_GRAPH_H = 212;       // joint-angle graph band height (2× taller + label band)
// Horizontal plot padding inside the joint-angle canvas. Shared so the click
// handler can invert a pixel x back to a joint index using the same geometry
// drawJointAngles plots with.
const JA_PAD_L = 26;
const JA_PAD_R = 8;

function JointAngleGraph({ model }: { model: MainWorkspaceModel }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [enabled, setEnabled] = useState(model.getJointAngleGraphState().enabled);
  const [selecting, setSelecting] = useState(model.getJointAngleGraphState().selectionEnabled);
  // When the folded-out-% graph is also on, lift this one above it.
  const [bottom, setBottom] = useState(model.getFoldedPercentGraphState().enabled ? GRAPH_H : 0);
  // Horizontal zoom window in normalized joint-fraction space [0,1]. Wheel zooms
  // around the cursor, drag pans, double-click resets. Kept in a ref (read by the
  // draw loop) so zoom/pan don't trigger React re-renders.
  const view = useRef({ u0: 0, u1: 1 });
  const drag = useRef<{ x: number; u0: number; u1: number; moved: boolean } | null>(null);

  const clampView = (u0: number, u1: number): { u0: number; u1: number } => {
    const s = Math.min(1, Math.max(0.002, u1 - u0));
    let lo = u0; let hi = u0 + s;
    if (lo < 0) { hi -= lo; lo = 0; }
    if (hi > 1) { lo -= hi - 1; hi = 1; }
    return { u0: Math.max(0, lo), u1: hi };
  };
  // Pixel clientX → normalized u within the current view.
  const xToU = (clientX: number, canvas: HTMLCanvasElement): number => {
    const rect = canvas.getBoundingClientRect();
    const plotW = Math.max(1, rect.width - JA_PAD_L - JA_PAD_R);
    const frac = Math.min(1, Math.max(0, (clientX - rect.left - JA_PAD_L) / plotW));
    const { u0, u1 } = view.current;
    return u0 + frac * (u1 - u0);
  };

  // Wheel zoom — native listener so we can preventDefault the page scroll.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const uc = xToU(e.clientX, canvas);
      const { u0, u1 } = view.current;
      const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;   // wheel up = zoom in
      view.current = clampView(uc - (uc - u0) * factor, uc + (u1 - uc) * factor);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => { canvas.removeEventListener("wheel", onWheel); };
  }, [enabled]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    const { u0, u1 } = view.current;
    drag.current = { x: e.clientX, u0, u1, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    const d = drag.current;
    const canvas = canvasRef.current;
    if (d === null || canvas === null) return;
    const plotW = Math.max(1, canvas.getBoundingClientRect().width - JA_PAD_L - JA_PAD_R);
    const dpx = e.clientX - d.x;
    if (Math.abs(dpx) > 3) d.moved = true;
    const du = -(dpx / plotW) * (d.u1 - d.u0);
    view.current = clampView(d.u0 + du, d.u1 + du);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    const d = drag.current;
    drag.current = null;
    if (d === null || d.moved || !selecting) return;     // a click (no pan) in select mode
    const canvas = canvasRef.current;
    const st = model.getJointAngleGraphState();
    const N = Math.floor(st.index);
    if (canvas === null || N < 1) return;
    const u = xToU(e.clientX, canvas);
    const n = N === 1 ? 1 : Math.max(1, Math.min(N, Math.round(1 + u * (N - 1))));
    model.toggleJointSelectionFromGraph(n);
  };
  const onDoubleClick = (): void => { view.current = { u0: 0, u1: 1 }; };

  useEffect(() => {
    let raf = 0;
    let lastKey = "";
    const tick = (): void => {
      const st = model.getJointAngleGraphState();
      if (st.enabled !== enabled) setEnabled(st.enabled);
      if (st.selectionEnabled !== selecting) setSelecting(st.selectionEnabled);
      const off = model.getFoldedPercentGraphState().enabled ? GRAPH_H : 0;
      if (off !== bottom) setBottom(off);
      if (st.enabled) {
        const canvas = canvasRef.current;
        if (canvas !== null) {
          const sel = st.selectedJoints;
          const { u0, u1 } = view.current;
          const key = `${st.index.toFixed(6)}|${String(st.usePolyImag)}|${canvas.clientWidth}x${canvas.clientHeight}|${sel.join(",")}|${String(st.showGapJoints)}|${String(st.showFlankingJoints)}|${String(st.showIndexDivJoints)}|${String(st.fastJointAngles)}|${String(st.showFareyJoints)}|${String(st.showRecipSqrtJoints)}|${String(st.showGapEdges)}|${String(st.showMediants)}|${String(st.fareyMaxDenom)}|${String(st.showNearZeroP)}|${String(st.showPrimeCommon)}|${String(st.showConnectDots)}|${String(st.showFlipJoints)}|${String(st.showWidthGaps)}|${String(st.showWidthGaps2)}|${u0.toFixed(5)}|${u1.toFixed(5)}`;
          if (key !== lastKey) {
            lastKey = key;
            drawJointAngles(canvas, st.index, st.usePolyImag, new Set(sel), st.showGapJoints, st.showFlankingJoints, st.showIndexDivJoints, st.fastJointAngles, st.showFareyJoints, st.showRecipSqrtJoints, st.showGapEdges, st.showMediants, st.fareyMaxDenom, st.showNearZeroP, st.showPrimeCommon, st.showConnectDots, st.showFlipJoints, st.showWidthGaps, st.showWidthGaps2, u0, u1);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); };
  }, [model, enabled, selecting, bottom]);

  if (!enabled) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom,
        height: JA_GRAPH_H,
        background: "rgba(8, 10, 18, 0.72)",
        borderTop: "1px solid rgba(255,255,255,0.12)",
        // Captures wheel-zoom / drag-pan (and joint-selection clicks). The band only
        // covers the bottom of the viewport; the spiral above stays interactive.
        pointerEvents: "auto",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}
        style={{ width: "100%", height: "100%", display: "block", cursor: selecting ? "crosshair" : "grab" }}
      />
    </div>
  );
}

/**
 * Folded-out-percent graph — a band at the very bottom of the viewport. It plots
 * f_m(φ), the percentage of the spiral's joints that are folded out (folded angle
 * < π/2), as a function of φ across one unit interval of T, i.e. T from ⌊T⌋ to
 * ⌊T⌋+1. A red vertical line marks the actual current T. When the joint-angle
 * graph is also on, that one sits above this one.
 */
function FoldedPercentGraph({ model }: { model: MainWorkspaceModel }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // The folded-out-% curve depends only on the link count ⌊T⌋ (and imag mode), so
  // it is cached and recomputed only when ⌊T⌋ changes; within an interval only the
  // marker line moves.
  const curveRef = useRef<FoldedCurve | null>(null);
  const [enabled, setEnabled] = useState(model.getFoldedPercentGraphState().enabled);

  useEffect(() => {
    let raf = 0;
    let lastKey = "";
    const tick = (): void => {
      const st = model.getFoldedPercentGraphState();
      if (st.enabled !== enabled) setEnabled(st.enabled);
      if (st.enabled) {
        const canvas = canvasRef.current;
        if (canvas !== null) {
          const N = Math.floor(st.index);
          const cached = curveRef.current;
          if (cached === null || cached.N !== N || cached.usePolyImag !== st.usePolyImag) {
            curveRef.current = computeFoldedCurve(N, st.usePolyImag);
          }
          const key = `${st.index.toFixed(6)}|${String(st.usePolyImag)}|${canvas.clientWidth}x${canvas.clientHeight}`;
          if (key !== lastKey) {
            lastKey = key;
            drawFoldedPercent(canvas, curveRef.current, st.index);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); };
  }, [model, enabled]);

  if (!enabled) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: GRAPH_H,
        background: "rgba(8, 10, 18, 0.72)",
        borderTop: "1px solid rgba(255,255,255,0.12)",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}

const TWO_PI = 2 * Math.PI;
// Period palette for near-zero joints by caustic numerator p (1,2,3,4,≥5).
const NUMERATOR_COLOR_STR = ["#00e5ff", "#ffeb3b", "#e040fb", "#ff6e40", "#b0bec5"];

// ─── Calibrate-once / perturbate-many engine for the joint-angle vector ──────
// The joint angle is θ_n = fold(−t·c_n mod 2π) with c_n = ln(n/(n−1)) FIXED and
// t = I(T). The current ("scratch") path calls Math.log(n/(n−1)) for every joint
// on every frame. The fast path calibrates the wrapped phase once at N=⌊T⌋, then
// within [N,N+1) advances each joint by a single shared scalar ΔI = I(T)−I(N):
//   φ_n(T) = (φ_n(N) − ΔI·c_n) mod 2π,   c_n cached, no per-frame Math.log.
// Recalibrate when ⌊T⌋ ticks over (one new bisector joint enters). See the
// "calibrate once, perturbate many" note.

// c_n = ln(n/(n−1)) cache, grown monotonically; Math.log runs only for new n.
const JA_CVEC: number[] = [0, 0];

function jaEnsureCVec(N: number): void {
  for (let n = JA_CVEC.length; n <= N; n += 1) JA_CVEC[n] = Math.log(n / (n - 1));
}

// Calibration cache for the fast path: wrapped phase φ_n at t0 = I(N).
let jaCalN = -1;
let jaCalPoly = false;
let jaCalT0 = 0;
let jaCalPhi: Float64Array | null = null;
let jaRecalibs = 0;

function jaCalibrate(N: number, usePolyImag: boolean): void {
  jaEnsureCVec(N);
  const t0 = indexToImag(N, usePolyImag);
  const phi = new Float64Array(N + 1);
  for (let n = 2; n <= N; n += 1) {
    let w = (-t0 * JA_CVEC[n]!) % TWO_PI;
    if (w < 0) w += TWO_PI;
    phi[n] = w;
  }
  jaCalN = N; jaCalPoly = usePolyImag; jaCalT0 = t0; jaCalPhi = phi; jaRecalibs += 1;
}

// Signed angle vector via calibrate-once + perturb (no Math.log in steady state).
// Each entry is the turning angle wrapped to [−π, π] (0 = straight, ±π = reversed).
function jaSignedPerturb(index: number, usePolyImag: boolean): Float64Array {
  const N = Math.floor(index);
  if (jaCalN !== N || jaCalPoly !== usePolyImag || jaCalPhi === null) jaCalibrate(N, usePolyImag);
  const t = indexToImag(index, usePolyImag);
  const dI = t - jaCalT0;
  const phi = jaCalPhi!;
  const signed = new Float64Array(N + 1);
  for (let n = 2; n <= N; n += 1) {
    let w = (phi[n]! - dI * JA_CVEC[n]!) % TWO_PI;
    if (w < 0) w += TWO_PI;
    signed[n] = w > Math.PI ? w - TWO_PI : w;
  }
  return signed;
}

// Signed angle vector the current way: Math.log(n/(n−1)) for every joint, every call.
function jaSignedScratch(N: number, t: number): Float64Array {
  const signed = new Float64Array(N + 1);
  for (let n = 2; n <= N; n += 1) {
    let w = (-t * Math.log(n / (n - 1))) % TWO_PI;
    if (w < 0) w += TWO_PI;
    signed[n] = w > Math.PI ? w - TWO_PI : w;
  }
  return signed;
}

export type JaFastStats = {
  n: number; scratchMs: number; perturbMs: number; speedup: number; recalibrations: number;
};
let jaFastStats: JaFastStats | null = null;
export function getJaFastStats(): JaFastStats | null { return jaFastStats; }

// Micro-benchmark: times both paths (warmed) at the current T. The caller decides
// WHEN to run it — only when T actually changes, so nothing recomputes while idle.
function jaBenchmark(N: number, index: number, usePolyImag: boolean, t: number): void {
  jaEnsureCVec(N);
  if (jaCalN !== N || jaCalPoly !== usePolyImag) jaCalibrate(N, usePolyImag);
  const REPS = 20;
  const s0 = performance.now();
  for (let r = 0; r < REPS; r += 1) jaSignedScratch(N, t);
  const scratchMs = (performance.now() - s0) / REPS;
  const p0 = performance.now();
  for (let r = 0; r < REPS; r += 1) jaSignedPerturb(index, usePolyImag);
  const perturbMs = (performance.now() - p0) / REPS;
  jaFastStats = {
    n: N, scratchMs, perturbMs,
    speedup: perturbMs > 0 ? scratchMs / perturbMs : 0,
    recalibrations: jaRecalibs,
  };
}

function drawJointAngles(
  canvas: HTMLCanvasElement,
  index: number,
  usePolyImag: boolean,
  selected: Set<number> = new Set(),
  gapJoints = false,
  flankingJoints = false,
  indexDivJoints = false,
  fast = false,
  fareyJoints = false,
  recipSqrtJoints = false,
  gapEdges = false,
  mediants = false,
  fareyMaxDenom = 6,
  nearZeroP = false,
  primeCommon = false,
  connectDots = false,
  flipJoints = false,
  widthGaps = false,
  widthGaps2 = false,
  u0 = 0,
  u1 = 1,
): void {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  if (W <= 0 || H <= 0) return;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext("2d");
  if (ctx === null) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const PI = Math.PI;
  // padT leaves a band at the top for the Farey p/q labels above the plot.
  const padL = JA_PAD_L, padR = JA_PAD_R, padT = 24, padB = 8;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  // y: signed angle in [−π, π] → +π at top, 0 mid, −π at bottom.
  const yOf = (a: number) => padT + ((PI - a) / (2 * PI)) * plotH;

  const N = Math.floor(index);
  if (N < 1) return;
  // x: joint n (1-based) via normalized fraction u=(n−1)/(N−1), seen through the
  // horizontal zoom window [u0,u1] (u0=0,u1=1 is the full range).
  const span = u1 - u0;
  const uOf = (n: number) => (N > 1 ? (n - 1) / (N - 1) : 0.5);
  const xOf = (n: number) => padL + ((uOf(n) - u0) / span) * plotW;
  const visible = (n: number): boolean => { const u = uOf(n); return u >= u0 - 1e-9 && u <= u1 + 1e-9; };

  // Gridlines + labels at −π, −π/2, 0, π/2, π (0 line emphasized).
  ctx.fillStyle = "rgba(200,208,232,0.6)";
  ctx.font = "9px var(--font-mono, monospace)";
  ctx.textBaseline = "middle";
  const grid: Array<{ v: number; label: string }> = [
    { v: PI, label: "π" },
    { v: PI / 2, label: "π/2" },
    { v: 0, label: "0" },
    { v: -PI / 2, label: "−π/2" },
    { v: -PI, label: "−π" },
  ];
  for (const { v, label } of grid) {
    const y = yOf(v);
    ctx.strokeStyle = v === 0 ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)";
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(label, padL - 4, y);
  }

  const t = indexToImag(index, usePolyImag);

  // Joint-angle vector: fast (calibrate once / perturb) when the toggle is on and
  // T>1000, else the from-scratch Math.log-per-joint path. Each entry is the
  // signed turning angle in [−π,π]; signed[1]=0 (n=1 carries no bend).
  const useFast = fast && N > 1000;
  const signed = useFast ? jaSignedPerturb(index, usePolyImag) : jaSignedScratch(N, t);

  // Connect consecutive joint dots with a broken polyline (under the dots), lifting
  // the pen on any ±π wrap (so a bottom dot never joins a top dot) or off-screen gap.
  if (connectDots) {
    ctx.strokeStyle = "rgba(180,200,230,0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    let prevA = 0; let prevVisible = false;
    for (let n = 1; n <= N; n += 1) {
      const a = n === 1 ? 0 : signed[n]!;
      const vis = visible(n);
      if (vis) {
        const x = xOf(n), y = yOf(a);
        if (prevVisible && Math.abs(a - prevA) <= PI) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      prevA = a; prevVisible = vis;
    }
    ctx.stroke();
  }

  let belowHalf = 0;
  for (let n = 1; n <= N; n += 1) {
    const a = n === 1 ? 0 : signed[n]!;
    if (Math.abs(a) < PI / 2) belowHalf += 1;
    if (!visible(n)) continue;
    const x = xOf(n);
    const y = yOf(a);
    // green (straight, |a|=0) → red (reversed, |a|=π)
    const hue = 120 * (1 - Math.abs(a) / PI);
    ctx.fillStyle = `hsl(${hue}, 85%, 55%)`;
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, TWO_PI);
    ctx.fill();
    // Ring any joint the user has highlighted in the spiral (graph dot n ↔ joint n−1).
    if (selected.has(n - 1)) {
      ctx.strokeStyle = "#ff3030";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, TWO_PI);
      ctx.stroke();
    }
  }
  // Telescoping sum of all joint angles: Σ θ_n = −t·ln N (shown top-left below).
  const thetaSum = N >= 2 ? -t * Math.log(N) : 0;

  // Signed turning angle in [−π,π] for an arbitrary joint n (used by the markers).
  const signedAngle = (n: number): number => {
    const a = n <= 1 ? 0 : -t * Math.log(n / (n - 1));
    let w = a % TWO_PI; if (w < 0) w += TWO_PI;
    return w > PI ? w - TWO_PI : w;
  };

  // Gap joints (blue circles): the caustic centers n_k = round(√(t/2πk)), the
  // rightmost 9 (k=1…9). These are the consistent vertical gaps in the dot
  // pattern; the same joints are highlighted blue in the spiral viewer.
  if (gapJoints) {
    ctx.strokeStyle = "#2979ff";
    ctx.lineWidth = 2;
    for (let k = 1; k <= 9; k += 1) {
      const dk = Math.round(Math.sqrt(t / (TWO_PI * k)));
      if (dk < 1 || dk > N || !visible(dk)) continue;
      ctx.beginPath();
      ctx.arc(xOf(dk), yOf(signedAngle(dk)), 5.5, 0, TWO_PI);
      ctx.stroke();
    }
  }

  // Flanking near-zero joints (green circles): the nearest near-zero joint on each
  // side of every Farey caustic center. Same joints are green rings in the spiral.
  if (flankingJoints) {
    ctx.strokeStyle = "#19c37d";
    ctx.lineWidth = 2;
    for (const nn of flankingNearZeroJointNumbers(t, index, fareyMaxDenom)) {
      if (nn < 1 || nn > N || !visible(nn)) continue;
      ctx.beginPath();
      ctx.arc(xOf(nn), yOf(signedAngle(nn)), 6, 0, TWO_PI);
      ctx.stroke();
    }
  }

  // Index/j locked joints (orange circles): n = round(T/j) for j=2,3,4. Same
  // joints are highlighted orange in the spiral viewer.
  if (indexDivJoints) {
    ctx.strokeStyle = "#ff8c00";
    ctx.lineWidth = 2;
    for (let j = 2; j <= 4; j += 1) {
      const nn = Math.round(index / j);
      if (nn < 2 || nn > N || !visible(nn)) continue;
      ctx.beginPath();
      ctx.arc(xOf(nn), yOf(signedAngle(nn)), 6.5, 0, TWO_PI);
      ctx.stroke();
    }
  }

  // Farey √-scaled joints (thin blue vertical lines): joint ⌈√(p/q)·T⌉ for the
  // first ⌊√T/π⌋ Farey fractions p/q. Same joints get blue circles in the spiral.
  if (fareyJoints) {
    ctx.lineWidth = 1;
    ctx.font = "9px var(--font-mono, monospace)";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    for (const { p, q } of fareyScaledJoints(index, fareyMaxDenom)) {
      const v = causticJoint(p / q, index);   // accurate, T-dependent caustic position (not snapped)
      if (v < 1 || v > N || !visible(v)) continue;
      const fx = xOf(v);
      ctx.strokeStyle = "#2979ff";
      ctx.beginPath();
      ctx.moveTo(fx, padT);
      ctx.lineTo(fx, padT + plotH);
      ctx.stroke();
      ctx.fillStyle = "#7fb0ff";        // p/q label at the top of the line
      ctx.fillText(`${p}/${q}`, fx, padT - 2);
    }
    ctx.textBaseline = "middle";
  }

  // Mediants between Farey joints (red vertical lines + (a+c)/(b+d) label).
  if (mediants) {
    ctx.lineWidth = 1;
    ctx.font = "9px var(--font-mono, monospace)";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    for (const { p, q } of mediantJoints(index, fareyMaxDenom)) {
      const v = causticJoint(p / q, index);   // accurate, T-dependent caustic position (not snapped)
      if (v < 1 || v > N || !visible(v)) continue;
      const fx = xOf(v);
      ctx.strokeStyle = "#ff3030";
      ctx.beginPath();
      ctx.moveTo(fx, padT);
      ctx.lineTo(fx, padT + plotH);
      ctx.stroke();
      ctx.fillStyle = "#ff8080";
      ctx.fillText(`${p}/${q}`, fx, padT - 2);
    }
    ctx.textBaseline = "middle";
  }

  // Near-zero joints coloured by caustic numerator p (period 1/2/3/4/≥5).
  if (nearZeroP) {
    ctx.lineWidth = 2;
    for (const { n, p } of nearZeroByNumerator(t, index, fareyMaxDenom)) {
      if (n < 1 || n > N || !visible(n)) continue;
      ctx.strokeStyle = NUMERATOR_COLOR_STR[Math.min(p, 5) - 1]!;
      ctx.beginPath();
      ctx.arc(xOf(n), yOf(signedAngle(n)), 5, 0, TWO_PI);
      ctx.stroke();
    }
  }

  // 1/√n-scaled joints (thin red vertical lines): joint ⌈T/√n⌉ for n=1..⌊√T⌋.
  if (recipSqrtJoints) {
    ctx.strokeStyle = "#ff3030";
    ctx.lineWidth = 1;
    for (const n of recipSqrtJointNumbers(index)) {
      if (n < 1 || n > N || !visible(n)) continue;
      const fx = xOf(n);
      ctx.beginPath();
      ctx.moveTo(fx, padT);
      ctx.lineTo(fx, padT + plotH);
      ctx.stroke();
    }
  }

  // Symmetric gap edges of the 1/k caustics (thin purple vertical lines): n_c*±δ.
  if (gapEdges) {
    ctx.strokeStyle = "#b060ff";
    ctx.lineWidth = 1;
    for (const n of gapEdgeJointNumbers(t, index)) {
      if (n < 1 || n > N || !visible(n)) continue;
      const fx = xOf(n);
      ctx.beginPath();
      ctx.moveTo(fx, padT);
      ctx.lineTo(fx, padT + plotH);
      ctx.stroke();
    }
  }

  // Prime-factors-common-with-⌊T⌋ joints (thin amber lines): gcd(j, N) > 1.
  if (primeCommon) {
    ctx.strokeStyle = "rgba(224,176,32,0.45)";
    ctx.lineWidth = 1;
    for (const n of primeFactorCommonJoints(index)) {
      if (n < 1 || n > N || !visible(n)) continue;
      const fx = xOf(n);
      ctx.beginPath();
      ctx.moveTo(fx, padT);
      ctx.lineTo(fx, padT + plotH);
      ctx.stroke();
    }
  }

  // Formula gap-edge joints (white circles): edges of the 1/1,1/2,1/3,1/4 caustics.
  if (widthGaps) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    for (const n of widthGapJoints(index)) {
      if (n < 1 || n > N || !visible(n)) continue;
      ctx.beginPath();
      ctx.arc(xOf(n), yOf(signedAngle(n)), 6, 0, TWO_PI);
      ctx.stroke();
    }
  }

  // Formula gap-edge joints 2 (yellow circles): edges of the 2/5,3/5,2/3 caustics.
  if (widthGaps2) {
    ctx.strokeStyle = "#ffff00";
    ctx.lineWidth = 2;
    for (const n of widthGapJoints2(index)) {
      if (n < 1 || n > N || !visible(n)) continue;
      ctx.beginPath();
      ctx.arc(xOf(n), yOf(signedAngle(n)), 6, 0, TWO_PI);
      ctx.stroke();
    }
  }

  // Flip joints: overlay a left↔right mirrored copy of the plot region onto itself
  // (so everything is shown twice — original + mirror). The plot is mostly
  // transparent, so source-over lets both show through. Done before the readout so
  // the corner text stays un-mirrored. Works in device pixels (identity transform).
  if (flipJoints) {
    const SX = Math.round(padL * dpr), SY = Math.round(padT * dpr);
    const SW = Math.round(plotW * dpr), SH = Math.round(plotH * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save();
    ctx.translate(SX + SW, SY);
    ctx.scale(-1, 1);
    ctx.drawImage(canvas, SX, SY, SW, SH, 0, 0, SW, SH);
    ctx.restore();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Readout: count, T, % of joints with |θ|<π/2, and the horizontal zoom factor.
  const pctBelow = (belowHalf / N) * 100;
  ctx.fillStyle = "rgba(200,208,232,0.7)";
  ctx.textAlign = "right";
  const zoomTag = span < 0.999 ? ` · ${(1 / span).toFixed(1)}×` : "";
  ctx.fillText(`θ∈[−π,π] · N=${N} · T=${index.toFixed(3)} · |θ|<π/2: ${pctBelow.toFixed(1)}%${zoomTag}`, W - padR, padT + 2);

  // Sum of all joint angles θ_n (telescopes to −t·ln N), shown at top-left.
  const tsStr = Math.abs(thetaSum) >= 1e4 ? thetaSum.toExponential(4) : thetaSum.toFixed(3);
  ctx.textAlign = "left";
  ctx.fillText(`theta sum = ${tsStr}`, padL, padT + 2);
}

/** Percentage of joints n = 1..N that are folded out (folded angle < π/2) at imag part t. */
function foldedOutPercent(N: number, t: number): number {
  let below = 0;
  for (let n = 1; n <= N; n += 1) {
    const theta = n === 1 ? 0 : -t * Math.log(n / (n - 1));
    let w = theta % TWO_PI;
    if (w < 0) w += TWO_PI;
    const folded = w > Math.PI ? TWO_PI - w : w;
    if (folded < Math.PI / 2) below += 1;
  }
  return (below / N) * 100;
}

type FoldedCurve = {
  N: number; usePolyImag: boolean; pct: Float64Array; lo: number; hi: number;
  mean: number; c3re: number; c3im: number;   // q=3 Fourier coefficient, for the overlay
};

/**
 * Compute f_m(φ) across the unit interval [N, N+1] with N links held fixed. Heavy
 * (O(samples × N)); the curve depends only on N and the imag mode, so this is
 * cached and called only when ⌊T⌋ (or the mode) changes — not on slider moves.
 */
function computeFoldedCurve(N: number, usePolyImag: boolean): FoldedCurve | null {
  if (N < 1) return null;
  // Adaptive sample count so very large spirals stay responsive on a floor change.
  const SAMPLES = N > 8000 ? 700 : 1500;
  const pct = new Float64Array(SAMPLES + 1);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i <= SAMPLES; i += 1) {
    const p = foldedOutPercent(N, indexToImag(N + i / SAMPLES, usePolyImag));
    pct[i] = p;
    if (p < lo) lo = p;
    if (p > hi) hi = p;
  }
  lo = Math.floor(lo - 2);
  hi = Math.ceil(hi + 2);
  if (hi - lo < 6) { const mid = (hi + lo) / 2; lo = mid - 3; hi = mid + 3; }
  // q=3 Fourier coefficient (DFT over the periodic SAMPLES points) for the overlay wave.
  let mean = 0, c3re = 0, c3im = 0;
  for (let i = 0; i < SAMPLES; i += 1) {
    const p = pct[i] ?? 0;
    mean += p;
    const ang = (-TWO_PI * 3 * i) / SAMPLES;
    c3re += p * Math.cos(ang);
    c3im += p * Math.sin(ang);
  }
  mean /= SAMPLES; c3re /= SAMPLES; c3im /= SAMPLES;
  return { N, usePolyImag, pct, lo, hi, mean, c3re, c3im };
}

/**
 * Cheap redraw of the cached curve plus a marker line at the current T. Called on
 * every T change to move the line; does no per-joint computation (the "now" value
 * is read off the cached curve by interpolation).
 */
function drawFoldedPercent(canvas: HTMLCanvasElement, curve: FoldedCurve | null, index: number): void {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  if (W <= 0 || H <= 0) return;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext("2d");
  if (ctx === null) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (curve === null) return;

  const { N, pct, lo, hi, mean, c3re, c3im } = curve;
  const SAMPLES = pct.length - 1;
  const frac = index - N;

  const padL = 30, padR = 8, padT = 14, padB = 8;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const yOf = (p: number) => padT + (1 - (p - lo) / (hi - lo)) * plotH;
  const xOf = (phi: number) => padL + phi * plotW;

  // Gridlines + labels (lo, hi, and 50 if in range).
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.fillStyle = "rgba(200,208,232,0.6)";
  ctx.font = "9px var(--font-mono, monospace)";
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  const ticks = [lo, hi];
  if (50 >= lo && 50 <= hi) ticks.push(50);
  for (const v of ticks) {
    const y = yOf(v);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    ctx.fillText(`${v.toFixed(0)}%`, padL - 4, y);
  }

  // The cached folded-out-% curve.
  ctx.beginPath();
  let started = false;
  for (let i = 0; i <= SAMPLES; i += 1) {
    const p = pct[i];
    if (p === undefined) continue;
    const x = xOf(i / SAMPLES);
    const y = yOf(p);
    if (started) ctx.lineTo(x, y); else { ctx.moveTo(x, y); started = true; }
  }
  ctx.strokeStyle = "#1f9ee8";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // q=3 component for this floor(T), superimposed (thin orange) — mean + 2 Re(C₃ e^{2πi·3φ}).
  ctx.beginPath();
  const Q3N = 120;
  for (let i = 0; i <= Q3N; i += 1) {
    const th = (TWO_PI * 3 * i) / Q3N;
    const v = mean + 2 * (c3re * Math.cos(th) - c3im * Math.sin(th));
    const x = xOf(i / Q3N);
    const y = yOf(v);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "#ffa726";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Marker line at the current T (just moves; no recompute).
  const xc = xOf(frac);
  ctx.strokeStyle = "#ff5252";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(xc, padT); ctx.lineTo(xc, padT + plotH); ctx.stroke();

  // Readout: current value read off the cached curve by linear interpolation.
  const fi = frac * SAMPLES;
  const i0 = Math.min(Math.max(Math.floor(fi), 0), SAMPLES);
  const i1 = Math.min(i0 + 1, SAMPLES);
  const a = fi - i0;
  const nowPct = (pct[i0] ?? 50) * (1 - a) + (pct[i1] ?? 50) * a;
  ctx.fillStyle = "rgba(200,208,232,0.7)";
  ctx.textAlign = "right";
  ctx.fillText(`folded-out % · T∈[${N}, ${N + 1}] · now ${nowPct.toFixed(1)}%`, W - padR, 6);
}

/**
 * Mounts the main workspace orthographic viewport using the active route model.
 */
export function MainWorkspaceViewport() {
  const { model } = useVisualizationRuntime();
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 0 }}>
      <ViewportCanvas controller={model.getSceneController()} />
      {model instanceof MainWorkspaceModel && <PerfOverlay model={model} />}
      {model instanceof MainWorkspaceModel && <JointAngleGraph model={model} />}
      {model instanceof MainWorkspaceModel && <FoldedPercentGraph model={model} />}
    </div>
  );
}

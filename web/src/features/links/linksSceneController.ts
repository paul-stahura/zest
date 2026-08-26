import type { Point2 } from "@/shared/io/types";
import { computeZakSpiralGeometry } from "@/shared/math/zakCalculator";
import { toLinkFrame, thinRange, sampledLinkNumbers, chainPointBudget } from "@/features/links/linksFrame";
import {
  crossingLink,
  crossingScale,
  forwardChain,
  inverseChain,
  reflectedInverseChain,
  spanLinkRange,
  jointsForLinkRange,
  type Chain,
} from "@/features/links/linksChains";
import {
  budgetedCrossingSweep,
  crossingEndsForLinks,
  crossingOffset,
  yinAwaySweep,
  yinYangLoops,
  yinYangInBisectorFrame,
  type CrossingEndLoops,
  type CrossingEnds,
} from "@/features/links/linksYinYang";
import {
  overlayView,
  overlayCrossingInverseLinks,
  overlayForwardJoints,
  overlayInverseJoints,
  overlayToScreen,
  psLegs,
  sum1xJoints,
  sum2xJoints,
  MAIN_FORWARD_COLOR,
  MAIN_INVERSE_REFLECT_COLOR,
  OVERLAY_CROSSING_COLOR,
  OVERLAY_SUM2X_COLOR,
  type OverlayView,
} from "@/features/links/linksOverlay";
import {
  followerAngleVisible,
  pickFollowerLink,
  type FollowerPick,
} from "@/features/links/linksFollower";
import type { SceneController } from "@/shared/visualization/contracts";

/** Read-only view of the model that the controller samples every frame. */
export type LinksViewSource = {
  getSigma(): number;
  getIndex(): number;
  setIndex(v: number): void;
  getUsePolyImag(): boolean;
  getAnimSpeed(): number;
  getInverseReflect(): boolean;
  getShowBisectorFollower(): boolean;
  getShowMainSpiral(): boolean;
  getShowSumX(): boolean;
  getShowSum2x(): boolean;
  getForwardLinks(): ForwardLinksMode;
  getInverseLinks(): InverseLinksMode;
  getYinYangOnBisector(): boolean;
  getYinYangOffBisector(): boolean;
  getYinExtend(): boolean;
  getYangExtend(): boolean;
};

/** Which forward links each strip draws, beyond the frame's own link. */
export type ForwardLinksMode = "none" | "all" | "toBisector" | "eitherSide";
/** Which links of the reflected inverse spiral each strip draws. */
export type InverseLinksMode = "all" | "bisectorToEnd" | "span" | "oneCrossing";
/** Fraction of a slot's width taken by the link at zoom 1, the same in every slot. */
const BASE_UNIT_FRACTION = 0.8;
/** A slot narrower than this is unreadable, so links get sampled instead of all drawn. */
const MIN_SLOT_PX = 2;
/** Cap on links walked in either chain; the first spiral turn ends near 2T(T+1). */
const MAX_CHAIN_LINKS = 20000;

const FORWARD_COLOR = "rgba(102, 217, 255, 0.55)";
const FRAME_LINK_COLOR = "#ffffff";
const INVERSE_COLOR = "rgba(255, 149, 128, 0.85)";
const SPAN_COLOR = "#ffd54a";
const SEPARATOR_COLOR = "rgba(255, 255, 255, 0.08)";
const LABEL_COLOR = "rgba(255, 255, 255, 0.45)";
const BISECTOR_TINT = "rgba(120, 200, 255, 0.06)";
const YIN_COLOR = "#33dd66";
const YANG_COLOR = "#ff3333";
/** Copied bisector chord, yellow so it reads apart from the gold span band. */
const FOLLOWER_CHORD_COLOR = "#ffe14a";
/** Reverse link of the same slope as that chord, or the closest in the span. */
const FOLLOWER_COLOR = "#ff7f0e";
/** Yin wing: green pulled toward blue, so it reads as a continuation of the green piece. */
const YIN_EXT_COLOR = "#2ec4a8";
/** Yang wing: red pulled toward blue, a purple that sits on the red side. */
const YANG_EXT_COLOR = "#b050e8";
/** Samples along one loop of the yin curve. */
const YIN_SAMPLES = 256;
/** Height of the row of crossing-offset graphs under the strips. */
const OFFSET_BAND_H = 144;
/** How far the band's y-axis (crossing fraction) can be magnified. X stays the unit of T. */
const MAX_BAND_ZOOM = 80;
/** Strip height to keep before the offset band is given any room at all. */
const MIN_STRIPS_H = 160;
const BAND_MID_COLOR = "rgba(255, 255, 255, 0.14)";
const BAND_EDGE_COLOR = "rgba(255, 255, 255, 0.07)";
/** Chain steps one rebuild of the loci may spend, which the sweep turns into sample rates. */
const CURVE_WALK_BUDGET = 800_000;
/** Stands in for the curve set when no strip is drawing curves. */
const EMPTY_LOOPS: Map<number, CrossingEndLoops> = new Map();
/** How far shift+wheel can widen the row of strips. */
const MAX_STRIP_ZOOM = 5000;

/**
 * Canvas2D controller for the Links tab: one vertical slot per forward link of Σ₁, link 1 on
 * the left and the bisector link ⌊T⌋ on the right. Each slot shows the chains as seen from
 * that link's own frame, the frame being the similarity that carries the link onto the
 * segment 0→1 of the x-axis, so every slot is drawn in units of its own link length.
 */
export class LinksSceneController implements SceneController {
  private readonly source: LinksViewSource;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private cssW = 0;
  private cssH = 0;
  private dpr = 1;

  /** View inside every slot, shared so the slots stay comparable: zoom about the link, pan in link units. */
  private zoom = 1;
  private panX = 0;
  private panY = 0;

  /** View of the row of strips itself: shift+wheel widens the strips, shift+drag slides the row. */
  private stripZoom = 1;
  private stripPanPx = 0;

  /**
   * View of the offset band: y is the crossing fraction, x is {T} on [0, 1]. Wheel with the
   * cursor in the band magnifies y only, about the value under the cursor.
   */
  private bandZoom = 1;
  private bandPan = 0;

  /** Crossing-end loci, held for as long as they stand: see {@link crossingLoops}. */
  private curveKey = "";
  private curveLoops: Map<number, CrossingEndLoops> = new Map();
  /** Yin and yang wings past the away end of each green/red piece, held until σ or ⌊T⌋ moves. */
  private extKey = "";
  private extLoops: Map<number, CrossingEndLoops> = new Map();

  private lastTime = 0;
  private smoothedAnimSpeed = 0;
  private lastKey = "";
  private lastPxPerUnit = 0;
  private dragging = false;
  private draggingRow = false;
  private draggingBand = false;
  private dragPointerX = 0;
  private dragPointerY = 0;

  /** Throttled toolbox refresh while T is animating. Set by the model. */
  public onAnimatingFrame: (() => void) | null = null;

  public constructor(source: LinksViewSource) {
    this.source = source;
  }

  public mount(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerUp);
    canvas.addEventListener("dblclick", this.onDoubleClick);
    canvas.style.cursor = "grab";
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
    this.lastKey = "";
  }

  public frame(time: number): void {
    // Same inverse-square animation feel as the other tabs: faster at low T, slower at high T.
    const deltaMs = this.lastTime > 0 ? Math.min(50, time - this.lastTime) : 0;
    this.lastTime = time;
    const targetSpeed = this.source.getAnimSpeed();
    if (deltaMs > 0) {
      const k = 1 - Math.exp(-deltaMs / 120);
      this.smoothedAnimSpeed += (targetSpeed - this.smoothedAnimSpeed) * k;
      if (targetSpeed === 0 && Math.abs(this.smoothedAnimSpeed) < 1e-4) this.smoothedAnimSpeed = 0;
    }
    const animSpeed = this.smoothedAnimSpeed;
    if (Math.abs(animSpeed) > 0.0001 && deltaMs > 0) {
      const index = this.source.getIndex();
      const speedPerFrame = (animSpeed * animSpeed) * 0.001 / (index + 1);
      this.source.setIndex(index + speedPerFrame * Math.sign(animSpeed) * (deltaMs / 16.667));
      this.lastKey = "";
      this.onAnimatingFrame?.();
    }
    this.draw();
  }

  /** Force a redraw on the next frame (state changed outside the sampled parameters). */
  public invalidate(): void { this.lastKey = ""; }

  public dispose(): void {
    const c = this.canvas;
    if (c !== null) {
      c.removeEventListener("wheel", this.onWheel);
      c.removeEventListener("pointerdown", this.onPointerDown);
      c.removeEventListener("pointermove", this.onPointerMove);
      c.removeEventListener("pointerup", this.onPointerUp);
      c.removeEventListener("pointerleave", this.onPointerUp);
      c.removeEventListener("dblclick", this.onDoubleClick);
    }
    this.canvas = null;
    this.ctx = null;
  }

  // ─── input ────────────────────────────────────────────────────────────────────

  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    const rect = this.canvas?.getBoundingClientRect();
    if (e.shiftKey) {
      // Widen the strips themselves, holding the strip under the cursor in place.
      const cursorX = e.clientX - (rect?.left ?? 0);
      const next = Math.min(MAX_STRIP_ZOOM, Math.max(1, this.stripZoom * factor));
      this.stripPanPx = anchoredStripPan(cursorX, this.stripPanPx, this.stripZoom, next);
      this.stripZoom = next;
      this.clampStripPan();
    } else if (this.pointerInBand(e.clientY)) {
      // The band's x-axis is the unit of T and stays [0, 1]; only the crossing-fraction
      // axis magnifies, holding the value under the cursor still.
      const cursorY = e.clientY - (rect?.top ?? 0);
      const bandH = offsetBandHeight(this.cssH);
      const stripsH = this.cssH - bandH;
      const next = Math.min(MAX_BAND_ZOOM, Math.max(1, this.bandZoom * factor));
      this.bandPan = clampBandPan(
        anchoredBandPan(cursorY, stripsH, bandH, this.bandPan, this.bandZoom, next),
        next,
      );
      this.bandZoom = next;
    } else {
      this.zoom = Math.min(200, Math.max(0.05, this.zoom * factor));
    }
    this.lastKey = "";
  };

  private readonly onPointerDown = (e: PointerEvent): void => {
    this.dragging = true;
    this.draggingRow = e.shiftKey;
    this.draggingBand = !e.shiftKey && this.pointerInBand(e.clientY);
    this.dragPointerX = e.clientX;
    this.dragPointerY = e.clientY;
    this.canvas?.setPointerCapture(e.pointerId);
    if (this.canvas !== null) this.canvas.style.cursor = "grabbing";
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    const dx = e.clientX - this.dragPointerX;
    const dy = e.clientY - this.dragPointerY;
    this.dragPointerX = e.clientX;
    this.dragPointerY = e.clientY;
    if (this.draggingRow) {
      this.stripPanPx += dx;
      this.clampStripPan();
    } else if (this.draggingBand) {
      const bandH = offsetBandHeight(this.cssH);
      const { usable } = bandUsable(bandH);
      this.bandPan = clampBandPan(this.bandPan + dy / (usable * this.bandZoom), this.bandZoom);
    } else {
      const pxPerUnit = this.lastPxPerUnit;
      if (pxPerUnit <= 0) return;
      this.panX += dx / pxPerUnit;
      this.panY -= dy / pxPerUnit;
    }
    this.lastKey = "";
  };

  private readonly onPointerUp = (): void => {
    this.dragging = false;
    this.draggingRow = false;
    this.draggingBand = false;
    if (this.canvas !== null) this.canvas.style.cursor = "grab";
  };

  private readonly onDoubleClick = (): void => {
    this.resetView();
  };

  /** Back to defaults: both zooms and both pans, inside the strips and across the row. */
  public resetView(): void {
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.stripZoom = 1;
    this.stripPanPx = 0;
    this.bandZoom = 1;
    this.bandPan = 0;
    this.lastKey = "";
  }

  /** True when the pointer is over the crossing-fraction graphs, not the strips above. */
  private pointerInBand(clientY: number): boolean {
    const bandH = offsetBandHeight(this.cssH);
    if (bandH <= 0) return false;
    const top = this.canvas?.getBoundingClientRect().top ?? 0;
    const y = clientY - top;
    const stripsH = this.cssH - bandH;
    return y >= stripsH && y <= this.cssH;
  }

  /** Keeps the row of strips from being dragged off the canvas. */
  private clampStripPan(): void {
    const rowW = this.cssW * this.stripZoom;
    this.stripPanPx = Math.max(Math.min(0, this.cssW - rowW), Math.min(0, this.stripPanPx));
  }

  // ─── layout ───────────────────────────────────────────────────────────────────

  /**
   * The links that get a strip: 0 … ⌊T⌋, where link k runs joints[k] → joints[k+1], so link 0
   * is the unit link out of the origin and link ⌊T⌋ is the bisector link. Sampled only when
   * the canvas cannot hold them all, and the sampled set does not depend on the row zoom, so
   * shift+wheel magnifies the same strips instead of exchanging them.
   */
  private drawnLinkNumbers(m: number): number[] {
    return sampledLinkNumbers(m, this.cssW / MIN_SLOT_PX);
  }

  /** Width of the whole row of strips, which shift+wheel stretches beyond the canvas. */
  private rowWidth(): number {
    return this.cssW * this.stripZoom;
  }

  private slotWidth(count: number): number {
    return count > 0 ? this.rowWidth() / count : this.rowWidth();
  }

  // ─── drawing ──────────────────────────────────────────────────────────────────

  private draw(): void {
    const ctx = this.ctx;
    if (ctx === null || this.cssW <= 0 || this.cssH <= 0) return;

    const sigma = this.source.getSigma();
    const index = this.source.getIndex();
    const showInverse = this.source.getInverseReflect();
    const showBisectorFollower = this.source.getShowBisectorFollower();
    const showMainSpiral = this.source.getShowMainSpiral();
    const showSumX = this.source.getShowSumX();
    const showSum2x = this.source.getShowSum2x();
    const forwardMode = this.source.getForwardLinks();
    const inverseMode = this.source.getInverseLinks();
    const yinOnBisector = this.source.getYinYangOnBisector();
    const yinOffBisector = this.source.getYinYangOffBisector();
    const yinExtend = this.source.getYinExtend();
    const yangExtend = this.source.getYangExtend();
    const key = `${sigma}|${index}|${showInverse}|${showBisectorFollower}|${showMainSpiral}|${showSumX}|${showSum2x}|${forwardMode}|${inverseMode}|${yinOnBisector}|${yinOffBisector}|${yinExtend}|${yangExtend}|${this.zoom}|${this.panX}|${this.panY}|${this.stripZoom}|${this.stripPanPx}|${this.bandZoom}|${this.bandPan}|${this.cssW}x${this.cssH}|${this.dpr}`;
    if (key === this.lastKey) return;
    this.lastKey = key;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    ctx.fillStyle = "#0b0e13";
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    const m = Math.floor(index);
    if (m < 1) {
      ctx.fillStyle = LABEL_COLOR;
      ctx.font = "12px var(--font-mono, monospace)";
      ctx.fillText("T must reach 1 before there is a link to frame", 12, 20);
      return;
    }

    const usePolyImag = this.source.getUsePolyImag();
    const geom = computeZakSpiralGeometry(sigma, index);
    // The bisector frame needs joint m+1, and "either side" of it one more.
    const forwardReach = forwardMode === "all" ? MAX_CHAIN_LINKS : m + 2;
    const fwd = forwardChain(sigma, index, usePolyImag, forwardReach);
    if (fwd.joints.length < m + 2) return;
    const inv = showInverse || showBisectorFollower || showMainSpiral || showSumX
      ? reflectedInverseChain(sigma, index, usePolyImag, geom.zeta, MAX_CHAIN_LINKS)
      : null;
    const inv0 = showSum2x ? inverseChain(sigma, index, usePolyImag, MAX_CHAIN_LINKS) : null;
    // Shared by every strip: the scale a² = I(T)/2π the crossing law pairs links about.
    const scale = crossingScale(index, usePolyImag);
    // The two highlights swap in the crossing mode, where the link worth marking is the one
    // carrying the crossing rather than the band it sits in.
    const crossingColor = inverseMode === "oneCrossing" ? SPAN_COLOR : INVERSE_COLOR;
    const bandColor = inverseMode === "oneCrossing" ? INVERSE_COLOR : SPAN_COLOR;

    const links = this.drawnLinkNumbers(m);
    // One sweep of the unit of T serves both the loci drawn inside the strips and the row of
    // offset graphs under them, so every strip is swept whether or not it draws its loci.
    const sweep = this.crossingLoops(sigma, index, usePolyImag, links);
    const extSweep = yinExtend || yangExtend
      ? this.extensionLoops(sigma, index, usePolyImag, sweep)
      : EMPTY_LOOPS;
    const curveLinks = new Set(crossingEndLinks(yinOffBisector, links, m));
    const nowEnds = crossingEndsForLinks(sigma, index, usePolyImag, links, MAX_CHAIN_LINKS);
    const slotW = this.slotWidth(links.length);
    // Fixed scale: every link is drawn the same width, whatever its true length, so a slot
    // never rescales as T moves.
    const pxPerUnit = slotW * BASE_UNIT_FRACTION * this.zoom;
    this.lastPxPerUnit = pxPerUnit;
    const budget = chainPointBudget(links.length);
    const bandH = offsetBandHeight(this.cssH);
    const stripsH = this.cssH - bandH;
    const cy = stripsH / 2;
    if (inv !== null && (showMainSpiral || showSumX)) {
      if (showMainSpiral) this.strokeMainSpiralOverlay(ctx, fwd, inv, m, scale, stripsH);
      if (showSumX) this.strokeSumXOverlay(ctx, fwd, inv, m, scale, stripsH);
    }
    if (showSum2x && inv0 !== null) {
      this.strokeSum2xOverlay(ctx, fwd, inv0, m, scale, stripsH);
    }
    if (bandH > 0) this.strokeOffsetBandGuides(ctx, stripsH, bandH, this.bandZoom, this.bandPan);

    const followerNow = showBisectorFollower
      ? yinYangInBisectorFrame(sigma, index, usePolyImag)
      : null;
    const followerLoops = showBisectorFollower
      ? yinYangLoops(sigma, index, usePolyImag, YIN_SAMPLES)
      : null;
    const followerChord = followerNow === null
      ? null
      : { x: followerNow.yang.x - followerNow.yin.x, y: followerNow.yang.y - followerNow.yin.y };

    for (let i = 0; i < links.length; i++) {
      const k = links[i]!;
      const a = fwd.joints[k]!;
      const b = fwd.joints[k + 1]!;
      if (toLinkFrame(b, a, b) === null) continue;

      const slotL = i * slotW + this.stripPanPx;
      if (slotL + slotW < 0 || slotL > this.cssW) continue;
      const cx = slotL + slotW / 2;
      /** Frame coordinates (link from 0 to 1 on the x-axis) to canvas pixels. */
      const place = (u: Point2): Point2 => ({
        x: cx + (u.x - 0.5 + this.panX) * pxPerUnit,
        y: cy - (u.y + this.panY) * pxPerUnit,
      });
      const toScreen = (p: Point2): Point2 => place(toLinkFrame(p, a, b) ?? { x: 0, y: 0 });

      ctx.save();
      ctx.beginPath();
      ctx.rect(slotL, 0, slotW, stripsH);
      ctx.clip();

      if (k === m) {
        ctx.fillStyle = BISECTOR_TINT;
        ctx.fillRect(slotL, 0, slotW, stripsH);
      }

      const fwdRange = forwardRange(forwardMode, k, m, fwd.lastLink);
      this.strokeChain(ctx, fwd, fwdRange, toScreen, budget, FORWARD_COLOR, [k, k + 1]);
      const crossing = inv !== null && inverseMode === "oneCrossing"
        ? crossingLink(fwd, inv, k, scale, m)
        : null;
      const invRange = inv === null
        ? null
        : inverseRange(inverseMode, k, m, inv.lastLink, index, usePolyImag, crossing?.link ?? null);
      const spanRange = inv === null || inverseMode === "span"
        ? null
        : inverseRange("span", k, m, inv.lastLink, index, usePolyImag);
      // The inverse-links dropdown still draws its stretch while the follower
      // overlay is on, but only in the unhighlighted coral. Gold span, yellow
      // crossing, and the extra thickness stay off so the orange follower is
      // the only reverse link that is marked.
      if (inv !== null && invRange !== null && (showBisectorFollower || inverseMode !== "oneCrossing")) {
        const range = inverseMode === "span" ? jointsForLinkRange(invRange.from, invRange.to) : invRange;
        this.strokeChain(ctx, inv, range, toScreen, budget, INVERSE_COLOR, [], 1);
      }
      if (!showBisectorFollower && inv !== null && spanRange !== null) {
        this.strokeChain(ctx, inv, jointsForLinkRange(spanRange.from, spanRange.to), toScreen, budget, bandColor, [], 1.8);
      }
      if (!showBisectorFollower && inv !== null && invRange !== null && inverseMode === "oneCrossing") {
        this.strokeChain(ctx, inv, invRange, toScreen, budget, crossingColor, [], 3.3);
      }
      if (!showBisectorFollower && crossing?.at != null) {
        const dot = toScreen(crossing.at);
        ctx.fillStyle = crossingColor;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      const track = sweep.get(k) ?? null;
      const now = nowEnds.get(k) ?? null;
      // Wings under green/red: each starts on that piece's away end.
      const ext = extSweep.get(k) ?? null;
      if (k !== m && ext !== null && (yinExtend || yangExtend)) {
        this.strokeCrossingEnds(ctx, place, {
          yin: yinExtend ? ext.yin : [],
          yang: yangExtend ? ext.yang : [],
          offsets: ext.offsets,
          held: ext.held,
        }, null, {
          yin: YIN_EXT_COLOR,
          yang: YANG_EXT_COLOR,
          width: 0.75,
          dash: [3, 3],
        });
      }
      if (k === m && yinOnBisector && !showBisectorFollower) {
        this.strokeYinYang(ctx, place, sigma, index, usePolyImag, true);
      }
      if (track !== null && curveLinks.has(k)) {
        this.strokeCrossingEnds(ctx, place, track, now, {
          yin: YIN_COLOR,
          yang: YANG_COLOR,
          width: 1.2,
        });
      }
      if (followerLoops !== null && followerNow !== null) {
        this.strokeYinYangLoops(ctx, place, followerLoops, followerNow, true);
        const yin = place(followerNow.yin);
        const yang = place(followerNow.yang);
        ctx.strokeStyle = FOLLOWER_CHORD_COLOR;
        ctx.lineWidth = 1.9;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(yin.x, yin.y);
        ctx.lineTo(yang.x, yang.y);
        ctx.stroke();
      }

      // The frame's own link, always full resolution and on top.
      const p0 = toScreen(a);
      const p1 = toScreen(b);
      ctx.strokeStyle = FRAME_LINK_COLOR;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();

      let followerPick: FollowerPick | null = null;
      if (showBisectorFollower && inv !== null && followerChord !== null) {
        const span = spanLinkRange(index, usePolyImag, k, m);
        const framedDir = (j: number): Point2 | null => {
          const p = inv.joints[j];
          const q = inv.joints[j + 1];
          if (p === undefined || q === undefined) return null;
          const fp = toLinkFrame(p, a, b);
          const fq = toLinkFrame(q, a, b);
          if (fp === null || fq === null) return null;
          return { x: fq.x - fp.x, y: fq.y - fp.y };
        };
        followerPick = pickFollowerLink(k, m + 1, span.from, span.to, inv.lastLink, framedDir, followerChord);
        if (followerPick !== null) {
          const p = inv.joints[followerPick.link];
          const q = inv.joints[followerPick.link + 1];
          if (p !== undefined && q !== undefined) {
            const s0 = toScreen(p);
            const s1 = toScreen(q);
            ctx.strokeStyle = FOLLOWER_COLOR;
            ctx.lineWidth = 2.5;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(s0.x, s0.y);
            ctx.lineTo(s1.x, s1.y);
            ctx.stroke();
            ctx.fillStyle = FOLLOWER_COLOR;
            ctx.beginPath();
            ctx.arc(s0.x, s0.y, 2.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(s1.x, s1.y, 2.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.restore();

      if (bandH > 0 && track !== null) {
        this.strokeOffsetTrack(ctx, slotL, slotW, stripsH, bandH, track, index, nowEnds.get(k) ?? null, this.bandZoom, this.bandPan);
      }

      if (slotW >= 6) {
        ctx.strokeStyle = SEPARATOR_COLOR;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(slotL, 0);
        ctx.lineTo(slotL, this.cssH);
        ctx.stroke();
      }
      if (slotW >= 24) {
        ctx.fillStyle = LABEL_COLOR;
        ctx.font = "10px var(--font-mono, monospace)";
        ctx.textAlign = "center";
        ctx.fillText(k === m ? `${k} (bisector)` : String(k), cx, stripsH - 6);
        ctx.textAlign = "left";
      }
      if (followerPick !== null && followerAngleVisible(followerPick) && slotW >= 20) {
        ctx.fillStyle = FOLLOWER_COLOR;
        ctx.font = "10px var(--font-mono, monospace)";
        ctx.textAlign = "center";
        ctx.fillText(`${followerPick.angleDeg.toFixed(1)}°`, cx, bandH > 0 ? 48 : 28);
        ctx.textAlign = "left";
      }
      // The band's own link numbers, since each strip carries a different stretch of the
      // inverse spiral. Walking that stretch, link number increases toward the left of the
      // frame (the start of the forward link), so the outer end sits on the left.
      const labelled = inverseMode === "span" ? invRange : spanRange;
      if (!showBisectorFollower && crossing !== null && slotW >= 16) {
        ctx.fillStyle = crossingColor;
        ctx.font = "10px var(--font-mono, monospace)";
        ctx.textAlign = "center";
        // A row above the band's own numbers, which flank it at the same height.
        ctx.fillText(String(crossing.link), cx, stripsH - (labelled !== null && slotW >= 34 ? 30 : 18));
        ctx.textAlign = "left";
      }
      if (labelled !== null && slotW >= 34) {
        ctx.fillStyle = showBisectorFollower || inverseMode === "span" ? INVERSE_COLOR : bandColor;
        ctx.font = "10px var(--font-mono, monospace)";
        ctx.textAlign = "left";
        ctx.fillText(String(labelled.to), slotL + 3, stripsH - 18);
        ctx.textAlign = "right";
        ctx.fillText(String(labelled.from), slotL + slotW - 3, stripsH - 18);
        ctx.textAlign = "left";
      }
    }

    ctx.fillStyle = LABEL_COLOR;
    ctx.font = "11px var(--font-mono, monospace)";
    const sampled = links.length < m + 1 ? `  ·  sampled ${links.length} of ${m + 1} frames` : "";
    const capped = (inv?.lastLink ?? fwd.lastLink) < fwd.lastAvailableLink && (forwardMode === "all" || inv !== null)
      ? `  ·  capped at ${MAX_CHAIN_LINKS} of ${fwd.lastAvailableLink} links`
      : "";
    ctx.fillText(
      `T = ${index.toFixed(6)}   σ = ${sigma.toFixed(3)}   links 0…${m}${sampled}${capped}`,
      10,
      16,
    );
    if (bandH > 0) {
      ctx.fillText("below: where the crossing sits along the link, 0…1, across the unit of T", 10, 32);
    }
  }

  /**
   * Strokes the bisector strip's yin loop, and its yang loop when asked, each with a dot at
   * the current T. The curves are already in link units, which is what a strip draws in.
   */
  private strokeYinYang(
    ctx: CanvasRenderingContext2D,
    place: (u: Point2) => Point2,
    sigma: number,
    index: number,
    usePolyImag: boolean,
    withYang: boolean,
  ): void {
    this.strokeYinYangLoops(
      ctx,
      place,
      yinYangLoops(sigma, index, usePolyImag, YIN_SAMPLES),
      yinYangInBisectorFrame(sigma, index, usePolyImag),
      withYang,
    );
  }

  /**
   * Same curves as {@link strokeYinYang}, from a precomputed unit walk. The follower overlay
   * copies this pair onto every shown frame, so the walk is built once per draw.
   */
  private strokeYinYangLoops(
    ctx: CanvasRenderingContext2D,
    place: (u: Point2) => Point2,
    loops: { yin: Point2[]; yang: Point2[] },
    now: { yin: Point2; yang: Point2 },
    withYang: boolean,
  ): void {
    const draw = (loop: Point2[], at: Point2, color: string): void => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < loop.length; i++) {
        const p = place(loop[i]!);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      const dot = place(at);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    };
    draw(loops.yin, now.yin, YIN_COLOR);
    if (withYang) draw(loops.yang, now.yang, YANG_COLOR);
  }

  /**
   * Strokes, in one link's frame, where the two ends of the link crossing it go as T runs
   * through the unit interval: the near end green and the far end red, as at the bisector, but
   * in pieces, since away from the bisector the crossing hands over from one link to the next
   * partway through. Dots mark the current T.
   */
  private strokeCrossingEnds(
    ctx: CanvasRenderingContext2D,
    place: (u: Point2) => Point2,
    loops: CrossingEndLoops,
    now: CrossingEnds | null,
    style: { yin: string; yang: string; width: number; dash?: number[] },
  ): void {
    const draw = (pieces: Point2[][], at: Point2 | undefined, color: string): void => {
      ctx.strokeStyle = color;
      ctx.lineWidth = style.width;
      ctx.setLineDash(style.dash ?? []);
      for (const piece of pieces) {
        ctx.beginPath();
        for (let i = 0; i < piece.length; i++) {
          const p = place(piece[i]!);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      if (at === undefined) return;
      const dot = place(at);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    };
    draw(loops.yin, now?.yin, style.yin);
    draw(loops.yang, now?.yang, style.yang);
    ctx.setLineDash([]);
  }

  /**
   * The offset band's shared frame: the rule that divides it from the strips, and the levels
   * 0, ½ and 1 of the offset, which every graph in the row is drawn against.
   */
  private strokeOffsetBandGuides(
    ctx: CanvasRenderingContext2D,
    stripsH: number,
    bandH: number,
    zoom: number,
    pan: number,
  ): void {
    ctx.strokeStyle = SEPARATOR_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, stripsH);
    ctx.lineTo(this.cssW, stripsH);
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, stripsH, this.cssW, bandH);
    ctx.clip();
    for (const level of [0, 0.5, 1]) {
      const y = offsetToY(level, stripsH, bandH, zoom, pan);
      ctx.strokeStyle = level === 0.5 ? BAND_MID_COLOR : BAND_EDGE_COLOR;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.cssW, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * One strip's graph in the band under it: how far along the link the crossing sits, from the
   * left joint, against where T is inside the unit of the index. X is always that unit, 0 to 1
   * across the strip; Y is the crossing fraction, which the band zoom magnifies.
   */
  private strokeOffsetTrack(
    ctx: CanvasRenderingContext2D,
    slotL: number,
    slotW: number,
    stripsH: number,
    bandH: number,
    track: CrossingEndLoops,
    index: number,
    now: CrossingEnds | null,
    zoom: number,
    pan: number,
  ): void {
    const toX = (at: number): number => slotL + 1 + at * Math.max(0, slotW - 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(slotL, stripsH, slotW, bandH);
    ctx.clip();

    ctx.strokeStyle = SPAN_COLOR;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    let pen = false;
    for (const { at, offset } of track.offsets) {
      if (offset === null) {
        pen = false;
        continue;
      }
      const x = toX(at);
      const y = offsetToY(offset, stripsH, bandH, zoom, pan);
      if (pen) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
      pen = true;
    }
    ctx.stroke();

    const nowOffset = now === null ? null : crossingOffset(now);
    if (nowOffset !== null) {
      const x = toX(index - Math.floor(index));
      const y = offsetToY(nowOffset, stripsH, bandH, zoom, pan);
      ctx.strokeStyle = BAND_EDGE_COLOR;
      ctx.beginPath();
      ctx.moveTo(x, stripsH);
      ctx.lineTo(x, stripsH + bandH);
      ctx.stroke();
      ctx.fillStyle = FRAME_LINK_COLOR;
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * The crossing-end loci of the strips that want them, held until σ or ⌊T⌋ moves. Each locus
   * is traced over the whole unit of the index, so running T through that unit slides the dots
   * along curves that stand still, and only the dots need recomputing per frame.
   */
  private crossingLoops(
    sigma: number,
    index: number,
    usePolyImag: boolean,
    links: number[],
  ): Map<number, CrossingEndLoops> {
    if (links.length === 0) return EMPTY_LOOPS;
    const key = `${sigma}|${Math.floor(index)}|${usePolyImag}|${links.length}|${links[0]}|${links[links.length - 1]}`;
    if (key !== this.curveKey) {
      this.curveKey = key;
      this.curveLoops = budgetedCrossingSweep(
        sigma,
        index,
        usePolyImag,
        links,
        MAX_CHAIN_LINKS,
        CURVE_WALK_BUDGET,
      );
    }
    return this.curveLoops;
  }

  /**
   * Yin and yang wings past the away end of each green/red piece. Built from the same sweep
   * those pieces use, so a piece cannot be drawn and missed.
   */
  private extensionLoops(
    sigma: number,
    index: number,
    usePolyImag: boolean,
    sweep: Map<number, CrossingEndLoops>,
  ): Map<number, CrossingEndLoops> {
    if (sweep.size === 0) return EMPTY_LOOPS;
    const key = this.curveKey;
    if (key !== this.extKey) {
      this.extKey = key;
      this.extLoops = yinAwaySweep(
        sigma,
        index,
        usePolyImag,
        sweep,
        192,
        MAX_CHAIN_LINKS,
      );
    }
    return this.extLoops;
  }

  /**
   * The Main tab's Forward and Inverse+Reflect spirals, zoomed 2× with the origin near
   * the left edge. Only the forward links through ⌊T⌋ and the inverse links from there
   * to the end of the first turn are drawn; inverse links that cross a shown forward link
   * are yellow and twice as thick. Strip zoom and pan do not move it. The forward
   * spiral is white, matching the frame link in each strip.
   */
  private strokeMainSpiralOverlay(
    ctx: CanvasRenderingContext2D,
    fwd: Chain,
    inv: Chain,
    m: number,
    scale: number,
    stripsH: number,
  ): void {
    const view = overlayView(this.cssW, stripsH);
    if (view === null) return;
    const fwdRange = overlayForwardJoints(m);
    const invLast = inv.joints.length - 1;
    const invRange = overlayInverseJoints(m, invLast);
    const crossings = overlayCrossingInverseLinks(fwd, inv, m, scale)
      .filter(link => link >= invRange.from && link + 1 <= invRange.to);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.cssW, stripsH);
    ctx.clip();
    this.strokeWorldPolyline(ctx, fwd.joints, view, MAIN_FORWARD_COLOR, fwdRange.from, fwdRange.to);
    this.strokeWorldPolyline(
      ctx,
      inv.joints,
      view,
      MAIN_INVERSE_REFLECT_COLOR,
      invRange.from,
      invRange.to,
      crossings.flatMap(link => [link, link + 1]),
    );
    for (const link of crossings) {
      this.strokeWorldPolyline(ctx, inv.joints, view, OVERLAY_CROSSING_COLOR, link, link + 1, [], 2);
    }
    ctx.restore();
  }

  /** Σ_1x: origin through the crossings of forward 0 … floor(T), ending at B1. Yellow. */
  private strokeSumXOverlay(
    ctx: CanvasRenderingContext2D,
    fwd: Chain,
    inv: Chain,
    m: number,
    scale: number,
    stripsH: number,
  ): void {
    const view = overlayView(this.cssW, stripsH);
    if (view === null) return;
    const { b1 } = psLegs(this.source.getSigma(), this.source.getIndex());
    const joints = sum1xJoints(fwd, inv, m, scale, b1);
    if (joints.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.cssW, stripsH);
    ctx.clip();
    this.strokeWorldPolyline(ctx, joints, view, OVERLAY_CROSSING_COLOR);
    ctx.restore();
  }

  /** Σ_2x: origin along χ Σ n^{s−1} through the crossings, ending at B2. Green. */
  private strokeSum2xOverlay(
    ctx: CanvasRenderingContext2D,
    fwd: Chain,
    inv0: Chain,
    m: number,
    scale: number,
    stripsH: number,
  ): void {
    const view = overlayView(this.cssW, stripsH);
    if (view === null) return;
    const { b2 } = psLegs(this.source.getSigma(), this.source.getIndex());
    const joints = sum2xJoints(inv0, fwd, m, scale, b2);
    if (joints.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.cssW, stripsH);
    ctx.clip();
    this.strokeWorldPolyline(ctx, joints, view, OVERLAY_SUM2X_COLOR);
    ctx.restore();
  }

  /** World-space polyline through {@link OverlayView}, thinned so a long first turn stays cheap. */
  private strokeWorldPolyline(
    ctx: CanvasRenderingContext2D,
    joints: Point2[],
    view: OverlayView,
    color: string,
    from = 0,
    to = joints.length - 1,
    keep: number[] = [],
    widthScale = 1,
  ): void {
    const last = joints.length - 1;
    if (last < 1) return;
    const a = Math.max(0, Math.min(last, from));
    const b = Math.max(0, Math.min(last, to));
    if (b - a < 1) return;
    const indices = thinRange(a, b, 8000, keep);
    ctx.strokeStyle = color;
    ctx.lineWidth = widthScale / this.dpr;
    ctx.beginPath();
    for (let i = 0; i < indices.length; i++) {
      const p = overlayToScreen(joints[indices[i]!]!, view);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  /**
   * Strokes one joint range of a chain in one link's frame, thinned to `budget` vertices so a
   * frame's total work stays bounded. `keep` indices survive thinning.
   */
  private strokeChain(
    ctx: CanvasRenderingContext2D,
    chain: Chain,
    range: { from: number; to: number },
    toScreen: (p: Point2) => Point2,
    budget: number,
    color: string,
    keep: number[],
    width = 1,
  ): void {
    if (range.to < range.from) return;
    const last = chain.joints.length - 1;
    const from = Math.max(0, Math.min(last, range.from));
    const to = Math.max(0, Math.min(last, range.to));
    const indices = thinRange(from, to, budget, keep);
    if (indices.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let k = 0; k < indices.length; k++) {
      const p = toScreen(chain.joints[indices[k]!]!);
      if (k === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
}

/**
 * Joint range of the forward chain drawn in the strip of link k: none of it, the whole chain,
 * everything through the bisector link, or just the neighbours k−1, k, k+1. Links are 0-based
 * (link k runs joints[k] → joints[k+1]), and an empty range leaves only the frame's own link,
 * which is drawn separately.
 */
export function forwardRange(
  mode: ForwardLinksMode,
  k: number,
  m: number,
  lastLink: number,
): { from: number; to: number } {
  if (mode === "none") return { from: 0, to: -1 };
  if (mode === "all") return { from: 0, to: lastLink };
  if (mode === "toBisector") return { from: 0, to: Math.min(lastLink, m + 1) };
  return { from: Math.max(0, k - 1), to: Math.min(lastLink, k + 2) };
}

/**
 * Range of the reflected inverse chain drawn in the strip of link k: the whole chain, the
 * part from the bisector link outward, the strip's own turn of {@link spanLinkRange} as
 * inclusive link numbers (map through {@link jointsForLinkRange} before stroking), or the
 * single crossing link as joints, which the caller has already found with
 * {@link import("@/features/links/linksChains").crossingLink}.
 */
export function inverseRange(
  mode: InverseLinksMode,
  k: number,
  m: number,
  lastLink: number,
  index: number,
  usePolyImag: boolean,
  crossing: number | null = null,
): { from: number; to: number } {
  if (mode === "all") return { from: 0, to: lastLink };
  if (mode === "bisectorToEnd") return { from: Math.max(0, m), to: lastLink };
  if (mode === "oneCrossing") {
    if (crossing === null) return { from: 0, to: -1 };
    return { from: Math.max(0, crossing), to: Math.min(lastLink, crossing + 1) };
  }
  const span = spanLinkRange(index, usePolyImag, k, m);
  return { from: Math.max(0, span.from), to: Math.min(lastLink, span.to) };
}

/**
 * Height of the row of offset graphs: a fixed band, given up entirely rather than squeezing
 * the strips below the height they need on a short canvas.
 */
export function offsetBandHeight(cssH: number): number {
  return Math.max(0, Math.min(OFFSET_BAND_H, cssH - MIN_STRIPS_H));
}

/** Padding and drawable height of the offset band, shared by the y map and its inverse. */
export function bandUsable(bandH: number): { pad: number; usable: number } {
  const pad = Math.min(6, bandH / 6);
  return { pad, usable: Math.max(1, bandH - 2 * pad) };
}

/**
 * Where a crossing fraction sits in the band. Offset 0 is the foot, 1 the head; zoom and pan
 * magnify that axis about a chosen value without touching the {T} axis.
 */
export function offsetToY(
  offset: number,
  stripsH: number,
  bandH: number,
  zoom = 1,
  pan = 0,
): number {
  const { pad, usable } = bandUsable(bandH);
  return stripsH + bandH - pad - (offset - pan) * usable * zoom;
}

/**
 * The crossing fraction under a canvas y in the band, inverse of {@link offsetToY}.
 */
export function offsetFromY(
  y: number,
  stripsH: number,
  bandH: number,
  zoom: number,
  pan: number,
): number {
  const { pad, usable } = bandUsable(bandH);
  return pan + (stripsH + bandH - pad - y) / (usable * zoom);
}

/**
 * Vertical pan after a y-zoom that must leave the crossing fraction under the cursor where it
 * is, the same rule {@link anchoredStripPan} uses across the row of strips.
 */
export function anchoredBandPan(
  cursorY: number,
  stripsH: number,
  bandH: number,
  pan: number,
  prevZoom: number,
  nextZoom: number,
): number {
  const offset = offsetFromY(cursorY, stripsH, bandH, prevZoom, pan);
  return offset - offsetFromY(cursorY, stripsH, bandH, nextZoom, 0);
}

/**
 * Keeps the visible crossing-fraction window inside [0, 1], so zooming out lands back on the
 * full band rather than empty space above or below it.
 */
export function clampBandPan(pan: number, zoom: number): number {
  const span = 1 / Math.max(zoom, 1);
  const maxPan = Math.max(0, 1 - span);
  return Math.min(maxPan, Math.max(0, pan));
}

/**
 * Which of the drawn strips get the green/red crossing-end pieces: every strip except the
 * bisector, whose pair is drawn from its closed form. Off when that checkbox is off.
 */
export function crossingEndLinks(offBisector: boolean, links: number[], m: number): number[] {
  if (!offBisector) return [];
  return links.filter(k => k !== m);
}

/**
 * The three independent yin–yang checkboxes, recovered from a saved dropdown value so an
 * older session still opens with the curves it had.
 */
export function yinYangFlagsFromLegacy(mode: string): {
  onBisector: boolean;
  offBisector: boolean;
  yinExtend: boolean;
  yangExtend: boolean;
} {
  const extension = mode === "extensionOnAllLinks";
  return {
    onBisector: mode === "yinOnBisector" || mode === "yinYangOnBisector",
    offBisector: mode === "belowBisector" || mode === "allLinks",
    yinExtend: extension,
    yangExtend: extension,
  };
}

/**
 * Horizontal offset of the row after a zoom that must leave the point under the cursor where
 * it is: the row coordinate beneath the cursor is unchanged by the rescaling.
 */
export function anchoredStripPan(
  cursorPx: number,
  panPx: number,
  prevZoom: number,
  nextZoom: number,
): number {
  const rowCoord = (cursorPx - panPx) / prevZoom;
  return cursorPx - rowCoord * nextZoom;
}

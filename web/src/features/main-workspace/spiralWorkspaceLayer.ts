import * as THREE from "three";
import { createElement, useState, useEffect } from "react";
import type { ComponentType } from "react";

import type { Point2 } from "@/shared/io/types";
import type { ToolboxContext, ToolboxSection } from "@/shared/visualization/contracts";
import {
  computeEmsSpiralGeometry,
  filterJointsForDrawMode,
  indexToImag,
  imagToIndex,
  reflectJoints,
  reverseJoints,
  type ZetaDrawMode,
  type ZetaSpiralGeometry,
} from "@/shared/math/zetaEms";
import { computeZakSpiralGeometry, chiBrian, rak } from "@/shared/math/zakCalculator";
import { computeChebyshevCurve } from "@/shared/math/chebyshevSpiralFit";
import {
  computeEtaSpiralGeometry,
  computeInverseSpiralGeometry,
  computeZPrimeSpiralGeometry,
} from "@/shared/math/spiralVariants";
import { createSpiralMatrixPanel } from "@/features/main-workspace/SpiralMatrixPanel";
import {
  crossingScale,
  forwardChain,
  inverseChain,
  reflectedInverseChain,
} from "@/features/links/linksChains";
import { crossingPartSums, psLegs, sum1xJoints, sum2xJoints } from "@/features/links/linksOverlay";
import {
  RPS1_COLOR,
  RPS2_COLOR,
} from "@/features/main-workspace/remainderWorkspaceLayer";
import {
  calcForwardSum, calcRps1, calcRps2, calcRak1, calcRHalf,
} from "@/shared/math/sumRemainders";

const EXTEND_LINK_VALUES: readonly number[] = [0, 5000, 50000, 500000];

const COLOR_LINKS_THICKNESS = 0.012;

/** Live readout of the "extend until cross" result; polls the layer 3×/s. */
export function ExtendCrossReadout(props: { get: () => string }) {
  const [txt, setTxt] = useState(props.get());
  useEffect(() => {
    const id = setInterval(() => { setTxt(props.get()); }, 300);
    return () => { clearInterval(id); };
  }, [props]);
  if (txt === "") return null;
  return createElement(
    "div",
    { className: "zest-row", style: { display: "flex" } },
    createElement(
      "span",
      {
        style: {
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontVariantNumeric: "tabular-nums",
          color: "var(--text-dim, #8a92ab)",
          marginLeft: "auto",
        },
      },
      txt,
    ),
  );
}

/** Segment AB × segment CD. Returns the intersection point (endpoints/touches
 *  included) or null. Collinear overlap is treated as no-cross. */
function segIntersect(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): [number, number] | null {
  const rX = bx - ax, rY = by - ay;
  const sX = dx - cx, sY = dy - cy;
  const denom = rX * sY - rY * sX;
  if (denom === 0) return null;
  const qpx = cx - ax, qpy = cy - ay;
  const t = (qpx * sY - qpy * sX) / denom;
  const u = (qpx * rY - qpy * rX) / denom;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return [ax + t * rX, ay + t * rY];
  return null;
}

/** Builds a thick flat rectangle along a segment. Returns null if points are coincident. */
function buildThickSegment(
  start: Point2,
  end: Point2,
  color: number,
  group: THREE.Group,
  thickness = COLOR_LINKS_THICKNESS,
  opacity = 0.5,
): THREE.Mesh | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-9) return null;
  const geom = new THREE.PlaneGeometry(len, thickness);
  const mat = new THREE.MeshBasicMaterial({
    color, side: THREE.DoubleSide,
    transparent: opacity < 1, opacity,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set((start.x + end.x) / 2, (start.y + end.y) / 2, 0.02);
  mesh.rotation.z = Math.atan2(dy, dx);
  group.add(mesh);
  return mesh;
}

/**
 * Top-of-Index row: T (editable) on the left, t (editable) on the right.
 * Both commit on blur or Enter. Editing t calls onTFromtChange which uses the
 * inverse of I(T) to obtain the corresponding T.
 */
export function IndexTRow(props: {
  indexValue: number;
  tValue: number;
  onTChange: (v: number) => void;
  onTFromtChange: (t: number) => void;
}) {
  // t is displayed with thousands separators, so it lives in a text input
  // (number inputs reject commas) and commits strip the commas back out.
  const fmtT = (v: number) =>
    v.toLocaleString("en-US", { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  const [tText, setTText] = useState(props.indexValue.toFixed(6));
  const [tValText, setTValText] = useState(fmtT(props.tValue));
  useEffect(() => { setTText(props.indexValue.toFixed(6)); }, [props.indexValue]);
  useEffect(() => { setTValText(fmtT(props.tValue)); }, [props.tValue]);
  const commitT = () => {
    const n = Number(tText);
    if (Number.isFinite(n)) props.onTChange(n);
    else setTText(props.indexValue.toFixed(6));
  };
  const commitTval = () => {
    const n = Number.parseFloat(tValText.replace(/,/g, ""));
    if (Number.isFinite(n)) props.onTFromtChange(n);
    else setTValText(fmtT(props.tValue));
  };
  return createElement(
    "div",
    { className: "zest-control" },
    createElement(
      "div",
      { className: "zest-control-row", style: { display: "flex", gap: 8 } },
      createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 4, flex: 1 } },
        createElement("span", { className: "zest-label" }, "T"),
        createElement("input", {
          type: "number",
          className: "zest-value-input",
          step: "any",
          value: tText,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setTText(e.target.value),
          onBlur: commitT,
          onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") commitT(); },
          style: { flex: 1, minWidth: 0 },
        }),
      ),
      createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 4, flex: 1 } },
        createElement("span", { className: "zest-label" }, "t"),
        createElement("input", {
          type: "text",
          inputMode: "decimal",
          className: "zest-value-input",
          value: tValText,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setTValText(e.target.value),
          onBlur: commitTval,
          onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") commitTval(); },
          style: { flex: 1, minWidth: 0 },
        }),
      ),
    ),
  );
}

/**
 * Hard-coded list of T values for known |Z|-champion peaks. The "champions" slider
 * below the index controls steps through this list, setting the app's T to the
 * chosen entry.
 */
export const CHAMPIONS_T: readonly number[] = [
  0.8084933183567438, 1.2121388654437264, 1.6210630403109352, 1.891078398064838, 2.2105933352448712, 2.681236911856858, 3.310888306556337, 3.6748582007565322, 4.736396438239571, 5.14438467965411,
  5.7578909773895335, 6.191473330423706, 7.195240398502112, 8.24880955584983, 9.692456534498575, 11.457360522251163, 12.549038209565746, 13.198151695753012, 14.313819513632794, 15.209178234680463,
  17.19700018276274, 17.4791746258109, 19.23921682499216, 21.713706717190355, 24.177540518376613, 24.72574493944785, 26.198212514576976, 32.2197008639863, 32.701359969254995, 36.22942642403466,
  36.59891769468309, 37.711590769176944, 39.44625941526852, 40.72533890403775, 41.728999331418315, 44.3622236963163, 45.206310345334984, 47.214062964337444, 59.074250544029006, 61.72752467620078,
  69.48622266939812, 89.26378791009046, 93.14961385557693, 100.22987385758228, 108.7231899971121, 110.49219934034126, 129.22162411304274, 143.3744722426313, 155.22055690218232, 203.13211655727113,
  223.21548839428286, 228.24696084180235, 287.7144873392046, 291.18498119951715, 370.73058934619377, 384.15385182025483, 403.2362700640277, 462.2332054448052, 552.7300566671795, 589.3967070983604,
  683.5031752828205, 720.7388113772427, 729.2291268346422, 928.2372014624248, 989.2803142925131, 1251.5835757971097, 1259.1482142788784, 1324.2509107319643, 1402.7415761725765, 1556.74678061389,
  1567.9787135052618, 2134.5980660118994, 2135.246635532413, 2209.7359445610455, 2426.237875085484, 2609.2156332958966, 2727.1601443636932, 2912.7446110463443, 3092.018199234413, 3607.500187484792,
  3633.717725562321, 3732.7221703445566, 3974.4044346299333, 4044.492612281772, 4351.737681516487, 4452.140161285265, 4792.243318688466, 4911.74293766582, 5257.723503255427, 5335.49911938227,
  6243.246922328253, 6889.447003981255, 7610.741661459767, 8164.456269730003, 9835.17194774725, 10022.728187476165, 10351.244134692128, 11756.837799638985, 11968.689448647932, 13760.145918068853,
  14122.231652369182, 14857.747929873933, 19079.044740796984, 22703.073547875683, 23411.31179306392, 25881.609355725086, 26056.73303002923, 28055.11040408971, 28851.22010251879, 28967.539085413715,
  33806.944385093244, 35604.74468758763, 42156.846925993574, 44157.25441549225, 45601.745086766256, 53772.73744764698, 55016.64728392712, 58576.21391808306, 59724.21337749881, 60719.24429813608,
  64309.07616245343, 65890.49675841714, 65953.82234382626, 70298.38650440543, 78469.047178134, 99968.42377944049, 112753.98471851365, 119151.74632078972, 127479.44758208958, 131652.52756959706,
  140965.4759299265, 144636.77044166892, 145577.89976863645, 162454.1467889979, 164567.85176427235, 175082.38006470999, 177429.91312500017, 197006.2208218975, 217516.63549976447, 227946.74755820452,
  254811.71107822267, 274282.74676055164, 276247.73285904166, 286049.6473075468, 302921.47071680817, 319912.8928922859, 326543.1770133147, 339201.7299099746, 359707.47455229267,
];

/**
 * Slider that steps through the CHAMPIONS_T list. Label "champions"; displays
 * the current champion number (1-indexed) and its T value beside the slider.
 * Local state holds the selected index so it stays where the user left it
 * even when T is changed elsewhere.
 */
export function ChampionsSlider(props: { onPick: (T: number) => void; currentT?: number }) {
  const [idx, setIdx] = useState(0);
  const T = CHAMPIONS_T[idx] ?? 0;
  // Snap the slider to a champion when the app's T lands on one (e.g. the user
  // clicked a champion dot in the critical strip). Tight tolerance so ordinary
  // scrubbing/animation passing nearby doesn't hijack the slider.
  const externalT = props.currentT;
  useEffect(() => {
    if (externalT === undefined) return;
    let best = -1, bestD = Infinity;
    for (let i = 0; i < CHAMPIONS_T.length; i += 1) {
      const d = Math.abs(CHAMPIONS_T[i]! - externalT);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best >= 0 && bestD <= Math.max(1e-3, 1e-6 * Math.abs(externalT))) setIdx(best);
  }, [externalT]);
  const step = (delta: number) => {
    const newIdx = Math.max(0, Math.min(CHAMPIONS_T.length - 1, idx + delta));
    if (newIdx === idx) return;
    setIdx(newIdx);
    props.onPick(CHAMPIONS_T[newIdx] ?? 0);
  };
  const arrowStyle = {
    width: 16,
    height: 16,
    padding: 0,
    lineHeight: "14px",
    fontSize: 10,
    border: "1px solid var(--border, #444)",
    borderRadius: 3,
    background: "transparent",
    color: "var(--text, #ccc)",
    cursor: "pointer",
  };
  return createElement(
    "div",
    { className: "zest-control" },
    createElement(
      "div",
      { className: "zest-control-row", style: { display: "flex", alignItems: "center", gap: 4 } },
      createElement("span", { className: "zest-label" }, "zeta champions"),
      createElement("button", { style: arrowStyle, title: "previous champion", onClick: () => { step(-1); } }, "◀"),
      createElement("button", { style: arrowStyle, title: "next champion", onClick: () => { step(1); } }, "▶"),
      createElement(
        "span",
        { className: "zest-display-value", style: { fontVariantNumeric: "tabular-nums", marginLeft: "auto" } },
        `${idx + 1}: T = ${T.toFixed(5)}`,
      ),
    ),
    createElement("input", {
      type: "range",
      value: idx,
      min: 0,
      max: CHAMPIONS_T.length - 1,
      step: 1,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const newIdx = Number(e.target.value);
        setIdx(newIdx);
        const newT = CHAMPIONS_T[newIdx] ?? 0;
        props.onPick(newT);
      },
    }),
  );
}

/**
 * Integer scroll bar (champions-slider style) for K = number of last spirals
 * whose middle link is extended. Range 0 … ⌊T⌋, step 1. Controlled by `value`.
 */
export function ExtendMiddleLinksRow(props: { value: number; max: number; onChange: (k: number) => void }) {
  const max = Math.max(0, Math.floor(props.max));
  const value = Math.max(0, Math.min(max, Math.round(props.value)));
  const arrowStyle = {
    width: 16,
    height: 16,
    padding: 0,
    lineHeight: "14px",
    fontSize: 10,
    border: "1px solid var(--border, #444)",
    borderRadius: 3,
    background: "transparent",
    color: "var(--text, #ccc)",
    cursor: "pointer",
  };
  const step = (delta: number) => {
    const k = Math.max(0, Math.min(max, value + delta));
    if (k !== value) props.onChange(k);
  };
  return createElement(
    "div",
    { className: "zest-control" },
    createElement(
      "div",
      { className: "zest-control-row", style: { display: "flex", alignItems: "center", gap: 4 } },
      createElement("span", { className: "zest-label" }, "extend mid-link of last K spirals"),
      createElement("button", { style: arrowStyle, title: "fewer spirals", onClick: () => { step(-1); } }, "◀"),
      createElement("button", { style: arrowStyle, title: "more spirals", onClick: () => { step(1); } }, "▶"),
      createElement(
        "span",
        { className: "zest-display-value", style: { fontVariantNumeric: "tabular-nums", marginLeft: "auto" } },
        `K = ${value} / ${max}`,
      ),
    ),
    createElement("input", {
      type: "range",
      value,
      min: 0,
      max,
      step: 1,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        props.onChange(Number.parseInt(e.target.value, 10) || 0);
      },
    }),
  );
}

/**
 * Slider that steps through the ζ-zeros (T-values loaded from the
 * "00 Zeta Zeros.csv" point set). Mirrors {@link ChampionsSlider}: label
 * "zeta zeros", prev/next arrows, and a readout of the zero number + its T.
 */
export function ZerosSlider(props: { onPick: (T: number) => void; currentT?: number }) {
  const [zeros, setZeros] = useState<number[]>([]);
  const [idx, setIdx] = useState(0);
  // Snap to a zero when the app's T lands on one (e.g. clicking a zero dot in
  // the critical strip). Binary search since the zero list is sorted ascending.
  const externalT = props.currentT;
  useEffect(() => {
    if (externalT === undefined || zeros.length === 0) return;
    let lo = 0, hi = zeros.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (zeros[mid]! < externalT) lo = mid + 1; else hi = mid;
    }
    let best = lo;
    if (lo > 0 && Math.abs(zeros[lo - 1]! - externalT) < Math.abs(zeros[lo]! - externalT)) best = lo - 1;
    if (Math.abs(zeros[best]! - externalT) <= Math.max(1e-3, 1e-6 * Math.abs(externalT))) setIdx(best);
  }, [externalT, zeros]);
  useEffect(() => {
    let cancelled = false;
    fetch(`/critical-strip-points/${encodeURIComponent("00 Zeta Zeros.csv")}`)
      .then((r) => r.text())
      .then((text) => {
        if (cancelled) return;
        const out: number[] = [];
        for (const line of text.split(/\r?\n/)) {
          const s = line.trim();
          if (s.length === 0 || s.startsWith("#")) continue;
          const parts = s.split(",");
          if (parts.length < 2) continue;
          const T = Number.parseFloat(parts[1] ?? "");
          if (Number.isFinite(T)) out.push(T);
        }
        setZeros(out);
      })
      .catch(() => { /* leave empty on failure */ });
    return () => { cancelled = true; };
  }, []);
  const T = zeros[idx] ?? 0;
  const step = (delta: number) => {
    if (zeros.length === 0) return;
    const newIdx = Math.max(0, Math.min(zeros.length - 1, idx + delta));
    if (newIdx === idx) return;
    setIdx(newIdx);
    props.onPick(zeros[newIdx] ?? 0);
  };
  const arrowStyle = {
    width: 16,
    height: 16,
    padding: 0,
    lineHeight: "14px",
    fontSize: 10,
    border: "1px solid var(--border, #444)",
    borderRadius: 3,
    background: "transparent",
    color: "var(--text, #ccc)",
    cursor: "pointer",
  };
  return createElement(
    "div",
    { className: "zest-control" },
    createElement(
      "div",
      { className: "zest-control-row", style: { display: "flex", alignItems: "center", gap: 4 } },
      createElement("span", { className: "zest-label" }, "zeta zeros"),
      createElement("button", { style: arrowStyle, title: "previous zero", onClick: () => { step(-1); } }, "◀"),
      createElement("button", { style: arrowStyle, title: "next zero", onClick: () => { step(1); } }, "▶"),
      createElement(
        "span",
        { className: "zest-display-value", style: { fontVariantNumeric: "tabular-nums", marginLeft: "auto" } },
        zeros.length === 0 ? "loading…" : `${idx + 1}: T = ${T.toFixed(5)}`,
      ),
    ),
    createElement("input", {
      type: "range",
      value: idx,
      min: 0,
      max: Math.max(0, zeros.length - 1),
      step: 1,
      disabled: zeros.length === 0,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const newIdx = Number(e.target.value);
        setIdx(newIdx);
        props.onPick(zeros[newIdx] ?? 0);
      },
    }),
  );
}

/**
 * Custom "Integer part of T" row: number input on top (accepts any value),
 * piecewise-linear slider below mapping [0,1] -> 0..20..100..500.
 * Typing T > 500 pins the slider at the right end.
 */
export function IntegerPartTRow(props: { intValue: number; onChange: (v: number) => void }) {
  // slider position [0,1] -> T value. Accelerating ramp: halfway≈100, 0.75≈500,
  // far end=1500. Arrows can still step past 1500 (slider just pins at the end).
  const sliderToT = (s: number): number => {
    if (s <= 0.5) return 200 * s;
    if (s <= 0.75) return 100 + 1600 * (s - 0.5);
    return 500 + 4000 * (s - 0.75);
  };
  // T value -> slider position [0,1] (clamped to 1 for T > 1500)
  const TToSlider = (T: number): number => {
    if (T <= 0) return 0;
    if (T <= 100) return T / 200;
    if (T <= 500) return 0.5 + (T - 100) / 1600;
    if (T <= 1500) return 0.75 + (T - 500) / 4000;
    return 1;
  };

  const [text, setText] = useState(String(props.intValue));
  useEffect(() => { setText(String(props.intValue)); }, [props.intValue]);
  const commit = () => {
    const n = Number(text);
    if (Number.isFinite(n)) props.onChange(Math.max(0, Math.trunc(n)));
    else setText(String(props.intValue));
  };

  const sliderPos = TToSlider(props.intValue);
  const arrowStyle = {
    width: 16, height: 16, padding: 0, lineHeight: "14px", fontSize: 10,
    border: "1px solid var(--border, #444)", borderRadius: 3,
    background: "transparent", color: "var(--text, #ccc)", cursor: "pointer",
  };
  const step = (d: number): void => { props.onChange(Math.max(0, props.intValue + d)); };
  return createElement(
    "div",
    { className: "zest-control" },
    createElement(
      "div",
      { className: "zest-control-row", style: { display: "flex", alignItems: "center", gap: 4 } },
      createElement("span", { className: "zest-label" }, "Integer part of T"),
      createElement("button", { style: arrowStyle, title: "−1", onClick: () => { step(-1); } }, "◀"),
      createElement("button", { style: arrowStyle, title: "+1", onClick: () => { step(1); } }, "▶"),
      createElement("input", {
        type: "number",
        className: "zest-value-input",
        style: { marginLeft: "auto" },
        value: text,
        min: 0,
        step: 1,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value),
        onBlur: commit,
        onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") commit(); },
      }),
    ),
    createElement("input", {
      type: "range",
      value: sliderPos,
      min: 0,
      max: 1,
      step: 0.001,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const newT = Math.round(sliderToT(Number(e.target.value)));
        props.onChange(newT);
      },
    }),
  );
}

/** Linear integer slider [1, max] for the Farey max-denominator (Farey sequence F_m). */
export function FareyDenomSlider(props: { value: number; max: number; onChange: (v: number) => void }) {
  const max = Math.max(1, props.max);
  const v = Math.min(max, Math.max(1, props.value));
  const arrowStyle = {
    width: 16, height: 16, padding: 0, lineHeight: "14px", fontSize: 10,
    border: "1px solid var(--border, #444)", borderRadius: 3,
    background: "transparent", color: "var(--text, #ccc)", cursor: "pointer",
  };
  const step = (d: number): void => { props.onChange(Math.min(max, Math.max(1, v + d))); };
  return createElement(
    "div",
    { className: "zest-control" },
    createElement(
      "div",
      { className: "zest-control-row", style: { display: "flex", alignItems: "center", gap: 4 } },
      createElement("span", { className: "zest-label" }, "Farey max denom"),
      createElement("button", { style: arrowStyle, title: "−1", onClick: () => { step(-1); } }, "◀"),
      createElement("button", { style: arrowStyle, title: "+1", onClick: () => { step(1); } }, "▶"),
      createElement("span", { style: { marginLeft: "auto", fontVariantNumeric: "tabular-nums", color: "var(--text, #ccc)" } }, `${v} / ${max}`),
    ),
    createElement("input", {
      type: "range",
      value: v,
      min: 1,
      max,
      step: 1,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => { props.onChange(Number(e.target.value)); },
    }),
  );
}

/** Builds a THREE.Line from a Point2 array and adds it to a group. Returns null if fewer than 2 points. */
// A white filled-circle sprite, cached. Used as the `map` on a PointsMaterial
// (with alphaTest) so square GL points render as round dots.
let CIRCLE_SPRITE: THREE.CanvasTexture | null = null;
function circleSprite(): THREE.CanvasTexture {
  if (CIRCLE_SPRITE !== null) return CIRCLE_SPRITE;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = import.meta.env.MODE === "test" ? null : canvas.getContext("2d");
  if (ctx !== null) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
  CIRCLE_SPRITE = tex;
  return tex;
}

// A white circle OUTLINE sprite (transparent center), cached. Used like
// circleSprite() but renders an unfilled ring via alphaTest.
let RING_SPRITE: THREE.CanvasTexture | null = null;
function ringSprite(): THREE.CanvasTexture {
  if (RING_SPRITE !== null) return RING_SPRITE;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = import.meta.env.MODE === "test" ? null : canvas.getContext("2d");
  if (ctx !== null) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = size * 0.11;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - ctx.lineWidth, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
  RING_SPRITE = tex;
  return tex;
}

const TEXT_SPRITE_VIEWPORT = new THREE.Vector2();

// Last world-units-per-CSS-pixel seen by any text sprite's onBeforeRender. Cached so a
// freshly-created label can size itself correctly on its very first frame (camera zoom
// is unchanged across a rebuild), instead of flashing at the default scale=1 for one
// frame before onBeforeRender corrects it. 0 until the first frame has ever rendered.
let lastWorldPerPixel = 0;

// A text-label sprite (its own canvas texture). Kept at a constant on-screen size
// of `pixelHeight` CSS px regardless of camera zoom, via an onBeforeRender that
// rescales it from the orthographic camera's world-per-pixel each frame. Caller
// positions it. Texture freed by disposeGroup. No-op draw in test mode.
function textSprite(text: string, color: string, pixelHeight: number): THREE.Sprite {
  const fontPx = 40;
  const canvas = document.createElement("canvas");
  const ctx = import.meta.env.MODE === "test" ? null : canvas.getContext("2d");
  let cw = 80; const ch = fontPx + 12;
  if (ctx !== null) {
    ctx.font = `bold ${fontPx}px monospace`;
    cw = Math.ceil(ctx.measureText(text).width) + 12;
    canvas.width = cw; canvas.height = ch;
    ctx.font = `bold ${fontPx}px monospace`;
    ctx.fillStyle = color;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, cw / 2, ch / 2);
  } else { canvas.width = cw; canvas.height = ch; }
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  const aspect = cw / ch;
  // Size correctly on frame 0 from the cached zoom (no giant-then-shrink flash on rebuild).
  if (lastWorldPerPixel > 0) {
    const h0 = pixelHeight * lastWorldPerPixel;
    sprite.scale.set(h0 * aspect, h0, 1);
  }
  sprite.onBeforeRender = (renderer, _scene, camera): void => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    renderer.getSize(TEXT_SPRITE_VIEWPORT);
    const worldPerPixel = (camera.top - camera.bottom) / Math.max(1, TEXT_SPRITE_VIEWPORT.y);
    lastWorldPerPixel = worldPerPixel;
    const h = pixelHeight * worldPerPixel;
    sprite.scale.set(h * aspect, h, 1);
  };
  return sprite;
}

/**
 * Flanking near-zero joints, anchored on the Farey √-joints (the caustic centers
 * ⌈√(p/q)·T⌉). For each Farey joint we scan outward on each side and return the
 * bottom of the first dip whose folded turning angle drops below the near-zero
 * threshold (8°) — i.e. the nearest near-zero joint to the left and to the right.
 * Returns 1-based, de-duplicated joint numbers (graph dot n ↔ spiral joints[n-1]).
 */
export function flankingNearZeroJointNumbers(t: number, T: number, maxDenom: number): number[] {
  const N = Math.floor(T);
  const TP = 2 * Math.PI;
  const TAU = (8 * Math.PI) / 180;        // "near-zero" folded-angle threshold
  const MAXD = 300;                       // cap the outward search per side
  const fold = (n: number): number => {
    const a = -t * Math.log(n / (n - 1));
    let w = a % TP; if (w < 0) w += TP;
    return w > Math.PI ? TP - w : w;       // folded angle in [0, π]
  };
  // Bottom of the first below-threshold dip in direction `step` from the anchor.
  const nearestZero = (nf: number, step: number): number => {
    let best = -1; let bestv = TAU; let below = false;
    for (let n = nf + step, d = 0; n >= 2 && n <= N && d < MAXD; n += step, d += 1) {
      const v = fold(n);
      if (v < TAU) { below = true; if (v < bestv) { bestv = v; best = n; } }
      else if (below) break;               // exited the first dip; keep its min
    }
    return best;
  };
  const seen = new Set<number>();
  const out: number[] = [];
  for (const nf of fareyScaledJointNumbers(T, maxDenom)) {
    if (nf < 4 || nf > N - 1) continue;
    for (const step of [-1, 1]) {
      const n = nearestZero(nf, step);
      if (n > 0 && !seen.has(n)) { seen.add(n); out.push(n); }
    }
  }
  return out;
}

/**
 * Accurate caustic joint for fraction f at spiral index T. The caustic is where the
 * joint-to-joint phase step is a whole turn, θ'(n)=I(T)/[n(n−1)]=2π/f, giving
 *   n_c = ½(1 + √(1 + 2·f·I(T)/π)).
 * The familiar √f·T is only the T→∞ leading term; since I(T)/2π = T²+T+1/6+…
 * (not T²), the true caustic sits ~(√f+1)/2 joints to the right of √f·T at finite T.
 */
export function causticJoint(f: number, T: number): number {
  const It = ((2 * T + 1) * Math.PI) / (Math.log(T + 1) - Math.log(T));   // I(T)
  return 0.5 * (1 + Math.sqrt(1 + (2 * f * It) / Math.PI));
}

/**
 * Farey √-scaled joints: the Farey sequence F_m — ALL reduced fractions p/q in
 * (0,1] with denominator q ≤ maxDenom (complete denominators, never a partial
 * group). Each maps to its caustic joint (the accurate, T-dependent position; see
 * {@link causticJoint}). De-duplicated by joint number; caller clamps the range.
 */
export function fareyScaledJoints(T: number, maxDenom: number): Array<{ n: number; p: number; q: number }> {
  const m = Math.max(1, Math.floor(maxDenom));
  const coprime = (a: number, b: number): boolean => {
    let x = a, y = b;
    while (y !== 0) { const r = x % y; x = y; y = r; }
    return x === 1;
  };
  const seen = new Set<number>();
  const out: Array<{ n: number; p: number; q: number }> = [];
  for (let q = 1; q <= m; q += 1) {
    for (let p = 1; p <= q; p += 1) {
      if (!coprime(p, q)) continue;
      const n = Math.ceil(causticJoint(p / q, T));
      if (!seen.has(n)) { seen.add(n); out.push({ n, p, q }); }
    }
  }
  return out;
}

/**
 * Mediants between consecutive Farey √-joints. Take the Farey sequence F_m (all
 * fractions with denominator ≤ maxDenom), sort by value, and for each adjacent
 * pair a/b, c/d emit the mediant (a+c)/(b+d) — the fraction lying between them —
 * marking joint ⌈√(mediant)·T⌉. Reduced to lowest terms; de-duplicated by joint.
 */
export function mediantJoints(T: number, maxDenom: number): Array<{ n: number; p: number; q: number }> {
  const m = Math.max(1, Math.floor(maxDenom));
  if (m < 2) return [];
  const gcd = (a: number, b: number): number => {
    let x = a, y = b;
    while (y !== 0) { const r = x % y; x = y; y = r; }
    return x;
  };
  const fr: Array<[number, number]> = [];
  for (let q = 1; q <= m; q += 1) {
    for (let p = 1; p <= q; p += 1) {
      if (gcd(p, q) !== 1) continue;
      fr.push([p, q]);
    }
  }
  fr.sort((u, v) => u[0] / u[1] - v[0] / v[1]);          // by value
  const seen = new Set<number>();
  const out: Array<{ n: number; p: number; q: number }> = [];
  for (let i = 0; i + 1 < fr.length; i += 1) {
    const g = gcd(fr[i]![0] + fr[i + 1]![0], fr[i]![1] + fr[i + 1]![1]);
    const p = (fr[i]![0] + fr[i + 1]![0]) / g;
    const q = (fr[i]![1] + fr[i + 1]![1]) / g;            // mediant in lowest terms
    const n = Math.ceil(causticJoint(p / q, T));
    if (!seen.has(n)) { seen.add(n); out.push({ n, p, q }); }
  }
  return out;
}

/** Joint numbers only (see {@link fareyScaledJoints}). */
export function fareyScaledJointNumbers(T: number, maxDenom: number): number[] {
  return fareyScaledJoints(T, maxDenom).map((f) => f.n);
}

/**
 * 1/√n-scaled joints: for n = 1 … ⌊√T⌋, the joint number ⌈(1/√n)·T⌉ = ⌈T/√n⌉.
 * Returns 1-based, de-duplicated joint numbers (graph dot n ↔ spiral vertex
 * joints[n-1]); the caller clamps to the valid joint range.
 */
export function recipSqrtJointNumbers(T: number): number[] {
  const K = Math.floor(Math.sqrt(T));
  const seen = new Set<number>();
  const out: number[] = [];
  for (let n = 1; n <= K; n += 1) {
    const j = Math.ceil(T / Math.sqrt(n));
    if (!seen.has(j)) { seen.add(j); out.push(j); }
  }
  return out;
}

/**
 * Symmetric gap edges of the 1/k caustics. Each caustic centre is nc=√(t/2πk)
 * (the 1/√k joints); the folded turning angle there is a δ² chirp, so the first
 * folded-zero sits a half-width δ=√(ψ₀·nc/(2πk)) to either side, where
 * ψ₀=θ(nc) mod 2π. Returns the two integer edge joints nc±δ per caustic
 * (k=1…⌊√T⌋), de-duplicated and clamped to [2,N]. Symmetric by construction.
 */
export function gapEdgeJointNumbers(t: number, T: number): number[] {
  const N = Math.floor(T);
  const TP = 2 * Math.PI;
  const seen = new Set<number>();
  const out: number[] = [];
  const kMax = Math.floor(Math.sqrt(T));
  for (let k = 1; k <= kMax; k += 1) {
    const nc = Math.sqrt(t / (TP * k));              // true caustic centre
    if (nc < 3 || nc > N) continue;
    const psi0 = (((-t * Math.log(nc / (nc - 1))) % TP) + TP) % TP;   // phase at centre, [0,2π)
    const delta = Math.sqrt((psi0 * nc) / (TP * k));
    for (const edge of [Math.round(nc - delta), Math.round(nc + delta)]) {
      if (edge >= 2 && edge <= N && !seen.has(edge)) { seen.add(edge); out.push(edge); }
    }
  }
  return out;
}

/**
 * Near-zero joints tagged by their caustic's numerator p. Around each Farey
 * caustic p/q (q ≤ maxDenom, centre √(p/q)·T) the near-zero joints recur every p
 * joints (the moiré period = numerator). This scans a window around each centre,
 * collects joints with folded turning angle < 8°, and tags each with p (the
 * nearest caustic wins). Lets you see the period-1/2/3/… trains by colour.
 */
export function nearZeroByNumerator(t: number, T: number, maxDenom: number): Array<{ n: number; p: number }> {
  const N = Math.floor(T);
  const TP = 2 * Math.PI;
  const TAU = (8 * Math.PI) / 180;
  const fold = (n: number): number => {
    const a = -t * Math.log1p(1 / (n - 1));
    let w = a % TP; if (w < 0) w += TP;
    return w > Math.PI ? TP - w : w;
  };
  const claim = new Map<number, { p: number; dist: number }>();
  for (const { p, q } of fareyScaledJoints(T, maxDenom)) {
    const nc = Math.sqrt(p / q) * T;
    const W = Math.min(40, Math.max(3 * p + 4, 8));
    const lo = Math.max(2, Math.round(nc) - W);
    const hi = Math.min(N, Math.round(nc) + W);
    for (let n = lo; n <= hi; n += 1) {
      if (fold(n) >= TAU) continue;
      const dist = Math.abs(n - nc);
      const prev = claim.get(n);
      if (prev === undefined || dist < prev.dist) claim.set(n, { p, dist });
    }
  }
  const out: Array<{ n: number; p: number }> = [];
  for (const [n, v] of claim) out.push({ n, p: v.p });
  return out;
}

/** Period-colour palette by numerator p (p=1,2,3,4,≥5). */
export const NUMERATOR_COLORS: readonly number[] = [0x00e5ff, 0xffeb3b, 0xe040fb, 0xff6e40, 0xb0bec5];

/**
 * Joints j in [2, ⌊T⌋] that share at least one prime factor with N=⌊T⌋, i.e.
 * gcd(j, N) > 1 — every multiple of any prime factor of N (so all the
 * non-coprime joints; N itself included). The coprime joints are the gaps.
 */
export function primeFactorCommonJoints(T: number): number[] {
  const N = Math.floor(T);
  if (N < 2) return [];
  const primes: number[] = [];
  let m = N;
  for (let d = 2; d * d <= m; d += 1) {
    if (m % d === 0) { primes.push(d); while (m % d === 0) m = Math.floor(m / d); }
  }
  if (m > 1) primes.push(m);
  const mark = new Uint8Array(N + 1);
  for (const pr of primes) { for (let j = pr; j <= N; j += pr) mark[j] = 1; }
  const out: number[] = [];
  for (let j = 2; j <= N; j += 1) { if (mark[j] === 1) out.push(j); }
  return out;
}

/** Unit-numerator caustics for the first "formula gap edges" toggle. */
const GAP_EDGE_FRACTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 1], [1, 2], [1, 3], [1, 4],
];
/** Higher (p>1) caustics for the second "formula gap edges 2" toggle. */
const GAP_EDGE_FRACTIONS_2: ReadonlyArray<readonly [number, number]> = [
  [2, 5], [3, 5], [2, 3],
];

/**
 * Formula gap-edge joints for a list of p/q caustics. The caustic vertex is at
 * n_c = causticJoint(p/q, T); the gap has SYMMETRIC half-width h = √(p·n_c/q) (the moiré
 * has p strands, so the caustic parabola is sampled every p joints), but the chirp's cubic
 * term shifts the whole gap +p/(2q) joints right of the vertex — so right−left = p/q joints
 * exactly, T-independent (verified to 4 decimals, T=200..8000). Thus the gap centre is
 * g_c = n_c + p/(2q) and the edges g_c ∓ h. (1/1's right edge is past ⌊T⌋, so only its left
 * edge survives.) De-duplicated.
 */
function gapEdgeJointsFor(T: number, fractions: ReadonlyArray<readonly [number, number]>): number[] {
  const N = Math.floor(T);
  const out: number[] = [];
  const seen = new Set<number>();
  for (const [p, q] of fractions) {
    const nc = causticJoint(p / q, T);
    const half = Math.sqrt((p * nc) / q);
    const gc = nc + p / (2 * q);   // gap centre: cubic shift, T-independent
    // The caustic parabola lives on ONE of the p moiré strands (joints spaced p apart,
    // through the vertex). The −π bottom dots are on that strand, so snap each edge to it
    // — anchored at the joint nearest the vertex — instead of an off-strand neighbour.
    // (For p=1 every joint is on the strand, so this reduces to round(gc ∓ half).)
    const anchor = Math.round(nc);
    for (const edge of [gc - half, gc + half]) {
      const j = anchor + p * Math.round((edge - anchor) / p);
      if (j >= 2 && j <= N && !seen.has(j)) { seen.add(j); out.push(j); }
    }
  }
  return out;
}

/** Gap edges for the unit-numerator caustics 1/1, 1/2, 1/3, 1/4. */
export function widthGapJoints(T: number): number[] {
  return gapEdgeJointsFor(T, GAP_EDGE_FRACTIONS);
}

/** Gap edges for the higher caustics 2/5, 3/5, 2/3. */
export function widthGapJoints2(T: number): number[] {
  return gapEdgeJointsFor(T, GAP_EDGE_FRACTIONS_2);
}

function buildLine(pts: Point2[], color: number, group: THREE.Group): THREE.Line | null {
  if (pts.length < 2) return null;
  const positions = new Float32Array(pts.length * 3);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = 0;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color }));
  group.add(line);
  return line;
}

/** Disposes a THREE.Line and removes it from its group. */
function disposeLine(line: THREE.Line, group: THREE.Group): void {
  group.remove(line);
  line.geometry.dispose();
  const mat = line.material;
  if (!Array.isArray(mat)) mat.dispose();
}

/** On-screen half-size (CSS px) for ζ / bisector target reticles. */
const TARGET_MARKER_PIXEL_RADIUS = 14;

/**
 * Keeps a unit-geometry group at a constant on-screen size (CSS px) under an
 * orthographic camera — same zoom compensation as textSprite.
 */
function attachScreenSpaceScale(group: THREE.Group, pixelRadius: number): void {
  const applyScale = (renderer: THREE.WebGLRenderer, camera: THREE.Camera): void => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    renderer.getSize(TEXT_SPRITE_VIEWPORT);
    const worldPerPixel = (camera.top - camera.bottom) / Math.max(1, TEXT_SPRITE_VIEWPORT.y);
    lastWorldPerPixel = worldPerPixel;
    group.scale.setScalar(pixelRadius * worldPerPixel);
  };
  if (lastWorldPerPixel > 0) {
    group.scale.setScalar(pixelRadius * lastWorldPerPixel);
  }
  group.traverse((obj) => {
    if (obj === group) return;
    if (
      obj instanceof THREE.Line ||
      obj instanceof THREE.LineSegments ||
      obj instanceof THREE.Mesh ||
      obj instanceof THREE.Points
    ) {
      obj.onBeforeRender = (renderer, _scene, camera): void => {
        applyScale(renderer, camera);
      };
    }
  });
}

/**
 * Screen-fixed ζ target: unit circle + centered +. Place the group at ζ;
 * size is constant in CSS pixels under camera zoom.
 */
function createZetaTargetMarker(color: number): THREE.Group {
  const group = new THREE.Group();

  const seg = 48;
  const ringPos = new Float32Array((seg + 1) * 3);
  for (let i = 0; i <= seg; i += 1) {
    const a = (i / seg) * 2 * Math.PI;
    ringPos[i * 3] = Math.cos(a);
    ringPos[i * 3 + 1] = Math.sin(a);
    ringPos[i * 3 + 2] = 0;
  }
  const ringGeom = new THREE.BufferGeometry();
  ringGeom.setAttribute("position", new THREE.BufferAttribute(ringPos, 3));
  group.add(new THREE.Line(ringGeom, new THREE.LineBasicMaterial({ color })));

  const crossPos = new Float32Array([
    -1, 0, 0, 1, 0, 0,
    0, -1, 0, 0, 1, 0,
  ]);
  const crossGeom = new THREE.BufferGeometry();
  crossGeom.setAttribute("position", new THREE.BufferAttribute(crossPos, 3));
  group.add(new THREE.LineSegments(crossGeom, new THREE.LineBasicMaterial({ color })));

  attachScreenSpaceScale(group, TARGET_MARKER_PIXEL_RADIUS);
  return group;
}

/**
 * Screen-fixed bisector target: unit square with an X through the center.
 * The X crossing (group origin) sits on the bisector point.
 */
function createBisectorTargetMarker(color: number): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color });

  const squarePos = new Float32Array([
    -1, -1, 0, 1, -1, 0,
    1, -1, 0, 1, 1, 0,
    1, 1, 0, -1, 1, 0,
    -1, 1, 0, -1, -1, 0,
  ]);
  const squareGeom = new THREE.BufferGeometry();
  squareGeom.setAttribute("position", new THREE.BufferAttribute(squarePos, 3));
  group.add(new THREE.LineSegments(squareGeom, mat));

  const xPos = new Float32Array([
    -1, -1, 0, 1, 1, 0,
    -1, 1, 0, 1, -1, 0,
  ]);
  const xGeom = new THREE.BufferGeometry();
  xGeom.setAttribute("position", new THREE.BufferAttribute(xPos, 3));
  group.add(new THREE.LineSegments(xGeom, mat.clone()));

  attachScreenSpaceScale(group, TARGET_MARKER_PIXEL_RADIUS);
  return group;
}

/** Bisector midpoint modes for the Targets option-toggle. */
const BISECTOR_POINT_OPTIONS = [
  { label: "Off" },
  { label: "R1ps", color: "#ff073a" },
  { label: "R1ak", color: "#44ff44" },
  { label: "R/2", color: "#ffff44" },
  { label: "All" },
] as const;

const BISECTOR_R1PS_COLOR = 0xff073a;
const BISECTOR_R1AK_COLOR = 0x44ff44;
const BISECTOR_RHALF_COLOR = 0xffff44;

/**
 * Spiral layer: renders Forward (EMS), Inverse, Zak, Eta, and Z′ partial-sum polylines
 * plus their Reflect variants, and Forward σ=½ and Reverse overlays.
 */
export class SpiralWorkspaceLayer {
  private readonly group: THREE.Group;
  private readonly matrixPanel: ComponentType<{ ctx: ToolboxContext }>;

  // Primary scene objects
  private line: THREE.Line | null = null;
  private pointsObject: THREE.Points | null = null;
  private zetaMarker: THREE.Group | null = null;
  private bisectorMarkers: THREE.Group | null = null;
  private colorLinksMeshes: THREE.Mesh[] = [];
  private currentGeometry: ZetaSpiralGeometry | null = null;

  // Forward variants
  private reflectLine: THREE.Line | null = null;
  private halfSigmaLine: THREE.Line | null = null;
  private reverseLine: THREE.Line | null = null;

  // Inverse spiral
  private inverseLine: THREE.Line | null = null;
  private inverseReflectLine: THREE.Line | null = null;

  // Zak spiral
  private zakLine: THREE.Line | null = null;
  private zakReflectLine: THREE.Line | null = null;
  private sumXLine: THREE.Line | null = null;
  private sumXReflectLine: THREE.Line | null = null;
  private sum2xLine: THREE.Line | null = null;
  private sum2xReflectLine: THREE.Line | null = null;
  private crossingSumObject: THREE.Group | null = null;

  // Eta and Z′ spirals
  private etaLine: THREE.Line | null = null;
  private zPrimeLine: THREE.Line | null = null;
  private chebyLine: THREE.Line | null = null;
  private chebyMirrorLine: THREE.Line | null = null;

  // Scalar state
  private sigma = 0.5;
  private sigmaMin = 0;
  private sigmaMax = 1;
  private sigmaStep = 0.001;
  private index = 6.18;
  private usePolyImag = false;
  private extendSpiralCount = 0;
  // "Extend until cross": auto-extend the active spirals link-by-link until a
  // link of one crosses the same-step link of another, capped at 1,000,000.
  private extendUntilCross = false;
  private extendUntilCrossObject: THREE.Group | null = null;
  private extendCrossLabel = "";
  private drawMode: ZetaDrawMode = "all";
  private showZetaEndpoint = false;
  /** 0=Off, 1=R1ps, 2=R1ak, 3=R/2, 4=All */
  private showBisectorPoint = 0;
  private showSpiralMidpoints = false;
  private spiralMidpointsObject: THREE.Group | null = null;
  private showJointReflectLines = false;
  private jointReflectObject: THREE.Group | null = null;
  private showReflectToSpiralLines = false;
  private reflectToSpiralObject: THREE.Group | null = null;
  private showFormulaDots = false;
  private formulaDotsObject: THREE.Group | null = null;
  private showNearNDots = false;
  private nearNDotsObject: THREE.Group | null = null;
  private showOriginZetaBisCircle = false;
  private originZetaBisCircleObject: THREE.Group | null = null;
  private showQuarterBisector = false;
  private quarterBisectorObject: THREE.Group | null = null;
  // 2D overlay graph (drawn in the viewport, not the 3D scene): joint angle θ_n
  // folded to [0,π] for every joint, spread across the visible width.
  private showJointAngleGraph = false;
  // Graph-only: vertical lines at joints sharing a prime factor with ⌊T⌋.
  private showPrimeCommon = false;
  // Graph-only: connect consecutive joint-angle dots with a line (no ±π wrap).
  private showConnectDots = false;
  // Graph-only: also overlay a left↔right mirrored copy of the graph.
  private showFlipJoints = false;
  // When on (and T>1000), the joint-angle vector is computed by the
  // calibrate-once-at-⌊T⌋ / perturb-within-[⌊T⌋,⌊T⌋+1) technique instead of a
  // from-scratch Math.log per joint per frame. Diagnostic readout in the viewport.
  private fastJointAngles = false;
  private showFoldedPercentGraph = false;
  private showCochleoid = false;
  private cochleoidObject: THREE.Group | null = null;
  private showCornuS2p1 = false;
  private cornuS2p1Object: THREE.Group | null = null;
  private showCornuS2 = false;
  private cornuS2Object: THREE.Group | null = null;
  private showCornuS2m1 = false;
  private cornuS2m1Object: THREE.Group | null = null;
  private cornuKappaMax = 2.0;
  private cornuKappaAuto = true;
  private showExtendedLinkLines = false;
  private extendedLinkLinesObject: THREE.Group | null = null;
  // Extend the middle link of each of the last K spirals into a long line.
  // Middle link of spiral S_n (0 = last/outermost) is at L_N = I(T)/(π(2·S_n+1)).
  private extendMiddleLinksCount = 0;
  private extendMiddleLinksObject: THREE.Group | null = null;
  // Ray from origin, length 20, anchored on +x axis at integer T and turning
  // CCW at the bisector link's rotation rate (ln(N+1)·dt/dT, N = ⌊T⌋).
  private showBisectorRateLine = false;
  private bisectorRateLine: THREE.Line | null = null;
  private showUnweightedSpiral = false;
  private unweightedSpiralObject: THREE.Group | null = null;
  private showSinSqrtPhaseSpiral = false;
  private sinSqrtPhaseSpiralObject: THREE.Group | null = null;
  private showAnalogConveyorBelt = false;
  private analogConveyorBeltObject: THREE.Group | null = null;
  private showCornuFresnel = false;
  private cornuFresnelObject: THREE.Group | null = null;
  private showYinYang = false;
  private yinYangObject: THREE.Group | null = null;
  private showYinYangOnLink = false;
  private yinYangOnLinkObject: THREE.Group | null = null;
  private showYinYangMid = false;
  private yinYangMidObject: THREE.Group | null = null;
  private showYinYangMidOnLink = false;
  private yinYangMidOnLinkObject: THREE.Group | null = null;
  private lightTheme = false;
  private showNitDotPlot = false;
  private nitDotPlotObject: THREE.Group | null = null;
  private showNitFactorDotPlot = false;
  private nitFactorDotPlotObject: THREE.Group | null = null;
  private showNitDistinctFactorDotPlot = false;
  private nitDistinctFactorDotPlotObject: THREE.Group | null = null;
  private orderedChainVisible = false;
  private orderedChainObject: THREE.Line | null = null;
  private selectJointsFromGraph = false;
  // Spiral joint indices the user has hand-picked by clicking dots in the
  // joint-angle graph. Each maps to a geometry.joints[k]; rendered as red dots.
  private selectedJointIndices = new Set<number>();
  private selectedJointsObject: THREE.Group | null = null;
  private showGapJoints = false;
  private gapJointsObject: THREE.Group | null = null;
  private showFlankingJoints = false;
  private flankingJointsObject: THREE.Group | null = null;
  private showIndexDivJoints = false;
  private indexDivJointsObject: THREE.Group | null = null;
  private showFareyJoints = false;
  private fareyJointsObject: THREE.Group | null = null;
  private fareyMaxDenom = 6;                 // slider: show Farey sequence F_m
  private showMediants = false;
  private mediantsObject: THREE.Group | null = null;
  private showRecipSqrtJoints = false;
  private recipSqrtJointsObject: THREE.Group | null = null;
  private showGapEdges = false;
  private gapEdgesObject: THREE.Group | null = null;
  private showNearZeroP = false;
  private nearZeroPObject: THREE.Group | null = null;
  private showWidthGaps = false;
  private widthGapsObject: THREE.Group | null = null;
  private showWidthGaps2 = false;
  private widthGaps2Object: THREE.Group | null = null;
  private colorLinks = 0;
  private imported: Point2[] = [];
  private lastComputeTimeMs = 0;
  // Wall time of the most recent full rebuild() (math + scene construction),
  // plus a sequence counter so per-frame samplers record each rebuild once.
  private lastRebuildTimeMs = 0;
  private rebuildSeq = 0;

  // Matrix toggles
  private spiralVisible = true;
  private spiralFirstHalf = false;   // Forward: spiral to ⌊T⌋ + R₁ps
  private spiralReflect = false;
  private spiralHalfSigma = false;
  private spiralReverse = false;
  private inverseVisible = false;
  private inverseFirstHalf = false;  // Inverse row: inverse-reflect to ⌊T⌋ + R₂ps
  private inverseReflect = false;
  private zakVisible = false;
  private zakReflect = false;
  private crossingSumVisible = false;
  private sumXVisible = false;
  private sumXReflect = false;
  private sum2xVisible = false;
  private sum2xReflect = false;
  private etaVisible = false;
  private zPrimeVisible = false;
  private showChebyCurve = false;
  private firstHalfObject: THREE.Group | null = null;

  public constructor(parent: THREE.Group) {
    this.group = new THREE.Group();
    parent.add(this.group);
    this.matrixPanel = createSpiralMatrixPanel(this);
  }

  public initialize(): void {
    this.rebuild();
  }

  public setImportedPoints(points: Point2[]): void {
    this.imported = points;
    this.rebuild();
  }

  public setSigma(sigma: number): void {
    this.sigma = sigma;
    this.rebuild();
  }

  public setIndex(index: number): void {
    this.index = index;
    this.rebuild();
  }

  public setUsePolyImag(value: boolean): void {
    this.usePolyImag = value;
    this.rebuild();
  }

  public setExtendSpiralCount(count: number): void {
    this.extendSpiralCount = Math.max(0, Math.round(count));
    this.rebuild();
  }

  public setExtendUntilCross(value: boolean): void { this.extendUntilCross = value; this.rebuild(); }
  public getExtendUntilCross(): boolean { return this.extendUntilCross; }
  public getExtendCrossLabel(): string { return this.extendCrossLabel; }

  public setDrawMode(mode: ZetaDrawMode): void {
    this.drawMode = mode;
    this.rebuild();
  }

  public setShowZetaEndpoint(value: boolean): void {
    this.showZetaEndpoint = value;
    this.rebuild();
  }

  public setShowBisectorPoint(value: number): void {
    this.showBisectorPoint = Math.max(0, Math.min(4, Math.floor(value)));
    this.rebuild();
  }

  public setSpiralVisible(visible: boolean): void {
    this.spiralVisible = visible;
    this.rebuild();
  }

  public setSpiralFirstHalf(value: boolean): void { this.spiralFirstHalf = value; this.rebuild(); }
  public setSpiralReflect(value: boolean): void { this.spiralReflect = value; this.rebuild(); }
  public setSpiralHalfSigma(value: boolean): void { this.spiralHalfSigma = value; this.rebuild(); }
  public setSpiralReverse(value: boolean): void { this.spiralReverse = value; this.rebuild(); }
  public setInverseFirstHalf(value: boolean): void { this.inverseFirstHalf = value; this.rebuild(); }
  public getOrderedChainVisible(): boolean { return this.orderedChainVisible; }
  public setOrderedChainVisible(value: boolean): void { this.orderedChainVisible = value; this.rebuild(); }
  public getShowGapJoints(): boolean { return this.showGapJoints; }
  public setShowGapJoints(value: boolean): void { this.showGapJoints = value; this.rebuild(); }
  public getShowFlankingJoints(): boolean { return this.showFlankingJoints; }
  public setShowFlankingJoints(value: boolean): void { this.showFlankingJoints = value; this.rebuild(); }
  public getShowIndexDivJoints(): boolean { return this.showIndexDivJoints; }
  public setShowIndexDivJoints(value: boolean): void { this.showIndexDivJoints = value; this.rebuild(); }
  public getShowFareyJoints(): boolean { return this.showFareyJoints; }
  public setShowFareyJoints(value: boolean): void { this.showFareyJoints = value; this.rebuild(); }
  /** Slider cap: the largest Farey denominator selectable at the current T. */
  public fareyDenomCap(): number { return Math.max(1, Math.floor(Math.sqrt(this.index) / Math.PI)); }
  /** Selected Farey max denominator, clamped to [1, cap] for the current T. */
  public getFareyMaxDenom(): number { return Math.min(Math.max(1, this.fareyMaxDenom), this.fareyDenomCap()); }
  public setFareyMaxDenom(value: number): void { this.fareyMaxDenom = Math.max(1, Math.round(value)); this.rebuild(); }
  public getShowMediants(): boolean { return this.showMediants; }
  public setShowMediants(value: boolean): void { this.showMediants = value; this.rebuild(); }
  public getShowRecipSqrtJoints(): boolean { return this.showRecipSqrtJoints; }
  public setShowRecipSqrtJoints(value: boolean): void { this.showRecipSqrtJoints = value; this.rebuild(); }
  public getShowGapEdges(): boolean { return this.showGapEdges; }
  public setShowGapEdges(value: boolean): void { this.showGapEdges = value; this.rebuild(); }
  public getShowNearZeroP(): boolean { return this.showNearZeroP; }
  public setShowNearZeroP(value: boolean): void { this.showNearZeroP = value; this.rebuild(); }
  public getShowWidthGaps(): boolean { return this.showWidthGaps; }
  public setShowWidthGaps(value: boolean): void { this.showWidthGaps = value; this.rebuild(); }
  public getShowWidthGaps2(): boolean { return this.showWidthGaps2; }
  public setShowWidthGaps2(value: boolean): void { this.showWidthGaps2 = value; this.rebuild(); }
  public setInverseVisible(value: boolean): void { this.inverseVisible = value; this.rebuild(); }
  public setInverseReflect(value: boolean): void { this.inverseReflect = value; this.rebuild(); }
  public setZakVisible(value: boolean): void { this.zakVisible = value; this.rebuild(); }
  public setZakReflect(value: boolean): void { this.zakReflect = value; this.rebuild(); }
  public setCrossingSumVisible(value: boolean): void { this.crossingSumVisible = value; this.rebuild(); }
  public setSumXVisible(value: boolean): void { this.sumXVisible = value; this.rebuild(); }
  public setSumXReflect(value: boolean): void { this.sumXReflect = value; this.rebuild(); }
  public setSum2xVisible(value: boolean): void { this.sum2xVisible = value; this.rebuild(); }
  public setSum2xReflect(value: boolean): void { this.sum2xReflect = value; this.rebuild(); }
  public setEtaVisible(value: boolean): void { this.etaVisible = value; this.rebuild(); }
  public setZPrimeVisible(value: boolean): void { this.zPrimeVisible = value; this.rebuild(); }
  public setShowChebyCurve(value: boolean): void { this.showChebyCurve = value; this.rebuild(); }
  public setShowSpiralMidpoints(value: boolean): void { this.showSpiralMidpoints = value; this.rebuild(); }
  public getShowSpiralMidpoints(): boolean { return this.showSpiralMidpoints; }
  /** Enable/disable picking joints by clicking dots in the joint-angle graph.
   *  Toggling either way clears every previously-selected joint. */
  public setSelectJointsFromGraph(value: boolean): void {
    this.selectJointsFromGraph = value;
    this.selectedJointIndices.clear();
    this.rebuild();
  }
  public getSelectJointsFromGraph(): boolean { return this.selectJointsFromGraph; }

  /** Toggle a single joint's red highlight. First click adds it, a second click
   *  on the same joint removes it. Called when the user clicks a graph dot. */
  public toggleSelectedJoint(jointIndex: number): void {
    if (this.selectedJointIndices.has(jointIndex)) {
      this.selectedJointIndices.delete(jointIndex);
    } else {
      this.selectedJointIndices.add(jointIndex);
    }
    this.rebuild();
  }
  /** 0-based geometry.joints indices currently highlighted; lets the joint-angle
   *  graph circle the matching dots (graph dot n ↔ joint index n−1). */
  public getSelectedJointIndices(): number[] { return Array.from(this.selectedJointIndices); }
  public setShowJointReflectLines(value: boolean): void { this.showJointReflectLines = value; this.rebuild(); }
  public getShowJointReflectLines(): boolean { return this.showJointReflectLines; }
  public setShowReflectToSpiralLines(value: boolean): void { this.showReflectToSpiralLines = value; this.rebuild(); }
  public setShowFormulaDots(value: boolean): void { this.showFormulaDots = value; this.rebuild(); }
  public getShowFormulaDots(): boolean { return this.showFormulaDots; }
  public setShowNearNDots(value: boolean): void { this.showNearNDots = value; this.rebuild(); }
  public getShowNearNDots(): boolean { return this.showNearNDots; }
  public setShowOriginZetaBisCircle(value: boolean): void { this.showOriginZetaBisCircle = value; this.rebuild(); }
  public getShowOriginZetaBisCircle(): boolean { return this.showOriginZetaBisCircle; }
  public setShowQuarterBisector(value: boolean): void { this.showQuarterBisector = value; this.rebuild(); }
  public getShowQuarterBisector(): boolean { return this.showQuarterBisector; }
  public setShowCochleoid(value: boolean): void { this.showCochleoid = value; this.rebuild(); }
  public getShowCochleoid(): boolean { return this.showCochleoid; }
  // No rebuild: this is a 2D overlay, not part of the THREE scene.
  public setShowJointAngleGraph(value: boolean): void { this.showJointAngleGraph = value; }
  public getShowJointAngleGraph(): boolean { return this.showJointAngleGraph; }
  public setShowPrimeCommon(value: boolean): void { this.showPrimeCommon = value; }   // graph-only, no rebuild
  public getShowPrimeCommon(): boolean { return this.showPrimeCommon; }
  public setShowConnectDots(value: boolean): void { this.showConnectDots = value; }   // graph-only, no rebuild
  public getShowConnectDots(): boolean { return this.showConnectDots; }
  public setShowFlipJoints(value: boolean): void { this.showFlipJoints = value; }   // graph-only, no rebuild
  public getShowFlipJoints(): boolean { return this.showFlipJoints; }
  public setFastJointAngles(value: boolean): void { this.fastJointAngles = value; }
  public getFastJointAngles(): boolean { return this.fastJointAngles; }
  public setShowFoldedPercentGraph(value: boolean): void { this.showFoldedPercentGraph = value; }
  public getShowFoldedPercentGraph(): boolean { return this.showFoldedPercentGraph; }
  public setShowCornuS2p1(value: boolean): void { this.showCornuS2p1 = value; this.rebuild(); }
  public getShowCornuS2p1(): boolean { return this.showCornuS2p1; }
  public setShowCornuS2(value: boolean): void { this.showCornuS2 = value; this.rebuild(); }
  public getShowCornuS2(): boolean { return this.showCornuS2; }
  public setShowCornuS2m1(value: boolean): void { this.showCornuS2m1 = value; this.rebuild(); }
  public getShowCornuS2m1(): boolean { return this.showCornuS2m1; }
  public setCornuKappaMax(value: number): void { this.cornuKappaMax = value; this.rebuild(); }
  public getCornuKappaMax(): number { return this.cornuKappaMax; }
  public setCornuKappaAuto(value: boolean): void { this.cornuKappaAuto = value; this.rebuild(); }
  public getCornuKappaAuto(): boolean { return this.cornuKappaAuto; }
  public setShowExtendedLinkLines(value: boolean): void { this.showExtendedLinkLines = value; this.rebuild(); }
  public getShowExtendedLinkLines(): boolean { return this.showExtendedLinkLines; }
  public setExtendMiddleLinksCount(count: number): void { this.extendMiddleLinksCount = Math.max(0, Math.round(count)); this.rebuild(); }
  public getExtendMiddleLinksCount(): number { return this.extendMiddleLinksCount; }
  public setShowBisectorRateLine(value: boolean): void { this.showBisectorRateLine = value; this.rebuild(); }
  public getShowBisectorRateLine(): boolean { return this.showBisectorRateLine; }
  public setShowUnweightedSpiral(value: boolean): void { this.showUnweightedSpiral = value; this.rebuild(); }
  public getShowUnweightedSpiral(): boolean { return this.showUnweightedSpiral; }
  public setShowSinSqrtPhaseSpiral(value: boolean): void { this.showSinSqrtPhaseSpiral = value; this.rebuild(); }
  public getShowSinSqrtPhaseSpiral(): boolean { return this.showSinSqrtPhaseSpiral; }
  public setShowAnalogConveyorBelt(value: boolean): void { this.showAnalogConveyorBelt = value; this.rebuild(); }
  public getShowAnalogConveyorBelt(): boolean { return this.showAnalogConveyorBelt; }
  public setShowCornuFresnel(value: boolean): void { this.showCornuFresnel = value; this.rebuild(); }
  public getShowCornuFresnel(): boolean { return this.showCornuFresnel; }
  public setShowYinYang(value: boolean): void { this.showYinYang = value; this.rebuild(); }
  public getShowYinYang(): boolean { return this.showYinYang; }
  public setShowYinYangOnLink(value: boolean): void { this.showYinYangOnLink = value; this.rebuild(); }
  public getShowYinYangOnLink(): boolean { return this.showYinYangOnLink; }
  public setShowYinYangMid(value: boolean): void { this.showYinYangMid = value; this.rebuild(); }
  public getShowYinYangMid(): boolean { return this.showYinYangMid; }
  public setShowYinYangMidOnLink(value: boolean): void { this.showYinYangMidOnLink = value; this.rebuild(); }
  public getShowYinYangMidOnLink(): boolean { return this.showYinYangMidOnLink; }

  /** Flip UI chrome (CSS vars) and the THREE scene background between the
   *  dark default and white-with-black-text. */
  public setLightTheme(value: boolean): void {
    this.lightTheme = value;
    document.documentElement.classList.toggle("light-theme", value);
    let node: THREE.Object3D = this.group;
    while (node.parent !== null) node = node.parent;
    if (node instanceof THREE.Scene) {
      node.background = new THREE.Color(value ? 0xffffff : 0x0b0d12);
    }
  }
  public getLightTheme(): boolean { return this.lightTheme; }
  public setShowNitDotPlot(value: boolean): void { this.showNitDotPlot = value; this.rebuild(); }
  public getShowNitDotPlot(): boolean { return this.showNitDotPlot; }
  public setShowNitFactorDotPlot(value: boolean): void { this.showNitFactorDotPlot = value; this.rebuild(); }
  public getShowNitFactorDotPlot(): boolean { return this.showNitFactorDotPlot; }
  public setShowNitDistinctFactorDotPlot(value: boolean): void { this.showNitDistinctFactorDotPlot = value; this.rebuild(); }
  public getShowNitDistinctFactorDotPlot(): boolean { return this.showNitDistinctFactorDotPlot; }
  public getShowReflectToSpiralLines(): boolean { return this.showReflectToSpiralLines; }

  public getSigma(): number { return this.sigma; }
  public getIndex(): number { return this.index; }
  public getUsePolyImag(): boolean { return this.usePolyImag; }
  public getExtendSpiralCount(): number { return this.extendSpiralCount; }
  public getSpiralVisible(): boolean { return this.spiralVisible; }
  public getSpiralFirstHalf(): boolean { return this.spiralFirstHalf; }
  public getDrawMode(): ZetaDrawMode { return this.drawMode; }
  public getShowZetaEndpoint(): boolean { return this.showZetaEndpoint; }
  public getShowBisectorPoint(): number { return this.showBisectorPoint; }
  public getColorLinks(): number { return this.colorLinks; }
  public setColorLinks(value: number): void { this.colorLinks = value; this.rebuild(); }
  public getSpiralReflect(): boolean { return this.spiralReflect; }
  public getSpiralHalfSigma(): boolean { return this.spiralHalfSigma; }
  public getSpiralReverse(): boolean { return this.spiralReverse; }
  public getInverseVisible(): boolean { return this.inverseVisible; }
  public getInverseFirstHalf(): boolean { return this.inverseFirstHalf; }
  public getInverseReflect(): boolean { return this.inverseReflect; }
  public getZakVisible(): boolean { return this.zakVisible; }
  public getZakReflect(): boolean { return this.zakReflect; }
  public getCrossingSumVisible(): boolean { return this.crossingSumVisible; }
  public getSumXVisible(): boolean { return this.sumXVisible; }
  public getSumXReflect(): boolean { return this.sumXReflect; }
  public getSum2xVisible(): boolean { return this.sum2xVisible; }
  public getSum2xReflect(): boolean { return this.sum2xReflect; }
  public getEtaVisible(): boolean { return this.etaVisible; }
  public getZPrimeVisible(): boolean { return this.zPrimeVisible; }
  public getShowChebyCurve(): boolean { return this.showChebyCurve; }
  public getImportedPoints(): Point2[] { return this.imported; }
  public getCurrentGeometry(): ZetaSpiralGeometry | null { return this.currentGeometry; }
  public getLastComputeTimeMs(): number { return this.lastComputeTimeMs; }
  public getLastRebuildTimeMs(): number { return this.lastRebuildTimeMs; }
  public getRebuildSeq(): number { return this.rebuildSeq; }

  public dispose(): void {
    this.clearAllLines();
    this.clearPoints();
    this.clearZetaMarker();
    this.group.removeFromParent();
  }

  public getToolSections(ctx: ToolboxContext): ToolboxSection[] {
    return [
      {
        // Always-visible top-of-dock controls (no accordion header).
        // Order: T/t row → σ → integer → fractional.
        id: "top-controls",
        contributorId: "workspace:top",
        title: "",
        bare: true,
        order: 1,
        controls: [
          {
            kind: "custom",
            id: "index-T-and-t",
            render: () => createElement(IndexTRow, {
              indexValue: this.index,
              tValue: indexToImag(this.index, this.usePolyImag),
              onTChange: (v: number) => {
                this.setIndex(Math.max(0, Math.min(10000 - 1e-9, v)));
                ctx.requestToolboxRefresh();
              },
              onTFromtChange: (tIn: number) => {
                const newT = imagToIndex(Math.max(0, tIn), this.usePolyImag);
                this.setIndex(Math.max(0, Math.min(10000 - 1e-9, newT)));
                ctx.requestToolboxRefresh();
              },
            }),
          },
          {
            kind: "range-slider",
            id: "sigma",
            label: "σ",
            value: this.sigma,
            defaultValue: 0.5,
            min: this.sigmaMin,
            max: this.sigmaMax,
            step: this.sigmaStep,
            onChange: (value: number) => {
              this.setSigma(value);
              ctx.requestToolboxRefresh();
            },
            onStepChange: (step: number) => {
              this.sigmaStep = step;
              ctx.requestToolboxRefresh();
            },
            onRangeChange: (newMin: number, newMax: number) => {
              this.sigmaMin = newMin;
              this.sigmaMax = newMax;
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "custom",
            id: "index-int",
            render: () => createElement(IntegerPartTRow, {
              intValue: Math.trunc(this.index),
              onChange: (value: number) => {
                this.setIndex(Math.max(0, Math.min(9999, value)) + (this.index - Math.trunc(this.index)));
                ctx.requestToolboxRefresh();
              },
            }),
          },
          {
            kind: "number",
            id: "index-frac",
            label: "Fractional part of T",
            value: parseFloat((this.index - Math.trunc(this.index)).toFixed(6)),
            min: 0,
            max: 0.999999,
            step: 0.000001,
            onChange: (value: number) => {
              this.setIndex(Math.trunc(this.index) + Math.max(0, Math.min(0.999999, value)));
              ctx.requestToolboxRefresh();
            },
          },
        ],
      },
      {
        id: "zeta-display",
        contributorId: "workspace:zeta-display",
        title: "Spiral display",
        order: 9,
        CustomPanel: this.matrixPanel,
        controls: [
          {
            kind: "select",
            id: "draw-mode",
            label: "Links to draw",
            value: this.drawMode,
            options: [
              { label: "All", value: "all" },
              { label: "Up to ∑(1)", value: "upToSum1" },
              { label: "Up to ∑(1) as Vector", value: "upToSum1Vector" },
              { label: "BisectorLink", value: "bisectorLink" },
              { label: "Last Spiral", value: "lastSpiral" },
              { label: "Last Link", value: "lastLink" },
            ],
            onChange: (value: string) => {
              const valid: ZetaDrawMode[] = ["all", "upToSum1", "upToSum1Vector", "bisectorLink", "lastSpiral", "lastLink"];
              if ((valid as string[]).includes(value)) {
                this.setDrawMode(value as ZetaDrawMode);
                ctx.requestToolboxRefresh();
              }
            },
          },
          {
            kind: "toggle",
            id: "show-cheby-curve",
            label: "show Cheby curve",
            value: this.showChebyCurve,
            onChange: (value: boolean) => {
              this.setShowChebyCurve(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-joint-angle-graph",
            label: "joint-angle graph (θ_n in [0,π] per joint)",
            value: this.showJointAngleGraph,
            onChange: (value: boolean) => {
              this.setShowJointAngleGraph(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-farey-joints",
            label: "Farey √-joints: √(p/q)·T, denominators ≤ slider (blue)",
            value: this.showFareyJoints,
            onChange: (value: boolean) => {
              this.setShowFareyJoints(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "custom",
            id: "farey-max-denom",
            render: () => createElement(FareyDenomSlider, {
              value: this.getFareyMaxDenom(),
              max: this.fareyDenomCap(),
              onChange: (v: number) => { this.setFareyMaxDenom(v); ctx.requestToolboxRefresh(); },
            }),
          },
          {
            kind: "toggle",
            id: "show-mediants",
            label: "mediants between Farey: (a+c)/(b+d) (red)",
            value: this.showMediants,
            onChange: (value: boolean) => {
              this.setShowMediants(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-width-gaps",
            label: "formula gap edges: n_c + p/2q ∓ √(p·n_c/q) for 1/1,1/2,1/3,1/4 (white)",
            value: this.showWidthGaps,
            onChange: (value: boolean) => {
              this.setShowWidthGaps(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-width-gaps-2",
            label: "formula gap edges 2: same formula for 2/5, 3/5, 2/3 (yellow)",
            value: this.showWidthGaps2,
            onChange: (value: boolean) => {
              this.setShowWidthGaps2(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-connect-dots",
            label: "connect the joint dots (no ±π wrap)",
            value: this.showConnectDots,
            onChange: (value: boolean) => {
              this.setShowConnectDots(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-folded-percent-graph",
            label: "folded-out % over ⌊T⌋→⌊T⌋+1",
            value: this.showFoldedPercentGraph,
            onChange: (value: boolean) => {
              this.setShowFoldedPercentGraph(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "option-toggle",
            id: "color-links",
            label: "Color links",
            value: this.colorLinks,
            options: [
              { label: "None" },
              { label: "Bisector", color: "#ffb86c" },
              { label: "Clock Arms", color: "#50fa7b" },
              { label: "Orbit", color: "#bd93f9" },
            ],
            onChange: (value: number) => {
              this.setColorLinks(value);
              ctx.requestToolboxRefresh();
            },
          },
        ],
      },
      {
        id: "targets",
        contributorId: "workspace:targets",
        title: "Targets",
        order: 16,
        controls: [
          {
            kind: "toggle",
            id: "show-zeta",
            label: "Show ζ(s) endpoint",
            value: this.showZetaEndpoint,
            onChange: (value: boolean) => {
              this.setShowZetaEndpoint(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "option-toggle",
            id: "show-bisector",
            label: "Show bisector midpoint",
            value: this.showBisectorPoint,
            options: [...BISECTOR_POINT_OPTIONS],
            onChange: (value: number) => {
              this.setShowBisectorPoint(value);
              ctx.requestToolboxRefresh();
            },
          },
        ],
      },
      {
        id: "euler-spirals",
        contributorId: "workspace:euler-spirals",
        title: "Exponential-sum spirals",
        order: 17,
        defaultCollapsed: true,
        controls: [
          {
            kind: "toggle",
            id: "show-unweighted-spiral",
            label: "Weighted ζ-form, f(n)=1:   Σ exp(−i·t·ln n)",
            value: this.showUnweightedSpiral,
            onChange: (value: boolean) => {
              this.setShowUnweightedSpiral(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-sinsqrt-phase-spiral",
            label: "Pure-phase (Li form), f(n)=sin(√n):   Σ exp(2πi·sin(√n))",
            value: this.showSinSqrtPhaseSpiral,
            onChange: (value: boolean) => {
              this.setShowSinSqrtPhaseSpiral(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-cornu-fresnel",
            label: "Cornu/Fresnel overlay at bisector (n* = N)",
            value: this.showCornuFresnel,
            onChange: (value: boolean) => {
              this.setShowCornuFresnel(value);
              ctx.requestToolboxRefresh();
            },
          },
        ],
      },
      {
        id: "origin-plots",
        contributorId: "workspace:origin-plots",
        title: "origin plots",
        order: 18,
        defaultCollapsed: true,
        controls: [
          {
            kind: "toggle",
            id: "show-analog-conveyor-belt",
            label: "analog conveyor belt:   ζ(s) − Σ₂(N(N+2), σ, T)",
            value: this.showAnalogConveyorBelt,
            onChange: (value: boolean) => {
              this.setShowAnalogConveyorBelt(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-nit-dot-plot",
            label: "N^-it dot plot:   (1/√N)·√n·n^{−i·I(T)},  n = 1…N",
            value: this.showNitDotPlot,
            onChange: (value: boolean) => {
              this.setShowNitDotPlot(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-nit-factor-dot-plot",
            label: "N^-it dot plot by factors:  prime green, 2 red, 3 orange, 4 blue, 5+ purple",
            value: this.showNitFactorDotPlot,
            onChange: (value: boolean) => {
              this.setShowNitFactorDotPlot(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-nit-distinct-factor-dot-plot",
            label: "N^-it dot plot by distinct primes:  ω(24)=2, ω(27)=1; same colors",
            value: this.showNitDistinctFactorDotPlot,
            onChange: (value: boolean) => {
              this.setShowNitDistinctFactorDotPlot(value);
              ctx.requestToolboxRefresh();
            },
          },
        ],
      },
      {
        id: "yin-yang",
        contributorId: "workspace:yin-yang",
        title: "yin yang",
        order: 19,
        defaultCollapsed: true,
        controls: [
          {
            kind: "toggle",
            id: "show-yin-yang",
            label: "Y_in1 = R·⌊T+1⌋^s,   Y_ang1 = Y_in1 − χ·⌈T⌉^{2s−1}",
            value: this.showYinYang,
            onChange: (value: boolean) => {
              this.setShowYinYang(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-yin-yang-on-link",
            label: "yin yang curve on link ⌊T⌋ (scaled to link)",
            value: this.showYinYangOnLink,
            onChange: (value: boolean) => {
              this.setShowYinYangOnLink(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-yin-yang-mid",
            label: "(yin+yang)/2",
            value: this.showYinYangMid,
            onChange: (value: boolean) => {
              this.setShowYinYangMid(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-yin-yang-mid-on-link",
            label: "(yin+yang)/2 on link ⌊T⌋ (scaled to link)",
            value: this.showYinYangMidOnLink,
            onChange: (value: boolean) => {
              this.setShowYinYangMidOnLink(value);
              ctx.requestToolboxRefresh();
            },
          },
        ],
      },
      {
        id: "misc",
        contributorId: "workspace:misc",
        title: "Misc",
        order: 99,
        defaultCollapsed: true,
        controls: [
          {
            kind: "toggle",
            id: "poly-imag",
            label: this.usePolyImag
              ? "I(T) = 2π(T²+T+⅙)   (poly)   ⇄  log"
              : "I(T) = (2T+1)π / (ln(T+1)−ln T)   (log)   ⇄  poly",
            value: this.usePolyImag,
            onChange: (value: boolean) => {
              this.setUsePolyImag(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "light-theme",
            label: "white background (black text)",
            value: this.lightTheme,
            onChange: (value: boolean) => {
              this.setLightTheme(value);
              ctx.requestToolboxRefresh();
            },
          },
        ],
      },
      {
        id: "misc-toggles",
        contributorId: "workspace:misc-toggles",
        title: "misc toggles",
        order: 100,
        defaultCollapsed: true,
        controls: [
          {
            kind: "toggle",
            id: "show-recip-sqrt-joints",
            label: "1/√n joints: ⌈T/√n⌉, n=1..⌊√T⌋ (red)",
            value: this.showRecipSqrtJoints,
            onChange: (value: boolean) => {
              this.setShowRecipSqrtJoints(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-gap-edges",
            label: "Mark the symmetric gap edges (1/k caustics, purple)",
            value: this.showGapEdges,
            onChange: (value: boolean) => {
              this.setShowGapEdges(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-near-zero-p",
            label: "near-zero joints by caustic numerator p (period: 1=cyan 2=yellow 3=magenta 4=orange)",
            value: this.showNearZeroP,
            onChange: (value: boolean) => {
              this.setShowNearZeroP(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-prime-common",
            label: "prime factors common with ⌊T⌋: joints gcd(j,⌊T⌋)>1 (lines)",
            value: this.showPrimeCommon,
            onChange: (value: boolean) => {
              this.setShowPrimeCommon(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-flip-joints",
            label: "flip joints (overlay a left↔right mirror)",
            value: this.showFlipJoints,
            onChange: (value: boolean) => {
              this.setShowFlipJoints(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "custom",
            id: "extend-middle-links",
            render: () => createElement(ExtendMiddleLinksRow, {
              value: this.extendMiddleLinksCount,
              max: Math.floor(this.index),
              onChange: (k: number) => {
                this.setExtendMiddleLinksCount(k);
                ctx.requestToolboxRefresh();
              },
            }),
          },
          {
            kind: "toggle",
            id: "show-bisector-rate-line",
            label: "bisector-rate ray (on +x at integer T, CW)",
            value: this.showBisectorRateLine,
            onChange: (value: boolean) => {
              this.setShowBisectorRateLine(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "select-joints-from-graph",
            label: "select joints from angle graph (click dots → red in spiral)",
            value: this.selectJointsFromGraph,
            onChange: (value: boolean) => {
              this.setSelectJointsFromGraph(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "extend-until-cross",
            label: "Extend until spirals cross (≤1,000,000)",
            value: this.extendUntilCross,
            onChange: (value: boolean) => {
              this.setExtendUntilCross(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "custom",
            id: "extend-cross-readout",
            render: () => createElement(ExtendCrossReadout, { get: () => this.getExtendCrossLabel() }),
          },
          {
            kind: "toggle",
            id: "highlight-gap-joints",
            label: "highlight gap joints (blue): rightmost 9, n_k=√(t/2πk), k=1…9",
            value: this.showGapJoints,
            onChange: (value: boolean) => {
              this.setShowGapJoints(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "highlight-flanking-joints",
            label: "highlight flanking near-zero joints (green): θ≈0 each side of the 9 gaps",
            value: this.showFlankingJoints,
            onChange: (value: boolean) => {
              this.setShowFlankingJoints(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "highlight-indexdiv-joints",
            label: "highlight index/j locked joints (orange): n=round(T/j), j=2,3,4",
            value: this.showIndexDivJoints,
            onChange: (value: boolean) => {
              this.setShowIndexDivJoints(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-spiral-midpoints",
            label: "show spiral midpoints",
            value: this.showSpiralMidpoints,
            onChange: (value: boolean) => {
              this.setShowSpiralMidpoints(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-joint-reflect-lines",
            label: "lines from joints to spirals",
            value: this.showJointReflectLines,
            onChange: (value: boolean) => {
              this.setShowJointReflectLines(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-reflect-to-spiral-lines",
            label: "connect reflections to spirals",
            value: this.showReflectToSpiralLines,
            onChange: (value: boolean) => {
              this.setShowReflectToSpiralLines(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-formula-dots",
            label: "2N² / (2k+1)",
            value: this.showFormulaDots,
            onChange: (value: boolean) => {
              this.setShowFormulaDots(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-near-n-dots",
            label: "visible spiral centers (Δ ≈ π scan)",
            value: this.showNearNDots,
            onChange: (value: boolean) => {
              this.setShowNearNDots(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-origin-zeta-bis-circle",
            label: "circle through origin, ζ, bisector pt",
            value: this.showOriginZetaBisCircle,
            onChange: (value: boolean) => {
              this.setShowOriginZetaBisCircle(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-quarter-bisector",
            label: "¼-joint line ∥ bisector: ratio where it meets origin→ζ/2 (cyan)",
            value: this.showQuarterBisector,
            onChange: (value: boolean) => {
              this.setShowQuarterBisector(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-cochleoid",
            label: "Cochleoid: axis ζ/2→bp, bp=apex, origin/ζ on curve",
            value: this.showCochleoid,
            onChange: (value: boolean) => {
              this.setShowCochleoid(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-cornu-s2p1",
            label: "Cornu κ=s²+1: bp@midpt, origin/ζ@end-loops (perp fit)",
            value: this.showCornuS2p1,
            onChange: (value: boolean) => {
              this.setShowCornuS2p1(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-cornu-s2",
            label: "Cornu κ=s²: bp@midpt, origin/ζ@end-loops (perp fit)",
            value: this.showCornuS2,
            onChange: (value: boolean) => {
              this.setShowCornuS2(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-cornu-s2m1",
            label: "Cornu κ=s²−1: bp@midpt, origin/ζ@end-loops (perp fit)",
            value: this.showCornuS2m1,
            onChange: (value: boolean) => {
              this.setShowCornuS2m1(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "number",
            id: "cornu-kappa-max",
            label: "Cornu κ_max (length)",
            value: parseFloat(this.cornuKappaMax.toFixed(3)),
            min: 0.001,
            max: 20,
            step: 0.01,
            onChange: (value: number) => {
              this.setCornuKappaMax(Math.max(0.001, value));
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "toggle",
            id: "show-extended-link-lines",
            label: "Extend every link by +10 units on each side",
            value: this.showExtendedLinkLines,
            onChange: (value: boolean) => {
              this.setShowExtendedLinkLines(value);
              ctx.requestToolboxRefresh();
            },
          },
          {
            kind: "option-toggle",
            id: "extend-links",
            label: "Extend links",
            value: Math.max(0, EXTEND_LINK_VALUES.indexOf(this.extendSpiralCount)),
            options: [
              { label: "0" },
              { label: "5K" },
              { label: "50K" },
              { label: "500K" },
            ],
            onChange: (idx: number) => {
              const v = EXTEND_LINK_VALUES[idx] ?? 0;
              this.setExtendSpiralCount(v);
              ctx.requestToolboxRefresh();
            },
          },
        ],
      },
    ];
  }

  private clearLine(): void {
    if (this.line !== null) { disposeLine(this.line, this.group); this.line = null; }
  }

  private clearPoints(): void {
    if (this.pointsObject !== null) {
      this.group.remove(this.pointsObject);
      this.pointsObject.geometry.dispose();
      const material = this.pointsObject.material;
      if (!Array.isArray(material)) material.dispose();
      this.pointsObject = null;
    }
  }

  private clearZetaMarker(): void {
    if (this.zetaMarker === null) return;
    this.zetaMarker.traverse((obj) => {
      if (obj instanceof THREE.Line || obj instanceof THREE.LineSegments) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (!Array.isArray(mat)) mat.dispose();
      }
    });
    this.group.remove(this.zetaMarker);
    this.zetaMarker = null;
  }

  /**
   * Extend every active spiral link-by-link from the start of its divergent
   * tail, and stop at the first step where the newest link of one active
   * spiral crosses (or touches) the newest link of another — capped at
   * 1,000,000 links. Renders the extended spirals and records a readout of the
   * crossing link number and which two spirals met.
   *
   * "Newest link" means same growth step: all active spirals grow together, so
   * each one's terminal link is at the same index k, and we test those
   * terminals pairwise. Reflections/reverses are applied as per-joint affine
   * transforms of the underlying forward/inverse partial-sum accumulators, so
   * the whole sweep is O(maxLinks · #pairs) with no geometry rebuilds.
   */
  private renderExtendUntilCross(geometry: ZetaSpiralGeometry): void {
    const MAX_LINKS = 1_000_000;
    const sigma = this.sigma;
    const imag = indexToImag(this.index, this.usePolyImag);
    const chi = chiBrian({ re: sigma, im: imag });
    const zx = geometry.zeta.x, zy = geometry.zeta.y;
    const midx = zx / 2, midy = zy / 2;
    const zlen = Math.hypot(zx, zy) || 1;
    const nx = zx / zlen, ny = zy / zlen;

    // Per-joint world transforms (raw partial-sum point → world point).
    const idT = (px: number, py: number): [number, number] => [px, py];
    const reflectT = (px: number, py: number): [number, number] => [2 * midx - px, 2 * midy - py];
    const reverseT = (px: number, py: number): [number, number] => {
      // reflect across the ζ direction (line through ζ), then shift by −ζ
      const rx = px - zx, ry = py - zy;
      const dot = rx * nx + ry * ny;
      return [zx + rx - 2 * dot * nx - zx, zy + ry - 2 * dot * ny - zy];
    };

    type Base = "fwd" | "fwdHalf" | "inv";
    type Spec = { key: string; color: number; base: Base; xf: (x: number, y: number) => [number, number]; xs: number[]; ys: number[]; px: number; py: number };
    const specs: Spec[] = [];
    const add = (cond: boolean, key: string, color: number, base: Base, xf: Spec["xf"]) => {
      if (cond) specs.push({ key, color, base, xf, xs: [], ys: [], px: 0, py: 0 });
    };
    add(this.spiralVisible, "forward", 0x66d9ff, "fwd", idT);
    add(this.spiralReflect, "reflect", 0xffb86c, "fwd", reflectT);
    add(this.spiralHalfSigma, "halfσ", 0xbd93f9, "fwdHalf", idT);
    add(this.spiralReverse, "reverse", 0x50fa7b, "fwd", reverseT);
    add(this.inverseVisible, "inverse", 0xff5555, "inv", idT);
    add(this.inverseReflect, "inverse-reflect", 0xff9580, "inv", reflectT);

    if (specs.length < 2) {
      this.extendCrossLabel = "needs ≥2 spirals on";
      return;
    }

    // Seed joint 0 (raw = origin for every base) into each spec.
    for (const s of specs) {
      const [wx, wy] = s.xf(0, 0);
      s.xs.push(wx); s.ys.push(wy); s.px = wx; s.py = wy;
    }

    // Only start testing in the divergent tail (beyond the normal link count).
    const baseCount = Math.max(2, geometry.numLinks - this.extendSpiralCount);

    // Raw accumulators for the three possible bases.
    let fX = 0, fY = 0;          // forward Σ n^{-s}
    let fhX = 0, fhY = 0;        // forward at σ=½
    let irx = 0, iry = 0;        // inverse raw Σ n^{s-1} (before χ)
    const needFwd = specs.some(s => s.base === "fwd");
    const needFwdHalf = specs.some(s => s.base === "fwdHalf");
    const needInv = specs.some(s => s.base === "inv");

    let crossK = -1;
    let crossA = "", crossB = "";
    let crossX = 0, crossY = 0;

    for (let k = 1; k <= MAX_LINKS; k += 1) {
      const ln = Math.log(k);
      const ang = imag * ln;
      const cos = Math.cos(ang), sin = Math.sin(ang);
      if (needFwd) {
        const inv = 1 / Math.pow(k, sigma);
        fX += cos * inv; fY += -sin * inv;
      }
      if (needFwdHalf) {
        const inv = 1 / Math.sqrt(k);
        fhX += cos * inv; fhY += -sin * inv;
      }
      let ijx = 0, ijy = 0;
      if (needInv) {
        const r = Math.pow(k, sigma - 1);
        irx += cos * r; iry += sin * r;
        ijx = irx * chi.re - iry * chi.im;
        ijy = irx * chi.im + iry * chi.re;
      }
      // Append the k-th world joint to each spec.
      for (const s of specs) {
        const rawX = s.base === "fwd" ? fX : s.base === "fwdHalf" ? fhX : ijx;
        const rawY = s.base === "fwd" ? fY : s.base === "fwdHalf" ? fhY : ijy;
        const [wx, wy] = s.xf(rawX, rawY);
        s.xs.push(wx); s.ys.push(wy);
      }
      // Pairwise terminal-link crossing test (only in the divergent tail).
      if (k >= baseCount) {
        for (let i = 0; i < specs.length && crossK < 0; i += 1) {
          const a = specs[i]!;
          for (let j = i + 1; j < specs.length; j += 1) {
            const b = specs[j]!;
            const hit = segIntersect(a.px, a.py, a.xs[k]!, a.ys[k]!, b.px, b.py, b.xs[k]!, b.ys[k]!);
            if (hit !== null) {
              crossK = k; crossA = a.key; crossB = b.key; crossX = hit[0]; crossY = hit[1];
              break;
            }
          }
        }
      }
      // Advance prev points.
      for (const s of specs) { s.px = s.xs[k]!; s.py = s.ys[k]!; }
      if (crossK >= 0) break;
    }

    // Render every active spiral up to the stop index.
    const stopK = crossK >= 0 ? crossK : specs[0]!.xs.length - 1;
    const wrap = new THREE.Group();
    for (const s of specs) {
      const n = stopK + 1;
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i += 1) {
        pos[i * 3 + 0] = s.xs[i]!;
        pos[i * 3 + 1] = s.ys[i]!;
        pos[i * 3 + 2] = 0.005;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      wrap.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: s.color })));
    }
    if (crossK >= 0) {
      // White marker at the crossing point.
      const dg = new THREE.BufferGeometry();
      dg.setAttribute("position", new THREE.BufferAttribute(new Float32Array([crossX, crossY, 0.02]), 3));
      wrap.add(new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffffff, size: 8, sizeAttenuation: false })));
    }
    this.group.add(wrap);
    this.extendUntilCrossObject = wrap;

    this.extendCrossLabel = crossK >= 0
      ? `cross at link ${crossK.toLocaleString("en-US")}  (${crossA} × ${crossB})`
      : `no cross < ${MAX_LINKS.toLocaleString("en-US")}`;
  }

  private clearFirstHalfObject(): void {
    if (this.firstHalfObject === null) return;
    this.firstHalfObject.traverse((obj) => {
      if (
        obj instanceof THREE.Line ||
        obj instanceof THREE.LineSegments ||
        obj instanceof THREE.Mesh
      ) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (!Array.isArray(mat)) mat.dispose();
      }
    });
    this.group.remove(this.firstHalfObject);
    this.firstHalfObject = null;
  }

  private clearAllLines(): void {
    this.clearLine();
    this.clearBisectorLine();
    this.clearFirstHalfObject();
    if (this.reflectLine) { disposeLine(this.reflectLine, this.group); this.reflectLine = null; }
    if (this.halfSigmaLine) { disposeLine(this.halfSigmaLine, this.group); this.halfSigmaLine = null; }
    if (this.reverseLine) { disposeLine(this.reverseLine, this.group); this.reverseLine = null; }
    if (this.inverseLine) { disposeLine(this.inverseLine, this.group); this.inverseLine = null; }
    if (this.inverseReflectLine) { disposeLine(this.inverseReflectLine, this.group); this.inverseReflectLine = null; }
    if (this.zakLine) { disposeLine(this.zakLine, this.group); this.zakLine = null; }
    if (this.zakReflectLine) { disposeLine(this.zakReflectLine, this.group); this.zakReflectLine = null; }
    if (this.sumXLine) { disposeLine(this.sumXLine, this.group); this.sumXLine = null; }
    if (this.sumXReflectLine) { disposeLine(this.sumXReflectLine, this.group); this.sumXReflectLine = null; }
    if (this.sum2xLine) { disposeLine(this.sum2xLine, this.group); this.sum2xLine = null; }
    if (this.sum2xReflectLine) { disposeLine(this.sum2xReflectLine, this.group); this.sum2xReflectLine = null; }
    if (this.etaLine) { disposeLine(this.etaLine, this.group); this.etaLine = null; }
    if (this.zPrimeLine) { disposeLine(this.zPrimeLine, this.group); this.zPrimeLine = null; }
    if (this.chebyLine) { disposeLine(this.chebyLine, this.group); this.chebyLine = null; }
    if (this.chebyMirrorLine) { disposeLine(this.chebyMirrorLine, this.group); this.chebyMirrorLine = null; }
    if (this.bisectorRateLine) { disposeLine(this.bisectorRateLine, this.group); this.bisectorRateLine = null; }
    if (this.orderedChainObject) { disposeLine(this.orderedChainObject, this.group); this.orderedChainObject = null; }
    if (this.spiralMidpointsObject !== null) {
      this.spiralMidpointsObject.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          const mat = (obj as THREE.Mesh | THREE.Line | THREE.Points).material;
          if (!Array.isArray(mat)) mat.dispose();
        }
      });
      this.group.remove(this.spiralMidpointsObject);
      this.spiralMidpointsObject = null;
    }
    if (this.jointReflectObject !== null) {
      this.jointReflectObject.traverse((obj) => {
        if (obj instanceof THREE.LineSegments || obj instanceof THREE.Line || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          const mat = (obj as THREE.LineSegments | THREE.Line | THREE.Points).material;
          if (!Array.isArray(mat)) mat.dispose();
        }
      });
      this.group.remove(this.jointReflectObject);
      this.jointReflectObject = null;
    }
    if (this.reflectToSpiralObject !== null) {
      this.reflectToSpiralObject.traverse((obj) => {
        if (obj instanceof THREE.LineSegments || obj instanceof THREE.Line) {
          obj.geometry.dispose();
          const mat = obj.material;
          if (!Array.isArray(mat)) mat.dispose();
        }
      });
      this.group.remove(this.reflectToSpiralObject);
      this.reflectToSpiralObject = null;
    }
    if (this.formulaDotsObject !== null) {
      this.formulaDotsObject.traverse((obj) => {
        if (obj instanceof THREE.Points) {
          obj.geometry.dispose();
          const mat = obj.material;
          if (!Array.isArray(mat)) mat.dispose();
        }
      });
      this.group.remove(this.formulaDotsObject);
      this.formulaDotsObject = null;
    }
    if (this.nearNDotsObject !== null) {
      this.nearNDotsObject.traverse((obj) => {
        if (obj instanceof THREE.Points) {
          obj.geometry.dispose();
          const mat = obj.material;
          if (!Array.isArray(mat)) mat.dispose();
        }
      });
      this.group.remove(this.nearNDotsObject);
      this.nearNDotsObject = null;
    }
    if (this.originZetaBisCircleObject !== null) {
      this.originZetaBisCircleObject.traverse((obj) => {
        if (
          obj instanceof THREE.Line ||
          obj instanceof THREE.LineSegments ||
          obj instanceof THREE.Points
        ) {
          obj.geometry.dispose();
          const mat = (obj as THREE.Line | THREE.LineSegments | THREE.Points).material;
          if (!Array.isArray(mat)) mat.dispose();
        }
      });
      this.group.remove(this.originZetaBisCircleObject);
      this.originZetaBisCircleObject = null;
    }
    if (this.cochleoidObject !== null) {
      this.cochleoidObject.traverse((obj) => {
        if (obj instanceof THREE.Line) {
          obj.geometry.dispose();
          const mat = obj.material;
          if (!Array.isArray(mat)) mat.dispose();
        }
      });
      this.group.remove(this.cochleoidObject);
      this.cochleoidObject = null;
    }
    const disposeGroup = (g: THREE.Group | null): THREE.Group | null => {
      if (g === null) return null;
      g.traverse((obj) => {
        if (obj instanceof THREE.Sprite) {
          // Text-label sprites carry a unique CanvasTexture — free it too.
          if (obj.material.map !== null) obj.material.map.dispose();
          obj.material.dispose();
        } else if (
          obj instanceof THREE.Line ||
          obj instanceof THREE.LineSegments ||
          obj instanceof THREE.Points ||
          obj instanceof THREE.Mesh
        ) {
          if (obj instanceof THREE.InstancedMesh) obj.dispose();
          obj.geometry.dispose();
          const mat = (obj as THREE.Line | THREE.LineSegments | THREE.Points | THREE.Mesh).material;
          if (!Array.isArray(mat)) mat.dispose();
        }
      });
      this.group.remove(g);
      return null;
    };
    this.cornuS2p1Object = disposeGroup(this.cornuS2p1Object);
    this.cornuS2Object   = disposeGroup(this.cornuS2Object);
    this.cornuS2m1Object = disposeGroup(this.cornuS2m1Object);
    this.extendedLinkLinesObject = disposeGroup(this.extendedLinkLinesObject);
    this.extendMiddleLinksObject = disposeGroup(this.extendMiddleLinksObject);
    this.unweightedSpiralObject = disposeGroup(this.unweightedSpiralObject);
    this.sinSqrtPhaseSpiralObject = disposeGroup(this.sinSqrtPhaseSpiralObject);
    this.analogConveyorBeltObject = disposeGroup(this.analogConveyorBeltObject);
    this.cornuFresnelObject = disposeGroup(this.cornuFresnelObject);
    this.selectedJointsObject = disposeGroup(this.selectedJointsObject);
    this.crossingSumObject = disposeGroup(this.crossingSumObject);
    this.gapJointsObject = disposeGroup(this.gapJointsObject);
    this.flankingJointsObject = disposeGroup(this.flankingJointsObject);
    this.indexDivJointsObject = disposeGroup(this.indexDivJointsObject);
    this.fareyJointsObject = disposeGroup(this.fareyJointsObject);
    this.mediantsObject = disposeGroup(this.mediantsObject);
    this.recipSqrtJointsObject = disposeGroup(this.recipSqrtJointsObject);
    this.gapEdgesObject = disposeGroup(this.gapEdgesObject);
    this.nearZeroPObject = disposeGroup(this.nearZeroPObject);
    this.widthGapsObject = disposeGroup(this.widthGapsObject);
    this.widthGaps2Object = disposeGroup(this.widthGaps2Object);
    this.quarterBisectorObject = disposeGroup(this.quarterBisectorObject);
    this.extendUntilCrossObject = disposeGroup(this.extendUntilCrossObject);
    this.yinYangObject = disposeGroup(this.yinYangObject);
    this.yinYangOnLinkObject = disposeGroup(this.yinYangOnLinkObject);
    this.yinYangMidObject = disposeGroup(this.yinYangMidObject);
    this.yinYangMidOnLinkObject = disposeGroup(this.yinYangMidOnLinkObject);
    this.nitDotPlotObject = disposeGroup(this.nitDotPlotObject);
    this.nitFactorDotPlotObject = disposeGroup(this.nitFactorDotPlotObject);
    this.nitDistinctFactorDotPlotObject = disposeGroup(this.nitDistinctFactorDotPlotObject);
  }

  private clearBisectorLine(): void {
    this.clearBisectorMarkers();
    for (const mesh of this.colorLinksMeshes) {
      this.group.remove(mesh);
      mesh.geometry.dispose();
      const mat = mesh.material;
      if (!Array.isArray(mat)) mat.dispose();
    }
    this.colorLinksMeshes = [];
  }

  private clearBisectorMarkers(): void {
    if (this.bisectorMarkers === null) return;
    this.bisectorMarkers.traverse((obj) => {
      if (obj instanceof THREE.Line || obj instanceof THREE.LineSegments) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (!Array.isArray(mat)) mat.dispose();
      }
    });
    this.group.remove(this.bisectorMarkers);
    this.bisectorMarkers = null;
  }

  private applyColorLinksHighlights(joints: Point2[], middleIndex: number, supportsOrbit: boolean): void {
    if (this.colorLinks === 0) return;
    const colorBisector = this.colorLinks === 1 || this.colorLinks === 2;
    const colorClock = this.colorLinks === 2;
    const colorOrbit = this.colorLinks === 3 && supportsOrbit;

    if (colorBisector && middleIndex + 1 < joints.length) {
      const s = joints[middleIndex], e = joints[middleIndex + 1];
      if (s && e) { const m = buildThickSegment(s, e, 0xffb86c, this.group); if (m) this.colorLinksMeshes.push(m); }
    }

    if (colorClock && middleIndex >= 1 && middleIndex + 2 < joints.length) {
      const ys = joints[middleIndex - 1], ye = joints[middleIndex];
      if (ys && ye) { const m = buildThickSegment(ys, ye, 0x50fa7b, this.group); if (m) this.colorLinksMeshes.push(m); }
      const gs = joints[middleIndex + 1], ge = joints[middleIndex + 2];
      if (gs && ge) { const m = buildThickSegment(gs, ge, 0xff5555, this.group); if (m) this.colorLinksMeshes.push(m); }
    }

    if (colorOrbit) {
      const n = Math.floor(this.index);
      const linkInt = (n + 2) * n;
      if (linkInt >= 0 && linkInt + 1 < joints.length) {
        const s = joints[linkInt], e = joints[linkInt + 1];
        if (s && e) { const m = buildThickSegment(s, e, 0xbd93f9, this.group); if (m) this.colorLinksMeshes.push(m); }
      }
    }
  }

  private rebuild(): void {
    const rebuildStart = performance.now();
    this.clearAllLines();
    this.clearPoints();
    this.clearZetaMarker();

    const computeStart = performance.now();

    // --- Forward spiral (EMS) ---
    const geometry = computeEmsSpiralGeometry({
      sigma: this.sigma,
      index: this.index,
      usePolyImag: this.usePolyImag,
      extendSpiralCount: this.extendSpiralCount,
    });
    this.lastComputeTimeMs = performance.now() - computeStart;

    // Override geometry.zeta with the ZAK estimate — accurate even at large t,
    // where EMS's main-sum cap (MAX_N = 1e6 in zetaEms.ts) makes the Bernoulli
    // tail divergent and yields garbage (e.g. at T=1251.58, σ=½, EMS returns
    // ζ ≈ (−6094, −6661) while the truth is ≈ (20.26, −48.54)). ZAK uses the
    // log i-function, so we only swap when usePolyImag is false (matches the
    // EMS imaginary). The ZAK call costs O(T), negligible vs. the spiral build.
    if (!this.usePolyImag) {
      const zakGeom = computeZakSpiralGeometry(this.sigma, this.index);
      geometry.zeta = zakGeom.zeta;
    }
    this.currentGeometry = geometry;

    if (this.extendUntilCross) {
      this.renderExtendUntilCross(geometry);
    } else {
      this.extendCrossLabel = "";
    }

    const filtered = filterJointsForDrawMode(geometry.joints, this.drawMode, geometry.middleIndex);

    if (this.spiralVisible) {
      this.line = buildLine(filtered, 0x66d9ff, this.group);
      this.applyColorLinksHighlights(geometry.joints, geometry.middleIndex, true);
    }


    if (this.spiralReflect) {
      const mid = { x: geometry.zeta.x / 2, y: geometry.zeta.y / 2 };
      this.reflectLine = buildLine(reflectJoints(filtered, mid), 0xffb86c, this.group);
      this.applyColorLinksHighlights(reflectJoints(geometry.joints, mid), geometry.middleIndex, true);
    }

    if (this.spiralHalfSigma) {
      const hsGeom = computeEmsSpiralGeometry({
        sigma: 0.5,
        index: this.index,
        usePolyImag: this.usePolyImag,
        extendSpiralCount: this.extendSpiralCount,
      });
      const hsFiltered = filterJointsForDrawMode(hsGeom.joints, this.drawMode, hsGeom.middleIndex);
      this.halfSigmaLine = buildLine(hsFiltered, 0xbd93f9, this.group);
      this.applyColorLinksHighlights(hsGeom.joints, hsGeom.middleIndex, true);
    }

    if (this.spiralReverse) {
      // reverseJoints[k] = reflect(joints[k], nζ) + 2ζ — runs from 2ζ→ζ.
      // Shifting by −ζ gives reflect(joints[k], nζ) + ζ, which starts at ζ
      // (k=0, joints[0]=origin → reflect(0)+ζ = ζ) and ends at origin
      // (k=N, joints[N]=ζ → reflect(ζ,nζ)+ζ = −ζ+ζ = 0), with links drawn
      // in forward order (longest first).
      const { x: zetaX, y: zetaY } = geometry.zeta;
      const shifted = reverseJoints(filtered, geometry.zeta).map(p => ({ x: p.x - zetaX, y: p.y - zetaY }));
      this.reverseLine = buildLine(shifted, 0x50fa7b, this.group);
      const shiftedFull = reverseJoints(geometry.joints, geometry.zeta).map(p => ({ x: p.x - zetaX, y: p.y - zetaY }));
      this.applyColorLinksHighlights(shiftedFull, geometry.middleIndex, true);
    }

    // --- Inverse spiral ---
    if (this.inverseVisible || this.inverseReflect) {
      const invGeom = computeInverseSpiralGeometry(this.sigma, this.index, this.usePolyImag);
      const invFiltered = filterJointsForDrawMode(invGeom.joints, this.drawMode, invGeom.middleIndex);
      if (this.inverseVisible) {
        this.inverseLine = buildLine(invFiltered, 0xff5555, this.group);
        this.applyColorLinksHighlights(invGeom.joints, invGeom.middleIndex, true);
      }
      if (this.inverseReflect) {
        // Use the forward EMS zeta as reference so the reflected inverse spiral
        // starts at the same ζ(s) point as Forward/Reflect.
        const mid = { x: geometry.zeta.x / 2, y: geometry.zeta.y / 2 };
        this.inverseReflectLine = buildLine(reflectJoints(invFiltered, mid), 0xff9580, this.group);
        this.applyColorLinksHighlights(reflectJoints(invGeom.joints, mid), invGeom.middleIndex, true);
      }
    }

    // --- Σ_1x / Σ_2x / crossing-part sums of Σ₁+R_{1ps} ---
    const sumXFloor = Math.floor(this.index);
    const show1x = this.sumXVisible || this.sumXReflect;
    const show2x = this.sum2xVisible || this.sum2xReflect;
    const showCrossingSum = this.crossingSumVisible;
    if (sumXFloor >= 0 && (show1x || show2x || showCrossingSum)) {
      const fwd = forwardChain(this.sigma, this.index, this.usePolyImag, 100_000);
      const scale = crossingScale(this.index, this.usePolyImag);
      const { b1, b2 } = psLegs(this.sigma, this.index);
      const mid = { x: geometry.zeta.x / 2, y: geometry.zeta.y / 2 };
      const inv = (show1x || showCrossingSum)
        ? reflectedInverseChain(this.sigma, this.index, this.usePolyImag, geometry.zeta, 100_000)
        : null;
      if (sumXFloor >= 1 && show1x && inv !== null) {
        const joints = sum1xJoints(fwd, inv, sumXFloor, scale, b1);
        if (this.sumXVisible) this.sumXLine = buildLine(joints, 0xffd54a, this.group);
        if (this.sumXReflect) this.sumXReflectLine = buildLine(reflectJoints(joints, mid), 0xffe082, this.group);
      }
      if (sumXFloor >= 1 && show2x) {
        const inv0 = inverseChain(this.sigma, this.index, this.usePolyImag, 100_000);
        const joints = sum2xJoints(inv0, fwd, sumXFloor, scale, b2);
        if (this.sum2xVisible) this.sum2xLine = buildLine(joints, 0x69f0ae, this.group);
        if (this.sum2xReflect) this.sum2xReflectLine = buildLine(reflectJoints(joints, mid), 0xa5d6a7, this.group);
      }
      if (showCrossingSum && inv !== null) {
        const { v1, v2 } = crossingPartSums(fwd, inv, sumXFloor, scale, b1);
        const wrap = new THREE.Group();
        buildLine([{ x: 0, y: 0 }, v1], 0x2ec4a8, wrap);
        const tip = { x: v1.x + v2.x, y: v1.y + v2.y };
        if (Math.hypot(v2.x, v2.y) > 1e-12) {
          buildLine([v1, tip], 0xb050e8, wrap);
        }
        const dg = new THREE.BufferGeometry();
        dg.setAttribute("position", new THREE.BufferAttribute(new Float32Array([v1.x, v1.y, 0.03]), 3));
        wrap.add(new THREE.Points(dg, new THREE.PointsMaterial({
          color: 0xffffff,
          size: 9,
          sizeAttenuation: false,
        })));
        this.crossingSumObject = wrap;
        this.group.add(wrap);
      }
    }

    // --- Zak spiral ---
    if (this.zakVisible || this.zakReflect) {
      const zakGeom = computeZakSpiralGeometry(this.sigma, this.index);
      const zakFiltered = filterJointsForDrawMode(zakGeom.joints, this.drawMode, zakGeom.middleIndex);
      if (this.zakVisible) {
        this.zakLine = buildLine(zakFiltered, 0x8be9fd, this.group);
        this.applyColorLinksHighlights(zakGeom.joints, zakGeom.middleIndex, false);
      }
      if (this.zakReflect) {
        const mid = { x: zakGeom.zeta.x / 2, y: zakGeom.zeta.y / 2 };
        this.zakReflectLine = buildLine(reflectJoints(zakFiltered, mid), 0xff79c6, this.group);
        this.applyColorLinksHighlights(reflectJoints(zakGeom.joints, mid), zakGeom.middleIndex, false);
      }
    }

    // --- Eta spiral ---
    if (this.etaVisible) {
      const etaGeom = computeEtaSpiralGeometry(this.sigma, this.index, this.usePolyImag);
      const etaFiltered = filterJointsForDrawMode(etaGeom.joints, this.drawMode, etaGeom.middleIndex);
      this.etaLine = buildLine(etaFiltered, 0xf1fa8c, this.group);
    }

    // --- Z′ spiral ---
    if (this.zPrimeVisible) {
      const zpGeom = computeZPrimeSpiralGeometry(this.sigma, this.index, this.usePolyImag);
      const zpFiltered = filterJointsForDrawMode(zpGeom.joints, this.drawMode, zpGeom.middleIndex);
      this.zPrimeLine = buildLine(zpFiltered, 0xa0a0a0, this.group);
    }

    // --- Chebyshev fit curve ---
    // Polyline of origin + S_1..S_N (N = floor(T)) → analytic Chebyshev fit.
    // When on, also draw a mirror copy reflected across the line through ζ/2
    // perpendicular to the origin→ζ direction.
    if (this.showChebyCurve) {
      const N = Math.max(1, Math.trunc(this.index));
      const last = Math.min(geometry.joints.length - 1, N);
      const anchors = geometry.joints.slice(0, last + 1);
      const K = Math.min(N, 100);
      const curve = computeChebyshevCurve(anchors, K, 1024);
      this.chebyLine = buildLine(curve, 0xffd700, this.group);

      // Reflect each point of the curve across the perpendicular bisector of
      // the segment origin→ζ (the line through ζ/2 perpendicular to ζ).
      // For unit vector u = ζ/|ζ|, the reflection of p is
      //   p' = p − 2 · ((p − ζ/2) · u) · u
      const zx = geometry.zeta.x;
      const zy = geometry.zeta.y;
      const zLen = Math.hypot(zx, zy);
      if (zLen > 1e-12) {
        const ux = zx / zLen;
        const uy = zy / zLen;
        const mx = zx / 2;
        const my = zy / 2;
        const mirror: Point2[] = curve.map(p => {
          const dot = (p.x - mx) * ux + (p.y - my) * uy;
          return { x: p.x - 2 * dot * ux, y: p.y - 2 * dot * uy };
        });
        this.chebyMirrorLine = buildLine(mirror, 0xffa500, this.group);
      }
    }

    // --- User-selected joints (red dots placed by clicking the joint-angle graph) ---
    if (this.selectedJointIndices.size > 0) {
      const uniq = Array.from(this.selectedJointIndices).filter((k) => k >= 0 && k < geometry.joints.length);
      if (uniq.length > 0) {
        const positions = new Float32Array(uniq.length * 3);
        for (let i = 0; i < uniq.length; i += 1) {
          const jt = geometry.joints[uniq[i]!];
          if (jt === undefined) continue;
          positions[i * 3 + 0] = jt.x;
          positions[i * 3 + 1] = jt.y;
          positions[i * 3 + 2] = 0.03;
        }
        const dg = new THREE.BufferGeometry();
        dg.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const dm = new THREE.PointsMaterial({ color: 0xff0000, size: 9, sizeAttenuation: false });
        const grp = new THREE.Group();
        grp.add(new THREE.Points(dg, dm));
        this.selectedJointsObject = grp;
        this.group.add(grp);
      }
    }

    // --- Angle-ordered link chain (Forward "order" checkbox) ---
    // Re-chains the forward spiral's first links — up to and including the
    // bisector link — from the origin, but ordered by each link's direction
    // angle (lowest first) instead of by link length. Same link set, so the
    // chain ends at the same point: the joint after the bisector link.
    if (this.orderedChainVisible) {
      const joints = geometry.joints;
      const endJoint = Math.min(geometry.middleIndex + 1, joints.length - 1);
      if (endJoint >= 1) {
        const terms: { x: number; y: number; a: number }[] = [];
        for (let i = 1; i <= endJoint; i += 1) {
          const tx = joints[i]!.x - joints[i - 1]!.x;
          const ty = joints[i]!.y - joints[i - 1]!.y;
          let a = Math.atan2(ty, tx);
          if (a < 0) a += Math.PI * 2;          // normalize to [0, 2π)
          terms.push({ x: tx, y: ty, a });
        }
        terms.sort((p, q) => p.a - q.a);         // lowest angle first
        const chain: Point2[] = [{ x: 0, y: 0 }];
        let cx = 0, cy = 0;
        for (const t of terms) { cx += t.x; cy += t.y; chain.push({ x: cx, y: cy }); }
        this.orderedChainObject = buildLine(chain, 0xff00ff, this.group);
      }
    }

    // --- Gap joints (blue) ---
    // Caustic centers of the joint-angle graph: the joint-to-joint change in the
    // folded angle is ≈ t/n², which hits a whole 2π·k at link n_k = √(t/2πk).
    // These are the consistent vertical "gaps" in the angle graph. We mark the
    // rightmost 9 (k=1…9; k=1 = bisector at x=1, k=9 at x≈0.333). Graph dot n maps
    // to spiral vertex joints[n-1], matching the joint-selection convention.
    if (this.showGapJoints) {
      const joints = geometry.joints;
      const t = geometry.imaginary;
      const idxs: number[] = [];
      for (let k = 1; k <= 9; k += 1) {
        const dk = Math.round(Math.sqrt(t / (2 * Math.PI * k)));
        const vi = dk - 1;
        if (vi >= 0 && vi < joints.length) idxs.push(vi);
      }
      if (idxs.length > 0) {
        const positions = new Float32Array(idxs.length * 3);
        for (let i = 0; i < idxs.length; i += 1) {
          const jt = joints[idxs[i]!];
          if (jt === undefined) continue;
          positions[i * 3 + 0] = jt.x;
          positions[i * 3 + 1] = jt.y;
          positions[i * 3 + 2] = 0.04;
        }
        const dg = new THREE.BufferGeometry();
        dg.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const dm = new THREE.PointsMaterial({
          color: 0x2979ff, size: 11, sizeAttenuation: false,
          map: circleSprite(), alphaTest: 0.5, transparent: true,
        });
        const grp = new THREE.Group();
        grp.add(new THREE.Points(dg, dm));
        this.gapJointsObject = grp;
        this.group.add(grp);
      }
    }

    // --- Flanking near-zero joints (green outline) ---
    // The two joints flanking each gap where the folded angle is closest to 0.
    if (this.showFlankingJoints) {
      const joints = geometry.joints;
      const nums = flankingNearZeroJointNumbers(geometry.imaginary, this.index, this.getFareyMaxDenom());
      const idxs = nums.map((n) => n - 1).filter((vi) => vi >= 0 && vi < joints.length);
      if (idxs.length > 0) {
        const positions = new Float32Array(idxs.length * 3);
        for (let i = 0; i < idxs.length; i += 1) {
          const jt = joints[idxs[i]!];
          if (jt === undefined) continue;
          positions[i * 3 + 0] = jt.x;
          positions[i * 3 + 1] = jt.y;
          positions[i * 3 + 2] = 0.05;
        }
        const dg = new THREE.BufferGeometry();
        dg.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const dm = new THREE.PointsMaterial({
          color: 0x2ecc71, size: 12, sizeAttenuation: false,
          map: ringSprite(), alphaTest: 0.5, transparent: true,
        });
        const grp = new THREE.Group();
        grp.add(new THREE.Points(dg, dm));
        this.flankingJointsObject = grp;
        this.group.add(grp);
      }
    }

    // --- Index/j locked joints (orange) ---
    // The joints at n = round(T/j) for j=2,3,4. Their turning angle ≈ −t/n ≈
    // −2πTj, so incrementing ⌊T⌋ rotates it by j whole turns (≡0 mod 2π): the
    // angle is locked to the fractional part of T (up to a ⌊T⌋ mod j wobble).
    if (this.showIndexDivJoints) {
      const joints = geometry.joints;
      const idxs: number[] = [];
      for (let j = 2; j <= 4; j += 1) {
        const n = Math.round(this.index / j);
        const vi = n - 1;
        if (n >= 2 && vi >= 0 && vi < joints.length) idxs.push(vi);
      }
      if (idxs.length > 0) {
        const positions = new Float32Array(idxs.length * 3);
        for (let i = 0; i < idxs.length; i += 1) {
          const jt = joints[idxs[i]!];
          if (jt === undefined) continue;
          positions[i * 3 + 0] = jt.x;
          positions[i * 3 + 1] = jt.y;
          positions[i * 3 + 2] = 0.06;
        }
        const dg = new THREE.BufferGeometry();
        dg.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const dm = new THREE.PointsMaterial({
          color: 0xff8c00, size: 12, sizeAttenuation: false,
          map: circleSprite(), alphaTest: 0.5, transparent: true,
        });
        const grp = new THREE.Group();
        grp.add(new THREE.Points(dg, dm));
        this.indexDivJointsObject = grp;
        this.group.add(grp);
      }
    }

    // --- Farey √-scaled joints (blue outline + p/q label) ---
    // First ⌊√T/π⌋ Farey fractions p/q (numerators A038566, denominators A038567);
    // each marks the joint ⌈√(p/q)·T⌉, labelled with its fraction near the ring.
    if (this.showFareyJoints) {
      const joints = geometry.joints;
      const marks = fareyScaledJoints(this.index, this.getFareyMaxDenom())
        .map((f) => ({ ...f, jt: joints[f.n - 1] }))
        .filter((f) => f.jt !== undefined);
      if (marks.length > 0) {
        const positions = new Float32Array(marks.length * 3);
        const grp = new THREE.Group();
        for (let i = 0; i < marks.length; i += 1) {
          const jt = marks[i]!.jt!;
          positions[i * 3 + 0] = jt.x;
          positions[i * 3 + 1] = jt.y;
          positions[i * 3 + 2] = 0.07;
          // Fixed ~12px label (matches the joint-angle graph), floated just above
          // the ring via the sprite center so the offset is screen-fixed too.
          const lbl = textSprite(`${marks[i]!.p}/${marks[i]!.q}`, "#7fb0ff", 12);
          lbl.center.set(0.5, -0.4);
          lbl.position.set(jt.x, jt.y, 0.09);
          grp.add(lbl);
        }
        const dg = new THREE.BufferGeometry();
        dg.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const dm = new THREE.PointsMaterial({
          color: 0x2979ff, size: 13, sizeAttenuation: false,
          map: ringSprite(), alphaTest: 0.5, transparent: true,
        });
        grp.add(new THREE.Points(dg, dm));
        this.fareyJointsObject = grp;
        this.group.add(grp);
      }
    }

    // --- Mediants between Farey joints (red outline + (a+c)/(b+d) label) ---
    if (this.showMediants) {
      const joints = geometry.joints;
      const marks = mediantJoints(this.index, this.getFareyMaxDenom())
        .map((f) => ({ ...f, jt: joints[f.n - 1] }))
        .filter((f) => f.jt !== undefined);
      if (marks.length > 0) {
        const positions = new Float32Array(marks.length * 3);
        const grp = new THREE.Group();
        for (let i = 0; i < marks.length; i += 1) {
          const jt = marks[i]!.jt!;
          positions[i * 3 + 0] = jt.x;
          positions[i * 3 + 1] = jt.y;
          positions[i * 3 + 2] = 0.072;
          const lbl = textSprite(`${marks[i]!.p}/${marks[i]!.q}`, "#ff8080", 12);
          lbl.center.set(0.5, -0.4);
          lbl.position.set(jt.x, jt.y, 0.092);
          grp.add(lbl);
        }
        const dg = new THREE.BufferGeometry();
        dg.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const dm = new THREE.PointsMaterial({
          color: 0xff3030, size: 13, sizeAttenuation: false,
          map: ringSprite(), alphaTest: 0.5, transparent: true,
        });
        grp.add(new THREE.Points(dg, dm));
        this.mediantsObject = grp;
        this.group.add(grp);
      }
    }

    // --- 1/√n-scaled joints (red outline) ---
    // For n = 1 … ⌊√T⌋, the joint ⌈T/√n⌉. Red ring; same dot↔vertex convention.
    if (this.showRecipSqrtJoints) {
      const joints = geometry.joints;
      const idxs: number[] = [];
      for (const n of recipSqrtJointNumbers(this.index)) {
        const vi = n - 1;
        if (vi >= 0 && vi < joints.length) idxs.push(vi);
      }
      if (idxs.length > 0) {
        const positions = new Float32Array(idxs.length * 3);
        for (let i = 0; i < idxs.length; i += 1) {
          const jt = joints[idxs[i]!];
          if (jt === undefined) continue;
          positions[i * 3 + 0] = jt.x;
          positions[i * 3 + 1] = jt.y;
          positions[i * 3 + 2] = 0.08;
        }
        const dg = new THREE.BufferGeometry();
        dg.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const dm = new THREE.PointsMaterial({
          color: 0xff3030, size: 13, sizeAttenuation: false,
          map: ringSprite(), alphaTest: 0.5, transparent: true,
        });
        const grp = new THREE.Group();
        grp.add(new THREE.Points(dg, dm));
        this.recipSqrtJointsObject = grp;
        this.group.add(grp);
      }
    }

    // --- Symmetric gap edges of the 1/k caustics (purple outline) ---
    // n_c*±δ for each caustic (k=1…⌊√T⌋); δ=√(ψ₀·n_c*/(2πk)), symmetric by formula.
    if (this.showGapEdges) {
      const joints = geometry.joints;
      const idxs: number[] = [];
      for (const n of gapEdgeJointNumbers(geometry.imaginary, this.index)) {
        const vi = n - 1;
        if (vi >= 0 && vi < joints.length) idxs.push(vi);
      }
      if (idxs.length > 0) {
        const positions = new Float32Array(idxs.length * 3);
        for (let i = 0; i < idxs.length; i += 1) {
          const jt = joints[idxs[i]!];
          if (jt === undefined) continue;
          positions[i * 3 + 0] = jt.x;
          positions[i * 3 + 1] = jt.y;
          positions[i * 3 + 2] = 0.085;
        }
        const dg = new THREE.BufferGeometry();
        dg.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const dm = new THREE.PointsMaterial({
          color: 0xb060ff, size: 13, sizeAttenuation: false,
          map: ringSprite(), alphaTest: 0.5, transparent: true,
        });
        const grp = new THREE.Group();
        grp.add(new THREE.Points(dg, dm));
        this.gapEdgesObject = grp;
        this.group.add(grp);
      }
    }

    // --- Near-zero joints coloured by caustic numerator p (period) ---
    if (this.showNearZeroP) {
      const joints = geometry.joints;
      const byColor = new Map<number, number[]>();   // colorHex -> vertex indices
      for (const { n, p } of nearZeroByNumerator(geometry.imaginary, this.index, this.getFareyMaxDenom())) {
        const vi = n - 1;
        if (vi < 0 || vi >= joints.length) continue;
        const hex = NUMERATOR_COLORS[Math.min(p, 5) - 1]!;
        if (!byColor.has(hex)) byColor.set(hex, []);
        byColor.get(hex)!.push(vi);
      }
      if (byColor.size > 0) {
        const grp = new THREE.Group();
        for (const [hex, vis] of byColor) {
          const positions = new Float32Array(vis.length * 3);
          for (let i = 0; i < vis.length; i += 1) {
            const jt = joints[vis[i]!];
            if (jt === undefined) continue;
            positions[i * 3 + 0] = jt.x;
            positions[i * 3 + 1] = jt.y;
            positions[i * 3 + 2] = 0.095;
          }
          const dg = new THREE.BufferGeometry();
          dg.setAttribute("position", new THREE.BufferAttribute(positions, 3));
          const dm = new THREE.PointsMaterial({
            color: hex, size: 12, sizeAttenuation: false,
            map: ringSprite(), alphaTest: 0.5, transparent: true,
          });
          grp.add(new THREE.Points(dg, dm));
        }
        this.nearZeroPObject = grp;
        this.group.add(grp);
      }
    }

    // --- Formula gap-edge joints for the p/q caustics (white outline) ---
    // vertex n_c=causticJoint(p/q,T); symmetric half-width √(p·n_c/q); gap centre shifted
    // +p/(2q) joints right of the vertex by the cubic (right−left = p/q exactly).
    if (this.showWidthGaps) {
      const joints = geometry.joints;
      const idxs: number[] = [];
      for (const n of widthGapJoints(this.index)) {
        const vi = n - 1;
        if (vi >= 0 && vi < joints.length) idxs.push(vi);
      }
      if (idxs.length > 0) {
        const positions = new Float32Array(idxs.length * 3);
        for (let i = 0; i < idxs.length; i += 1) {
          const jt = joints[idxs[i]!];
          if (jt === undefined) continue;
          positions[i * 3 + 0] = jt.x;
          positions[i * 3 + 1] = jt.y;
          positions[i * 3 + 2] = 0.1;
        }
        const dg = new THREE.BufferGeometry();
        dg.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const dm = new THREE.PointsMaterial({
          color: 0xffffff, size: 15, sizeAttenuation: false,
          map: ringSprite(), alphaTest: 0.5, transparent: true,
        });
        const grp = new THREE.Group();
        grp.add(new THREE.Points(dg, dm));
        this.widthGapsObject = grp;
        this.group.add(grp);
      }
    }

    // --- Formula gap-edge joints for the higher p/q caustics 2/5, 3/5, 2/3 (yellow) ---
    if (this.showWidthGaps2) {
      const joints = geometry.joints;
      const idxs: number[] = [];
      for (const n of widthGapJoints2(this.index)) {
        const vi = n - 1;
        if (vi >= 0 && vi < joints.length) idxs.push(vi);
      }
      if (idxs.length > 0) {
        const positions = new Float32Array(idxs.length * 3);
        for (let i = 0; i < idxs.length; i += 1) {
          const jt = joints[idxs[i]!];
          if (jt === undefined) continue;
          positions[i * 3 + 0] = jt.x;
          positions[i * 3 + 1] = jt.y;
          positions[i * 3 + 2] = 0.1;
        }
        const dg = new THREE.BufferGeometry();
        dg.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const dm = new THREE.PointsMaterial({
          color: 0xffff00, size: 15, sizeAttenuation: false,
          map: ringSprite(), alphaTest: 0.5, transparent: true,
        });
        const grp = new THREE.Group();
        grp.add(new THREE.Points(dg, dm));
        this.widthGaps2Object = grp;
        this.group.add(grp);
      }
    }

    // --- Spiral midpoints ---
    // For each spiral S_n in 0..floor(T), the middle link is at
    //   L_N(T, S_n) = I(T) / (π · (2·S_n + 1))
    // S_n = 0 is the *last* (outermost) spiral closest to ζ; larger S_n moves inward.
    if (this.showSpiralMidpoints) {
      const T = this.index;
      const imag = indexToImag(T, this.usePolyImag);
      const Smax = Math.max(0, Math.floor(T));
      const midpoints: Point2[] = [];
      for (let s = 0; s <= Smax; s += 1) {
        const L_N = imag / (Math.PI * (2 * s + 1));
        const linkIdx = Math.max(1, Math.min(geometry.joints.length - 1, Math.round(L_N)));
        const a = geometry.joints[linkIdx - 1];
        const b = geometry.joints[linkIdx];
        if (a === undefined || b === undefined) continue;
        midpoints.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      }
      const dotGroup = new THREE.Group();
      if (midpoints.length > 0) {
        // Dots: single Points object with constant screen size (no zoom attenuation).
        const dotPositions = new Float32Array(midpoints.length * 3);
        for (let i = 0; i < midpoints.length; i += 1) {
          dotPositions[i * 3 + 0] = midpoints[i]!.x;
          dotPositions[i * 3 + 1] = midpoints[i]!.y;
          dotPositions[i * 3 + 2] = 0.02;
        }
        const dotGeom = new THREE.BufferGeometry();
        dotGeom.setAttribute("position", new THREE.BufferAttribute(dotPositions, 3));
        const dotMat = new THREE.PointsMaterial({
          color: 0xff3030,
          size: 3,
          sizeAttenuation: false,
        });
        dotGroup.add(new THREE.Points(dotGeom, dotMat));
      }
      if (midpoints.length >= 2) {
        const linePositions = new Float32Array(midpoints.length * 3);
        for (let i = 0; i < midpoints.length; i += 1) {
          linePositions[i * 3 + 0] = midpoints[i]!.x;
          linePositions[i * 3 + 1] = midpoints[i]!.y;
          linePositions[i * 3 + 2] = 0.015;
        }
        const lineGeom = new THREE.BufferGeometry();
        lineGeom.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
        const lineMat = new THREE.LineBasicMaterial({ color: 0xff3030 });
        dotGroup.add(new THREE.Line(lineGeom, lineMat));
      }
      this.group.add(dotGroup);
      this.spiralMidpointsObject = dotGroup;
    }

    // --- Extend middle link of the last K spirals ---
    // The middle link of spiral S_n (0 = last/outermost) sits at
    //   L_N(T, S_n) = I(T) / (π · (2·S_n + 1)).
    // For the last K spirals (S_n = 0 … K−1) draw that link extended far along
    // its own direction, so the line — and where these lines cross — is visible.
    if (this.extendMiddleLinksCount > 0) {
      const imag = indexToImag(this.index, this.usePolyImag);
      const Smax = Math.min(this.extendMiddleLinksCount - 1, Math.max(0, Math.floor(this.index)));
      const EXT = 50;
      const segs: number[] = [];
      for (let s = 0; s <= Smax; s += 1) {
        const L_N = imag / (Math.PI * (2 * s + 1));
        const linkIdx = Math.max(1, Math.min(geometry.joints.length - 1, Math.round(L_N)));
        const a = geometry.joints[linkIdx - 1];
        const b = geometry.joints[linkIdx];
        if (a === undefined || b === undefined) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const L = Math.hypot(dx, dy);
        if (L < 1e-15) continue;
        const ux = dx / L, uy = dy / L;
        segs.push(a.x - EXT * ux, a.y - EXT * uy, 0.013);
        segs.push(b.x + EXT * ux, b.y + EXT * uy, 0.013);
      }
      if (segs.length > 0) {
        const wrap = new THREE.Group();
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(segs), 3));
        const m = new THREE.LineBasicMaterial({ color: 0xff66ff, transparent: true, opacity: 0.6 });
        wrap.add(new THREE.LineSegments(g, m));
        this.group.add(wrap);
        this.extendMiddleLinksObject = wrap;
      }
    }

    // --- Bisector-rate ray ---
    // A length-20 ray from the origin. The bisector link is v_{N+1} (N = ⌊T⌋),
    // direction arg = −t·ln(N+1), so it spins at rate ln(N+1)·dt/dT. We anchor a
    // ray on the +x axis at every integer T and let it turn clockwise at that same
    // rate, matching the bisector link's actual rotation:
    //   φ(T) = −ln(N+1)·(t(T) − t(N)),   which is 0 at integer T.
    if (this.showBisectorRateLine) {
      const T = this.index;
      const N = Math.floor(T);
      const tT = indexToImag(T, this.usePolyImag);
      const tN = indexToImag(N, this.usePolyImag);
      const phi = -Math.log(N + 1) * (tT - tN);
      const end = { x: 20 * Math.cos(phi), y: 20 * Math.sin(phi) };
      this.bisectorRateLine = buildLine([{ x: 0, y: 0 }, end], 0x00e0a0, this.group);
    }

    // --- "2N² / (2k+1)" dots: small marker at the midpoint of link round(n_k)
    //     for k = 1, 2, …  where n_k = 2N² / (2k+1)  and  N = ⌊√(t/2π)⌋.
    //     These are the joints where Δ_n ≈ π (mod 2π) — the true spiral centers.
    if (this.showFormulaDots) {
      const t = indexToImag(this.index, this.usePolyImag);
      const N2 = t / (2 * Math.PI);                     // = N² (real)
      const twoN2 = 2 * N2;
      const maxJoint = geometry.joints.length - 1;
      const positions: number[] = [];
      for (let k = 1; ; k += 1) {
        const n_k = twoN2 / (2 * k + 1);
        const linkIdx = Math.round(n_k);
        if (linkIdx < 1) break;
        if (linkIdx > maxJoint) continue;
        const a = geometry.joints[linkIdx - 1];
        const b = geometry.joints[linkIdx];
        if (a === undefined || b === undefined) continue;
        positions.push((a.x + b.x) / 2, (a.y + b.y) / 2, 0.021);
        if (linkIdx <= 1) break;
      }
      if (positions.length > 0) {
        const geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
        const mat = new THREE.PointsMaterial({
          color: 0xffffff,
          size: 1.5,
          sizeAttenuation: false,
        });
        const wrap = new THREE.Group();
        wrap.add(new THREE.Points(geom, mat));
        this.group.add(wrap);
        this.formulaDotsObject = wrap;
      }
    }

    // --- Empirical visible-spiral centers: scan every joint, compute the
    //     true turning angle Δ_n = −t·ln(1+1/n) (mod 2π), and place a dot at
    //     each strict local minimum of |Δ_n − π| below a threshold.
    //     Δ ≈ π means consecutive links REVERSE — the path is at the tight-
    //     turn point of a visible spiral/zigzag center. This works at every
    //     scale (near N and far from N) because it uses the actual Δ values
    //     rather than an asymptotic approximation. ---
    if (this.showNearNDots) {
      const t = indexToImag(this.index, this.usePolyImag);
      const TWO_PI = 2 * Math.PI;
      const PI = Math.PI;
      const maxJoint = geometry.joints.length - 1;
      // Threshold tuned so we get ~one dot per visible structure without
      // missing the weaker ones. 0.15 rad ≈ 8.5°.
      const THRESH = 0.15;
      const positions: number[] = [];
      // 3-point sliding window to detect strict local minima of |Δ_n − π|.
      let dPrev = Infinity, dCurr = Infinity;
      for (let n = 1; n <= maxJoint + 1; n += 1) {
        const raw = -t * Math.log1p(1 / n);
        const delta = raw - TWO_PI * Math.round(raw / TWO_PI);
        const distPi = Math.abs(Math.abs(delta) - PI);
        if (n >= 2 && dPrev < distPi && dPrev < dCurr && dPrev < THRESH) {
          // The minimum lies at joint (n-1) — the joint where Δ_{n-1} happens.
          // The zigzag tip sits exactly at geometry.joints[n-1].
          const jointIdx = n - 1;
          if (jointIdx >= 0 && jointIdx <= maxJoint) {
            const p = geometry.joints[jointIdx];
            if (p !== undefined) {
              positions.push(p.x, p.y, 0.022);
            }
          }
        }
        dCurr = dPrev;
        dPrev = distPi;
      }
      if (positions.length > 0) {
        const geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
        const mat = new THREE.PointsMaterial({
          color: 0xffaa33,
          size: 1.5,
          sizeAttenuation: false,
        });
        const wrap = new THREE.Group();
        wrap.add(new THREE.Points(geom, mat));
        this.group.add(wrap);
        this.nearNDotsObject = wrap;
      }
    }

    // --- Bisector line for joint reflections.
    //     Bisector point = sum1 + R1_ps  (the endpoint of the green "Rps Legs+"
    //     leg drawn in the remainder layer). Falls back to the perpendicular
    //     bisector of (origin, ζ) through ζ/2 if degenerate. ---
    const __sum1 = calcForwardSum(this.sigma, this.index);
    const __r1ps = calcRps1(this.sigma, this.index);
    const bisectorPoint: Point2 = {
      x: __sum1.re + __r1ps.re,
      y: __sum1.im + __r1ps.im,
    };
    let bisAx = NaN, bisAy = NaN; // a point on the line (anchor)
    let bisNx = NaN, bisNy = NaN; // unit NORMAL to the line (used for reflection)
    {
      const ax = geometry.zeta.x / 2;
      const ay = geometry.zeta.y / 2;
      const dx = bisectorPoint.x - ax;
      const dy = bisectorPoint.y - ay;
      const dLen = Math.hypot(dx, dy);
      if (dLen > 1e-12) {
        // Line direction = (bp − ζ/2) / |·|. Normal = rotate 90°.
        bisNx = -dy / dLen;
        bisNy = dx / dLen;
        bisAx = ax;
        bisAy = ay;
      } else {
        // Fallback: perpendicular to ζ through ζ/2.
        const zLen = Math.hypot(geometry.zeta.x, geometry.zeta.y);
        if (zLen > 1e-12) {
          bisNx = geometry.zeta.x / zLen;
          bisNy = geometry.zeta.y / zLen;
          bisAx = ax;
          bisAy = ay;
        }
      }
    }
    const reflectAcrossBisector = (px: number, py: number): { x: number; y: number } => {
      const dot = (px - bisAx) * bisNx + (py - bisAy) * bisNy;
      return { x: px - 2 * dot * bisNx, y: py - 2 * dot * bisNy };
    };

    // --- Lines from each joint to its reflection across the bisector line ---
    if (this.showJointReflectLines && !Number.isNaN(bisAx)) {
      const N = Math.max(0, Math.floor(this.index));
      const last = Math.min(geometry.joints.length - 1, N);
      const segCount = last + 1;
      const positions = new Float32Array(segCount * 2 * 3);
      for (let i = 0; i <= last; i += 1) {
        const p = geometry.joints[i]!;
        const r = reflectAcrossBisector(p.x, p.y);
        const o = i * 6;
        positions[o + 0] = p.x; positions[o + 1] = p.y; positions[o + 2] = 0.012;
        positions[o + 3] = r.x; positions[o + 4] = r.y; positions[o + 5] = 0.012;
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0xb070ff, transparent: true, opacity: 0.7 });
      const wrap = new THREE.Group();
      wrap.add(new THREE.LineSegments(geom, mat));

      // Draw the bisector line — extended to 3× its length by adding 1× to each
      // end (so it spans from 2·(ζ/2) − bp to 2·bp − ζ/2).
      {
        const ax = geometry.zeta.x / 2;
        const ay = geometry.zeta.y / 2;
        const bx = bisectorPoint.x;
        const by = bisectorPoint.y;
        const startX = 2 * ax - bx;
        const startY = 2 * ay - by;
        const endX = 2 * bx - ax;
        const endY = 2 * by - ay;
        const bisPos = new Float32Array([
          startX, startY, 0.018,
          endX,   endY,   0.018,
        ]);
        const bisGeom = new THREE.BufferGeometry();
        bisGeom.setAttribute("position", new THREE.BufferAttribute(bisPos, 3));
        const bisMat = new THREE.LineBasicMaterial({ color: 0xff2020 });
        wrap.add(new THREE.Line(bisGeom, bisMat));
      }

      this.group.add(wrap);
      this.jointReflectObject = wrap;
    }

    // --- Yellow lines from each reflected joint to its corresponding spiral midpoint.
    //     Joint i (i=0..floor(T)) connects to spiral S_n=i whose middle link is at
    //     L_N = I(T)/(π(2i+1)). ---
    if (this.showReflectToSpiralLines && !Number.isNaN(bisAx)) {
      const T = this.index;
      const imag = indexToImag(T, this.usePolyImag);
      const N = Math.max(0, Math.floor(T));
      const last = Math.min(geometry.joints.length - 1, N);
      const segCount = last + 1;
      const positions = new Float32Array(segCount * 2 * 3);
      let wrote = 0;
      for (let i = 0; i <= last; i += 1) {
        const p = geometry.joints[i]!;
        const r = reflectAcrossBisector(p.x, p.y);
        const L_N = imag / (Math.PI * (2 * i + 1));
        const linkIdx = Math.max(1, Math.min(geometry.joints.length - 1, Math.round(L_N)));
        const a = geometry.joints[linkIdx - 1];
        const b = geometry.joints[linkIdx];
        if (a === undefined || b === undefined) continue;
        const spx = (a.x + b.x) / 2;
        const spy = (a.y + b.y) / 2;
        const o = wrote * 6;
        positions[o + 0] = r.x; positions[o + 1] = r.y; positions[o + 2] = 0.011;
        positions[o + 3] = spx; positions[o + 4] = spy; positions[o + 5] = 0.011;
        wrote += 1;
      }
      if (wrote > 0) {
        const geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.BufferAttribute(positions.subarray(0, wrote * 6), 3));
        const mat = new THREE.LineBasicMaterial({ color: 0xffff33, transparent: true, opacity: 0.8 });
        const wrap = new THREE.Group();
        wrap.add(new THREE.LineSegments(geom, mat));
        this.group.add(wrap);
        this.reflectToSpiralObject = wrap;
      }
    }

    // --- Circumscribed circle through (origin, ζ, bisector point), with a
    //     big dot at the centre. Solves for the unique circle through the
    //     three points; skips draw if the points are collinear. ---
    if (this.showOriginZetaBisCircle) {
      const x2 = geometry.zeta.x, y2 = geometry.zeta.y;
      const x3 = bisectorPoint.x,  y3 = bisectorPoint.y;
      const denom = 2 * (x2 * y3 - x3 * y2);
      if (Math.abs(denom) > 1e-15) {
        const s2 = x2 * x2 + y2 * y2;
        const s3 = x3 * x3 + y3 * y3;
        const cx = (s2 * y3 - s3 * y2) / denom;
        const cy = (s3 * x2 - s2 * x3) / denom;
        const radius = Math.hypot(cx, cy);
        const wrap = new THREE.Group();
        // Circle outline.
        if (radius > 0 && Number.isFinite(radius)) {
          const SEGMENTS = 256;
          const positions = new Float32Array((SEGMENTS + 1) * 3);
          for (let i = 0; i <= SEGMENTS; i += 1) {
            const a = (i / SEGMENTS) * Math.PI * 2;
            positions[i * 3 + 0] = cx + radius * Math.cos(a);
            positions[i * 3 + 1] = cy + radius * Math.sin(a);
            positions[i * 3 + 2] = 0.014;
          }
          const geom = new THREE.BufferGeometry();
          geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
          const mat = new THREE.LineBasicMaterial({ color: 0xff66cc });
          wrap.add(new THREE.Line(geom, mat));
        }
        // Thin plus sign at centre — a small target marker (two crossing
        // 1px line segments). Drawn in world units; LineBasicMaterial keeps
        // each segment 1px wide so it stays thin at any zoom.
        const arm = 0.05;
        const plusPos = new Float32Array([
          cx - arm, cy,       0.019,
          cx + arm, cy,       0.019,
          cx,       cy - arm, 0.019,
          cx,       cy + arm, 0.019,
        ]);
        const plusGeom = new THREE.BufferGeometry();
        plusGeom.setAttribute("position", new THREE.BufferAttribute(plusPos, 3));
        const plusMat = new THREE.LineBasicMaterial({ color: 0xff66cc });
        wrap.add(new THREE.LineSegments(plusGeom, plusMat));
        this.group.add(wrap);
        this.originZetaBisCircleObject = wrap;
      }
    }

    // --- ¼-joint line ∥ bisector, and where it crosses the origin→ζ ray ---
    // "Bisector line" = the perpendicular bisector of origin→ζ (through ζ/2, ⟂ to origin→ζ
    // — the functional-equation symmetry axis at σ=½). We draw a line through the 1/4 caustic
    // joint (n = causticJoint(1/4,T), point joints[n−1]) parallel to it, plus the origin→ζ ray
    // with a dot at ζ/2. Intersection Q = t·ζ solves t = (P×d)/(ζ×d) (cross(a,b)=ax·by−ay·bx);
    // reported as ratio 2t of the origin→ζ/2 length (1 = at ζ/2, 2 = at ζ). The ⟂-bisector
    // itself meets origin→ζ exactly at ζ/2 (ratio 1).
    if (this.showQuarterBisector) {
      const joints = geometry.joints;
      // Match the Farey "1/4" label, which marks ⌈causticJoint⌉ (not round), so the line
      // passes through the same joint as the label.
      const nq = Math.ceil(causticJoint(0.25, this.index));
      const P = joints[nq - 1];
      const z = geometry.zeta;
      // Small dot of constant on-screen size (px), independent of zoom.
      const pixelDot = (x: number, y: number, zz: number, color: number): THREE.Points => {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([x, y, zz]), 3));
        const m = new THREE.PointsMaterial({
          color, size: 9, sizeAttenuation: false,
          map: circleSprite(), alphaTest: 0.5, transparent: true,
        });
        return new THREE.Points(g, m);
      };
      if (P !== undefined) {
        let dx = -z.y, dy = z.x;                       // ⟂ to origin→ζ = bisector direction
        const dLen = Math.hypot(dx, dy);
        if (dLen > 1e-12) {
          dx /= dLen; dy /= dLen;
          const wrap = new THREE.Group();
          buildLine([{ x: 0, y: 0 }, { x: z.x, y: z.y }], 0x00ff88, wrap);   // origin→ζ (green)
          wrap.add(pixelDot(z.x / 2, z.y / 2, 0.02, 0xff55ff));               // ζ/2 dot (magenta)
          const cross = z.x * dy - z.y * dx;
          if (Math.abs(cross) > 1e-12) {
            const t = (P.x * dy - P.y * dx) / cross;
            const qx = t * z.x, qy = t * z.y;
            const ratio = 2 * t;                        // relative to origin→ζ/2 length
            const lamQ = (qx - P.x) * dx + (qy - P.y) * dy;
            const pad = 0.35 * Math.hypot(z.x, z.y) + 0.5;
            const lo = Math.min(0, lamQ) - pad, hi = Math.max(0, lamQ) + pad;
            buildLine(                                  // ¼-joint line ∥ bisector (cyan)
              [{ x: P.x + lo * dx, y: P.y + lo * dy }, { x: P.x + hi * dx, y: P.y + hi * dy }],
              0x00e5ff, wrap);
            wrap.add(pixelDot(qx, qy, 0.03, 0x00e5ff));  // intersection dot (cyan)
            const lbl = textSprite(`×${ratio.toFixed(3)}`, "#00e5ff", 13);
            lbl.position.set(qx, qy, 0.04);
            wrap.add(lbl);
          }
          this.group.add(wrap);
          this.quarterBisectorObject = wrap;
        }
      }
    }

    // --- Cochleoid  r = a·sin(θ)/θ  with axis from ζ/2 toward bp.
    //     bp = apex (θ→0, r→a) ⇒ s = D − a.  Origin and ζ on curve.
    //     At σ=½ the axis is the ⟂-bisector of (origin, ζ), so origin and
    //     ζ are mirrors across the axis. Cochleoid is symmetric across its
    //     axis ⇒ origin-on-curve and ζ-on-curve are the SAME constraint.
    //     1 unknown (a), 1 effective equation: determined system. ---
    if (this.showCochleoid) {
      const zX = geometry.zeta.x, zY = geometry.zeta.y;
      const Mx = zX / 2, My = zY / 2;
      const bpDx = bisectorPoint.x - Mx, bpDy = bisectorPoint.y - My;
      const D = Math.hypot(bpDx, bpDy);
      if (D > 1e-9) {
        const ux = bpDx / D, uy = bpDy / D;
        const vx = -uy, vy = ux;
        const pPar = (0 - Mx) * ux + (0 - My) * uy;
        const pPerp = (0 - Mx) * vx + (0 - My) * vy;
        const qPar = (zX - Mx) * ux + (zY - My) * uy;
        const qPerp = (zX - Mx) * vx + (zY - My) * vy;
        // Residual for a constraint point; min over branches.
        const resNorm = (a: number, par: number, perp: number): number => {
          const s = D - a;
          const xl = par - s;
          const rho = Math.hypot(xl, perp);
          if (rho < 1e-15) return 1;
          const psi0 = Math.atan2(perp, xl);
          let bestAbs = Infinity;
          let bestSigned = 0;
          for (let k = -4; k <= 4; k += 1) {
            const psi = psi0 + 2 * Math.PI * k;
            if (Math.abs(psi) < 1e-9) {
              const diff = (rho - a) / a;
              if (Math.abs(diff) < bestAbs) { bestAbs = Math.abs(diff); bestSigned = diff; }
              continue;
            }
            const rCurve = a * Math.sin(psi) / psi;
            const diff = (rho - rCurve) / a;
            if (Math.abs(diff) < bestAbs) { bestAbs = Math.abs(diff); bestSigned = diff; }
          }
          return bestSigned;
        };
        const G = (a: number): number => {
          const r1 = resNorm(a, pPar, pPerp);
          const r2 = resNorm(a, qPar, qPerp);
          return r1 * r1 + r2 * r2;
        };
        const scale = Math.max(1, Math.hypot(zX, zY), D);
        // Coarse log-scan for local minima of G(a).
        const aLo = 1e-3 * scale, aHi = 50 * scale;
        const N = 1200;
        const samples: { a: number; g: number }[] = [];
        for (let i = 0; i <= N; i += 1) {
          const t = i / N;
          const aCur = aLo * Math.pow(aHi / aLo, t);
          samples.push({ a: aCur, g: G(aCur) });
        }
        const candidates: number[] = [];
        for (let i = 1; i + 1 < samples.length; i += 1) {
          if (samples[i]!.g < samples[i - 1]!.g && samples[i]!.g < samples[i + 1]!.g) {
            candidates.push(samples[i]!.a);
          }
        }
        if (candidates.length === 0) {
          let bestI = 0;
          for (let i = 1; i < samples.length; i += 1) if (samples[i]!.g < samples[bestI]!.g) bestI = i;
          candidates.push(samples[bestI]!.a);
        }
        const golden = (lo: number, hi: number): number => {
          const phi = (Math.sqrt(5) - 1) / 2;
          let x1 = hi - phi * (hi - lo);
          let x2 = lo + phi * (hi - lo);
          let f1 = G(x1), f2 = G(x2);
          for (let it = 0; it < 100; it += 1) {
            if ((hi - lo) < 1e-12 * scale) break;
            if (f1 < f2) {
              hi = x2; x2 = x1; f2 = f1;
              x1 = hi - phi * (hi - lo); f1 = G(x1);
            } else {
              lo = x1; x1 = x2; f1 = f2;
              x2 = lo + phi * (hi - lo); f2 = G(x2);
            }
          }
          return 0.5 * (lo + hi);
        };
        let best: { s: number; a: number; res: number } | null = null;
        for (const a0 of candidates) {
          const aL = Math.max(aLo, a0 / 3);
          const aH = Math.min(aHi, a0 * 3);
          const aMin = golden(aL, aH);
          const gMin = G(aMin);
          if (Number.isFinite(gMin) && aMin > 0) {
            if (best === null || gMin < best.res) {
              best = { s: D - aMin, a: aMin, res: gMin };
            }
          }
        }
        if (best !== null) {
          const { s, a } = best;
          const Cx = Mx + s * ux;
          const Cy = My + s * uy;
          // Draw cochleoid: ψ ∈ [-K·π, K·π] (a few loops on each side).
          // r(ψ) = a·sin(ψ)/ψ (limit a at ψ=0). Skip exact ψ=0 in loop and
          // patch with limit.
          const K = 2;
          const SEGMENTS = 1200;
          const positions = new Float32Array((SEGMENTS + 1) * 3);
          for (let i = 0; i <= SEGMENTS; i += 1) {
            const psi = -K * Math.PI + (i / SEGMENTS) * 2 * K * Math.PI;
            const r = Math.abs(psi) < 1e-9 ? a : a * Math.sin(psi) / psi;
            const xl = r * Math.cos(psi);
            const yl = r * Math.sin(psi);
            positions[i * 3 + 0] = Cx + xl * ux + yl * vx;
            positions[i * 3 + 1] = Cy + xl * uy + yl * vy;
            positions[i * 3 + 2] = 0.013;
          }
          const geom = new THREE.BufferGeometry();
          geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
          const mat = new THREE.LineBasicMaterial({ color: 0xff9933 });
          const wrap = new THREE.Group();
          wrap.add(new THREE.Line(geom, mat));
          this.group.add(wrap);
          this.cochleoidObject = wrap;
        }
      }
    }

    // --- Cornu-style spirals (even-κ family). Mirror-symmetric across axis.
    //     Placement: bp at midpoint, spiral terminus on +s side EXACTLY at ζ,
    //     and on −s side EXACTLY at origin. Anisotropic scaling: independent
    //     scale factors along û (axis, toward ζ/2) and v̂ (perpendicular) so
    //     both (par, perp) distances match. Mirror symmetry preserved.
    //     a_par  =  D            / X∞_signed   (signed, so curve faces toward M)
    //     a_perp =  (|ζ|/2)·sgn  / Y∞_signed   (signed, so +s → +v̂_toward_ζ) ---
    const renderCornu = (
      enabled: boolean,
      kappa: (s: number) => number,
      sMax: number,
      color: number,
    ): THREE.Group | null => {
      if (!enabled) return null;
      const zX = geometry.zeta.x, zY = geometry.zeta.y;
      const Mx = zX / 2, My = zY / 2;
      const bpDx = Mx - bisectorPoint.x, bpDy = My - bisectorPoint.y;
      const D = Math.hypot(bpDx, bpDy);
      if (D < 1e-9) return null;
      const ux = bpDx / D, uy = bpDy / D;
      const vx = -uy, vy = ux;
      // v̂ aligned so ζ has positive v̂ component.
      const zetaV = (zX - bisectorPoint.x) * vx + (zY - bisectorPoint.y) * vy;
      const sV = zetaV >= 0 ? 1 : -1;
      const vAx = sV * vx, vAy = sV * vy;
      // Integrate unit-form curve for s ∈ [0, sMax].
      const STEPS = 4000;
      const ds = sMax / STEPS;
      const xs = new Float64Array(STEPS + 1);
      const ys = new Float64Array(STEPS + 1);
      let xu = 0, yu = 0, theta = Math.PI / 2;
      xs[0] = 0; ys[0] = 0;
      for (let i = 0; i < STEPS; i += 1) {
        const sCur = i * ds;
        const k = kappa(sCur);
        xu += Math.cos(theta) * ds;
        yu += Math.sin(theta) * ds;
        theta += k * ds;
        xs[i + 1] = xu;
        ys[i + 1] = yu;
      }
      const Xinf = xu, Yinf = yu;
      if (!Number.isFinite(Xinf) || !Number.isFinite(Yinf)) return null;
      if (Math.abs(Xinf) < 1e-12 || Math.abs(Yinf) < 1e-12) return null;
      const halfZ = Math.hypot(zX, zY) / 2;
      // Signed anisotropic scales so spiral terminus lands exactly at ζ.
      const aPar  = D     / Xinf;
      const aPerp = halfZ / Yinf;
      const Bx = bisectorPoint.x, By = bisectorPoint.y;
      const TOTAL = 2 * STEPS + 1;
      const positions = new Float32Array(TOTAL * 3);
      for (let i = 0; i <= STEPS; i += 1) {
        const xl = aPar * xs[i]!;
        const yl = aPerp * ys[i]!;
        const idxP = STEPS + i;
        positions[idxP * 3 + 0] = Bx + xl * ux + yl * vAx;
        positions[idxP * 3 + 1] = By + xl * uy + yl * vAy;
        positions[idxP * 3 + 2] = 0.013;
      }
      for (let i = 1; i <= STEPS; i += 1) {
        const xl = aPar * xs[i]!;
        const yl = -aPerp * ys[i]!;
        const idxN = STEPS - i;
        positions[idxN * 3 + 0] = Bx + xl * ux + yl * vAx;
        positions[idxN * 3 + 1] = By + xl * uy + yl * vAy;
        positions[idxN * 3 + 2] = 0.013;
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({ color });
      const wrap = new THREE.Group();
      wrap.add(new THREE.Line(geom, mat));
      this.group.add(wrap);
      return wrap;
    };
    const kappaMax = this.cornuKappaMax;
    this.cornuS2p1Object = renderCornu(this.showCornuS2p1, (s) => s * s + 1, Math.sqrt(Math.max(0, kappaMax - 1)), 0xff9933);
    this.cornuS2Object   = renderCornu(this.showCornuS2,   (s) => s * s,     Math.sqrt(kappaMax),                 0xff3333);
    // Green: pick sMax so the world tangent at the origin-side endpoint is
    // colinear with the first ζ-link (which is the segment from origin to
    // joints[1] = (1,0)). Iterate forward integrating κ=s²−1, at each step
    // compute the implied (aPar, aPerp) from the current (X, Y) endpoint
    // and the world y-component of the tangent. Solve T_world.y = 0.
    const greenSMax = (() => {
      const zX0 = geometry.zeta.x, zY0 = geometry.zeta.y;
      const Mx0 = zX0 / 2, My0 = zY0 / 2;
      const bpDx0 = Mx0 - bisectorPoint.x, bpDy0 = My0 - bisectorPoint.y;
      const D0 = Math.hypot(bpDx0, bpDy0);
      if (D0 < 1e-9) return Math.sqrt(kappaMax + 1) + 0.3;
      const ux0 = bpDx0 / D0, uy0 = bpDy0 / D0;
      const vx0 = -uy0, vy0 = ux0;
      const zetaV0 = (zX0 - bisectorPoint.x) * vx0 + (zY0 - bisectorPoint.y) * vy0;
      const sV0 = zetaV0 >= 0 ? 1 : -1;
      const vAy0 = sV0 * vy0;
      const halfZ0 = Math.hypot(zX0, zY0) / 2;
      const N = 8000;
      const sMaxLimit = 6.0;
      const ds = sMaxLimit / N;
      let xu = 0, yu = 0, theta = Math.PI / 2;
      let prevRes = NaN;
      let prevS = 0;
      for (let i = 1; i <= N; i += 1) {
        const sPrev = (i - 1) * ds;
        const k = sPrev * sPrev - 1;
        xu += Math.cos(theta) * ds;
        yu += Math.sin(theta) * ds;
        theta += k * ds;
        const sCur = i * ds;
        if (Math.abs(xu) < 1e-9 || Math.abs(yu) < 1e-9) {
          prevS = sCur;
          continue;
        }
        const aPar = D0 / xu;
        const aPerp = halfZ0 / yu;
        // Tangent at -s end in world (d/ds direction).
        // For κ even with θ(0)=π/2: dx_u/ds at -s = -cos(θ(s)), dy_u/ds = sin(θ(s)).
        const Ty = aPar * (-Math.cos(theta)) * uy0 + aPerp * Math.sin(theta) * vAy0;
        if (!Number.isNaN(prevRes) && prevRes * Ty < 0) {
          return prevS + (sCur - prevS) * (-prevRes) / (Ty - prevRes);
        }
        prevRes = Ty;
        prevS = sCur;
      }
      return Math.sqrt(kappaMax + 1) + 0.3;  // fallback
    })();
    this.cornuS2m1Object = renderCornu(this.showCornuS2m1, (s) => s * s - 1, greenSMax, 0xaaff66);

    // --- Extended link lines: for each ζ-spiral link, draw a line that
    //     extends the link by +10 units on each side along its direction. ---
    if (this.showExtendedLinkLines) {
      const jts = geometry.joints;
      const maxLink = Math.min(jts.length - 1, Math.floor(this.index));
      const fwd: number[] = [];   // after link endpoint b (forward = +d): RED
      const back: number[] = [];  // before link start a (backward = −d): GREEN
      for (let j = 1; j <= maxLink; j += 1) {
        const a = jts[j - 1]!, b = jts[j]!;
        const dx = b.x - a.x, dy = b.y - a.y;
        const L = Math.hypot(dx, dy);
        if (L < 1e-15) continue;
        const ux = dx / L, uy = dy / L;
        const EXT = 10;
        // Backward extension (start side, −d): from a−10d to a.
        back.push(a.x - EXT * ux, a.y - EXT * uy, 0.014);
        back.push(a.x, a.y, 0.014);
        // Forward extension (end side, +d): from b to b+10d.
        fwd.push(b.x, b.y, 0.014);
        fwd.push(b.x + EXT * ux, b.y + EXT * uy, 0.014);
      }
      const wrap = new THREE.Group();
      if (back.length > 0) {
        const arr = new Float32Array(back);
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
        const m = new THREE.LineBasicMaterial({ color: 0x44cc66, transparent: true, opacity: 0.35 });
        wrap.add(new THREE.LineSegments(g, m));
      }
      if (fwd.length > 0) {
        const arr = new Float32Array(fwd);
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
        const m = new THREE.LineBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.35 });
        wrap.add(new THREE.LineSegments(g, m));
      }
      if (back.length > 0 || fwd.length > 0) {
        this.group.add(wrap);
        this.extendedLinkLinesObject = wrap;
      }
    }

    // --- Unweighted exponential-sum spiral.  N matches the ζ-spiral's link
    //     count (geometry.joints.length - 1, which respects extendSpiralCount
    //     and any other extensions of the main spiral). ---
    if (this.showUnweightedSpiral) {
      const t = indexToImag(this.index, this.usePolyImag);
      const N = Math.max(0, geometry.joints.length - 1);
      const LINK_SCALE = 0.5;
      const positions = new Float32Array((N + 1) * 3);
      let x = 0, y = 0;
      positions[0] = 0; positions[1] = 0; positions[2] = 0.012;
      for (let n = 1; n <= N; n += 1) {
        const phi = -t * Math.log(n);
        x += LINK_SCALE * Math.cos(phi);
        y += LINK_SCALE * Math.sin(phi);
        positions[n * 3 + 0] = x;
        positions[n * 3 + 1] = y;
        positions[n * 3 + 2] = 0.012;
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0xbb88ff, transparent: true, opacity: 0.8 });
      const wrap = new THREE.Group();
      wrap.add(new THREE.Line(geom, mat));
      this.group.add(wrap);
      this.unweightedSpiralObject = wrap;
    }

    // --- Pure-phase (Li-form) spiral with f(n) = sin(√n). Independent of t
    //     (only N changes with slider). N matches the ζ-spiral's link count. ---
    if (this.showSinSqrtPhaseSpiral) {
      const N = Math.max(0, geometry.joints.length - 1);
      const positions = new Float32Array((N + 1) * 3);
      let x = 0, y = 0;
      positions[0] = 0; positions[1] = 0; positions[2] = 0.012;
      for (let n = 1; n <= N; n += 1) {
        const phi = 2 * Math.PI * Math.sin(Math.sqrt(n));
        x += Math.cos(phi);
        y += Math.sin(phi);
        positions[n * 3 + 0] = x;
        positions[n * 3 + 1] = y;
        positions[n * 3 + 2] = 0.012;
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0x66ff99, transparent: true, opacity: 0.8 });
      const wrap = new THREE.Group();
      wrap.add(new THREE.Line(geom, mat));
      this.group.add(wrap);
      this.sinSqrtPhaseSpiralObject = wrap;
    }

    // --- "analog conveyor belt": polyline of the complex value
    //   F(T') = ζ(σ + i·I(T'))  −  χ(σ + i·I(T')) · Σ_{n=1}^{N(N+2)} n^{−(1−σ−i·I(T'))}
    // for T' ∈ [floor(T), floor(T)+1), with N = floor(T) constant on the interval. ---
    if (this.showAnalogConveyorBelt) {
      const Tlo = Math.floor(this.index);
      const N = Tlo;
      const M = N * (N + 2);
      const sigma = this.sigma;
      if (M >= 1) {
        const SAMPLES = 256;
        // Pre-compute log(n) for n = 1..M (avoid recomputing each sample).
        const logTable = new Float64Array(M + 1);
        for (let n = 1; n <= M; n += 1) logTable[n] = Math.log(n);
        const oneMinusSigma = 1 - sigma;
        const invDenomTable = new Float64Array(M + 1);
        for (let n = 1; n <= M; n += 1) invDenomTable[n] = 1 / Math.pow(n, oneMinusSigma);
        const positions = new Float32Array((SAMPLES + 1) * 3);
        for (let i = 0; i <= SAMPLES; i += 1) {
          const Tp = Tlo + (i / SAMPLES) * 0.9999999;
          const tp = indexToImag(Tp, this.usePolyImag);
          let sRe = 0, sIm = 0;
          for (let n = 1; n <= M; n += 1) {
            const ang = tp * logTable[n]!;
            const inv = invDenomTable[n]!;
            sRe += Math.cos(ang) * inv;
            sIm += Math.sin(ang) * inv;
          }
          // Use chiBrian (now the default χ everywhere, including in the
          // inverse-spiral geometry) so this formula matches the
          // inverse-reflected joint #M.
          const chi = chiBrian({ re: sigma, im: tp });
          const sigma2Re = chi.re * sRe - chi.im * sIm;
          const sigma2Im = chi.re * sIm + chi.im * sRe;
          const zg = computeZakSpiralGeometry(sigma, Tp);
          const value_re = zg.zeta.x - sigma2Re;
          const value_im = zg.zeta.y - sigma2Im;
          positions[i * 3 + 0] = value_re;
          positions[i * 3 + 1] = value_im;
          positions[i * 3 + 2] = 0.016;
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.LineBasicMaterial({ color: 0xff2222 });
        const wrap = new THREE.Group();
        wrap.add(new THREE.Line(geom, mat));
        // Red dot at the current T position on the curve.
        {
          const tNow = indexToImag(this.index, this.usePolyImag);
          let sRe = 0, sIm = 0;
          for (let n = 1; n <= M; n += 1) {
            const ang = tNow * logTable[n]!;
            const inv = invDenomTable[n]!;
            sRe += Math.cos(ang) * inv;
            sIm += Math.sin(ang) * inv;
          }
          const chi = chiBrian({ re: sigma, im: tNow });
          const sigma2Re = chi.re * sRe - chi.im * sIm;
          const sigma2Im = chi.re * sIm + chi.im * sRe;
          const zg = computeZakSpiralGeometry(sigma, this.index);
          const dotX = zg.zeta.x - sigma2Re;
          const dotY = zg.zeta.y - sigma2Im;
          const dotGeom = new THREE.BufferGeometry();
          dotGeom.setAttribute("position", new THREE.BufferAttribute(new Float32Array([dotX, dotY, 0.018]), 3));
          const dotMat = new THREE.PointsMaterial({ color: 0xff2222, size: 8, sizeAttenuation: false });
          wrap.add(new THREE.Points(dotGeom, dotMat));
        }
        this.group.add(wrap);
        this.analogConveyorBeltObject = wrap;
      }
    }

    // --- Cornu/Fresnel overlay at the bisector (n* = N).
    // The partial-sum phase −t·ln(n) Taylor-expanded around n* = N has a
    // quadratic term  (t/(2N²))·(n−N)² = π·(1 + 2p/N)·(n−N)²  where
    // p = √(t/2π) − N. That quadratic phase is exactly the Fresnel kernel,
    // so the local approximation traces a parametric Cornu curve (C(u),S(u)).
    //
    // Embedding:
    //   • Anchor: the bisector midpoint.
    //   • Axes: the local x-axis is the bisector link direction (from joint
    //     J_N to J_{N+1}), the local y-axis perpendicular.
    //   • Scale: each link has length N^{-1/2}, and the Fresnel parameter
    //     change-of-variable u = j·√(1 + 2p/N) gives one "step" of u ≈ 1.
    //     Pick scale = N^{-1/2} so visual link spacing matches.
    //
    // The result is a smooth Cornu eye that visually "fits" the discrete
    // polyline's bisector fold for moderate-to-high T (N ≳ 10). ---
    if (this.showCornuFresnel) {
      const mid = geometry.middleIndex;
      const ja = geometry.joints[mid];
      const jb = geometry.joints[mid + 1];
      const N = Math.max(1, Math.floor(this.index));
      if (ja !== undefined && jb !== undefined && N >= 1) {
        const dxL = jb.x - ja.x, dyL = jb.y - ja.y;
        const Llen = Math.hypot(dxL, dyL);
        if (Llen > 1e-12) {
          // Local frame from the bisector link direction.
          const ex = dxL / Llen, ey = dyL / Llen;
          const fx = -ey, fy = ex;
          // Anchor: bisector midpoint (the actual computed point).
          const ax = bisectorPoint.x, ay = bisectorPoint.y;
          // Compute Fresnel C(u), S(u) by cumulative trapezoidal integration.
          // Cover u in [−uMax, +uMax] to expose both terminal eye centers
          // (which approach (±1/2, ±1/2) as u → ±∞).
          const uMax = 5;
          const SAMPLES = 600;
          const du = (2 * uMax) / SAMPLES;
          const Cs = new Float64Array(SAMPLES + 1);
          const Ss = new Float64Array(SAMPLES + 1);
          {
            let Ca = 0, Sa = 0;
            Cs[0] = 0; Ss[0] = 0;
            for (let i = 1; i <= SAMPLES; i += 1) {
              const uPrev = -uMax + (i - 1) * du;
              const uCur = -uMax + i * du;
              const fcP = Math.cos(Math.PI * uPrev * uPrev / 2);
              const fcC = Math.cos(Math.PI * uCur * uCur / 2);
              const fsP = Math.sin(Math.PI * uPrev * uPrev / 2);
              const fsC = Math.sin(Math.PI * uCur * uCur / 2);
              Ca += 0.5 * du * (fcP + fcC);
              Sa += 0.5 * du * (fsP + fsC);
              Cs[i] = Ca;
              Ss[i] = Sa;
            }
          }
          // Re-anchor so curve passes through (0,0) at u = 0 (we want the
          // midpoint of the symmetric parametric range to map to the
          // bisector anchor).
          let i0 = SAMPLES / 2;  // u = 0 sits at the midpoint by symmetric range
          if (!Number.isInteger(i0)) i0 = Math.round(i0);
          const Coff = Cs[i0]!, Soff = Ss[i0]!;
          // Scale chosen so one Fresnel unit equals one polyline link length.
          const scale = Llen;
          const positions = new Float32Array((SAMPLES + 1) * 3);
          for (let i = 0; i <= SAMPLES; i += 1) {
            const xl = scale * (Cs[i]! - Coff);
            const yl = scale * (Ss[i]! - Soff);
            positions[i * 3 + 0] = ax + xl * ex + yl * fx;
            positions[i * 3 + 1] = ay + xl * ey + yl * fy;
            positions[i * 3 + 2] = 0.022;
          }
          const geom = new THREE.BufferGeometry();
          geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
          const mat = new THREE.LineBasicMaterial({ color: 0x66ddff });
          const wrap = new THREE.Group();
          wrap.add(new THREE.Line(geom, mat));
          this.group.add(wrap);
          this.cornuFresnelObject = wrap;
        }
      }
    }

    // --- "yin yang" plot.
    //   Y_in1(σ, T)  = R(σ, T) · ⌊T+1⌋^{σ + i·I(T)}
    //   Y_ang1(σ, T) = Y_in1(σ, T) − χ(σ + i·I(T)) · ⌈T⌉^{−1 + 2(σ + i·I(T))}
    // Swept over T' ∈ [⌊T⌋, ⌊T⌋+1).  At non-integer T':  ⌊T'+1⌋ = ⌊T'⌋+1
    // and ⌈T'⌉ = ⌊T'⌋+1, so both = N+1 with N = ⌊T⌋.
    // Yin polyline drawn green, Yang polyline drawn red. Dots marking the
    // current T value on each curve. ---
    if (this.showYinYang) {
      const Tlo = Math.floor(this.index);
      const sigma = this.sigma;
      const SAMPLES = 256;
      const yinPos = new Float32Array((SAMPLES + 1) * 3);
      const yangPos = new Float32Array((SAMPLES + 1) * 3);
      for (let i = 0; i <= SAMPLES; i += 1) {
        // Stay strictly below floor(T)+1 so ⌊T'+1⌋ = N+1, ⌈T'⌉ = N+1.
        const Tp = Tlo + (i / SAMPLES) * 0.9999999;
        const tp = indexToImag(Tp, this.usePolyImag);
        const M = Tlo + 1; // ⌊T'+1⌋ = ⌈T'⌉ = N+1 for T' in (N, N+1).
        const lnM = Math.log(M);
        // M^s  = M^σ · (cos(t·lnM) + i·sin(t·lnM))
        const Mpow_re = Math.pow(M, sigma) * Math.cos(tp * lnM);
        const Mpow_im = Math.pow(M, sigma) * Math.sin(tp * lnM);
        // R(σ, T) — the ZAK remainder.
        const R = rak(sigma, Tp);
        // Y_in1 = R · M^s
        const yin_re = R.re * Mpow_re - R.im * Mpow_im;
        const yin_im = R.re * Mpow_im + R.im * Mpow_re;
        // M^{2s-1} = M^{2σ-1} · (cos(2t·lnM) + i·sin(2t·lnM))
        const Mp2_re = Math.pow(M, 2 * sigma - 1) * Math.cos(2 * tp * lnM);
        const Mp2_im = Math.pow(M, 2 * sigma - 1) * Math.sin(2 * tp * lnM);
        const chi = chiBrian({ re: sigma, im: tp });
        // χ · M^{2s-1}
        const chiM_re = chi.re * Mp2_re - chi.im * Mp2_im;
        const chiM_im = chi.re * Mp2_im + chi.im * Mp2_re;
        // Y_ang1 = Y_in1 − χ · M^{2s-1}
        const yang_re = yin_re - chiM_re;
        const yang_im = yin_im - chiM_im;
        yinPos[i * 3 + 0] = yin_re;
        yinPos[i * 3 + 1] = yin_im;
        yinPos[i * 3 + 2] = 0.017;
        yangPos[i * 3 + 0] = yang_re;
        yangPos[i * 3 + 1] = yang_im;
        yangPos[i * 3 + 2] = 0.017;
      }
      const yinGeom = new THREE.BufferGeometry();
      yinGeom.setAttribute("position", new THREE.BufferAttribute(yinPos, 3));
      const yinMat = new THREE.LineBasicMaterial({ color: 0x33dd66 });
      const yangGeom = new THREE.BufferGeometry();
      yangGeom.setAttribute("position", new THREE.BufferAttribute(yangPos, 3));
      const yangMat = new THREE.LineBasicMaterial({ color: 0xff3333 });
      const wrap = new THREE.Group();
      wrap.add(new THREE.Line(yinGeom, yinMat));
      wrap.add(new THREE.Line(yangGeom, yangMat));
      // Dots at current T (size = ~2× line width; LineBasicMaterial is 1px,
      // so use PointsMaterial size 4 with screen-space sizing).
      {
        const tNow = indexToImag(this.index, this.usePolyImag);
        const Mnow = Tlo + 1;
        const lnMnow = Math.log(Mnow);
        const Mpow_re = Math.pow(Mnow, sigma) * Math.cos(tNow * lnMnow);
        const Mpow_im = Math.pow(Mnow, sigma) * Math.sin(tNow * lnMnow);
        const Rnow = rak(sigma, this.index);
        const yin_re = Rnow.re * Mpow_re - Rnow.im * Mpow_im;
        const yin_im = Rnow.re * Mpow_im + Rnow.im * Mpow_re;
        const Mp2_re = Math.pow(Mnow, 2 * sigma - 1) * Math.cos(2 * tNow * lnMnow);
        const Mp2_im = Math.pow(Mnow, 2 * sigma - 1) * Math.sin(2 * tNow * lnMnow);
        const chiN = chiBrian({ re: sigma, im: tNow });
        const chiM_re = chiN.re * Mp2_re - chiN.im * Mp2_im;
        const chiM_im = chiN.re * Mp2_im + chiN.im * Mp2_re;
        const yang_re = yin_re - chiM_re;
        const yang_im = yin_im - chiM_im;
        const yinDotGeom = new THREE.BufferGeometry();
        yinDotGeom.setAttribute("position", new THREE.BufferAttribute(new Float32Array([yin_re, yin_im, 0.019]), 3));
        const yinDotMat = new THREE.PointsMaterial({ color: 0x33dd66, size: 4, sizeAttenuation: false });
        wrap.add(new THREE.Points(yinDotGeom, yinDotMat));
        const yangDotGeom = new THREE.BufferGeometry();
        yangDotGeom.setAttribute("position", new THREE.BufferAttribute(new Float32Array([yang_re, yang_im, 0.019]), 3));
        const yangDotMat = new THREE.PointsMaterial({ color: 0xff3333, size: 4, sizeAttenuation: false });
        wrap.add(new THREE.Points(yangDotGeom, yangDotMat));
      }
      this.group.add(wrap);
      this.yinYangObject = wrap;
    }

    // --- yin yang curve attached to link ⌊T⌋ (Unity DrawYinYang-style).
    // Same Y_in1/Y_ang1 curves as the origin plot, but mapped into the link's
    // frame: curve-space origin ↦ joint A = joints[N−1], curve-space (1,0) ↦
    // joint B = joints[N]. I.e. z ↦ A + Re(z)·(B−A) + Im(z)·perp(B−A), so the
    // curve scales and rotates with the link. ---
    if (this.showYinYangOnLink) {
      const N = Math.floor(this.index);
      const jA = geometry.joints[N];
      const jB = geometry.joints[N + 1];
      if (N >= 1 && jA !== undefined && jB !== undefined) {
        const ex = jB.x - jA.x, ey = jB.y - jA.y;     // local x-axis (link)
        const px = -ey, py = ex;                       // local y-axis (perp, CCW)
        const mapX = (re: number, im: number) => jA.x + re * ex + im * px;
        const mapY = (re: number, im: number) => jA.y + re * ey + im * py;

        const SAMPLES = 256;
        const M = N + 1;
        const lnM = Math.log(M);
        const sigma = this.sigma;
        const yinPos = new Float32Array((SAMPLES + 1) * 3);
        const yangPos = new Float32Array((SAMPLES + 1) * 3);
        const yy = (Tp: number): { yinRe: number; yinIm: number; yangRe: number; yangIm: number } => {
          const tp = indexToImag(Tp, this.usePolyImag);
          const Mpow_re = Math.pow(M, sigma) * Math.cos(tp * lnM);
          const Mpow_im = Math.pow(M, sigma) * Math.sin(tp * lnM);
          const R = rak(sigma, Tp);
          const yinRe = R.re * Mpow_re - R.im * Mpow_im;
          const yinIm = R.re * Mpow_im + R.im * Mpow_re;
          const Mp2_re = Math.pow(M, 2 * sigma - 1) * Math.cos(2 * tp * lnM);
          const Mp2_im = Math.pow(M, 2 * sigma - 1) * Math.sin(2 * tp * lnM);
          const chi = chiBrian({ re: sigma, im: tp });
          const chiM_re = chi.re * Mp2_re - chi.im * Mp2_im;
          const chiM_im = chi.re * Mp2_im + chi.im * Mp2_re;
          return { yinRe, yinIm, yangRe: yinRe - chiM_re, yangIm: yinIm - chiM_im };
        };
        for (let i = 0; i <= SAMPLES; i += 1) {
          const Tp = N + (i / SAMPLES) * 0.9999999;
          const v = yy(Tp);
          yinPos[i * 3 + 0] = mapX(v.yinRe, v.yinIm);
          yinPos[i * 3 + 1] = mapY(v.yinRe, v.yinIm);
          yinPos[i * 3 + 2] = 0.0175;
          yangPos[i * 3 + 0] = mapX(v.yangRe, v.yangIm);
          yangPos[i * 3 + 1] = mapY(v.yangRe, v.yangIm);
          yangPos[i * 3 + 2] = 0.0175;
        }
        const yinGeom = new THREE.BufferGeometry();
        yinGeom.setAttribute("position", new THREE.BufferAttribute(yinPos, 3));
        const yangGeom = new THREE.BufferGeometry();
        yangGeom.setAttribute("position", new THREE.BufferAttribute(yangPos, 3));
        const wrap = new THREE.Group();
        wrap.add(new THREE.Line(yinGeom, new THREE.LineBasicMaterial({ color: 0x33dd66 })));
        wrap.add(new THREE.Line(yangGeom, new THREE.LineBasicMaterial({ color: 0xff3333 })));
        // Dots at the current T, mapped the same way.
        {
          const v = yy(this.index);
          const mk = (re: number, im: number, color: number) => {
            const g = new THREE.BufferGeometry();
            g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([mapX(re, im), mapY(re, im), 0.0185]), 3));
            return new THREE.Points(g, new THREE.PointsMaterial({ color, size: 4, sizeAttenuation: false }));
          };
          wrap.add(mk(v.yinRe, v.yinIm, 0x33dd66));
          wrap.add(mk(v.yangRe, v.yangIm, 0xff3333));
        }
        this.group.add(wrap);
        this.yinYangOnLinkObject = wrap;
      }
    }

    // --- "(yin+yang)/2": midpoint of the two yin yang curves,
    // (Y_in1 + Y_ang1)/2 = Y_in1 − ½·χ·M^{2s−1}, swept over T' ∈ [⌊T⌋, ⌊T⌋+1)
    // with M = N+1 fixed. Dot marks the current T. ---
    if (this.showYinYangMid) {
      const Tlo = Math.floor(this.index);
      const sigma = this.sigma;
      const M = Tlo + 1;
      const lnM = Math.log(M);
      const mid = (Tp: number): { x: number; y: number } => {
        const tp = indexToImag(Tp, this.usePolyImag);
        const Mpow_re = Math.pow(M, sigma) * Math.cos(tp * lnM);
        const Mpow_im = Math.pow(M, sigma) * Math.sin(tp * lnM);
        const R = rak(sigma, Tp);
        const yin_re = R.re * Mpow_re - R.im * Mpow_im;
        const yin_im = R.re * Mpow_im + R.im * Mpow_re;
        const Mp2_re = Math.pow(M, 2 * sigma - 1) * Math.cos(2 * tp * lnM);
        const Mp2_im = Math.pow(M, 2 * sigma - 1) * Math.sin(2 * tp * lnM);
        const chi = chiBrian({ re: sigma, im: tp });
        const chiM_re = chi.re * Mp2_re - chi.im * Mp2_im;
        const chiM_im = chi.re * Mp2_im + chi.im * Mp2_re;
        // (yin + yang)/2 = yin − ½·χ·M^{2s−1}
        return { x: yin_re - 0.5 * chiM_re, y: yin_im - 0.5 * chiM_im };
      };
      const SAMPLES = 256;
      const positions = new Float32Array((SAMPLES + 1) * 3);
      for (let i = 0; i <= SAMPLES; i += 1) {
        const Tp = Tlo + (i / SAMPLES) * 0.9999999;
        const p = mid(Tp);
        positions[i * 3 + 0] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = 0.017;
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const wrap = new THREE.Group();
      wrap.add(new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0xffdd44 })));
      const now = mid(this.index);
      const dotGeom = new THREE.BufferGeometry();
      dotGeom.setAttribute("position", new THREE.BufferAttribute(new Float32Array([now.x, now.y, 0.019]), 3));
      wrap.add(new THREE.Points(dotGeom, new THREE.PointsMaterial({ color: 0xffdd44, size: 6, sizeAttenuation: false })));
      this.group.add(wrap);
      this.yinYangMidObject = wrap;
    }

    // --- "(yin+yang)/2 on link ⌊T⌋": the (Y_in1+Y_ang1)/2 curve mapped into
    // the bisector link's frame (like the yin-yang-on-link plot): curve origin
    // ↦ joint N, curve (1,0) ↦ joint N+1, so it scales/rotates with the link. ---
    if (this.showYinYangMidOnLink) {
      const N = Math.floor(this.index);
      const jA = geometry.joints[N];
      const jB = geometry.joints[N + 1];
      if (N >= 1 && jA !== undefined && jB !== undefined) {
        const ex = jB.x - jA.x, ey = jB.y - jA.y;     // local x-axis (link)
        const px = -ey, py = ex;                       // local y-axis (perp, CCW)
        const sigma = this.sigma;
        const M = N + 1;
        const lnM = Math.log(M);
        const mid = (Tp: number): { re: number; im: number } => {
          const tp = indexToImag(Tp, this.usePolyImag);
          const Mpow_re = Math.pow(M, sigma) * Math.cos(tp * lnM);
          const Mpow_im = Math.pow(M, sigma) * Math.sin(tp * lnM);
          const R = rak(sigma, Tp);
          const yin_re = R.re * Mpow_re - R.im * Mpow_im;
          const yin_im = R.re * Mpow_im + R.im * Mpow_re;
          const Mp2_re = Math.pow(M, 2 * sigma - 1) * Math.cos(2 * tp * lnM);
          const Mp2_im = Math.pow(M, 2 * sigma - 1) * Math.sin(2 * tp * lnM);
          const chi = chiBrian({ re: sigma, im: tp });
          const chiM_re = chi.re * Mp2_re - chi.im * Mp2_im;
          const chiM_im = chi.re * Mp2_im + chi.im * Mp2_re;
          return { re: yin_re - 0.5 * chiM_re, im: yin_im - 0.5 * chiM_im };
        };
        const mapX = (re: number, im: number) => jA.x + re * ex + im * px;
        const mapY = (re: number, im: number) => jA.y + re * ey + im * py;
        const SAMPLES = 256;
        const positions = new Float32Array((SAMPLES + 1) * 3);
        for (let i = 0; i <= SAMPLES; i += 1) {
          const Tp = N + (i / SAMPLES) * 0.9999999;
          const v = mid(Tp);
          positions[i * 3 + 0] = mapX(v.re, v.im);
          positions[i * 3 + 1] = mapY(v.re, v.im);
          positions[i * 3 + 2] = 0.0175;
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const wrap = new THREE.Group();
        wrap.add(new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0xffdd44 })));
        const now = mid(this.index);
        const dotGeom = new THREE.BufferGeometry();
        dotGeom.setAttribute("position", new THREE.BufferAttribute(new Float32Array([mapX(now.re, now.im), mapY(now.re, now.im), 0.0185]), 3));
        wrap.add(new THREE.Points(dotGeom, new THREE.PointsMaterial({ color: 0xffdd44, size: 6, sizeAttenuation: false })));
        this.group.add(wrap);
        this.yinYangMidOnLinkObject = wrap;
      }
    }

    // White ring marking the n = N (= floor(T)) dot on the N^-it dot plots —
    // it always sits at radius exactly 2π since √(N/N) = 1.
    const addNitNRing = (wrap: THREE.Group, t: number, N: number, dotRadius: number): void => {
      const phiN = -t * Math.log(N);
      const cx = 2 * Math.PI * Math.cos(phiN);
      const cy = 2 * Math.PI * Math.sin(phiN);
      const RING_R = dotRadius * 2.5;
      const SEG = 32;
      const pos = new Float32Array((SEG + 1) * 3);
      for (let i = 0; i <= SEG; i += 1) {
        const a = (i / SEG) * 2 * Math.PI;
        pos[i * 3 + 0] = cx + RING_R * Math.cos(a);
        pos[i * 3 + 1] = cy + RING_R * Math.sin(a);
        pos[i * 3 + 2] = 0.019;
      }
      const rg = new THREE.BufferGeometry();
      rg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      wrap.add(new THREE.Line(rg, new THREE.LineBasicMaterial({ color: 0xffffff })));
    };

    // --- "N^-it dot plot":  z_n = 2π·(1/√N)·√n·n^{−i·I(T)}  for n = 1…N.
    // |z_n| = 2π·√(n/N); phase = −t·ln(n) (matches the ζ-spiral's link
    // phase). Even n green, odd n red. ---
    if (this.showNitDotPlot) {
      const N = Math.max(0, Math.floor(this.index));
      if (N >= 1) {
        const t = indexToImag(this.index, this.usePolyImag);
        const invSqrtN = 1 / Math.sqrt(N);
        // World-space circles (not screen-space points) so dots scale with zoom.
        const DOT_RADIUS = 0.05;
        const circleGeom = new THREE.CircleGeometry(DOT_RADIUS, 12);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const mesh = new THREE.InstancedMesh(circleGeom, mat, N);
        const m = new THREE.Matrix4();
        const c = new THREE.Color();
        for (let n = 1; n <= N; n += 1) {
          const r = 2 * Math.PI * Math.sqrt(n) * invSqrtN;
          const phi = -t * Math.log(n);
          m.makeTranslation(r * Math.cos(phi), r * Math.sin(phi), 0.018);
          mesh.setMatrixAt(n - 1, m);
          c.set(n % 2 === 0 ? 0x33dd66 : 0xff3333);
          mesh.setColorAt(n - 1, c);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
        const wrap = new THREE.Group();
        wrap.add(mesh);
        addNitNRing(wrap, t, N, DOT_RADIUS);
        this.group.add(wrap);
        this.nitDotPlotObject = wrap;
      }
    }

    // --- "N^-it dot plot by factors": same dots as above, colored by Ω(n) =
    // number of prime factors counted with multiplicity (12 = 2·2·3 → 3).
    // Ω=1 (prime) green, Ω=2 red, Ω=3 orange, Ω=4 blue, Ω≥5 purple.
    // n=1 (Ω=0, unit) drawn gray. ---
    if (this.showNitFactorDotPlot) {
      const N = Math.max(0, Math.floor(this.index));
      if (N >= 1) {
        const t = indexToImag(this.index, this.usePolyImag);
        // Sieve of smallest-prime-factor up to N, then Ω(n) by division chain.
        const spf = new Int32Array(N + 1);
        for (let p = 2; p <= N; p += 1) {
          if (spf[p] === 0) {
            for (let m = p; m <= N; m += p) {
              if (spf[m] === 0) spf[m] = p;
            }
          }
        }
        const bigOmega = (n: number): number => {
          let count = 0;
          while (n > 1) { n = n / spf[n]!; count += 1; }
          return count;
        };
        const invSqrtN = 1 / Math.sqrt(N);
        // World-space circles (not screen-space points) so dots scale with zoom.
        const DOT_RADIUS = 0.05;
        const circleGeom = new THREE.CircleGeometry(DOT_RADIUS, 12);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const mesh = new THREE.InstancedMesh(circleGeom, mat, N);
        const m = new THREE.Matrix4();
        const c = new THREE.Color();
        const COLOR_BY_OMEGA = [0x888888, 0x33dd66, 0xff3333, 0xff9933, 0x4488ff, 0xbb55ff];
        for (let n = 1; n <= N; n += 1) {
          const r = 2 * Math.PI * Math.sqrt(n) * invSqrtN;
          const phi = -t * Math.log(n);
          m.makeTranslation(r * Math.cos(phi), r * Math.sin(phi), 0.018);
          mesh.setMatrixAt(n - 1, m);
          const omega = Math.min(5, bigOmega(n));
          c.set(COLOR_BY_OMEGA[omega]!);
          mesh.setColorAt(n - 1, c);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
        const wrap = new THREE.Group();
        wrap.add(mesh);
        addNitNRing(wrap, t, N, DOT_RADIUS);
        this.group.add(wrap);
        this.nitFactorDotPlotObject = wrap;
      }
    }

    // --- "N^-it dot plot by distinct primes": same dots, colored by ω(n) =
    // number of DISTINCT prime factors (24 = 2³·3 → 2; 27 = 3³ → 1).
    // ω=1 green, ω=2 red, ω=3 orange, ω=4 blue, ω≥5 purple; n=1 gray. ---
    if (this.showNitDistinctFactorDotPlot) {
      const N = Math.max(0, Math.floor(this.index));
      if (N >= 1) {
        const t = indexToImag(this.index, this.usePolyImag);
        const spf = new Int32Array(N + 1);
        for (let p = 2; p <= N; p += 1) {
          if (spf[p] === 0) {
            for (let m = p; m <= N; m += p) {
              if (spf[m] === 0) spf[m] = p;
            }
          }
        }
        const littleOmega = (n: number): number => {
          let count = 0;
          let prev = 0;
          while (n > 1) {
            const p = spf[n]!;
            if (p !== prev) { count += 1; prev = p; }
            n = n / p;
          }
          return count;
        };
        const invSqrtN = 1 / Math.sqrt(N);
        const DOT_RADIUS = 0.05;
        const circleGeom = new THREE.CircleGeometry(DOT_RADIUS, 12);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const mesh = new THREE.InstancedMesh(circleGeom, mat, N);
        const m = new THREE.Matrix4();
        const c = new THREE.Color();
        const COLOR_BY_OMEGA = [0x888888, 0x33dd66, 0xff3333, 0xff9933, 0x4488ff, 0xbb55ff];
        for (let n = 1; n <= N; n += 1) {
          const r = 2 * Math.PI * Math.sqrt(n) * invSqrtN;
          const phi = -t * Math.log(n);
          m.makeTranslation(r * Math.cos(phi), r * Math.sin(phi), 0.018);
          mesh.setMatrixAt(n - 1, m);
          const omega = Math.min(5, littleOmega(n));
          c.set(COLOR_BY_OMEGA[omega]!);
          mesh.setColorAt(n - 1, c);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
        const wrap = new THREE.Group();
        wrap.add(mesh);
        addNitNRing(wrap, t, N, DOT_RADIUS);
        this.group.add(wrap);
        this.nitDistinctFactorDotPlotObject = wrap;
      }
    }

    // --- ζ(s) endpoint marker: circle + centered crosshair at ζ (screen-fixed) ---
    if (this.showZetaEndpoint) {
      const z = geometry.zeta;
      this.zetaMarker = createZetaTargetMarker(0xff79c6);
      this.zetaMarker.position.set(z.x, z.y, 0.01);
      this.group.add(this.zetaMarker);
    }

    // --- "1st half" from the spiral display matrix ---
    // Forward row → forward spiral joints 0..⌊T⌋ plus R₁ps (same as Rps R1=fwd).
    // Inverse row → inverse-reflected spiral (same as Inverse Reflect) truncated
    // to joints 0..⌊T⌋, plus R₂ps (same as Rps R2=fwd).
    if (this.spiralFirstHalf || this.inverseFirstHalf) {
      const wrap = new THREE.Group();
      const sum1 = calcForwardSum(this.sigma, this.index);
      const r1 = calcRps1(this.sigma, this.index);
      const r2 = calcRps2(this.sigma, this.index);
      const sum1p: Point2 = { x: sum1.re, y: sum1.im };
      const l1: Point2 = { x: sum1.re + r1.re, y: sum1.im + r1.im };
      const l1r2: Point2 = { x: l1.x + r2.re, y: l1.y + r2.im };

      if (this.spiralFirstHalf) {
        const upToFloorT = filterJointsForDrawMode(
          geometry.joints, "upToSum1", geometry.middleIndex,
        );
        buildLine(upToFloorT, 0x66d9ff, wrap);
        // Rps R1 "fwd": Σ₁ → Σ₁ + R₁ps (same 1px stroke as spiral links)
        buildLine([sum1p, l1], RPS1_COLOR, wrap);
      }
      if (this.inverseFirstHalf) {
        const invGeom = computeInverseSpiralGeometry(
          this.sigma, this.index, this.usePolyImag,
        );
        const invUpToFloorT = filterJointsForDrawMode(
          invGeom.joints, "upToSum1", invGeom.middleIndex,
        );
        // Same reflection as Inverse Reflect (through forward ζ/2), truncated.
        const mid = { x: geometry.zeta.x / 2, y: geometry.zeta.y / 2 };
        buildLine(reflectJoints(invUpToFloorT, mid), 0xff9580, wrap);
        // Rps R2 "fwd": (Σ₁+R₁ps) → (Σ₁+R₁ps+R₂ps)
        buildLine([l1, l1r2], RPS2_COLOR, wrap);
      }
      this.group.add(wrap);
      this.firstHalfObject = wrap;
    }

    // --- Bisector midpoint targets: square + X centered on Σ₁+R_* ---
    // Mode: 1=R1ps, 2=R1ak, 3=R/2, 4=all. Screen-fixed size under zoom.
    if (this.showBisectorPoint > 0) {
      const wrap = new THREE.Group();
      const sum1 = calcForwardSum(this.sigma, this.index);
      const addAt = (r: { re: number; im: number }, color: number): void => {
        const marker = createBisectorTargetMarker(color);
        marker.position.set(sum1.re + r.re, sum1.im + r.im, 0.015);
        wrap.add(marker);
      };
      const mode = this.showBisectorPoint;
      if (mode === 1 || mode === 4) addAt(calcRps1(this.sigma, this.index), BISECTOR_R1PS_COLOR);
      if (mode === 2 || mode === 4) addAt(calcRak1(this.sigma, this.index), BISECTOR_R1AK_COLOR);
      if (mode === 3 || mode === 4) addAt(calcRHalf(this.sigma, this.index), BISECTOR_RHALF_COLOR);
      this.group.add(wrap);
      this.bisectorMarkers = wrap;
    }

    // --- Imported scatter points ---
    if (this.imported.length > 0) {
      const positions = new Float32Array(this.imported.length * 3);
      for (let i = 0; i < this.imported.length; i++) {
        const p = this.imported[i]!;
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = 0;
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({ color: 0x7c849c, size: 0.08, sizeAttenuation: true });
      this.pointsObject = new THREE.Points(geom, mat);
      this.group.add(this.pointsObject);
    }

    this.lastRebuildTimeMs = performance.now() - rebuildStart;
    this.rebuildSeq += 1;
  }
}

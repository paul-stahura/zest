/**
 * Colinearity heatmap via distance-to-line / base of remainder heads
 *   A = R1ps, B = R/2, C = R1ak  (Σ₁ cancels in differences)
 *   base = |C−A|
 *   dist = |(B−A)×(C−A)| / base     (2D)
 *   offset = dist / base             (scale-invariant; 0 ⇔ colinear)
 *
 * Same (σ,T) grid as the area run: ρ(½)=4000, N_T=3000 on [0,50].
 *
 * Run: npx vite-node scripts/remainder-colinearity-offset-heatmap.mjs
 */
import { writeFileSync } from "node:fs";
import { calcRps1, calcRak1, calcRHalf } from "../src/shared/math/sumRemainders.ts";

const SIGMA_MIN = 0;
const SIGMA_MAX = 1;
const T_MIN = 0;
const T_MAX = 50;
const N_T = 3000;
const BASE_EPS = 1e-18;

function smoothstep(t) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Absolute density: points per unit σ. */
function density(sigma) {
  const d = Math.abs(sigma - 0.5);
  if (d <= 0.25) {
    return 4000 + (200 - 4000) * smoothstep(d / 0.25);
  }
  return 200 + (100 - 200) * smoothstep((d - 0.25) / 0.25);
}

/** Build sigma grid via inverse CDF of density. */
function buildSigmaGrid() {
  const NINT = 20000;
  const xs = new Float64Array(NINT + 1);
  const cdf = new Float64Array(NINT + 1);
  let mass = 0;
  xs[0] = 0;
  cdf[0] = 0;
  for (let i = 1; i <= NINT; i++) {
    const x0 = (i - 1) / NINT;
    const x1 = i / NINT;
    const mid = 0.5 * (x0 + x1);
    mass += density(mid) * (x1 - x0);
    xs[i] = x1;
    cdf[i] = mass;
  }
  const nSigma = Math.max(3, Math.round(mass));
  const sigmas = new Float64Array(nSigma);
  sigmas[0] = SIGMA_MIN;
  sigmas[nSigma - 1] = SIGMA_MAX;
  for (let k = 1; k < nSigma - 1; k++) {
    const target = (k / (nSigma - 1)) * mass;
    let lo = 0, hi = NINT;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < target) lo = mid;
      else hi = mid;
    }
    const c0 = cdf[lo], c1 = cdf[hi];
    const x0 = xs[lo], x1 = xs[hi];
    const u = c1 > c0 ? (target - c0) / (c1 - c0) : 0;
    sigmas[k] = x0 + u * (x1 - x0);
  }
  return { sigmas, nSigma, mass };
}

/**
 * Scale-invariant colinearity: height of B over line AC, divided by |AC|.
 * Degenerate base: 0 if B≈A≈C, else 1 (not colinear in a useful sense).
 */
function probe(sigma, T) {
  const Tc = Math.max(T, 1e-4);
  const a = calcRps1(sigma, Tc);
  const b = calcRHalf(sigma, Tc);
  const c = calcRak1(sigma, Tc);
  const abx = b.re - a.re, aby = b.im - a.im;
  const acx = c.re - a.re, acy = c.im - a.im;
  const base = Math.hypot(acx, acy);
  const cross = Math.abs(abx * acy - aby * acx);
  if (base < BASE_EPS) {
    const ab = Math.hypot(abx, aby);
    return ab < BASE_EPS ? 0 : 1;
  }
  const dist = cross / base;
  return dist / base;
}

const { sigmas, nSigma, mass } = buildSigmaGrid();
process.stderr.write(`sigma grid: N=${nSigma}, ∫ρ=${mass.toFixed(1)}\n`);

const offsets = new Float64Array(nSigma * N_T);
const t0 = performance.now();

for (let j = 0; j < N_T; j++) {
  const T = T_MIN + (j / (N_T - 1)) * (T_MAX - T_MIN);
  for (let i = 0; i < nSigma; i++) {
    offsets[j * nSigma + i] = probe(sigmas[i], T);
  }
  if (j % 200 === 0) process.stderr.write(`T-row ${j}/${N_T}\n`);
}

let omin = Infinity, omax = -Infinity, sumO = 0;
let sumHalf = 0, nHalf = 0;
for (let k = 0; k < offsets.length; k++) {
  const o = offsets[k];
  if (o < omin) omin = o;
  if (o > omax) omax = o;
  sumO += o;
}
for (let j = 0; j < N_T; j++) {
  for (let i = 0; i < nSigma; i++) {
    if (Math.abs(sigmas[i] - 0.5) < 0.005) {
      sumHalf += offsets[j * nSigma + i];
      nHalf += 1;
    }
  }
}

const ms = performance.now() - t0;
const outDir = new URL("../../papers/my main paper/rewrite_v7/", import.meta.url);
const STEM = "colinearity_strip_0_50_offset_dense";

writeFileSync(new URL(`${STEM}.bin`, outDir), Buffer.from(offsets.buffer));
writeFileSync(new URL(`${STEM}_sigma.bin`, outDir), Buffer.from(sigmas.buffer));

const meta = {
  sigmaMin: SIGMA_MIN,
  sigmaMax: SIGMA_MAX,
  tMin: T_MIN,
  tMax: T_MAX,
  nSigma,
  nT: N_T,
  sigmaDensityKnots: { 0: 100, 0.25: 200, 0.5: 4000, 0.75: 200, 1: 100 },
  sigmaMass: mass,
  metric:
    "Distance of R/2 head to line through R1ps–R1ak, divided by that base. "
    + "0 ⇔ colinear; scale-invariant. Same ρ(σ) grid as area run.",
  baseEps: BASE_EPS,
  layout: "row-major T (slow) × sigma-index (fast); sigma abscissae in _sigma.bin",
  bin: `${STEM}.bin`,
  dtype: "float64",
  field: "dist/base",
  stats: {
    offsetMin: omin,
    offsetMax: omax,
    offsetMean: sumO / offsets.length,
    offsetMeanNearHalf: nHalf ? sumHalf / nHalf : null,
    nHalfSamples: nHalf,
    elapsedMs: ms,
  },
  caveat: "R1ak = Kuznetsov/i1 estimate; T clamped to ≥1e-4",
};
writeFileSync(new URL(`${STEM}.json`, outDir), JSON.stringify(meta, null, 2));
console.log(JSON.stringify(meta, null, 2));

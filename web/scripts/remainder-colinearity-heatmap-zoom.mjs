/**
 * Colinearity of the three first-half remainders R1ps, R1rs(=R/2), R1ak,
 * as points in the complex plane relative to Σ₁ (which cancels, so we use
 * the remainder vectors directly).
 *
 * Metric: triangle flatness = 2·|area| / diam², diam = max pairwise
 * distance. Scale-invariant, 0 = exactly colinear. Log color scale in the
 * plot separates exact (~1e-12) from almost (~1e-2..1e-4) colinear.
 *
 * Grid is deliberately coarse (dial-in run); bump N_T / N_SIGMA later.
 *
 * Run from web/: npx vite-node scripts/remainder-colinearity-heatmap-zoom.mjs
 */
import { writeFileSync } from "node:fs";
import { calcRps1, calcRak1, calcRHalf } from "../src/shared/math/sumRemainders.ts";

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : dflt;
}
function argStr(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : dflt;
}

const SIGMA_MIN = 0;
const SIGMA_MAX = 1;
const T_MIN = arg("t-lo", 9.42);
const T_MAX = arg("t-hi", 9.46);
const N_T = arg("nt", 101);
const N_SIGMA = arg("nsigma", 201);
const STEM = argStr("stem", "colinearity_strip_9p42_9p46_flat");

function flatness(a, b, c) {
  const abx = b.re - a.re, aby = b.im - a.im;
  const acx = c.re - a.re, acy = c.im - a.im;
  const area2 = Math.abs(abx * acy - aby * acx); // 2*area
  const dAB = Math.hypot(abx, aby);
  const dAC = Math.hypot(acx, acy);
  const dBC = Math.hypot(c.re - b.re, c.im - b.im);
  const diam = Math.max(dAB, dAC, dBC);
  if (diam < 1e-300) return 0;
  return area2 / (diam * diam);
}

/**
 * PCA aspect ratio λmin/λmax of the 3-point cloud's covariance.
 * 0 iff the points are colinear; independent of the area measure.
 */
function pcaRatio(a, b, c) {
  const mx = (a.re + b.re + c.re) / 3;
  const my = (a.im + b.im + c.im) / 3;
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of [a, b, c]) {
    const dx = p.re - mx, dy = p.im - my;
    sxx += dx * dx; sxy += dx * dy; syy += dy * dy;
  }
  const tr = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const disc = Math.sqrt(Math.max(0, tr * tr - 4 * det));
  const lmax = (tr + disc) / 2;
  const lmin = (tr - disc) / 2;
  if (lmax < 1e-300) return 0;
  return Math.max(0, lmin) / lmax;
}

function probe(sigma, T) {
  const rps = calcRps1(sigma, T);
  const rh = calcRHalf(sigma, T);
  const rak = calcRak1(sigma, T);
  return [flatness(rps, rh, rak), pcaRatio(rps, rh, rak)];
}

const sigmas = new Float64Array(N_SIGMA);
for (let i = 0; i < N_SIGMA; i++) {
  sigmas[i] = SIGMA_MIN + (i / (N_SIGMA - 1)) * (SIGMA_MAX - SIGMA_MIN);
}
{
  // Snap the nearest sample onto σ=1/2 exactly
  let iHalf = 0;
  let best = Infinity;
  for (let i = 0; i < N_SIGMA; i++) {
    const d = Math.abs(sigmas[i] - 0.5);
    if (d < best) { best = d; iHalf = i; }
  }
  sigmas[iHalf] = 0.5;
}

const nProbe = N_SIGMA * N_T;
process.stderr.write(
  `grid: N_σ=${N_SIGMA}, N_T=${N_T}, T∈[${T_MIN},${T_MAX}] (${nProbe} probes)\n`,
);

const flat = new Float64Array(nProbe);
const pca = new Float64Array(nProbe);
const t0 = performance.now();
for (let j = 0; j < N_T; j++) {
  const T = T_MIN + (j / (N_T - 1)) * (T_MAX - T_MIN);
  for (let i = 0; i < N_SIGMA; i++) {
    const [f, p] = probe(sigmas[i], T);
    flat[j * N_SIGMA + i] = f;
    pca[j * N_SIGMA + i] = p;
  }
  if (j % 20 === 0 || j === N_T - 1) {
    const elapsed = (performance.now() - t0) / 1000;
    process.stderr.write(`T-row ${j}/${N_T}  ${elapsed.toFixed(1)}s\n`);
  }
}
const ms = performance.now() - t0;

let amin = Infinity, amax = -Infinity, sum = 0;
for (const v of flat) {
  sum += v;
  if (v < amin) amin = v;
  if (v > amax) amax = v;
}

const outDir = new URL("../../papers/my main paper/rewrite_v7/", import.meta.url);
writeFileSync(new URL(`${STEM}.bin`, outDir), Buffer.from(flat.buffer));
writeFileSync(new URL(`${STEM}_pca.bin`, outDir), Buffer.from(pca.buffer));
writeFileSync(new URL(`${STEM}_sigma.bin`, outDir), Buffer.from(sigmas.buffer));

const meta = {
  sigmaMin: SIGMA_MIN,
  sigmaMax: SIGMA_MAX,
  tMin: T_MIN,
  tMax: T_MAX,
  nSigma: N_SIGMA,
  nT: N_T,
  metric: "flatness of triangle (R1ps, R/2, R1ak): 2|area|/diam^2",
  metricPca: "PCA aspect ratio lambda_min/lambda_max of the 3-point cloud",
  layout: "row-major T × sigma-index",
  bin: `${STEM}.bin`,
  binPca: `${STEM}_pca.bin`,
  dtype: "float64",
  stats: { min: amin, max: amax, mean: sum / flat.length, elapsedMs: ms },
};
writeFileSync(new URL(`${STEM}.json`, outDir), JSON.stringify(meta, null, 2));
console.log(JSON.stringify(meta, null, 2));

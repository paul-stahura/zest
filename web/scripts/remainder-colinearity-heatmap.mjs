/**
 * Colinearity heatmap via triangle area of remainder heads
 *   A = R1ps, B = R/2, C = R1ak
 *   area = (1/2)|(B−A)×(C−A)|
 *   plotted = log10(1/max(area,ε))
 *
 * Sigma sampling density ρ(σ) (points per unit σ), smoothstep between knots:
 *   ρ(0)=ρ(1)=100,  ρ(0.25)=ρ(0.75)=200,  ρ(0.5)=4000
 * Points placed by inverse-CDF of ρ so local spacing ≈ 1/ρ(σ).
 * T: uniform, 3000 samples on [0,50].
 *
 * Run: npx vite-node scripts/remainder-colinearity-heatmap.mjs
 */
import { writeFileSync } from "node:fs";
import { calcRps1, calcRak1, calcRHalf } from "../src/shared/math/sumRemainders.ts";

const SIGMA_MIN = 0;
const SIGMA_MAX = 1;
const T_MIN = 0;
const T_MAX = 50;
const N_T = 3000;
const AREA_EPS = 1e-18;

function smoothstep(t) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Absolute density: points per unit σ. */
function density(sigma) {
  const d = Math.abs(sigma - 0.5);
  if (d <= 0.25) {
    // 4000 at d=0 → 200 at d=0.25
    return 4000 + (200 - 4000) * smoothstep(d / 0.25);
  }
  // 200 at d=0.25 → 100 at d=0.5
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
    // binary search CDF
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

function probe(sigma, T) {
  const Tc = Math.max(T, 1e-4);
  const a = calcRps1(sigma, Tc);
  const b = calcRHalf(sigma, Tc);
  const c = calcRak1(sigma, Tc);
  const abx = b.re - a.re, aby = b.im - a.im;
  const acx = c.re - a.re, acy = c.im - a.im;
  const area = 0.5 * Math.abs(abx * acy - aby * acx);
  const inv = 1 / Math.max(area, AREA_EPS);
  return { area, logInv: Math.log10(inv) };
}

const { sigmas, nSigma, mass } = buildSigmaGrid();
process.stderr.write(`sigma grid: N=${nSigma}, ∫ρ=${mass.toFixed(1)}\n`);
process.stderr.write(
  `ρ(0)=${density(0).toFixed(0)} ρ(0.25)=${density(0.25).toFixed(0)} `
  + `ρ(0.5)=${density(0.5).toFixed(0)} ρ(0.75)=${density(0.75).toFixed(0)} ρ(1)=${density(1).toFixed(0)}\n`,
);

const areas = new Float64Array(nSigma * N_T);
const logInvs = new Float64Array(nSigma * N_T);
// irregular sigma: also save sigma axis for the plot
const t0 = performance.now();

for (let j = 0; j < N_T; j++) {
  const T = T_MIN + (j / (N_T - 1)) * (T_MAX - T_MIN);
  for (let i = 0; i < nSigma; i++) {
    const { area, logInv } = probe(sigmas[i], T);
    const k = j * nSigma + i;
    areas[k] = area;
    logInvs[k] = logInv;
  }
  if (j % 200 === 0) process.stderr.write(`T-row ${j}/${N_T}\n`);
}

let amin = Infinity, amax = -Infinity;
let lmin = Infinity, lmax = -Infinity;
let sumA = 0, sumL = 0;
let sumHalfL = 0, nHalf = 0;
for (let k = 0; k < areas.length; k++) {
  const a = areas[k];
  const l = logInvs[k];
  if (a < amin) amin = a;
  if (a > amax) amax = a;
  if (l < lmin) lmin = l;
  if (l > lmax) lmax = l;
  sumA += a;
  sumL += l;
}
for (let j = 0; j < N_T; j++) {
  for (let i = 0; i < nSigma; i++) {
    if (Math.abs(sigmas[i] - 0.5) < 0.005) {
      sumHalfL += logInvs[j * nSigma + i];
      nHalf += 1;
    }
  }
}

const ms = performance.now() - t0;
const outDir = new URL("../../papers/my main paper/rewrite_v7/", import.meta.url);
const STEM = "colinearity_strip_0_50_area_dense";

writeFileSync(new URL(`${STEM}.bin`, outDir), Buffer.from(logInvs.buffer));
writeFileSync(new URL(`${STEM}_area.bin`, outDir), Buffer.from(areas.buffer));
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
    "Triangle area of heads (R1ps, R/2, R1ak); plotted = log10(1/max(area,ε)). "
    + "Sigma grid inverse-CDF sampled from density ρ(σ).",
  areaEps: AREA_EPS,
  layout: "row-major T (slow) × sigma-index (fast); sigma abscissae in _sigma.bin",
  bin: `${STEM}.bin`,
  dtype: "float64",
  field: "log10(1/area)",
  stats: {
    areaMin: amin,
    areaMax: amax,
    areaMean: sumA / areas.length,
    logInvMin: lmin,
    logInvMax: lmax,
    logInvMean: sumL / logInvs.length,
    logInvMeanNearHalf: nHalf ? sumHalfL / nHalf : null,
    nHalfSamples: nHalf,
    elapsedMs: ms,
  },
  caveat: "R1ak = Kuznetsov/i1 estimate; T clamped to ≥1e-4",
};
writeFileSync(new URL(`${STEM}.json`, outDir), JSON.stringify(meta, null, 2));
console.log(JSON.stringify(meta, null, 2));

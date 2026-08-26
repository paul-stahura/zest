/**
 * Leg-pair mean-δ heatmap, T∈[0,20], 10000 σ-samples per T (uniform).
 *
 * δ_split = ||Σ1+R1|−|Σ2+R2|| / (|Σ1+R1|+|Σ2+R2|)
 * mean δ over splits {Rps, R/2, Rak}.
 *
 * Run: npx vite-node scripts/remainder-leg-equality-heatmap.mjs
 */
import { writeFileSync } from "node:fs";
import {
  calcForwardSum,
  calcInverseSum,
  calcRps1,
  calcRps2,
  calcRak1,
  calcRak2,
  calcRHalf,
} from "../src/shared/math/sumRemainders.ts";

const SIGMA_MIN = 0;
const SIGMA_MAX = 1;
const T_MIN = 0;
const T_MAX = 20;
const N_T = 2000;
const N_SIGMA = 10000; // samples per T
const EPS = 1e-18;

function abs(re, im) {
  return Math.hypot(re, im);
}

function pairDelta(a, b) {
  return Math.abs(a - b) / (a + b + EPS);
}

function probe(sigma, T) {
  const Tc = Math.max(T, 1e-4);
  const sum1 = calcForwardSum(sigma, Tc);
  const sum2 = calcInverseSum(sigma, Tc);
  const rps1 = calcRps1(sigma, Tc);
  const rps2 = calcRps2(sigma, Tc);
  const rak1 = calcRak1(sigma, Tc);
  const rak2 = calcRak2(sigma, Tc);
  const rh = calcRHalf(sigma, Tc);

  const dPs = pairDelta(
    abs(sum1.re + rps1.re, sum1.im + rps1.im),
    abs(sum2.re + rps2.re, sum2.im + rps2.im),
  );
  const dRh = pairDelta(
    abs(sum1.re + rh.re, sum1.im + rh.im),
    abs(sum2.re + rh.re, sum2.im + rh.im),
  );
  const dAk = pairDelta(
    abs(sum1.re + rak1.re, sum1.im + rak1.im),
    abs(sum2.re + rak2.re, sum2.im + rak2.im),
  );
  return (dPs + dRh + dAk) / 3;
}

const sigmas = new Float64Array(N_SIGMA);
for (let i = 0; i < N_SIGMA; i++) {
  sigmas[i] = SIGMA_MIN + (i / (N_SIGMA - 1)) * (SIGMA_MAX - SIGMA_MIN);
}
// Even N never lands on ½ exactly; pin the nearest abscissa so the critical line is resolved.
{
  let iHalf = 0;
  let best = Infinity;
  for (let i = 0; i < N_SIGMA; i++) {
    const d = Math.abs(sigmas[i] - 0.5);
    if (d < best) {
      best = d;
      iHalf = i;
    }
  }
  sigmas[iHalf] = 0.5;
}

process.stderr.write(
  `grid: N_σ=${N_SIGMA} uniform, N_T=${N_T}, T∈[${T_MIN},${T_MAX}] `
  + `(${(N_SIGMA * N_T / 1e6).toFixed(1)}M probes)\n`,
);

const meanDs = new Float64Array(N_SIGMA * N_T);
const t0 = performance.now();

for (let j = 0; j < N_T; j++) {
  const T = T_MIN + (j / (N_T - 1)) * (T_MAX - T_MIN);
  for (let i = 0; i < N_SIGMA; i++) {
    meanDs[j * N_SIGMA + i] = probe(sigmas[i], T);
  }
  if (j % 100 === 0) {
    const elapsed = (performance.now() - t0) / 1000;
    const eta = j > 0 ? (elapsed / j) * (N_T - j) : 0;
    process.stderr.write(`T-row ${j}/${N_T}  ${elapsed.toFixed(0)}s elapsed  ETA ${eta.toFixed(0)}s\n`);
  }
}

const ms = performance.now() - t0;
let sum = 0;
let amin = Infinity;
let amax = -Infinity;
for (let k = 0; k < meanDs.length; k++) {
  const v = meanDs[k];
  sum += v;
  if (v < amin) amin = v;
  if (v > amax) amax = v;
}

const outDir = new URL("../../papers/my main paper/rewrite_v7/", import.meta.url);
const STEM = "leg_equality_strip_0_20";

writeFileSync(new URL(`${STEM}_meand.bin`, outDir), Buffer.from(meanDs.buffer));
writeFileSync(new URL(`${STEM}_sigma.bin`, outDir), Buffer.from(sigmas.buffer));

const meta = {
  sigmaMin: SIGMA_MIN,
  sigmaMax: SIGMA_MAX,
  tMin: T_MIN,
  tMax: T_MAX,
  nSigma: N_SIGMA,
  nT: N_T,
  sigmaSampling: "uniform",
  metric:
    "mean δ over splits {Rps,R/2,Rak}; "
    + "δ=||Σ1+R1|−|Σ2+R2||/(|Σ1+R1|+|Σ2+R2|)",
  layout: "row-major T × sigma-index",
  bin: `${STEM}_meand.bin`,
  dtype: "float64",
  overlays: {
    champions: "web/public/critical-strip-points/champions_149_with_precise_T.csv → σ=0 red",
    zeros: "Assets/.../00 Zeta Zeros.csv → σ=1 green",
  },
  stats: {
    meanDeltaMin: amin,
    meanDeltaMax: amax,
    meanDeltaMean: sum / meanDs.length,
    elapsedMs: ms,
  },
};
writeFileSync(new URL(`${STEM}.json`, outDir), JSON.stringify(meta, null, 2));
console.log(JSON.stringify(meta, null, 2));

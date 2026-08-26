/**
 * Leg-equality strip zoom: T∈[17.2, 17.6].
 * Run from web/: npx vite-node scripts/remainder-leg-equality-heatmap-zoom-17p2.mjs
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
const T_MIN = 17.2;
const T_MAX = 17.6;
const N_T = 500;
const N_SIGMA = 2500;
const EPS = 1e-18;
const STEM = "leg_equality_strip_17p2_17p6";

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

const nProbe = N_SIGMA * N_T;
process.stderr.write(
  `grid: N_σ=${N_SIGMA} uniform, N_T=${N_T}, T∈[${T_MIN},${T_MAX}] `
  + `(${(nProbe / 1e6).toFixed(2)}M probes)\n`,
);

const meanDs = new Float64Array(nProbe);
const t0 = performance.now();
const progressPath = new URL(
  `../../papers/my main paper/rewrite_v7/${STEM}_progress.txt`,
  import.meta.url,
);

for (let j = 0; j < N_T; j++) {
  const T = T_MIN + (j / (N_T - 1)) * (T_MAX - T_MIN);
  for (let i = 0; i < N_SIGMA; i++) {
    meanDs[j * N_SIGMA + i] = probe(sigmas[i], T);
  }
  if (j % 25 === 0 || j === N_T - 1) {
    const elapsed = (performance.now() - t0) / 1000;
    const eta = j > 0 ? (elapsed / j) * (N_T - j) : 0;
    const line =
      `T-row ${j}/${N_T}  T=${T.toFixed(5)}  `
      + `${elapsed.toFixed(1)}s elapsed  ETA ${eta.toFixed(1)}s\n`;
    process.stderr.write(line);
    writeFileSync(progressPath, line);
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
    zeros: "Assets/.../00 Zeta Zeros.csv → σ=1/2 green",
  },
  stats: {
    meanDeltaMin: amin,
    meanDeltaMax: amax,
    meanDeltaMean: sum / meanDs.length,
    elapsedMs: ms,
  },
};
writeFileSync(new URL(`${STEM}.json`, outDir), JSON.stringify(meta, null, 2));
writeFileSync(progressPath, `DONE ${(ms / 1000).toFixed(1)}s\n`);
console.log(JSON.stringify(meta, null, 2));

/**
 * Fold-angle strips: how far theta_2 is from pi, for the ps, R/2 and ak
 * splits, averaged.  Companion of remainder-leg-equality-heatmap*.mjs with
 * the length metric replaced by the angle metric:
 *
 *   theta_2 = arg((Sigma2+R2)/(Sigma1+R1))  in (-pi, pi],
 *   tau     = (pi - |theta_2|)/pi           in [0, 1],
 *
 * so tau = 0 exactly where the legs fold back (theta_2 = pi) and tau = 1
 * where they are parallel.  The plotted field is the mean of tau over the
 * three splits.  Same four windows and grids as the leg-equality strips.
 *
 * Run from web/: npx vite-node scripts/remainder-theta2-pi-heatmap.mjs
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

const WINDOWS = [
  { stem: "theta2_pi_strip_4p65_4p80", tMin: 4.65, tMax: 4.8, nT: 500, nSigma: 2500 },
  { stem: "theta2_pi_strip_9p42_9p46", tMin: 9.42, tMax: 9.46, nT: 500, nSigma: 2500 },
  { stem: "theta2_pi_strip_17p2_17p6", tMin: 17.2, tMax: 17.6, nT: 500, nSigma: 2500 },
  { stem: "theta2_pi_strip_0_20", tMin: 0, tMax: 20, nT: 2000, nSigma: 10000 },
];

const SIGMA_MIN = 0;
const SIGMA_MAX = 1;

function tau(v1re, v1im, v2re, v2im) {
  // angle of v2 against v1, distance from pi, in units of pi
  const th = Math.atan2(v2im * v1re - v2re * v1im, v2re * v1re + v2im * v1im);
  return (Math.PI - Math.abs(th)) / Math.PI;
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

  const tPs = tau(
    sum1.re + rps1.re, sum1.im + rps1.im,
    sum2.re + rps2.re, sum2.im + rps2.im,
  );
  const tRh = tau(
    sum1.re + rh.re, sum1.im + rh.im,
    sum2.re + rh.re, sum2.im + rh.im,
  );
  const tAk = tau(
    sum1.re + rak1.re, sum1.im + rak1.im,
    sum2.re + rak2.re, sum2.im + rak2.im,
  );
  return (tPs + tRh + tAk) / 3;
}

const outDir = new URL("../../papers/my main paper/rewrite_v7/", import.meta.url);

for (const { stem, tMin, tMax, nT, nSigma } of WINDOWS) {
  const sigmas = new Float64Array(nSigma);
  for (let i = 0; i < nSigma; i++) {
    sigmas[i] = SIGMA_MIN + (i / (nSigma - 1)) * (SIGMA_MAX - SIGMA_MIN);
  }
  {
    let iHalf = 0;
    let best = Infinity;
    for (let i = 0; i < nSigma; i++) {
      const d = Math.abs(sigmas[i] - 0.5);
      if (d < best) {
        best = d;
        iHalf = i;
      }
    }
    sigmas[iHalf] = 0.5;
  }

  const nProbe = nSigma * nT;
  process.stderr.write(
    `${stem}: N_σ=${nSigma}, N_T=${nT}, T∈[${tMin},${tMax}] `
    + `(${(nProbe / 1e6).toFixed(2)}M probes)\n`,
  );

  const field = new Float64Array(nProbe);
  const t0 = performance.now();
  for (let j = 0; j < nT; j++) {
    const T = tMin + (j / (nT - 1)) * (tMax - tMin);
    for (let i = 0; i < nSigma; i++) {
      field[j * nSigma + i] = probe(sigmas[i], T);
    }
    if (j % 100 === 0 || j === nT - 1) {
      const elapsed = (performance.now() - t0) / 1000;
      const eta = j > 0 ? (elapsed / j) * (nT - j) : 0;
      process.stderr.write(
        `  T-row ${j}/${nT}  ${elapsed.toFixed(1)}s elapsed  ETA ${eta.toFixed(1)}s\n`,
      );
    }
  }
  const ms = performance.now() - t0;

  let sum = 0;
  let amin = Infinity;
  let amax = -Infinity;
  for (let k = 0; k < field.length; k++) {
    const v = field[k];
    sum += v;
    if (v < amin) amin = v;
    if (v > amax) amax = v;
  }

  writeFileSync(new URL(`${stem}_meand.bin`, outDir), Buffer.from(field.buffer));
  writeFileSync(new URL(`${stem}_sigma.bin`, outDir), Buffer.from(sigmas.buffer));
  const meta = {
    sigmaMin: SIGMA_MIN,
    sigmaMax: SIGMA_MAX,
    tMin,
    tMax,
    nSigma,
    nT,
    sigmaSampling: "uniform",
    metric:
      "mean tau over splits {Rps,R/2,Rak}; "
      + "tau=(pi-|arg((Σ2+R2)/(Σ1+R1))|)/pi",
    layout: "row-major T × sigma-index",
    bin: `${stem}_meand.bin`,
    dtype: "float64",
    stats: {
      tauMin: amin,
      tauMax: amax,
      tauMean: sum / field.length,
      elapsedMs: ms,
    },
  };
  writeFileSync(new URL(`${stem}.json`, outDir), JSON.stringify(meta, null, 2));
  console.log(`${stem} done in ${(ms / 1000).toFixed(1)}s`);
}

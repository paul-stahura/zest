/**
 * What causes the dark colinearity bands at T≈4.03, 4.62, 4.80?
 * For fixed sigma, walk T and report pairwise distances among
 * a=R1ps, b=R/2, c=R1ak, the flatness, and where each band bottoms out.
 *
 * Run from web/: npx vite-node scripts/probe-colinearity-bands.mjs
 */
import { calcRps1, calcRak1, calcRHalf } from "../src/shared/math/sumRemainders.ts";

function flatness(a, b, c) {
  const abx = b.re - a.re, aby = b.im - a.im;
  const acx = c.re - a.re, acy = c.im - a.im;
  const area2 = Math.abs(abx * acy - aby * acx);
  const dAB = Math.hypot(abx, aby);
  const dAC = Math.hypot(acx, acy);
  const dBC = Math.hypot(c.re - b.re, c.im - b.im);
  const diam = Math.max(dAB, dAC, dBC);
  return { flat: diam > 0 ? area2 / (diam * diam) : 0, dAB, dAC, dBC, diam };
}

function row(sigma, T) {
  const a = calcRps1(sigma, T);
  const b = calcRHalf(sigma, T);
  const c = calcRak1(sigma, T);
  const f = flatness(a, b, c);
  return { T, ...f };
}

for (const sigma of [0.2, 0.8]) {
  console.log(`\n=== sigma=${sigma} ===`);
  console.log("T      flat        |ps-R/2|    |ps-ak|     |R/2-ak|");
  for (let T = 4.0; T <= 5.001; T += 0.01) {
    const r = row(sigma, T);
    console.log(
      `${T.toFixed(3)}  ${r.flat.toExponential(2)}  ${r.dAB.toExponential(2)}`
      + `  ${r.dAC.toExponential(2)}  ${r.dBC.toExponential(2)}`,
    );
  }
}

// Fine scans around each band at sigma=0.2: find the minimum and report
// which pair distance dips with it.
for (const [lo, hi] of [[4.00, 4.08], [4.58, 4.66], [4.76, 4.84]]) {
  let best = null;
  for (let T = lo; T <= hi; T += 0.0002) {
    const r = row(0.2, T);
    if (!best || r.flat < best.flat) best = r;
  }
  console.log(`\nband [${lo},${hi}] min flat at T=${best.T.toFixed(4)}:`,
    `flat=${best.flat.toExponential(3)}`,
    `|ps-R/2|=${best.dAB.toExponential(3)}`,
    `|ps-ak|=${best.dAC.toExponential(3)}`,
    `|R/2-ak|=${best.dBC.toExponential(3)}`);
}

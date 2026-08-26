/**
 * Follow-up: (1) does the signed area change sign at the dark bands
 * (T≈4.037, 4.621, 4.80)? (2) does the band location drift with sigma?
 * (3) is flatness symmetric sigma -> 1-sigma?
 *
 * Run from web/: npx vite-node scripts/probe-colinearity-bands2.mjs
 */
import { calcRps1, calcRak1, calcRHalf } from "../src/shared/math/sumRemainders.ts";

function signedFlat(sigma, T) {
  const a = calcRps1(sigma, T);
  const b = calcRHalf(sigma, T);
  const c = calcRak1(sigma, T);
  const abx = b.re - a.re, aby = b.im - a.im;
  const acx = c.re - a.re, acy = c.im - a.im;
  const area2 = abx * acy - aby * acx; // signed
  const diam = Math.max(
    Math.hypot(abx, aby), Math.hypot(acx, acy),
    Math.hypot(c.re - b.re, c.im - b.im),
  );
  return area2 / (diam * diam);
}

console.log("signed flatness vs T at sigma=0.2 (sign changes = bands):");
for (let T = 4.0; T <= 5.0001; T += 0.025) {
  const v = signedFlat(0.2, T);
  console.log(`T=${T.toFixed(3)}  ${v >= 0 ? "+" : "-"}  ${v.toExponential(2)}`);
}

console.log("\nband center vs sigma (root of signed flatness near each band):");
for (const [lo, hi, name] of [[4.0, 4.1, "4.03"], [4.56, 4.68, "4.62"], [4.77, 4.83, "4.80"]]) {
  const centers = [];
  for (const sigma of [0.05, 0.2, 0.35, 0.45, 0.499, 0.6, 0.95]) {
    // bisection on signed flatness
    let a = lo, b = hi;
    let fa = signedFlat(sigma, a);
    let found = null;
    for (let x = lo; x <= hi; x += 0.001) {
      const fx = signedFlat(sigma, x);
      if (fa * fx < 0) { b = x; found = [a, b]; break; }
      a = x; fa = fx;
    }
    if (!found) { centers.push(`σ=${sigma}: no sign change`); continue; }
    let [xa, xb] = found;
    for (let k = 0; k < 60; k++) {
      const m = (xa + xb) / 2;
      if (signedFlat(sigma, xa) * signedFlat(sigma, m) <= 0) xb = m; else xa = m;
    }
    centers.push(`σ=${sigma}: T*=${((xa + xb) / 2).toFixed(6)}`);
  }
  console.log(`band ${name}: ${centers.join("  ")}`);
}

console.log("\nsigma <-> 1-sigma symmetry check at T=4.37:");
for (const sigma of [0.1, 0.25, 0.4]) {
  console.log(
    `σ=${sigma}: ${signedFlat(sigma, 4.37).toExponential(6)}   `
    + `σ=${1 - sigma}: ${signedFlat(1 - sigma, 4.37).toExponential(6)}`,
  );
}

/**
 * Where exactly are the off-line collinearity bands of the triangle
 * (R1ps, R/2=rak/2, R1ak), and do they sit at integer T?
 *
 * 1. Signed-area sign changes in T at fixed sigma (bisected to 1e-10).
 * 2. Fine look at the window 16.90..17.10 (new fig 48 panel 3).
 * 3. Critical-line identities: R2ak = chi*conj(R1ak), and the rotated
 *    abscissas Re(e^{-i psi/2} R1*) that force exact collinearity.
 *
 * Run from web/: npx vite-node scripts/probe-colinearity-integerT.mjs
 */
import { calcRps1, calcRak1, calcRak2, calcRHalf } from "../src/shared/math/sumRemainders.ts";
import { rak, chiBrian } from "../src/shared/math/zakCalculator.ts";
import { indexToImag } from "../src/shared/math/zetaEms.ts";

function signedArea(a, b, c) {
  return (b.re - a.re) * (c.im - a.im) - (b.im - a.im) * (c.re - a.re);
}
function areaAt(sigma, T) {
  return signedArea(calcRps1(sigma, T), calcRHalf(sigma, T), calcRak1(sigma, T));
}

// --- 1. band locations: sign changes of the signed area, sigma fixed ---
for (const sigma of [0.2, 0.35]) {
  const roots = [];
  const step = 0.001;
  let prevT = 3.0, prevA = areaAt(sigma, prevT);
  for (let T = 3.0 + step; T <= 20.0001; T += step) {
    // skip across integer T: formulas jump there, treat each unit cell alone
    if (Math.floor(T) !== Math.floor(prevT)) { prevT = T; prevA = areaAt(sigma, T); continue; }
    const A = areaAt(sigma, T);
    if (prevA === 0 || (prevA < 0) !== (A < 0)) {
      let lo = prevT, hi = T;
      for (let k = 0; k < 60; k++) {
        const mid = (lo + hi) / 2, Am = areaAt(sigma, mid);
        if ((Am < 0) === (prevA < 0)) lo = mid; else hi = mid;
      }
      roots.push((lo + hi) / 2);
    }
    prevT = T; prevA = A;
  }
  console.log(`\n=== sigma=${sigma}: signed-area zero crossings, T in [3,20] ===`);
  console.log(roots.map(r => `${r.toFixed(5)} ({T}=${(r - Math.floor(r)).toFixed(4)})`).join("\n"));
}

// --- 2. jump of the area across each integer T (left/right limits) ---
console.log("\n=== area just below / above integer T (sigma=0.2) ===");
for (let n = 4; n <= 19; n++) {
  const Am = areaAt(0.2, n - 1e-6), Ap = areaAt(0.2, n + 1e-6);
  console.log(`T=${n}:  area(-)=${Am.toExponential(3)}   area(+)=${Ap.toExponential(3)}`);
}

// --- 3. critical-line identities ---
console.log("\n=== sigma=1/2 checks ===");
for (const T of [4.3, 9.44, 17.01, 17.4]) {
  const s = 0.5;
  const t = indexToImag(T, false);
  const chi = chiBrian({ re: s, im: t });
  const r1ak = calcRak1(s, T), r2ak = calcRak2(s, T);
  // chi * conj(r1ak)
  const cc = { re: chi.re * r1ak.re + chi.im * r1ak.im, im: chi.im * r1ak.re - chi.re * r1ak.im };
  const dev = Math.hypot(cc.re - r2ak.re, cc.im - r2ak.im) / Math.hypot(r2ak.re, r2ak.im);
  // rotated abscissas: psi = arg(chi); x(v) = Re(e^{-i psi/2} v)
  const psi = Math.atan2(chi.im, chi.re);
  const x = (v) => Math.cos(psi / 2) * v.re + Math.sin(psi / 2) * v.im;
  const a = calcRps1(s, T), b = calcRHalf(s, T), c = r1ak;
  const R = rak(s, T);
  console.log(
    `T=${T}: |R2ak - chi*conj(R1ak)|/|R2ak| = ${dev.toExponential(2)}   ` +
    `x(R1ps)=${x(a).toFixed(12)} x(R/2)=${x(b).toFixed(12)} x(R1ak)=${x(c).toFixed(12)} ` +
    `(rak/2 rotated = ${(x({ re: R.re / 2, im: R.im / 2 })).toFixed(12)})  area=${signedArea(a, b, c).toExponential(2)}`,
  );
}

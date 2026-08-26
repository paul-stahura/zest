import { rak, i1, i2, chiBrian } from "../src/shared/math/zakCalculator.ts";
import { calcRps1 } from "../src/shared/math/sumRemainders.ts";
import { indexToImag } from "../src/shared/math/zetaEms.ts";
import { complex } from "../src/shared/math/complex.ts";

function abs(z) {
  return Math.hypot(z.re, z.im);
}

function i1Reduced(sigma, T) {
  const M = Math.floor(T) + 0.5;
  return abs(i1(sigma, T)) * Math.pow(M, sigma);
}

function rReduced(sigma, T) {
  const M = Math.floor(T) + 0.5;
  return abs(rak(sigma, T)) * Math.pow(M, sigma);
}

const frac = 0.30434;

console.log("=== reduced amplitudes |I1| M^σ and |R| M^σ ===");
for (const sigma of [0.3, 0.5, 0.7]) {
  console.log("σ=", sigma);
  for (const N of [3, 10, 20, 44, 100, 200, 500]) {
    const T = N + frac;
    const M = N + 0.5;
    const I = abs(i1(sigma, T));
    const R = abs(rak(sigma, T));
    const I2 = abs(i2(sigma, T));
    const chi = chiBrian(complex(sigma, indexToImag(T, false)));
    console.log({
      N,
      I1red: I * Math.pow(M, sigma),
      I2red: I2 * Math.pow(M, 1 - sigma),
      Rred: R * Math.pow(M, sigma),
      R_over_halfI1: R / (0.5 * I),
      absChi: abs(chi),
    });
  }
}

console.log("\n=== ratio errors: ceil vs M vs exact I1-bracket ===");
for (const sigma of [0.5, 0.3, 0.7]) {
  console.log("σ=", sigma);
  const N1 = 3;
  const T1 = N1 + frac;
  const a1 = abs(rak(sigma, T1));
  const I1a = abs(i1(sigma, T1));
  for (const N2 of [10, 20, 44, 100, 200, 500]) {
    const T2 = N2 + frac;
    const a2 = abs(rak(sigma, T2));
    const actual = a2 / a1;
    const ceil = Math.pow((N1 + 1) / (N2 + 1), sigma);
    const M = Math.pow((N1 + 0.5) / (N2 + 0.5), sigma);
    // Exact |I1| ratio (includes full bracket)
    const I1ratio = abs(i1(sigma, T2)) / I1a;
    // |R| predicted if R tracked I1 exactly
    console.log(N2, {
      actual,
      err_ceil: actual / ceil - 1,
      err_M: actual / M - 1,
      err_I1ratio: actual / I1ratio - 1,
      err_Rred: actual / (M * (rReduced(sigma, T2) / rReduced(sigma, T1))) - 1,
    });
  }
}

// Expand (1 ± iλ/M)^{-s} = 1 - s(iλ)/M + s(s+1)/2 (iλ/M)^2 + O(M^{-3})
// Leading bracket → B0(σ) independent of M (and of t, to this order in the I1 factoring)
// Next: B0 + B1(σ)/M + B2(σ)/M^2
// For |R| on σ=1/2: R ≈ -(-1)^N I1  when χ I2 ≈ I1 (approximate alignment)
// Try analytic leading constant from ω0 only: |ω0|
console.log("\n=== |ω0| =", abs({ re: 0.19260196330291032, im: 0.024729869657956518 }));

// Closed better approx: |R(N2)|/|R(N1)| ≈ (M1/M2)^σ * (1 + α/M2)/(1 + α/M1)
// Estimate α from two high-N points at fixed σ,f
function estimateAlpha(sigma, f) {
  const NA = 200;
  const NB = 500;
  const MA = NA + 0.5;
  const MB = NB + 0.5;
  const yA = rReduced(sigma, NA + f); // |R| M^σ
  const yB = rReduced(sigma, NB + f);
  // y = a (1 + α/M) ≈ a + aα/M  => yA = a + aα/MA, yB = a + aα/MB
  // yA - yB = aα (1/MA - 1/MB)
  // Also y → a as M→∞: use yB ≈ a(1+α/MB)
  const a = (yA * MA - yB * MB) / (MA - MB); // from y = a + c/M with c=aα
  // wait: yA = a + c/MA, yB = a + c/MB => a = (yA MA - yB MB)/(MA-MB)? 
  // yA MA = a MA + c, yB MB = a MB + c => yA MA - yB MB = a(MA-MB) => a = (yA MA - yB MB)/(MA-MB)
  const c = (yA - a) * MA;
  return { a, c, alpha: c / a, yA, yB };
}

console.log("\n=== one-parameter correction |R|≈ a M^{-σ} (1 + α/M) ===");
for (const sigma of [0.5, 0.3, 0.7]) {
  const { a, alpha } = estimateAlpha(sigma, frac);
  console.log("σ=", sigma, { a, alpha });
  const N1 = 3;
  const M1 = N1 + 0.5;
  const a1 = abs(rak(sigma, N1 + frac));
  const B = (M) => a * (1 + alpha / M);
  // renormalize using actual a1 so only shape of correction matters:
  const Bnorm = (M) => (1 + alpha / M);
  for (const N2 of [10, 44, 100, 200, 500]) {
    const M2 = N2 + 0.5;
    const pred = a1 * Math.pow(M1 / M2, sigma) * (Bnorm(M2) / Bnorm(M1));
    const act = abs(rak(sigma, N2 + frac));
    const pred0 = a1 * Math.pow((N1 + 1) / (N2 + 1), sigma);
    console.log(" ", N2, {
      err_ceil: pred0 / act - 1,
      err_M_alpha: pred / act - 1,
    });
  }
}

// For R1ps: exact |R1ps| = |d1| since R1ps = d1 e^{-iω} in paper's convention?
// In code calcRps1 returns complex with magnitude |R| * |sin.../sin...|
console.log("\n=== |R1ps| * ⌈T⌉^σ  (d1 if paper units) ===");
for (const sigma of [0.5, 0.3]) {
  console.log("σ=", sigma);
  for (const N of [3, 10, 44, 100, 200]) {
    const T = N + frac;
    const rps = calcRps1(sigma, T);
    console.log({ N, d1: abs(rps) * Math.pow(N + 1, sigma), absRps: abs(rps) });
  }
}

// EXACT identity for |I1|:
// I1 = M^{-s} * Bracket(s,M)  ⇒  |I1(T2)|/|I1(T1)| = (M1/M2)^σ * |B(s2,M2)|/|B(s1,M1)|
// But s1 ≠ s2 because t = I(T) changes with N even at fixed frac!
// So the "exact" scale must include t-dependence through Bracket and through χ for R.
console.log("\n=== t changes at fixed frac ===");
for (const N of [3, 10, 44, 100]) {
  console.log(N, indexToImag(N + frac, false));
}

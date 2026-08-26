import {
  calcForwardSum,
  calcInverseSum,
  calcRps1,
  calcRps2,
  calcRak1,
  calcRak2,
  calcRHalf,
} from "../src/shared/math/sumRemainders.ts";

const EPS = 1e-18;
function abs(re, im) {
  return Math.hypot(re, im);
}
function pairDelta(a, b) {
  return Math.abs(a - b) / (a + b + EPS);
}

function meanPairDelta(sigma, T) {
  const Tc = Math.max(T, 1e-4);
  const sum1 = calcForwardSum(sigma, Tc);
  const sum2 = calcInverseSum(sigma, Tc);
  const rps1 = calcRps1(sigma, Tc);
  const rps2 = calcRps2(sigma, Tc);
  const rak1 = calcRak1(sigma, Tc);
  const rak2 = calcRak2(sigma, Tc);
  const rh = calcRHalf(sigma, Tc);
  const pPs = pairDelta(
    abs(sum1.re + rps1.re, sum1.im + rps1.im),
    abs(sum2.re + rps2.re, sum2.im + rps2.im),
  );
  const pRh = pairDelta(
    abs(sum1.re + rh.re, sum1.im + rh.im),
    abs(sum2.re + rh.re, sum2.im + rh.im),
  );
  const pAk = pairDelta(
    abs(sum1.re + rak1.re, sum1.im + rak1.im),
    abs(sum2.re + rak2.re, sum2.im + rak2.im),
  );
  return (pPs + pRh + pAk) / 3;
}

const Ts = [6.18, 14.13, 21.02, 25.5];
const sigmas = [0.5, 0.499, 0.495, 0.49, 0.48, 0.45, 0.4];
for (const T of Ts) {
  console.log("T=", T);
  for (const s of sigmas) {
    console.log("  σ=", s, " meanδ=", meanPairDelta(s, T).toExponential(3));
  }
}

import {
  calcForwardSum,
  calcInverseSum,
  calcRps1,
  calcRps2,
  calcRak1,
  calcRak2,
  calcRHalf,
} from "../src/shared/math/sumRemainders.ts";
import { rak } from "../src/shared/math/zakCalculator.ts";

const TAU = 1e-3;
const EPS = 1e-18;
function abs(re, im) {
  return Math.hypot(re, im);
}
function deltaH(Hx, Hy, zx, zy) {
  const a = abs(Hx, Hy);
  const b = abs(zx - Hx, zy - Hy);
  return Math.abs(a - b) / (a + b + EPS);
}
function pairDelta(a, b) {
  return Math.abs(a - b) / (a + b + EPS);
}

let n = 0;
let n3Wrong = 0;
let n3Pair = 0;
let nRpsBreak = 0;
let maxDwrong = 0;
let maxDpair = 0;
const badTs = [];

for (let j = 0; j < 2000; j++) {
  const T = (j / (2000 - 1)) * 30;
  const Tc = Math.max(T, 1e-4);
  const sum1 = calcForwardSum(0.5, Tc);
  const sum2 = calcInverseSum(0.5, Tc);
  const R = rak(0.5, Tc);
  const rps1 = calcRps1(0.5, Tc);
  const rps2 = calcRps2(0.5, Tc);
  const rak1 = calcRak1(0.5, Tc);
  const rak2 = calcRak2(0.5, Tc);
  const rh = calcRHalf(0.5, Tc);
  const zx = sum1.re + R.re + sum2.re;
  const zy = sum1.im + R.im + sum2.im;
  const rpsBreak = abs(R.re - rps1.re - rps2.re, R.im - rps1.im - rps2.im);
  if (rpsBreak > 1e-6) nRpsBreak += 1;

  const dPs = deltaH(sum1.re + rps1.re, sum1.im + rps1.im, zx, zy);
  const dRh = deltaH(sum1.re + rh.re, sum1.im + rh.im, zx, zy);
  const dAk = deltaH(sum1.re + rak1.re, sum1.im + rak1.im, zx, zy);
  const nWrong = (dPs < TAU) + (dRh < TAU) + (dAk < TAU);

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
  const nPair = (pPs < TAU) + (pRh < TAU) + (pAk < TAU);

  n += 1;
  if (nWrong === 3) n3Wrong += 1;
  if (nPair === 3) n3Pair += 1;
  maxDwrong = Math.max(maxDwrong, dPs, dRh, dAk);
  maxDpair = Math.max(maxDpair, pPs, pRh, pAk);
  if (nPair < 3 && badTs.length < 12) {
    badTs.push({ T, nPair, pPs, pRh, pAk, rpsBreak, dPs, dRh, dAk });
  }
}

console.log({
  n,
  n3Wrong,
  n3Pair,
  frac3_wrong: n3Wrong / n,
  frac3_pair: n3Pair / n,
  nRpsBreak,
  maxDwrong,
  maxDpair,
});
console.log("not all-equal under |Σ1+R1| vs |Σ2+R2|:", badTs);

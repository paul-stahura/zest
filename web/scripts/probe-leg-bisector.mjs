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

function abs(re, im) {
  return Math.hypot(re, im);
}

function legDelta(Hx, Hy, zx, zy) {
  const l1 = abs(Hx, Hy);
  const l2 = abs(zx - Hx, zy - Hy);
  return { l1, l2, d: Math.abs(l1 - l2) / (l1 + l2 + 1e-18) };
}

/** Dimensionless bisector mismatch: 0 ⇒ on perp bisector of (0,ζ). */
function bisectorAbsOff(Hx, Hy, zx, zy) {
  const z2 = zx * zx + zy * zy;
  if (z2 < 1e-30) return 0;
  return Math.abs(2 * (Hx * zx + Hy * zy) - z2) / z2;
}

function check(sigma, T) {
  const sum1 = calcForwardSum(sigma, T);
  const sum2 = calcInverseSum(sigma, T);
  const R = rak(sigma, T);
  const rps1 = calcRps1(sigma, T);
  const rps2 = calcRps2(sigma, T);
  const rak1 = calcRak1(sigma, T);
  const rak2 = calcRak2(sigma, T);
  const rh = calcRHalf(sigma, T);

  const zRak = { re: sum1.re + R.re + sum2.re, im: sum1.im + R.im + sum2.im };
  const zRps = {
    re: sum1.re + rps1.re + sum2.re + rps2.re,
    im: sum1.im + rps1.im + sum2.im + rps2.im,
  };
  const zAk = {
    re: sum1.re + rak1.re + sum2.re + rak2.re,
    im: sum1.im + rak1.im + sum2.im + rak2.im,
  };

  console.log(`\n=== σ=${sigma} T=${T} ===`);
  console.log("|R-(Rps1+Rps2)|", abs(R.re - rps1.re - rps2.re, R.im - rps1.im - rps2.im));
  console.log("|R-(Rak1+Rak2)|", abs(R.re - rak1.re - rak2.re, R.im - rak1.im - rak2.im));
  console.log("|ζrak-ζrps|", abs(zRak.re - zRps.re, zRak.im - zRps.im));
  console.log("|ζrak-ζak|", abs(zRak.re - zAk.re, zRak.im - zAk.im));
  console.log("|ζrak|", abs(zRak.re, zRak.im));

  const rows = [
    ["Rps", sum1.re + rps1.re, sum1.im + rps1.im, abs(sum1.re + rps1.re, sum1.im + rps1.im), abs(sum2.re + rps2.re, sum2.im + rps2.im)],
    ["Rh", sum1.re + rh.re, sum1.im + rh.im, abs(sum1.re + rh.re, sum1.im + rh.im), abs(sum2.re + rh.re, sum2.im + rh.im)],
    ["Rak", sum1.re + rak1.re, sum1.im + rak1.im, abs(sum1.re + rak1.re, sum1.im + rak1.im), abs(sum2.re + rak2.re, sum2.im + rak2.im)],
  ];
  for (const [name, Hx, Hy, a, b] of rows) {
    const ld = legDelta(Hx, Hy, zRak.re, zRak.im);
    const bo = bisectorAbsOff(Hx, Hy, zRak.re, zRak.im);
    const pairD = Math.abs(a - b) / (a + b + 1e-18);
    console.log(name, {
      delta_vs_ζrak: Number(ld.d.toExponential(3)),
      bisectorOff: Number(bo.toExponential(3)),
      delta_Σ1R1_vs_Σ2R2: Number(pairD.toExponential(3)),
      "|Σ1+R1|": Number(a.toExponential(3)),
      "|Σ2+R2|": Number(b.toExponential(3)),
    });
  }
}

for (const T of [6.18, 10, 14.13, 21.02, 25.5]) {
  check(0.5, T);
  check(0.3, T);
}

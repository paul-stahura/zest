/**
 * For each T, find σ∈(0,1)\{1/2} minimizing dist(R1ak, line(R1ps,R/2)).
 * Also check whether signed area changes sign across σ=1/2 (suggesting σ=1/2 is the only root).
 */
import { calcRps1, calcRak1, calcRHalf } from "../src/shared/math/sumRemainders.ts";
import { writeFileSync } from "node:fs";

function signedDist(a, b, p) {
  const vx = b.re - a.re, vy = b.im - a.im;
  const len = Math.hypot(vx, vy);
  if (len < 1e-15) return Math.hypot(p.re - a.re, p.im - a.im);
  return (vx * (p.im - a.im) - vy * (p.re - a.re)) / len;
}

function probe(sigma, T) {
  const rps = calcRps1(sigma, T);
  const rak = calcRak1(sigma, T);
  const rh = calcRHalf(sigma, T);
  return signedDist(rps, rh, rak);
}

const rows = [];
for (let T = 1.1; T <= 7.9; T += 0.1) {
  const f = T - Math.floor(T);
  if (f < 0.05 || f > 0.95) continue;

  // Sample signed distance vs sigma
  let minAbs = Infinity;
  let minSigma = null;
  let sdLeft = null;  // at 0.49
  let sdRight = null; // at 0.51
  let sdHalf = probe(0.5, T);
  for (let s = 0.05; s <= 0.95; s += 0.005) {
    const sd = probe(s, T);
    const a = Math.abs(sd);
    if (a < minAbs) { minAbs = a; minSigma = s; }
    if (Math.abs(s - 0.49) < 1e-9) sdLeft = sd;
    if (Math.abs(s - 0.51) < 1e-9) sdRight = sd;
  }

  // Brent-ish: check for zeros of signed distance away from 1/2
  const zeros = [];
  let prevS = 0.05, prevSd = probe(0.05, T);
  for (let s = 0.055; s <= 0.95; s += 0.005) {
    const sd = probe(s, T);
    if (prevSd * sd < 0 && !(prevS < 0.5 && s > 0.5)) {
      // sign change not straddling 1/2 — refine
      let lo = prevS, hi = s, flo = prevSd, fhi = sd;
      for (let k = 0; k < 30; k++) {
        const mid = 0.5 * (lo + hi);
        const fm = probe(mid, T);
        if (flo * fm <= 0) { hi = mid; fhi = fm; }
        else { lo = mid; flo = fm; }
      }
      const root = 0.5 * (lo + hi);
      if (Math.abs(root - 0.5) > 0.002) {
        zeros.push({ sigma: root, sd: probe(root, T) });
      }
    }
    prevS = s; prevSd = sd;
  }

  rows.push({
    T: +T.toFixed(2),
    sdHalf: sdHalf,
    absHalf: Math.abs(sdHalf),
    minAbsOff: minAbs,
    minSigma: +minSigma.toFixed(3),
    sdLeft, sdRight,
    // same sign on both sides of 1/2? (excluding the jump at exactly 1/2)
    sameSignFlanks: sdLeft != null && sdRight != null ? Math.sign(sdLeft) === Math.sign(sdRight) : null,
    offHalfZeros: zeros,
  });
}

const withOffZeros = rows.filter(r => r.offHalfZeros.length > 0);
console.log("T samples", rows.length);
console.log("T with off-½ sign-change zeros", withOffZeros.length);
console.log("examples", withOffZeros.slice(0, 8));
console.log("typical abs(sd) at ½", {
  med: rows.map(r => r.absHalf).sort((a, b) => a - b)[Math.floor(rows.length / 2)],
  max: Math.max(...rows.map(r => r.absHalf)),
});
console.log("typical minAbsOff", {
  med: rows.map(r => r.minAbsOff).sort((a, b) => a - b)[Math.floor(rows.length / 2)],
  min: Math.min(...rows.map(r => r.minAbsOff)),
});
console.log("sameSignFlanks counts", {
  same: rows.filter(r => r.sameSignFlanks === true).length,
  opposite: rows.filter(r => r.sameSignFlanks === false).length,
});

writeFileSync("/tmp/colin-roots.json", JSON.stringify({ rows, withOffZeros }, null, 2));

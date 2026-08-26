import {
  calcRps1, calcRak1, calcRHalf, calcForwardSum, calcInverseSum, calcRps2,
} from "../src/shared/math/sumRemainders.ts";

function distToLine(a, b, p) {
  const vx = b.re - a.re, vy = b.im - a.im;
  const len = Math.hypot(vx, vy);
  if (len < 1e-15) return Math.hypot(p.re - a.re, p.im - a.im);
  return Math.abs(vx * (p.im - a.im) - vy * (p.re - a.re)) / len;
}

function mag(z) {
  return Math.hypot(z.re, z.im);
}

function row(sigma, T) {
  const rps = calcRps1(sigma, T);
  const rak = calcRak1(sigma, T);
  const rh = calcRHalf(sigma, T);
  const d = distToLine(rps, rh, rak);
  const base = Math.hypot(rh.re - rps.re, rh.im - rps.im);
  const rel = base > 1e-15 ? d / base : d;
  const s1 = calcForwardSum(sigma, T);
  const s2 = calcInverseSum(sigma, T);
  const r2 = calcRps2(sigma, T);
  const L1 = mag({ re: s1.re + rps.re, im: s1.im + rps.im });
  const L2 = mag({ re: s2.re + r2.re, im: s2.im + r2.im });
  const legRatio = L1 > 1e-15 ? L2 / L1 : NaN;
  return { sigma, T, d, rel, base, legRatio, L1, L2 };
}

const crit = [];
for (let T = 1.02; T <= 8; T += 0.005) {
  const f = T - Math.floor(T);
  if (f < 0.02 || f > 0.98) continue;
  crit.push(row(0.5, T));
}
crit.sort((a, b) => a.d - b.d);
const ds = crit.map(r => r.d);
const pct = (p) => ds[Math.floor(p * (ds.length - 1))];
console.log("CRITICAL T∈[1,8]", {
  n: crit.length,
  min: ds[0], med: pct(0.5), p95: pct(0.95), max: ds[ds.length - 1],
  n1e12: crit.filter(r => r.d < 1e-12).length,
  n1e10: crit.filter(r => r.d < 1e-10).length,
  n1e8: crit.filter(r => r.d < 1e-8).length,
  n1e6: crit.filter(r => r.d < 1e-6).length,
});
console.log("worst crit", crit[crit.length - 1]);
console.log("best crit", crit[0]);

let best = null;
const hits = [];
for (let T = 1.02; T <= 8; T += 0.02) {
  const f = T - Math.floor(T);
  if (f < 0.02 || f > 0.98) continue;
  for (let s = 0.05; s <= 0.95; s += 0.01) {
    if (Math.abs(s - 0.5) < 1e-12) continue;
    const r = row(s, T);
    if (!best || r.d < best.d) best = r;
    if (r.rel < 1e-5) hits.push(r);
  }
}
hits.sort((a, b) => a.d - b.d);
console.log("OFF best", best);
console.log("OFF hits rel<1e-5", hits.length, hits.slice(0, 10));

const ovalOn = [], ovalOff = [];
for (let T = 1.02; T <= 8; T += 0.01) {
  const f = T - Math.floor(T);
  if (f < 0.02 || f > 0.98) continue;
  for (const s of [0.5, 0.3, 0.4, 0.45, 0.55, 0.6, 0.7]) {
    const r = row(s, T);
    if (Math.abs(r.legRatio - 1) < 0.02) {
      (s === 0.5 ? ovalOn : ovalOff).push(r);
    }
  }
}
const ovalOnD = ovalOn.map(r => r.d).sort((a, b) => a - b);
const ovalOffD = ovalOff.map(r => r.d).sort((a, b) => a - b);
console.log("OVAL σ=1/2", {
  n: ovalOn.length,
  colin1e8: ovalOn.filter(r => r.d < 1e-8).length,
  maxD: ovalOnD[ovalOnD.length - 1],
  medD: ovalOnD[Math.floor(ovalOnD.length / 2)],
});
console.log("OVAL σ≠1/2", {
  n: ovalOff.length,
  colin1e8: ovalOff.filter(r => r.d < 1e-8).length,
  minD: ovalOffD[0],
  medD: ovalOffD[Math.floor(ovalOffD.length / 2)],
  maxD: ovalOffD[ovalOffD.length - 1],
});
console.log("oval off closest", [...ovalOff].sort((a, b) => a.d - b.d).slice(0, 5));

function akVsHalf(T) {
  const rak = calcRak1(0.5, T), rh = calcRHalf(0.5, T);
  return Math.hypot(rak.re - rh.re, rak.im - rh.im);
}
console.log("|R1ak-R/2| samples", [1.5, 2.5, 4.7, 6.18, 7.5].map(T => ({ T, d: akVsHalf(T) })));

// Series for canvas: dist vs T at σ=1/2 and σ=0.6
const seriesHalf = [];
const series06 = [];
for (let T = 1.02; T <= 8; T += 0.05) {
  const f = T - Math.floor(T);
  if (f < 0.02 || f > 0.98) continue;
  seriesHalf.push({ T: +T.toFixed(3), dist: row(0.5, T).d, rel: row(0.5, T).rel });
  series06.push({ T: +T.toFixed(3), dist: row(0.6, T).d, rel: row(0.6, T).rel });
}

// Heat: log10(dist) over (σ,T) coarse grid for T in 1..8
const heat = [];
for (let T = 1.5; T <= 7.5; T += 0.5) {
  for (let s = 0.1; s <= 0.9; s += 0.05) {
    const r = row(s, T);
    heat.push({
      sigma: +s.toFixed(2),
      T: +T.toFixed(1),
      log10dist: Math.log10(Math.max(r.d, 1e-16)),
      dist: r.d,
      rel: r.rel,
    });
  }
}

import { writeFileSync } from "node:fs";
writeFileSync("/tmp/colin-deep.json", JSON.stringify({
  summaryCrit: {
    n: crit.length, min: ds[0], med: pct(0.5), p95: pct(0.95), max: ds[ds.length - 1],
    n1e12: crit.filter(r => r.d < 1e-12).length,
    n1e10: crit.filter(r => r.d < 1e-10).length,
    n1e8: crit.filter(r => r.d < 1e-8).length,
  },
  bestOff: best,
  hitsOff: hits.slice(0, 15),
  ovalOn: { n: ovalOn.length, colin1e8: ovalOn.filter(r => r.d < 1e-8).length, medD: ovalOnD[Math.floor(ovalOnD.length / 2)], maxD: ovalOnD[ovalOnD.length - 1] },
  ovalOff: { n: ovalOff.length, minD: ovalOffD[0], medD: ovalOffD[Math.floor(ovalOffD.length / 2)], maxD: ovalOffD[ovalOffD.length - 1], closest: [...ovalOff].sort((a, b) => a.d - b.d).slice(0, 8) },
  seriesHalf, series06, heat,
}, null, 2));
console.log("wrote /tmp/colin-deep.json");

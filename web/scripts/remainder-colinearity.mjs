/**
 * Sweep remainder-head colinearity: R1ps, R1ak, R/2 all start at Σ₁.
 * Distance of R1ak from the line through R1ps and R/2.
 *
 * Run: npx vite-node scripts/remainder-colinearity.mjs
 */
import { calcRps1, calcRak1, calcRHalf } from "../src/shared/math/sumRemainders.ts";

function distToLine(a, b, p) {
  const vx = b.re - a.re;
  const vy = b.im - a.im;
  const len = Math.hypot(vx, vy);
  if (len < 1e-15) return Math.hypot(p.re - a.re, p.im - a.im);
  const wx = p.re - a.re;
  const wy = p.im - a.im;
  return Math.abs(vx * wy - vy * wx) / len;
}

function signedArea(a, b, p) {
  const vx = b.re - a.re;
  const vy = b.im - a.im;
  const wx = p.re - a.re;
  const wy = p.im - a.im;
  return vx * wy - vy * wx;
}

function mag(z) {
  return Math.hypot(z.re, z.im);
}

const COLIN_EPS = 1e-8;
const REL_EPS = 1e-6;

function analyze(sigma, T) {
  const rps = calcRps1(sigma, T);
  const rak = calcRak1(sigma, T);
  const rh = calcRHalf(sigma, T);
  const dist = distToLine(rps, rh, rak);
  const base = Math.hypot(rh.re - rps.re, rh.im - rps.im);
  const rel = base > 1e-15 ? dist / base : dist;
  const area = signedArea(rps, rh, rak);
  return {
    sigma, T, dist, rel, area,
    magRps: mag(rps), magRak: mag(rak), magRh: mag(rh),
    colinAbs: dist < COLIN_EPS,
    colinRel: rel < REL_EPS,
  };
}

function summarize(rows, label) {
  const dists = rows.map(r => r.dist).sort((a, b) => a - b);
  const rels = rows.map(r => r.rel).sort((a, b) => a - b);
  const pct = (p) => dists[Math.min(dists.length - 1, Math.floor(p * (dists.length - 1)))];
  const pctR = (p) => rels[Math.min(rels.length - 1, Math.floor(p * (rels.length - 1)))];
  return {
    label,
    n: rows.length,
    distMin: dists[0],
    distMed: pct(0.5),
    distP95: pct(0.95),
    distMax: dists[dists.length - 1],
    relMin: rels[0],
    relMed: pctR(0.5),
    relP95: pctR(0.95),
    relMax: rels[rels.length - 1],
    nColinAbs: rows.filter(r => r.colinAbs).length,
    nColinRel: rows.filter(r => r.colinRel).length,
  };
}

const results = {
  critical: [],
  offCritical: [],
  nearHalf: [],
  bestOffCritical: null,
  worstCritical: null,
};

const T_STEP = 0.01;
for (let T = 0.05; T <= 8; T += T_STEP) {
  const frac = T - Math.floor(T);
  if (frac < 0.02 || frac > 0.98) continue;

  const crit = analyze(0.5, T);
  results.critical.push(crit);
  if (!results.worstCritical || crit.dist > results.worstCritical.dist) {
    results.worstCritical = crit;
  }

  for (const sigma of [0.1, 0.2, 0.3, 0.4, 0.45, 0.55, 0.6, 0.7, 0.8, 0.9]) {
    const row = analyze(sigma, T);
    results.offCritical.push(row);
    if (!results.bestOffCritical || row.dist < results.bestOffCritical.dist) {
      results.bestOffCritical = row;
    }
  }

  for (const sigma of [0.49, 0.495, 0.499, 0.501, 0.505, 0.51]) {
    results.nearHalf.push(analyze(sigma, T));
  }
}

const fineHits = [];
for (const T of [1.3, 2.4, 3.7, 4.5, 5.2, 6.18, 7.3]) {
  for (let sigma = 0.05; sigma <= 0.95; sigma += 0.005) {
    if (Math.abs(sigma - 0.5) < 1e-9) continue;
    const row = analyze(sigma, T);
    if (row.rel < 1e-4) fineHits.push(row);
  }
}
fineHits.sort((a, b) => a.dist - b.dist);

// Per-T max/min distance on critical line for a plot series
const critByT = results.critical.map(r => ({ T: +r.T.toFixed(3), dist: r.dist, rel: r.rel }));

// Off-critical: for each T, median dist across sigma
const offByT = [];
{
  const map = new Map();
  for (const r of results.offCritical) {
    const key = +r.T.toFixed(2);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r.dist);
  }
  for (const [T, arr] of [...map.entries()].sort((a, b) => a[0] - b[0])) {
    arr.sort((a, b) => a - b);
    offByT.push({
      T,
      distMed: arr[Math.floor(arr.length / 2)],
      distMin: arr[0],
      distMax: arr[arr.length - 1],
    });
  }
}

const out = {
  notes: {
    geometry: "Heads of R1ps, R1ak, R/2 as vectors from Σ₁. Distance = |R1ak − line(R1ps,R/2)|.",
    caveat: "R1ak here is Kuznetsov/i1 estimate, not exact Siegel f(s).",
    identity: "R1ps+R2ps=R exact ⇒ R/2 is midpoint of R1ps—R2ps, so line(R1ps,R/2)=line(R1ps,R2ps).",
  },
  thresholds: { COLIN_EPS, REL_EPS },
  summaryCritical: summarize(results.critical, "σ=1/2"),
  summaryOff: summarize(results.offCritical, "σ≠1/2 grid"),
  summaryNearHalf: summarize(results.nearHalf, "σ near 1/2"),
  worstCritical: results.worstCritical,
  bestOffCritical: results.bestOffCritical,
  fineNearColinOffCritical: fineHits.slice(0, 20),
  critByTSample: critByT.filter((_, i) => i % 5 === 0),
  offByTSample: offByT.filter((_, i) => i % 5 === 0),
};

console.log(JSON.stringify(out, null, 2));

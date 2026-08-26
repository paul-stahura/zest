/**
 * The sum rule near the fold, and how lambda behaves.
 *
 *   simple:  the inverse links crossing forward link k are  floor(2T) - 1 - k  and  floor(2T) - k
 *   exact:   k + i = S = 2(m + lambda) - 1, the two integers either side of S,
 *            lambda = (Z/2 - X_m)/(X_{m+1} - X_m)
 *
 * Both only hold within about sqrt(T/2) links of the fold: they are the tangent to the
 * product law (k+1)(i+1) = t/2pi, which is what probe-crossing-product.mjs measures and what
 * the app and the paper now use.
 *
 * Run from web/: npx vite-node scripts/probe-crossing-formula.mjs
 */
import { forwardChain, reflectedInverseChain } from "../src/features/links/linksChains.ts";
import { computeZakSpiralGeometry, chiBrian } from "../src/shared/math/zakCalculator.ts";
import { indexToImag } from "../src/shared/math/zetaEms.ts";

const SIGMA = 0.5;
const POLY = false;
const CAP = 4000;

function frame(T) {
  const t = indexToImag(T, POLY);
  const chi = chiBrian({ re: SIGMA, im: t });
  const th = -Math.atan2(chi.im, chi.re) / 2;
  const geom = computeZakSpiralGeometry(SIGMA, T);
  const rot = (p) => Math.cos(th) * p.x - Math.sin(th) * p.y;
  return {
    T,
    t,
    th,
    m: Math.floor(T),
    fwd: forwardChain(SIGMA, T, POLY, CAP),
    inv: reflectedInverseChain(SIGMA, T, POLY, geom.zeta, CAP),
    X: rot,
    Z: rot(geom.zeta),
  };
}

function segCross(a, b, c, d) {
  const d1 = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d2 = (b.x - a.x) * (d.y - a.y) - (b.y - a.y) * (d.x - a.x);
  const d3 = (d.x - c.x) * (a.y - c.y) - (d.y - c.y) * (a.x - c.x);
  const d4 = (d.x - c.x) * (b.y - c.y) - (d.y - c.y) * (b.x - c.x);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}

const crossings = (f, k, half) => {
  const out = [];
  for (let i = Math.max(0, f.m - half); i <= f.m + half; i++) {
    if (segCross(f.fwd.joints[k], f.fwd.joints[k + 1], f.inv.joints[i], f.inv.joints[i + 1])) out.push(i);
  }
  return out;
};

const lambdaOf = (f) => (f.Z / 2 - f.X(f.fwd.joints[f.m])) / (f.X(f.fwd.joints[f.m + 1]) - f.X(f.fwd.joints[f.m]));

// ─── the rotated frame is a mirror, and lambda comes from the RS remainder ──────
{
  const f = frame(6.18);
  const chi = chiBrian({ re: SIGMA, im: f.t });
  const rotY = (p) => Math.sin(f.th) * p.x + Math.cos(f.th) * p.y;
  let worst = 0;
  for (let n = 0; n <= 12; n++) {
    worst = Math.max(
      worst,
      Math.abs(f.X(f.inv.joints[n]) - (f.Z - f.X(f.fwd.joints[n]))),
      Math.abs(rotY(f.inv.joints[n]) - rotY(f.fwd.joints[n])),
    );
  }
  console.log(`mirror check at T=6.18: max |G - mirror(F)| = ${worst.toExponential(2)}`);
  let X = 0;
  for (let n = 1; n <= f.m; n++) X += Math.cos(f.th - f.t * Math.log(n)) / Math.sqrt(n);
  const R = f.Z - 2 * X;
  const closed = ((R / 2) * Math.sqrt(f.m + 1)) / Math.cos(f.th - f.t * Math.log(f.m + 1));
  console.log(`lambda measured ${lambdaOf(f).toFixed(9)}  from RS remainder ${closed.toFixed(9)}`);
  void chi;
}

// ─── the continuous law: u + v = 2 r* at every crossing ─────────────────────────
// u, v are the real chain parameters (link number + fraction along the link) of the
// two arcs at a crossing point, r* = m + lambda the place where the forward chain
// meets the mirror line X = Z/2.
function crossParams(f, k, i) {
  const a = f.fwd.joints[k];
  const b = f.fwd.joints[k + 1];
  const c = f.inv.joints[i];
  const d = f.inv.joints[i + 1];
  const den = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (Math.abs(den) < 1e-15) return null;
  const p = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / den;
  const q = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / den;
  if (p < 0 || p > 1 || q < 0 || q > 1) return null;
  return { u: k + p, v: i + q };
}
{
  const errs = [];
  for (const m of [8, 17, 40, 123, 400]) {
    for (let j = 1; j <= 199; j++) {
      const f = frame(m + j / 200);
      const rStar = f.m + lambdaOf(f);
      for (const k of [f.m, f.m - 1, f.m - 2]) {
        // the crossing this strip is about: the inverse link nearest the predicted one
        const obs = crossings(f, k, 4);
        if (obs.length === 0) continue;
        const i = obs.reduce((best, c) => (Math.abs(c - (2 * rStar - 1 - k)) < Math.abs(best - (2 * rStar - 1 - k)) ? c : best));
        const pr = crossParams(f, k, i);
        if (pr !== null) errs.push(Math.abs(pr.u + pr.v - 2 * rStar));
      }
    }
  }
  errs.sort((a, b) => a - b);
  const q = (p) => errs[Math.floor(p * (errs.length - 1))].toFixed(3);
  console.log(`u+v = 2r*: ${errs.length} crossings, median |error| ${q(0.5)}, 90th pct ${q(0.9)}, max ${q(1)} (index units)`);
}

// ─── how often does each rule name a link that really crosses? ──────────────────
let simpleHit = 0;
let exactHit = 0;
let rows = 0;
const misses = [];
for (const m of [8, 17, 40, 123, 400]) {
  for (let n = 1; n <= 199; n++) {
    const fr = n / 200;
    const f = frame(m + fr);
    const S = 2 * (f.m + lambdaOf(f)) - 1;
    const pairExact = [Math.floor(S), Math.ceil(S)];
    const pairSimple = [Math.floor(2 * (m + fr)) - 1, Math.floor(2 * (m + fr))];
    for (const k of [m, m - 1, m - 2, m - 3]) {
      const obs = crossings(f, k, 4);
      rows++;
      const okE = pairExact.some((s) => obs.includes(s - k));
      const okS = pairSimple.some((s) => obs.includes(s - k));
      if (okE) exactHit++;
      if (okS) simpleHit++;
      else if (misses.length < 12) misses.push(`m=${m} f=${fr.toFixed(3)} k=m-${m - k} obs=[${obs.map((i) => i - m).join(",")}] S=${(S - 2 * m).toFixed(2)}`);
    }
  }
}
console.log(`exact  rule names a real crossing: ${exactHit}/${rows} (${((100 * exactHit) / rows).toFixed(1)}%)`);
console.log(`simple rule names a real crossing: ${simpleHit}/${rows} (${((100 * simpleHit) / rows).toFixed(1)}%)`);
console.log("first misses of the simple rule:");
for (const s of misses) console.log("  " + s);

// ─── lambda is a universal function of frac(T) ──────────────────────────────────
console.log("\nlambda(f), the cut point along the bisector link:");
console.log("   f      m=8      m=17     m=40     m=123    m=400");
for (let n = 1; n <= 19; n++) {
  const fr = n / 20;
  const cells = [8, 17, 40, 123, 400].map((m) => lambdaOf(frame(m + fr)).toFixed(4).padStart(8));
  console.log(`  ${fr.toFixed(2)} ${cells.join(" ")}`);
}

// ─── what the "one crossing link" mode picks in each strip ──────────────────────
import { crossingLink, crossingScale } from "../src/features/links/linksChains.ts";
for (const T of [6.18, 17.3, 40.62]) {
  const f = frame(T);
  const scale = crossingScale(T, POLY);
  const shown = [];
  for (let k = 0; k <= f.m; k++) {
    const pick = crossingLink(f.fwd, f.inv, k, scale, f.m);
    shown.push(`${k}→${pick === null ? "—" : pick.link}${pick?.at == null ? "?" : ""}`);
  }
  console.log(`\nT=${T} (m=${f.m}, a²=${scale.toFixed(2)}): ${shown.join("  ")}`);
  console.log("  (? = the law's link, with no actual crossing found)");
}

// ─── the table asked for: T from 6 to 7, forward link m-1 = 5 ───────────────────
console.log("\n\nT = 6 … 7, forward link k = 5 (= m-1): which inverse link crosses it");
console.log("   T      floor(2T)   formula      exact S    observed");
for (let n = 0; n <= 100; n++) {
  const T = 6 + n / 100;
  if (T >= 7) break;
  const f = frame(T);
  const k = 5;
  const S = 2 * (f.m + lambdaOf(f)) - 1;
  const two = Math.floor(2 * T);
  const obs = crossings(f, k, 4);
  console.log(
    `  ${T.toFixed(2)}      ${two}      ${two - 1 - k} or ${two - k}      ${S.toFixed(2)}` +
      `      [${obs.join(",")}]`,
  );
}

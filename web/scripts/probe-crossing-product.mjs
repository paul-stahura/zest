/**
 * Test the product law against the sum law, over every strip rather than only the ones near
 * the fold.
 *
 *   product:  (k+1)(i+1) = t/(2 pi) = a^2      (a = sqrt(t/2pi) ~ T + 1/2)
 *   sum:      k + i      = 2 r* - 1
 *
 * The product law is symmetric in k and i, like the mirror that forces the crossings to pair
 * up, and near k = i = a - 1 it linearizes to the sum law.
 *
 * Run from web/: npx vite-node scripts/probe-crossing-product.mjs
 */
import { forwardChain, reflectedInverseChain, mirrorCutParameter, segmentCrossing } from "../src/features/links/linksChains.ts";
import { computeZakSpiralGeometry } from "../src/shared/math/zakCalculator.ts";
import { indexToImag } from "../src/shared/math/zetaEms.ts";

const SIGMA = 0.5;
const POLY = false;
const CAP = 20000;

function frame(T) {
  const geom = computeZakSpiralGeometry(SIGMA, T);
  const fwd = forwardChain(SIGMA, T, POLY, CAP);
  const inv = reflectedInverseChain(SIGMA, T, POLY, geom.zeta, CAP);
  const m = Math.floor(T);
  const t = indexToImag(T, POLY);
  return { T, m, t, fwd, inv, a2: t / (2 * Math.PI), rStar: mirrorCutParameter(SIGMA, T, POLY, geom.zeta, fwd.joints, m) };
}

function crosses(f, k, i) {
  if (i < 0 || i + 1 > f.inv.lastLink) return null;
  return segmentCrossing(f.fwd.joints[k], f.fwd.joints[k + 1], f.inv.joints[i], f.inv.joints[i + 1]);
}

/** Nearest actual crossing to a predicted link, searched outward, or null within the window. */
function nearestHit(f, k, predicted, window) {
  for (let d = 0; d <= window; d++) {
    for (const i of d === 0 ? [predicted] : [predicted - d, predicted + d]) {
      if (crosses(f, k, i) !== null) return i;
    }
  }
  return null;
}

let exactProduct = 0;
let within1Product = 0;
let exactSum = 0;
let within1Sum = 0;
let rows = 0;
const offsets = new Map();
for (let m = 4; m <= 30; m++) {
  for (let j = 1; j <= 15; j++) {
    const f = frame(m + j / 16);
    for (let k = 0; k <= f.m; k++) {
      rows++;
      const pProduct = Math.round(f.a2 / (k + 1)) - 1;
      const pSum = Math.round(2 * f.rStar - 1) - k;
      if (crosses(f, k, pProduct) !== null) exactProduct++;
      if (crosses(f, k, pSum) !== null) exactSum++;
      const nearP = nearestHit(f, k, pProduct, 1);
      const nearS = nearestHit(f, k, pSum, 1);
      if (nearP !== null) within1Product++;
      if (nearS !== null) within1Sum++;
      const near3 = nearestHit(f, k, pProduct, 3);
      if (near3 !== null) {
        const off = near3 - pProduct;
        offsets.set(off, (offsets.get(off) ?? 0) + 1);
      }
    }
  }
}

console.log(`rows (every strip of every sampled T): ${rows}`);
console.log(`product law names a real crossing exactly:  ${exactProduct} (${((100 * exactProduct) / rows).toFixed(1)}%)`);
console.log(`product law within one link of one:        ${within1Product} (${((100 * within1Product) / rows).toFixed(1)}%)`);
console.log(`sum law names a real crossing exactly:      ${exactSum} (${((100 * exactSum) / rows).toFixed(1)}%)`);
console.log(`sum law within one link of one:            ${within1Sum} (${((100 * within1Sum) / rows).toFixed(1)}%)`);
console.log("offset of the nearest real crossing from the product law's link:");
for (const off of [...offsets.keys()].sort((x, y) => x - y)) {
  console.log(`   ${off > 0 ? "+" : ""}${off}: ${offsets.get(off)}`);
}

// Signature of the crossing the product law names: where on the forward link it sits and at
// what angle the two chains meet.
{
  const angles = [];
  const positions = [];
  for (let m = 4; m <= 40; m += 3) {
    for (let j = 1; j <= 15; j += 2) {
      const f = frame(m + j / 16);
      for (let k = 0; k <= f.m; k++) {
        const i = Math.round(f.a2 / (k + 1)) - 1;
        const hit = crosses(f, k, i);
        if (hit === null) continue;
        const a = f.fwd.joints[k];
        const b = f.fwd.joints[k + 1];
        const c = f.inv.joints[i];
        const d = f.inv.joints[i + 1];
        const raw = Math.atan2(d.y - c.y, d.x - c.x) - Math.atan2(b.y - a.y, b.x - a.x);
        angles.push((((raw * 180) / Math.PI) % 360 + 360) % 360);
        positions.push(hit.p);
      }
    }
  }
  const median = (xs) => [...xs].sort((x, y) => x - y)[Math.floor(xs.length / 2)];
  // Position along the link, split by how far the strip is from the fold.
  const byDist = new Map();
  for (let m = 4; m <= 40; m += 3) {
    for (let j = 1; j <= 15; j += 2) {
      const f = frame(m + j / 16);
      for (let k = 0; k <= f.m; k++) {
        const i = Math.round(f.a2 / (k + 1)) - 1;
        const hit = crosses(f, k, i);
        if (hit === null) continue;
        const d = Math.min(f.m - k, 4);
        if (!byDist.has(d)) byDist.set(d, []);
        byDist.get(d).push(hit.p);
      }
    }
  }
  console.log("\nposition along the forward link, by distance from the fold:");
  for (const d of [...byDist.keys()].sort((x, y) => x - y)) {
    const ps = byDist.get(d);
    const spread = median(ps.map((p) => Math.abs(p - 0.5)));
    console.log(`   m-k=${d === 4 ? ">=4" : d}: n=${String(ps.length).padStart(4)} median p=${median(ps).toFixed(3)} median |p-1/2|=${spread.toFixed(3)}`);
  }
  const hist = new Map();
  for (const a of angles) {
    const bin = Math.floor(a / 15) * 15;
    hist.set(bin, (hist.get(bin) ?? 0) + 1);
  }
  console.log(`\ncrossings named by the product law: ${angles.length}`);
  console.log(`median position along the forward link: ${median(positions).toFixed(3)}`);
  console.log("angle between the crossing links (15 degree bins):");
  for (const bin of [...hist.keys()].sort((x, y) => x - y)) {
    console.log(`   ${String(bin).padStart(3)}-${String(bin + 15).padStart(3)}: ${"#".repeat(Math.round((60 * hist.get(bin)) / angles.length))} ${hist.get(bin)}`);
  }
}

// How the two laws compare strip by strip, at one T.
const f = frame(6.18);
console.log(`\nT=6.18: a^2 = t/2pi = ${f.a2.toFixed(3)}, 2r*-1 = ${(2 * f.rStar - 1).toFixed(3)}`);
console.log("   k   product i   sum i   really crosses");
for (let k = 0; k <= f.m; k++) {
  const pProduct = Math.round(f.a2 / (k + 1)) - 1;
  const pSum = Math.round(2 * f.rStar - 1) - k;
  const hits = [];
  for (let i = 0; i < f.inv.lastLink; i++) if (crosses(f, k, i) !== null) hits.push(i);
  console.log(
    `  ${String(k).padStart(2)}      ${String(pProduct).padStart(3)}${crosses(f, k, pProduct) !== null ? " ok" : " no"}` +
      `    ${String(pSum).padStart(3)}${crosses(f, k, pSum) !== null ? " ok" : " no"}    ${hits.join(",")}`,
  );
}

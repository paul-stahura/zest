/**
 * The loci the two ends of the crossing link trace in the frame of forward link k, over one
 * unit of the index. Reports which links take a turn crossing, whether the law's link really
 * does cross there, and how far the ends travel, which is what the "yin yang for link floor(T)-1"
 * mode draws.
 *
 * Run from web/: npx vite-node scripts/probe-crossing-ends.mjs
 */
import {
  crossingLink,
  crossingScale,
  forwardChain,
  mirrorCutParameter,
  reflectedInverseChain,
} from "../src/features/links/linksChains.ts";
import {
  budgetedCrossingSweep,
  crossingEndLoops,
  crossingEndsForLinks,
  crossingOffset,
  crossingSweep,
  linkFrameSample,
  offsetAt,
  reverseReach,
} from "../src/features/links/linksYinYang.ts";
import { computeZakSpiralGeometry } from "../src/shared/math/zakCalculator.ts";

const SIGMA = 0.5;
const POLY = false;
const CAP = 400;
const SAMPLES = 100;

for (const m of [6, 7, 12, 30]) {
 for (const k of [m - 1, m - 2]) {
  const turns = [];
  let missed = 0;
  for (let i = 0; i <= SAMPLES; i++) {
    const T = m + (i / SAMPLES) * 0.9999999;
    const named = Math.round(crossingScale(T, POLY) / (k + 1)) - 1;
    if (turns.length === 0 || turns[turns.length - 1].link !== named) {
      turns.push({ link: named, from: T, to: T });
    } else {
      turns[turns.length - 1].to = T;
    }
    const geom = computeZakSpiralGeometry(SIGMA, T);
    const fwd = forwardChain(SIGMA, T, POLY, CAP);
    const inv = reflectedInverseChain(SIGMA, T, POLY, geom.zeta, CAP);
    const hit = crossingLink(fwd, inv, k, crossingScale(T, POLY), Math.floor(T));
    if (hit === null || hit.link !== named || hit.at === null) missed++;
  }

  const loops = crossingEndLoops(SIGMA, m + 0.18, POLY, k, SAMPLES);
  const extent = (pieces) => {
    const all = pieces.flat();
    const xs = all.map(p => p.x);
    const ys = all.map(p => p.y);
    return `x ${Math.min(...xs).toFixed(2)}..${Math.max(...xs).toFixed(2)}  y ${Math.min(...ys).toFixed(2)}..${Math.max(...ys).toFixed(2)}`;
  };
  console.log(`\nm=${m}, forward link k=${k}`);
  for (const turn of turns) {
    console.log(`  link ${turn.link} crosses for T in ${turn.from.toFixed(3)}..${turn.to.toFixed(3)}`);
  }
  console.log(`  law names a link that really crosses: ${SAMPLES + 1 - missed}/${SAMPLES + 1}`);
  console.log(`  yin  pieces ${loops.yin.map(p => p.length).join(",")}  ${extent(loops.yin)}`);
  console.log(`  yang pieces ${loops.yang.map(p => p.length).join(",")}  ${extent(loops.yang)}`);
  const j = Math.round(crossingScale(m + 0.18, POLY) / (k + 1)) - 1;
  const sample = linkFrameSample(SIGMA, m + 0.18, POLY, j + 1);
  const a = sample.point(k, j);
  const b = sample.point(k, j + 1);
  console.log(`  at T=${m}.18 link ${j} runs (${a.x.toFixed(3)}, ${a.y.toFixed(3)}) -> (${b.x.toFixed(3)}, ${b.y.toFixed(3)})`);
 }
}

// What "yin yang on all links" costs: one set of loci for every strip, which the tab computes
// once per unit of the index and then only slides dots along.
console.log("\ncrossing offset along the link, what the band under the strips graphs");
for (const m of [6, 12]) {
  const links = Array.from({ length: m + 1 }, (_, i) => i);
  const sweep = crossingSweep(SIGMA, m + 0.18, POLY, links, 100, 20000);
  for (const k of links) {
    const track = sweep.get(k);
    const seen = track.offsets.filter(o => o.offset !== null).map(o => o.offset);
    const gaps = track.offsets.length - seen.length;
    console.log(
      `  m=${m} link ${k}: offset ${Math.min(...seen).toFixed(4)}..${Math.max(...seen).toFixed(4)}`
      + `  (${seen.length} samples, ${gaps} with no crossing)`,
    );
  }
  // The bisector strip's offset is the mirror cut, the fraction of that link where the forward
  // chain meets the line the two chains reflect in.
  const T = m + 0.18;
  const geom = computeZakSpiralGeometry(SIGMA, T);
  const fwd = forwardChain(SIGMA, T, POLY, CAP);
  const cut = mirrorCutParameter(SIGMA, T, POLY, geom.zeta, fwd.joints, m);
  const inv = reflectedInverseChain(SIGMA, T, POLY, geom.zeta, CAP);
  const ends = crossingEndsForLinks(SIGMA, T, POLY, [m], 20000).get(m);
  console.log(`  m=${m} bisector: offset ${crossingOffset(ends).toFixed(9)}  mirror cut ${(cut - m).toFixed(9)}`);
  void inv;
}

// The band draws a swept track and a dot read at the current T; they must agree, or the dot
// appears to leave the curve as T slides. One rate for the whole row, set by the longest walk
// any strip asks for, is what used to leave the near strips too coarse to hold their dots.
console.log("\ndot at the current T against the track the sweep drew");
for (const m of [6, 100, 434, 1200]) {
  const links = Array.from({ length: m + 1 }, (_, i) => i);
  for (const split of [false, true]) {
    const reach = reverseReach(m + 0.9999999, POLY, links, 20000);
    const flat = Math.max(40, Math.min(256, Math.floor(800000 / Math.max(1, reach))));
    const t0 = performance.now();
    const sweep = split
      ? budgetedCrossingSweep(SIGMA, m + 0.18, POLY, links, 20000, 800000)
      : crossingSweep(SIGMA, m + 0.18, POLY, links, flat, 20000);
    const ms = performance.now() - t0;
    const near = (k, frac) => {
      const track = sweep.get(k);
      return track === undefined ? 0.5 : offsetAt(track, frac) ?? 0.5;
    };
    let worst = 0;
    let apart = 0;
    let read = 0;
    for (let i = 0; i <= 60; i++) {
      const frac = (i / 60) * 0.9999;
      const ends = crossingEndsForLinks(SIGMA, m + frac, POLY, links, 20000, k => near(k, frac));
      for (const k of links) {
        const dot = ends.has(k) ? crossingOffset(ends.get(k)) : null;
        if (dot === null) continue;
        read++;
        const gap = Math.abs(dot - near(k, frac));
        worst = Math.max(worst, gap);
        if (gap > 0.02) apart++;
      }
    }
    console.log(
      `  m=${m} ${split ? "near and far apart" : "one rate for the row"}: `
      + `worst gap ${worst.toFixed(4)}, off the track in ${apart} of ${read} readings, ${ms.toFixed(0)} ms`,
    );
  }
}

console.log("\nall-links timing, as the tab budgets it (one rebuild per unit of T)");
for (const m of [6, 30, 100, 300, 1000, 5000]) {
  const strips = Math.min(m + 1, 700);
  const links = Array.from({ length: strips }, (_, i) => Math.round((i * m) / (strips - 1)));
  const t0 = performance.now();
  const loops = budgetedCrossingSweep(SIGMA, m + 0.18, POLY, links, 20000, 800000);
  const ms = performance.now() - t0;
  const pieces = [...loops.values()].reduce((n, l) => n + l.yin.length, 0);
  const samples = [...loops.values()].map(l => l.offsets.length);
  console.log(
    `  m=${m}: ${strips} strips, ${loops.size} drawn, `
    + `${Math.min(...samples)}..${Math.max(...samples)} samples, ${pieces} pieces, ${ms.toFixed(0)} ms`,
  );
}

/** Checks a closed form for the yin/yang points of forward link ⌊T⌋−1 (and ⌊T⌋−2). */
import {
  crossingEndsForLinks,
  crossingOffset,
  linkFrameSample,
} from "../src/features/links/linksYinYang.ts";
import { crossingScale, forwardChain, mirrorCutParameter } from "../src/features/links/linksChains.ts";
import { chiBrian, computeZakSpiralGeometry, rak } from "../src/shared/math/zakCalculator.ts";
import { indexToImag } from "../src/shared/math/zetaEms.ts";

const mul = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const add = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
const sub = (a, b) => ({ re: a.re - b.re, im: a.im - b.im });
/** n^z for real n > 0, complex z. */
const pow = (n, z) => {
  const r = Math.pow(n, z.re);
  const a = z.im * Math.log(n);
  return { re: r * Math.cos(a), im: r * Math.sin(a) };
};

/**
 * Reverse joint j (j ≥ m) in the frame of forward link k, where that link runs 0 → 1:
 *   P_k(j) = (k+1)^s [ Σ_{n=k+1}^{m} n^{-s} + R − χ Σ_{n=m+1}^{j} n^{s-1} ].
 */
function jointInFrame(sigma, index, k, j) {
  const m = Math.floor(index);
  const t = indexToImag(index, false);
  const s = { re: sigma, im: t };
  const sMinus1 = { re: sigma - 1, im: t };
  const chi = chiBrian(s);
  const R = rak(sigma, index);

  let head = { re: 0, im: 0 };
  for (let n = k + 1; n <= m; n++) head = add(head, pow(n, { re: -sigma, im: -t }));
  let tail = { re: 0, im: 0 };
  for (let n = m + 1; n <= j; n++) tail = add(tail, pow(n, sMinus1));
  return mul(pow(k + 1, s), sub(add(head, R), mul(chi, tail)));
}

/**
 * Where the crossing cuts the forward link, in link units, from the closed form alone:
 *   λ = Re Y − Im Y · Re v / Im v,   Y = Y_k(i),   v = χ (k+1)^s (i+1)^{s-1}.
 */
function crossingCut(sigma, index, k) {
  const m = Math.floor(index);
  const t = indexToImag(index, false);
  const i = k === m ? m : Math.round(crossingScale(index, false) / (k + 1)) - 1;
  const Y = jointInFrame(sigma, index, k, i);
  const v = mul(
    chiBrian({ re: sigma, im: t }),
    mul(pow(k + 1, { re: sigma, im: t }), pow(i + 1, { re: sigma - 1, im: t })),
  );
  return Y.re - (Y.im * v.re) / v.im;
}

let worst = 0;
for (const index of [6.18, 6.72, 17.4, 40.05, 434.37]) {
  const m = Math.floor(index);
  const i = Math.round(crossingScale(index, false) / m) - 1;
  for (const k of [m - 1, m - 2]) {
    const ik = Math.round(crossingScale(index, false) / (k + 1)) - 1;
    const sample = linkFrameSample(0.5, index, false, ik + 2);
    for (const j of [ik, ik + 1]) {
      const got = sample.point(k, j);
      const mine = jointInFrame(0.5, index, k, j);
      worst = Math.max(worst, Math.hypot(got.x - mine.re, got.y - mine.im));
    }
  }
  console.log(`T=${index}: m=${m}, crossing link of ⌊T⌋−1 is ${i} (summand ${i + 1} = m+${i + 1 - m})`);
}
console.log(`\nworst disagreement with the app's frame: ${worst.toExponential(2)}`);

// The pieces over one unit, for link ⌊T⌋−1: which summand carries the crossing.
const m = 6;
const seen = [];
for (let f = 0; f < 1; f += 0.001) {
  const n1 = Math.round(crossingScale(m + f, false) / m);
  if (seen.length === 0 || seen[seen.length - 1].n !== n1) seen.push({ n: n1, from: f, to: f });
  else seen[seen.length - 1].to = f;
}
console.log(`\nlink ${m - 1} over T = ${m}..${m + 1}, crossing summand n′ by piece:`);
for (const p of seen) console.log(`  n′ = ${p.n} (m+${p.n - m}) for {T} in ${p.from.toFixed(3)}..${p.to.toFixed(3)}`);

// The band under the strips: where the crossing cuts the link, closed form against the tab.
console.log("\ncut along the link, closed form against the tab's own reading");
let cutGap = 0;
let bisGap = 0;
for (const index of [6.18, 6.72, 12.4, 17.4, 40.05, 434.37]) {
  const mm = Math.floor(index);
  for (const k of [0, 1, Math.floor(mm / 2), mm - 2, mm - 1, mm]) {
    if (k < 0) continue;
    const ends = crossingEndsForLinks(0.5, index, false, [k], 20000).get(k);
    if (ends === undefined) continue;
    const tab = crossingOffset(ends);
    if (tab === null) continue;
    cutGap = Math.max(cutGap, Math.abs(tab - crossingCut(0.5, index, k)));
  }
  // At the bisector the cut is the bisector point's own fraction along its link.
  const zak = computeZakSpiralGeometry(0.5, index);
  const fwd = forwardChain(0.5, index, false, mm + 2);
  const cut = mirrorCutParameter(0.5, index, false, zak.zeta, fwd.joints, mm);
  bisGap = Math.max(bisGap, Math.abs(crossingCut(0.5, index, mm) - (cut - mm)));
}
console.log(`  worst gap to the tab: ${cutGap.toExponential(2)}`);
console.log(`  worst gap at the bisector to d̂₁, the bisector point's fraction: ${bisGap.toExponential(2)}`);

/**
 * Why the product law holds: the sweeps of the tail reproduce the links of the head.
 *
 * The chain Σ n^(−1/2) e^(i(θ − t ln n)) has saddle points where the phase resonates with the
 * integer lattice, t/n = 2πc, i.e. n = a²/c with a² = t/2π. Between two saddles the links are
 * antiparallel and the chain folds; through a saddle they are parallel and the chain sweeps.
 * Poisson summation gives the c-th sweep length 1/√c and a phase that is the c-th summand's
 * phase conjugated, so under the mirror the c-th sweep of the reverse chain is a copy of the
 * forward chain's link c − 1 (summand c), lying on top of it: that is the crossing.
 *
 * Run from web/: npx vite-node scripts/probe-crossing-sweeps.mjs
 */
import { forwardChain, reflectedInverseChain } from "../src/features/links/linksChains.ts";
import { computeZakSpiralGeometry, chiBrian } from "../src/shared/math/zakCalculator.ts";
import { indexToImag } from "../src/shared/math/zetaEms.ts";

const SIGMA = 0.5;
const POLY = false;
const CAP = 20000;

for (const T of [6.18, 12.7, 17.3, 40.62]) {
  const t = indexToImag(T, POLY);
  const a2 = t / (2 * Math.PI);
  const chi = chiBrian({ re: SIGMA, im: t });
  const th = -Math.atan2(chi.im, chi.re) / 2;
  const geom = computeZakSpiralGeometry(SIGMA, T);
  const fwd = forwardChain(SIGMA, T, POLY, CAP);
  const inv = reflectedInverseChain(SIGMA, T, POLY, geom.zeta, CAP);
  const rot = (p) => ({ x: Math.cos(th) * p.x - Math.sin(th) * p.y, y: Math.sin(th) * p.x + Math.cos(th) * p.y });

  console.log(`\n=== T=${T}  a²=t/2π=${a2.toFixed(2)}  (sweep c sits at index a²/c)`);
  console.log("   c   sweep band       sweep vector (rotated)     mirrored link c−1        |error|   ratio");
  for (let c = 1; c <= 5; c++) {
    // The c-th sweep runs fold to fold: turn angle from (2c+1)π down to (2c−1)π.
    const from = Math.round(a2 / (c + 0.5)) - 1;
    const to = Math.round(a2 / (c - 0.5)) - 1;
    if (to + 1 > inv.lastLink || from < 0) continue;
    const A = rot(inv.joints[from]);
    const B = rot(inv.joints[Math.min(to + 1, inv.lastLink)]);
    const sweep = { x: B.x - A.x, y: B.y - A.y };
    // Link c−1 of the forward chain, reflected in the mirror line: (dx, dy) → (−dx, dy).
    const p = rot(fwd.joints[c - 1]);
    const q = rot(fwd.joints[c]);
    const mirrored = { x: -(q.x - p.x), y: q.y - p.y };
    const err = Math.hypot(sweep.x - mirrored.x, sweep.y - mirrored.y);
    const len = Math.hypot(mirrored.x, mirrored.y);
    console.log(
      `  ${c}   [${String(from).padStart(4)},${String(to).padStart(4)}]   ` +
        `(${sweep.x.toFixed(4).padStart(8)},${sweep.y.toFixed(4).padStart(8)})   ` +
        `(${mirrored.x.toFixed(4).padStart(8)},${mirrored.y.toFixed(4).padStart(8)})   ` +
        `${err.toFixed(4)}   ${(err / len).toFixed(3)}`,
    );
  }
}

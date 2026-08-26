// Span-link band shown at the bisector strip: the current fold ladder vs a bisector-anchored one.
//
// a = (t/pi)/n is the per-link turn angle of the inverse chain in units of pi. The current
// formula L_N(T,S) = I(T)/(pi(2S+1)) puts the band edges on the folds a = 1, 3, 5, ...; the
// candidate puts m+1 equally spaced edges between the bisector joint a0 = (t/pi)/(m+1) and the
// fold a = 1, so the bisector strip is exactly the bisector link and the outermost strip still
// ends on the last link.

const imag = (T) => ((2 * T + 1) * Math.PI) / Math.log1p(1 / T);

/** Current: strip k uses n = k+1, band [L_N(T,n), L_N(T,n-1)], rounded. */
function current(T, k) {
  const t = imag(T);
  const n = k + 1;
  return {
    inner: t / (Math.PI * (2 * n + 1)),
    outer: t / (Math.PI * (2 * Math.max(1, n) - 1)),
    from: Math.round(t / (Math.PI * (2 * n + 1))),
    to: Math.round(t / (Math.PI * (2 * Math.max(1, n) - 1))),
  };
}

function ladder(T) {
  const t = imag(T);
  const m = Math.floor(T);
  const a0 = t / (Math.PI * (m + 1));
  const step = (a0 - 1) / m;
  return { t, m, a0, step, n: (j) => t / (Math.PI * (a0 - j * step)) };
}

/** Candidate: strip k sits j = m - k steps out from the bisector and spans [n(j-1), n(j)]. */
function anchored(T, k) {
  const { m, n } = ladder(T);
  const j = m - k;
  return { from: Math.round(n(j - 1)), to: Math.round(n(j)) };
}

console.log("T\tt=I(T)\tL(7)\tL(6)\tcurrent\tcandidate");
for (let i = 0; i <= 100; i++) {
  const T = 6 + i / 100;
  const k = 6;
  const c = current(T, k);
  const a = anchored(Math.min(T, 6.999999), k);
  console.log(
    [
      T.toFixed(2),
      imag(T).toFixed(2),
      c.inner.toFixed(3),
      c.outer.toFixed(3),
      `${c.from} -> ${c.to}`,
      `${a.from} -> ${a.to}`,
    ].join("\t"),
  );
}

let prev = null;
console.log("\ncurrent-formula transitions on [6,7]:");
for (let T = 6; T <= 7.0000001; T += 1e-6) {
  const c = current(T, 6);
  const key = `${c.from}->${c.to}`;
  if (prev !== null && key !== prev) console.log(`  T=${T.toFixed(6)}: ${prev}  =>  ${key}`);
  prev = key;
}

console.log("\nall strips, candidate vs current:");
for (const T of [6.0, 6.5, 6.99, 20.4, 100.7]) {
  const { m, t, step } = ladder(T);
  console.log(`\nT=${T} m=${m} last link=${Math.round(t / Math.PI)} step=${step.toFixed(3)} (2 = exact folds)`);
  for (let k = m; k >= Math.max(0, m - 6); k--) {
    const a = anchored(T, k);
    const c = current(T, k);
    console.log(`  k=${k}\tcandidate ${a.from} -> ${a.to}\tcurrent ${c.from} -> ${c.to}`);
  }
  console.log(`  k=0\tcandidate ${anchored(T, 0).from} -> ${anchored(T, 0).to}\tcurrent ${current(T, 0).from} -> ${current(T, 0).to}`);
}

let bad = 0;
let worst = 0;
let covBad = 0;
for (let m = 2; m <= 400; m++) {
  for (let f = 0; f < 1; f += 1 / 512) {
    const T = m + f;
    const a = anchored(T, m);
    if (a.from !== m || a.to !== m + 1) bad++;
    worst = Math.max(worst, Math.abs(ladder(T).n(-1) - m));
    if (anchored(T, 0).to !== Math.round(imag(T) / Math.PI)) covBad++;
  }
}
console.log(`\nbisector strip exactly [m, m+1] for m=2..400: ${bad === 0 ? "always" : bad + " misses"}`);
console.log(`worst |inner edge - m| = ${worst.toFixed(4)} (must stay < 0.5)`);
console.log(`outermost band ends on the last link: ${covBad === 0 ? "always" : covBad + " misses"}`);

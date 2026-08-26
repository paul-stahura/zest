/**
 * Generator for critical-strip "remainder zeros" point sets.
 *
 * Finds the isolated complex zeros of  F(σ,T) = forwardSum(σ,T) + R(σ,T)  in a
 * (σ, T) box, where R is a chosen Siegel-remainder half (Rak1 or Rps1). These are
 * the same objects that Unity's DataPointSearch produced for "Rak1 Zeros"; here we
 * reuse the already-ported, mpmath-checked math in src/shared/math/sumRemainders.ts
 * so the search is reproducible from the web repo without the Unity editor.
 *
 * Why 2-D Newton: F is complex, so F=0 is two real equations (Re=Im=0) in two real
 * unknowns (σ,T) — its solutions are isolated points, not a curve. F is smooth only
 * between consecutive integer T (each integer adds a term to the partial sum and
 * flips (-1)^⌊T⌋), so we solve strip-by-strip and seed Newton from a grid.
 *
 * The companion "Zetas" file is the σ→(1−σ) reflection, kept only where the inverse
 * object G(σ,T)=inverseSum+R2 actually vanishes at the reflected point (the
 * functional-equation symmetry). Rak1 satisfies this on every branch; Rps1 only
 * satisfies it near the critical strip, so the reflection filter is load-bearing.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json scripts/find-remainder-zeros.mts <rak1|rps1> [--check]
 *   --check reproduces Rak1 and diffs against the shipped CSV instead of writing files.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  calcForwardSum,
  calcInverseSum,
  calcRak1,
  calcRak2,
  calcRps1,
  calcRps2,
} from "@/shared/math/sumRemainders";
import { complexAbs, type Complex } from "@/shared/math/complex";
import { indexToImag } from "@/shared/math/zetaEms";

type RemainderKind = "rak1" | "rps1";

type Config = {
  remainder: RemainderKind;
  label: string; // human label + #@name
  color: string;
  sigmaMin: number;
  sigmaMax: number;
  tMin: number;
  tMax: number;
  zerosFile: string;
  zetasFile: string;
};

/** Forward object F = Σn^(-s) + R1, whose zeros define the point set. */
type RemFns = {
  forward: (s: number, t: number) => Complex;
  inverse: (s: number, t: number) => Complex;
};

let F_EVALS = 0; // instrumentation: total forward/inverse evaluations for --profile

function remFns(kind: RemainderKind): RemFns {
  const r1 = kind === "rak1" ? calcRak1 : calcRps1;
  const r2 = kind === "rak1" ? calcRak2 : calcRps2;
  return {
    forward: (s, t) => {
      F_EVALS++;
      return addC(calcForwardSum(s, t), r1(s, t));
    },
    inverse: (s, t) => {
      F_EVALS++;
      return addC(calcInverseSum(s, t), r2(s, t));
    },
  };
}

const addC = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });

/**
 * Scale-normalized residual T^σ·|F|. The raw |F| swings over ~40 orders of
 * magnitude across the σ range (n^(-σ) at n≈T), so we normalize by the last-term
 * scale to get a residual that is O(1)-comparable everywhere.
 */
function weighted(f: Complex, s: number, t: number): number {
  return Math.pow(t, s) * complexAbs(f);
}

const NEWTON_H = 1e-6;
const NEWTON_ITERS = 40;
const NEWTON_TOL = 1e-13; // polish target (weighted residual); acceptance is separate
// Acceptance on the scale-normalized residual. Loose enough to admit genuine
// high-T zeros (ZAK's quadrature floors the residual near ~3e-9 there) yet far
// below the O(0.1) residual of any non-zero bracket, so no false positives.
const ACCEPT_TOL = 1e-7;
const STRIP_EPS = 0.002; // stay just off the integer-T discontinuities
const SCAN_DSIGMA = 0.01; // scan spacing in σ (no fast oscillation in σ, so fixed)
const TARGET_DT_STEP = 0.25; // target Δt (imaginary height) per T-scan step — Nyquist for the ~2π/ln(N) oscillation
const SCAN_PAD = 0.05; // extend the σ scan past the box so edge roots are still bracketed
const DEDUP_DIST = 1e-6; // merge roots closer than this (Euclidean, not decimal buckets)
const REFLECT_TOL = 1e-6; // keep a reflected point only if inverse residual is this small

type Zero = { sigma: number; t: number; residual?: number };

/**
 * 2-D Newton on (Re F, Im F) = 0 with a central-difference Jacobian, confined to
 * one integer-T strip. Rps1 is non-holomorphic (built from |·| and arg), so the
 * full real Jacobian is required — the Cauchy-Riemann single-derivative shortcut
 * is valid only for the holomorphic Rak1. Returns the polished point (with its
 * residual) even if above tol; the caller decides acceptance. Null if it leaves
 * the strip or the Jacobian goes singular.
 */
function polish(
  F: (s: number, t: number) => Complex,
  s0: number,
  t0: number,
  tLo: number,
  tHi: number,
): Zero | null {
  let s = s0;
  let t = t0;
  for (let iter = 0; iter < NEWTON_ITERS; iter++) {
    const f = F(s, t);
    if (weighted(f, s, t) < NEWTON_TOL) return { sigma: s, t, residual: weighted(f, s, t) };

    const fsp = F(s + NEWTON_H, t);
    const fsm = F(s - NEWTON_H, t);
    const ftp = F(s, t + NEWTON_H);
    const ftm = F(s, t - NEWTON_H);
    const a = (fsp.re - fsm.re) / (2 * NEWTON_H);
    const b = (ftp.re - ftm.re) / (2 * NEWTON_H);
    const c = (fsp.im - fsm.im) / (2 * NEWTON_H);
    const d = (ftp.im - ftm.im) / (2 * NEWTON_H);

    const det = a * d - b * c;
    if (Math.abs(det) < 1e-14) return null;

    let ds = -(d * f.re - b * f.im) / det;
    let dt = -(-c * f.re + a * f.im) / det;
    const stepNorm = Math.hypot(ds, dt);
    if (stepNorm > 0.5) {
      ds *= 0.5 / stepNorm;
      dt *= 0.5 / stepNorm;
    }
    s += ds;
    t += dt;
    if (t <= tLo || t >= tHi) return null;
  }
  const f = F(s, t);
  return { sigma: s, t, residual: weighted(f, s, t) };
}

/**
 * Bracket zeros in one strip by sign changes on a grid. A simple zero of the complex
 * F=Re+i·Im forces BOTH Re and Im to change sign around the enclosing quad, so a quad
 * whose four corners show both signs of Re and both signs of Im brackets a zero. This
 * is topology-robust — unlike |F| local-minima it does not miss roots whose discrete
 * surface is distorted by a nearby pole curve. Pole crossings also flip signs and
 * produce false brackets, but those are rejected downstream by the residual check.
 * The σ scan is padded past the box edges so roots near the edges are still bracketed.
 */
function scanCandidates(
  F: (s: number, t: number) => Complex,
  tLo: number,
  tHi: number,
  cfg: Config,
  dSigma: number,
  dT: number,
): Zero[] {
  const sMin = cfg.sigmaMin - SCAN_PAD;
  const sMax = cfg.sigmaMax + SCAN_PAD;
  const nS = Math.max(2, Math.round((sMax - sMin) / dSigma));
  const nT = Math.max(2, Math.round((tHi - tLo) / dT));

  const sig = (i: number) => sMin + ((sMax - sMin) * i) / nS;
  const tim = (j: number) => tLo + ((tHi - tLo) * j) / nT;

  const reSign: number[][] = [];
  const imSign: number[][] = [];
  for (let i = 0; i <= nS; i++) {
    reSign[i] = [];
    imSign[i] = [];
    for (let j = 0; j <= nT; j++) {
      const f = F(sig(i), tim(j));
      reSign[i][j] = Math.sign(f.re);
      imSign[i][j] = Math.sign(f.im);
    }
  }

  const cands: Zero[] = [];
  for (let i = 0; i < nS; i++) {
    for (let j = 0; j < nT; j++) {
      const re = [reSign[i][j], reSign[i + 1][j], reSign[i][j + 1], reSign[i + 1][j + 1]];
      const im = [imSign[i][j], imSign[i + 1][j], imSign[i][j + 1], imSign[i + 1][j + 1]];
      const reCross = re.some((x) => x > 0) && re.some((x) => x < 0);
      const imCross = im.some((x) => x > 0) && im.some((x) => x < 0);
      if (reCross && imCross) {
        cands.push({ sigma: (sig(i) + sig(i + 1)) / 2, t: (tim(j) + tim(j + 1)) / 2 });
      }
    }
  }
  return cands;
}

/** Merge roots within DEDUP_DIST (Euclidean), keeping the smaller residual. */
function dedup(zeros: Zero[]): Zero[] {
  const sorted = [...zeros].sort((p, q) => p.sigma - q.sigma || p.t - q.t);
  const out: Zero[] = [];
  for (const z of sorted) {
    const near = out.find((o) => Math.hypot(o.sigma - z.sigma, o.t - z.t) < DEDUP_DIST);
    if (!near) out.push(z);
    else if ((z.residual ?? 1) < (near.residual ?? 1)) Object.assign(near, z);
  }
  return out.sort((p, q) => p.sigma - q.sigma);
}

/**
 * Bracket + Newton-polish all zeros in one strip at scan spacing h. Every accepted
 * point is verified to residual < ACCEPT_TOL, so spurious brackets (shallow non-zero
 * minima) are rejected.
 */
function polishStrip(
  forward: (s: number, t: number) => Complex,
  cfg: Config,
  k: number,
  tLo: number,
  tHi: number,
  dSigma: number,
  dT: number,
): Zero[] {
  const zeros: Zero[] = [];
  for (const cand of scanCandidates(forward, tLo, tHi, cfg, dSigma, dT)) {
    const r = polish(forward, cand.sigma, cand.t, k, k + 1);
    if (!r || (r.residual ?? 1) > ACCEPT_TOL) continue;
    if (r.sigma < cfg.sigmaMin || r.sigma > cfg.sigmaMax || r.t < cfg.tMin || r.t > cfg.tMax) {
      continue;
    }
    zeros.push(r);
  }
  return dedup(zeros);
}

/**
 * T-scan spacing for a strip, chosen so the imaginary-height step Δt is a fixed
 * TARGET_DT_STEP. Because t≈2π·T² grows quadratically, a unit T-strip at high T
 * spans a huge Δt (~440 at T=34) over which F oscillates on a t-scale ~2π/ln(N);
 * a fixed dT would alias and step over whole clusters of zeros. dT∝1/(dt/dT)∝1/T
 * keeps the scan Nyquist-correct at every height. Never coarser than SCAN_DSIGMA.
 */
function adaptiveDt(k: number): number {
  const mid = k + 0.5;
  const dtdT = (indexToImag(mid + 1e-3, false) - indexToImag(mid - 1e-3, false)) / 2e-3;
  return Math.min(SCAN_DSIGMA, TARGET_DT_STEP / Math.max(dtdT, 1e-9));
}

/**
 * Single-pass search: sign-change bracketing + Newton polish per integer-T strip,
 * with T-adaptive scan spacing so high-T zero clusters are resolved. Rak1
 * completeness is cross-checked by the argument principle in run(); Rps1 relies on
 * the robust bracket plus the reflection filter.
 */
function findZeros(cfg: Config): Zero[] {
  const { forward } = remFns(cfg.remainder);
  const all: Zero[] = [];
  const kFirst = Math.max(1, Math.floor(cfg.tMin)); // ⌊T⌋≥1 → non-empty partial sum
  const kLast = Math.ceil(cfg.tMax) - 1;
  const totalStrips = kLast - kFirst + 1;
  const t0 = Date.now();

  for (let k = kFirst; k <= kLast; k++) {
    const tLo = Math.max(cfg.tMin, k) + STRIP_EPS;
    const tHi = Math.min(cfg.tMax, k + 1) - STRIP_EPS;
    const dT = adaptiveDt(k);
    if (tHi > tLo) all.push(...polishStrip(forward, cfg, k, tLo, tHi, SCAN_DSIGMA, dT));

    const done = k - kFirst + 1;
    const pct = ((done / totalStrips) * 100).toFixed(0).padStart(3);
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(
      `  [${pct}%] strip ${done}/${totalStrips}  T∈[${k},${k + 1}]  dT=${dT.toExponential(1)}  ` +
        `${all.length} zeros  ${secs}s  ${(F_EVALS / 1e6).toFixed(1)}M evals`,
    );
  }
  return dedup(all);
}

/**
 * Reflect each zero σ→(1−σ) and keep it only where the inverse object G actually
 * vanishes there — the test that distinguishes a true "zeta" from a bare flip.
 */
function reflectZetas(cfg: Config, zeros: Zero[]): Zero[] {
  const { inverse } = remFns(cfg.remainder);
  const kept: Zero[] = [];
  for (const z of zeros) {
    const sRef = 1 - z.sigma;
    const g = inverse(sRef, z.t);
    // Normalize the inverse residual by the inverse object's own scale nearby.
    const gScale = complexAbs(inverse(sRef - 0.3, z.t));
    const rel = gScale > 1e-30 ? complexAbs(g) / gScale : complexAbs(g);
    if (rel < REFLECT_TOL) kept.push({ sigma: sRef, t: z.t });
  }
  kept.sort((p, q) => p.sigma - q.sigma);
  return kept;
}

function toCsv(name: string, color: string, rows: Zero[]): string {
  const lines = [
    "# Point Set File Format:",
    "# Settings are specified with #@ prefix followed by name: value",
    `#@name: ${name}`,
    `#@color:${color}`,
    "#@skipCriticalLine: false",
    "#@samplingInterval: 1",
    "# Data format: real,index",
  ];
  for (const r of rows) lines.push(`${r.sigma.toFixed(15)},${r.t.toFixed(15)}`);
  return lines.join("\n") + "\n";
}

const HERE = dirname(fileURLToPath(import.meta.url));
const POINTS_DIR = resolve(HERE, "../public/critical-strip-points");

/**
 * Exact zero count in the box via the argument principle. Valid ONLY for the
 * holomorphic Rak1 forward object (Σn^(-s)+Rak1 is analytic in s=σ+it, no poles),
 * so it serves as an independent completeness certificate for the scanner. Not
 * usable for Rps1, which has pole curves and non-analytic |·|/arg terms.
 */
function argumentPrincipleCount(cfg: Config): number {
  const { forward } = remFns(cfg.remainder);
  // Dense enough that arg changes < π between boundary samples even for strips
  // with many zeros over the wide σ range.
  const N = 20000;
  let total = 0;
  const kFirst = Math.max(1, Math.floor(cfg.tMin));
  const kLast = Math.ceil(cfg.tMax) - 1;
  for (let k = kFirst; k <= kLast; k++) {
    const tLo = Math.max(cfg.tMin, k) + STRIP_EPS;
    const tHi = Math.min(cfg.tMax, k + 1) - STRIP_EPS;
    if (tHi <= tLo) continue;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= N; i++) pts.push([cfg.sigmaMin + ((cfg.sigmaMax - cfg.sigmaMin) * i) / N, tLo]);
    for (let i = 1; i <= N; i++) pts.push([cfg.sigmaMax, tLo + ((tHi - tLo) * i) / N]);
    for (let i = 1; i <= N; i++) pts.push([cfg.sigmaMax - ((cfg.sigmaMax - cfg.sigmaMin) * i) / N, tHi]);
    for (let i = 1; i <= N; i++) pts.push([cfg.sigmaMin, tHi - ((tHi - tLo) * i) / N]);
    let acc = 0;
    let prev = Math.atan2(forward(pts[0][0], pts[0][1]).im, forward(pts[0][0], pts[0][1]).re);
    for (let i = 1; i < pts.length; i++) {
      const f = forward(pts[i][0], pts[i][1]);
      const a = Math.atan2(f.im, f.re);
      let d = a - prev;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      acc += d;
      prev = a;
    }
    total += Math.round(acc / (2 * Math.PI));
  }
  return total;
}

/** --check: regenerate Rak1 in the box and diff against the shipped CSV. */
function checkAgainstRak1(): void {
  const cfg: Config = {
    remainder: "rak1",
    label: "Rak1 Zeros [check]",
    color: "#ffffff",
    sigmaMin: 0,
    sigmaMax: 1,
    tMin: 0,
    tMax: 5,
    zerosFile: "",
    zetasFile: "",
  };
  F_EVALS = 0;
  const t0 = Date.now();
  const zeros = findZeros(cfg);
  const elapsed = Date.now() - t0;
  const shippedPath = resolve(POINTS_DIR, "02 Rak1 Zeros [σ5].csv");
  const shipped = readFileSync(shippedPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split(",").map(Number))
    .filter(([s, t]) => s >= 0 && s <= 1 && t >= 0 && t <= 5)
    .map(([sigma, t]) => ({ sigma, t }));

  console.log(`Rak1 self-check in σ∈[0,1], T∈[0,5]:`);
  console.log(`  generated ${zeros.length} zeros, shipped file has ${shipped.length}`);
  let maxErr = 0;
  let matched = 0;
  for (const s of shipped) {
    let best = Infinity;
    for (const z of zeros) best = Math.min(best, Math.hypot(z.sigma - s.sigma, z.t - s.t));
    if (best < 1e-4) matched++;
    maxErr = Math.max(maxErr, best);
  }
  console.log(`  ${matched}/${shipped.length} shipped points matched to <1e-4`);
  console.log(`  worst nearest-neighbour distance: ${maxErr.toExponential(3)}`);
  const worstRes = Math.max(...zeros.map((z) => z.residual ?? 0));
  console.log(`  worst residual: ${worstRes.toExponential(2)}  |  ${F_EVALS} F-evals  |  ${elapsed}ms`);
  const exact = argumentPrincipleCount(cfg);
  console.log(
    `  argument-principle count: ${exact}  →  scanner ${zeros.length === exact ? "COMPLETE ✓" : "MISSED ROOTS ✗"}`,
  );
}

function run(cfg: Config): void {
  F_EVALS = 0;
  const t0 = Date.now();
  const zeros = findZeros(cfg);
  const zetas = reflectZetas(cfg, zeros);
  const elapsed = Date.now() - t0;
  const worstRes = zeros.length ? Math.max(...zeros.map((z) => z.residual ?? 0)) : 0;
  console.log(
    `search: ${zeros.length} zeros, worst residual ${worstRes.toExponential(2)}, ` +
      `${F_EVALS} F-evals, ${elapsed}ms`,
  );
  if (cfg.remainder === "rak1") {
    const exact = argumentPrincipleCount(cfg);
    console.log(
      `  argument-principle count: ${exact}  →  ${zeros.length === exact ? "COMPLETE ✓" : `MISMATCH ✗ (found ${zeros.length})`}`,
    );
  }
  mkdirSync(POINTS_DIR, { recursive: true });

  const zerosPath = resolve(POINTS_DIR, cfg.zerosFile);
  writeFileSync(zerosPath, toCsv(`${cfg.label} Zeros`, cfg.color, zeros));
  console.log(`wrote ${zeros.length} zeros → ${cfg.zerosFile}`);

  const zetasPath = resolve(POINTS_DIR, cfg.zetasFile);
  writeFileSync(zetasPath, toCsv(`${cfg.label} Zetas`, "#ff0000", zetas));
  console.log(
    `wrote ${zetas.length} zetas → ${cfg.zetasFile} ` +
      `(${zeros.length - zetas.length} dropped: reflection did not hold)`,
  );
}

/** Parse `--flag a b` as a numeric [min,max] pair, falling back to defaults. */
function rangeArg(flag: string, defMin: number, defMax: number): [number, number] {
  const i = process.argv.indexOf(flag);
  if (i === -1) return [defMin, defMax];
  const lo = Number(process.argv[i + 1]);
  const hi = Number(process.argv[i + 2]);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) {
    throw new Error(`bad ${flag} range: expected "${flag} <min> <max>"`);
  }
  return [lo, hi];
}

/** Compact filesystem-safe tag encoding the search box, e.g. "T0-40 σ-9to10". */
function boxTag(sigmaMin: number, sigmaMax: number, tMin: number, tMax: number): string {
  return `T${tMin}-${tMax} σ${sigmaMin}to${sigmaMax}`;
}

function main(): void {
  const arg = process.argv[2] ?? "rps1";
  if (arg === "--check") {
    checkAgainstRak1();
    return;
  }
  const remainder: RemainderKind = arg === "rak1" ? "rak1" : "rps1";
  const [sigmaMin, sigmaMax] = rangeArg("--sigma", 0, 1);
  const [tMin, tMax] = rangeArg("--t", 0, 5);
  const tag = boxTag(sigmaMin, sigmaMax, tMin, tMax);
  const name = remainder === "rak1" ? "Rak1" : "Rps1";
  const cfg: Config = {
    remainder,
    label: `${name} [${tag}]`,
    color: remainder === "rak1" ? "#ffffff" : "#00e5ff",
    sigmaMin,
    sigmaMax,
    tMin,
    tMax,
    zerosFile: `02 ${name} Zeros [${tag}].csv`,
    zetasFile: `02 ${name} Zetas [${tag}].csv`,
  };
  if (!existsSync(POINTS_DIR)) throw new Error(`points dir missing: ${POINTS_DIR}`);
  console.log(`${cfg.label}: searching σ∈[${sigmaMin},${sigmaMax}], T∈[${tMin},${tMax}]`);
  run(cfg);
}

main();

import { indexToImag } from "@/shared/math/zetaEms";

// ─── Joint-angle vector: calibrate-once / perturbate-many ───────────────────────
// The joint (turning) angle at joint n is θ_n = fold(−t·c_n) with c_n = ln(n/(n−1))
// FIXED and t = I(T). This module returns the SIGNED angle vector, each entry wrapped
// to [−π, π] (0 = straight/folded out, ±π = reversed/folded back). Two paths:
//   • jaSignedScratch — Math.log(n/(n−1)) for every joint, every call.
//   • jaSignedPerturb — calibrate the wrapped phase once at N=⌊T⌋, then within [N,N+1)
//     advance each joint by a single shared scalar ΔI = I(T)−I(N) (no per-frame log).
// These are pure (module-cached) helpers shared by the joint-angle views; they never
// touch the spiral geometry.

const TWO_PI = Math.PI * 2;

// c_n = ln(n/(n−1)) cache, grown monotonically; Math.log runs only for new n.
const JA_CVEC: number[] = [0, 0];

function ensureCVec(N: number): void {
  for (let n = JA_CVEC.length; n <= N; n += 1) JA_CVEC[n] = Math.log(n / (n - 1));
}

// Calibration cache for the fast path: wrapped phase φ_n at t0 = I(N).
let calN = -1;
let calPoly = false;
let calT0 = 0;
let calPhi: Float64Array | null = null;
let recalibrations = 0;

function calibrate(N: number, usePolyImag: boolean): void {
  ensureCVec(N);
  const t0 = indexToImag(N, usePolyImag);
  const phi = new Float64Array(N + 1);
  for (let n = 2; n <= N; n += 1) {
    let w = (-t0 * JA_CVEC[n]!) % TWO_PI;
    if (w < 0) w += TWO_PI;
    phi[n] = w;
  }
  calN = N; calPoly = usePolyImag; calT0 = t0; calPhi = phi; recalibrations += 1;
}

/** Signed angle vector via calibrate-once + perturb (no Math.log in steady state). */
export function jaSignedPerturb(index: number, usePolyImag: boolean): Float64Array {
  const N = Math.floor(index);
  if (calN !== N || calPoly !== usePolyImag || calPhi === null) calibrate(N, usePolyImag);
  const t = indexToImag(index, usePolyImag);
  const dI = t - calT0;
  const phi = calPhi!;
  const signed = new Float64Array(N + 1);
  ensureCVec(N);
  for (let n = 2; n <= N; n += 1) {
    let w = (phi[n]! - dI * JA_CVEC[n]!) % TWO_PI;
    if (w < 0) w += TWO_PI;
    signed[n] = w > Math.PI ? w - TWO_PI : w;
  }
  return signed;
}

/**
 * Windowed perturb path: compute signed angles only for n ∈ [nLo, nHi].
 * Reuses calibration cache; suitable for pan/zoom at large T (Phase 0).
 */
export function jaSignedPerturbWindow(
  index: number,
  nLo: number,
  nHi: number,
  usePolyImag: boolean,
  out?: Float64Array,
): Float64Array {
  const N = Math.floor(index);
  if (calN !== N || calPoly !== usePolyImag || calPhi === null) calibrate(N, usePolyImag);
  const lo = Math.max(2, Math.min(N, nLo));
  const hi = Math.max(lo, Math.min(N, nHi));
  const t = indexToImag(index, usePolyImag);
  const dI = t - calT0;
  const phi = calPhi!;
  ensureCVec(hi);
  const signed = out !== undefined && out.length >= hi + 1 ? out : new Float64Array(hi + 1);
  for (let n = lo; n <= hi; n += 1) {
    let w = (phi[n]! - dI * JA_CVEC[n]!) % TWO_PI;
    if (w < 0) w += TWO_PI;
    signed[n] = w > Math.PI ? w - TWO_PI : w;
  }
  return signed;
}

/** Windowed scratch path for visible joints only. */
export function jaSignedScratchWindow(
  N: number,
  t: number,
  nLo: number,
  nHi: number,
  out?: Float64Array,
): Float64Array {
  const lo = Math.max(2, Math.min(N, nLo));
  const hi = Math.max(lo, Math.min(N, nHi));
  const signed = out !== undefined && out.length >= hi + 1 ? out : new Float64Array(hi + 1);
  for (let n = lo; n <= hi; n += 1) {
    let w = (-t * Math.log(n / (n - 1))) % TWO_PI;
    if (w < 0) w += TWO_PI;
    signed[n] = w > Math.PI ? w - TWO_PI : w;
  }
  return signed;
}

/** Signed angle vector the direct way: Math.log(n/(n−1)) for every joint. */
export function jaSignedScratch(N: number, t: number): Float64Array {
  const signed = new Float64Array(N + 1);
  for (let n = 2; n <= N; n += 1) {
    let w = (-t * Math.log(n / (n - 1))) % TWO_PI;
    if (w < 0) w += TWO_PI;
    signed[n] = w > Math.PI ? w - TWO_PI : w;
  }
  return signed;
}

// ─── Absolute joint angle: the angle link n makes with the real axis ────────────
// φ_n = fold(−t·ln n) — the ABSOLUTE heading of link n (the summand n^{−s}), as
// opposed to the turning angle θ_n = fold(−t·ln(n/(n−1))) above. Also in [−π, π].
// Same calibrate-once/perturb structure, with the fixed vector c_n = ln n.

// ln(n) cache, grown monotonically; Math.log runs only for new n.
const JA_LNVEC: number[] = [0, 0];

function ensureLnVec(N: number): void {
  for (let n = JA_LNVEC.length; n <= N; n += 1) JA_LNVEC[n] = Math.log(n);
}

// Calibration cache for the absolute-angle fast path (separate from the relative one).
let calNAbs = -1;
let calPolyAbs = false;
let calT0Abs = 0;
let calPhiAbs: Float64Array | null = null;

function calibrateAbs(N: number, usePolyImag: boolean): void {
  ensureLnVec(N);
  const t0 = indexToImag(N, usePolyImag);
  const phi = new Float64Array(N + 1);
  for (let n = 2; n <= N; n += 1) {
    let w = (-t0 * JA_LNVEC[n]!) % TWO_PI;
    if (w < 0) w += TWO_PI;
    phi[n] = w;
  }
  calNAbs = N; calPolyAbs = usePolyImag; calT0Abs = t0; calPhiAbs = phi; recalibrations += 1;
}

/** Absolute-angle window (angle of link n with the real axis), scratch: φ_n = fold(−t·ln n). */
export function jaAbsoluteScratchWindow(
  N: number,
  t: number,
  nLo: number,
  nHi: number,
  out?: Float64Array,
): Float64Array {
  const lo = Math.max(2, Math.min(N, nLo));
  const hi = Math.max(lo, Math.min(N, nHi));
  const signed = out !== undefined && out.length >= hi + 1 ? out : new Float64Array(hi + 1);
  for (let n = lo; n <= hi; n += 1) {
    let w = (-t * Math.log(n)) % TWO_PI;
    if (w < 0) w += TWO_PI;
    signed[n] = w > Math.PI ? w - TWO_PI : w;
  }
  return signed;
}

/** Absolute-angle window via calibrate-once + perturb: φ_n = fold(−t·ln n). */
export function jaAbsolutePerturbWindow(
  index: number,
  nLo: number,
  nHi: number,
  usePolyImag: boolean,
  out?: Float64Array,
): Float64Array {
  const N = Math.floor(index);
  if (calNAbs !== N || calPolyAbs !== usePolyImag || calPhiAbs === null) calibrateAbs(N, usePolyImag);
  const lo = Math.max(2, Math.min(N, nLo));
  const hi = Math.max(lo, Math.min(N, nHi));
  const t = indexToImag(index, usePolyImag);
  const dI = t - calT0Abs;
  const phi = calPhiAbs!;
  ensureLnVec(hi);
  const signed = out !== undefined && out.length >= hi + 1 ? out : new Float64Array(hi + 1);
  for (let n = lo; n <= hi; n += 1) {
    let w = (phi[n]! - dI * JA_LNVEC[n]!) % TWO_PI;
    if (w < 0) w += TWO_PI;
    signed[n] = w > Math.PI ? w - TWO_PI : w;
  }
  return signed;
}

/** How many times the fast path has recalibrated (diagnostic). */
export function jaRecalibrations(): number { return recalibrations; }

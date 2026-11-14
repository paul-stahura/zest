import { calcB1Star } from "@/shared/math/b1Star";
import { complexAbs, complexDiv } from "@/shared/math/complex";
import { imagToIndex, indexToImag } from "@/shared/math/zetaEms";

const T_NEAR_ZERO = 1e-4;
const ABS_ZETA_MIN = 0.05;
const T_MIN = 1;
const MAX_SCAN_STEPS = 400;
const BISECT_ITERS = 40;

type Sample = {
  im: number;
  absZeta: number;
};

/**
 * Imaginary part of (ζ′/ζ)(½+it). On the punctured line this is −Z′/Z, so
 * it vanishes at extrema of Z (where ρ = 1/2) and blows up at zeros of Z.
 *
 * Returns null when ζ is too small to trust the quotient (a neighborhood
 * of a zero, which is a pole of ρ, not a root).
 */
function sampleImZetaLog(t: number): Sample | null {
  const { zeta, zetaPrime } = calcB1Star(0.5, t);
  const absZeta = complexAbs(zeta);
  if (!Number.isFinite(absZeta) || absZeta < T_NEAR_ZERO) return null;
  const zlog = complexDiv(zetaPrime, zeta);
  if (!Number.isFinite(zlog.im)) return null;
  return { im: zlog.im, absZeta };
}

function meanGap(t: number): number {
  return (2 * Math.PI) / Math.max(0.5, Math.log(Math.max(t, 3) / (2 * Math.PI)));
}

function bisectRhoHalf(tLo: number, tHi: number, imLo: number): number | null {
  let lo = tLo;
  let hi = tHi;
  let fLo = imLo;
  for (let i = 0; i < BISECT_ITERS; i += 1) {
    const mid = 0.5 * (lo + hi);
    const s = sampleImZetaLog(mid);
    if (s === null || s.absZeta < ABS_ZETA_MIN) return null;
    if (fLo * s.im <= 0) {
      hi = mid;
    } else {
      lo = mid;
      fLo = s.im;
    }
  }
  const t = 0.5 * (lo + hi);
  const s = sampleImZetaLog(t);
  if (s === null || s.absZeta < ABS_ZETA_MIN || Math.abs(s.im) > 1e-3) return null;
  return t;
}

/**
 * Next height t > t0 (or t < t0) on σ = 1/2 where ρ = 1/2.
 *
 * On the punctured critical line ρ = 1/2 + i Z′/(2ϑ′Z), so this is a
 * search for Z′ = 0 — the extrema of Z, including champions. Zeros of
 * Z are poles of ρ and are skipped.
 *
 * Execution flow:
 * 1. Step along t by a fraction of the local mean zero gap.
 * 2. Watch Im(ζ′/ζ) for a sign change at samples with |ζ| not small.
 * 3. Bisect that bracket; reject it if a sample falls near a zero.
 *
 * Edge cases:
 * - Starting already on a root: take one gap-fraction step first so the
 *   next (or previous) extremum is found, not the same one.
 * - A sign change across a zeta zero is a pole, not a root; |ζ| small
 *   at the midpoint rejects the bracket.
 *
 * @param t0 - Starting imaginary part
 * @param direction - +1 later in t, −1 earlier
 * @param tMax - Exclusive upper bound (app index clamp, mapped to t)
 * @returns the next t, or null if none is found in range
 */
export function findNextRhoHalfImag(
  t0: number,
  direction: 1 | -1,
  tMax: number,
): number | null {
  const gap0 = meanGap(Math.max(t0, T_MIN));
  let t = t0;
  const start = sampleImZetaLog(t0);
  if (start !== null && start.absZeta >= ABS_ZETA_MIN && Math.abs(start.im) < 1e-6) {
    t = t0 + direction * 0.15 * gap0;
  }

  let prevT = t;
  let prev = sampleImZetaLog(t);
  for (let step = 0; step < MAX_SCAN_STEPS; step += 1) {
    const gap = meanGap(Math.max(Math.abs(t), T_MIN));
    t += direction * 0.2 * gap;
    if (t < T_MIN || t > tMax) return null;
    const cur = sampleImZetaLog(t);
    if (cur === null || cur.absZeta < ABS_ZETA_MIN) {
      prev = null;
      prevT = t;
      continue;
    }
    if (
      prev !== null
      && prev.absZeta >= ABS_ZETA_MIN
      && prev.im * cur.im <= 0
      && (prev.im !== 0 || cur.im !== 0)
    ) {
      const lo = direction > 0 ? prevT : t;
      const hi = direction > 0 ? t : prevT;
      const imLo = direction > 0 ? prev.im : cur.im;
      const root = bisectRhoHalf(lo, hi, imLo);
      if (root !== null && direction * (root - t0) > 1e-8) return root;
    }
    prev = cur;
    prevT = t;
  }
  return null;
}

/**
 * Same search as findNextRhoHalfImag, in the app's index T.
 *
 * @param index - Current spiral index T
 * @param direction - +1 later, −1 earlier
 * @param usePolyImag - Same mapping the workspace is using
 * @param indexMax - Workspace index clamp
 * @returns the next T, or null if none is found
 */
export function findNextRhoHalfIndex(
  index: number,
  direction: 1 | -1,
  usePolyImag: boolean,
  indexMax = 10000 - 1e-9,
): number | null {
  const t0 = indexToImag(index, usePolyImag);
  const tMax = indexToImag(indexMax, usePolyImag);
  const t = findNextRhoHalfImag(t0, direction, tMax);
  if (t === null) return null;
  const T = imagToIndex(t, usePolyImag);
  if (!Number.isFinite(T) || T < 0 || T > indexMax) return null;
  return T;
}

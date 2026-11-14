import { complex, type Complex } from "@/shared/math/complex";
import { eulerMaclaurenZeta, indexToImag } from "@/shared/math/zetaEms";
import {
  calcNLinks,
  calculateHurwitzCharacterTarget,
  calculateHurwitzCharacterVectors,
  flipLFunctionVectorsOriginToTarget,
} from "@/shared/math/lFunctionCalculator";
import { midPerpProgressionCoeffs } from "@/shared/math/hurwitzMidPerpSearch";
import {
  hurwitzBisectorLinkIndex,
  hurwitzBisectorLinkNumber,
  locateHurwitzBisectorCrossing,
} from "@/shared/math/hurwitzBisectorLink";
import { wrapOmegaDegrees } from "@/shared/math/hurwitzMidPerpCatalog";

export type Q2OmegaZetaBPoint = {
  omega: Complex;
  /** Always 1: only unimodular ω puts ζ on the H/2 perp at σ=1/2. */
  abs: number;
  deg: number;
  nu: number;
  link: number;
  frac: number;
  /** |b−ζ| at the chosen crossing. */
  miss: number;
};

export type OmegaZetaBPointHint = {
  deg: number;
  index: number;
  link?: number;
};

const COARSE_STEP = 4;
const REFINE_HALF_WIDTH = 22;
const REFINE_TOL = 0.04;
const GOLDEN = (Math.sqrt(5) - 1) / 2;
const HINT_INDEX_JUMP = 0.75;

type ScoreHit = { miss: number; link: number; frac: number };

/**
 * Same search as {@link omegaForZetaBPoint} at period q=2.
 */
export function q2OmegaForZetaBPoint(index: number): Q2OmegaZetaBPoint | null {
  return omegaForZetaBPoint(index, 2);
}

/**
 * Toolbox line `ω=a+bi θ°` (three decimals, rounded degrees).
 */
export function formatOmegaLiveReadout(re: number, im: number, deg: number): string {
  const r = re.toFixed(3);
  const a = Math.abs(im).toFixed(3);
  const body = Math.abs(im) < 5e-4 ? r : (im < 0 ? `${r}-${a}i` : `${r}+${a}i`);
  const theta = Number.isFinite(deg) ? Math.round(deg) : 0;
  return `ω=${body} ${theta}°`;
}

/**
 * Degrees to advance a previous ω_* when T changes.
 *
 * u=ω q^{1/2−s} picks up −t log q, but the χ-chain also rotates
 * with t, and the |b−ζ| valley is seen to follow −Δt log q. A
 * previous angle plus this delta is where the 1-D refine resumes.
 */
export function omegaPhaseAdvanceDeg(indexFrom: number, indexTo: number, q: number): number {
  if (!Number.isFinite(indexFrom) || !Number.isFinite(indexTo) || q < 2) return 0;
  const dt = indexToImag(indexTo, false) - indexToImag(indexFrom, false);
  return -(dt * Math.log(q) * 180) / Math.PI;
}

/**
 * Unimodular ω for χ=(1−ω√q, 1, …, 1) so the H/2 perp contains ζ and
 * the first-coil crossing sits as close to ζ as a unit-circle ω allows.
 *
 * H=ζ(1−ω q^{1/2−s}). A hint from the last T is advanced by
 * {@link omegaPhaseAdvanceDeg} and refined; a cold start still scans
 * the circle. Crossing marks prefer the previous link, else the
 * neighbor closest to ζ.
 */
export function omegaForZetaBPoint(
  index: number,
  q: number,
  hint?: OmegaZetaBPointHint,
): Q2OmegaZetaBPoint | null {
  if (!Number.isFinite(index) || index < 1) return null;
  if (!Number.isInteger(q) || q < 2) return null;
  const t = indexToImag(index, false);
  const s = complex(0.5, t);
  const zeta = eulerMaclaurenZeta(s);
  const nu = hurwitzBisectorLinkIndex(index, q);
  if (nu < 0) return null;
  const guess = hurwitzBisectorLinkNumber(index, q);
  const nLinks = Math.min(calcNLinks(index, q), Math.max(guess + 4, 4));
  const zPt = { x: zeta.re, y: zeta.im };
  const cache = new Map<string, ScoreHit>();

  const score = (deg: number, preferLink?: number): ScoreHit => {
    const wrapped = wrapOmegaDegrees(deg);
    const key = `${wrapped.toFixed(4)}:${preferLink ?? ""}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const a = (wrapped * Math.PI) / 180;
    const coeffs = midPerpProgressionCoeffs(q, complex(Math.cos(a), Math.sin(a)));
    const H = calculateHurwitzCharacterTarget(coeffs, s);
    const walk = calculateHurwitzCharacterVectors(coeffs, nLinks, s);
    const targetPt = { x: H.re, y: H.im };
    const reverse = flipLFunctionVectorsOriginToTarget(walk, targetPt);
    const cross = locateHurwitzBisectorCrossing(
      walk.vectors,
      targetPt,
      guess,
      { preferLink, reverseJoints: reverse, nearest: zPt },
    );
    const hit: ScoreHit = cross === null
      ? { miss: Number.POSITIVE_INFINITY, link: guess, frac: 0 }
      : {
        miss: Math.hypot(cross.point.x - zPt.x, cross.point.y - zPt.y),
        link: cross.link,
        frac: cross.frac,
      };
    cache.set(key, hit);
    return hit;
  };

  const refine = (center: number, preferLink?: number): { deg: number; hit: ScoreHit } => {
    let lo = center - REFINE_HALF_WIDTH;
    let hi = center + REFINE_HALF_WIDTH;
    let x1 = hi - GOLDEN * (hi - lo);
    let x2 = lo + GOLDEN * (hi - lo);
    let s1 = score(x1, preferLink);
    let s2 = score(x2, preferLink);
    while (hi - lo > REFINE_TOL) {
      if (s1.miss <= s2.miss) {
        hi = x2;
        x2 = x1;
        s2 = s1;
        x1 = hi - GOLDEN * (hi - lo);
        s1 = score(x1, preferLink);
      } else {
        lo = x1;
        x1 = x2;
        s1 = s2;
        x2 = lo + GOLDEN * (hi - lo);
        s2 = score(x2, preferLink);
      }
    }
    const mid = (lo + hi) / 2;
    let bestDeg = wrapOmegaDegrees(mid);
    let best = score(mid, preferLink);
    const ends = [lo, hi, x1, x2, center];
    for (const deg of ends) {
      const hit = score(deg, preferLink);
      if (hit.miss < best.miss) {
        bestDeg = wrapOmegaDegrees(deg);
        best = hit;
      }
    }
    return { deg: bestDeg, hit: best };
  };

  const hintOk = hint !== undefined
    && Number.isFinite(hint.deg)
    && Number.isFinite(hint.index);
  const smallStep = hintOk && hint !== undefined
    && Math.abs(index - hint.index) < HINT_INDEX_JUMP;
  const prefer = smallStep && hint !== undefined ? hint.link : undefined;

  const samples: { deg: number; hit: ScoreHit }[] = [];
  for (let deg = 0; deg < 360; deg += COARSE_STEP) {
    samples.push({ deg, hit: score(deg, prefer) });
  }
  let seedDeg = 0;
  let seed = samples[0]?.hit ?? { miss: Number.POSITIVE_INFINITY, link: guess, frac: 0 };
  for (const sample of samples) {
    if (sample.hit.miss < seed.miss) {
      seedDeg = sample.deg;
      seed = sample.hit;
    }
  }
  if (hintOk && hint !== undefined) {
    const predicted = wrapOmegaDegrees(hint.deg + omegaPhaseAdvanceDeg(hint.index, index, q));
    const cap = seed.miss * 1.35 + 1e-9;
    let bestNear = Number.POSITIVE_INFINITY;
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      if (sample === undefined || sample.hit.miss > cap) continue;
      const prev = samples[(i + samples.length - 1) % samples.length];
      const next = samples[(i + 1) % samples.length];
      if (prev === undefined || next === undefined) continue;
      if (sample.hit.miss > prev.hit.miss || sample.hit.miss > next.hit.miss) continue;
      const dHint = Math.min(Math.abs(sample.deg - hint.deg), 360 - Math.abs(sample.deg - hint.deg));
      const dPred = Math.min(Math.abs(sample.deg - predicted), 360 - Math.abs(sample.deg - predicted));
      const near = Math.min(dHint, dPred);
      if (near < bestNear) {
        bestNear = near;
        seedDeg = sample.deg;
        seed = sample.hit;
      }
    }
  }
  const local = refine(seedDeg, prefer ?? seed.link);
  const bestDeg = local.deg;
  const best = local.hit;

  if (!Number.isFinite(best.miss)) return null;
  const a = (bestDeg * Math.PI) / 180;
  return {
    omega: complex(Math.cos(a), Math.sin(a)),
    abs: 1,
    deg: wrapOmegaDegrees(bestDeg),
    nu,
    link: best.link,
    frac: best.frac,
    miss: best.miss,
  };
}

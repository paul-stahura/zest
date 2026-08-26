import type { Point2 } from "@/shared/io/types";
import {
  complex,
  complexAdd,
  complexDiv,
  complexMul,
  complexSub,
  powRealToComplex,
  type Complex,
} from "@/shared/math/complex";
import { indexToImag } from "@/shared/math/zetaEms";

// ---------------------------------------------------------------------------
// Number theory helpers (private)
// ---------------------------------------------------------------------------

function modPow(baseVal: number, exp: number, modulus: number): number {
  let result = 1;
  let b = ((baseVal % modulus) + modulus) % modulus;
  let e = exp;
  while (e > 0) {
    if (e % 2 === 1) result = (result * b) % modulus;
    b = (b * b) % modulus;
    e = Math.trunc(e / 2);
  }
  return result;
}

function legendreSymbol(a: number, p: number): number {
  if (a % p === 0) return 0;
  const exponent = (p - 1) / 2;
  const result = modPow(a, exponent, p);
  return result === 1 ? 1 : -1;
}

function getPrimeFactors(n: number): number[] {
  const factors: number[] = [];
  let remaining = n;

  while (remaining % 2 === 0) {
    if (factors.length === 0 || factors[factors.length - 1] !== 2) factors.push(2);
    remaining /= 2;
  }

  for (let i = 3; i * i <= remaining; i += 2) {
    while (remaining % i === 0) {
      if (factors.length === 0 || factors[factors.length - 1] !== i) factors.push(i);
      remaining /= i;
    }
  }

  if (remaining > 2) factors.push(remaining);
  return factors;
}

function calculateL(n: number, lInput: number): number {
  if (lInput <= 1) return 1;
  const primeFactors = getPrimeFactors(lInput);
  let result = 1;
  for (const prime of primeFactors) {
    result *= legendreSymbol(n, prime);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Hurwitz zeta and L-function target (private helpers)
// ---------------------------------------------------------------------------

/**
 * Euler–Maclaurin truncation length for ζ(s, a). Fixed N=200 is fine at small
 * |t| but on the critical line at |t|~1700 it misplaces L(s,χ) by O(1) — the
 * white cross drifts off the spiral head. N ≳ |t|/3 restores sub-milli accuracy.
 */
function hurwitzTermCount(s: Complex): number {
  const absT = Math.abs(s.im);
  return Math.max(200, Math.ceil(absT / 3) + 100);
}

function calculateHurwitzZeta(s: Complex, a: number, terms?: number): Complex {
  const N = terms ?? hurwitzTermCount(s);
  let sum: Complex = complex(0, 0);

  for (let n = 0; n < N; n++) {
    const base = n + a;
    // (n+a)^(-s) = powRealToComplex(n+a, -s)
    const term = powRealToComplex(base, { re: -s.re, im: -s.im });
    sum = complexAdd(sum, term);
  }

  // Euler-Maclaurin tail: (N+a)^(1-s) / (s-1)
  const tailBase = N + a;
  const sMinus1: Complex = { re: s.re - 1, im: s.im };
  const tail = complexDiv(powRealToComplex(tailBase, { re: 1 - s.re, im: -s.im }), sMinus1);
  sum = complexAdd(sum, tail);

  // + 0.5 * (N+a)^(-s)
  const bernoulli0 = powRealToComplex(tailBase, { re: -s.re, im: -s.im });
  sum = complexAdd(sum, { re: 0.5 * bernoulli0.re, im: 0.5 * bernoulli0.im });

  // + (1/12) * s * (N+a)^(-s-1)
  const b2term = complexMul(
    { re: s.re / 12, im: s.im / 12 },
    powRealToComplex(tailBase, { re: -s.re - 1, im: -s.im }),
  );
  sum = complexAdd(sum, b2term);

  // - (1/720) * s * (s+1) * (s+2) * (N+a)^(-s-3)
  const sPlus1: Complex = { re: s.re + 1, im: s.im };
  const sPlus2: Complex = { re: s.re + 2, im: s.im };
  const cubic = complexMul(complexMul(s, sPlus1), sPlus2);
  const b4term = complexMul(
    { re: cubic.re / 720, im: cubic.im / 720 },
    powRealToComplex(tailBase, { re: -s.re - 3, im: -s.im }),
  );
  sum = complexSub(sum, b4term);

  return sum;
}

// ---------------------------------------------------------------------------
// Public math API
// ---------------------------------------------------------------------------

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  const sqrt = Math.floor(Math.sqrt(n));
  for (let i = 3; i <= sqrt; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

export function nearestPrime(n: number): number {
  const v = Math.max(2, Math.round(n));
  if (isPrime(v)) return v;
  // Search downward first (matches Unity's downward-stepping logic)
  for (let candidate = v - 1; candidate >= 2; candidate--) {
    if (isPrime(candidate)) return candidate;
  }
  return 2;
}

/**
 * Analytic L(s, χ) via Hurwitz zeta (drawn as the L-function cross / bisector tip).
 *
 * Must agree with the partial-sum spiral head to visual precision. Term count
 * scales with |Im s| — see hurwitzTermCount.
 */
export function calculateZetaTarget(lInput: number, s: Complex): Complex {
  let result: Complex = complex(0, 0);
  const terms = hurwitzTermCount(s);

  for (let a = 1; a <= lInput; a++) {
    const chiA = calculateL(a, lInput);
    if (chiA === 0) continue;

    const offset = a / lInput;
    const hurwitz = calculateHurwitzZeta(s, offset, terms);
    result = complexAdd(result, { re: chiA * hurwitz.re, im: chiA * hurwitz.im });
  }

  // Divide by lInput^s
  const qPowS = powRealToComplex(lInput, s);
  return complexDiv(result, qPowS);
}

export type LFunctionVectors = {
  vectors: Point2[];
  phantomVectors: [Point2, Point2][];
};

export function calculateVectors(
  numLinks: number,
  lInput: number,
  s: Complex,
): LFunctionVectors {
  const vectors: Point2[] = [{ x: 0, y: 0 }];
  const phantomVectors: [Point2, Point2][] = [];
  let sumRe = 0;
  let sumIm = 0;

  for (let n = 1; n <= numLinks; n++) {
    const lValue = calculateL(n, lInput);

    // n^(σ+iI) = n^σ · e^(iI·ln n)
    const nPowSigma = Math.pow(n, s.re);
    const angle = s.im * Math.log(n);
    const denomRe = nPowSigma * Math.cos(angle);
    const denomIm = nPowSigma * Math.sin(angle);
    // 1/denominator
    const denomMag2 = denomRe * denomRe + denomIm * denomIm;
    const invRe = denomRe / denomMag2;
    const invIm = -denomIm / denomMag2;

    if (lValue === 0) {
      // Phantom: show the skipped term as a connector
      phantomVectors.push([
        { x: sumRe, y: sumIm },
        { x: sumRe + invRe, y: sumIm + invIm },
      ]);
      // sum unchanged (lValue * inv = 0)
    } else {
      sumRe += lValue * invRe;
      sumIm += lValue * invIm;
      vectors.push({ x: sumRe, y: sumIm });
    }
  }

  return { vectors, phantomVectors };
}

// ---------------------------------------------------------------------------
// Inverse spiral: start at analytic L, peel terms N→1 back toward the origin
// ---------------------------------------------------------------------------

/**
 * Inverse L-spiral. Tail sits at `start` (the analytic L-value cross — continuous
 * in T) and walks χ(n) n^{-s} off in reverse order so the head lands near the
 * origin. Starting at 0 and summing reverse (the old behavior) put the tail at
 * the origin and made it jump whenever calcNLinks ticked.
 */
export function calculateInverseVectors(
  numLinks: number,
  lInput: number,
  s: Complex,
  start: Point2,
): LFunctionVectors {
  const vectors: Point2[] = [{ x: start.x, y: start.y }];
  const phantomVectors: [Point2, Point2][] = [];
  let sumRe = start.x;
  let sumIm = start.y;

  for (let n = numLinks; n >= 1; n--) {
    const lValue = calculateL(n, lInput);

    const nPowSigma = Math.pow(n, s.re);
    const angle = s.im * Math.log(n);
    const denomRe = nPowSigma * Math.cos(angle);
    const denomIm = nPowSigma * Math.sin(angle);
    const denomMag2 = denomRe * denomRe + denomIm * denomIm;
    const invRe = denomRe / denomMag2;
    const invIm = -denomIm / denomMag2;

    if (lValue === 0) {
      // Phantom: show the skipped backward step without moving the sum
      phantomVectors.push([
        { x: sumRe, y: sumIm },
        { x: sumRe - invRe, y: sumIm - invIm },
      ]);
    } else {
      sumRe -= lValue * invRe;
      sumIm -= lValue * invIm;
      vectors.push({ x: sumRe, y: sumIm });
    }
  }

  return { vectors, phantomVectors };
}

// ---------------------------------------------------------------------------
// Reflect vectors across perpendicular bisector of origin→analytic L
// ---------------------------------------------------------------------------

/**
 * Reflect the forward spiral across the perp-bisector of origin→target.
 * Tail lands on the analytic L cross (smooth in T); head lands at the origin.
 * Matches Unity LFunctionDrawer; do not pivot on the partial-sum head — that
 * jumps whenever calcNLinks increments by one term.
 */
export function reflectLFunctionVectors(
  fwd: LFunctionVectors,
  target: Point2,
): LFunctionVectors {
  const tLen = Math.hypot(target.x, target.y);
  if (tLen < 1e-10) return { vectors: [], phantomVectors: [] };

  // Unit vector along origin→target; perpendicular is (-dy, dx) rotated 90°
  const dirX = target.x / tLen;
  const dirY = target.y / tLen;
  const perpX = -dirY;
  const perpY = dirX;

  function reflect(p: Point2): Point2 {
    const dot = p.x * perpX + p.y * perpY;
    const projX = perpX * dot;
    const projY = perpY * dot;
    // reflection = 2*proj - p, then shift by target
    return {
      x: 2 * projX - p.x + target.x,
      y: 2 * projY - p.y + target.y,
    };
  }

  return {
    vectors: fwd.vectors.map(reflect),
    phantomVectors: fwd.phantomVectors.map(([a, b]) => [reflect(a), reflect(b)]),
  };
}

// ---------------------------------------------------------------------------
// Imaginary part formulas
// ---------------------------------------------------------------------------

function iOfT(p: number, index: number): number {
  const c = p - 1;
  const num = 4.0 * index * Math.PI;
  const denom = c * Math.log((p * index + c) / (p * index - c));
  return num / denom;
}

/**
 * Odd-T bisector offset for I₃, fitted on T=1..100 event residuals:
 *   t_event − I₃^geom ≈ 0.390914 + 0.01712/T²
 * (constant 0.391 alone left a ~0.017 residual at T=1; a+c/T² cuts odd-T
 * RMSE from ~2.4e-3 to ~7.8e-6). The previous growing T^(3√3−3) correction
 * overshot by hundreds of units.
 */
function i3OddTOffset(index: number): number {
  return 0.390914 + 0.01712 / (index * index);
}

function i3OfT(_p: number, index: number): number {
  // Geometric form c=(3+cos(πT))/2, plus gated odd-T bisector offset a+c/T².
  // Even T (folds): gate=0 → exact. Odd T (bisectors): gate=1 → geom+offset(T).
  if (index <= 0) return 0;
  const c = (3.0 + Math.cos(Math.PI * index)) / 2.0;
  const denom = 3.0 * index;
  if (denom <= c) return 0;
  const exact = (c * index * Math.PI) / Math.log((denom + c) / (denom - c));
  const gate = 0.5 * (1.0 - Math.cos(Math.PI * index));
  return exact + gate * i3OddTOffset(index);
}

function i5OfT(p: number, index: number): number {
  const offset =
    0.6206 -
    0.6576 * Math.cos((Math.PI * index) / 2.0) +
    0.0369 * Math.cos(Math.PI * index) +
    0.169 / Math.pow(index, 3.12);
  return iOfT(p, index) + offset;
}

/**
 * Map link index T → imaginary part t for the L-function spiral.
 *
 * When usePrimeImag is off, every prime uses the smooth base I_p(T).
 * When on, p=1 uses zeta's I(T), p=3/5 use their event-tuned formulas,
 * and other primes fall back to the base.
 */
export function getPrimeImaginaryPart(
  prime: number,
  index: number,
  usePrimeImag: boolean,
  usePolyImag: boolean,
): number {
  if (!usePrimeImag) return iOfT(prime, index);

  if (prime === 1) return indexToImag(index, usePolyImag);
  if (prime === 3) return i3OfT(prime, index);
  if (prime === 5) return i5OfT(prime, index);
  return iOfT(prime, index);
}

export function calcNLinks(index: number, prime: number): number {
  return Math.max(0, Math.floor(2 * index * (index + 1) * prime));
}

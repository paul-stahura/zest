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

// ---------------------------------------------------------------------------
// Titchmarsh f_L (mod 5, no Euler product) — Chapter X, §10.25
// ---------------------------------------------------------------------------

const SQRT5 = Math.sqrt(5);

/**
 * tan θ from Titchmarsh (10.25.1), computed once:
 * (√(10−2√5)−2)/(√5−1) ≈ 0.284079043840412.
 */
export const TITCHMARSH_FL_TAN_THETA = (Math.sqrt(10 - 2 * SQRT5) - 2) / (SQRT5 - 1);

/** θ = arctan(tan θ) ≈ 0.276787179448523. */
export const TITCHMARSH_FL_THETA = Math.atan(TITCHMARSH_FL_TAN_THETA);

/**
 * Dirichlet coefficient of f_L: four real links then a phantom 0, repeating.
 * n ≡ 1,2,3,4,0 (mod 5) → 1, tanθ, −tanθ, −1, 0.
 */
export function titchmarshFLCoeff(n: number): number {
  const residue = ((n % 5) + 5) % 5;
  if (residue === 0) return 0;
  if (residue === 1) return 1;
  if (residue === 2) return TITCHMARSH_FL_TAN_THETA;
  if (residue === 3) return -TITCHMARSH_FL_TAN_THETA;
  return -1;
}

/**
 * Analytic f_L(s) = 5^{−s}(ζ(s,1/5)+tanθ ζ(s,2/5)−tanθ ζ(s,3/5)−ζ(s,4/5)).
 */
export function calculateFLTarget(s: Complex): Complex {
  const terms = hurwitzTermCount(s);
  const tanTheta = TITCHMARSH_FL_TAN_THETA;
  const z1 = calculateHurwitzZeta(s, 0.2, terms);
  const z2 = calculateHurwitzZeta(s, 0.4, terms);
  const z3 = calculateHurwitzZeta(s, 0.6, terms);
  const z4 = calculateHurwitzZeta(s, 0.8, terms);
  const weighted: Complex = {
    re: z1.re + tanTheta * (z2.re - z3.re) - z4.re,
    im: z1.im + tanTheta * (z2.im - z3.im) - z4.im,
  };
  return complexDiv(weighted, powRealToComplex(5, s));
}

function nToNegS(n: number, s: Complex): { invRe: number; invIm: number } {
  const nPowSigma = Math.pow(n, s.re);
  const angle = s.im * Math.log(n);
  const denomRe = nPowSigma * Math.cos(angle);
  const denomIm = nPowSigma * Math.sin(angle);
  const denomMag2 = denomRe * denomRe + denomIm * denomIm;
  return { invRe: denomRe / denomMag2, invIm: -denomIm / denomMag2 };
}

/** n^{s−1} = n^{σ−1} e^{i t log n}, the zeta-tab inverse summand. */
function nToSMinus1(n: number, s: Complex): { re: number; im: number } {
  const r = Math.pow(n, s.re - 1);
  const angle = s.im * Math.log(n);
  return { re: r * Math.cos(angle), im: r * Math.sin(angle) };
}

/**
 * Forward f_L spiral: same joint/phantom walk as L, but with titchmarshFLCoeff.
 */
export function calculateFLVectors(numLinks: number, s: Complex): LFunctionVectors {
  const vectors: Point2[] = [{ x: 0, y: 0 }];
  const phantomVectors: [Point2, Point2][] = [];
  let sumRe = 0;
  let sumIm = 0;

  for (let n = 1; n <= numLinks; n++) {
    const weight = titchmarshFLCoeff(n);
    const { invRe, invIm } = nToNegS(n, s);
    if (weight === 0) {
      phantomVectors.push([
        { x: sumRe, y: sumIm },
        { x: sumRe + invRe, y: sumIm + invIm },
      ]);
    } else {
      sumRe += weight * invRe;
      sumIm += weight * invIm;
      vectors.push({ x: sumRe, y: sumIm });
    }
  }

  return { vectors, phantomVectors };
}

/**
 * Inverse f_L spiral. Tail on the analytic f_L cross; walks coefficients off
 * from N down to 1 so the head lands near the origin.
 */
export function calculateFLInverseVectors(
  numLinks: number,
  s: Complex,
  start: Point2,
): LFunctionVectors {
  const vectors: Point2[] = [{ x: start.x, y: start.y }];
  const phantomVectors: [Point2, Point2][] = [];
  let sumRe = start.x;
  let sumIm = start.y;

  for (let n = numLinks; n >= 1; n--) {
    const weight = titchmarshFLCoeff(n);
    const { invRe, invIm } = nToNegS(n, s);
    if (weight === 0) {
      phantomVectors.push([
        { x: sumRe, y: sumIm },
        { x: sumRe - invRe, y: sumIm - invIm },
      ]);
    } else {
      sumRe -= weight * invRe;
      sumIm -= weight * invIm;
      vectors.push({ x: sumRe, y: sumIm });
    }
  }

  return { vectors, phantomVectors };
}

// ---------------------------------------------------------------------------
// Titchmarsh L₁, L₂ (mod 5, complex χ) — Chapter X, §10.25
// L₁: 1, i, −i, −1, 0; L₂: 1, −i, i, −1, 0. Period 5.
// ---------------------------------------------------------------------------

/** Which Titchmarsh character: 1 = L₁, 2 = L₂. */
export type TitchmarshLKind = 1 | 2;

/**
 * Dirichlet coefficient of Titchmarsh L₁ or L₂. Zero (phantom) when 5 | n.
 */
export function titchmarshLCoeff(kind: TitchmarshLKind, n: number): Complex {
  const residue = ((n % 5) + 5) % 5;
  if (residue === 0) return complex(0, 0);
  if (residue === 1) return complex(1, 0);
  if (residue === 4) return complex(-1, 0);
  const imag = residue === 2 ? 1 : -1;
  return kind === 1 ? complex(0, imag) : complex(0, -imag);
}

/**
 * Analytic L_k(s) = 5^{−s} Σ_{a=1}^{4} χ_k(a) ζ(s, a/5).
 */
export function calculateTitchmarshLTarget(kind: TitchmarshLKind, s: Complex): Complex {
  const terms = hurwitzTermCount(s);
  const z1 = calculateHurwitzZeta(s, 0.2, terms);
  const z2 = calculateHurwitzZeta(s, 0.4, terms);
  const z3 = calculateHurwitzZeta(s, 0.6, terms);
  const z4 = calculateHurwitzZeta(s, 0.8, terms);
  const c2 = titchmarshLCoeff(kind, 2);
  const c3 = titchmarshLCoeff(kind, 3);
  const weighted = complexAdd(
    complexAdd(z1, complexMul(c2, z2)),
    complexAdd(complexMul(c3, z3), complexMul(complex(-1, 0), z4)),
  );
  return complexDiv(weighted, powRealToComplex(5, s));
}

function walkTitchmarshL(
  kind: TitchmarshLKind,
  numLinks: number,
  s: Complex,
  start: Point2,
  direction: 1 | -1,
): LFunctionVectors {
  const vectors: Point2[] = [{ x: start.x, y: start.y }];
  const phantomVectors: [Point2, Point2][] = [];
  let sumRe = start.x;
  let sumIm = start.y;
  const nStart = direction === 1 ? 1 : numLinks;
  const nEnd = direction === 1 ? numLinks : 1;
  const nStep = direction;

  for (let n = nStart; direction === 1 ? n <= nEnd : n >= nEnd; n += nStep) {
    const weight = titchmarshLCoeff(kind, n);
    const { invRe, invIm } = nToNegS(n, s);
    const step = complexMul(weight, complex(invRe, invIm));
    if (weight.re === 0 && weight.im === 0) {
      phantomVectors.push([
        { x: sumRe, y: sumIm },
        { x: sumRe + direction * invRe, y: sumIm + direction * invIm },
      ]);
    } else {
      sumRe += direction * step.re;
      sumIm += direction * step.im;
      vectors.push({ x: sumRe, y: sumIm });
    }
  }

  return { vectors, phantomVectors };
}

/**
 * Forward Titchmarsh L₁/L₂ spiral: complex χ × n^{−s}, phantom when 5 | n.
 */
export function calculateTitchmarshLVectors(
  kind: TitchmarshLKind,
  numLinks: number,
  s: Complex,
): LFunctionVectors {
  return walkTitchmarshL(kind, numLinks, s, { x: 0, y: 0 }, 1);
}

/**
 * Inverse Titchmarsh L₁/L₂ spiral. Tail on the analytic cross.
 */
export function calculateTitchmarshLInverseVectors(
  kind: TitchmarshLKind,
  numLinks: number,
  s: Complex,
  start: Point2,
): LFunctionVectors {
  return walkTitchmarshL(kind, numLinks, s, start, -1);
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

/**
 * Same flip as {@link reflectLFunctionVectors}, traversed origin → target
 * so the head sits at 0 and the tail on H.
 */
export function flipLFunctionVectorsOriginToTarget(
  fwd: LFunctionVectors,
  target: Point2,
): Point2[] {
  return reflectLFunctionVectors(fwd, target).vectors.slice().reverse();
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

// ---------------------------------------------------------------------------
// General Hurwitz machine — arbitrary periodic χ (mod q)
// L(s,χ) = q^{−s} Σ_{a=1}^{q} χ(a) ζ(s, a/q), χ(n) = χ(n mod q).
// ---------------------------------------------------------------------------

/** Residue-class coefficient χ(n mod q). */
export type HurwitzCoeff = { re: number; im: number };

export const HURWITZ_MACHINE_MIN_Q = 1;
export const HURWITZ_MACHINE_MAX_Q = 24;

/**
 * Clamps a typed modulus into the panel’s allowed range. Non-finite → 5.
 */
export function clampHurwitzModulus(q: number): number {
  if (!Number.isFinite(q)) return 5;
  return Math.max(HURWITZ_MACHINE_MIN_Q, Math.min(HURWITZ_MACHINE_MAX_Q, Math.round(q)));
}

/**
 * Default χ: Titchmarsh L₁ when q=5; otherwise χ(1)=1 and the rest 0.
 */
export function defaultHurwitzCoeffs(q: number): HurwitzCoeff[] {
  const modulus = clampHurwitzModulus(q);
  const coeffs: HurwitzCoeff[] = [];
  for (let r = 0; r < modulus; r++) coeffs.push({ re: 0, im: 0 });
  if (modulus === 5) {
    coeffs[1] = { re: 1, im: 0 };
    coeffs[2] = { re: 0, im: 1 };
    coeffs[3] = { re: 0, im: -1 };
    coeffs[4] = { re: -1, im: 0 };
    return coeffs;
  }
  if (modulus > 1) coeffs[1] = { re: 1, im: 0 };
  else coeffs[0] = { re: 1, im: 0 };
  return coeffs;
}

/**
 * Resize χ to a new modulus, keeping overlapping residues.
 */
export function resizeHurwitzCoeffs(prev: readonly HurwitzCoeff[], q: number): HurwitzCoeff[] {
  const modulus = clampHurwitzModulus(q);
  const next: HurwitzCoeff[] = [];
  for (let i = 0; i < modulus; i++) {
    const c = prev[i];
    next.push(c === undefined ? { re: 0, im: 0 } : { re: c.re, im: c.im });
  }
  return next;
}

/**
 * χ(n) from a residue table of length q. Empty table is identically 0.
 */
export function hurwitzCharCoeff(coeffs: readonly HurwitzCoeff[], n: number): HurwitzCoeff {
  const q = coeffs.length;
  if (q < 1) return { re: 0, im: 0 };
  const residue = ((n % q) + q) % q;
  return coeffs[residue] ?? { re: 0, im: 0 };
}

function isHurwitzZero(c: HurwitzCoeff): boolean {
  return c.re === 0 && c.im === 0;
}

/**
 * Analytic L(s,χ) via Hurwitz zeta for an arbitrary periodic χ.
 */
export function calculateHurwitzCharacterTarget(
  coeffs: readonly HurwitzCoeff[],
  s: Complex,
): Complex {
  const q = coeffs.length;
  if (q < 1) return complex(0, 0);
  const terms = hurwitzTermCount(s);
  let weighted = complex(0, 0);
  for (let a = 1; a <= q; a++) {
    const chi = hurwitzCharCoeff(coeffs, a);
    if (isHurwitzZero(chi)) continue;
    const hurwitz = calculateHurwitzZeta(s, a / q, terms);
    weighted = complexAdd(weighted, complexMul(chi, hurwitz));
  }
  return complexDiv(weighted, powRealToComplex(q, s));
}

/**
 * Per-residue summands of {@link calculateHurwitzCharacterTarget}:
 * index r is \(q^{-s}\zeta(s,a/q)\) with \(a=q\) when \(r=0\) and \(a=r\) otherwise.
 * Weighted by χ(r) they reconstruct L(s,χ) without recomputing Hurwitz zeta.
 */
export function hurwitzCharacterBasis(s: Complex, q: number): Complex[] {
  if (q < 1) return [];
  const terms = hurwitzTermCount(s);
  const qPowS = powRealToComplex(q, s);
  const basis: Complex[] = [];
  for (let r = 0; r < q; r++) {
    const a = r === 0 ? q : r;
    basis.push(complexDiv(calculateHurwitzZeta(s, a / q, terms), qPowS));
  }
  return basis;
}

/**
 * \(L(s,\chi)=\sum_r \chi(r)\,e_r\) for a basis from {@link hurwitzCharacterBasis}.
 */
export function combineHurwitzCharacterBasis(
  coeffs: readonly HurwitzCoeff[],
  basis: readonly Complex[],
): Complex {
  let re = 0;
  let im = 0;
  const n = Math.min(coeffs.length, basis.length);
  for (let r = 0; r < n; r++) {
    const chi = coeffs[r];
    const e = basis[r];
    if (chi === undefined || e === undefined) continue;
    re += chi.re * e.re - chi.im * e.im;
    im += chi.re * e.im + chi.im * e.re;
  }
  return complex(re, im);
}

function walkHurwitzCharacter(
  coeffs: readonly HurwitzCoeff[],
  numLinks: number,
  s: Complex,
  start: Point2,
  direction: 1 | -1,
): LFunctionVectors {
  const vectors: Point2[] = [{ x: start.x, y: start.y }];
  const phantomVectors: [Point2, Point2][] = [];
  let sumRe = start.x;
  let sumIm = start.y;
  const nStart = direction === 1 ? 1 : numLinks;
  const nEnd = direction === 1 ? numLinks : 1;
  const nStep = direction;

  for (let n = nStart; direction === 1 ? n <= nEnd : n >= nEnd; n += nStep) {
    const weight = hurwitzCharCoeff(coeffs, n);
    const { invRe, invIm } = nToNegS(n, s);
    const step = complexMul(weight, complex(invRe, invIm));
    if (isHurwitzZero(weight)) {
      phantomVectors.push([
        { x: sumRe, y: sumIm },
        { x: sumRe + direction * invRe, y: sumIm + direction * invIm },
      ]);
    } else {
      sumRe += direction * step.re;
      sumIm += direction * step.im;
      vectors.push({ x: sumRe, y: sumIm });
    }
  }

  return { vectors, phantomVectors };
}

/**
 * Forward χ-weighted n^{−s} walk. Zero coefficients become phantom segments.
 */
export function calculateHurwitzCharacterVectors(
  coeffs: readonly HurwitzCoeff[],
  numLinks: number,
  s: Complex,
): LFunctionVectors {
  return walkHurwitzCharacter(coeffs, numLinks, s, { x: 0, y: 0 }, 1);
}

function mapPointByComplex(p: Point2, factor: Complex): Point2 {
  const z = complexMul(complex(p.x, p.y), factor);
  return { x: z.re, y: z.im };
}

/**
 * Similarity that sends the last joint to `target`. Origin stays put.
 * Same role as Riemann χ(s) on the zeta inverse: one complex scale so
 * the inverse spiral and the analytic value share an endpoint.
 */
function pinWalkToTarget(walk: LFunctionVectors, target: Complex): LFunctionVectors {
  const last = walk.vectors.at(-1);
  if (last === undefined) return walk;
  const mag2 = last.x * last.x + last.y * last.y;
  if (!(mag2 > 1e-30) || !Number.isFinite(target.re) || !Number.isFinite(target.im)) {
    return walk;
  }
  const factor = complexDiv(target, complex(last.x, last.y));
  return {
    vectors: walk.vectors.map(p => mapPointByComplex(p, factor)),
    phantomVectors: walk.phantomVectors.map(([a, b]) => [
      mapPointByComplex(a, factor),
      mapPointByComplex(b, factor),
    ]),
  };
}

/**
 * Inverse-sum spiral for the same table: χ(n) n^{s−1} from the origin,
 * n = 1…N in forward order, then scaled so the last joint is analytic H.
 * Matches the zeta-tab inverse (χ(s)·Σ n^{s−1} → ζ) without reversing χ.
 */
export function calculateHurwitzCharacterInverseSumVectors(
  coeffs: readonly HurwitzCoeff[],
  numLinks: number,
  s: Complex,
): LFunctionVectors {
  const vectors: Point2[] = [{ x: 0, y: 0 }];
  const phantomVectors: [Point2, Point2][] = [];
  let sumRe = 0;
  let sumIm = 0;
  for (let n = 1; n <= numLinks; n++) {
    const weight = hurwitzCharCoeff(coeffs, n);
    const step = nToSMinus1(n, s);
    const scaled = complexMul(weight, complex(step.re, step.im));
    if (isHurwitzZero(weight)) {
      phantomVectors.push([
        { x: sumRe, y: sumIm },
        { x: sumRe + step.re, y: sumIm + step.im },
      ]);
    } else {
      sumRe += scaled.re;
      sumIm += scaled.im;
      vectors.push({ x: sumRe, y: sumIm });
    }
  }
  return pinWalkToTarget({ vectors, phantomVectors }, calculateHurwitzCharacterTarget(coeffs, s));
}

/**
 * Inverse χ walk. Tail sits on the analytic Hurwitz cross.
 */
export function calculateHurwitzCharacterInverseVectors(
  coeffs: readonly HurwitzCoeff[],
  numLinks: number,
  s: Complex,
  start: Point2,
): LFunctionVectors {
  return walkHurwitzCharacter(coeffs, numLinks, s, start, -1);
}

const HURWITZ_TOKEN_REAL = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;
const HURWITZ_TOKEN_IMAG = /^([+-]?)(?:(\d+\.?\d*|\.\d+))?i$/;
const HURWITZ_TOKEN_BOTH = /^([+-]?(?:\d+\.?\d*|\.\d+))([+-])(?:(\d+\.?\d*|\.\d+))?i$/;

/**
 * Parse one χ token: 0, 1, −1, i, −i, 2i, or a±bi.
 */
export function parseHurwitzCoeffToken(raw: string): HurwitzCoeff | null {
  const t = raw.replace(/\s/g, "").toLowerCase();
  if (t.length === 0) return null;
  if (HURWITZ_TOKEN_REAL.test(t)) return { re: Number(t), im: 0 };
  const imag = t.match(HURWITZ_TOKEN_IMAG);
  if (imag !== null) {
    const sign = imag[1] === "-" ? -1 : 1;
    const mag = imag[2] === undefined ? 1 : Number(imag[2]);
    if (!Number.isFinite(mag)) return null;
    return { re: 0, im: sign * mag };
  }
  const both = t.match(HURWITZ_TOKEN_BOTH);
  if (both === null) return null;
  const re = Number(both[1]);
  const imagMag = both[3] === undefined ? 1 : Number(both[3]);
  if (!Number.isFinite(re) || !Number.isFinite(imagMag)) return null;
  return { re, im: both[2] === "-" ? -imagMag : imagMag };
}

/**
 * Parse a comma-separated χ list (residues 0..q−1). Null if empty or any token fails.
 */
export function parseHurwitzCoeffList(text: string): HurwitzCoeff[] | null {
  const parts = text.split(",");
  const out: HurwitzCoeff[] = [];
  for (const part of parts) {
    const c = parseHurwitzCoeffToken(part);
    if (c === null) return null;
    out.push(c);
  }
  if (out.length < HURWITZ_MACHINE_MIN_Q || out.length > HURWITZ_MACHINE_MAX_Q) return null;
  return out;
}

/**
 * Format one coefficient for the paste field (0, 1, −1, i, −i, or a+bi).
 */
export function formatHurwitzCoeffToken(c: HurwitzCoeff): string {
  if (c.im === 0) return String(c.re);
  if (c.re === 0) {
    if (c.im === 1) return "i";
    if (c.im === -1) return "-i";
    return `${c.im}i`;
  }
  const imagAbs = Math.abs(c.im);
  const imagTok = imagAbs === 1 ? "i" : `${imagAbs}i`;
  return c.im < 0 ? `${c.re}-${imagTok}` : `${c.re}+${imagTok}`;
}

/**
 * Join residue coefficients for the paste field.
 */
export function formatHurwitzCoeffList(coeffs: readonly HurwitzCoeff[]): string {
  return coeffs.map(formatHurwitzCoeffToken).join(", ");
}

const HURWITZ_PRESETS: readonly HurwitzCoeff[] = [
  { re: 0, im: 0 },
  { re: 1, im: 0 },
  { re: -1, im: 0 },
  { re: 0, im: 1 },
  { re: 0, im: -1 },
];

/**
 * Cycle a residue through 0, 1, −1, i, −i. Custom values jump to 0.
 */
export function cycleHurwitzPreset(c: HurwitzCoeff): HurwitzCoeff {
  for (let i = 0; i < HURWITZ_PRESETS.length; i++) {
    const p = HURWITZ_PRESETS[i]!;
    if (p.re === c.re && p.im === c.im) {
      return HURWITZ_PRESETS[(i + 1) % HURWITZ_PRESETS.length]!;
    }
  }
  return HURWITZ_PRESETS[0]!;
}

/**
 * Label for a residue cycle button.
 */
export function hurwitzPresetLabel(c: HurwitzCoeff): string {
  for (const p of HURWITZ_PRESETS) {
    if (p.re === c.re && p.im === c.im) return formatHurwitzCoeffToken(p);
  }
  return formatHurwitzCoeffToken(c);
}

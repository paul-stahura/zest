import type { Point2 } from "@/shared/io/types";
import { complex, type Complex } from "@/shared/math/complex";
import {
  combineHurwitzCharacterBasis,
  formatHurwitzCoeffList,
  hurwitzCharacterBasis,
  type HurwitzCoeff,
} from "@/shared/math/lFunctionCalculator";
import { distanceToMidpointPerp } from "@/shared/math/hurwitzZetaPerp";
import { eulerMaclaurenZeta, indexToImag } from "@/shared/math/zetaEms";

/**
 * Period-`m` table: χ=1 off multiples of m, and χ(0)=1−ω√m.
 * Then H=ζ(1−ω m^{−s}), so |ω m^{−s}|=1 on σ=1/2 for any |ω|=1.
 */
export function midPerpProgressionCoeffs(m: number, omega: Complex): HurwitzCoeff[] {
  if (m < 2) return [];
  const scale = Math.sqrt(m);
  const c: HurwitzCoeff = {
    re: 1 - omega.re * scale,
    im: omega.im === 0 ? 0 : -omega.im * scale,
  };
  const coeffs: HurwitzCoeff[] = [c];
  for (let r = 1; r < m; r++) coeffs.push({ re: 1, im: 0 });
  return coeffs;
}

/**
 * Residue order last-to-first. The usual table is (1−ω√q, 1, …, 1);
 * the inverse walk is (1, …, 1, 1−ω√q).
 */
export function reverseHurwitzCoeffs(coeffs: readonly HurwitzCoeff[]): HurwitzCoeff[] {
  const out: HurwitzCoeff[] = [];
  for (let i = coeffs.length - 1; i >= 0; i--) {
    const c = coeffs[i];
    if (c === undefined) continue;
    out.push({ re: c.re, im: c.im });
  }
  return out;
}

/** Same residue alphabet as the Hurwitz-machine cycle buttons. */
export const HURWITZ_SEARCH_ALPHABET: readonly HurwitzCoeff[] = [
  { re: 0, im: 0 },
  { re: 1, im: 0 },
  { re: -1, im: 0 },
  { re: 0, im: 1 },
  { re: 0, im: -1 },
];

export type HurwitzMidPerpSample = {
  T: number;
  dist: number;
  drop: number;
  twiceZetaErr: number;
};

export type HurwitzMidPerpHit = {
  q: number;
  coeffs: HurwitzCoeff[];
  label: string;
  maxDist: number;
  minDrop: number;
  maxTwiceZetaErr: number;
  samples: HurwitzMidPerpSample[];
};

/**
 * Every length-`q` table with entries in {@link HURWITZ_SEARCH_ALPHABET}.
 */
export function eachHurwitzAlphabetTable(q: number): HurwitzCoeff[][] {
  if (q < 1) return [];
  const total = HURWITZ_SEARCH_ALPHABET.length ** q;
  const out: HurwitzCoeff[][] = [];
  for (let code = 0; code < total; code++) {
    out.push(decodeHurwitzAlphabetTable(code, q));
  }
  return out;
}

/**
 * Smallest d|q such that the table is the length-d prefix repeated. d=q means new.
 */
export function hurwitzTableMinimalPeriod(coeffs: readonly HurwitzCoeff[]): number {
  const q = coeffs.length;
  for (let d = 1; d < q; d++) {
    if (q % d !== 0) continue;
    let periodic = true;
    for (let i = 0; i < q; i++) {
      const a = coeffs[i];
      const b = coeffs[i % d];
      if (a === undefined || b === undefined || a.re !== b.re || a.im !== b.im) {
        periodic = false;
        break;
      }
    }
    if (periodic) return d;
  }
  return q;
}

/**
 * Residual of the midpoint-perp identity at one s, or null if H is degenerate.
 */
export function midpointPerpSample(zeta: Complex, hurwitz: Complex): HurwitzMidPerpSample | null {
  const H: Point2 = { x: hurwitz.re, y: hurwitz.im };
  const z: Point2 = { x: zeta.re, y: zeta.im };
  const dist = distanceToMidpointPerp(z, H);
  if (dist === null) return null;
  const midX = hurwitz.re / 2;
  const midY = hurwitz.im / 2;
  return {
    T: 0,
    dist,
    drop: Math.hypot(zeta.re - midX, zeta.im - midY),
    twiceZetaErr: Math.hypot(hurwitz.re - 2 * zeta.re, hurwitz.im - 2 * zeta.im),
  };
}

/**
 * Scan the 5-letter alphabet at σ=1/2. A hit must stay under `maxDist` at every
 * listed slider T. `primitiveOnly` drops period-lifts of a smaller q (not new).
 */
export function searchHurwitzMidPerpIdentity(options: {
  moduli: readonly number[];
  indexes: readonly number[];
  maxDist: number;
  primitiveOnly?: boolean;
}): HurwitzMidPerpHit[] {
  const primitiveOnly = options.primitiveOnly === true;
  const zetaByT = new Map<number, Complex>();
  for (const T of options.indexes) {
    const t = indexToImag(T, false);
    zetaByT.set(T, eulerMaclaurenZeta(complex(0.5, t)));
  }

  const hits: HurwitzMidPerpHit[] = [];
  const alphaLen = HURWITZ_SEARCH_ALPHABET.length;
  for (const q of options.moduli) {
    const bases = new Map<number, Complex[]>();
    for (const T of options.indexes) {
      bases.set(T, hurwitzCharacterBasis(complex(0.5, indexToImag(T, false)), q));
    }
    const screenT = options.indexes[0];
    const screenZeta = screenT === undefined ? undefined : zetaByT.get(screenT);
    const screenBasis = screenT === undefined ? undefined : bases.get(screenT);
    if (screenT === undefined || screenZeta === undefined || screenBasis === undefined) continue;

    const total = alphaLen ** q;
    for (let code = 0; code < total; code++) {
      const screened = combineAlphabetCode(code, q, screenBasis);
      const screenSample = midpointPerpSample(screenZeta, screened);
      if (screenSample === null || screenSample.dist > options.maxDist) continue;

      const coeffs = decodeHurwitzAlphabetTable(code, q);
      if (primitiveOnly && hurwitzTableMinimalPeriod(coeffs) !== q) continue;

      const samples: HurwitzMidPerpSample[] = [{ ...screenSample, T: screenT }];
      let failed = false;
      for (const T of options.indexes) {
        if (T === screenT) continue;
        const zeta = zetaByT.get(T);
        const basis = bases.get(T);
        if (zeta === undefined || basis === undefined) {
          failed = true;
          break;
        }
        const H = combineHurwitzCharacterBasis(coeffs, basis);
        const sample = midpointPerpSample(zeta, H);
        if (sample === null || sample.dist > options.maxDist) {
          failed = true;
          break;
        }
        samples.push({ ...sample, T });
      }
      if (failed || samples.length !== options.indexes.length) continue;
      hits.push({
        q,
        coeffs,
        label: formatHurwitzCoeffList(coeffs),
        maxDist: Math.max(...samples.map(s => s.dist)),
        minDrop: Math.min(...samples.map(s => s.drop)),
        maxTwiceZetaErr: Math.max(...samples.map(s => s.twiceZetaErr)),
        samples,
      });
    }
  }
  return hits;
}

/**
 * Same identity, but only tables within `maxDeviations` residues of a constant
 * fill. Used when 5^q cannot be enumerated (q>12).
 */
export function searchHurwitzMidPerpNearFills(options: {
  moduli: readonly number[];
  indexes: readonly number[];
  maxDist: number;
  maxDeviations: number;
  primitiveOnly?: boolean;
}): HurwitzMidPerpHit[] {
  const primitiveOnly = options.primitiveOnly === true;
  const zetaByT = new Map<number, Complex>();
  for (const T of options.indexes) {
    zetaByT.set(T, eulerMaclaurenZeta(complex(0.5, indexToImag(T, false))));
  }

  const hits: HurwitzMidPerpHit[] = [];
  for (const q of options.moduli) {
    const bases = new Map<number, Complex[]>();
    for (const T of options.indexes) {
      bases.set(T, hurwitzCharacterBasis(complex(0.5, indexToImag(T, false)), q));
    }
    const screenT = options.indexes[0];
    const screenZeta = screenT === undefined ? undefined : zetaByT.get(screenT);
    const screenBasis = screenT === undefined ? undefined : bases.get(screenT);
    if (screenT === undefined || screenZeta === undefined || screenBasis === undefined) continue;

    for (const fill of HURWITZ_SEARCH_ALPHABET) {
      const maxDev = Math.min(options.maxDeviations, q);
      for (let dev = 0; dev <= maxDev; dev++) {
        forEachIndexCombo(q, dev, positions => {
          const tupleTotal = HURWITZ_SEARCH_ALPHABET.length ** dev;
          for (let code = 0; code < tupleTotal; code++) {
            const screened = combineFilledCode(q, fill, positions, code, screenBasis);
            const screenSample = midpointPerpSample(screenZeta, screened);
            if (screenSample === null || screenSample.dist > options.maxDist) continue;
            const coeffs = filledTable(q, fill, positions, code);
            if (primitiveOnly && hurwitzTableMinimalPeriod(coeffs) !== q) continue;
            const hit = scoreTable(coeffs, q, options.indexes, options.maxDist, zetaByT, bases);
            if (hit !== null) hits.push(hit);
          }
        });
      }
    }
  }
  return hits;
}

function scoreTable(
  coeffs: HurwitzCoeff[],
  q: number,
  indexes: readonly number[],
  maxDist: number,
  zetaByT: Map<number, Complex>,
  bases: Map<number, Complex[]>,
): HurwitzMidPerpHit | null {
  const samples: HurwitzMidPerpSample[] = [];
  for (const T of indexes) {
    const zeta = zetaByT.get(T);
    const basis = bases.get(T);
    if (zeta === undefined || basis === undefined) return null;
    const H = combineHurwitzCharacterBasis(coeffs, basis);
    const sample = midpointPerpSample(zeta, H);
    if (sample === null || sample.dist > maxDist) return null;
    samples.push({ ...sample, T });
  }
  if (samples.length !== indexes.length) return null;
  return {
    q,
    coeffs,
    label: formatHurwitzCoeffList(coeffs),
    maxDist: Math.max(...samples.map(s => s.dist)),
    minDrop: Math.min(...samples.map(s => s.drop)),
    maxTwiceZetaErr: Math.max(...samples.map(s => s.twiceZetaErr)),
    samples,
  };
}

function combineFilledCode(
  q: number,
  fill: HurwitzCoeff,
  positions: readonly number[],
  code: number,
  basis: readonly Complex[],
): Complex {
  const chosen: HurwitzCoeff[] = [];
  let n = code;
  const alphaLen = HURWITZ_SEARCH_ALPHABET.length;
  for (let i = 0; i < positions.length; i++) {
    const chi = HURWITZ_SEARCH_ALPHABET[n % alphaLen];
    n = Math.floor(n / alphaLen);
    chosen.push(chi === undefined ? fill : { re: chi.re, im: chi.im });
  }
  let posK = 0;
  let re = 0;
  let im = 0;
  for (let r = 0; r < q; r++) {
    const e = basis[r];
    if (e === undefined) continue;
    const atDev = positions[posK] === r;
    const chi = atDev ? chosen[posK] : fill;
    if (atDev) posK += 1;
    if (chi === undefined) continue;
    re += chi.re * e.re - chi.im * e.im;
    im += chi.re * e.im + chi.im * e.re;
  }
  return complex(re, im);
}

function filledTable(
  q: number,
  fill: HurwitzCoeff,
  positions: readonly number[],
  code: number,
): HurwitzCoeff[] {
  const coeffs: HurwitzCoeff[] = [];
  for (let i = 0; i < q; i++) coeffs.push({ re: fill.re, im: fill.im });
  let n = code;
  const alphaLen = HURWITZ_SEARCH_ALPHABET.length;
  for (const pos of positions) {
    const chi = HURWITZ_SEARCH_ALPHABET[n % alphaLen];
    n = Math.floor(n / alphaLen);
    if (chi === undefined) continue;
    coeffs[pos] = { re: chi.re, im: chi.im };
  }
  return coeffs;
}

function forEachIndexCombo(q: number, choose: number, visit: (positions: number[]) => void): void {
  const pos: number[] = [];
  function walk(start: number, left: number): void {
    if (left === 0) {
      visit(pos);
      return;
    }
    for (let i = start; i <= q - left; i++) {
      pos.push(i);
      walk(i + 1, left - 1);
      pos.pop();
    }
  }
  walk(0, choose);
}

function combineAlphabetCode(code: number, q: number, basis: readonly Complex[]): Complex {
  let re = 0;
  let im = 0;
  let n = code;
  const alphaLen = HURWITZ_SEARCH_ALPHABET.length;
  for (let r = 0; r < q; r++) {
    const chi = HURWITZ_SEARCH_ALPHABET[n % alphaLen];
    const e = basis[r];
    n = Math.floor(n / alphaLen);
    if (chi === undefined || e === undefined) continue;
    re += chi.re * e.re - chi.im * e.im;
    im += chi.re * e.im + chi.im * e.re;
  }
  return complex(re, im);
}

function decodeHurwitzAlphabetTable(code: number, q: number): HurwitzCoeff[] {
  const coeffs: HurwitzCoeff[] = [];
  let n = code;
  for (let k = 0; k < q; k++) {
    const coeff = HURWITZ_SEARCH_ALPHABET[n % HURWITZ_SEARCH_ALPHABET.length];
    if (coeff === undefined) continue;
    coeffs.push({ re: coeff.re, im: coeff.im });
    n = Math.floor(n / HURWITZ_SEARCH_ALPHABET.length);
  }
  return coeffs;
}

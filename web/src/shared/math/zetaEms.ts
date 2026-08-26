import type { Point2 } from "@/shared/io/types";
import {
  complex,
  complexAdd,
  complexCos,
  complexDiv,
  complexExp,
  complexMul,
  complexNeg,
  complexPow,
  complexSin,
  complexSub,
  type Complex,
  complexAbs,
  powRealToComplex,
} from "@/shared/math/complex";

const MIN_N = 100;
const MAX_N = 1_000_000;
const TWO_PI = Math.PI * 2;
const SQRT_TWO_PI = Math.sqrt(TWO_PI);
const MAX_GAMMA = 450;

/** Bernoulli-weighted coefficients for the EMS tail (same as Unity `Zeta.b_coeff`). */
const B_COEFF: readonly number[] = [
  1.0,
  0.08333333333333333,
  -0.001388888888888889,
  3.306878306878307e-5,
  -8.267195767195767e-7,
  2.08767569878681e-8,
  -5.284190138687493e-10,
  1.3382536530684679e-11,
  -3.389680296322583e-13,
  8.586062056277845e-15,
  -2.174868698558062e-16,
  5.5090028283602296e-18,
  -1.3954464685812523e-19,
  3.5347070396294676e-21,
  -8.953517426660548e-23,
  2.267952452337683e-24,
  -5.744790668872202e-26,
  1.455172475614865e-27,
  -3.68599494066531e-29,
  9.336734257095045e-31,
];

/** Lanczos gamma coefficients (same as Unity `Zeta.g_coeff`). */
const G_COEFF: readonly number[] = [
  0.9999999999999971, 57.15623566586292, -59.59796035547549, 14.136097974741747, -0.4919138160976202,
  0.00003399464998481189, 0.000046523628927048576, -0.00009837447530487956, 0.0001580887032249125, -0.0002102644417241049,
  0.00021743961811521264, -0.0001643181065367639, 0.00008441822398385274, -0.00002619083840158141, 0.0000036899182659531627,
];

/**
 * Maps fractional spiral index to imaginary coordinate `t` (Unity `Zeta.IndexToImag`).
 */
export function indexToImag(index: number, usePolyImag: boolean): number {
  const n = index;
  if (usePolyImag) {
    return TWO_PI * (n * n + n + 1 / 6);
  }
  // ln(n+1) − ln(n) = ln(1 + 1/n). Computing it as a difference of two nearly-equal large
  // logs at high T is catastrophic cancellation — the denominator keeps only ~10 sig figs, so
  // t is good to only ~±0.5 and its rounding *ticks up and down* as the index micro-creeps
  // (seen as the header t= and the joint-angle dots twitching during animation). log1p is
  // accurate for small 1/n, so t is now full-precision and smooth.
  return ((n * 2 + 1) * Math.PI) / Math.log1p(1 / n);
}

/**
 * Inverse of indexToImag: given imaginary part t, return the index T such
 * that indexToImag(T, usePolyImag) ≈ t. For the polynomial variant this
 * is closed-form; for the log variant we Newton-iterate.
 */
export function imagToIndex(t: number, usePolyImag: boolean): number {
  if (t <= 0) return 0;
  if (usePolyImag) {
    // Solve 2π(T² + T + 1/6) = t  ⇒  T = (-1 + √(2t/π + 1/3)) / 2
    return (-1 + Math.sqrt(2 * t / Math.PI + 1 / 3)) / 2;
  }
  // Newton on f(T) = (2T+1)π / (ln(T+1) - ln(T)) - t
  let T = Math.max(1.0, Math.sqrt(Math.max(t, 1.0) / TWO_PI));   // leading-order seed
  for (let i = 0; i < 60; i += 1) {
    const d = Math.log(T + 1) - Math.log(T);
    const f = (2 * T + 1) * Math.PI / d - t;
    const dprime = 1 / (T + 1) - 1 / T;
    const fprime = (2 * Math.PI * d - (2 * T + 1) * Math.PI * dprime) / (d * d);
    if (fprime === 0) break;
    const step = f / fprime;
    T -= step;
    if (Math.abs(step) < 1e-13 * Math.max(1, T)) break;
  }
  return T;
}

/**
 * Spiral middle link index (Unity `Spiral.SpiralMiddleIndex` with spiral=0).
 */
export function spiralMiddleIndex(index: number, spiral: number): number {
  const i = (2 * index * (index + 1)) / (2 * spiral + 1) + 1 / (3 * (2 * spiral + 1)) - 1;
  return i;
}

function pochhammer(s: Complex, n: number): Complex {
  let pochVal = complex(1, 0);
  for (let i = 0; i < n; i += 1) {
    pochVal = complexMul(pochVal, complexAdd(s, complex(i, 0)));
  }
  return pochVal;
}

function complexGamma(s: Complex): Complex {
  let g = complex(G_COEFF[0] ?? 1, 0);
  if (s.re < 0.5) {
    if (s.re === Math.floor(s.re) && s.im === 0) {
      return complex(Number.POSITIVE_INFINITY, 0);
    }
    const piS = complexMul(complex(Math.PI, 0), s);
    const denom = complexMul(complexSin(piS), complexGamma(complexSub(complex(1, 0), s)));
    return complexDiv(complex(Math.PI, 0), denom);
  }

  const sAdj = complexSub(s, complex(1, 0));
  for (let i = 1; i < 15; i += 1) {
    const gc = G_COEFF[i];
    if (gc === undefined) {
      break;
    }
    g = complexAdd(g, complexDiv(complex(gc, 0), complexAdd(sAdj, complex(i, 0))));
  }
  const shift = complexAdd(sAdj, complex(5.2421875, 0));
  const powPart = complexPow(shift, complexAdd(sAdj, complex(0.5, 0)));
  const expPart = complexExp(complexSub(complex(-5.2421875, 0), sAdj));
  return complexMul(g, complexMul(complex(SQRT_TWO_PI, 0), complexMul(powPart, expPart)));
}

function ems(s: Complex): Complex {
  let n = Math.trunc(complexAbs(s));
  if (n > MAX_N) {
    n = MAX_N;
  }
  if (n < MIN_N) {
    n = MIN_N;
  }

  let z = complex(0, 0);
  for (let k = 1; k < n; k += 1) {
    z = complexAdd(z, powRealToComplex(k, complexNeg(s)));
  }

  z = complexAdd(
    z,
    complexDiv(powRealToComplex(n, complexSub(complex(1, 0), s)), complexSub(s, complex(1, 0))),
  );
  z = complexAdd(z, complexMul(complex(0.5, 0), powRealToComplex(n, complexNeg(s))));

  let tail = complex(0, 0);
  let prevTail = complex(0, 0);
  for (let k = 1; k < 20; k += 1) {
    const coeff = B_COEFF[k];
    if (coeff === undefined) {
      break;
    }
    const term = complexMul(
      complexMul(complex(coeff, 0), pochhammer(s, 2 * k - 1)),
      powRealToComplex(n, complexSub(complexSub(complex(1, 0), s), complex(2 * k, 0))),
    );
    tail = complexAdd(tail, term);
    if (tail.re === prevTail.re && tail.im === prevTail.im) {
      break;
    }
    prevTail = tail;
  }

  return complexAdd(z, tail);
}

/**
 * Euler–Maclaurin ζ(s) approximation (Unity `Zeta.EulerMaclauren`).
 */
export function eulerMaclaurenZeta(s: Complex): Complex {
  if (s.re < 0) {
    if (Math.abs(s.im) < MAX_GAMMA) {
      const s1 = complexSub(complex(1, 0), s);
      const g = complexGamma(s1);
      const z0 = ems(s1);
      const powPart = powRealToComplex(TWO_PI, complexNeg(s1));
      const cosPart = complexCos(complexMul(complex(Math.PI / 2, 0), s1));
      return complexMul(z0, complexMul(complexMul(g, complex(2, 0)), complexMul(powPart, cosPart)));
    }
    return ems(s);
  }
  return ems(s);
}

export type ZetaDrawMode = "all" | "upToSum1" | "upToSum1Vector" | "bisectorLink" | "lastSpiral" | "lastLink";
export type ZetaMethod = "ems" | "zak";

export type ZetaSpiralGeometry = {
  joints: Point2[];
  zeta: Point2;
  middleIndex: number;
  middlePoint: Point2 | null;
  imaginary: number;
  numLinks: number;
};

export type EmsSpiralParams = {
  sigma: number;
  index: number;
  usePolyImag: boolean;
  extendSpiralCount: number;
};

/**
 * Builds partial-sum joints and the EMS ζ endpoint (Unity `Spiral.UpdateEulerMaclauren`).
 */
export function computeEmsSpiralGeometry(params: EmsSpiralParams): ZetaSpiralGeometry {
  const { sigma, index, usePolyImag, extendSpiralCount } = params;
  const imaginary = indexToImag(index, usePolyImag);
  const middleIndex = Math.trunc(index);
  const numLinks = Math.floor(spiralMiddleIndex(index, 0)) + 2 + extendSpiralCount;

  const s = complex(sigma, imaginary);
  const zetaC = eulerMaclaurenZeta(s);
  const zeta: Point2 = { x: zetaC.re, y: zetaC.im };

  const joints: Point2[] = [];
  let startX = 0;
  let startY = 0;
  joints.push({ x: startX, y: startY });

  let middlePoint: Point2 | null = null;

  for (let i = 1; i < numLinks; i += 1) {
    const x = Math.cos(imaginary * Math.log(i)) / Math.pow(i, sigma);
    const y = (-Math.sin(imaginary * Math.log(i))) / Math.pow(i, sigma);
    const endX = startX + x;
    const endY = startY + y;
    joints.push({ x: endX, y: endY });

    if (i === middleIndex + 1) {
      middlePoint = {
        x: startX + (endX - startX) / 2,
        y: startY + (endY - startY) / 2,
      };
    }

    startX = endX;
    startY = endY;
  }

  return {
    joints,
    zeta,
    middleIndex,
    middlePoint,
    imaginary,
    numLinks,
  };
}

/** Mirrors all joints about a midpoint: reflected[i] = 2·mid − joint[i] (Unity `CalcForwardReflected`). */
export function reflectJoints(joints: Point2[], midpoint: Point2): Point2[] {
  return joints.map(j => ({ x: 2 * midpoint.x - j.x, y: 2 * midpoint.y - j.y }));
}

/** Mirrors joints relative to the ζ endpoint across the ζ direction (Unity `DrawReverseSpiral`). */
export function reverseJoints(joints: Point2[], zeta: Point2): Point2[] {
  const len = Math.sqrt(zeta.x * zeta.x + zeta.y * zeta.y);
  if (len < 1e-12) return joints.map(j => ({ ...j }));
  const nx = zeta.x / len;
  const ny = zeta.y / len;
  return joints.map(j => {
    const rx = j.x - zeta.x;
    const ry = j.y - zeta.y;
    const dot = rx * nx + ry * ny;
    return { x: zeta.x + rx - 2 * dot * nx, y: zeta.y + ry - 2 * dot * ny };
  });
}

/**
 * Filters joint polyline points for the first-pass drawing modes (Unity "Links to Draw" subset).
 */
export function filterJointsForDrawMode(
  joints: Point2[],
  drawMode: ZetaDrawMode,
  middleIndex: number,
): Point2[] {
  if (joints.length === 0) return [];
  if (drawMode === "all") return joints;
  if (drawMode === "upToSum1") {
    const end = Math.min(joints.length - 1, middleIndex);
    return joints.slice(0, end + 1);
  }
  if (drawMode === "upToSum1Vector") {
    const a = joints[0];
    const b = joints[Math.min(middleIndex, joints.length - 1)];
    if (a === undefined || b === undefined) return [];
    return [a, b];
  }
  if (drawMode === "bisectorLink") {
    const end = Math.min(joints.length - 1, middleIndex + 1);
    return joints.slice(0, end + 1);
  }
  if (drawMode === "lastSpiral") {
    const startIdx = Math.max(0, middleIndex * middleIndex - 1);
    return joints.slice(startIdx);
  }
  if (drawMode === "lastLink") {
    if (joints.length < 2) return [];
    const a = joints[joints.length - 2];
    const b = joints[joints.length - 1];
    if (a === undefined || b === undefined) return [];
    return [a, b];
  }
  return joints;
}

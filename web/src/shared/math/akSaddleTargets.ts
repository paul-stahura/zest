import {
  complex,
  complexAdd,
  complexCos,
  complexDiv,
  complexExp,
  complexLog,
  complexMul,
  type Complex,
} from "@/shared/math/complex";

/**
 * Three-saddle terms of the AK model, as Argand values at the current s.
 *
 * The strip index is the paper's \(N = \lfloor \sqrt{t/(2\pi)} \rfloor\), and
 * \(M = N + 1/2\). That \(M\) is about \(T + 1/2\), so it is not \(\lfloor T \rfloor\).
 */
export type AkSaddleTerms = {
  /** Strip index \(N = \lfloor \sqrt{t/(2\pi)} \rfloor\). */
  readonly n: number;
  /** \(M = N + 1/2\). */
  readonly m: number;
  /** Scaled coordinate \(y = -is/(2\pi M) - M\). */
  readonly y: Complex;
  readonly g0: Complex;
  readonly q0: Complex;
  readonly q1: Complex;
  readonly q2: Complex;
  readonly q3: Complex;
  readonly q4: Complex;
  /** \(G_0 + Q_0 + Q_1 + Q_2\), the three-saddle model. Later saddles stay separate. */
  readonly sum: Complex;
};

/**
 * Strip index for imaginary height \(t\). The half-open strip \(S_N\) is
 * \(2\pi N^2 \le t < 2\pi(N+1)^2\).
 */
export function stripIndex(t: number): number {
  if (!(t > 0) || !Number.isFinite(t)) return 0;
  // The exact edge t = 2π(N+1)² is the next strip. A hair under an integer
  // from rounding would fall into the strip below, so nudge before the floor.
  return Math.floor(Math.sqrt(t / (2 * Math.PI)) + 1e-12);
}

/** Principal square root. Positive on the positive real axis, matching y = −1. */
function complexSqrt(z: Complex): Complex {
  if (z.re === 0 && z.im === 0) return complex(0, 0);
  return complexExp(complexMul(complex(0.5, 0), complexLog(z)));
}

/**
 * Endpoint term \(G_0(y)\). Poles at half-integer y are not zeros.
 */
export function calcG0(y: Complex): Complex {
  const ratio = complexDiv(
    complexCos(complexMul(y, complex(Math.PI / 2, 0))),
    complexCos(complexMul(y, complex(Math.PI, 0))),
  );
  const y2 = complexMul(y, y);
  const phaseArg = complexAdd(complexMul(y2, complex(4, 0)), complex(1, 0));
  const phase = complexMul(complex(0, -Math.PI / 8), phaseArg);
  return complexMul(complex(-1 / Math.SQRT2, 0), complexMul(ratio, complexExp(phase)));
}

/**
 * Saddle location \(r_m(y)\). The square root is principal, positive at y = −1.
 */
export function saddleRadius(y: Complex, mIndex: number, height: number): Complex {
  const disc = complexAdd(
    complex((2 * mIndex - 1) * (2 * mIndex - 1), 0),
    complexMul(complex(-16 * height, 0), complexAdd(y, complex(-mIndex + 0.5, 0))),
  );
  return complexMul(
    complexAdd(complex(1 - 2 * mIndex, 0), complexSqrt(disc)),
    complex(0.25, 0),
  );
}

/**
 * Poisson saddle contribution \(Q_m(y)\) at height \(M = N + 1/2\).
 *
 * The square root of the curvature is the principal branch, positive at y = −1.
 */
export function calcQm(y: Complex, mIndex: number, height: number): Complex {
  const radius = saddleRadius(y, mIndex, height);
  const heightGap = complexAdd(complex(height, 0), complexMul(radius, complex(-1, 0)));
  const curvature = complexDiv(
    complexAdd(complexMul(radius, complex(4, 0)), complex(2 * mIndex - 1, 0)),
    complexMul(heightGap, complex(2, 0)),
  );
  const logArg = complexDiv(complex(height, 0), heightGap);
  const my = complexAdd(complex(height, 0), y);
  const phase = complexAdd(
    complexMul(complexMul(complex(height, 0), my), complexLog(logArg)),
    complexAdd(
      complexMul(radius, complex(-height, 0)),
      complexAdd(
        complexMul(complexMul(radius, radius), complex(-0.5, 0)),
        complexAdd(complexMul(radius, complex(0.5, 0)), complex(-0.25, 0)),
      ),
    ),
  );
  const action = complexAdd(phase, complexMul(radius, complex(-mIndex, 0)));
  const oscillation = complexExp(complexMul(complex(0, 2 * Math.PI), action));
  const sign = (mIndex % 2 === 0) ? -1 : 1;
  return complexMul(complex(sign, 0), complexDiv(oscillation, complexSqrt(curvature)));
}

/**
 * Canonical running sum of \(\exp(i s^2)\), from a large negative limit up to
 * its converged end. Every saddle's chirp is this curve times a complex scale.
 */
function fresnelChirp(): { readonly pts: readonly Complex[]; readonly end: Complex } {
  const limit = 16;
  const ds = 0.02;
  const steps = Math.round((2 * limit) / ds);
  const pts: Complex[] = [complex(0, 0)];
  let re = 0;
  let im = 0;
  for (let k = 0; k <= steps; k += 1) {
    const s = -limit + k * ds;
    const phase = s * s;
    re += Math.cos(phase) * ds;
    im += Math.sin(phase) * ds;
    pts.push(complex(re, im));
  }
  return { pts, end: complex(re, im) };
}

let chirpCache: { readonly pts: readonly Complex[]; readonly end: Complex } | null = null;

/**
 * Chirp-sum spiral that starts at the origin and ends at `tip`.
 *
 * The shape is the Fresnel integral of \(\exp(i s^2)\). Scaling by
 * `tip` over that integral's converged value sends the end to one saddle's
 * \(Q_m\), which is the closed form of the same integral.
 */
export function chirpSumSpiral(tip: Complex): Complex[] {
  if (!Number.isFinite(tip.re) || !Number.isFinite(tip.im)) return [];
  if (chirpCache === null) chirpCache = fresnelChirp();
  const end = chirpCache.end;
  const denom = end.re * end.re + end.im * end.im;
  if (denom === 0) return [];
  const scaleRe = (tip.re * end.re + tip.im * end.im) / denom;
  const scaleIm = (tip.im * end.re - tip.re * end.im) / denom;
  return chirpCache.pts.map((p) => complex(
    scaleRe * p.re - scaleIm * p.im,
    scaleRe * p.im + scaleIm * p.re,
  ));
}

/**
 * \(G_0\), the saddles \(Q_0\) through \(Q_4\), and the three-saddle sum \(G_0+Q_0+Q_1+Q_2\).
 *
 * \(t\) is \(\operatorname{Im} s\), already converted from the spiral index.
 */
export function calcAkSaddleTerms(sigma: number, t: number): AkSaddleTerms {
  const n = stripIndex(t);
  const height = n + 0.5;
  const y = complex(t / (2 * Math.PI * height) - height, -sigma / (2 * Math.PI * height));
  const g0 = calcG0(y);
  const q0 = calcQm(y, 0, height);
  const q1 = calcQm(y, 1, height);
  const q2 = calcQm(y, 2, height);
  const q3 = calcQm(y, 3, height);
  const q4 = calcQm(y, 4, height);
  const sum = complexAdd(g0, complexAdd(q0, complexAdd(q1, q2)));
  return { n, m: height, y, g0, q0, q1, q2, q3, q4, sum };
}

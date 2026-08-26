/**
 * Minimal complex arithmetic for the browser-side Zeta EMS port.
 */
export type Complex = {
  readonly re: number;
  readonly im: number;
};

/**
 * Constructs a complex number from real and imaginary parts.
 */
export function complex(re: number, im: number): Complex {
  return { re, im };
}

/**
 * Returns the Euclidean magnitude of a complex number.
 */
export function complexAbs(z: Complex): number {
  return Math.hypot(z.re, z.im);
}

/**
 * Principal argument in (-π, π].
 */
export function complexArg(z: Complex): number {
  return Math.atan2(z.im, z.re);
}

/**
 * Natural logarithm using the principal branch.
 */
export function complexLog(z: Complex): Complex {
  return { re: Math.log(complexAbs(z)), im: complexArg(z) };
}

/**
 * Complex exponential.
 */
export function complexExp(z: Complex): Complex {
  const scale = Math.exp(z.re);
  return { re: scale * Math.cos(z.im), im: scale * Math.sin(z.im) };
}

/**
 * Complex addition.
 */
export function complexAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

/**
 * Complex subtraction.
 */
export function complexSub(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im };
}

/**
 * Complex multiplication.
 */
export function complexMul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

/**
 * Complex division (guards against division by zero).
 */
export function complexDiv(a: Complex, b: Complex): Complex {
  const denom = b.re * b.re + b.im * b.im;
  if (denom === 0) {
    return { re: Number.NaN, im: Number.NaN };
  }
  return {
    re: (a.re * b.re + a.im * b.im) / denom,
    im: (a.im * b.re - a.re * b.im) / denom,
  };
}

/**
 * Negates a complex number.
 */
export function complexNeg(z: Complex): Complex {
  return { re: -z.re, im: -z.im };
}

/**
 * Raises a positive real base to a complex exponent (matches `Complex.Pow(double, Complex)` usage in Unity).
 */
export function powRealToComplex(base: number, exponent: Complex): Complex {
  if (!(base > 0) || !Number.isFinite(base)) {
    return { re: Number.NaN, im: Number.NaN };
  }
  const ln = Math.log(base);
  return complexExp({ re: exponent.re * ln, im: exponent.im * ln });
}

/**
 * General complex power using principal log (adequate for the EMS summation paths).
 */
export function complexPow(a: Complex, b: Complex): Complex {
  return complexExp(complexMul(complexLog(a), b));
}

/**
 * Complex cosine via exponentials.
 */
export function complexCos(z: Complex): Complex {
  const iz = complexMul(complex(0, 1), z);
  const expIz = complexExp(iz);
  const expNegIz = complexExp(complexNeg(iz));
  return complexDiv(complexAdd(expIz, expNegIz), complex(2, 0));
}

/**
 * Complex sine via exponentials.
 */
export function complexSin(z: Complex): Complex {
  const iz = complexMul(complex(0, 1), z);
  const expIz = complexExp(iz);
  const expNegIz = complexExp(complexNeg(iz));
  return complexDiv(complexSub(expIz, expNegIz), complex(0, 2));
}

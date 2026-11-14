import type { Xoshiro256ss } from "./xoshiro256ss";

/**
 * Sample one variate from the symmetric Beta distribution `Beta(α, α)`.
 *
 * Uses Cheng's BB algorithm (1978, "Generating beta variates with nonintegral
 * shape parameters", Comm. ACM 21(4):317–322) which is rejection-sampling
 * with a bounded expected number of iterations.
 *
 * For `α === 1` this is identical to a uniform on `(0, 1)`. For `α > 1` it
 * concentrates around `0.5` (the bell-shape used by the scan line to
 * over-sample the middle of each integer-T period).
 *
 * @param rng — any source of uniforms in `[0, 1)`.
 * @param alpha — strictly positive; both shape parameters share this value.
 * @throws if `alpha <= 0`.
 */
export function betaSymmetric(rng: Xoshiro256ss, alpha: number): number {
  if (!(alpha > 0)) {
    throw new Error("betaSymmetric requires alpha > 0");
  }
  if (alpha === 1) return rng.next();

  const a = alpha;
  const b = alpha;
  const A = a + b;
  const B =
    Math.min(a, b) <= 1
      ? Math.max(1 / a, 1 / b)
      : Math.sqrt((A - 2) / (2 * a * b - A));
  const C = a + 1 / B;

  for (;;) {
    const u1 = rng.next();
    const u2 = rng.next();
    const V = B * Math.log(u1 / (1 - u1));
    const W = a * Math.exp(V);
    const lhs = A * Math.log(A / (b + W)) + C * V - 1.3862944;
    const t = Math.log(u1 * u1 * u2);
    if (lhs >= t) {
      return W / (b + W);
    }
  }
}

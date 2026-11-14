/**
 * Seedable xoshiro256** PRNG. State is 256 bits stored as four 64-bit
 * `bigint`s. Output is uniform doubles in `[0, 1)`.
 *
 * Reference: <https://prng.di.unimi.it/xoshiro256starstar.c>.
 *
 * Used as the substrate for the Beta sampler that drives the zeros-of-f scan
 * line algorithm. Reproducible across runs and across backends (browser
 * worker, Go, cloud) given the same seed.
 */
export class Xoshiro256ss {
  private s0: bigint;
  private s1: bigint;
  private s2: bigint;
  private s3: bigint;

  /**
   * Construct from a 64-bit seed. State is expanded via splitmix64 so single
   * small seeds (e.g. `1`) still give a high-entropy initial state.
   */
  public constructor(seed: number | bigint) {
    let z = BigInt.asUintN(64, BigInt(seed));
    const splitmix = (): bigint => {
      z = BigInt.asUintN(64, z + 0x9e3779b97f4a7c15n);
      let r = BigInt.asUintN(64, (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n);
      r = BigInt.asUintN(64, (r ^ (r >> 27n)) * 0x94d049bb133111ebn);
      return r ^ (r >> 31n);
    };
    this.s0 = splitmix();
    this.s1 = splitmix();
    this.s2 = splitmix();
    this.s3 = splitmix();
  }

  /** Uniform double in `[0, 1)`. */
  public next(): number {
    const result = this.rotl(BigInt.asUintN(64, this.s1 * 5n), 7n) * 9n;
    const out = BigInt.asUintN(64, result);

    const t = BigInt.asUintN(64, this.s1 << 17n);
    this.s2 ^= this.s0;
    this.s3 ^= this.s1;
    this.s1 ^= this.s2;
    this.s0 ^= this.s3;
    this.s2 ^= t;
    this.s3 = this.rotl(this.s3, 45n);

    // eslint-disable-next-line no-restricted-syntax -- Number(bigint) is well-defined and required to bridge BigInt arithmetic to a JS double.
    const u53 = Number(out >> 11n);
    return u53 / 2 ** 53;
  }

  private rotl(x: bigint, k: bigint): bigint {
    return BigInt.asUintN(64, (x << k) | (x >> (64n - k)));
  }
}

/**
 * Combine a top-level seed with an integer subseed into a fresh 64-bit value.
 * Used so each σ-row in a multi-worker scan gets its own deterministic stream
 * derived from the user-supplied scan seed.
 */
export function combineSeeds(seed: number, subseed: number): number {
  // splitmix64 single round on (seed + subseed * golden_gamma).
  let z = BigInt.asUintN(64, BigInt(seed) + BigInt(subseed) * 0x9e3779b97f4a7c15n);
  z = BigInt.asUintN(64, (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n);
  z = BigInt.asUintN(64, (z ^ (z >> 27n)) * 0x94d049bb133111ebn);
  z = BigInt.asUintN(64, z ^ (z >> 31n));
  // Wrap into a JS-safe integer for the public API.
  // eslint-disable-next-line no-restricted-syntax -- Number(bigint) on a 53-bit-masked value is exact.
  return Number(z & 0x1fffffffffffffn);
}

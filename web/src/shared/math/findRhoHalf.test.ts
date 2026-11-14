import { calcB1Star, calcZetaLogDeriv } from "@/shared/math/b1Star";
import { complexAbs } from "@/shared/math/complex";
import { findNextRhoHalfImag, findNextRhoHalfIndex } from "@/shared/math/findRhoHalf";
import { indexToImag } from "@/shared/math/zetaEms";

describe("findNextRhoHalfImag", () => {
  it("finds a later height where Im(ζ′/ζ) vanishes and |ζ| is not small", () => {
    const t = findNextRhoHalfImag(8, 1, 40);
    expect(t).not.toBeNull();
    const root = t ?? 0;
    expect(root).toBeGreaterThan(8);
    const zlog = calcZetaLogDeriv(0.5, root);
    const { zeta } = calcB1Star(0.5, root);
    expect(Math.abs(zlog.im)).toBeLessThan(1e-3);
    expect(complexAbs(zeta)).toBeGreaterThan(0.05);
  });

  it("does not land on the first zeta zero", () => {
    const t = findNextRhoHalfImag(8, 1, 40);
    expect(t).not.toBeNull();
    expect(Math.abs((t ?? 0) - 14.134725)).toBeGreaterThan(0.5);
  });

  it("steps to a later root from just after the first one", () => {
    const first = findNextRhoHalfImag(8, 1, 40);
    expect(first).not.toBeNull();
    const second = findNextRhoHalfImag((first ?? 0) + 0.02, 1, 80);
    expect(second).not.toBeNull();
    expect((second ?? 0) - (first ?? 0)).toBeGreaterThan(1);
    const zlog = calcZetaLogDeriv(0.5, second ?? 0);
    expect(Math.abs(zlog.im)).toBeLessThan(1e-3);
  });
});

describe("findNextRhoHalfIndex", () => {
  it("returns a T whose t matches the imag-part search", () => {
    const T = findNextRhoHalfIndex(0.5, 1, false);
    expect(T).not.toBeNull();
    const tFromT = indexToImag(T ?? 0, false);
    const tDirect = findNextRhoHalfImag(indexToImag(0.5, false), 1, 40);
    expect(tDirect).not.toBeNull();
    expect(Math.abs(tFromT - (tDirect ?? 0))).toBeLessThan(0.05);
  });
});

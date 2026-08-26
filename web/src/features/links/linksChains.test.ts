import { describe, expect, it } from "vitest";

import {
  crossingLink,
  crossingScale,
  namedCrossingLink,
  forwardChain,
  lastSpiralLink,
  mirrorCutParameter,
  inverseChain,
  reflectedInverseChain,
  segmentCrossing,
  spanLinkRange,
  jointsForLinkRange,
} from "@/features/links/linksChains";
import { computeInverseSpiralGeometry } from "@/shared/math/spiralVariants";
import { computeZakSpiralGeometry } from "@/shared/math/zakCalculator";
import { calcInverseSum } from "@/shared/math/sumRemainders";
import { indexToImag } from "@/shared/math/zetaEms";

describe("forwardChain", () => {
  it("matches the zak partial sums up to the bisector", () => {
    const sigma = 0.5;
    const index = 6.18;
    const m = Math.floor(index);
    const zak = computeZakSpiralGeometry(sigma, index);
    const fwd = forwardChain(sigma, index, false, 100_000);
    for (let k = 0; k <= m; k++) {
      expect(fwd.joints[k]!.x).toBeCloseTo(zak.joints[k]!.x, 12);
      expect(fwd.joints[k]!.y).toBeCloseTo(zak.joints[k]!.y, 12);
    }
  });

  it("runs to the end of the first spiral turn unless capped", () => {
    const fwd = forwardChain(0.5, 6.18, false, 100_000);
    expect(fwd.lastLink).toBe(lastSpiralLink(6.18));
    expect(fwd.joints.length).toBe(fwd.lastLink + 1);

    const capped = forwardChain(0.5, 40, false, 25);
    expect(capped.lastLink).toBe(25);
    expect(capped.lastAvailableLink).toBeGreaterThan(25);
  });
});

describe("reflectedInverseChain", () => {
  it("matches the shared inverse spiral reflected through zeta/2", () => {
    const sigma = 0.5;
    const index = 6.18;
    const zak = computeZakSpiralGeometry(sigma, index);
    const inv = computeInverseSpiralGeometry(sigma, index, false).joints;
    const chain = reflectedInverseChain(sigma, index, false, zak.zeta, 100_000);
    for (let k = 0; k < Math.min(inv.length, chain.joints.length); k++) {
      expect(chain.joints[k]!.x).toBeCloseTo(zak.zeta.x - inv[k]!.x, 10);
      expect(chain.joints[k]!.y).toBeCloseTo(zak.zeta.y - inv[k]!.y, 10);
    }
  });

  it("starts at zeta and passes through Σ₁+R at the bisector joint", () => {
    const sigma = 0.5;
    const index = 6.18;
    const m = Math.floor(index);
    const zak = computeZakSpiralGeometry(sigma, index);
    const chain = reflectedInverseChain(sigma, index, false, zak.zeta, 100_000);
    expect(chain.joints[0]!.x).toBeCloseTo(zak.zeta.x, 12);
    expect(chain.joints[0]!.y).toBeCloseTo(zak.zeta.y, 12);
    // ζ − Σ₂ = Σ₁ + R, which the zak chain holds at joint m+1.
    expect(chain.joints[m]!.x).toBeCloseTo(zak.joints[m + 1]!.x, 9);
    expect(chain.joints[m]!.y).toBeCloseTo(zak.joints[m + 1]!.y, 9);
  });
});

describe("inverseChain", () => {
  it("matches χ Σ n^{s−1} up to the bisector at any σ", () => {
    for (const sigma of [0.3, 0.5, 0.7]) {
      const index = 6.18;
      const m = Math.floor(index);
      const chain = inverseChain(sigma, index, false, 100_000);
      const s2 = calcInverseSum(sigma, index);
      expect(chain.joints[m]!.x).toBeCloseTo(s2.re, 10);
      expect(chain.joints[m]!.y).toBeCloseTo(s2.im, 10);
    }
  });
});

describe("segmentCrossing", () => {
  it("finds the point and the fraction along each segment", () => {
    const hit = segmentCrossing({ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 1, y: -1 }, { x: 1, y: 3 });
    expect(hit?.at).toEqual({ x: 1, y: 0 });
    expect(hit?.p).toBeCloseTo(0.25, 12);
    expect(hit?.q).toBeCloseTo(0.25, 12);
  });

  it("misses when the segments are parallel or fall short of each other", () => {
    expect(segmentCrossing({ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 1 }, { x: 4, y: 1 })).toBeNull();
    expect(segmentCrossing({ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 9, y: -1 }, { x: 9, y: 1 })).toBeNull();
  });
});

describe("mirrorCutParameter", () => {
  it("meets the mirror line inside the bisector link at the crossing fraction ⌈T⌉^σ d₁", () => {
    const sigma = 0.5;
    const index = 6.18;
    const zak = computeZakSpiralGeometry(sigma, index);
    const fwd = forwardChain(sigma, index, false, 100);
    // The paper's running example: r* = m + hat d₁ = 6 + 0.2314970.
    expect(mirrorCutParameter(sigma, index, false, zak.zeta, fwd.joints, 6)).toBeCloseTo(6.2314970, 6);
  });

  it("keeps the crossing fraction between a fifth and four fifths of the way along, at every T", () => {
    for (let m = 3; m <= 20; m++) {
      for (let f = 1 / 32; f < 1; f += 1 / 32) {
        const index = m + f;
        const zak = computeZakSpiralGeometry(0.5, index);
        const fwd = forwardChain(0.5, index, false, 200);
        const rStar = mirrorCutParameter(0.5, index, false, zak.zeta, fwd.joints, m);
        expect(rStar).not.toBeNull();
        expect(rStar! - m).toBeGreaterThan(0.2);
        expect(rStar! - m).toBeLessThan(0.8);
      }
    }
  });
});

describe("crossingScale", () => {
  it("is I(T)/2π, whose square root is the self-dual link near T + ½", () => {
    const index = 6.18;
    expect(crossingScale(index, false)).toBeCloseTo(indexToImag(index, false) / (2 * Math.PI), 12);
    expect(Math.sqrt(crossingScale(index, false))).toBeCloseTo(index + 0.5, 1);
  });
});

describe("namedCrossingLink", () => {
  it("is the nearest integer of a²/(k+1), counted from zero", () => {
    const scale = crossingScale(6.18, false);
    expect([0, 1, 2, 3, 4, 5, 6].map((k) => namedCrossingLink(scale, k))).toEqual([
      44, 21, 14, 10, 8, 6, 5,
    ]);
  });
});

describe("crossingLink", () => {
  const sigma = 0.5;
  const index = 6.18;
  const m = Math.floor(index);
  const zak = computeZakSpiralGeometry(sigma, index);
  const fwd = forwardChain(sigma, index, false, 100_000);
  const inv = reflectedInverseChain(sigma, index, false, zak.zeta, 100_000);
  const scale = crossingScale(index, false);

  it("pairs the links whose 1-based numbers multiply to a² = I(T)/2π", () => {
    // a² = 44.54, so strip k takes the inverse link nearest 44.54/(k+1) − 1.
    expect([0, 1, 2, 3, 4, 5, 6].map((k) => crossingLink(fwd, inv, k, scale)?.link)).toEqual([
      44, 21, 14, 10, 8, 6, 5,
    ]);
  });

  it("gives the bisector strip its own number, the bisector point", () => {
    // The law rounds to m−1 here, but the mirror pins the bisector links to each other.
    expect(crossingLink(fwd, inv, m, scale)?.link).toBe(m - 1);
    expect(crossingLink(fwd, inv, m, scale, m)?.link).toBe(m);
    for (let f = 1 / 16; f < 1; f += 1 / 16) {
      const T = 9 + f;
      const zakT = computeZakSpiralGeometry(sigma, T);
      const fwdT = forwardChain(sigma, T, false, 100_000);
      const invT = reflectedInverseChain(sigma, T, false, zakT.zeta, 100_000);
      expect(crossingLink(fwdT, invT, 9, crossingScale(T, false), 9)?.link).toBe(9);
    }
  });

  it("returns a point that really is on both links, in every strip", () => {
    for (let k = 0; k <= m; k++) {
      const found = crossingLink(fwd, inv, k, scale);
      expect(found?.at).not.toBeNull();
      const again = segmentCrossing(
        fwd.joints[k]!,
        fwd.joints[k + 1]!,
        inv.joints[found!.link]!,
        inv.joints[found!.link + 1]!,
      );
      expect(again?.at.x).toBeCloseTo(found!.at!.x, 12);
      expect(again?.at.y).toBeCloseTo(found!.at!.y, 12);
    }
  });

  it("crosses near the middle of the forward link, away from the fold", () => {
    for (let k = 0; k <= m - 4; k++) {
      const found = crossingLink(fwd, inv, k, scale)!;
      const hit = segmentCrossing(
        fwd.joints[k]!,
        fwd.joints[k + 1]!,
        inv.joints[found.link]!,
        inv.joints[found.link + 1]!,
      )!;
      expect(Math.abs(hit.p - 0.5)).toBeLessThan(0.05);
    }
  });

  it("finds a real crossing in every strip, through a whole unit of T", () => {
    for (let f = 1 / 16; f < 1; f += 1 / 16) {
      const T = 9 + f;
      const zakT = computeZakSpiralGeometry(sigma, T);
      const fwdT = forwardChain(sigma, T, false, 100_000);
      const invT = reflectedInverseChain(sigma, T, false, zakT.zeta, 100_000);
      const scaleT = crossingScale(T, false);
      for (let k = 0; k <= 9; k++) {
        const found = crossingLink(fwdT, invT, k, scaleT, 9);
        expect(found?.at).not.toBeNull();
        // Never further than one link from the named integer.
        expect(Math.abs(found!.link + 1 - scaleT / (k + 1))).toBeLessThan(1.5);
      }
    }
  });

  it("takes the lower neighbour when the named integer sits on a hyperbola joint", () => {
    // At T = 8.02, a²/1 is just above a half-integer, so nearest-integer names 72 and the
    // geometric crossing is already on 71. The naming rule steps down, never up.
    const T = 8.02;
    const zakT = computeZakSpiralGeometry(sigma, T);
    const fwdT = forwardChain(sigma, T, false, 100_000);
    const invT = reflectedInverseChain(sigma, T, false, zakT.zeta, 100_000);
    const scaleT = crossingScale(T, false);
    expect(namedCrossingLink(scaleT, 0)).toBe(72);
    expect(crossingLink(fwdT, invT, 0, scaleT, Math.floor(T))?.link).toBe(71);
  });
});

describe("spanLinkRange", () => {
  it("walks the ladder anchored on the bisector joint and stretched to the fold", () => {
    const index = 6.18;
    const m = Math.floor(index);
    const t = indexToImag(index, false);
    const a0 = t / (Math.PI * (m + 1));
    const step = (a0 - 1) / m;
    for (let k = 0; k <= m; k++) {
      const j = m - k;
      const span = spanLinkRange(index, false, k, m);
      expect(span.from).toBe(Math.round(t / (Math.PI * (a0 - (j - 1) * step))));
      expect(span.to).toBe(Math.round(t / (Math.PI * (a0 - j * step))));
    }
  });

  it("hands the leftmost strip the outermost turn, ending at the last link", () => {
    const index = 6.18;
    const first = spanLinkRange(index, false, 0, Math.floor(index));
    expect(first.to).toBe(lastSpiralLink(index));
  });

  it("is exactly the bisector link at the bisector strip, for any T in the unit", () => {
    for (let m = 2; m <= 40; m++) {
      for (let f = 0; f < 1; f += 1 / 32) {
        const index = m + f;
        expect(spanLinkRange(index, false, m, m)).toEqual({ from: m, to: m + 1 });
      }
    }
  });

  it("bands tile without gaps: each strip picks up where the next one ends", () => {
    const index = 6.18;
    const m = Math.floor(index);
    for (let k = 0; k < m; k++) {
      expect(spanLinkRange(index, false, k, m).from).toBe(spanLinkRange(index, false, k + 1, m).to);
    }
  });
});

describe("jointsForLinkRange", () => {
  it("keeps the last named link by taking one more joint", () => {
    // Strip 5 at T=6.18 is links 7–8; joints 7→8 is only link 7.
    expect(jointsForLinkRange(7, 8)).toEqual({ from: 7, to: 9 });
  });

  it("leaves an empty range empty", () => {
    expect(jointsForLinkRange(0, -1)).toEqual({ from: 0, to: -1 });
  });
});

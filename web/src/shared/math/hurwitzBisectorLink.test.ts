import {
  hurwitzBisectorLinkIndex,
  hurwitzBisectorLinkNumber,
  listHurwitzTripleCrossings,
  locateHurwitzBisectorCrossing,
} from "@/shared/math/hurwitzBisectorLink";
import {
  calcNLinks,
  calculateHurwitzCharacterTarget,
  calculateHurwitzCharacterVectors,
  flipLFunctionVectorsOriginToTarget,
  type HurwitzCoeff,
} from "@/shared/math/lFunctionCalculator";
import { complex } from "@/shared/math/complex";
import { indexToImag } from "@/shared/math/zetaEms";
import { hurwitzQOmegaCoeffs } from "@/shared/math/hurwitzMidPerpCatalog";

const CHI_NEG_I: HurwitzCoeff[] = [{ re: 0, im: -1 }, { re: 1, im: 0 }];
const CHI_POS_I: HurwitzCoeff[] = [{ re: 0, im: 1 }, { re: 1, im: 0 }];
const CHI_Q4: HurwitzCoeff[] = [
  { re: -1, im: 0 },
  { re: 1, im: 0 },
  { re: 1, im: 0 },
  { re: 1, im: 0 },
];

function crossingNearFormula(
  T: number,
  chi: readonly HurwitzCoeff[],
  period: number,
): number | null {
  const t = indexToImag(T, false);
  const s = complex(0.5, t);
  const H = calculateHurwitzCharacterTarget(chi, s);
  const walk = calculateHurwitzCharacterVectors(chi, Math.max(20, calcNLinks(T, period)), s);
  const pred = hurwitzBisectorLinkIndex(T, period);
  let best: number | null = null;
  let bestErr = Infinity;
  for (let i = 0; i < walk.vectors.length - 1; i++) {
    const a = walk.vectors[i];
    const b = walk.vectors[i + 1];
    if (a === undefined || b === undefined) continue;
    const fa = (a.x - H.re / 2) * H.re + (a.y - H.im / 2) * H.im;
    const fb = (b.x - H.re / 2) * H.re + (b.y - H.im / 2) * H.im;
    if (fa * fb > 0) continue;
    const denom = fa - fb;
    const frac = Math.abs(denom) < 1e-18 ? 0 : fa / denom;
    if (frac < -1e-6 || frac > 1 + 1e-6) continue;
    const cont = i + frac;
    const err = Math.abs(cont - pred);
    if (err < bestErr) {
      bestErr = err;
      best = cont;
    }
  }
  return best;
}

describe("hurwitzBisectorLinkIndex", () => {
  it("is T itself when q=1, matching the zeta bisector link", () => {
    expect(hurwitzBisectorLinkIndex(4.747899, 1)).toBeCloseTo(4.747899, 12);
    expect(hurwitzBisectorLinkNumber(4.747899, 1)).toBe(4);
  });

  it("puts χ=(-i,1) through link 6 at the observed T=4.747899", () => {
    const T = 4.747899;
    expect(hurwitzBisectorLinkNumber(T, 2)).toBe(6);
    const hit = crossingNearFormula(T, CHI_NEG_I, 2);
    expect(hit).not.toBeNull();
    if (hit === null) return;
    expect(Math.floor(hit)).toBe(6);
    expect(hit).toBeCloseTo(hurwitzBisectorLinkIndex(T, 2), 1);
  });

  it("stays within 0.12 of the χ=(-i,1) first-coil crossing on T=4,6,8,10", () => {
    for (const T of [4, 6, 8, 10]) {
      const hit = crossingNearFormula(T, CHI_NEG_I, 2);
      expect(hit).not.toBeNull();
      if (hit === null) continue;
      expect(Math.abs(hit - hurwitzBisectorLinkIndex(T, 2))).toBeLessThan(0.12);
    }
  });

  it("is 2T+1/2 for q=4 χ=(-1,1,1,1) at even integers", () => {
    for (const T of [6, 8, 10, 12]) {
      expect(hurwitzBisectorLinkIndex(T, 4)).toBeCloseTo(2 * T + 0.5, 12);
      const hit = crossingNearFormula(T, CHI_Q4, 4);
      expect(hit).not.toBeNull();
      if (hit === null) continue;
      expect(Math.abs(hit - (2 * T + 0.5))).toBeLessThan(0.02);
    }
  });

  it("tracks χ=(i,1) with the same q=2 law", () => {
    const T = 8;
    const hit = crossingNearFormula(T, CHI_POS_I, 2);
    expect(hit).not.toBeNull();
    if (hit === null) return;
    expect(Math.abs(hit - hurwitzBisectorLinkIndex(T, 2))).toBeLessThan(0.12);
  });
});

describe("locateHurwitzBisectorCrossing", () => {
  it("returns the guess when that segment meets the H/2 perp", () => {
    const H = { x: 2, y: 0 };
    const joints = [{ x: 0, y: 0 }, { x: 2, y: 1 }, { x: 3, y: 1 }];
    const hit = locateHurwitzBisectorCrossing(joints, H, 0);
    expect(hit).not.toBeNull();
    if (hit === null) return;
    expect(hit.link).toBe(0);
    expect(hit.point.x).toBeCloseTo(1, 10);
    expect(hit.point.y).toBeCloseTo(0.5, 10);
  });

  it("moves to a neighbor when the guess misses by one", () => {
    const H = { x: 2, y: 0 };
    const joints = [{ x: 0, y: 0 }, { x: 0.5, y: 1 }, { x: 1.5, y: 1 }];
    const hit = locateHurwitzBisectorCrossing(joints, H, 0);
    expect(hit).not.toBeNull();
    if (hit === null) return;
    expect(hit.link).toBe(1);
    expect(hit.point.x).toBeCloseTo(1, 10);
    expect(hit.point.y).toBeCloseTo(1, 10);
  });

  it("moves up to two links when the formula guess is off by two", () => {
    const H = { x: 4, y: 0 };
    const joints = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0 },
      { x: 1, y: 0 },
      { x: 3, y: 0 },
    ];
    const hit = locateHurwitzBisectorCrossing(joints, H, 0);
    expect(hit).not.toBeNull();
    if (hit === null) return;
    expect(hit.link).toBe(2);
    expect(hit.point.x).toBeCloseTo(2, 10);
  });

  it("snaps χ=(-i,1) at T=4.747899 onto a link that actually crosses", () => {
    const T = 4.747899;
    const t = indexToImag(T, false);
    const s = complex(0.5, t);
    const H = calculateHurwitzCharacterTarget(CHI_NEG_I, s);
    const walk = calculateHurwitzCharacterVectors(CHI_NEG_I, calcNLinks(T, 2), s);
    const guess = hurwitzBisectorLinkNumber(T, 2);
    const hit = locateHurwitzBisectorCrossing(walk.vectors, { x: H.re, y: H.im }, guess);
    expect(hit).not.toBeNull();
    if (hit === null) return;
    expect(Math.abs(hit.link - guess)).toBeLessThanOrEqual(2);
    const a = walk.vectors[hit.link];
    const b = walk.vectors[hit.link + 1];
    if (a === undefined || b === undefined) throw new Error("missing joints");
    const fa = (a.x - H.re / 2) * H.re + (a.y - H.im / 2) * H.im;
    const fb = (b.x - H.re / 2) * H.re + (b.y - H.im / 2) * H.im;
    expect(fa * fb).toBeLessThanOrEqual(1e-8);
  });

  it("keeps preferLink when that segment still meets the perp", () => {
    const H = { x: 2, y: 0 };
    const joints = [
      { x: 0.5, y: 0 },
      { x: 1.5, y: 0 },
      { x: 1.5, y: 1 },
      { x: 0.5, y: 1 },
    ];
    const kept = locateHurwitzBisectorCrossing(joints, H, 0, { preferLink: 2 });
    expect(kept?.link).toBe(2);
    const near = locateHurwitzBisectorCrossing(joints, H, 5, { nearest: { x: 1, y: 1 } });
    expect(near?.link).toBe(2);
  });

  it("stays on preferLink when several links meet the perp", () => {
    const H = { x: 2, y: 0 };
    const joints = [
      { x: 0, y: 0.5 },
      { x: 2, y: 0.5 },
      { x: 2, y: 1.5 },
      { x: 0, y: 1.5 },
    ];
    expect(locateHurwitzBisectorCrossing(joints, H, 0, { preferLink: 0 })?.link).toBe(0);
    expect(locateHurwitzBisectorCrossing(joints, H, 0, { preferLink: 2 })?.link).toBe(2);
  });

  it("steps only ±1 when preferLink no longer hosts a triple", () => {
    const H = { x: 2, y: 0 };
    const joints = [
      { x: 0, y: 2 },
      { x: 0.2, y: 2 },
      { x: 0, y: 0.5 },
      { x: 2, y: 0.5 },
      { x: 2, y: 1.5 },
      { x: 0, y: 1.5 },
    ];
    expect(locateHurwitzBisectorCrossing(joints, H, 2, { preferLink: 1 })?.link).toBe(2);
    expect(locateHurwitzBisectorCrossing(joints, H, 2, { preferLink: 3 })?.link).toBe(2);
  });

  it("with onlyPlus does not step to prefer−1", () => {
    const H = { x: 2, y: 0 };
    const joints = [
      { x: 0, y: 0.5 },
      { x: 2, y: 0.5 },
      { x: 2, y: 1.5 },
      { x: 0, y: 1.5 },
    ];
    expect(locateHurwitzBisectorCrossing(joints, H, 2, { preferLink: 2, onlyPlus: true })?.link).toBe(2);
    const short = [
      { x: 0, y: 0.5 },
      { x: 2, y: 0.5 },
      { x: 2, y: 1.5 },
    ];
    expect(locateHurwitzBisectorCrossing(short, H, 0, { preferLink: 1, onlyPlus: true })).toBeNull();
    expect(locateHurwitzBisectorCrossing(short, H, 0, { preferLink: 1 })?.link).toBe(0);
  });

  it("drops a perp hit that does not lie on a reverse link", () => {
    const H = { x: 2, y: 0 };
    const fwd = [
      { x: 0, y: 0.5 },
      { x: 2, y: 0.5 },
      { x: 2, y: 1.5 },
      { x: 0, y: 1.5 },
    ];
    const reverse = [
      { x: 0, y: 0.5 },
      { x: 2, y: 0.5 },
    ];
    const triples = listHurwitzTripleCrossings(fwd, H, reverse);
    expect(triples.map(h => h.link)).toEqual([0]);
  });
});

function q2Omega15At(T: number) {
  const chi = hurwitzQOmegaCoeffs(2, 15);
  const t = indexToImag(T, false);
  const s = complex(0.5, t);
  const H = calculateHurwitzCharacterTarget(chi, s);
  const target = { x: H.re, y: H.im };
  const fwd = calculateHurwitzCharacterVectors(chi, calcNLinks(T, 2), s);
  const reverse = flipLFunctionVectorsOriginToTarget(fwd, target);
  return { joints: fwd.vectors, target, reverse };
}

describe("fold-extended hosts at q=2 15°", () => {
  it("counts 14 and 15 at the fold-back kiss where only 16 is interior", () => {
    const { joints, target, reverse } = q2Omega15At(10.723955);
    const hits = listHurwitzTripleCrossings(joints, target, reverse);
    const links = hits.map(h => h.link);
    expect(links).toContain(14);
    expect(links).toContain(15);
    expect(links).toContain(16);
    expect(hits.find(h => h.link === 14)?.extended).toBe(true);
    expect(hits.find(h => h.link === 15)?.extended).toBe(true);
    expect(locateHurwitzBisectorCrossing(joints, target, 14, {
      preferLink: 14,
      reverseJoints: reverse,
      onlyPlus: true,
    })?.link).toBe(15);
  });

  it("keeps 14 before the kiss and stays on 15 afterwards, never 16", () => {
    const before = q2Omega15At(10.72);
    expect(locateHurwitzBisectorCrossing(before.joints, before.target, 14, {
      preferLink: 14,
      reverseJoints: before.reverse,
      onlyPlus: true,
    })?.link).toBe(14);
    const after = q2Omega15At(10.728354);
    expect(locateHurwitzBisectorCrossing(after.joints, after.target, 15, {
      preferLink: 15,
      reverseJoints: after.reverse,
      onlyPlus: true,
    })?.link).toBe(15);
  });
});

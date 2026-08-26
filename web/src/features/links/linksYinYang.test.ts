import { describe, expect, it } from "vitest";

import {
  budgetedCrossingSweep,
  crossingEndLoops,
  crossingEnds,
  crossingEndsForLinks,
  crossingOffset,
  crossingSweep,
  yinAwayLoops,
  YIN_AWAY_EXTENT,
  linkFrameSample,
  offsetAt,
  yinYangLoops,
  yinYangInBisectorFrame,
} from "@/features/links/linksYinYang";
import {
  crossingLink,
  crossingScale,
  namedCrossingLink,
  forwardChain,
  mirrorCutParameter,
  reflectedInverseChain,
} from "@/features/links/linksChains";
import { toLinkFrame } from "@/features/links/linksFrame";
import { computeZakSpiralGeometry, rak } from "@/shared/math/zakCalculator";

describe("yinYangInBisectorFrame", () => {
  it("lands on Σ₁+R when read in the bisector link's frame", () => {
    const sigma = 0.5;
    const index = 6.18;
    const m = Math.floor(index);
    const fwd = forwardChain(sigma, index, false, 100);
    const a = fwd.joints[m]!;          // Σ₁
    const b = fwd.joints[m + 1]!;      // Σ₁ + (m+1)^(−s), the bisector link's far joint
    const r = rak(sigma, index);
    // The strip draws frame coordinates directly, so mapping Σ₁+R into the frame must
    // reproduce the yin point.
    const framed = toLinkFrame({ x: a.x + r.re, y: a.y + r.im }, a, b);
    const yin = yinYangInBisectorFrame(sigma, index, false).yin;
    expect(yin.x).toBeCloseTo(framed?.x ?? 0, 10);
    expect(yin.y).toBeCloseTo(framed?.y ?? 0, 10);
  });

  it("puts yang a unit step away from yin, of length M^(2σ−1)", () => {
    const sigma = 0.5;
    const index = 6.18;
    const M = Math.floor(index) + 1;
    const { yin, yang } = yinYangInBisectorFrame(sigma, index, false);
    // |χ| = 1 on the critical line, so |yin − yang| = M^(2σ−1) = 1 there.
    expect(Math.hypot(yin.x - yang.x, yin.y - yang.y)).toBeCloseTo(Math.pow(M, 2 * sigma - 1), 6);
  });
});

describe("linkFrameSample", () => {
  const sigma = 0.5;
  const index = 6.18;
  const m = Math.floor(index);
  const zak = computeZakSpiralGeometry(sigma, index);
  const fwd = forwardChain(sigma, index, false, 100);
  const inv = reflectedInverseChain(sigma, index, false, zak.zeta, 100);

  it("matches the chains mapped into the frame, in any strip", () => {
    const sample = linkFrameSample(sigma, index, false, 60);
    for (const k of [m, m - 1, m - 2, 1, 0]) {
      for (const j of [m - 1, m, m + 1, m + 2, 44]) {
        const framed = toLinkFrame(inv.joints[j]!, fwd.joints[k]!, fwd.joints[k + 1]!)!;
        expect(sample.point(k, j).x).toBeCloseTo(framed.x, 8);
        expect(sample.point(k, j).y).toBeCloseTo(framed.y, 8);
      }
    }
  });

  it("is the yin and yang pair at the bisector", () => {
    const sample = linkFrameSample(sigma, index, false, m + 1);
    const { yin, yang } = yinYangInBisectorFrame(sigma, index, false);
    expect(sample.point(m, m).x).toBeCloseTo(yin.x, 10);
    expect(sample.point(m, m).y).toBeCloseTo(yin.y, 10);
    expect(sample.point(m, m + 1).x).toBeCloseTo(yang.x, 10);
    expect(sample.point(m, m + 1).y).toBeCloseTo(yang.y, 10);
  });

  it("names the bisector's own link at the bisector, and the product law elsewhere", () => {
    const sample = linkFrameSample(sigma, index, false, 60);
    expect(sample.link(m)).toBe(m);
    expect(sample.link(0)).toBe(namedCrossingLink(crossingScale(index, false), 0));
  });
});

describe("crossingEnds", () => {
  it("reads the ends of the link the crossing law names", () => {
    const sigma = 0.5;
    const index = 6.18;
    const k = Math.floor(index) - 1;
    const zak = computeZakSpiralGeometry(sigma, index);
    const fwd = forwardChain(sigma, index, false, 100);
    const inv = reflectedInverseChain(sigma, index, false, zak.zeta, 100);
    const named = crossingLink(fwd, inv, k, crossingScale(index, false), Math.floor(index))!.link;
    const { yin, yang } = crossingEnds(sigma, index, false, k);
    const framed = (j: number) => toLinkFrame(inv.joints[j]!, fwd.joints[k]!, fwd.joints[k + 1]!)!;
    expect(yin.x).toBeCloseTo(framed(named).x, 8);
    expect(yang.x).toBeCloseTo(framed(named + 1).x, 8);
  });
});

describe("crossing offsets", () => {
  const sigma = 0.5;
  const index = 6.18;
  const m = Math.floor(index);
  const links = [0, 1, 2, 3, 4, 5, 6];

  it("keeps the crossing on the link, at every sample of every strip", () => {
    for (const [, track] of crossingSweep(sigma, index, false, links, 100, 20000)) {
      expect(track.offsets.length).toBe(101);
      for (const { offset } of track.offsets) {
        expect(offset).not.toBeNull();
        expect(offset!).toBeGreaterThanOrEqual(0);
        expect(offset!).toBeLessThanOrEqual(1);
      }
    }
  });

  it("moves smoothly, handoffs included, and further the closer to the bisector", () => {
    const sweep = crossingSweep(sigma, index, false, links, 100, 20000);
    const spread = (k: number): number => {
      const seen = sweep.get(k)!.offsets.map(o => o.offset!);
      return Math.max(...seen) - Math.min(...seen);
    };
    expect(spread(0)).toBeLessThan(spread(m - 1));
    expect(spread(m - 1)).toBeLessThan(spread(m));
    // A handoff hands over the joint that is passing across, so the track never jumps from one
    // crossing to another, which would show as a step of the order of half a link.
    const worstStep = (k: number): number => {
      const seen = sweep.get(k)!.offsets.map(o => o.offset!);
      let worst = 0;
      for (let i = 1; i < seen.length; i++) worst = Math.max(worst, Math.abs(seen[i]! - seen[i - 1]!));
      return worst;
    };
    for (const k of links) expect(worstStep(k)).toBeLessThan(0.15);
    expect(worstStep(0)).toBeLessThan(0.01);
  });

  it("keeps the reading at one T on the track the sweep drew", () => {
    const sweep = crossingSweep(sigma, index, false, links, 256, 20000);
    const near = (k: number, frac: number): number => offsetAt(sweep.get(k)!, frac) ?? 0.5;
    for (let i = 0; i <= 40; i++) {
      const frac = (i / 40) * 0.9999;
      const ends = crossingEndsForLinks(sigma, m + frac, false, links, 20000);
      for (const k of links) {
        expect(Math.abs(crossingOffset(ends.get(k)!)! - near(k, frac))).toBeLessThan(0.02);
      }
    }
  });

  it("holds the reading on the track at a T whose far strips reach thousands of links", () => {
    // The strips beside the bisector carry the whole shape of the crossing's wander and are the
    // cheapest to walk to; sweeping the row at the one rate the furthest strip can afford left
    // them so coarse that the reading sat a third of a link off the track drawn for it.
    const high = 434;
    const row = Array.from({ length: high + 1 }, (_, i) => i);
    const sweep = budgetedCrossingSweep(sigma, high + 0.18, false, row, 20000, 800_000);
    let worst = 0;
    for (let i = 0; i <= 12; i++) {
      const frac = (i / 12) * 0.9999;
      const near = (k: number): number => {
        const track = sweep.get(k);
        return track === undefined ? 0.5 : offsetAt(track, frac) ?? 0.5;
      };
      const ends = crossingEndsForLinks(sigma, high + frac, false, row, 20000);
      for (const [k, got] of ends) {
        const offset = crossingOffset(got);
        if (offset === null || !sweep.has(k)) continue;
        worst = Math.max(worst, Math.abs(offset - near(k)));
      }
    }
    expect(worst).toBeLessThan(0.05);
  });

  it("sweeps the near strips finely and the far ones coarsely, inside one budget", () => {
    const high = 434;
    const row = Array.from({ length: high + 1 }, (_, i) => i);
    const sweep = budgetedCrossingSweep(sigma, high + 0.18, false, row, 20000, 800_000);
    // A strip's crossing link sits at a²/(k+1), so link 0's is thousands of links out and the
    // bisector's is next door. Only the strips whose crossing link is beyond the cap go unswept.
    expect(sweep.get(high)!.offsets.length).toBeGreaterThan(200);
    expect(sweep.get(20)!.offsets.length).toBeLessThan(40);
    expect(sweep.has(0)).toBe(false);
  });

  it("is the crossing fraction in the bisector strip", () => {
    const zak = computeZakSpiralGeometry(sigma, index);
    const fwd = forwardChain(sigma, index, false, 100);
    const rStar = mirrorCutParameter(sigma, index, false, zak.zeta, fwd.joints, m)!;
    const ends = crossingEndsForLinks(sigma, index, false, [m], 20000).get(m)!;
    expect(crossingOffset(ends)!).toBeCloseTo(rStar - m, 9);
  });
});

describe("crossingEndLoops", () => {
  it("breaks into a piece per link that takes a turn crossing", () => {
    const sigma = 0.5;
    const index = 6.18;
    const k = Math.floor(index) - 1;
    const { yin, yang } = crossingEndLoops(sigma, index, false, k, 200);
    // Two handoffs inside the unit, so three pieces, and the samples are all accounted for.
    expect(yin.length).toBe(3);
    expect(yang.length).toBe(3);
    expect(yin.reduce((n, piece) => n + piece.length, 0)).toBe(201);
    // Each end hands over to the other: a piece of yin starts where the previous yang ended.
    for (let i = 1; i < yin.length; i++) {
      const opened = yin[i]![0]!;
      const closed = yang[i - 1]![yang[i - 1]!.length - 1]!;
      expect(Math.hypot(opened.x - closed.x, opened.y - closed.y)).toBeLessThan(0.05);
    }
  });

  it("draws a far strip too, whose crossing link sits out near a²", () => {
    const index = 6.18;
    const all = crossingSweep(0.5, index, false, [0, 1, 5, 6], 100, 20000);
    expect([...all.keys()]).toEqual([0, 1, 5, 6]);
    // Link 0 is crossed by links out around a², so its loci hand over many more times.
    expect(all.get(0)!.yin.length).toBeGreaterThan(all.get(5)!.yin.length);
    // A strip whose crossing link lies past the cap is left out rather than walked to.
    const capped = crossingSweep(0.5, index, false, [0, 6], 8, 7);
    expect(capped.has(0)).toBe(false);
    expect(capped.has(6)).toBe(true);
  });

  it("gives the same loci one link at a time as in a batch", () => {
    const one = crossingEndLoops(0.5, 6.18, false, 4, 40);
    const many = crossingSweep(0.5, 6.18, false, [0, 4, 6], 40, 20000).get(4)!;
    expect(many.yin.map(p => p.length)).toEqual(one.yin.map(p => p.length));
    expect(many.yin[0]![0]!.x).toBeCloseTo(one.yin[0]![0]!.x, 12);
  });

  it("is the yin and yang loops when read at the bisector", () => {
    const m = 6;
    const pieces = crossingEndLoops(0.5, 6.18, false, m, 64);
    const loops = yinYangLoops(0.5, 6.18, false, 64);
    expect(pieces.yin.length).toBe(1);
    expect(pieces.yin[0]!.length).toBe(65);
    for (let i = 0; i < 65; i += 8) {
      expect(pieces.yin[0]![i]!.x).toBeCloseTo(loops.yin[i]!.x, 10);
      expect(pieces.yang[0]![i]!.y).toBeCloseTo(loops.yang[i]!.y, 10);
    }
  });
});

describe("yinYangLoops", () => {
  it("traces the unit of the index that holds T, closing at the handoff", () => {
    const { yin, yang } = yinYangLoops(0.5, 6.18, false, 64);
    expect(yin.length).toBe(65);
    expect(yang.length).toBe(65);
    // Ends meet: the loops close as the bisector point hands off to the next link.
    expect(Math.hypot(yin[0]!.x - yin[64]!.x, yin[0]!.y - yin[64]!.y)).toBeLessThan(0.02);
    expect(Math.hypot(yang[0]!.x - yang[64]!.x, yang[0]!.y - yang[64]!.y)).toBeLessThan(0.02);
  });

  it("passes through the current yin and yang points", () => {
    const sigma = 0.5;
    const index = 6.5;
    const { yin, yang } = yinYangLoops(sigma, index, false, 512);
    const now = yinYangInBisectorFrame(sigma, index, false);
    const nearest = (loop: { x: number; y: number }[], p: { x: number; y: number }): number =>
      Math.min(...loop.map(q => Math.hypot(q.x - p.x, q.y - p.y)));
    expect(nearest(yin, now.yin)).toBeLessThan(1e-2);
    expect(nearest(yang, now.yang)).toBeLessThan(1e-2);
  });
});

describe("yinAwayLoops", () => {
  it("starts each wing on the away end of the green or red piece, so the join has no gap", () => {
    const index = 4.5;
    const k = 3;
    const pieces = crossingEndLoops(0.5, index, false, k, 200);
    const ext = yinAwayLoops(0.5, index, false, k, 200);
    expect(pieces.yin.length).toBeGreaterThan(1);
    expect(ext.yin.length).toBe(pieces.yin.length);
    expect(ext.yang.length).toBe(pieces.yang.length);
    const farther = (first: { x: number; y: number }, last: { x: number; y: number }) =>
      (last.x * last.x + last.y * last.y) >= (first.x * first.x + first.y * first.y) ? last : first;
    const nearer = (first: { x: number; y: number }, last: { x: number; y: number }) =>
      farther(first, last) === last ? first : last;
    for (let p = 0; p < pieces.yin.length; p++) {
      const green = pieces.yin[p]!;
      const red = pieces.yang[p]!;
      const yinTip = farther(green[0]!, green[green.length - 1]!);
      const yangTip = nearer(red[0]!, red[red.length - 1]!);
      expect(ext.yin[p]!.length).toBeGreaterThan(1);
      expect(ext.yang[p]!.length).toBeGreaterThan(1);
      expect(ext.yin[p]![0]!.x).toBe(yinTip.x);
      expect(ext.yin[p]![0]!.y).toBe(yinTip.y);
      expect(ext.yang[p]![0]!.x).toBe(yangTip.x);
      expect(ext.yang[p]![0]!.y).toBe(yangTip.y);
    }
  });

  it("leaves the bisector strip without wings", () => {
    const ext = yinAwayLoops(0.5, 6.18, false, 6, 64);
    expect(ext.yin.every(piece => piece.length === 0)).toBe(true);
    expect(ext.yang.every(piece => piece.length === 0)).toBe(true);
  });

  it("leaves the unit of T when the away end sits on an edge of it", () => {
    expect(YIN_AWAY_EXTENT).toBe(0.5);
    const index = 4.5;
    const k = 3;
    const pieces = crossingEndLoops(0.5, index, false, k, 80);
    const ext = yinAwayLoops(0.5, index, false, k, 80);
    expect(ext.yin.length).toBe(pieces.yin.length);
    expect(ext.yang.length).toBe(pieces.yang.length);
    for (const piece of ext.yin) expect(piece.length).toBeGreaterThan(1);
    for (const piece of ext.yang) expect(piece.length).toBeGreaterThan(1);
  });
});

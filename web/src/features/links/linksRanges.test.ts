import { describe, expect, it } from "vitest";

import {
  crossingEndLinks,
  forwardRange,
  inverseRange,
  offsetBandHeight,
  yinYangFlagsFromLegacy,
} from "@/features/links/linksSceneController";
import { spanLinkRange } from "@/features/links/linksChains";

// Links are 0-based here: link k runs joints[k] → joints[k+1], so link ⌊T⌋ is the bisector link.

describe("offsetBandHeight", () => {
  it("gives the band its full height once the strips have theirs", () => {
    expect(offsetBandHeight(800)).toBe(144);
    expect(offsetBandHeight(304)).toBe(144);
    expect(offsetBandHeight(256)).toBe(96);
  });

  it("gives up the band rather than squeezing the strips on a short canvas", () => {
    expect(offsetBandHeight(200)).toBe(40);
    expect(offsetBandHeight(160)).toBe(0);
    expect(offsetBandHeight(80)).toBe(0);
  });
});

describe("crossingEndLinks", () => {
  const drawn = [0, 2, 4, 5, 6];

  it("draws no green/red pieces when the off-bisector checkbox is off", () => {
    expect(crossingEndLinks(false, drawn, 6)).toEqual([]);
  });

  it("takes every drawn strip except the bisector", () => {
    expect(crossingEndLinks(true, drawn, 6)).toEqual([0, 2, 4, 5]);
    expect(crossingEndLinks(true, [0, 3, 6], 6)).toEqual([0, 3]);
  });
});

describe("yinYangFlagsFromLegacy", () => {
  it("maps the old dropdown so a saved session keeps the curves it had", () => {
    expect(yinYangFlagsFromLegacy("none")).toEqual({
      onBisector: false, offBisector: false, yinExtend: false, yangExtend: false,
    });
    expect(yinYangFlagsFromLegacy("yinYangOnBisector")).toEqual({
      onBisector: true, offBisector: false, yinExtend: false, yangExtend: false,
    });
    expect(yinYangFlagsFromLegacy("allLinks")).toEqual({
      onBisector: false, offBisector: true, yinExtend: false, yangExtend: false,
    });
    expect(yinYangFlagsFromLegacy("extensionOnAllLinks")).toEqual({
      onBisector: false, offBisector: false, yinExtend: true, yangExtend: true,
    });
  });
});

describe("forwardRange", () => {
  it("gives an empty range for 'no links', leaving only the frame's own link", () => {
    const range = forwardRange("none", 3, 6, 90);
    expect(range.to).toBeLessThan(range.from);
  });

  it("gives the whole chain for 'all links'", () => {
    expect(forwardRange("all", 3, 6, 90)).toEqual({ from: 0, to: 90 });
  });

  it("includes the bisector link for 'up to bisector'", () => {
    expect(forwardRange("toBisector", 3, 6, 90)).toEqual({ from: 0, to: 7 });
  });

  it("takes links k−1, k, k+1 for 'either side'", () => {
    expect(forwardRange("eitherSide", 4, 6, 90)).toEqual({ from: 3, to: 6 });
  });

  it("clamps 'either side' at both ends of the chain", () => {
    expect(forwardRange("eitherSide", 0, 6, 90)).toEqual({ from: 0, to: 2 });
    expect(forwardRange("eitherSide", 90, 6, 90)).toEqual({ from: 89, to: 90 });
  });
});

describe("inverseRange", () => {
  it("gives the whole chain for 'all links'", () => {
    expect(inverseRange("all", 3, 6, 90, 6.18, false)).toEqual({ from: 0, to: 90 });
  });

  it("starts at the bisector link for 'bisector to end'", () => {
    expect(inverseRange("bisectorToEnd", 3, 6, 90, 6.18, false)).toEqual({ from: 6, to: 90 });
  });

  it("uses the strip's own turn of the span ladder, as inclusive link numbers", () => {
    const index = 6.18;
    expect(inverseRange("span", 0, 6, 1000, index, false)).toEqual(spanLinkRange(index, false, 0, 6));
    expect(inverseRange("span", 2, 6, 1000, index, false)).toEqual(spanLinkRange(index, false, 2, 6));
    expect(inverseRange("span", 5, 6, 1000, index, false)).toEqual({ from: 7, to: 8 });
  });

  it("gives the leftmost strip the outermost band and the bisector strip its own link", () => {
    const index = 6.18;
    const m = Math.floor(index);
    const left = inverseRange("span", 0, m, 1000, index, false);
    const right = inverseRange("span", m, m, 1000, index, false);
    expect(left.to).toBeGreaterThan(left.from);
    expect(right).toEqual({ from: m, to: m + 1 });
  });

  it("clamps the span band to the links actually walked", () => {
    expect(inverseRange("span", 0, 6, 20, 6.18, false).to).toBe(20);
  });

  it("draws just the crossing link for 'one crossing link'", () => {
    expect(inverseRange("oneCrossing", 5, 6, 90, 6.18, false, 6)).toEqual({ from: 6, to: 7 });
  });

  it("draws nothing for 'one crossing link' when no crossing was found", () => {
    const range = inverseRange("oneCrossing", 5, 6, 90, 6.18, false, null);
    expect(range.to).toBeLessThan(range.from);
  });
});

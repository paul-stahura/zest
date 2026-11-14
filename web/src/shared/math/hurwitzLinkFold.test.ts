import {
  classifyLinkFold,
  foldHandoffKind,
  foldPairShouldStep,
  isHurwitzNearOrigin,
  linkAllowsFoldExtend,
  midPerpHitsJoint,
  midPerpHitsLinkInterior,
} from "@/shared/math/hurwitzLinkFold";

describe("isHurwitzNearOrigin", () => {
  it("rejects a tiny H whose mid-perp would spin", () => {
    expect(isHurwitzNearOrigin({ x: 0.01, y: 0.01 })).toBe(true);
    expect(isHurwitzNearOrigin({ x: 1, y: 0 })).toBe(false);
  });
});

describe("classifyLinkFold", () => {
  it("is back when consecutive links stack antiparallel", () => {
    expect(classifyLinkFold({ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0.2, y: 0 })).toBe("back");
  });

  it("is out when consecutive links continue on the same line", () => {
    expect(classifyLinkFold({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 })).toBe("out");
  });

  it("is bent when the turn is neither a fold nor a flatten", () => {
    expect(classifyLinkFold({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 })).toBe("bent");
  });
});

describe("foldHandoffKind", () => {
  it("is fold-back when the mid-perp cuts the dying link interior", () => {
    const joints = [
      { x: 0, y: 0.5 },
      { x: 2, y: 0.5 },
      { x: 0.1, y: 0.5 },
    ];
    const h = { x: 2, y: 0 };
    expect(midPerpHitsLinkInterior(joints[0]!, joints[1]!, h)).toBe(true);
    expect(foldHandoffKind(joints, h, 0, 1)).toBe("fold-back");
  });

  it("is fold-out when the mid-perp hits the shared joint", () => {
    const joints = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ];
    const h = { x: 2, y: 0 };
    expect(midPerpHitsJoint(joints[1]!, h)).toBe(true);
    expect(foldHandoffKind(joints, h, 0, 1)).toBe("fold-out");
  });
});

describe("fold-adjacent extend", () => {
  it("lets a stacked pair claim a hit just past the shared joint", () => {
    const joints = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 0.1, y: 0 },
      { x: 1.5, y: 0.4 },
    ];
    expect(linkAllowsFoldExtend(joints, 0)).toBe(true);
    expect(linkAllowsFoldExtend(joints, 1)).toBe(true);
    expect(foldPairShouldStep(joints, 0, 1.005, -0.01)).toBe(true);
    expect(foldPairShouldStep(joints, 0, 1.08, -0.07)).toBe(false);
  });

  it("steps once the new link is interior and the old hit is only extended", () => {
    const joints = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 0.1, y: 0 },
    ];
    expect(foldPairShouldStep(joints, 0, 1.02, 0.02)).toBe(true);
    expect(foldPairShouldStep(joints, 0, 0.99, 0.02)).toBe(false);
  });
});

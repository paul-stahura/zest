import { describe, expect, it } from "vitest";

import { buildJointAnglePlotPoints, jointAngleYOf, plotPointsToInterleavedCss } from "@/features/joint-angles/jointAnglesRenderPoints";

describe("buildJointAnglePlotPoints", () => {
  it("maps joints to CSS plot coordinates and skips off-screen points", () => {
    const signed = new Float64Array(10);
    signed[5] = 0;
    signed[8] = Math.PI / 2;
    const uOf = (n: number): number => (n - 1) / 9;
    const xOfU = (u: number): number => 100 + u * 200;
    const points = buildJointAnglePlotPoints({
      joints: [5, 8],
      signed,
      uOf,
      xOfU,
      plotTop: 20,
      plotHeight: 160,
      plotLeft: 100,
      plotRight: 300,
    });
    expect(points).toHaveLength(2);
    expect(points[0]!.x).toBeCloseTo(100 + ((5 - 1) / 9) * 200, 5);
    expect(points[0]!.y).toBeCloseTo(jointAngleYOf(0, 20, 160), 5);
    expect(points[1]!.y).toBeCloseTo(jointAngleYOf(Math.PI / 2, 20, 160), 5);
  });

  it("packs plot points into interleaved floats", () => {
    const buf = plotPointsToInterleavedCss([{ x: 10, y: 20 }, { x: 30, y: 40 }]);
    expect(Array.from(buf)).toEqual([10, 20, 30, 40]);
  });
});

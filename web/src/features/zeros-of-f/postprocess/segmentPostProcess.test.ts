import { segmentPostProcess, type SegmentPostProcessParams } from "./segmentPostProcess";

const defaultParams: SegmentPostProcessParams = {
  tTol: 0.002,
  sigmaGap: 0.10,
  minPts: 1,
};

function makeIter(pts: Array<{ sigma: number; t: number; yVal: number }>) {
  return (cb: (sigma: number, t: number, yVal: number) => void) => {
    for (const p of pts) cb(p.sigma, p.t, p.yVal);
  };
}

describe("segmentPostProcess", () => {
  it("returns empty for empty input", () => {
    const result = segmentPostProcess(makeIter([]), defaultParams);
    expect(result).toEqual([]);
  });

  it("returns one representative per T-band when all sigmas are close", () => {
    const pts = [
      { sigma: -30.00, t: 100.0001, yVal: 0.01 },
      { sigma: -30.05, t: 100.0002, yVal: 0.005 },
      { sigma: -30.02, t: 100.0003, yVal: 0.02 },
    ];
    const result = segmentPostProcess(makeIter(pts), defaultParams);
    expect(result).toHaveLength(1);
    expect(result[0]!.yVal).toBe(0.005); // lowest
    expect(result[0]!.sigma).toBe(-30.05);
  });

  it("splits into separate T-bands when T gap exceeds tTol", () => {
    const pts = [
      { sigma: -30, t: 100.001, yVal: 0.01 },
      { sigma: -30, t: 200.001, yVal: 0.02 },
    ];
    const result = segmentPostProcess(makeIter(pts), defaultParams);
    expect(result).toHaveLength(2);
  });

  it("splits within a T-band by sigma gap", () => {
    const pts = [
      { sigma: -30, t: 100.001, yVal: 0.01 },
      { sigma: -30.05, t: 100.001, yVal: 0.02 },
      { sigma: -50, t: 100.0015, yVal: 0.005 }, // far in sigma
    ];
    const result = segmentPostProcess(makeIter(pts), defaultParams);
    expect(result).toHaveLength(2); // two sigma-segments
  });

  it("respects minPts filter", () => {
    const pts = [
      { sigma: -30, t: 100.001, yVal: 0.01 },
    ];
    const result = segmentPostProcess(makeIter(pts), { ...defaultParams, minPts: 3 });
    expect(result).toHaveLength(0);
  });
});

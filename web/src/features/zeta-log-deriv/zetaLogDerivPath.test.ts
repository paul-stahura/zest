import { pathIndices, pathSegmentCount, splitPath } from "@/features/zeta-log-deriv/zetaLogDerivPath";

describe("pathIndices", () => {
  it("covers T ± length when both sides are on", () => {
    const indices = pathIndices(6, 0.25, 10000, "both");
    expect(indices[0]).toBeCloseTo(5.75, 8);
    expect(indices[indices.length - 1]).toBeCloseTo(6.25, 8);
  });

  it("covers only T and forward when the side is plus", () => {
    const indices = pathIndices(6, 0.1, 10000, "plus");
    expect(indices[0]).toBeCloseTo(6, 8);
    expect(indices[indices.length - 1]).toBeCloseTo(6.1, 8);
  });

  it("returns nothing when the length is zero", () => {
    expect(pathIndices(6, 0, 10000, "both")).toEqual([]);
  });

  it("uses 200 segments per 0.01 T when ± is on, and half that when off", () => {
    expect(pathSegmentCount(0.01, "both")).toBe(200);
    expect(pathSegmentCount(0.01, "plus")).toBe(100);
    expect(pathSegmentCount(0.1, "both")).toBe(2000);
    expect(pathIndices(6, 0.01, 10000, "both")).toHaveLength(201);
    expect(pathIndices(6, 0.01, 10000, "plus")).toHaveLength(101);
  });
});

describe("splitPath", () => {
  it("breaks at a missing sample and at a long jump", () => {
    const pieces = splitPath([
      { x: 0, y: 0 },
      { x: 0.2, y: 0.1 },
      null,
      { x: 1, y: 1 },
      { x: 1.1, y: 1 },
      { x: 20, y: 1 },
      { x: 20.2, y: 1.1 },
    ]);
    expect(pieces).toEqual([
      [{ x: 0, y: 0 }, { x: 0.2, y: 0.1 }],
      [{ x: 1, y: 1 }, { x: 1.1, y: 1 }],
      [{ x: 20, y: 1 }, { x: 20.2, y: 1.1 }],
    ]);
  });
});
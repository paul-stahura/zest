import {
  nearestPerpendicularHits,
  perpendicularHits,
  visibleLatticeBounds,
} from "@/features/quasicrystal/perpendicularHits";

describe("perpendicularHits", () => {
  it("lights the vertical through a zero when the ray lies on the x axis", () => {
    const hits = perpendicularHits({
      zeros: [2],
      angle: 0,
      gridScale: 10,
      zeroScale: 10,
      tolerancePx: 0.5,
      iMin: -4,
      iMax: 4,
      jMin: -3,
      jMax: 3,
    });
    const onPerp = hits.filter((hit) => hit.zeroIndex === 0 && hit.lattice.i === 2);
    expect(onPerp.map((hit) => hit.lattice.j).sort((a, b) => a - b)).toEqual([-3, -2, -1, 0, 1, 2, 3]);
    expect(hits.some((hit) => hit.lattice.i !== 2)).toBe(false);
  });

  it("lights the horizontal through a zero when the ray lies on the y axis", () => {
    const hits = perpendicularHits({
      zeros: [3],
      angle: Math.PI / 2,
      gridScale: 10,
      zeroScale: 10,
      tolerancePx: 0.5,
      iMin: -2,
      iMax: 2,
      jMin: -1,
      jMax: 5,
    });
    expect(hits.every((hit) => hit.lattice.j === 3)).toBe(true);
    expect(hits).toHaveLength(5);
  });

  it("stays dark when the zero falls between lattice columns", () => {
    const hits = perpendicularHits({
      zeros: [2.5],
      angle: 0,
      gridScale: 10,
      zeroScale: 10,
      tolerancePx: 2,
      iMin: 0,
      iMax: 5,
      jMin: 0,
      jMax: 2,
    });
    expect(hits).toEqual([]);
  });

  it("follows the lattice when the grid scale changes and leaves the zero scale fixed", () => {
    const coarse = perpendicularHits({
      zeros: [2],
      angle: 0,
      gridScale: 20,
      zeroScale: 10,
      tolerancePx: 0.5,
      iMin: -2,
      iMax: 4,
      jMin: 0,
      jMax: 0,
    });
    const fine = perpendicularHits({
      zeros: [2],
      angle: 0,
      gridScale: 10,
      zeroScale: 10,
      tolerancePx: 0.5,
      iMin: -2,
      iMax: 4,
      jMin: 0,
      jMax: 0,
    });
    expect(coarse.map((hit) => hit.lattice.i)).toEqual([1]);
    expect(fine.map((hit) => hit.lattice.i)).toEqual([2]);
  });
});

describe("nearestPerpendicularHits", () => {
  it("keeps only the lattice point closest to the ray", () => {
    const hits = nearestPerpendicularHits({
      zeros: [2],
      angle: 0,
      gridScale: 10,
      zeroScale: 10,
      tolerancePx: 0.5,
      iMin: 0,
      iMax: 4,
      jMin: -3,
      jMax: 3,
    });
    expect(hits).toEqual([{ zeroIndex: 0, lattice: { i: 2, j: 0 } }]);
  });

  it("gives a shared lattice point to the zero closer to perpendicular", () => {
    const hits = nearestPerpendicularHits({
      zeros: [2, 2.05],
      angle: 0,
      gridScale: 10,
      zeroScale: 10,
      tolerancePx: 1,
      iMin: 0,
      iMax: 4,
      jMin: -2,
      jMax: 2,
    });
    const atOriginColumn = hits.filter((hit) => hit.lattice.i === 2 && hit.lattice.j === 0);
    expect(atOriginColumn).toEqual([{ zeroIndex: 0, lattice: { i: 2, j: 0 } }]);
    const other = hits.find((hit) => hit.zeroIndex === 1);
    expect(other?.lattice).toEqual({ i: 2, j: -1 });
  });

  it("drops a line when the lattice point is farther than the reach", () => {
    const query = {
      zeros: [2],
      angle: 0,
      gridScale: 10,
      zeroScale: 10,
      tolerancePx: 0.5,
      iMin: 0,
      iMax: 4,
      jMin: 1,
      jMax: 4,
    };
    expect(nearestPerpendicularHits({ ...query, maxDistancePx: 15 })).toEqual([
      { zeroIndex: 0, lattice: { i: 2, j: 1 } },
    ]);
    expect(nearestPerpendicularHits({ ...query, maxDistancePx: 5 })).toEqual([]);
  });

  it("uses the closest point still inside the window", () => {
    const hits = nearestPerpendicularHits({
      zeros: [2],
      angle: 0,
      gridScale: 10,
      zeroScale: 10,
      tolerancePx: 0.5,
      iMin: 0,
      iMax: 4,
      jMin: 1,
      jMax: 4,
    });
    expect(hits).toEqual([{ zeroIndex: 0, lattice: { i: 2, j: 1 } }]);
  });
});

describe("visibleLatticeBounds", () => {
  it("covers a view whose origin is the center", () => {
    expect(visibleLatticeBounds(100, 80, 10, 50, 40)).toEqual({
      iMin: -6,
      iMax: 6,
      jMin: -5,
      jMax: 5,
    });
  });

  it("leaves one lattice step outside an origin inset from the corner", () => {
    expect(visibleLatticeBounds(100, 80, 10, 10, 70)).toEqual({
      iMin: -2,
      iMax: 10,
      jMin: -2,
      jMax: 8,
    });
  });
});

import {
  cssFromFitLocal,
  hoverSearchBox,
  pickNearestZeroHover,
  type FitLocalCssMap,
  type HoverPointFn,
} from "@/shared/math/zerosOfF/zeroHoverPick";

const MAP: FitLocalCssMap = {
  scaleX: 2,
  scaleY: 2,
  offsetX: 0,
  offsetY: 0,
  left: -4,
  right: 4,
  top: 4,
  bottom: -4,
  width: 800,
  height: 400,
};

describe("cssFromFitLocal", () => {
  it("maps fit-local coordinates through the camera, Y flipped", () => {
    const css = cssFromFitLocal(1, 1, MAP);
    expect(css.x).toBeCloseTo(600, 8);
    expect(css.y).toBeCloseTo(100, 8);
  });
});

describe("hoverSearchBox", () => {
  it("contains the cursor and excludes a point past the pixel radius", () => {
    const cursor = cssFromFitLocal(1, 1, MAP);
    const box = hoverSearchBox(cursor.x, cursor.y, 10, MAP);
    expect(box).not.toBeNull();
    if (box === null) return;
    expect(1).toBeGreaterThanOrEqual(box.minX);
    expect(1).toBeLessThanOrEqual(box.maxX);
    const outside = cssFromFitLocal(1.055, 1, MAP);
    const dx = outside.x - cursor.x;
    const dy = outside.y - cursor.y;
    expect(dx * dx + dy * dy).toBeGreaterThan(100);
    expect(1.055 < box.minX || 1.055 > box.maxX).toBe(true);
  });
});

describe("pickNearestZeroHover", () => {
  it("returns the closer point inside the radius and ignores the one on the boundary", () => {
    const visit = (
      onPoint: HoverPointFn,
      _keepLocal: ((x: number, y: number) => boolean) | null,
    ): void => {
      onPoint(-1, 10, 3, 0, 0, 1, 0, 0, -1);
      onPoint(-2, 11, 1, 0, 0, 0, 1, 0, -1);
      onPoint(-3, 12, 5, 0, 0, 0, 0, 1, -1);
    };
    const hit = pickNearestZeroHover(
      visit,
      0,
      0,
      5,
      (x, y) => ({ x, y }),
      null,
    );
    expect(hit).toEqual({
      sigma: -2,
      t: 11,
      x: 1,
      y: 0,
      z: 0,
      r: 0,
      g: 1,
      b: 0,
      pointId: -1,
    });
  });
});

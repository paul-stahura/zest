import { circumcircleThrough3 } from "@/shared/math/circumcircleThrough3";

it("returns the unique circle through three non-collinear points", () => {
  const hit = circumcircleThrough3(
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  );
  expect(hit).not.toBeNull();
  if (hit === null) return;
  expect(hit.center.x).toBeCloseTo(0, 12);
  expect(hit.center.y).toBeCloseTo(0, 12);
  expect(hit.r).toBeCloseTo(1, 12);
});

it("returns null for collinear points", () => {
  expect(circumcircleThrough3(
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 2 },
  )).toBeNull();
});

it("returns null when a coordinate is not finite", () => {
  expect(circumcircleThrough3(
    { x: Number.NaN, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  )).toBeNull();
});

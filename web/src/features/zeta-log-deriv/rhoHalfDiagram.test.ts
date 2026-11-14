import { bisectorFoot, rhoHalfDiagram, rhoHalfLabels } from "@/features/zeta-log-deriv/rhoHalfDiagram";

describe("bisectorFoot", () => {
  it("sits at ζ′/ζ on the critical line, not at the midpoint", () => {
    const foot = bisectorFoot(-3, 0, -1.5, 2);
    expect(foot).not.toBeNull();
    if (foot === null) return;
    expect(foot.x).toBeCloseTo(-1.5, 8);
    expect(foot.y).toBeCloseTo(2, 8);
  });

  it("lands on the bisector", () => {
    const foot = bisectorFoot(-2, 1.15, 0.4, -0.7);
    expect(foot).not.toBeNull();
    if (foot === null) return;
    const alongX = foot.x + 1;
    const alongY = foot.y - 0.575;
    expect(alongX * -2 + alongY * 1.15).toBeCloseTo(0, 6);
  });
});

describe("rhoHalfDiagram", () => {
  it("draws the perpendicular bisector of the segment from 0 to w", () => {
    const diagram = rhoHalfDiagram(-2, 1.15);
    expect(diagram).not.toBeNull();
    if (diagram === null) return;
    expect(diagram.midpoint.x).toBeCloseTo(-1, 8);
    expect(diagram.midpoint.y).toBeCloseTo(0.575, 8);
    const dx = diagram.bisector[1].x - diagram.bisector[0].x;
    const dy = diagram.bisector[1].y - diagram.bisector[0].y;
    expect(dx * -2 + dy * 1.15).toBeCloseTo(0, 6);
    const midX = 0.5 * (diagram.bisector[0].x + diagram.bisector[1].x);
    const midY = 0.5 * (diagram.bisector[0].y + diagram.bisector[1].y);
    expect(midX).toBeCloseTo(diagram.midpoint.x, 6);
    expect(midY).toBeCloseTo(diagram.midpoint.y, 6);
    expect(diagram.imagIntercept).not.toBeNull();
    if (diagram.imagIntercept === null) return;
    expect(diagram.imagIntercept.x).toBe(0);
    expect(diagram.imagIntercept.y).toBeCloseTo((4 + 1.15 * 1.15) / (2 * 1.15), 8);
  });

  it("omits the imaginary-axis meeting when w is real", () => {
    const diagram = rhoHalfDiagram(-3.2, 0);
    expect(diagram).not.toBeNull();
    if (diagram === null) return;
    expect(diagram.imagIntercept).toBeNull();
    expect(diagram.bisector[0].x).toBeCloseTo(diagram.bisector[1].x, 6);
  });

  it("labels 0, w, and w/2", () => {
    const diagram = rhoHalfDiagram(-2, 1.15);
    expect(diagram).not.toBeNull();
    if (diagram === null) return;
    const labels = rhoHalfLabels(diagram);
    expect(labels.map((label) => label.text)).toEqual([
      "0",
      `w  ${Math.atan2(1.15, 2).toFixed(8)}`,
      "w/2",
      "i|w|²/(2v)",
    ]);
  });
});

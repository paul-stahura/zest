import { resolveWheelZoomAxes } from "@/shared/rendering/orthographicPanZoomSceneController";

describe("resolveWheelZoomAxes", () => {
  it("zooms both axes on a plain wheel in both-mode", () => {
    expect(resolveWheelZoomAxes("both", false, false)).toEqual({ xOnly: false, yOnly: false });
  });

  it("zooms only T on a plain wheel in y-mode", () => {
    expect(resolveWheelZoomAxes("y", false, false)).toEqual({ xOnly: false, yOnly: true });
  });

  it("lets Shift zoom σ even in y-mode", () => {
    expect(resolveWheelZoomAxes("y", true, false)).toEqual({ xOnly: true, yOnly: false });
  });
});

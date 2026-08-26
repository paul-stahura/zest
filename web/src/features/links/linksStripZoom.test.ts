import { describe, expect, it } from "vitest";

import {
  anchoredBandPan,
  anchoredStripPan,
  clampBandPan,
  offsetFromY,
  offsetToY,
} from "@/features/links/linksSceneController";

/** Where a row coordinate lands on the canvas, given the row's zoom and offset. */
function screenOf(rowCoord: number, panPx: number, zoom: number): number {
  return panPx + rowCoord * zoom;
}

describe("anchoredStripPan", () => {
  it("holds the point under the cursor still while zooming in", () => {
    const cursor = 640;
    const pan = anchoredStripPan(cursor, 0, 1, 3);
    // The row coordinate that was under the cursor is still under it.
    expect(screenOf(cursor / 1, pan, 3)).toBeCloseTo(cursor, 10);
  });

  it("holds it still while zooming out from an offset row", () => {
    const cursor = 200;
    const startPan = -450;
    const rowCoord = (cursor - startPan) / 4;
    const pan = anchoredStripPan(cursor, startPan, 4, 1.5);
    expect(screenOf(rowCoord, pan, 1.5)).toBeCloseTo(cursor, 10);
  });

  it("is a no-op when the zoom does not change", () => {
    expect(anchoredStripPan(300, -120, 2.5, 2.5)).toBeCloseTo(-120, 10);
  });

  it("keeps the left edge pinned when the cursor is at the left edge", () => {
    expect(anchoredStripPan(0, 0, 1, 7)).toBeCloseTo(0, 10);
  });
});

describe("anchoredBandPan", () => {
  const stripsH = 400;
  const bandH = 144;

  it("holds the crossing fraction under the cursor still while zooming in", () => {
    const cursorY = stripsH + 80;
    const offset = offsetFromY(cursorY, stripsH, bandH, 1, 0);
    const pan = anchoredBandPan(cursorY, stripsH, bandH, 0, 1, 4);
    expect(offsetToY(offset, stripsH, bandH, 4, pan)).toBeCloseTo(cursorY, 10);
  });

  it("is a no-op when the zoom does not change", () => {
    expect(anchoredBandPan(stripsH + 40, stripsH, bandH, 0.2, 3, 3)).toBeCloseTo(0.2, 10);
  });
});

describe("clampBandPan", () => {
  it("pins the full [0, 1] window at zoom 1", () => {
    expect(clampBandPan(-0.3, 1)).toBe(0);
    expect(clampBandPan(0.4, 1)).toBe(0);
  });

  it("keeps a magnified window inside [0, 1]", () => {
    expect(clampBandPan(-0.1, 4)).toBe(0);
    expect(clampBandPan(0.9, 4)).toBeCloseTo(0.75, 10);
    expect(clampBandPan(0.2, 4)).toBeCloseTo(0.2, 10);
  });
});

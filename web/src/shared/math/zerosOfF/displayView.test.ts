import {
  clampOrbitPitchDeg,
  displayChangeNeedsScatterRebuild,
  displayViewToFracTFilterKind,
  fracT3dScaleZ,
  harvestPointXyz,
  mergeDisplayPatch,
  parsePlanarZerosDisplayView,
  parseZerosDisplayView,
  wrapOrbitYawDeg,
  writeHarvestPoint,
  zerosDisplayViewPatch,
} from "@/shared/math/zerosOfF/displayView";
import { DEFAULT_STATE } from "@/features/zeros-of-f/types";

describe("zeros-of-f display view", () => {
  it("maps exact {T} to the just-one filter and the others to range", () => {
    expect(displayViewToFracTFilterKind("exactFracT")).toBe("justOne");
    expect(displayViewToFracTFilterKind("rangeFracT")).toBe("range");
    expect(displayViewToFracTFilterKind("fracT3d")).toBe("range");
  });

  it("backfills the dropdown from the old just-one toggle", () => {
    expect(parseZerosDisplayView(undefined, "justOne")).toBe("exactFracT");
    expect(parseZerosDisplayView(undefined, "range")).toBe("rangeFracT");
    expect(parseZerosDisplayView("fracT3d", "justOne")).toBe("fracT3d");
    expect(parsePlanarZerosDisplayView("fracT3d", "justOne")).toBe("rangeFracT");
    expect(parsePlanarZerosDisplayView("exactFracT", "range")).toBe("exactFracT");
  });

  it("keeps filter kind in sync when applying a view", () => {
    expect(zerosDisplayViewPatch("exactFracT")).toEqual({
      displayView: "exactFracT",
      fracTFilterKind: "justOne",
    });
  });

  it("puts {T} on Z in 3D and leaves Y as raw T", () => {
    const p = harvestPointXyz(-12, 6.25, "fracT3d", "fracT");
    expect(p).toEqual({ x: -12, y: 6.25, z: -0.25 });
  });

  it("folds Y to {T} only in the 2D frac(T) axis mode", () => {
    expect(harvestPointXyz(-12, 6.25, "rangeFracT", "fracT")).toEqual({
      x: -12,
      y: 0.25,
      z: 0,
    });
    expect(harvestPointXyz(-12, 6.25, "rangeFracT", "T")).toEqual({
      x: -12,
      y: 6.25,
      z: 0,
    });
  });

  it("writes a packed xyz triple", () => {
    const buf = new Float32Array(6);
    writeHarvestPoint(buf, 3, -1, 4.5, "fracT3d", "T");
    expect(Array.from(buf.slice(3))).toEqual([-1, 4.5, 0]);
  });

  it("scales the {T} axis as a fraction of the fitted T axis", () => {
    expect(fracT3dScaleZ(0.5)).toBe(4);
    expect(fracT3dScaleZ(0)).toBe(8 * 0.05);
  });

  it("wraps yaw and clamps pitch", () => {
    expect(wrapOrbitYawDeg(-10)).toBe(350);
    expect(clampOrbitPitchDeg(120)).toBe(85);
  });

  it("merges a toggle without rewinding 3D framing", () => {
    const live = {
      ...DEFAULT_STATE.display,
      displayView: "fracT3d" as const,
      orbitYawDeg: 120,
      orbitPitchDeg: -40,
      fracT3dDepth: 0.9,
    };
    const next = mergeDisplayPatch(live, { showT3900To3925SigmaLt0: true });
    expect(next.displayView).toBe("fracT3d");
    expect(next.orbitYawDeg).toBe(120);
    expect(next.orbitPitchDeg).toBe(-40);
    expect(next.fracT3dDepth).toBe(0.9);
    expect(next.showT3900To3925SigmaLt0).toBe(true);
  });

  it("retunes only the filter when exact-{T} digits change, without moving the slider value", () => {
    const prev = { ...DEFAULT_STATE.display, fracTJustOne: 0.146 };
    const next = mergeDisplayPatch(prev, { fracTJustOneDigits: 2 });
    expect(next.fracTJustOne).toBe(0.146);
    expect(displayChangeNeedsScatterRebuild(prev, next)).toEqual({
      layout: false,
      appearance: false,
      filter: true,
    });
  });

  it("retunes only the filter when the frac(T) range slider moves", () => {
    const prev = DEFAULT_STATE.display;
    const next = { ...prev, fracTRangeMin: 0.2, fracTRangeMax: 0.6 };
    expect(displayChangeNeedsScatterRebuild(prev, next)).toEqual({
      layout: false,
      appearance: false,
      filter: true,
    });
  });

  it("retunes only the filter when the .75–1 drag toggle flips", () => {
    const prev = DEFAULT_STATE.display;
    const next = { ...prev, fracTTwinNudge: true };
    expect(displayChangeNeedsScatterRebuild(prev, next)).toEqual({
      layout: false,
      appearance: false,
      filter: true,
    });
  });

  it("recolors when the color mode or spectrum feather changes", () => {
    const prev = DEFAULT_STATE.display;
    const next = { ...prev, colorMode: "grayscale" as const };
    expect(displayChangeNeedsScatterRebuild(prev, next)).toEqual({
      layout: false,
      appearance: true,
      filter: false,
    });
    expect(displayChangeNeedsScatterRebuild(prev, { ...prev, spectrumFeather: 0.05 })).toEqual({
      layout: false,
      appearance: true,
      filter: false,
    });
  });

  it("does not rebuild scatter buffers for orbit or depth-only edits", () => {
    const prev = DEFAULT_STATE.display;
    const next = { ...prev, orbitYawDeg: 40, fracT3dDepth: 0.9 };
    expect(displayChangeNeedsScatterRebuild(prev, next)).toEqual({
      layout: false,
      appearance: false,
      filter: false,
    });
  });
});

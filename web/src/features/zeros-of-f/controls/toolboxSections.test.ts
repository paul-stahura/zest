import {
  BIG_SIGMA_DISPLAY_ACCORDION_OPTIONS,
  buildDisplayAccordionControls,
  buildToolboxSections,
  type ToolboxBuildArgs,
} from "@/features/zeros-of-f/controls/toolboxSections";
import {
  DEFAULT_SPECTRUM_FEATHER,
  quarterSpectrumCss,
} from "@/features/zeros-of-f/fracToHue";
import { DEFAULT_STATE } from "@/features/zeros-of-f/types";
import { fracTFourierBoundaryLabel } from "@/shared/math/zerosOfF/fracTFourierBoundary";
import { fracTSmoothApBoundaryLabel } from "@/shared/math/zerosOfF/fracTSmoothApBoundary";
import { fracTClosedBoundaryLabel, fracTSliceBoundaryLabel } from "@/shared/math/zerosOfF/fracTSliceBoundary";

function noop(): void {
}

function args(overrides: Partial<ToolboxBuildArgs> = {}): ToolboxBuildArgs {
  return {
    backendDisplayName: "Local",
    backendId: "local",
    harvestFamily: "siegel",
    onHarvestFamilyChange: noop,
    display: DEFAULT_STATE.display,
    isPaused: false,
    isRefining: false,
    isRunning: false,
    lastError: null,
    onBackendChange: noop,
    onCancelRefine: noop,
    onComputeSegmentPostProc: noop,
    onComputeTAverages: noop,
    onForceRunZeroCount: noop,
    onStopZeroCount: noop,
    onExportZeroCountCsv: noop,
    isZeroCountRunning: false,
    onComputeTRowHighlight: noop,
    onClearDisplay: noop,
    onDisplayChange: noop,
    onPause: noop,
    onResume: noop,
    onScanChange: noop,
    onStartRefine: noop,
    onStop: noop,
    onWorkersHintChange: noop,
    progress: { linesDone: 0, linesTotal: 0, pointsRecorded: 0 },
    progressRowsPerMinute: null,
    refineProgress: { done: 0, total: 0 },
    scan: DEFAULT_STATE.scan,
    scanActivity: null,
    scanStartedAt: null,
    workersActive: 4,
    workersCap: 8,
    workersHint: 0,
    ...overrides,
  };
}

describe("buildToolboxSections", () => {
  it("exposes view-mode at the very top, then Display, Boundaries, Zero sets, {T} fit a, p, and the frac(T) histogram", () => {
    const sections = buildToolboxSections(args());
    expect(sections.map((section) => section.id)).toEqual([
      "view-mode",
      "harvest-family",
      "display",
      "boundaries",
      "overlay-sets",
      "frac-t-slice-coeff",
      "frac-t-histogram",
      "toggles",
    ]);

    const sumSections = buildToolboxSections(args({ tabViewMode: "sum" }));
    expect(sumSections.map((section) => section.id)).toEqual([
      "view-mode",
      "harvest-family",
      "sum-controls",
      "display",
      "boundaries",
      "overlay-sets",
      "frac-t-slice-coeff",
      "frac-t-histogram",
      "toggles",
    ]);
  });

  it("puts the Display dropdown first, then just-one above the range slider", () => {
    const sections = buildToolboxSections(args());
    const display = sections.find((section) => section.id === "display");
    if (display?.controls === undefined) throw new Error("display section was not found");
    const ids = display.controls.map((control) => control.id);
    expect(ids[0]).toBe("display-view");
    expect(ids.indexOf("spectrum-feather")).toBeGreaterThan(ids.indexOf("color-mode"));
    expect(ids.indexOf("spectrum-feather") + 1).toBe(ids.indexOf("spectrum-bar-inline"));
    expect(ids.indexOf("frac-t-just-one-digits")).toBeLessThan(ids.indexOf("frac-t-just-one"));
    expect(ids.indexOf("frac-t-just-one")).toBeLessThan(ids.indexOf("frac-t-range"));
    const feather = display.controls.find((control) => control.id === "spectrum-feather");
    expect(feather).toMatchObject({
      kind: "number",
      label: "Feather the spectrum colors",
      value: DEFAULT_SPECTRUM_FEATHER,
    });
    const view = display.controls.find((control) => control.id === "display-view");
    expect(view).toMatchObject({ kind: "select", label: "Display" });
    if (view?.kind !== "select") throw new Error("display-view is not a select");
    expect(view.options).toEqual([
      { label: "all zeros with an exact {T}", value: "exactFracT" },
      { label: "all zeros within a range of {T}", value: "rangeFracT" },
      { label: "3D representation", value: "fracT3d" },
    ]);
  });

  it("shows the digits radios only for exact {T}", () => {
    const range = buildToolboxSections(args());
    const rangeDisplay = range.find((section) => section.id === "display");
    if (rangeDisplay?.controls === undefined) throw new Error("display section was not found");
    const hidden = rangeDisplay.controls.find((control) => control.id === "frac-t-just-one-digits");
    if (hidden?.kind !== "custom") throw new Error("digits control is not custom");
    expect(hidden.render()).toBeNull();

    const exact = buildToolboxSections(args({
      display: { ...DEFAULT_STATE.display, displayView: "exactFracT" },
    }));
    const exactDisplay = exact.find((section) => section.id === "display");
    if (exactDisplay?.controls === undefined) throw new Error("display section was not found");
    const shown = exactDisplay.controls.find((control) => control.id === "frac-t-just-one-digits");
    if (shown?.kind !== "custom") throw new Error("digits control is not custom");
    expect(shown.render()).not.toBeNull();
  });

  it("shows the depth slider only in the 3D display mode", () => {
    const range = buildToolboxSections(args());
    const rangeDisplay = range.find((section) => section.id === "display");
    if (rangeDisplay?.controls === undefined) throw new Error("display section was not found");
    expect(rangeDisplay.controls.some((control) => control.id === "frac-t-3d-depth")).toBe(false);
    expect(rangeDisplay.controls.some((control) => control.id === "y-axis-mode")).toBe(true);

    const threeD = buildToolboxSections(args({
      display: { ...DEFAULT_STATE.display, displayView: "fracT3d" },
    }));
    const threeDDisplay = threeD.find((section) => section.id === "display");
    if (threeDDisplay?.controls === undefined) throw new Error("display section was not found");
    expect(threeDDisplay.controls.some((control) => control.id === "frac-t-3d-depth")).toBe(true);
    expect(threeDDisplay.controls.some((control) => control.id === "y-axis-mode")).toBe(false);
  });

  it("keeps the Color by dropdown on Display", () => {
    const sections = buildToolboxSections(args());
    const display = sections.find((section) => section.id === "display");
    if (display?.controls === undefined) throw new Error("display section was not found");
    const color = display.controls.find((control) => control.id === "color-mode");
    expect(color).toMatchObject({ kind: "select", label: "Color by" });
    if (color?.kind !== "select") throw new Error("color-mode is not a select");
    expect(color.options).toEqual([
      { label: "Spectrum (frac T)", value: "spectrum" },
      { label: "Grayscale", value: "grayscale" },
    ]);
    expect(display.controls.some((control) => control.id === "mag-thresh")).toBe(false);
    expect(display.controls.some((control) => control.id === "mag-thresh-max")).toBe(false);
  });

  it("puts the boundary-curve toggles in the Boundaries accordion", () => {
    const sections = buildToolboxSections(args());
    const display = sections.find((section) => section.id === "display");
    if (display?.controls === undefined) throw new Error("display section was not found");
    expect(display.controls.some((control) => control.id === "show-arias-boundary")).toBe(false);
    const boundaries = sections.find((section) => section.id === "boundaries");
    if (boundaries?.controls === undefined) throw new Error("boundaries section was not found");
    expect(boundaries.title).toBe("Boundaries");
    const ids = boundaries.controls.map((control) => control.id);
    expect(ids).toEqual([
      "show-pauls-boundary",
      "show-frac-t-slice-boundary",
      "show-frac-t-closed-boundary",
      "show-frac-t-fourier-boundary",
      "show-frac-t-smooth-ap-boundary",
      "show-boundary",
      "show-arias-boundary",
      "show-imag-cube-root-boundary",
      "show-imag-cube-root-series-boundary",
      "show-theorem5-boundary",
      "show-theorem5-points",
      "show-scorer-expansion-points",
      "show-scorer-zeros",
    ]);
    expect(boundaries.controls.find((control) => control.id === "show-pauls-boundary")).toMatchObject({
      kind: "toggle",
      label: "T = 0.173 · |σ|^{1.61}",
    });
    expect(boundaries.controls.find((control) => control.id === "show-frac-t-slice-boundary")).toMatchObject({
      kind: "toggle",
      label: "{T} boundary",
    });
    expect(boundaries.controls.find((control) => control.id === "show-frac-t-slice-boundary")).not.toHaveProperty("labelColor");
    expect(boundaries.controls.find((control) => control.id === "show-frac-t-closed-boundary")).toMatchObject({
      kind: "toggle",
      label: "{T} formula",
    });
    expect(boundaries.controls.find((control) => control.id === "show-frac-t-closed-boundary")).not.toHaveProperty("labelColor");
    expect(boundaries.controls.find((control) => control.id === "show-frac-t-fourier-boundary")).toMatchObject({
      kind: "toggle",
      label: "{T} Fourier",
    });
    expect(boundaries.controls.find((control) => control.id === "show-frac-t-fourier-boundary")).not.toHaveProperty("labelColor");
    expect(boundaries.controls.find((control) => control.id === "show-frac-t-smooth-ap-boundary")).toMatchObject({
      kind: "toggle",
      label: "T = a(ϑ) · |σ|^{p(ϑ)}",
    });
    expect(boundaries.controls.find((control) => control.id === "show-frac-t-smooth-ap-boundary")).not.toHaveProperty("labelColor");
    expect(boundaries.controls.find((control) => control.id === "show-boundary")).toMatchObject({
      kind: "toggle",
      label: "π-boundary: T = ((|σ| + 2π)/π)^(1/0.62)",
    });
    expect(boundaries.controls.find((control) => control.id === "show-arias-boundary")).toMatchObject({
      kind: "toggle",
      label: "Arias: −σ = 2.2 · T^(2/3)",
    });
    expect(boundaries.controls.find((control) => control.id === "show-imag-cube-root-boundary")).toMatchObject({
      kind: "toggle",
      label: "σ = −0.81975 · t^(1/3)",
    });
    expect(boundaries.controls.find((control) => control.id === "show-imag-cube-root-series-boundary")).toMatchObject({
      kind: "toggle",
      label: "σ = −0.81975 · t^(1/3) − 1.3 · t^(1/6) − 0.57",
    });
    expect(boundaries.controls.find((control) => control.id === "show-theorem5-boundary")).toMatchObject({
      kind: "toggle",
      label: "Thm 5: −σ = 0.81974·t^(1/3) + 1.30445·t^(1/6) + 0.57973",
    });
    expect(boundaries.controls.find((control) => control.id === "show-theorem5-points")).toMatchObject({
      kind: "toggle",
      label: "ρ_N^(ν), both resonances, N = 1…4000",
    });
    expect(boundaries.controls.find((control) => control.id === "show-scorer-expansion-points")).toMatchObject({
      kind: "toggle",
      label: "s_N,± (eq. 37), n = 1, 2, 3, N = 1…4000",
    });
    expect(boundaries.controls.find((control) => control.id === "show-scorer-zeros")).toMatchObject({
      kind: "toggle",
      label: "Left-most Scorer zeros (computed), both resonances, T up to 13000",
    });
    const moved = buildToolboxSections(args({
      display: {
        ...DEFAULT_STATE.display,
        fracTJustOne: 0.047,
        showFracTSliceBoundary: true,
        showFracTClosedBoundary: true,
        showFracTFourierBoundary: true,
        showFracTSmoothApBoundary: true,
      },
    }));
    const movedBoundaries = moved.find((section) => section.id === "boundaries");
    if (movedBoundaries?.controls === undefined) throw new Error("boundaries section was not found");
    expect(movedBoundaries.controls.find((control) => control.id === "show-frac-t-slice-boundary")).toMatchObject({
      kind: "toggle",
      label: fracTSliceBoundaryLabel(0.047),
      labelColor: quarterSpectrumCss(0.047, DEFAULT_SPECTRUM_FEATHER),
    });
    expect(movedBoundaries?.controls.find((control) => control.id === "show-frac-t-closed-boundary")).toMatchObject({
      kind: "toggle",
      label: fracTClosedBoundaryLabel(0.047),
      labelColor: quarterSpectrumCss(0.047, DEFAULT_SPECTRUM_FEATHER),
    });
    expect(movedBoundaries?.controls.find((control) => control.id === "show-frac-t-fourier-boundary")).toMatchObject({
      kind: "toggle",
      label: fracTFourierBoundaryLabel(0.047),
      labelColor: quarterSpectrumCss(0.047, DEFAULT_SPECTRUM_FEATHER),
    });
    expect(movedBoundaries?.controls.find((control) => control.id === "show-frac-t-smooth-ap-boundary")).toMatchObject({
      kind: "toggle",
      label: fracTSmoothApBoundaryLabel(0.047),
      labelColor: quarterSpectrumCss(0.047, DEFAULT_SPECTRUM_FEATHER),
    });
  });

  it("adds the loaded per-resonance counts to the Scorer zeros toggle", () => {
    const sections = buildToolboxSections(args({ scorerZeroCounts: { nu0: 399, nu1: 361 } }));
    const boundaries = sections.find((section) => section.id === "boundaries");
    if (boundaries?.controls === undefined) throw new Error("boundaries section was not found");

    expect(boundaries.controls.find((control) => control.id === "show-scorer-zeros")).toMatchObject({
      kind: "toggle",
      label: "Left-most Scorer zeros (computed), both resonances, T up to 13000: 399 gold, 361 blue",
    });
  });

  it("puts reflected R2ps, zeta zeros, and zeta champions in the bottom Toggles accordion", () => {
    const r1ps = buildToolboxSections(args({ harvestFamily: "r1ps" }));
    const family = r1ps.find((section) => section.id === "harvest-family");
    expect(family?.controls?.map((control) => control.id)).toEqual(["harvest-family"]);
    const toggles = r1ps.find((section) => section.id === "toggles");
    expect(toggles).toMatchObject({ title: "Toggles", order: 3 });
    expect(toggles?.controls?.map((control) => control.id)).toEqual([
      "show-reflected-r2ps",
      "show-zeta-zeros",
      "show-zeta-champions",
    ]);
    expect(toggles?.controls?.[0]).toMatchObject({
      kind: "toggle",
      label: "reflected R2ps",
      labelColor: "#5aa0ff",
    });
    expect(toggles?.controls?.[1]).toMatchObject({
      label: "zeros of zeta",
      labelColor: "#FF00FF",
    });
    expect(toggles?.controls?.[2]).toMatchObject({
      label: "champions of zeta",
      labelColor: "#ff5252",
    });
    for (const familyId of ["siegel", "r2ps"] as const) {
      const sections = buildToolboxSections(args({ harvestFamily: familyId }));
      const section = sections.find((row) => row.id === "toggles");
      expect(section?.controls?.map((control) => control.id)).toEqual([
        "show-zeta-zeros",
        "show-zeta-champions",
      ]);
      expect(sections[sections.length - 1]?.id).toBe("toggles");
    }
  });

  it("puts the hover-info toggle in the Display section, off by default", () => {
    const sections = buildToolboxSections(args());
    const display = sections.find((section) => section.id === "display");
    const toggle = display?.controls?.find((control) => control.id === "show-zero-hover-info");
    expect(toggle).toMatchObject({
      label: "hover info (σ, T, twin)",
      value: false,
    });
    expect(display?.controls?.some((control) => control.id === "show-sigma-neg500-to-neg400")).toBe(false);
  });

  it("hides Siegel-only accordions when a hunt f(s) is selected", () => {
    const sections = buildToolboxSections(args({ harvestFamily: "r2ps" }));
    expect(sections.map((section) => section.id)).toEqual([
      "view-mode",
      "harvest-family",
      "display",
      "frac-t-histogram",
      "toggles",
    ]);
    const display = sections.find((section) => section.id === "display");
    if (display?.controls === undefined) throw new Error("display section was not found");
    expect(display.controls.some((control) => control.id === "show-sigma-neg500-to-neg400")).toBe(false);
  });

  it("does not offer drag .75–1, including while the .25–.50 radio is the live band", () => {
    const options = { include3d: true, includeYAxis: true };
    const q25 = buildDisplayAccordionControls({
      ...DEFAULT_STATE.display,
      fracTQuarterEnabled: true,
      fracTQuarterPreset: "q25",
    }, noop, options);
    expect(q25.some((control) => control.id === "frac-t-twin-drag")).toBe(false);
    const bigSigma = buildDisplayAccordionControls({
      ...DEFAULT_STATE.display,
      fracTQuarterEnabled: true,
      fracTQuarterPreset: "q25",
    }, noop, BIG_SIGMA_DISPLAY_ACCORDION_OPTIONS);
    expect(bigSigma.some((control) => control.id === "show-zero-hover-info")).toBe(false);
  });

  it("omits Y-axis, 3D, and the left-500 toggle for Big Sigma", () => {
    const controls = buildDisplayAccordionControls(
      DEFAULT_STATE.display,
      noop,
      BIG_SIGMA_DISPLAY_ACCORDION_OPTIONS,
    );
    const ids = controls.map((control) => control.id);
    expect(ids).toEqual([
      "display-view",
      "color-mode",
      "spectrum-bar-inline",
      "frac-t-just-one-digits",
      "frac-t-just-one",
      "frac-t-range",
      "frac-t-range-mode",
      "frac-t-quarter",
    ]);
    const view = controls.find((control) => control.id === "display-view");
    if (view?.kind !== "select") throw new Error("display-view is not a select");
    expect(view.options).toEqual([
      { label: "all zeros with an exact {T}", value: "exactFracT" },
      { label: "all zeros within a range of {T}", value: "rangeFracT" },
    ]);
  });

  it("defaults every Zero-sets accordion checkbox off", () => {
    expect(DEFAULT_STATE.display.showAkZerosSigmaLtNeg50).toBe(false);
    expect(DEFAULT_STATE.display.showAkZerosSigmaGtNeg50).toBe(false);
    expect(DEFAULT_STATE.display.showAkFsZerosT20k).toBe(false);
    expect(DEFAULT_STATE.display.showAkFsZerosT100k).toBe(false);
    expect(DEFAULT_STATE.display.showAkFsZerosT300k).toBe(false);
    expect(DEFAULT_STATE.display.showT3975To4000SigmaLt0).toBe(false);
    expect(DEFAULT_STATE.display.showT3975To4000Sigma0To1).toBe(false);
    expect(DEFAULT_STATE.display.showT3950To3975SigmaLt0).toBe(false);
    expect(DEFAULT_STATE.display.showT3950To3975Sigma0To1).toBe(false);
    expect(DEFAULT_STATE.display.showT3925To3950SigmaLt0).toBe(false);
    expect(DEFAULT_STATE.display.showT3925To3950Sigma0To1).toBe(false);
    expect(DEFAULT_STATE.display.showT3900To3925SigmaLt0).toBe(false);
    expect(DEFAULT_STATE.display.showT3900To3925Sigma0To1).toBe(false);
    expect(DEFAULT_STATE.display.showT398To3900SigmaNeg50ToNeg10).toBe(false);
    expect(DEFAULT_STATE.display.showT398To3900SigmaNeg20To0).toBe(false);
    expect(DEFAULT_STATE.display.showR1akNearStrip).toBe(false);
    expect(DEFAULT_STATE.display.showR1akStripTo300).toBe(false);
  });
});

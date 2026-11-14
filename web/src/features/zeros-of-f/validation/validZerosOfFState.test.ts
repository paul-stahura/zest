import { DEFAULT_STATE } from "@/features/zeros-of-f/types";
import { validZerosOfFState } from "@/features/zeros-of-f/validation/validZerosOfFState";
import { validate } from "@/shared/validation/types";

describe("validZerosOfFState display view", () => {
  it("backfills exact {T} from a saved just-one filter", () => {
    const display = { ...DEFAULT_STATE.display, fracTFilterKind: "justOne" as const };
    Reflect.deleteProperty(display, "displayView");
    const parsed = validate({ ...DEFAULT_STATE, display }, validZerosOfFState);
    expect(parsed.display.displayView).toBe("exactFracT");
    expect(parsed.display.fracTFilterKind).toBe("justOne");
  });

  it("defaults the main-zeros checkbox on when the field is missing", () => {
    const display = { ...DEFAULT_STATE.display };
    Reflect.deleteProperty(display, "showMainZeros");
    const parsed = validate({ ...DEFAULT_STATE, display }, validZerosOfFState);
    expect(parsed.display.showMainZeros).toBe(true);
  });

  it("defaults the above-curve checkbox on when the field is missing", () => {
    const display = { ...DEFAULT_STATE.display };
    Reflect.deleteProperty(display, "showAboveCurveZeros");
    const parsed = validate({ ...DEFAULT_STATE, display }, validZerosOfFState);
    expect(parsed.display.showAboveCurveZeros).toBe(true);
  });

  it("defaults the hover-info toggle off when the field is missing", () => {
    const display = { ...DEFAULT_STATE.display };
    Reflect.deleteProperty(display, "showHoverInfo");
    const parsed = validate({ ...DEFAULT_STATE, display }, validZerosOfFState);
    expect(parsed.display.showHoverInfo).toBe(false);
  });

  it("leaves the hover-info toggle off when an older save had it on", () => {
    const display = { ...DEFAULT_STATE.display, showZeroHoverInfo: true };
    Reflect.deleteProperty(display, "showHoverInfo");
    const parsed = validate({ ...DEFAULT_STATE, display }, validZerosOfFState);
    expect(parsed.display.showHoverInfo).toBe(false);
  });

  it("keeps an explicit main-zeros checkbox off", () => {
    const display = { ...DEFAULT_STATE.display, showMainZeros: false };
    const parsed = validate({ ...DEFAULT_STATE, display }, validZerosOfFState);
    expect(parsed.display.showMainZeros).toBe(false);
  });

  it("defaults the T-band overlays off when the fields are missing", () => {
    const display = { ...DEFAULT_STATE.display };
    Reflect.deleteProperty(display, "showT3900To3925SigmaLt0");
    Reflect.deleteProperty(display, "showT3975To4000Sigma0To1");
    Reflect.deleteProperty(display, "showT398To3900SigmaNeg50ToNeg10");
    const parsed = validate({ ...DEFAULT_STATE, display }, validZerosOfFState);
    expect(parsed.display.showT3900To3925SigmaLt0).toBe(false);
    expect(parsed.display.showT3975To4000Sigma0To1).toBe(false);
    expect(parsed.display.showT398To3900SigmaNeg50ToNeg10).toBe(false);
  });

  it("defaults exact-{T} digits to 3 and spectrum feather to 0.015 when missing", () => {
    const display = { ...DEFAULT_STATE.display };
    Reflect.deleteProperty(display, "fracTJustOneDigits");
    Reflect.deleteProperty(display, "spectrumFeather");
    const parsed = validate({ ...DEFAULT_STATE, display }, validZerosOfFState);
    expect(parsed.display.fracTJustOneDigits).toBe(3);
    expect(parsed.display.spectrumFeather).toBe(0.015);
  });

  it("defaults missing overlay checkboxes off", () => {
    const display = { ...DEFAULT_STATE.display };
    Reflect.deleteProperty(display, "showAkZerosSigmaLtNeg50");
    Reflect.deleteProperty(display, "showAkZerosSigmaGtNeg50");
    Reflect.deleteProperty(display, "showAkFsZerosT20k");
    Reflect.deleteProperty(display, "showAkFsZerosT100k");
    Reflect.deleteProperty(display, "showAkFsZerosT300k");
    Reflect.deleteProperty(display, "showR1akNearStrip");
    Reflect.deleteProperty(display, "showR1akStripTo300");
    Reflect.deleteProperty(display, "showImagCubeRootBoundary");
    Reflect.deleteProperty(display, "showImagCubeRootSeriesBoundary");
    Reflect.deleteProperty(display, "showTheorem5Boundary");
    Reflect.deleteProperty(display, "showTheorem5Points");
    Reflect.deleteProperty(display, "showScorerExpansionPoints");
    Reflect.deleteProperty(display, "showScorerZeros");
    const parsed = validate({ ...DEFAULT_STATE, display }, validZerosOfFState);
    expect(parsed.display.showAkZerosSigmaGtNeg50).toBe(false);
    expect(parsed.display.showAkZerosSigmaLtNeg50).toBe(false);
    expect(parsed.display.showR1akNearStrip).toBe(false);
    expect(parsed.display.showR1akStripTo300).toBe(false);
    expect(parsed.display.showImagCubeRootBoundary).toBe(false);
    expect(parsed.display.showImagCubeRootSeriesBoundary).toBe(false);
    expect(parsed.display.showTheorem5Boundary).toBe(false);
    expect(parsed.display.showTheorem5Points).toBe(false);
    expect(parsed.display.showScorerExpansionPoints).toBe(false);
    expect(parsed.display.showScorerZeros).toBe(false);
  });

  it("keeps an explicit 3D view and forces the range filter", () => {
    const parsed = validate({
      ...DEFAULT_STATE,
      display: {
        ...DEFAULT_STATE.display,
        displayView: "fracT3d",
        fracTFilterKind: "justOne",
      },
    }, validZerosOfFState);
    expect(parsed.display.displayView).toBe("fracT3d");
    expect(parsed.display.fracTFilterKind).toBe("range");
  });

  it("defaults harvestFamily to Siegel when the field is missing", () => {
    const raw = { ...DEFAULT_STATE };
    Reflect.deleteProperty(raw, "harvestFamily");
    const parsed = validate(raw, validZerosOfFState);
    expect(parsed.harvestFamily).toBe("siegel");
  });
});

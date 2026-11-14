import {
  parseMainWorkspaceSerializedState,
  validMainWorkspaceSerializedState,
} from "@/features/main-workspace/validation/validMainWorkspaceSerializedState";
import { validate } from "@/shared/validation/types";
import { IoError } from "@/shared/io/errors";

const minimalState = {
  sigma: 0.5,
  index: 12,
  usePolyImag: false,
  extendSpiralCount: 0,
  spiralVisible: true,
  drawMode: "all" as const,
  showZetaEndpoint: true,
  showBisectorPoint: 1,
  zetaMethod: "ems" as const,
};

describe("validMainWorkspaceSerializedState", () => {
  it("accepts optional imported points", () => {
    const value = validate(
      {
        ...minimalState,
        importedPoints: [{ x: 1, y: 2 }],
      },
      validMainWorkspaceSerializedState,
    );
    expect(value.sigma).toBe(0.5);
    expect(value.index).toBe(12);
    expect(value.importedPoints).toEqual([{ x: 1, y: 2 }]);
  });

  it("coerces legacy boolean showBisectorPoint", () => {
    const on = validate(
      { ...minimalState, showBisectorPoint: true },
      validMainWorkspaceSerializedState,
    );
    expect(on.showBisectorPoint).toBe(1);
    const off = validate(
      { ...minimalState, showBisectorPoint: false },
      validMainWorkspaceSerializedState,
    );
    expect(off.showBisectorPoint).toBe(0);
  });

  it("defaults Σ_1x and Σ_2x matrix toggles off and accepts them when present", () => {
    const omitted = validate(minimalState, validMainWorkspaceSerializedState);
    expect(omitted.sumXVisible).toBe(false);
    expect(omitted.sumXReflect).toBe(false);
    expect(omitted.sum2xVisible).toBe(false);
    expect(omitted.sum2xReflect).toBe(false);
    const on = validate(
      { ...minimalState, sumXVisible: true, sumXReflect: true, sum2xVisible: true, sum2xReflect: true },
      validMainWorkspaceSerializedState,
    );
    expect(on.sumXVisible).toBe(true);
    expect(on.sumXReflect).toBe(true);
    expect(on.sum2xVisible).toBe(true);
    expect(on.sum2xReflect).toBe(true);
  });

  it("defaults the origin target toggle off and accepts it when present", () => {
    const omitted = validate(minimalState, validMainWorkspaceSerializedState);
    expect(omitted.showOrigin).toBe(false);
    const on = validate(
      { ...minimalState, showOrigin: true },
      validMainWorkspaceSerializedState,
    );
    expect(on.showOrigin).toBe(true);
  });

  it("defaults the ζ′→ζ line toggle off and accepts it when present", () => {
    const omitted = validate(minimalState, validMainWorkspaceSerializedState);
    expect(omitted.showZetaPrimeToZeta).toBe(false);
    const on = validate(
      { ...minimalState, showZetaPrimeToZeta: true },
      validMainWorkspaceSerializedState,
    );
    expect(on.showZetaPrimeToZeta).toBe(true);
  });

  it("defaults the right-angle toggle off and accepts it when present", () => {
    const omitted = validate(minimalState, validMainWorkspaceSerializedState);
    expect(omitted.showRightAngle).toBe(false);
    const on = validate(
      { ...minimalState, showRightAngle: true },
      validMainWorkspaceSerializedState,
    );
    expect(on.showRightAngle).toBe(true);
  });

  it("defaults the M₁*–M₂* polyline toggle off and accepts it when present", () => {
    const omitted = validate(minimalState, validMainWorkspaceSerializedState);
    expect(omitted.showMStar).toBe(false);
    const on = validate(
      { ...minimalState, showMStar: true },
      validMainWorkspaceSerializedState,
    );
    expect(on.showMStar).toBe(true);
  });

  it("defaults the ρ point toggle off and accepts it when present", () => {
    const omitted = validate(minimalState, validMainWorkspaceSerializedState);
    expect(omitted.showRho).toBe(false);
    const on = validate(
      { ...minimalState, showRho: true },
      validMainWorkspaceSerializedState,
    );
    expect(on.showRho).toBe(true);
  });

  it("defaults the 1−ρ point toggle off and accepts it when present", () => {
    const omitted = validate(minimalState, validMainWorkspaceSerializedState);
    expect(omitted.showOneMinusRho).toBe(false);
    const on = validate(
      { ...minimalState, showOneMinusRho: true },
      validMainWorkspaceSerializedState,
    );
    expect(on.showOneMinusRho).toBe(true);
  });

  it("defaults the ζ′/ζ point toggle off and accepts it when present", () => {
    const omitted = validate(minimalState, validMainWorkspaceSerializedState);
    expect(omitted.showZetaLogDeriv).toBe(false);
    const on = validate(
      { ...minimalState, showZetaLogDeriv: true },
      validMainWorkspaceSerializedState,
    );
    expect(on.showZetaLogDeriv).toBe(true);
  });

  it("defaults the h* offset toggle off and accepts it when present", () => {
    const omitted = validate(minimalState, validMainWorkspaceSerializedState);
    expect(omitted.showHStar).toBe(false);
    const on = validate(
      { ...minimalState, showHStar: true },
      validMainWorkspaceSerializedState,
    );
    expect(on.showHStar).toBe(true);
  });

  it("defaults the AK saddle toggles off and accepts them when present", () => {
    const omitted = validate(minimalState, validMainWorkspaceSerializedState);
    expect(omitted.showAkG0).toBe(false);
    expect(omitted.showAkQ0).toBe(false);
    expect(omitted.showAkQ1).toBe(false);
    expect(omitted.showAkQ2).toBe(false);
    expect(omitted.showAkQ3).toBe(false);
    expect(omitted.showAkQ4).toBe(false);
    expect(omitted.showAkSum).toBe(false);
    const on = validate(
      { ...minimalState, showAkG0: true, showAkQ0: true, showAkQ1: true, showAkQ2: true, showAkQ3: true, showAkQ4: true, showAkSum: true },
      validMainWorkspaceSerializedState,
    );
    expect(on.showAkQ3).toBe(true);
    expect(on.showAkQ4).toBe(true);
    expect(on.showAkG0).toBe(true);
    expect(on.showAkSum).toBe(true);
  });

  it("defaults the χ′/χ point toggle off and accepts it when present", () => {
    const omitted = validate(minimalState, validMainWorkspaceSerializedState);
    expect(omitted.showChiLogDeriv).toBe(false);
    const on = validate(
      { ...minimalState, showChiLogDeriv: true },
      validMainWorkspaceSerializedState,
    );
    expect(on.showChiLogDeriv).toBe(true);
  });

  it("defaults the Z′ reflect toggle off and accepts it when present", () => {
    const omitted = validate(minimalState, validMainWorkspaceSerializedState);
    expect(omitted.zPrimeReflect).toBe(false);
    const on = validate(
      { ...minimalState, zPrimeReflect: true },
      validMainWorkspaceSerializedState,
    );
    expect(on.zPrimeReflect).toBe(true);
  });

  it("defaults the Hurwitz machine off with Titchmarsh L1 χ and accepts it when present", () => {
    const omitted = validate(minimalState, validMainWorkspaceSerializedState);
    expect(omitted.hmEnabled).toBe(false);
    expect(omitted.hmCoeffs).toEqual([
      { re: 0, im: 0 },
      { re: 1, im: 0 },
      { re: 0, im: 1 },
      { re: 0, im: -1 },
      { re: -1, im: 0 },
    ]);
    expect(omitted.hmSpiralMode).toBe(0);
    expect(omitted.hmPhantomMode).toBe(2);
    expect(omitted.hmPerp).toBe(false);
    expect(omitted.hpRows).toEqual([]);
    expect(omitted.hpCircle).toBe(false);
    expect(omitted.hpShowSpiral).toBe(false);
    expect(omitted.hpShowReverse).toBe(false);
    expect(omitted.hpShowOH).toBe(false);
    expect(omitted.hpShowPerp).toBe(false);
    expect(omitted.hpShowBLink).toBe(true);
    expect(omitted.hpShowBPoint).toBe(true);
    expect(omitted.hpShowQ2Circle).toBe(false);
    expect(omitted.hpShowQ3Circle).toBe(false);
    expect(omitted.hpShowQ4Circle).toBe(false);
    expect(omitted.hpShowQ5Circle).toBe(false);
    expect(omitted.hpShowQ6Circle).toBe(false);
    expect(omitted.hpShowH).toBe(false);
    expect(omitted.hpShowB1Star).toBe(false);
    expect(omitted.hpQ2OmegaOn).toBe(false);
    expect(omitted.hpQ2OmegaDeg).toBe(0);
    expect(omitted.hpQ2OmegaLock).toBe(false);
    expect(omitted.hpOmegaOn).toBe(false);
    expect(omitted.hpOmegaDeg).toBe(0);
    expect(omitted.hpQ3OmegaLock).toBe(false);
    expect(omitted.hpQ4OmegaOn).toBe(false);
    expect(omitted.hpQ4OmegaDeg).toBe(0);
    expect(omitted.hpQ4OmegaLock).toBe(false);
    expect(omitted.hpQ5OmegaOn).toBe(false);
    expect(omitted.hpQ5OmegaDeg).toBe(0);
    expect(omitted.hpQ5OmegaLock).toBe(false);
    expect(omitted.hpQ6OmegaOn).toBe(false);
    expect(omitted.hpQ6OmegaDeg).toBe(0);
    expect(omitted.hpQ6OmegaLock).toBe(false);
    expect(omitted.hfQMax).toBe(2);
    expect(omitted.hfSingle).toBe(true);
    expect(omitted.hfShowSpiral).toBe(false);
    expect(omitted.hfShowReverse).toBe(false);
    expect(omitted.hfShowBLink).toBe(false);
    expect(omitted.hfShowBPoint).toBe(false);
    expect(omitted.hfShowOZ).toBe(false);
    expect(omitted.hfShowPerp).toBe(false);
    expect(omitted.hfShowCircle).toBe(false);
    expect(omitted.hfShowOH).toBe(false);
    const on = validate(
      {
        ...minimalState,
        hmEnabled: true,
        hmCoeffs: [{ re: 1, im: 0 }],
        hmSpiralMode: 2,
      },
      validMainWorkspaceSerializedState,
    );
    expect(on.hmEnabled).toBe(true);
    expect(on.hmCoeffs).toEqual([{ re: 1, im: 0 }]);
    expect(on.hmSpiralMode).toBe(2);
    const withRows = validate(
      {
        ...minimalState,
        hpRows: [{ id: "q2-neg-i", draw: true, lines: false }],
        hpCircle: true,
        hpShowSpiral: false,
        hpShowReverse: true,
        hpShowOH: true,
        hpShowPerp: false,
        hpShowBLink: true,
        hpShowBPoint: true,
        hpShowQ2Circle: true,
        hpShowQ3Circle: true,
        hpShowQ4Circle: true,
        hpShowQ5Circle: true,
        hpShowQ6Circle: true,
        hpShowH: true,
        hpShowB1Star: true,
        hpQ2OmegaOn: true,
        hpQ2OmegaDeg: 30,
        hpQ2OmegaLock: true,
        hpOmegaOn: true,
        hpOmegaDeg: 45,
        hpQ3OmegaLock: true,
        hpQ4OmegaOn: true,
        hpQ4OmegaDeg: 60,
        hpQ4OmegaLock: true,
        hpQ5OmegaOn: true,
        hpQ5OmegaDeg: 90,
        hpQ5OmegaLock: true,
        hpQ6OmegaOn: true,
        hpQ6OmegaDeg: 120,
        hpQ6OmegaLock: true,
        hfQMax: 7,
        hfSingle: true,
        hfShowSpiral: false,
        hfShowReverse: true,
        hfShowBLink: true,
        hfShowBPoint: false,
        hfShowOZ: true,
        hfShowPerp: true,
        hfShowCircle: true,
        hfShowOH: true,
      },
      validMainWorkspaceSerializedState,
    );
    expect(withRows.hpRows).toEqual([{ id: "q2-neg-i", on: true }]);
    expect(withRows.hpCircle).toBe(true);
    expect(withRows.hpShowSpiral).toBe(false);
    expect(withRows.hpShowReverse).toBe(true);
    expect(withRows.hpShowOH).toBe(true);
    expect(withRows.hpShowPerp).toBe(false);
    expect(withRows.hpShowBLink).toBe(true);
    expect(withRows.hpShowBPoint).toBe(true);
    expect(withRows.hpShowQ2Circle).toBe(true);
    expect(withRows.hpShowQ3Circle).toBe(true);
    expect(withRows.hpShowQ4Circle).toBe(true);
    expect(withRows.hpShowQ5Circle).toBe(true);
    expect(withRows.hpShowQ6Circle).toBe(true);
    expect(withRows.hpShowH).toBe(true);
    expect(withRows.hpShowB1Star).toBe(true);
    expect(withRows.hpQ2OmegaOn).toBe(true);
    expect(withRows.hpQ2OmegaDeg).toBe(30);
    expect(withRows.hpQ2OmegaLock).toBe(true);
    expect(withRows.hpOmegaOn).toBe(true);
    expect(withRows.hpOmegaDeg).toBe(45);
    expect(withRows.hpQ3OmegaLock).toBe(true);
    expect(withRows.hpQ4OmegaOn).toBe(true);
    expect(withRows.hpQ4OmegaDeg).toBe(60);
    expect(withRows.hpQ4OmegaLock).toBe(true);
    expect(withRows.hpQ5OmegaOn).toBe(true);
    expect(withRows.hpQ5OmegaDeg).toBe(90);
    expect(withRows.hpQ5OmegaLock).toBe(true);
    expect(withRows.hpQ6OmegaOn).toBe(true);
    expect(withRows.hpQ6OmegaDeg).toBe(120);
    expect(withRows.hpQ6OmegaLock).toBe(true);
    expect(withRows.hfQMax).toBe(7);
    expect(withRows.hfSingle).toBe(true);
    expect(withRows.hfShowSpiral).toBe(false);
    expect(withRows.hfShowReverse).toBe(true);
    expect(withRows.hfShowBLink).toBe(true);
    expect(withRows.hfShowBPoint).toBe(false);
    expect(withRows.hfShowOZ).toBe(true);
    expect(withRows.hfShowPerp).toBe(true);
    expect(withRows.hfShowCircle).toBe(true);
    expect(withRows.hfShowOH).toBe(true);
    const withOn = validate(
      {
        ...minimalState,
        hpRows: [{ id: "q2-neg-i", on: true }],
      },
      validMainWorkspaceSerializedState,
    );
    expect(withOn.hpRows).toEqual([{ id: "q2-neg-i", on: true }]);
  });

  it("defaults the Titchmarsh L1 L2 row off and both, and accepts it when present", () => {
    const omitted = validate(minimalState, validMainWorkspaceSerializedState);
    expect(omitted.lfTLEnabled).toBe(false);
    expect(omitted.lfTLWhich).toBe(2);
    expect(omitted.lfTLSpiralMode).toBe(0);
    expect(omitted.lfTLReflect).toBe(false);
    expect(omitted.lfTLBisector).toBe(false);
    const on = validate(
      { ...minimalState, lfTLEnabled: true, lfTLWhich: 0, lfTLSpiralMode: 2 },
      validMainWorkspaceSerializedState,
    );
    expect(on.lfTLEnabled).toBe(true);
    expect(on.lfTLWhich).toBe(0);
    expect(on.lfTLSpiralMode).toBe(2);
  });

  it("defaults the f_L row off and accepts it when present", () => {
    const omitted = validate(minimalState, validMainWorkspaceSerializedState);
    expect(omitted.lfFLEnabled).toBe(false);
    expect(omitted.lfFLSpiralMode).toBe(0);
    expect(omitted.lfFLReflect).toBe(false);
    expect(omitted.lfFLBisector).toBe(false);
    const on = validate(
      { ...minimalState, lfFLEnabled: true, lfFLSpiralMode: 2 },
      validMainWorkspaceSerializedState,
    );
    expect(on.lfFLEnabled).toBe(true);
    expect(on.lfFLSpiralMode).toBe(2);
  });

  it("defaults the crossing-sum and all-remainders toggles off and accepts them when present", () => {
    const omitted = validate(minimalState, validMainWorkspaceSerializedState);
    expect(omitted.crossingSumVisible).toBe(false);
    expect(omitted.allRemaindersVisible).toBe(false);
    const on = validate(
      { ...minimalState, crossingSumVisible: true, allRemaindersVisible: true },
      validMainWorkspaceSerializedState,
    );
    expect(on.crossingSumVisible).toBe(true);
    expect(on.allRemaindersVisible).toBe(true);
  });
});

describe("parseMainWorkspaceSerializedState", () => {
  it("parses JSON text", () => {
    const text = JSON.stringify({
      ...minimalState,
      sigma: 0.25,
      drawMode: "upToSum1",
    });
    const parsed = parseMainWorkspaceSerializedState("cid", text);
    expect(parsed.sigma).toBe(0.25);
    expect(parsed.drawMode).toBe("upToSum1");
  });

  it("throws IoError for invalid JSON", () => {
    expect(() => parseMainWorkspaceSerializedState("cid", "{")).toThrow(IoError);
  });
});

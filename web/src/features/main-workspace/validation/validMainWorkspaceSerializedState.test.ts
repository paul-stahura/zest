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

  it("defaults the crossing-sum toggle off and accepts it when present", () => {
    const omitted = validate(minimalState, validMainWorkspaceSerializedState);
    expect(omitted.crossingSumVisible).toBe(false);
    const on = validate(
      { ...minimalState, crossingSumVisible: true },
      validMainWorkspaceSerializedState,
    );
    expect(on.crossingSumVisible).toBe(true);
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

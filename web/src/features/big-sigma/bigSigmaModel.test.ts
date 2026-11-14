import { BigSigmaModel } from "@/features/big-sigma/bigSigmaModel";
import type { ToolboxContext } from "@/shared/visualization/contracts";

function toolboxCtx(model: BigSigmaModel): ToolboxContext {
  return {
    correlationId: "test",
    visualizationId: "big-sigma",
    visualizationModel: model,
    exportContext: {
      correlationId: "test",
      visualizationId: "big-sigma",
      visualizationModel: model,
      getSerializableState: () => model.getSerializableState(),
    },
    selectionState: { activePoint: null },
    requestToolboxRefresh: () => undefined,
  };
}

describe("BigSigmaModel", () => {
  it("defaults σ range to −10…1 and clamps σ into that range on restore", () => {
    const model = new BigSigmaModel();
    const start = model.getSerializableState() as {
      sigma: number;
      sigmaMin: number;
      sigmaMax: number;
      showR1ak: boolean;
    };
    expect(start.sigmaMin).toBe(-10);
    expect(start.sigmaMax).toBe(1);
    expect(start.sigma).toBe(0.5);
    expect(start.showR1ak).toBe(true);
    model.restoreSerializableState({ sigma: -40, sigmaMin: -10, sigmaMax: 1, index: 6.18, showR1ak: false });
    const after = model.getSerializableState() as { sigma: number; showR1ak: boolean };
    expect(after.sigma).toBe(-10);
    expect(after.showR1ak).toBe(false);
    model.dispose();
  });

  it("clamps the zeros dimmer into [0, 1] on restore", () => {
    const model = new BigSigmaModel();
    model.restoreSerializableState({ zerosDimmer: 2, sigma: 0.5, sigmaMin: -10, sigmaMax: 1, index: 6.18, showR1ak: true });
    const after = model.getSerializableState();
    if (typeof after !== "object" || after === null || !("zerosDimmer" in after)) {
      throw new Error("missing zerosDimmer");
    }
    expect(after.zerosDimmer).toBe(1);
    model.restoreSerializableState({ zerosDimmer: -0.2 });
    const again = model.getSerializableState();
    if (typeof again !== "object" || again === null || !("zerosDimmer" in again)) {
      throw new Error("missing zerosDimmer");
    }
    expect(again.zerosDimmer).toBe(0);
    model.dispose();
  });

  it("restores the entire vs ⌊T⌋ chain toggle", () => {
    const model = new BigSigmaModel();
    model.restoreSerializableState({ chainExtent: "entire" });
    const after = model.getSerializableState();
    if (typeof after !== "object" || after === null || !("chainExtent" in after)) {
      throw new Error("missing chainExtent");
    }
    expect(after.chainExtent).toBe("entire");
    model.dispose();
  });

  it("defaults last-links off at n=2 and restores a clamped count", () => {
    const model = new BigSigmaModel();
    const start = model.getSerializableState();
    if (typeof start !== "object" || start === null
      || !("lastLinksOnly" in start) || !("lastLinksCount" in start)) {
      throw new Error("missing last-links fields");
    }
    expect(start.lastLinksOnly).toBe(false);
    expect(start.lastLinksCount).toBe(2);
    model.restoreSerializableState({ lastLinksOnly: true, lastLinksCount: 99 });
    const after = model.getSerializableState();
    if (typeof after !== "object" || after === null
      || !("lastLinksOnly" in after) || !("lastLinksCount" in after)) {
      throw new Error("missing last-links after restore");
    }
    expect(after.lastLinksOnly).toBe(true);
    expect(after.lastLinksCount).toBe(10);
    model.dispose();
  });

  it("defaults annimate max to 3 and restores a radio speed", () => {
    const model = new BigSigmaModel();
    const start = model.getSerializableState();
    if (typeof start !== "object" || start === null || !("animSpeedMax" in start)) {
      throw new Error("missing animSpeedMax");
    }
    expect(start.animSpeedMax).toBe(3);
    model.restoreSerializableState({ animSpeedMax: 5 });
    const after = model.getSerializableState();
    if (typeof after !== "object" || after === null || !("animSpeedMax" in after)) {
      throw new Error("missing animSpeedMax");
    }
    expect(after.animSpeedMax).toBe(5);
    model.dispose();
  });

  it("defaults chain color to control cyan and restores a zero-sourced tint", () => {
    const model = new BigSigmaModel();
    const start = model.getSerializableState();
    if (typeof start !== "object" || start === null || !("chainFromZero" in start)) {
      throw new Error("missing chainFromZero");
    }
    expect(start.chainFromZero).toBe(false);
    model.restoreSerializableState({ chainFromZero: true });
    const after = model.getSerializableState();
    if (typeof after !== "object" || after === null || !("chainFromZero" in after)) {
      throw new Error("missing chainFromZero");
    }
    expect(after.chainFromZero).toBe(true);
    model.dispose();
  });

  it("clamps restored T so the integer part cannot exceed 4000", () => {
    const model = new BigSigmaModel();
    model.restoreSerializableState({ index: 9000 });
    const after = model.getSerializableState();
    if (typeof after !== "object" || after === null || !("index" in after)) {
      throw new Error("missing index");
    }
    expect(after.index).toBeLessThan(4001);
    expect(Math.trunc(Number(after.index))).toBe(4000);
    model.dispose();
  });

  it("defaults the σ, T crosshair on", () => {
    const model = new BigSigmaModel();
    const start = model.getSerializableState();
    if (typeof start !== "object" || start === null || !("showCrosshair" in start)) {
      throw new Error("missing showCrosshair");
    }
    expect(start.showCrosshair).toBe(true);
    model.dispose();
  });

  it("exposes the planar Display accordion and persists its filter", () => {
    const model = new BigSigmaModel();
    const sections = model.getToolboxContributions(toolboxCtx(model));
    expect(sections.map((section) => section.id)).toEqual([
      "harvest-family",
      "top-controls",
      "display",
    ]);
    const display = sections.find((section) => section.id === "display");
    if (display?.controls === undefined) throw new Error("display section was not found");
    expect(display.controls.map((control) => control.id)).not.toContain("y-axis-mode");
    expect(display.controls.map((control) => control.id)).not.toContain("show-sigma-neg500-to-neg400");
    expect(display.controls.map((control) => control.id)).not.toContain("frac-t-3d-depth");
    const view = display.controls.find((control) => control.id === "display-view");
    if (view?.kind !== "select") throw new Error("display-view is not a select");
    expect(view.options.some((option) => option.value === "fracT3d")).toBe(false);
    view.onChange("exactFracT");
    const after = model.getSerializableState();
    if (typeof after !== "object" || after === null || !("display" in after)) {
      throw new Error("missing display");
    }
    const saved = after.display;
    if (typeof saved !== "object" || saved === null || !("displayView" in saved)) {
      throw new Error("missing displayView");
    }
    expect(saved.displayView).toBe("exactFracT");
    model.restoreSerializableState({
      display: { displayView: "fracT3d", colorMode: "grayscale", fracTJustOne: 0.2 },
    });
    const again = model.getSerializableState();
    if (typeof again !== "object" || again === null || !("display" in again)) {
      throw new Error("missing display after restore");
    }
    const restored = again.display;
    if (typeof restored !== "object" || restored === null) {
      throw new Error("display is not an object");
    }
    expect(restored).toMatchObject({
      displayView: "rangeFracT",
      colorMode: "grayscale",
    });
    model.dispose();
  });

  it("puts the f(s) dropdown first and restores the packed harvest", () => {
    const model = new BigSigmaModel();
    const sections = model.getToolboxContributions(toolboxCtx(model));
    expect(sections[0]?.id).toBe("harvest-family");
    const family = sections[0]?.controls?.find((control) => control.id === "harvest-family");
    if (family?.kind !== "select") throw new Error("harvest-family select was not found");
    expect(family.label).toBe("f(s)");
    expect(family.options).toEqual([
      { label: "Siegel's f(s)", value: "siegel" },
      { label: "R1ps f(s)", value: "r1ps" },
    ]);
    expect(family.value).toBe("siegel");
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(null, { status: 404 })));
    family.onChange("r1ps");
    const after = model.getSerializableState();
    if (typeof after !== "object" || after === null || !("harvestFamily" in after)) {
      throw new Error("missing harvestFamily");
    }
    expect(after.harvestFamily).toBe("r1ps");
    const labeled = model.getToolboxContributions(toolboxCtx(model));
    const remainder = labeled
      .find((section) => section.id === "top-controls")
      ?.controls
      ?.find((control) => control.id === "show-r1ak");
    if (remainder?.kind !== "toggle") throw new Error("remainder toggle was not found");
    expect(remainder.label).toBe("R1ps");
    model.restoreSerializableState({ harvestFamily: "nope" });
    const restored = model.getSerializableState();
    if (typeof restored !== "object" || restored === null || !("harvestFamily" in restored)) {
      throw new Error("missing harvestFamily after restore");
    }
    expect(restored.harvestFamily).toBe("siegel");
    vi.unstubAllGlobals();
    model.dispose();
  });
});

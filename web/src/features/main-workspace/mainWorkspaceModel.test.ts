import { MainWorkspaceModel } from "@/features/main-workspace/mainWorkspaceModel";

const minimalRestore = {
  sigma: 0.5,
  index: 10,
  usePolyImag: false,
  extendSpiralCount: 0,
  spiralVisible: true,
  drawMode: "all" as const,
  showZetaEndpoint: true,
  showBisectorPoint: 1,
  zetaMethod: "ems" as const,
};

describe("MainWorkspaceModel session restore", () => {
  it("clears imported scatter when serialized state omits importedPoints", () => {
    const model = new MainWorkspaceModel();
    try {
      model.initialize();
      model.applyImportedDataset({ kind: "pointSet", label: "t", points: [{ x: 1, y: 2 }] });
      expect(model.getScatterPointsForExport()).toHaveLength(1);
      expect(model.getSelectionState().activePoint).toEqual({ x: 1, y: 2 });

      model.restoreSerializableState({
        ...minimalRestore,
      });

      expect(model.getScatterPointsForExport()).toHaveLength(0);
      expect(model.getSelectionState().activePoint).toBeNull();
    } finally {
      model.dispose();
    }
  });

  it("clears scatter when serialized state sets importedPoints to an empty array", () => {
    const model = new MainWorkspaceModel();
    try {
      model.initialize();
      model.applyImportedDataset({ kind: "pointSet", label: "t", points: [{ x: 3, y: 4 }] });
      model.restoreSerializableState({
        ...minimalRestore,
        importedPoints: [],
      });
      expect(model.getScatterPointsForExport()).toHaveLength(0);
      expect(model.getSelectionState().activePoint).toBeNull();
    } finally {
      model.dispose();
    }
  });

  it("round-trips zeta parameters via restoreSerializableState", () => {
    const model = new MainWorkspaceModel();
    try {
      model.initialize();
      model.restoreSerializableState({
        ...minimalRestore,
        sigma: 0.25,
        index: 15,
        drawMode: "bisectorLink",
      });
      const state = model.getSerializableState();
      expect(state.sigma).toBe(0.25);
      expect(state.index).toBe(15);
      expect(state.drawMode).toBe("bisectorLink");
    } finally {
      model.dispose();
    }
  });
});

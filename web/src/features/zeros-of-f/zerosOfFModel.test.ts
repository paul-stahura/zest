import { ZerosOfFModel } from "@/features/zeros-of-f/zerosOfFModel";
import { DEFAULT_STATE } from "@/features/zeros-of-f/types";
import { encodeCommittedScanBin } from "@/shared/io/committedScanBin";
import {
  CURRENT_SCAN_RESULT_SCHEMA_VERSION,
  type ScanActivity,
  type ScanBackend,
  type ScanBackendChoice,
  type ScanHandle,
  type ScanLine,
  type ScanProgress,
  type ScanProvenance,
  type ScanRequest,
  type ScanStatus,
  type ScanSummary,
  type Unsubscribe,
} from "@/shared/scan/scanBackend";
import {
  ScanArchive,
  type ArchiveEntry,
  type ArchiveKey,
  type ArchiveListing,
} from "@/shared/persistence/scanArchive";
import type { ToolboxContext } from "@/shared/visualization/contracts";

class MemoryScanArchive extends ScanArchive {
  public readonly entries: ArchiveEntry[] = [];
  public putCalls = 0;

  public override async put(entry: ArchiveEntry): Promise<void> {
    this.putCalls += 1;
    const clone = cloneEntry(entry);
    const existing = this.entries.findIndex((candidate) =>
      candidate.workspaceId === clone.workspaceId && candidate.scanId === clone.scanId);
    if (existing >= 0) {
      this.entries[existing] = clone;
      return;
    }
    this.entries.push(clone);
  }

  public override async get(key: ArchiveKey): Promise<ArchiveEntry | null> {
    return this.entries.find((entry) => entry.workspaceId === key.workspaceId && entry.scanId === key.scanId) ?? null;
  }

  public override async delete(key: ArchiveKey): Promise<void> {
    const index = this.entries.findIndex((entry) => entry.workspaceId === key.workspaceId && entry.scanId === key.scanId);
    if (index >= 0) this.entries.splice(index, 1);
  }

  public override async list(workspaceId?: string): Promise<ArchiveListing[]> {
    return this.entries
      .filter((entry) => workspaceId === undefined || entry.workspaceId === workspaceId)
      .map((entry) => ({
        workspaceId: entry.workspaceId,
        scanId: entry.scanId,
        createdAt: entry.createdAt,
        request: entry.request,
        summary: entry.summary,
        provenance: entry.provenance,
        approxBytes: entry.lines.reduce((total, line) => total + line.t.byteLength * 5, 0),
        label: entry.label,
      }));
  }
}

class MockScanHandle implements ScanHandle {
  public readonly id = "mock-scan";
  public readonly linesTotal = 0;
  public status: ScanStatus = "running";
  private readonly lineListeners = new Set<(line: ScanLine) => void>();
  private readonly progressListeners = new Set<(progress: ScanProgress) => void>();
  private readonly activityListeners = new Set<(activity: ScanActivity) => void>();
  private readonly hostedScanIdListeners = new Set<(scanId: string) => void>();
  private readonly doneListeners = new Set<(summary: ScanSummary) => void>();
  private readonly cancelledListeners = new Set<() => void>();
  private readonly errorListeners = new Set<(error: Error) => void>();

  public onLine(cb: (line: ScanLine) => void): Unsubscribe {
    this.lineListeners.add(cb);
    return () => this.lineListeners.delete(cb);
  }

  public onProgress(cb: (progress: ScanProgress) => void): Unsubscribe {
    this.progressListeners.add(cb);
    return () => this.progressListeners.delete(cb);
  }

  public onActivity(cb: (activity: ScanActivity) => void): Unsubscribe {
    this.activityListeners.add(cb);
    return () => this.activityListeners.delete(cb);
  }

  public onHostedScanId(cb: (scanId: string) => void): Unsubscribe {
    this.hostedScanIdListeners.add(cb);
    return () => this.hostedScanIdListeners.delete(cb);
  }

  public onDone(cb: (summary: ScanSummary) => void): Unsubscribe {
    this.doneListeners.add(cb);
    return () => this.doneListeners.delete(cb);
  }

  public onCancelled(cb: () => void): Unsubscribe {
    this.cancelledListeners.add(cb);
    return () => this.cancelledListeners.delete(cb);
  }

  public onError(cb: (error: Error) => void): Unsubscribe {
    this.errorListeners.add(cb);
    return () => this.errorListeners.delete(cb);
  }

  public async cancel(): Promise<void> {
    this.emitCancelled();
  }

  public pause(): void {
    this.status = "paused";
  }

  public resume(): void {
    this.status = "running";
  }

  public async getProvenance(): Promise<Omit<ScanProvenance, "partial" | "terminalStatus">> {
    return provenanceBase;
  }

  public emitLine(line: ScanLine = makeLine()): void {
    for (const cb of this.lineListeners) cb(line);
  }

  public emitProgress(progress: ScanProgress): void {
    for (const cb of this.progressListeners) cb(progress);
  }

  public emitActivity(activity: ScanActivity): void {
    for (const cb of this.activityListeners) cb(activity);
  }

  public emitHostedScanId(scanId: string): void {
    for (const cb of this.hostedScanIdListeners) cb(scanId);
  }

  public emitDone(summary: ScanSummary): void {
    this.status = "done";
    for (const cb of this.doneListeners) cb(summary);
  }

  public emitCancelled(): void {
    this.status = "cancelled";
    for (const cb of this.cancelledListeners) cb();
  }

  public emitError(error = new Error("mock scan failed")): void {
    this.status = "error";
    for (const cb of this.errorListeners) cb(error);
  }
}

class MockBackend implements ScanBackend {
  public readonly id = "mock";
  public readonly displayName = "Mock";
  public handle: MockScanHandle | null = null;

  public start(_req: ScanRequest): ScanHandle {
    this.handle = new MockScanHandle();
    return this.handle;
  }

  public dispose(): void {
    // No resources.
  }
}

const provenanceBase: Omit<ScanProvenance, "partial" | "terminalStatus"> = {
  resultSchemaVersion: CURRENT_SCAN_RESULT_SCHEMA_VERSION,
  scannerSourceHash: "sha256:scanner",
  bundleArtifactHash: "sha256:bundle",
  scannerFiles: ["src/shared/scan/scanLineAlgorithm.ts"],
  bundledAt: "2026-04-30T12:00:00.000Z",
  backend: "cloud",
  cloudProfileId: "cloud-64",
};

function cloneEntry(entry: ArchiveEntry): ArchiveEntry {
  return {
    ...entry,
    lines: entry.lines.map((line) => ({
      sigma: line.sigma,
      t: new Float64Array(line.t),
      yVal: new Float64Array(line.yVal),
      sigma1Mag: new Float64Array(line.sigma1Mag),
      r1Mag: new Float64Array(line.r1Mag),
      phaseDev: new Float64Array(line.phaseDev),
    })),
    provenance: entry.provenance === undefined ? undefined : { ...entry.provenance },
  };
}

function makeLine(): ScanLine {
  const values = new Float64Array([1.25]);
  return {
    sigma: -1,
    t: values,
    yVal: values,
    sigma1Mag: values,
    r1Mag: values,
    phaseDev: values,
  };
}

function makeArchiveEntry(scanId: string, label: string): ArchiveEntry {
  const s = DEFAULT_STATE.scan;
  return {
    workspaceId: "zeros-of-f",
    scanId,
    createdAt: Date.parse("2026-04-30T12:00:00.000Z"),
    request: {
      variant: s.variant,
      sigmaRange: { min: s.sigmaMin, max: s.sigmaMax, linesPerSigma: s.linesPerSigma },
      tRange: { min: s.tMin, max: s.tMax },
      samplesPerT: s.samplesPerT,
      bisectionIters: s.bisectionIters,
      algorithm: s.algorithm,
      acceptDepth: s.acceptDepth,
      seed: s.seed,
      workers: 0,
    },
    summary: { linesScanned: 1, pointsRecorded: 1, durationMs: 1 },
    provenance: { ...provenanceBase, partial: false, terminalStatus: "done" },
    lines: [makeLine()],
    label,
  };
}

function makeToolboxContext(model: ZerosOfFModel): ToolboxContext {
  return {
    correlationId: "test-correlation",
    visualizationId: "zeros-of-f",
    visualizationModel: model,
    exportContext: {
      correlationId: "test-correlation",
      visualizationId: "zeros-of-f",
      visualizationModel: model,
      getSerializableState: () => model.getSerializableState(),
    },
    selectionState: model.getSelectionState(),
    requestToolboxRefresh: () => {
      // Tests call controls synchronously and inspect model state directly.
    },
  };
}

/** Node's experimental localStorage is missing unless a file is configured. */
function installMemoryStorage(): void {
  if (typeof window.localStorage?.clear === "function") return;
  const memory = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      clear(): void { memory.clear(); },
      getItem(key: string): string | null { return memory.get(key) ?? null; },
      setItem(key: string, value: string): void { memory.set(key, value); },
      removeItem(key: string): void { memory.delete(key); },
    },
  });
}

describe("ZerosOfFModel", () => {
  beforeEach(() => {
    installMemoryStorage();
    document.cookie = "zerosOfFBackgroundPrefs=; Max-Age=0; Path=/";
    window.localStorage.clear();
    vi.spyOn(window, "alert").mockImplementation(() => {
      // Test avoids native alert side effects.
    });
  });

  afterEach(() => {
    installMemoryStorage();
    document.cookie = "zerosOfFBackgroundPrefs=; Max-Age=0; Path=/";
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("constructs with default state", () => {
    const model = new ZerosOfFModel();
    try {
      const s = model.getSerializableState();
      expect(s.scan.variant).toBe("R1ak");
      expect(s.scan.tMax).toBe(DEFAULT_STATE.scan.tMax);
      expect(s.display.showBoundary).toBe(DEFAULT_STATE.display.showBoundary);
      expect(s.display.showSigmaNeg500ToNeg400).toBe(false);
      expect(s.display.showMainZeros).toBe(true);
      expect(s.display.showAboveCurveZeros).toBe(true);
      expect(s.display.showHoverInfo).toBe(false);
      expect(s.display.showT3900To3925SigmaLt0).toBe(false);
      expect(s.display.showT398To3900SigmaNeg50ToNeg10).toBe(false);
      expect(s.display.showAkZerosSigmaGtNeg50).toBe(false);
      expect(s.display.showR1akNearStrip).toBe(false);
      expect(s.display.showR1akStripTo300).toBe(false);
    } finally {
      model.dispose();
    }
  });

  it("restores background controls from a local cookie", () => {
    document.cookie = `zerosOfFBackgroundPrefs=${encodeURIComponent(JSON.stringify({
      backgroundDefaultName: "",
      backgroundOpacity: 0,
      backgroundSizeMult: 1.5,
    }))}; Path=/`;
    const model = new ZerosOfFModel();
    try {
      const s = model.getSerializableState();
      expect(s.display.backgroundDefaultName).toBe("");
      expect(s.display.backgroundOpacity).toBe(0);
      expect(s.display.backgroundSizeMult).toBe(1.5);
    } finally {
      model.dispose();
    }
  });

  it("writes background control changes to a local cookie", () => {
    const model = new ZerosOfFModel();
    try {
      model.setBackgroundDefaultName("scan-x.csv");
      model.setBackgroundDisplay(0, 1.5);

      const raw = document.cookie
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("zerosOfFBackgroundPrefs="));
      if (raw === undefined) throw new Error("background prefs cookie was not written");
      const [, encodedPayload] = raw.split("=");
      if (encodedPayload === undefined) throw new Error("background prefs cookie value was missing");
      const payload = JSON.parse(decodeURIComponent(encodedPayload)) as {
        backgroundDefaultName: string;
        backgroundOpacity: number;
        backgroundSizeMult: number;
      };
      expect(payload).toEqual({
        backgroundDefaultName: "scan-x.csv",
        backgroundOpacity: 0,
        backgroundSizeMult: 1.5,
      });
    } finally {
      model.dispose();
    }
  });

  it("restores saved scan and UI settings from local storage", () => {
    window.localStorage.setItem("zerosOfFUiState", JSON.stringify({
      ...DEFAULT_STATE,
      scan: {
        ...DEFAULT_STATE.scan,
        tMin: 25,
        tMax: 525,
        sigmaMin: -250,
        sigmaMax: -10,
        linesPerSigma: 48,
        algorithm: "minima",
      },
      display: {
        ...DEFAULT_STATE.display,
        colorMode: "depth",
        showBoundary: true,
        showScanRect: true,
        yAxisMode: "fracT",
      },
      backendId: "cloud-96",
      workersHint: 16,
      activeScanId: "scan-from-export",
      view: { panX: 12, panY: 34, zoom: 2 },
    }));
    const model = new ZerosOfFModel();
    try {
      const s = model.getSerializableState();
      expect(s.scan.tMin).toBe(25);
      expect(s.scan.tMax).toBe(525);
      expect(s.scan.linesPerSigma).toBe(48);
      expect(s.scan.algorithm).toBe("minima");
      expect(s.display.colorMode).toBe("depth");
      expect(s.display.showBoundary).toBe(true);
      expect(s.display.showScanRect).toBe(true);
      expect(s.display.yAxisMode).toBe("fracT");
      expect(s.backendId).toBe("cloud-96");
      expect(s.workersHint).toBe(16);
      expect(s.activeScanId).toBeNull();
      expect(s.view).toEqual({ panX: 12, panY: 34, zoom: 2 });
    } finally {
      model.dispose();
    }
  });

  it("persists scan setting changes without saving active archive ids", () => {
    const model = new ZerosOfFModel();
    try {
      model.restoreSerializableState({
        ...DEFAULT_STATE,
        activeScanId: "archive-scan",
      });
      model.updateScanControls({ tMin: 40, tMax: 640, samplesPerT: 1200 });

      const raw = window.localStorage.getItem("zerosOfFUiState");
      if (raw === null) throw new Error("UI prefs were not written");
      const persisted: unknown = JSON.parse(raw);
      expect(persisted).toMatchObject({
        scan: { tMin: 40, tMax: 640, samplesPerT: 1200 },
        activeScanId: null,
      });
    } finally {
      model.dispose();
    }
  });

  it("persists background display settings to the broader UI settings snapshot", () => {
    const model = new ZerosOfFModel();
    try {
      model.setBackgroundDefaultName("scan-x.csv");
      model.setBackgroundDisplay(0, 1.5);

      const raw = window.localStorage.getItem("zerosOfFUiState");
      if (raw === null) throw new Error("UI prefs were not written");
      const persisted: unknown = JSON.parse(raw);
      expect(persisted).toMatchObject({
        display: {
          backgroundDefaultName: "scan-x.csv",
          backgroundOpacity: 0,
          backgroundSizeMult: 1.5,
        },
      });
    } finally {
      model.dispose();
    }
  });

  it("puts the view-mode toggle and harvest-family dropdown first and drops Siegel accordions for R1ps", () => {
    const model = new ZerosOfFModel();
    try {
      const start = model.getToolboxContributions(makeToolboxContext(model));
      expect(start[0]?.id).toBe("view-mode");
      expect(start[1]?.id).toBe("harvest-family");
      const family = start[1]?.controls?.find((control) => control.id === "harvest-family");
      if (family?.kind !== "select") throw new Error("harvest-family select was not found");
      expect(family.options.map((option) => option.label)).toEqual([
        "Siegel's f(s)",
        "R1ps f(s)",
        "R2ps f(s)",
      ]);
      expect(family.options.map((option) => option.value)).toEqual(["siegel", "r1ps", "r2ps"]);
      family.onChange("r1ps");
      expect(model.getSerializableState().harvestFamily).toBe("r1ps");
      const r1ps = model.getToolboxContributions(makeToolboxContext(model));
      expect(r1ps.map((section) => section.id)).toEqual([
        "view-mode",
        "harvest-family",
        "display",
        "frac-t-histogram",
        "toggles",
      ]);
    } finally {
      model.dispose();
    }
  });

  it("persists display changes made through toolbox controls", () => {
    const model = new ZerosOfFModel();
    try {
      const sections = model.getToolboxContributions(makeToolboxContext(model));
      const displaySection = sections.find((section) => section.id === "display");
      const colorModeControl = displaySection?.controls?.find((control) => control.id === "color-mode");
      if (colorModeControl === undefined || colorModeControl.kind !== "select") {
        throw new Error("color-mode select control was not found");
      }
      colorModeControl.onChange("grayscale");

      const raw = window.localStorage.getItem("zerosOfFUiState");
      if (raw === null) throw new Error("UI prefs were not written");
      const persisted: unknown = JSON.parse(raw);
      expect(persisted).toMatchObject({
        display: { colorMode: "grayscale" },
      });
    } finally {
      model.dispose();
    }
  });

  it("stores engine changes in the broader UI settings snapshot", () => {
    const model = new ZerosOfFModel();
    try {
      model.restoreSerializableState({
        ...DEFAULT_STATE,
        backendId: "cloud-64",
      });

      expect(window.localStorage.getItem("zerosOfFEngine")).toBeNull();
      const raw = window.localStorage.getItem("zerosOfFUiState");
      if (raw === null) throw new Error("UI prefs were not written");
      const persisted: unknown = JSON.parse(raw);
      expect(persisted).toMatchObject({ backendId: "local" });
    } finally {
      model.dispose();
    }
  });

  it("uses browser-local execution for saved cloud preferences", () => {
    vi.stubEnv("VITE_CLOUD_SCAN_BACKEND_MODE", "hosted");
    window.localStorage.setItem("zerosOfFUiState", JSON.stringify({
      ...DEFAULT_STATE,
      backendId: "cloud-64",
    }));
    const model = new ZerosOfFModel();
    try {
      expect(model.getSerializableState().backendId).toBe("local");
    } finally {
      model.dispose();
      vi.unstubAllEnvs();
    }
  });

  it("keeps browser-local execution even with a private deployment environment", () => {
    vi.stubEnv("VITE_CLOUD_SCAN_BACKEND_MODE", "cluster");
    window.localStorage.setItem("zerosOfFUiState", JSON.stringify({
      ...DEFAULT_STATE,
      backendId: "local",
    }));
    const model = new ZerosOfFModel();
    try {
      expect(model.getSerializableState().backendId).toBe("local");
    } finally {
      model.dispose();
      vi.unstubAllEnvs();
    }
  });

  it("skips startup background load when cookie brightness is none", async () => {
    document.cookie = `zerosOfFBackgroundPrefs=${encodeURIComponent(JSON.stringify({
      backgroundDefaultName: DEFAULT_STATE.display.backgroundDefaultName,
      backgroundOpacity: 0,
      backgroundSizeMult: 1,
    }))}; Path=/`;
    const archive = new MemoryScanArchive();
    await archive.put(makeArchiveEntry("scan-default", DEFAULT_STATE.display.backgroundDefaultName));
    const backend = new MockBackend();
    const model = new ZerosOfFModel({
      archive,
      createBackend: () => backend,
    });
    try {
      model.initialize();
      await new Promise((resolve) => setTimeout(resolve, 25));
      expect(model.hasBackgroundScatter()).toBe(false);
    } finally {
      model.dispose();
    }
  });

  it("normalizes restored private execution settings to browser-local", () => {
    vi.stubEnv("VITE_CLOUD_SCAN_BACKEND_MODE", "hosted");
    const backend = new MockBackend();
    const createdChoices: ScanBackendChoice[] = [];
    const model = new ZerosOfFModel({
      createBackend: (choice) => {
        createdChoices.push(choice);
        return backend;
      },
    });
    try {
      model.restoreSerializableState({
        ...DEFAULT_STATE,
        backendId: "cloud-64",
      });

      expect(model.getSerializableState().backendId).toBe("local");
      expect(createdChoices).toContain("local");
    } finally {
      model.dispose();
      vi.unstubAllEnvs();
    }
  });

  it("ignores malformed state gracefully", () => {
    const model = new ZerosOfFModel();
    try {
      model.restoreSerializableState({ garbage: true });
      const s = model.getSerializableState();
      expect(s.scan.variant).toBe("R1ak");
    } finally {
      model.dispose();
    }
  });

  it("restores valid state", () => {
    const model = new ZerosOfFModel();
    try {
      model.restoreSerializableState({
        ...DEFAULT_STATE,
        scan: { ...DEFAULT_STATE.scan, sigmaMin: -77, sigmaMax: -33 },
      });
      const s = model.getSerializableState();
      expect(s.scan.sigmaMin).toBe(-77);
      expect(s.scan.sigmaMax).toBe(-33);
    } finally {
      model.dispose();
    }
  });

  it("ingests imported zeros-of-f scan CSV dataset", () => {
    const model = new ZerosOfFModel();
    try {
      model.applyImportedDataset({
        kind: "zerosOfFScan",
        label: "test.csv",
        meta: {},
        sigma: [-30, -30, -25],
        t: [1.5, 2.5, 1.5],
        yVal: [0.001, 0.002, 0.0005],
        level: null,
      });
      // No throw; model should now have data ready (covered by scatter layer integration).
    } finally {
      model.dispose();
    }
  });

  it("frames the committed harvest as index T and drops leftover strip locks", async () => {
    window.localStorage.setItem("zerosOfFUiState", JSON.stringify({
      ...DEFAULT_STATE,
      display: {
        ...DEFAULT_STATE.display,
        stripMode: true,
        circlesMode: true,
        yAxisMode: "fracT",
      },
    }));
    const buffer = encodeCommittedScanBin({
      sigma: new Float64Array([-400, -50]),
      t: new Float64Array([2.5, 4000]),
      yVal: new Float64Array([1e-6, 1e-6]),
    });
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => buffer,
    })));
    const model = new ZerosOfFModel();
    try {
      expect(model.isStripMode()).toBe(false);
      expect(model.getSceneController().getWheelZoomMode()).toBe("y");
      model.initialize();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(model.isCirclesMode()).toBe(false);
      expect(model.getSerializableState().display.yAxisMode).toBe("T");
      expect(model.getCurrentTBounds().tMax).toBeGreaterThan(3900);
      expect(model.getSceneController().getAxisLock()).toBeNull();
      expect(model.getSceneController().getZoomOutFloor()).toBeLessThan(1);
    } finally {
      model.dispose();
      vi.unstubAllGlobals();
    }
  });

  it("freezes the zeros camera in sum view while panning/zooming the spiral plane independently", () => {
    const model = new ZerosOfFModel();
    try {
      const ctrl = model.getSceneController();
      ctrl.setPan(1.25, -2.5);
      ctrl.setZoom(2.5, 4.0);
      model.setOrbit(42, -18);
      const frozenBoundsBefore = ctrl.getZerosCameraBounds();

      expect(model.getTabViewMode()).toBe("zeros");
      model.setTabViewMode("sum");
      expect(model.getTabViewMode()).toBe("sum");
      expect(ctrl.getViewMode()).toBe("sum");
      expect(ctrl.getWheelZoomMode()).toBe("both");

      // Pan and zoom now act on the spiral plane while zeros bounds & orbit stay frozen.
      ctrl.setPan(-3.0, 4.5);
      ctrl.setZoom(8.0, 8.0);
      expect(ctrl.getPanX()).toBeCloseTo(-3.0, 8);
      expect(ctrl.getZoomX()).toBeCloseTo(8.0, 8);
      expect(ctrl.getZerosCameraBounds()).toEqual(frozenBoundsBefore);
      expect(model.getOrbit()).toEqual({ yawDeg: 42, pitchDeg: -18 });

      // Picking a zero updates sum controls and widens sigma range if needed.
      model.applySumZero(-712.5, 24123.5);
      expect(model.getSumViewControls().sigma).toBeCloseTo(-712.5, 8);
      expect(model.getSumViewControls().index).toBeCloseTo(24123.5, 8);
      expect(model.getSumViewControls().sigmaMin).toBeLessThanOrEqual(-712.5);
      expect(model.getSumViewControls().chainFromZero).toBe(true);

      // Switching back to zeros view restores the original zeros camera pan/zoom.
      model.setTabViewMode("zeros");
      expect(ctrl.getPanX()).toBeCloseTo(1.25, 8);
      expect(ctrl.getPanY()).toBeCloseTo(-2.5, 8);
      expect(ctrl.getZoomX()).toBeCloseTo(2.5, 8);
      expect(ctrl.getZoomY()).toBeCloseTo(4.0, 8);
      expect(ctrl.getWheelZoomMode()).toBe("y");

      // Re-entering sum view preserves the spiral plane's pan/zoom too.
      model.setTabViewMode("sum");
      expect(ctrl.getPanX()).toBeCloseTo(-3.0, 8);
      expect(ctrl.getZoomX()).toBeCloseTo(8.0, 8);
    } finally {
      model.dispose();
    }
  });
});

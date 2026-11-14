import { act } from "react";
import { createRoot } from "react-dom/client";

import { StoragePanel } from "@/features/zeros-of-f/controls/StoragePanel";
import { DEFAULT_STATE } from "@/features/zeros-of-f/types";
import type { ManagedScanRecord } from "@/features/zeros-of-f/scanManagement";
import type { ToolboxContext, VisualizationModel } from "@/shared/visualization/contracts";

Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  configurable: true,
  value: true,
});

function record(scanId: string): ManagedScanRecord {
  return {
    approxBytes: 400,
    componentScanIds: [scanId],
    createdAt: 1_778_000_000_000,
    displayName: `Scan ${scanId}`,
    isBackground: false,
    isLoaded: false,
    isRemoteOnly: false,
    localScanId: scanId,
    request: {
      variant: "R1ak",
      sigmaRange: { min: -10, max: -8, linesPerSigma: 2 },
      tRange: { min: 10, max: 20 },
      samplesPerT: 100,
      bisectionIters: 8,
      algorithm: "sign-change",
      acceptDepth: 0.0005,
      seed: 42,
      workers: 0,
    },
    scanId,
    source: "local",
    status: "Local",
    summary: { durationMs: 10, linesScanned: 2, pointsRecorded: 5 },
    thumbnailFingerprint: `${scanId}|${DEFAULT_STATE.display.colorMode}`,
  };
}

function modelWithRows(rows: ManagedScanRecord[]): VisualizationModel & {
  combineManagedScans: (scanIds: string[]) => Promise<void>;
  exportManagedScan: () => Promise<void>;
  getArchiveEpoch: () => number;
  getManagedScanThumbnail: () => Promise<null>;
  hideManagedScan: (scanId: string) => Promise<void>;
  listManagedScans: () => Promise<ManagedScanRecord[]>;
  loadManagedScan: () => Promise<void>;
  removeManagedScan: (scanId: string) => Promise<void>;
  renameManagedScan: (scanId: string, displayName: string) => Promise<void>;
  unloadManagedScan: () => Promise<void>;
} {
  let currentRows = [...rows];
  return {
    initialize: () => undefined,
    dispose: () => undefined,
    getSceneController: () => ({
      dispose: () => undefined,
      frame: () => undefined,
      mount: () => undefined,
      resize: () => undefined,
    }),
    getSelectionState: () => ({ activePoint: null }),
    combineManagedScans: async (scanIds: string[]) => {
      currentRows = [record(`combined-${String(scanIds.length)}`), ...currentRows];
    },
    exportManagedScan: async () => undefined,
    getArchiveEpoch: () => currentRows.length,
    getManagedScanThumbnail: async () => null,
    hideManagedScan: async (scanId: string) => {
      currentRows = currentRows.filter((row) => row.scanId !== scanId);
    },
    listManagedScans: async () => [...currentRows],
    loadManagedScan: async () => undefined,
    removeManagedScan: async (scanId: string) => {
      currentRows = currentRows.filter((row) => row.scanId !== scanId);
    },
    renameManagedScan: async (scanId: string, displayName: string) => {
      currentRows = currentRows.map((row) => row.scanId === scanId ? { ...row, displayName } : row);
    },
    unloadManagedScan: async () => undefined,
  };
}

function toolboxContext(model: VisualizationModel): ToolboxContext {
  return {
    correlationId: "test",
    visualizationId: "zeros-of-f",
    visualizationModel: model,
    exportContext: {
      correlationId: "test",
      getSerializableState: () => ({}),
      visualizationId: "zeros-of-f",
      visualizationModel: model,
    },
    requestToolboxRefresh: () => undefined,
    selectionState: { activePoint: null },
  };
}

async function waitForText(container: HTMLElement, text: string): Promise<void> {
  for (let i = 0; i < 20; i++) {
    if (container.textContent?.includes(text) === true) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`Expected text ${text}`);
}

async function waitForCondition(label: string, condition: () => boolean): Promise<void> {
  for (let i = 0; i < 20; i++) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`Expected ${label}`);
}

describe("StoragePanel", () => {
  it("opens the modal, enables combine for selected rows, renames, and hides", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    const model = modelWithRows([record("a"), record("b")]);

    await act(async () => {
      root.render(<StoragePanel ctx={toolboxContext(model)} />);
    });

    await act(async () => {
      host.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await waitForText(document.body, "Scan manager");
    await waitForText(document.body, "Scan a");

    const checkboxes = [...document.body.querySelectorAll<HTMLInputElement>("input[type='checkbox']")];
    await act(async () => {
      checkboxes[0]?.click();
      checkboxes[1]?.click();
    });
    await waitForCondition("combine to enable", () => {
      const button = [...document.body.querySelectorAll<HTMLButtonElement>("button")]
        .find((candidate) => candidate.textContent === "Combine");
      return button?.disabled === false;
    });
    const combine = [...document.body.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Combine");
    expect(combine?.disabled).toBe(false);

    const names = [...document.body.querySelectorAll<HTMLInputElement>(".scan-manager-name-input")];
    await act(async () => {
      if (names[0] !== undefined) {
        names[0].value = "Renamed";
        names[0].dispatchEvent(new Event("input", { bubbles: true }));
        names[0].dispatchEvent(new FocusEvent("blur", { bubbles: true }));
      }
    });

    const hideButtons = [...document.body.querySelectorAll<HTMLButtonElement>("button")]
      .filter((button) => button.textContent === "Hide");
    await act(async () => {
      hideButtons[0]?.click();
    });

    expect((await model.listManagedScans()).some((row) => row.scanId === "a")).toBe(false);
    await act(async () => {
      root.unmount();
    });
    host.remove();
  });
});

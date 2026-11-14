import { indexedDB as fakeIndexedDB } from "fake-indexeddb";

import type { ArchiveEntry } from "@/shared/persistence/scanArchive";
import { ScanArchive } from "@/shared/persistence/scanArchive";

const DB_NAME = "zest-scan-archive";
const STORE = "scans";

Object.defineProperty(globalThis, "indexedDB", {
  configurable: true,
  value: fakeIndexedDB,
});

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

async function deleteArchiveDb(): Promise<void> {
  await requestToPromise(indexedDB.deleteDatabase(DB_NAME));
}

function archivedLine(): ArchiveEntry["lines"][number] {
  const values = new Float64Array([1.25, 1.5]);
  return {
    sigma: -1,
    t: values,
    yVal: values,
    sigma1Mag: values,
    r1Mag: values,
    phaseDev: values,
  };
}

function archiveEntry(scanId = "scan-old"): ArchiveEntry {
  return {
    workspaceId: "zeros-of-f",
    scanId,
    createdAt: 1_778_000_000_000,
    request: {
      variant: "R1ak",
      sigmaRange: { min: -1, max: 0, linesPerSigma: 1 },
      tRange: { min: 1, max: 2 },
      samplesPerT: 2,
      bisectionIters: 0,
      algorithm: "sign-change",
      acceptDepth: 0.0005,
      seed: 42,
      workers: 0,
    },
    summary: {
      durationMs: 12,
      linesScanned: 1,
      pointsRecorded: 2,
    },
    lines: [archivedLine()],
    provenance: {
      resultSchemaVersion: 1,
      scannerSourceHash: "sha256:scanner",
      scannerFiles: ["src/shared/scan/scanLineAlgorithm.ts"],
      bundledAt: "2026-05-05T00:00:00.000Z",
      backend: "local-worker",
      partial: false,
      terminalStatus: "done",
    },
    label: "Old archive",
  };
}

async function seedV1Archive(entry: ArchiveEntry): Promise<void> {
  const openRequest = indexedDB.open(DB_NAME, 1);
  openRequest.onupgradeneeded = () => {
    const db = openRequest.result;
    const store = db.createObjectStore(STORE, { keyPath: "compositeKey" });
    store.createIndex("by-workspace", "workspaceId", { unique: false });
    store.createIndex("by-created", "createdAt", { unique: false });
  };
  const db = await requestToPromise(openRequest);
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({
      ...entry,
      compositeKey: `${entry.workspaceId}::${entry.scanId}`,
      approxBytes: entry.lines.reduce((total, line) => total + line.t.byteLength + line.yVal.byteLength + line.sigma1Mag.byteLength + line.r1Mag.byteLength + line.phaseDev.byteLength, 0),
    });
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

describe("ScanArchive", () => {
  beforeEach(async () => {
    await deleteArchiveDb();
  });

  afterEach(async () => {
    await deleteArchiveDb();
  });

  it("migrates v1 full scan records into v2 metadata listings while preserving line data", async () => {
    const entry = archiveEntry();
    await seedV1Archive(entry);

    const archive = new ScanArchive();
    const listings = await archive.list("zeros-of-f");
    const hydrated = await archive.get({
      workspaceId: entry.workspaceId,
      scanId: entry.scanId,
    });

    expect(listings).toEqual([{
      workspaceId: entry.workspaceId,
      scanId: entry.scanId,
      createdAt: entry.createdAt,
      request: entry.request,
      summary: entry.summary,
      provenance: entry.provenance,
      approxBytes: 80,
      label: entry.label,
    }]);
    expect(hydrated?.lines).toHaveLength(1);
    expect([...(hydrated?.lines[0]?.t ?? [])]).toEqual([1.25, 1.5]);
  });

  it("updates metadata without touching archived line buffers", async () => {
    const archive = new ScanArchive();
    await archive.put(archiveEntry("scan-a"));

    await archive.updateMetadata(
      { workspaceId: "zeros-of-f", scanId: "scan-a" },
      {
        displayName: "Renamed scan",
        hiddenAt: 1_778_000_000_500,
        remoteScanId: "remote-a",
        thumbnail: {
          dataUrl: "data:image/png;base64,abc",
          fingerprint: "fp",
          generatedAt: 1,
          height: 12,
          width: 16,
        },
        thumbnailFingerprint: "fp",
      },
    );

    const listing = (await archive.list("zeros-of-f"))[0];
    const hydrated = await archive.get({ workspaceId: "zeros-of-f", scanId: "scan-a" });

    expect(listing?.displayName).toBe("Renamed scan");
    expect(listing?.hiddenAt).toBe(1_778_000_000_500);
    expect(listing?.remoteScanId).toBe("remote-a");
    expect(listing?.thumbnail?.fingerprint).toBe("fp");
    expect(hydrated?.lines[0]?.t).toHaveLength(2);
  });

  it("persists combined records as metadata only", async () => {
    const archive = new ScanArchive();
    const base = archiveEntry("component-a");
    await archive.put(base);

    await archive.putCombined({
      workspaceId: "zeros-of-f",
      scanId: "combined",
      createdAt: base.createdAt + 1,
      request: base.request,
      summary: base.summary,
      approxBytes: base.lines[0]?.t.byteLength ?? 0,
      componentScanIds: ["component-a"],
      displayName: "Combined",
    });

    const listing = (await archive.list("zeros-of-f")).find((entry) => entry.scanId === "combined");
    const hydrated = await archive.get({ workspaceId: "zeros-of-f", scanId: "combined" });

    expect(listing?.componentScanIds).toEqual(["component-a"]);
    expect(hydrated).toBeNull();
  });
});

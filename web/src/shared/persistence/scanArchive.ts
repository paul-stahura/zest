import type { ScanProvenance, ScanRequest, ScanSummary } from "@/shared/scan/scanBackend";

/**
 * Stable identifier for an archived scan. Hash-of-canonicalized-request plus
 * timestamp keeps duplicate scans distinct while still letting the workspace
 * find a recent run for a given parameter set.
 */
export interface ArchiveKey {
  workspaceId: string;
  scanId: string;
}

/** One archived σ-row. Stored as raw `Float64Array` buffers for zero-copy reads. */
export interface ArchivedLine {
  sigma: number;
  /** Interleaved view: t, yVal, sigma1Mag, r1Mag, phaseDev — five Float64Arrays. */
  t: Float64Array;
  yVal: Float64Array;
  sigma1Mag: Float64Array;
  r1Mag: Float64Array;
  phaseDev: Float64Array;
  /** Signed phase of R per point, `arg(R)/π` in (-1, 1]. Optional — present
   * on locally-scanned rows from the post-phaseR rollout; absent on legacy
   * archives, hosted cloud scans, and CSV-imported rows. */
  phaseR?: Float64Array;
  /** Optional `|f| / (|Σ₁| + |R₁|)` per point. Present when produced by the
   * minima scan algorithm or hydrated from a v2 import bin. */
  depth?: Float64Array;
}

export interface ArchiveEntry {
  workspaceId: string;
  scanId: string;
  createdAt: number;
  request: ScanRequest;
  summary: ScanSummary;
  lines: ArchivedLine[];
  provenance?: ScanProvenance;
  /** Optional human-readable label (e.g., source filename for imported scans). */
  label?: string;
}

export interface ArchiveThumbnail {
  dataUrl: string;
  fingerprint: string;
  generatedAt: number;
  width: number;
  height: number;
}

export interface ArchiveMetadataPatch {
  displayName?: string;
  hiddenAt?: number | null;
  remoteScanId?: string;
  parentScanId?: string;
  rootScanId?: string;
  componentScanIds?: string[];
  thumbnail?: ArchiveThumbnail;
  thumbnailFingerprint?: string;
}

/** Read-only metadata returned by `list()`. */
export interface ArchiveListing {
  workspaceId: string;
  scanId: string;
  createdAt: number;
  request: ScanRequest;
  summary: ScanSummary;
  provenance?: ScanProvenance;
  /** Total `Float64Array` bytes the entry occupies. Used for LRU eviction math. */
  approxBytes: number;
  label?: string;
  displayName?: string;
  hiddenAt?: number;
  remoteScanId?: string;
  parentScanId?: string;
  rootScanId?: string;
  componentScanIds?: string[];
  thumbnail?: ArchiveThumbnail;
  thumbnailFingerprint?: string;
}

const DB_NAME = "zest-scan-archive";
const DB_VERSION = 2;
const STORE = "scans";
const META_STORE = "scan-metadata";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "compositeKey" });
        store.createIndex("by-workspace", "workspaceId", { unique: false });
        store.createIndex("by-created", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        const metaStore = db.createObjectStore(META_STORE, { keyPath: "compositeKey" });
        metaStore.createIndex("by-workspace", "workspaceId", { unique: false });
        metaStore.createIndex("by-created", "createdAt", { unique: false });

        const scanStore = req.transaction?.objectStore(STORE);
        if (scanStore !== undefined) {
          const cursorRequest = scanStore.openCursor();
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (cursor === null) return;
            const record: unknown = cursor.value;
            if (isStoredRecord(record)) {
              metaStore.put(metadataRecordFromStoredRecord(record));
            }
            cursor.continue();
          };
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB.open failed"));
  });
}

function compositeKey(key: ArchiveKey): string {
  return `${key.workspaceId}::${key.scanId}`;
}

function approxBytes(lines: ArchivedLine[]): number {
  let total = 0;
  for (const line of lines) {
    total += line.t.byteLength;
    total += line.yVal.byteLength;
    total += line.sigma1Mag.byteLength;
    total += line.r1Mag.byteLength;
    total += line.phaseDev.byteLength;
  }
  return total;
}

interface StoredRecord {
  compositeKey: string;
  workspaceId: string;
  scanId: string;
  createdAt: number;
  request: ScanRequest;
  summary: ScanSummary;
  provenance?: ScanProvenance;
  lines: ArchivedLine[];
  approxBytes: number;
  label?: string;
}

interface StoredMetadataRecord {
  compositeKey: string;
  workspaceId: string;
  scanId: string;
  createdAt: number;
  request: ScanRequest;
  summary: ScanSummary;
  provenance?: ScanProvenance;
  approxBytes: number;
  label?: string;
  displayName?: string;
  hiddenAt?: number;
  remoteScanId?: string;
  parentScanId?: string;
  rootScanId?: string;
  componentScanIds?: string[];
  thumbnail?: ArchiveThumbnail;
  thumbnailFingerprint?: string;
}

function isStoredRecord(value: unknown): value is StoredRecord {
  return value !== null &&
    typeof value === "object" &&
    "compositeKey" in value &&
    "workspaceId" in value &&
    "scanId" in value &&
    "createdAt" in value &&
    "request" in value &&
    "summary" in value &&
    "lines" in value &&
    "approxBytes" in value;
}

function metadataRecordFromStoredRecord(record: StoredRecord, previous?: StoredMetadataRecord): StoredMetadataRecord {
  return {
    compositeKey: record.compositeKey,
    workspaceId: record.workspaceId,
    scanId: record.scanId,
    createdAt: record.createdAt,
    request: record.request,
    summary: record.summary,
    provenance: record.provenance,
    approxBytes: record.approxBytes,
    label: record.label,
    displayName: previous?.displayName,
    hiddenAt: previous?.hiddenAt,
    remoteScanId: previous?.remoteScanId,
    parentScanId: previous?.parentScanId,
    rootScanId: previous?.rootScanId,
    componentScanIds: previous?.componentScanIds,
    thumbnail: previous?.thumbnail,
    thumbnailFingerprint: previous?.thumbnailFingerprint,
  };
}

function listingFromMetadataRecord(r: StoredMetadataRecord): ArchiveListing {
  return {
    workspaceId: r.workspaceId,
    scanId: r.scanId,
    createdAt: r.createdAt,
    request: r.request,
    summary: r.summary,
    provenance: r.provenance,
    approxBytes: r.approxBytes,
    label: r.label,
    displayName: r.displayName,
    hiddenAt: r.hiddenAt,
    remoteScanId: r.remoteScanId,
    parentScanId: r.parentScanId,
    rootScanId: r.rootScanId,
    componentScanIds: r.componentScanIds,
    thumbnail: r.thumbnail,
    thumbnailFingerprint: r.thumbnailFingerprint,
  };
}

function applyMetadataPatch(record: StoredMetadataRecord, patch: ArchiveMetadataPatch): StoredMetadataRecord {
  const next: StoredMetadataRecord = { ...record };
  if ("displayName" in patch) {
    if (patch.displayName === undefined || patch.displayName.trim() === "") delete next.displayName;
    else next.displayName = patch.displayName;
  }
  if ("hiddenAt" in patch) {
    if (patch.hiddenAt === null || patch.hiddenAt === undefined) delete next.hiddenAt;
    else next.hiddenAt = patch.hiddenAt;
  }
  if ("remoteScanId" in patch) next.remoteScanId = patch.remoteScanId;
  if ("parentScanId" in patch) next.parentScanId = patch.parentScanId;
  if ("rootScanId" in patch) next.rootScanId = patch.rootScanId;
  if ("componentScanIds" in patch) next.componentScanIds = patch.componentScanIds;
  if ("thumbnail" in patch) next.thumbnail = patch.thumbnail;
  if ("thumbnailFingerprint" in patch) next.thumbnailFingerprint = patch.thumbnailFingerprint;
  return next;
}

/**
 * IndexedDB-backed scan archive. Single object store keyed by
 * `${workspaceId}::${scanId}`. Entries persist across reloads. Eviction is
 * size-capped LRU on writes; the cap defaults to 1 GiB and can be overridden.
 *
 * Throws if `indexedDB` is unavailable (Node test environment etc.). Call
 * sites should treat this as best-effort cache; missing-archive is non-fatal.
 */
export class ScanArchive {
  private readonly maxBytes: number;

  public constructor(opts?: { maxBytes?: number }) {
    // 8 GiB cap. Earlier 1 GiB triggered silent eviction of oldest scans
    // during routine usage when several large hosted-cloud scans were
    // archived in a single session, which read like "scans falling off the
    // bottom of the list". Eviction is now far enough from typical workloads
    // to be effectively never; when it does happen, `enforceSizeCap` logs
    // the dropped keys so loss isn't silent.
    this.maxBytes = opts?.maxBytes ?? 8 * 1024 * 1024 * 1024;
  }

  /** Persist a new entry. Triggers LRU eviction if the cap is exceeded. */
  public async put(entry: ArchiveEntry): Promise<void> {
    const db = await openDb();
    try {
      await runTx(db, "readwrite", (store, tx) => {
        const key = compositeKey(entry);
        const metaStore = tx.objectStore(META_STORE);
        const previousReq = metaStore.get(key);
        previousReq.onsuccess = () => {
          const record: StoredRecord = {
            compositeKey: key,
            workspaceId: entry.workspaceId,
            scanId: entry.scanId,
            createdAt: entry.createdAt,
            request: entry.request,
            summary: entry.summary,
            provenance: entry.provenance,
            lines: entry.lines,
            approxBytes: approxBytes(entry.lines),
            label: entry.label,
          };
          store.put(record);
          metaStore.put(metadataRecordFromStoredRecord(record, previousReq.result as StoredMetadataRecord | undefined));
        };
      });
      await this.enforceSizeCap(db);
    } finally {
      db.close();
    }
  }

  /** Fetch an entry by key, or `null` if missing. */
  public async get(key: ArchiveKey): Promise<ArchiveEntry | null> {
    const db = await openDb();
    try {
      const record = await runTxWithResult<StoredRecord | undefined>(db, "readonly", (store) =>
        store.get(compositeKey(key)),
      );
      if (!record) return null;
      return {
        workspaceId: record.workspaceId,
        scanId: record.scanId,
        createdAt: record.createdAt,
        request: record.request,
        summary: record.summary,
        provenance: record.provenance,
        lines: record.lines,
        label: record.label,
      };
    } finally {
      db.close();
    }
  }

  /** Delete an entry by key. No-op if missing. */
  public async delete(key: ArchiveKey): Promise<void> {
    const db = await openDb();
    try {
      await runTx(db, "readwrite", (store, tx) => {
        const keyString = compositeKey(key);
        store.delete(keyString);
        tx.objectStore(META_STORE).delete(keyString);
      });
    } finally {
      db.close();
    }
  }

  /** Update listing-only metadata without touching full archived line buffers. */
  public async updateMetadata(key: ArchiveKey, patch: ArchiveMetadataPatch): Promise<void> {
    const db = await openDb();
    try {
      await runTx(db, "readwrite", (_store, tx) => {
        const metaStore = tx.objectStore(META_STORE);
        const req = metaStore.get(compositeKey(key));
        req.onsuccess = () => {
          const record = req.result as StoredMetadataRecord | undefined;
          if (record === undefined) return;
          metaStore.put(applyMetadataPatch(record, patch));
        };
      });
    } finally {
      db.close();
    }
  }

  /** Persist a metadata-only listing row without writing archived line buffers. */
  public async putMetadata(entry: ArchiveListing): Promise<void> {
    const db = await openDb();
    try {
      await runTx(db, "readwrite", (_store, tx) => {
        const record: StoredMetadataRecord = {
          compositeKey: compositeKey(entry),
          workspaceId: entry.workspaceId,
          scanId: entry.scanId,
          createdAt: entry.createdAt,
          request: entry.request,
          summary: entry.summary,
          provenance: entry.provenance,
          approxBytes: entry.approxBytes,
          label: entry.label,
          displayName: entry.displayName,
          hiddenAt: entry.hiddenAt,
          remoteScanId: entry.remoteScanId,
          parentScanId: entry.parentScanId,
          rootScanId: entry.rootScanId,
          componentScanIds: entry.componentScanIds === undefined ? undefined : [...entry.componentScanIds],
          thumbnail: entry.thumbnail,
          thumbnailFingerprint: entry.thumbnailFingerprint,
        };
        tx.objectStore(META_STORE).put(record);
      });
    } finally {
      db.close();
    }
  }

  /** Persist a metadata-only combined scan that points at component scans. */
  public async putCombined(entry: Omit<ArchiveListing, "componentScanIds"> & { componentScanIds: string[] }): Promise<void> {
    await this.putMetadata({ ...entry, componentScanIds: [...entry.componentScanIds] });
  }

  /** List archive entries (without full line buffers). */
  public async list(workspaceId?: string): Promise<ArchiveListing[]> {
    const db = await openDb();
    try {
      const records = await runTxWithResult<StoredMetadataRecord[]>(db, "readonly", (_store, tx) =>
        tx.objectStore(META_STORE).getAll(),
      );
      const out: ArchiveListing[] = [];
      for (const r of records) {
        if (workspaceId && r.workspaceId !== workspaceId) continue;
        out.push(listingFromMetadataRecord(r));
      }
      out.sort((a, b) => b.createdAt - a.createdAt);
      return out;
    } finally {
      db.close();
    }
  }

  private async enforceSizeCap(db: IDBDatabase): Promise<void> {
    const records = await runTxWithResult<StoredMetadataRecord[]>(db, "readonly", (_store, tx) =>
      tx.objectStore(META_STORE).getAll(),
    );
    let total = 0;
    for (const r of records) {
      if (r.componentScanIds === undefined) total += r.approxBytes;
    }
    if (total <= this.maxBytes) return;

    records.sort((a, b) => a.createdAt - b.createdAt);
    const toDelete: string[] = [];
    let drop = total - this.maxBytes;
    for (const r of records) {
      if (r.componentScanIds !== undefined) continue;
      if (drop <= 0) break;
      toDelete.push(r.compositeKey);
      drop -= r.approxBytes;
    }
    if (toDelete.length === 0) return;
    // eslint-disable-next-line no-console
    console.warn(
      `[scanArchive] LRU eviction: archive exceeded ${String(this.maxBytes)} bytes; deleting ${String(toDelete.length)} oldest scan(s). Consider Hide/Remove on scans you don't need before this triggers.`,
      toDelete,
    );
    await runTx(db, "readwrite", (store, tx) => {
      const metaStore = tx.objectStore(META_STORE);
      for (const k of toDelete) {
        store.delete(k);
        metaStore.delete(k);
      }
    });
  }
}

function runTx(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  body: (store: IDBObjectStore, tx: IDBTransaction) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE, META_STORE], mode);
    const store = tx.objectStore(STORE);
    body(store, tx);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb tx failed"));
    tx.onabort = () => reject(tx.error ?? new Error("idb tx aborted"));
  });
}

function runTxWithResult<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  body: (store: IDBObjectStore, tx: IDBTransaction) => IDBRequest,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE, META_STORE], mode);
    const store = tx.objectStore(STORE);
    const req = body(store, tx);
    req.onsuccess = () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- caller picks the right T for the store.get / getAll variant.
      resolve(req.result as T);
    };
    req.onerror = () => reject(req.error ?? new Error("idb req failed"));
    tx.onabort = () => reject(tx.error ?? new Error("idb tx aborted"));
  });
}

/**
 * Compute a stable `scanId` for a `ScanRequest` plus a creation timestamp.
 * Hash the canonicalized JSON form so the same request twice (different
 * timestamps) gets distinct ids that still cluster under the same prefix.
 */
export function makeScanId(request: ScanRequest, createdAt: number): string {
  const json = JSON.stringify(request, Object.keys(request).sort());
  let h = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // eslint-disable-next-line no-restricted-syntax -- (h >>> 0).toString(16) is the canonical FNV-1a → hex pattern.
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  return `${hex}@${String(createdAt)}`;
}

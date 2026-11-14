import type { ZeroCountBox } from "@/features/zeros-of-f/layers/zeroCountBoxesLayer";

const DB_NAME = "zest-zero-counts";
const DB_VERSION = 1;
const STORE = "runs";

export interface ZeroCountSave {
  key: string;             // composite of variant + bounds, OR a slot label
  savedAt: number;
  variant: string;
  sigmaMin: number;
  sigmaMax: number;
  tMin: number;
  tMax: number;
  boxes: ZeroCountBox[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("indexedDB unavailable")); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("open zero-count cache failed"));
  });
}

/** Bump this whenever the counting algorithm changes — all cached entries
 *  under prior versions become unreachable, forcing a recompute. */
export const ZERO_COUNT_ALGO_VERSION = "v3-tAware-tripleAgree";

export function makeZeroCountKey(variant: string, sigmaMin: number, sigmaMax: number, tMin: number, tMax: number): string {
  return `${ZERO_COUNT_ALGO_VERSION}|${variant}|s${sigmaMin.toFixed(4)}_${sigmaMax.toFixed(4)}|t${tMin.toFixed(4)}_${tMax.toFixed(4)}`;
}

export async function saveZeroCounts(entry: Omit<ZeroCountSave, "key"> & { key?: string }): Promise<void> {
  const db = await openDb();
  const key = entry.key ?? makeZeroCountKey(entry.variant, entry.sigmaMin, entry.sigmaMax, entry.tMin, entry.tMax);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ ...entry, key });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("save zero-counts failed"));
  });
  db.close();
}

export async function loadZeroCounts(key: string): Promise<ZeroCountSave | null> {
  const db = await openDb();
  const result = await new Promise<ZeroCountSave | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as ZeroCountSave | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error("load zero-counts failed"));
  });
  db.close();
  return result;
}

/**
 * IndexedDB-backed cache for phase-heatmap textures. One slot per session;
 * Save overwrites, Load restores. Stores per-tile pixel data plus the build
 * parameters so the user can recover an expensive build across page reloads.
 */

const DB_NAME = "zest-heatmap-cache";
const DB_VERSION = 1;
const STORE = "heatmaps";
const SLOT_KEY = "main";

export interface SavedHeatmapTile {
  data: Uint8Array;
  wPx: number;
  hPx: number;
  tMin: number;
  tMax: number;
}

export interface SavedHeatmap {
  key: string;            // SLOT_KEY
  savedAt: number;        // ms epoch
  family: string;         // FFamily
  rForm: string;          // RForm
  sigmaMin: number;
  sigmaMax: number;
  tMin: number;
  tMax: number;
  tilesT: number;
  tiles: SavedHeatmapTile[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("open heatmap-cache failed"));
  });
}

export async function saveHeatmap(entry: Omit<SavedHeatmap, "key">): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ ...entry, key: SLOT_KEY });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("saveHeatmap failed"));
  });
  db.close();
}

export async function loadHeatmap(): Promise<SavedHeatmap | null> {
  const db = await openDb();
  const result = await new Promise<SavedHeatmap | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(SLOT_KEY);
    req.onsuccess = () => resolve((req.result as SavedHeatmap | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error("loadHeatmap failed"));
  });
  db.close();
  return result;
}

export async function clearHeatmap(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(SLOT_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("clearHeatmap failed"));
  });
  db.close();
}

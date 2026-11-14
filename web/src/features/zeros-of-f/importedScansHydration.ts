import type { ScanRequest, ScanSummary } from "@/shared/scan/scanBackend";
import type { ArchivedLine, ArchiveEntry, ScanArchive } from "@/shared/persistence/scanArchive";

/**
 * Hydrates the IndexedDB scan archive from static binary assets produced by
 * `scripts/import-zeros-of-f-csvs.mjs`. Skips already-hydrated entries unless
 * the existing record is missing the filename label (older hydrations didn't
 * persist one), in which case it re-puts to backfill. Best-effort — fetch
 * failures are logged and swallowed so a missing manifest never breaks the app.
 *
 * sigma1Mag/r1Mag/phaseDev are absent in legacy CSVs; we fill them with NaN
 * so `classify.ts` falls through to its default level for those points.
 */

const MANIFEST_URL = `${import.meta.env.BASE_URL}zeros-of-f-imports/manifest.json`;

interface ManifestEntry {
  scanId: string;
  filename: string;
  createdAt: number;
  bin: string;
  bytes: number;
  request: ScanRequest;
  summary: ScanSummary;
}

interface Manifest {
  version: number;
  generatedAt: string;
  entries: ManifestEntry[];
}

const YIELD_AFTER_LINES = 1024;

function yieldToFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "undefined") {
      setTimeout(resolve, 0);
      return;
    }
    requestAnimationFrame(() => resolve());
  });
}

export async function hydrateImportedScans(
  archive: ScanArchive,
  workspaceId: string,
): Promise<void> {
  const manifest = await fetchManifest();
  if (manifest === null) return;

  const existing = await archive.list(workspaceId);
  const existingById = new Map(existing.map((e) => [e.scanId, e]));

  // Cleanup pass: remove orphaned `import-*` entries from IDB that are no
  // longer referenced by the manifest. These accumulate when the import
  // script is run with a broader filter than usual; left in IDB they make
  // archive.list() (and every page-load deserialization) heavier than
  // necessary because IDB has no partial-record reads.
  const manifestIds = new Set(manifest.entries.map((e) => e.scanId));
  let pruned = 0;
  for (const e of existing) {
    if (e.scanId.startsWith("import-") && !manifestIds.has(e.scanId)) {
      try {
        await archive.delete({ workspaceId, scanId: e.scanId });
        pruned += 1;
      } catch {
        // Best-effort; ignore single-entry failures.
      }
    }
  }
  if (pruned > 0) {
    // eslint-disable-next-line no-console
    console.log(`[zeros-of-f] pruned ${String(pruned)} orphaned import entries from IDB`);
  }

  for (const entry of manifest.entries) {
    const prior = existingById.get(entry.scanId);
    // Skip if already hydrated AND already labeled. Re-put to backfill missing labels.
    if (prior && prior.label !== undefined && prior.label !== "") continue;
    try {
      await hydrateEntry(archive, workspaceId, entry);
    } catch (e) {
      // eslint-disable-next-line no-console -- best-effort hydration; surface failures in devtools.
      console.warn(`[zeros-of-f] failed to hydrate ${entry.filename}:`, e);
    }

    // Let the UI process a frame between archive entries so startup remains
    // interactive while long hydration batches import.
    // eslint-disable-next-line no-await-in-loop -- intentional long-running yield.
    await yieldToFrame();
  }
}

export async function hydrateImportedScanByLabel(
  archive: ScanArchive,
  workspaceId: string,
  label: string,
): Promise<void> {
  const manifest = await fetchManifest();
  if (manifest === null) return;
  const entry = manifest.entries.find((candidate) => candidate.filename === label);
  if (entry === undefined) return;

  const existing = await archive.list(workspaceId);
  const prior = existing.find((candidate) => candidate.scanId === entry.scanId);
  // Skip ONLY if the prior label already matches the manifest filename. If it
  // mismatches (e.g. legacy entries hydrated under an old filename that has
  // since been renamed), re-hydrate to update the label so lookups by the
  // new name succeed.
  if (prior && prior.label === entry.filename) return;

  try {
    await hydrateEntry(archive, workspaceId, entry);
  } catch (e) {
    // eslint-disable-next-line no-console -- best-effort hydration; surface failures in devtools.
    console.warn(`[zeros-of-f] failed to hydrate ${entry.filename}:`, e);
  }
}

async function fetchManifest(): Promise<Manifest | null> {
  try {
    const res = await fetch(MANIFEST_URL);
    if (!res.ok) return null; // No manifest deployed -> nothing to hydrate.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- manifest schema is owned by our import script; runtime mismatch is non-fatal (entries are skipped on hydration failure).
    return (await res.json()) as Manifest;
  } catch {
    return null;
  }
}

async function hydrateEntry(
  archive: ScanArchive,
  workspaceId: string,
  entry: ManifestEntry,
): Promise<void> {
  const lines = await fetchAndDecode(`${import.meta.env.BASE_URL}zeros-of-f-imports/${entry.bin}`);
  const archiveEntry: ArchiveEntry = {
    workspaceId,
    scanId: entry.scanId,
    // Bump createdAt to "now" instead of using the manifest's original
    // timestamp. The archive's LRU size-cap eviction sorts by createdAt
    // ascending and drops the oldest first; using the manifest timestamp
    // (often months old) would mean a fresh hydration is the first thing
    // evicted when the archive is near the 8 GB cap. Treating "freshly
    // hydrated" as "just touched" keeps it alive.
    createdAt: Date.now(),
    request: entry.request,
    summary: entry.summary,
    lines,
    label: entry.filename,
  };
  await archive.put(archiveEntry);
}

async function fetchAndDecode(url: string): Promise<ArchivedLine[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} → ${String(res.status)}`);
  const buf = await res.arrayBuffer();
  return decodeBin(buf);
}

/** Magic prefix that distinguishes the v2 layout (with optional per-point
 * depth) from the legacy v1 layout (which started with `numLines` directly).
 * 0xFEEDF00D is large enough that no realistic v1 file ever started with
 * that many σ-rows. Must stay in sync with `scripts/import-zeros-of-f-csvs.mjs`. */
const BIN_MAGIC_V2 = 0xfeedf00d;

export async function decodeBin(buf: ArrayBuffer): Promise<ArchivedLine[]> {
  const view = new DataView(buf);
  const lines: ArchivedLine[] = [];
  let off = 0;
  let version = 1;
  const first = view.getUint32(off, true);
  if (first === BIN_MAGIC_V2) {
    off += 4;
    version = view.getUint32(off, true);
    off += 4;
  }
  const numLines = view.getUint32(off, true);
  off += 4;
  for (let i = 0; i < numLines; i++) {
    const sigma = view.getFloat64(off, true);
    off += 8;
    const nPts = view.getUint32(off, true);
    off += 4;
    let hasDepth = false;
    if (version >= 2) {
      hasDepth = view.getUint8(off) === 1;
      off += 1;
    }
    const t = new Float64Array(buf.slice(off, off + nPts * 8));
    off += nPts * 8;
    const yVal = new Float64Array(buf.slice(off, off + nPts * 8));
    off += nPts * 8;
    let depth: Float64Array | undefined;
    if (hasDepth) {
      depth = new Float64Array(buf.slice(off, off + nPts * 8));
      off += nPts * 8;
    }
    const nanFill = new Float64Array(nPts);
    nanFill.fill(NaN);
    lines.push({
      sigma,
      t,
      yVal,
      sigma1Mag: nanFill,
      r1Mag: new Float64Array(nanFill),
      phaseDev: new Float64Array(nanFill),
      ...(depth !== undefined ? { depth } : {}),
    });

    if ((i + 1) % YIELD_AFTER_LINES === 0) {
      // eslint-disable-next-line no-await-in-loop -- cooperative scheduling for big scans.
      await yieldToFrame();
    }
  }
  return lines;
}

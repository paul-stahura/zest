import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent as ReactChangeEvent, MouseEvent as ReactMouseEvent } from "react";

import { compatibleForCombine, type ManagedScanRecord } from "@/features/zeros-of-f/scanManagement";
import { createCorrelationId } from "@/shared/io/correlationId";
import { parseZerosOfFCsv } from "@/shared/io/zerosOfFCsv";
import type { ImportedDataset } from "@/shared/io/types";
import type { ArchiveThumbnail } from "@/shared/persistence/scanArchive";
import type { ToolboxContext, VisualizationModel } from "@/shared/visualization/contracts";

interface StoragePanelProps {
  ctx: ToolboxContext;
}

interface ScanManagerModel {
  combineManagedScans: (scanIds: string[]) => Promise<void>;
  exportManagedScan: (scanId: string) => Promise<void>;
  getArchiveEpoch?: () => number;
  getManagedScanThumbnail: (scanId: string, width?: number, height?: number) => Promise<ArchiveThumbnail | null>;
  hideManagedScan: (scanId: string) => Promise<void>;
  listManagedScans: () => Promise<ManagedScanRecord[]>;
  loadManagedScan: (scanId: string) => Promise<void>;
  removeManagedScan: (scanId: string) => Promise<void>;
  renameManagedScan: (scanId: string, displayName: string) => Promise<void>;
  unloadManagedScan: (scanId: string) => Promise<void>;
  rebuildScanWithFullData: (scanId: string) => Promise<string>;
  loadArchive: (scanId: string) => Promise<void>;
  getBackgroundUtilizedNames: () => Set<string>;
  applyImportedDataset: (dataset: ImportedDataset) => void;
}

const DEFAULT_COLS = [300, 128, 96, 88, 116, 172] as const;

function asScanManagerModel(m: VisualizationModel): ScanManagerModel | null {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- structural duck-type check below; survives HMR class identity drift.
  const candidate = m as unknown as Partial<ScanManagerModel>;
  if (
    typeof candidate.listManagedScans === "function" &&
    typeof candidate.getManagedScanThumbnail === "function" &&
    typeof candidate.renameManagedScan === "function" &&
    typeof candidate.hideManagedScan === "function" &&
    typeof candidate.loadManagedScan === "function" &&
    typeof candidate.unloadManagedScan === "function" &&
    typeof candidate.exportManagedScan === "function" &&
    typeof candidate.combineManagedScans === "function" &&
    typeof candidate.removeManagedScan === "function" &&
    typeof candidate.rebuildScanWithFullData === "function" &&
    typeof candidate.loadArchive === "function" &&
    typeof candidate.getBackgroundUtilizedNames === "function" &&
    typeof candidate.applyImportedDataset === "function"
  ) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- required methods are verified above.
    return candidate as ScanManagerModel;
  }
  return null;
}

function formatBytes(b: number): string {
  if (b <= 0) return "-";
  if (b < 1024) return `${String(b)} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(ts: number): string {
  if (!Number.isFinite(ts)) return "-";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(ts));
}

function sourceLabel(record: ManagedScanRecord): string {
  if (record.source === "combined") return record.isLoaded ? "Combined loaded" : "Combined";
  if (record.isRemoteOnly) return record.status;
  if (record.isBackground) return "Background";
  if (record.isLoaded) return "Loaded";
  return record.remoteScanId !== undefined ? "Local + remote" : "Local";
}

function selectedRecords(rows: readonly ManagedScanRecord[], selectedIds: ReadonlySet<string>): ManagedScanRecord[] {
  return rows.filter((row) => selectedIds.has(row.scanId));
}

export function StoragePanel({ ctx }: StoragePanelProps) {
  const model = asScanManagerModel(ctx.visualizationModel);
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFilePicked = useCallback((e: ReactChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";  // allow re-selecting same file later
    if (file === undefined || model === null) return;
    setImportStatus(`Reading ${file.name}…`);
    void (async () => {
      try {
        const text = await file.text();
        const dataset = parseZerosOfFCsv(createCorrelationId(), text, file.name);
        if (dataset.kind !== "zerosOfFScan") {
          setImportStatus("Not a zeros-of-f scan CSV");
          return;
        }
        model.applyImportedDataset(dataset);
        ctx.requestToolboxRefresh();
        setImportStatus(`Imported ${dataset.sigma.length.toLocaleString()} points from ${file.name}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Import failed";
        setImportStatus(`Import failed: ${msg}`);
      }
    })();
  }, [ctx, model]);

  if (model === null) {
    return <div className="toolbox-storage-empty">Storage unavailable</div>;
  }

  return (
    <div className="toolbox-storage">
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button type="button" className="zest-button" onClick={() => setOpen(true)}>
          Manage scans
        </button>
        <button type="button" className="zest-button" onClick={handleImportClick}
                title="Load a zeros-of-f CSV (sigma,t,abs_f or sigma,T,y_val format) as a scatter overlay">
          Import zeros CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: "none" }}
          onChange={handleFilePicked}
        />
      </div>
      <div className="toolbox-storage-empty">Browse, combine, rename, load, or hide archived scans.</div>
      {importStatus !== null ? (
        <div className="toolbox-storage-empty" style={{ marginTop: 4 }}>{importStatus}</div>
      ) : null}
      {open ? (
        <ScanManagerDialog
          model={model}
          onClose={() => setOpen(false)}
          onChanged={() => {
            ctx.requestToolboxRefresh();
          }}
        />
      ) : null}
    </div>
  );
}

function ScanManagerDialog({ model, onChanged, onClose }: {
  model: ScanManagerModel;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<ManagedScanRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<ArchiveThumbnail | null>(null);
  const [loadingThumbnail, setLoadingThumbnail] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const bgUtilizedNames = model.getBackgroundUtilizedNames();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cols, setCols] = useState<number[]>(() => [...DEFAULT_COLS]);
  const dragRef = useRef<{ index: number; startX: number; startWidth: number } | null>(null);
  const epoch = model.getArchiveEpoch?.() ?? 0;

  const reload = useCallback(async () => {
    setError(null);
    try {
      const next = await model.listManagedScans();
      setRows(next);
      setSelectedIds((prev) => {
        const valid = new Set(next.map((row) => row.scanId));
        const selected = new Set<string>();
        for (const id of prev) if (valid.has(id)) selected.add(id);
        return selected;
      });
      setActiveId((prev) => prev ?? next[0]?.scanId ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [model]);

  useEffect(() => {
    void reload();
  }, [reload, epoch]);

  useEffect(() => {
    if (activeId === null) {
      setThumbnail(null);
      return;
    }
    let cancelled = false;
    setLoadingThumbnail(true);
    setThumbnail(null);
    void model.getManagedScanThumbnail(activeId, 520, 390)
      .then((next) => {
        if (!cancelled) setThumbnail(next);
      })
      .catch(() => {
        if (!cancelled) setThumbnail(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingThumbnail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId, model]);

  useEffect(() => {
    const onMove = (event: MouseEvent): void => {
      const drag = dragRef.current;
      if (drag === null) return;
      const delta = event.clientX - drag.startX;
      setCols((prev) => prev.map((width, index) => index === drag.index ? Math.max(72, drag.startWidth + delta) : width));
    };
    const onUp = (): void => {
      dragRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const activeRow = rows.find((row) => row.scanId === activeId) ?? null;
  const selected = useMemo(() => selectedRecords(rows, selectedIds), [rows, selectedIds]);
  const combine = compatibleForCombine(selected);
  const gridTemplateColumns = `${cols.map((width) => `${String(width)}px`).join(" ")}`;

  const run = async (label: string, action: () => Promise<void>, success?: string): Promise<void> => {
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      await action();
      onChanged();
      await reload();
      if (success !== undefined) setNotice(success);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  // Auto-clear transient feedback after 10 seconds. The CSS animation on
  // `.scan-manager-status--toast` handles the fade in the last second; the JS
  // timer just tears the message out of the DOM at 10s. Errors AND notices
  // share this behavior — errors stay long enough to read but don't pin the
  // toolbar's status slot.
  useEffect(() => {
    if (notice === null) return;
    const timer = setTimeout(() => setNotice(null), 10_000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (error === null) return;
    const timer = setTimeout(() => setError(null), 10_000);
    return () => clearTimeout(timer);
  }, [error]);

  const toggle = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setActiveId(id);
  };

  return (
    <div className="scan-manager-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="scan-manager-dialog" role="dialog" aria-modal="true" aria-label="Scan manager">
        <div className="scan-manager-topbar">
          <div>
            <div className="scan-manager-title">Scan manager</div>
            <div className="scan-manager-subtitle">{`${String(rows.length)} visible scans`}</div>
          </div>
          <button type="button" className="scan-manager-close" onClick={onClose}>Close</button>
        </div>

        <div className="scan-manager-content">
          <aside className="scan-manager-preview">
            <div className="scan-manager-preview-frame">
              {thumbnail !== null ? (
                <img src={thumbnail.dataUrl} alt="" className="scan-manager-thumbnail" />
              ) : (
                <div className="scan-manager-preview-empty">
                  {loadingThumbnail ? "Generating preview" : activeRow?.isRemoteOnly === true ? "Load remote scan for preview" : "No preview"}
                </div>
              )}
            </div>
            {activeRow !== null ? (
              <div className="scan-manager-preview-meta">
                <div className="scan-manager-preview-name">{activeRow.displayName}</div>
                <div>{`${activeRow.request.variant} / ${activeRow.request.algorithm}`}</div>
                <div>{`sigma ${String(activeRow.request.sigmaRange.min)} to ${String(activeRow.request.sigmaRange.max)} / T ${String(activeRow.request.tRange.min)} to ${String(activeRow.request.tRange.max)}`}</div>
                <div>{activeRow.scanId}</div>
              </div>
            ) : null}
          </aside>

          <section className="scan-manager-table-shell">
            <div className="scan-manager-table-actions">
              <button
                type="button"
                className="scan-manager-action"
                disabled={selected.length === 0 || busy !== null}
                onClick={() => void run("load", async () => {
                  for (const row of selected) await model.loadManagedScan(row.scanId);
                })}
              >
                Load
              </button>
              <button
                type="button"
                className="scan-manager-action"
                disabled={selected.length === 0 || busy !== null}
                onClick={() => void run("unload", async () => {
                  for (const row of selected) await model.unloadManagedScan(row.scanId);
                })}
              >
                Unload
              </button>
              <button
                type="button"
                className="scan-manager-action"
                disabled={selected.length !== 1 || selected[0]?.isRemoteOnly === true || busy !== null}
                onClick={() => void run("export", async () => {
                  if (selected[0] !== undefined) await model.exportManagedScan(selected[0].scanId);
                })}
              >
                Export
              </button>
              <button
                type="button"
                className="scan-manager-action scan-manager-action--primary"
                disabled={!combine.compatible || busy !== null}
                title={combine.reason ?? "Combine selected scans"}
                onClick={() => void run("combine", async () => {
                  await model.combineManagedScans(selected.map((row) => row.scanId));
                  setSelectedIds(new Set());
                }, `Combined ${String(selected.length)} scans`)}
              >
                Combine
              </button>
              <button
                type="button"
                className="scan-manager-action"
                disabled={selected.length !== 1 || selected[0]?.isRemoteOnly === true || busy !== null}
                title="Re-evaluate every recorded (σ, T) point through the math to fill in missing columns (sigma1Mag, r1Mag, phaseDev, phaseR, depth). Saves the result as a new scan."
                onClick={() => void run("rebuild", async () => {
                  if (selected[0] !== undefined) {
                    const newId = await model.rebuildScanWithFullData(selected[0].scanId);
                    await model.loadArchive(newId);
                  }
                }, "Rebuilt scan with full per-point data")}
              >
                Rebuild
              </button>
              <button
                type="button"
                className="scan-manager-action"
                disabled={selected.length === 0 || busy !== null}
                title="Hide selected scans (kept on disk; can be restored later)"
                onClick={() => void run("hide", async () => {
                  for (const row of selected) await model.hideManagedScan(row.scanId);
                  setSelectedIds(new Set());
                }, `Hid ${String(selected.length)} scan${selected.length === 1 ? "" : "s"}`)}
              >
                Hide
              </button>
              <button
                type="button"
                className="scan-manager-action scan-manager-action--danger"
                disabled={selected.length === 0 || busy !== null}
                title="Permanently delete the selected scans from local storage"
                onClick={() => {
                  if (typeof window !== "undefined" && !window.confirm(
                    `Permanently delete ${String(selected.length)} scan${selected.length === 1 ? "" : "s"}? This cannot be undone.`,
                  )) return;
                  void run("remove", async () => {
                    for (const row of selected) await model.removeManagedScan(row.scanId);
                    setSelectedIds(new Set());
                  }, `Removed ${String(selected.length)} scan${selected.length === 1 ? "" : "s"}`);
                }}
              >
                Remove
              </button>
              <ScanManagerStatus
                busy={busy}
                error={error}
                notice={notice}
                hint={selected.length > 0 && !combine.compatible ? combine.reason : null}
              />
            </div>
            <div className="scan-manager-grid" style={{ gridTemplateColumns }}>
              {["Name", "Date", "Points", "Size", "Status", "Actions"].map((label, index) => (
                <div key={label} className="scan-manager-head">
                  <span>{label}</span>
                  {index < cols.length - 1 ? (
                    <span
                      className="scan-manager-resize"
                      onMouseDown={(event) => {
                        dragRef.current = { index, startX: event.clientX, startWidth: cols[index] ?? DEFAULT_COLS[index] ?? 120 };
                        event.preventDefault();
                      }}
                    />
                  ) : null}
                </div>
              ))}
              {rows.map((row) => {
                const usedAsBg = bgUtilizedNames.has(row.displayName) || (row.label !== undefined && bgUtilizedNames.has(row.label));
                return (
                  <ScanManagerRow
                    key={row.scanId}
                    row={row}
                    usedAsBg={usedAsBg}
                    selected={selectedIds.has(row.scanId)}
                    active={row.scanId === activeId}
                    disabled={busy !== null}
                    onActivate={() => setActiveId(row.scanId)}
                    onToggle={() => toggle(row.scanId)}
                    onRename={(name) => void run("rename", () => model.renameManagedScan(row.scanId, name))}
                    onHide={() => void run("hide", () => model.hideManagedScan(row.scanId))}
                    onLoad={() => void run("load", () => model.loadManagedScan(row.scanId))}
                  />
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ScanManagerRow({ active, disabled, onActivate, onHide, onLoad, onRename, onToggle, row, selected, usedAsBg }: {
  active: boolean;
  disabled: boolean;
  onActivate: () => void;
  onHide: () => void;
  onLoad: () => void;
  onRename: (name: string) => void;
  onToggle: () => void;
  row: ManagedScanRecord;
  selected: boolean;
  usedAsBg: boolean;
}) {
  const [draft, setDraft] = useState(row.displayName);

  useEffect(() => {
    setDraft(row.displayName);
  }, [row.displayName]);

  const commit = (): void => {
    if (draft !== row.displayName) onRename(draft);
  };

  const selectFromCell = (event: ReactMouseEvent<HTMLElement>): void => {
    if (disabled) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
    onToggle();
  };

  const cellClass = `scan-manager-cell${selected ? " is-selected" : ""}`;

  return (
    <>
      <div className={`${cellClass} scan-manager-name${active ? " is-active" : ""}`} onMouseDown={onActivate}>
        <input type="checkbox" checked={selected} onChange={onToggle} disabled={disabled} aria-label={`Select ${row.displayName}`} />
        {usedAsBg ? (
          <span
            title="Used by a Background-panel toggle (deleting may break the toggle)"
            style={{
              display: "inline-block",
              padding: "0 4px",
              marginRight: 4,
              fontSize: 9,
              fontWeight: 700,
              color: "#22272b",
              background: "#90ee90",
              borderRadius: 3,
              lineHeight: "14px",
              flex: "none",
            }}
          >BG</span>
        ) : null}
        <input
          className="scan-manager-name-input"
          value={draft}
          disabled={disabled}
          onBlur={commit}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setDraft(row.displayName);
              event.currentTarget.blur();
            }
          }}
        />
      </div>
      <div className={cellClass} onMouseDown={selectFromCell}>{formatDate(row.createdAt)}</div>
      <div className={`${cellClass} scan-manager-number`} onMouseDown={selectFromCell}>{row.summary.pointsRecorded.toLocaleString()}</div>
      <div className={`${cellClass} scan-manager-number`} onMouseDown={selectFromCell}>{formatBytes(row.approxBytes)}</div>
      <div className={cellClass} onMouseDown={selectFromCell}>
        <span className={`scan-manager-pill scan-manager-pill--${row.source}${row.isLoaded ? " scan-manager-pill--loaded" : ""}`}>
          {sourceLabel(row)}
        </span>
      </div>
      <div className={`${cellClass} scan-manager-row-actions`}>
        {row.isRemoteOnly ? (
          <button type="button" disabled={disabled} onClick={onLoad}>Load remote</button>
        ) : null}
        <button type="button" disabled={disabled} onClick={onHide}>Hide</button>
      </div>
    </>
  );
}

/** Single inline status slot to the right of the action buttons. Holds at
 *  most one message at a time, with priority `error > busy > notice > hint`.
 *  Errors and notices are *toasts* — they get the `--toast` class which
 *  triggers a CSS fade-out at 9s; the parent clears them at 10s. busy and
 *  hint reflect live state so they don't fade. The `key` on the toast
 *  element restarts the animation when a new message replaces an existing
 *  one. */
function ScanManagerStatus({ busy, error, hint, notice }: {
  busy: string | null;
  error: string | null;
  hint: string | null;
  notice: string | null;
}) {
  if (error !== null) {
    return <span key={`err:${error}`} className="scan-manager-status scan-manager-status--error scan-manager-status--toast">{error}</span>;
  }
  if (busy !== null) {
    return <span className="scan-manager-status scan-manager-status--busy">{`${busy}...`}</span>;
  }
  if (notice !== null) {
    return <span key={`note:${notice}`} className="scan-manager-status scan-manager-status--notice scan-manager-status--toast">{notice}</span>;
  }
  if (hint !== null) {
    return <span className="scan-manager-status scan-manager-status--hint">{hint}</span>;
  }
  return <span className="scan-manager-status" aria-hidden="true" />;
}

import { useEffect, useRef, useState } from "react";

import type { SpaceMode } from "@/features/critical-strip/criticalStripTypes";
import { CRITICAL_STRIP_MANIFEST } from "@/features/critical-strip/criticalStripPointSetManifest";

type Props = {
  totalPoints: number;
  bandsVisible: boolean;
  onBandsChange: (v: boolean) => void;
  spaceMode: SpaceMode;
  onToggleSpaceMode: () => void;
  selectedSetIds: Set<string>;
  loadingIds: Set<string>;
  onToggleSet: (id: string) => void;
  ariasExclusive: boolean;
  ariasLoading: boolean;
  onToggleArias: () => void;
};

/**
 * Header bar for the critical strip panel: point set dropdown, total count, toggles.
 */
export function CriticalStripHeader({
  totalPoints,
  bandsVisible,
  onBandsChange,
  spaceMode,
  onToggleSpaceMode,
  selectedSetIds,
  loadingIds,
  onToggleSet,
  ariasExclusive,
  ariasLoading,
  onToggleArias,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "6px 6px 4px",
        borderBottom: "1px solid var(--border)",
        background: "rgba(11, 13, 18, 0.6)",
        backdropFilter: "blur(3px)",
        flexShrink: 0,
        position: "relative",
        zIndex: 50,
      }}
    >
      {/* Dropdown row — dimmed while Arias solo mode hides all other overlays */}
      <div style={{ opacity: ariasExclusive ? 0.35 : 1, transition: "opacity 0.15s" }}>
        <PointSetDropdown
          selectedSetIds={selectedSetIds}
          loadingIds={loadingIds}
          onToggleSet={onToggleSet}
        />
      </div>

      {/* Arias positive-t f-zeros — solo overlay (hides every other set when on) */}
      <button
        type="button"
        onClick={onToggleArias}
        title="Show ONLY Arias de Reyna's positive-t zeros of f(s); hides all other selected overlays"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 6px",
          border: `1px solid ${ariasExclusive ? "var(--accent)" : "var(--border-hi)"}`,
          background: ariasExclusive ? "var(--accent-glow)" : "var(--surface-2)",
          color: ariasExclusive ? "var(--accent)" : "var(--text)",
          cursor: "pointer",
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          textAlign: "left",
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            flexShrink: 0,
            border: `1px solid ${ariasExclusive ? "var(--accent)" : "var(--border-hi)"}`,
            background: ariasExclusive ? "var(--accent)" : "transparent",
          }}
        />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Arias f-zeros (t&gt;0) — solo {ariasLoading ? "…" : ariasExclusive ? "◉" : ""}
        </span>
      </button>

      {/* Stats + toggles row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text-dim)",
            flex: "1 1 auto",
            whiteSpace: "nowrap",
          }}
        >
          Total: {totalPoints.toLocaleString()}
        </span>

        {/* Bands toggle */}
        <label
          style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", flexShrink: 0 }}
        >
          <input
            type="checkbox"
            checked={bandsVisible}
            onChange={(e) => onBandsChange(e.target.checked)}
            style={{ accentColor: "var(--accent)", width: 10, height: 10 }}
          />
          <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
            Bands
          </span>
        </label>

        {/* Space mode toggle */}
        <button
          type="button"
          onClick={onToggleSpaceMode}
          style={{
            appearance: "none",
            border: "1px solid var(--border-hi)",
            background: "transparent",
            color: "var(--accent)",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            padding: "2px 5px",
            cursor: "pointer",
            flexShrink: 0,
            letterSpacing: "0.06em",
          }}
        >
          {spaceMode === "index" ? "T" : "t"}
        </button>
      </div>
    </div>
  );
}

// ── Inline multiselect dropdown ────────────────────────────────────────────

type DropdownProps = {
  selectedSetIds: Set<string>;
  loadingIds: Set<string>;
  onToggleSet: (id: string) => void;
};

function PointSetDropdown({ selectedSetIds, loadingIds, onToggleSet }: DropdownProps) {
  const selectedCount = selectedSetIds.size;
  const label = selectedCount === 0
    ? "Select point sets…"
    : selectedCount === 1
      ? (CRITICAL_STRIP_MANIFEST.find((m) => selectedSetIds.has(m.id))?.label ?? "1 selected")
      : `${String(selectedCount)} selected`;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Close on click outside the dropdown root.
  useEffect(() => {
    if (!isOpen) return;
    const onDocPointerDown = (ev: MouseEvent): void => {
      const node = rootRef.current;
      if (node === null) return;
      const target = ev.target instanceof Node ? ev.target : null;
      if (target !== null && node.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", onDocPointerDown, true);
    return () => { document.removeEventListener("mousedown", onDocPointerDown, true); };
  }, [isOpen]);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "3px 6px",
          border: "1px solid var(--border-hi)",
          background: "var(--surface-2)",
          cursor: "pointer",
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          color: "var(--text)",
          listStyle: "none",
          userSelect: "none",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </span>
        <span style={{ flexShrink: 0, marginLeft: 6, color: "var(--text-dim)", fontSize: 8 }}>
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
      <div
        onMouseDownCapture={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "100%",
          zIndex: 100,
          background: "rgba(11, 13, 18, 0.55)",
          backdropFilter: "blur(3px)",
          border: "1px solid var(--border-hi)",
          maxHeight: "min(80vh, 760px)",
          overflowY: "auto",
        }}
      >
        {CRITICAL_STRIP_MANIFEST.map((entry) => {
          const isSelected = selectedSetIds.has(entry.id);
          const isLoading = loadingIds.has(entry.id);
          return (
            <label
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 8px",
                cursor: "pointer",
                background: isSelected ? "rgba(102,217,255,0.06)" : "transparent",
                borderBottom: "1px solid var(--border)",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: isSelected ? "var(--accent)" : "var(--text)",
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isLoading}
                onChange={() => onToggleSet(entry.id)}
                style={{ accentColor: "var(--accent)", flexShrink: 0 }}
              />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {entry.label}
              </span>
              {isLoading && (
                <span style={{ marginLeft: "auto", color: "var(--text-dim)", flexShrink: 0 }}>…</span>
              )}
            </label>
          );
        })}
      </div>
      )}
    </div>
  );
}

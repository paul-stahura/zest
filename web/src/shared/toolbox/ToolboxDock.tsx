import { useEffect, useRef, useState } from "react";

import { RenderToolboxControl } from "@/shared/toolbox/renderToolboxControl";
import { toolboxSectionStableKey } from "@/shared/toolbox/toolboxSectionStableKey";
import type { ToolboxContext, ToolboxSection } from "@/shared/visualization/contracts";

type ToolboxDockProps = {
  sections: ToolboxSection[];
  ctx: ToolboxContext;
};

type CollapsedMap = Record<string, boolean>;

const COLLAPSED_STORAGE_KEY = "zest:toolbox-collapsed";

function readCollapsedFromStorage(): CollapsedMap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const out: CollapsedMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "boolean") out[key] = value;
    }
    return out;
  } catch {
    return null;
  }
}

function writeCollapsedToStorage(state: CollapsedMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Best-effort persistence; private mode / quota errors are non-fatal.
  }
}

function seedCollapsedState(sections: ToolboxSection[]): CollapsedMap {
  // Persisted state from a previous session wins over the section's
  // defaultCollapsed hint, so the user's manual choices stick across reloads.
  const persisted = readCollapsedFromStorage();
  const next: CollapsedMap = {};
  for (const section of sections) {
    const key = toolboxSectionStableKey(section);
    if (persisted !== null && key in persisted) {
      next[key] = persisted[key]!;
    } else if (section.defaultCollapsed === true) {
      next[key] = true;
    }
  }
  return next;
}

/**
 * Docked toolbox with collapsible sections; collapse state persists per-section
 * across reloads in `localStorage` (key `zest:toolbox-collapsed`). Section keys
 * are contributor-scoped via {@link toolboxSectionStableKey}, so per-workspace
 * sections don't collide.
 */
export function ToolboxDock({ sections, ctx }: ToolboxDockProps) {
  const [collapsed, setCollapsed] = useState<CollapsedMap>(() => seedCollapsedState(sections));

  // Mirror collapse-state changes to localStorage. Skipped on first render
  // because seedCollapsedState already loaded from storage; redundant writes
  // do no harm, just stay consistent if the user toggles after mount.
  useEffect(() => {
    writeCollapsedToStorage(collapsed);
  }, [collapsed]);
  // When a section opens, scroll its header into view so the body's first
  // children (often the action-button row) aren't hidden above the dock's
  // scroll viewport. Tracked per-section in a ref map so we don't trigger
  // scrolls on every render.
  const headerRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  const lastOpenedRef = useRef<string | null>(null);

  useEffect(() => {
    setCollapsed((prev) => {
      const next: CollapsedMap = { ...prev };
      const keys = new Set(sections.map((s) => toolboxSectionStableKey(s)));
      for (const key of Object.keys(next)) {
        if (!keys.has(key)) {
          delete next[key];
        }
      }
      for (const section of sections) {
        const stableKey = toolboxSectionStableKey(section);
        if (!(stableKey in next) && section.defaultCollapsed === true) {
          next[stableKey] = true;
        }
      }
      return next;
    });
  }, [sections]);

  return (
    <aside className="toolbox-dock">
      {sections.map((section) => {
        const stableKey = toolboxSectionStableKey(section);
        const isCollapsed = collapsed[stableKey] === true;
        const CustomPanel = section.CustomPanel;
        if (section.bare === true) {
          return (
            <section key={stableKey} className="toolbox-section toolbox-section-bare">
              <div className="toolbox-section-body">
                {CustomPanel !== undefined ? <CustomPanel ctx={ctx} /> : null}
                {(section.controls ?? []).map((control) => (
                  <RenderToolboxControl key={`${stableKey}::${control.id}`} control={control} />
                ))}
              </div>
            </section>
          );
        }
        return (
          <section key={stableKey} className="toolbox-section">
            <button
              type="button"
              ref={(el) => { headerRefs.current.set(stableKey, el); }}
              onClick={() => {
                const willOpen = isCollapsed;
                setCollapsed((prev) => ({
                  ...prev,
                  [stableKey]: !isCollapsed,
                }));
                if (willOpen) {
                  lastOpenedRef.current = stableKey;
                  // Defer to after the body renders so the header scrolls
                  // up to the top of the dock viewport with the body
                  // following it (instead of staying mid-viewport with the
                  // body extending below the fold).
                  requestAnimationFrame(() => {
                    const el = headerRefs.current.get(stableKey);
                    if (el !== null && el !== undefined) {
                      el.scrollIntoView({ block: "start", behavior: "smooth" });
                    }
                  });
                }
              }}
              className={`toolbox-section-header${!isCollapsed ? " open" : ""}`}
            >
              <span className="toolbox-section-chevron">{isCollapsed ? "▶" : "▼"}</span>
              {section.title}
            </button>
            {!isCollapsed ? (
              <div className="toolbox-section-body">
                {CustomPanel !== undefined ? <CustomPanel ctx={ctx} /> : null}
                {(section.controls ?? []).map((control) => (
                  <RenderToolboxControl key={`${stableKey}::${control.id}`} control={control} />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </aside>
  );
}

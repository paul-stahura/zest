import { useEffect, useState } from "react";

import type { DisplayControlsState } from "@/features/zeros-of-f/types";
import type { ToolboxContext, VisualizationModel } from "@/shared/visualization/contracts";

interface BackgroundPanelProps {
  ctx: ToolboxContext;
}

interface FeaturePointCounts {
  criticalStripGuides: number;
  zetaZeros: number;
  legRatio: number | null;
  legFoldBack: number | null;
  legFoldOut: number | null;
  sum1R1ak: number | null;
  sum1R1akV1: number | null;
  legRakFolded: number | null;
  legRpsFolded: number | null;
  sum1R1ps: number | null;
  variantBackground: number | null;
}

interface BackgroundCapableModel {
  getDisplayState: () => DisplayControlsState;
  setBackgroundDefaultName: (name: string) => void;
  setBackgroundDisplay: (opacity: number, sizeMult: number) => void;
  setShowZetaZeros: (show: boolean) => void;
  setShowAriasSolo: (show: boolean) => void;
  setShowCriticalStripGuides: (show: boolean) => void;
  setShowBoundary: (show: boolean) => void;
  setShowAriasBoundary: (show: boolean) => void;
  setShowScanFloor: (show: boolean) => void;
  setShowNegTZerosRidge: (show: boolean) => void;
  setShowIntegerTGrid: (show: boolean) => void;
  setBgOverlay: (
    id: "ratio" | "foldBack" | "foldOut"
      | "sum1R1ak" | "sum1R1akV1"
      | "legRakFolded" | "legRpsFolded" | "sum1R1ps",
    show: boolean,
  ) => Promise<void>;
  forceRetryBackgroundHydrate: () => Promise<{ ok: boolean; message: string }>;
  getBackgroundFeaturePointCounts: () => Promise<FeaturePointCounts>;
}

function formatCount(n: number | null): string {
  if (n === null) return "—";
  if (n === 0) return "0";
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

const countStyle = {
  marginLeft: "auto",
  fontFamily: "monospace",
  fontSize: 10,
  color: "#888",
} as const;

/**
 * Each variant choice maps to the static-import filename it represents. Add
 * a new entry here when a new variant background asset lands in
 * `public/zeros-of-f-imports/`. The dropdown label is what the user sees;
 * the filename is what gets stored in `backgroundDefaultName` and matched
 * against archive entry labels.
 */
interface VariantChoice { id: string; label: string; filename: string; }
const VARIANT_CHOICES: VariantChoice[] = [
  { id: "Rak", label: "Rak", filename: "scan_default3-post-proc.csv" },
  { id: "Rps", label: "Rps", filename: "scan_R1-background.csv" },
];

function asBackgroundCapable(m: VisualizationModel): BackgroundCapableModel | null {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- methods checked below.
  const c = m as unknown as Partial<BackgroundCapableModel>;
  if (
    typeof c.getDisplayState === "function" &&
    typeof c.setBackgroundDefaultName === "function" &&
    typeof c.setBackgroundDisplay === "function" &&
    typeof c.setShowZetaZeros === "function" &&
    typeof c.setShowAriasSolo === "function" &&
    typeof c.setShowCriticalStripGuides === "function" &&
    typeof c.setShowBoundary === "function" &&
    typeof c.setShowAriasBoundary === "function" &&
    typeof c.setShowScanFloor === "function" &&
    typeof c.setShowNegTZerosRidge === "function" &&
    typeof c.setShowIntegerTGrid === "function" &&
    typeof c.setBgOverlay === "function" &&
    typeof c.getBackgroundFeaturePointCounts === "function" &&
    typeof c.forceRetryBackgroundHydrate === "function"
  ) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- methods just verified above.
    return c as BackgroundCapableModel;
  }
  return null;
}

/**
 * Brightness + size options. Each entry pairs an opacity with a point-size
 * multiplier (relative to the live scatter's 2 px base). "None" (0) hides
 * the background layer without disposing it — selecting any non-zero value
 * brings it back. The two 100% rows let the user pick how chunky the points
 * should look at full brightness.
 */
interface BgOption { id: string; label: string; opacity: number; size: number; }
const BG_OPTIONS: BgOption[] = [
  { id: "none",   label: "None",        opacity: 0,    size: 1 },
  { id: "5",      label: "5%",          opacity: 0.05, size: 1 },
  { id: "10",     label: "10%",         opacity: 0.1,  size: 1 },
  { id: "50",     label: "50%",         opacity: 0.5,  size: 1 },
  { id: "100x1",  label: "100% 1x",     opacity: 1.0,  size: 1 },
  { id: "100x15", label: "100% 1.5x",   opacity: 1.0,  size: 1.5 },
];

/**
 * Configures the persistent "compare" background:
 *  - Default scan name (matches an archive label) loaded as background on
 *    startup.
 *  - Brightness multiplier: 10 / 50 / 100 %.
 *
 * The opacity also applies live whenever a scan starts and the previous
 * scatter is demoted to the background layer.
 */
export function BackgroundPanel({ ctx }: BackgroundPanelProps) {
  const model = asBackgroundCapable(ctx.visualizationModel);
  const display = model !== null ? model.getDisplayState() : null;
  // Per-feature point counts. Refetched on mount and whenever a toggle
  // changes (so flipping a bg-overlay on/off triggers a refresh of the
  // utilized rows in the scan manager etc.).
  const [counts, setCounts] = useState<FeaturePointCounts | null>(null);
  useEffect(() => {
    if (model === null) return;
    let cancelled = false;
    void model.getBackgroundFeaturePointCounts().then((c) => {
      if (!cancelled) setCounts(c);
    });
    return () => { cancelled = true; };
  }, [
    model,
    display?.showCriticalStripGuides,
    display?.showZetaZeros,
    display?.showBgLegRatio,
    display?.showBgLegFoldBack,
    display?.showBgLegFoldOut,
    display?.showBgSum1R1ak,
    display?.showBgSum1R1akV1,
    display?.showBgLegRakFolded,
    display?.showBgLegRpsFolded,
    display?.showBgSum1R1ps,
    display?.backgroundDefaultName,
  ]);

  if (model === null || display === null) {
    return <div style={{ fontSize: 11, color: "#888" }}>Background unavailable</div>;
  }

  // Match the persisted filename to one of the known variant choices. If it
  // doesn't match anything (legacy state, or a custom name from before the
  // dropdown), fall back to the first option visually so the dropdown isn't
  // blank — but don't overwrite the persisted state until the user picks.
  const currentVariant =
    VARIANT_CHOICES.find((v) => v.filename === display.backgroundDefaultName)
    ?? VARIANT_CHOICES[0]!;

  // Match the brightness dropdown's selected value to the closest
  // (opacity, size) pair so a saved (0.5, 1) still picks "50%" cleanly.
  const score = (o: BgOption): number =>
    Math.abs(o.opacity - display.backgroundOpacity)
      + 0.01 * Math.abs(o.size - display.backgroundSizeMult);
  const selected = BG_OPTIONS.reduce((best, opt) =>
    score(opt) < score(best) ? opt : best,
    BG_OPTIONS[0]!,
  );

  return (
    <div style={{ padding: "4px 0", fontSize: 11 }}>
      <label className="zest-toggle-label">
        <span className="zest-label">Critical strip guides</span>
        <span style={countStyle}>{formatCount(counts?.criticalStripGuides ?? null)} pts</span>
        <span className="zest-toggle-track">
          <input
            type="checkbox"
            className="zest-toggle-input"
            checked={display.showCriticalStripGuides}
            onChange={(e) => model.setShowCriticalStripGuides(e.target.checked)}
          />
          <span className="zest-toggle-track-bg" />
          <span className="zest-toggle-thumb-dot" />
        </span>
      </label>
      <label className="zest-toggle-label">
        <span className="zest-label">Show π-boundary</span>
        <span className="zest-toggle-track">
          <input
            type="checkbox"
            className="zest-toggle-input"
            checked={display.showBoundary}
            onChange={(e) => model.setShowBoundary(e.target.checked)}
          />
          <span className="zest-toggle-track-bg" />
          <span className="zest-toggle-thumb-dot" />
        </span>
      </label>
      <label className="zest-toggle-label" title="Arias's left-edge boundary of the positive-t zeros: −σ = 2.2·T^(2/3)">
        <span className="zest-label">Show Arias boundary</span>
        <span className="zest-toggle-track">
          <input
            type="checkbox"
            className="zest-toggle-input"
            checked={display.showAriasBoundary}
            onChange={(e) => model.setShowAriasBoundary(e.target.checked)}
          />
          <span className="zest-toggle-track-bg" />
          <span className="zest-toggle-thumb-dot" />
        </span>
      </label>
      <label className="zest-toggle-label">
        <span className="zest-label">Show scan floor</span>
        <span className="zest-toggle-track">
          <input
            type="checkbox"
            className="zest-toggle-input"
            checked={display.showScanFloor}
            onChange={(e) => model.setShowScanFloor(e.target.checked)}
          />
          <span className="zest-toggle-track-bg" />
          <span className="zest-toggle-thumb-dot" />
        </span>
      </label>
      <label className="zest-toggle-label">
        <span className="zest-label">Integer-T grid</span>
        <span className="zest-toggle-track">
          <input
            type="checkbox"
            className="zest-toggle-input"
            checked={display.showIntegerTGrid}
            onChange={(e) => model.setShowIntegerTGrid(e.target.checked)}
          />
          <span className="zest-toggle-track-bg" />
          <span className="zest-toggle-thumb-dot" />
        </span>
      </label>
      <label className="zest-toggle-label">
        <span className="zest-label">Display ζ zeros</span>
        <span style={countStyle}>{formatCount(counts?.zetaZeros ?? null)} pts</span>
        <span className="zest-toggle-track">
          <input
            type="checkbox"
            className="zest-toggle-input"
            checked={display.showZetaZeros}
            onChange={(e) => model.setShowZetaZeros(e.target.checked)}
          />
          <span className="zest-toggle-track-bg" />
          <span className="zest-toggle-thumb-dot" />
        </span>
      </label>
      <label
        className="zest-toggle-label"
        title="Show ONLY Arias de Reyna's positive-t zeros of f(s) (162k). Hides every scan, background, and overlay while on."
        style={display.showAriasSolo ? { outline: "1px solid #ff59d8", outlineOffset: 2 } : undefined}
      >
        <span className="zest-label" style={{ color: display.showAriasSolo ? "#ff59d8" : undefined }}>
          Arias f-zeros (t&gt;0) — solo
        </span>
        <span className="zest-toggle-track">
          <input
            type="checkbox"
            className="zest-toggle-input"
            checked={display.showAriasSolo}
            onChange={(e) => model.setShowAriasSolo(e.target.checked)}
          />
          <span className="zest-toggle-track-bg" />
          <span className="zest-toggle-thumb-dot" />
        </span>
      </label>
      {display.showAriasSolo && (
        <div style={{ fontSize: 10, color: "#ff9de6", padding: "0 0 2px 2px" }}>
          Solo: all other overlays &amp; scans hidden.
        </div>
      )}
      {/* Brightness applies to every overlay below — at 0% they all stay
          hidden even though the toggles are on. Placed here as a reminder. */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
        <span style={{ color: "#bbb", width: 110 }}>Brightness</span>
        <select
          value={selected.id}
          onChange={(e) => {
            const opt = BG_OPTIONS.find((o) => o.id === e.target.value);
            if (opt) model.setBackgroundDisplay(opt.opacity, opt.size);
          }}
          style={{ fontSize: 11, padding: "2px 4px", flex: 1 }}
        >
          {BG_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>

      <label className="zest-toggle-label">
        <span className="zest-label">|Σ₁+R₁| = |Σ₂+R₂|</span>
        <span style={countStyle}>{formatCount(counts?.legRatio ?? null)} pts</span>
        <span className="zest-toggle-track">
          <input
            type="checkbox"
            className="zest-toggle-input"
            checked={display.showBgLegRatio}
            onChange={(e) => void model.setBgOverlay("ratio", e.target.checked)}
          />
          <span className="zest-toggle-track-bg" />
          <span className="zest-toggle-thumb-dot" />
        </span>
      </label>
      <label className="zest-toggle-label">
        <span className="zest-label">∠(Σ₁+R₁, Σ₂+R₂) = π</span>
        <span style={countStyle}>{formatCount(counts?.legFoldBack ?? null)} pts</span>
        <span className="zest-toggle-track">
          <input
            type="checkbox"
            className="zest-toggle-input"
            checked={display.showBgLegFoldBack}
            onChange={(e) => void model.setBgOverlay("foldBack", e.target.checked)}
          />
          <span className="zest-toggle-track-bg" />
          <span className="zest-toggle-thumb-dot" />
        </span>
      </label>
      <label className="zest-toggle-label">
        <span className="zest-label">∠(Σ₁+R₁, Σ₂+R₂) = 0</span>
        <span style={countStyle}>{formatCount(counts?.legFoldOut ?? null)} pts</span>
        <span className="zest-toggle-track">
          <input
            type="checkbox"
            className="zest-toggle-input"
            checked={display.showBgLegFoldOut}
            onChange={(e) => void model.setBgOverlay("foldOut", e.target.checked)}
          />
          <span className="zest-toggle-track-bg" />
          <span className="zest-toggle-thumb-dot" />
        </span>
      </label>
      <label className="zest-toggle-label">
        <span className="zest-label">sum1+R1ak points</span>
        <span style={countStyle}>{formatCount(counts?.sum1R1ak ?? null)} pts</span>
        <span className="zest-toggle-track">
          <input
            type="checkbox"
            className="zest-toggle-input"
            checked={display.showBgSum1R1ak}
            onChange={(e) => void model.setBgOverlay("sum1R1ak", e.target.checked)}
          />
          <span className="zest-toggle-track-bg" />
          <span className="zest-toggle-thumb-dot" />
        </span>
      </label>
      <label className="zest-toggle-label">
        <span className="zest-label">sum1+R1ak v1</span>
        <span style={countStyle}>{formatCount(counts?.sum1R1akV1 ?? null)} pts</span>
        <span className="zest-toggle-track">
          <input
            type="checkbox"
            className="zest-toggle-input"
            checked={display.showBgSum1R1akV1}
            onChange={(e) => void model.setBgOverlay("sum1R1akV1", e.target.checked)}
          />
          <span className="zest-toggle-track-bg" />
          <span className="zest-toggle-thumb-dot" />
        </span>
      </label>
      <label className="zest-toggle-label">
        <span className="zest-label">leg1 leg2 Rak folded-in v1</span>
        <span style={countStyle}>{formatCount(counts?.legRakFolded ?? null)} pts</span>
        <span className="zest-toggle-track">
          <input
            type="checkbox"
            className="zest-toggle-input"
            checked={display.showBgLegRakFolded}
            onChange={(e) => void model.setBgOverlay("legRakFolded", e.target.checked)}
          />
          <span className="zest-toggle-track-bg" />
          <span className="zest-toggle-thumb-dot" />
        </span>
      </label>
      <label className="zest-toggle-label">
        <span className="zest-label">leg1 leg2 Rps folded-in pair</span>
        <span style={countStyle}>{formatCount(counts?.legRpsFolded ?? null)} pts</span>
        <span className="zest-toggle-track">
          <input
            type="checkbox"
            className="zest-toggle-input"
            checked={display.showBgLegRpsFolded}
            onChange={(e) => void model.setBgOverlay("legRpsFolded", e.target.checked)}
          />
          <span className="zest-toggle-track-bg" />
          <span className="zest-toggle-thumb-dot" />
        </span>
      </label>
      <label className="zest-toggle-label">
        <span className="zest-label">sum1+R1ps pair</span>
        <span style={countStyle}>{formatCount(counts?.sum1R1ps ?? null)} pts</span>
        <span className="zest-toggle-track">
          <input
            type="checkbox"
            className="zest-toggle-input"
            checked={display.showBgSum1R1ps}
            onChange={(e) => void model.setBgOverlay("sum1R1ps", e.target.checked)}
          />
          <span className="zest-toggle-track-bg" />
          <span className="zest-toggle-thumb-dot" />
        </span>
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
        <span style={{ color: "#bbb", width: 110 }}>Variant</span>
        <select
          value={currentVariant.id}
          onChange={(e) => {
            const choice = VARIANT_CHOICES.find((v) => v.id === e.target.value);
            if (choice !== undefined) model.setBackgroundDefaultName(choice.filename);
          }}
          style={{ fontSize: 11, padding: "2px 4px", flex: 1 }}
        >
          {VARIANT_CHOICES.map((v) => (
            <option key={v.id} value={v.id}>{v.label}</option>
          ))}
        </select>
        <span style={countStyle}>{formatCount(counts?.variantBackground ?? null)} pts</span>
      </div>

      {(() => {
        // Color the File row green when the variant file is actually in the
        // browser's local archive (counts.variantBackground != null) and red
        // when it's missing. When red, the row becomes a button that
        // force-retries hydration and reports the outcome.
        const found = (counts?.variantBackground ?? null) !== null;
        const empty = display.backgroundDefaultName.length === 0;
        const color = empty ? "#888" : (found ? "#7ed957" : "#ff6b6b");
        const onClickRetry = async (): Promise<void> => {
          const res = await model.forceRetryBackgroundHydrate();
          // eslint-disable-next-line no-alert
          window.alert(res.message);
        };
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
            <span style={{ color: "#bbb", width: 110 }}>File</span>
            <span
              style={{
                flex: 1,
                color,
                fontSize: 10,
                fontFamily: "monospace",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                cursor: !empty && !found ? "pointer" : "default",
                textDecoration: !empty && !found ? "underline" : "none",
              }}
              title={empty ? "(no variant selected)" : (found
                ? `Found in archive: ${display.backgroundDefaultName}`
                : `NOT in archive — click to retry hydrate of ${display.backgroundDefaultName}`)}
              onClick={() => { if (!empty && !found) void onClickRetry(); }}
            >
              {empty ? "(none)" : display.backgroundDefaultName}
              {!empty && !found ? " ← click to retry" : ""}
            </span>
          </div>
        );
      })()}

      {/* Negative-t (R1nak) zeros ridge — cyan curve σ*(T)=π·I(T)/(2·ln(⌊T⌋+½))
          that holds all the t<0 zeros. Kept at the very bottom of Overlays. */}
      <label className="zest-toggle-label">
        <span className="zest-label" style={{ color: "#00e5ff" }}>−t zeros ridge line</span>
        <span className="zest-toggle-track">
          <input
            type="checkbox"
            className="zest-toggle-input"
            checked={display.showNegTZerosRidge}
            onChange={(e) => model.setShowNegTZerosRidge(e.target.checked)}
          />
          <span className="zest-toggle-track-bg" />
          <span className="zest-toggle-thumb-dot" />
        </span>
      </label>

    </div>
  );
}

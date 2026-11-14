import { useEffect, useState } from "react";

import type { ScanControlsState } from "@/features/zeros-of-f/types";
import type { ToolboxContext, VisualizationModel } from "@/shared/visualization/contracts";
import { fVariantParts, makeFVariant, type FFamily } from "@/shared/math/zerosOfF";
import { TwoSideToggle } from "@/features/zeros-of-f/controls/TwoSideToggle";

interface ScanRangePanelProps {
  ctx: ToolboxContext;
}

/** Structural duck-type — survives Vite HMR class-identity drift. */
interface ScanRangeCapableModel {
  getScanControls: () => ScanControlsState;
  updateScanControls: (patch: Partial<ScanControlsState>) => void;
}

function asScanRangeCapable(m: VisualizationModel): ScanRangeCapableModel | null {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- methods checked below.
  const c = m as unknown as Partial<ScanRangeCapableModel>;
  if (typeof c.getScanControls === "function" && typeof c.updateScanControls === "function") {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- methods just verified above.
    return c as ScanRangeCapableModel;
  }
  return null;
}

interface RangeRowProps {
  label: string;
  minValue: number;
  maxValue: number;
  onMinCommit: (v: number) => void;
  onMaxCommit: (v: number) => void;
  minOpts?: { min?: number; max?: number };
  maxOpts?: { min?: number; max?: number };
  /** When true, grey out the inputs and ignore edits (value is overridden). */
  disabled?: boolean;
}

function RangeRow({ label, minValue, maxValue, onMinCommit, onMaxCommit, minOpts, maxOpts, disabled = false }: RangeRowProps) {
  const [minText, setMinText] = useState<string>(String(minValue));
  const [maxText, setMaxText] = useState<string>(String(maxValue));
  useEffect(() => { setMinText(String(minValue)); }, [minValue]);
  useEffect(() => { setMaxText(String(maxValue)); }, [maxValue]);

  const commit = (raw: string, fallback: number, onCommit: (v: number) => void): void => {
    const trimmed = raw.trim();
    const v = trimmed === "" ? NaN : parseFloat(trimmed);
    if (Number.isFinite(v)) onCommit(v);
    else onCommit(fallback); // restores prior value via the effect above
  };

  const inputStyle = { width: 70, opacity: disabled ? 0.4 : 1 } as const;
  const subLabelStyle = { fontSize: 10, color: disabled ? "#555" : "#888" } as const;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
      <span style={{ fontSize: 11, color: disabled ? "#666" : "#bbb", width: 14 }}>{label}</span>
      <span style={subLabelStyle}>min</span>
      <input
        className="zest-value-input"
        type="number"
        value={minText}
        min={minOpts?.min}
        max={minOpts?.max}
        disabled={disabled}
        onChange={(e) => setMinText(e.target.value)}
        onBlur={(e) => commit(e.target.value, minValue, onMinCommit)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const el = e.currentTarget;
            commit(el.value, minValue, onMinCommit);
            el.blur();
          }
        }}
        style={inputStyle}
      />
      <span style={subLabelStyle}>max</span>
      <input
        className="zest-value-input"
        type="number"
        value={maxText}
        min={maxOpts?.min}
        max={maxOpts?.max}
        disabled={disabled}
        onChange={(e) => setMaxText(e.target.value)}
        onBlur={(e) => commit(e.target.value, maxValue, onMaxCommit)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const el = e.currentTarget;
            commit(el.value, maxValue, onMaxCommit);
            el.blur();
          }
        }}
        style={inputStyle}
      />
    </div>
  );
}

/**
 * Custom layout for the scan section's variant + range fields:
 *   f variant [▼]
 *   T  [min] [max]
 *   σ  [min] [max]
 *
 * The remaining scan params still render as flat list controls below.
 */
// Each label describes the f = 0 condition the scan detects. The internal
// `value` keys still say "legRatio/legAngle/…" — that's the variant id and
// must not change without touching every cross-cutting code path.
const FAMILY_OPTIONS: Array<{ label: string; value: FFamily }> = [
  { label: "Σ₁ + R₁ = 0", value: "sum1R1" },
  { label: "Σ₂ + R₂ = 0", value: "sum2R2" },
  { label: "|Σ₁+R₁| = |Σ₂+R₂|", value: "legRatio" },
  { label: "∠(Σ₁+R₁, Σ₂+R₂) = π  (antialigned)", value: "legAngle" },
  { label: "∠(Σ₁+R₁, Σ₂+R₂) = 0  (aligned)", value: "legAngleOut" },
  { label: "∠(Σ₁, R₁) = π  (antialigned)", value: "sum1R1Angle" },
];

export function ScanRangePanel({ ctx }: ScanRangePanelProps) {
  const model = asScanRangeCapable(ctx.visualizationModel);
  if (model === null) return null;

  const scan = model.getScanControls();
  const { family, rForm } = fVariantParts(scan.variant);
  const isNeg = scan.branch === "neg";

  return (
    <div style={{ padding: "2px 0 4px" }}>
      {isNeg ? (
        // Negative-t branch: a single fixed form (R1nak). The positive-t
        // family / Rak-Rps controls don't apply, so show a static readout of
        // the formula in force instead.
        <div style={{ fontSize: 11, color: "#bbb", padding: "2px 0", lineHeight: 1.4 }}>
          <div style={{ color: "#ddd" }}>t &lt; 0 &nbsp;(imaginary part −I(T))</div>
          <div style={{ fontSize: 10, color: "#888" }}>
            f = Σ<sub>n≤N</sub> n<sup>−s</sup> + (−i)<sup>−s</sup>/2 · J<sub>M</sub>(s) &nbsp;(R1nak, p=8)
          </div>
        </div>
      ) : (
        <>
          {/* Rak/Rps toggle: picks which R-form family is plugged in everywhere
              R₁ or R₂ appears below. Both legs in leg-pair variants follow the
              same toggle (leg₁ → R₁_<form>, leg₂ → R₂_<form>). */}
          <TwoSideToggle
            label="R form"
            leftValue="ak"
            rightValue="ps"
            leftLabel="Rak"
            rightLabel="Rps"
            value={rForm}
            onChange={(next) => model.updateScanControls({ variant: makeFVariant(family, next) })}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
            <span style={{ fontSize: 11, color: "#bbb" }}>f family</span>
            <select
              value={family}
              onChange={(e) => {
                const raw = e.target.value as FFamily;
                const next: FFamily =
                  raw === "sum1R1" || raw === "sum2R2" || raw === "legRatio"
                    || raw === "legAngle" || raw === "legAngleOut"
                    || raw === "sum1R1Angle"
                    ? raw : "sum1R1";
                model.updateScanControls({ variant: makeFVariant(next, rForm) });
              }}
              style={{ fontSize: 11, padding: "2px 4px", maxWidth: 200, marginLeft: "auto" }}
            >
              {FAMILY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </>
      )}
      {isNeg && (
        // Ridge-range mode: override the T range with a thin band straddling the
        // R1nak zeros ridge σ*(T). Each σ column scans T*(σ)±Δ, so the scan hugs
        // the ridge (where all the t<0 zeros live) instead of a full rectangle.
        <label
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0 1px", cursor: "pointer" }}
          title="Scan a thin band just above and below the −t zeros ridge, instead of a T rectangle. Uses the σ range only."
        >
          <input
            type="checkbox"
            checked={scan.ridgeRange}
            onChange={(e) => model.updateScanControls({ ridgeRange: e.target.checked })}
          />
          <span style={{ fontSize: 11, color: scan.ridgeRange ? "#00e5ff" : "#bbb" }}>ridge range</span>
          {scan.ridgeRange && (
            <span style={{ fontSize: 10, color: "#888" }}>T follows σ*(T) ± Δ</span>
          )}
        </label>
      )}
      <RangeRow
        label="T"
        minValue={scan.tMin}
        maxValue={scan.tMax}
        onMinCommit={(v) => model.updateScanControls({ tMin: v })}
        onMaxCommit={(v) => model.updateScanControls({ tMax: v })}
        minOpts={{ min: 0.1 }}
        maxOpts={{ min: 0.2 }}
        disabled={isNeg && scan.ridgeRange}
      />
      <RangeRow
        label="σ"
        minValue={scan.sigmaMin}
        maxValue={scan.sigmaMax}
        onMinCommit={(v) => model.updateScanControls({ sigmaMin: v })}
        onMaxCommit={(v) => model.updateScanControls({ sigmaMax: v })}
        // Positive-t zeros live at σ ≤ 0, so that branch keeps the cap. The
        // negative-t (R1nak) zeros sit at large positive σ (e.g. σ≈67 at T≈2),
        // so the t<0 branch lifts the cap to let you scan there.
        minOpts={isNeg ? undefined : { max: 0 }}
        maxOpts={isNeg ? undefined : { max: 0 }}
      />
    </div>
  );
}

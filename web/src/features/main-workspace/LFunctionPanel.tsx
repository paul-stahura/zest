import type { ComponentType } from "react";
import type { ToolboxContext } from "@/shared/visualization/contracts";
import { OptionToggle } from "@/shared/toolbox/OptionToggle";
import { getPrimeImaginaryPart, nearestPrime } from "@/shared/math/lFunctionCalculator";

// ---------------------------------------------------------------------------
// Interface the layer must satisfy (avoids circular import)
// ---------------------------------------------------------------------------

export interface LFunctionPanelLayer {
  getIndex(): number;
  getSigma(): number;
  getUsePolyImag(): boolean;

  getL1Enabled(): boolean; setL1Enabled(v: boolean): void;
  getL2Enabled(): boolean; setL2Enabled(v: boolean): void;
  getL1Prime(): number; setL1Prime(v: number): void;
  getL2Prime(): number; setL2Prime(v: number): void;
  getL1SpiralMode(): number; setL1SpiralMode(v: number): void;
  getL2SpiralMode(): number; setL2SpiralMode(v: number): void;
  getL1Reflect(): boolean; setL1Reflect(v: boolean): void;
  getL2Reflect(): boolean; setL2Reflect(v: boolean): void;
  getL1Bisector(): boolean; setL1Bisector(v: boolean): void;
  getL2Bisector(): boolean; setL2Bisector(v: boolean): void;
  getPhantomMode(): number; setPhantomMode(v: number): void;
  getUsePrimeImag(): boolean; setUsePrimeImag(v: boolean): void;
}

// ---------------------------------------------------------------------------
// Option sets
// ---------------------------------------------------------------------------

const PHANTOM_OPTIONS = [{ label: "joints" }, { label: "phantom" }, { label: "both" }];
const SPIRAL_OPTIONS  = [{ label: "fwd" }, { label: "inv" }, { label: "both" }];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  root: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
  },
  topRow: {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: "4px 6px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  lRow: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "5px",
    padding: "4px 6px",
  },
  label: {
    color: "rgba(255,255,255,0.75)",
    fontWeight: 600 as const,
    letterSpacing: "0.06em",
    minWidth: "14px",
  },
  primeInput: {
    width: "36px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "3px",
    color: "rgba(255,255,255,0.85)",
    fontSize: "10px",
    fontFamily: "var(--font-mono)",
    padding: "2px 4px",
    textAlign: "center" as const,
  },
  checkLabel: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "3px",
    color: "rgba(255,255,255,0.7)",
    cursor: "pointer" as const,
    userSelect: "none" as const,
  },
  checkbox: {
    cursor: "pointer" as const,
    accentColor: "var(--accent)",
    width: "12px",
    height: "12px",
  },
  tValue: {
    color: "var(--text-dim)",
    marginLeft: "auto",
    whiteSpace: "nowrap" as const,
  },
};

// ---------------------------------------------------------------------------
// Per-row color backgrounds (matching Unity's L1=red-tint, L2=purple-tint)
// ---------------------------------------------------------------------------

const ROW_BG = ["rgba(100,20,20,0.4)", "rgba(70,20,90,0.4)"] as const;

// ---------------------------------------------------------------------------
// LRow — renders one L-function row (shared for L1 and L2)
// ---------------------------------------------------------------------------

function LRow({
  rowIdx,
  enabled,
  prime,
  spiralMode,
  reflect,
  bisector,
  tValue,
  onEnabledChange,
  onPrimeChange,
  onSpiralModeChange,
  onReflectChange,
  onBisectorChange,
}: {
  rowIdx: 0 | 1;
  enabled: boolean;
  prime: number;
  spiralMode: number;
  reflect: boolean;
  bisector: boolean;
  tValue: number;
  onEnabledChange(v: boolean): void;
  onPrimeChange(v: number): void;
  onSpiralModeChange(v: number): void;
  onReflectChange(v: boolean): void;
  onBisectorChange(v: boolean): void;
}) {
  const label = rowIdx === 0 ? "L1" : "L2";

  return (
    <div style={{ ...styles.lRow, background: ROW_BG[rowIdx] }}>
      <input
        type="checkbox"
        style={styles.checkbox}
        checked={enabled}
        onChange={e => onEnabledChange(e.target.checked)}
      />
      <span style={styles.label}>{label}</span>

      <input
        type="number"
        style={styles.primeInput}
        value={prime}
        min={2}
        step={1}

        onFocus={e => e.target.select()}
        onChange={e => {
          const raw = parseInt(e.target.value, 10);
          if (!Number.isNaN(raw)) onPrimeChange(raw);
        }}
        onBlur={e => {
          const raw = parseInt(e.target.value, 10);
          onPrimeChange(Number.isNaN(raw) ? 2 : nearestPrime(raw));
        }}
        onKeyDown={e => {
          if (e.key === "Enter") {
            const raw = parseInt((e.target as HTMLInputElement).value, 10);
            onPrimeChange(Number.isNaN(raw) ? 2 : nearestPrime(raw));
          }
        }}
      />

      <OptionToggle compact value={spiralMode} options={SPIRAL_OPTIONS} onChange={onSpiralModeChange} />

      <label style={styles.checkLabel}>
        <input
          type="checkbox"
          style={styles.checkbox}
          checked={reflect}
          onChange={e => onReflectChange(e.target.checked)}
        />
        Refl
      </label>

      <label style={styles.checkLabel}>
        <input
          type="checkbox"
          style={styles.checkbox}
          checked={bisector}
          onChange={e => onBisectorChange(e.target.checked)}
        />
        Bisect
      </label>

      <span style={styles.tValue}>t: {tValue.toFixed(4)}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Factory — creates a stable component bound to the layer
// ---------------------------------------------------------------------------

export function createLFunctionPanel(layer: LFunctionPanelLayer): ComponentType<{ ctx: ToolboxContext }> {
  return function LFunctionPanel({ ctx }) {
    const index = layer.getIndex();
    const usePolyImag = layer.getUsePolyImag();
    const usePrimeImag = layer.getUsePrimeImag();

    const t1 = getPrimeImaginaryPart(layer.getL1Prime(), index, usePrimeImag, usePolyImag);
    const t2 = getPrimeImaginaryPart(layer.getL2Prime(), index, usePrimeImag, usePolyImag);

    function refresh() { ctx.requestToolboxRefresh(); }

    return (
      <div style={styles.root}>
        {/* Global options row */}
        <div style={styles.topRow}>
          <OptionToggle
            label="Phantom"
            value={layer.getPhantomMode()}
            options={PHANTOM_OPTIONS}
            onChange={v => { layer.setPhantomMode(v); refresh(); }}
          />
          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              style={styles.checkbox}
              checked={usePrimeImag}
              onChange={e => { layer.setUsePrimeImag(e.target.checked); refresh(); }}
            />
            usePrimeImag
          </label>
        </div>

        {/* L1 row */}
        <LRow
          rowIdx={0}
          enabled={layer.getL1Enabled()}
          prime={layer.getL1Prime()}
          spiralMode={layer.getL1SpiralMode()}
          reflect={layer.getL1Reflect()}
          bisector={layer.getL1Bisector()}
          tValue={t1}
          onEnabledChange={v => { layer.setL1Enabled(v); refresh(); }}
          onPrimeChange={v => { layer.setL1Prime(v); refresh(); }}
          onSpiralModeChange={v => { layer.setL1SpiralMode(v); refresh(); }}
          onReflectChange={v => { layer.setL1Reflect(v); refresh(); }}
          onBisectorChange={v => { layer.setL1Bisector(v); refresh(); }}
        />

        {/* L2 row */}
        <LRow
          rowIdx={1}
          enabled={layer.getL2Enabled()}
          prime={layer.getL2Prime()}
          spiralMode={layer.getL2SpiralMode()}
          reflect={layer.getL2Reflect()}
          bisector={layer.getL2Bisector()}
          tValue={t2}
          onEnabledChange={v => { layer.setL2Enabled(v); refresh(); }}
          onPrimeChange={v => { layer.setL2Prime(v); refresh(); }}
          onSpiralModeChange={v => { layer.setL2SpiralMode(v); refresh(); }}
          onReflectChange={v => { layer.setL2Reflect(v); refresh(); }}
          onBisectorChange={v => { layer.setL2Bisector(v); refresh(); }}
        />
      </div>
    );
  };
}

import type { ComponentType } from "react";
import type { ToolboxContext } from "@/shared/visualization/contracts";
import { OptionToggle } from "@/shared/toolbox/OptionToggle";
import { indexToImag } from "@/shared/math/zetaEms";
import {
  HURWITZ_MACHINE_MAX_Q,
  HURWITZ_MACHINE_MIN_Q,
  clampHurwitzModulus,
  cycleHurwitzPreset,
  formatHurwitzCoeffList,
  hurwitzPresetLabel,
  parseHurwitzCoeffList,
  type HurwitzCoeff,
} from "@/shared/math/lFunctionCalculator";

export interface HurwitzMachinePanelLayer {
  getIndex(): number;
  getUsePolyImag(): boolean;
  getEnabled(): boolean;
  setEnabled(v: boolean): void;
  getModulus(): number;
  setModulus(q: number): void;
  getCoeffs(): HurwitzCoeff[];
  setCoeffs(coeffs: HurwitzCoeff[]): void;
  setCoeffAt(residue: number, coeff: HurwitzCoeff): void;
  getSpiralMode(): number;
  setSpiralMode(v: number): void;
  getPhantomMode(): number;
  setPhantomMode(v: number): void;
  getReflect(): boolean;
  setReflect(v: boolean): void;
  getBisector(): boolean;
  setBisector(v: boolean): void;
  getPerp(): boolean;
  setPerp(v: boolean): void;
}

const PHANTOM_OPTIONS = [{ label: "joints" }, { label: "phantom" }, { label: "both" }];
const SPIRAL_OPTIONS = [{ label: "fwd" }, { label: "inv" }, { label: "both" }];

const styles: Record<string, import("react").CSSProperties> = {
  root: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 6px",
    flexWrap: "nowrap",
  },
  checkLabel: {
    display: "flex",
    alignItems: "center",
    gap: "3px",
    color: "rgba(255,255,255,0.7)",
    cursor: "pointer",
    userSelect: "none",
  },
  checkbox: {
    cursor: "pointer",
    accentColor: "var(--accent)",
    width: "12px",
    height: "12px",
  },
  label: {
    color: "rgba(255,255,255,0.75)",
    fontWeight: 600,
    letterSpacing: "0.04em",
  },
  num: {
    width: "36px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "3px",
    color: "rgba(255,255,255,0.85)",
    fontSize: "10px",
    fontFamily: "var(--font-mono)",
    padding: "2px 4px",
    textAlign: "center",
  },
  paste: {
    flex: 1,
    minWidth: "120px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "3px",
    color: "rgba(255,255,255,0.85)",
    fontSize: "10px",
    fontFamily: "var(--font-mono)",
    padding: "2px 4px",
  },
  tValue: {
    color: "rgba(232, 238, 248, 0.95)",
    fontWeight: 600,
    marginLeft: "auto",
    whiteSpace: "nowrap",
  },
  residue: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "2px 6px",
  },
  residueN: {
    width: "18px",
    color: "rgba(255,255,255,0.45)",
  },
  cycle: {
    minWidth: "28px",
    padding: "2px 4px",
    fontSize: "10px",
    fontFamily: "var(--font-mono)",
    color: "rgba(255,255,255,0.85)",
    background: "rgba(32,201,151,0.18)",
    border: "1px solid rgba(32,201,151,0.45)",
    borderRadius: "3px",
    cursor: "pointer",
  },
};

function applyPaste(layer: HurwitzMachinePanelLayer, text: string): void {
  const parsed = parseHurwitzCoeffList(text);
  if (parsed === null) return;
  layer.setCoeffs(parsed);
}

/**
 * Toolbox panel bound to a Hurwitz-machine layer: modulus, χ residues, draw flags.
 */
export function createHurwitzMachinePanel(
  layer: HurwitzMachinePanelLayer,
): ComponentType<{ ctx: ToolboxContext }> {
  return function HurwitzMachinePanel({ ctx }) {
    const coeffs = layer.getCoeffs();
    const t = indexToImag(layer.getIndex(), layer.getUsePolyImag());

    function refresh(): void {
      ctx.requestToolboxRefresh();
    }

    return (
      <div style={styles.root}>
        <div style={styles.row}>
          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              style={styles.checkbox}
              checked={layer.getEnabled()}
              onChange={e => { layer.setEnabled(e.target.checked); refresh(); }}
            />
            draw
          </label>
          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              style={styles.checkbox}
              checked={layer.getReflect()}
              onChange={e => { layer.setReflect(e.target.checked); refresh(); }}
            />
            Refl
          </label>
          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              style={styles.checkbox}
              checked={layer.getBisector()}
              onChange={e => { layer.setBisector(e.target.checked); refresh(); }}
            />
            Bisect
          </label>
          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              style={styles.checkbox}
              checked={layer.getPerp()}
              onChange={e => { layer.setPerp(e.target.checked); refresh(); }}
            />
            perp
          </label>
          <span style={styles.tValue}>t: {t.toFixed(4)}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>q</span>
          <input
            type="number"
            style={styles.num}
            value={layer.getModulus()}
            min={HURWITZ_MACHINE_MIN_Q}
            max={HURWITZ_MACHINE_MAX_Q}
            step={1}
            onFocus={e => e.target.select()}
            onChange={e => {
              const raw = parseInt(e.target.value, 10);
              if (!Number.isNaN(raw)) layer.setModulus(clampHurwitzModulus(raw));
              refresh();
            }}
          />
          <OptionToggle
            label="Phantom"
            value={layer.getPhantomMode()}
            options={PHANTOM_OPTIONS}
            charWidth={7}
            onChange={v => { layer.setPhantomMode(v); refresh(); }}
          />
          <OptionToggle
            label="Spiral"
            value={layer.getSpiralMode()}
            options={SPIRAL_OPTIONS}
            charWidth={4}
            onChange={v => { layer.setSpiralMode(v); refresh(); }}
          />
        </div>

        <div style={styles.row}>
          <span style={styles.label}>χ</span>
          <input
            type="text"
            style={styles.paste}
            defaultValue={formatHurwitzCoeffList(coeffs)}
            key={formatHurwitzCoeffList(coeffs)}
            spellCheck={false}
            onBlur={e => { applyPaste(layer, e.target.value); refresh(); }}
            onKeyDown={e => {
              if (e.key === "Enter") {
                applyPaste(layer, e.currentTarget.value);
                refresh();
              }
            }}
          />
        </div>

        {coeffs.map((c, residue) => (
          <div key={residue} style={styles.residue}>
            <span style={styles.residueN}>{residue}</span>
            <button
              type="button"
              style={styles.cycle}
              onClick={() => { layer.setCoeffAt(residue, cycleHurwitzPreset(c)); refresh(); }}
            >
              {hurwitzPresetLabel(c)}
            </button>
            <span style={styles.label}>re</span>
            <input
              type="number"
              style={styles.num}
              value={c.re}
              step={0.1}
              onChange={e => {
                const re = Number(e.target.value);
                if (Number.isFinite(re)) layer.setCoeffAt(residue, { re, im: c.im });
                refresh();
              }}
            />
            <span style={styles.label}>im</span>
            <input
              type="number"
              style={styles.num}
              value={c.im}
              step={0.1}
              onChange={e => {
                const im = Number(e.target.value);
                if (Number.isFinite(im)) layer.setCoeffAt(residue, { re: c.re, im });
                refresh();
              }}
            />
          </div>
        ))}
      </div>
    );
  };
}

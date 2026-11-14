import type { ComponentType } from "react";
import type { ToolboxContext } from "@/shared/visualization/contracts";
import { HURWITZ_FORMULA_Q_MAX, HURWITZ_FORMULA_Q_MIN } from "@/shared/math/hurwitzFormulaQMax";

export type HurwitzFormulaPanelLayer = {
  getQMax(): number;
  setQMax(v: number): void;
  getSingle(): boolean;
  setSingle(v: boolean): void;
  getShowSpiral(): boolean;
  setShowSpiral(v: boolean): void;
  getShowReverse(): boolean;
  setShowReverse(v: boolean): void;
  getShowBLink(): boolean;
  setShowBLink(v: boolean): void;
  getShowBPoint(): boolean;
  setShowBPoint(v: boolean): void;
  getShowOZ(): boolean;
  setShowOZ(v: boolean): void;
  getShowPerp(): boolean;
  setShowPerp(v: boolean): void;
  getShowCircle(): boolean;
  setShowCircle(v: boolean): void;
  getShowOH(): boolean;
  setShowOH(v: boolean): void;
  getLiveReadout(): string;
};

const styles = {
  root: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
  },
  flags: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
    padding: "4px 6px 6px",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  label: {
    width: "56px",
    flexShrink: 0,
    color: "rgba(255,255,255,0.45)",
    fontWeight: 600,
  },
  checks: {
    display: "flex",
    flexWrap: "wrap" as const,
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
  },
  slider: {
    flex: 1,
    minWidth: "64px",
    height: "10px",
    margin: 0,
    cursor: "pointer",
  },
  checkbox: {
    cursor: "pointer",
    accentColor: "var(--accent)",
    width: "12px",
    height: "12px",
  },
  live: {
    color: "rgba(255,255,255,0.85)",
    fontVariantNumeric: "tabular-nums" as const,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  checkLabel: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    color: "rgba(255,255,255,0.75)",
    cursor: "pointer",
    userSelect: "none" as const,
  },
};

/**
 * Toolbox panel: q slider, then spiral / circle / bisector flag rows.
 */
export function createHurwitzFormulaPanel(
  layer: HurwitzFormulaPanelLayer,
): ComponentType<{ ctx: ToolboxContext }> {
  return function HurwitzFormulaPanel({ ctx }) {
    function refresh(): void {
      ctx.requestToolboxRefresh();
    }
    function Flag(props: {
      label: string;
      checked: boolean;
      onChange: (v: boolean) => void;
    }) {
      return (
        <label style={styles.checkLabel}>
          <input
            type="checkbox"
            style={styles.checkbox}
            checked={props.checked}
            onChange={e => { props.onChange(e.target.checked); refresh(); }}
          />
          {props.label}
        </label>
      );
    }
    const qMax = layer.getQMax();
    return (
      <div style={styles.root}>
        <div style={styles.flags}>
          <div style={styles.row}>
            <span style={styles.live}>{layer.getLiveReadout()}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>{layer.getSingle() ? "q" : "q through"}</span>
            <input
              type="range"
              min={HURWITZ_FORMULA_Q_MIN}
              max={HURWITZ_FORMULA_Q_MAX}
              step={1}
              value={qMax}
              aria-label="formula q"
              style={styles.slider}
              onChange={e => { layer.setQMax(Number(e.target.value)); refresh(); }}
            />
            <span>{qMax}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>spiral</span>
            <div style={styles.checks}>
              <Flag label="one" checked={layer.getSingle()} onChange={v => layer.setSingle(v)} />
              <Flag label="forward" checked={layer.getShowSpiral()} onChange={v => layer.setShowSpiral(v)} />
              <Flag label="reverse" checked={layer.getShowReverse()} onChange={v => layer.setShowReverse(v)} />
            </div>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>circle</span>
            <div style={styles.checks}>
              <Flag label="zeta" checked={layer.getShowCircle()} onChange={v => layer.setShowCircle(v)} />
            </div>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>bisector</span>
            <div style={styles.checks}>
              <Flag label="point" checked={layer.getShowBPoint()} onChange={v => layer.setShowBPoint(v)} />
              <Flag label="link" checked={layer.getShowBLink()} onChange={v => layer.setShowBLink(v)} />
              <Flag label="line" checked={layer.getShowPerp()} onChange={v => layer.setShowPerp(v)} />
            </div>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>lines</span>
            <div style={styles.checks}>
              <Flag label="O to H" checked={layer.getShowOH()} onChange={v => layer.setShowOH(v)} />
              <Flag label="O to zeta" checked={layer.getShowOZ()} onChange={v => layer.setShowOZ(v)} />
            </div>
          </div>
        </div>
      </div>
    );
  };
}

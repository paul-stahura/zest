import type { ComponentType } from "react";
import type { ToolboxContext } from "@/shared/visualization/contracts";

/** Minimal interface the layer must satisfy — avoids circular import with spiralWorkspaceLayer.ts. */
export interface SpiralMatrixLayer {
  getSpiralVisible(): boolean; setSpiralVisible(v: boolean): void;
  getSpiralFirstHalf(): boolean; setSpiralFirstHalf(v: boolean): void;
  getSpiralReflect(): boolean; setSpiralReflect(v: boolean): void;
  getSpiralHalfSigma(): boolean; setSpiralHalfSigma(v: boolean): void;
  getSpiralReverse(): boolean; setSpiralReverse(v: boolean): void;
  getInverseVisible(): boolean; setInverseVisible(v: boolean): void;
  getInverseFirstHalf(): boolean; setInverseFirstHalf(v: boolean): void;
  getInverseReflect(): boolean; setInverseReflect(v: boolean): void;
  getSumXVisible(): boolean; setSumXVisible(v: boolean): void;
  getSumXReflect(): boolean; setSumXReflect(v: boolean): void;
  getSum2xVisible(): boolean; setSum2xVisible(v: boolean): void;
  getSum2xReflect(): boolean; setSum2xReflect(v: boolean): void;
  getZakVisible(): boolean; setZakVisible(v: boolean): void;
  getZakReflect(): boolean; setZakReflect(v: boolean): void;
  getCrossingSumVisible(): boolean; setCrossingSumVisible(v: boolean): void;
  getEtaVisible(): boolean; setEtaVisible(v: boolean): void;
  getZPrimeVisible(): boolean; setZPrimeVisible(v: boolean): void;
  getOrderedChainVisible(): boolean; setOrderedChainVisible(v: boolean): void;
}

const COL_HEADERS = ["Spiral", "1st half", "Reflect", "σ=½", "Reverse", "order"];

type CellDef = { get: (l: SpiralMatrixLayer) => boolean; set: (l: SpiralMatrixLayer, v: boolean) => void } | null;

type RowDef = {
  label: string;
  color: string;
  cells: [CellDef, CellDef, CellDef, CellDef, CellDef, CellDef];
};

function row(
  label: string, color: string,
  spiral: CellDef, firstHalf: CellDef, reflect: CellDef,
  halfSigma: CellDef, reverse: CellDef, order: CellDef,
): RowDef {
  return { label, color, cells: [spiral, firstHalf, reflect, halfSigma, reverse, order] };
}

function cell(
  get: (l: SpiralMatrixLayer) => boolean,
  set: (l: SpiralMatrixLayer, v: boolean) => void,
): CellDef {
  return { get, set };
}

const ROWS: RowDef[] = [
  row("Forward", "#2a5a5a",
    cell(l => l.getSpiralVisible(),   (l, v) => l.setSpiralVisible(v)),
    cell(l => l.getSpiralFirstHalf(), (l, v) => l.setSpiralFirstHalf(v)),
    cell(l => l.getSpiralReflect(),   (l, v) => l.setSpiralReflect(v)),
    cell(l => l.getSpiralHalfSigma(), (l, v) => l.setSpiralHalfSigma(v)),
    cell(l => l.getSpiralReverse(),   (l, v) => l.setSpiralReverse(v)),
    cell(l => l.getOrderedChainVisible(), (l, v) => l.setOrderedChainVisible(v)),
  ),
  row("Inverse", "#3d2a5a",
    cell(l => l.getInverseVisible(),  (l, v) => l.setInverseVisible(v)),
    cell(l => l.getInverseFirstHalf(), (l, v) => l.setInverseFirstHalf(v)),
    cell(l => l.getInverseReflect(),  (l, v) => l.setInverseReflect(v)),
    null, null, null,
  ),
  row("Σ_1x", "#3d3214",
    cell(l => l.getSumXVisible(), (l, v) => l.setSumXVisible(v)),
    null,
    cell(l => l.getSumXReflect(), (l, v) => l.setSumXReflect(v)),
    null, null, null,
  ),
  row("Σ_2x", "#1a3d2a",
    cell(l => l.getSum2xVisible(), (l, v) => l.setSum2xVisible(v)),
    null,
    cell(l => l.getSum2xReflect(), (l, v) => l.setSum2xReflect(v)),
    null, null, null,
  ),
  row("half-half", "#2a3d6a",
    cell(l => l.getZakVisible(), (l, v) => l.setZakVisible(v)),
    null,
    cell(l => l.getZakReflect(), (l, v) => l.setZakReflect(v)),
    null, null, null,
  ),
  row("crossing sum", "#14352f",
    cell(l => l.getCrossingSumVisible(), (l, v) => l.setCrossingSumVisible(v)),
    null, null, null, null, null,
  ),
  row("Eta", "#4a4a1a",
    cell(l => l.getEtaVisible(), (l, v) => l.setEtaVisible(v)),
    null, null, null, null, null,
  ),
  row("Z Prime", "#323232",
    cell(l => l.getZPrimeVisible(), (l, v) => l.setZPrimeVisible(v)),
    null, null, null, null, null,
  ),
];

const styles = {
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "10px",
    fontFamily: "var(--font-mono)",
  },
  headerCell: {
    padding: "3px 2px",
    textAlign: "center" as const,
    color: "var(--text-dim)",
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    fontWeight: 600,
    fontSize: "9px",
  },
  nameCell: {
    padding: "4px 5px",
    color: "rgba(255,255,255,0.75)",
    fontWeight: 600,
    letterSpacing: "0.06em",
    whiteSpace: "nowrap" as const,
    textAlign: "left" as const,
  },
  activeCell: {
    textAlign: "center" as const,
    padding: "2px",
  },
  dimCell: {
    textAlign: "center" as const,
    padding: "2px",
    color: "var(--text-dim)",
    opacity: 0.35,
    fontSize: "11px",
  },
  checkbox: {
    cursor: "pointer",
    accentColor: "var(--accent)",
    width: "13px",
    height: "13px",
  },
};

/**
 * Returns a stable React component for the spiral selection matrix.
 * Created once per layer instance (in the constructor) to avoid React remounting on toolbox refresh.
 */
export function createSpiralMatrixPanel(layer: SpiralMatrixLayer): ComponentType<{ ctx: ToolboxContext }> {
  return function SpiralMatrixPanel({ ctx }) {
    return (
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.headerCell, textAlign: "left" }} />
            {COL_HEADERS.map(h => (
              <th key={h} style={styles.headerCell}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map(rowDef => (
            <tr key={rowDef.label} style={{ background: rowDef.color }}>
              <td style={styles.nameCell}>{rowDef.label}</td>
              {rowDef.cells.map((cellDef, ci) =>
                cellDef !== null ? (
                  <td key={ci} style={styles.activeCell}>
                    <input
                      type="checkbox"
                      style={styles.checkbox}
                      checked={cellDef.get(layer)}
                      onChange={e => {
                        cellDef.set(layer, e.target.checked);
                        ctx.requestToolboxRefresh();
                      }}
                    />
                  </td>
                ) : (
                  <td key={ci} style={styles.dimCell}>—</td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };
}

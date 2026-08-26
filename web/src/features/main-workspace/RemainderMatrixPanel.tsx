import type { ComponentType } from "react";
import type { ToolboxContext } from "@/shared/visualization/contracts";
import { OptionToggle } from "@/shared/toolbox/OptionToggle";

export type RemainderRow = "rHalf" | "rps" | "rak";

/** Minimal interface the layer must satisfy — avoids circular import with remainderWorkspaceLayer.ts. */
export interface RemainderMatrixLayer {
  getPoint(row: RemainderRow): number;     setPoint(row: RemainderRow, v: number): void;
  getR1(row: RemainderRow): number;        setR1(row: RemainderRow, v: number): void;
  getR2(row: RemainderRow): number;        setR2(row: RemainderRow, v: number): void;
  getLegsFwd(row: RemainderRow): number;   setLegsFwd(row: RemainderRow, v: number): void;
  getLegsInv(row: RemainderRow): number;   setLegsInv(row: RemainderRow, v: number): void;
  getSym(row: RemainderRow): number;       setSym(row: RemainderRow, v: number): void;
  getPathSigma(row: RemainderRow): number; setPathSigma(row: RemainderRow, v: number): void;
  getPathIndex(row: RemainderRow): number; setPathIndex(row: RemainderRow, v: number): void;
  getPathLength(): number;                 setPathLength(v: number): void;
  clearAll(): void;
}

const POINT_OPTIONS  = [{ label: "0" }, { label: "fwd" }, { label: "inv" }, { label: "&" }];
const LEGS_OPTIONS   = [{ label: "0" }, { label: "1" }, { label: "2" }];
const SYM_OPTIONS    = [{ label: "0" }, { label: "cut" }, { label: "bisect" }, { label: "ζ/2" }, { label: "equal" }];

const COL_HEADERS: ColKey[] = ["Point", "R1", "R2", "Legs+", "Legs−", "Sym", "Pathσ", "PathI"];

const ROW_DEFS: Array<{ key: RemainderRow; label: string; color: string }> = [
  { key: "rHalf", label: "R",   color: "#3d3b19" },
  { key: "rps",   label: "Rps", color: "#3d1928" },
  { key: "rak",   label: "Rak", color: "#19253d" },
];

type ColKey = "Point" | "R1" | "R2" | "Legs+" | "Legs−" | "Sym" | "Pathσ" | "PathI";

const COL_OPTIONS: Record<ColKey, { label: string }[]> = {
  "Point":  POINT_OPTIONS,
  "R1":     POINT_OPTIONS,
  "R2":     POINT_OPTIONS,
  "Legs+":  LEGS_OPTIONS,
  "Legs−":  LEGS_OPTIONS,
  "Sym":    SYM_OPTIONS,
  "Pathσ":  POINT_OPTIONS,
  "PathI":  POINT_OPTIONS,
};

function colMinWidth(opts: { label: string }[]): number {
  return Math.max(...opts.map(o => o.label.length)) + 2;
}

function getVal(layer: RemainderMatrixLayer, col: ColKey, row: RemainderRow): number {
  switch (col) {
    case "Point":  return layer.getPoint(row);
    case "R1":     return layer.getR1(row);
    case "R2":     return layer.getR2(row);
    case "Legs+":  return layer.getLegsFwd(row);
    case "Legs−":  return layer.getLegsInv(row);
    case "Sym":    return layer.getSym(row);
    case "Pathσ":  return layer.getPathSigma(row);
    case "PathI":  return layer.getPathIndex(row);
  }
}

function setVal(layer: RemainderMatrixLayer, col: ColKey, row: RemainderRow, v: number): void {
  switch (col) {
    case "Point":  layer.setPoint(row, v); break;
    case "R1":     layer.setR1(row, v); break;
    case "R2":     layer.setR2(row, v); break;
    case "Legs+":  layer.setLegsFwd(row, v); break;
    case "Legs−":  layer.setLegsInv(row, v); break;
    case "Sym":    layer.setSym(row, v); break;
    case "Pathσ":  layer.setPathSigma(row, v); break;
    case "PathI":  layer.setPathIndex(row, v); break;
  }
}

const styles = {
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "10px",
    fontFamily: "var(--font-mono)",
  },
  headerCell: {
    padding: "5px 4px",
    textAlign: "center" as const,
    color: "var(--text-dim)",
    letterSpacing: "0.06em",
    fontWeight: 600,
    fontSize: "9px",
  },
  nameCell: {
    padding: "6px 8px",
    color: "rgba(255,255,255,0.75)",
    fontWeight: 600,
    letterSpacing: "0.06em",
    whiteSpace: "nowrap" as const,
    textAlign: "left" as const,
  },
  cellPad: {
    textAlign: "center" as const,
    padding: "4px 1px",
  },
  footer: {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: "4px 2px 2px",
    gap: "6px",
  },
  clearBtn: {
    cursor: "pointer",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "3px",
    color: "rgba(255,255,255,0.7)",
    fontSize: "10px",
    padding: "2px 8px",
    fontFamily: "var(--font-mono)",
  },
};

/**
 * Returns a stable React component for the remainder selection matrix.
 * Created once per layer instance (in the constructor) to avoid React remounting on toolbox refresh.
 */
export function createRemainderMatrixPanel(layer: RemainderMatrixLayer): ComponentType<{ ctx: ToolboxContext }> {
  return function RemainderMatrixPanel({ ctx }) {
    return (
      <div>
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
            {ROW_DEFS.map(rowDef => (
              <tr key={rowDef.key} style={{ background: rowDef.color }}>
                <td style={styles.nameCell}>{rowDef.label}</td>
                {COL_HEADERS.map(col => {
                  const opts = COL_OPTIONS[col];
                  const val = getVal(layer, col, rowDef.key);
                  return (
                    <td key={col} style={styles.cellPad}>
                      <OptionToggle
                        compact
                        value={val}
                        options={opts}
                        charWidth={colMinWidth(COL_OPTIONS[col])}
                        onChange={v => {
                          setVal(layer, col, rowDef.key, v);
                          ctx.requestToolboxRefresh();
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={styles.footer}>
          <button
            type="button"
            style={styles.clearBtn}
            onClick={() => { layer.clearAll(); ctx.requestToolboxRefresh(); }}
          >
            Clear
          </button>
          <OptionToggle
            label="Path length"
            value={layer.getPathLength()}
            options={[{ label: "1" }, { label: "2" }, { label: "3" }]}
            onChange={v => { layer.setPathLength(v); ctx.requestToolboxRefresh(); }}
          />
        </div>
      </div>
    );
  };
}

import type { ComponentType } from "react";
import type { ToolboxContext } from "@/shared/visualization/contracts";

/** Minimal interface the model must satisfy — avoids a circular import with linksModel.ts. */
export interface LinksMatrixLayer {
  getInverseReflect(): boolean;
  setInverseReflect(v: boolean): void;
}

const COL_HEADERS = ["Reflect"];

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
  checkbox: {
    cursor: "pointer",
    accentColor: "var(--accent)",
    width: "13px",
    height: "13px",
  },
};

/**
 * The Main tab's spiral matrix cut down to its one meaningful row here: the inverse chain,
 * reflected through ζ/2, drawn inside every link frame. Same shape as
 * {@link createSpiralMatrixPanel} so more rows and columns can be added later.
 */
export function createLinksMatrixPanel(layer: LinksMatrixLayer): ComponentType<{ ctx: ToolboxContext }> {
  return function LinksMatrixPanel({ ctx }) {
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
          <tr style={{ background: "#3d2a5a" }}>
            <td style={styles.nameCell}>Inverse</td>
            <td style={styles.activeCell}>
              <input
                type="checkbox"
                style={styles.checkbox}
                checked={layer.getInverseReflect()}
                onChange={e => {
                  layer.setInverseReflect(e.target.checked);
                  ctx.requestToolboxRefresh();
                }}
              />
            </td>
          </tr>
        </tbody>
      </table>
    );
  };
}

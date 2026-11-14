import { Fragment, type ComponentType } from "react";
import type { ToolboxContext } from "@/shared/visualization/contracts";
import {
  HURWITZ_MID_PERP_CATALOG,
  HURWITZ_OMEGA_QS,
  hurwitzMidPerpChiLabel,
  hurwitzMidPerpSpectrumIndex,
  hurwitzQFormulaId,
  hurwitzQSliderId,
  isHurwitzOmegaQ,
  type HurwitzOmegaQ,
} from "@/shared/math/hurwitzMidPerpCatalog";
import { parseHurwitzCoeffList, type HurwitzCoeff } from "@/shared/math/lFunctionCalculator";
import { spectrumColor } from "@/shared/math/spectrumColor";

export type HurwitzMidPerpPanelLayer = {
  getCircle(): boolean;
  setCircle(v: boolean): void;
  getShowSpiral(): boolean;
  setShowSpiral(v: boolean): void;
  getShowInverse(): boolean;
  setShowInverse(v: boolean): void;
  getShowReverse(): boolean;
  setShowReverse(v: boolean): void;
  getLiveQ(): HurwitzOmegaQ;
  setLiveQ(q: HurwitzOmegaQ): void;
  getLiveOmegaReadout(): string;
  getShowOH(): boolean;
  setShowOH(v: boolean): void;
  getShowPerp(): boolean;
  setShowPerp(v: boolean): void;
  getShowBLink(): boolean;
  setShowBLink(v: boolean): void;
  getShowBPoint(): boolean;
  setShowBPoint(v: boolean): void;
  getBPointLinkReadout(): string;
  getShowQ2Circle(): boolean;
  setShowQ2Circle(v: boolean): void;
  getShowQ3Circle(): boolean;
  setShowQ3Circle(v: boolean): void;
  getShowQ4Circle(): boolean;
  setShowQ4Circle(v: boolean): void;
  getShowQ5Circle(): boolean;
  setShowQ5Circle(v: boolean): void;
  getShowQ6Circle(): boolean;
  setShowQ6Circle(v: boolean): void;
  getShowH(): boolean;
  setShowH(v: boolean): void;
  getShowB1Star(): boolean;
  setShowB1Star(v: boolean): void;
  getOn(id: string): boolean;
  setOn(id: string, v: boolean): void;
  getSliderOn(q: HurwitzOmegaQ): boolean;
  setSliderOn(q: HurwitzOmegaQ, v: boolean): void;
  getSliderDeg(q: HurwitzOmegaQ): number;
  setSliderDeg(q: HurwitzOmegaQ, v: number): void;
  getFormulaOn(q: HurwitzOmegaQ): boolean;
  setFormulaOn(q: HurwitzOmegaQ, v: boolean): void;
  getSliderChiText(q: HurwitzOmegaQ): string;
  getFormulaChiText(q: HurwitzOmegaQ): string;
  getAllOn(): boolean;
  setAllOn(v: boolean): void;
  getChi(id: string): HurwitzCoeff[];
  setChi(id: string, coeffs: HurwitzCoeff[]): void;
};

const styles: Record<string, import("react").CSSProperties> = {
  root: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
  },
  flags: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "2px",
    padding: "4px 6px 4px",
  },
  flagRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
  },
  flagRowName: {
    width: "52px",
    flexShrink: 0,
    paddingTop: "1px",
    color: "rgba(255,255,255,0.45)",
    fontWeight: 600,
  },
  flagRowChecks: {
    display: "flex",
    flexWrap: "wrap" as const,
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
  },
  header: {
    display: "grid",
    gridTemplateColumns: "18px 22px 96px minmax(88px,1fr)",
    gap: "4px",
    alignItems: "center",
    padding: "2px 6px 4px",
    color: "rgba(255,255,255,0.45)",
    fontWeight: 600,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "18px 22px 96px minmax(88px,1fr)",
    gap: "4px",
    alignItems: "center",
    padding: "1px 6px",
  },
  checkbox: {
    cursor: "pointer",
    accentColor: "var(--accent)",
    width: "12px",
    height: "12px",
  },
    chi: {
    width: "100%",
    minWidth: "0",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "3px",
    fontSize: "10px",
    fontFamily: "var(--font-mono)",
    padding: "2px 4px",
  },
  omegaCell: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    minWidth: 0,
  },
  omegaSlider: {
    flex: 1,
    minWidth: "48px",
    height: "10px",
    margin: 0,
    cursor: "pointer",
  },
  checkLabel: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    color: "rgba(255,255,255,0.75)",
    cursor: "pointer",
    userSelect: "none",
  },
  linkReadout: {
    color: "rgba(255,255,255,0.85)",
    fontVariantNumeric: "tabular-nums" as const,
    whiteSpace: "nowrap" as const,
  },
  qSelect: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "3px",
    color: "rgba(255,255,255,0.85)",
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    padding: "1px 2px",
    cursor: "pointer",
  },
};

function applyChi(layer: HurwitzMidPerpPanelLayer, id: string, text: string): void {
  const parsed = parseHurwitzCoeffList(text);
  if (parsed === null) return;
  layer.setChi(id, parsed);
}

/**
 * Toolbox panel: header draw flags, then one on/off row per H=ζ(1−u) table.
 */
export function createHurwitzMidPerpPanel(
  layer: HurwitzMidPerpPanelLayer,
): ComponentType<{ ctx: ToolboxContext }> {
  return function HurwitzMidPerpPanel({ ctx }) {
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

    function extraRows(q: HurwitzOmegaQ) {
      const sliderSpec = hurwitzMidPerpSpectrumIndex(hurwitzQSliderId(q));
      const sliderColor = spectrumColor(sliderSpec.k, sliderSpec.n);
      const formulaSpec = hurwitzMidPerpSpectrumIndex(hurwitzQFormulaId(q));
      const formulaColor = spectrumColor(formulaSpec.k, formulaSpec.n);
      const deg = layer.getSliderDeg(q);
      const ones = Array.from({ length: q - 1 }, () => "1").join(", ");
      const chiTitle = ones.length === 0 ? `χ=(1−ω√${q})` : `χ=(1−ω√${q}, ${ones})`;
      return (
        <Fragment key={`extras-${q}`}>
          <div style={{ ...styles.row, color: sliderColor.css }}>
            <input
              type="checkbox"
              style={{ ...styles.checkbox, accentColor: sliderColor.css }}
              title={`apply header draw flags to ${chiTitle}`}
              checked={layer.getSliderOn(q)}
              onChange={e => { layer.setSliderOn(q, e.target.checked); refresh(); }}
            />
            <span>{q}</span>
            <span style={styles.omegaCell}>
              <input
                type="range"
                min={0}
                max={359}
                step={1}
                value={deg}
                aria-label={`q=${q} ω degrees`}
                style={{ ...styles.omegaSlider, accentColor: sliderColor.css }}
                onChange={e => { layer.setSliderDeg(q, Number(e.target.value)); refresh(); }}
              />
              <span>{deg}°</span>
            </span>
            <input
              type="text"
              readOnly
              style={{ ...styles.chi, color: sliderColor.css, borderColor: sliderColor.css }}
              value={layer.getSliderChiText(q)}
              spellCheck={false}
              title={chiTitle}
            />
          </div>
          <div style={{ ...styles.row, color: formulaColor.css }}>
            <input
              type="checkbox"
              style={{ ...styles.checkbox, accentColor: formulaColor.css }}
              title="apply header draw flags to formula ω (b-point at ζ)"
              checked={layer.getFormulaOn(q)}
              onChange={e => { layer.setFormulaOn(q, e.target.checked); refresh(); }}
            />
            <span>{q}</span>
            <span>formula</span>
            <input
              type="text"
              readOnly
              style={{ ...styles.chi, color: formulaColor.css, borderColor: formulaColor.css }}
              value={layer.getFormulaChiText(q)}
              spellCheck={false}
              title={`${chiTitle} with formula ω so the b-point is ζ`}
            />
          </div>
        </Fragment>
      );
    }

    return (
      <div style={styles.root}>
        <div style={styles.flags}>
          <div style={styles.flagRow}>
            <span style={styles.flagRowName}>q</span>
            <div style={styles.flagRowChecks}>
              <select
                aria-label="live ω period q"
                style={styles.qSelect}
                value={layer.getLiveQ()}
                onChange={e => {
                  const q = Number(e.target.value);
                  if (isHurwitzOmegaQ(q)) layer.setLiveQ(q);
                  refresh();
                }}
              >
                {HURWITZ_OMEGA_QS.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
              <span style={styles.linkReadout} title="formula ω_* at this q and T">
                {layer.getLiveOmegaReadout()}
              </span>
            </div>
          </div>
          <div style={styles.flagRow}>
            <span style={styles.flagRowName}>spiral</span>
            <div style={styles.flagRowChecks}>
              <Flag label="forward" checked={layer.getShowSpiral()} onChange={v => layer.setShowSpiral(v)} />
              <Flag label="reverse" checked={layer.getShowReverse()} onChange={v => layer.setShowReverse(v)} />
              <Flag label="inverse" checked={layer.getShowInverse()} onChange={v => layer.setShowInverse(v)} />
            </div>
          </div>
          <div style={styles.flagRow}>
            <span style={styles.flagRowName}>lines</span>
            <div style={styles.flagRowChecks}>
              <Flag label="O to H" checked={layer.getShowOH()} onChange={v => layer.setShowOH(v)} />
              <Flag label="bisector" checked={layer.getShowPerp()} onChange={v => layer.setShowPerp(v)} />
              <Flag label="b-link" checked={layer.getShowBLink()} onChange={v => layer.setShowBLink(v)} />
            </div>
          </div>
          <div style={styles.flagRow}>
            <span style={styles.flagRowName}>circles</span>
            <div style={styles.flagRowChecks}>
              <Flag label="zeta" checked={layer.getCircle()} onChange={v => layer.setCircle(v)} />
              <Flag label="q=2" checked={layer.getShowQ2Circle()} onChange={v => layer.setShowQ2Circle(v)} />
              <Flag label="q=3" checked={layer.getShowQ3Circle()} onChange={v => layer.setShowQ3Circle(v)} />
              <Flag label="q=4" checked={layer.getShowQ4Circle()} onChange={v => layer.setShowQ4Circle(v)} />
              <Flag label="q=5" checked={layer.getShowQ5Circle()} onChange={v => layer.setShowQ5Circle(v)} />
              <Flag label="q=6" checked={layer.getShowQ6Circle()} onChange={v => layer.setShowQ6Circle(v)} />
            </div>
          </div>
          <div style={styles.flagRow}>
            <span style={styles.flagRowName}>points</span>
            <div style={styles.flagRowChecks}>
              <Flag label="b-point" checked={layer.getShowBPoint()} onChange={v => layer.setShowBPoint(v)} />
              <span style={styles.linkReadout} title="bisector host link">{layer.getBPointLinkReadout()}</span>
              <Flag label="H" checked={layer.getShowH()} onChange={v => layer.setShowH(v)} />
              <Flag label="B1*" checked={layer.getShowB1Star()} onChange={v => layer.setShowB1Star(v)} />
            </div>
          </div>
          <div style={styles.flagRow}>
            <span style={styles.flagRowName} />
            <div style={styles.flagRowChecks}>
              <Flag label="select / deselect all" checked={layer.getAllOn()} onChange={v => layer.setAllOn(v)} />
            </div>
          </div>
        </div>
        <div style={styles.header}>
          <span />
          <span>q</span>
          <span>ω</span>
          <span>χ</span>
        </div>
        {extraRows(2)}
        {HURWITZ_MID_PERP_CATALOG.map((row, i) => {
          const spec = hurwitzMidPerpSpectrumIndex(i);
          const color = spectrumColor(spec.k, spec.n);
          const chi = layer.getChi(row.id);
          const chiText = hurwitzMidPerpChiLabel({ ...row, coeffs: chi });
          const catalogRow = (
            <div key={row.id} style={{ ...styles.row, color: color.css }}>
              <input
                type="checkbox"
                style={{ ...styles.checkbox, accentColor: color.css }}
                title="apply header draw flags to this row"
                checked={layer.getOn(row.id)}
                onChange={e => { layer.setOn(row.id, e.target.checked); refresh(); }}
              />
              <span>{row.q}</span>
              <span>{row.omegaLabel}</span>
              <input
                type="text"
                style={{ ...styles.chi, color: color.css, borderColor: color.css }}
                defaultValue={chiText}
                key={chiText}
                spellCheck={false}
                onBlur={e => { applyChi(layer, row.id, e.target.value); refresh(); }}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    applyChi(layer, row.id, e.currentTarget.value);
                    refresh();
                  }
                }}
              />
            </div>
          );
          const next = HURWITZ_MID_PERP_CATALOG[i + 1];
          if (next === undefined || next.q === row.q || !isHurwitzOmegaQ(next.q)) return catalogRow;
          return (
            <Fragment key={`${row.id}-extras`}>
              {catalogRow}
              {extraRows(next.q)}
            </Fragment>
          );
        })}
      </div>
    );
  };
}

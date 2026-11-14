import type { DisplayControlsState } from "@/features/zeros-of-f/types";
import {
  ABOVE_CURVE_COUNT,
  ABOVE_CURVE_LABEL,
  MAIN_ZEROS_COUNT,
  MAIN_ZEROS_LABEL,
  AK_FS_ZERO_ROWS,
  akFsZeroPatch,
  OVERLAY_AK_ROWS,
  OVERLAY_T_ROWS,
  OVERLAY_WINDOW_ROWS,
  R1AK_NEAR_STRIP_COUNT,
  R1AK_STRIP_TO_300_COUNT,
  overlayRowChecked,
  overlayRowPatch,
  type OverlayRowCounts,
  type OverlayRowId,
} from "@/features/zeros-of-f/overlaySets";

interface OverlaySetsPanelProps {
  display: DisplayControlsState;
  counts: OverlayRowCounts;
  onDisplayChange: (patch: Partial<DisplayControlsState>) => void;
}

function OverlayCell(props: {
  id: OverlayRowId;
  count: number;
  display: DisplayControlsState;
  onDisplayChange: (patch: Partial<DisplayControlsState>) => void;
}) {
  const checked = overlayRowChecked(props.display, props.id);
  return (
    <label className="zof-overlay-sets-cell">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          props.onDisplayChange(overlayRowPatch(props.id, event.target.checked));
        }}
      />
      <span className="zof-overlay-sets-count">{props.count.toLocaleString()}</span>
    </label>
  );
}

/**
 * T-bands are a 2-column σ grid (σ < 0 and σ ∈ [0, 1]). AK rows stay one checkbox.
 */
export function OverlaySetsPanel(props: OverlaySetsPanelProps) {
  return (
    <div className="zof-overlay-sets">
      <label className="zof-overlay-sets-ak-row">
        <input
          type="checkbox"
          checked={props.display.showMainZeros}
          onChange={(event) => {
            props.onDisplayChange({ showMainZeros: event.target.checked });
          }}
        />
        <span className="zof-overlay-sets-label">{MAIN_ZEROS_LABEL}</span>
        <span className="zof-overlay-sets-count">{MAIN_ZEROS_COUNT.toLocaleString()}</span>
      </label>
      <label className="zof-overlay-sets-ak-row">
        <input
          type="checkbox"
          checked={props.display.showAboveCurveZeros}
          onChange={(event) => {
            props.onDisplayChange({ showAboveCurveZeros: event.target.checked });
          }}
        />
        <span className="zof-overlay-sets-label">{ABOVE_CURVE_LABEL}</span>
        <span className="zof-overlay-sets-count">{ABOVE_CURVE_COUNT.toLocaleString()}</span>
      </label>
      <label className="zof-overlay-sets-ak-row">
        <input
          type="checkbox"
          checked={props.display.showR1akNearStrip}
          onChange={(event) => {
            props.onDisplayChange({ showR1akNearStrip: event.target.checked });
          }}
        />
        <span className="zof-overlay-sets-label">σ −1 to 1, T to 55</span>
        <span className="zof-overlay-sets-count">{R1AK_NEAR_STRIP_COUNT.toLocaleString()}</span>
      </label>
      <label className="zof-overlay-sets-ak-row">
        <input
          type="checkbox"
          checked={props.display.showR1akStripTo300}
          onChange={(event) => {
            props.onDisplayChange({ showR1akStripTo300: event.target.checked });
          }}
        />
        <span className="zof-overlay-sets-label">σ 0 to 1, T = 55 to 300</span>
        <span className="zof-overlay-sets-count">{R1AK_STRIP_TO_300_COUNT.toLocaleString()}</span>
      </label>
      <div className="zof-overlay-sets-grid-head">
        <span />
        <span>σ &lt; 0</span>
        <span>σ 0 to 1</span>
      </div>
      {OVERLAY_T_ROWS.map((row) => (
        <div key={row.bandId} className="zof-overlay-sets-grid-row">
          <span className="zof-overlay-sets-label">{row.label}</span>
          <OverlayCell
            id={row.sigmaLt0Id}
            count={props.counts[row.sigmaLt0Id]}
            display={props.display}
            onDisplayChange={props.onDisplayChange}
          />
          <OverlayCell
            id={row.sigma0To1Id}
            count={props.counts[row.sigma0To1Id]}
            display={props.display}
            onDisplayChange={props.onDisplayChange}
          />
        </div>
      ))}
      {OVERLAY_WINDOW_ROWS.map((row) => (
        <label key={row.id} className="zof-overlay-sets-ak-row">
          <input
            type="checkbox"
            checked={overlayRowChecked(props.display, row.id)}
            onChange={(event) => {
              props.onDisplayChange(overlayRowPatch(row.id, event.target.checked));
            }}
          />
          <span className="zof-overlay-sets-label">{row.label}</span>
          <span className="zof-overlay-sets-count">{props.counts[row.id].toLocaleString()}</span>
        </label>
      ))}
      {AK_FS_ZERO_ROWS.map((row) => (
        <label key={row.flag} className="zof-overlay-sets-ak-row">
          <input
            type="checkbox"
            checked={props.display[row.flag]}
            onChange={(event) => {
              props.onDisplayChange(akFsZeroPatch(row.flag, event.target.checked));
            }}
          />
          <span className="zof-overlay-sets-label">{row.label}</span>
          <span className="zof-overlay-sets-count">{row.count.toLocaleString()}</span>
        </label>
      ))}
      {OVERLAY_AK_ROWS.map((row) => (
        <label key={row.id} className="zof-overlay-sets-ak-row">
          <input
            type="checkbox"
            checked={overlayRowChecked(props.display, row.id)}
            onChange={(event) => {
              props.onDisplayChange(overlayRowPatch(row.id, event.target.checked));
            }}
          />
          <span className="zof-overlay-sets-label">{row.label}</span>
          <span className="zof-overlay-sets-count">{props.counts[row.id].toLocaleString()}</span>
        </label>
      ))}
    </div>
  );
}

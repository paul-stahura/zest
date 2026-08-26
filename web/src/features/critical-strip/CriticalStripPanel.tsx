import { useCallback, useRef, useState } from "react";

import { CriticalStripAxisLabels } from "@/features/critical-strip/CriticalStripAxisLabels";
import { CriticalStripCanvas } from "@/features/critical-strip/CriticalStripCanvas";
import { CriticalStripCenterButton } from "@/features/critical-strip/CriticalStripCenterButton";
import { CriticalStripHeader } from "@/features/critical-strip/CriticalStripHeader";
import { useCriticalStripState } from "@/features/critical-strip/useCriticalStripState";
import type { SigmaRange } from "@/features/critical-strip/criticalStripTypes";

// Panel widths (px) for each sigma range
const PANEL_WIDTH: Record<SigmaRange, number> = { 1: 220, 5: 320, 10: 400 };
const SIGMA_RANGE_OPTIONS: SigmaRange[] = [1, 5, 10];

type Props = {
  /** Returns the current main-spiral position. Updated every frame. */
  getPosition: () => { index: number; sigma: number };
  /** Called when the user selects a point or clicks empty space. */
  onNavigate: (index: number, sigma: number) => void;
};

/**
 * Slide-out panel from the left edge of the screen for the critical strip visualization.
 */
export function CriticalStripPanel({ getPosition, onNavigate }: Props) {
  const state = useCriticalStripState(getPosition, onNavigate);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
  const [canvasHeight, setCanvasHeight] = useState(400);

  // Track canvas wrapper height for axis labels
  const onCanvasWrapperRef = useCallback((el: HTMLDivElement | null) => {
    canvasWrapperRef.current = el;
    if (el !== null) {
      setCanvasHeight(el.clientHeight);
      const ro = new ResizeObserver(() => setCanvasHeight(el.clientHeight));
      ro.observe(el);
    }
  }, []);

  const panelWidth = PANEL_WIDTH[state.sigmaRange];
  const translateX = state.isExpanded ? 0 : -panelWidth;

  return (
    <>
      {/* Slide-out panel */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: panelWidth,
          transform: `translateX(${String(translateX)}px)`,
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1), width 0.25s",
          display: "flex",
          flexDirection: "column",
          background: "transparent",
          borderRight: "1px solid var(--border)",
          zIndex: 20,
          overflow: "hidden",
        }}
      >
        <CriticalStripHeader
          totalPoints={state.totalPoints}
          bandsVisible={state.bandsVisible}
          onBandsChange={state.setBandsVisible}
          spaceMode={state.spaceMode}
          onToggleSpaceMode={state.toggleSpaceMode}
          selectedSetIds={state.selectedSetIds}
          loadingIds={state.loadingIds}
          onToggleSet={state.togglePointSet}
          ariasExclusive={state.ariasExclusive}
          ariasLoading={state.ariasLoading}
          onToggleArias={state.toggleAriasExclusive}
        />

        {/* Canvas area with axis labels overlay */}
        <div
          ref={onCanvasWrapperRef}
          style={{ flex: "1 1 0", minHeight: 0, position: "relative", display: "flex" }}
        >
          <CriticalStripCanvas controller={state.controller} />
          <CriticalStripAxisLabels viewRange={state.viewRange} height={canvasHeight} />
        </div>

        {/* Footer controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 6px",
            borderTop: "1px solid var(--border)",
            background: "rgba(11, 13, 18, 0.6)",
            backdropFilter: "blur(3px)",
            flexShrink: 0,
          }}
        >
          <CriticalStripCenterButton
            isLocked={state.isLocked}
            onCenter={() => state.centerOnCurrent(500)}
            onSetLocked={state.setLocked}
          />

          {/* Sigma range toggle */}
          <div style={{ display: "flex", gap: 3, marginLeft: "auto" }}>
            {SIGMA_RANGE_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => state.setSigmaRange(r)}
                style={{
                  appearance: "none",
                  border: `1px solid ${state.sigmaRange === r ? "var(--accent)" : "var(--border-hi)"}`,
                  background: state.sigmaRange === r ? "var(--accent-glow)" : "transparent",
                  color: state.sigmaRange === r ? "var(--accent)" : "var(--text-dim)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  padding: "2px 5px",
                  cursor: "pointer",
                }}
              >
                σ{r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Collapse/expand tab — always visible on the right edge of the panel */}
      <button
        type="button"
        title={state.isExpanded ? "Collapse critical strip panel" : "Open critical strip panel"}
        onClick={state.toggleExpanded}
        style={{
          position: "absolute",
          left: state.isExpanded ? panelWidth : 0,
          top: "50%",
          transform: "translateY(-50%)",
          transition: "left 0.25s cubic-bezier(0.4,0,0.2,1)",
          zIndex: 21,
          appearance: "none",
          border: "1px solid var(--border-hi)",
          borderLeft: state.isExpanded ? "none" : "1px solid var(--border-hi)",
          background: "var(--surface-1)",
          color: "var(--text-dim)",
          width: 14,
          height: 48,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          fontSize: 9,
        }}
      >
        <span style={{ transform: state.isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.25s", lineHeight: 1 }}>
          ›
        </span>
      </button>
    </>
  );
}

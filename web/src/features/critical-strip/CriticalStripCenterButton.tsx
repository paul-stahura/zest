import { useCallback, useRef } from "react";

const LONG_PRESS_MS = 1000;

type Props = {
  isLocked: boolean;
  onCenter: () => void;
  onSetLocked: (v: boolean) => void;
};

/**
 * Center button with long-press lock. Short press = center; long press = toggle locked follow.
 */
export function CriticalStripCenterButton({ isLocked, onCenter, onSetLocked }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);

  const handlePointerDown = useCallback(() => {
    didLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      onSetLocked(!isLocked);
    }, LONG_PRESS_MS);
  }, [isLocked, onSetLocked]);

  const handlePointerUp = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!didLongPressRef.current) {
      if (isLocked) {
        onSetLocked(false);
      } else {
        onCenter();
      }
    }
  }, [isLocked, onCenter, onSetLocked]);

  return (
    <button
      type="button"
      title={isLocked ? "Locked — click to unlock" : "Center on current position (hold to lock)"}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }}
      style={{
        appearance: "none",
        border: `1px solid ${isLocked ? "var(--accent)" : "var(--border-hi)"}`,
        background: isLocked ? "var(--accent-glow)" : "transparent",
        color: isLocked ? "var(--accent)" : "var(--text-dim)",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        padding: "3px 6px",
        cursor: "pointer",
        transition: "color 0.15s, border-color 0.15s, background 0.15s",
        userSelect: "none",
      }}
    >
      {isLocked ? "⊙" : "⊕"}
    </button>
  );
}

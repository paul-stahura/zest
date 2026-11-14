interface ScanTransportButtonsProps {
  isRunning: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  pauseSupported?: boolean;
  /** Cluster mode: allow submitting another scan while one is active. */
  queueSupported?: boolean;
}

/**
 * Three-button scan transport row: Start/Restart, Pause, Stop.
 *
 *  - Idle (no scan): Start enabled, Pause/Stop disabled.
 *  - Running: Start disabled (label still "Start scan"), Pause + Stop enabled.
 *  - Paused: Start label = "Restart", click resumes; Pause disabled; Stop enabled.
 *
 * Stop terminates the scan and archives the partial; Pause suspends without
 * losing state.
 */
export function ScanTransportButtons({
  isRunning,
  isPaused,
  onStart,
  onPause,
  onResume,
  onStop,
  pauseSupported = true,
  queueSupported = false,
}: ScanTransportButtonsProps) {
  const startLabel = isPaused ? "Restart" : isRunning && queueSupported ? "Queue scan" : "Start scan";
  const startDisabled = isRunning && !isPaused && !queueSupported;
  const pauseDisabled = !pauseSupported || !isRunning || isPaused;
  const stopDisabled = !isRunning && !isPaused;

  const onStartClick = (): void => {
    if (isPaused) onResume();
    else onStart();
  };

  const btn = { fontSize: 11, padding: "4px 8px", flex: 1 } as const;

  return (
    <div style={{ display: "flex", gap: 4, padding: "4px 0" }}>
      <button type="button" style={btn} disabled={startDisabled} onClick={onStartClick}>
        {startLabel}
      </button>
      <button
        type="button"
        style={btn}
        disabled={pauseDisabled}
        onClick={onPause}
        title={pauseSupported ? undefined : "Pause is not supported for cloud scans"}
      >
        Pause
      </button>
      <button type="button" style={btn} disabled={stopDisabled} onClick={onStop}>
        Stop
      </button>
    </div>
  );
}

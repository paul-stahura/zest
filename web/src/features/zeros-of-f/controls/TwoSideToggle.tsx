interface TwoSideToggleProps<T extends string> {
  /** Top-level row label (e.g. "fracT toggle"). */
  label: string;
  /** Identifier of the LEFT side. When the underlying checkbox is unchecked,
   *  this value is the active value reported via `onChange`. */
  leftValue: T;
  /** Identifier of the RIGHT side. When the checkbox is checked, this value
   *  is the active value. */
  rightValue: T;
  leftLabel: string;
  rightLabel: string;
  /** Currently active value — must match either `leftValue` or `rightValue`. */
  value: T;
  onChange(next: T): void;
}

/**
 * Two-state labeled toggle switch — left label, switch, right label, all on
 * one row. Reuses the toolbox's standard `zest-toggle-*` classes for a
 * consistent look. The active side's label is highlighted; the inactive
 * side is dimmed.
 */
export function TwoSideToggle<T extends string>({
  label,
  leftValue,
  rightValue,
  leftLabel,
  rightLabel,
  value,
  onChange,
}: TwoSideToggleProps<T>) {
  const isRight = value === rightValue;
  const hasLabel = label.length > 0;
  return (
    <label className="zest-toggle-label">
      {hasLabel ? <span className="zest-label">{label}</span> : null}
      <span
        style={{
          marginLeft: hasLabel ? "auto" : 0,
          width: hasLabel ? undefined : "100%",
          justifyContent: hasLabel ? undefined : "center",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 11, color: isRight ? "#666" : "#ddd", fontWeight: isRight ? 400 : 600 }}>
          {leftLabel}
        </span>
        <span className="zest-toggle-track">
          <input
            type="checkbox"
            className="zest-toggle-input"
            checked={isRight}
            onChange={(e) => onChange(e.target.checked ? rightValue : leftValue)}
          />
          <span className="zest-toggle-track-bg" />
          <span className="zest-toggle-thumb-dot" />
        </span>
        <span style={{ fontSize: 11, color: isRight ? "#ddd" : "#666", fontWeight: isRight ? 600 : 400 }}>
          {rightLabel}
        </span>
      </span>
    </label>
  );
}

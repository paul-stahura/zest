export type OptionToggleProps = {
  label?: string;
  value: number;
  options: { label: string; color?: string }[];
  charWidth?: number;
  compact?: boolean;
  onChange(index: number): void;
};

export function OptionToggle({ label, value, options, charWidth, compact, onChange }: OptionToggleProps) {
  const selected = options[value] ?? options[0];
  const colorStyle = selected?.color
    ? { borderColor: selected.color, background: `${selected.color}22` }
    : undefined;
  const widthStyle = charWidth !== undefined ? { minWidth: `${charWidth}ch` } : undefined;
  const compactStyle = compact === true ? { padding: "2px 3px" } : undefined;

  const btn = (
    <button
      type="button"
      className={`ot-btn${label === undefined ? " ot-btn--full" : ""}`}
      style={{ ...colorStyle, ...widthStyle, ...compactStyle }}
      onClick={() => onChange((value + 1) % options.length)}
    >
      {selected?.label ?? "—"}
    </button>
  );

  if (label === undefined) return btn;

  return (
    <div className="ot-row">
      <span className="zest-label">{label}</span>
      {btn}
    </div>
  );
}

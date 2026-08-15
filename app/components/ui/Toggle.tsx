interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** 스위치만 보여주고 라벨은 스크린리더에만 남긴다. */
  hideLabel?: boolean;
}

export default function Toggle({
  checked,
  onChange,
  label,
  hideLabel = false,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={hideLabel ? label : undefined}
      onClick={() => onChange(!checked)}
      className="group inline-flex items-center gap-2"
    >
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
          checked
            ? 'border-brand bg-brand'
            : 'border-line bg-line/60 group-hover:border-brand/40'
        }`}
      >
        <span
          className={`absolute h-3.5 w-3.5 rounded-full bg-card shadow-sm transition-transform ${
            checked ? 'translate-x-[1.15rem]' : 'translate-x-[0.15rem]'
          }`}
        />
      </span>
      {!hideLabel && (
        <span
          className={`text-xs font-medium transition-colors ${
            checked ? 'text-ink' : 'text-muted'
          }`}
        >
          {label}
        </span>
      )}
    </button>
  );
}

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
      {/*
        꺼짐 상태는 손잡이를 muted로 칠한다. 카드색으로 두면 라이트에서는 흰 손잡이가
        밝은 트랙에, 다크에서는 어두운 손잡이가 어두운 트랙에 묻혀 양쪽 다 안 보인다.
      */}
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
          checked
            ? 'border-brand bg-brand'
            : 'border-field-line bg-sunken group-hover:border-brand'
        }`}
      >
        <span
          className={`absolute h-3.5 w-3.5 rounded-full shadow-sm transition-transform ${
            checked
              ? 'translate-x-[1.15rem] bg-card'
              : 'translate-x-[0.15rem] bg-muted'
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

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** 버튼 아래에 작게 붙는 부가 정보 (예: 타격 수) */
  meta?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  columns?: 2 | 4;
}

/**
 * 선택지가 적고 각각이 성격이 다른 값(공격 스킬 등)에 쓴다.
 * select와 달리 후보를 전부 보여줘서 한 번의 클릭으로 바뀐다.
 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  columns = 2,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`grid gap-1.5 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-4'}`}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-lg border px-3 py-2 text-left transition-colors ${
              selected
                ? 'border-brand bg-brand/12 text-brand'
                : 'border-line bg-sunken text-muted hover:border-brand/40 hover:text-ink'
            }`}
          >
            <span className="block text-sm font-semibold">{option.label}</span>
            {option.meta && (
              <span className="mt-0.5 block text-[0.7rem] opacity-80">
                {option.meta}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

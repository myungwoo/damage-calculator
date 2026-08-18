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
  columns?: 2 | 3 | 4;
  /**
   * 한 줄짜리 좁은 형태. 부가 정보(`meta`)를 아래가 아니라 라벨 오른쪽에 붙인다.
   * 공격 스킬처럼 고르는 데 시간이 걸리는 값이 아니라, 옆에 딸린 옵션에 쓴다.
   */
  dense?: boolean;
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
  dense = false,
}: SegmentedControlProps<T>) {
  const columnClass =
    columns === 2
      ? 'grid-cols-2'
      : columns === 3
        ? 'grid-cols-3'
        : 'grid-cols-4';

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`grid ${dense ? 'gap-1' : 'gap-1.5'} ${columnClass}`}
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
            className={`rounded-lg border transition-colors ${
              dense ? 'px-2 py-1 text-center' : 'px-3 py-2 text-left'
            } ${
              selected
                ? 'border-brand bg-brand/12 text-brand'
                : 'border-field-line bg-field text-muted hover:border-brand hover:text-ink'
            }`}
          >
            <span
              className={
                dense ? 'text-xs font-semibold' : 'block text-sm font-semibold'
              }
            >
              {option.label}
            </span>
            {option.meta &&
              (dense ? (
                <span className="ml-1 text-[0.65rem] opacity-70">
                  {option.meta}
                </span>
              ) : (
                <span className="mt-0.5 block text-[0.7rem] opacity-80">
                  {option.meta}
                </span>
              ))}
          </button>
        );
      })}
    </div>
  );
}

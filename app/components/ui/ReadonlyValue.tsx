interface ReadonlyValueProps {
  value: number;
  /** 강조해서 보여줄 합계인지 (총 스탯, 공격력 합 등) */
  emphasis?: boolean;
  ariaLabel?: string;
}

/**
 * 계산으로 정해지는 값. 입력칸처럼 생겼지만 실제로는 결과라
 * 배경을 눌러 두고 브랜드 색 숫자로 구분한다.
 */
export default function ReadonlyValue({
  value,
  emphasis = false,
  ariaLabel,
}: ReadonlyValueProps) {
  return (
    <output
      aria-label={ariaLabel}
      className={`block w-full rounded-lg border border-dashed border-line px-3 py-2 text-sm tabular-nums ${
        emphasis ? 'font-semibold text-brand' : 'text-muted'
      }`}
    >
      {value.toLocaleString('ko-KR')}
    </output>
  );
}

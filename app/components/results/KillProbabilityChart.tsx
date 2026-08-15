import { DamageResult } from '../../types/calculator';

interface KillProbabilityChartProps {
  killProbabilities: DamageResult['killProbabilities'];
}

/**
 * 방컷 확률 막대.
 *
 * 옅은 막대가 누적 확률, 진한 막대가 그 방에서 죽을 확률이다.
 * 두 값을 겹쳐 그려야 "몇 방쯤에서 갈린다"가 한눈에 들어온다.
 * 숫자는 막대 밖 고정 열에 둔다. 막대 위에 얹으면 채워진 구간에서 대비가 무너진다.
 */
export default function KillProbabilityChart({
  killProbabilities,
}: KillProbabilityChartProps) {
  if (killProbabilities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center">
        <p className="text-sm font-medium text-ink">20방을 때려도 못 잡는다</p>
        <p className="mt-1 text-xs text-muted">
          공격력이나 스킬 레벨을 올려 보자
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 pb-0.5 text-[0.7rem] text-muted">
        <span className="w-8 shrink-0" />
        <span className="flex-1" />
        <span className="flex w-14 shrink-0 items-center justify-end gap-1">
          <span className="h-2 w-2 rounded-sm bg-brand" />각 방
        </span>
        <span className="flex w-14 shrink-0 items-center justify-end gap-1">
          <span className="h-2 w-2 rounded-sm bg-brand/25" />
          누적
        </span>
      </div>
      {killProbabilities.map(({ hit, prob, accProb }) => (
        <div key={hit} className="flex items-center gap-2">
          <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-muted">
            {hit}방
          </span>
          <div className="relative h-3.5 flex-1 overflow-hidden rounded bg-sunken">
            <div
              className="absolute inset-y-0 left-0 bg-brand/25"
              style={{ width: `${Number(accProb)}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-r bg-brand"
              style={{ width: `${Number(prob)}%` }}
            />
          </div>
          <span className="w-14 shrink-0 text-right text-[0.7rem] font-bold tabular-nums text-ink">
            {prob}%
          </span>
          <span className="w-14 shrink-0 text-right text-[0.7rem] tabular-nums text-muted">
            {accProb}%
          </span>
        </div>
      ))}
    </div>
  );
}

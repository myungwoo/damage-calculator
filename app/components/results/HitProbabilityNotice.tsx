import { AlertTriangle } from 'lucide-react';
import { Monster, Stats } from '../../types/calculator';
import {
  calculateHitProbability,
  calculateRequiredHitRatio,
} from '../../utils/damageCalculator';

interface HitProbabilityNoticeProps {
  monster: Monster;
  stats: Stats;
}

/** 이 값 위로는 표시상 100%라 경고를 띄우지 않는다. */
const FULL_HIT_PERCENT = 99.995;

/**
 * 타격 확률이 100%에 못 미칠 때만 뜨는 경고.
 *
 * 명중률이 충분한 구간(대부분의 고레벨)에서는 항상 100%라 자리만 차지한다.
 * 저레벨이나 고레벨 몹을 칠 때만 잠깐 중요해지므로, 그때만 띄운다.
 *
 * 자리는 방컷 확률 막대 **바로 아래**다. 막대가 이미 이 확률을 반영한 값이기도 하고,
 * 100% 미만 구간에서는 명중률 근사식 때문에 계산 오차까지 커지므로
 * 경고 대상 옆에 붙어 있어야 읽힌다.
 */
export default function HitProbabilityNotice({
  monster,
  stats,
}: HitProbabilityNoticeProps) {
  const hitPercent =
    calculateHitProbability(
      stats.hitRatio,
      monster.level,
      stats.level,
      monster.avoid
    ) * 100;

  if (hitPercent >= FULL_HIT_PERCENT) {
    return null;
  }

  const requiredHitRatio = calculateRequiredHitRatio(
    monster.level,
    stats.level,
    monster.avoid
  );
  const tone = hitPercent >= 90 ? 'crit' : 'danger';

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        tone === 'crit'
          ? 'border-crit/30 bg-crit/10'
          : 'border-danger/30 bg-danger/10'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${
            tone === 'crit' ? 'text-crit' : 'text-danger'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          타격 확률
        </span>
        <span
          className={`text-base font-bold tabular-nums ${
            tone === 'crit' ? 'text-crit' : 'text-danger'
          }`}
        >
          {hitPercent.toFixed(2)}%
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full transition-all ${
            tone === 'crit' ? 'bg-crit' : 'bg-danger'
          }`}
          style={{ width: `${Math.min(100, hitPercent)}%` }}
        />
      </div>
      <p className="mt-2 text-[0.7rem] leading-relaxed text-muted">
        빗나가는 타격이 있어 위 확률이 그만큼 내려가 있다. 100%를 채우려면
        명중률{' '}
        <b className="tabular-nums text-ink">{requiredHitRatio.toFixed(2)}</b>{' '}
        필요
        {stats.hitRatio === undefined && ' · 명중률 미입력 시 100%로 본다'}
      </p>
    </div>
  );
}

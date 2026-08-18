import { Monster } from '../../types/calculator';

interface KnockbackProbabilityProps {
  /** 시전 1회에 타격 하나라도 넉백 수치를 넘길 확률 (0~1). 모르면 null */
  probability: number | null;
  monster: Monster;
}

/**
 * 넉백 확률.
 *
 * 넉백은 **타격 하나가 단독으로** 몹의 넉백 수치(원작 Mob.wz `info/pushed`)를
 * 넘겨야 걸린다. 그래서 화면의 총 데미지 범위(시전 1회 합계)로는 읽을 수 없고,
 * 라인 하나짜리 판정을 따로 계산해 여기에 세운다.
 *
 * 자리는 데미지 값들 맨 위, 총 데미지 범위 바로 아래다. 같은 데미지에서 나오는
 * 값이지만 보는 눈금이 "합계"가 아니라 "라인 하나"라 두 줄을 붙여 두면
 * 둘을 헷갈릴 일이 없다.
 *
 * 넉백 수치를 모르는 직접 입력 몬스터에서는 아예 그리지 않는다. 없는 값을
 * 0으로 채워 그리면 "안 밀린다"는 잘못된 정보가 된다.
 */
export default function KnockbackProbability({
  probability,
  monster,
}: KnockbackProbabilityProps) {
  if (probability === null || monster.minimumPushDamage === undefined) {
    return null;
  }

  const cannotMove = monster.cannotMove === true;
  const percent = probability * 100;
  const threshold = monster.minimumPushDamage.toLocaleString('ko-KR');

  return (
    <div className="rounded-xl border border-line px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="whitespace-nowrap text-xs font-medium text-muted">
          넉백 확률
        </span>
        <span
          className={`text-base font-bold tabular-nums ${
            cannotMove || percent === 0 ? 'text-muted' : 'text-ink'
          }`}
        >
          {cannotMove ? '넉백 불가' : `${percent.toFixed(2)}%`}
        </span>
      </div>
      {!cannotMove && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>
      )}
      <p className="mt-2 text-[0.7rem] leading-relaxed text-muted">
        {cannotMove ? (
          <>
            자리에 고정된 몹이라 데미지가 얼마든 밀리지 않는다 · 넉백 수치{' '}
            <b className="tabular-nums text-ink">{threshold}</b>
          </>
        ) : (
          <>
            타격 하나가 <b className="tabular-nums text-ink">{threshold}</b>{' '}
            이상이면 밀린다 · 합계가 아니라 라인 하나 기준
          </>
        )}
      </p>
    </div>
  );
}

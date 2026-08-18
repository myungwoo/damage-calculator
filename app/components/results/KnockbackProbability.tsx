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
 * 라인 하나짜리 판정을 따로 계산해야 한다.
 *
 * **총 데미지 범위 카드 안에 한 줄로 얹는다.** 방컷 확률이나 데미지처럼 매번
 * 확인하는 값이 아니라 곁다리 정보라, 카드 하나를 통째로 쓰면 제 중요도보다
 * 커 보인다. 대신 눈금이 다른 값(합계 vs 라인 하나)이라 같은 카드에 있으면
 * 헷갈릴 수 있으므로, 구분선으로 갈라 두고 라벨 옆에 판정 기준을 같이 적는다.
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
    <div className="flex items-baseline justify-between gap-2 border-t border-line px-3 py-2">
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span className="whitespace-nowrap text-xs font-medium text-muted">
          넉백 확률
        </span>
        <span className="truncate text-[0.65rem] text-muted">
          {cannotMove ? '자리 고정형 몹' : `타격 하나 ${threshold} 이상`}
        </span>
      </span>
      <span
        className={`whitespace-nowrap text-sm font-bold tabular-nums ${
          cannotMove || percent === 0 ? 'text-muted' : 'text-ink'
        }`}
      >
        {cannotMove ? '넉백 불가' : `${percent.toFixed(2)}%`}
      </span>
    </div>
  );
}

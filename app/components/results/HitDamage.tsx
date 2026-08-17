import { DamageRange, Monster, Stats } from '../../types/calculator';
import {
  HitDamageEntry,
  MIN_HIT_DAMAGE,
  calculateHitDamageBreakdown,
} from '../../utils/damageCalculator';
import { MOB_ATTACK_UP_TIERS } from '../../data/mobBuffs';

interface HitDamageProps {
  monster: Monster;
  stats: Stats;
}

const fmt = (value: number) => value.toLocaleString('ko-KR');

/**
 * 몹 공격을 흘리지 못했을 때 실제로 들어오는 데미지.
 *
 * 회피 확률 바로 아래에 둔다. 두 값이 같은 질문("몹이 때리면 어떻게 되나")의
 * 앞뒤라서 떨어뜨려 놓으면 한쪽만 보고 판단하게 된다 — 회피 확률만 보면
 * 몇 대 맞아야 죽는지를 모르고, 피격 데미지만 보면 그게 얼마나 자주 들어오는지를
 * 모른다. 입력이 캐릭터(방어력·스탯)와 몬스터(공격력) 양쪽에 걸쳐 있다는 점도
 * 회피 확률과 같아서, 입력 패널이 아니라 sticky 결과 레일에 있어야 한다.
 */
export default function HitDamage({ monster, stats }: HitDamageProps) {
  const breakdown = calculateHitDamageBreakdown(monster, stats);

  // 마법 공격이 없는 몹은 마법 공격력이 0보다 커도 마법으로는 안 맞는다.
  const magicAttack =
    monster.hasMagicAttack === false ? 0 : monster.magicAttack;

  const columns: {
    key: string;
    label: string;
    hint: string;
    entry: HitDamageEntry;
    attack: number;
    emptyNote: string;
    defenseLabel: string;
    /** 대표값과 다른 기준의 값 (물리에서 몸박) */
    extra: { label: string; damage: DamageRange } | null;
  }[] = [
    {
      key: 'physical',
      label: '물리',
      // 대표값은 가장 센 공격이다. 몸박만 띄우면 실제로 맞는 최댓값을 놓친다.
      hint: breakdown.bodyPhysical ? '가장 센 공격' : '몸박 기준',
      entry: breakdown.physical,
      attack: monster.physicalAttack,
      emptyNote: '물리 공격력이 0인 몹이다',
      defenseLabel: '물리방어력',
      extra: breakdown.bodyPhysical
        ? { label: '몸박', damage: breakdown.bodyPhysical.damage }
        : null,
    },
    {
      key: 'magic',
      label: '마법',
      hint: '몹 마법 공격',
      entry: breakdown.magic,
      attack: magicAttack,
      emptyNote:
        monster.hasMagicAttack === false
          ? '마법 공격이 없는 몹이다'
          : '마법 공격력이 0인 몹이다',
      defenseLabel: '마법방어력',
      extra: null,
    },
  ];

  const footnotes = [
    '회피 · 페이크로 흘리지 못한 타격에 들어오는 값',
    // 공격업이 "방어력 감면 뒤에" 붙는다는 것만 남긴다. 원작 스킬 번호까지 적으면
    // 정작 읽어야 할 증가폭이 묻힌다 (근거는 CLAUDE.md에 있다).
    `공격업은 방어력 감면 뒤에 ${MOB_ATTACK_UP_TIERS.map(
      (tier) => `${tier.stage}단계 +${tier.percent - 100}%`
    ).join(' · ')}로 붙는다`,
    stats.physicalDefense === undefined || stats.magicalDefense === undefined
      ? '방어력 미입력 시 0으로 본다'
      : null,
  ].filter((note): note is string => note !== null);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
        피격 데미지
      </h3>

      {/*
        회피 확률과 같은 2열 구조를 쓴다. 물리와 마법은 원작 공식부터 다른 별개의
        값이라 어느 쪽도 부속으로 밀지 않는다.
      */}
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-sunken/50 px-3 py-2.5">
        {columns.map((column) => (
          <div key={column.key} className="min-w-0">
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xs font-semibold text-ink">
                {column.label}
              </span>
              <span className="truncate text-[0.65rem] text-muted">
                {column.hint}
              </span>
            </div>
            {column.attack <= 0 ? (
              <>
                <div className="mt-0.5 text-base font-bold tabular-nums text-muted">
                  —
                </div>
                <p className="mt-1.5 text-[0.7rem] leading-relaxed text-muted">
                  {column.emptyNote}
                </p>
              </>
            ) : (
              <>
                {/*
                  경고색(danger)을 쓰지 않는다. 이 값은 "미달"이나 "오류"가 아니라
                  그냥 몹이 세다는 정보라, 빨갛게 칠하면 고쳐야 할 상태로 읽힌다.
                */}
                <div className="mt-0.5 text-base font-bold tabular-nums text-ink">
                  {fmt(column.entry.damage.min)}
                  <span className="mx-1 font-normal text-muted">~</span>
                  {fmt(column.entry.damage.max)}
                </div>
                {/*
                  공격업은 몹이 스스로 거는 버프라 유저가 켜고 끄는 값이 아니다.
                  그래서 토글이 아니라 단계별 값을 같이 세워 둔다 — 걸린 걸 본 순간
                  바로 읽어야 하는 값이지, 설정해서 보는 값이 아니다.
                */}
                <div className="mt-1 space-y-0.5">
                  {[
                    ...(column.extra ? [column.extra] : []),
                    ...column.entry.poweredUp.map((tier) => ({
                      label: `공격업 ${tier.stage}단계`,
                      damage: tier.damage,
                    })),
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-baseline justify-between gap-1 text-[0.7rem] leading-relaxed"
                    >
                      <span className="whitespace-nowrap text-muted">
                        {row.label}
                      </span>
                      <span className="tabular-nums text-ink">
                        {fmt(row.damage.min)}
                        <span className="mx-0.5 text-muted">~</span>
                        {fmt(row.damage.max)}
                      </span>
                    </div>
                  ))}
                </div>
                {/* 방어력 한 점이 실제로 얼마짜리인지가 스탯 투자 판단의 핵심이다. */}
                <p className="mt-1.5 text-[0.7rem] leading-relaxed text-muted">
                  {column.entry.atMinimum ? (
                    <>
                      방어력이 충분해 <b className="text-ink">하한</b>{' '}
                      {MIN_HIT_DAMAGE}에 걸렸다
                    </>
                  ) : (
                    <>
                      {column.defenseLabel} +1 →{' '}
                      <b className="tabular-nums text-ink">
                        -{column.entry.reducePerDefense.toFixed(2)}
                      </b>
                    </>
                  )}
                </p>
              </>
            )}
          </div>
        ))}
      </div>

      {footnotes.length > 0 && (
        <p className="text-[0.7rem] leading-relaxed text-muted">
          {footnotes.join(' · ')}
        </p>
      )}
    </div>
  );
}

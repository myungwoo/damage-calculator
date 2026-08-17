import { Monster, Stats } from '../../types/calculator';
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
 *
 * **몸박 · 물리 공격 · 마법 공격을 한 줄씩 따로 세운다.** 셋은 공격력도 판정식도
 * 다른 별개의 값이라 하나로 합치면 어느 쪽도 못 맞힌다. 예전에는 물리를 한 줄로
 * 묶었는데, 몸박만 띄우는 바람에 화면값보다 큰 데미지를 맞는 일이 실제로 나왔다.
 */
export default function HitDamage({ monster, stats }: HitDamageProps) {
  const breakdown = calculateHitDamageBreakdown(monster, stats);

  // 마법 공격이 없는 몹은 마법 공격력이 0보다 커도 마법으로는 안 맞는다.
  const hasMagic = monster.hasMagicAttack !== false && monster.magicAttack > 0;

  const rows: { key: string; label: string; entry: HitDamageEntry }[] = [
    ...(monster.physicalAttack > 0
      ? [{ key: 'body', label: '몸박', entry: breakdown.body }]
      : []),
    // 물리 공격이 여럿이면 번호를 붙여 전부 세운다. 하나로 묶어 버리면 나머지
    // 공격에 맞았을 때 화면에 없는 숫자가 되고, 그 순간 계산기를 못 믿게 된다.
    ...breakdown.attacks.map((entry, index) => ({
      key: `attack-${index}`,
      label:
        breakdown.attacks.length > 1 ? `물리 공격 ${index + 1}` : '물리 공격',
      entry,
    })),
    ...(hasMagic
      ? [{ key: 'magic', label: '마법 공격', entry: breakdown.magic }]
      : []),
  ];

  // 방어력 1당 감소폭은 공격력과 무관해서 물리 줄이 전부 같다. 한 번만 적는다.
  const perDefense = [
    monster.physicalAttack > 0 && !breakdown.body.atMinimum
      ? `물리방어력 +1 → -${breakdown.body.reducePerDefense.toFixed(2)}`
      : null,
    hasMagic && !breakdown.magic.atMinimum
      ? `마법방어력 +1 → -${breakdown.magic.reducePerDefense.toFixed(2)}`
      : null,
  ].filter((note): note is string => note !== null);

  const footnotes = [
    '회피 · 페이크로 흘리지 못한 타격에 들어오는 값',
    // 원작이 방어력 감면·감소 버프를 전부 끝낸 뒤 맨 마지막에 곱하는 값이라
    // "정해진 데미지가 그만큼 커진다"가 정확한 설명이다.
    `공격업은 정해진 데미지를 ${MOB_ATTACK_UP_TIERS.map(
      (tier) => `${tier.stage}단계 +${tier.percent - 100}%`
    ).join(' · ')} 올린다`,
    stats.physicalDefense === undefined || stats.magicalDefense === undefined
      ? '방어력 미입력 시 0으로 본다'
      : null,
  ].filter((note): note is string => note !== null);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
        피격 데미지
      </h3>

      <div className="space-y-2 rounded-xl border border-line bg-sunken/50 px-3 py-2.5">
        {rows.length === 0 ? (
          <p className="text-[0.7rem] leading-relaxed text-muted">
            공격력이 0이라 데미지가 들어오지 않는 몹이다
          </p>
        ) : (
          <div className="grid grid-cols-[auto_1fr_1fr_1fr] items-baseline gap-x-2 gap-y-1">
            <span />
            <span className="text-right text-[0.65rem] text-muted">기본</span>
            {MOB_ATTACK_UP_TIERS.map((tier) => (
              <span
                key={tier.stage}
                className="text-right text-[0.65rem] text-muted"
              >
                공격업 {tier.stage}
              </span>
            ))}

            {rows.map((row) => (
              <Row key={row.key} label={row.label} entry={row.entry} />
            ))}
          </div>
        )}

        {perDefense.length > 0 && (
          <p className="border-t border-line pt-2 text-[0.7rem] leading-relaxed text-muted">
            {perDefense.join(' · ')}
          </p>
        )}
      </div>

      <p className="text-[0.7rem] leading-relaxed text-muted">
        {footnotes.join(' · ')}
      </p>
    </div>
  );
}

/** 피격 경로 한 줄. 기본 데미지는 굵게, 공격업은 같은 줄에 옅게 붙인다. */
function Row({ label, entry }: { label: string; entry: HitDamageEntry }) {
  return (
    <>
      <span className="whitespace-nowrap text-xs font-semibold text-ink">
        {label}
      </span>
      {/*
        경고색(danger)을 쓰지 않는다. 이 값은 "미달"이나 "오류"가 아니라
        그냥 몹이 세다는 정보라, 빨갛게 칠하면 고쳐야 할 상태로 읽힌다.
      */}
      <Cell
        min={entry.damage.min}
        max={entry.damage.max}
        className="text-xs font-bold text-ink"
      />
      {entry.poweredUp.map((tier) => (
        <Cell
          key={tier.stage}
          min={tier.damage.min}
          max={tier.damage.max}
          className="text-[0.7rem] text-muted"
        />
      ))}
    </>
  );
}

function Cell({
  min,
  max,
  className,
}: {
  min: number;
  max: number;
  className: string;
}) {
  return (
    <span className={`text-right tabular-nums ${className}`}>
      {min === max && min === MIN_HIT_DAMAGE ? (
        fmt(min)
      ) : (
        <>
          {fmt(min)}
          <span className="mx-0.5 font-normal text-muted">~</span>
          {fmt(max)}
        </>
      )}
    </span>
  );
}

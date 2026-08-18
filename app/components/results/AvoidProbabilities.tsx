import { Monster, Skills, Stats } from '../../types/calculator';
import { getShadowShifterProp } from '../../data/shadowShifter';
import {
  AVOID_PROBABILITY_MAX,
  AVOID_PROBABILITY_MIN,
  AvoidBreakdownEntry,
  calculateAvoidBreakdown,
} from '../../utils/damageCalculator';

interface AvoidProbabilitiesProps {
  monster: Monster;
  stats: Stats;
  skills: Skills;
}

/**
 * 몹 공격을 흘릴 확률.
 *
 * 입력 패널이 아니라 결과 레일에 있는 이유는 **입력이 두 패널에 걸쳐 있기 때문이다.**
 * 캐릭터 회피율 · 페이크와 몹 명중률에서 나오므로, 어느 한쪽 입력 패널에 두면
 * 반드시 반대쪽 입력을 만지는 동안 화면 밖으로 나간다.
 */
export default function AvoidProbabilities({
  monster,
  stats,
  skills,
}: AvoidProbabilitiesProps) {
  const shadowShifterProp = skills.shadowShifterEnabled
    ? getShadowShifterProp(skills.shadowShifter)
    : 0;
  const avoidBreakdown = calculateAvoidBreakdown(
    stats.avoid,
    monster.level,
    stats.level,
    monster.accuracy,
    shadowShifterProp / 100
  );
  // 상·하한에 걸린 값은 회피율을 더 올려도(내려도) 안 움직이므로 그렇다고 알려준다.
  const physicalClamp =
    avoidBreakdown.physical.base <= AVOID_PROBABILITY_MIN + 1e-12
      ? `하한 ${AVOID_PROBABILITY_MIN * 100}%`
      : avoidBreakdown.physical.base >= AVOID_PROBABILITY_MAX - 1e-12
        ? `상한 ${AVOID_PROBABILITY_MAX * 100}%`
        : null;

  const columns: {
    key: string;
    label: string;
    hint: string;
    entry: AvoidBreakdownEntry;
    note: string | null;
  }[] = [
    {
      key: 'physical',
      label: '물리',
      hint: '몸박 포함',
      entry: avoidBreakdown.physical,
      note: physicalClamp && `도적 ${physicalClamp}에 걸렸다`,
    },
    // 마법 공격이 없는 몹은 마법으로 맞을 일이 없으니 흘릴 확률도 뜻이 없다.
    // 피격 데미지 쪽과 같은 기준으로 뺀다.
    ...(monster.hasMagicAttack === false
      ? []
      : [
          {
            key: 'magic',
            label: '마법',
            hint: '몹 마법 공격',
            entry: avoidBreakdown.magic,
            note: null,
          },
        ]),
  ];

  // 조건이 맞을 때만 붙는 각주라, 남는 게 없으면 문단째로 뺀다.
  const footnotes = [
    monster.hasMagicAttack === false ? '마법 공격이 없는 몹이다' : null,
    stats.avoid === undefined ? '회피율 미입력 시 0으로 본다' : null,
    shadowShifterProp === 0 && skills.shadowShifter > 0
      ? '페이크를 켜면 함께 반영한다'
      : null,
  ].filter((note): note is string => note !== null);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          회피 확률
        </h3>
        {shadowShifterProp > 0 && (
          <span className="chip border-brand/40 bg-brand/10 text-brand">
            페이크 {shadowShifterProp}% 반영
          </span>
        )}
      </div>

      {/*
        물리와 마법은 원작 공식부터 다른 별개의 값이라 어느 쪽도 부속으로 밀지 않고
        같은 크기로 나란히 놓는다.
      */}
      <div
        className={`grid gap-3 rounded-xl border border-line bg-sunken/50 px-3 py-2.5 ${
          columns.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {columns.map((column) => {
          const shown = column.entry.withShadowShifter * 100;
          const gain =
            (shadowShifterProp > 0
              ? column.entry.shadowShifterGainPerAvoid
              : column.entry.baseGainPerAvoid) * 100;

          return (
            <div key={column.key} className="min-w-0">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xs font-semibold text-ink">
                  {column.label}
                </span>
                <span className="truncate text-[0.65rem] text-muted">
                  {column.hint}
                </span>
              </div>
              <div className="mt-0.5 text-base font-bold tabular-nums text-brand">
                {shown.toFixed(2)}%
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${Math.min(100, shown)}%` }}
                />
              </div>
              {/* 회피율 한 점이 실제로 얼마짜리인지가 스탯 투자 판단의 핵심이다. */}
              <p className="mt-1.5 text-[0.7rem] leading-relaxed text-muted">
                회피율 +1 →{' '}
                <b className="tabular-nums text-ink">
                  {gain > 0 && '+'}
                  {gain.toFixed(2)}%p
                </b>
              </p>
              {shadowShifterProp > 0 && (
                <p className="mt-0.5 text-[0.7rem] leading-relaxed text-muted">
                  페이크 없으면{' '}
                  <b className="tabular-nums text-ink">
                    {(column.entry.base * 100).toFixed(2)}%
                  </b>
                </p>
              )}
              {column.note && (
                <p className="mt-0.5 text-[0.7rem] leading-relaxed text-muted">
                  {column.note}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {footnotes.length > 0 && (
        <p className="text-[0.7rem] leading-relaxed text-muted">
          {footnotes.join(' · ')}
        </p>
      )}
    </div>
  );
}

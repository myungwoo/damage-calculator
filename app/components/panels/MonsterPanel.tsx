import { Dispatch, SetStateAction } from 'react';
import { AlertTriangle, Skull } from 'lucide-react';
import { Monster, MonsterPreset, Skills, Stats } from '../../types/calculator';
import { monsterPresets } from '../../data/monsterPresets';
import { REGION_ORDER } from '../../constants/calculator';
import { getShadowShifterProp } from '../../data/shadowShifter';
import {
  calculateRequiredHitRatio,
  calculateHitProbability,
  calculateAvoidBreakdown,
  AvoidBreakdownEntry,
  AVOID_PROBABILITY_MAX,
  AVOID_PROBABILITY_MIN,
} from '../../utils/damageCalculator';
import { parseElementAttributes } from '../../utils/calculatorUtils';
import MonsterDropdown from '../MonsterDropdown';
import NumberInput from '../NumberInput';
import Card from '../ui/Card';
import Field from '../ui/Field';

interface MonsterPanelProps {
  monster: Monster;
  setMonster: Dispatch<SetStateAction<Monster>>;
  stats: Stats;
  skills: Skills;
  selectedMonsterId: string;
  isCustomMonster: boolean;
  onMonsterSelect: (id: string) => void;
  selectedPreset: MonsterPreset | null | undefined;
  venomBlocked: boolean;
}

export default function MonsterPanel({
  monster,
  setMonster,
  stats,
  skills,
  selectedMonsterId,
  isCustomMonster,
  onMonsterSelect,
  selectedPreset,
  venomBlocked,
}: MonsterPanelProps) {
  const requiredHitRatio = calculateRequiredHitRatio(
    monster.level,
    stats.level,
    monster.avoid
  );
  const hitProbability = calculateHitProbability(
    stats.hitRatio,
    monster.level,
    stats.level,
    monster.avoid
  );
  const hitPercent = hitProbability * 100;
  // 회피 확률: 몹이 나를 때릴 때 얼마나 흘리는지. 물리와 마법은 원작 공식이 다르다.
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

  const avoidColumns: {
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
    {
      key: 'magic',
      label: '마법',
      hint: '몹 마법 공격',
      entry: avoidBreakdown.magic,
      note: null,
    },
  ];
  // 100%가 아니면 방컷 확률이 크게 흔들리므로 색으로 먼저 알린다.
  const hitTone =
    hitPercent >= 99.995
      ? 'text-brand'
      : hitPercent >= 90
        ? 'text-crit'
        : 'text-danger';

  // 'F2S3' 같은 원작 코드는 사람이 못 읽으므로 속성별로 풀어서 칩으로 보여준다.
  const elementAttributes = parseElementAttributes(
    selectedPreset?.elementAttributes
  );

  const numericFields = [
    {
      label: '레벨',
      value: monster.level,
      apply: (value: number) => ({ level: value }),
    },
    {
      label: 'HP',
      value: monster.hp,
      apply: (value: number) => ({ hp: value }),
    },
    {
      label: '물리 방어력',
      value: monster.physicalDefense,
      apply: (value: number) => ({ physicalDefense: value }),
    },
    {
      label: '회피율',
      value: monster.avoid,
      apply: (value: number) => ({ avoid: value }),
    },
    {
      label: '명중률',
      value: monster.accuracy,
      apply: (value: number) => ({ accuracy: value }),
    },
  ];

  return (
    <Card
      title="몬스터"
      icon={<Skull className="h-4 w-4" />}
      aside={
        selectedPreset && <span className="chip">{selectedPreset.region}</span>
      }
    >
      <div className="space-y-4">
        <MonsterDropdown
          selectedMonsterId={selectedMonsterId}
          isCustomMonster={isCustomMonster}
          monsterPresets={monsterPresets}
          onSelect={onMonsterSelect}
          regionOrder={REGION_ORDER}
        />

        <div className="grid grid-cols-2 gap-3">
          {numericFields.map((field) => (
            <Field key={field.label} label={field.label}>
              <NumberInput
                value={field.value}
                ariaLabel={`몬스터 ${field.label}`}
                onChange={(value) =>
                  setMonster((prev) => ({
                    ...prev,
                    ...field.apply(value ?? 0),
                  }))
                }
                disabled={!isCustomMonster}
              />
            </Field>
          ))}
        </div>

        {!isCustomMonster && (
          <p className="text-xs text-muted">
            프리셋 값은 잠겨 있다. 직접 고치려면 목록에서 <b>직접 입력</b>을
            고른다.
          </p>
        )}

        {/* 명중 정보: 방컷 확률을 좌우하는 값이라 별도 블록으로 뺀다. */}
        <div className="rounded-xl border border-line bg-sunken/60 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="field-label">타격 확률</span>
            <span className={`text-lg font-bold tabular-nums ${hitTone}`}>
              {hitPercent.toFixed(2)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className={`h-full rounded-full transition-all ${
                hitPercent >= 99.995
                  ? 'bg-brand'
                  : hitPercent >= 90
                    ? 'bg-crit'
                    : 'bg-danger'
              }`}
              style={{ width: `${Math.min(100, hitPercent)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            100%를 채우려면 명중률{' '}
            <b className="tabular-nums text-ink">
              {requiredHitRatio.toFixed(2)}
            </b>{' '}
            필요
            {stats.hitRatio === undefined && ' · 명중률 미입력 시 100%로 본다'}
          </p>
        </div>

        {/*
          회피 확률: 반대 방향(몹 -> 나) 판정이라 타격 확률과 나란히 둔다.
          물리와 마법은 원작 공식부터 다른 별개의 값이라 어느 쪽도 부속으로
          밀지 않고 같은 크기로 나란히 놓는다.
        */}
        <div className="rounded-xl border border-line bg-sunken/60 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="field-label">회피 확률</span>
            {shadowShifterProp > 0 && (
              <span className="chip border-brand/40 bg-brand/10 text-brand">
                페이크 {shadowShifterProp}% 반영
              </span>
            )}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-3">
            {avoidColumns.map((column) => {
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
                  <div className="mt-0.5 text-lg font-bold tabular-nums text-brand">
                    {shown.toFixed(2)}%
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${Math.min(100, shown)}%` }}
                    />
                  </div>
                  {/* 회피율 한 점이 실제로 얼마짜리인지가 스탯 투자 판단의 핵심이다. */}
                  <p className="mt-1.5 text-xs text-muted">
                    회피율 +1 →{' '}
                    <b className="tabular-nums text-ink">
                      {gain > 0 && '+'}
                      {gain.toFixed(2)}%p
                    </b>
                  </p>
                  {shadowShifterProp > 0 && (
                    <p className="mt-0.5 text-xs text-muted">
                      페이크 없으면{' '}
                      <b className="tabular-nums text-ink">
                        {(column.entry.base * 100).toFixed(2)}%
                      </b>
                    </p>
                  )}
                  {column.note && (
                    <p className="mt-0.5 text-xs text-muted">{column.note}</p>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-2 text-xs text-muted">
            물리와 마법은 원작 판정식이 서로 다르다
            {stats.avoid === undefined && ' · 회피율 미입력 시 0으로 본다'}
            {shadowShifterProp === 0 &&
              skills.shadowShifter > 0 &&
              ' · 페이크를 켜면 함께 반영한다'}
          </p>
        </div>

        {selectedPreset && (
          <div className="space-y-2">
            <span className="field-label">원작 몹 정보</span>
            <div className="flex flex-wrap gap-1.5">
              <span className="chip">
                공격력 {selectedPreset.physicalAttack}
              </span>
              {selectedPreset.magicAttack > 0 && (
                <span className="chip">마공 {selectedPreset.magicAttack}</span>
              )}
              <span className="chip">
                넉백 {selectedPreset.minimumPushDamage}
              </span>
              {selectedPreset.exp !== undefined && (
                <span className="chip">
                  EXP {selectedPreset.exp.toLocaleString('ko-KR')}
                </span>
              )}
              {elementAttributes.map(({ element, resistance }) => (
                <span
                  key={element}
                  className="chip"
                  title={`원작 속성 코드 ${selectedPreset.elementAttributes}`}
                >
                  {element} {resistance}
                </span>
              ))}
              {selectedPreset.isUndead && (
                <span className="chip border-venom/40 bg-venom/10 text-venom">
                  언데드
                </span>
              )}
              {selectedPreset.isBoss && (
                <span className="chip border-danger/40 bg-danger/10 text-danger">
                  보스
                </span>
              )}
            </div>
            {venomBlocked && (
              <p className="flex items-start gap-1.5 rounded-lg border border-crit/30 bg-crit/10 px-2.5 py-2 text-xs text-crit">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {selectedPreset.isBoss
                  ? '보스라서 베놈이 걸리지 않는다'
                  : `독 ${
                      selectedPreset.poisonAttribute === 1 ? '무효' : '반감'
                    }이라 베놈이 걸리지 않는다`}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

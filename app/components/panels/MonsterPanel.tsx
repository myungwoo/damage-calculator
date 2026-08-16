import { Dispatch, SetStateAction } from 'react';
import { AlertTriangle, Skull } from 'lucide-react';
import { Monster, MonsterPreset, Stats } from '../../types/calculator';
import { monsterPresets } from '../../data/monsterPresets';
import { REGION_ORDER } from '../../constants/calculator';
import {
  calculateRequiredHitRatio,
  calculateHitProbability,
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

        {selectedPreset && (
          <div className="space-y-2">
            <span className="field-label">원작 몹 정보</span>
            <div className="flex flex-wrap gap-1.5">
              <span className="chip">명중률 {selectedPreset.accuracy}</span>
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

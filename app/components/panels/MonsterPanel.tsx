import { Dispatch, SetStateAction } from 'react';
import { AlertTriangle, Skull } from 'lucide-react';
import { Monster, MonsterPreset } from '../../types/calculator';
import { monsterPresets } from '../../data/monsterPresets';
import { REGION_ORDER } from '../../constants/calculator';
import { parseElementAttributes } from '../../utils/calculatorUtils';
import MonsterDropdown from '../MonsterDropdown';
import NumberInput from '../NumberInput';
import Card from '../ui/Card';
import Field from '../ui/Field';

interface MonsterPanelProps {
  monster: Monster;
  setMonster: Dispatch<SetStateAction<Monster>>;
  selectedMonsterId: string;
  isCustomMonster: boolean;
  onMonsterSelect: (id: string) => void;
  selectedPreset: MonsterPreset | null | undefined;
  venomBlocked: boolean;
}

export default function MonsterPanel({
  monster,
  setMonster,
  selectedMonsterId,
  isCustomMonster,
  onMonsterSelect,
  selectedPreset,
  venomBlocked,
}: MonsterPanelProps) {
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
    {
      label: '물리 공격력',
      value: monster.physicalAttack,
      apply: (value: number) => ({ physicalAttack: value }),
    },
    {
      label: '마법 공격력',
      value: monster.magicAttack,
      apply: (value: number) => ({ magicAttack: value }),
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

        {selectedPreset && (
          <div className="space-y-2">
            <span className="field-label">몹 정보</span>
            <div className="flex flex-wrap gap-1.5">
              {/*
                입력칸의 물리 공격력은 몸박 기준이라, 그보다 센 공격이 따로 있으면
                여기서 알려 준다. 피격 데미지가 그 값을 대표값으로 쓴다.
              */}
              {selectedPreset.physicalAttackPowers !== undefined && (
                <span className="chip">
                  물리 공격 {selectedPreset.physicalAttackPowers.join(' · ')}
                </span>
              )}
              {selectedPreset.hasMagicAttack !== true &&
                selectedPreset.magicAttack > 0 && (
                  <span className="chip">마법 공격 없음</span>
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
                  title={`속성 코드 ${selectedPreset.elementAttributes}`}
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

import { Dispatch, SetStateAction } from 'react';
import { ChevronDown, Swords } from 'lucide-react';
import { Equipment } from '../../types/calculator';
import { throwingStars } from '../../data/weapons';
import NumberInput from '../NumberInput';
import Card from '../ui/Card';
import Field from '../ui/Field';

/** 효율은 나눗셈 결과라 정수로 떨어지지 않는다. 소수 다섯 자리로 반올림해 적는다. */
function formatEfficiency(value: number): string {
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  });
}

interface EquipmentPanelProps {
  equipment: Equipment;
  setEquipment: Dispatch<SetStateAction<Equipment>>;
  /** 공격력 효율(공격력 1당 LUK, LUK 1당 공격력)을 내기 위한 LUK 합계 */
  totalLuk: number;
}

export default function EquipmentPanel({
  equipment,
  setEquipment,
  totalLuk,
}: EquipmentPanelProps) {
  const starAttack =
    throwingStars.find((star) => star.id === equipment.selectedWeaponId)
      ?.attack ?? 0;

  const parts = [
    {
      label: '무기 공격력',
      value: equipment.weaponAttack,
      apply: (value: number) => ({ weaponAttack: value }),
    },
    {
      label: '장갑 공격력',
      value: equipment.gloveAttack,
      apply: (value: number) => ({ gloveAttack: value }),
    },
    {
      label: '기타 공격력',
      value: equipment.otherAttack,
      apply: (value: number) => ({ otherAttack: value }),
    },
    {
      label: '도핑',
      value: equipment.buff,
      apply: (value: number) => ({ buff: value }),
    },
  ];

  const totalAttack =
    equipment.weaponAttack +
    starAttack +
    equipment.gloveAttack +
    equipment.otherAttack +
    equipment.buff;

  // 어느 쪽이든 0이면 나눌 수 없다. 0으로 적으면 "효율이 0"으로 읽히므로 줄째로 뺀다.
  const efficiency =
    totalAttack > 0 && totalLuk > 0
      ? {
          lukPerAttack: totalLuk / totalAttack,
          attackPerLuk: totalAttack / totalLuk,
        }
      : undefined;

  return (
    <Card
      title="장비"
      icon={<Swords className="h-4 w-4" />}
      aside={
        <span className="text-sm font-bold tabular-nums text-brand">
          총 {totalAttack.toLocaleString('ko-KR')}
        </span>
      }
    >
      <div className="space-y-4">
        <Field label="표창" htmlFor="throwing-star">
          <div className="relative">
            <select
              id="throwing-star"
              value={equipment.selectedWeaponId}
              onChange={(e) =>
                setEquipment((prev) => ({
                  ...prev,
                  selectedWeaponId: e.target.value,
                }))
              }
              className="field-input appearance-none pr-9"
            >
              {throwingStars.map((star) => (
                <option key={star.id} value={star.id}>
                  {star.name} · 공격력 {star.attack}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          {parts.map((part) => (
            <Field key={part.label} label={part.label}>
              <NumberInput
                value={part.value}
                ariaLabel={part.label}
                onChange={(value) =>
                  setEquipment((prev) => ({
                    ...prev,
                    ...part.apply(value ?? 0),
                  }))
                }
              />
            </Field>
          ))}
        </div>

        {/* 합계는 어떤 값들이 더해졌는지까지 보여준다. */}
        <div className="rounded-xl border border-line bg-sunken/60 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="field-label">공격력 합</span>
            <span className="text-2xl font-bold tabular-nums text-brand">
              {totalAttack.toLocaleString('ko-KR')}
            </span>
          </div>
          <p className="mt-1.5 text-xs tabular-nums text-muted">
            무기 {equipment.weaponAttack} + 표창 {starAttack} + 장갑{' '}
            {equipment.gloveAttack} + 기타 {equipment.otherAttack} + 도핑{' '}
            {equipment.buff}
          </p>
          {/*
            공격력 효율은 공격력 합에서 바로 나오는 값이라 같은 상자 안에 구분선으로
            갈라 둔다. 더 자주 찾는 "공격력 1당 LUK"을 먼저 세운다.
          */}
          {efficiency && (
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3">
              <div>
                <span className="field-label">공격력 1당 LUK</span>
                <p className="text-sm font-semibold tabular-nums text-brand">
                  {formatEfficiency(efficiency.lukPerAttack)}
                </p>
              </div>
              <div>
                <span className="field-label">LUK 1당 공격력</span>
                <p className="text-sm font-semibold tabular-nums text-brand">
                  {formatEfficiency(efficiency.attackPerLuk)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

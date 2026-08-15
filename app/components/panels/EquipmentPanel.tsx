import { Dispatch, SetStateAction } from 'react';
import { ChevronDown, Swords } from 'lucide-react';
import { Equipment } from '../../types/calculator';
import { throwingStars } from '../../data/weapons';
import NumberInput from '../NumberInput';
import Card from '../ui/Card';
import Field from '../ui/Field';

interface EquipmentPanelProps {
  equipment: Equipment;
  setEquipment: Dispatch<SetStateAction<Equipment>>;
}

export default function EquipmentPanel({
  equipment,
  setEquipment,
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
        </div>
      </div>
    </Card>
  );
}

'use client';

import { Dispatch, SetStateAction, useState } from 'react';
import { ChevronDown, Swords } from 'lucide-react';
import { AttackItem, Equipment } from '../../types/calculator';
import { throwingStars } from '../../data/weapons';
import {
  ECHO_OF_HERO_OPTIONS,
  getEchoOfHeroPercent,
} from '../../data/echoOfHero';
import { calculateTotalAttack } from '../../utils/damageCalculator';
import { resolveAttackPart } from '../../utils/attackItems';
import AttackBreakdown from '../AttackBreakdown';
import NumberInput from '../NumberInput';
import Card from '../ui/Card';
import Field from '../ui/Field';
import SegmentedControl from '../ui/SegmentedControl';

/** 효율은 나눗셈 결과라 정수로 떨어지지 않는다. 소수 다섯 자리로 반올림해 적는다. */
function formatEfficiency(value: number): string {
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  });
}

/** 항목으로 나눌 수 있는 칸. 둘 다 여러 부위·물약의 합을 적는 자리다 */
type BreakdownKey = 'other' | 'buff';

export interface EquipmentPanelProps {
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
  // 한 번에 하나만 펼친다. 둘 다 열면 입력칸이 화면 밖으로 밀린다.
  const [openBreakdown, setOpenBreakdown] = useState<BreakdownKey | null>(null);

  const starAttack =
    throwingStars.find((star) => star.id === equipment.selectedWeaponId)
      ?.attack ?? 0;

  const otherAttack = resolveAttackPart(
    equipment.otherAttack,
    equipment.otherAttackItems
  );
  const buffAttack = resolveAttackPart(equipment.buff, equipment.buffItems);

  /**
   * 항목을 고치면 숫자 칸도 같이 맞춰 둔다.
   * 계산은 `resolveAttackPart`로 다시 합치므로 이건 화면과 저장 데이터를 위한 것이다.
   */
  const setItems = (key: BreakdownKey, items: AttackItem[]) =>
    setEquipment((prev) => {
      const value = resolveAttackPart(
        key === 'other' ? prev.otherAttack : prev.buff,
        items
      );
      return key === 'other'
        ? { ...prev, otherAttackItems: items, otherAttack: value }
        : { ...prev, buffItems: items, buff: value };
    });

  const breakdowns: Record<
    BreakdownKey,
    { title: string; items: AttackItem[]; placeholders: string[] }
  > = {
    other: {
      title: '기타 공격력',
      items: equipment.otherAttackItems ?? [],
      placeholders: ['벨트', '어깨', '망토', '신발', '귀고리', '반지'],
    },
    buff: {
      title: '도핑',
      items: equipment.buffItems ?? [],
      placeholders: ['전사의 비약', '사이다', '정령의 축복', '스팟 주스'],
    },
  };

  const parts: {
    label: string;
    value: number;
    apply: (value: number) => Partial<Equipment>;
    breakdown?: BreakdownKey;
  }[] = [
    {
      label: '무기 공격력',
      value: equipment.weaponAttack,
      apply: (value) => ({ weaponAttack: value }),
    },
    {
      label: '장갑 공격력',
      value: equipment.gloveAttack,
      apply: (value) => ({ gloveAttack: value }),
    },
    {
      label: '기타 공격력',
      value: otherAttack,
      apply: (value) => ({ otherAttack: value }),
      breakdown: 'other',
    },
    {
      label: '도핑',
      value: buffAttack,
      apply: (value) => ({ buff: value }),
      breakdown: 'buff',
    },
  ];

  const baseAttack =
    equipment.weaponAttack +
    starAttack +
    equipment.gloveAttack +
    otherAttack +
    buffAttack;
  // 상한(1999)과 영웅의 메아리 버림까지 계산 쪽과 같은 함수로 낸다.
  const totalAttack = calculateTotalAttack(equipment);
  const echoPercent = getEchoOfHeroPercent(equipment.echoOfHero);

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
          {parts.map((part) => {
            const items = part.breakdown
              ? breakdowns[part.breakdown].items
              : [];
            const splitted = items.length > 0;
            return (
              <Field
                key={part.label}
                label={part.label}
                action={
                  part.breakdown && (
                    /*
                      여러 부위·물약의 합을 적는 칸이라 항목을 펼칠 수 있게 한다.
                      버튼을 라벨 옆 빈 자리에 두면 줄이 늘지 않고, 안 쓰는 사람에게는
                      숫자 하나만 적는 지금 모습 그대로 남는다.
                    */
                    <button
                      type="button"
                      onClick={() =>
                        setOpenBreakdown((prev) =>
                          prev === part.breakdown ? null : part.breakdown!
                        )
                      }
                      aria-expanded={openBreakdown === part.breakdown}
                      className={`text-[0.7rem] font-semibold transition-colors ${
                        splitted
                          ? 'text-brand hover:text-ink'
                          : 'text-muted hover:text-brand'
                      }`}
                    >
                      {splitted ? `항목 ${items.length}개` : '+ 항목'}
                    </button>
                  )
                }
              >
                <NumberInput
                  value={part.value}
                  ariaLabel={part.label}
                  // 항목으로 나눈 칸은 합계가 값이라 직접 고칠 수 없다.
                  disabled={splitted}
                  onChange={(value) =>
                    setEquipment((prev) => ({
                      ...prev,
                      ...part.apply(value ?? 0),
                    }))
                  }
                />
              </Field>
            );
          })}
        </div>

        {openBreakdown && (
          <AttackBreakdown
            title={breakdowns[openBreakdown].title}
            items={breakdowns[openBreakdown].items}
            placeholders={breakdowns[openBreakdown].placeholders}
            onChange={(items) => setItems(openBreakdown, items)}
            onClose={() => setOpenBreakdown(null)}
          />
        )}

        {/*
          영웅의 메아리는 스킬이지만 하는 일이 공격력 합에 배율을 거는 것뿐이라
          장비 패널에 둔다. 스킬 패널로 보내면 이 카드의 합계가 카드 안 입력들의
          합과 안 맞아서 계산이 틀린 것처럼 보인다. 레벨이 1뿐이고 고르는 것은
          종류라서 SegmentedControl 한 줄로 충분하다.
        */}
        <div className="space-y-1.5">
          <span className="field-label">영웅의 메아리</span>
          <SegmentedControl
            ariaLabel="영웅의 메아리 종류"
            columns={3}
            dense
            value={equipment.echoOfHero}
            onChange={(value) =>
              setEquipment((prev) => ({ ...prev, echoOfHero: value }))
            }
            options={ECHO_OF_HERO_OPTIONS.map((option) => ({
              value: option.type,
              label: option.label,
              meta: option.percent > 0 ? `+${option.percent}%` : undefined,
            }))}
          />
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
            {equipment.gloveAttack} + 기타 {otherAttack} + 도핑 {buffAttack}
            {echoPercent > 0 && (
              <>
                {' '}
                = {baseAttack}, 영웅의 메아리 +{echoPercent}% (+
                {totalAttack - baseAttack})
              </>
            )}
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

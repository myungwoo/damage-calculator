import { Dispatch, SetStateAction } from 'react';
import { Minus, Plus, User } from 'lucide-react';
import { Skills, Stats, StatType } from '../../types/calculator';
import {
  SHADOW_SHIFTER_MAX_LEVEL,
  getShadowShifterProp,
} from '../../data/shadowShifter';
import { PURE_INT } from '../../constants/calculator';
import NumberInput from '../NumberInput';
import Card from '../ui/Card';
import Field from '../ui/Field';
import ReadonlyValue from '../ui/ReadonlyValue';
import SkillRow from '../ui/SkillRow';

interface CharacterPanelProps {
  stats: Stats;
  setStats: Dispatch<SetStateAction<Stats>>;
  skills: Skills;
  setSkills: Dispatch<SetStateAction<Skills>>;
  onPureStatChange: (statType: StatType, value: number) => void;
  onLevelChange: (delta: number) => void;
}

export default function CharacterPanel({
  stats,
  setStats,
  skills,
  setSkills,
  onPureStatChange,
  onLevelChange,
}: CharacterPanelProps) {
  // LUK 순 스탯은 레벨과 STR/DEX에서 역산되는 값이라 직접 입력받지 않는다.
  // INT 순 스탯은 AP를 주지 않으므로 시작값 4에서 멈춘다.
  const statRows: {
    label: string;
    pure: number;
    additional: number;
    /** 순 스탯을 직접 고칠 수 있는 스탯만 갖는다 (없으면 읽기 전용으로 그린다) */
    onPure?: (value: number) => void;
    onAdditional: (value: number) => void;
  }[] = [
    {
      label: 'STR',
      pure: stats.str,
      additional: stats.additionalStr,
      onPure: (value) => onPureStatChange('str', value),
      onAdditional: (value) =>
        setStats((prev) => ({ ...prev, additionalStr: value })),
    },
    {
      label: 'DEX',
      pure: stats.dex,
      additional: stats.additionalDex,
      onPure: (value) => onPureStatChange('dex', value),
      onAdditional: (value) =>
        setStats((prev) => ({ ...prev, additionalDex: value })),
    },
    {
      label: 'INT',
      pure: PURE_INT,
      additional: stats.additionalInt,
      onAdditional: (value) =>
        setStats((prev) => ({ ...prev, additionalInt: value })),
    },
    {
      label: 'LUK',
      pure: stats.luk,
      additional: stats.additionalLuk,
      onAdditional: (value) =>
        setStats((prev) => ({ ...prev, additionalLuk: value })),
    },
  ];

  return (
    <Card
      title="캐릭터"
      icon={<User className="h-4 w-4" />}
      aside={
        <span className="chip border-brand/40 bg-brand/10 text-brand">
          Lv.{stats.level}
        </span>
      }
    >
      <div className="space-y-4">
        <Field label="레벨">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onLevelChange(-1)}
              aria-label="레벨 1 낮추기"
              className="ghost-button h-9 w-9 shrink-0"
            >
              <Minus className="h-4 w-4" />
            </button>
            <NumberInput
              value={stats.level}
              ariaLabel="캐릭터 레벨"
              onChange={(value) => {
                if (value !== undefined) {
                  onLevelChange(value - stats.level);
                }
              }}
              className="text-center"
            />
            <button
              type="button"
              onClick={() => onLevelChange(1)}
              aria-label="레벨 1 높이기"
              className="ghost-button h-9 w-9 shrink-0"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </Field>

        {/* 순 스탯 / 추가 스탯 / 합을 표로 세워서 세 값의 관계가 바로 보이게 한다. */}
        <div>
          <div className="grid grid-cols-[2.6rem_1fr_1fr_1fr] items-center gap-2 pb-1">
            <span />
            <span className="field-label text-center">순수</span>
            <span className="field-label text-center">추가</span>
            <span className="field-label text-center">합계</span>
          </div>
          <div className="space-y-2">
            {statRows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[2.6rem_1fr_1fr_1fr] items-center gap-2"
              >
                <span className="text-xs font-bold text-muted">
                  {row.label}
                </span>
                {row.onPure ? (
                  <NumberInput
                    value={row.pure}
                    ariaLabel={`순수 ${row.label}`}
                    onChange={(value) => {
                      if (value !== undefined) {
                        row.onPure?.(value);
                      }
                    }}
                    className="text-center"
                  />
                ) : (
                  <ReadonlyValue
                    value={row.pure}
                    ariaLabel={`순수 ${row.label}`}
                  />
                )}
                <NumberInput
                  value={row.additional}
                  ariaLabel={`추가 ${row.label}`}
                  onChange={(value) => row.onAdditional(value ?? 0)}
                  className="text-center"
                />
                <ReadonlyValue
                  value={row.pure + row.additional}
                  emphasis
                  ariaLabel={`총 ${row.label}`}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            LUK 순수 스탯은 레벨과 STR / DEX에서 역산한다. INT는 순수 {PURE_INT}
            에서 멈추고, 공격 데미지가 아니라 물리 피격 데미지에만 들어간다
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="명중률"
            hint="비워 두면 타격 확률을 100%로 두고 계산한다"
          >
            <NumberInput
              value={stats.hitRatio}
              ariaLabel="명중률"
              onChange={(value) =>
                setStats((prev) => ({ ...prev, hitRatio: value }))
              }
              placeholder="입력 안 하면 100% 명중"
              allowUndefined
            />
          </Field>

          <Field
            label="회피율"
            hint="비워 두면 0으로 두고 회피 확률을 계산한다"
          >
            <NumberInput
              value={stats.avoid}
              ariaLabel="회피율"
              onChange={(value) =>
                setStats((prev) => ({ ...prev, avoid: value }))
              }
              placeholder="입력 안 하면 0"
              allowUndefined
            />
          </Field>

          {/* 방어력은 데미지에는 영향이 없고 피격 데미지에만 들어간다. */}
          <Field label="물리 방어력">
            <NumberInput
              value={stats.physicalDefense}
              ariaLabel="물리 방어력"
              onChange={(value) =>
                setStats((prev) => ({ ...prev, physicalDefense: value }))
              }
              placeholder="입력 안 하면 0"
              allowUndefined
            />
          </Field>

          <Field label="마법 방어력">
            <NumberInput
              value={stats.magicalDefense}
              ariaLabel="마법 방어력"
              onChange={(value) =>
                setStats((prev) => ({ ...prev, magicalDefense: value }))
              }
              placeholder="입력 안 하면 0"
              allowUndefined
            />
          </Field>
        </div>

        {/*
          페이크는 공격 스킬이 아니라 피격을 무효화하는 스킬이라 데미지 계산에
          안 들어간다. 회피율과 같은 자리에서 회피 확률만 움직이므로 스킬 패널이
          아니라 여기에 둔다.
        */}
        <SkillRow
          name="페이크"
          level={skills.shadowShifter}
          maxLevel={SHADOW_SHIFTER_MAX_LEVEL}
          onLevelChange={(level) =>
            setSkills((prev) => ({ ...prev, shadowShifter: level }))
          }
          toggle={{
            checked: skills.shadowShifterEnabled,
            onChange: (checked) =>
              setSkills((prev) => ({
                ...prev,
                shadowShifterEnabled: checked,
              })),
          }}
          effect={
            skills.shadowShifter > 0
              ? `피격 시 ${getShadowShifterProp(skills.shadowShifter)}% 확률로 데미지를 무효화한다`
              : '레벨을 올리면 피격을 무효화할 확률이 생긴다'
          }
        >
          <p className="mt-1 text-xs text-muted">
            회피 판정과는 별개의 난수라, 회피에 실패해도 이 확률만큼 한 번 더
            흘린다. 결과의 회피 확률에 합쳐서 보여준다.
          </p>
        </SkillRow>
      </div>
    </Card>
  );
}

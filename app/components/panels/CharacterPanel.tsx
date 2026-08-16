import { Dispatch, SetStateAction } from 'react';
import { Minus, Plus, User } from 'lucide-react';
import { Stats, StatType } from '../../types/calculator';
import NumberInput from '../NumberInput';
import Card from '../ui/Card';
import Field from '../ui/Field';
import ReadonlyValue from '../ui/ReadonlyValue';

interface CharacterPanelProps {
  stats: Stats;
  setStats: Dispatch<SetStateAction<Stats>>;
  onPureStatChange: (statType: StatType, value: number) => void;
  onLevelChange: (delta: number) => void;
}

export default function CharacterPanel({
  stats,
  setStats,
  onPureStatChange,
  onLevelChange,
}: CharacterPanelProps) {
  // LUK 순 스탯은 레벨과 STR/DEX에서 역산되는 값이라 직접 입력받지 않는다.
  const statRows = [
    {
      key: 'str' as const,
      label: 'STR',
      pure: stats.str,
      additional: stats.additionalStr,
      editablePure: true,
      onAdditional: (value: number) =>
        setStats((prev) => ({ ...prev, additionalStr: value })),
    },
    {
      key: 'dex' as const,
      label: 'DEX',
      pure: stats.dex,
      additional: stats.additionalDex,
      editablePure: true,
      onAdditional: (value: number) =>
        setStats((prev) => ({ ...prev, additionalDex: value })),
    },
    {
      key: 'luk' as const,
      label: 'LUK',
      pure: stats.luk,
      additional: stats.additionalLuk,
      editablePure: false,
      onAdditional: (value: number) =>
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
                key={row.key}
                className="grid grid-cols-[2.6rem_1fr_1fr_1fr] items-center gap-2"
              >
                <span className="text-xs font-bold text-muted">
                  {row.label}
                </span>
                {row.editablePure ? (
                  <NumberInput
                    value={row.pure}
                    ariaLabel={`순수 ${row.label}`}
                    onChange={(value) => {
                      if (value !== undefined) {
                        onPureStatChange(row.key, value);
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
            LUK 순수 스탯은 레벨과 STR / DEX에서 역산한다
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
        </div>
      </div>
    </Card>
  );
}

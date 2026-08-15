import { Dispatch, SetStateAction } from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { AttackSkillType, Skills } from '../../types/calculator';
import {
  getSkillLevelRange,
  renderSkillEffect,
} from '../../utils/calculatorUtils';
import NumberInput from '../NumberInput';
import Card from '../ui/Card';
import Field from '../ui/Field';
import SegmentedControl from '../ui/SegmentedControl';
import SkillRow from '../ui/SkillRow';

interface SkillsPanelProps {
  skills: Skills;
  setSkills: Dispatch<SetStateAction<Skills>>;
  onMapleWarriorToggle: (enabled: boolean) => void;
  onMapleWarriorLevelChange: (level: number) => void;
  onSharpEyesToggle: (enabled: boolean) => void;
  onSharpEyesLevelChange: (level: number) => void;
  /** 계산 결과상 베놈이 실제로 반영됐는지. 안 걸리는 이유를 알려주는 데 쓴다. */
  venomApplied: boolean;
}

const ATTACK_SKILLS: {
  value: AttackSkillType;
  label: string;
  meta: string;
}[] = [
  { value: 'lucky7', label: '럭키 세븐', meta: '2타 · LUK 기반' },
  { value: 'tripleThrow', label: '트리플 스로우', meta: '3타 · LUK 기반' },
  { value: 'avenger', label: '어벤져', meta: '1타 · 다중 타겟' },
  { value: 'drain', label: '드레인', meta: '1타 · 베놈 안 걸림' },
];

/** getSkillLevelRange를 단일 출처로 삼아 슬라이더 범위를 뽑는다. */
const levelBounds = (skillType: string) => {
  const range = getSkillLevelRange(skillType);
  return { min: range[0] ?? 0, max: range[range.length - 1] ?? 0 };
};

export default function SkillsPanel({
  skills,
  setSkills,
  onMapleWarriorToggle,
  onMapleWarriorLevelChange,
  onSharpEyesToggle,
  onSharpEyesLevelChange,
  venomApplied,
}: SkillsPanelProps) {
  const attackBounds = levelBounds(skills.type);
  const venomBounds = levelBounds('venom');

  const buffSkills = [
    {
      key: 'criticalThrow' as const,
      name: '크리티컬 스로우',
      level: skills.criticalThrow,
      onLevelChange: (level: number) =>
        setSkills((prev) => ({ ...prev, criticalThrow: level })),
    },
    {
      key: 'javelin' as const,
      name: '자벨린 마스터리',
      level: skills.javelin,
      onLevelChange: (level: number) =>
        setSkills((prev) => ({ ...prev, javelin: level })),
    },
    {
      key: 'shadowPartner' as const,
      name: '쉐도우 파트너',
      level: skills.shadowPartner,
      onLevelChange: (level: number) =>
        setSkills((prev) => ({ ...prev, shadowPartner: level })),
      toggle: {
        checked: skills.shadowPartnerEnabled,
        onChange: (checked: boolean) =>
          setSkills((prev) => ({ ...prev, shadowPartnerEnabled: checked })),
      },
    },
    {
      key: 'mapleWarrior' as const,
      name: '메이플 용사',
      level: skills.mapleWarrior,
      onLevelChange: onMapleWarriorLevelChange,
      toggle: {
        checked: skills.mapleWarriorEnabled,
        onChange: onMapleWarriorToggle,
      },
    },
    {
      key: 'sharpEyes' as const,
      name: '샤프 아이즈',
      level: skills.sharpEyes,
      onLevelChange: onSharpEyesLevelChange,
      toggle: {
        checked: skills.sharpEyesEnabled,
        onChange: onSharpEyesToggle,
      },
    },
  ];

  return (
    <Card title="스킬" icon={<Sparkles className="h-4 w-4" />}>
      <div className="space-y-4">
        <Field label="공격 스킬">
          <SegmentedControl
            ariaLabel="공격 스킬"
            options={ATTACK_SKILLS}
            value={skills.type}
            onChange={(type) =>
              setSkills((prev) => ({ ...prev, type, level: 1 }))
            }
          />
        </Field>

        <SkillRow
          name={
            ATTACK_SKILLS.find((skill) => skill.value === skills.type)?.label ??
            '공격 스킬'
          }
          level={skills.level}
          minLevel={attackBounds.min}
          maxLevel={attackBounds.max}
          onLevelChange={(level) => setSkills((prev) => ({ ...prev, level }))}
          effect={renderSkillEffect(skills.type, skills.level)}
        />

        <div className="space-y-2">
          {buffSkills.map((skill) => {
            const bounds = levelBounds(skill.key);
            return (
              <SkillRow
                key={skill.key}
                name={skill.name}
                level={skill.level}
                minLevel={bounds.min}
                maxLevel={bounds.max}
                onLevelChange={skill.onLevelChange}
                effect={renderSkillEffect(skill.key, skill.level)}
                toggle={skill.toggle}
              />
            );
          })}

          {/* 베놈은 부가 입력(공격 속도)과 경고가 붙어서 따로 렌더한다. */}
          <SkillRow
            name="베놈"
            level={skills.venom}
            minLevel={venomBounds.min}
            maxLevel={venomBounds.max}
            onLevelChange={(level) =>
              setSkills((prev) => ({ ...prev, venom: level }))
            }
            effect={renderSkillEffect('venom', skills.venom)}
            toggle={{
              checked: skills.venomEnabled,
              onChange: (checked) =>
                setSkills((prev) => ({ ...prev, venomEnabled: checked })),
            }}
          >
            {skills.venomEnabled && skills.venom > 0 && (
              <div className="mt-3 border-t border-line pt-3">
                <Field
                  label="분당 공격 횟수"
                  hint="베놈은 1초마다 1틱씩 들어가서, 같은 방수라도 공격 속도에 따라 틱 수가 달라진다"
                >
                  <NumberInput
                    value={skills.attacksPerMinute}
                    ariaLabel="분당 공격 횟수"
                    suffix="회/분"
                    onChange={(value) =>
                      setSkills((prev) => ({
                        ...prev,
                        attacksPerMinute: Math.max(1, value ?? 1),
                      }))
                    }
                  />
                </Field>
              </div>
            )}
            {!venomApplied && skills.venomEnabled && skills.venom > 0 && (
              <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-crit/30 bg-crit/10 px-2.5 py-2 text-xs text-crit">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {skills.type === 'drain'
                  ? '드레인에는 베놈이 발동하지 않는다'
                  : '보스 / 독 무효 · 반감 몬스터에는 베놈이 걸리지 않는다'}
              </p>
            )}
          </SkillRow>
        </div>
      </div>
    </Card>
  );
}

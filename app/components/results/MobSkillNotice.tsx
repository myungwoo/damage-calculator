import { AlertTriangle } from 'lucide-react';
import { MonsterPreset } from '../../types/calculator';
import { getMobSkillInfo } from '../../data/mobSkills';

interface MobSkillNoticeProps {
  preset: MonsterPreset | null | undefined;
}

/**
 * 방컷 확률을 나쁘게 만드는 몹 스킬 경고.
 *
 * 몹 스킬은 **걸린 동안에만** 효과가 있어서 계산에 상시 반영하면 오히려 틀린 숫자가
 * 된다. 그렇다고 안 알려 주면 유저는 방어업이 걸린 몹을 잡으면서 "계산기가 틀렸다"고
 * 읽는다. 그래서 숫자는 그대로 두고 **언제 이 숫자가 안 맞는지**만 방컷 확률 바로
 * 아래에 붙인다. 타격 확률 경고와 같은 자리, 같은 이유다.
 */
export default function MobSkillNotice({ preset }: MobSkillNoticeProps) {
  const risky = (preset?.mobSkills ?? [])
    .map((skill) => ({ skill, info: getMobSkillInfo(skill.id) }))
    .filter(({ info }) => info.impact === 'kill');

  if (risky.length === 0) {
    return null;
  }

  return (
    <p className="flex items-start gap-1.5 rounded-lg border border-crit/30 bg-crit/10 px-2.5 py-2 text-xs leading-relaxed text-crit">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        이 몹은{' '}
        <b>
          {risky
            .map(({ skill, info }) =>
              skill.x !== undefined && info.value
                ? `${info.name} ${info.value(skill.x)}`
                : info.name
            )
            .join(' · ')}
        </b>{' '}
        스킬을 쓴다. 걸려 있는 동안은 위 확률보다 안 잡힌다
      </span>
    </p>
  );
}

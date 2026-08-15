import { ReactNode } from 'react';
import { Droplet, HeartPulse, Target, Zap } from 'lucide-react';
import { DamageRange, DamageResult, Skills } from '../../types/calculator';
import KillProbabilityChart from './KillProbabilityChart';

interface ResultsPanelProps {
  result: DamageResult;
  skills: Skills;
}

const floor = (value: number) => Math.floor(value);
const fmt = (value: number) => floor(value).toLocaleString('ko-KR');

interface StatLineProps {
  label: string;
  range: DamageRange;
  icon?: ReactNode;
  tone?: 'ink' | 'crit' | 'venom';
  /** 쉐도우 파트너처럼 본체 값에 따라붙는 값 */
  addon?: DamageRange | null;
  note?: string;
}

function StatLine({
  label,
  range,
  icon,
  tone = 'ink',
  addon,
  note,
}: StatLineProps) {
  const toneClass =
    tone === 'crit'
      ? 'text-crit'
      : tone === 'venom'
        ? 'text-venom'
        : 'text-ink';

  return (
    <div className="rounded-xl border border-line bg-sunken/50 px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-muted">
          {icon}
          {label}
        </span>
        <span className={`text-base font-bold tabular-nums ${toneClass}`}>
          {fmt(range.min)}
          <span className="mx-1 font-normal text-muted">~</span>
          {fmt(range.max)}
        </span>
      </div>
      {addon && (
        <div className="mt-1 flex items-baseline justify-between gap-2 text-xs">
          <span className="text-muted">└ 쉐도우 파트너</span>
          <span className="font-semibold tabular-nums text-muted">
            +{fmt(addon.min)} ~ +{fmt(addon.max)}
          </span>
        </div>
      )}
      {range.expected !== undefined && (
        <div className="mt-1 flex items-baseline justify-between gap-2 text-xs">
          <span className="text-muted">기댓값</span>
          <span className="font-semibold tabular-nums text-muted">
            {fmt(range.expected)}
          </span>
        </div>
      )}
      {note && (
        <p className="mt-1.5 text-[0.7rem] leading-relaxed text-muted">
          {note}
        </p>
      )}
    </div>
  );
}

export default function ResultsPanel({ result, skills }: ResultsPanelProps) {
  const shadowActive = skills.shadowPartnerEnabled && skills.shadowPartner > 0;

  // 히어로 숫자는 "누적 확률이 처음 50%를 넘는 방수"로 잡는다.
  // 사람들이 실제로 알고 싶어 하는 "몇 방컷이냐"에 가장 가까운 값이다.
  const median =
    result.killProbabilities.find((entry) => Number(entry.accProb) >= 50) ??
    result.killProbabilities[result.killProbabilities.length - 1];
  const medianIsHalf = median !== undefined && Number(median.accProb) >= 50;

  return (
    <div className="card overflow-hidden">
      <header className="border-b border-line px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Target className="h-4 w-4 text-brand" />
          결과
        </h2>
      </header>

      <div className="space-y-4 p-4">
        {/* 방컷 요약 */}
        <div
          className={`rounded-2xl border px-4 py-3 ${
            median ? 'border-brand/30 bg-brand/10' : 'border-crit/30 bg-crit/10'
          }`}
        >
          {median ? (
            <>
              <div className="flex items-end justify-between gap-2">
                <span className="text-3xl font-extrabold tabular-nums leading-none text-brand">
                  {median.hit}방컷
                </span>
                <span className="text-right">
                  <span className="block text-lg font-bold tabular-nums text-brand">
                    {median.accProb}%
                  </span>
                  <span className="block text-[0.7rem] text-muted">누적</span>
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {medianIsHalf
                  ? '누적 확률이 처음 50%를 넘는 방수'
                  : '20방 안에서는 여기까지가 최대'}
              </p>
            </>
          ) : (
            <>
              <span className="block text-2xl font-extrabold leading-none text-crit">
                20방 초과
              </span>
              <p className="mt-1.5 text-xs text-muted">
                20방 안에 잡히지 않는다
              </p>
            </>
          )}
        </div>

        {/* 총 데미지 범위 */}
        <div className="flex items-baseline justify-between gap-2 rounded-xl border border-line px-3 py-2.5">
          <span className="whitespace-nowrap text-xs font-medium text-muted">
            총 데미지 범위
          </span>
          <span className="text-right">
            <span className="block text-base font-bold tabular-nums text-ink">
              {fmt(result.totalDamageRange.min)} ~{' '}
              {fmt(result.totalDamageRange.max)}
            </span>
            <span className="block text-[0.7rem] tabular-nums text-muted">
              기댓값 {fmt(result.totalDamageRange.expected ?? 0)}
            </span>
          </span>
        </div>

        <div className="space-y-2">
          <StatLine
            label="기본"
            range={result.basic}
            addon={shadowActive ? result.shadowBasic : null}
          />
          <StatLine
            label="크리티컬"
            icon={<Zap className="h-3.5 w-3.5" />}
            tone="crit"
            range={result.critical}
            addon={shadowActive ? result.shadowCritical : null}
          />
          <StatLine label="스탯 공격력" range={result.statAttack} />
          {result.venomApplied && result.venomTickDamage && (
            <StatLine
              label="베놈 틱 (1중첩)"
              icon={<Droplet className="h-3.5 w-3.5" />}
              tone="venom"
              range={result.venomTickDamage}
              note="1초마다 1틱, 중첩되면 합산되어 들어간다. 몹 방어력과 크리티컬의 영향을 받지 않고, 이 데미지만으로는 몬스터를 잡을 수 없다"
            />
          )}
          {skills.type === 'drain' && (
            <StatLine
              label="HP 흡수량"
              icon={<HeartPulse className="h-3.5 w-3.5" />}
              range={result.hpAbsorption}
            />
          )}
        </div>

        <div className="space-y-2 border-t border-line pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            방컷 확률
          </h3>
          <KillProbabilityChart killProbabilities={result.killProbabilities} />
        </div>
      </div>
    </div>
  );
}

import { ReactNode } from 'react';
import { Droplet, HeartPulse, Target, Zap } from 'lucide-react';
import {
  DamageRange,
  DamageResult,
  Monster,
  Skills,
  Stats,
} from '../../types/calculator';
import { HEADLINE_KILL_THRESHOLD } from '../../constants/calculator';
import { findHeadlineKill } from '../../utils/calculatorUtils';
import KillProbabilityChart from './KillProbabilityChart';
import HitProbabilityNotice from './HitProbabilityNotice';
import AvoidProbabilities from './AvoidProbabilities';
import HitDamage from './HitDamage';

interface ResultsPanelProps {
  result: DamageResult;
  monster: Monster;
  stats: Stats;
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

export default function ResultsPanel({
  result,
  monster,
  stats,
  skills,
}: ResultsPanelProps) {
  const shadowActive = skills.shadowPartnerEnabled && skills.shadowPartner > 0;

  // 사람들이 실제로 알고 싶어 하는 "몇 방컷이냐"를 크게 띄운다. 기준은 findHeadlineKill 참고.
  const { entry: headline, reliable } = findHeadlineKill(
    result.killProbabilities
  );

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
            headline
              ? 'border-brand/30 bg-brand/10'
              : 'border-crit/30 bg-crit/10'
          }`}
        >
          {headline ? (
            <>
              <div className="flex items-end justify-between gap-2">
                <span className="text-3xl font-extrabold tabular-nums leading-none text-brand">
                  {headline.hit}방컷
                </span>
                <span className="text-right">
                  <span className="block text-lg font-bold tabular-nums text-brand">
                    {headline.accProb}%
                  </span>
                  <span className="block text-[0.7rem] text-muted">누적</span>
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {reliable
                  ? `누적 확률이 처음 ${HEADLINE_KILL_THRESHOLD}%를 넘는 방수`
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

        {/*
          방컷 확률은 이 계산기가 존재하는 이유라 요약 바로 아래에 둔다.
          데미지 값들보다 먼저 나와야 스크롤 없이 읽힌다.
        */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            방컷 확률
          </h3>
          <KillProbabilityChart killProbabilities={result.killProbabilities} />
          {/* 타격 확률이 100%에 못 미칠 때만 뜬다. 위 막대가 그만큼 내려간 이유다. */}
          <HitProbabilityNotice monster={monster} stats={stats} />
        </div>

        {/* 여기부터 데미지 값들. 구분자로 방컷 확률과 성격을 갈라 준다. */}
        <div className="space-y-4 border-t border-line pt-4">
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
        </div>

        {/*
          몹이 나를 때리는 쪽. 흘릴 확률과 흘리지 못했을 때의 데미지는 한 질문의
          앞뒤라서 붙여 둔다.
        */}
        <div className="space-y-4 border-t border-line pt-4">
          <AvoidProbabilities monster={monster} stats={stats} skills={skills} />
          <HitDamage monster={monster} stats={stats} />
        </div>
      </div>
    </div>
  );
}

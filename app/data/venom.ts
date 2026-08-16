import { AttackSkillType } from '../types/calculator';

/**
 * 베놈(나이트로드 4차) 스킬 데이터.
 *
 * 수치는 원작 Skill.wz의 412.img(나이트로드) / 422.img(섀도어) 값과 같다.
 * 두 직업의 mad / prop / time이 레벨별로 완전히 동일해서 하나의 표로 처리한다.
 */

export const VENOM_MAX_LEVEL = 30;

export interface VenomLevelData {
  /** 스킬 공격력. WZ의 mad(magic damage) 필드다. */
  mad: number;
  /** 타격 1회당 중독 성공 확률 (%) */
  prop: number;
  /** 중독 지속 시간 (초). 1초마다 1틱이므로 곧 최대 틱 수이기도 하다. */
  durationSeconds: number;
}

/**
 * 레벨별 베놈 수치. WZ 표가 규칙적이라 닫힌 식으로 적는다.
 * lv1 = mad 31 / prop 12 / 2초, lv30 = mad 60 / prop 30 / 4초.
 */
export const getVenomLevelData = (level: number): VenomLevelData | null => {
  if (!Number.isInteger(level) || level < 1 || level > VENOM_MAX_LEVEL) {
    return null;
  }
  return {
    mad: 30 + level,
    prop: 12 + 2 * Math.floor((level - 1) / 3),
    durationSeconds: 2 + Math.floor((level - 1) / 10),
  };
};

/**
 * 베놈이 발동하지 않는 공격 스킬.
 *
 * 원작 서버는 나이트로드가 표창을 든 상태의 모든 공격에 베놈을 굴리되
 * 드레인 / 쉐도우 메소 / 도발 / 닌자 스톰만 제외한다. 이 계산기가 다루는
 * 공격 스킬 중에서는 드레인만 해당된다.
 */
export const VENOM_EXCLUDED_SKILLS: AttackSkillType[] = ['drain'];

/** 몬스터 도트 데미지 클럭 주기 (초) */
export const VENOM_TICK_INTERVAL_SECONDS = 1;

/**
 * 베놈을 걸 때 만료 시각에만 얹히는 지연 (초).
 *
 * 유출 코드에서 만료 시각은 `tVenom_ = tCur + tDelay + 1000 * 지속시간`인데
 * 틱 클럭의 기준점 `m_tLastUpdateVenom`에는 `tCur`만 들어간다. 그리고
 * `LifePool::ApplyUserAttack`이 베놈을 걸 때 `tDelay = 1000`을 넘긴다.
 *
 * 결과적으로 틱은 `floor((tDelay + 지속시간 * 1000) / 1000) = 지속시간 + 1`회 들어간다.
 * 만렙(지속시간 4초)이면 5틱이다. 실측에서 틱이 4~5회로 보이던 것과 맞는다.
 */
export const VENOM_APPLY_DELAY_SECONDS = 1;

/**
 * 틱 1회에 들어갈 수 있는 최대 도트 데미지.
 *
 * 원작 유출 코드에는 이런 상한이 없다. nVenom_은 int이고 중첩 누적에 제한이 없다.
 * 메이플랜드 실측에서 30000을 넘는 도트 데미지가 들어가지 않는 것이 확인돼
 * 메이플랜드 고유 사양으로 보고 반영한다.
 *
 * 중첩 판정(기존 <= 신규 * 2)에는 상한을 적용하지 않는다.
 * 상한이 내부 누적값까지 자르는지 실제로 들어가는 데미지만 자르는지는
 * 확인되지 않았고, 후자가 더 자연스러운 구현이라 그쪽으로 뒀다.
 */
export const VENOM_TICK_DAMAGE_CAP = 30000;

/** 기본 공격 속도 (분당 공격 횟수). 트리플 스로우 기준값이다. */
export const DEFAULT_ATTACKS_PER_MINUTE = 100;

/**
 * 베놈 누적 스택을 몇 단계로 양자화할지.
 *
 * 이 값이 베놈 계산의 유일한 근사 파라미터다. 키우면 정확해지지만
 * 계산량이 세제곱으로 는다(전이행렬 제곱 x 누적 데미지 축).
 * 96단계에서 몬테카를로 400만 회 대비 최대 오차 0.06%p를 실측했다.
 */
export const VENOM_STACK_LEVELS = 96;

/**
 * 몬스터의 독 속성값(WZ elemAttr의 S 항목) 중 베놈이 걸리지 않는 값.
 * 1 = 무효, 2 = 반감. 3(약점)은 정상적으로 걸리며 데미지 증폭은 없다.
 */
export const POISON_BLOCKING_ATTRIBUTES = [1, 2];

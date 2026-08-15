import {
  getVenomLevelData,
  VENOM_STACK_LEVELS,
  VENOM_TICK_DAMAGE_CAP,
  VENOM_TICK_INTERVAL_SECONDS,
} from '../data/venom';

/**
 * 베놈 도트 데미지 계산.
 *
 * 베놈은 데미지 라인이 아니라 몬스터 스탯을 바꿔 HP를 직접 깎는 스킬이라
 * 몹 방어력 / 레벨 차이 / 크리티컬 / 스킬 데미지%의 영향을 전혀 받지 않는다.
 * 대신 "누적 스택"이라는 상태를 들고 다녀서 틱마다 데미지가 상관된다.
 *
 * 그래서 공격 데미지처럼 iid 합으로 볼 수 없고 별도의 마르코프 DP가 필요하다.
 * 다만 베놈이 굴리는 난수(발동 판정, 데미지 롤)는 공격 데미지 난수와 완전히
 * 독립이라, 누적 베놈 데미지 W의 분포만 따로 구해 두면 기존 FFT 파이프라인에는
 * 손대지 않고 마지막에 합류시킬 수 있다.
 */

/** 부동소수점 시각 비교 오차 */
const TIME_EPSILON = 1e-9;

export interface VenomConfig {
  /** 베놈 스킬 레벨 (1~30) */
  level: number;
  /** 장비/버프까지 반영한 최종 STR */
  totalStr: number;
  /** 장비/버프까지 반영한 최종 DEX */
  totalDex: number;
  /** 장비/버프까지 반영한 최종 LUK */
  totalLuk: number;
  /** 스킬 1회당 베놈 발동 판정 횟수 (쉐도우 파트너 타격 포함) */
  rollsPerUse: number;
  /** 공격 1회 주기 (초) */
  attackPeriodSeconds: number;
}

/**
 * 베놈 틱 1회의 데미지 범위 (축소 전 원본 값, 1중첩 기준).
 *
 * 유출 코드 기준 정수 연산:
 *   v42 = floor(0.8 * (STR + LUK)) + rand(0, STR + LUK - 1)
 *   데미지 = floor(mad * (DEX + 5 * v42) / 49)
 *
 * 실제로 들어가는 데미지는 메이플랜드 상한에서 잘리므로 표시용도 잘라 준다.
 */
export const calculateVenomTickDamage = (
  config: VenomConfig
): { min: number; max: number } | null => {
  const data = getVenomLevelData(config.level);
  if (!data) return null;

  const statSum = config.totalStr + config.totalLuk;
  if (statSum <= 0) return null;

  const base = Math.floor(statSum * 0.8);
  const damageAt = (roll: number) =>
    Math.min(
      VENOM_TICK_DAMAGE_CAP,
      Math.floor((data.mad * (config.totalDex + 5 * (base + roll))) / 49)
    );

  return { min: damageAt(0), max: damageAt(statSum - 1) };
};

/**
 * "N번째 공격이 들어가기 직전까지 누적된 베놈 데미지"의 생존함수를 N마다 구한다.
 *
 * 반환값 survivals[n - 1][t] = P(W_n >= t). 인덱스 t는 축소 후 HP 축을 쓴다.
 *
 * 타임라인 가정:
 * - 공격 k는 (k - 1) * 공격주기 시각에 일어난다.
 * - 몹 도트 클럭은 위상 0으로 자유진행해서 0, 1, 2, ... 초에 틱이 발생한다.
 * - 같은 시각에 겹치면 공격(= 베놈 부여)이 먼저, 틱이 나중이다.
 * - 한 번 부여된 베놈은 지속시간(초)과 같은 개수의 틱을 받고 만료된다.
 */
export const calculateVenomSurvivals = (
  config: VenomConfig,
  monsterHp: number,
  damageScale: number,
  maxUses: number
): Float64Array[] | null => {
  const data = getVenomLevelData(config.level);
  if (!data || config.rollsPerUse <= 0 || monsterHp <= 0) return null;

  const statSum = config.totalStr + config.totalLuk;
  if (statSum <= 0) return null;

  const base = Math.floor(statSum * 0.8);
  /** 롤 인덱스 -> 축소까지 적용한 정수 틱 데미지 */
  const damageAt = (roll: number) =>
    Math.round(
      Math.floor((data.mad * (config.totalDex + 5 * (base + roll))) / 49) *
        damageScale
    );

  const maxTickDamage = damageAt(statSum - 1);
  if (maxTickDamage <= 0) return null;

  // 게이트가 "기존 누적 <= 신규 * 2"라서 누적 스택은 신규 롤의 3배를 넘지 못한다.
  // 덕분에 상태 공간이 유한하다.
  const maxStack = 3 * maxTickDamage;
  const unit = Math.max(1, Math.ceil(maxStack / VENOM_STACK_LEVELS));
  const stackBins = Math.floor(maxStack / unit) + 1;

  // 틱당 데미지 상한. 중첩 판정에는 쓰지 않고 실제로 들어가는 데미지만 자른다.
  const tickCap = Math.min(
    stackBins - 1,
    Math.round((VENOM_TICK_DAMAGE_CAP * damageScale) / unit)
  );

  // 1. 중첩 게이트 a <= 2v를 통과하는 롤을 스택 칸마다 정리해 둔다.
  //
  //    게이트 판정은 반드시 양자화 전의 정확한 롤 값으로 해야 한다.
  //    양자화한 값으로 판정하면 "올림된 롤이 게이트를 더 잘 통과"하는 상관이 생겨
  //    중첩 데미지가 계통적으로 부풀어 오른다(실측 +0.4%).
  //
  //    damageAt은 롤 인덱스에 대해 단조 증가하므로 통과 구간은 항상 뒤쪽 구간이다.
  const gateStart = new Int32Array(stackBins);
  {
    let roll = 0;
    for (let stack = 0; stack < stackBins; stack++) {
      const required = stack * unit;
      while (roll < statSum && 2 * damageAt(roll) < required) roll++;
      gateStart[stack] = roll;
    }
  }

  //    통과한 롤들을 양자화 칸에 비례 배분해 모아 둔다(정규화하지 않은 도수).
  //    뒤쪽 구간이라 롤을 큰 인덱스부터 누적하면 한 번의 스캔으로 전부 만들어진다.
  const acceptedDist: Float64Array[] = new Array(stackBins);
  {
    const accumulated = new Float64Array(stackBins);
    let stack = stackBins - 1;
    while (stack >= 0 && gateStart[stack] >= statSum) {
      acceptedDist[stack] = new Float64Array(stackBins);
      stack--;
    }
    for (let roll = statSum - 1; roll >= 0 && stack >= 0; roll--) {
      const exact = damageAt(roll) / unit;
      const lower = Math.floor(exact);
      const frac = exact - lower;
      accumulated[Math.min(lower, stackBins - 1)] += 1 - frac;
      if (frac > 0) {
        accumulated[Math.min(lower + 1, stackBins - 1)] += frac;
      }
      while (stack >= 0 && gateStart[stack] === roll) {
        acceptedDist[stack] = accumulated.slice();
        stack--;
      }
    }
    while (stack >= 0) {
      acceptedDist[stack] = accumulated.slice();
      stack--;
    }
  }

  // 2. 공격 1회(= 판정 rollsPerUse번)에 대한 스택 전이행렬을 미리 만든다.
  //    transition[from * stackBins + to]
  const propChance = data.prop / 100;
  const applyOneRoll = (dist: Float64Array): Float64Array => {
    const out = new Float64Array(stackBins);
    for (let from = 0; from < stackBins; from++) {
      const mass = dist[from];
      if (mass === 0) continue;
      const accepted = acceptedDist[from];
      const passChance = (statSum - gateStart[from]) / statSum;
      out[from] += mass * (1 - propChance * passChance);
      const scale = (mass * propChance) / statSum;
      for (let v = 0; v < stackBins; v++) {
        const weight = accepted[v];
        if (weight === 0) continue;
        out[Math.min(from + v, stackBins - 1)] += scale * weight;
      }
    }
    return out;
  };

  const transition = new Float64Array(stackBins * stackBins);
  for (let from = 0; from < stackBins; from++) {
    let dist: Float64Array = new Float64Array(stackBins);
    dist[from] = 1;
    for (let i = 0; i < config.rollsPerUse; i++) {
      dist = applyOneRoll(dist);
    }
    transition.set(dist, from * stackBins);
  }

  // 3. (남은 틱 수, 누적 스택, 누적 베놈 데미지) 결합분포를 시간순으로 굴린다.
  const duration = data.durationSeconds;
  const planes = duration + 1;
  // 누적 베놈 데미지는 HP를 넘겨 봐야 쓸모가 없고(그 위는 전부 "HP를 채웠다"),
  // 틱 수 x 최대 스택도 넘을 수 없다. 둘 중 작은 쪽으로 축을 잘라 계산량을 줄인다.
  const totalTicks =
    Math.floor(
      ((maxUses - 1) * config.attackPeriodSeconds) / VENOM_TICK_INTERVAL_SECONDS
    ) + 1;
  const wBins =
    Math.min(Math.ceil(monsterHp / unit), totalTicks * Math.max(1, tickCap)) +
    1;
  const planeSize = stackBins * wBins;
  const index = (remaining: number, stack: number, damage: number) =>
    remaining * planeSize + stack * wBins + damage;

  let joint = new Float64Array(planes * planeSize);
  joint[index(0, 0, 0)] = 1;

  /** 틱 1회: 남은 틱이 있는 상태만 현재 스택만큼 누적하고 남은 틱을 줄인다. */
  const applyTick = () => {
    const next = new Float64Array(joint.length);
    for (let stack = 0; stack < stackBins; stack++) {
      for (let damage = 0; damage < wBins; damage++) {
        next[index(0, stack, damage)] += joint[index(0, stack, damage)];
      }
    }
    for (let remaining = 1; remaining <= duration; remaining++) {
      const nextRemaining = remaining - 1;
      for (let stack = 0; stack < stackBins; stack++) {
        // 만료되면 스택도 함께 0으로 돌아간다.
        const nextStack = nextRemaining === 0 ? 0 : stack;
        const emitted = Math.min(stack, tickCap);
        for (let damage = 0; damage < wBins; damage++) {
          const mass = joint[index(remaining, stack, damage)];
          if (mass === 0) continue;
          const nextDamage = Math.min(damage + emitted, wBins - 1);
          next[index(nextRemaining, nextStack, nextDamage)] += mass;
        }
      }
    }
    joint = next;
  };

  /**
   * 공격 1회: 중첩에 성공하면 지속시간이 갱신되고, 실패하면 아무것도 바뀌지 않는다.
   * 성공했을 때의 도착 상태는 남은 틱 수와 무관하게 항상 duration이므로,
   * 남은 틱 축을 먼저 합쳐 두면 전이 비용을 평면 수만큼 아낄 수 있다.
   */
  const applyAttack = () => {
    const next = new Float64Array(joint.length);
    const merged = new Float64Array(planeSize);
    for (let remaining = 0; remaining <= duration; remaining++) {
      for (let stack = 0; stack < stackBins; stack++) {
        const stay = transition[stack * stackBins + stack];
        for (let damage = 0; damage < wBins; damage++) {
          const mass = joint[index(remaining, stack, damage)];
          if (mass === 0) continue;
          next[index(remaining, stack, damage)] += mass * stay;
          merged[stack * wBins + damage] += mass;
        }
      }
    }
    for (let from = 0; from < stackBins; from++) {
      const row = from * stackBins;
      for (let to = from + 1; to < stackBins; to++) {
        const weight = transition[row + to];
        if (weight === 0) continue;
        for (let damage = 0; damage < wBins; damage++) {
          const mass = merged[from * wBins + damage];
          if (mass === 0) continue;
          next[index(duration, to, damage)] += mass * weight;
        }
      }
    }
    joint = next;
  };

  /** 현재 결합분포에서 누적 베놈 데미지의 생존함수를 뽑는다. */
  const buildSurvival = (): Float64Array => {
    const damageDist = new Float64Array(wBins);
    for (let remaining = 0; remaining <= duration; remaining++) {
      for (let stack = 0; stack < stackBins; stack++) {
        const offset = index(remaining, stack, 0);
        for (let damage = 0; damage < wBins; damage++) {
          damageDist[damage] += joint[offset + damage];
        }
      }
    }
    const survival = new Float64Array(monsterHp + 1);
    let accumulated = 0;
    let bin = wBins - 1;
    for (let threshold = monsterHp; threshold >= 0; threshold--) {
      while (bin >= 0 && bin * unit >= threshold) {
        accumulated += damageDist[bin];
        bin--;
      }
      survival[threshold] = accumulated;
    }
    return survival;
  };

  const survivals: Float64Array[] = [];
  let nextTickTime = 0;
  for (let use = 1; use <= maxUses; use++) {
    const attackTime = (use - 1) * config.attackPeriodSeconds;
    // 공격보다 앞선 틱을 먼저 소화한다. 같은 시각의 틱은 공격 뒤라 여기서 제외된다.
    while (nextTickTime < attackTime - TIME_EPSILON) {
      applyTick();
      nextTickTime += VENOM_TICK_INTERVAL_SECONDS;
    }
    survivals.push(buildSurvival());
    applyAttack();
    if (Math.abs(nextTickTime - attackTime) < TIME_EPSILON) {
      applyTick();
      nextTickTime += VENOM_TICK_INTERVAL_SECONDS;
    }
  }
  return survivals;
};

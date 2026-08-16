/**
 * 방컷 확률 검증용 참조 구현.
 *
 * 배포 코드(FFT 컨볼루션 + 사다리꼴 CDF 닫힌 식)와 독립적으로 작성한
 * O(n^2) DP와 몬테카를로 시뮬레이션.
 *
 * 라인 데미지 모델은 원작 그대로다.
 *   라인 = trunc(clamp(1, 199999, 스탯롤 - 방어롤))
 *   스탯롤 ~ U 폭 alpha,  방어롤 ~ U 폭 beta(defenseBand),  둘은 독립
 * DP는 방어 롤 축을 수치적분하고 몬테카를로는 두 난수를 직접 굴린다.
 * 배포 코드의 닫힌 식과는 유도 경로가 달라 서로 검산이 된다.
 */

/**
 * 스킬% 적용 전(방어 감산 후) 지지구간과, 그 안에서 방어력 난수가 차지하는 폭.
 * 배율을 생략하면 라인 = trunc(d)라 min/max를 최종 데미지 범위로 줘도 된다.
 */
export interface DamageRange {
  min: number;
  max: number;
  defenseBand?: number;
  /** 스킬 데미지 배율 */
  skillMultiplier?: number;
  /** 크리티컬 가산 배율 (critParam - 100) / 100 */
  criticalAdd?: number;
}

export interface KillScenario {
  /** 몬스터 HP */
  hp: number;
  /** 스킬 1회당 타격 수 (럭키 세븐 2, 트리플 스로우 3, 그 외 1) */
  hits: number;
  /** 일반 데미지 범위 */
  basic: DamageRange;
  /** 크리티컬 데미지 범위 */
  crit: DamageRange;
  /** 쉐도우 파트너 비율 (만렙 0.5) */
  shadow: number;
  /** 크리티컬 확률 0~1 */
  critChance: number;
  /** 명중 확률 0~1 */
  hitProb: number;
  /** 최대 스킬 시전 횟수 */
  maxUses?: number;
  /**
   * 난수 순환(원작이 공격 1회당 난수 7칸을 돌려 쓰는 것)을 반영할지.
   * 3타에서만 의미가 있고, 한 라인의 스탯 롤이 다른 라인의 크리티컬을 결정한다.
   */
  rngCycling?: boolean;
}

const LINE_MIN = 1;
const LINE_MAX = 199999;

/** 스탯 롤 폭. 지지구간에서 방어력 난수 폭을 뺀 나머지다. */
export const statSpanOf = (range: DamageRange): number =>
  Math.max(0, range.max - range.min - Math.max(0, range.defenseBand ?? 0));

const clampLine = (damage: number): number =>
  Math.max(LINE_MIN, Math.min(LINE_MAX, damage));

/**
 * 쉐도우 파트너 타격. 본체의 확정 정수 데미지를 그대로 따라가되
 * 독립된 데미지 라인이라 [1, 199999] 클램프를 똑같이 받는다.
 */
export const partnerLine = (damage: number, shadow: number): number =>
  shadow > 0 ? clampLine(Math.floor(damage * shadow)) : 0;

/**
 * 라인 데미지 한 값. 원작은 크리티컬 가산항에 스킬% 적용 전 값을 정수화해서 쓴다.
 *   damage = trunc(skill * d + criticalAdd * trunc(d))
 */
export const lineValueOf = (range: DamageRange, base: number): number =>
  Math.trunc(
    (range.skillMultiplier ?? 1) * base +
      (range.criticalAdd ?? 0) * Math.trunc(base)
  );

/** 타격 1회의 데미지 분포. 인덱스는 누적 데미지, hp 인덱스는 사망(흡수 상태). */
const singleHitDistribution = (s: KillScenario): number[] => {
  const dist = new Array(s.hp + 1).fill(0);
  dist[0] += 1 - s.hitProb;

  const add = (damage: number, weight: number): void => {
    if (weight <= 0) return;
    dist[Math.min(damage + partnerLine(damage, s.shadow), s.hp)] +=
      weight * s.hitProb;
  };

  /**
   * d가 U[lo, lo + width]일 때 라인 데미지를 정수 눈금에 담는다.
   * d의 정수 구간마다 trunc(d)가 상수라 그 안에서는 기울기 skill인 직선이다.
   */
  const addUniform = (
    range: DamageRange,
    lo: number,
    width: number,
    weight: number
  ): void => {
    if (width <= 0) {
      add(clampLine(lineValueOf(range, lo)), weight);
      return;
    }
    const skill = range.skillMultiplier ?? 1;
    const critAdd = range.criticalAdd ?? 0;
    const hi = lo + width;
    const step = Math.max(skill + critAdd, 1e-9);

    // 음수 구간은 전부 하한으로 눌린다. 위쪽도 마찬가지라 미리 잘라 둔다.
    const first = Math.max(Math.floor(lo), 0);
    const last = Math.min(Math.floor(hi), Math.floor(LINE_MAX / step) + 1);
    if (lo < first)
      add(LINE_MIN, ((Math.min(hi, first) - lo) / width) * weight);
    if (hi > last + 1) {
      add(LINE_MAX, ((hi - Math.max(lo, last + 1)) / width) * weight);
    }

    for (let bucket = first; bucket <= last; bucket++) {
      const a = Math.max(lo, bucket);
      const b = Math.min(hi, bucket + 1);
      if (b <= a) continue;
      const offset = critAdd * bucket;
      const from = Math.floor(skill * a + offset);
      const to = Math.floor(skill * b + offset);
      for (let value = from; value <= to; value++) {
        const dFrom = Math.max(a, (value - offset) / skill);
        const dTo = Math.min(b, (value + 1 - offset) / skill);
        if (dTo <= dFrom) continue;
        add(clampLine(value), ((dTo - dFrom) / width) * weight);
      }
    }
  };

  const addRange = (range: DamageRange, weight: number): void => {
    const beta = Math.max(0, range.defenseBand ?? 0);
    const alpha = statSpanOf(range);
    // 방어 롤 축을 중점법으로 적분한다. 칸 안에서 적분값이 선형이라
    // 눈금을 폭보다 촘촘히 잡으면 오차가 사실상 사라진다.
    const steps = beta > 0 ? Math.max(512, Math.ceil(beta) * 32) : 1;
    for (let i = 0; i < steps; i++) {
      const offset = beta > 0 ? ((i + 0.5) / steps) * beta : 0;
      addUniform(range, range.min + offset, alpha, weight / steps);
    }
  };

  addRange(s.basic, 1 - s.critChance);
  addRange(s.crit, s.critChance);
  return dist;
};

/** 순진한 O(n^2) 컨볼루션. hp를 넘는 누적 데미지는 hp로 몰아넣는다. */
const convolve = (a: number[], b: number[], hp: number): number[] => {
  const out = new Array(hp + 1).fill(0);
  for (let i = 0; i <= hp; i++) {
    if (a[i] === 0) continue;
    for (let j = 0; j <= hp; j++) {
      if (b[j] === 0) continue;
      out[Math.min(i + j, hp)] += a[i] * b[j];
    }
  }
  return out;
};

/** N회 시전 안에 잡을 누적 확률 배열 (0-indexed: [0]이 1방컷) */
export const referenceKillProbabilities = (s: KillScenario): number[] => {
  const maxUses = s.maxUses ?? 20;
  const singleHit = singleHitDistribution(s);

  let perUse = singleHit;
  for (let i = 1; i < s.hits; i++) {
    perUse = convolve(perUse, singleHit, s.hp);
  }

  const accumulated: number[] = [];
  let current = perUse;
  accumulated.push(current[s.hp]);
  while (accumulated.length < maxUses) {
    current = convolve(current, perUse, s.hp);
    accumulated.push(current[s.hp]);
  }
  return accumulated;
};

/** 재현 가능한 난수 생성기 (mulberry32) */
export const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** 게임 진행을 그대로 흉내 내는 몬테카를로 시뮬레이션 */
export const simulateKillProbabilities = (
  s: KillScenario,
  trials: number,
  seed: number
): number[] => {
  const maxUses = s.maxUses ?? 20;
  const random = createRandom(seed);
  const counts = new Array(maxUses).fill(0);

  /**
   * 스탯 롤 u와 방어 롤 v로 라인 하나의 데미지(파트너 포함)를 만든다.
   * u에 대해 단조 증가라 난수 순환 결합을 그대로 태울 수 있다.
   */
  const lineDamage = (crit: boolean, u: number, v: number): number => {
    const range = crit ? s.crit : s.basic;
    const beta = Math.max(0, range.defenseBand ?? 0);
    const base = range.min + u * statSpanOf(range) + v * beta;
    const damage = clampLine(lineValueOf(range, base));
    return damage + partnerLine(damage, s.shadow);
  };

  const coupled = s.rngCycling === true && s.hits === 3;

  for (let trial = 0; trial < trials; trial++) {
    let accumulated = 0;
    for (let use = 0; use < maxUses; use++) {
      if (coupled) {
        // 라인 B의 스탯 롤이 라인 C의 크리티컬 판정을 그대로 결정한다.
        const aHit = random() < s.hitProb;
        const aCrit = random() < s.critChance;
        const aU = random();
        const aV = random();
        const bHit = random() < s.hitProb;
        const bCrit = random() < s.critChance;
        const bU = random();
        const bV = random();
        const cHit = random() < s.hitProb;
        const cU = random();
        const cV = random();
        if (aHit) accumulated += lineDamage(aCrit, aU, aV);
        if (bHit) accumulated += lineDamage(bCrit, bU, bV);
        if (cHit) accumulated += lineDamage(bU < s.critChance, cU, cV);
      } else {
        for (let hit = 0; hit < s.hits; hit++) {
          if (random() >= s.hitProb) continue;
          accumulated += lineDamage(
            random() < s.critChance,
            random(),
            random()
          );
        }
      }
      if (accumulated >= s.hp) {
        counts[use]++;
        break;
      }
    }
  }

  const result: number[] = [];
  let running = 0;
  for (let i = 0; i < maxUses; i++) {
    running += counts[i];
    result.push(running / trials);
  }
  return result;
};

export interface VenomScenario {
  /** 베놈 스킬 공격력 (mad) */
  mad: number;
  /** 타격 1회당 중독 성공 확률 0~1 */
  prop: number;
  /**
   * 부여 1회당 들어가는 틱 수.
   *
   * 만료 시각에는 tDelay(1초)가 얹히는데 틱 클럭의 기준점에는 얹히지 않아
   * 지속시간보다 한 틱을 더 받는다. 만렙(지속시간 4초)이면 5다.
   */
  ticksPerApply: number;
  /** STR + LUK */
  statSum: number;
  /** DEX */
  dex: number;
  /** 스킬 1회당 베놈 판정 횟수 (쉐도우 파트너 포함) */
  rollsPerUse: number;
  /** 공격 1회 주기 (초) */
  attackPeriodSeconds: number;
  /** 틱 1회에 들어갈 수 있는 최대 도트 데미지 */
  tickDamageCap: number;
}

/**
 * 베놈까지 포함한 몬테카를로.
 *
 * 유출 코드의 동작을 그대로 흉내 낸다.
 * - 타격마다 prop 확률로 중독 판정
 * - 기존 누적 <= 신규 * 2 일 때만 합연산으로 중첩되고 지속시간이 갱신된다
 * - 도트 클럭은 중첩에 성공한 시각에 고정되고, 거기서 1초 간격으로 ticksPerApply번 들어간다
 *   (중첩에 성공할 때마다 타이머가 초기화된다)
 * - 틱 1회에 들어가는 데미지는 상한에서 잘린다 (중첩 판정에는 상한을 쓰지 않는다)
 * - 도트 데미지는 몬스터 HP를 1 미만으로 내리지 못한다
 */
export const simulateKillProbabilitiesWithVenom = (
  s: KillScenario,
  venom: VenomScenario,
  trials: number,
  seed: number
): number[] => {
  const maxUses = s.maxUses ?? 20;
  const random = createRandom(seed);
  const counts = new Array(maxUses).fill(0);
  const epsilon = 1e-9;

  const venomBase = Math.floor(venom.statSum * 0.8);
  const venomDamage = (roll: number) =>
    Math.floor((venom.mad * (venom.dex + 5 * (venomBase + roll))) / 49);

  for (let trial = 0; trial < trials; trial++) {
    let hp = s.hp;
    let stack = 0;
    let remaining = 0;
    let nextTick = Infinity;

    for (let use = 0; use < maxUses; use++) {
      const attackTime = use * venom.attackPeriodSeconds;

      let dealt = 0;
      for (let hit = 0; hit < s.hits; hit++) {
        if (random() >= s.hitProb) continue;
        const range = random() < s.critChance ? s.crit : s.basic;
        const damage =
          range.min + Math.floor(random() * (range.max - range.min + 1));
        dealt += damage + Math.floor(damage * s.shadow);
      }
      hp -= dealt;
      if (hp <= 0) {
        counts[use]++;
        break;
      }

      for (let roll = 0; roll < venom.rollsPerUse; roll++) {
        if (random() >= venom.prop) continue;
        const value = venomDamage(Math.floor(random() * venom.statSum));
        if (stack <= 2 * value) {
          stack += value;
          // 중첩에 성공하면 틱 타이머가 이 시각으로 초기화된다
          remaining = venom.ticksPerApply;
          nextTick = attackTime + 1;
        }
      }

      // 다음 공격 전까지 들어가는 틱
      const nextAttackTime = attackTime + venom.attackPeriodSeconds;
      while (remaining > 0 && nextTick < nextAttackTime - epsilon) {
        hp = Math.max(1, hp - Math.min(stack, venom.tickDamageCap));
        remaining--;
        nextTick += 1;
      }
      if (remaining === 0) stack = 0;
    }
  }

  const result: number[] = [];
  let running = 0;
  for (let i = 0; i < maxUses; i++) {
    running += counts[i];
    result.push(running / trials);
  }
  return result;
};

/** 배포 코드가 돌려주는 결과를 누적 확률 배열(0~1)로 되돌린다. */
export const toAccumulatedProbabilities = (
  rows: { hit: number; prob: string; accProb: string }[],
  maxUses = 20
): (number | null)[] => {
  const accumulated: (number | null)[] = new Array(maxUses).fill(null);
  for (const row of rows) {
    accumulated[row.hit - 1] = Number(row.accProb) / 100;
  }
  return accumulated;
};

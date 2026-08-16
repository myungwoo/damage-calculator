import {
  Monster,
  Stats,
  Equipment,
  Skills,
  DamageResult,
  isLucky7Effect,
  isAvengerEffect,
  isDrainEffect,
  isJavelinEffect,
  isCriticalThrowEffect,
  isShadowPartnerEffect,
  isSharpEyesEffect,
  isTripleThrowEffect,
  AttackSkillType,
} from '../types/calculator';
import { getSkillEffect } from '../data/skillEffects';
import { throwingStars } from '../data/weapons';
import {
  fftForward,
  fftConvolveWithSpectrum,
  nextPowerOfTwo,
  Spectrum,
} from './fft';
import {
  VenomConfig,
  calculateVenomSurvivals,
  calculateVenomTickDamage,
} from './venom';
import {
  DEFAULT_ATTACKS_PER_MINUTE,
  POISON_BLOCKING_ATTRIBUTES,
  VENOM_EXCLUDED_SKILLS,
} from '../data/venom';

/**
 * 방컷 확률 계산에 쓰는 몬스터 HP 해상도 상한.
 * 이보다 HP가 크면 HP와 데미지를 같은 비율로 축소해 계산한다.
 *
 * 16383으로 잡으면 컨볼루션 결과 길이가 32767이라 FFT 길이가 32768로 떨어진다.
 * 16384부터는 FFT 길이가 65536으로 두 배가 되어 계산량도 두 배가 되므로,
 * 정확도 손실 없이 쓸 수 있는 가장 큰 값이다.
 */
export const MAX_HP_RESOLUTION = 16383;

/**
 * 데미지 라인 하나가 가질 수 있는 값의 범위.
 *
 * 원작은 타격마다 마지막에 `damage = max(1.0, min(99999.0, damage))`로 자른 뒤
 * 정수로 절삭한다. 상한만 메이플랜드에서 199999로 올라갔다.
 *
 * 하한은 쉐도우 파트너 타격에도 똑같이 걸린다. 방어력에 눌려 본체 데미지가 음수가
 * 되는 조합에서도 0이 아니라 1이 들어간다.
 */
export const MIN_DAMAGE_PER_LINE = 1;
export const MAX_DAMAGE_PER_LINE = 199999;

/** 데미지 라인 하나를 원작과 같은 순서(클램프 -> 절삭)로 정수화한다. */
const toDamageLine = (damage: number): number =>
  Math.floor(
    Math.max(MIN_DAMAGE_PER_LINE, Math.min(MAX_DAMAGE_PER_LINE, damage))
  );

/** 스킬 1회당 본체 타격 수 (럭키 세븐 2, 트리플 스로우 3, 그 외 1) */
export const getHitCount = (skillType: AttackSkillType): number =>
  skillType === 'tripleThrow' ? 3 : skillType === 'lucky7' ? 2 : 1;

export const calculateTotalStats = (
  stats: Stats
): { totalStr: number; totalDex: number; totalLuk: number } => {
  return {
    totalStr: stats.str + stats.additionalStr,
    totalDex: stats.dex + stats.additionalDex,
    totalLuk: stats.luk + stats.additionalLuk,
  };
};

export const calculateTotalAttack = (equipment: Equipment): number => {
  const selectedStar = throwingStars.find(
    (star) => star.id === equipment.selectedWeaponId
  );
  if (!selectedStar) {
    throw new Error('Invalid throwing star selected');
  }
  return (
    equipment.weaponAttack +
    selectedStar.attack +
    equipment.gloveAttack +
    equipment.otherAttack +
    equipment.buff
  );
};

export const calculatePureLuk = (
  level: number,
  str: number,
  dex: number
): number => {
  const totalPureStats =
    20 + level * 5 + (level >= 70 ? 5 : 0) + (level >= 120 ? 5 : 0);
  return Math.max(0, totalPureStats - str - dex - 4); // 4 = INT
};

export const calculateRequiredHitRatio = (
  monsterLevel: number,
  characterLevel: number,
  monsterAvoid: number
): number => {
  return (
    ((55 + Math.max(0, monsterLevel - characterLevel)) * monsterAvoid) / 15
  );
};

export const calculateHitProbability = (
  hitRatio: number | undefined,
  monsterLevel: number,
  characterLevel: number,
  monsterAvoid: number
): number => {
  const effectiveHitRatio = hitRatio ?? 999999;
  const requiredHitRatio = calculateRequiredHitRatio(
    monsterLevel,
    characterLevel,
    monsterAvoid
  );
  // 회피율이 0인 몬스터는 필요 명중률도 0이라 항상 명중한다.
  // (0으로 나누면 NaN이 확률 계산 전체로 번진다)
  if (requiredHitRatio <= 0) {
    return 1;
  }
  return Math.max(
    0,
    Math.min(1, (effectiveHitRatio * 2 - requiredHitRatio) / requiredHitRatio)
  );
};

const calculateStatAttack = (
  stats: Stats,
  totalAttack: number,
  masteryMultiplier: number
) => {
  const { totalLuk, totalDex, totalStr } = calculateTotalStats(stats);

  return {
    min:
      ((totalLuk * 3.6 * 0.9 * masteryMultiplier + totalDex + totalStr) *
        totalAttack) /
      100,
    max: ((totalLuk * 3.6 + totalDex + totalStr) * totalAttack) / 100,
  };
};

const calculateDamageWithModifiers = (
  statAttack: { min: number; max: number },
  skillDamageMultiplier: number,
  criticalMultiplier: number,
  stats: Stats,
  monster: Monster,
  skillType: AttackSkillType,
  totalAttack: number
) => {
  const levelDifference = Math.max(0, monster.level - stats.level);
  const levelMultiplier = 1 - 0.01 * levelDifference;
  const totalMultiplier = skillDamageMultiplier + criticalMultiplier - 1;

  const { totalLuk } = calculateTotalStats(stats);

  // 스킬별 데미지 계산
  let baseMax, baseMin;
  if (skillType === 'lucky7' || skillType === 'tripleThrow') {
    // 럭키 세븐과 트리플 스로우는 스탯 공격력(= 표창 숙련도, DEX, STR)의
    // 영향을 받지 않고 LUK만으로 데미지가 결정된다.
    // 따라서 최소/최대 비율이 자벨린 레벨과 무관하게 항상 1:2로 고정된다.
    baseMax = (totalLuk * 5 * totalAttack) / 100;
    baseMin = (totalLuk * 2.5 * totalAttack) / 100;
  } else {
    // 어벤져와 드레인은 스탯 공격력의 영향을 받음
    baseMax = statAttack.max;
    baseMin = statAttack.min;
  }

  const max =
    (baseMax * levelMultiplier - monster.physicalDefense * 0.5) *
    totalMultiplier;
  const min =
    (baseMin * levelMultiplier - monster.physicalDefense * 0.6) *
    totalMultiplier;

  return { min, max };
};

/**
 * N방 안에 몬스터를 잡을 확률을 구한다.
 *
 * "누적 데미지 -> 확률" 배열을 만들고, 몬스터 HP 이상인 누적 데미지를 전부
 * 인덱스 monsterHp(= 사망)로 몰아넣어 흡수 상태로 둔다. 이 분포를 스킬 시전
 * 횟수만큼 컨볼루션하면 dist[monsterHp]가 곧 "N방 안에 죽을 누적 확률"이 된다.
 *
 * 베놈을 켜면 여기에 누적 베놈 데미지 W가 더해진다. 베놈은 몬스터를 죽이지
 * 못하고 HP를 1에서 멈추게 하므로, 실제 사망 조건은
 *   "누적 공격 데미지 + 누적 베놈 데미지 >= HP" 이면서
 *   "HP를 넘긴 시점의 공격이 데미지를 1 이상 넣었을 것"
 * 이 된다. 뒤 조건은 명중률 100%면 항상 참이라 앞 조건만 보면 되고,
 * 명중률이 낮을 때의 오차는 (1 - 명중률)^타격수로 묶인다.
 *
 * 베놈이 굴리는 난수는 공격 데미지 난수와 완전히 독립이라, 누적 베놈 데미지의
 * 생존함수만 따로 구해 두면 공격 쪽 FFT 파이프라인은 그대로 두고 마지막에
 * 내적 한 번으로 합류시킬 수 있다.
 */
export const calculateKillProbabilitiesWithinNHits = (
  skillType: AttackSkillType,
  basicDamage: { min: number; max: number },
  criticalDamage: { min: number; max: number },
  shadowMultiplier: number,
  criticalChance: number,
  monsterHp: number,
  stats: Stats,
  monster: Monster,
  maxHits: number = 20,
  venomConfig: VenomConfig | null = null,
  rngCycling: boolean = false
) => {
  // 명중률 계산
  const hitProb = calculateHitProbability(
    stats.hitRatio,
    monster.level,
    stats.level,
    monster.avoid
  );

  // 몬스터의 체력이 너무 큰 경우 MAX_HP_RESOLUTION으로 변경
  // 비율에 맞춰서 데미지도 변경
  // 실수 부분 반올림에 따른 오차는 감안해야 함 (실측 최대 0.06%p)
  let damageScale = 1;
  if (monsterHp > MAX_HP_RESOLUTION) {
    const ratio = MAX_HP_RESOLUTION / monsterHp;
    damageScale = ratio;
    monsterHp = MAX_HP_RESOLUTION;
    basicDamage = {
      min: Math.round(basicDamage.min * ratio),
      max: Math.round(basicDamage.max * ratio),
    };
    criticalDamage = {
      min: Math.round(criticalDamage.min * ratio),
      max: Math.round(criticalDamage.max * ratio),
    };
  }

  // 베놈은 축소 후 HP 축 위에서 계산해야 공격 데미지와 눈금이 맞는다.
  const venomSurvivals = venomConfig
    ? calculateVenomSurvivals(venomConfig, monsterHp, damageScale, maxHits)
    : null;

  const size = monsterHp + 1;
  // 컨볼루션 결과 길이(2 * size - 1)를 담을 수 있는 FFT 길이.
  // 모든 컨볼루션이 같은 길이를 쓰므로 스펙트럼을 재사용할 수 있다.
  const fftSize = nextPowerOfTwo(2 * size - 1);

  //------------------ 내부 함수들 -------------------
  /**
   * "데미지 분포"(누적 데미지 -> 확률)에 미리 변환해 둔 스킬 1회 분포의
   * 스펙트럼을 합성(컨볼루션)해 "합산 데미지 분포"를 구한다.
   * 예: distA 와 distB를 합치면,
   *  모든 a, b 에 대해 damage = a+b, prob = distA[a]*distB[b]
   *  을 모든 (a,b)에 대해 더한 값
   *
   * monsterHp를 넘는 누적 데미지는 전부 인덱스 monsterHp(= 사망)로 몰아넣어
   * 흡수 상태로 만든다. 데미지는 줄어들지 않으므로 중간에 몰아넣든
   * 마지막에 몰아넣든 결과는 같다.
   */
  const convolveDistFFT = (
    dist: Float64Array,
    spectrum: Spectrum
  ): Float64Array => {
    const arrC = fftConvolveWithSpectrum(dist, spectrum, 2 * size - 1);
    let overflow = 0;
    for (let i = size; i < arrC.length; i++) {
      overflow += arrC[i];
    }
    const truncated = new Float64Array(size);
    truncated.set(arrC.subarray(0, size));
    truncated[monsterHp] += overflow;
    return truncated;
  };

  //------------------ 본 로직 -------------------

  // 1. "한 번의 스킬 시전"으로 발생할 수 있는 데미지의 이산 확률분포를 구한다.
  //    - 본체 Hit 2회 → 각 Hit별로 크리티컬/일반 구분 → 데미지 합
  //    - 쉐도우 파트너 ON 시 파트너 타격 2회가 추가(본체와 동일한 크리티컬 여부),
  //      단 데미지는 본체 데미지에 multiplier를 곱한 고정값

  const criticalProb = criticalChance / 100;
  // 데미지 라인의 [1, 199999] 클램프는 축소 전 원본 값에 걸어야 하므로
  // calculateDamage에서 이미 끝내고 들어온다. 여기서 다시 걸면 축소된 눈금에
  // 1을 강제하는 셈이 되어 오히려 데미지를 부풀린다.

  /**
   * 데미지 난수가 [uFrom, uTo) 구간일 때의 질량 weight를 분포에 더한다.
   *
   * 난수는 데미지 범위 위에 균등하므로 구간을 정수 눈금에 비례 배분한다.
   * 몬스터 HP를 넘는 데미지는 전부 인덱스 monsterHp(= 사망)로 몰아넣는다.
   */
  const addDamageSlice = (
    dist: Float64Array,
    range: { min: number; max: number },
    uFrom: number,
    uTo: number,
    weight: number
  ) => {
    if (weight <= 0 || uTo <= uFrom) return;
    const count = range.max - range.min + 1;
    const from = uFrom * count;
    const to = uTo * count;
    const scale = weight / (to - from);

    let index = Math.floor(from);
    for (; index < to; index++) {
      const damage = range.min + index;
      if (damage > monsterHp) break;
      const totalDamage = Math.min(
        // 쉐도우 파트너는 본체 데미지가 확정된 뒤 그 데미지의 고정 비율(만렙 50%,
        // 내림)을 그대로 따라간다. 크리티컬 여부도 본체를 따르므로 독립적으로
        // 굴리지 않고 본체 데미지에서 바로 계산한다.
        damage + Math.floor(damage * shadowMultiplier),
        monsterHp
      );
      dist[totalDamage] +=
        (Math.min(to, index + 1) - Math.max(from, index)) * scale;
    }
    if (index < to) {
      dist[monsterHp] += (to - Math.max(from, index)) * scale;
    }
  };

  /**
   * 타격 1회 분포. 데미지 난수를 [uFrom, uTo)로 제한하고
   * 일반 / 크리티컬 가중치를 지정해 만든다. 두 가중치의 합이 1이면 확률분포가 된다.
   *
   * 명중 판정은 타격별로 독립이므로 실패 질량은 항상 그대로 얹는다.
   */
  const buildHitDist = (
    uFrom: number,
    uTo: number,
    basicWeight: number,
    critWeight: number
  ): Float64Array => {
    const dist = new Float64Array(size);
    dist[0] += 1 - hitProb;
    addDamageSlice(dist, basicDamage, uFrom, uTo, basicWeight * hitProb);
    addDamageSlice(dist, criticalDamage, uFrom, uTo, critWeight * hitProb);
    return dist;
  };

  // 2. 타격 수만큼 단일 히트 분포를 합성해 "스킬 1회" 분포를 만든다.
  //    럭키 세븐은 2회 타격이고, 트리플 스로우는 3회 타격
  const hitCount = getHitCount(skillType);

  /**
   * 난수 순환을 반영할지.
   *
   * 원작은 공격 1회당 난수를 7칸만 뽑아 돌려 쓴다. 트리플 스로우 3라인에서는
   * 그 결과로 한 라인의 데미지 난수가 다른 라인의 크리티컬 판정을 그대로 결정한다
   * (메이플랜드 실측 40시전 40/40). 타격이 하나뿐인 스킬은 겹칠 상대가 없고,
   * 크리티컬 확률이 0이나 100%면 결합이 있어도 분포가 달라지지 않는다.
   */
  const coupled =
    rngCycling && hitCount === 3 && criticalProb > 0 && criticalProb < 1;

  let singleSkillDist: Float64Array;
  if (coupled) {
    // 라인 A는 완전 독립, 라인 B의 데미지 난수가 라인 C의 크리티컬을 결정한다.
    //   P(1시전) = A * [ p * (B|난수<p) * (C=크리) + (1-p) * (B|난수>=p) * (C=일반) ]
    // 크리티컬 판정이 "난수 < 크리확률"이라 B를 자르는 지점이 곧 크리확률이다.
    const p = criticalProb;
    const lineA = buildHitDist(0, 1, 1 - p, p);
    const lineBLow = buildHitDist(0, p, 1 - p, p);
    const lineBHigh = buildHitDist(p, 1, 1 - p, p);
    const lineCCrit = buildHitDist(0, 1, 0, 1);
    const lineCBasic = buildHitDist(0, 1, 1, 0);

    const low = convolveDistFFT(lineBLow, fftForward(lineCCrit, fftSize));
    const high = convolveDistFFT(lineBHigh, fftForward(lineCBasic, fftSize));

    const pair = new Float64Array(size);
    for (let i = 0; i < size; i++) {
      pair[i] = p * low[i] + (1 - p) * high[i];
    }
    singleSkillDist = convolveDistFFT(lineA, fftForward(pair, fftSize));
  } else {
    const singleHitDistMain = buildHitDist(
      0,
      1,
      1 - criticalProb,
      criticalProb
    );
    const singleHitSpectrum = fftForward(singleHitDistMain, fftSize);
    singleSkillDist = singleHitDistMain;
    for (let i = 1; i < hitCount; i++) {
      singleSkillDist = convolveDistFFT(singleSkillDist, singleHitSpectrum);
    }
  }

  // 3. 스킬 1회 분포를 반복 합성해 N회 시전 후의 누적 데미지 분포를 구한다.
  //    같은 분포를 계속 곱하므로 정방향 변환은 한 번만 해 두고 재사용한다.
  const singleSkillSpectrum = fftForward(singleSkillDist, fftSize);

  /**
   * 시전 useIndex + 1회 시점의 사망 확률.
   * 베놈이 없으면 흡수 상태(dist[monsterHp])가 그대로 답이고,
   * 있으면 남은 HP를 베놈 누적이 마저 채울 확률을 더한다.
   */
  const killProbability = (dist: Float64Array, useIndex: number): number => {
    const survival = venomSurvivals?.[useIndex];
    if (!survival) return dist[monsterHp];
    let total = dist[monsterHp];
    for (let damage = 0; damage < monsterHp; damage++) {
      const mass = dist[damage];
      if (mass === 0) continue;
      total += mass * survival[monsterHp - damage];
    }
    return total;
  };

  const skillUseProbabilities = [];

  let distN: Float64Array = singleSkillDist;
  skillUseProbabilities.push(killProbability(distN, 0));

  while (
    skillUseProbabilities.length < maxHits &&
    skillUseProbabilities[skillUseProbabilities.length - 1] < 0.999999
  ) {
    distN = convolveDistFFT(distN, singleSkillSpectrum);
    skillUseProbabilities.push(
      killProbability(distN, skillUseProbabilities.length)
    );
  }

  let prev = 0;
  const result = [];
  for (let i = 0; i < skillUseProbabilities.length; i++) {
    const current = (skillUseProbabilities[i] - prev) * 100;
    if (current >= 0.005) {
      result.push({
        hit: i + 1,
        prob: current.toFixed(2),
        accProb: (skillUseProbabilities[i] * 100).toFixed(2),
      });
    }
    prev = skillUseProbabilities[i];
  }
  return result;
};

export const calculateDamage = (
  monster: Monster,
  stats: Stats,
  equipment: Equipment,
  skills: Skills
): DamageResult => {
  // Get skill effects
  const attackSkill = getSkillEffect(skills.type, skills.level);
  const criticalSkill = getSkillEffect('criticalThrow', skills.criticalThrow);
  const javelinSkill = getSkillEffect('javelin', skills.javelin);
  const shadowSkill = getSkillEffect('shadowPartner', skills.shadowPartner);
  const sharpEyesSkill = getSkillEffect('sharpEyes', skills.sharpEyes);

  if (!attackSkill || !criticalSkill || !javelinSkill || !shadowSkill) {
    throw new Error('Failed to get skill effects');
  }

  // Calculate total attack
  const totalAttack = calculateTotalAttack(equipment);
  // Calculate stat attack
  const statAttack = calculateStatAttack(
    stats,
    totalAttack,
    isJavelinEffect(javelinSkill) ? javelinSkill.masteryPercent / 100 : 0.1
  );

  // Calculate skill damage multiplier
  let skillDamageMultiplier = 0;
  if (
    attackSkill &&
    (isLucky7Effect(attackSkill) ||
      isAvengerEffect(attackSkill) ||
      isDrainEffect(attackSkill) ||
      isTripleThrowEffect(attackSkill))
  ) {
    skillDamageMultiplier = attackSkill.damage / 100;
  }

  // Calculate critical multiplier and chance
  let criticalMultiplier = isCriticalThrowEffect(criticalSkill)
    ? criticalSkill.criticalDamage / 100
    : 1;
  let criticalChance = isCriticalThrowEffect(criticalSkill)
    ? criticalSkill.criticalChance
    : 0;

  // Apply Sharp Eyes effects
  //
  // 크리티컬 데미지는 기본적으로 합연산이라, 크리티컬 스로우의 "크리티컬 데미지
  // 200%"는 배율에 +100%p만 더한다(totalMultiplier = 스킬% + 크리% - 100%).
  // 하지만 샤프 아이즈는 게임 스펙상 "크리티컬 데미지 40% 증가"가
  // +40%p가 아니라 +140%p를 그대로 더하는 형태로 적용된다.
  // 다른 크리티컬 증가 옵션은 이렇게 동작하지 않으므로 샤프 아이즈에만 100을 더한다.
  if (
    skills.sharpEyesEnabled &&
    sharpEyesSkill &&
    isSharpEyesEffect(sharpEyesSkill)
  ) {
    criticalChance += sharpEyesSkill.criticalChance;
    criticalMultiplier += (100 + sharpEyesSkill.damage) / 100;
  }

  // Calculate basic damage
  const basicDamage = calculateDamageWithModifiers(
    statAttack,
    skillDamageMultiplier,
    1,
    stats,
    monster,
    skills.type,
    totalAttack
  );

  // Calculate critical damage
  const criticalDamage = calculateDamageWithModifiers(
    statAttack,
    skillDamageMultiplier,
    criticalMultiplier,
    stats,
    monster,
    skills.type,
    totalAttack
  );

  // Calculate shadow partner damage
  let shadowMultiplier = 0;
  if (skills.shadowPartnerEnabled && isShadowPartnerEffect(shadowSkill)) {
    shadowMultiplier = shadowSkill.skillDamage / 100;
  }

  // Floor all damage values
  // 방컷 확률은 여기서 내림한 정수 데미지 위에서 계산하므로,
  // 화면에 표시하는 데미지 범위도 반드시 내림한 뒤의 값에서 유도해야
  // 표시 범위와 확률 계산이 어긋나지 않는다.
  //
  // 스탯 공격력은 데미지 라인이 아니라 중간값이라 [1, 199999] 클램프를 걸지 않는다.
  statAttack.min = Math.max(Math.floor(statAttack.min), 0);
  statAttack.max = Math.max(Math.floor(statAttack.max), 0);
  basicDamage.min = toDamageLine(basicDamage.min);
  basicDamage.max = toDamageLine(basicDamage.max);
  criticalDamage.min = toDamageLine(criticalDamage.min);
  criticalDamage.max = toDamageLine(criticalDamage.max);

  // Calculate shadow partner damage ranges
  // 파트너 타격도 독립된 데미지 라인이라 같은 클램프를 받는다.
  const shadowLine = (damage: number) =>
    shadowMultiplier > 0 ? toDamageLine(damage * shadowMultiplier) : 0;

  const shadowBasic = {
    min: shadowLine(basicDamage.min),
    max: shadowLine(basicDamage.max),
  };

  const shadowCritical = {
    min: shadowLine(criticalDamage.min),
    max: shadowLine(criticalDamage.max),
  };

  // Calculate final damage ranges (본체 + 쉐도우 파트너, 타격 1회 기준)
  let totalMin = basicDamage.min + shadowBasic.min;
  let totalMax = criticalDamage.max + shadowCritical.max;

  // 베놈 설정
  //
  // 원작에서 베놈은 표창을 든 나이트로드의 거의 모든 공격에 타격마다 굴러가고,
  // 쉐도우 파트너 타격도 각각 따로 판정한다. 다만 보스와 독 무효/반감 몬스터에는
  // 아예 걸리지 않고, 드레인에는 붙지 않는다.
  //
  // 명중 실패한 타격도 판정을 굴리는지는 유출 코드로 확정할 수 없다.
  // 실사용 대부분이 명중률 100%라 단순화를 위해 항상 굴리는 것으로 둔다.
  const venomBlockedByMonster =
    monster.isBoss === true ||
    POISON_BLOCKING_ATTRIBUTES.includes(monster.poisonAttribute ?? 0);
  const shadowPartnerActive =
    skills.shadowPartnerEnabled && shadowMultiplier > 0;
  const { totalStr, totalDex, totalLuk } = calculateTotalStats(stats);

  let venomConfig: VenomConfig | null = null;
  if (
    skills.venomEnabled &&
    skills.venom > 0 &&
    !VENOM_EXCLUDED_SKILLS.includes(skills.type) &&
    !venomBlockedByMonster
  ) {
    venomConfig = {
      level: skills.venom,
      totalStr,
      totalDex,
      totalLuk,
      rollsPerUse: getHitCount(skills.type) * (shadowPartnerActive ? 2 : 1),
      attackPeriodSeconds:
        60 / (skills.attacksPerMinute || DEFAULT_ATTACKS_PER_MINUTE),
    };
  }
  const venomTickDamage = venomConfig
    ? calculateVenomTickDamage(venomConfig)
    : null;
  if (!venomTickDamage) {
    venomConfig = null;
  }

  // Calculate kill probabilities
  const killProbabilities = calculateKillProbabilitiesWithinNHits(
    skills.type,
    basicDamage,
    criticalDamage,
    shadowMultiplier,
    criticalChance,
    monster.hp,
    stats,
    monster,
    20,
    venomConfig,
    skills.rngCyclingEnabled
  );

  // Calculate critical probability
  const criticalProb = criticalChance / 100;

  // Calculate expected damage
  const expectedBasicDamage =
    ((basicDamage.min + basicDamage.max) / 2) * (1 + shadowMultiplier);
  const expectedCriticalDamage =
    ((criticalDamage.min + criticalDamage.max) / 2) * (1 + shadowMultiplier);
  let totalExpected = Math.floor(
    expectedBasicDamage * (1 - criticalProb) +
      expectedCriticalDamage * criticalProb
  );

  // Calculate HP absorption range for Drain skill
  let hpAbsorption = { min: 0, max: 0, expected: 0 };
  if (isDrainEffect(attackSkill)) {
    const rawAbsorptionMin = Math.floor(
      (totalMin * attackSkill.absorptionPercent) / 100
    );
    const rawAbsorptionMax = Math.floor(
      (totalMax * attackSkill.absorptionPercent) / 100
    );
    const expectedAbsorption = Math.floor(
      (totalExpected * attackSkill.absorptionPercent) / 100
    );

    hpAbsorption = {
      min: Math.min(rawAbsorptionMin, monster.hp),
      max: Math.min(rawAbsorptionMax, monster.hp),
      expected: Math.min(expectedAbsorption, monster.hp),
    };
  }

  // Apply Lucky7 double damage
  if (skills.type === 'lucky7') {
    totalMin = totalMin * 2;
    totalMax = totalMax * 2;
    totalExpected = totalExpected * 2;
  }

  // Apply Triple Throw triple damage
  if (skills.type === 'tripleThrow') {
    totalMin = totalMin * 3;
    totalMax = totalMax * 3;
    totalExpected = totalExpected * 3;
  }

  return {
    statAttack,
    basic: basicDamage,
    critical: criticalDamage,
    shadowBasic,
    shadowCritical,
    totalDamageRange: { min: totalMin, max: totalMax, expected: totalExpected },
    killProbabilities,
    hpAbsorption,
    venomTickDamage,
    venomApplied: venomConfig !== null,
  };
};

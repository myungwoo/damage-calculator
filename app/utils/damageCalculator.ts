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
import { fftConvolveArrays } from './fft';

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
  const totalPureStats = 20 + level * 5 + (level >= 70 ? 5 : 0);
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
    // 럭키 세븐과 트리플 스로우는 스탯 공격력의 영향을 받지 않음
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

const calculateKillProbabilitiesWithinNHits = (
  skillType: AttackSkillType,
  basicDamage: { min: number; max: number },
  criticalDamage: { min: number; max: number },
  shadowMultiplier: number,
  criticalChance: number,
  monsterHp: number,
  stats: Stats,
  monster: Monster,
  maxHits: number = 20
) => {
  // 명중률 계산
  const hitProb = calculateHitProbability(
    stats.hitRatio,
    monster.level,
    stats.level,
    monster.avoid
  );

  // 몬스터의 체력이 너무 큰 경우 20000으로 변경
  // 비율에 맞춰서 데미지도 변경
  // 실수 부분 반올림에 따른 오차는 감안해야 함
  if (monsterHp > 20000) {
    const ratio = 20000 / monsterHp;
    monsterHp = 20000;
    basicDamage = {
      min: Math.round(basicDamage.min * ratio),
      max: Math.round(basicDamage.max * ratio),
    };
    criticalDamage = {
      min: Math.round(criticalDamage.min * ratio),
      max: Math.round(criticalDamage.max * ratio),
    };
  }

  const size = monsterHp + 1;

  //------------------ 내부 함수들 -------------------
  /**
   * 두 개의 "데미지 분포" (Map<damage, prob>)를 합성(컨볼루션)해
   * "합산 데미지 분포"를 구한다.
   * 예: distA 와 distB를 합치면,
   *  모든 a, b 에 대해 damage = a+b, prob = distA[a]*distB[b]
   *  을 모든 (a,b)에 대해 더한 값
   */
  const convolveDistFFT = (distA: number[], distB: number[]): number[] => {
    const arrA = [...distA];
    const arrB = [...distB];
    // 2) FFT 곱
    const arrC = fftConvolveArrays(arrA, arrB); // 길이 최대 2*size -1

    if (arrC.length > size) {
      // 3) monsterHp 초과 부분을 arrC[monsterHp]에 몰아넣는다.
      for (let i = monsterHp + 1; i < arrC.length; i++) {
        arrC[monsterHp] += arrC[i];
      }
    }
    arrC.length = size;
    return arrC;
  };

  //------------------ 본 로직 -------------------

  // 1. "한 번의 스킬 시전"으로 발생할 수 있는 데미지의 이산 확률분포를 구한다.
  //    - 본체 Hit 2회 → 각 Hit별로 크리티컬/일반 구분 → 데미지 합
  //    - 쉐도우 파트너 ON 시 파트너 타격 2회가 추가(본체와 동일한 크리티컬 여부),
  //      단 데미지는 본체 데미지에 multiplier를 곱한 고정값

  // - 단일 히트 분포 (본체)
  //   damage -> 확률
  const singleHitDistMain = new Array(size).fill(0);

  // 명중 실패 확률 추가
  singleHitDistMain[0] = 1 - hitProb;

  const criticalProb = criticalChance / 100;
  {
    // 일반 공격 (non-critical)
    for (
      let damage = basicDamage.min;
      damage <= basicDamage.max && damage <= monsterHp;
      damage++
    ) {
      const totalDamage = Math.min(
        damage + Math.floor(damage * shadowMultiplier), // shadow damage는 본체 데미지의 고정 비율
        monsterHp
      );
      singleHitDistMain[totalDamage] +=
        ((1 - criticalProb) / (basicDamage.max - basicDamage.min + 1)) *
        hitProb;
    }
    const remaining =
      basicDamage.max - Math.max(monsterHp + 1, basicDamage.min) + 1;
    if (remaining > 0) {
      singleHitDistMain[monsterHp] +=
        ((1 - criticalProb) / (basicDamage.max - basicDamage.min + 1)) *
        hitProb *
        remaining;
    }
  }
  {
    // 크리티컬 공격
    for (
      let damage = criticalDamage.min;
      damage <= criticalDamage.max && damage <= monsterHp;
      damage++
    ) {
      const totalDamage = Math.min(
        damage + Math.floor(damage * shadowMultiplier), // shadow damage는 본체 데미지의 고정 비율
        monsterHp
      );
      singleHitDistMain[totalDamage] +=
        (criticalProb / (criticalDamage.max - criticalDamage.min + 1)) *
        hitProb;
    }
    const remaining =
      criticalDamage.max - Math.max(monsterHp + 1, criticalDamage.min) + 1;
    if (remaining > 0) {
      singleHitDistMain[monsterHp] +=
        (criticalProb / (criticalDamage.max - criticalDamage.min + 1)) *
        hitProb *
        remaining;
    }
  }

  let singleSkillDist = singleHitDistMain;
  // 럭키 세븐은 2회 타격이고, 트리플 스로우는 3회 타격
  if (skillType === 'lucky7' || skillType === 'tripleThrow') {
    singleSkillDist = convolveDistFFT(singleSkillDist, singleHitDistMain);
  }
  if (skillType === 'tripleThrow') {
    singleSkillDist = convolveDistFFT(singleSkillDist, singleHitDistMain);
  }

  const skillUseProbabilities = [];

  let distN = singleSkillDist;
  skillUseProbabilities.push(distN[monsterHp]);

  while (
    skillUseProbabilities.length < maxHits &&
    skillUseProbabilities[skillUseProbabilities.length - 1] < 0.999999
  ) {
    distN = convolveDistFFT(distN, singleSkillDist);
    skillUseProbabilities.push(distN[monsterHp]);
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
  if (
    skills.sharpEyesEnabled &&
    sharpEyesSkill &&
    isSharpEyesEffect(sharpEyesSkill)
  ) {
    criticalChance += sharpEyesSkill.criticalChance;
    criticalMultiplier += sharpEyesSkill.damage / 100;
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

  // Calculate final damage ranges
  let totalMin = Math.floor(basicDamage.min * (1 + shadowMultiplier));
  let totalMax = Math.floor(criticalDamage.max * (1 + shadowMultiplier));

  // Calculate shadow partner damage ranges
  const shadowBasic = {
    min: Math.floor(basicDamage.min * shadowMultiplier),
    max: Math.floor(basicDamage.max * shadowMultiplier),
  };

  const shadowCritical = {
    min: Math.floor(criticalDamage.min * shadowMultiplier),
    max: Math.floor(criticalDamage.max * shadowMultiplier),
  };

  // Floor all damage values
  statAttack.min = Math.max(Math.floor(statAttack.min), 0);
  statAttack.max = Math.max(Math.floor(statAttack.max), 0);
  basicDamage.min = Math.max(Math.floor(basicDamage.min), 0);
  basicDamage.max = Math.max(Math.floor(basicDamage.max), 0);
  criticalDamage.min = Math.max(Math.floor(criticalDamage.min), 0);
  criticalDamage.max = Math.max(Math.floor(criticalDamage.max), 0);

  // Calculate kill probabilities
  const killProbabilities = calculateKillProbabilitiesWithinNHits(
    skills.type,
    basicDamage,
    criticalDamage,
    shadowMultiplier,
    criticalChance,
    monster.hp,
    stats,
    monster
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
  };
};

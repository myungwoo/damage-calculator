import {
  Monster,
  Stats,
  Equipment,
  Skills,
  DamageResult,
  isLucky7Effect,
  isAvengerEffect,
  JavelinEffect,
  CriticalThrowEffect,
  ShadowPartnerEffect,
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
  criticalMultiplier: number | null,
  stats: Stats,
  monster: Monster,
  skillType: AttackSkillType,
  totalAttack: number
) => {
  const levelDifference = Math.max(0, monster.level - stats.level);
  const levelMultiplier = 1 - 0.01 * levelDifference;
  const totalMultiplier =
    skillDamageMultiplier + (criticalMultiplier ? criticalMultiplier : 1) - 1;

  const { totalLuk } = calculateTotalStats(stats);

  // 스킬별 데미지 계산
  let baseMax, baseMin;
  if (skillType === 'lucky7') {
    // 럭키 세븐은 스탯 공격력의 영향을 받지 않음
    baseMax = (totalLuk * 5 * totalAttack) / 100;
    baseMin = (totalLuk * 2.5 * totalAttack) / 100;
  } else {
    // 어벤져는 스탯 공격력의 영향을 받음
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
  shadowBasic: { min: number; max: number },
  shadowCritical: { min: number; max: number },
  criticalChance: number,
  monsterHp: number,
  stats: Stats,
  monster: Monster,
  maxHits: number = 10
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
    shadowBasic = {
      min: Math.round(shadowBasic.min * ratio),
      max: Math.round(shadowBasic.max * ratio),
    };
    shadowCritical = {
      min: Math.round(shadowCritical.min * ratio),
      max: Math.round(shadowCritical.max * ratio),
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
  //      단 데미지는 파트너 범위(E-F, G-H)에서 다시 이산 분포 생성.

  // 먼저, 본체 한 번 공격 시 발생 가능한 "단일 히트" 데미지 분포를 구하자.
  // 크리티컬일 확률: P, 일반일 확률: 1-P
  // 크리티컬 데미지들은 A~B (정수), 일반 데미지들은 C~D (정수)

  // - 단일 히트 분포 (본체)
  //   damage -> 확률
  const singleHitDistMain = new Array(size).fill(0);

  // 명중 실패 확률 추가
  singleHitDistMain[0] = 1 - hitProb;

  const criticalProb = criticalChance / 100;
  {
    let sum = 0;
    for (
      let i = basicDamage.min + shadowBasic.min;
      i <= basicDamage.max + shadowBasic.max && i < monsterHp;
      i++
    ) {
      const low = Math.max(i - shadowBasic.max, basicDamage.min);
      const high = Math.min(i - shadowBasic.min, basicDamage.max);
      if (low > high) continue;
      const cnt = high - low + 1;
      sum += cnt;
      singleHitDistMain[i] =
        ((cnt * (1 - criticalProb)) /
          (basicDamage.max - basicDamage.min + 1) /
          (shadowBasic.max - shadowBasic.min + 1)) *
        hitProb;
    }
    const remaining =
      (basicDamage.max - basicDamage.min + 1) *
        (shadowBasic.max - shadowBasic.min + 1) -
      sum;
    singleHitDistMain[monsterHp] =
      ((remaining * (1 - criticalProb)) /
        (basicDamage.max - basicDamage.min + 1) /
        (shadowBasic.max - shadowBasic.min + 1)) *
      hitProb;
  }
  {
    let sum = 0;
    for (
      let i = criticalDamage.min + shadowCritical.min;
      i <= criticalDamage.max + shadowCritical.max && i < monsterHp;
      i++
    ) {
      const low = Math.max(i - shadowCritical.max, criticalDamage.min);
      const high = Math.min(i - shadowCritical.min, criticalDamage.max);
      if (low > high) continue;
      const cnt = high - low + 1;
      sum += cnt;
      singleHitDistMain[i] +=
        ((cnt * criticalProb) /
          (criticalDamage.max - criticalDamage.min + 1) /
          (shadowCritical.max - shadowCritical.min + 1)) *
        hitProb;
    }
    const remaining =
      (criticalDamage.max - criticalDamage.min + 1) *
        (shadowCritical.max - shadowCritical.min + 1) -
      sum;
    singleHitDistMain[monsterHp] +=
      ((remaining * criticalProb) /
        (criticalDamage.max - criticalDamage.min + 1) /
        (shadowCritical.max - shadowCritical.min + 1)) *
      hitProb;
  }

  // 럭키 세븐은 2회 타격이 1회 스킬 사용이므로 하나로 합치기
  const singleSkillDist =
    skillType === 'lucky7'
      ? convolveDistFFT(singleHitDistMain, singleHitDistMain)
      : singleHitDistMain;

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
  // 스킬 효과 가져오기
  const mainSkill = getSkillEffect(skills.type, skills.level);
  const criticalSkill = getSkillEffect('criticalThrow', skills.criticalThrow);
  const javelinSkill = getSkillEffect('javelin', skills.javelin);
  const shadowSkill = getSkillEffect('shadowPartner', skills.shadowPartner);

  if (!mainSkill || !criticalSkill || !javelinSkill || !shadowSkill) {
    throw new Error('Failed to get skill effects');
  }

  // 총 공격력 계산
  const totalAttack = calculateTotalAttack(equipment);

  // 숙련도 계산 (자벨린 마스터리)
  const masteryMultiplier =
    (javelinSkill as JavelinEffect).masteryPercent / 100;

  // 스킬 공격력 계산
  const statAttack = calculateStatAttack(stats, totalAttack, masteryMultiplier);

  // 스킬 데미지 배율 계산
  let skillDamageMultiplier = 0;
  if (isLucky7Effect(mainSkill) || isAvengerEffect(mainSkill)) {
    skillDamageMultiplier = mainSkill.damage / 100;
  }

  // 기본 데미지 계산
  const basicDamage = calculateDamageWithModifiers(
    statAttack,
    skillDamageMultiplier,
    null,
    stats,
    monster,
    skills.type,
    totalAttack
  );

  // 크리티컬 데미지 계산
  const criticalMultiplier =
    (criticalSkill as CriticalThrowEffect).criticalDamage / 100;
  const criticalDamage = calculateDamageWithModifiers(
    statAttack,
    skillDamageMultiplier,
    criticalMultiplier,
    stats,
    monster,
    skills.type,
    totalAttack
  );

  // 쉐도우 파트너 데미지 계산
  let shadowMultiplier = 0;
  if (skills.shadowPartnerEnabled) {
    shadowMultiplier = (shadowSkill as ShadowPartnerEffect).skillDamage / 100;
  }

  // 최종 데미지 범위 계산 (방어력과 레벨 차이는 이미 적용됨)
  let totalMin = Math.floor(basicDamage.min * (1 + shadowMultiplier));
  let totalMax = Math.floor(criticalDamage.max * (1 + shadowMultiplier));

  const shadowBasic = {
    min: basicDamage.min * shadowMultiplier,
    max: basicDamage.max * shadowMultiplier,
  };

  const shadowCritical = {
    min: criticalDamage.min * shadowMultiplier,
    max: criticalDamage.max * shadowMultiplier,
  };

  if (skills.type === 'lucky7') {
    totalMin = totalMin * 2;
    totalMax = totalMax * 2;
  }

  // 모든 데미지 값 버림하여 정수로 만들기
  statAttack.min = Math.max(Math.floor(statAttack.min), 0);
  statAttack.max = Math.max(Math.floor(statAttack.max), 0);
  basicDamage.min = Math.max(Math.floor(basicDamage.min), 0);
  basicDamage.max = Math.max(Math.floor(basicDamage.max), 0);
  criticalDamage.min = Math.max(Math.floor(criticalDamage.min), 0);
  criticalDamage.max = Math.max(Math.floor(criticalDamage.max), 0);
  shadowBasic.min = Math.max(Math.floor(shadowBasic.min), 0);
  shadowBasic.max = Math.max(Math.floor(shadowBasic.max), 0);
  shadowCritical.min = Math.max(Math.floor(shadowCritical.min), 0);
  shadowCritical.max = Math.max(Math.floor(shadowCritical.max), 0);
  totalMin = Math.max(Math.floor(totalMin), 0);
  totalMax = Math.max(Math.floor(totalMax), 0);

  // 확률 계산
  const criticalChance = (criticalSkill as CriticalThrowEffect).criticalChance;
  const killProbabilities = calculateKillProbabilitiesWithinNHits(
    skills.type,
    basicDamage,
    criticalDamage,
    shadowBasic,
    shadowCritical,
    criticalChance,
    monster.hp,
    stats,
    monster
  );

  return {
    statAttack,
    basic: basicDamage,
    critical: criticalDamage,
    shadowBasic,
    shadowCritical,
    totalDamageRange: {
      min: totalMin,
      max: totalMax,
    },
    killProbabilities,
  };
};

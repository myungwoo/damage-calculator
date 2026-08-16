import { getSkillEffect } from '../data/skillEffects';
import { HEADLINE_KILL_THRESHOLD } from '../constants/calculator';
import { DamageResult, ElementAttribute } from '../types/calculator';
import {
  isLucky7Effect,
  isAvengerEffect,
  isCriticalThrowEffect,
  isJavelinEffect,
  isShadowPartnerEffect,
  isMapleWarriorEffect,
  isSharpEyesEffect,
  isDrainEffect,
  isTripleThrowEffect,
  isVenomEffect,
} from '../types/calculator';

/** 원작 elemAttr의 속성 문자 -> 한글 이름. */
const ELEMENT_NAMES: Record<string, string> = {
  P: '물리',
  I: '냉기',
  F: '불',
  L: '전기',
  S: '독',
  H: '성',
  D: '암',
};

/** 원작 elemAttr의 내성 값 -> 한글 이름. */
const ELEMENT_RESISTANCES: Record<string, ElementAttribute['resistance']> = {
  '1': '무효',
  '2': '반감',
  '3': '약점',
};

/**
 * `'F2S3'` 같은 원작 elemAttr 문자열을 사람이 읽는 항목으로 푼다.
 * 모르는 문자나 값이 섞여 있으면 그 항목만 버린다.
 */
export const parseElementAttributes = (
  elementAttributes: string | undefined
): ElementAttribute[] => {
  if (!elementAttributes) return [];

  const parsed: ElementAttribute[] = [];
  for (const [, letter, value] of elementAttributes.matchAll(/([A-Z])(\d)/g)) {
    const element = ELEMENT_NAMES[letter];
    const resistance = ELEMENT_RESISTANCES[value];
    if (element && resistance) {
      parsed.push({ element, resistance });
    }
  }
  return parsed;
};

export const getSkillLevelRange = (skillType: string) => {
  switch (skillType) {
    case 'lucky7':
      return Array.from({ length: 20 }, (_, i) => i + 1);
    case 'avenger':
      return Array.from({ length: 30 }, (_, i) => i + 1);
    case 'drain':
      return Array.from({ length: 30 }, (_, i) => i + 1);
    case 'criticalThrow':
      return Array.from({ length: 31 }, (_, i) => i);
    case 'javelin':
      return Array.from({ length: 21 }, (_, i) => i);
    case 'shadowPartner':
      return Array.from({ length: 31 }, (_, i) => i);
    case 'mapleWarrior':
      return Array.from({ length: 31 }, (_, i) => i);
    case 'sharpEyes':
      return Array.from({ length: 31 }, (_, i) => i);
    case 'tripleThrow':
      return Array.from({ length: 30 }, (_, i) => i + 1);
    case 'venom':
      return Array.from({ length: 31 }, (_, i) => i);
    default:
      return [];
  }
};

/**
 * 결과 상단과 모바일 하단 바에 크게 띄울 방수를 고른다.
 *
 * 누적 확률이 `HEADLINE_KILL_THRESHOLD`를 처음 넘는 방수를 쓰고, 20방 안에서
 * 그 선을 못 넘으면 마지막 방수를 대신 준다(`reliable: false`). 두 화면이 서로
 * 다른 숫자를 띄우지 않도록 기준을 여기 한 곳에 둔다.
 */
export const findHeadlineKill = (
  killProbabilities: DamageResult['killProbabilities']
) => {
  const reliable = killProbabilities.find(
    (entry) => Number(entry.accProb) >= HEADLINE_KILL_THRESHOLD
  );
  return {
    entry: reliable ?? killProbabilities[killProbabilities.length - 1],
    reliable: reliable !== undefined,
  };
};

export const formatSaveDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const renderSkillEffect = (skillType: string, level: number) => {
  const effect = getSkillEffect(skillType, level);
  if (!effect) return null;

  if (isSharpEyesEffect(effect)) {
    return `크리티컬 확률 +${effect.criticalChance}%, 크리티컬 데미지 +${effect.damage}%, ${effect.duration}초 지속`;
  }
  if (isAvengerEffect(effect)) {
    return `데미지 ${effect.damage}%, 최대 ${effect.maxTargets}명 공격`;
  }
  if (isDrainEffect(effect)) {
    return `데미지 ${effect.damage}%, HP 흡수 ${effect.absorptionPercent}%`;
  }
  if (isCriticalThrowEffect(effect)) {
    return `크리티컬 확률 ${effect.criticalChance}%, 크리티컬 데미지 ${effect.criticalDamage}%`;
  }
  if (isJavelinEffect(effect)) {
    return `숙련도 ${effect.masteryPercent}%`;
  }
  if (isShadowPartnerEffect(effect)) {
    return `스킬 데미지 ${effect.skillDamage}%, 통상 데미지 ${effect.normalDamage}%, ${effect.duration}초 지속`;
  }
  if (isMapleWarriorEffect(effect)) {
    return `순 스탯 ${effect.statBoost}% 증가, ${effect.duration}초 지속`;
  }
  if (isLucky7Effect(effect)) {
    return `데미지 ${effect.damage}%`;
  }
  if (isTripleThrowEffect(effect)) {
    return `데미지 ${effect.damage}%`;
  }
  if (isVenomEffect(effect)) {
    return `타격당 중독 ${effect.prop}%, ${effect.duration}초 지속(초당 1틱), 스킬 공격력 ${effect.mad}`;
  }
  return null;
};

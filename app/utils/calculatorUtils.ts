import { getSkillEffect } from '../data/skillEffects';
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
} from '../types/calculator';

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
    default:
      return [];
  }
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
  return null;
};

export type StatType = 'str' | 'dex' | 'luk';
export type AttackSkillType = 'lucky7' | 'avenger';

export type Region =
  | '빅토리아 아일랜드'
  | '미출시'
  | '오르비스'
  | '엘나스'
  | '장난감 공장'
  | '시계탑'
  | '에오스탑'
  | '지구방위본부'
  | '아랫마을'
  | '아쿠아리움'
  | '리프레'
  | '무릉'
  | '백초마을'
  | '아리안트'
  | '마가티아'
  | '시간의 신전'
  | '일본'
  | '기타';

export interface Monster {
  level: number;
  hp: number;
  physicalDefense: number;
  magicalDefense: number;
  avoid: number;
}

export interface Stats {
  level: number;
  str: number;
  dex: number;
  luk: number;
  additionalStr: number;
  additionalDex: number;
  additionalLuk: number;
  hitRatio?: number;
}

export interface Equipment {
  weaponAttack: number;
  selectedWeaponId: string;
  gloveAttack: number;
  otherAttack: number;
  buff: number;
}

export interface Skills {
  type: AttackSkillType;
  level: number;
  criticalThrow: number;
  javelin: number;
  shadowPartner: number;
  shadowPartnerEnabled: boolean;
  mapleWarrior: number;
  mapleWarriorEnabled: boolean;
  sharpEyes: number;
  sharpEyesEnabled: boolean;
}

export interface SaveData {
  timestamp: number;
  monster: Monster;
  stats: Stats;
  equipment: Equipment;
  skills: Skills;
}

export interface DamageRange {
  min: number;
  max: number;
}

export interface DamageResult {
  statAttack: DamageRange;
  basic: DamageRange;
  critical: DamageRange;
  shadowBasic: DamageRange;
  shadowCritical: DamageRange;
  totalDamageRange: DamageRange;
  killProbabilities: {
    hit: number;
    prob: string;
    accProb: string;
  }[];
}

// 스킬 효과 인터페이스
export interface Lucky7Effect {
  type: 'lucky7';
  level: number;
  damage: number;
}

export interface AvengerEffect {
  type: 'avenger';
  level: number;
  damage: number;
  maxTargets: number;
}

export interface CriticalThrowEffect {
  type: 'criticalThrow';
  level: number;
  criticalChance: number;
  criticalDamage: number;
}

export interface JavelinEffect {
  type: 'javelin';
  level: number;
  masteryPercent: number;
}

export interface ShadowPartnerEffect {
  type: 'shadowPartner';
  level: number;
  normalDamage: number;
  skillDamage: number;
  duration: number;
}

export interface MapleWarriorEffect {
  type: 'mapleWarrior';
  level: number;
  statBoost: number;
  duration: number;
}

export interface SharpEyesEffect {
  type: 'sharpEyes';
  level: number;
  duration: number;
  criticalChance: number;
  damage: number;
}

export type SkillEffect =
  | Lucky7Effect
  | AvengerEffect
  | CriticalThrowEffect
  | JavelinEffect
  | ShadowPartnerEffect
  | MapleWarriorEffect
  | SharpEyesEffect;

// 타입 가드
export const isLucky7Effect = (effect: SkillEffect): effect is Lucky7Effect => {
  return effect.type === 'lucky7';
};

export const isAvengerEffect = (
  effect: SkillEffect
): effect is AvengerEffect => {
  return effect.type === 'avenger';
};

export const isCriticalThrowEffect = (
  effect: SkillEffect
): effect is CriticalThrowEffect => {
  return effect.type === 'criticalThrow';
};

export const isJavelinEffect = (
  effect: SkillEffect
): effect is JavelinEffect => {
  return effect.type === 'javelin';
};

export const isShadowPartnerEffect = (
  effect: SkillEffect
): effect is ShadowPartnerEffect => {
  return effect.type === 'shadowPartner';
};

export const isMapleWarriorEffect = (
  effect: SkillEffect
): effect is MapleWarriorEffect => {
  return effect.type === 'mapleWarrior';
};

export const isSharpEyesEffect = (
  effect: SkillEffect
): effect is SharpEyesEffect => {
  return effect.type === 'sharpEyes';
};

export interface MonsterPreset extends Monster {
  id: string;
  name: string;
  exp?: number;
  region: string;
}

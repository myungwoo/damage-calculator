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
  | '기타';

export interface Monster {
  level: number;
  hp: number;
  physicalDefense: number;
}

export interface Stats {
  level: number;
  str: number;
  dex: number;
  luk: number;
  additionalStr: number;
  additionalDex: number;
  additionalLuk: number;
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
  probabilities: {
    hits: {
      hit: number;
      prob: string;
      accProb: string;
    }[];
  };
}

// 스킬 효과 인터페이스
export interface Lucky7Effect {
  level: number;
  damage: number;
}

export interface AvengerEffect {
  level: number;
  damage: number;
  maxTargets: number;
}

export interface CriticalThrowEffect {
  level: number;
  criticalChance: number;
  criticalDamage: number;
}

export interface JavelinEffect {
  level: number;
  masteryPercent: number;
}

export interface ShadowPartnerEffect {
  level: number;
  normalDamage: number;
  skillDamage: number;
  duration: number;
}

export type SkillEffect =
  | Lucky7Effect
  | AvengerEffect
  | CriticalThrowEffect
  | JavelinEffect
  | ShadowPartnerEffect;

// 타입 가드
export const isLucky7Effect = (effect: SkillEffect): effect is Lucky7Effect => {
  return 'damage' in effect && !('maxTargets' in effect);
};

export const isAvengerEffect = (
  effect: SkillEffect
): effect is AvengerEffect => {
  return 'damage' in effect && 'maxTargets' in effect;
};

export const isCriticalThrowEffect = (
  effect: SkillEffect
): effect is CriticalThrowEffect => {
  return 'criticalChance' in effect && 'criticalDamage' in effect;
};

export const isJavelinEffect = (
  effect: SkillEffect
): effect is JavelinEffect => {
  return 'masteryPercent' in effect;
};

export const isShadowPartnerEffect = (
  effect: SkillEffect
): effect is ShadowPartnerEffect => {
  return 'skillDamage' in effect && 'normalDamage' in effect;
};

export interface MonsterPreset extends Monster {
  id: string;
  name: string;
  region: string;
}

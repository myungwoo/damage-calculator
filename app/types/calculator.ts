export type StatType = 'str' | 'dex' | 'luk';
export type AttackSkillType = 'lucky7' | 'avenger' | 'drain' | 'tripleThrow';

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
  /**
   * 독 속성 저항 (원작 Mob.wz elemAttr의 S 항목).
   * 1 = 무효, 2 = 반감, 3 = 약점. 1과 2에는 베놈이 걸리지 않는다.
   */
  poisonAttribute?: number;
  /** 보스 여부. 보스에게는 베놈이 걸리지 않는다. */
  isBoss?: boolean;
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
  venom: number;
  venomEnabled: boolean;
  /**
   * 분당 공격 횟수.
   * 베놈은 시간당 1틱씩 들어가므로, 몇 방 안에 몇 틱이 들어가는지 세려면
   * 공격 주기를 알아야 한다. 베놈을 쓰지 않으면 계산에 영향이 없다.
   */
  attacksPerMinute: number;
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
  expected?: number;
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
  hpAbsorption: DamageRange;
  /** 베놈 1중첩 기준 틱 1회 데미지. 베놈이 적용되지 않으면 null */
  venomTickDamage: DamageRange | null;
  /** 베놈이 실제로 계산에 반영됐는지 (보스 / 독 무효·반감이면 false) */
  venomApplied: boolean;
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

export interface DrainEffect {
  type: 'drain';
  level: number;
  damage: number;
  absorptionPercent: number;
}

export interface TripleThrowEffect {
  type: 'tripleThrow';
  level: number;
  damage: number;
}

export interface VenomEffect {
  type: 'venom';
  level: number;
  /** 타격 1회당 중독 성공 확률 (%) */
  prop: number;
  /** 스킬 공격력 (WZ의 mad) */
  mad: number;
  /** 중독 지속 시간 (초) */
  duration: number;
}

export type SkillEffect =
  | Lucky7Effect
  | AvengerEffect
  | DrainEffect
  | CriticalThrowEffect
  | JavelinEffect
  | ShadowPartnerEffect
  | MapleWarriorEffect
  | SharpEyesEffect
  | TripleThrowEffect
  | VenomEffect;

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

export const isDrainEffect = (effect: SkillEffect): effect is DrainEffect => {
  return effect.type === 'drain';
};

export const isTripleThrowEffect = (
  effect: SkillEffect
): effect is TripleThrowEffect => {
  return effect.type === 'tripleThrow';
};

export const isVenomEffect = (effect: SkillEffect): effect is VenomEffect => {
  return effect.type === 'venom';
};

export interface MonsterPreset extends Monster {
  /** 원작 Mob.wz의 몹 ID. 유출 파일에서 속성 데이터를 다시 붙일 때 이 값으로 맞춘다. */
  id: string;
  name: string;
  exp?: number;
  region: string;
}

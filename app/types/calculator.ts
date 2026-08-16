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
  /** 몬스터 명중률. 캐릭터 회피율과 맞물려 회피 확률을 정한다. */
  accuracy: number;
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
  /** 캐릭터 회피율. 비워 두면 0으로 본다. */
  avoid?: number;
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
  /**
   * 난수 순환을 방컷 확률에 반영할지.
   *
   * 원작은 공격 1회당 난수를 7칸만 뽑아 돌려 써서, 트리플 스로우에서는
   * 한 라인의 데미지 난수가 다른 라인의 크리티컬 판정을 그대로 결정한다.
   * 트리플 스로우가 아니면 계산에 영향이 없다.
   */
  rngCyclingEnabled: boolean;
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

/**
 * 몬스터 프리셋.
 *
 * 계산에 직접 쓰이지 않는 항목도 원작 Mob.wz에서 함께 가져다 둔다.
 * 나중에 피격 데미지나 넉백 같은 기능을 붙일 때 다시 긁어올 필요가 없게 하기 위함이다.
 */
export interface MonsterPreset extends Monster {
  /** 원작 Mob.wz의 몹 ID. 유출 파일에서 속성 데이터를 다시 붙일 때 이 값으로 맞춘다. */
  id: string;
  name: string;
  exp?: number;
  /** 몬스터 물리 공격력 */
  physicalAttack: number;
  /** 몬스터 마법 공격력 */
  magicAttack: number;
  /** 넉백에 필요한 최소 누적 데미지 */
  minimumPushDamage: number;
  /** 언데드 여부 */
  isUndead?: boolean;
  /**
   * 속성 저항 원본 문자열 (예: 'I2F3' = 냉기 반감, 불 약점).
   * 문자는 P 물리 / I 냉기 / F 불 / L 전기 / S 독 / H 성 / D 암.
   * 숫자는 1 무효, 2 반감, 3 약점.
   */
  elementAttributes?: string;
  region: string;
}

/** 속성 저항 문자열을 사람이 읽는 형태로 푼 결과. */
export interface ElementAttribute {
  /** 속성 이름 (냉기, 불, 전기, 독, 성, 암, 물리) */
  element: string;
  /** 해당 속성에 대한 내성 */
  resistance: '무효' | '반감' | '약점';
}

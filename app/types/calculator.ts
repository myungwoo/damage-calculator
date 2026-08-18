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
  /** 몬스터 물리 공격력. 몸박 피격 데미지의 기준값이다. */
  physicalAttack: number;
  /**
   * 몸박보다 센 물리 공격들의 공격력 (오름차순, 중복 제거).
   *
   * 원작은 공격마다 자기 `PADamage`를 가질 수 있고 `max(몹 기본, 공격별)`을 쓴다.
   * 몸박만 보여주면 실제로 맞는 값을 놓친다(블러드붐은 몸박의 2.2배다).
   * 몸박 이하인 공격은 몸박과 값이 같아지므로 넣지 않는다. 그래서 이 목록이
   * 없으면 물리는 몸박 하나뿐이라는 뜻이다.
   */
  physicalAttackPowers?: number[];
  /** 몬스터 마법 공격력. 마법 피격 데미지의 기준값이다. */
  magicAttack: number;
  /**
   * 마법 공격(원작 `attack{n}/info/magic`)을 가진 몹인지.
   *
   * 마법 공격이 없으면 마법 공격력이 0보다 커도 마법 피격은 들어오지 않는다.
   * 프리셋 368종 중 73종이 여기 해당한다.
   */
  hasMagicAttack?: boolean;
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
  /**
   * 장비·버프로 붙은 INT.
   *
   * 순수 INT는 4로 고정이라(LUK 순 스탯 역산도 같은 가정을 쓴다) 추가분만 받는다.
   * 공격 데미지에는 안 들어가고 **물리 피격 데미지의 감면량에만** 들어간다.
   */
  additionalInt: number;
  hitRatio?: number;
  /** 캐릭터 회피율. 비워 두면 0으로 본다. */
  avoid?: number;
  /** 캐릭터 물리 방어력. 비워 두면 0으로 본다. */
  physicalDefense?: number;
  /** 캐릭터 마법 방어력. 비워 두면 0으로 본다. */
  magicalDefense?: number;
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
   * 페이크(쉐도우 쉬프터) 레벨.
   *
   * 공격 스킬이 아니라 피격을 무효화하는 스킬이라 데미지 계산에는 안 들어가고
   * 회피 확률에만 들어간다. 그래서 UI도 스킬 패널이 아니라 캐릭터 패널에 있다.
   */
  shadowShifter: number;
  shadowShifterEnabled: boolean;
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
  /**
   * 몹이 쓰는 스킬 (원작 `Mob.wz`의 `info/skill`).
   *
   * 데미지 계산에는 안 들어간다 — 스킬이 걸린 동안에만 달라지는 값이라
   * 상시 반영하면 오히려 틀린 숫자가 된다. 대신 "이 몹은 방어업을 건다"처럼
   * 화면값이 언제 나빠지는지를 알려 주는 데 쓴다.
   *
   * `x`는 그 몹이 쓰는 레벨의 효과 수치다(공격업 115 = +15%, 회복 3000 = HP 3000).
   * 뜻이 정해진 스킬에만 들어 있다.
   */
  mobSkills?: { id: number; x?: number }[];
  region: string;
}

/** 속성 저항 문자열을 사람이 읽는 형태로 푼 결과. */
export interface ElementAttribute {
  /** 속성 이름 (냉기, 불, 전기, 독, 성, 암, 물리) */
  element: string;
  /** 해당 속성에 대한 내성 */
  resistance: '무효' | '반감' | '약점';
}

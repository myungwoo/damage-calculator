interface Lucky7Effect {
  type: 'lucky7';
  level: number;
  damage: number;
}

interface AvengerEffect {
  type: 'avenger';
  level: number;
  damage: number;
  maxTargets: number;
}

interface CriticalThrowEffect {
  type: 'criticalThrow';
  level: number;
  criticalChance: number;
  criticalDamage: number;
}

interface JavelinEffect {
  type: 'javelin';
  level: number;
  masteryPercent: number;
}

interface ShadowPartnerEffect {
  type: 'shadowPartner';
  level: number;
  normalDamage: number;
  skillDamage: number;
  duration: number;
}

interface MapleWarriorEffect {
  type: 'mapleWarrior';
  level: number;
  statBoost: number;
  duration: number;
}

interface SharpEyesEffect {
  type: 'sharpEyes';
  level: number;
  duration: number;
  criticalChance: number;
  damage: number;
}

interface DrainEffect {
  type: 'drain';
  level: number;
  damage: number;
  absorptionPercent: number;
}

// 럭키 세븐 (1~20레벨)
export const lucky7Effects: Lucky7Effect[] = [
  {
    type: 'lucky7',
    level: 1,
    damage: 58,
  },
  {
    type: 'lucky7',
    level: 2,
    damage: 62,
  },
  {
    type: 'lucky7',
    level: 3,
    damage: 66,
  },
  {
    type: 'lucky7',
    level: 4,
    damage: 70,
  },
  {
    type: 'lucky7',
    level: 5,
    damage: 76,
  },
  {
    type: 'lucky7',
    level: 6,
    damage: 80,
  },
  {
    type: 'lucky7',
    level: 7,
    damage: 84,
  },
  {
    type: 'lucky7',
    level: 8,
    damage: 90,
  },
  {
    type: 'lucky7',
    level: 9,
    damage: 94,
  },
  {
    type: 'lucky7',
    level: 10,
    damage: 100,
  },
  {
    type: 'lucky7',
    level: 11,
    damage: 104,
  },
  {
    type: 'lucky7',
    level: 12,
    damage: 110,
  },
  {
    type: 'lucky7',
    level: 13,
    damage: 114,
  },
  {
    type: 'lucky7',
    level: 14,
    damage: 120,
  },
  {
    type: 'lucky7',
    level: 15,
    damage: 124,
  },
  {
    type: 'lucky7',
    level: 16,
    damage: 130,
  },
  {
    type: 'lucky7',
    level: 17,
    damage: 134,
  },
  {
    type: 'lucky7',
    level: 18,
    damage: 140,
  },
  {
    type: 'lucky7',
    level: 19,
    damage: 144,
  },
  {
    type: 'lucky7',
    level: 20,
    damage: 150,
  },
];

// 어벤져 (1~30레벨)
export const avengerEffects: AvengerEffect[] = [
  {
    type: 'avenger',
    level: 1,
    damage: 65,
    maxTargets: 4,
  },
  {
    type: 'avenger',
    level: 2,
    damage: 70,
    maxTargets: 4,
  },
  {
    type: 'avenger',
    level: 3,
    damage: 75,
    maxTargets: 4,
  },
  {
    type: 'avenger',
    level: 4,
    damage: 80,
    maxTargets: 4,
  },
  {
    type: 'avenger',
    level: 5,
    damage: 85,
    maxTargets: 4,
  },
  {
    type: 'avenger',
    level: 6,
    damage: 90,
    maxTargets: 4,
  },
  {
    type: 'avenger',
    level: 7,
    damage: 90,
    maxTargets: 4,
  },
  {
    type: 'avenger',
    level: 8,
    damage: 100,
    maxTargets: 4,
  },
  {
    type: 'avenger',
    level: 9,
    damage: 105,
    maxTargets: 4,
  },
  {
    type: 'avenger',
    level: 10,
    damage: 110,
    maxTargets: 4,
  },
  {
    type: 'avenger',
    level: 11,
    damage: 114,
    maxTargets: 5,
  },
  {
    type: 'avenger',
    level: 12,
    damage: 118,
    maxTargets: 5,
  },
  {
    type: 'avenger',
    level: 13,
    damage: 122,
    maxTargets: 5,
  },
  {
    type: 'avenger',
    level: 14,
    damage: 126,
    maxTargets: 5,
  },
  {
    type: 'avenger',
    level: 15,
    damage: 130,
    maxTargets: 5,
  },
  {
    type: 'avenger',
    level: 16,
    damage: 134,
    maxTargets: 5,
  },
  {
    type: 'avenger',
    level: 17,
    damage: 138,
    maxTargets: 5,
  },
  {
    type: 'avenger',
    level: 18,
    damage: 142,
    maxTargets: 5,
  },
  {
    type: 'avenger',
    level: 19,
    damage: 146,
    maxTargets: 5,
  },
  {
    type: 'avenger',
    level: 20,
    damage: 150,
    maxTargets: 5,
  },
  {
    type: 'avenger',
    level: 21,
    damage: 153,
    maxTargets: 6,
  },
  {
    type: 'avenger',
    level: 22,
    damage: 156,
    maxTargets: 6,
  },
  {
    type: 'avenger',
    level: 23,
    damage: 159,
    maxTargets: 6,
  },
  {
    type: 'avenger',
    level: 24,
    damage: 162,
    maxTargets: 6,
  },
  {
    type: 'avenger',
    level: 25,
    damage: 165,
    maxTargets: 6,
  },
  {
    type: 'avenger',
    level: 26,
    damage: 168,
    maxTargets: 6,
  },
  {
    type: 'avenger',
    level: 27,
    damage: 171,
    maxTargets: 6,
  },
  {
    type: 'avenger',
    level: 28,
    damage: 174,
    maxTargets: 6,
  },
  {
    type: 'avenger',
    level: 29,
    damage: 177,
    maxTargets: 6,
  },
  {
    type: 'avenger',
    level: 30,
    damage: 180,
    maxTargets: 6,
  },
];

// 크리티컬 스로우 (0~30레벨)
export const criticalThrowEffects: CriticalThrowEffect[] = [
  {
    type: 'criticalThrow',
    level: 0,
    criticalChance: 0,
    criticalDamage: 100,
  },
  {
    type: 'criticalThrow',
    level: 1,
    criticalChance: 21,
    criticalDamage: 113,
  },
  {
    type: 'criticalThrow',
    level: 2,
    criticalChance: 22,
    criticalDamage: 116,
  },
  {
    type: 'criticalThrow',
    level: 3,
    criticalChance: 23,
    criticalDamage: 119,
  },
  {
    type: 'criticalThrow',
    level: 4,
    criticalChance: 24,
    criticalDamage: 122,
  },
  {
    type: 'criticalThrow',
    level: 5,
    criticalChance: 25,
    criticalDamage: 125,
  },
  {
    type: 'criticalThrow',
    level: 6,
    criticalChance: 26,
    criticalDamage: 128,
  },
  {
    type: 'criticalThrow',
    level: 7,
    criticalChance: 27,
    criticalDamage: 131,
  },
  {
    type: 'criticalThrow',
    level: 8,
    criticalChance: 28,
    criticalDamage: 134,
  },
  {
    type: 'criticalThrow',
    level: 9,
    criticalChance: 29,
    criticalDamage: 137,
  },
  {
    type: 'criticalThrow',
    level: 10,
    criticalChance: 30,
    criticalDamage: 140,
  },
  {
    type: 'criticalThrow',
    level: 11,
    criticalChance: 31,
    criticalDamage: 143,
  },
  {
    type: 'criticalThrow',
    level: 12,
    criticalChance: 32,
    criticalDamage: 146,
  },
  {
    type: 'criticalThrow',
    level: 13,
    criticalChance: 33,
    criticalDamage: 149,
  },
  {
    type: 'criticalThrow',
    level: 14,
    criticalChance: 34,
    criticalDamage: 152,
  },
  {
    type: 'criticalThrow',
    level: 15,
    criticalChance: 35,
    criticalDamage: 155,
  },
  {
    type: 'criticalThrow',
    level: 16,
    criticalChance: 36,
    criticalDamage: 158,
  },
  {
    type: 'criticalThrow',
    level: 17,
    criticalChance: 37,
    criticalDamage: 161,
  },
  {
    type: 'criticalThrow',
    level: 18,
    criticalChance: 38,
    criticalDamage: 164,
  },
  {
    type: 'criticalThrow',
    level: 19,
    criticalChance: 39,
    criticalDamage: 167,
  },
  {
    type: 'criticalThrow',
    level: 20,
    criticalChance: 40,
    criticalDamage: 170,
  },
  {
    type: 'criticalThrow',
    level: 21,
    criticalChance: 41,
    criticalDamage: 173,
  },
  {
    type: 'criticalThrow',
    level: 22,
    criticalChance: 42,
    criticalDamage: 176,
  },
  {
    type: 'criticalThrow',
    level: 23,
    criticalChance: 43,
    criticalDamage: 179,
  },
  {
    type: 'criticalThrow',
    level: 24,
    criticalChance: 44,
    criticalDamage: 182,
  },
  {
    type: 'criticalThrow',
    level: 25,
    criticalChance: 45,
    criticalDamage: 185,
  },
  {
    type: 'criticalThrow',
    level: 26,
    criticalChance: 46,
    criticalDamage: 188,
  },
  {
    type: 'criticalThrow',
    level: 27,
    criticalChance: 47,
    criticalDamage: 191,
  },
  {
    type: 'criticalThrow',
    level: 28,
    criticalChance: 48,
    criticalDamage: 194,
  },
  {
    type: 'criticalThrow',
    level: 29,
    criticalChance: 49,
    criticalDamage: 197,
  },
  {
    type: 'criticalThrow',
    level: 30,
    criticalChance: 50,
    criticalDamage: 200,
  },
];

// 자벨린 마스터리 (0~20레벨)
export const javelinEffects: JavelinEffect[] = [
  {
    type: 'javelin',
    level: 0,
    masteryPercent: 10,
  },
  {
    type: 'javelin',
    level: 1,
    masteryPercent: 15,
  },
  {
    type: 'javelin',
    level: 2,
    masteryPercent: 15,
  },
  {
    type: 'javelin',
    level: 3,
    masteryPercent: 20,
  },
  {
    type: 'javelin',
    level: 4,
    masteryPercent: 20,
  },
  {
    type: 'javelin',
    level: 5,
    masteryPercent: 25,
  },
  {
    type: 'javelin',
    level: 6,
    masteryPercent: 25,
  },
  {
    type: 'javelin',
    level: 7,
    masteryPercent: 30,
  },
  {
    type: 'javelin',
    level: 8,
    masteryPercent: 30,
  },
  {
    type: 'javelin',
    level: 9,
    masteryPercent: 35,
  },
  {
    type: 'javelin',
    level: 10,
    masteryPercent: 35,
  },
  {
    type: 'javelin',
    level: 11,
    masteryPercent: 40,
  },
  {
    type: 'javelin',
    level: 12,
    masteryPercent: 40,
  },
  {
    type: 'javelin',
    level: 13,
    masteryPercent: 45,
  },
  {
    type: 'javelin',
    level: 14,
    masteryPercent: 45,
  },
  {
    type: 'javelin',
    level: 15,
    masteryPercent: 50,
  },
  {
    type: 'javelin',
    level: 16,
    masteryPercent: 50,
  },
  {
    type: 'javelin',
    level: 17,
    masteryPercent: 55,
  },
  {
    type: 'javelin',
    level: 18,
    masteryPercent: 55,
  },
  {
    type: 'javelin',
    level: 19,
    masteryPercent: 60,
  },
  {
    type: 'javelin',
    level: 20,
    masteryPercent: 60,
  },
];

// 쉐도우 파트너 (0~30레벨)
export const shadowPartnerEffects: ShadowPartnerEffect[] = [
  {
    type: 'shadowPartner',
    level: 0,
    normalDamage: 0,
    skillDamage: 0,
    duration: 0,
  },
  {
    type: 'shadowPartner',
    level: 1,
    normalDamage: 20,
    skillDamage: 21,
    duration: 60,
  },
  {
    type: 'shadowPartner',
    level: 2,
    normalDamage: 24,
    skillDamage: 21,
    duration: 60,
  },
  {
    type: 'shadowPartner',
    level: 3,
    normalDamage: 28,
    skillDamage: 21,
    duration: 60,
  },
  {
    type: 'shadowPartner',
    level: 4,
    normalDamage: 31,
    skillDamage: 21,
    duration: 60,
  },
  {
    type: 'shadowPartner',
    level: 5,
    normalDamage: 34,
    skillDamage: 21,
    duration: 60,
  },
  {
    type: 'shadowPartner',
    level: 6,
    normalDamage: 37,
    skillDamage: 21,
    duration: 60,
  },
  {
    type: 'shadowPartner',
    level: 7,
    normalDamage: 40,
    skillDamage: 21,
    duration: 60,
  },
  {
    type: 'shadowPartner',
    level: 8,
    normalDamage: 43,
    skillDamage: 22,
    duration: 60,
  },
  {
    type: 'shadowPartner',
    level: 9,
    normalDamage: 46,
    skillDamage: 23,
    duration: 60,
  },
  {
    type: 'shadowPartner',
    level: 10,
    normalDamage: 49,
    skillDamage: 24,
    duration: 60,
  },
  {
    type: 'shadowPartner',
    level: 11,
    normalDamage: 52,
    skillDamage: 25,
    duration: 120,
  },
  {
    type: 'shadowPartner',
    level: 12,
    normalDamage: 54,
    skillDamage: 26,
    duration: 120,
  },
  {
    type: 'shadowPartner',
    level: 13,
    normalDamage: 56,
    skillDamage: 27,
    duration: 120,
  },
  {
    type: 'shadowPartner',
    level: 14,
    normalDamage: 58,
    skillDamage: 28,
    duration: 120,
  },
  {
    type: 'shadowPartner',
    level: 15,
    normalDamage: 60,
    skillDamage: 29,
    duration: 120,
  },
  {
    type: 'shadowPartner',
    level: 16,
    normalDamage: 62,
    skillDamage: 30,
    duration: 120,
  },
  {
    type: 'shadowPartner',
    level: 17,
    normalDamage: 64,
    skillDamage: 31,
    duration: 120,
  },
  {
    type: 'shadowPartner',
    level: 18,
    normalDamage: 66,
    skillDamage: 32,
    duration: 120,
  },
  {
    type: 'shadowPartner',
    level: 19,
    normalDamage: 68,
    skillDamage: 33,
    duration: 120,
  },
  {
    type: 'shadowPartner',
    level: 20,
    normalDamage: 70,
    skillDamage: 34,
    duration: 120,
  },
  {
    type: 'shadowPartner',
    level: 21,
    normalDamage: 71,
    skillDamage: 35,
    duration: 180,
  },
  {
    type: 'shadowPartner',
    level: 22,
    normalDamage: 72,
    skillDamage: 36,
    duration: 180,
  },
  {
    type: 'shadowPartner',
    level: 23,
    normalDamage: 73,
    skillDamage: 37,
    duration: 180,
  },
  {
    type: 'shadowPartner',
    level: 24,
    normalDamage: 74,
    skillDamage: 38,
    duration: 180,
  },
  {
    type: 'shadowPartner',
    level: 25,
    normalDamage: 75,
    skillDamage: 40,
    duration: 180,
  },
  {
    type: 'shadowPartner',
    level: 26,
    normalDamage: 76,
    skillDamage: 42,
    duration: 180,
  },
  {
    type: 'shadowPartner',
    level: 27,
    normalDamage: 77,
    skillDamage: 44,
    duration: 180,
  },
  {
    type: 'shadowPartner',
    level: 28,
    normalDamage: 78,
    skillDamage: 46,
    duration: 180,
  },
  {
    type: 'shadowPartner',
    level: 29,
    normalDamage: 79,
    skillDamage: 48,
    duration: 180,
  },
  {
    type: 'shadowPartner',
    level: 30,
    normalDamage: 80,
    skillDamage: 50,
    duration: 180,
  },
];

// 메이플 용사 (0~30레벨)
export const mapleWarriorEffects: MapleWarriorEffect[] = [
  {
    type: 'mapleWarrior',
    level: 0,
    statBoost: 0,
    duration: 0,
  },
  {
    type: 'mapleWarrior',
    level: 1,
    statBoost: 1,
    duration: 30,
  },
  {
    type: 'mapleWarrior',
    level: 2,
    statBoost: 1,
    duration: 60,
  },
  {
    type: 'mapleWarrior',
    level: 3,
    statBoost: 2,
    duration: 90,
  },
  {
    type: 'mapleWarrior',
    level: 4,
    statBoost: 2,
    duration: 120,
  },
  {
    type: 'mapleWarrior',
    level: 5,
    statBoost: 3,
    duration: 150,
  },
  {
    type: 'mapleWarrior',
    level: 6,
    statBoost: 3,
    duration: 180,
  },
  {
    type: 'mapleWarrior',
    level: 7,
    statBoost: 4,
    duration: 210,
  },
  {
    type: 'mapleWarrior',
    level: 8,
    statBoost: 4,
    duration: 240,
  },
  {
    type: 'mapleWarrior',
    level: 9,
    statBoost: 5,
    duration: 270,
  },
  {
    type: 'mapleWarrior',
    level: 10,
    statBoost: 5,
    duration: 300,
  },
  {
    type: 'mapleWarrior',
    level: 11,
    statBoost: 6,
    duration: 330,
  },
  {
    type: 'mapleWarrior',
    level: 12,
    statBoost: 6,
    duration: 360,
  },
  {
    type: 'mapleWarrior',
    level: 13,
    statBoost: 7,
    duration: 390,
  },
  {
    type: 'mapleWarrior',
    level: 14,
    statBoost: 7,
    duration: 420,
  },
  {
    type: 'mapleWarrior',
    level: 15,
    statBoost: 8,
    duration: 450,
  },
  {
    type: 'mapleWarrior',
    level: 16,
    statBoost: 8,
    duration: 480,
  },
  {
    type: 'mapleWarrior',
    level: 17,
    statBoost: 9,
    duration: 510,
  },
  {
    type: 'mapleWarrior',
    level: 18,
    statBoost: 9,
    duration: 540,
  },
  {
    type: 'mapleWarrior',
    level: 19,
    statBoost: 10,
    duration: 570,
  },
  {
    type: 'mapleWarrior',
    level: 20,
    statBoost: 10,
    duration: 600,
  },
  {
    type: 'mapleWarrior',
    level: 21,
    statBoost: 11,
    duration: 630,
  },
  {
    type: 'mapleWarrior',
    level: 22,
    statBoost: 11,
    duration: 660,
  },
  {
    type: 'mapleWarrior',
    level: 23,
    statBoost: 12,
    duration: 690,
  },
  {
    type: 'mapleWarrior',
    level: 24,
    statBoost: 12,
    duration: 720,
  },
  {
    type: 'mapleWarrior',
    level: 25,
    statBoost: 13,
    duration: 750,
  },
  {
    type: 'mapleWarrior',
    level: 26,
    statBoost: 13,
    duration: 780,
  },
  {
    type: 'mapleWarrior',
    level: 27,
    statBoost: 14,
    duration: 810,
  },
  {
    type: 'mapleWarrior',
    level: 28,
    statBoost: 14,
    duration: 840,
  },
  {
    type: 'mapleWarrior',
    level: 29,
    statBoost: 15,
    duration: 870,
  },
  {
    type: 'mapleWarrior',
    level: 30,
    statBoost: 15,
    duration: 900,
  },
];

// 샤프 아이즈 (0~30레벨)
export const sharpEyesEffects: SharpEyesEffect[] = [
  {
    type: 'sharpEyes',
    level: 0,
    duration: 0,
    criticalChance: 0,
    damage: 0,
  },
  {
    type: 'sharpEyes',
    level: 1,
    duration: 10,
    criticalChance: 1,
    damage: 11,
  },
  {
    type: 'sharpEyes',
    level: 2,
    duration: 20,
    criticalChance: 1,
    damage: 12,
  },
  {
    type: 'sharpEyes',
    level: 3,
    duration: 30,
    criticalChance: 2,
    damage: 13,
  },
  {
    type: 'sharpEyes',
    level: 4,
    duration: 40,
    criticalChance: 2,
    damage: 14,
  },
  {
    type: 'sharpEyes',
    level: 5,
    duration: 50,
    criticalChance: 3,
    damage: 15,
  },
  {
    type: 'sharpEyes',
    level: 6,
    duration: 60,
    criticalChance: 3,
    damage: 16,
  },
  {
    type: 'sharpEyes',
    level: 7,
    duration: 70,
    criticalChance: 4,
    damage: 17,
  },
  {
    type: 'sharpEyes',
    level: 8,
    duration: 80,
    criticalChance: 4,
    damage: 18,
  },
  {
    type: 'sharpEyes',
    level: 9,
    duration: 90,
    criticalChance: 5,
    damage: 19,
  },
  {
    type: 'sharpEyes',
    level: 10,
    duration: 100,
    criticalChance: 5,
    damage: 20,
  },
  {
    type: 'sharpEyes',
    level: 11,
    duration: 110,
    criticalChance: 6,
    damage: 21,
  },
  {
    type: 'sharpEyes',
    level: 12,
    duration: 120,
    criticalChance: 6,
    damage: 22,
  },
  {
    type: 'sharpEyes',
    level: 13,
    duration: 130,
    criticalChance: 7,
    damage: 23,
  },
  {
    type: 'sharpEyes',
    level: 14,
    duration: 140,
    criticalChance: 7,
    damage: 24,
  },
  {
    type: 'sharpEyes',
    level: 15,
    duration: 150,
    criticalChance: 8,
    damage: 25,
  },
  {
    type: 'sharpEyes',
    level: 16,
    duration: 160,
    criticalChance: 8,
    damage: 26,
  },
  {
    type: 'sharpEyes',
    level: 17,
    duration: 170,
    criticalChance: 9,
    damage: 27,
  },
  {
    type: 'sharpEyes',
    level: 18,
    duration: 180,
    criticalChance: 9,
    damage: 28,
  },
  {
    type: 'sharpEyes',
    level: 19,
    duration: 190,
    criticalChance: 10,
    damage: 29,
  },
  {
    type: 'sharpEyes',
    level: 20,
    duration: 200,
    criticalChance: 10,
    damage: 30,
  },
  {
    type: 'sharpEyes',
    level: 21,
    duration: 210,
    criticalChance: 11,
    damage: 31,
  },
  {
    type: 'sharpEyes',
    level: 22,
    duration: 220,
    criticalChance: 11,
    damage: 32,
  },
  {
    type: 'sharpEyes',
    level: 23,
    duration: 230,
    criticalChance: 12,
    damage: 33,
  },
  {
    type: 'sharpEyes',
    level: 24,
    duration: 240,
    criticalChance: 12,
    damage: 34,
  },
  {
    type: 'sharpEyes',
    level: 25,
    duration: 250,
    criticalChance: 13,
    damage: 35,
  },
  {
    type: 'sharpEyes',
    level: 26,
    duration: 260,
    criticalChance: 13,
    damage: 36,
  },
  {
    type: 'sharpEyes',
    level: 27,
    duration: 270,
    criticalChance: 14,
    damage: 37,
  },
  {
    type: 'sharpEyes',
    level: 28,
    duration: 280,
    criticalChance: 14,
    damage: 38,
  },
  {
    type: 'sharpEyes',
    level: 29,
    duration: 290,
    criticalChance: 15,
    damage: 39,
  },
  {
    type: 'sharpEyes',
    level: 30,
    duration: 300,
    criticalChance: 15,
    damage: 40,
  },
];

export const drainEffects: DrainEffect[] = [
  {
    type: 'drain',
    level: 1,
    damage: 102,
    absorptionPercent: 16,
  },
  {
    type: 'drain',
    level: 2,
    damage: 104,
    absorptionPercent: 17,
  },
  {
    type: 'drain',
    level: 3,
    damage: 106,
    absorptionPercent: 18,
  },
  {
    type: 'drain',
    level: 4,
    damage: 108,
    absorptionPercent: 19,
  },
  {
    type: 'drain',
    level: 5,
    damage: 110,
    absorptionPercent: 20,
  },
  {
    type: 'drain',
    level: 6,
    damage: 112,
    absorptionPercent: 21,
  },
  {
    type: 'drain',
    level: 7,
    damage: 114,
    absorptionPercent: 22,
  },
  {
    type: 'drain',
    level: 8,
    damage: 116,
    absorptionPercent: 23,
  },
  {
    type: 'drain',
    level: 9,
    damage: 118,
    absorptionPercent: 24,
  },
  {
    type: 'drain',
    level: 10,
    damage: 120,
    absorptionPercent: 25,
  },
  {
    type: 'drain',
    level: 11,
    damage: 122,
    absorptionPercent: 26,
  },
  {
    type: 'drain',
    level: 12,
    damage: 124,
    absorptionPercent: 27,
  },
  {
    type: 'drain',
    level: 13,
    damage: 126,
    absorptionPercent: 28,
  },
  {
    type: 'drain',
    level: 14,
    damage: 128,
    absorptionPercent: 29,
  },
  {
    type: 'drain',
    level: 15,
    damage: 130,
    absorptionPercent: 30,
  },
  {
    type: 'drain',
    level: 16,
    damage: 132,
    absorptionPercent: 31,
  },
  {
    type: 'drain',
    level: 17,
    damage: 134,
    absorptionPercent: 32,
  },
  {
    type: 'drain',
    level: 18,
    damage: 136,
    absorptionPercent: 33,
  },
  {
    type: 'drain',
    level: 19,
    damage: 138,
    absorptionPercent: 34,
  },
  {
    type: 'drain',
    level: 20,
    damage: 140,
    absorptionPercent: 35,
  },
  {
    type: 'drain',
    level: 21,
    damage: 142,
    absorptionPercent: 36,
  },
  {
    type: 'drain',
    level: 22,
    damage: 144,
    absorptionPercent: 37,
  },
  {
    type: 'drain',
    level: 23,
    damage: 146,
    absorptionPercent: 38,
  },
  {
    type: 'drain',
    level: 24,
    damage: 148,
    absorptionPercent: 39,
  },
  {
    type: 'drain',
    level: 25,
    damage: 150,
    absorptionPercent: 40,
  },
  {
    type: 'drain',
    level: 26,
    damage: 152,
    absorptionPercent: 41,
  },
  {
    type: 'drain',
    level: 27,
    damage: 154,
    absorptionPercent: 42,
  },
  {
    type: 'drain',
    level: 28,
    damage: 156,
    absorptionPercent: 43,
  },
  {
    type: 'drain',
    level: 29,
    damage: 158,
    absorptionPercent: 44,
  },
  {
    type: 'drain',
    level: 30,
    damage: 160,
    absorptionPercent: 45,
  },
];

export const getSkillEffect = (
  skillType: string,
  level: number
):
  | Lucky7Effect
  | AvengerEffect
  | DrainEffect
  | CriticalThrowEffect
  | JavelinEffect
  | ShadowPartnerEffect
  | MapleWarriorEffect
  | SharpEyesEffect
  | null => {
  switch (skillType) {
    case 'lucky7':
      return lucky7Effects[level - 1];
    case 'avenger':
      return avengerEffects[level - 1];
    case 'drain':
      return drainEffects[level - 1];
    case 'criticalThrow':
      return criticalThrowEffects[level];
    case 'javelin':
      return javelinEffects[level];
    case 'shadowPartner':
      return shadowPartnerEffects[level];
    case 'mapleWarrior':
      return mapleWarriorEffects[level];
    case 'sharpEyes':
      return sharpEyesEffects[level];
    default:
      return null;
  }
};

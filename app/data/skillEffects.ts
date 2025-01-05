interface Lucky7Effect {
  level: number;
  damage: number;
}

interface AvengerEffect {
  level: number;
  damage: number;
  maxTargets: number;
}

interface CriticalThrowEffect {
  level: number;
  criticalChance: number;
  criticalDamage: number;
}

interface JavelinEffect {
  level: number;
  masteryPercent: number;
}

interface ShadowPartnerEffect {
  level: number;
  normalDamage: number;
  skillDamage: number;
  duration: number;
}

interface MapleWarriorEffect {
  level: number;
  statBoost: number;
  duration: number;
}

// 럭키 세븐 (1~20레벨)
export const lucky7Effects: Lucky7Effect[] = [
  { level: 1, damage: 58 },
  { level: 2, damage: 62 },
  { level: 3, damage: 66 },
  { level: 4, damage: 70 },
  { level: 5, damage: 76 },
  { level: 6, damage: 80 },
  { level: 7, damage: 84 },
  { level: 8, damage: 90 },
  { level: 9, damage: 94 },
  { level: 10, damage: 100 },
  { level: 11, damage: 104 },
  { level: 12, damage: 110 },
  { level: 13, damage: 114 },
  { level: 14, damage: 120 },
  { level: 15, damage: 124 },
  { level: 16, damage: 130 },
  { level: 17, damage: 134 },
  { level: 18, damage: 140 },
  { level: 19, damage: 144 },
  { level: 20, damage: 150 },
];

// 어벤져 (1~30레벨)
export const avengerEffects: AvengerEffect[] = [
  { level: 1, damage: 65, maxTargets: 4 },
  { level: 2, damage: 70, maxTargets: 4 },
  { level: 3, damage: 75, maxTargets: 4 },
  { level: 4, damage: 80, maxTargets: 4 },
  { level: 5, damage: 85, maxTargets: 4 },
  { level: 6, damage: 90, maxTargets: 4 },
  { level: 7, damage: 90, maxTargets: 4 },
  { level: 8, damage: 100, maxTargets: 4 },
  { level: 9, damage: 105, maxTargets: 4 },
  { level: 10, damage: 110, maxTargets: 4 },
  { level: 11, damage: 114, maxTargets: 5 },
  { level: 12, damage: 118, maxTargets: 5 },
  { level: 13, damage: 122, maxTargets: 5 },
  { level: 14, damage: 126, maxTargets: 5 },
  { level: 15, damage: 130, maxTargets: 5 },
  { level: 16, damage: 134, maxTargets: 5 },
  { level: 17, damage: 138, maxTargets: 5 },
  { level: 18, damage: 142, maxTargets: 5 },
  { level: 19, damage: 146, maxTargets: 5 },
  { level: 20, damage: 150, maxTargets: 5 },
  { level: 21, damage: 153, maxTargets: 6 },
  { level: 22, damage: 156, maxTargets: 6 },
  { level: 23, damage: 159, maxTargets: 6 },
  { level: 24, damage: 162, maxTargets: 6 },
  { level: 25, damage: 165, maxTargets: 6 },
  { level: 26, damage: 168, maxTargets: 6 },
  { level: 27, damage: 171, maxTargets: 6 },
  { level: 28, damage: 174, maxTargets: 6 },
  { level: 29, damage: 177, maxTargets: 6 },
  { level: 30, damage: 180, maxTargets: 6 },
];

// 크리티컬 스로우 (0~30레벨)
export const criticalThrowEffects: CriticalThrowEffect[] = [
  { level: 0, criticalChance: 0, criticalDamage: 100 },
  { level: 1, criticalChance: 21, criticalDamage: 113 },
  { level: 2, criticalChance: 22, criticalDamage: 116 },
  { level: 3, criticalChance: 23, criticalDamage: 119 },
  { level: 4, criticalChance: 24, criticalDamage: 122 },
  { level: 5, criticalChance: 25, criticalDamage: 125 },
  { level: 6, criticalChance: 26, criticalDamage: 128 },
  { level: 7, criticalChance: 27, criticalDamage: 131 },
  { level: 8, criticalChance: 28, criticalDamage: 134 },
  { level: 9, criticalChance: 29, criticalDamage: 137 },
  { level: 10, criticalChance: 30, criticalDamage: 140 },
  { level: 11, criticalChance: 31, criticalDamage: 143 },
  { level: 12, criticalChance: 32, criticalDamage: 146 },
  { level: 13, criticalChance: 33, criticalDamage: 149 },
  { level: 14, criticalChance: 34, criticalDamage: 152 },
  { level: 15, criticalChance: 35, criticalDamage: 155 },
  { level: 16, criticalChance: 36, criticalDamage: 158 },
  { level: 17, criticalChance: 37, criticalDamage: 161 },
  { level: 18, criticalChance: 38, criticalDamage: 164 },
  { level: 19, criticalChance: 39, criticalDamage: 167 },
  { level: 20, criticalChance: 40, criticalDamage: 170 },
  { level: 21, criticalChance: 41, criticalDamage: 173 },
  { level: 22, criticalChance: 42, criticalDamage: 176 },
  { level: 23, criticalChance: 43, criticalDamage: 179 },
  { level: 24, criticalChance: 44, criticalDamage: 182 },
  { level: 25, criticalChance: 45, criticalDamage: 185 },
  { level: 26, criticalChance: 46, criticalDamage: 188 },
  { level: 27, criticalChance: 47, criticalDamage: 191 },
  { level: 28, criticalChance: 48, criticalDamage: 194 },
  { level: 29, criticalChance: 49, criticalDamage: 197 },
  { level: 30, criticalChance: 50, criticalDamage: 200 },
];

// 자벨린 마스터리 (0~20레벨)
export const javelinEffects: JavelinEffect[] = [
  { level: 0, masteryPercent: 10 },
  { level: 1, masteryPercent: 15 },
  { level: 2, masteryPercent: 15 },
  { level: 3, masteryPercent: 20 },
  { level: 4, masteryPercent: 20 },
  { level: 5, masteryPercent: 25 },
  { level: 6, masteryPercent: 25 },
  { level: 7, masteryPercent: 30 },
  { level: 8, masteryPercent: 30 },
  { level: 9, masteryPercent: 35 },
  { level: 10, masteryPercent: 35 },
  { level: 11, masteryPercent: 40 },
  { level: 12, masteryPercent: 40 },
  { level: 13, masteryPercent: 45 },
  { level: 14, masteryPercent: 45 },
  { level: 15, masteryPercent: 50 },
  { level: 16, masteryPercent: 50 },
  { level: 17, masteryPercent: 55 },
  { level: 18, masteryPercent: 55 },
  { level: 19, masteryPercent: 60 },
  { level: 20, masteryPercent: 60 },
];

// 쉐도우 파트너 (0~30레벨)
export const shadowPartnerEffects: ShadowPartnerEffect[] = [
  { level: 0, normalDamage: 0, skillDamage: 0, duration: 0 },
  { level: 1, normalDamage: 20, skillDamage: 21, duration: 60 },
  { level: 2, normalDamage: 24, skillDamage: 21, duration: 60 },
  { level: 3, normalDamage: 28, skillDamage: 21, duration: 60 },
  { level: 4, normalDamage: 31, skillDamage: 21, duration: 60 },
  { level: 5, normalDamage: 34, skillDamage: 21, duration: 60 },
  { level: 6, normalDamage: 37, skillDamage: 21, duration: 60 },
  { level: 7, normalDamage: 40, skillDamage: 21, duration: 60 },
  { level: 8, normalDamage: 43, skillDamage: 22, duration: 60 },
  { level: 9, normalDamage: 46, skillDamage: 23, duration: 60 },
  { level: 10, normalDamage: 49, skillDamage: 24, duration: 60 },
  { level: 11, normalDamage: 52, skillDamage: 25, duration: 120 },
  { level: 12, normalDamage: 54, skillDamage: 26, duration: 120 },
  { level: 13, normalDamage: 56, skillDamage: 27, duration: 120 },
  { level: 14, normalDamage: 58, skillDamage: 28, duration: 120 },
  { level: 15, normalDamage: 60, skillDamage: 29, duration: 120 },
  { level: 16, normalDamage: 62, skillDamage: 30, duration: 120 },
  { level: 17, normalDamage: 64, skillDamage: 31, duration: 120 },
  { level: 18, normalDamage: 66, skillDamage: 32, duration: 120 },
  { level: 19, normalDamage: 68, skillDamage: 33, duration: 120 },
  { level: 20, normalDamage: 70, skillDamage: 34, duration: 120 },
  { level: 21, normalDamage: 71, skillDamage: 35, duration: 180 },
  { level: 22, normalDamage: 72, skillDamage: 36, duration: 180 },
  { level: 23, normalDamage: 73, skillDamage: 37, duration: 180 },
  { level: 24, normalDamage: 74, skillDamage: 38, duration: 180 },
  { level: 25, normalDamage: 75, skillDamage: 40, duration: 180 },
  { level: 26, normalDamage: 76, skillDamage: 42, duration: 180 },
  { level: 27, normalDamage: 77, skillDamage: 44, duration: 180 },
  { level: 28, normalDamage: 78, skillDamage: 46, duration: 180 },
  { level: 29, normalDamage: 79, skillDamage: 48, duration: 180 },
  { level: 30, normalDamage: 80, skillDamage: 50, duration: 180 },
];

// 메이플 용사 (0~30레벨)
export const mapleWarriorEffects: MapleWarriorEffect[] = [
  { level: 0, statBoost: 0, duration: 0 },
  { level: 1, statBoost: 1, duration: 30 },
  { level: 2, statBoost: 1, duration: 60 },
  { level: 3, statBoost: 2, duration: 90 },
  { level: 4, statBoost: 2, duration: 120 },
  { level: 5, statBoost: 3, duration: 150 },
  { level: 6, statBoost: 3, duration: 180 },
  { level: 7, statBoost: 4, duration: 210 },
  { level: 8, statBoost: 4, duration: 240 },
  { level: 9, statBoost: 5, duration: 270 },
  { level: 10, statBoost: 5, duration: 300 },
  { level: 11, statBoost: 6, duration: 330 },
  { level: 12, statBoost: 6, duration: 360 },
  { level: 13, statBoost: 7, duration: 390 },
  { level: 14, statBoost: 7, duration: 420 },
  { level: 15, statBoost: 8, duration: 450 },
  { level: 16, statBoost: 8, duration: 480 },
  { level: 17, statBoost: 9, duration: 510 },
  { level: 18, statBoost: 9, duration: 540 },
  { level: 19, statBoost: 10, duration: 570 },
  { level: 20, statBoost: 10, duration: 600 },
  { level: 21, statBoost: 11, duration: 630 },
  { level: 22, statBoost: 11, duration: 660 },
  { level: 23, statBoost: 12, duration: 690 },
  { level: 24, statBoost: 12, duration: 720 },
  { level: 25, statBoost: 13, duration: 750 },
  { level: 26, statBoost: 13, duration: 780 },
  { level: 27, statBoost: 14, duration: 810 },
  { level: 28, statBoost: 14, duration: 840 },
  { level: 29, statBoost: 15, duration: 870 },
  { level: 30, statBoost: 15, duration: 900 },
];

export const getSkillEffect = (
  skillType: string,
  level: number
):
  | Lucky7Effect
  | AvengerEffect
  | CriticalThrowEffect
  | JavelinEffect
  | ShadowPartnerEffect
  | MapleWarriorEffect
  | null => {
  switch (skillType) {
    case 'lucky7':
      return lucky7Effects[level - 1];
    case 'avenger':
      return avengerEffects[level - 1];
    case 'criticalThrow':
      return criticalThrowEffects[level];
    case 'javelin':
      return javelinEffects[level];
    case 'shadowPartner':
      return shadowPartnerEffects[level];
    case 'mapleWarrior':
      return mapleWarriorEffects[level];
    default:
      return null;
  }
};

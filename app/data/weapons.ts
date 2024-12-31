export interface Weapon {
  id: string;
  name: string;
  attack: number;
}

export const throwingStars: Weapon[] = [
  { id: 'subi', name: '수비 표창', attack: 15 },
  { id: 'wolbi', name: '월비 표창', attack: 17 },
  { id: 'snowball', name: '눈덩이', attack: 17 },
  { id: 'mokbi', name: '목비 표창', attack: 19 },
  { id: 'wooden', name: '나무팽이', attack: 19 },
  { id: 'maple', name: '메이플 표창', attack: 19 },
  { id: 'kumbi', name: '금비 표창', attack: 21 },
  { id: 'icicle', name: '고드름', attack: 21 },
  { id: 'tobi', name: '토비 표창', attack: 23 },
  { id: 'thunder', name: '뇌전 수리검', attack: 25 },
  { id: 'ilbi', name: '일비 표창', attack: 27 },
  { id: 'hwabi', name: '화비 표창', attack: 27 },
];

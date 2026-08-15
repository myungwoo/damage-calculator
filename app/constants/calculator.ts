export const SAVE_SLOTS = 3;
export const STORAGE_KEY_PREFIX = 'damage-calculator-save-';
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 250;

/** 입력 후 방컷 확률을 다시 계산하기까지의 디바운스 시간 (ms) */
export const CALCULATION_DEBOUNCE_MS = 100;

/**
 * 결과 상단에 "N방컷"으로 크게 띄울 기준 누적 확률 (%).
 *
 * 중앙값(50%)이 아니라 90%를 쓴다. "N방컷"은 평균이 아니라 "안정적으로 N방에 잡힌다"는
 * 뜻으로 통하기 때문이다. 실측상 분포가 한 방수에 몰려 있어서 두 기준이 갈리는 경우가
 * 드물고, 갈릴 때는 50% 기준이 누적 74~77%짜리 방수를 단언하고 있었다.
 */
export const HEADLINE_KILL_THRESHOLD = 90;

export const REGION_ORDER = [
  '빅토리아 아일랜드',
  '미출시',
  '오르비스',
  '엘나스',
  '장난감 공장',
  '시계탑',
  '에오스탑',
  '지구방위본부',
  '아랫마을',
  '아쿠아리움',
  '리프레',
  '무릉',
  '백초마을',
  '아리안트',
  '마가티아',
  '시간의 신전',
  '일본',
  '기타',
] as const;

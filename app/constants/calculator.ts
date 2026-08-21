export const SAVE_SLOTS = 3;
/**
 * 저장 슬롯 키.
 *
 * mapleland.myungwoo.kr 은 유틸 여러 개가 한 오리진을 공유한다(myungwoo.github.io 도
 * 마찬가지다). 앱 전용 값에 접두어를 안 붙이면 다른 유틸과 부딪힌다.
 */
export const STORAGE_KEY_PREFIX = 'ml:damage:save:';

/** 접두어를 붙이기 전에 쓰던 키. 새 키가 없을 때 한 번 복사해 온다. */
export const LEGACY_STORAGE_KEY_PREFIX = 'damage-calculator-save-';
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 250;

/**
 * 순수 INT.
 *
 * 나이트로드는 INT에 AP를 주지 않으므로 시작 스탯 4에서 그대로 멈춘다.
 * LUK 순 스탯 역산과 물리 피격 데미지가 같은 가정을 쓰므로 여기서만 정한다.
 */
export const PURE_INT = 4;

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
  '뉴리프시티',
  '크림슨우드',
  '기타',
] as const;

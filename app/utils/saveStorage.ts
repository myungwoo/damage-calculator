import {
  LEGACY_STORAGE_KEY_PREFIX,
  SAVE_SLOTS,
  STORAGE_KEY_PREFIX,
} from '../constants/calculator';

/**
 * 저장 슬롯을 접두어 있는 키로 옮긴다.
 *
 * 예전 키(`damage-calculator-save-N`)는 접두어가 없어서, 한 오리진을 공유하는 다른
 * 유틸(mapleland.myungwoo.kr, myungwoo.github.io)과 부딪힐 수 있었다.
 *
 * 새 키가 비어 있을 때만 복사하고, 옛 키는 지우지 않는다 — 배포를 되돌릴 일이 생겨도
 * 저장이 남아 있어야 한다. 그래서 여러 번 불려도 결과가 같다.
 */
export const migrateLegacySaveSlots = (): void => {
  try {
    for (let slot = 0; slot < SAVE_SLOTS; slot++) {
      const key = `${STORAGE_KEY_PREFIX}${slot}`;
      if (localStorage.getItem(key) !== null) continue;

      const legacyValue = localStorage.getItem(
        `${LEGACY_STORAGE_KEY_PREFIX}${slot}`
      );
      if (legacyValue !== null) localStorage.setItem(key, legacyValue);
    }
  } catch {
    // 시크릿 모드처럼 localStorage 가 막힌 환경에서는 그냥 넘어간다.
  }
};

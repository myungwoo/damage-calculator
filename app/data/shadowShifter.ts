/**
 * 페이크(쉐도우 쉬프터, 나이트로드 4차) 스킬 데이터.
 *
 * 원작 Skill.wz 412.img의 4120002다. 섀도어 쪽 4220002도 같은 표를 쓴다.
 * UI 라벨은 메이플랜드 표기인 "페이크"지만, 코드에서는 유출 자료와 맞추려고
 * 원작 스킬명(Shadow Shifter)을 쓴다.
 */

export const SHADOW_SHIFTER_MAX_LEVEL = 30;

/**
 * 레벨별 발동 확률 (%).
 *
 * WZ의 `prop`이 레벨과 정확히 같다(lv1 = 1%, lv30 = 30%). 다른 값이 섞여 있지
 * 않아서 표 대신 닫힌 식으로 적는다.
 */
export const getShadowShifterProp = (level: number): number => {
  if (!Number.isInteger(level) || level < 1) {
    return 0;
  }
  return Math.min(SHADOW_SHIFTER_MAX_LEVEL, level);
};

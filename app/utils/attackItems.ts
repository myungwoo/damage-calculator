import { AttackItem } from '../types/calculator';

/** 켜 둔 항목만 더한다. 꺼 둔 줄은 값을 기억만 하고 합계에서 빠진다. */
export const sumAttackItems = (items: AttackItem[] | undefined): number =>
  (items ?? []).reduce(
    (sum, item) => (item.enabled ? sum + item.value : sum),
    0
  );

/**
 * 항목으로 나눠 놨으면 그 합이, 아니면 직접 적은 숫자가 그 칸의 값이다.
 *
 * 화면과 계산이 같은 판단을 하도록 여기 한 곳에서만 정한다. 항목을 편집할 때
 * UI가 숫자 칸도 같이 갱신하지만, 계산이 그 숫자를 믿지 않고 다시 합치므로
 * 둘이 어긋난 저장 데이터를 불러와도 값이 틀어지지 않는다.
 */
export const resolveAttackPart = (
  directValue: number,
  items: AttackItem[] | undefined
): number => (items && items.length > 0 ? sumAttackItems(items) : directValue);

/** 목록에 새 줄을 만든다. 이름은 비워 두고 바로 타이핑하게 한다. */
export const createAttackItem = (): AttackItem => ({
  // crypto.randomUUID는 구형 브라우저·비보안 오리진에서 없을 수 있어 쓰지 않는다.
  id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  name: '',
  value: 0,
  enabled: true,
});

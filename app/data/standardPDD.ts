/**
 * 도적 표준 물리 방어력 (원작 `Base.wz`의 `StandardPDD.img`).
 *
 * 피격 물리 데미지가 방어력을 얼마나 깎아 주는지는 "내 방어력"이 아니라
 * **"내 레벨대의 표준 방어력과 얼마나 차이 나는지"** 로 정해진다.
 * 원작 `CalcDamage::PDamage`가 `GetStandardPDD(직업군, 레벨)`을 읽어
 * `내 방어력 - 표준 방어력`을 감면량에 넣기 때문이다.
 *
 * 원본은 직업군 0~5(초보 / 전사 / 마법사 / 궁수 / 도적 / 해적)를 모두 담고 있지만,
 * 이 계산기는 나이트로드 전용이라 도적(4)만 옮겼다. 회피 확률의 도적 클램프와 같은
 * 이유다. 값은 v079와 v083 WZ가 완전히 같은 것을 확인했다.
 */
const THIEF_STANDARD_PDD: readonly (readonly [level: number, value: number])[] =
  [
    [10, 42],
    [15, 60],
    [20, 76],
    [22, 85],
    [25, 100],
    [30, 115],
    [32, 116],
    [35, 131],
    [37, 132],
    [40, 147],
    [50, 184],
    [55, 187],
    [60, 220],
    [65, 223],
    [70, 257],
    [75, 263],
    [80, 291],
    [85, 297],
    [90, 325],
    [95, 331],
    [100, 331],
  ];

/**
 * 원작 `GetStandardPDD`가 레벨을 자르는 상한.
 * 이 값을 넘으면 표를 아예 안 보고 0을 준다.
 */
const MAX_TABLE_LEVEL = 255;

/**
 * 레벨에 해당하는 표준 물리 방어력.
 *
 * 표에 없는 레벨은 **바로 아래 칸의 값을 그대로** 쓴다. 원작
 * `LoadStandardPDD`가 레벨 0~255를 훑으면서 노드가 있을 때만 값을 갱신하고
 * 없으면 직전 값(`nLastValue`)을 그대로 채우기 때문이다.
 * 그래서 첫 칸(10) 미만은 0이고, 100을 넘으면 100의 값이 계속 유지된다.
 */
export const getStandardPhysicalDefense = (level: number): number => {
  const target = Math.trunc(level);
  if (target < 0 || target > MAX_TABLE_LEVEL) {
    return 0;
  }

  let value = 0;
  for (const [tableLevel, tableValue] of THIEF_STANDARD_PDD) {
    if (tableLevel > target) {
      break;
    }
    value = tableValue;
  }
  return value;
};

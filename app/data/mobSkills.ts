/**
 * 몬스터가 쓰는 스킬.
 *
 * 원작 `MobSkill.img`의 스킬 ID다. 몹 행동은 **공격(`attack{n}`)과 스킬로 나뉘고
 * 스킬은 데미지를 주지 않는다** — 대신 자기 버프 · 캐릭터 디버프 · 소환을 한다.
 * ID와 효과는 `mnwvs077`의 `Mob::DoSkill_StateChange` / `DoSkill_PartizanStatChange`와
 * `iw2d/kinoko`의 `MobSkillType`에서 교차확인했다.
 *
 * 100번대는 자기 자신에게, 110번대는 **주변 몹 전체에게** 거는 같은 버프다
 * (원작이 파티잔 계열로 따로 처리한다). 화면에서는 굳이 나누지 않는다.
 */
export type MobSkillImpact =
  /** 방컷 확률이 나빠진다 — 데미지가 줄거나 안 들어가거나 HP가 회복된다 */
  | 'kill'
  /** 캐릭터가 불리해진다 (계산에는 안 들어간다) */
  | 'player'
  /** 나이트로드에게는 영향이 없는 참고 정보 */
  | 'info';

export interface MobSkillInfo {
  name: string;
  impact: MobSkillImpact;
  /** 칩 옆에 붙는 수치. `x`는 프리셋에 저장된 그 몹의 스킬 레벨 값이다 */
  value?: (x: number) => string;
  /** 마우스를 올렸을 때 나오는 설명 */
  detail: string;
}

/** 데미지 배율(%)을 증감 표기로 바꾼다. 공격업 115 -> +15%, 방어업 85 -> -15% */
const asDelta = (x: number) => `${x >= 100 ? '+' : ''}${x - 100}%`;

export const MOB_SKILLS: Record<number, MobSkillInfo> = {
  100: {
    name: '공격업',
    impact: 'player',
    value: asDelta,
    detail:
      '몹의 물리 공격 데미지가 그만큼 커진다. 피격 데미지 표에 단계별로 나와 있다',
  },
  101: {
    name: '마공업',
    impact: 'player',
    value: asDelta,
    detail:
      '몹의 마법 공격 데미지가 그만큼 커진다. 피격 데미지 표에 단계별로 나와 있다',
  },
  102: {
    name: '방어업',
    impact: 'kill',
    value: asDelta,
    detail:
      '걸린 동안 내 물리 데미지가 그만큼 줄어든다. 방컷 확률이 화면값보다 나빠진다',
  },
  103: {
    name: '마방업',
    impact: 'info',
    value: asDelta,
    detail: '마법 데미지를 줄인다. 표창은 물리라 영향이 없다',
  },
  104: { name: '이동속도업', impact: 'info', detail: '몹이 빨라진다' },
  110: {
    name: '공격업',
    impact: 'player',
    value: asDelta,
    detail:
      '주변 몹 전체의 물리 공격 데미지가 그만큼 커진다. 피격 데미지 표에 단계별로 나와 있다',
  },
  111: {
    name: '마공업',
    impact: 'player',
    value: asDelta,
    detail:
      '주변 몹 전체의 마법 공격 데미지가 그만큼 커진다. 피격 데미지 표에 단계별로 나와 있다',
  },
  112: {
    name: '방어업',
    impact: 'kill',
    value: asDelta,
    detail:
      '주변 몹 전체가 받는 물리 데미지가 그만큼 줄어든다. 방컷 확률이 화면값보다 나빠진다',
  },
  113: {
    name: '마방업',
    impact: 'info',
    value: asDelta,
    detail: '마법 데미지를 줄인다. 표창은 물리라 영향이 없다',
  },
  114: {
    name: '회복',
    impact: 'kill',
    value: (x) => x.toLocaleString('ko-KR'),
    detail: '주변 몹의 HP를 그만큼 되돌린다. 깎아 둔 HP가 사라져 방컷이 밀린다',
  },
  115: {
    name: '이동속도업',
    impact: 'info',
    detail: '주변 몹 전체가 빨라진다',
  },
  120: { name: '봉인', impact: 'player', detail: '스킬을 못 쓰게 만든다' },
  121: {
    name: '어둠',
    impact: 'player',
    detail: '캐릭터 명중률이 떨어진다. 타격 확률이 화면값보다 낮아진다',
  },
  122: { name: '약화', impact: 'player', detail: '점프와 이동이 둔해진다' },
  123: { name: '기절', impact: 'player', detail: '잠시 움직이지 못한다' },
  124: { name: '저주', impact: 'player', detail: '경험치와 드롭이 줄어든다' },
  125: {
    name: '중독',
    impact: 'player',
    value: (x) => `틱 ${x}`,
    detail: '시간마다 HP가 깎인다. HP 1 아래로는 안 내려간다',
  },
  126: {
    name: '슬로우',
    impact: 'player',
    value: (x) => `${x}%`,
    detail: '이동 속도가 느려진다',
  },
  127: {
    name: '디스펠',
    impact: 'player',
    detail:
      '버프를 지운다. 샤프 아이즈 · 메이플 용사가 풀리면 데미지가 함께 떨어진다',
  },
  128: { name: '유혹', impact: 'player', detail: '몹 쪽으로 끌려간다' },
  129: {
    name: '맵 강제이동',
    impact: 'player',
    detail: '다른 맵으로 쫓겨난다',
  },
  130: {
    name: '불 영역',
    impact: 'player',
    detail: '바닥에 깔린 불에 지속 피해를 입는다',
  },
  131: {
    name: '독 안개',
    impact: 'player',
    value: (x) => `틱 ${x}`,
    detail: '안개 안에 있으면 시간마다 HP가 깎인다',
  },
  132: { name: '조작 반전', impact: 'player', detail: '좌우 조작이 뒤집힌다' },
  133: {
    name: '언데드화',
    impact: 'player',
    detail: '회복 수단이 반대로 작동한다',
  },
  134: { name: '물약 봉인', impact: 'player', detail: '물약을 못 먹는다' },
  135: { name: '모션 정지', impact: 'player', detail: '움직임이 멈춘다' },
  136: { name: '공포', impact: 'player', detail: '조작을 뺏긴다' },
  137: { name: '빙결', impact: 'player', detail: '얼어붙어 움직이지 못한다' },
  140: {
    name: '물리 무효',
    impact: 'kill',
    detail:
      '걸린 동안 물리 공격이 전부 데미지 1이 된다. 표창으로는 아예 못 깎는다',
  },
  141: {
    name: '마법 무효',
    impact: 'info',
    detail: '마법 공격이 안 통한다. 표창은 물리라 영향이 없다',
  },
  142: {
    name: '경화',
    impact: 'kill',
    detail: '크리티컬이 아닌 타격은 데미지가 들어가지 않는다',
  },
  143: {
    name: '물리 반사',
    impact: 'player',
    detail: '때린 물리 데미지가 나에게 돌아온다',
  },
  144: {
    name: '마법 반사',
    impact: 'player',
    detail: '때린 마법 데미지가 나에게 돌아온다',
  },
  145: {
    name: '물리·마법 반사',
    impact: 'player',
    detail: '때린 데미지가 나에게 돌아온다',
  },
  150: { name: '공격력 증가', impact: 'player', detail: '몹 공격력이 오른다' },
  151: {
    name: '마력 증가',
    impact: 'player',
    detail: '몹 마법 공격력이 오른다',
  },
  152: {
    name: '방어력 증가',
    impact: 'kill',
    detail: '몹 물리 방어력이 오른다. 방컷 확률이 화면값보다 나빠진다',
  },
  153: { name: '마방 증가', impact: 'info', detail: '몹 마법 방어력이 오른다' },
  154: {
    name: '명중 증가',
    impact: 'player',
    detail: '몹 명중률이 올라 회피 확률이 떨어진다',
  },
  155: {
    name: '회피 증가',
    impact: 'player',
    detail: '몹 회피율이 올라 타격 확률이 떨어진다',
  },
  156: { name: '이동속도 증가', impact: 'info', detail: '몹이 빨라진다' },
  157: { name: '스킬 봉인', impact: 'player', detail: '스킬을 못 쓰게 만든다' },
  158: { name: '발록 카운터', impact: 'player', detail: '반격한다' },
  160: {
    name: '스킬 전파',
    impact: 'info',
    detail: '주변 몹에게 상태를 옮긴다',
  },
  161: {
    name: '피해 흡수',
    impact: 'kill',
    detail: '받은 피해를 HP로 되돌린다',
  },
  162: { name: '속박', impact: 'player', detail: '움직이지 못하게 묶는다' },
  200: { name: '소환', impact: 'player', detail: '몹을 불러낸다' },
  201: { name: '큐브 소환', impact: 'player', detail: '큐브를 불러낸다' },
};

/** 프리셋에 없는 스킬 ID가 나와도 화면이 깨지지 않게 이름만이라도 준다. */
export const getMobSkillInfo = (id: number): MobSkillInfo =>
  MOB_SKILLS[id] ?? {
    name: `스킬 ${id}`,
    impact: 'info',
    detail: '아직 정리하지 않은 몹 스킬이다',
  };

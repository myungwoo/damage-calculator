/**
 * 영웅의 메아리.
 *
 * 원작 Skill.wz의 `1005`(모험가 초보자)와 `10001005`(시그너스 노블레스)다.
 * 두 스킬은 이름도 아이콘도 같지만 **배율이 다르다** — `x`가 각각 4와 2다.
 * v079(`mrzhqiang/ms079`)와 v083(`akhuting/gms083`) 덤프가 같은 값을 준다.
 *
 * 적용 자리는 데미지 공식이 아니라 **공격력 그 자체**다. 두 유출본이 같은 구조다.
 *
 * ```
 * // mnwvs077 CalcDamage.cpp (v0.77 IDA 전사본)
 * int nPAD = min(1999, max(0, ss->nPAD + ss->nPAD_ + nBulletPAD));
 * if (ss->nMaxLevelBuff_)
 *     nPAD = min(1999, nPAD + nPAD * ss->nMaxLevelBuff_ / 100);
 *
 * // iw2d/kinoko CalcDamage.java (같은 계산을 Java로)
 * if (totalPadR > 0) pad += pad * totalPadR / 100;
 * return clamp(pad, 0, PAD_MAX);
 * ```
 *
 * - 영웅의 메아리가 넣는 상태이상이 `MaxLevelBuff`(CTS 47)라는 것은 kinoko의
 *   `SkillProcessor`에서 확인했다 — `Beginner.ECHO_OF_HERO`(1005) /
 *   `Noblesse.ECHO_OF_HERO`(10001005)가 그 스탯에 스킬의 `x`를 그대로 넣는다.
 *   mnwvs077은 `nMaxLevelBuff_`를 읽기만 하고 걸어 주는 코드가 없다(죽은 경로).
 * - **표창 공격력(`nBulletPAD`)까지 더한 뒤에 곱한다.** 그래서 이 계산기의
 *   "공격력 합"이 곧 `nPAD`이고, 배율은 그 합 전체에 걸린다.
 * - **정수 나눗셈이라 버림이다.** 공격력 137에 4%면 137 + 5 = 142지 142.48이 아니다.
 * - 데미지 공식보다 앞에 있으므로 스킬 데미지%·크리티컬·방어력과 무관하게
 *   공격력만 올린다. 반대로 베놈은 스킬 자체의 공격력(`mad`)을 쓰므로 영향이 없고,
 *   피격 데미지도 몹 공격력에서 나오므로 영향이 없다.
 *
 * `mnwvs077`의 물리 쪽 한 줄은 `nPAD + nPAD / ss->nMaxLevelBuff_ * 100`으로
 * 적혀 있는데, 같은 파일 마법 쪽(`nMAD + nMAD * ss->nMaxLevelBuff_ / 100`)과
 * kinoko가 모두 반대이므로 IDA 전사 과정의 뒤집힘으로 본다.
 * 그대로 읽으면 배율 4%가 공격력을 25배로 만들어 뜻이 통하지 않는다.
 */
export type EchoOfHeroType = 'none' | 'adventurer' | 'cygnus';

/** 공격력 상한. 원작 `CalcDamage`가 `min(1999, ...)`로 자르는 값이다. */
export const MAX_TOTAL_ATTACK = 1999;

interface EchoOfHeroOption {
  type: EchoOfHeroType;
  label: string;
  /** 원작 스킬 ID. 없음이면 비어 있다 */
  skillId?: number;
  /** 스킬 `x` = 공격력 증가율 (%) */
  percent: number;
}

export const ECHO_OF_HERO_OPTIONS: readonly EchoOfHeroOption[] = [
  { type: 'none', label: '없음', percent: 0 },
  { type: 'adventurer', label: '모험가', skillId: 1005, percent: 4 },
  { type: 'cygnus', label: '시그너스', skillId: 10001005, percent: 2 },
] as const;

/** 고른 영웅의 메아리의 공격력 증가율 (%). 안 켰으면 0이다. */
export const getEchoOfHeroPercent = (
  type: EchoOfHeroType | undefined
): number =>
  ECHO_OF_HERO_OPTIONS.find((option) => option.type === type)?.percent ?? 0;
